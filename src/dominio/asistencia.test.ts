import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import {
  MARGEN_RETROACTIVIDAD_MS,
  VENTANA_EDICION_TEACHER_DIAS,
  VENTANA_RETROACTIVA_MAXIMA_DIAS,
  esRetroactivo,
  origenCoherente,
  ocurridoEnValido,
  puedeEditarAsistencia,
  puedeRegistrarEnNombreDeOtro,
  type RegistroAsistencia,
  type UsuarioAutenticado,
} from './asistencia.ts';

void test('MARGEN_RETROACTIVIDAD_MS coincide con el CHECK asistencia_retroactivo_coherente de la base de datos (300 s)', () => {
  assert.equal(MARGEN_RETROACTIVIDAD_MS, 300_000);
});

void test('esRetroactivo es falso cuando ocurrido_en y registrado_en coinciden (registro en vivo)', () => {
  const instante = new Date('2026-08-26T09:00:00.000Z');
  assert.equal(esRetroactivo(instante, instante), false);
});

void test('esRetroactivo es falso dentro del margen de tolerancia', () => {
  const ocurridoEn = new Date('2026-08-26T09:00:00.000Z');
  const registradoEn = new Date(ocurridoEn.getTime() + MARGEN_RETROACTIVIDAD_MS);
  assert.equal(esRetroactivo(ocurridoEn, registradoEn), false);
});

void test('esRetroactivo es verdadero justo por encima del margen de tolerancia', () => {
  const ocurridoEn = new Date('2026-08-26T09:00:00.000Z');
  const registradoEn = new Date(ocurridoEn.getTime() + MARGEN_RETROACTIVIDAD_MS + 1);
  assert.equal(esRetroactivo(ocurridoEn, registradoEn), true);
});

void test('esRetroactivo es verdadero para un registro añadido claramente a posteriori', () => {
  const ocurridoEn = new Date('2026-08-26T09:00:00.000Z');
  const registradoEn = new Date('2026-08-26T18:00:00.000Z');
  assert.equal(esRetroactivo(ocurridoEn, registradoEn), true);
});

function crearRegistro(sobrescribir: Partial<RegistroAsistencia> = {}): RegistroAsistencia {
  return {
    profesorId: 'profesor-1',
    registradoEn: new Date('2026-08-20T09:00:00.000Z'),
    ...sobrescribir,
  };
}

void test('administrator puede editar cualquier registro, sea quien sea el profesor y por antiguo que sea', () => {
  const registro = crearRegistro({ profesorId: 'profesor-2', registradoEn: new Date('2020-01-01T00:00:00.000Z') });
  const admin: UsuarioAutenticado = { id: 'admin-1', rol: 'administrator' };
  const reloj = crearRelojFijo(new Date('2026-08-26T09:00:00.000Z'));

  assert.equal(puedeEditarAsistencia(registro, admin, reloj), true);
});

void test('teacher puede editar su propio registro dentro de la ventana de edición', () => {
  const registro = crearRegistro({ profesorId: 'profesor-1', registradoEn: new Date('2026-08-20T09:00:00.000Z') });
  const teacher: UsuarioAutenticado = { id: 'profesor-1', rol: 'teacher' };
  const reloj = crearRelojFijo(new Date('2026-08-24T09:00:00.000Z')); // 4 días después

  assert.equal(puedeEditarAsistencia(registro, teacher, reloj), true);
});

void test('teacher no puede editar un registro fuera de la ventana de edición por defecto (7 días)', () => {
  const registro = crearRegistro({ profesorId: 'profesor-1', registradoEn: new Date('2026-08-01T09:00:00.000Z') });
  const teacher: UsuarioAutenticado = { id: 'profesor-1', rol: 'teacher' };
  const reloj = crearRelojFijo(new Date('2026-08-26T09:00:00.000Z')); // 25 días después

  assert.equal(puedeEditarAsistencia(registro, teacher, reloj), false);
});

void test('teacher no puede editar el registro de otro profesor, aunque esté dentro de la ventana', () => {
  const registro = crearRegistro({ profesorId: 'profesor-2', registradoEn: new Date('2026-08-25T09:00:00.000Z') });
  const teacher: UsuarioAutenticado = { id: 'profesor-1', rol: 'teacher' };
  const reloj = crearRelojFijo(new Date('2026-08-26T09:00:00.000Z'));

  assert.equal(puedeEditarAsistencia(registro, teacher, reloj), false);
});

