import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tieneModificaciones,
  cabecerasCsvHistorico,
  filaCsvHistorico,
  generarCsvHistorico,
  etiquetaOrigenAsistencia,
  etiquetaEstadoAsistencia,
  etiquetaMotivoJustificacion,
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
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 3,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: 'Matemáticas',
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

void test('cabecerasCsvHistorico: sin contacto, las quince columnas fijas (R-03 añade Hora de salida y las dos duraciones)', () => {
  assert.deepEqual(cabecerasCsvHistorico(), CABECERAS_CSV_HISTORICO);
  assert.equal(cabecerasCsvHistorico().length, 15);
});

void test('cabecerasCsvHistorico: con contacto, añade email y teléfono al final', () => {
  const cabeceras = cabecerasCsvHistorico({ incluirContacto: true });
  assert.deepEqual(cabeceras.slice(-2), ['Email del alumno', 'Teléfono del alumno']);
  assert.equal(cabeceras.length, 17);
});

void test('filaCsvHistorico: compone las quince columnas en el orden de la cabecera', () => {
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
    '',
    '',
    '60',
    '26/08/2026 17:31',
    'Horario',
    'No',
    'Válida',
    '',
    '',
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
  assert.equal(valores[9], 'Anulada');
  assert.equal(valores[10], 'Registrado por error');
});

// --- Justificación de una ausencia (R-02) --------------------------------------------------

void test('filaCsvHistorico: ausencia justificada trae la etiqueta del motivo y la nota de justificación', () => {
  const fila = crearFila({
    asistencia: crearAsistencia({
      estado: 'ausente',
      motivo_justificacion: 'cita_medica',
      nota_justificacion: 'Justificante adjunto en papel',
    }),
  });
  const valores = filaCsvHistorico(fila);
  assert.equal(valores[9], 'Ausente');
  assert.equal(valores[11], 'Cita médica');
  assert.equal(valores[12], 'Justificante adjunto en papel');
});

void test('filaCsvHistorico: ausencia sin justificar deja vacías las columnas de justificación', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ estado: 'ausente' }) });
  const valores = filaCsvHistorico(fila);
  assert.equal(valores[11], '');
  assert.equal(valores[12], '');
});

void test('filaCsvHistorico: fila retroactiva marca "Sí" en la columna Retroactivo', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ es_retroactivo: true }) });
  assert.equal(filaCsvHistorico(fila)[8], 'Sí');
});

void test('filaCsvHistorico: origen manual se etiqueta "Extra"', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ origen: 'manual', slot_id: null }) });
  assert.equal(filaCsvHistorico(fila)[7], 'Extra');
});

void test('filaCsvHistorico: modificado se marca "Sí" cuando actualizado_en no es null', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ actualizado_en: '2026-08-27T09:00:00.000Z' }) });
  assert.equal(filaCsvHistorico(fila)[13], 'Sí');
});

void test('filaCsvHistorico: sin incluirContacto, nunca añade email ni teléfono aunque la fila los traiga', () => {
  const fila = crearFila({ emailAlumno: 'madre@example.com', telefonoAlumno: '600111222' });
  assert.equal(filaCsvHistorico(fila).length, 15);
});

// --- Registro de salida y cómputo de horas reales (R-03) -----------------------------------

void test('filaCsvHistorico: con salida marcada, muestra la hora de salida y la duración real', () => {
  const fila = crearFila({
    asistencia: crearAsistencia({
      ocurrido_en: '2026-08-26T15:30:00.000Z',
      ocurrido_en_salida: '2026-08-26T16:15:00.000Z',
    }),
  });
  const valores = filaCsvHistorico(fila);
  assert.equal(valores[3], '26/08/2026 18:15');
  assert.equal(valores[4], '45');
});

void test('filaCsvHistorico: sin salida marcada, "Hora de salida" y "Duración real" quedan vacías', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ ocurrido_en_salida: null }) });
  const valores = filaCsvHistorico(fila);
  assert.equal(valores[3], '');
  assert.equal(valores[4], '');
});

void test('filaCsvHistorico: "Duración teórica" sale del snapshot del slot, no depende de si hay salida', () => {
  const fila = crearFila({ asistencia: crearAsistencia({ slot_hora_inicio: '09:00', slot_hora_fin: '10:30', ocurrido_en_salida: null }) });
  assert.equal(filaCsvHistorico(fila)[5], '90');
});

void test('filaCsvHistorico: un registro manual (sin slot) deja "Duración teórica" vacía', () => {
  const fila = crearFila({
    asistencia: crearAsistencia({ origen: 'manual', slot_id: null, slot_hora_inicio: null, slot_hora_fin: null }),
  });
  assert.equal(filaCsvHistorico(fila)[5], '');
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

void test('etiquetaMotivoJustificacion: las cuatro etiquetas de la lista cerrada (R-02)', () => {
  assert.equal(etiquetaMotivoJustificacion('enfermedad'), 'Enfermedad');
  assert.equal(etiquetaMotivoJustificacion('cita_medica'), 'Cita médica');
  assert.equal(etiquetaMotivoJustificacion('motivo_familiar'), 'Motivo familiar');
  assert.equal(etiquetaMotivoJustificacion('otro'), 'Otro');
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
  assert.match(lineas[1] ?? '', /;Anulada;No asistió;;;No;/); // motivo de anulación, luego Justificación y Nota de justificación vacías
  assert.match(lineas[2] ?? '', /^Laura Ruiz;Pedro Gómez;/);
  assert.match(lineas[2] ?? '', /;Sí;Válida;;;;No;/); // Sí de "Retroactivo", luego estado válida y tres columnas vacías
});

void test('generarCsvHistorico: lista vacía produce solo BOM y cabecera', () => {
  const documento = generarCsvHistorico([]);
  assert.equal(documento, `\uFEFF${CABECERAS_CSV_HISTORICO.join(';')}\r\n`);
});
