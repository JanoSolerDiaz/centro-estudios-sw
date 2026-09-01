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
  claveRegistroPorSlot,
  registrosDeHoyPorAlumnoSlot,
  motivoAnulacionValido,
  puedeCambiarSlotAtribuido,
  type RegistroAsistencia,
  type UsuarioAutenticado,
} from './asistencia.ts';
import type { Asistencia } from './tipos.ts';

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asistencia-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-08-26T09:00:00.000Z',
    ocurrido_en: '2026-08-26T09:00:00.000Z',
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 3,
    slot_hora_inicio: '09:00',
    slot_hora_fin: '10:00',
    slot_asignatura_o_grupo: null,
    estado: 'valida',
    motivo_anulacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'peticion-1',
    ...sobrescribir,
  };
}

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

void test('claveRegistroPorSlot: combina alumno y slot de forma estable', () => {
  assert.equal(claveRegistroPorSlot('alumno-1', 'slot-1'), 'alumno-1:slot-1');
  assert.notEqual(claveRegistroPorSlot('alumno-1', 'slot-2'), claveRegistroPorSlot('alumno-2', 'slot-1'));
});

void test('registrosDeHoyPorAlumnoSlot: indexa una fila válida de origen slot por alumno+slot', () => {
  const fila = crearAsistencia({ alumno_id: 'alumno-1', slot_id: 'slot-1' });
  const mapa = registrosDeHoyPorAlumnoSlot([fila]);
  assert.equal(mapa.get(claveRegistroPorSlot('alumno-1', 'slot-1')), fila);
  assert.equal(mapa.size, 1);
});

void test('registrosDeHoyPorAlumnoSlot: ignora un registro anulado', () => {
  const fila = crearAsistencia({ estado: 'anulada', motivo_anulacion: 'Registrado por error' });
  const mapa = registrosDeHoyPorAlumnoSlot([fila]);
  assert.equal(mapa.size, 0);
});

void test('registrosDeHoyPorAlumnoSlot: ignora un registro manual (sin slot_id)', () => {
  const fila = crearAsistencia({ origen: 'manual', slot_id: null, slot_dia_semana: null, slot_hora_inicio: null, slot_hora_fin: null });
  const mapa = registrosDeHoyPorAlumnoSlot([fila]);
  assert.equal(mapa.size, 0);
});

void test('registrosDeHoyPorAlumnoSlot: distingue al mismo alumno en dos slots distintos', () => {
  const filaA = crearAsistencia({ id: 'a', alumno_id: 'alumno-1', slot_id: 'slot-1' });
  const filaB = crearAsistencia({ id: 'b', alumno_id: 'alumno-1', slot_id: 'slot-2' });
  const mapa = registrosDeHoyPorAlumnoSlot([filaA, filaB]);
  assert.equal(mapa.size, 2);
  assert.equal(mapa.get(claveRegistroPorSlot('alumno-1', 'slot-1')), filaA);
  assert.equal(mapa.get(claveRegistroPorSlot('alumno-1', 'slot-2')), filaB);
});

void test('motivoAnulacionValido: rechaza null', () => {
  assert.equal(motivoAnulacionValido(null), false);
});

void test('motivoAnulacionValido: rechaza cadena vacía o solo espacios', () => {
  assert.equal(motivoAnulacionValido(''), false);
  assert.equal(motivoAnulacionValido('   '), false);
});

void test('motivoAnulacionValido: acepta un motivo con contenido, incluso con espacios alrededor', () => {
  assert.equal(motivoAnulacionValido('  Registrado por error  '), true);
});

void test('puedeCambiarSlotAtribuido: solo tiene sentido sobre un registro de origen slot', () => {
  assert.equal(puedeCambiarSlotAtribuido({ origen: 'slot' }), true);
  assert.equal(puedeCambiarSlotAtribuido({ origen: 'manual' }), false);
});
