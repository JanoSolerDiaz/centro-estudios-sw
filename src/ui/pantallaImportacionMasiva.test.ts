import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaImportacionMasiva, type DependenciasPantallaImportacionMasiva } from './pantallaImportacionMasiva.ts';
import type { CentroEstudios } from '../dominio/tipos.ts';

function crearContenedorDePruebas(): { contenedor: HTMLElement; documento: Document } {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return { contenedor, documento: dom.window.document };
}

const CENTRO: CentroEstudios = { id: 'c1', nombre: 'San José', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' };

const ALUMNO_EXISTENTE = { id: 'a0', nombre: 'Existente', primer_apellido: 'Previo', segundo_apellido: null, centro_referencia_id: 'c1' };

function crearDepsFalsas(overrides: Partial<DependenciasPantallaImportacionMasiva> = {}): DependenciasPantallaImportacionMasiva {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaImportacionMasiva falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: overrides.rol ?? 'administrator',
    leerFichero: overrides.leerFichero ?? { leerTexto: (archivo) => archivo.text() },
    listarCentrosParaImportacion: overrides.listarCentrosParaImportacion ?? (() => Promise.resolve([CENTRO])),
    listarAlumnosParaImportacion: overrides.listarAlumnosParaImportacion ?? (() => Promise.resolve([ALUMNO_EXISTENTE])),
    resolverProfesorPorEmail: overrides.resolverProfesorPorEmail ?? noImplementado('resolverProfesorPorEmail'),
    importarAlumnos: overrides.importarAlumnos ?? noImplementado('importarAlumnos'),
    importarHorarios: overrides.importarHorarios ?? noImplementado('importarHorarios'),
    generarId: overrides.generarId ?? contadorDeIdsDeterminista(),
  };
}

/** Generador determinista para tests: `id-1`, `id-2`... — nunca `crypto.randomUUID()`, para que un
 * test pueda comprobar exactamente qué id se envió sin depender de un valor aleatorio. */
function contadorDeIdsDeterminista(): () => string {
  let contador = 0;
  return () => {
    contador += 1;
    return `id-${String(contador)}`;
  };
}

