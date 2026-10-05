import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaHistorico, type DependenciasPantallaHistorico } from './pantallaHistorico.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import type { DetectorConexion } from '../nucleo/detectorConexion.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';

// Verano: Madrid = UTC+2. Entrada 17:30 locales.
const AHORA = new Date('2026-08-26T16:00:00.000Z');

function asistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'as1',
    alumno_id: 'al1',
    profesor_id: 'p1',
    registrado_en: '2026-08-26T15:31:00.000Z',
    ocurrido_en: '2026-08-26T15:30:00.000Z',
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot1',
    slot_dia_semana: 3,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: null,
    estado: 'valida',
    motivo_anulacion: null,
    motivo_justificacion: null,
    nota_justificacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'pet1',
    ...sobrescribir,
  };
}

interface LlamadaActualizar {
  readonly profesorId: string;
  readonly entrada: Record<string, unknown>;
}

function montar(
  filas: readonly Asistencia[],
  opciones: {
    rol?: 'administrator' | 'teacher';
    usuarioId?: string;
    actualizar?: (profesorId: string, entrada: Record<string, unknown>) => Promise<Asistencia>;
    detector?: DetectorConexion;
  } = {},
) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const documento = dom.window.document;
  const contenedor = documento.querySelector<HTMLElement>('#app');
  assert.ok(contenedor);
  const llamadas: LlamadaActualizar[] = [];
  const cargas = { n: 0, filtros: [] as unknown[] };
  const deps: DependenciasPantallaHistorico = {
    rol: opciones.rol ?? 'administrator',
    usuarioId: opciones.usuarioId ?? 'admin',
    reloj: crearRelojFijo(AHORA),
    listarHistorico: (filtro) => {
      cargas.n += 1;
      cargas.filtros.push(filtro);
      return Promise.resolve({ filas, totalAproximado: filas.length });
    },
    listarHistoricoCompleto: () => Promise.resolve(filas),
    resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', { nombre: 'María', primer_apellido: 'García', segundo_apellido: null }]])),
    resolverNombresProfesores: () => Promise.resolve(new Map([['p1', 'Profe Uno']])),
    buscarAlumnos: () => Promise.resolve([]),
    descargador: { descargar: () => undefined },
    listarSlotsDeAlumnoParaInforme: () => Promise.resolve([]),
    listarCierresActivosParaInforme: () => Promise.resolve([]),
    listarExcepcionesEnRangoParaInforme: () => Promise.resolve([]),
    listarPausasDeAlumnoParaInforme: () => Promise.resolve([]),
    abridorImpresion: { abrir: () => undefined },
    actualizarRegistro: (profesorId, entrada) => {
      llamadas.push({ profesorId, entrada: { ...entrada } });
      return (opciones.actualizar ?? (() => Promise.resolve(asistencia())))(profesorId, { ...entrada });
    },
    ...(opciones.detector ? { detectorConexion: opciones.detector } : {}),
  };
  mostrarPantallaHistorico(contenedor, deps);
  return { documento, contenedor, llamadas, cargas };
}

