import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaMiHorario, type DependenciasPantallaMiHorario } from './pantallaMiHorario.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from '../dominio/slots.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearProgramadorIntervaloDePrueba, type ProgramadorIntervaloDePrueba } from '../nucleo/programadorIntervalo.ts';
import { ErrorDeRed } from '../datos/erroresDominio.ts';

// Miércoles 2026-08-26, 17:30 CEST (15:30 UTC): dentro del slot 17:00-18:00 local de dia_semana 3.
const INSTANTE_EN_CLASE = new Date('2026-08-26T15:30:00.000Z');

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearAlumno(sobrescribir: Partial<AlumnoParaPropuesta> = {}): AlumnoParaPropuesta {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: 'López',
    avatar_ruta: null,
    activo: true,
    ...sobrescribir,
  };
}

function crearSlot(sobrescribir: Partial<SlotConAlumno> = {}, alumno: Partial<AlumnoParaPropuesta> = {}): SlotConAlumno {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: 'Matemáticas',
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
    alumno: crearAlumno({ id: sobrescribir.alumno_id ?? 'alumno-1', ...alumno }),
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaMiHorario> = {}): DependenciasPantallaMiHorario {
  return {
    rol: 'teacher',
    profesorId: 'profesor-1',
    reloj: crearRelojFijo(INSTANTE_EN_CLASE),
    programador: crearProgramadorIntervaloDePrueba(),
    cargarSlots: () => Promise.resolve([]),
    irAPasarLista: () => undefined,
    irARegistros: () => undefined,
    ...overrides,
  };
}

// --- Acceso ---------------------------------------------------------------------------------

void test('un rol distinto de teacher ve "No tienes acceso" y no dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ rol: 'administrator', cargarSlots: () => { llamadas += 1; return Promise.resolve([]); } }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('student tampoco tiene acceso a mi horario', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

// --- Carga y estados vacíos --------------------------------------------------------------------

void test('mientras carga muestra "Cargando…" y no pinta los días', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando…/);
  assert.equal(contenedor.querySelectorAll('section').length, 0);
});

void test('sin ningún slot, aparecen los siete días con "Sin clases este día" y el resumen dice "Sin horario asignado"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]) }));
  await esperarMicrotareas();

  const secciones = contenedor.querySelectorAll('section');
  assert.equal(secciones.length, 7);
  for (const seccion of secciones) {
    assert.match(seccion.textContent, /Sin clases este día/);
  }
  assert.match(contenedor.textContent, /Sin horario asignado/);
});

void test('un error al cargar deja el mensaje visible', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.reject(new ErrorDeRed()) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No se ha podido conectar/);
});

// --- Indicador de actual / siguiente (requisito 4) ---------------------------------------------

void test('un slot en curso aparece marcado "En curso", con botón "Pasar lista", y en el resumen "Ahora"', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Ahora: Ana García López/);
  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /En curso/);
  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.ok(botonPasarLista, 'debe ofrecer "Pasar lista" cuando el slot está en curso');
});

// --- R-06: excepciones de slot (sustitución/cancelación) ----------------------------------------

void test('un slot en curso, pero cancelado hoy: "Cancelada — motivo", sin "Pasar lista" ni "En curso", fuera del resumen', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarExcepcionesDeHoy: () =>
        Promise.resolve([
          {
            id: 'exc-1',
            slot_id: slot.id,
            fecha: '2026-08-26',
            tipo: 'cancelacion',
            profesor_sustituto_id: null,
            motivo: 'Profesor de baja',
            activo: true,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /Cancelada — Profesor de baja/);
  assert.doesNotMatch(fila.textContent, /En curso/);
  assert.doesNotMatch(contenedor.textContent, /Ahora: Ana García López/);
  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.equal(botonPasarLista, undefined, 'una clase cancelada no debe ofrecer "Pasar lista"');
});

void test('un slot en curso, sustituido hoy: "Cubierto por otro profesor", sin "Pasar lista"', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarExcepcionesDeHoy: () =>
        Promise.resolve([
          {
            id: 'exc-1',
            slot_id: slot.id,
            fecha: '2026-08-26',
            tipo: 'sustitucion',
            profesor_sustituto_id: 'profesor-2',
            motivo: null,
            activo: true,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /Cubierto por otro profesor/);
  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.equal(botonPasarLista, undefined);
  // "Ver registros" se sigue ofreciendo: el titular puede querer comprobar que no hay nada.
  const botonRegistros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Ver registros');
  assert.ok(botonRegistros);
});

void test('una excepción de OTRO día de la semana no afecta a la fila de hoy', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({}); // dia_semana 3 (miércoles), instante fijo también es miércoles
  const otroSlotMartes = crearSlot({ id: 'slot-martes', dia_semana: 2, hora_inicio: '09:00', hora_fin: '10:00' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot, otroSlotMartes]),
      listarExcepcionesDeHoy: () =>
        Promise.resolve([
          {
            id: 'exc-1',
            slot_id: otroSlotMartes.id,
            fecha: '2026-08-25', // martes anterior, no hoy
            tipo: 'cancelacion',
            profesor_sustituto_id: null,
            motivo: 'x',
            activo: true,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Ahora: Ana García López/);
  const filas = Array.from(contenedor.querySelectorAll('li'));
  const filaHoy = filas.find((li) => li.textContent.includes('17:00–18:00'));
  assert.ok(filaHoy, 'no se encuentra la fila del slot de hoy (17:00–18:00)');
  assert.match(filaHoy.textContent, /En curso/);
});

void test('sin listarExcepcionesDeHoy inyectada, Mi horario funciona exactamente como antes de R-06', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Ahora: Ana García López/);
  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /En curso/);
});

