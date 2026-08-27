import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearParametrosRecuperacion } from './enlaceRecuperacion.ts';

void test('hash vacío no es un enlace de recuperación', () => {
  assert.equal(parsearParametrosRecuperacion(''), undefined);
});

void test('hash de navegación normal (sin type=recovery) no es un enlace de recuperación', () => {
  assert.equal(parsearParametrosRecuperacion('#seccion-x'), undefined);
  assert.equal(parsearParametrosRecuperacion('#access_token=abc&type=signup'), undefined);
});

void test('hash de recuperación con access_token se reconoce, con o sin # inicial', () => {
  const conAlmohadilla = parsearParametrosRecuperacion(
    '#access_token=el-token&type=recovery&refresh_token=otro&token_type=bearer',
  );
  assert.deepEqual(conAlmohadilla, { accessToken: 'el-token' });

  const sinAlmohadilla = parsearParametrosRecuperacion('access_token=el-token&type=recovery');
  assert.deepEqual(sinAlmohadilla, { accessToken: 'el-token' });
});

void test('type=recovery sin access_token no es un enlace de recuperación utilizable', () => {
  assert.equal(parsearParametrosRecuperacion('#type=recovery'), undefined);
});
