import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { crearMensajeErrorCampo } from './formularios.ts';

function crearCampoDePrueba(): { documento: Document; campo: HTMLInputElement } {
  const documento = new JSDOM('<!doctype html><body></body>').window.document;
  const campo = documento.createElement('input');
  return { documento, campo };
}

void test('enlaza el mensaje de error al campo por aria-describedby y empieza sin marcar error', () => {
  const { documento, campo } = crearCampoDePrueba();
  const mensaje = crearMensajeErrorCampo(documento, campo, 'campo-x-error');

  assert.equal(mensaje.elemento.id, 'campo-x-error');
  assert.equal(mensaje.elemento.getAttribute('role'), 'alert');
  assert.equal(campo.getAttribute('aria-describedby'), 'campo-x-error');
  assert.equal(campo.getAttribute('aria-invalid'), 'false');
  assert.equal(mensaje.elemento.textContent, '');
});

void test('establecer() escribe el texto y marca aria-invalid="true"', () => {
  const { documento, campo } = crearCampoDePrueba();
  const mensaje = crearMensajeErrorCampo(documento, campo, 'campo-y-error');

  mensaje.establecer('La hora de fin debe ser posterior a la de inicio.');

  assert.equal(mensaje.elemento.textContent, 'La hora de fin debe ser posterior a la de inicio.');
  assert.equal(campo.getAttribute('aria-invalid'), 'true');
});

void test('limpiar() vacía el texto y vuelve a marcar aria-invalid="false"', () => {
  const { documento, campo } = crearCampoDePrueba();
  const mensaje = crearMensajeErrorCampo(documento, campo, 'campo-z-error');

  mensaje.establecer('Error');
  mensaje.limpiar();

  assert.equal(mensaje.elemento.textContent, '');
  assert.equal(campo.getAttribute('aria-invalid'), 'false');
});
