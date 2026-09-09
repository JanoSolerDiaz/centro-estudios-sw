import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  construirDatosExportacionCentro,
  generarJsonExportacionCentro,
  type AlumnoParaExportacionCentro,
} from './exportacionCentro.ts';
import type { Asistencia, CentroEstudios, PersonaReferencia, SlotHorario } from './tipos.ts';

function crearCentro(sobrescribir: Partial<CentroEstudios> = {}): CentroEstudios {
  return {
    id: 'centro-1',
    nombre: 'Colegio Ejemplo',
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

function crearPersona(sobrescribir: Partial<PersonaReferencia> = {}): PersonaReferencia {
  return {
    id: 'persona-1',
    alumno_id: 'alumno-1',
    nombre: 'Marta',
    primer_apellido: 'López',
    segundo_apellido: null,
    email_referencia: null,
    telefono_referencia: '622334455',
    creado_en: '2026-01-10T09:00:00.000Z',
    actualizado_en: '2026-01-10T09:00:00.000Z',
    ...sobrescribir,
  };
}

function crearAlumno(sobrescribir: Partial<AlumnoParaExportacionCentro> = {}): AlumnoParaExportacionCentro {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: 'López',
    centro_referencia_id: 'centro-1',
    avatar_ruta: null,
    email_alumno: 'ana@example.com',
    telefono_alumno: '611223344',
    activo: true,
    alta_en: '2026-01-10T09:00:00.000Z',
    baja_en: null,
    motivo_baja: null,
    usuario_id: null,
    creado_en: '2026-01-10T09:00:00.000Z',
    actualizado_en: '2026-01-10T09:00:00.000Z',
    centro: { nombre: 'Colegio Ejemplo' },
    personasReferencia: [],
    ...sobrescribir,
  };
}

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
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

const NOMBRES_PROFESORES = new Map([['profesor-1', 'Pedro Pérez']]);

// --- construirDatosExportacionCentro: centros -------------------------------------------------

void test('construirDatosExportacionCentro: incluye el catálogo completo de centros, activos e inactivos', () => {
  const datos = construirDatosExportacionCentro({
    centros: [crearCentro(), crearCentro({ id: 'centro-2', nombre: 'Instituto Baja', activo: false })],
    alumnos: [],
    slots: [],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.deepEqual(datos.centros, [
    { nombre: 'Colegio Ejemplo', activo: true },
    { nombre: 'Instituto Baja', activo: false },
  ]);
});

// --- construirDatosExportacionCentro: alumnos -------------------------------------------------

void test('construirDatosExportacionCentro: alumno activo con contacto, sin avatar y con una persona de referencia', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno({ personasReferencia: [crearPersona()] })],
    slots: [],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.deepEqual(datos.alumnos, [
    {
      nombreCompleto: 'Ana García López',
      centro: 'Colegio Ejemplo',
      email: 'ana@example.com',
      telefono: '611223344',
      activo: true,
      altaEn: '10/01/2026 10:00',
      bajaEn: null,
      motivoBaja: null,
      tieneAvatar: false,
      personasReferencia: [{ nombreCompleto: 'Marta López', telefono: '622334455', email: null }],
    },
  ]);
});

void test('construirDatosExportacionCentro: incluye alumnos de baja (requisito: volcado completo, no solo activos)', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [
      crearAlumno({ id: 'alumno-2', activo: false, baja_en: '2026-06-01T00:00:00.000Z', motivo_baja: 'Cambio de centro' }),
    ],
    slots: [],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.equal(datos.alumnos.length, 1);
  const alumno = datos.alumnos[0];
  assert.ok(alumno);
  assert.equal(alumno.activo, false);
  assert.equal(alumno.motivoBaja, 'Cambio de centro');
  assert.ok(alumno.bajaEn && alumno.bajaEn.length > 0);
});

void test('construirDatosExportacionCentro: alumno con avatar informa tieneAvatar sin exponer la ruta', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno({ avatar_ruta: 'alumnos/alumno-1/avatar.webp' })],
    slots: [],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.equal(datos.alumnos[0]?.tieneAvatar, true);
  assert.equal(JSON.stringify(datos).includes('alumnos/alumno-1/avatar.webp'), false);
});

// --- construirDatosExportacionCentro: slots ---------------------------------------------------

void test('construirDatosExportacionCentro: slot resuelve alumno, profesor y etiqueta del día', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno()],
    slots: [crearSlot()],
    historico: [],
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.deepEqual(datos.slots, [
    {
      alumno: 'Ana García López',
      profesor: 'Pedro Pérez',
      diaSemana: 'Miércoles',
      horaInicio: '17:00',
      horaFin: '18:00',
      asignaturaOGrupo: null,
      vigenteDesde: '2026-01-01',
      vigenteHasta: null,
    },
  ]);
});