async function esperar(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

function clic(el: Element): void {
  const v = el.ownerDocument.defaultView;
  assert.ok(v);
  el.dispatchEvent(new v.MouseEvent('click', { bubbles: true }));
}

function boton(doc: Document, etiqueta: RegExp): HTMLButtonElement {
  const b = Array.from(doc.querySelectorAll('button')).find((x) => etiqueta.test(x.getAttribute('aria-label') ?? x.textContent));
  assert.ok(b, `no hay botón ${String(etiqueta)}`);
  return b;
}

void test('administrator ve lápiz y papelera accesibles en cada fila; una fila anulada sale tachada con su motivo y sin controles', async () => {
  const { documento } = montar([asistencia(), asistencia({ id: 'as2', estado: 'anulada', motivo_anulacion: 'toque equivocado' })]);
  await esperar();
  const filas = documento.querySelectorAll('tbody tr');
  assert.equal(filas.length, 2);
  assert.ok(filas[0]?.querySelector('button[aria-label^="Editar el registro de María García"]'));
  assert.ok(filas[0]?.querySelector('button[aria-label^="Anular el registro de María García"]'));
  assert.equal(filas[1]?.querySelectorAll('button').length, 0);
  assert.equal(filas[1].getAttribute('data-anulada'), 'true');
  assert.match(filas[1].textContent, /motivo: toque equivocado/);
});

void test('teacher: controles en su fila reciente; en una de hace 8 días solo el texto del administrador', async () => {
  const { documento } = montar([asistencia(), asistencia({ id: 'as2', registrado_en: '2026-08-18T15:00:00.000Z' })], {
    rol: 'teacher',
    usuarioId: 'p1',
  });
  await esperar();
  const filas = documento.querySelectorAll('tbody tr');
  assert.equal(filas[0]?.querySelectorAll('button').length, 2);
  assert.equal(filas[1]?.querySelectorAll('button').length, 0);
  assert.match(filas[1].textContent, /Solo el administrador puede modificar este registro/);
});

void test('sin actualizarRegistro la pantalla es de solo lectura (sin columna de acciones)', async () => {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor);
  mostrarPantallaHistorico(contenedor, {
    rol: 'administrator',
    usuarioId: 'a',
    reloj: crearRelojFijo(AHORA),
    listarHistorico: () => Promise.resolve({ filas: [asistencia()], totalAproximado: 1 }),
    listarHistoricoCompleto: () => Promise.resolve([]),
    resolverNombresAlumnos: () => Promise.resolve(new Map()),
    resolverNombresProfesores: () => Promise.resolve(new Map()),
    buscarAlumnos: () => Promise.resolve([]),
    descargador: { descargar: () => undefined },
    listarSlotsDeAlumnoParaInforme: () => Promise.resolve([]),
    listarCierresActivosParaInforme: () => Promise.resolve([]),
    listarExcepcionesEnRangoParaInforme: () => Promise.resolve([]),
    listarPausasDeAlumnoParaInforme: () => Promise.resolve([]),
    abridorImpresion: { abrir: () => undefined },
  });
  await esperar();
  assert.doesNotMatch(contenedor.textContent, /Acciones/);
  assert.equal(contenedor.querySelectorAll('tbody button').length, 0);
});

void test('editar la hora: envía solo ocurridoEn con el profesor dueño, actualiza la fila en su sitio y no recarga', async () => {
  const nueva = asistencia({ ocurrido_en: '2026-08-26T15:15:00.000Z', actualizado_en: '2026-08-26T16:00:00.000Z' });
  const { documento, llamadas, cargas } = montar([asistencia()], { actualizar: () => Promise.resolve(nueva) });
  await esperar();
  const cargasAntes = cargas.n;
  clic(boton(documento, /^Editar el registro/));
  const dialogo = documento.querySelector('[role="dialog"]');
  assert.ok(dialogo);
  assert.equal(dialogo.getAttribute('aria-modal'), 'true');
  const hora = documento.querySelector<HTMLInputElement>('input[type="time"]');
  assert.ok(hora);
  assert.equal(hora.value, '17:30');
  hora.value = '17:15';
  clic(boton(documento, /^Guardar cambios$/));
  await esperar();

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0]?.profesorId, 'p1');
  assert.deepEqual(llamadas[0].entrada, { asistenciaId: 'as1', ocurridoEn: new Date('2026-08-26T15:15:00.000Z') });
  assert.equal(documento.querySelector('[role="dialog"]'), null, 'el diálogo se cierra al guardar');
  assert.match(documento.body.textContent, /26\/08\/2026.*17:15/);
  assert.match(documento.querySelector('[role="status"]')?.textContent ?? '', /Registro actualizado/);
  assert.equal(cargas.n, cargasAntes, 'no se recarga: filtros y página se conservan');
});

void test('editar sin cambios o con valores inválidos no llama a la RPC y avisa dentro del diálogo', async () => {
  const { documento, llamadas } = montar([asistencia()]);
  await esperar();
  clic(boton(documento, /^Editar el registro/));
  clic(boton(documento, /^Guardar cambios$/));
  assert.match(documento.querySelector('[role="dialog"] [role="alert"]')?.textContent ?? '', /No hay ningún cambio/);
  const hora = documento.querySelector<HTMLInputElement>('input[type="time"]');
  assert.ok(hora);
  hora.value = '23:00';
  clic(boton(documento, /^Guardar cambios$/));
  assert.match(documento.querySelector('[role="dialog"] [role="alert"]')?.textContent ?? '', /futuro/);
  assert.equal(llamadas.length, 0);
});

void test('un error de la RPC (ventana vencida) se muestra amable y el diálogo sigue abierto para reintentar', async () => {
  const { documento } = montar([asistencia()], { actualizar: () => Promise.reject(new SinPermiso()) });
  await esperar();
  clic(boton(documento, /^Editar el registro/));
  const nota = documento.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]');
  assert.ok(nota);
  nota.value = 'llegó tarde';
  clic(boton(documento, /^Guardar cambios$/));
  await esperar();
  assert.ok(documento.querySelector('[role="dialog"]'));
  assert.match(documento.querySelector('[role="dialog"] [role="alert"]')?.textContent ?? '', /No tienes permiso/);
  assert.equal(boton(documento, /^Guardar cambios$/).disabled, false);
});

