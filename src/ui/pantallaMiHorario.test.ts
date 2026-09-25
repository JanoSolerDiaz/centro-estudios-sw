import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaMiHorario, type DependenciasPantallaMiHorario } from './pantallaMiHorario.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from '../dominio/slots.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearProgramadorIntervaloDePrueba, type ProgramadorIntervaloDePrueba } from '../nucleo/programadorIntervalo.ts';
import { ErrorDeRed } from '../datos/erroresDominio.ts';
import { crearAlmacenPreferenciaRecordatorioEnMemoria } from '../nucleo/preferenciaRecordatorio.ts';
import type { NotificadorRecordatorio, OpcionesRecordatorioSesion } from '../nucleo/notificadorRecordatorio.ts';
import type { AbridorVentanaImpresion, VentanaImpresion } from './dom.ts';

// Miércoles 2026-08-26, 17:30 CEST (15:30 UTC): dentro del slot 17:00-18:00 local de dia_semana 3.
const INSTANTE_EN_CLASE = new Date('2026-08-26T15:30:00.000Z');

// Mismo miércoles, 16:55 CEST (14:55 UTC): 5 minutos antes del inicio del slot 17:00-18:00 — dentro
// de la ventana de aviso por defecto de R-26 (`MINUTOS_AVISO_RECORDATORIO_POR_DEFECTO`, 5 min).
const INSTANTE_ANTES_DE_CLASE = new Date('2026-08-26T14:55:00.000Z');

interface NotificadorDePrueba extends NotificadorRecordatorio {
  readonly llamadas: readonly { titulo: string; opciones: OpcionesRecordatorioSesion }[];
  fijarPermiso(permiso: NotificationPermission): void;
  fijarResultadoPeticion(permiso: NotificationPermission): void;
}

function crearNotificadorDePrueba(permisoInicial: NotificationPermission = 'default'): NotificadorDePrueba {
  let permiso = permisoInicial;
  let resultadoPeticion: NotificationPermission = 'granted';
  const llamadas: { titulo: string; opciones: OpcionesRecordatorioSesion }[] = [];
  return {
    llamadas,
    fijarPermiso: (nuevo) => {
      permiso = nuevo;
    },
    fijarResultadoPeticion: (nuevo) => {
      resultadoPeticion = nuevo;
    },
    permiso: () => permiso,
    pedirPermiso: () => {
      permiso = resultadoPeticion;
      return Promise.resolve(permiso);
    },
    mostrar: (titulo, opciones) => {
      llamadas.push({ titulo, opciones });
      return Promise.resolve();
    },
  };
}

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

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asistencia-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-08-26T15:30:05.000Z',
    ocurrido_en: '2026-08-26T15:30:05.000Z',
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 3,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: 'Matemáticas',
    estado: 'valida',
    motivo_anulacion: null,
    motivo_justificacion: null,
    nota_justificacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'peticion-servidor-1',
    ...sobrescribir,
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function disparar(elemento: Element, tipo: string): void {
  const ventana = elemento.ownerDocument.defaultView;
  assert.ok(ventana);
  elemento.dispatchEvent(new ventana.Event(tipo));
}

