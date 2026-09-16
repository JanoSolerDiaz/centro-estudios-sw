import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaBajasProfesor, type DependenciasPantallaBajasProfesor } from './pantallaBajasProfesor.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import type { SlotHorario, BajaProfesor, ExcepcionSlot } from '../dominio/tipos.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';

const HOY = new Date('2026-09-16T10:00:00.000Z'); // miércoles

const PROFESORES: readonly ProfesorParaSelector[] = [
  { id: 'teacher-1', nombre: 'Ana Profesora' },
  { id: 'teacher-2', nombre: 'Bruno Profesor' },
];

const SLOT_LUNES: SlotHorario = {
  id: 'slot-1',
  alumno_id: 'alumno-1',
  profesor_id: 'teacher-1',
  dia_semana: 1,
  hora_inicio: '17:00',
  hora_fin: '18:00',
  asignatura_o_grupo: null,
  vigente_desde: '2026-01-01',
  vigente_hasta: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

const BAJA: BajaProfesor = {
  id: 'baja-1',
  profesor_id: 'teacher-1',
  fecha_inicio: '2026-09-21',
  fecha_fin: '2026-09-25',
  tipo: 'cancelacion',
  profesor_sustituto_id: null,
  motivo: 'Baja médica',
  estado: 'activa',
  motivo_anulacion: null,
  creado_por: 'admin-1',
  anulado_por: null,
  anulado_en: null,
  creado_en: '2026-09-01T00:00:00Z',
  actualizado_en: '2026-09-01T00:00:00Z',
};

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function botonPorTexto(contenedor: HTMLElement, texto: string): HTMLButtonElement | null {
  return [...contenedor.querySelectorAll('button')].find((boton) => boton.textContent === texto) ?? null;
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaBajasProfesor> = {}): DependenciasPantallaBajasProfesor {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaBajasProfesor falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    reloj: crearRelojFijo(HOY),
    listarProfesoresActivos: overrides.listarProfesoresActivos ?? (() => Promise.resolve(PROFESORES)),
    listarSlotsDeProfesor: overrides.listarSlotsDeProfesor ?? noImplementado('listarSlotsDeProfesor'),
    listarRegistrosEnRango: overrides.listarRegistrosEnRango ?? noImplementado('listarRegistrosEnRango'),
    listarExcepcionesActivasEnRango: overrides.listarExcepcionesActivasEnRango ?? noImplementado('listarExcepcionesActivasEnRango'),
    declararBaja: overrides.declararBaja ?? noImplementado('declararBaja'),
    listarBajasDeProfesor: overrides.listarBajasDeProfesor ?? (() => Promise.resolve([])),
    cancelarBaja: overrides.cancelarBaja ?? noImplementado('cancelarBaja'),
    acortarBaja: overrides.acortarBaja ?? noImplementado('acortarBaja'),
    listarExcepcionesDeBaja: overrides.listarExcepcionesDeBaja ?? noImplementado('listarExcepcionesDeBaja'),
    ...overrides,
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

void test('un teacher ve el mensaje de sin acceso, sin llamar a ningún dato', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaBajasProfesor(contenedor, crearDepsFalsas({ rol: 'teacher' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('sin profesor preseleccionado, arranca pidiendo elegir uno y no carga bajas', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaBajasProfesor(contenedor, crearDepsFalsas());
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Elige un profesor/);
  assert.doesNotMatch(contenedor.textContent, /Bajas de este profesor/);
});

void test('con profesorIdInicial, carga sus bajas automáticamente', async () => {
  const contenedor = crearContenedorDePruebas();
  let profesorConsultado: string | undefined;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarBajasDeProfesor: (id) => {
        profesorConsultado = id;
        return Promise.resolve([BAJA]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal(profesorConsultado, 'teacher-1');
  assert.match(contenedor.textContent, /2026-09-21 a 2026-09-25/);
  assert.match(contenedor.textContent, /Cancelación — Baja médica/);
});

void test('el botón "Confirmar baja" está deshabilitado hasta que se calcula una vista previa vigente', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarSlotsDeProfesor: () => Promise.resolve([SLOT_LUNES]),
      listarRegistrosEnRango: () => Promise.resolve([]),
      listarExcepcionesActivasEnRango: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();

  const botonConfirmar = botonPorTexto(contenedor, 'Confirmar baja');
  assert.ok(botonConfirmar);
  assert.equal(botonConfirmar.disabled, true);

  const campoInicio = documento.querySelector<HTMLInputElement>('#bajas-profesor-inicio');
  const campoFin = documento.querySelector<HTMLInputElement>('#bajas-profesor-fin');
  const campoMotivo = documento.querySelector<HTMLInputElement>('#bajas-profesor-motivo');
  const ventana = documento.defaultView;
  assert.ok(campoInicio && campoFin && campoMotivo && ventana);
  campoInicio.value = '2026-09-21';
  campoInicio.dispatchEvent(new ventana.Event('change'));
  campoFin.value = '2026-09-25';
  campoFin.dispatchEvent(new ventana.Event('change'));
  campoMotivo.value = 'Baja médica';
  campoMotivo.dispatchEvent(new ventana.Event('change'));
  await esperarMicrotareas();

  const botonPrevia = botonPorTexto(contenedor, 'Vista previa');
  assert.ok(botonPrevia);
  botonPrevia.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Vista previa: 1 combinación/);

  const botonConfirmarTrasPrevia = botonPorTexto(contenedor, 'Confirmar baja');
  assert.ok(botonConfirmarTrasPrevia);
  assert.equal(botonConfirmarTrasPrevia.disabled, false);
});

void test('cambiar un campo tras calcular la vista previa vuelve a deshabilitar "Confirmar baja"', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarSlotsDeProfesor: () => Promise.resolve([SLOT_LUNES]),
      listarRegistrosEnRango: () => Promise.resolve([]),
      listarExcepcionesActivasEnRango: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();

  const campoInicio = documento.querySelector<HTMLInputElement>('#bajas-profesor-inicio');
  const campoFin = documento.querySelector<HTMLInputElement>('#bajas-profesor-fin');
  const campoMotivo = documento.querySelector<HTMLInputElement>('#bajas-profesor-motivo');
  const ventana = documento.defaultView;
  assert.ok(campoInicio && campoFin && campoMotivo && ventana);
  campoInicio.value = '2026-09-21';
  campoInicio.dispatchEvent(new ventana.Event('change'));
  campoFin.value = '2026-09-25';
  campoFin.dispatchEvent(new ventana.Event('change'));
  campoMotivo.value = 'Baja médica';
  campoMotivo.dispatchEvent(new ventana.Event('change'));
  await esperarMicrotareas();

  const botonPrevia = botonPorTexto(contenedor, 'Vista previa');
  assert.ok(botonPrevia);
  botonPrevia.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  // Cambiar el motivo invalida la vista previa ya calculada.
  campoMotivo.value = 'Otro motivo';
  campoMotivo.dispatchEvent(new ventana.Event('change'));
  await esperarMicrotareas();

  const botonConfirmar = botonPorTexto(contenedor, 'Confirmar baja');
  assert.ok(botonConfirmar);
  assert.equal(botonConfirmar.disabled, true);
});

void test('confirmar una baja llama a declararBaja con los campos del formulario y muestra el resultado', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  let entradaRecibida: unknown;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarSlotsDeProfesor: () => Promise.resolve([SLOT_LUNES]),
      listarRegistrosEnRango: () => Promise.resolve([]),
      listarExcepcionesActivasEnRango: () => Promise.resolve([]),
      declararBaja: (entrada) => {
        entradaRecibida = entrada;
        return Promise.resolve([
          { bajaProfesorId: 'baja-1', slotId: 'slot-1', fecha: '2026-09-21', excepcionId: 'exc-1', excluido: false, motivoExclusion: null },
          { bajaProfesorId: 'baja-1', slotId: 'slot-1', fecha: '2026-09-28', excepcionId: 'exc-2', excluido: false, motivoExclusion: null },
        ]);
      },
      listarBajasDeProfesor: () => Promise.resolve([BAJA]),
    }),
  );
  await esperarMicrotareas();

  const campoInicio = documento.querySelector<HTMLInputElement>('#bajas-profesor-inicio');
  const campoFin = documento.querySelector<HTMLInputElement>('#bajas-profesor-fin');
  const campoMotivo = documento.querySelector<HTMLInputElement>('#bajas-profesor-motivo');
  const ventana = documento.defaultView;
  assert.ok(campoInicio && campoFin && campoMotivo && ventana);
  campoInicio.value = '2026-09-21';
  campoInicio.dispatchEvent(new ventana.Event('change'));
  campoFin.value = '2026-09-25';
  campoFin.dispatchEvent(new ventana.Event('change'));
  campoMotivo.value = 'Baja médica';
  campoMotivo.dispatchEvent(new ventana.Event('change'));
  await esperarMicrotareas();

  const botonPrevia = botonPorTexto(contenedor, 'Vista previa');
  assert.ok(botonPrevia);
  botonPrevia.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  const botonConfirmar = botonPorTexto(contenedor, 'Confirmar baja');
  assert.ok(botonConfirmar);
  botonConfirmar.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    profesorId: 'teacher-1',
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-25',
    tipo: 'cancelacion',
    profesorSustitutoId: null,
    motivo: 'Baja médica',
  });
  assert.match(contenedor.textContent, /2 excepción\(es\) creada\(s\), 0 excluida\(s\)/);
});

