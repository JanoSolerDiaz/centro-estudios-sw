import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarNombreAsignatura,
  nombresDeAsignaturaEquivalentes,
  buscarAsignaturaDuplicada,
  asignaturasQueCoinciden,
} from './asignaturas.ts';
import type { Asignatura } from './tipos.ts';

function asignatura(id: string, nombre: string, activo = true): Asignatura {
  return { id, nombre, activo, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' };
}

void test('normalizarNombreAsignatura quita acentos, colapsa espacios y pasa a minúsculas', () => {
  assert.equal(normalizarNombreAsignatura('Matemáticas 4ESO'), 'matematicas 4eso');
  assert.equal(normalizarNombreAsignatura('  MATEMÁTICAS   4ESO  '), 'matematicas 4eso');
});

void test('nombresDeAsignaturaEquivalentes: "Matemáticas 4ESO" y "matematicas 4eso" son el mismo nombre', () => {
  assert.equal(nombresDeAsignaturaEquivalentes('Matemáticas 4ESO', 'matematicas 4eso'), true);
});

void test('nombresDeAsignaturaEquivalentes: nombres realmente distintos no son equivalentes', () => {
  assert.equal(nombresDeAsignaturaEquivalentes('Matemáticas 4ESO', 'Matemáticas 3ESO'), false);
});

void test('buscarAsignaturaDuplicada encuentra la existente equivalente aunque no sea idéntica', () => {
  const existentes = [asignatura('a1', 'Lengua 1ESO'), asignatura('a2', 'Matemáticas 4ESO')];
  const encontrada = buscarAsignaturaDuplicada('  matematicas   4ESO ', existentes);
  assert.equal(encontrada?.id, 'a2');
});

void test('buscarAsignaturaDuplicada devuelve undefined si no hay ninguna equivalente', () => {
  const existentes = [asignatura('a1', 'Lengua 1ESO')];
  assert.equal(buscarAsignaturaDuplicada('Grupo nuevo', existentes), undefined);
});

void test('buscarAsignaturaDuplicada con catálogo vacío devuelve undefined', () => {
  assert.equal(buscarAsignaturaDuplicada('Cualquiera', []), undefined);
});

void test('asignaturasQueCoinciden con texto vacío devuelve el catálogo completo', () => {
  const catalogo = [asignatura('a1', 'Lengua 1ESO'), asignatura('a2', 'Matemáticas 4ESO')];
  assert.deepEqual(asignaturasQueCoinciden('', catalogo), catalogo);
  assert.deepEqual(asignaturasQueCoinciden('   ', catalogo), catalogo);
});

void test('asignaturasQueCoinciden filtra por subcadena acento-insensible', () => {
  const catalogo = [asignatura('a1', 'Lengua 1ESO'), asignatura('a2', 'Matemáticas 4ESO')];
  const resultado = asignaturasQueCoinciden('matematicas', catalogo);
  assert.deepEqual(
    resultado.map((a) => a.id),
    ['a2'],
  );
});

void test('asignaturasQueCoinciden sin ninguna coincidencia devuelve lista vacía', () => {
  const catalogo = [asignatura('a1', 'Lengua 1ESO')];
  assert.deepEqual(asignaturasQueCoinciden('Física', catalogo), []);
});