function crearAbridorImpresionDeMentira(): AbridorVentanaImpresion & {
  readonly titulos: string[];
  readonly documentos: Document[];
  impresiones: number;
} {
  const titulos: string[] = [];
  const documentos: Document[] = [];
  const resultado = {
    titulos,
    documentos,
    impresiones: 0,
    abrir(titulo: string): VentanaImpresion {
      titulos.push(titulo);
      const documento = new JSDOM('<!doctype html><body></body>').window.document;
      documentos.push(documento);
      return {
        document: documento,
        imprimir: () => {
          resultado.impresiones += 1;
        },
      };
    },
  };
  return resultado;
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
    abridorImpresion: overrides.abridorImpresion ?? crearAbridorImpresionDeMentira(),
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
            aviso_familias_quien: null,
            aviso_familias_en: null,
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
            aviso_familias_quien: null,
            aviso_familias_en: null,
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
            aviso_familias_quien: null,
            aviso_familias_en: null,
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

// --- R-21: pausa programada de un alumno --------------------------------------------------------

void test('un slot en curso cuyo alumno está en pausa hoy: "En pausa hasta X", sin "Pasar lista" ni "En curso", fuera del resumen', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarPausasDeHoy: () =>
        Promise.resolve([
          {
            id: 'pausa-1',
            alumno_id: slot.alumno_id,
            fecha_inicio: '2026-08-24',
            fecha_fin: '2026-08-28',
            motivo: 'Viaje familiar',
            estado: 'activa',
            motivo_anulacion: null,
            creado_por: 'admin-1',
            anulado_por: null,
            anulado_en: null,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /En pausa hasta 2026-08-28/);
  assert.doesNotMatch(fila.textContent, /En curso/);
  assert.doesNotMatch(contenedor.textContent, /Ahora: Ana García López/);
  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.equal(botonPasarLista, undefined, 'un alumno en pausa no debe ofrecer "Pasar lista"');
  const botonRegistros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Ver registros');
  assert.ok(botonRegistros, '"Ver registros" se sigue ofreciendo');
});

void test('una pausa de OTRO alumno no afecta a la fila de este', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarPausasDeHoy: () =>
        Promise.resolve([
          {
            id: 'pausa-1',
            alumno_id: 'otro-alumno',
            fecha_inicio: '2026-08-24',
            fecha_fin: '2026-08-28',
            motivo: null,
            estado: 'activa',
            motivo_anulacion: null,
            creado_por: 'admin-1',
            anulado_por: null,
            anulado_en: null,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Ahora: Ana García López/);
  const fila = contenedor.querySelector('li');
  assert.ok(fila);
  assert.match(fila.textContent, /En curso/);
});

void test('sin listarPausasDeHoy inyectada, Mi horario funciona exactamente como antes de R-21', async () => {
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
            aviso_familias_quien: null,
            aviso_familias_en: null,
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

// --- R-28: aviso de ausencias repetidas ------------------------------------------------------------

void test('un alumno con 3 o más ausencias sin justificar recientes muestra el indicador en su fila', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const ausencias = ['a', 'b', 'c'].map((sufijo) =>
    crearAsistencia({ id: `ausencia-${sufijo}`, estado: 'ausente', motivo_justificacion: null, peticion_id: `pet-${sufijo}` }),
  );
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarAusenciasRecientes: () => Promise.resolve(ausencias),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /3 ausencias sin justificar/);
});

void test('un alumno con menos de 3 ausencias sin justificar no muestra ningún indicador', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const ausencias = [crearAsistencia({ id: 'ausencia-a', estado: 'ausente', motivo_justificacion: null, peticion_id: 'pet-a' })];
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      listarAusenciasRecientes: () => Promise.resolve(ausencias),
    }),
  );
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /ausencias sin justificar/);
});

void test('sin listarAusenciasRecientes inyectada, "Mi horario" funciona exactamente como antes de R-28', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /ausencias sin justificar/);
});

// --- R-29: aviso de ausencia del profesor -----------------------------------------------------

function botonPorTexto(contenedor: HTMLElement, texto: string): HTMLButtonElement | undefined {
  return Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === texto);
}

void test('con avisarAusenciaProfesor informado, un slot futuro propio ofrece "Avisar que no puedo dar esta clase"', async () => {
  const contenedor = crearContenedorDePruebas();
  // Viernes (dia_semana 5): una ocurrencia futura respecto al miércoles de INSTANTE_EN_CLASE.
  const slot = crearSlot({ dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]), avisarAusenciaProfesor: () => Promise.reject(new Error('no usado')) }),
  );
  await esperarMicrotareas();

  assert.ok(botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase'));
});

void test('sin avisarAusenciaProfesor inyectada, "Mi horario" funciona exactamente como antes de R-29', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' });
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.equal(botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase'), undefined);
});

void test('un slot de hoy YA EN CURSO no ofrece "Avisar..." (requisito 2)', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({}); // dia_semana 3, 17:00-18:00 — en curso en INSTANTE_EN_CLASE (17:30)
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]), avisarAusenciaProfesor: () => Promise.reject(new Error('no usado')) }),
  );
  await esperarMicrotareas();

  assert.equal(botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase'), undefined);
});

void test('un slot de hoy que TODAVÍA NO ha empezado sí ofrece "Avisar..."', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '19:00', hora_fin: '20:00' }); // hoy, después de las 17:30
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ cargarSlots: () => Promise.resolve([slot]), avisarAusenciaProfesor: () => Promise.reject(new Error('no usado')) }),
  );
  await esperarMicrotareas();

  assert.ok(botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase'));
});

