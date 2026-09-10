import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularPasosAsistentePrimerosPasos,
  asistentePrimerosPasosCompleto,
  type DatosAsistentePrimerosPasos,
} from './asistentePrimerosPasos.ts';

const NINGUNO: DatosAsistentePrimerosPasos = {
  hayCentroDeReferencia: false,
  hayAlumnoActivo: false,
  haySlotVigente: false,
  hayProfesorActivo: false,
};

const TODOS: DatosAsistentePrimerosPasos = {
  hayCentroDeReferencia: true,
  hayAlumnoActivo: true,
  haySlotVigente: true,
  hayProfesorActivo: true,
};

void test('centro recién creado: los cuatro pasos pendientes, en el orden a, b, c, d de la spec', () => {
  const pasos = calcularPasosAsistentePrimerosPasos(NINGUNO);
  assert.deepEqual(
    pasos.map((paso) => paso.id),
    ['centro', 'alumno', 'horario', 'profesor'],
  );
  assert.ok(pasos.every((paso) => !paso.completado));
});

void test('cada paso refleja exactamente su propio booleano, sin mezclarse con los demás', () => {
  const pasos = calcularPasosAsistentePrimerosPasos({
    hayCentroDeReferencia: true,
    hayAlumnoActivo: false,
    haySlotVigente: true,
    hayProfesorActivo: false,
  });
  const porId = new Map(pasos.map((paso) => [paso.id, paso.completado]));
  assert.equal(porId.get('centro'), true);
  assert.equal(porId.get('alumno'), false);
  assert.equal(porId.get('horario'), true);
  assert.equal(porId.get('profesor'), false);
});

void test('cada paso trae una etiqueta legible no vacía', () => {
  for (const paso of calcularPasosAsistentePrimerosPasos(NINGUNO)) {
    assert.ok(paso.etiqueta.trim().length > 0, `etiqueta vacía para el paso ${paso.id}`);
  }
});

void test('asistentePrimerosPasosCompleto: false mientras falte cualquiera de los cuatro', () => {
  assert.equal(asistentePrimerosPasosCompleto(calcularPasosAsistentePrimerosPasos(NINGUNO)), false);
  assert.equal(
    asistentePrimerosPasosCompleto(calcularPasosAsistentePrimerosPasos({ ...TODOS, hayProfesorActivo: false })),
    false,
  );
});

void test('asistentePrimerosPasosCompleto: true solo con los cuatro pasos hechos', () => {
  assert.equal(asistentePrimerosPasosCompleto(calcularPasosAsistentePrimerosPasos(TODOS)), true);
});
