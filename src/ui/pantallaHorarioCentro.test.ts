import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaHorarioCentro, type DependenciasPantallaHorarioCentro } from './pantallaHorarioCentro.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearReboteDePrueba } from '../nucleo/rebote.ts';
import { ErrorDeValidacion, SinPermiso } from '../datos/erroresDominio.ts';
import type { SlotConAlumno } from '../dominio/slots.ts';
import type { ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';

const ALUMNO_1 = { id: 'alumno-1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null, avatar_ruta: null, activo: true };
const ALUMNO_2 = { id: 'alumno-2', nombre: 'Luis', primer_apellido: 'Pérez', segundo_apellido: null, avatar_ruta: null, activo: true };

// 2026-09-08 es martes (dia_semana 2), 2026-09-10 es jueves (dia_semana 4).
const RELOJ = crearRelojFijo(new Date('2026-09-08T10:00:00.000Z'));

const SLOT_ALUMNO_1: SlotConAlumno = {
  id: 'slot-1',
  alumno_id: 'alumno-1',
  profesor_id: 'prof-1',
  dia_semana: 2,
  hora_inicio: '17:00',
  hora_fin: '18:00',
  asignatura_o_grupo: 'Matemáticas',
  vigente_desde: '2026-01-01',
  vigente_hasta: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  alumno: ALUMNO_1,
};
const SLOT_ALUMNO_2: SlotConAlumno = { ...SLOT_ALUMNO_1, id: 'slot-2', alumno_id: 'alumno-2', alumno: ALUMNO_2 };

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaHorarioCentro> = {}): DependenciasPantallaHorarioCentro {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaHorarioCentro falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    reloj: RELOJ,
    listarSlots: overrides.listarSlots ?? (() => Promise.resolve([])),
    listarProfesoresParaSelector: overrides.listarProfesoresParaSelector ?? (() => Promise.resolve([{ id: 'prof-1', nombre: 'Pedro Profesor' }])),
    resolverNombresProfesores: overrides.resolverNombresProfesores ?? (() => Promise.resolve(new Map([['prof-1', 'Pedro Profesor']]))),
    modificarSlot: overrides.modificarSlot ?? noImplementado('modificarSlot'),
    cesarSlot: overrides.cesarSlot ?? noImplementado('cesarSlot'),
    crearSlot: overrides.crearSlot ?? noImplementado('crearSlot'),
    buscarAlumnos: overrides.buscarAlumnos ?? (() => Promise.resolve([])),
    rebote: overrides.rebote ?? crearReboteDePrueba(),
    ...overrides,
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
  elemento.dispatchEvent(new ventana.Event(tipo, { bubbles: true, cancelable: true }));
}

function boton(contenedor: HTMLElement, texto: string): HTMLButtonElement {
  const encontrado = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === texto);
  assert.ok(encontrado, `no se encontró un botón con el texto exacto "${texto}"`);
  return encontrado;
}

// --- Combobox de alumnos (R-27, comboboxAlumnoExtra.ts con mostrarNota: false) -----------------

const ANA_RESULTADO: ResultadoBusquedaAlumno = {
  id: 'alumno-1',
  nombre: 'Ana',
  primer_apellido: 'García',
  segundo_apellido: null,
  centro_nombre: 'IES Cervantes',
};
const LUIS_RESULTADO: ResultadoBusquedaAlumno = {
  id: 'alumno-2',
  nombre: 'Luis',
  primer_apellido: 'Pérez',
  segundo_apellido: null,
  centro_nombre: 'IES Cervantes',
};

function escribirEnCombobox(contenedor: HTMLElement, texto: string): void {
  const input = contenedor.querySelector<HTMLInputElement>('input[role="combobox"]');
  assert.ok(input, 'no se encuentra el combobox de alumnos');
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.value = texto;
  input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
}