void test('una excepción de hoy (R-06) también suprime "Avisar..." aunque el slot sea de hoy', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ hora_inicio: '19:00', hora_fin: '20:00' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      avisarAusenciaProfesor: () => Promise.reject(new Error('no usado')),
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
            aviso_familias_quien: null,
            aviso_familias_en: null,
            creado_en: '2026-01-01T00:00:00.000Z',
            actualizado_en: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }),
  );
  await esperarMicrotareas();

  assert.equal(botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase'), undefined);
});

void test('pulsar "Avisar..." abre el formulario; confirmar sin motivo llama con motivo undefined y la próxima fecha del día de la semana', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' });
  let llamada: { slotId: string; fechaSesion: string; motivo: string | undefined } | undefined;
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      avisarAusenciaProfesor: (slotId, fechaSesion, motivo) => {
        llamada = { slotId, fechaSesion, motivo };
        return Promise.resolve({
          id: 'aviso-1',
          profesor_id: 'profesor-1',
          slot_id: slotId,
          fecha_sesion: fechaSesion,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          asignatura_o_grupo: slot.asignatura_o_grupo,
          motivo: motivo ?? null,
          estado: 'pendiente',
          atendido_por: null,
          atendido_en: null,
          registrado_en: '2026-08-26T00:00:00.000Z',
          actualizado_en: '2026-08-26T00:00:00.000Z',
        });
      },
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase')?.click();
  await esperarMicrotareas();

  const botonConfirmar = botonPorTexto(contenedor, 'Confirmar aviso');
  assert.ok(botonConfirmar, 'debe mostrar el formulario con "Confirmar aviso"');
  botonConfirmar.click();
  await esperarMicrotareas();

  assert.ok(llamada);
  assert.equal(llamada.slotId, 'slot-1');
  assert.equal(llamada.fechaSesion, '2026-08-28'); // viernes siguiente al miércoles de INSTANTE_EN_CLASE
  assert.equal(llamada.motivo, undefined);
  assert.match(contenedor.textContent, /Aviso enviado\./);
});

void test('confirmar con un motivo escrito lo envía recortado, y vacío tras solo espacios se envía como undefined', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' });
  const motivosRecibidos: (string | undefined)[] = [];
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      avisarAusenciaProfesor: (_slotId, _fechaSesion, motivo) => {
        motivosRecibidos.push(motivo);
        return Promise.reject(new Error('detener aquí, no hace falta resolver'));
      },
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase')?.click();
  await esperarMicrotareas();
  const campoMotivo = contenedor.querySelector('textarea');
  assert.ok(campoMotivo);
  campoMotivo.value = '  Imprevisto familiar  ';
  disparar(campoMotivo, 'input');
  botonPorTexto(contenedor, 'Confirmar aviso')?.click();
  await esperarMicrotareas();

  assert.deepEqual(motivosRecibidos, ['Imprevisto familiar']);
});

void test('un error del servidor al avisar se muestra sin perder el formulario', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' });
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      avisarAusenciaProfesor: () => Promise.reject(new ErrorDeRed()),
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase')?.click();
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Confirmar aviso')?.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No se ha podido conectar/);
  assert.ok(botonPorTexto(contenedor, 'Confirmar aviso'), 'el formulario sigue abierto tras el error');
});

void test('"Cancelar" cierra el formulario sin llamar al servidor', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00' });
  let llamadas = 0;
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      cargarSlots: () => Promise.resolve([slot]),
      avisarAusenciaProfesor: () => {
        llamadas += 1;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase')?.click();
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Cancelar')?.click();
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.ok(botonPorTexto(contenedor, 'Avisar que no puedo dar esta clase'), 'vuelve a ofrecer el botón inicial');
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

// --- R-26: recordatorio local antes de que empiece una sesión ------------------------------------

void test('sin notificador ni preferenciaRecordatorio, no aparece ningún interruptor', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]) }));
  await esperarMicrotareas();

  assert.equal(contenedor.querySelector('input[type="checkbox"]'), null);
  assert.doesNotMatch(contenedor.textContent, /Avisarme antes de cada clase/);
});

void test('con las dos dependencias y la preferencia apagada por defecto, el interruptor aparece sin marcar', async () => {
  const contenedor = crearContenedorDePruebas();
  const notificador = crearNotificadorDePrueba('default');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), notificador, preferenciaRecordatorio }));
  await esperarMicrotareas();

  const casilla = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casilla, 'debe aparecer el interruptor');
  assert.equal(casilla.checked, false);
  assert.match(contenedor.textContent, /Avisarme antes de cada clase/);
});