void test('un slot que no ha empezado no ofrece "Pasar lista", se marca "Siguiente" y aparece en el resumen', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ id: 'slot-siguiente', hora_inicio: '18:00', hora_fin: '19:00' });
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Siguiente: Miércoles 18:00–19:00 — Ana García López/);
  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /Siguiente/);
  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.equal(botonPasarLista, undefined, 'un slot que no está en curso no debe ofrecer "Pasar lista"');
});

void test('un slot que no es actual ni siguiente no lleva ninguna etiqueta, solo "Ver registros"', async () => {
  const contenedor = crearContenedorDePruebas();
  // INSTANTE_EN_CLASE es miércoles 17:30 CEST: "actual" toca ahora, "cercano" es el próximo de
  // verdad (19:00 el mismo día) y "lejano" (viernes) queda por detrás de ambos — ni actual ni el
  // más próximo, así que no debe llevar ninguna etiqueta.
  const actual = crearSlot({ id: 'slot-actual' });
  const cercano = crearSlot(
    { id: 'slot-cercano', alumno_id: 'alumno-3', hora_inicio: '19:00', hora_fin: '20:00' },
    { id: 'alumno-3', nombre: 'Carla', primer_apellido: 'Núñez' },
  );
  const lejano = crearSlot(
    { id: 'slot-lejano', alumno_id: 'alumno-2', dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' },
    { id: 'alumno-2', nombre: 'Luis', primer_apellido: 'Martín' },
  );
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([actual, cercano, lejano]) }));
  await esperarMicrotareas();

  const filas = Array.from(contenedor.querySelectorAll('li'));
  const filaLejana = filas.find((li) => li.textContent.includes('Luis Martín'));
  assert.ok(filaLejana);
  assert.doesNotMatch(filaLejana.textContent, /En curso/);
  assert.doesNotMatch(filaLejana.textContent, /Siguiente/);
  const botones = Array.from(filaLejana.querySelectorAll('button')).map((b) => b.textContent);
  assert.deepEqual(botones, ['Ver registros']);
});

// --- Los siete días, agrupación y orden ---------------------------------------------------------

void test('dos alumnos simultáneos el mismo día aparecen los dos, ordenados por apellido', async () => {
  const contenedor = crearContenedorDePruebas();
  const zeta = crearSlot(
    { id: 'slot-zeta', alumno_id: 'alumno-zeta' },
    { id: 'alumno-zeta', nombre: 'Zoe', primer_apellido: 'Zapata' },
  );
  const abad = crearSlot(
    { id: 'slot-abad', alumno_id: 'alumno-abad' },
    { id: 'alumno-abad', nombre: 'Bruno', primer_apellido: 'Abad' },
  );
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([zeta, abad]) }));
  await esperarMicrotareas();

  const seccionMiercoles = Array.from(contenedor.querySelectorAll('section')).find((s) =>
    (s.querySelector('h3')?.textContent ?? '') === 'Miércoles',
  );
  assert.ok(seccionMiercoles);
  const nombres = Array.from(seccionMiercoles.querySelectorAll('li')).map((li) => li.textContent);
  assert.equal(nombres.length, 2);
  assert.ok(nombres[0]?.includes('Bruno Abad'));
  assert.ok(nombres[1]?.includes('Zoe Zapata'));
});

void test('un slot de otro profesor o de un alumno de baja no aparece en ningún día', async () => {
  const contenedor = crearContenedorDePruebas();
  const deOtroProfesor = crearSlot({ id: 'slot-otro', profesor_id: 'profesor-2' });
  const deBaja = crearSlot({ id: 'slot-baja', alumno_id: 'alumno-baja' }, { id: 'alumno-baja', activo: false });
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([deOtroProfesor, deBaja]) }));
  await esperarMicrotareas();

  assert.equal(contenedor.querySelectorAll('li').length, 0);
});

// --- Navegación (requisito 2) --------------------------------------------------------------------

