import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { montarComboboxAsignatura, type DependenciasComboboxAsignatura, type ComboboxAsignatura } from './comboboxAsignatura.ts';
import type { Asignatura } from '../dominio/tipos.ts';
import type { ResultadoGuardarAsignatura } from '../datos/asignaturas.ts';

function crearDocumentoDePruebas(): Document {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  return dom.window.document;
}

function asignatura(id: string, nombre: string): Asignatura {
  return { id, nombre, activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' };
}

const MATEMATICAS = asignatura('a1', 'Matemáticas 4ESO');
const LENGUA = asignatura('a2', 'Lengua 1ESO');

interface Montaje {
  readonly documento: Document;
  readonly combobox: ComboboxAsignatura;
  readonly input: HTMLInputElement;
  readonly creadas: string[];
}

function montar(overrides: Partial<DependenciasComboboxAsignatura> = {}): Montaje {
  const documento = crearDocumentoDePruebas();
  const creadas: string[] = [];
  const deps: DependenciasComboboxAsignatura = {
    catalogoInicial: overrides.catalogoInicial ?? [MATEMATICAS, LENGUA],
    crearAsignatura:
      overrides.crearAsignatura ??
      ((nombre: string): Promise<ResultadoGuardarAsignatura> => {
        creadas.push(nombre);
        return Promise.resolve({ tipo: 'guardado', asignatura: asignatura(`nueva-${String(creadas.length)}`, nombre) });
      }),
  };
  const combobox = montarComboboxAsignatura(documento, deps);
  const contenedorApp = documento.querySelector<HTMLElement>('#app');
  assert.ok(contenedorApp);
  contenedorApp.append(combobox.contenedor);
  const input = combobox.contenedor.querySelector<HTMLInputElement>('input[role="combobox"]');
  assert.ok(input, 'no se encuentra el input del combobox');
  return { documento, combobox, input, creadas };
}

function escribir(input: HTMLInputElement, valor: string): void {
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.value = valor;
  input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
}

function tecla(input: HTMLInputElement, key: string): void {
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.dispatchEvent(new ventana.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

// --- Atributos ARIA base -------------------------------------------------------------------------

void test('el input nace con los atributos ARIA de combobox correctos, sin ser obligatorio', () => {
  const { input, combobox } = montar();
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.getAttribute('aria-autocomplete'), 'list');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.required, false);
  const idListbox = input.getAttribute('aria-controls');
  assert.ok(idListbox);
  assert.ok(combobox.contenedor.querySelector(`#${idListbox}[role="listbox"]`));
});

// --- Vacío es válido (campo opcional) ------------------------------------------------------------

void test('sin escribir nada, obtenerValor devuelve vacio', () => {
  const { combobox } = montar();
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'vacio' });
});

// --- Filtro local y resolución contra el catálogo ------------------------------------------------

void test('escribir muestra las coincidencias del catálogo, acento-insensible', () => {
  const { input, combobox } = montar();
  escribir(input, 'matematicas 4eso'); // coincidencia EXACTA (acento-insensible): sin opción de crear
  const opciones = combobox.contenedor.querySelectorAll('li[role="option"]');
  assert.equal(opciones.length, 1);
  assert.equal(opciones[0]?.textContent, 'Matemáticas 4ESO');
});

void test('el foco sin texto muestra el catálogo completo (sin mínimo de caracteres)', () => {
  const { input, combobox } = montar();
  input.dispatchEvent(new (input.ownerDocument.defaultView as unknown as typeof window).Event('focus', { bubbles: true }));
  const opciones = combobox.contenedor.querySelectorAll('li[role="option"]');
  assert.equal(opciones.length, 2);
});

void test('escribir un nombre que coincide EXACTAMENTE con el catálogo resuelve a ese nombre canónico', () => {
  const { input, combobox } = montar();
  escribir(input, '  MATEMÁTICAS   4eso ');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'resuelto', nombre: 'Matemáticas 4ESO' });
});

void test('escribir un texto que no coincide con nada devuelve sin_resolver', () => {
  const { input, combobox } = montar();
  escribir(input, 'Física 4ESO');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'sin_resolver', textoEscrito: 'Física 4ESO' });
});

// --- Selección con teclado ------------------------------------------------------------------------

void test('ArrowDown + Enter selecciona la opción activa y la deja escrita en el campo', () => {
  const { input, combobox } = montar();
  escribir(input, 'eso'); // coincide con las dos
  tecla(input, 'ArrowDown');
  tecla(input, 'Enter');
  assert.equal(input.value, 'Matemáticas 4ESO');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'resuelto', nombre: 'Matemáticas 4ESO' });
});