void test('con la preferencia ya "activado" y el permiso ya "granted", el interruptor aparece marcado desde el principio', async () => {
  const contenedor = crearContenedorDePruebas();
  const notificador = crearNotificadorDePrueba('granted');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  preferenciaRecordatorio.guardar('activado');
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), notificador, preferenciaRecordatorio }));
  await esperarMicrotareas();

  const casilla = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casilla);
  assert.equal(casilla.checked, true);
});

void test('con la preferencia "activado" guardada pero el permiso YA NO concedido (revocado fuera de la aplicación), el interruptor aparece apagado', async () => {
  const contenedor = crearContenedorDePruebas();
  const notificador = crearNotificadorDePrueba('denied');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  preferenciaRecordatorio.guardar('activado');
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), notificador, preferenciaRecordatorio }));
  await esperarMicrotareas();

  const casilla = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casilla);
  assert.equal(casilla.checked, false);
});

void test('activar el interruptor pide permiso; concedido, guarda "activado" y el interruptor queda marcado', async () => {
  const contenedor = crearContenedorDePruebas();
  const notificador = crearNotificadorDePrueba('default');
  notificador.fijarResultadoPeticion('granted');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), notificador, preferenciaRecordatorio }));
  await esperarMicrotareas();

  const casilla = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casilla);
  casilla.checked = true;
  disparar(casilla, 'change');
  await esperarMicrotareas();

  assert.equal(preferenciaRecordatorio.leer(), 'activado');
  const casillaTrasPintar = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casillaTrasPintar);
  assert.equal(casillaTrasPintar.checked, true);
});

void test('activar el interruptor pide permiso; denegado, guarda "apagado", el interruptor vuelve a apagarse solo y avisa del permiso denegado', async () => {
  const contenedor = crearContenedorDePruebas();
  const notificador = crearNotificadorDePrueba('default');
  notificador.fijarResultadoPeticion('denied');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), notificador, preferenciaRecordatorio }));
  await esperarMicrotareas();

  const casilla = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casilla);
  casilla.checked = true;
  disparar(casilla, 'change');
  await esperarMicrotareas();

  assert.equal(preferenciaRecordatorio.leer(), 'apagado');
  const casillaTrasPintar = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casillaTrasPintar);
  assert.equal(casillaTrasPintar.checked, false);
  assert.match(contenedor.textContent, /Permiso de notificaciones denegado/);
});

void test('desactivar el interruptor guarda "apagado"', async () => {
  const contenedor = crearContenedorDePruebas();
  const notificador = crearNotificadorDePrueba('granted');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  preferenciaRecordatorio.guardar('activado');
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), notificador, preferenciaRecordatorio }));
  await esperarMicrotareas();

  const casilla = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(casilla);
  assert.equal(casilla.checked, true);
  casilla.checked = false;
  disparar(casilla, 'change');

  assert.equal(preferenciaRecordatorio.leer(), 'apagado');
});

void test('con el recordatorio activo, una sesión dentro de la ventana de aviso dispara una notificación con hora/día/asignatura, sin el nombre del alumno', async () => {
  const contenedor = crearContenedorDePruebas();
  const programador = crearProgramadorIntervaloDePrueba();
  const notificador = crearNotificadorDePrueba('granted');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  preferenciaRecordatorio.guardar('activado');
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE_ANTES_DE_CLASE),
      programador,
      cargarSlots: () => Promise.resolve([slot]),
      notificador,
      preferenciaRecordatorio,
    }),
  );
  await esperarMicrotareas();

  programador.disparar();
  await esperarMicrotareas();

  assert.equal(notificador.llamadas.length, 1);
  const [llamada] = notificador.llamadas;
  assert.ok(llamada);
  assert.doesNotMatch(llamada.opciones.cuerpo, /Ana|García/);
  assert.match(llamada.opciones.cuerpo, /Miércoles/);
  assert.match(llamada.opciones.cuerpo, /17:00/);
  assert.match(llamada.opciones.cuerpo, /Matemáticas/);
  assert.equal(llamada.opciones.etiqueta, `${slot.id}|2026-08-26`);
  assert.equal(llamada.opciones.datos.inicioUtcMs, new Date('2026-08-26T15:00:00.000Z').getTime());
});

