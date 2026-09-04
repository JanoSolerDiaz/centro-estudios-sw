import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tieneModificaciones,
  cabecerasCsvHistorico,
  filaCsvHistorico,
  generarCsvHistorico,
  etiquetaOrigenAsistencia,
  etiquetaEstadoAsistencia,
  CABECERAS_CSV_HISTORICO,
  type FilaHistoricoResueltaConContacto,
} from './historicoAsistencia.ts';
import type { Asistencia } from './tipos.ts';

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asistencia-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-08-26T15:30:05.000Z',
    ocurrido_en: '2026-08-26T15:30:05.000Z',
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 3,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: 'Matemáticas',
    estado: 'valida',
    motivo_anulacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'peticion-1',
    ...sobrescribir,
  };
}

function crearFila(sobrescribir: Partial<FilaHistoricoResueltaConContacto> = {}): FilaHistoricoResueltaConContacto {
  return {
    asistencia: crearAsistencia(),
    alumnoNombre: 'María García Pérez',
    profesorNombre: 'Juan López',
    ...sobrescribir,
  };
}

// --- tieneModificaciones -------------------------------------------------------------------

void test('tieneModificaciones: false cuando actualizado_en es null (recién creado, nunca editado)', () => {
  assert.equal(tieneModificaciones(crearAsistencia({ actualizado_en: null })), false);
});

void test('tieneModificaciones: true en cuanto actualizado_en tiene un valor', () => {
  assert.equal(tieneModificaciones(crearAsistencia({ actualizado_en: '2026-08-27T10:00:00.000Z' })), true);
});

// --- cabecerasCsvHistorico / filaCsvHistorico ----------------------------------------------

void test('cabecerasCsvHistorico: sin contacto, las diez columnas fijas', () => {
  assert.deepEqual(cabecerasCsvHistorico(), CABECERAS_CSV_HISTORICO);
  assert.equal(cabecerasCsvHistorico().length, 10);
});

void test('cabecerasCsvHistorico: con contacto, añade email y teléfono al final', () => {
  const cabeceras = cabecerasCsvHistorico({ incluirContacto: true });
  assert.deepEqual(cabeceras.slice(-2), ['Email del alumno', 'Teléfono del alumno']);
  assert.equal(cabeceras.length, 12);
});

void test('filaCsvHistorico: compone las diez columnas en el orden de la cabecera', () => {
  const fila = crearFila({
    asistencia: crearAsistencia({
      ocurrido_en: '2026-08-26T15:30:00.000Z',
      registrado_en: '2026-08-26T15:31:00.000Z',
      origen: 'slot',
      es_retroactivo: false,
      estado: 'valida',
      motivo_anulacion: null,
      actualizado_en: null,
      nota: 'Llegó tarde',
    }),
  });
  assert.deepEqual(filaCsvHistorico(fila), [
    'María García Pérez',
    'Juan López',
    '26/08/2026 17:30',
    '26/08/2026 17:31',
    'Horario',
    'No',
    'Válida',
    '',
    'No',
    'Llegó tarde',
  ]);
});

void test('filaCsvHistorico: fila anulada trae el motivo y "Anulada"', () => {
  const fila = crearFila({
    asistencia: crearAsistencia({ estado: 'anulada', motivo_anulacion: 'Registrado por error' }),
  });
  const valores = filaCsvHistorico(fila);
  assert.equal(valores[6], 'Anulada');
  assert.equal(valores[7], 'Registrado por error');
});

void test('filaCsvHistorico: fila retroactiva marca "Sí" en la columna Retroactivo', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ es_retroactivo: true }) });
  assert.equal(filaCsvHistorico(fila)[5], 'Sí');
});

void test('filaCsvHistorico: origen manual se etiqueta "Extra"', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ origen: 'manual', slot_id: null }) });
  assert.equal(filaCsvHistorico(fila)[4], 'Extra');
});

void test('filaCsvHistorico: modificado se marca "Sí" cuando actualizado_en no es null', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ actualizado_en: '2026-08-27T09:00:00.000Z' }) });
  assert.equal(filaCsvHistorico(fila)[8], 'Sí');
});

void test('filaCsvHistorico: sin incluirContacto, nunca añade email ni teléfono aunque la fila los traiga', () => {
  const fila = crearFila({ emailAlumno: 'madre@example.com', telefonoAlumno: '600111222' });
  assert.equal(filaCsvHistorico(fila).length, 10);
});

