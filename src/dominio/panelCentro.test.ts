import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Asistencia, CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';
import {
  sesionesDeHoyPanelCentro,
  rankingAusenciasSinJustificarPanelCentro,
  rankingAsistenciaProfesoresPanelCentro,
  type AlumnoParaPanelCentro,
  type RegistroParaPanelCentro,
} from './panelCentro.ts';

function crearAlumno(sobrescribir: Partial<AlumnoParaPanelCentro> = {}): AlumnoParaPanelCentro {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
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

function registro(slotId: string | null, ocurridoEn: string): RegistroParaPanelCentro {
  return { slot_id: slotId, ocurrido_en: ocurridoEn };
}

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asis-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-09-07T17:05:00.000Z',
    ocurrido_en: '2026-09-07T17:05:00.000Z',
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 1,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: null,
    estado: 'valida',
    motivo_anulacion: null,
    motivo_justificacion: null,
    nota_justificacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'peticion-1',
    ...sobrescribir,
  };
}

const NOMBRES_PROFESORES = new Map([['profesor-1', 'Marta López']]);

// Lunes 2026-09-07, 20:00 Europe/Madrid (18:00 UTC).
const HOY_LUNES_20H = new Date('2026-09-07T18:00:00.000Z');

void test('sesionesDeHoyPanelCentro: pasada_lista cuando ya hay un registro hoy para el slot', () => {
  const slot = crearSlot();
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [registro('slot-1', '2026-09-07T17:05:00.000Z')],
    cierres: [],
    excepciones: [],
  });
  assert.equal(sesiones.length, 1);
  const [sesion] = sesiones;
  assert.ok(sesion);
  assert.equal(sesion.estado, 'pasada_lista');
  assert.equal(sesion.alumnoNombre, 'Ana García');
  assert.equal(sesion.profesorNombre, 'Marta López');
});

void test('sesionesDeHoyPanelCentro: sin_pasar_lista cuando la hora de fin ya pasó y no hay registro', () => {
  const slot = crearSlot(); // termina a las 18:00, ahora son las 20:00
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.equal(sesiones[0]?.estado, 'sin_pasar_lista');
});

void test('sesionesDeHoyPanelCentro: pendiente cuando todavía no ha llegado la hora de fin', () => {
  const instanteTemprano = new Date('2026-09-07T14:00:00.000Z'); // 16:00 Europe/Madrid, antes de las 17:00
  const slot = crearSlot();
  const sesiones = sesionesDeHoyPanelCentro({
    instante: instanteTemprano,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.equal(sesiones[0]?.estado, 'pendiente');
});

void test('sesionesDeHoyPanelCentro: ignora un slot de un día de la semana distinto de hoy', () => {
  const slot = crearSlot({ dia_semana: 2 }); // martes
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(sesiones, []);
});

void test('sesionesDeHoyPanelCentro: excluye un día cerrado del centro (R-12)', () => {
  const slot = crearSlot();
  const cierre = crearCierre({ fecha_inicio: '2026-09-07', fecha_fin: '2026-09-07' });
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [cierre],
    excepciones: [],
  });
  assert.deepEqual(sesiones, []);
});

void test('sesionesDeHoyPanelCentro: excluye un día cancelado para ese slot (R-06)', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'cancelacion', fecha: '2026-09-07' });
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [excepcion],
  });
  assert.deepEqual(sesiones, []);
});

void test('sesionesDeHoyPanelCentro: NO excluye una sustitución (R-06), sigue apareciendo sin registro', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'sustitucion', fecha: '2026-09-07', motivo: null, profesor_sustituto_id: 'profesor-2' });
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [excepcion],
  });
  assert.equal(sesiones.length, 1);
  assert.equal(sesiones[0]?.estado, 'sin_pasar_lista');
});

void test('sesionesDeHoyPanelCentro: ignora un slot cuyo alumno no está en alcance (otro centro, o inactivo)', () => {
  const slot = crearSlot();
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map(), // alumno-1 fuera del mapa: no entra en el alcance elegido
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(sesiones, []);
});

void test('sesionesDeHoyPanelCentro: respeta la vigencia del slot', () => {
  const slot = crearSlot({ vigente_hasta: '2026-08-31' });
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(sesiones, []);
});

