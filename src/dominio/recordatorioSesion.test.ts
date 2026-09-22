import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SlotHorario } from './tipos.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from './slots.ts';
import { sesionesParaRecordatorio, claveRecordatorioSesion, MINUTOS_AVISO_RECORDATORIO_POR_DEFECTO } from './recordatorioSesion.ts';

// Miércoles 2026-08-26. 15:00:00Z == 17:00 CEST (Europe/Madrid, UTC+2 en agosto) — hora de inicio
// del slot de prueba, dia_semana 3.
const INICIO_SLOT_UTC = new Date('2026-08-26T15:00:00.000Z');

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
    profesor_id: 'profesor-1',
    dia_semana: 3, // miércoles
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: 'Matemáticas',
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
  return { ...slot, alumno: crearAlumno({ id: slot.alumno_id, ...alumno }) };
}

function menosMinutos(instante: Date, minutos: number): Date {
  return new Date(instante.getTime() - minutos * 60_000);
}

void test('una sesión que empieza dentro de la ventana de aviso por defecto (5 min) se incluye', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, 5),
    slots: [crearSlot()],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.slot.id, 'slot-1');
  assert.equal(resultado[0].minutosHastaInicio, 5);
  assert.equal(resultado[0].fecha, '2026-08-26');
  assert.equal(resultado[0].clave, claveRecordatorioSesion('slot-1', '2026-08-26'));
});

void test('en el instante exacto de inicio (0 minutos) todavía se incluye', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: INICIO_SLOT_UTC,
    slots: [crearSlot()],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.minutosHastaInicio, 0);
});

void test('un minuto más tarde de la hora de inicio (ya en curso) no se incluye', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: new Date(INICIO_SLOT_UTC.getTime() + 60_000),
    slots: [crearSlot()],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 0);
});

void test('fuera de la ventana de aviso (6 minutos antes, con la ventana por defecto de 5) no se incluye', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, MINUTOS_AVISO_RECORDATORIO_POR_DEFECTO + 1),
    slots: [crearSlot()],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 0);
});

void test('una ventana de aviso personalizada (minutosAviso) se respeta', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, 8),
    slots: [crearSlot()],
    yaAvisadas: new Set(),
    minutosAviso: 10,
  });

  assert.equal(resultado.length, 1);
});

void test('una sesión ya avisada (misma clave) no se repite (requisito 5)', () => {
  const clave = claveRecordatorioSesion('slot-1', '2026-08-26');
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, 3),
    slots: [crearSlot()],
    yaAvisadas: new Set([clave]),
  });

  assert.equal(resultado.length, 0);
});

void test('un alumno de baja no genera recordatorio aunque el slot esté dentro de la ventana', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, 3),
    slots: [crearSlot({}, { activo: false })],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 0);
});

void test('un slot de otro día de la semana no se incluye aunque la hora coincida', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, 3),
    slots: [crearSlot({ dia_semana: 2 })],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 0);
});

void test('un slot sin vigencia hoy (vigente_hasta en el pasado) no se incluye', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante: menosMinutos(INICIO_SLOT_UTC, 3),
    slots: [crearSlot({ vigente_hasta: '2026-08-01' })],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 0);
});

void test('un slot de otro profesor no se incluye', () => {
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-2',
    instante: menosMinutos(INICIO_SLOT_UTC, 3),
    slots: [crearSlot()],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado.length, 0);
});

void test('inicioUtc se calcula como instante + minutosHastaInicio, coincidiendo con la hora real de inicio', () => {
  const instante = menosMinutos(INICIO_SLOT_UTC, 4);
  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante,
    slots: [crearSlot()],
    yaAvisadas: new Set(),
  });

  assert.equal(resultado[0]?.inicioUtc.getTime(), INICIO_SLOT_UTC.getTime());
});

void test('varias sesiones simultáneamente dentro de la ventana se devuelven ordenadas por hora de inicio', () => {
  const slotTemprano = crearSlot({ id: 'slot-temprano', alumno_id: 'alumno-2', hora_inicio: '16:58', hora_fin: '17:58' }, { id: 'alumno-2' });
  const slotTarde = crearSlot({ id: 'slot-tarde', hora_inicio: '17:02', hora_fin: '18:02' });
  const instante = menosMinutos(INICIO_SLOT_UTC, 3); // 16:57 local

  const resultado = sesionesParaRecordatorio({
    profesorId: 'profesor-1',
    instante,
    slots: [slotTarde, slotTemprano],
    yaAvisadas: new Set(),
  });

  assert.deepEqual(
    resultado.map((sesion) => sesion.slot.id),
    ['slot-temprano', 'slot-tarde'],
  );
});

void test('claveRecordatorioSesion combina slotId y fecha con un separador estable', () => {
  assert.equal(claveRecordatorioSesion('abc', '2026-08-26'), 'abc|2026-08-26');
});
