import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarNombreCentro, nombresDeCentroEquivalentes, buscarCentroDuplicado } from './centrosEstudios.ts';
import type { CentroEstudios } from './tipos.ts';

function centro(id: string, nombre: string): CentroEstudios {
  return { id, nombre, activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' };
}

void test('normalizarNombreCentro quita acentos, colapsa espacios y pasa a minúsculas', () => {
  assert.equal(normalizarNombreCentro('San José'), 'san jose');
  assert.equal(normalizarNombreCentro('  SAN   JOSÉ  '), 'san jose');
  assert.equal(normalizarNombreCentro('Institut Ñandú'), 'institut nandu');
});

void test('nombresDeCentroEquivalentes: "San José" y "san jose" son el mismo nombre', () => {
  assert.equal(nombresDeCentroEquivalentes('San José', 'san jose'), true);
});

void test('nombresDeCentroEquivalentes: nombres realmente distintos no son equivalentes', () => {
  assert.equal(nombresDeCentroEquivalentes('San José', 'San Juan'), false);
});

void test('buscarCentroDuplicado encuentra el existente equivalente aunque no sea idéntico', () => {
  const existentes = [centro('c1', 'IES Cervantes'), centro('c2', 'San José')];
  const encontrado = buscarCentroDuplicado('  san   JOSÉ ', existentes);
  assert.equal(encontrado?.id, 'c2');
});

void test('buscarCentroDuplicado devuelve undefined si no hay ningún equivalente', () => {
  const existentes = [centro('c1', 'IES Cervantes')];
  assert.equal(buscarCentroDuplicado('Colegio Nuevo', existentes), undefined);
});

void test('buscarCentroDuplicado con lista vacía devuelve undefined', () => {
  assert.equal(buscarCentroDuplicado('Cualquiera', []), undefined);
});
