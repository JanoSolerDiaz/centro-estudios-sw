import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { montarAvisoNuevaVersion } from './avisoNuevaVersion.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="aviso"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#aviso');
  assert.ok(contenedor, 'el documento de pruebas no tiene #aviso');
  return contenedor;
}

void test('montarAvisoNuevaVersion: empieza oculto', () => {
  const contenedor = crearContenedorDePruebas();

  montarAvisoNuevaVersion(contenedor, () => undefined);

  const aviso = contenedor.querySelector('div');
  assert.ok(aviso);
  assert.equal(aviso.hidden, true);
});

void test('montarAvisoNuevaVersion: "mostrar" lo hace visible y "ocultar" lo vuelve a esconder', () => {
  const contenedor = crearContenedorDePruebas();

  const controlador = montarAvisoNuevaVersion(contenedor, () => undefined);
  const aviso = contenedor.querySelector('div');
  assert.ok(aviso);

  controlador.mostrar();
  assert.equal(aviso.hidden, false);

  controlador.ocultar();
  assert.equal(aviso.hidden, true);
});

void test('montarAvisoNuevaVersion: pulsar el botón llama a "alActualizar" exactamente una vez', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;

  const controlador = montarAvisoNuevaVersion(contenedor, () => {
    llamadas += 1;
  });
  controlador.mostrar();

  const boton = contenedor.querySelector('button');
  assert.ok(boton, 'debe pintar un botón');
  boton.click();

  assert.equal(llamadas, 1);
});

void test('montarAvisoNuevaVersion: el texto explica que hay una versión nueva', () => {
  const contenedor = crearContenedorDePruebas();

  montarAvisoNuevaVersion(contenedor, () => undefined);

  assert.match(contenedor.textContent, /versión nueva/i);
});
