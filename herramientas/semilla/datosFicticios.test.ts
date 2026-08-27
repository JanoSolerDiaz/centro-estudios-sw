import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALUMNOS_SEMILLA,
  CENTROS_SEMILLA,
  USUARIOS_SEMILLA,
  generarPersonasReferencia,
} from './datosFicticios.ts';

void test('hay exactamente los tres roles entre los usuarios semilla', () => {
  const roles = new Set(USUARIOS_SEMILLA.map((u) => u.rol));
  assert.deepEqual(roles, new Set(['administrator', 'teacher', 'student']));
});

void test('hay al menos un alumno sin segundo apellido y otro con segundo apellido', () => {
  assert.ok(ALUMNOS_SEMILLA.some((a) => a.segundo_apellido === null));
  assert.ok(ALUMNOS_SEMILLA.some((a) => a.segundo_apellido !== null));
});

void test('hay alumnos con 0, 1 y 3 personas de referencia', () => {
  const cantidades = new Set(ALUMNOS_SEMILLA.map((a) => a.personasReferencia));
  assert.deepEqual(cantidades, new Set([0, 1, 3]));
});

void test('todo centro referenciado por un alumno existe en CENTROS_SEMILLA', () => {
  const nombresCentro = new Set(CENTROS_SEMILLA.map((c) => c.nombre));
  for (const alumno of ALUMNOS_SEMILLA) {
    assert.ok(nombresCentro.has(alumno.centro), `${alumno.nombre}: centro "${alumno.centro}" no está en CENTROS_SEMILLA`);
  }
});

void test('generarPersonasReferencia genera exactamente la cantidad pedida', () => {
  assert.equal(generarPersonasReferencia('Marta', 0).length, 0);
  assert.equal(generarPersonasReferencia('Diego', 1).length, 1);
  assert.equal(generarPersonasReferencia('Sofía', 3).length, 3);
});

void test('generarPersonasReferencia es determinista (sin reloj ni azar)', () => {
  assert.deepEqual(generarPersonasReferencia('Sofía', 3), generarPersonasReferencia('Sofía', 3));
});

void test('generarPersonasReferencia siempre exige teléfono, nunca exige email', () => {
  for (const persona of generarPersonasReferencia('Sofía', 3)) {
    assert.ok(persona.telefono_referencia.length > 0);
    assert.equal(persona.email_referencia, null);
  }
});
