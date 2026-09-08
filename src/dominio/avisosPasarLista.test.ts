import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from './slots.ts';
import { sesionesSinPasarLista, type RegistroParaAvisoPasarLista } from './avisosPasarLista.ts';

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
  return { ...slot, alumno: crearAlumno({ id: slot.alumno_id, ...alumno }) };
}

function crearCierre(sobrescribir: Partial<CierreCentro> = {}): CierreCentro {
  return {
    id: 'cierre-1',
    fecha_inicio: '2026-12-20',
    fecha_fin: '2026-12-31',
    motivo: 'Navidad',
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

function crearExcepcion(sobrescribir: Partial<ExcepcionSlot> = {}): ExcepcionSlot {
  return {
    id: 'exc-1',
    slot_id: 'slot-1',
    fecha: '2026-09-07',
    tipo: 'cancelacion',
    profesor_sustituto_id: null,
    motivo: 'Sin profesor',
    activo: true,
    aviso_familias_quien: null,
    aviso_familias_en: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

// Lunes 2026-09-07, 20:00 Europe/Madrid (18:00 UTC) — el slot de 17:00-18:00 de hoy ya ha
// terminado; el slot de la semana anterior (2026-08-31, también lunes) también cae en la ventana
// de 7 días.
const HOY_LUNES_20H = new Date('2026-09-07T18:00:00.000Z');

function registro(slotId: string, ocurridoEn: string): RegistroParaAvisoPasarLista {
  return { slot_id: slotId, ocurrido_en: ocurridoEn };
}

void test('sesionesSinPasarLista marca un slot de hoy cuya hora de fin ya pasó y no tiene ningún registro', () => {
  const slot = crearSlot();
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31', '2026-09-07'],
  );
});

void test('sesionesSinPasarLista NO marca un slot de hoy cuya hora de fin todavía no ha pasado', () => {
  const instanteTemprano = new Date('2026-09-07T14:00:00.000Z'); // 16:00 Europe/Madrid, antes de las 17:00
  const slot = crearSlot();
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: instanteTemprano,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  // La única ocurrencia dentro de la ventana que ya pasó es la de la semana anterior.
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31'],
  );
});

void test('sesionesSinPasarLista no marca un slot con al menos un registro ese día, sea cual sea su estado', () => {
  const slot = crearSlot();
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [registro('slot-1', '2026-09-07T17:05:00.000Z')],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31'],
  );
});

void test('sesionesSinPasarLista no marca un slot con registro de OTRO slot el mismo día', () => {
  const slot = crearSlot();
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [registro('otro-slot', '2026-09-07T17:05:00.000Z')],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31', '2026-09-07'],
  );
});

void test('sesionesSinPasarLista excluye un día cerrado del centro (R-12)', () => {
  const slot = crearSlot();
  const cierre = crearCierre({ fecha_inicio: '2026-09-07', fecha_fin: '2026-09-07' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [cierre],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31'],
  );
});

void test('sesionesSinPasarLista ignora un cierre INACTIVO', () => {
  const slot = crearSlot();
  const cierre = crearCierre({ fecha_inicio: '2026-09-07', fecha_fin: '2026-09-07', activo: false });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [cierre],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31', '2026-09-07'],
  );
});

void test('sesionesSinPasarLista excluye un día cancelado para ese slot (R-06)', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'cancelacion', fecha: '2026-09-07' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [excepcion],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31'],
  );
});

void test('sesionesSinPasarLista NO excluye una sustitución (R-06): si nadie registró, el hueco sigue apareciendo', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'sustitucion', fecha: '2026-09-07', motivo: null, profesor_sustituto_id: 'profesor-2' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [excepcion],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31', '2026-09-07'],
  );
});

void test('sesionesSinPasarLista no marca la sustitución si el sustituto ya registró (mismo slot_id)', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'sustitucion', fecha: '2026-09-07', motivo: null, profesor_sustituto_id: 'profesor-2' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [registro('slot-1', '2026-09-07T17:10:00.000Z')],
    cierres: [],
    excepciones: [excepcion],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31'],
  );
});

void test('sesionesSinPasarLista no marca un slot de hace 10 días (fuera de la ventana de 7)', () => {
  const slot = crearSlot({ vigente_desde: '2026-01-01' });
  const instante = new Date('2026-09-17T18:00:00.000Z'); // jueves
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  // El slot es de lunes: la única ocurrencia dentro de los últimos 7 días (11 al 17 de septiembre)
  // es el lunes 2026-09-14.
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-09-14'],
  );
});

void test('sesionesSinPasarLista respeta la vigencia del slot: no marca un día anterior a vigente_desde', () => {
  const slot = crearSlot({ vigente_desde: '2026-09-07' }); // el propio lunes de hoy
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  // La ocurrencia de la semana anterior (2026-08-31) queda antes de vigente_desde.
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-09-07'],
  );
});

void test('sesionesSinPasarLista respeta la vigencia del slot: no marca un día posterior a vigente_hasta', () => {
  const slot = crearSlot({ vigente_desde: '2026-01-01', vigente_hasta: '2026-08-31' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31'],
  );
});

void test('sesionesSinPasarLista ignora los slots de OTRO profesor', () => {
  const slot = crearSlot({ profesor_id: 'otro-profesor' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(sesiones, []);
});

void test('sesionesSinPasarLista ordena de la fecha más antigua a la más reciente y, dentro del mismo día, por hora de inicio', () => {
  const slotLunesTarde = crearSlot({ id: 'slot-tarde', hora_inicio: '19:00', hora_fin: '20:00' });
  const slotLunesTemprano = crearSlot({ id: 'slot-temprano', hora_inicio: '17:00', hora_fin: '18:00' });
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slotLunesTarde, slotLunesTemprano],
    registros: [],
    cierres: [],
    excepciones: [],
  });
  const deHoy = sesiones.filter((s) => s.fecha === '2026-09-07');
  assert.deepEqual(
    deHoy.map((s) => s.slot.id),
    ['slot-temprano', 'slot-tarde'],
  );
});

void test('sesionesSinPasarLista ignora un registro cuyo slot_id es null (origen manual, T-20)', () => {
  const slot = crearSlot();
  const sesiones = sesionesSinPasarLista({
    profesorId: 'profesor-1',
    instante: HOY_LUNES_20H,
    slots: [slot],
    registros: [{ slot_id: null, ocurrido_en: '2026-09-07T17:05:00.000Z' }],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-08-31', '2026-09-07'],
  );
});