void test('student nunca puede editar ningún registro, ni siquiera el suyo por identificador', () => {
  const registro = crearRegistro({ profesorId: 'alumno-1' });
  const student: UsuarioAutenticado = { id: 'alumno-1', rol: 'student' };
  const reloj = crearRelojFijo(new Date('2026-08-20T09:00:00.000Z'));

  assert.equal(puedeEditarAsistencia(registro, student, reloj), false);
});

void test('la ventana de edición es configurable y se respeta el límite exacto', () => {
  const registro = crearRegistro({ profesorId: 'profesor-1', registradoEn: new Date('2026-08-20T09:00:00.000Z') });
  const teacher: UsuarioAutenticado = { id: 'profesor-1', rol: 'teacher' };
  const ventanaMs = 2 * 24 * 60 * 60 * 1000;
  const enElLimite = crearRelojFijo(new Date(registro.registradoEn.getTime() + ventanaMs));
  const pasadoElLimite = crearRelojFijo(new Date(registro.registradoEn.getTime() + ventanaMs + 1));

  assert.equal(puedeEditarAsistencia(registro, teacher, enElLimite, 2), true);
  assert.equal(puedeEditarAsistencia(registro, teacher, pasadoElLimite, 2), false);
});

void test('VENTANA_EDICION_TEACHER_DIAS es el valor por defecto documentado en la hoja de ruta (7 días)', () => {
  assert.equal(VENTANA_EDICION_TEACHER_DIAS, 7);
});

void test('origenCoherente: "slot" exige slot_id no nulo', () => {
  assert.equal(origenCoherente('slot', 'slot-1'), true);
  assert.equal(origenCoherente('slot', null), false);
});

void test('origenCoherente: "manual" exige slot_id nulo', () => {
  assert.equal(origenCoherente('manual', null), true);
  assert.equal(origenCoherente('manual', 'slot-1'), false);
});

void test('ocurridoEnValido: rechaza un instante en el futuro', () => {
  const registradoEn = new Date('2026-08-26T09:00:00.000Z');
  const ocurridoEn = new Date('2026-08-26T09:00:00.001Z');
  assert.equal(ocurridoEnValido(ocurridoEn, registradoEn), false);
});

void test('ocurridoEnValido: acepta el mismo instante que registradoEn (registro en vivo)', () => {
  const registradoEn = new Date('2026-08-26T09:00:00.000Z');
  assert.equal(ocurridoEnValido(registradoEn, registradoEn), true);
});

void test('ocurridoEnValido: acepta justo en el límite de la ventana máxima hacia atrás', () => {
  const registradoEn = new Date('2026-08-26T09:00:00.000Z');
  const limiteMs = VENTANA_RETROACTIVA_MAXIMA_DIAS * 24 * 60 * 60 * 1000;
  const ocurridoEn = new Date(registradoEn.getTime() - limiteMs);
  assert.equal(ocurridoEnValido(ocurridoEn, registradoEn), true);
});

void test('ocurridoEnValido: rechaza justo por encima de la ventana máxima hacia atrás', () => {
  const registradoEn = new Date('2026-08-26T09:00:00.000Z');
  const limiteMs = VENTANA_RETROACTIVA_MAXIMA_DIAS * 24 * 60 * 60 * 1000;
  const ocurridoEn = new Date(registradoEn.getTime() - limiteMs - 1);
  assert.equal(ocurridoEnValido(ocurridoEn, registradoEn), false);
});

void test('ocurridoEnValido: la ventana máxima es configurable', () => {
  const registradoEn = new Date('2026-08-26T09:00:00.000Z');
  const ocurridoEn = new Date(registradoEn.getTime() - 3 * 24 * 60 * 60 * 1000);
  assert.equal(ocurridoEnValido(ocurridoEn, registradoEn, 2), false);
  assert.equal(ocurridoEnValido(ocurridoEn, registradoEn, 3), true);
});

void test('VENTANA_RETROACTIVA_MAXIMA_DIAS es el valor conservador por defecto (7 días, pregunta abierta en §6)', () => {
  assert.equal(VENTANA_RETROACTIVA_MAXIMA_DIAS, 7);
});

void test('puedeRegistrarEnNombreDeOtro: solo administrator', () => {
  assert.equal(puedeRegistrarEnNombreDeOtro({ id: 'admin-1', rol: 'administrator' }), true);
  assert.equal(puedeRegistrarEnNombreDeOtro({ id: 'profesor-1', rol: 'teacher' }), false);
  assert.equal(puedeRegistrarEnNombreDeOtro({ id: 'alumno-1', rol: 'student' }), false);
});
