import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularHash } from './hash.ts';

void test('calcularHash es determinista para el mismo contenido', () => {
  assert.equal(calcularHash('select 1;'), calcularHash('select 1;'));
});

void test('calcularHash distingue contenidos distintos', () => {
  assert.notEqual(calcularHash('select 1;'), calcularHash('select 2;'));
});

void test('calcularHash produce un hexadecimal SHA-256 de 64 caracteres', () => {
  const hash = calcularHash('contenido de prueba');
  assert.match(hash, /^[0-9a-f]{64}$/);
});

void test('calcularHash de cadena vacía coincide con el vector conocido de SHA-256', () => {
  assert.equal(
    calcularHash(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
});
