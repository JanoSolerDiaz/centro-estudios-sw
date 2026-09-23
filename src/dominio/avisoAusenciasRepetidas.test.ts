import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Asistencia, PausaAlumno } from './tipos.ts';
import { ausenciasRepetidasPorAlumno, UMBRAL_AVISO_AUSENCIAS_REPETIDAS, VENTANA_AVISO_AUSENCIAS_REPETIDAS_DIAS } from './avisoAusenciasRepetidas.ts';

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
    peticion_id: 'pet-1',
    ...sobrescribir,
  };
}

function ausenciasDe(alumnoId: string, cantidad: number): readonly Asistencia[] {
  return Array.from({ length: cantidad }, (_, indice) =>
    crearAsistencia({
      id: `asis-${alumnoId}-${String(indice)}`,
      alumno_id: alumnoId,
      estado: 'ausente',
      motivo_justificacion: null,
      peticion_id: `pet-${alumnoId}-${String(indice)}`,
    }),
  );
}

void test('constantes por defecto de R-28', () => {
  assert.equal(UMBRAL_AVISO_AUSENCIAS_REPETIDAS, 3);
  assert.equal(VENTANA_AVISO_AUSENCIAS_REPETIDAS_DIAS, 30);
});

void test('un alumno con el umbral de ausencias sin justificar o más aparece con su conteo', () => {
  const asistencias = ausenciasDe('alumno-1', 3);
  const mapa = ausenciasRepetidasPorAlumno({ asistencias });
  assert.equal(mapa.get('alumno-1'), 3);
});

void test('un alumno por debajo del umbral no aparece', () => {
  const asistencias = ausenciasDe('alumno-1', 2);
  const mapa = ausenciasRepetidasPorAlumno({ asistencias });
  assert.equal(mapa.has('alumno-1'), false);
  assert.equal(mapa.size, 0);
});

void test('cuenta cada alumno por separado, solo devuelve a quien alcanza el umbral', () => {
  const asistencias = [...ausenciasDe('alumno-1', 4), ...ausenciasDe('alumno-2', 1)];
  const mapa = ausenciasRepetidasPorAlumno({ asistencias });
  assert.deepEqual([...mapa.entries()], [['alumno-1', 4]]);
});

void test('una ausencia ya justificada no cuenta para el umbral', () => {
  const asistencias = [
    ...ausenciasDe('alumno-1', 2),
    crearAsistencia({ id: 'asis-justificada', alumno_id: 'alumno-1', estado: 'ausente', motivo_justificacion: 'otro', peticion_id: 'pet-j' }),
  ];
  const mapa = ausenciasRepetidasPorAlumno({ asistencias });
  assert.equal(mapa.has('alumno-1'), false);
});

void test('un umbral personalizado se respeta', () => {
  const asistencias = ausenciasDe('alumno-1', 2);
  const mapa = ausenciasRepetidasPorAlumno({ asistencias, umbral: 2 });
  assert.equal(mapa.get('alumno-1'), 2);
});

void test('reutiliza el filtro de pausas (R-21): una ausencia dentro de la pausa del alumno no cuenta', () => {
  const asistencias = ausenciasDe('alumno-1', 3).map((fila, indice) => ({
    ...fila,
    ocurrido_en: `2026-09-${String(10 + indice).padStart(2, '0')}T09:00:00.000Z`,
  }));
  const pausa: PausaAlumno = {
    id: 'pausa-1',
    alumno_id: 'alumno-1',
    fecha_inicio: '2026-09-08',
    fecha_fin: '2026-09-20',
    motivo: null,
    estado: 'activa',
    motivo_anulacion: null,
    creado_por: 'admin-1',
    anulado_por: null,
    anulado_en: null,
    creado_en: '2026-09-01T00:00:00.000Z',
    actualizado_en: '2026-09-01T00:00:00.000Z',
  };
  const mapa = ausenciasRepetidasPorAlumno({ asistencias, pausas: [pausa] });
  assert.equal(mapa.has('alumno-1'), false);
});

void test('sin ninguna asistencia, el mapa está vacío', () => {
  const mapa = ausenciasRepetidasPorAlumno({ asistencias: [] });
  assert.equal(mapa.size, 0);
});
