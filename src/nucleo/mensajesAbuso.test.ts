import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeAmigable } from './mensajesAbuso.ts';
import { ErrorLimiteAlcanzado } from './limitadorTasa.ts';

void test('un límite de tasa produce un mensaje que dice cuánto esperar, no el error técnico', () => {
  const mensaje = mensajeAmigable(new ErrorLimiteAlcanzado(5000));

  assert.match(mensaje, /espera/i);
  assert.match(mensaje, /5 segundos/);
  assert.doesNotMatch(mensaje, /ErrorLimiteAlcanzado/);
});

void test('un límite de tasa con menos de un segundo restante se redondea a "1 segundo" (singular)', () => {
  const mensaje = mensajeAmigable(new ErrorLimiteAlcanzado(200));

  assert.match(mensaje, /1 segundo\b/);
  assert.doesNotMatch(mensaje, /1 segundos/);
});

void test('un AbortError produce un mensaje sobre la conexión, no el nombre técnico del error', () => {
  const mensaje = mensajeAmigable(new DOMException('Abortado', 'AbortError'));

  assert.match(mensaje, /conexión|tardado/i);
  assert.doesNotMatch(mensaje, /AbortError/);
});

void test('cualquier otro error cae en el mensaje genérico, sin exponer el error original', () => {
  const mensaje = mensajeAmigable(new Error('detalle interno sensible que no debe verse'));

  assert.doesNotMatch(mensaje, /detalle interno sensible/);
  assert.equal(mensaje.length > 0, true);
});

void test('un valor que no es un Error también cae en el mensaje genérico sin lanzar', () => {
  assert.doesNotThrow(() => {
    mensajeAmigable(undefined);
  });
  assert.doesNotThrow(() => {
    mensajeAmigable('cadena cualquiera');
  });
});
