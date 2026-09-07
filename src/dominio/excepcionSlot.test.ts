import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExcepcionSlot, SlotHorario } from './tipos.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from './slots.ts';
import {
  esDiaCanceladoParaSlot,
  etiquetaExcepcion,
  excepcionDelDia,
  fechaCoincideConDiaSemana,
  motivoCancelacionValido,
  puedeDeclararExcepcion,
  slotsEfectivosDelDia,
  type ExcepcionConSlot,
} from './excepcionSlot.ts';

function crearAlumno(sobrescribir: Partial<AlumnoParaPropuesta> = {}): AlumnoParaPropuesta {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
    avatar_ruta: null,
    activo: true,
    ...sobrescribir,
  };
}

function crearSlot(sobrescribir: Partial<SlotHorario> = {}, alumno: Partial<AlumnoParaPropuesta> = {}): SlotConAlumno {
  const slot: SlotHorario = {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'teacher-1',
    dia_semana: 1,
    hora_inicio: '09:00',
    hora_fin: '10:00',
    asignatura_o_grupo: null,
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
  return { ...slot, alumno: crearAlumno({ id: slot.alumno_id, ...alumno }) };
}

function crearExcepcionConSlot(sobrescribir: Partial<ExcepcionConSlot> = {}): ExcepcionConSlot {
  const slot = sobrescribir.slot ?? crearSlot();
  return {
    id: 'exc-1',
    slot_id: slot.id,
    fecha: '2026-12-21',
    tipo: 'sustitucion',
    profesor_sustituto_id: 'teacher-2',
    motivo: null,
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
    slot,
  };
}

function crearExcepcion(sobrescribir: Partial<ExcepcionSlot> = {}): ExcepcionSlot {
  return {
    id: 'exc-1',
    slot_id: 'slot-1',
    fecha: '2026-12-21',
    tipo: 'sustitucion',
    profesor_sustituto_id: 'teacher-2',
    motivo: null,
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

// 2026-12-21 es lunes (1); 2026-12-22 es martes (2).
void test('fechaCoincideConDiaSemana true cuando la fecha es de verdad ese día de la semana', () => {
  assert.equal(fechaCoincideConDiaSemana('2026-12-21', 1), true);
  assert.equal(fechaCoincideConDiaSemana('2026-12-22', 2), true);
});

void test('fechaCoincideConDiaSemana false cuando no coincide', () => {
  assert.equal(fechaCoincideConDiaSemana('2026-12-21', 2), false);
  assert.equal(fechaCoincideConDiaSemana('2026-12-22', 1), false);
});

void test('motivoCancelacionValido exige texto no vacío tras recortar espacios', () => {
  assert.equal(motivoCancelacionValido('Profesor de baja'), true);
  assert.equal(motivoCancelacionValido('   '), false);
  assert.equal(motivoCancelacionValido(''), false);
  assert.equal(motivoCancelacionValido(null), false);
  assert.equal(motivoCancelacionValido(undefined), false);
});

void test('puedeDeclararExcepcion false si esa fecha ya tiene algún registro de asistencia', () => {
  assert.equal(puedeDeclararExcepcion('2026-12-21', new Set(['2026-12-21'])), false);
});

void test('puedeDeclararExcepcion true si esa fecha no tiene ningún registro', () => {
  assert.equal(puedeDeclararExcepcion('2026-12-21', new Set(['2026-12-22'])), true);
  assert.equal(puedeDeclararExcepcion('2026-12-21', new Set()), true);
});

void test('excepcionDelDia encuentra la excepción activa de ese slot y esa fecha', () => {
  const excepcion = crearExcepcion({ slot_id: 'slot-1', fecha: '2026-12-21' });
  assert.equal(excepcionDelDia('slot-1', '2026-12-21', [excepcion]), excepcion);
});

void test('excepcionDelDia ignora una excepción inactiva', () => {
  const excepcion = crearExcepcion({ activo: false });
  assert.equal(excepcionDelDia('slot-1', '2026-12-21', [excepcion]), undefined);
});

void test('excepcionDelDia ignora otro slot u otra fecha', () => {
  const excepcion = crearExcepcion({ slot_id: 'slot-1', fecha: '2026-12-21' });
  assert.equal(excepcionDelDia('slot-2', '2026-12-21', [excepcion]), undefined);
  assert.equal(excepcionDelDia('slot-1', '2026-12-22', [excepcion]), undefined);
});

void test('esDiaCanceladoParaSlot true solo para una cancelación, nunca para una sustitución', () => {
  const cancelacion = crearExcepcion({ tipo: 'cancelacion', profesor_sustituto_id: null, motivo: 'Profesor de baja' });
  const sustitucion = crearExcepcion({ tipo: 'sustitucion' });
  assert.equal(esDiaCanceladoParaSlot('slot-1', '2026-12-21', [cancelacion]), true);
  assert.equal(esDiaCanceladoParaSlot('slot-1', '2026-12-21', [sustitucion]), false);
});

void test('esDiaCanceladoParaSlot false sin ninguna excepción ese día', () => {
  assert.equal(esDiaCanceladoParaSlot('slot-1', '2026-12-21', []), false);
});

void test('etiquetaExcepcion de una sustitución incluye el nombre del sustituto', () => {
  const excepcion = crearExcepcion({ tipo: 'sustitucion' });
  assert.equal(etiquetaExcepcion(excepcion, 'Ana Gómez'), 'Cubierto por Ana Gómez');
});

void test('etiquetaExcepcion de una sustitución sin nombre resuelto cae en un texto genérico', () => {
  const excepcion = crearExcepcion({ tipo: 'sustitucion' });
  assert.equal(etiquetaExcepcion(excepcion), 'Cubierto por otro profesor');
});

void test('etiquetaExcepcion de una cancelación incluye el motivo', () => {
  const excepcion = crearExcepcion({ tipo: 'cancelacion', profesor_sustituto_id: null, motivo: 'Imprevisto' });
  assert.equal(etiquetaExcepcion(excepcion), 'Cancelada — Imprevisto');
});

// --- slotsEfectivosDelDia --------------------------------------------------------------------

void test('slotsEfectivosDelDia sin ninguna excepción devuelve los slots propios tal cual', () => {
  const propio = crearSlot({ id: 'slot-a' });
  assert.deepEqual(slotsEfectivosDelDia('teacher-1', [propio], []), [propio]);
});

void test('slotsEfectivosDelDia excluye un slot propio cancelado ese día', () => {
  const propio = crearSlot({ id: 'slot-a' });
  const otro = crearSlot({ id: 'slot-b' });
  const cancelacion = crearExcepcionConSlot({ slot: propio, tipo: 'cancelacion', profesor_sustituto_id: null, motivo: 'Imprevisto' });

  const resultado = slotsEfectivosDelDia('teacher-1', [propio, otro], [cancelacion]);

  assert.deepEqual(resultado, [otro]);
});

void test('slotsEfectivosDelDia excluye un slot propio sustituido ese día (el titular no lo ve)', () => {
  const propio = crearSlot({ id: 'slot-a', profesor_id: 'teacher-1' });
  const sustitucion = crearExcepcionConSlot({ slot: propio, tipo: 'sustitucion', profesor_sustituto_id: 'teacher-2' });

  const resultado = slotsEfectivosDelDia('teacher-1', [propio], [sustitucion]);

  assert.deepEqual(resultado, []);
});

void test('slotsEfectivosDelDia añade, para el sustituto, el slot ajeno con profesor_id sobrescrito', () => {
  const ajeno = crearSlot({ id: 'slot-a', profesor_id: 'teacher-1' });
  const sustitucion = crearExcepcionConSlot({ slot: ajeno, tipo: 'sustitucion', profesor_sustituto_id: 'teacher-2' });

  const resultado = slotsEfectivosDelDia('teacher-2', [], [sustitucion]);

  assert.equal(resultado.length, 1);
  const [slot] = resultado;
  assert.ok(slot);
  assert.equal(slot.id, 'slot-a');
  assert.equal(slot.profesor_id, 'teacher-2');
});

void test('slotsEfectivosDelDia: una cancelación no añade nada para nadie, ni siquiera para quien la declaró', () => {
  const propio = crearSlot({ id: 'slot-a', profesor_id: 'teacher-1' });
  const cancelacion = crearExcepcionConSlot({ slot: propio, tipo: 'cancelacion', profesor_sustituto_id: null, motivo: 'x' });

  assert.deepEqual(slotsEfectivosDelDia('teacher-2', [], [cancelacion]), []);
});

void test('slotsEfectivosDelDia ignora una excepción de un tercero (ni titular ni sustituto de quien llama)', () => {
  const propioDeOtro = crearSlot({ id: 'slot-a', profesor_id: 'teacher-3' });
  const sustitucion = crearExcepcionConSlot({ slot: propioDeOtro, tipo: 'sustitucion', profesor_sustituto_id: 'teacher-4' });
  const propio = crearSlot({ id: 'slot-b', profesor_id: 'teacher-1' });

  assert.deepEqual(slotsEfectivosDelDia('teacher-1', [propio], [sustitucion]), [propio]);
});