void test('sesionesDeHoyPanelCentro: un profesor sin nombre resuelto muestra una etiqueta de repuesto explícita', () => {
  const slot = crearSlot();
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slot],
    alumnosPorId: new Map([['alumno-1', crearAlumno()]]),
    nombresProfesores: new Map(),
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.equal(sesiones[0]?.profesorNombre, 'Profesor desconocido');
});

void test('sesionesDeHoyPanelCentro: ordena por hora de inicio y, en empate, por nombre de alumno', () => {
  const slotTemprano = crearSlot({ id: 'slot-temprano', alumno_id: 'alumno-2', hora_inicio: '09:00', hora_fin: '10:00' });
  const slotTarde = crearSlot({ id: 'slot-tarde', hora_inicio: '19:00', hora_fin: '20:00' });
  const sesiones = sesionesDeHoyPanelCentro({
    instante: HOY_LUNES_20H,
    slots: [slotTarde, slotTemprano],
    alumnosPorId: new Map([
      ['alumno-1', crearAlumno()],
      ['alumno-2', crearAlumno({ id: 'alumno-2', nombre: 'Zoe', primer_apellido: 'Ruiz' })],
    ]),
    nombresProfesores: NOMBRES_PROFESORES,
    registrosHoy: [],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.slotId),
    ['slot-temprano', 'slot-tarde'],
  );
});

// --- rankingAusenciasSinJustificarPanelCentro ---

void test('rankingAusenciasSinJustificarPanelCentro: cuenta solo las ausencias sin justificar', () => {
  const asistencias = [
    crearAsistencia({ alumno_id: 'alumno-1', estado: 'ausente', motivo_justificacion: null }),
    crearAsistencia({ alumno_id: 'alumno-1', estado: 'ausente', motivo_justificacion: 'enfermedad' }),
    crearAsistencia({ alumno_id: 'alumno-1', estado: 'valida' }),
    crearAsistencia({ alumno_id: 'alumno-2', estado: 'ausente', motivo_justificacion: null }),
  ];
  const ranking = rankingAusenciasSinJustificarPanelCentro(
    asistencias,
    new Map([
      ['alumno-1', crearAlumno()],
      ['alumno-2', crearAlumno({ id: 'alumno-2', nombre: 'Zoe', primer_apellido: 'Ruiz' })],
    ]),
  );
  assert.deepEqual(
    ranking.map((f) => [f.alumnoId, f.ausenciasSinJustificar]),
    [
      ['alumno-1', 1],
      ['alumno-2', 1],
    ],
  );
});

void test('rankingAusenciasSinJustificarPanelCentro: ordena de mayor a menor y, en empate, por nombre', () => {
  const asistencias = [
    crearAsistencia({ alumno_id: 'alumno-2', estado: 'ausente', motivo_justificacion: null }),
    crearAsistencia({ alumno_id: 'alumno-1', estado: 'ausente', motivo_justificacion: null }),
    crearAsistencia({ alumno_id: 'alumno-1', estado: 'ausente', motivo_justificacion: null }),
  ];
  const ranking = rankingAusenciasSinJustificarPanelCentro(
    asistencias,
    new Map([
      ['alumno-1', crearAlumno()],
      ['alumno-2', crearAlumno({ id: 'alumno-2', nombre: 'Zoe', primer_apellido: 'Ruiz' })],
    ]),
  );
  assert.deepEqual(
    ranking.map((f) => f.alumnoId),
    ['alumno-1', 'alumno-2'],
  );
});

void test('rankingAusenciasSinJustificarPanelCentro: un alumno sin ninguna ausencia sin justificar no aparece', () => {
  const asistencias = [crearAsistencia({ alumno_id: 'alumno-1', estado: 'valida' })];
  const ranking = rankingAusenciasSinJustificarPanelCentro(asistencias, new Map([['alumno-1', crearAlumno()]]));
  assert.deepEqual(ranking, []);
});

void test('rankingAusenciasSinJustificarPanelCentro: un alumno sin nombre resuelto muestra una etiqueta de repuesto', () => {
  const asistencias = [crearAsistencia({ alumno_id: 'alumno-ajeno', estado: 'ausente', motivo_justificacion: null })];
  const ranking = rankingAusenciasSinJustificarPanelCentro(asistencias, new Map());
  assert.equal(ranking[0]?.alumnoNombre, 'Alumno desconocido');
});