void test('anular: Cancelar tiene el foco inicial y no cambia nada; sin motivo no se envía; con motivo la fila queda tachada', async () => {
  const anulada = asistencia({ estado: 'anulada', motivo_anulacion: 'duplicado' });
  const { documento, llamadas } = montar([asistencia()], { actualizar: () => Promise.resolve(anulada) });
  await esperar();
  clic(boton(documento, /^Anular el registro/));
  const alerta = documento.querySelector('[role="alertdialog"]');
  assert.ok(alerta);
  assert.match(alerta.textContent, /No se borra: queda marcado como anulado y se conserva el rastro/);
  assert.equal(documento.activeElement?.textContent, 'Cancelar');

  clic(boton(documento, /^Cancelar$/));
  assert.equal(documento.querySelector('[role="alertdialog"]'), null);
  assert.equal(llamadas.length, 0);

  clic(boton(documento, /^Anular el registro/));
  clic(boton(documento, /^Anular registro$/));
  assert.match(documento.querySelector('[role="alertdialog"] [role="alert"]')?.textContent ?? '', /motivo/);
  assert.equal(llamadas.length, 0);

  const motivo = documento.querySelector<HTMLInputElement>('[role="alertdialog"] input');
  assert.ok(motivo);
  motivo.value = '  duplicado ';
  clic(boton(documento, /^Anular registro$/));
  await esperar();
  assert.deepEqual(llamadas[0]?.entrada, { asistenciaId: 'as1', anular: true, motivoAnulacion: 'duplicado' });
  const fila = documento.querySelector('tbody tr');
  assert.equal(fila?.getAttribute('data-anulada'), 'true');
  assert.equal(fila.querySelectorAll('button').length, 0);
  assert.match(fila.textContent, /motivo: duplicado/);
});

void test('Escape cierra el diálogo y el foco vuelve al botón que lo abrió', async () => {
  const { documento } = montar([asistencia()]);
  await esperar();
  const abrir = boton(documento, /^Editar el registro/);
  abrir.focus();
  clic(abrir);
  const dialogo = documento.querySelector('[role="dialog"]');
  assert.ok(dialogo);
  const v = documento.defaultView;
  assert.ok(v);
  dialogo.dispatchEvent(new v.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(documento.querySelector('[role="dialog"]'), null);
  assert.equal(documento.activeElement, abrir);
});

void test('el foco queda atrapado: Tab desde el último control vuelve al primero', async () => {
  const { documento } = montar([asistencia()]);
  await esperar();
  clic(boton(documento, /^Anular el registro/));
  const v = documento.defaultView;
  assert.ok(v);
  const dialogo = documento.querySelector('[role="alertdialog"]');
  assert.ok(dialogo);
  const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>('button, input'));
  const ultimo = enfocables[enfocables.length - 1];
  assert.ok(ultimo);
  ultimo.focus();
  dialogo.dispatchEvent(new v.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(documento.activeElement, enfocables[0]);
});

void test('una clase extra (origen manual, sin slot) se muestra como «Clase extra» y admite editar y anular', async () => {
  const { documento } = montar([asistencia({ origen: 'manual', slot_id: null, slot_dia_semana: null, slot_hora_inicio: null, slot_hora_fin: null })]);
  await esperar();
  const fila = documento.querySelector('tbody tr');
  assert.match(fila?.textContent ?? '', /Clase extra/);
  assert.ok(fila?.querySelector('button[aria-label^="Editar"]'));
  assert.ok(fila?.querySelector('button[aria-label^="Anular"]'));
});

void test('sin conexión los controles quedan deshabilitados con la explicación, y vuelven al reconectar', async () => {
  let escuchador: ((c: boolean) => void) | undefined;
  const detector: DetectorConexion = {
    estaConectado: () => false,
    alCambiar: (e) => {
      escuchador = e;
      return () => undefined;
    },
  };
  const { documento } = montar([asistencia()], { detector });
  await esperar();
  assert.match(documento.body.textContent, /Necesitas conexión para modificar un registro/);
  assert.equal(boton(documento, /^Editar el registro/).disabled, true);
  assert.equal(boton(documento, /^Anular el registro/).disabled, true);

  escuchador?.(true);
  assert.equal(boton(documento, /^Editar el registro/).disabled, false);
  assert.doesNotMatch(documento.body.textContent, /Necesitas conexión/);
});
