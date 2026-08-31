import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SlotHorario } from './tipos.ts';
import {
  buscarSlotSolapado,
  slotVigenteEn,
  slotsVigentesEn,
  diaAnteriorUtc,
  fechaSoloDiaUtc,
} from './slotHorario.ts';

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
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

void test('buscarSlotSolapado detecta dos rangos horarios que se cruzan el mismo día', () => {
  const existente = crearSlot({ id: 'a', dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  const candidato = { dia_semana: 3 as const, hora_inicio: '17:30', hora_fin: '18:30' };
  assert.equal(buscarSlotSolapado(candidato, [existente])?.id, 'a');
});

void test('buscarSlotSolapado no marca solape entre días distintos, aunque coincida la hora', () => {
  const existente = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  const candidato = { dia_semana: 4 as const, hora_inicio: '17:00', hora_fin: '18:00' };
  assert.equal(buscarSlotSolapado(candidato, [existente]), undefined);
});

void test('buscarSlotSolapado no marca solape cuando un rango termina justo donde empieza el otro', () => {
  const existente = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  const candidato = { dia_semana: 3 as const, hora_inicio: '18:00', hora_fin: '19:00' };
  assert.equal(buscarSlotSolapado(candidato, [existente]), undefined);
});

void test('buscarSlotSolapado marca solape cuando un rango contiene por completo al otro', () => {
  const existente = crearSlot({ id: 'contenedor', dia_semana: 3, hora_inicio: '16:00', hora_fin: '20:00' });
  const candidato = { dia_semana: 3 as const, hora_inicio: '17:00', hora_fin: '18:00' };
  assert.equal(buscarSlotSolapado(candidato, [existente])?.id, 'contenedor');
});

void test('buscarSlotSolapado ignora el slot excluido (la propia versión que se está editando)', () => {
  const existente = crearSlot({ id: 'propio', dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  const candidato = { dia_semana: 3 as const, hora_inicio: '17:00', hora_fin: '18:00' };
  assert.equal(buscarSlotSolapado(candidato, [existente], 'propio'), undefined);
});

void test('buscarSlotSolapado devuelve undefined sin ningún slot existente', () => {
  const candidato = { dia_semana: 3 as const, hora_inicio: '17:00', hora_fin: '18:00' };
  assert.equal(buscarSlotSolapado(candidato, []), undefined);
});

void test('slotVigenteEn es falso antes de vigente_desde', () => {
  const slot = crearSlot({ vigente_desde: '2026-06-01' });
  assert.equal(slotVigenteEn(slot, new Date('2026-05-31T23:59:59.000Z')), false);
});

void test('slotVigenteEn es verdadero justo en vigente_desde', () => {
  const slot = crearSlot({ vigente_desde: '2026-06-01' });
  assert.equal(slotVigenteEn(slot, new Date('2026-06-01T00:00:00.000Z')), true);
});

void test('slotVigenteEn es verdadero sin vigente_hasta, por lejos que sea la fecha', () => {
  const slot = crearSlot({ vigente_desde: '2020-01-01', vigente_hasta: null });
  assert.equal(slotVigenteEn(slot, new Date('2099-01-01T00:00:00.000Z')), true);
});

void test('slotVigenteEn es verdadero justo en vigente_hasta (límite inclusivo) y falso justo después', () => {
  const slot = crearSlot({ vigente_desde: '2026-01-01', vigente_hasta: '2026-06-30' });
  assert.equal(slotVigenteEn(slot, new Date('2026-06-30T00:00:00.000Z')), true);
  assert.equal(slotVigenteEn(slot, new Date('2026-07-01T00:00:00.000Z')), false);
});

void test('slotsVigentesEn resuelve el histórico contra el snapshot correcto: la versión antigua en el pasado, la nueva en el presente', () => {
  // Escenario del criterio de aceptación de T-15: se crea un slot, se cambia el horario del
  // alumno (edición como versionado, requisito 2) y el histórico debe seguir devolviendo los
  // datos ORIGINALES del slot para una fecha pasada, nunca los nuevos.
  const versionOriginal = crearSlot({
    id: 'v1',
    hora_inicio: '17:00',
    hora_fin: '18:00',
    vigente_desde: '2026-01-01',
    vigente_hasta: '2026-05-31',
  });
  const versionEditada = crearSlot({
    id: 'v2',
    hora_inicio: '19:00',
    hora_fin: '20:00',
    vigente_desde: '2026-06-01',
    vigente_hasta: null,
  });
  const historial = [versionOriginal, versionEditada];

  const enElPasado = slotsVigentesEn(historial, new Date('2026-03-15T00:00:00.000Z'));
  assert.deepEqual(
    enElPasado.map((s) => s.id),
    ['v1'],
  );
  assert.equal(enElPasado[0]?.hora_inicio, '17:00');

  const hoy = slotsVigentesEn(historial, new Date('2026-08-31T00:00:00.000Z'));
  assert.deepEqual(
    hoy.map((s) => s.id),
    ['v2'],
  );
  assert.equal(hoy[0]?.hora_inicio, '19:00');
});

void test('slotsVigentesEn devuelve varios slots si hay más de uno vigente a la vez', () => {
  const lunes = crearSlot({ id: 'lunes', dia_semana: 1, vigente_desde: '2026-01-01' });
  const martes = crearSlot({ id: 'martes', dia_semana: 2, vigente_desde: '2026-01-01' });
  const resultado = slotsVigentesEn([lunes, martes], new Date('2026-03-01T00:00:00.000Z'));
  assert.deepEqual(
    resultado.map((s) => s.id).sort(),
    ['lunes', 'martes'],
  );
});

void test('diaAnteriorUtc devuelve el día natural anterior, cruzando límites de mes y de año', () => {
  assert.equal(fechaSoloDiaUtc(diaAnteriorUtc(new Date('2026-06-01T00:00:00.000Z'))), '2026-05-31');
  assert.equal(fechaSoloDiaUtc(diaAnteriorUtc(new Date('2026-01-01T00:00:00.000Z'))), '2025-12-31');
});

void test('fechaSoloDiaUtc formatea en AAAA-MM-DD, sin hora', () => {
  assert.equal(fechaSoloDiaUtc(new Date('2026-08-31T23:45:00.000Z')), '2026-08-31');
});
