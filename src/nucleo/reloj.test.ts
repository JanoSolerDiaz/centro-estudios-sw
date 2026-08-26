import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRelojFijo, relojDelSistema } from './reloj.ts';

void test('relojDelSistema.ahora() devuelve un instante cercano al reloj real del proceso', () => {
  const antes = Date.now();
  const instante = relojDelSistema.ahora().getTime();
  const despues = Date.now();

  assert.ok(instante >= antes && instante <= despues);
});

void test('crearRelojFijo siempre devuelve el mismo instante inyectado, sin importar cuántas veces se consulte', () => {
  const instanteFijo = new Date('2026-01-15T10:00:00.000Z');
  const reloj = crearRelojFijo(instanteFijo);

  assert.equal(reloj.ahora().getTime(), instanteFijo.getTime());
  assert.equal(reloj.ahora().getTime(), instanteFijo.getTime());
});
