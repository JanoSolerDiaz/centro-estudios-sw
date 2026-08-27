import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLimitadorTasa, ErrorLimiteAlcanzado } from './limitadorTasa.ts';
import type { Reloj } from './reloj.ts';

/** Reloj de pruebas cuyo instante se puede avanzar a mano, para simular el paso del tiempo sin
 * esperas reales. `crearRelojFijo` (T-03) no sirve aquí porque su instante nunca cambia. */
function crearRelojAjustable(instanteInicial: Date): Reloj & { avanzar(ms: number): void } {
  let instante = instanteInicial;
  return {
    ahora: () => instante,
    avanzar(ms) {
      instante = new Date(instante.getTime() + ms);
    },
  };
}

void test('permite hasta el máximo de operaciones dentro de la ventana', () => {
  const reloj = crearRelojAjustable(new Date('2026-08-27T10:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 3, ventanaMs: 60_000, reloj });

  assert.doesNotThrow(() => {
    limitador.comprobar('profesor-1');
    limitador.comprobar('profesor-1');
    limitador.comprobar('profesor-1');
  });
});

void test('la operación N+1 dentro de la ventana lanza ErrorLimiteAlcanzado', () => {
  const reloj = crearRelojAjustable(new Date('2026-08-27T10:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 3, ventanaMs: 60_000, reloj });

  limitador.comprobar('profesor-1');
  limitador.comprobar('profesor-1');
  limitador.comprobar('profesor-1');

  assert.throws(() => {
    limitador.comprobar('profesor-1');
  }, ErrorLimiteAlcanzado);
});

void test('ErrorLimiteAlcanzado informa cuánto falta para poder reintentar', () => {
  const reloj = crearRelojAjustable(new Date('2026-08-27T10:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj });

  limitador.comprobar('profesor-1');
  reloj.avanzar(20_000);

  try {
    limitador.comprobar('profesor-1');
    assert.fail('debería haber lanzado ErrorLimiteAlcanzado');
  } catch (error) {
    assert.ok(error instanceof ErrorLimiteAlcanzado);
    assert.equal(error.reintentarEnMs, 40_000);
  }
});

void test('cada clave tiene su propio contador, independiente de las demás', () => {
  const reloj = crearRelojAjustable(new Date('2026-08-27T10:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj });

  limitador.comprobar('profesor-1');

  assert.doesNotThrow(() => {
    limitador.comprobar('profesor-2');
  });
  assert.throws(() => {
    limitador.comprobar('profesor-1');
  }, ErrorLimiteAlcanzado);
});

void test('pasada la ventana, el contador se reinicia y vuelve a permitir operaciones', () => {
  const reloj = crearRelojAjustable(new Date('2026-08-27T10:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj });

  limitador.comprobar('profesor-1');
  assert.throws(() => {
    limitador.comprobar('profesor-1');
  }, ErrorLimiteAlcanzado);

  reloj.avanzar(60_000);

  assert.doesNotThrow(() => {
    limitador.comprobar('profesor-1');
  });
});