void test('construirDatosExportacionCentro: slot histórico (vigente_hasta no nulo) se incluye igual que el vigente', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno()],
    slots: [
      crearSlot({ id: 'slot-antiguo', vigente_desde: '2025-01-01', vigente_hasta: '2025-12-31', hora_inicio: '16:00', hora_fin: '17:00' }),
      crearSlot(),
    ],
    historico: [],
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.equal(datos.slots.length, 2);
  assert.equal(datos.slots[0]?.vigenteHasta, '2025-12-31');
  assert.equal(datos.slots[1]?.vigenteHasta, null);
});

void test('construirDatosExportacionCentro: alumno o profesor sin resolver caen en el marcador "no disponible"', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [],
    slots: [crearSlot({ alumno_id: 'alumno-fantasma' })],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  const slot = datos.slots[0];
  assert.ok(slot);
  assert.equal(slot.alumno, '(alumno no disponible)');
  assert.equal(slot.profesor, '(profesor no disponible)');
});

// --- construirDatosExportacionCentro: histórico de asistencia ---------------------------------

void test('construirDatosExportacionCentro: registro válido con salida resuelve duraciones real y teórica', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno()],
    slots: [],
    historico: [crearAsistencia({ ocurrido_en_salida: '2026-03-04T18:00:00.000Z' })],
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  const fila = datos.historicoAsistencia[0];
  assert.ok(fila);
  assert.equal(fila.alumno, 'Ana García López');
  assert.equal(fila.profesor, 'Pedro Pérez');
  assert.equal(fila.duracionRealMinutos, 60);
  assert.equal(fila.duracionTeoricaMinutos, 60);
  assert.equal(fila.estado, 'Válida');
});

void test('construirDatosExportacionCentro: incluye registros anulados y retroactivos con su motivo/justificación', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno()],
    slots: [],
    historico: [
      crearAsistencia({ id: 'anulado', estado: 'anulada', motivo_anulacion: 'Error de tecleo' }),
      crearAsistencia({
        id: 'retro-justificado',
        es_retroactivo: true,
        estado: 'ausente',
        motivo_justificacion: 'enfermedad',
        nota_justificacion: 'Con parte médico',
      }),
    ],
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.equal(datos.historicoAsistencia.length, 2);
  const anulado = datos.historicoAsistencia.find((fila) => fila.motivoAnulacion === 'Error de tecleo');
  assert.ok(anulado);
  assert.equal(anulado.estado, 'Anulada');
  const retroactivo = datos.historicoAsistencia.find((fila) => fila.retroactivo);
  assert.ok(retroactivo);
  assert.equal(retroactivo.justificacion, 'Enfermedad');
  assert.equal(retroactivo.notaJustificacion, 'Con parte médico');
});

void test('construirDatosExportacionCentro: reordena el histórico de más antiguo a más reciente', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno()],
    slots: [],
    historico: [
      crearAsistencia({ id: 'reciente', ocurrido_en: '2026-03-10T17:00:00.000Z' }),
      crearAsistencia({ id: 'antiguo', ocurrido_en: '2026-01-05T17:00:00.000Z' }),
    ],
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  const primera = datos.historicoAsistencia[0];
  const segunda = datos.historicoAsistencia[1];
  assert.ok(primera && segunda);
  assert.equal(primera.entrada < segunda.entrada, true);
});

void test('construirDatosExportacionCentro: no muta el array de histórico recibido', () => {
  const historico = [crearAsistencia({ id: 'reciente', ocurrido_en: '2026-03-10T17:00:00.000Z' }), crearAsistencia({ id: 'antiguo', ocurrido_en: '2026-01-05T17:00:00.000Z' })];
  const copia = [...historico];
  construirDatosExportacionCentro({
    centros: [],
    alumnos: [crearAlumno()],
    slots: [],
    historico,
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  assert.deepEqual(historico, copia);
});

// --- construirDatosExportacionCentro: cabecera ------------------------------------------------

void test('construirDatosExportacionCentro: incluye la fecha de generación y quién la generó', () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [],
    slots: [],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Ana Administradora',
  });
  assert.equal(datos.generadoEnLegible, '09/09/2026 10:00');
  assert.equal(datos.generadoPor, 'Ana Administradora');
});

// --- generarJsonExportacionCentro -------------------------------------------------------------

void test('generarJsonExportacionCentro: produce un JSON indentado y parseable', () => {
  const datos = construirDatosExportacionCentro({
    centros: [crearCentro()],
    alumnos: [crearAlumno({ personasReferencia: [crearPersona()] })],
    slots: [crearSlot()],
    historico: [crearAsistencia()],
    nombresProfesores: NOMBRES_PROFESORES,
    generadoEnLegible: '09/09/2026 10:00',
    generadoPor: 'Admin',
  });
  const json = generarJsonExportacionCentro(datos);
  assert.ok(json.includes('\n  '));
  assert.deepEqual(JSON.parse(json), datos);
});