void test('"Ver registros" navega a los registros de ESE slot, no a una pantalla genérica', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ id: 'slot-42' });
  let slotIdRecibido: string | null = null;
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]), irARegistros: (slotId) => { slotIdRecibido = slotId; } }),
  );
  await esperarMicrotareas();

  const botonRegistros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Ver registros');
  assert.ok(botonRegistros);
  botonRegistros.dispatchEvent(new (contenedor.ownerDocument.defaultView as unknown as typeof window).Event('click', { bubbles: true }));

  assert.equal(slotIdRecibido, 'slot-42');
});

void test('"Pasar lista" navega sin ningún parámetro', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  let llamadas = 0;
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]), irAPasarLista: () => { llamadas += 1; } }),
  );
  await esperarMicrotareas();

  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.ok(botonPasarLista);
  botonPasarLista.dispatchEvent(new (contenedor.ownerDocument.defaultView as unknown as typeof window).Event('click', { bubbles: true }));

  assert.equal(llamadas, 1);
});

// --- R-13: sesiones sin pasar lista ---------------------------------------------------------------

void test('sin las tres dependencias de R-13 inyectadas a la vez, el bloque no aparece (funciona como antes de R-13)', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '09:00', hora_fin: '10:00', vigente_desde: '2026-08-26' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarRegistrosRecientes: () => Promise.resolve([]),
      listarCierresActivos: () => Promise.resolve([]),
      // Falta listarExcepcionesRecientes: las tres van juntas o ninguna.
    }),
  );
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /Sesiones sin pasar lista/);
});

void test('con las tres dependencias de R-13, un slot de hoy ya terminado y sin registro aparece como "sin pasar lista"', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '09:00', hora_fin: '10:00', vigente_desde: '2026-08-26' });
  let argumentosIrARegistros: readonly [string, string | undefined] | undefined;
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarRegistrosRecientes: () => Promise.resolve([]),
      listarCierresActivos: () => Promise.resolve([]),
      listarExcepcionesRecientes: () => Promise.resolve([]),
      irARegistros: (slotId, fecha) => {
        argumentosIrARegistros = [slotId, fecha];
      },
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Sesiones sin pasar lista/);
  assert.match(contenedor.textContent, /2026-08-26 09:00–10:00 — Ana García López/);
  const boton = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Completar registro');
  assert.ok(boton);
  boton.dispatchEvent(new (contenedor.ownerDocument.defaultView as unknown as typeof window).Event('click', { bubbles: true }));
  assert.deepEqual(argumentosIrARegistros, ['slot-1', '2026-08-26']);
});

void test('un slot de hoy con un registro ya existente no aparece en "sesiones sin pasar lista"', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '09:00', hora_fin: '10:00', vigente_desde: '2026-08-26' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarRegistrosRecientes: () => Promise.resolve([{ slot_id: slot.id, ocurrido_en: '2026-08-26T09:05:00.000Z' }]),
      listarCierresActivos: () => Promise.resolve([]),
      listarExcepcionesRecientes: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /Sesiones sin pasar lista/);
});

void test('un slot de hoy cancelado (R-06) no aparece en "sesiones sin pasar lista"', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '09:00', hora_fin: '10:00', vigente_desde: '2026-08-26' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarRegistrosRecientes: () => Promise.resolve([]),
      listarCierresActivos: () => Promise.resolve([]),
      listarExcepcionesRecientes: () =>
        Promise.resolve([
          {
            id: 'exc-1',
            slot_id: slot.id,
            fecha: '2026-08-26',
            tipo: 'cancelacion',
            profesor_sustituto_id: null,
            motivo: 'Sin profesor',
            activo: true,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /Sesiones sin pasar lista/);
});

void test('un día cerrado del centro (R-12) excluye ese slot de "sesiones sin pasar lista"', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '09:00', hora_fin: '10:00', vigente_desde: '2026-08-26' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarRegistrosRecientes: () => Promise.resolve([]),
      listarCierresActivos: () =>
        Promise.resolve([
          {
            id: 'cierre-1',
            fecha_inicio: '2026-08-26',
            fecha_fin: '2026-08-26',
            motivo: 'Festivo',
            activo: true,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
      listarExcepcionesRecientes: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /Sesiones sin pasar lista/);
});

// --- Refresco periódico sin red -------------------------------------------------------------------

void test('un tick del programador recalcula la vista sin volver a pedir datos al servidor', async () => {
  const contenedor = crearContenedorDePruebas();
  const programador: ProgramadorIntervaloDePrueba = crearProgramadorIntervaloDePrueba();
  let llamadas = 0;
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      programador,
      cargarSlots: () => {
        llamadas += 1;
        return Promise.resolve([slot]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal(llamadas, 1);

  programador.disparar();
  programador.disparar();
  await esperarMicrotareas();

  assert.equal(llamadas, 1);
});