/** Selecciona la PRIMERA opción del combobox de alumnos ya abierto (ArrowDown + Enter). */
function seleccionarPrimeraOpcionCombobox(contenedor: HTMLElement): void {
  const input = contenedor.querySelector<HTMLInputElement>('input[role="combobox"]');
  assert.ok(input);
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.dispatchEvent(new ventana.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  input.dispatchEvent(new ventana.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

// --- Requisitos 1, 2 y 3: "Nueva sesión de grupo" -----------------------------------------------

void test('"Nueva sesión de grupo" es un botón de la propia pantalla, disponible incluso sin ningún horario vigente', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.resolve([]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Este centro no tiene ningún horario vigente/);
  boton(contenedor, 'Nueva sesión de grupo'); // no lanza si existe
});

void test('abre un formulario con día/hora/profesor/asignatura y fecha de efecto por defecto hoy, sin campo de motivo', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.resolve([]) }));
  await esperarMicrotareas();

  boton(contenedor, 'Nueva sesión de grupo').click();

  const campoFechaEfecto = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fecha-efecto');
  assert.ok(campoFechaEfecto);
  assert.equal(campoFechaEfecto.value, '2026-09-08');
  assert.ok(contenedor.querySelector('#horario-centro-crear-profesor'));
  assert.ok(contenedor.querySelector('#horario-centro-crear-dia'));
  assert.ok(contenedor.querySelector('#horario-centro-crear-inicio'));
  assert.ok(contenedor.querySelector('#horario-centro-crear-fin'));
  assert.ok(contenedor.querySelector('#horario-centro-crear-asignatura'));
  // A diferencia del combobox de "alumno extra" (T-20), aquí no hay campo de motivo (mostrarNota: false).
  assert.equal(contenedor.querySelectorAll('input').length, 5); // inicio, fin, asignatura, fecha, buscador — sin nota
});

void test('elegir un alumno lo añade a la lista del grupo, y "Quitar" lo retira', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({ listarSlots: () => Promise.resolve([]), buscarAlumnos: () => Promise.resolve([ANA_RESULTADO]), rebote }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  assert.match(contenedor.textContent, /Ana García/);

  boton(contenedor, 'Quitar').click();
  assert.doesNotMatch(contenedor.textContent, /Ana García/);
});

void test('requisito 5: seleccionar dos veces al mismo alumno avisa sin duplicarlo en la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({ listarSlots: () => Promise.resolve([]), buscarAlumnos: () => Promise.resolve([ANA_RESULTADO]), rebote }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  const items = contenedor.querySelectorAll('li');
  assert.equal(items.length, 1, 'Ana no debe aparecer dos veces en la lista del grupo');
  assert.match(contenedor.textContent, /ya está en la selección/);
});

void test('confirmar sin ningún alumno seleccionado no llama a crearSlot y muestra el error', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([]),
      crearSlot: () => {
        llamadas += 1;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fin');
  assert.ok(campoInicio && campoFin);
  campoInicio.value = '10:00';
  campoFin.value = '11:00';
  boton(contenedor, 'Crear sesión de grupo').click();
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.match(contenedor.textContent, /Selecciona al menos un alumno/);
});

void test('la hora de fin debe ser posterior a la de inicio, sin llamar a crearSlot', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  let llamadas = 0;
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([]),
      buscarAlumnos: () => Promise.resolve([ANA_RESULTADO]),
      rebote,
      crearSlot: () => {
        llamadas += 1;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fin');
  assert.ok(campoInicio && campoFin);
  campoFin.value = campoInicio.value;
  boton(contenedor, 'Crear sesión de grupo').click();
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.match(contenedor.textContent, /La hora de fin debe ser posterior a la de inicio/);
});

// --- Requisitos 2, 3 y 4: alta en bloque -----------------------------------------------------

