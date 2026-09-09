import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';
import {
  informeHorasProfesor,
  filasTablaInformeHorasProfesor,
  generarCsvInformeHorasProfesor,
  CABECERA_TABLA_INFORME_HORAS_PROFESOR,
  type ProfesorParaInformeHoras,
  type RegistroParaInformeHorasProfesor,
} from './informeHorasProfesor.ts';

function crearProfesor(sobrescribir: Partial<ProfesorParaInformeHoras> = {}): ProfesorParaInformeHoras {
  return { id: 'profesor-1', nombre: 'Marta López', ...sobrescribir };
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
    fecha_inicio: '2026-09-07',
    fecha_fin: '2026-09-07',
    motivo: 'Festivo',
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

function crearRegistro(sobrescribir: Partial<RegistroParaInformeHorasProfesor> = {}): RegistroParaInformeHorasProfesor {
  return {
    profesor_id: 'profesor-1',
    slot_id: 'slot-1',
    estado: 'valida',
    ocurrido_en: '2026-09-07T17:05:00.000Z',
    ocurrido_en_salida: null,
    ...sobrescribir,
  };
}

// --- informeHorasProfesor ---

void test('informeHorasProfesor: cuenta sesión propia con salida marcada y suma horas reales y teóricas', () => {
  const slot = crearSlot(); // lunes 17:00-18:00 (60 min teóricos)
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [crearRegistro({ ocurrido_en_salida: '2026-09-07T18:00:00.000Z' })],
  });
  assert.equal(filas.length, 1);
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.sesionesPropias, 1);
  assert.equal(fila.minutosRealesPropios, 55);
  assert.equal(fila.minutosTeoricos, 60);
  assert.equal(fila.sesionesSustitucion, 0);
  assert.equal(fila.minutosRealesSustitucion, null);
});

void test('informeHorasProfesor: sin ninguna entrada con salida marcada, minutosRealesPropios es null, nunca 0', () => {
  const slot = crearSlot();
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [crearRegistro()], // ocurrido_en_salida: null
  });
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.sesionesPropias, 1);
  assert.equal(fila.minutosRealesPropios, null);
});

void test('informeHorasProfesor: una sustitución (R-06) se cuenta aparte, nunca mezclada con las propias', () => {
  const slot = crearSlot(); // titular: profesor-1
  const excepcion = crearExcepcion({ tipo: 'sustitucion', profesor_sustituto_id: 'profesor-2' });
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor(), crearProfesor({ id: 'profesor-2', nombre: 'Ana Ruiz' })],
    slots: [slot],
    cierres: [],
    excepciones: [excepcion],
    // El sustituto registra con el MISMO slot_id (decisión de R-06) pero SU propio profesor_id.
    asistencias: [
      crearRegistro({ profesor_id: 'profesor-2', ocurrido_en_salida: '2026-09-07T18:00:00.000Z' }),
    ],
  });
  const titular = filas.find((fila) => fila.profesorId === 'profesor-1');
  const sustituto = filas.find((fila) => fila.profesorId === 'profesor-2');
  assert.ok(titular);
  assert.ok(sustituto);
  // El titular no dio la clase ese día: cero propias, pero SÍ mantiene sus horas teóricas (el slot
  // sigue siendo suyo, requisito 2).
  assert.equal(titular.sesionesPropias, 0);
  assert.equal(titular.minutosTeoricos, 60);
  assert.equal(titular.sesionesSustitucion, 0);
  // El sustituto no tiene ningún slot propio (cero horas teóricas) pero sí una sustitución real.
  assert.equal(sustituto.sesionesPropias, 0);
  assert.equal(sustituto.minutosTeoricos, 0);
  assert.equal(sustituto.sesionesSustitucion, 1);
  assert.equal(sustituto.minutosRealesSustitucion, 55);
});

void test('informeHorasProfesor: una sesión anulada no cuenta como hora impartida', () => {
  const slot = crearSlot();
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [crearRegistro({ estado: 'anulada', ocurrido_en_salida: '2026-09-07T18:00:00.000Z' })],
  });
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.sesionesPropias, 0);
  assert.equal(fila.minutosRealesPropios, null);
});

void test('informeHorasProfesor: una ausencia no cuenta como hora impartida (no hubo clase)', () => {
  const slot = crearSlot();
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [slot],
    cierres: [],
    excepciones: [],
    asistencias: [crearRegistro({ estado: 'ausente' })],
  });
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.sesionesPropias, 0);
});

void test('informeHorasProfesor: un día cerrado del centro (R-12) excluye las horas teóricas de ese slot', () => {
  const slot = crearSlot();
  const cierre = crearCierre();
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [slot],
    cierres: [cierre],
    excepciones: [],
    asistencias: [],
  });
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.minutosTeoricos, 0);
});

