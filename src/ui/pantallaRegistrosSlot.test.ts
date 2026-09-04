import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaRegistrosSlot, type DependenciasPantallaRegistrosSlot } from './pantallaRegistrosSlot.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from '../dominio/slots.ts';
import type { Asistencia, AsistenciaHistorial } from '../dominio/tipos.ts';
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
    listarProfesoresParaSelector: overrides.listarProfesoresParaSelector ?? (() => Promise.resolve([])),
    listarSlotsDeProfesor: overrides.listarSlotsDeProfesor ?? (() => Promise.resolve([])),
    listarRegistros: overrides.listarRegistros ?? (() => Promise.resolve([])),
    listarHistorial: overrides.listarHistorial ?? (() => Promise.resolve([])),
    obtenerAlumnoParaTarjeta: overrides.obtenerAlumnoParaTarjeta ?? noImplementado('obtenerAlumnoParaTarjeta'),
    buscarAlumnos: overrides.buscarAlumnos ?? (() => Promise.resolve([])),
    actualizar: overrides.actualizar ?? noImplementado('actualizar'),
    registrarOlvidado: overrides.registrarOlvidado ?? noImplementado('registrarOlvidado'),
    registrarAusencia: overrides.registrarAusencia ?? noImplementado('registrarAusencia'),
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