void test('crea un slot por cada alumno elegido, con el mismo día/hora/profesor/asignatura/fecha de efecto', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  const llamadas: { alumnoId: string; diaSemana: number; horaFin: string; fechaEfecto: string; asignatura: string | null }[] = [];
  let recargas = 0;
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => {
        recargas += 1;
        return Promise.resolve([]);
      },
      buscarAlumnos: (texto) => Promise.resolve(texto === 'ana' ? [ANA_RESULTADO] : texto === 'luis' ? [LUIS_RESULTADO] : []),
      rebote,
      crearSlot: (datos) => {
        llamadas.push({
          alumnoId: datos.alumno_id,
          diaSemana: datos.dia_semana,
          horaFin: datos.hora_fin,
          fechaEfecto: datos.vigente_desde.toISOString().slice(0, 10),
          asignatura: datos.asignatura_o_grupo ?? null,
        });
        return Promise.resolve({
          slot: {
            id: `slot-nuevo-${datos.alumno_id}`,
            alumno_id: datos.alumno_id,
            profesor_id: datos.profesor_id,
            dia_semana: datos.dia_semana,
            hora_inicio: datos.hora_inicio,
            hora_fin: datos.hora_fin,
            asignatura_o_grupo: datos.asignatura_o_grupo ?? null,
            vigente_desde: datos.vigente_desde.toISOString().slice(0, 10),
            vigente_hasta: null,
            creado_en: '2026-01-01T00:00:00Z',
            actualizado_en: '2026-01-01T00:00:00Z',
          },
          avisoSolapeProfesor: false,
        });
      },
    }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor); // Ana
  escribirEnCombobox(contenedor, 'luis');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor); // Luis

  const selectDia = contenedor.querySelector<HTMLSelectElement>('#horario-centro-crear-dia');
  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fin');
  const campoAsignatura = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-asignatura');
  const campoFechaEfecto = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fecha-efecto');
  assert.ok(selectDia && campoInicio && campoFin && campoAsignatura && campoFechaEfecto);
  selectDia.value = '2';
  campoInicio.value = '16:00';
  campoFin.value = '17:00';
  campoAsignatura.value = 'Física';
  campoFechaEfecto.value = '2026-09-15';
  boton(contenedor, 'Crear sesión de grupo').click();
  await esperarMicrotareas();

  assert.equal(llamadas.length, 2);
  assert.deepEqual(
    llamadas.map((l) => l.alumnoId).sort(),
    ['alumno-1', 'alumno-2'],
  );
  for (const llamada of llamadas) {
    assert.equal(llamada.diaSemana, 2);
    assert.equal(llamada.horaFin, '17:00');
    assert.equal(llamada.fechaEfecto, '2026-09-15');
    assert.equal(llamada.asignatura, 'Física');
  }
  assert.ok(recargas >= 2, 'debe recargar el horario tras el alta en bloque');
  assert.doesNotMatch(contenedor.textContent, /Todavía no se pudo crear la sesión/);
});

void test('requisito 4: un solape del propio alumno no impide crear al resto, y se reintenta solo con quien falló', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  const llamadas: string[] = [];
  const intentos: Record<string, number> = {};
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([]),
      buscarAlumnos: (texto) => Promise.resolve(texto === 'ana' ? [ANA_RESULTADO] : texto === 'luis' ? [LUIS_RESULTADO] : []),
      rebote,
      crearSlot: (datos) => {
        llamadas.push(datos.alumno_id);
        intentos[datos.alumno_id] = (intentos[datos.alumno_id] ?? 0) + 1;
        if (datos.alumno_id === 'alumno-2' && intentos[datos.alumno_id] === 1) {
          return Promise.reject(new ErrorDeValidacion('Este alumno ya tiene un horario que se solapa en ese día y hora.'));
        }
        return Promise.resolve({
          slot: {
            id: `slot-nuevo-${datos.alumno_id}`,
            alumno_id: datos.alumno_id,
            profesor_id: datos.profesor_id,
            dia_semana: datos.dia_semana,
            hora_inicio: datos.hora_inicio,
            hora_fin: datos.hora_fin,
            asignatura_o_grupo: datos.asignatura_o_grupo ?? null,
            vigente_desde: datos.vigente_desde.toISOString().slice(0, 10),
            vigente_hasta: null,
            creado_en: '2026-01-01T00:00:00Z',
            actualizado_en: '2026-01-01T00:00:00Z',
          },
          avisoSolapeProfesor: false,
        });
      },
    }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);
  escribirEnCombobox(contenedor, 'luis');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fin');
  assert.ok(campoInicio && campoFin);
  campoInicio.value = '16:00';
  campoFin.value = '17:00';
  boton(contenedor, 'Crear sesión de grupo').click();
  await esperarMicrotareas();

  assert.deepEqual(llamadas, ['alumno-1', 'alumno-2']);
  assert.match(contenedor.textContent, /Todavía no se pudo crear la sesión para:/);
  assert.match(contenedor.textContent, /Luis Pérez/);
  assert.match(contenedor.textContent, /Revisa los datos introducidos/);

  boton(contenedor, 'Reintentar').click();
  await esperarMicrotareas();

  assert.deepEqual(llamadas, ['alumno-1', 'alumno-2', 'alumno-2']); // solo se reintenta quien falló
  assert.doesNotMatch(contenedor.textContent, /Todavía no se pudo crear la sesión/);
});