void test('informeHorasProfesor: un día cancelado para el slot (R-06) excluye las horas teóricas y una entrada real ese día no infla nada', () => {
  const slot = crearSlot();
  const excepcion = crearExcepcion({ tipo: 'cancelacion' });
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [slot],
    cierres: [],
    excepciones: [excepcion],
    // Defensivo: en la práctica la RPC nunca dejaría registrar un día cancelado, pero si llegara
    // una fila así no debe contar.
    asistencias: [crearRegistro({ ocurrido_en_salida: '2026-09-07T18:00:00.000Z' })],
  });
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.minutosTeoricos, 0);
  assert.equal(fila.sesionesPropias, 0);
});

void test('informeHorasProfesor: una clase extra sin slot (T-20) cuenta como propia de quien la registró', () => {
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor()],
    slots: [],
    cierres: [],
    excepciones: [],
    asistencias: [crearRegistro({ slot_id: null, ocurrido_en_salida: '2026-09-07T18:00:00.000Z' })],
  });
  const [fila] = filas;
  assert.ok(fila);
  assert.equal(fila.sesionesPropias, 1);
  assert.equal(fila.minutosRealesPropios, 55);
  assert.equal(fila.sesionesSustitucion, 0);
});

void test('informeHorasProfesor: un profesor activo sin ninguna sesión en el rango aparece igualmente, en ceros', () => {
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor({ id: 'profesor-inactivo-en-el-rango', nombre: 'Sin Clases' })],
    slots: [],
    cierres: [],
    excepciones: [],
    asistencias: [],
  });
  assert.deepEqual(filas, [
    {
      profesorId: 'profesor-inactivo-en-el-rango',
      profesorNombre: 'Sin Clases',
      sesionesPropias: 0,
      minutosRealesPropios: null,
      minutosTeoricos: 0,
      sesionesSustitucion: 0,
      minutosRealesSustitucion: null,
    },
  ]);
});

void test('informeHorasProfesor: ordena por nombre de profesor, no es un ranking', () => {
  const filas = informeHorasProfesor({
    desde: '2026-09-07',
    hasta: '2026-09-07',
    profesores: [crearProfesor({ id: 'p-z', nombre: 'Zoe Martín' }), crearProfesor({ id: 'p-a', nombre: 'Ana Ruiz' })],
    slots: [],
    cierres: [],
    excepciones: [],
    asistencias: [],
  });
  assert.deepEqual(
    filas.map((fila) => fila.profesorNombre),
    ['Ana Ruiz', 'Zoe Martín'],
  );
});

// --- filasTablaInformeHorasProfesor / generarCsvInformeHorasProfesor ---

void test('filasTablaInformeHorasProfesor: formatea minutos como horas y "Sin datos de salida marcada" cuando es null', () => {
  const filas = filasTablaInformeHorasProfesor([
    {
      profesorId: 'profesor-1',
      profesorNombre: 'Marta López',
      sesionesPropias: 3,
      minutosRealesPropios: 95,
      minutosTeoricos: 180,
      sesionesSustitucion: 1,
      minutosRealesSustitucion: null,
    },
  ]);
  assert.deepEqual(filas, [['Marta López', '3', '1h 35min', '3h 0min', '1', 'Sin datos de salida marcada']]);
});

void test('generarCsvInformeHorasProfesor: antepone rango y fecha de generación como metadatos, sin columna de centro', () => {
  const csv = generarCsvInformeHorasProfesor({
    desde: '2026-09-01',
    hasta: '2026-09-30',
    generadoEnLegible: '09/09/2026 10:00',
    filas: [
      {
        profesorId: 'profesor-1',
        profesorNombre: 'Marta López',
        sesionesPropias: 3,
        minutosRealesPropios: 95,
        minutosTeoricos: 180,
        sesionesSustitucion: 0,
        minutosRealesSustitucion: null,
      },
    ],
  });
  assert.equal(csv.codePointAt(0), 0xfeff);
  assert.equal(
    csv.slice(1),
    [
      'Rango;2026-09-01 – 2026-09-30',
      'Fecha de generación;09/09/2026 10:00',
      '',
      filaCsvEsperada(CABECERA_TABLA_INFORME_HORAS_PROFESOR),
      filaCsvEsperada(['Marta López', '3', '1h 35min', '3h 0min', '0', 'Sin datos de salida marcada']),
      '',
    ].join('\r\n'),
  );
});

function filaCsvEsperada(valores: readonly string[]): string {
  return valores.join(';');
}