async function esperarMicrotareas(veces = 6): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function seleccionarFichero(documento: Document, input: HTMLInputElement, texto: string, nombre = 'fichero.csv'): void {
  const ventana = documento.defaultView;
  assert.ok(ventana, 'el documento de pruebas no tiene defaultView');
  const archivo = new ventana.File([texto], nombre, { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  input.dispatchEvent(new ventana.Event('change'));
}

const CABECERA_ALUMNOS = 'nombre;primer_apellido;segundo_apellido;centro;telefono;email';
const CABECERA_HORARIOS = 'alumno_nombre;alumno_primer_apellido;alumno_segundo_apellido;profesor_email;dia_semana;hora_inicio;hora_fin;asignatura_o_grupo';

void test('teacher: no tiene acceso a esta pantalla, y no dispara ninguna petición', () => {
  const { contenedor } = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaImportacionMasiva(contenedor, crearDepsFalsas({ rol: 'teacher', listarCentrosParaImportacion: () => { llamadas += 1; return Promise.resolve([]); } }));
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('student: no tiene acceso a esta pantalla', () => {
  const { contenedor } = crearContenedorDePruebas();
  mostrarPantallaImportacionMasiva(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('administrator: monta los dos bloques con sus botones de confirmar deshabilitados', () => {
  const { contenedor } = crearContenedorDePruebas();
  mostrarPantallaImportacionMasiva(contenedor, crearDepsFalsas());
  assert.match(contenedor.textContent, /Importar alumnos/);
  assert.match(contenedor.textContent, /Importar horarios/);
  const botones = [...contenedor.querySelectorAll('button')].filter((b) => b.textContent === 'Confirmar importación');
  assert.equal(botones.length, 2);
  assert.ok(botones[0]?.disabled);
  assert.ok(botones[1]?.disabled);
});

// --- bloque de alumnos ------------------------------------------------------------------------

void test('alumnos: analiza el CSV seleccionado y muestra la vista previa con el resumen', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  const deps = crearDepsFalsas();
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;

  seleccionarFichero(documento, input, `${CABECERA_ALUMNOS}\r\nJuan;Pérez;;San José;;\r\n`);
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /1 nuevas, 0 duplicadas \(se omiten\), 0 con error\./);
  assert.match(contenedor.textContent, /Juan Pérez — se creará\./);
});

void test('alumnos: cabecera inválida muestra el error y no ofrece confirmar', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  const deps = crearDepsFalsas();
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;

  seleccionarFichero(documento, input, 'columna_a;columna_b\r\nx;y\r\n');
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /La cabecera debe ser exactamente/);
  const boton = [...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Confirmar importación');
  assert.ok(boton?.disabled);
});

void test('alumnos: confirmar llama a importarAlumnos solo con las filas nuevas y muestra el recuento', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  let recibido: unknown;
  const deps = crearDepsFalsas({
    importarAlumnos: (filas) => {
      recibido = filas;
      return Promise.resolve(filas.length);
    },
  });
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;

  seleccionarFichero(
    documento,
    input,
    `${CABECERA_ALUMNOS}\r\nJuan;Pérez;;San José;;\r\nExistente;Previo;;San José;;\r\n`,
  );
  await esperarMicrotareas();

  const botonConfirmar = [...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Confirmar importación');
  assert.ok(botonConfirmar);
  assert.equal(botonConfirmar.disabled, false);
  botonConfirmar.click();
  await esperarMicrotareas();

  const filas = recibido as { readonly id: string; readonly datos: { readonly nombre: string } }[];
  assert.deepEqual(filas.map((f) => f.datos.nombre), ['Juan']);
  assert.ok(filas[0]?.id);
  assert.match(contenedor.textContent, /Se han creado 1 alumnos\./);
});

void test('alumnos: un reintento tras un error de red reenvía el mismo id que el primer intento (P-25)', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  const recibidos: (readonly { readonly id: string; readonly datos: { readonly nombre: string } }[])[] = [];
  let intento = 0;
  const deps = crearDepsFalsas({
    importarAlumnos: (filas) => {
      recibidos.push(filas);
      intento += 1;
      if (intento === 1) {
        return Promise.reject(new Error('corte de red simulado'));
      }
      return Promise.resolve(filas.length);
    },
  });
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;

  seleccionarFichero(documento, input, `${CABECERA_ALUMNOS}\r\nJuan;Pérez;;San José;;\r\n`);
  await esperarMicrotareas();

  const botonConfirmar = [...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Confirmar importación');
  assert.ok(botonConfirmar);

  botonConfirmar.click();
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No se ha podido completar la acción/);

  botonConfirmar.click();
  await esperarMicrotareas();

  assert.equal(recibidos.length, 2);
  assert.equal(recibidos[0]?.[0]?.id, recibidos[1]?.[0]?.id);
  assert.match(contenedor.textContent, /Se han creado 1 alumnos\./);
});

// --- bloque de horarios ------------------------------------------------------------------------

void test('horarios: resuelve cada email de profesor una sola vez y muestra la vista previa', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  let llamadasResolucion = 0;
  const deps = crearDepsFalsas({
    resolverProfesorPorEmail: (email) => {
      llamadasResolucion += 1;
      return Promise.resolve(email === 'ana@example.com' ? { id: 'p1', nombre: 'Ana Profesora' } : null);
    },
  });
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;

  seleccionarFichero(
    documento,
    input,
    `${CABECERA_HORARIOS}\r\nExistente;Previo;;ana@example.com;1;10:00;11:00;\r\nExistente;Previo;;ana@example.com;2;10:00;11:00;\r\n`,
  );
  await esperarMicrotareas();

  assert.equal(llamadasResolucion, 1);
  assert.match(contenedor.textContent, /2 nuevos, 0 con error\./);
});

void test('horarios: profesor sin cuenta deja esa fila en error sin bloquear el resto', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  const deps = crearDepsFalsas({
    resolverProfesorPorEmail: (email) => Promise.resolve(email === 'ana@example.com' ? { id: 'p1', nombre: 'Ana Profesora' } : null),
  });
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;

  seleccionarFichero(
    documento,
    input,
    `${CABECERA_HORARIOS}\r\nExistente;Previo;;inexistente@example.com;1;10:00;11:00;\r\nExistente;Previo;;ana@example.com;2;10:00;11:00;\r\n`,
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /1 nuevos, 1 con error\./);
});

void test('horarios: confirmar muestra el recuento creado y los errores de escritura de cada fila', async () => {
  const { contenedor, documento } = crearContenedorDePruebas();
  const deps = crearDepsFalsas({
    resolverProfesorPorEmail: () => Promise.resolve({ id: 'p1', nombre: 'Ana Profesora' }),
    importarHorarios: () =>
      Promise.resolve({ creados: 1, errores: [{ descripcion: 'Existente Previo — martes 10:00-11:00', motivo: 'Se solapa.' }] }),
  });
  mostrarPantallaImportacionMasiva(contenedor, deps);
  const input = contenedor.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;

  seleccionarFichero(
    documento,
    input,
    `${CABECERA_HORARIOS}\r\nExistente;Previo;;ana@example.com;1;10:00;11:00;\r\n`,
  );
  await esperarMicrotareas();

  const botonConfirmar = [...contenedor.querySelectorAll('button')].filter((b) => b.textContent === 'Confirmar importación')[1];
  assert.ok(botonConfirmar);
  botonConfirmar.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Se han creado 1 horarios\./);
  assert.match(contenedor.textContent, /Existente Previo — martes 10:00-11:00: Se solapa\./);
});