void test('un aviso de solape de profesor se muestra sin bloquear el alta', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([]),
      buscarAlumnos: () => Promise.resolve([ANA_RESULTADO]),
      rebote,
      crearSlot: (datos) =>
        Promise.resolve({
          slot: {
            id: 'slot-nuevo',
            alumno_id: datos.alumno_id,
            profesor_id: datos.profesor_id,
            dia_semana: datos.dia_semana,
            hora_inicio: datos.hora_inicio,
            hora_fin: datos.hora_fin,
            asignatura_o_grupo: datos.asignatura_o_grupo ?? null,
            vigente_desde: datos.vigente_desde.toISOString().slice(0, 10),
            vigente_hasta: null,
            creado_en: '2026-01-01T00:00:00Z',
            actualizado_en: '2026-01-01T00:00:00Z',
          },
          avisoSolapeProfesor: true,
        }),
    }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();

  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-crear-fin');
  assert.ok(campoInicio && campoFin);
  campoInicio.value = '16:00';
  campoFin.value = '17:00';
  boton(contenedor, 'Crear sesión de grupo').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /ya tenía otro alumno en este mismo día y hora/);
});

void test('"Cancelar" cierra el formulario sin llamar a crearSlot', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  let llamadas = 0;
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([]),
      buscarAlumnos: () => Promise.resolve([ANA_RESULTADO]),
      rebote,
      crearSlot: () => {
        llamadas += 1;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();
  boton(contenedor, 'Nueva sesión de grupo').click();
  escribirEnCombobox(contenedor, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  seleccionarPrimeraOpcionCombobox(contenedor);

  boton(contenedor, 'Cancelar').click();

  assert.equal(llamadas, 0);
  assert.doesNotMatch(contenedor.textContent, /Ana García/);
  boton(contenedor, 'Nueva sesión de grupo'); // vuelve a estar disponible
});

// --- Acceso ---

void test('un teacher ve "No tienes acceso" y no se dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({ rol: 'teacher', listarSlots: () => { llamadas += 1; return Promise.resolve([]); } }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

// --- Carga ---

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('sin ningún slot vigente muestra un mensaje explícito, no una lista en blanco', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.resolve([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Este centro no tiene ningún horario vigente/);
});

void test('un fallo al cargar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

// --- Requisito 1: agrupación por sesión, día, profesor, asignatura y alumnos por nombre ---

void test('agrupa a los alumnos de la misma sesión bajo un único profesor/hora/asignatura, sin ninguna fotografía', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.resolve([SLOT_ALUMNO_1, SLOT_ALUMNO_2]) }));
  await esperarMicrotareas();

  const texto = contenedor.textContent;
  assert.match(texto, /Pedro Profesor/);
  assert.match(texto, /17:00–18:00/);
  assert.match(texto, /Matemáticas/);
  assert.match(texto, /Ana García/);
  assert.match(texto, /Luis Pérez/);
  assert.equal(contenedor.querySelectorAll('img').length, 0);
  // Una única sesión (los dos alumnos comparten profesor/día/hora/asignatura): un solo par de botones.
  assert.equal(contenedor.querySelectorAll('article').length, 1);
});

void test('dos sesiones en días distintos aparecen bajo su propia cabecera de día', async () => {
  const contenedor = crearContenedorDePruebas();
  const otroDia: SlotConAlumno = { ...SLOT_ALUMNO_2, id: 'slot-3', dia_semana: 4, hora_inicio: '09:00', hora_fin: '10:00' };
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.resolve([SLOT_ALUMNO_1, otroDia]) }));
  await esperarMicrotareas();

  const cabeceras = Array.from(contenedor.querySelectorAll('h3')).map((h) => h.textContent);
  assert.deepEqual(cabeceras, ['Martes', 'Jueves']);
});

void test('no ofrece ningún control de edición por alumno suelto, solo por sesión completa', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(contenedor, crearDepsFalsas({ listarSlots: () => Promise.resolve([SLOT_ALUMNO_1, SLOT_ALUMNO_2]) }));
  await esperarMicrotareas();

  const botones = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent);
  assert.deepEqual(botones, ['Nueva sesión de grupo', 'Editar sesión completa', 'Cesar sesión completa']);
});

// --- Requisito 2 y 4: edición en bloque de una sesión completa ---

