import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaInicial } from './pantallaInicial.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

void test('mostrarPantallaInicial escribe el mensaje en construcción como texto plano', () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaInicial(contenedor);

  assert.equal(contenedor.textContent, 'GestorAcademia — en construcción.');
});

void test('mostrarPantallaInicial no inyecta ningún elemento hijo (usa textContent, no HTML)', () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaInicial(contenedor);

  assert.equal(contenedor.children.length, 0);
});

void test('mostrarPantallaInicial reemplaza el contenido anterior en vez de acumularlo', () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaInicial(contenedor);
  mostrarPantallaInicial(contenedor);

  assert.equal(contenedor.textContent, 'GestorAcademia — en construcción.');
});