void test('la misma sesión no repite el aviso en un segundo tick (requisito 5)', async () => {
  const contenedor = crearContenedorDePruebas();
  const programador = crearProgramadorIntervaloDePrueba();
  const notificador = crearNotificadorDePrueba('granted');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  preferenciaRecordatorio.guardar('activado');
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE_ANTES_DE_CLASE),
      programador,
      cargarSlots: () => Promise.resolve([slot]),
      notificador,
      preferenciaRecordatorio,
    }),
  );
  await esperarMicrotareas();

  programador.disparar();
  await esperarMicrotareas();
  programador.disparar();
  await esperarMicrotareas();

  assert.equal(notificador.llamadas.length, 1);
});

void test('con el recordatorio apagado, un tick dentro de la ventana no dispara ninguna notificación', async () => {
  const contenedor = crearContenedorDePruebas();
  const programador = crearProgramadorIntervaloDePrueba();
  const notificador = crearNotificadorDePrueba('granted');
  const preferenciaRecordatorio = crearAlmacenPreferenciaRecordatorioEnMemoria();
  // Preferencia deliberadamente NO activada.
  const slot = crearSlot({});
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE_ANTES_DE_CLASE),
      programador,
      cargarSlots: () => Promise.resolve([slot]),
      notificador,
      preferenciaRecordatorio,
    }),
  );
  await esperarMicrotareas();

  programador.disparar();
  await esperarMicrotareas();

  assert.equal(notificador.llamadas.length, 0);
});

// --- «Imprimir mi horario» (R-32) -----------------------------------------------------------

void test('el botón "Imprimir mi horario" está disponible incluso sin ningún horario', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]) }));
  await esperarMicrotareas();

  assert.ok(botonPorTexto(contenedor, 'Imprimir mi horario'));
});

void test('"Imprimir mi horario" abre una ventana con una fila por slot propio, sin columna de profesor', async () => {
  const contenedor = crearContenedorDePruebas();
  const abridorImpresion = crearAbridorImpresionDeMentira();
  const slotMiercoles = crearSlot({ id: 'slot-1', dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00', asignatura_o_grupo: 'Matemáticas' });
  const slotViernes = crearSlot(
    { id: 'slot-2', alumno_id: 'alumno-2', dia_semana: 5, hora_inicio: '10:00', hora_fin: '11:00', asignatura_o_grupo: null },
    { id: 'alumno-2', nombre: 'Luis', primer_apellido: 'Pérez', segundo_apellido: null },
  );
  mostrarPantallaMiHorario(
    contenedor,
    crearDepsFalsas({ cargarSlots: () => Promise.resolve([slotMiercoles, slotViernes]), abridorImpresion }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Imprimir mi horario')?.click();

  assert.deepEqual(abridorImpresion.titulos, ['Mi horario']);
  assert.equal(abridorImpresion.impresiones, 1);
  const docImpresion = abridorImpresion.documentos[0];
  assert.ok(docImpresion);
  assert.match(docImpresion.body.textContent, /Generado el/);
  const cabeceras = Array.from(docImpresion.querySelectorAll('thead th')).map((th) => th.textContent);
  assert.deepEqual(cabeceras, ['Día', 'Hora', 'Asignatura/grupo', 'Alumno']); // sin columna de profesor
  const filas = docImpresion.querySelectorAll('tbody tr');
  assert.equal(filas.length, 2);
  const primeraFila = Array.from(filas[0]?.querySelectorAll('td') ?? []).map((td) => td.textContent);
  assert.deepEqual(primeraFila, ['Miércoles', '17:00–18:00', 'Matemáticas', 'Ana García López']);
  const segundaFila = Array.from(filas[1]?.querySelectorAll('td') ?? []).map((td) => td.textContent);
  assert.deepEqual(segundaFila, ['Viernes', '10:00–11:00', '—', 'Luis Pérez']);
});

void test('si el navegador bloquea la ventana emergente, "Imprimir mi horario" avisa sin lanzar', async () => {
  const contenedor = crearContenedorDePruebas();
  const abridorImpresion: AbridorVentanaImpresion = { abrir: () => undefined };
  mostrarPantallaMiHorario(contenedor, crearDepsFalsas({ cargarSlots: () => Promise.resolve([]), abridorImpresion }));
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Imprimir mi horario')?.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /bloqueado la ventana de impresión/);
});
