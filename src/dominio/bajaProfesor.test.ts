import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BajaProfesor, SlotHorario } from './tipos.ts';
import { rangoBajaValido, claveCombinacionBaja, combinacionesBajaProfesor, puedeCancelarBaja, puedeAcortarBaja, categoriaBaja } from './bajaProfesor.ts';

function crearBaja(sobrescribir: Partial<BajaProfesor> = {}): BajaProfesor {
  return {
    id: 'baja-1',
    profesor_id: 'profesor-1',
    fecha_inicio: '2026-09-21',
    fecha_fin: '2026-09-25',
    tipo: 'cancelacion',
    profesor_sustituto_id: null,
    motivo: 'Baja médica',
    estado: 'activa',
    motivo_anulacion: null,
    creado_por: 'admin-1',
    anulado_por: null,
    anulado_en: null,
    creado_en: '2026-09-01T00:00:00.000Z',
    actualizado_en: '2026-09-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 1, // lunes
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: null,
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

void test('rangoBajaValido: fecha_fin igual o posterior a fecha_inicio', () => {
  assert.equal(rangoBajaValido('2026-09-21', '2026-09-25'), true);
  assert.equal(rangoBajaValido('2026-09-21', '2026-09-21'), true);
  assert.equal(rangoBajaValido('2026-09-25', '2026-09-21'), false);
});

void test('claveCombinacionBaja: forma estable slotId|fecha', () => {
  assert.equal(claveCombinacionBaja('slot-1', '2026-09-21'), 'slot-1|2026-09-21');
});

void test('combinacionesBajaProfesor: un slot de lunes en un rango de una semana produce dos combinaciones (dos lunes)', () => {
  const slot = crearSlot(); // dia_semana 1 = lunes
  const combinaciones = combinacionesBajaProfesor({
    fechaInicio: '2026-09-21', // lunes
    fechaFin: '2026-09-28', // lunes siguiente
    slots: [slot],
    clavesConAsistencia: new Set(),
    clavesConExcepcionActiva: new Set(),
  });
  assert.deepEqual(
    combinaciones.map((c) => c.fecha),
    ['2026-09-21', '2026-09-28'],
  );
  assert.equal(combinaciones.every((c) => !c.excluido), true);
});

void test('combinacionesBajaProfesor: ignora un slot cuyo día de la semana no coincide con ninguna fecha del rango', () => {
  const slot = crearSlot({ dia_semana: 3 }); // miércoles
  const combinaciones = combinacionesBajaProfesor({
    fechaInicio: '2026-09-21', // lunes
    fechaFin: '2026-09-22', // martes
    slots: [slot],
    clavesConAsistencia: new Set(),
    clavesConExcepcionActiva: new Set(),
  });
  assert.deepEqual(combinaciones, []);
});

void test('combinacionesBajaProfesor: excluye un día en el que el slot ya no está vigente (vigente_hasta)', () => {
  const slot = crearSlot({ vigente_hasta: '2026-09-21' }); // solo el primer lunes
  const combinaciones = combinacionesBajaProfesor({
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-28',
    slots: [slot],
    clavesConAsistencia: new Set(),
    clavesConExcepcionActiva: new Set(),
  });
  assert.deepEqual(
    combinaciones.map((c) => c.fecha),
    ['2026-09-21'],
  );
});

void test('combinacionesBajaProfesor: marca excluido con motivo si ya hay un registro de asistencia ese día', () => {
  const slot = crearSlot();
  const combinaciones = combinacionesBajaProfesor({
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-21',
    slots: [slot],
    clavesConAsistencia: new Set([claveCombinacionBaja('slot-1', '2026-09-21')]),
    clavesConExcepcionActiva: new Set(),
  });
  assert.equal(combinaciones.length, 1);
  assert.equal(combinaciones[0]?.excluido, true);
  assert.match(combinaciones[0].motivoExclusion ?? '', /registros de asistencia/);
});

void test('combinacionesBajaProfesor: marca excluido con motivo distinto si ya hay una excepción activa ese día', () => {
  const slot = crearSlot();
  const combinaciones = combinacionesBajaProfesor({
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-21',
    slots: [slot],
    clavesConAsistencia: new Set(),
    clavesConExcepcionActiva: new Set([claveCombinacionBaja('slot-1', '2026-09-21')]),
  });
  assert.equal(combinaciones.length, 1);
  assert.equal(combinaciones[0]?.excluido, true);
  assert.match(combinaciones[0].motivoExclusion ?? '', /excepción declarada/);
});

void test('combinacionesBajaProfesor: varios slots del mismo profesor se combinan de forma independiente', () => {
  const lunes = crearSlot({ id: 'slot-lunes', dia_semana: 1 });
  const martes = crearSlot({ id: 'slot-martes', dia_semana: 2 });
  const combinaciones = combinacionesBajaProfesor({
    fechaInicio: '2026-09-21', // lunes
    fechaFin: '2026-09-22', // martes
    slots: [lunes, martes],
    clavesConAsistencia: new Set(),
    clavesConExcepcionActiva: new Set(),
  });
  assert.equal(combinaciones.length, 2);
  assert.deepEqual(
    combinaciones.map((c) => c.slot.id),
    ['slot-lunes', 'slot-martes'],
  );
});

void test('puedeCancelarBaja: solo activa y todavía sin empezar', () => {
  assert.equal(puedeCancelarBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-09-25' }), '2026-09-20'), true);
  assert.equal(puedeCancelarBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-09-20' }), '2026-09-20'), false);
  assert.equal(puedeCancelarBaja(crearBaja({ estado: 'anulada', fecha_inicio: '2026-09-25' }), '2026-09-20'), false);
});

void test('puedeAcortarBaja: solo activa y hoy dentro del rango', () => {
  assert.equal(puedeAcortarBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-25' }), '2026-09-22'), true);
  assert.equal(puedeAcortarBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-25' }), '2026-09-26'), false);
  assert.equal(puedeAcortarBaja(crearBaja({ estado: 'anulada', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-25' }), '2026-09-22'), false);
});

void test('categoriaBaja: anulada, pasada, en_curso y futura', () => {
  assert.equal(categoriaBaja(crearBaja({ estado: 'anulada' }), '2026-01-01'), 'anulada');
  assert.equal(categoriaBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-05' }), '2026-02-01'), 'pasada');
  assert.equal(categoriaBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-03-01', fecha_fin: '2026-03-05' }), '2026-02-01'), 'futura');
  assert.equal(categoriaBaja(crearBaja({ estado: 'activa', fecha_inicio: '2026-01-01', fecha_fin: '2026-03-01' }), '2026-02-01'), 'en_curso');
});
