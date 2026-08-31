import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { crearElemento } from './dom.ts';

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
