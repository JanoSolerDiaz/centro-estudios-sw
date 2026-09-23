import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximaFechaDiaSemana, puedeAvisarAusenciaSesion } from './avisoAusenciaProfesor.ts';

// 2026-08-26 es miércoles (dia_semana ISO 3) — mismo día de referencia que slots.test.ts.

void test('proximaFechaDiaSemana devuelve hoy si el día de la semana coincide', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z');
  assert.equal(proximaFechaDiaSemana(3, instante, 'UTC'), '2026-08-26');
});

void test('proximaFechaDiaSemana devuelve un día futuro de la misma semana', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z');
  assert.equal(proximaFechaDiaSemana(5, instante, 'UTC'), '2026-08-28'); // viernes
});

void test('proximaFechaDiaSemana envuelve a la semana siguiente si el día ya pasó esta semana', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z');
  assert.equal(proximaFechaDiaSemana(1, instante, 'UTC'), '2026-08-31'); // lunes de la semana siguiente
});

void test('proximaFechaDiaSemana resuelve domingo (7) correctamente', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z');
  assert.equal(proximaFechaDiaSemana(7, instante, 'UTC'), '2026-08-30');
});

void test('proximaFechaDiaSemana usa Europe/Madrid por defecto', () => {
  // En agosto Madrid está en CEST (UTC+2): 17:30 UTC es 19:30 local, mismo día de calendario.
  const instante = new Date('2026-08-26T17:30:00.000Z');
  assert.equal(proximaFechaDiaSemana(3, instante), '2026-08-26');
});

void test('puedeAvisarAusenciaSesion siempre permite una fecha distinta de hoy', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z');
  assert.equal(puedeAvisarAusenciaSesion('2026-08-28', '00:00', instante, 'UTC'), true);
});

void test('puedeAvisarAusenciaSesion permite hoy si la hora de inicio todavía no ha llegado', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z'); // 10:00 UTC
  assert.equal(puedeAvisarAusenciaSesion('2026-08-26', '11:00', instante, 'UTC'), true);
});

void test('puedeAvisarAusenciaSesion rechaza hoy si la sesión ya empezó', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z'); // 10:00 UTC
  assert.equal(puedeAvisarAusenciaSesion('2026-08-26', '09:00', instante, 'UTC'), false);
});

void test('puedeAvisarAusenciaSesion rechaza hoy si la sesión empieza justo ahora', () => {
  const instante = new Date('2026-08-26T10:00:00.000Z');
  assert.equal(puedeAvisarAusenciaSesion('2026-08-26', '10:00', instante, 'UTC'), false);
});

void test('puedeAvisarAusenciaSesion usa Europe/Madrid por defecto', () => {
  const instante = new Date('2026-08-26T17:30:00.000Z'); // 19:30 local (CEST)
  assert.equal(puedeAvisarAusenciaSesion('2026-08-26', '20:00', instante), true);
  assert.equal(puedeAvisarAusenciaSesion('2026-08-26', '19:00', instante), false);
});
