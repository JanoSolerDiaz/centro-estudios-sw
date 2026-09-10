import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaRegistrosSlot, type DependenciasPantallaRegistrosSlot } from './pantallaRegistrosSlot.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from '../dominio/slots.ts';
import type { Asistencia, AsistenciaHistorial, ExcepcionSlot, PersonaReferencia } from '../dominio/tipos.ts';
import type { ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';

// Miércoles 2026-08-26.
const INSTANTE = new Date('2026-08-26T15:30:00.000Z');

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
    peticion_id: 'peticion-1',
    ...sobrescribir,
  };
}

function crearResultadoBusqueda(sobrescribir: Partial<ResultadoBusquedaAlumno> = {}): ResultadoBusquedaAlumno {
  return {
    id: 'alumno-2',
    nombre: 'Bruno',
    primer_apellido: 'Ruiz',
    segundo_apellido: null,
    centro_nombre: 'Centro Norte',
    ...sobrescribir,
  };
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaRegistrosSlot> = {}): DependenciasPantallaRegistrosSlot {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaRegistrosSlot falsas: ${metodo} no se esperaba en este test`));
  let contadorPeticionId = 0;

  return {
    rol: overrides.rol ?? 'teacher',
    profesorId: overrides.profesorId ?? 'profesor-1',
    reloj: overrides.reloj ?? crearRelojFijo(INSTANTE),
    ...(overrides.slotInicialId !== undefined ? { slotInicialId: overrides.slotInicialId } : {}),
    ...(overrides.fechaInicial !== undefined ? { fechaInicial: overrides.fechaInicial } : {}),
    listarProfesoresParaSelector: overrides.listarProfesoresParaSelector ?? (() => Promise.resolve([])),
    listarSlotsDeProfesor: overrides.listarSlotsDeProfesor ?? (() => Promise.resolve([])),
    listarRegistros: overrides.listarRegistros ?? (() => Promise.resolve([])),
    listarRegistrosDelGrupo: overrides.listarRegistrosDelGrupo ?? (() => Promise.resolve([])),
    listarHistorial: overrides.listarHistorial ?? (() => Promise.resolve([])),
    obtenerAlumnoParaTarjeta: overrides.obtenerAlumnoParaTarjeta ?? noImplementado('obtenerAlumnoParaTarjeta'),
    buscarAlumnos: overrides.buscarAlumnos ?? (() => Promise.resolve([])),
    actualizar: overrides.actualizar ?? noImplementado('actualizar'),
    registrarOlvidado: overrides.registrarOlvidado ?? noImplementado('registrarOlvidado'),
    registrarAusencia: overrides.registrarAusencia ?? noImplementado('registrarAusencia'),
    ...(overrides.obtenerPersonasReferencia ? { obtenerPersonasReferencia: overrides.obtenerPersonasReferencia } : {}),
    ...(overrides.copiarAlPortapapeles ? { copiarAlPortapapeles: overrides.copiarAlPortapapeles } : {}),
    ...(overrides.listarExcepcionesDeSlot ? { listarExcepcionesDeSlot: overrides.listarExcepcionesDeSlot } : {}),
    ...(overrides.declararExcepcionSlot ? { declararExcepcionSlot: overrides.declararExcepcionSlot } : {}),
    ...(overrides.desactivarExcepcionSlot ? { desactivarExcepcionSlot: overrides.desactivarExcepcionSlot } : {}),
    ...(overrides.registrarAvisoCancelacionSlot ? { registrarAvisoCancelacionSlot: overrides.registrarAvisoCancelacionSlot } : {}),
    generarPeticionId:
      overrides.generarPeticionId ??
      (() => {
        contadorPeticionId += 1;
        return `peticion-cliente-${String(contadorPeticionId)}`;
      }),
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function dispararEvento(elemento: Element, tipo: string): void {
  const ventana = elemento.ownerDocument.defaultView;
  assert.ok(ventana);
  elemento.dispatchEvent(new ventana.Event(tipo));
}

function botonPorTexto(contenedor: HTMLElement, texto: string): HTMLButtonElement {
  const boton = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === texto);
  assert.ok(boton, `no se encuentra el botón "${texto}"`);
  return boton;
}

/** Nombres listados en la confirmación de "Marcar el resto como ausente" (R-17) — el único `<ul>`
 * de toda la pantalla, distinto del `<select>` de slots (que también lista los nombres, para
 * elegir entre ellos) y de `listaRegistros` (que es siempre un `<ul>` con `aria-label` propio). */
function nombresEnConfirmacionCierre(contenedor: HTMLElement): readonly string[] {
  const lista = Array.from(contenedor.querySelectorAll('ul')).find((ul) => !ul.hasAttribute('aria-label'));
  return lista ? Array.from(lista.querySelectorAll('li')).map((li) => li.textContent) : [];
}

// --- Acceso -----------------------------------------------------------------------------------

void test('student no tiene acceso a esta pantalla', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

// --- teacher: sin selector de profesor, carga sus propios slots --------------------------------

void test('teacher: no hay selector de profesor y se cargan sus slots al montar', async () => {
  const contenedor = crearContenedorDePruebas();
  let idPedido: string | undefined;
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      profesorId: 'profesor-1',
      listarSlotsDeProfesor: (id) => {
        idPedido = id;
        return Promise.resolve([crearSlot()]);
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(idPedido, 'profesor-1');
  assert.equal(contenedor.querySelector('#registros-profesor'), null);
  const opciones = Array.from(contenedor.querySelectorAll<HTMLOptionElement>('#registros-slot option'));
  assert.ok(opciones.some((o) => o.textContent.includes('García')));
});

// --- administrator: selector de profesor, no carga slots hasta elegir uno ----------------------

void test('administrator: hay selector de profesor y no se cargan slots hasta elegir uno', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasSlots = 0;
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      rol: 'administrator',
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'p1', nombre: 'Marta Ruiz' }]),
      listarSlotsDeProfesor: () => {
        llamadasSlots += 1;
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();

  const selectProfesor = contenedor.querySelector<HTMLSelectElement>('#registros-profesor');
  assert.ok(selectProfesor);
  assert.equal(llamadasSlots, 0);
  assert.ok(Array.from(selectProfesor.options).some((o) => o.textContent === 'Marta Ruiz'));

  selectProfesor.value = 'p1';
  dispararEvento(selectProfesor, 'change');
  await esperarMicrotareas();

  assert.equal(llamadasSlots, 1);
});

// --- Selector de slot y carga de registros ------------------------------------------------------

void test('solo ofrece los slots vigentes en la fecha elegida', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([
          crearSlot({ id: 'slot-vigente', vigente_desde: '2026-01-01', vigente_hasta: null }),
          crearSlot({ id: 'slot-cesado', vigente_desde: '2025-01-01', vigente_hasta: '2025-12-31' }),
        ]),
    }),
  );
  await esperarMicrotareas();

  const valores = Array.from(contenedor.querySelectorAll<HTMLOptionElement>('#registros-slot option')).map((o) => o.value);
  assert.ok(valores.includes('slot-vigente'));
  assert.ok(!valores.includes('slot-cesado'));
});

void test('al elegir un slot se piden sus registros del día elegido, y se pintan con el nombre del alumno', async () => {
  const contenedor = crearContenedorDePruebas();
  let argumentos: readonly [string, Date] | undefined;
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: (slotId, fecha) => {
        argumentos = [slotId, fecha];
        return Promise.resolve([crearAsistencia()]);
      },
    }),
  );
  await esperarMicrotareas();

  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  assert.ok(argumentos);
  assert.equal(argumentos[0], 'slot-1');
  assert.match(contenedor.textContent, /Ana García López/);
});

// --- Preselección de slot (T-22, "mi horario") --------------------------------------------------

void test('slotInicialId preselecciona el slot y carga sus registros sin que el usuario elija nada', async () => {
  const contenedor = crearContenedorDePruebas();
  let argumentos: readonly [string, Date] | undefined;
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      slotInicialId: 'slot-1',
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot({ id: 'slot-1' }), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' })]),
      listarRegistros: (slotId, fecha) => {
        argumentos = [slotId, fecha];
        return Promise.resolve([crearAsistencia()]);
      },
    }),
  );
  await esperarMicrotareas();

  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  assert.equal(selectSlot.value, 'slot-1');
  assert.ok(argumentos);
  assert.equal(argumentos[0], 'slot-1');
  assert.match(contenedor.textContent, /Ana García López/);
});

void test('slotInicialId que no coincide con ningún slot cargado se ignora en silencio', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasRegistros = 0;
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      slotInicialId: 'slot-que-ya-no-existe',
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot({ id: 'slot-1' })]),
      listarRegistros: () => {
        llamadasRegistros += 1;
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();

  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  assert.equal(selectSlot.value, '');
  assert.equal(llamadasRegistros, 0);
});

// --- Preselección de fecha (R-13, "sesiones sin pasar lista") ------------------------------------

void test('fechaInicial, junto con slotInicialId, preselecciona el día y trae los registros de esa fecha', async () => {
  const contenedor = crearContenedorDePruebas();
  let argumentos: readonly [string, Date] | undefined;
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      slotInicialId: 'slot-1',
      fechaInicial: '2026-08-24',
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot({ id: 'slot-1' })]),
      listarRegistros: (slotId, fecha) => {
        argumentos = [slotId, fecha];
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();

  const campoFecha = contenedor.querySelector<HTMLInputElement>('#registros-fecha');
  assert.ok(campoFecha);
  assert.equal(campoFecha.value, '2026-08-24');
  assert.ok(argumentos);
  assert.equal(argumentos[0], 'slot-1');
  assert.equal(argumentos[1].toISOString().slice(0, 10), '2026-08-24');
});

void test('fechaInicial sin slotInicialId no tiene efecto: la pantalla arranca en el día de hoy', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      fechaInicial: '2026-08-24',
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot({ id: 'slot-1' })]),
    }),
  );
  await esperarMicrotareas();

  const campoFecha = contenedor.querySelector<HTMLInputElement>('#registros-fecha');
  assert.ok(campoFecha);
  assert.equal(campoFecha.value, '2026-08-26'); // fechaLocalISO(INSTANTE)
});

void test('un registro anulado se muestra tachado y con su motivo', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () =>
        Promise.resolve([crearAsistencia({ estado: 'anulada', motivo_anulacion: 'Registrado por error' })]),
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  const item = contenedor.querySelector('li[data-registro-id="asistencia-1"] span');
  assert.ok(item);
  assert.equal((item as HTMLElement).style.textDecoration, 'line-through');
  assert.match(contenedor.textContent, /Registrado por error/);
});

void test('un registro de ausencia (R-01) se distingue en el listado, sin el tachado de una anulación', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente' })]),
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  const item = contenedor.querySelector('li[data-registro-id="asistencia-1"] span');
  assert.ok(item);
  assert.match(item.textContent, /\(ausente\)/);
  assert.notEqual((item as HTMLElement).style.textDecoration, 'line-through');
});

// --- Acciones de edición --------------------------------------------------------------------------

async function montarConUnRegistro(overrides: Partial<DependenciasPantallaRegistrosSlot> = {}): Promise<HTMLElement> {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([crearAsistencia()]),
      ...overrides,
    }),
  );
  await esperarMicrotareas();

  const selectProfesor = contenedor.querySelector<HTMLSelectElement>('#registros-profesor');
  if (selectProfesor) {
    const primeraOpcionReal = Array.from(selectProfesor.options).find((o) => o.value !== '');
    assert.ok(primeraOpcionReal, 'no hay ningún profesor en el selector (falta listarProfesoresParaSelector en el override)');
    selectProfesor.value = primeraOpcionReal.value;
    dispararEvento(selectProfesor, 'change');
    await esperarMicrotareas();
  }

  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Editar').click();
  return contenedor;
}

void test('editar la nota: llama a actualizar con notaProvista y refresca la fila con la respuesta', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    actualizar: (profesorDuenoId, entrada) => {
      entradaRecibida = { profesorDuenoId, entrada };
      return Promise.resolve(crearAsistencia({ nota: 'Llegó tarde' }));
    },
  });

  const campoNota = contenedor.querySelector<HTMLInputElement>('#nota-asistencia-1');
  assert.ok(campoNota);
  campoNota.value = 'Llegó tarde';
  dispararEvento(campoNota, 'input');
  botonPorTexto(contenedor, 'Guardar nota').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    profesorDuenoId: 'profesor-1',
    entrada: { asistenciaId: 'asistencia-1', nota: 'Llegó tarde', notaProvista: true },
  });
});

void test('anular exige confirmación explícita con el motivo a la vista antes de llamar a actualizar', async () => {
  let llamadas = 0;
  const contenedor = await montarConUnRegistro({
    actualizar: (_id, entrada) => {
      llamadas += 1;
      return Promise.resolve(crearAsistencia({ estado: 'anulada', motivo_anulacion: entrada.motivoAnulacion ?? null }));
    },
  });

  const botonAnular = botonPorTexto(contenedor, 'Anular');
  assert.equal(botonAnular.disabled, true); // sin motivo, deshabilitado

  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#motivo-asistencia-1');
  assert.ok(campoMotivo);
  campoMotivo.value = 'Registrado por error';
  dispararEvento(campoMotivo, 'input');

  botonPorTexto(contenedor, 'Anular').click();
  assert.equal(llamadas, 0); // todavía no: falta confirmar
  assert.match(contenedor.textContent, /¿Anular este registro\? Motivo: "Registrado por error"/);

  botonPorTexto(contenedor, 'Confirmar anulación').click();
  await esperarMicrotareas();

  assert.equal(llamadas, 1);
});

// --- Justificar una ausencia (R-02) ---------------------------------------------------------

void test('justificar no se ofrece sobre un registro que no está ausente', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida' })]),
  });

  assert.equal(contenedor.textContent.includes('Guardar justificación'), false);
});

void test('justificar: el botón está deshabilitado hasta elegir un motivo de la lista cerrada', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente' })]),
  });

  const botonJustificar = botonPorTexto(contenedor, 'Guardar justificación');
  assert.equal(botonJustificar.disabled, true);

  const selectMotivo = contenedor.querySelector<HTMLSelectElement>('#motivo-justificacion-asistencia-1');
  assert.ok(selectMotivo);
  selectMotivo.value = 'cita_medica';
  dispararEvento(selectMotivo, 'change');

  assert.equal(botonPorTexto(contenedor, 'Guardar justificación').disabled, false);
});

void test('justificar: llama a actualizar con justificar, motivoJustificacion y notaJustificacion', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente' })]),
    actualizar: (_id, entrada) => {
      entradaRecibida = entrada;
      return Promise.resolve(
        crearAsistencia({ estado: 'ausente', motivo_justificacion: 'cita_medica', nota_justificacion: 'Justificante en papel' }),
      );
    },
  });

  const selectMotivo = contenedor.querySelector<HTMLSelectElement>('#motivo-justificacion-asistencia-1');
  assert.ok(selectMotivo);
  selectMotivo.value = 'cita_medica';
  dispararEvento(selectMotivo, 'change');

  const campoNotaJustificacion = contenedor.querySelector<HTMLInputElement>('#nota-justificacion-asistencia-1');
  assert.ok(campoNotaJustificacion);
  campoNotaJustificacion.value = 'Justificante en papel';
  dispararEvento(campoNotaJustificacion, 'input');

  botonPorTexto(contenedor, 'Guardar justificación').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    asistenciaId: 'asistencia-1',
    justificar: true,
    motivoJustificacion: 'cita_medica',
    notaJustificacion: 'Justificante en papel',
  });
  assert.match(contenedor.textContent, /Justificación: Cita médica\. Justificante en papel/);
});

void test('una ausencia ya justificada se muestra como "(ausente, justificada)" en el listado', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: 'enfermedad' })]),
  });

  assert.match(contenedor.textContent, /\(ausente, justificada\)/);
});

// --- Avisar a la familia (R-05) --------------------------------------------------------------

function crearPersonaReferenciaFalsa(sobrescribir: Partial<PersonaReferencia> = {}): PersonaReferencia {
  return {
    id: 'pr-1',
    alumno_id: 'alumno-1',
    nombre: 'Marta',
    primer_apellido: 'García',
    segundo_apellido: null,
    email_referencia: null,
    telefono_referencia: '600000000',
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

void test('avisar: no se ofrece a un teacher, aunque la ausencia esté sin justificar (puedeVerPersonasReferencia)', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'teacher',
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  assert.equal(contenedor.textContent.includes('Ver personas de referencia'), false);
  assert.equal(contenedor.textContent.includes('Avisar a la familia'), false);
});

void test('avisar: no se ofrece a un administrator sin la dependencia obtenerPersonasReferencia (nunca "a medias")', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  assert.equal(contenedor.textContent.includes('Ver personas de referencia'), false);
});

void test('avisar: no se ofrece sobre una ausencia YA justificada (criterio de aceptación de R-05)', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: 'enfermedad' })]),
  });

  assert.equal(contenedor.textContent.includes('Ver personas de referencia'), false);
});

void test('avisar: no se ofrece sobre un registro válido o anulado', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida' })]),
  });

  assert.equal(contenedor.textContent.includes('Ver personas de referencia'), false);
});

void test('avisar: administrator ve "Ver personas de referencia" sobre una ausencia sin justificar', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  assert.ok(contenedor.textContent.includes('Ver personas de referencia'));
});

void test('avisar: sin ninguna persona de referencia, lo dice explícitamente en vez de una lista vacía muda', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /no tiene ninguna persona de referencia registrada/);
});

void test('avisar: un error al cargar personas de referencia se muestra sin romper la pantalla', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.reject(new SinPermiso()),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  assert.ok(contenedor.textContent.length > 0);
  assert.equal(contenedor.querySelector('[role="alert"]') !== null, true);
});

void test('avisar: lista nombre y teléfono de cada persona, y el mailto: solo se ofrece con email (requisitos 1 y 2)', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () =>
      Promise.resolve([
        crearPersonaReferenciaFalsa({ id: 'pr-1', nombre: 'Marta', telefono_referencia: '600000001', email_referencia: 'marta@ejemplo.com' }),
        crearPersonaReferenciaFalsa({ id: 'pr-2', nombre: 'Pedro', telefono_referencia: '600000002', email_referencia: null }),
      ]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Marta García — 600000001/);
  assert.match(contenedor.textContent, /Pedro García — 600000002/);

  const enlaces = Array.from(contenedor.querySelectorAll('a')).filter((a) => a.textContent === 'Enviar por correo');
  assert.equal(enlaces.length, 1); // solo Marta tiene email

  const enlace = enlaces[0];
  assert.ok(enlace);
  assert.ok(enlace.href.startsWith('mailto:marta%40ejemplo.com?'));
  const parametros = new URLSearchParams(enlace.href.split('?')[1]);
  assert.match(parametros.get('subject') ?? '', /Ana García López/);
  assert.match(parametros.get('body') ?? '', /Ana García López/);
  assert.match(parametros.get('body') ?? '', /Matemáticas/);
});

void test('avisar: copiar mensaje llama a copiarAlPortapapeles con el texto y confirma', async () => {
  let textoCopiado: string | undefined;
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    copiarAlPortapapeles: (texto) => {
      textoCopiado = texto;
      return Promise.resolve();
    },
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Copiar mensaje').click();
  await esperarMicrotareas();

  assert.match(textoCopiado ?? '', /Ana García López/);
  assert.match(contenedor.textContent, /Mensaje copiado al portapapeles/);
});

void test('avisar: si copiar falla, invita a copiar manualmente en vez de fingir que funcionó', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    copiarAlPortapapeles: () => Promise.reject(new Error('sin permiso del navegador')),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Copiar mensaje').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /selecciona el texto de arriba/);
});

void test('avisar: "Registrar aviso enviado" está deshabilitado hasta escribir quién avisó', async () => {
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null })]),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  assert.equal(botonPorTexto(contenedor, 'Registrar aviso enviado').disabled, true);

  const campoQuien = contenedor.querySelector<HTMLInputElement>('#aviso-quien-asistencia-1');
  assert.ok(campoQuien);
  campoQuien.value = 'María (administradora)';
  dispararEvento(campoQuien, 'input');

  assert.equal(botonPorTexto(contenedor, 'Registrar aviso enviado').disabled, false);
});

void test('avisar: registrar aviso enviado añade la anotación a la nota SIN perder lo que ya hubiera (requisito 3)', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', motivo_justificacion: null, nota: 'Llegó tarde ayer.' })]),
    actualizar: (_id, entrada) => {
      entradaRecibida = entrada;
      return Promise.resolve(crearAsistencia({ estado: 'ausente', nota: 'Llegó tarde ayer.\nAviso registrado.' }));
    },
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  const campoQuien = contenedor.querySelector<HTMLInputElement>('#aviso-quien-asistencia-1');
  assert.ok(campoQuien);
  campoQuien.value = 'María (administradora)';
  dispararEvento(campoQuien, 'input');

  botonPorTexto(contenedor, 'Registrar aviso enviado').click();
  await esperarMicrotareas();

  const entrada = entradaRecibida as { asistenciaId: string; nota: string; notaProvista: boolean };
  assert.equal(entrada.asistenciaId, 'asistencia-1');
  assert.equal(entrada.notaProvista, true);
  assert.match(entrada.nota, /^Llegó tarde ayer\./);
  assert.match(entrada.nota, /María \(administradora\)/);
  assert.match(entrada.nota, /anotación manual/);
});

// --- Marcar / ajustar la salida (R-03) --------------------------------------------------------

void test('marcar salida se ofrece sobre un registro presente sin salida todavía', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida', ocurrido_en_salida: null })]),
  });

  assert.ok(contenedor.textContent.includes('Marcar salida'));
  assert.equal(contenedor.textContent.includes('Guardar salida'), false);
});

void test('marcar salida no se ofrece sobre una ausencia ni sobre un registro anulado', async () => {
  const contenedorAusente = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'ausente', ocurrido_en_salida: null })]),
  });
  assert.equal(contenedorAusente.textContent.includes('Marcar salida'), false);

  const contenedorAnulada = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'anulada', motivo_anulacion: 'x', ocurrido_en_salida: null })]),
  });
  assert.equal(contenedorAnulada.textContent.includes('Marcar salida'), false);
});

void test('marcar salida: llama a actualizar con marcarSalida: true, sin ningún otro campo', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida', ocurrido_en_salida: null })]),
    actualizar: (_id, entrada) => {
      entradaRecibida = entrada;
      return Promise.resolve(crearAsistencia({ ocurrido_en_salida: '2026-08-26T16:30:00.000Z' }));
    },
  });

  botonPorTexto(contenedor, 'Marcar salida').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, { asistenciaId: 'asistencia-1', marcarSalida: true });
});

void test('con una salida ya marcada, se ofrece "Guardar salida" (ajuste) en vez de "Marcar salida"', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida', ocurrido_en_salida: '2026-08-26T16:30:00.000Z' })]),
  });

  assert.equal(contenedor.textContent.includes('Marcar salida'), false);
  const campoSalida = contenedor.querySelector<HTMLInputElement>('#salida-asistencia-1');
  assert.ok(campoSalida);
  // '2026-08-26T16:30:00.000Z' en Europe/Madrid (CEST, UTC+2 en agosto) son las 18:30 locales.
  assert.equal(campoSalida.value, '18:30'); // prellenado con la hora ya marcada
  assert.ok(contenedor.textContent.includes('Guardar salida'));
});

void test('ajustar la salida: llama a actualizar con ocurridoEnSalida en el instante elegido', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida', ocurrido_en_salida: '2026-08-26T16:30:00.000Z' })]),
    actualizar: (_id, entrada) => {
      entradaRecibida = entrada;
      return Promise.resolve(crearAsistencia({ ocurrido_en_salida: '2026-08-26T16:45:00.000Z' }));
    },
  });

  const campoSalida = contenedor.querySelector<HTMLInputElement>('#salida-asistencia-1');
  assert.ok(campoSalida);
  campoSalida.value = '16:45';
  dispararEvento(campoSalida, 'input');

  botonPorTexto(contenedor, 'Guardar salida').click();
  await esperarMicrotareas();

  assert.ok(entradaRecibida);
  const entrada = entradaRecibida as { asistenciaId: string; ocurridoEnSalida: Date };
  assert.equal(entrada.asistenciaId, 'asistencia-1');
  assert.ok(entrada.ocurridoEnSalida instanceof Date);
  // '16:45' es hora LOCAL (Europe/Madrid, CEST = UTC+2 en agosto): el instante UTC resultante es 14:45.
  assert.equal(entrada.ocurridoEnSalida.toISOString(), '2026-08-26T14:45:00.000Z');
});

void test('la fila muestra la hora de salida y la duración real una vez marcada', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () =>
      Promise.resolve([
        crearAsistencia({
          ocurrido_en: '2026-08-26T15:30:00.000Z',
          ocurrido_en_salida: '2026-08-26T16:15:00.000Z',
        }),
      ]),
  });

  assert.match(contenedor.textContent, /Duración real: 45 min \(teórica 60 min\)/);
});

void test('cambiar el alumno: buscar, elegir un resultado, confirmar con el dato viejo y el nuevo a la vista', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    buscarAlumnos: (texto) => (texto === 'Bruno' ? Promise.resolve([crearResultadoBusqueda()]) : Promise.resolve([])),
    actualizar: (_id, entrada) => {
      entradaRecibida = entrada;
      return Promise.resolve(crearAsistencia({ alumno_id: 'alumno-2' }));
    },
  });

  const campoBusqueda = contenedor.querySelector<HTMLInputElement>('#buscar-alumno-asistencia-1');
  assert.ok(campoBusqueda);
  campoBusqueda.value = 'Bruno';
  dispararEvento(campoBusqueda, 'input');
  botonPorTexto(contenedor, 'Buscar').click();
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Bruno Ruiz').click();
  assert.match(contenedor.textContent, /Antes: Ana García López\. Nuevo: Bruno Ruiz\./);

  botonPorTexto(contenedor, 'Confirmar cambio de alumno').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, { asistenciaId: 'asistencia-1', alumnoId: 'alumno-2' });
});

void test('cambiar el slot atribuido solo se ofrece sobre un registro de origen "slot"', async () => {
  const contenedor = await montarConUnRegistro({
    listarRegistros: () => Promise.resolve([crearAsistencia({ origen: 'manual', slot_id: null })]),
  });

  assert.equal(contenedor.textContent.includes('Cambiar el slot atribuido'), false);
});

void test('cambiar el slot atribuido ofrece los otros slots del mismo alumno y llama a actualizar con slotId', async () => {
  let entradaRecibida: unknown;
  const contenedor = await montarConUnRegistro({
    listarSlotsDeProfesor: () =>
      Promise.resolve([crearSlot({ id: 'slot-1' }), crearSlot({ id: 'slot-2', dia_semana: 4, hora_inicio: '18:00', hora_fin: '19:00' })]),
    actualizar: (_id, entrada) => {
      entradaRecibida = entrada;
      return Promise.resolve(crearAsistencia({ slot_id: 'slot-2' }));
    },
  });

  const selectSlotDestino = contenedor.querySelector<HTMLSelectElement>('#slot-asistencia-1');
  assert.ok(selectSlotDestino);
  const valores = Array.from(selectSlotDestino.options).map((o) => o.value);
  assert.deepEqual(valores, ['slot-2']); // nunca se ofrece el propio slot como destino

  selectSlotDestino.value = 'slot-2';
  botonPorTexto(contenedor, 'Cambiar slot').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, { asistenciaId: 'asistencia-1', slotId: 'slot-2' });
});

void test('un error al guardar se muestra en la fila, sin perder el panel de edición abierto', async () => {
  const contenedor = await montarConUnRegistro({
    actualizar: () => Promise.reject(new SinPermiso()),
  });

  const campoNota = contenedor.querySelector<HTMLInputElement>('#nota-asistencia-1');
  assert.ok(campoNota);
  campoNota.value = 'x';
  dispararEvento(campoNota, 'input');
  botonPorTexto(contenedor, 'Guardar nota').click();
  await esperarMicrotareas();

  assert.ok(contenedor.querySelector('#nota-asistencia-1')); // panel sigue abierto
  assert.match(contenedor.textContent, /No tienes permiso/);
});

// --- Historial (solo administrator) ---------------------------------------------------------------

void test('teacher no ve la opción de desplegar el historial', async () => {
  const contenedor = await montarConUnRegistro({ rol: 'teacher' });
  assert.equal(contenedor.textContent.includes('Ver historial'), false);
});

void test('administrator puede desplegar el historial completo de una fila', async () => {
  const version: AsistenciaHistorial = {
    id: 'hist-1',
    asistencia_id: 'asistencia-1',
    cambiado_en: '2026-08-26T15:00:00.000Z',
    cambiado_por: 'profesor-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-08-26T15:00:00.000Z',
    ocurrido_en: '2026-08-26T15:00:00.000Z',
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
    peticion_id: 'peticion-1',
  };
  const contenedor = await montarConUnRegistro({
    rol: 'administrator',
    listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
    listarHistorial: () => Promise.resolve([version]),
  });

  botonPorTexto(contenedor, 'Ver historial').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /sin nota/);
});

// --- Añadir un registro olvidado ------------------------------------------------------------------

void test('añadir un registro olvidado: registra por slot para el alumno del slot, con la hora elegida', async () => {
  let entradaRecibida: unknown;
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      registrarOlvidado: (entrada) => {
        entradaRecibida = entrada;
        return Promise.resolve(crearAsistencia({ id: 'asistencia-nueva' }));
      },
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Añadir registro olvidado').click();
  const campoHora = contenedor.querySelector<HTMLInputElement>('#olvidado-hora');
  assert.ok(campoHora);
  assert.equal(campoHora.value, '17:00'); // prellenada con la hora del slot

  botonPorTexto(contenedor, 'Registrar').click();
  await esperarMicrotareas();

  assert.ok(entradaRecibida);
  const entrada = entradaRecibida as { alumnoId: string; origen: string; slotId: string; peticionId: string };
  assert.equal(entrada.alumnoId, 'alumno-1');
  assert.equal(entrada.origen, 'slot');
  assert.equal(entrada.slotId, 'slot-1');
  assert.ok(entrada.peticionId);
  assert.equal(contenedor.textContent.includes('Añadir registro olvidado para Ana García López'), false); // el formulario se cierra tras registrar
});

// --- Marcar ausente (R-01) -------------------------------------------------------------------------

void test('marcar ausente: pide confirmación explícita antes de llamar a registrarAusencia', async () => {
  let llamadas = 0;
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      registrarAusencia: () => {
        llamadas += 1;
        return Promise.resolve(crearAsistencia({ id: 'asistencia-nueva', estado: 'ausente' }));
      },
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Marcar ausente').click();
  assert.equal(llamadas, 0);
  assert.match(contenedor.textContent, /¿Marcar ausente a Ana García López el 2026-08-26\?/);
});

void test('marcar ausente: confirmar registra por slot, con la hora de inicio del slot ese día', async () => {
  let entradaRecibida: unknown;
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      registrarAusencia: (entrada) => {
        entradaRecibida = entrada;
        return Promise.resolve(crearAsistencia({ id: 'asistencia-nueva', estado: 'ausente' }));
      },
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Marcar ausente').click();
  botonPorTexto(contenedor, 'Confirmar ausencia').click();
  await esperarMicrotareas();

  assert.ok(entradaRecibida);
  const entrada = entradaRecibida as { alumnoId: string; slotId: string; peticionId: string; ocurridoEn?: Date };
  assert.equal(entrada.alumnoId, 'alumno-1');
  assert.equal(entrada.slotId, 'slot-1');
  assert.ok(entrada.peticionId);
  assert.equal(contenedor.textContent.includes('¿Marcar ausente'), false); // la confirmación se cierra tras registrar
});

void test('marcar ausente: "Cancelar" no llama a registrarAusencia y vuelve al botón inicial', async () => {
  let llamadas = 0;
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      registrarAusencia: () => {
        llamadas += 1;
        return Promise.resolve(crearAsistencia({ estado: 'ausente' }));
      },
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Marcar ausente').click();
  botonPorTexto(contenedor, 'Cancelar').click();

  assert.equal(llamadas, 0);
  assert.doesNotThrow(() => botonPorTexto(contenedor, 'Marcar ausente'));
});

void test('marcar ausente: un error del servidor se muestra sin perder la confirmación (se puede reintentar)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      registrarAusencia: () => Promise.reject(new SinPermiso()),
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Marcar ausente').click();
  botonPorTexto(contenedor, 'Confirmar ausencia').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No tienes permiso/);
  // La confirmación sigue abierta: se puede reintentar sin volver a pulsar "Marcar ausente".
  assert.doesNotThrow(() => botonPorTexto(contenedor, 'Confirmar ausencia'));
});

// --- Marcar el resto como ausente (R-17) ------------------------------------------------------

async function elegirSlotUno(contenedor: HTMLElement): Promise<void> {
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();
}

void test('cierre en bloque: sin nadie más pendiente en la sesión, no se ofrece "Marcar el resto como ausente"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([crearAsistencia({ estado: 'valida' })]),
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  assert.throws(() => botonPorTexto(contenedor, 'Marcar el resto como ausente'));
});

void test('cierre en bloque: con un compañero de sesión sin registro, aparece el control y la confirmación lista a los dos nominalmente', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([crearSlot(), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { nombre: 'Bruno', primer_apellido: 'Ruiz', segundo_apellido: null })]),
      listarRegistros: () => Promise.resolve([]),
      listarRegistrosDelGrupo: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  botonPorTexto(contenedor, 'Marcar el resto como ausente').click();

  assert.match(contenedor.textContent, /¿Marcar como ausentes a los siguientes alumnos el 2026-08-26\?/);
  assert.deepEqual(nombresEnConfirmacionCierre(contenedor), ['Ana García López', 'Bruno Ruiz']);
});

void test('cierre en bloque: pide los slot ids del resto del grupo en una sola petición, nunca el propio slot elegido', async () => {
  let slotIdsPedidos: readonly string[] | undefined;
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([crearSlot(), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { nombre: 'Bruno', primer_apellido: 'Ruiz' })]),
      listarRegistros: () => Promise.resolve([]),
      listarRegistrosDelGrupo: (slotIds) => {
        slotIdsPedidos = slotIds;
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  assert.deepEqual(slotIdsPedidos, ['slot-2']);
});

void test('cierre en bloque: un alumno que ya tiene registro ese día queda excluido desde el principio', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([crearSlot(), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { nombre: 'Bruno', primer_apellido: 'Ruiz' })]),
      listarRegistros: () => Promise.resolve([]),
      listarRegistrosDelGrupo: () => Promise.resolve([crearAsistencia({ id: 'as-2', alumno_id: 'alumno-2', slot_id: 'slot-2', estado: 'valida' })]),
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  botonPorTexto(contenedor, 'Marcar el resto como ausente').click();

  assert.deepEqual(nombresEnConfirmacionCierre(contenedor), ['Ana García López']);
});

void test('cierre en bloque: confirmar llama a registrarAusencia una vez por cada pendiente y cierra la confirmación al completarse', async () => {
  const llamadas: { alumnoId: string; slotId: string }[] = [];
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([crearSlot(), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { nombre: 'Bruno', primer_apellido: 'Ruiz' })]),
      listarRegistros: () => Promise.resolve([]),
      listarRegistrosDelGrupo: () => Promise.resolve([]),
      registrarAusencia: (entrada) => {
        llamadas.push({ alumnoId: entrada.alumnoId, slotId: entrada.slotId });
        return Promise.resolve(crearAsistencia({ id: `asistencia-${entrada.alumnoId}`, alumno_id: entrada.alumnoId, slot_id: entrada.slotId, estado: 'ausente' }));
      },
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  botonPorTexto(contenedor, 'Marcar el resto como ausente').click();
  botonPorTexto(contenedor, 'Confirmar').click();
  await esperarMicrotareas();

  assert.deepEqual(
    llamadas.map((l) => l.alumnoId).sort(),
    ['alumno-1', 'alumno-2'],
  );
  assert.equal(contenedor.textContent.includes('¿Marcar como ausentes'), false);
  // El titular (slot elegido) queda reflejado en la tabla, igual que la confirmación individual.
  assert.match(contenedor.textContent, /\(ausente\)/);
});

void test('cierre en bloque: "Cancelar" no llama a registrarAusencia y vuelve al botón inicial', async () => {
  let llamadas = 0;
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([crearSlot(), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { nombre: 'Bruno', primer_apellido: 'Ruiz' })]),
      listarRegistros: () => Promise.resolve([]),
      listarRegistrosDelGrupo: () => Promise.resolve([]),
      registrarAusencia: () => {
        llamadas += 1;
        return Promise.resolve(crearAsistencia({ estado: 'ausente' }));
      },
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  botonPorTexto(contenedor, 'Marcar el resto como ausente').click();
  botonPorTexto(contenedor, 'Cancelar').click();

  assert.equal(llamadas, 0);
  assert.doesNotThrow(() => botonPorTexto(contenedor, 'Marcar el resto como ausente'));
});

void test('cierre en bloque: un fallo en uno de los dos deja al otro completado y reabre la confirmación solo con el que falló', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      reloj: crearRelojFijo(INSTANTE),
      listarSlotsDeProfesor: () =>
        Promise.resolve([crearSlot(), crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { nombre: 'Bruno', primer_apellido: 'Ruiz' })]),
      listarRegistros: () => Promise.resolve([]),
      listarRegistrosDelGrupo: () => Promise.resolve([]),
      registrarAusencia: (entrada) => {
        if (entrada.alumnoId === 'alumno-2') {
          return Promise.reject(new SinPermiso());
        }
        return Promise.resolve(crearAsistencia({ id: 'asistencia-1', alumno_id: entrada.alumnoId, slot_id: entrada.slotId, estado: 'ausente' }));
      },
    }),
  );
  await esperarMicrotareas();
  await elegirSlotUno(contenedor);

  botonPorTexto(contenedor, 'Marcar el resto como ausente').click();
  botonPorTexto(contenedor, 'Confirmar').click();
  await esperarMicrotareas();

  // Ana (alumno-1) ya se completó: no vuelve a aparecer en la lista de pendientes.
  assert.deepEqual(nombresEnConfirmacionCierre(contenedor), ['Bruno Ruiz López']);
  assert.match(contenedor.textContent, /No se pudo marcar a: Bruno Ruiz López/);
  // Ana sí queda reflejada en la tabla, como cualquier alta completada.
  assert.match(contenedor.textContent, /\(ausente\)/);
  // Sigue abierta: se puede reintentar sin volver a pulsar el botón inicial.
  assert.doesNotThrow(() => botonPorTexto(contenedor, 'Confirmar'));
});

// --- R-06: excepción de este día (sustitución/cancelación) --------------------------------------

/** Monta como `administrator`, con el profesor y el slot ya elegidos — sin clicar "Editar" ninguna
 * fila (a diferencia de `montarConUnRegistro`): el bloque "Excepción de este día" es de PANTALLA,
 * no de fila. `listarRegistros` por defecto devuelve `[]` (a diferencia de `montarConUnRegistro`,
 * que por defecto SÍ trae un registro): la mayoría de estos tests quiere el caso "sin registros
 * todavía", que es el que permite declarar. */
async function montarComoAdminConSlot(overrides: Partial<DependenciasPantallaRegistrosSlot> = {}): Promise<HTMLElement> {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      rol: 'administrator',
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'profesor-1', nombre: 'Marta Ruiz' }]),
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      ...overrides,
    }),
  );
  await esperarMicrotareas();

  const selectProfesor = contenedor.querySelector<HTMLSelectElement>('#registros-profesor');
  assert.ok(selectProfesor);
  const primeraOpcionReal = Array.from(selectProfesor.options).find((o) => o.value !== '');
  assert.ok(primeraOpcionReal);
  selectProfesor.value = primeraOpcionReal.value;
  dispararEvento(selectProfesor, 'change');
  await esperarMicrotareas();

  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();
  return contenedor;
}

void test('excepción: no se ofrece a un teacher, aunque la dependencia esté inyectada', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistrosSlot(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarSlotsDeProfesor: () => Promise.resolve([crearSlot()]),
      listarRegistros: () => Promise.resolve([]),
      listarExcepcionesDeSlot: () => Promise.resolve([]),
      declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
    }),
  );
  await esperarMicrotareas();
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  selectSlot.value = 'slot-1';
  dispararEvento(selectSlot, 'change');
  await esperarMicrotareas();

  assert.equal(contenedor.textContent.includes('Declarar excepción de este día'), false);
});

void test('excepción: no se ofrece a un administrator sin la dependencia declararExcepcionSlot (nunca "a medias")', async () => {
  const contenedor = await montarComoAdminConSlot();
  assert.equal(contenedor.textContent.includes('Declarar excepción de este día'), false);
});

void test('excepción: si ya hay registros ese día, no se ofrece declarar (requisito 5)', async () => {
  const contenedor = await montarComoAdminConSlot({
    listarRegistros: () => Promise.resolve([crearAsistencia()]),
    listarExcepcionesDeSlot: () => Promise.resolve([]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  assert.equal(contenedor.textContent.includes('Declarar excepción de este día'), false);
  assert.match(contenedor.textContent, /no se puede declarar una excepción retroactiva/);
});

void test('excepción: declarar una sustitución llama a declararExcepcionSlot con el sustituto elegido', async () => {
  let entradaRecibida: unknown;
  let declarada = false;
  const contenedor = await montarComoAdminConSlot({
    listarProfesoresParaSelector: () =>
      Promise.resolve([
        { id: 'profesor-1', nombre: 'Marta Ruiz' },
        { id: 'profesor-2', nombre: 'Luis Pardo' },
      ]),
    listarExcepcionesDeSlot: () =>
      Promise.resolve(
        declarada
          ? [
              {
                id: 'exc-1',
                slot_id: 'slot-1',
                fecha: '2026-08-26',
                tipo: 'sustitucion' as const,
                profesor_sustituto_id: 'profesor-2',
                motivo: null,
                activo: true,
                aviso_familias_quien: null,
                aviso_familias_en: null,
                creado_en: '2026-01-01T00:00:00.000Z',
                actualizado_en: '2026-01-01T00:00:00.000Z',
              },
            ]
          : [],
      ),
    declararExcepcionSlot: (entrada) => {
      entradaRecibida = entrada;
      declarada = true;
      return Promise.resolve({
        id: 'exc-1',
        slot_id: 'slot-1',
        fecha: '2026-08-26',
        tipo: 'sustitucion',
        profesor_sustituto_id: 'profesor-2',
        motivo: null,
        activo: true,
        aviso_familias_quien: null,
        aviso_familias_en: null,
        creado_en: '2026-01-01T00:00:00.000Z',
        actualizado_en: '2026-01-01T00:00:00.000Z',
      });
    },
  });

  botonPorTexto(contenedor, 'Declarar excepción de este día').click();
  await esperarMicrotareas();

  // El propio titular (profesor-1) no debe aparecer como opción de sustituto.
  const selectSustituto = contenedor.querySelector<HTMLSelectElement>('#excepcion-sustituto');
  assert.ok(selectSustituto);
  assert.equal(Array.from(selectSustituto.options).some((o) => o.value === 'profesor-1'), false);
  selectSustituto.value = 'profesor-2';
  dispararEvento(selectSustituto, 'change');

  botonPorTexto(contenedor, 'Declarar').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    slotId: 'slot-1',
    fecha: '2026-08-26',
    tipo: 'sustitucion',
    profesorSustitutoId: 'profesor-2',
    motivo: null,
  });
  assert.match(contenedor.textContent, /Cubierto por Luis Pardo/);
});

void test('excepción: sustitución sin elegir sustituto se rechaza en el cliente, sin llamar al servidor', async () => {
  let llamadas = 0;
  const contenedor = await montarComoAdminConSlot({
    listarExcepcionesDeSlot: () => Promise.resolve([]),
    declararExcepcionSlot: () => {
      llamadas += 1;
      return Promise.reject(new Error('no debía llamarse'));
    },
  });

  botonPorTexto(contenedor, 'Declarar excepción de este día').click();
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Declarar').click();
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.match(contenedor.textContent, /Elige el profesor sustituto/);
});

void test('excepción: declarar una cancelación exige motivo, envía tipo cancelacion sin sustituto', async () => {
  let entradaRecibida: unknown;
  let declarada = false;
  const contenedor = await montarComoAdminConSlot({
    listarExcepcionesDeSlot: () =>
      Promise.resolve(
        declarada
          ? [
              {
                id: 'exc-1',
                slot_id: 'slot-1',
                fecha: '2026-08-26',
                tipo: 'cancelacion' as const,
                profesor_sustituto_id: null,
                motivo: 'Profesor de baja',
                activo: true,
                aviso_familias_quien: null,
                aviso_familias_en: null,
                creado_en: '2026-01-01T00:00:00.000Z',
                actualizado_en: '2026-01-01T00:00:00.000Z',
              },
            ]
          : [],
      ),
    declararExcepcionSlot: (entrada) => {
      entradaRecibida = entrada;
      declarada = true;
      return Promise.resolve({
        id: 'exc-1',
        slot_id: 'slot-1',
        fecha: '2026-08-26',
        tipo: 'cancelacion',
        profesor_sustituto_id: null,
        motivo: 'Profesor de baja',
        activo: true,
        aviso_familias_quien: null,
        aviso_familias_en: null,
        creado_en: '2026-01-01T00:00:00.000Z',
        actualizado_en: '2026-01-01T00:00:00.000Z',
      });
    },
  });

  botonPorTexto(contenedor, 'Declarar excepción de este día').click();
  await esperarMicrotareas();
  const selectTipo = contenedor.querySelector<HTMLSelectElement>('#excepcion-tipo');
  assert.ok(selectTipo);
  selectTipo.value = 'cancelacion';
  dispararEvento(selectTipo, 'change');
  await esperarMicrotareas();

  // Sin motivo: rechazado en el cliente.
  botonPorTexto(contenedor, 'Declarar').click();
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Escribe el motivo de la cancelación/);

  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#excepcion-motivo');
  assert.ok(campoMotivo);
  campoMotivo.value = 'Profesor de baja';
  dispararEvento(campoMotivo, 'input');
  botonPorTexto(contenedor, 'Declarar').click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    slotId: 'slot-1',
    fecha: '2026-08-26',
    tipo: 'cancelacion',
    profesorSustitutoId: null,
    motivo: 'Profesor de baja',
  });
  assert.match(contenedor.textContent, /Cancelada — Profesor de baja/);
});

void test('excepción: desactivar llama a desactivarExcepcionSlot y vuelve al formulario', async () => {
  let excepcionActiva = true;
  let idDesactivado: string | undefined;
  const contenedor = await montarComoAdminConSlot({
    listarExcepcionesDeSlot: () =>
      Promise.resolve(
        excepcionActiva
          ? [
              {
                id: 'exc-1',
                slot_id: 'slot-1',
                fecha: '2026-08-26',
                tipo: 'cancelacion',
                profesor_sustituto_id: null,
                motivo: 'Imprevisto',
                activo: true,
                aviso_familias_quien: null,
                aviso_familias_en: null,
                creado_en: '2026-01-01T00:00:00.000Z',
                actualizado_en: '2026-01-01T00:00:00.000Z',
              },
            ]
          : [],
      ),
    desactivarExcepcionSlot: (id) => {
      idDesactivado = id;
      excepcionActiva = false;
      return Promise.resolve({
        id: 'exc-1',
        slot_id: 'slot-1',
        fecha: '2026-08-26',
        tipo: 'cancelacion',
        profesor_sustituto_id: null,
        motivo: 'Imprevisto',
        activo: false,
        aviso_familias_quien: null,
        aviso_familias_en: null,
        creado_en: '2026-01-01T00:00:00.000Z',
        actualizado_en: '2026-01-01T00:00:00.000Z',
      });
    },
    // Requerida como "puerta" del bloque entero (mismo criterio "nunca a medias" que R-05): sin
    // ella no se ofrecería ni siquiera desactivar, aunque este test no llegue a usarla.
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  assert.match(contenedor.textContent, /Cancelada — Imprevisto/);
  botonPorTexto(contenedor, 'Desactivar excepción').click();
  await esperarMicrotareas();

  assert.equal(idDesactivado, 'exc-1');
  assert.equal(contenedor.textContent.includes('Cancelada — Imprevisto'), false);
  assert.doesNotThrow(() => botonPorTexto(contenedor, 'Declarar excepción de este día'));
});

void test('excepción: desactivar está deshabilitado si ya hay registros ese día', async () => {
  const contenedor = await montarComoAdminConSlot({
    listarRegistros: () => Promise.resolve([crearAsistencia()]),
    listarExcepcionesDeSlot: () =>
      Promise.resolve([
        {
          id: 'exc-1',
          slot_id: 'slot-1',
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
    desactivarExcepcionSlot: () => Promise.reject(new Error('no debía llamarse')),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  const boton = botonPorTexto(contenedor, 'Desactivar excepción');
  assert.equal(boton.disabled, true);
  assert.match(contenedor.textContent, /no se puede desactivar la excepción/);
});

// --- R-14: avisar a las familias de una clase cancelada -----------------------------------------

function crearExcepcionCancelacion(sobrescribir: Partial<ExcepcionSlot> = {}): ExcepcionSlot {
  return {
    id: 'exc-1',
    slot_id: 'slot-1',
    fecha: '2026-08-26',
    tipo: 'cancelacion',
    profesor_sustituto_id: null,
    motivo: 'Profesor de baja',
    activo: true,
    aviso_familias_quien: null,
    aviso_familias_en: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

void test('aviso a las familias: no se ofrece sobre una sustitución (requisito 4)', async () => {
  const contenedor = await montarComoAdminConSlot({
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarExcepcionesDeSlot: () =>
      Promise.resolve([crearExcepcionCancelacion({ tipo: 'sustitucion', profesor_sustituto_id: 'profesor-2', motivo: null })]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  assert.equal(contenedor.textContent.includes('Avisar a las familias'), false);
});

void test('aviso a las familias: no se ofrece sin la dependencia obtenerPersonasReferencia (nunca "a medias")', async () => {
  const contenedor = await montarComoAdminConSlot({
    listarExcepcionesDeSlot: () => Promise.resolve([crearExcepcionCancelacion()]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  assert.equal(contenedor.textContent.includes('Avisar a las familias'), false);
});

void test('aviso a las familias: administrator ve "Ver personas de referencia" sobre una cancelación', async () => {
  const contenedor = await montarComoAdminConSlot({
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarExcepcionesDeSlot: () => Promise.resolve([crearExcepcionCancelacion()]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  assert.match(contenedor.textContent, /Avisar a las familias de esta clase cancelada/);
  assert.ok(contenedor.textContent.includes('Ver personas de referencia'));
});

void test('aviso a las familias: lista personas y compone el mensaje con el motivo de la cancelación (requisitos 1 y 2)', async () => {
  const contenedor = await montarComoAdminConSlot({
    obtenerPersonasReferencia: () =>
      Promise.resolve([
        crearPersonaReferenciaFalsa({ id: 'pr-1', nombre: 'Marta', telefono_referencia: '600000001', email_referencia: 'marta@ejemplo.com' }),
      ]),
    listarExcepcionesDeSlot: () => Promise.resolve([crearExcepcionCancelacion({ motivo: 'Profesor de baja' })]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Marta García — 600000001/);
  const enlace = Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === 'Enviar por correo');
  assert.ok(enlace);
  const parametros = new URLSearchParams(enlace.href.split('?')[1]);
  assert.match(parametros.get('subject') ?? '', /Ana García López/);
  assert.match(parametros.get('body') ?? '', /Ana García López/);
  assert.match(parametros.get('body') ?? '', /Matemáticas/);
  assert.match(parametros.get('body') ?? '', /Profesor de baja/);
  assert.match(parametros.get('body') ?? '', /se cancela la clase/);
});

void test('aviso a las familias: "Registrar aviso enviado" llama a registrarAvisoCancelacionSlot con el id de la excepción, una sola vez para toda la excepción (requisito 3)', async () => {
  let idRecibido: string | undefined;
  let quienRecibido: string | undefined;
  let avisada = false;
  const contenedor = await montarComoAdminConSlot({
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarExcepcionesDeSlot: () =>
      Promise.resolve([avisada ? crearExcepcionCancelacion({ aviso_familias_quien: 'María', aviso_familias_en: '2026-08-26T12:00:00Z' }) : crearExcepcionCancelacion()]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
    registrarAvisoCancelacionSlot: (excepcionId, quien) => {
      idRecibido = excepcionId;
      quienRecibido = quien;
      avisada = true;
      return Promise.resolve(crearExcepcionCancelacion({ aviso_familias_quien: quien, aviso_familias_en: '2026-08-26T12:00:00Z' }));
    },
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  const campoQuien = contenedor.querySelector<HTMLInputElement>('#aviso-familias-quien');
  assert.ok(campoQuien);
  campoQuien.value = 'María';
  dispararEvento(campoQuien, 'input');

  botonPorTexto(contenedor, 'Registrar aviso enviado').click();
  await esperarMicrotareas();

  assert.equal(idRecibido, 'exc-1');
  assert.equal(quienRecibido, 'María');
  assert.match(contenedor.textContent, /Aviso registrado por María el/);
  assert.match(contenedor.textContent, /sin confirmación de entrega/);
  assert.equal(contenedor.textContent.includes('Registrar aviso enviado'), false);
});

void test('aviso a las familias: "Registrar aviso enviado" está deshabilitado hasta escribir quién avisó', async () => {
  const contenedor = await montarComoAdminConSlot({
    obtenerPersonasReferencia: () => Promise.resolve([crearPersonaReferenciaFalsa()]),
    listarExcepcionesDeSlot: () => Promise.resolve([crearExcepcionCancelacion()]),
    declararExcepcionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
    registrarAvisoCancelacionSlot: () => Promise.reject(new Error('no se esperaba esta llamada')),
  });

  botonPorTexto(contenedor, 'Ver personas de referencia').click();
  await esperarMicrotareas();

  assert.equal(botonPorTexto(contenedor, 'Registrar aviso enviado').disabled, true);
});