void test('filaCsvHistorico: con incluirContacto, añade email y teléfono al final', () => {
  const fila = crearFila({ emailAlumno: 'madre@example.com', telefonoAlumno: '600111222' });
  const valores = filaCsvHistorico(fila, { incluirContacto: true });
  assert.deepEqual(valores.slice(-2), ['madre@example.com', '600111222']);
});

void test('filaCsvHistorico: con incluirContacto pero sin datos de contacto en la fila, columnas vacías', () => {
  const fila = crearFila();
  const valores = filaCsvHistorico(fila, { incluirContacto: true });
  assert.deepEqual(valores.slice(-2), ['', '']);
});

void test('etiquetaOrigenAsistencia: slot es "Horario", manual es "Extra"', () => {
  assert.equal(etiquetaOrigenAsistencia('slot'), 'Horario');
  assert.equal(etiquetaOrigenAsistencia('manual'), 'Extra');
});

void test('etiquetaEstadoAsistencia: valida es "Válida", anulada es "Anulada", ausente es "Ausente" (R-01)', () => {
  assert.equal(etiquetaEstadoAsistencia('valida'), 'Válida');
  assert.equal(etiquetaEstadoAsistencia('anulada'), 'Anulada');
  assert.equal(etiquetaEstadoAsistencia('ausente'), 'Ausente');
});

// --- No-retroactividad (requisito 2 de T-23): el CSV nunca depende de un SlotHorario vigente -----

void test('filaCsvHistorico: el resultado no cambia si el horario del alumno se edita después, porque la ' +
  'función solo lee el snapshot ya guardado en la propia fila de asistencia, nunca un slot vigente', () => {
  // El registro histórico quedó fijado con el horario de ANTES de la edición (17:00-18:00, Matemáticas).
  const filaAntesDeEditar = crearFila({
    asistencia: crearAsistencia({ slot_hora_inicio: '17:00', slot_hora_fin: '18:00', slot_asignatura_o_grupo: 'Matemáticas' }),
  });
  const csvAntes = filaCsvHistorico(filaAntesDeEditar);

  // El administrator edita el horario del alumno (nueva versión del slot: 18:00-19:00, Física). La
  // fila de `asistencia` ya escrita NO se toca — es exactamente lo que garantiza el esquema (T-15):
  // editar un slot cierra la versión anterior e inserta una nueva, nunca reescribe una asistencia ya
  // registrada. `filaCsvHistorico` ni siquiera recibe el `SlotHorario` nuevo como parámetro: no hay
  // forma de que el cambio se cuele.
  const mismaFilaTrasEditarElHorario = filaAntesDeEditar; // la fila de asistencia sigue siendo la misma
  const csvDespues = filaCsvHistorico(mismaFilaTrasEditarElHorario);

  assert.deepEqual(csvDespues, csvAntes);
});

// --- generarCsvHistorico: caracteres especiales, filas anuladas y retroactivas -------------------

void test('generarCsvHistorico: nombres con comas, comillas y tildes sobreviven intactos, con BOM y CRLF', () => {
  const documento = generarCsvHistorico([
    crearFila({
      alumnoNombre: 'José, "el pequeño" Muñoz Ábalos',
      profesorNombre: 'Ana Núñez',
      asistencia: crearAsistencia({ estado: 'anulada', motivo_anulacion: 'No asistió', es_retroactivo: false }),
    }),
    crearFila({
      alumnoNombre: 'Laura Ruiz',
      profesorNombre: 'Pedro Gómez',
      asistencia: crearAsistencia({
        id: 'asistencia-2',
        es_retroactivo: true,
        ocurrido_en: '2026-08-20T09:00:00.000Z',
        registrado_en: '2026-08-27T09:00:00.000Z',
      }),
    }),
  ]);

  assert.equal(documento.codePointAt(0), 0xfeff);
  const lineas = documento.slice(1).split('\r\n');
  assert.equal(lineas[0], CABECERAS_CSV_HISTORICO.join(';'));
  assert.match(lineas[1] ?? '', /^"José, ""el pequeño"" Muñoz Ábalos";Ana Núñez;/);
  assert.match(lineas[1] ?? '', /;Anulada;No asistió;No;/);
  assert.match(lineas[2] ?? '', /^Laura Ruiz;Pedro Gómez;/);
  assert.match(lineas[2] ?? '', /;Sí;Válida;;No;/); // Sí de "Retroactivo", luego estado válida
});

void test('generarCsvHistorico: lista vacía produce solo BOM y cabecera', () => {
  const documento = generarCsvHistorico([]);
  assert.equal(documento, `\uFEFF${CABECERAS_CSV_HISTORICO.join(';')}\r\n`);
});