void test('editar sesión completa aplica el cambio a cada alumno del grupo, con la misma fecha de efecto', async () => {
  const contenedor = crearContenedorDePruebas();
  const llamadas: { slotId: string; horaFin: string | undefined; fecha: string }[] = [];
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([SLOT_ALUMNO_1, SLOT_ALUMNO_2]),
      modificarSlot: (slotId, cambios, fecha) => {
        llamadas.push({ slotId, horaFin: cambios.hora_fin, fecha: fecha.toISOString().slice(0, 10) });
        return Promise.resolve({ slot: { ...SLOT_ALUMNO_1, id: slotId }, avisoSolapeProfesor: false });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Editar sesión completa').click();
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-editar-fin');
  const campoFechaEfecto = contenedor.querySelector<HTMLInputElement>('#horario-centro-editar-fecha-efecto');
  assert.ok(campoFin && campoFechaEfecto);
  assert.equal(campoFin.value, '18:00'); // precargado desde la sesión vigente
  assert.equal(campoFechaEfecto.value, '2026-09-08'); // por defecto hoy (requisito 2)
  campoFin.value = '18:30';
  campoFechaEfecto.value = '2026-09-15';
  const form = contenedor.querySelector('form');
  assert.ok(form);
  disparar(form, 'submit');
  await esperarMicrotareas();

  assert.equal(llamadas.length, 2);
  assert.deepEqual(
    llamadas.map((l) => l.slotId).sort(),
    ['slot-1', 'slot-2'],
  );
  for (const llamada of llamadas) {
    assert.equal(llamada.horaFin, '18:30');
    assert.equal(llamada.fecha, '2026-09-15');
  }
});

void test('la hora de fin debe ser posterior a la de inicio, sin llamar a modificarSlot', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([SLOT_ALUMNO_1]),
      modificarSlot: () => { llamadas += 1; return Promise.reject(new Error('no debería llamarse')); },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Editar sesión completa').click();
  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-editar-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-editar-fin');
  assert.ok(campoInicio && campoFin);
  campoFin.value = campoInicio.value;
  const form = contenedor.querySelector('form');
  assert.ok(form);
  disparar(form, 'submit');
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.match(contenedor.textContent, /La hora de fin debe ser posterior a la de inicio/);
});

void test('requisito 4: un solape de un alumno concreto no impide mover al resto, y se puede reintentar solo con quien falló', async () => {
  const contenedor = crearContenedorDePruebas();
  const llamadas: string[] = [];
  const intentos: Record<string, number> = {};
  // Fake CON ESTADO: un `modificarSlot` con éxito de verdad muta la fila servida por `listarSlots`,
  // como haría PostgREST — necesario para que, tras el `cargar()` que sigue a cada intento, la
  // sesión de origen refleje que ese alumno ya no comparte hora con quien falló.
  let slotsServidor: SlotConAlumno[] = [SLOT_ALUMNO_1, SLOT_ALUMNO_2];
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve(slotsServidor),
      modificarSlot: (slotId, cambios) => {
        llamadas.push(slotId);
        intentos[slotId] = (intentos[slotId] ?? 0) + 1;
        if (slotId === 'slot-2' && intentos[slotId] === 1) {
          return Promise.reject(new ErrorDeValidacion('Este alumno ya tiene un horario que se solapa en ese día y hora.'));
        }
        slotsServidor = slotsServidor.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                hora_inicio: cambios.hora_inicio ?? slot.hora_inicio,
                hora_fin: cambios.hora_fin ?? slot.hora_fin,
                dia_semana: cambios.dia_semana ?? slot.dia_semana,
              }
            : slot,
        );
        const actualizado = slotsServidor.find((slot) => slot.id === slotId);
        assert.ok(actualizado);
        return Promise.resolve({ slot: actualizado, avisoSolapeProfesor: false });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Editar sesión completa').click();
  const campoInicio = contenedor.querySelector<HTMLInputElement>('#horario-centro-editar-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#horario-centro-editar-fin');
  assert.ok(campoInicio && campoFin);
  campoInicio.value = '19:00';
  campoFin.value = '20:00';
  const form = contenedor.querySelector('form');
  assert.ok(form);
  disparar(form, 'submit');
  await esperarMicrotareas();

  assert.deepEqual(llamadas, ['slot-1', 'slot-2']);
  assert.match(contenedor.textContent, /Todavía no se pudo mover a:/);
  assert.match(contenedor.textContent, /Luis Pérez/);
  assert.match(contenedor.textContent, /Revisa los datos introducidos/);
  // Ana (slot-1) ya se movió con éxito: su sesión de origen (17:00–18:00) ya no la incluye.
  const sesionOrigen = Array.from(contenedor.querySelectorAll('article')).find((a) => a.textContent.includes('17:00–18:00'));
  assert.ok(sesionOrigen);
  assert.ok(!sesionOrigen.textContent.includes('Ana García'));

  boton(contenedor, 'Reintentar').click();
  await esperarMicrotareas();

  assert.deepEqual(llamadas, ['slot-1', 'slot-2', 'slot-2']); // solo se reintenta el que falló
  assert.doesNotMatch(contenedor.textContent, /Todavía no se pudo mover a:/);
});