void test('Escape cierra la lista sin cambiar el texto escrito', () => {
  const { input, combobox } = montar();
  escribir(input, 'Física 4ESO');
  tecla(input, 'Escape');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, 'Física 4ESO');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'sin_resolver', textoEscrito: 'Física 4ESO' });
});

// --- Alta sobre la marcha (requisito 3 de R-33) ---------------------------------------------------

void test('un texto sin coincidencia ofrece la opción de crear, como última entrada de la lista', () => {
  const { input, combobox } = montar();
  escribir(input, 'Física 4ESO');
  const opciones = combobox.contenedor.querySelectorAll('li[role="option"]');
  assert.equal(opciones.length, 1);
  assert.match(opciones[0]?.textContent ?? '', /Crear.*Física 4ESO/);
});

void test('un texto que YA coincide con el catálogo no ofrece la opción de crear', () => {
  const { input, combobox } = montar();
  escribir(input, 'Matemáticas 4ESO');
  const opciones = combobox.contenedor.querySelectorAll('li[role="option"]');
  assert.equal(opciones.length, 1);
  assert.equal(opciones[0]?.textContent, 'Matemáticas 4ESO');
});

void test('ArrowDown hasta la opción de crear + Enter llama a crearAsignatura y resuelve al resultado', async () => {
  const { input, combobox, creadas } = montar();
  escribir(input, 'Física 4ESO');
  tecla(input, 'ArrowDown'); // única opción: "Crear «Física 4ESO»"
  tecla(input, 'Enter');
  await esperarMicrotareas();
  assert.deepEqual(creadas, ['Física 4ESO']);
  assert.equal(input.value, 'Física 4ESO');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'resuelto', nombre: 'Física 4ESO' });
});

void test('si crearAsignatura devuelve un duplicado (carrera), se usa el nombre ya existente', async () => {
  const { input, combobox } = montar({
    crearAsignatura: () => Promise.resolve({ tipo: 'duplicado', existente: MATEMATICAS }),
  });
  escribir(input, 'matematicas 4eso extra');
  tecla(input, 'ArrowDown');
  tecla(input, 'Enter');
  await esperarMicrotareas();
  assert.equal(input.value, 'Matemáticas 4ESO');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'resuelto', nombre: 'Matemáticas 4ESO' });
});

void test('un fallo al crear muestra un mensaje amigable y no cambia el texto escrito', async () => {
  const { input, combobox } = montar({
    crearAsignatura: () => Promise.reject(new Error('sin conexión')),
  });
  escribir(input, 'Física 4ESO');
  tecla(input, 'ArrowDown');
  tecla(input, 'Enter');
  await esperarMicrotareas();
  assert.equal(input.value, 'Física 4ESO');
  const zonaEstado = combobox.contenedor.querySelector('[role="status"]');
  assert.ok(zonaEstado?.textContent && zonaEstado.textContent.length > 0);
});

// --- establecerValor (modo edición, requisito 4) --------------------------------------------------

void test('establecerValor precarga el texto sin exigir que esté en el catálogo', () => {
  const { input, combobox } = montar({ catalogoInicial: [MATEMATICAS] });
  combobox.establecerValor('Texto histórico libre');
  assert.equal(input.value, 'Texto histórico libre');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'resuelto', nombre: 'Texto histórico libre' });
});

void test('establecerValor con null deja el campo vacío', () => {
  const { input, combobox } = montar();
  combobox.establecerValor(null);
  assert.equal(input.value, '');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'vacio' });
});

void test('actualizarCatalogo permite cargar el catálogo de forma asíncrona tras construir el combobox', () => {
  const { input, combobox } = montar({ catalogoInicial: [] });
  escribir(input, 'matematicas 4eso');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'sin_resolver', textoEscrito: 'matematicas 4eso' });

  combobox.actualizarCatalogo([MATEMATICAS]);

  assert.deepEqual(combobox.obtenerValor(), { tipo: 'resuelto', nombre: 'Matemáticas 4ESO' });
});

void test('modificar un valor precargado exige volver a resolverlo contra el catálogo', () => {
  const { input, combobox } = montar({ catalogoInicial: [MATEMATICAS] });
  combobox.establecerValor('Texto histórico libre');
  escribir(input, 'Texto histórico libre modificado');
  assert.deepEqual(combobox.obtenerValor(), { tipo: 'sin_resolver', textoEscrito: 'Texto histórico libre modificado' });
});
