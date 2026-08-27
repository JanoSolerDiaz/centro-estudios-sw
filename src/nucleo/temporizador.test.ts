import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearTemporizadorDePrueba, temporizadorReal } from './temporizador.ts';

void test('el temporizador de prueba registra las esperas pedidas sin esperar de verdad', async () => {
  const temporizador = crearTemporizadorDePrueba();
  const inicio = Date.now();

  await temporizador.esperar(60_000);
  await temporizador.esperar(120_000);

  assert.deepEqual(temporizador.esperas, [60_000, 120_000]);
  assert.ok(Date.now() - inicio < 1000, 'no debería haber esperado de verdad');
});

void test('el temporizador real espera aproximadamente el tiempo pedido', async () => {
  const inicio = Date.now();
  await temporizadorReal.esperar(20);
  assert.ok(Date.now() - inicio >= 15);
});
