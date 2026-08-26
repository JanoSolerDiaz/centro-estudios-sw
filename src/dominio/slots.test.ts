import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { slotActivoEnInstante, slotVigente, slotsQueTocanAhora, type SlotHorario } from './slots.ts';

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumnoId: 'alumno-1',
    profesorId: 'profesor-1',
    diaSemana: 3, // miércoles
    horaInicio: '17:00',
    horaFin: '18:00',
    vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
    vigenteHasta: null,
    ...sobrescribir,
  };
}

void test('slotVigente es falso antes de vigente_desde', () => {
  const slot = crearSlot({ vigenteDesde: new Date('2026-06-01T00:00:00.000Z') });
  assert.equal(slotVigente(slot, new Date('2026-05-31T23:59:59.000Z')), false);
});

void test('slotVigente es verdadero justo en vigente_desde', () => {
  const desde = new Date('2026-06-01T00:00:00.000Z');
  const slot = crearSlot({ vigenteDesde: desde });
  assert.equal(slotVigente(slot, desde), true);
});

void test('slotVigente es verdadero sin vigente_hasta, por lejos que sea el instante', () => {
  const slot = crearSlot({ vigenteDesde: new Date('2020-01-01T00:00:00.000Z'), vigenteHasta: null });
  assert.equal(slotVigente(slot, new Date('2099-01-01T00:00:00.000Z')), true);
});

void test('slotVigente es falso después de vigente_hasta', () => {
  const slot = crearSlot({
    vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
    vigenteHasta: new Date('2026-06-30T23:59:59.000Z'),
  });
  assert.equal(slotVigente(slot, new Date('2026-07-01T00:00:00.000Z')), false);
});

void test('slotActivoEnInstante exige coincidencia de día de la semana (miércoles = 3)', () => {
  const slot = crearSlot({ diaSemana: 3 });
  const miercoles1730 = new Date('2026-08-26T17:30:00.000Z'); // 2026-08-26 es miércoles
  const jueves1730 = new Date('2026-08-27T17:30:00.000Z');

  assert.equal(slotActivoEnInstante(slot, miercoles1730), true);
  assert.equal(slotActivoEnInstante(slot, jueves1730), false);
});

void test('slotActivoEnInstante: horaInicio es inclusiva y horaFin es exclusiva', () => {
  const slot = crearSlot({ diaSemana: 3, horaInicio: '17:00', horaFin: '18:00' });

  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T17:00:00.000Z')), true);
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T17:59:00.000Z')), true);
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T18:00:00.000Z')), false);
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T16:59:00.000Z')), false);
});

void test('slotsQueTocanAhora filtra por el instante del reloj inyectado', () => {
  const slotQueToca = crearSlot({ id: 'toca', diaSemana: 3, horaInicio: '17:00', horaFin: '18:00' });
  const slotQueNoToca = crearSlot({ id: 'no-toca', diaSemana: 4, horaInicio: '17:00', horaFin: '18:00' });
  const reloj = crearRelojFijo(new Date('2026-08-26T17:30:00.000Z')); // miércoles 17:30 UTC

  const resultado = slotsQueTocanAhora([slotQueToca, slotQueNoToca], reloj);

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.id, 'toca');
});

void test('slotsQueTocanAhora devuelve una lista vacía cuando ningún slot coincide', () => {
  const slot = crearSlot({ diaSemana: 1 });
  const reloj = crearRelojFijo(new Date('2026-08-26T17:30:00.000Z')); // miércoles

  assert.deepEqual(slotsQueTocanAhora([slot], reloj), []);
});
