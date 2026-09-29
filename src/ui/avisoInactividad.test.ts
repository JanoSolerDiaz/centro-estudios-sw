import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { montarAvisoInactividad } from './avisoInactividad.ts';

function montar(alContinuar: () => void) {
  const dom = new JSDOM('<!doctype html><body><div id="a"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#a');
  assert.ok(contenedor);
  const controlador = montarAvisoInactividad(contenedor, alContinuar);
  return { dom, contenedor, controlador };
}

void test('aviso de inactividad: oculto al montar, alertdialog etiquetado, con un único botón', () => {
  const { contenedor } = montar(() => undefined);
  const aviso = contenedor.querySelector('[role="alertdialog"]');
  assert.ok(aviso);
  assert.equal((aviso as HTMLElement).hidden, true);
  assert.equal(aviso.getAttribute('aria-labelledby'), 'aviso-inactividad-texto');
  assert.equal(contenedor.querySelectorAll('button').length, 1);
});

void test('aviso de inactividad: mostrar pinta la cuenta atrás y los pendientes, y enfoca el botón solo la primera vez', () => {
  const { dom, contenedor, controlador } = montar(() => undefined);
  controlador.mostrar(42, 2);
  assert.match(contenedor.textContent, /42 s/);
  assert.match(contenedor.textContent, /2 registros sin enviar/);
  const boton = contenedor.querySelector('button');
  assert.ok(boton);
  assert.equal(dom.window.document.activeElement, boton);
  boton.blur();
  controlador.mostrar(41, 2);
  assert.notEqual(dom.window.document.activeElement, boton, 'el tick siguiente no roba el foco');
  assert.match(contenedor.textContent, /41 s/);
});

void test('aviso de inactividad: «Seguir conectado» llama a alContinuar; ocultar lo esconde', () => {
  let llamadas = 0;
  const { contenedor, controlador } = montar(() => (llamadas += 1));
  controlador.mostrar(30, 0);
  const boton = contenedor.querySelector('button');
  assert.ok(boton);
  assert.equal(boton.textContent, 'Seguir conectado');
  boton.click();
  assert.equal(llamadas, 1);
  controlador.ocultar();
  assert.equal(contenedor.querySelector('[role="alertdialog"]')?.hasAttribute('hidden'), true);
});
