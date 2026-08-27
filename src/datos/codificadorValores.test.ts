import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codificarValorFiltro, codificarListaFiltro } from './codificadorValores.ts';

void test('codificarValorFiltro deja pasar un valor simple sin caracteres reservados tal cual', () => {
  assert.equal(codificarValorFiltro('activo'), 'activo');
  assert.equal(codificarValorFiltro('a1b2'), 'a1b2');
});

void test('codificarValorFiltro envuelve entre comillas un valor con una coma', () => {
  assert.equal(codificarValorFiltro('Pérez, Juan'), encodeURIComponent('"Pérez, Juan"'));
});

void test('codificarValorFiltro escapa una comilla doble interna', () => {
  assert.equal(codificarValorFiltro('Alias "El Profe"'), encodeURIComponent('"Alias \\"El Profe\\""'));
});

void test('codificarValorFiltro escapa una barra invertida interna', () => {
  assert.equal(codificarValorFiltro('ruta\\ficticia'), encodeURIComponent('"ruta\\\\ficticia"'));
});

void test('codificarValorFiltro envuelve entre comillas un valor con un punto (separador de operador)', () => {
  assert.equal(codificarValorFiltro('3.14'), encodeURIComponent('"3.14"'));
});

void test('codificarValorFiltro envuelve entre comillas un valor con paréntesis', () => {
  assert.equal(codificarValorFiltro('Grupo (Tarde)'), encodeURIComponent('"Grupo (Tarde)"'));
});

void test('codificarValorFiltro percent-codifica un carácter % literal', () => {
  const resultado = codificarValorFiltro('100%');
  assert.equal(resultado, encodeURIComponent('100%'));
  assert.ok(resultado.includes('%25'));
});

void test('codificarValorFiltro envuelve entre comillas una cadena vacía', () => {
  assert.equal(codificarValorFiltro(''), encodeURIComponent('""'));
});

void test('codificarValorFiltro envuelve entre comillas un valor con espacios al principio o al final', () => {
  assert.equal(codificarValorFiltro('  con espacios  '), encodeURIComponent('"  con espacios  "'));
});

void test('codificarValorFiltro no confunde un espacio interno (sin extremos) con caracter reservado', () => {
  assert.equal(codificarValorFiltro('Juan Pérez'), encodeURIComponent('Juan Pérez'));
});

void test('codificarListaFiltro une varios valores simples con comas sin codificar', () => {
  assert.equal(codificarListaFiltro(['a', 'b', 'c']), 'a,b,c');
});

void test('codificarListaFiltro escapa un valor de la lista que contiene una coma, sin romper el separador', () => {
  const resultado = codificarListaFiltro(['normal', 'con,coma']);
  const partes = resultado.split(',');
  // El valor con coma queda entre comillas y su coma interna PERCENT-CODIFICADA (%2C, tres
  // caracteres, ninguno de ellos una coma literal): partir por "," (sin codificar) da exactamente
  // 2 trozos, uno por valor de la lista — la coma interna nunca se confunde con el separador
  // precisamente porque ya no es una coma literal en el resultado.
  assert.equal(partes.length, 2);
  const [primera, segunda] = partes;
  assert.equal(primera, 'normal');
  assert.ok(segunda !== undefined);
  assert.equal(decodeURIComponent(segunda), '"con,coma"');
});

void test('codificarListaFiltro con lista vacía devuelve una cadena vacía', () => {
  assert.equal(codificarListaFiltro([]), '');
});