void test('sustitución exige elegir un sustituto distinto del titular, sin motivo', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarSlotsDeProfesor: () => Promise.resolve([SLOT_LUNES]),
      listarRegistrosEnRango: () => Promise.resolve([]),
      listarExcepcionesActivasEnRango: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();

  const selectTipo = documento.querySelector<HTMLSelectElement>('#bajas-profesor-tipo');
  const ventana = documento.defaultView;
  assert.ok(selectTipo && ventana);
  selectTipo.value = 'sustitucion';
  selectTipo.dispatchEvent(new ventana.Event('change'));
  await esperarMicrotareas();

  assert.equal(documento.querySelector('#bajas-profesor-motivo'), null);
  const selectSustituto = documento.querySelector<HTMLSelectElement>('#bajas-profesor-sustituto');
  assert.ok(selectSustituto);
  // El propio titular (teacher-1) no debe aparecer como opción de sustituto.
  const valores = [...selectSustituto.querySelectorAll('option')].map((opcion) => opcion.value);
  assert.equal(valores.includes('teacher-1'), false);
  assert.equal(valores.includes('teacher-2'), true);
});

void test('cancelar una baja futura pide motivo y llama a cancelarBaja', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  let llamada: { id: string; motivo: string } | undefined;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarBajasDeProfesor: () => Promise.resolve([{ ...BAJA, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-05' }]),
      cancelarBaja: (id, motivo) => {
        llamada = { id, motivo };
        return Promise.resolve({ ...BAJA, estado: 'anulada' });
      },
    }),
  );
  await esperarMicrotareas();

  const ventana = documento.defaultView;
  assert.ok(ventana);

  const botonCancelar = botonPorTexto(contenedor, 'Cancelar baja');
  assert.ok(botonCancelar);
  botonCancelar.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  const campoMotivo = documento.querySelector<HTMLInputElement>('input[aria-label="Motivo de la cancelación"]');
  assert.ok(campoMotivo);
  campoMotivo.value = 'Se resolvió antes de tiempo';
  campoMotivo.dispatchEvent(new ventana.Event('input'));
  await esperarMicrotareas();

  const botonConfirmarCancelar = botonPorTexto(contenedor, 'Confirmar cancelación');
  assert.ok(botonConfirmarCancelar);
  botonConfirmarCancelar.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  assert.deepEqual(llamada, { id: 'baja-1', motivo: 'Se resolvió antes de tiempo' });
});

