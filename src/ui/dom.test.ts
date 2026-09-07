import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { crearElemento, crearAbridorVentanaImpresionNavegador } from './dom.ts';

function documentoDePrueba(): Document {
  return new JSDOM('<!doctype html><body></body>').window.document;
}

void test('crea el elemento pedido, con su texto', () => {
  const documento = documentoDePrueba();
  const elemento = crearElemento(documento, 'p', { texto: 'Hola' });
  assert.equal(elemento.tagName, 'P');
  assert.equal(elemento.textContent, 'Hola');
});

void test('un texto con marcado se pinta literal, nunca se interpreta como HTML (protección XSS)', () => {
  const documento = documentoDePrueba();
  const nombreMalicioso = '<script>window.hackeado = true</script>';
  const elemento = crearElemento(documento, 'span', { texto: nombreMalicioso });

  assert.equal(elemento.textContent, nombreMalicioso);
  assert.equal(elemento.querySelector('script'), null);
  assert.equal(elemento.children.length, 0);
});

void test('aplica los atributos pedidos', () => {
  const documento = documentoDePrueba();
  const elemento = crearElemento(documento, 'div', { atributos: { role: 'status', 'aria-live': 'polite' } });
  assert.equal(elemento.getAttribute('role'), 'status');
  assert.equal(elemento.getAttribute('aria-live'), 'polite');
});

void test('añade los hijos, en orden, mezclando texto plano y nodos', () => {
  const documento = documentoDePrueba();
  const hijo = documento.createElement('b');
  hijo.textContent = 'fuerte';
  const elemento = crearElemento(documento, 'p', {}, ['antes ', hijo, ' después']);

  assert.equal(elemento.childNodes.length, 3);
  assert.equal(elemento.textContent, 'antes fuerte después');
});

void test('sin opciones ni hijos, crea el elemento vacío', () => {
  const documento = documentoDePrueba();
  const elemento = crearElemento(documento, 'div');
  assert.equal(elemento.textContent, '');
  assert.equal(elemento.attributes.length, 0);
});

// --- crearAbridorVentanaImpresionNavegador (R-04) -----------------------------------------------

function ventanaDePrueba(): { readonly ventana: Window; readonly llamadasFocus: number[]; readonly llamadasPrint: number[] } {
  const documento = documentoDePrueba();
  const llamadasFocus: number[] = [];
  const llamadasPrint: number[] = [];
  const ventana = {
    document: documento,
    focus: () => llamadasFocus.push(1),
    print: () => llamadasPrint.push(1),
  } as unknown as Window;
  return { ventana, llamadasFocus, llamadasPrint };
}

void test('crearAbridorVentanaImpresionNavegador: abre en blanco, sin ruta, en una pestaña nueva sin opener', () => {
  const { ventana } = ventanaDePrueba();
  let argumentos: readonly [string, string, string] | undefined;
  const abridor = crearAbridorVentanaImpresionNavegador((url, destino, caracteristicas) => {
    argumentos = [url, destino, caracteristicas];
    return ventana;
  });

  abridor.abrir('Informe mensual');

  assert.deepEqual(argumentos, ['', '_blank', 'noopener,noreferrer']);
});

void test('crearAbridorVentanaImpresionNavegador: pone el título pedido en el document de la ventana', () => {
  const { ventana } = ventanaDePrueba();
  const abridor = crearAbridorVentanaImpresionNavegador(() => ventana);

  const resultado = abridor.abrir('Informe mensual — Marzo 2026');

  assert.ok(resultado);
  assert.equal(resultado.document.title, 'Informe mensual — Marzo 2026');
});

void test('crearAbridorVentanaImpresionNavegador: imprimir() enfoca la ventana antes de llamar a print()', () => {
  const { ventana, llamadasFocus, llamadasPrint } = ventanaDePrueba();
  const abridor = crearAbridorVentanaImpresionNavegador(() => ventana);

  const resultado = abridor.abrir('Informe mensual');
  assert.ok(resultado);
  resultado.imprimir();

  assert.deepEqual(llamadasFocus, [1]);
  assert.deepEqual(llamadasPrint, [1]);
});

void test('crearAbridorVentanaImpresionNavegador: ventana emergente bloqueada (window.open devuelve null) da undefined, nunca lanza', () => {
  const abridor = crearAbridorVentanaImpresionNavegador(() => null);

  const resultado = abridor.abrir('Informe mensual');

  assert.equal(resultado, undefined);
});