// --- Requisito 3 y 4: cese en bloque de una sesión completa ---

void test('cesar sesión completa aplica el cese a cada alumno del grupo con la misma fecha de efecto', async () => {
  const contenedor = crearContenedorDePruebas();
  const llamadas: { slotId: string; fecha: string }[] = [];
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([SLOT_ALUMNO_1, SLOT_ALUMNO_2]),
      cesarSlot: (slotId, fecha) => {
        llamadas.push({ slotId, fecha: fecha.toISOString().slice(0, 10) });
        return Promise.resolve({ ...SLOT_ALUMNO_1, id: slotId, vigente_hasta: fecha.toISOString().slice(0, 10) });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Cesar sesión completa').click();
  const campoFechaEfecto = contenedor.querySelector<HTMLInputElement>('#horario-centro-cesar-fecha-efecto');
  assert.ok(campoFechaEfecto);
  assert.equal(campoFechaEfecto.value, '2026-09-08');
  campoFechaEfecto.value = '2026-09-20';
  boton(contenedor, 'Confirmar cese').click();
  await esperarMicrotareas();

  assert.equal(llamadas.length, 2);
  assert.deepEqual(
    llamadas.map((l) => l.slotId).sort(),
    ['slot-1', 'slot-2'],
  );
  for (const llamada of llamadas) {
    assert.equal(llamada.fecha, '2026-09-20');
  }
});

void test('requisito 4 (cese): un fallo de un alumno concreto no impide cesar al resto, y se reintenta solo con quien falló', async () => {
  const contenedor = crearContenedorDePruebas();
  const llamadas: string[] = [];
  const intentos: Record<string, number> = {};
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([SLOT_ALUMNO_1, SLOT_ALUMNO_2]),
      cesarSlot: (slotId, fecha) => {
        llamadas.push(slotId);
        intentos[slotId] = (intentos[slotId] ?? 0) + 1;
        if (slotId === 'slot-1' && intentos[slotId] === 1) {
          return Promise.reject(new Error('fallo de servidor'));
        }
        return Promise.resolve({ ...SLOT_ALUMNO_1, id: slotId, vigente_hasta: fecha.toISOString().slice(0, 10) });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Cesar sesión completa').click();
  boton(contenedor, 'Confirmar cese').click();
  await esperarMicrotareas();

  assert.deepEqual(llamadas, ['slot-1', 'slot-2']);
  assert.match(contenedor.textContent, /Todavía no se pudo cesar a:/);
  assert.match(contenedor.textContent, /Ana García/);

  boton(contenedor, 'Reintentar').click();
  await esperarMicrotareas();

  assert.deepEqual(llamadas, ['slot-1', 'slot-2', 'slot-1']);
  assert.doesNotMatch(contenedor.textContent, /Todavía no se pudo cesar a:/);
});

// --- Aviso de solape de profesor (no bloqueante) ---

void test('un aviso de solape de profesor se muestra sin bloquear la edición', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHorarioCentro(
    contenedor,
    crearDepsFalsas({
      listarSlots: () => Promise.resolve([SLOT_ALUMNO_1]),
      modificarSlot: (slotId) => Promise.resolve({ slot: { ...SLOT_ALUMNO_1, id: slotId }, avisoSolapeProfesor: true }),
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Editar sesión completa').click();
  const form = contenedor.querySelector('form');
  assert.ok(form);
  disparar(form, 'submit');
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /ya tenía otro alumno en este mismo día y hora/);
});
