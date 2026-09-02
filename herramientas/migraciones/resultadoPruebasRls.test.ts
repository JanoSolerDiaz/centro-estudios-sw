import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisoOmisiones, resumirPruebasRls, type FilaResultadoRls } from './resultadoPruebasRls.ts';

function fila(parcial: Partial<FilaResultadoRls>): FilaResultadoRls {
  return { celda: 'celda', esperado: 'permitido', ok: true, detalle: null, ...parcial };
}

void test('sin filas: no hay fallo', () => {
  const resumen = resumirPruebasRls([]);
  assert.equal(resumen.total, 0);
  assert.equal(resumen.omitidas, 0);
  assert.deepEqual(resumen.fallidas, []);
  assert.equal(resumen.huboFallo, false);
});

void test('todas las filas en verde: sin fallo', () => {
  const resumen = resumirPruebasRls([
    fila({ celda: 'a', ok: true }),
    fila({ celda: 'b', esperado: 'prohibido', ok: true }),
  ]);
  assert.equal(resumen.huboFallo, false);
  assert.equal(resumen.total, 2);
});

void test('una fila ok=false cuenta como fallo y se lista en fallidas', () => {
  const resumen = resumirPruebasRls([
    fila({ celda: 'a', ok: true }),
    fila({ celda: 'b', esperado: 'prohibido', ok: false, detalle: 'se insertó sin error' }),
  ]);
  assert.equal(resumen.huboFallo, true);
  assert.equal(resumen.fallidas.length, 1);
  assert.equal(resumen.fallidas[0]?.celda, 'b');
});

void test('una fila OMITIDO nunca cuenta como fallo, aunque en teoría "ok" fuera false', () => {
  const resumen = resumirPruebasRls([fila({ celda: 'c', esperado: 'OMITIDO', ok: false })]);
  assert.equal(resumen.huboFallo, false);
  assert.equal(resumen.omitidas, 1);
  assert.deepEqual(resumen.fallidas, []);
});

void test('cuenta omitidas y fallidas por separado en el mismo resumen', () => {
  const resumen = resumirPruebasRls([
    fila({ celda: 'a', esperado: 'OMITIDO', ok: true }),
    fila({ celda: 'b', esperado: 'prohibido', ok: false }),
    fila({ celda: 'c', esperado: 'permitido', ok: true }),
  ]);
  assert.equal(resumen.total, 3);
  assert.equal(resumen.omitidas, 1);
  assert.equal(resumen.fallidas.length, 1);
  assert.equal(resumen.huboFallo, true);
});

void test('avisoOmisiones: sin ninguna omisión, no hay nada que avisar', () => {
  const resumen = resumirPruebasRls([fila({ celda: 'a', ok: true }), fila({ celda: 'b', esperado: 'prohibido', ok: true })]);
  assert.equal(avisoOmisiones(resumen), null);
});

void test('avisoOmisiones: con omisiones, nombra cuántas de cuántas se ejecutaron', () => {
  const resumen = resumirPruebasRls([
    fila({ celda: 'a', esperado: 'OMITIDO', ok: true }),
    fila({ celda: 'b', esperado: 'OMITIDO', ok: true }),
    fila({ celda: 'c', esperado: 'permitido', ok: true }),
  ]);
  const aviso = avisoOmisiones(resumen);
  assert.match(aviso ?? '', /2 de 3/);
  assert.match(aviso ?? '', /solo se ejecutaron 1/);
});

void test('avisoOmisiones: se avisa igual aunque además haya fallos (huboFallo no lo silencia)', () => {
  const resumen = resumirPruebasRls([
    fila({ celda: 'a', esperado: 'OMITIDO', ok: true }),
    fila({ celda: 'b', esperado: 'prohibido', ok: false }),
  ]);
  assert.equal(resumen.huboFallo, true);
  assert.match(avisoOmisiones(resumen) ?? '', /1 de 2/);
});