// --- rankingAsistenciaProfesoresPanelCentro ---

void test('rankingAsistenciaProfesoresPanelCentro: calcula esperadas y registradas en un rango de una semana', () => {
  const slot = crearSlot(); // lunes 17:00-18:00
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07', // lunes
    hasta: '2026-09-13', // domingo
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [registro('slot-1', '2026-09-07T17:05:00.000Z')],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  assert.equal(ranking.length, 1);
  const [fila] = ranking;
  assert.ok(fila);
  assert.equal(fila.sesionesEsperadas, 1);
  assert.equal(fila.sesionesRegistradas, 1);
  assert.equal(fila.proporcion, 1);
});

void test('rankingAsistenciaProfesoresPanelCentro: dos semanas sin ningún registro da proporción 0', () => {
  const slot = crearSlot();
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-01',
    hasta: '2026-09-14',
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  // Dos lunes en el rango (07 y 14 de septiembre de 2026).
  const [fila] = ranking;
  assert.ok(fila);
  assert.equal(fila.sesionesEsperadas, 2);
  assert.equal(fila.sesionesRegistradas, 0);
  assert.equal(fila.proporcion, 0);
});

void test('rankingAsistenciaProfesoresPanelCentro: una sustitución (R-06) cuenta como registrada del titular', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'sustitucion', fecha: '2026-09-07', motivo: null, profesor_sustituto_id: 'profesor-2' });
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    slots: [slot],
    cierres: [],
    excepciones: [excepcion],
    // El sustituto registra con el MISMO slot_id (decisión de R-06).
    asistencias: [registro('slot-1', '2026-09-07T17:05:00.000Z')],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  const [fila] = ranking;
  assert.ok(fila);
  assert.equal(fila.sesionesEsperadas, 1);
  assert.equal(fila.sesionesRegistradas, 1);
});

void test('rankingAsistenciaProfesoresPanelCentro: excluye un día cerrado del centro (R-12) de lo esperado', () => {
  const slot = crearSlot();
  const cierre = crearCierre({ fecha_inicio: '2026-09-07', fecha_fin: '2026-09-07' });
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    slots: [slot],
    cierres: [cierre],
    excepciones: [],
    asistencias: [],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  assert.deepEqual(ranking, []);
});

void test('rankingAsistenciaProfesoresPanelCentro: excluye un día cancelado para ese slot (R-06) de lo esperado', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'cancelacion', fecha: '2026-09-07' });
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    slots: [slot],
    cierres: [],
    excepciones: [excepcion],
    asistencias: [],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  assert.deepEqual(ranking, []);
});

void test('rankingAsistenciaProfesoresPanelCentro: un profesor sin ninguna sesión esperada en el rango no aparece', () => {
  const slot = crearSlot({ vigente_hasta: '2026-01-01' }); // ya no vigente en el rango
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  assert.deepEqual(ranking, []);
});

void test('rankingAsistenciaProfesoresPanelCentro: ordena de menor a mayor proporción (el peor primero)', () => {
  const slotBueno = crearSlot({ id: 'slot-bueno', profesor_id: 'profesor-bueno' });
  const slotMalo = crearSlot({ id: 'slot-malo', profesor_id: 'profesor-malo' });
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    slots: [slotBueno, slotMalo],
    cierres: [],
    excepciones: [],
    asistencias: [registro('slot-bueno', '2026-09-07T17:05:00.000Z')],
    nombresProfesores: new Map([
      ['profesor-bueno', 'Buen Profesor'],
      ['profesor-malo', 'Mal Profesor'],
    ]),
  });
  assert.deepEqual(
    ranking.map((f) => f.profesorId),
    ['profesor-malo', 'profesor-bueno'],
  );
});

void test('rankingAsistenciaProfesoresPanelCentro: ignora un registro cuyo slot_id es null (origen manual, T-20)', () => {
  const slot = crearSlot();
  const ranking = rankingAsistenciaProfesoresPanelCentro({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [registro(null, '2026-09-07T17:05:00.000Z')],
    nombresProfesores: NOMBRES_PROFESORES,
  });
  assert.equal(ranking[0]?.sesionesRegistradas, 0);
});
