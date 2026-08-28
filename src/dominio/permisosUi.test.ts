import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Rol } from './tipos.ts';
import {
  columnasVisiblesFichaAlumno,
  puedeEditarAsistenciaDeCualquiera,
  puedeGestionarCentros,
  puedeGestionarFichaAlumno,
  puedeGestionarHorarios,
  puedeVerAvatarEnCards,
  puedeVerPersonasReferencia,
} from './permisosUi.ts';

const ROLES: readonly Rol[] = ['administrator', 'teacher', 'student'];

void test('solo administrator gestiona centros, fichas, horarios y personas de referencia', () => {
  for (const rol of ROLES) {
    const esperado = rol === 'administrator';
    assert.equal(puedeGestionarCentros(rol), esperado, `puedeGestionarCentros(${rol})`);
    assert.equal(puedeGestionarFichaAlumno(rol), esperado, `puedeGestionarFichaAlumno(${rol})`);
    assert.equal(puedeGestionarHorarios(rol), esperado, `puedeGestionarHorarios(${rol})`);
    assert.equal(puedeVerPersonasReferencia(rol), esperado, `puedeVerPersonasReferencia(${rol})`);
    assert.equal(puedeEditarAsistenciaDeCualquiera(rol), esperado, `puedeEditarAsistenciaDeCualquiera(${rol})`);
  }
});

void test('teacher NUNCA ve personas de referencia, aunque vea el avatar', () => {
  assert.equal(puedeVerPersonasReferencia('teacher'), false);
  assert.equal(puedeVerAvatarEnCards('teacher'), true);
});

void test('student no tiene ninguno de estos permisos de presentación', () => {
  assert.equal(puedeGestionarCentros('student'), false);
  assert.equal(puedeGestionarFichaAlumno('student'), false);
  assert.equal(puedeVerPersonasReferencia('student'), false);
  assert.equal(puedeGestionarHorarios('student'), false);
  assert.equal(puedeEditarAsistenciaDeCualquiera('student'), false);
  assert.equal(puedeVerAvatarEnCards('student'), false);
});

void test('administrator y teacher ven el avatar en cards; student no', () => {
  assert.equal(puedeVerAvatarEnCards('administrator'), true);
  assert.equal(puedeVerAvatarEnCards('teacher'), true);
  assert.equal(puedeVerAvatarEnCards('student'), false);
});

void test('columnasVisiblesFichaAlumno: teacher y student ven solo identificación, nunca contacto', () => {
  for (const rol of ['teacher', 'student'] as const) {
    const columnas = columnasVisiblesFichaAlumno(rol);
    assert.ok(!columnas.includes('email_alumno'), `${rol} no debería ver email_alumno`);
    assert.ok(!columnas.includes('telefono_alumno'), `${rol} no debería ver telefono_alumno`);
    assert.ok(columnas.includes('nombre'));
    assert.ok(columnas.includes('avatar_ruta'));
  }
});

void test('columnasVisiblesFichaAlumno: administrator ve también las columnas de contacto', () => {
  const columnas = columnasVisiblesFichaAlumno('administrator');
  assert.ok(columnas.includes('email_alumno'));
  assert.ok(columnas.includes('telefono_alumno'));
  assert.ok(columnas.includes('centro_referencia_id'));
});
