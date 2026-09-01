import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRebote, crearReboteDePrueba } from './rebote.ts';

void test('el rebote de prueba deja disparar la tarea pendiente a mano, sin esperar de verdad', () => {
  const rebote = crearReboteDePrueba();
  const llamadas: string[] = [];

  rebote.aplazar(250, () => llamadas.push('primera'));
  assert.deepEqual(llamadas, []);
  assert.equal(rebote.pendiente, 250);

  rebote.disparar();
  assert.deepEqual(llamadas, ['primera']);
  assert.equal(rebote.pendiente, undefined);
});

void test('una segunda llamada a aplazar cancela la tarea pendiente: solo la última sobrevive', () => {
  const rebote = crearReboteDePrueba();
  const llamadas: string[] = [];

  rebote.aplazar(250, () => llamadas.push('a'));
  rebote.aplazar(250, () => llamadas.push('b'));
  rebote.aplazar(250, () => llamadas.push('c'));
  rebote.disparar();

  assert.deepEqual(llamadas, ['c']);
});

void test('cancelar sin haber aplazado nada no falla y deja pendiente en undefined', () => {
  const rebote = crearReboteDePrueba();
  rebote.cancelar();
  assert.equal(rebote.pendiente, undefined);
});

void test('cancelar tras aplazar impide que la tarea se dispare', () => {
  const rebote = crearReboteDePrueba();
  const llamadas: string[] = [];

  rebote.aplazar(250, () => llamadas.push('a'));
  rebote.cancelar();
  rebote.disparar();

  assert.deepEqual(llamadas, []);
});

void test('disparar sin nada pendiente no falla', () => {
  const rebote = crearReboteDePrueba();
  assert.doesNotThrow(() => {
    rebote.disparar();
  });
});

void test('crearRebote() da una fábrica: dos instancias no comparten temporizador', async () => {
  const a = crearRebote();
  const b = crearRebote();
  const llamadas: string[] = [];

  a.aplazar(5, () => llamadas.push('a'));
  b.aplazar(5, () => llamadas.push('b'));

  await new Promise((resolver) => setTimeout(resolver, 30));
  assert.deepEqual(llamadas.sort(), ['a', 'b']);
});

void test('crearRebote() real: una segunda llamada cancela el temporizador de la primera', async () => {
  const rebote = crearRebote();
  const llamadas: string[] = [];

  rebote.aplazar(5, () => llamadas.push('a'));
  rebote.aplazar(5, () => llamadas.push('b'));

  await new Promise((resolver) => setTimeout(resolver, 30));
  assert.deepEqual(llamadas, ['b']);
});

void test('crearRebote() real: cancelar() antes de que venza el plazo evita la tarea', async () => {
  const rebote = crearRebote();
  const llamadas: string[] = [];

  rebote.aplazar(5, () => llamadas.push('a'));
  rebote.cancelar();

  await new Promise((resolver) => setTimeout(resolver, 30));
  assert.deepEqual(llamadas, []);
});
