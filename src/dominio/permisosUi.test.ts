import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Rol } from './tipos.ts';
import {
  puedeConsultarHistoricoDeCualquiera,
  puedeEditarAsistenciaDeCualquiera,
  puedeExportarConDatosDeContacto,
  puedeGestionarCentros,
  puedeGestionarFichaAlumno,
  puedeGestionarHorarios,
  puedeGestionarUsuarios,
  puedeUsarPasarLista,
  puedeVerAvatarEnCards,
  puedeVerHistorico,
  puedeVerMiHorario,
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
    assert.equal(puedeGestionarUsuarios(rol), esperado, `puedeGestionarUsuarios(${rol})`);
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

void test('puedeUsarPasarLista: exclusivamente teacher, ni siquiera administrator', () => {
  assert.equal(puedeUsarPasarLista('teacher'), true);
  assert.equal(puedeUsarPasarLista('administrator'), false);
  assert.equal(puedeUsarPasarLista('student'), false);
});

void test('puedeVerMiHorario: exclusivamente teacher, ni siquiera administrator', () => {
  assert.equal(puedeVerMiHorario('teacher'), true);
  assert.equal(puedeVerMiHorario('administrator'), false);
  assert.equal(puedeVerMiHorario('student'), false);
});

void test('puedeVerHistorico: administrator y teacher sí, student nunca', () => {
  assert.equal(puedeVerHistorico('administrator'), true);
  assert.equal(puedeVerHistorico('teacher'), true);
  assert.equal(puedeVerHistorico('student'), false);
});

void test('puedeConsultarHistoricoDeCualquiera y puedeExportarConDatosDeContacto: exclusivamente administrator', () => {
  for (const rol of ROLES) {
    const esperado = rol === 'administrator';
    assert.equal(puedeConsultarHistoricoDeCualquiera(rol), esperado, `puedeConsultarHistoricoDeCualquiera(${rol})`);
    assert.equal(puedeExportarConDatosDeContacto(rol), esperado, `puedeExportarConDatosDeContacto(${rol})`);
  }
});
