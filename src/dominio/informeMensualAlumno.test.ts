import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ultimoDiaDelMes,
  limitesDelMes,
  sesionesEsperadasDelMes,
  resumenInformeMensual,
  etiquetaMes,
  formatearMinutosComoHoras,
  filasInformeMensual,
  generarCsvInformeMensual,
  type DatosInformeMensual,
} from './informeMensualAlumno.ts';
import type { Asistencia, CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3, // miércoles
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

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asis-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-03-04T17:01:00.000Z',
    ocurrido_en: '2026-03-04T17:00:00.000Z',
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 3,
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

// --- ultimoDiaDelMes / limitesDelMes ---------------------------------------------------------

void test('ultimoDiaDelMes: febrero de un año no bisiesto tiene 28 días', () => {
  assert.equal(ultimoDiaDelMes(2026, 2), 28);
});

void test('ultimoDiaDelMes: febrero de un año bisiesto tiene 29 días', () => {
  assert.equal(ultimoDiaDelMes(2028, 2), 29);
});

void test('ultimoDiaDelMes: diciembre tiene 31 días', () => {
  assert.equal(ultimoDiaDelMes(2026, 12), 31);
});

void test('limitesDelMes: primer y último día, con ceros a la izquierda', () => {
  assert.deepEqual(limitesDelMes(2026, 3), { primerDia: '2026-03-01', ultimoDia: '2026-03-31' });
});

// --- sesionesEsperadasDelMes ------------------------------------------------------------------

void test('sesionesEsperadasDelMes: cuenta cada miércoles de marzo de 2026 (marzo tiene 5)', () => {
  const sesiones = sesionesEsperadasDelMes({
    anio: 2026,
    mes: 3,
    slots: [crearSlot()],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-03-04', '2026-03-11', '2026-03-18', '2026-03-25'],
  );
});

void test('sesionesEsperadasDelMes: un slot que empieza a mitad de mes solo cuenta desde su vigencia', () => {
  const sesiones = sesionesEsperadasDelMes({
    anio: 2026,
    mes: 3,
    slots: [crearSlot({ vigente_desde: '2026-03-12' })],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-03-18', '2026-03-25'],
  );
});

void test('sesionesEsperadasDelMes: horario cambiado a mitad de mes usa el slot vigente en cada tramo (criterio de aceptación)', () => {
  const versionAntigua = crearSlot({ id: 'slot-viejo', hora_inicio: '17:00', hora_fin: '18:00', vigente_desde: '2026-01-01', vigente_hasta: '2026-03-10' });
  const versionNueva = crearSlot({ id: 'slot-nuevo', hora_inicio: '19:00', hora_fin: '20:00', vigente_desde: '2026-03-11', vigente_hasta: null });
  const sesiones = sesionesEsperadasDelMes({
    anio: 2026,
    mes: 3,
    slots: [versionAntigua, versionNueva],
    cierres: [],
    excepciones: [],
  });
  assert.deepEqual(
    sesiones.map((s) => ({ fecha: s.fecha, slotId: s.slot.id })),
    [
      { fecha: '2026-03-04', slotId: 'slot-viejo' },
      { fecha: '2026-03-11', slotId: 'slot-nuevo' },
      { fecha: '2026-03-18', slotId: 'slot-nuevo' },
      { fecha: '2026-03-25', slotId: 'slot-nuevo' },
    ],
  );
});

void test('sesionesEsperadasDelMes: un día cerrado del centro (R-12) no cuenta como esperado', () => {
  const cierre: CierreCentro = {
    id: 'cierre-1',
    fecha_inicio: '2026-03-18',
    fecha_fin: '2026-03-18',
    motivo: 'Festivo local',
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
  };
  const sesiones = sesionesEsperadasDelMes({ anio: 2026, mes: 3, slots: [crearSlot()], cierres: [cierre], excepciones: [] });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-03-04', '2026-03-11', '2026-03-25'],
  );
});

void test('sesionesEsperadasDelMes: un cierre desactivado no excluye nada', () => {
  const cierre: CierreCentro = {
    id: 'cierre-1',
    fecha_inicio: '2026-03-18',
    fecha_fin: '2026-03-18',
    motivo: 'Festivo local',
    activo: false,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
  };
  const sesiones = sesionesEsperadasDelMes({ anio: 2026, mes: 3, slots: [crearSlot()], cierres: [cierre], excepciones: [] });
  assert.equal(sesiones.length, 4);
});

function crearExcepcion(sobrescribir: Partial<ExcepcionSlot> = {}): ExcepcionSlot {
  return {
    id: 'excepcion-1',
    slot_id: 'slot-1',
    fecha: '2026-03-18',
    tipo: 'cancelacion',
    profesor_sustituto_id: null,
    motivo: 'Profesor de baja',
    activo: true,
    aviso_familias_quien: null,
    aviso_familias_en: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

void test('sesionesEsperadasDelMes: una cancelación (R-06) de ESE slot no cuenta como esperada', () => {
  const sesiones = sesionesEsperadasDelMes({
    anio: 2026,
    mes: 3,
    slots: [crearSlot()],
    cierres: [],
    excepciones: [crearExcepcion()],
  });
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-03-04', '2026-03-11', '2026-03-25'],
  );
});

void test('sesionesEsperadasDelMes: una sustitución (R-06) SÍ cuenta como esperada — hubo clase', () => {
  const sesiones = sesionesEsperadasDelMes({
    anio: 2026,
    mes: 3,
    slots: [crearSlot()],
    cierres: [],
    excepciones: [crearExcepcion({ tipo: 'sustitucion', profesor_sustituto_id: 'profesor-2', motivo: null })],
  });
  assert.equal(sesiones.length, 4);
});

void test('sesionesEsperadasDelMes: una cancelación de OTRO slot no afecta a este', () => {
  const sesiones = sesionesEsperadasDelMes({
    anio: 2026,
    mes: 3,
    slots: [crearSlot()],
    cierres: [],
    excepciones: [crearExcepcion({ slot_id: 'otro-slot' })],
  });
  assert.equal(sesiones.length, 4);
});

void test('sesionesEsperadasDelMes: dos slots del mismo alumno en días distintos se listan por fecha', () => {
  const lunes = crearSlot({ id: 'slot-lunes', dia_semana: 1, hora_inicio: '09:00', hora_fin: '10:00' });
  const miercoles = crearSlot({ id: 'slot-miercoles', dia_semana: 3 });
  const sesiones = sesionesEsperadasDelMes({ anio: 2026, mes: 3, slots: [miercoles, lunes], cierres: [], excepciones: [] });
  // marzo de 2026: lunes 2, 9, 16, 23, 30; miércoles 4, 11, 18, 25 — deben venir intercalados por fecha.
  assert.deepEqual(
    sesiones.map((s) => s.fecha),
    ['2026-03-02', '2026-03-04', '2026-03-09', '2026-03-11', '2026-03-16', '2026-03-18', '2026-03-23', '2026-03-25', '2026-03-30'],
  );
});

// --- resumenInformeMensual ---------------------------------------------------------------------

void test('resumenInformeMensual: sin ningún registro, todo a cero salvo las sesiones esperadas', () => {
  const sesiones = sesionesEsperadasDelMes({ anio: 2026, mes: 3, slots: [crearSlot()], cierres: [], excepciones: [] });
  const resumen = resumenInformeMensual(sesiones, []);
  assert.deepEqual(resumen, {
    sesionesEsperadas: 4,
    entradasRegistradas: 0,
    ausenciasJustificadas: 0,
    ausenciasSinJustificar: 0,
    anuladas: 0,
    retroactivos: 0,
    minutosRealesTotales: null,
  });
});

void test('resumenInformeMensual: cuenta entradas válidas, ausencias justificadas/sin justificar y anuladas por separado', () => {
  const resumen = resumenInformeMensual(
    [],
    [
      crearAsistencia({ id: 'a1', estado: 'valida' }),
      crearAsistencia({ id: 'a2', estado: 'ausente', motivo_justificacion: 'enfermedad' }),
      crearAsistencia({ id: 'a3', estado: 'ausente', motivo_justificacion: null }),
      crearAsistencia({ id: 'a4', estado: 'anulada', motivo_anulacion: 'Error al pasar lista' }),
    ],
  );
  assert.equal(resumen.entradasRegistradas, 1);
  assert.equal(resumen.ausenciasJustificadas, 1);
  assert.equal(resumen.ausenciasSinJustificar, 1);
  assert.equal(resumen.anuladas, 1);
});

void test('resumenInformeMensual: una anulada no cuenta como entrada ni como ausencia', () => {
  const resumen = resumenInformeMensual([], [crearAsistencia({ estado: 'anulada', motivo_anulacion: 'Error' })]);
  assert.equal(resumen.entradasRegistradas, 0);
  assert.equal(resumen.ausenciasJustificadas, 0);
  assert.equal(resumen.ausenciasSinJustificar, 0);
  assert.equal(resumen.anuladas, 1);
});

void test('resumenInformeMensual: cuenta los registros retroactivos, cualquiera que sea su estado', () => {
  const resumen = resumenInformeMensual(
    [],
    [crearAsistencia({ id: 'a1', es_retroactivo: true }), crearAsistencia({ id: 'a2', es_retroactivo: false })],
  );
  assert.equal(resumen.retroactivos, 1);
});

void test('resumenInformeMensual: suma las horas reales solo de las entradas válidas con salida marcada', () => {
  const resumen = resumenInformeMensual(
    [],
    [
      crearAsistencia({ id: 'a1', ocurrido_en: '2026-03-04T17:00:00.000Z', ocurrido_en_salida: '2026-03-04T18:00:00.000Z' }),
      crearAsistencia({ id: 'a2', ocurrido_en: '2026-03-11T17:00:00.000Z', ocurrido_en_salida: '2026-03-11T17:30:00.000Z' }),
      // Una ausencia no tiene salida que sumar, aunque el campo viniera relleno por error.
      crearAsistencia({ id: 'a3', estado: 'ausente', motivo_justificacion: null, ocurrido_en_salida: null }),
    ],
  );
  assert.equal(resumen.minutosRealesTotales, 90);
});

void test('resumenInformeMensual: sin ninguna salida marcada, el total es null (no cero)', () => {
  const resumen = resumenInformeMensual([], [crearAsistencia({ ocurrido_en_salida: null })]);
  assert.equal(resumen.minutosRealesTotales, null);
});

// --- etiquetaMes / formatearMinutosComoHoras ---------------------------------------------------

void test('etiquetaMes: traduce 1..12 a los nombres en español', () => {
  assert.equal(etiquetaMes(1), 'Enero');
  assert.equal(etiquetaMes(3), 'Marzo');
  assert.equal(etiquetaMes(12), 'Diciembre');
});

void test('etiquetaMes: rechaza un mes fuera de rango', () => {
  assert.throws(() => etiquetaMes(0));
  assert.throws(() => etiquetaMes(13));
});

void test('formatearMinutosComoHoras: menos de una hora solo muestra minutos', () => {
  assert.equal(formatearMinutosComoHoras(45), '45min');
});

void test('formatearMinutosComoHoras: una hora y pico muestra ambos', () => {
  assert.equal(formatearMinutosComoHoras(95), '1h 35min');
});

void test('formatearMinutosComoHoras: cero minutos', () => {
  assert.equal(formatearMinutosComoHoras(0), '0min');
});

// --- filasInformeMensual / generarCsvInformeMensual --------------------------------------------

function crearDatos(sobrescribir: Partial<DatosInformeMensual> = {}): DatosInformeMensual {
  return {
    alumnoNombre: 'María García Pérez',
    centroNombre: 'Academia Centro',
    anio: 2026,
    mes: 3,
    generadoEnLegible: '04/03/2026 10:00',
    resumen: {
      sesionesEsperadas: 4,
      entradasRegistradas: 3,
      ausenciasJustificadas: 1,
      ausenciasSinJustificar: 0,
      anuladas: 0,
      retroactivos: 0,
      minutosRealesTotales: 180,
    },
    ...sobrescribir,
  };
}

void test('filasInformeMensual: incluye alumno, centro, mes y fecha de generación en cabecera (requisito 2)', () => {
  const filas = filasInformeMensual(crearDatos());
  assert.deepEqual(filas.slice(0, 4), [
    ['Alumno', 'María García Pérez'],
    ['Centro', 'Academia Centro'],
    ['Mes', 'Marzo 2026'],
    ['Fecha de generación', '04/03/2026 10:00'],
  ]);
});

void test('filasInformeMensual: sin centro resoluble (teacher), no aparece la fila de Centro', () => {
  const filas = filasInformeMensual(crearDatos({ centroNombre: null }));
  assert.ok(!filas.some(([campo]) => campo === 'Centro'));
  assert.deepEqual(filas[0], ['Alumno', 'María García Pérez']);
  assert.deepEqual(filas[1], ['Mes', 'Marzo 2026']);
});

void test('filasInformeMensual: sin horas reales, se indica que no hay dato, nunca "0min"', () => {
  const filas = filasInformeMensual(crearDatos({ resumen: { ...crearDatos().resumen, minutosRealesTotales: null } }));
  const filaHoras = filas.find(([campo]) => campo === 'Horas reales totales');
  assert.deepEqual(filaHoras, ['Horas reales totales', 'Sin datos de salida marcada']);
});

void test('generarCsvInformeMensual: cabecera Campo;Valor, BOM UTF-8 y las mismas cifras que filasInformeMensual', () => {
  const datos = crearDatos();
  const csv = generarCsvInformeMensual(datos);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('Campo;Valor'));
  assert.ok(csv.includes('Sesiones esperadas;4'));
  assert.ok(csv.includes('Entradas registradas;3'));
  assert.ok(csv.includes('Horas reales totales;3h 0min'));
});