void test('acortar una baja en curso pide una nueva fecha de fin y llama a acortarBaja', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  let llamada: { id: string; nuevaFechaFin: string } | undefined;
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarBajasDeProfesor: () => Promise.resolve([{ ...BAJA, fecha_inicio: '2026-09-10', fecha_fin: '2026-09-20' }]),
      acortarBaja: (id, nuevaFechaFin) => {
        llamada = { id, nuevaFechaFin };
        return Promise.resolve({ ...BAJA, fecha_fin: nuevaFechaFin });
      },
    }),
  );
  await esperarMicrotareas();

  const ventana = documento.defaultView;
  assert.ok(ventana);

  const botonAcortar = botonPorTexto(contenedor, 'Acortar baja');
  assert.ok(botonAcortar);
  botonAcortar.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  const campoNuevaFecha = documento.querySelector<HTMLInputElement>('input[aria-label="Nueva fecha de fin"]');
  assert.ok(campoNuevaFecha);
  campoNuevaFecha.value = '2026-09-17';

  const botonConfirmarAcortar = botonPorTexto(contenedor, 'Confirmar acortar');
  assert.ok(botonConfirmarAcortar);
  botonConfirmarAcortar.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  assert.deepEqual(llamada, { id: 'baja-1', nuevaFechaFin: '2026-09-17' });
});

void test('"Ver excepciones generadas" carga y muestra las excepciones de la baja', async () => {
  const contenedor = crearContenedorDePruebas();
  const documento = contenedor.ownerDocument;
  const excepcion: ExcepcionSlot = {
    id: 'exc-1',
    slot_id: 'slot-1',
    fecha: '2026-09-21',
    tipo: 'cancelacion',
    profesor_sustituto_id: null,
    motivo: 'Baja médica',
    activo: true,
    aviso_familias_quien: null,
    aviso_familias_en: null,
    creado_en: '2026-09-01T00:00:00Z',
    actualizado_en: '2026-09-01T00:00:00Z',
  };
  mostrarPantallaBajasProfesor(
    contenedor,
    crearDepsFalsas({
      profesorIdInicial: 'teacher-1',
      listarBajasDeProfesor: () => Promise.resolve([BAJA]),
      listarExcepcionesDeBaja: () => Promise.resolve([excepcion]),
    }),
  );
  await esperarMicrotareas();

  const ventana = documento.defaultView;
  assert.ok(ventana);

  const botonVer = botonPorTexto(contenedor, 'Ver excepciones generadas');
  assert.ok(botonVer);
  botonVer.dispatchEvent(new ventana.Event('click'));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /2026-09-21 — cancelación/);
});
