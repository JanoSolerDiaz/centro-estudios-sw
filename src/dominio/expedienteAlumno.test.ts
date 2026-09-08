import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  construirDatosExpedienteAlumno,
  generarJsonExpediente,
  filasCabeceraExpediente,
  filaPersonaReferenciaExpediente,
  filaHistoricoExpediente,
  CABECERAS_PERSONAS_REFERENCIA_EXPEDIENTE,
  CABECERAS_HISTORICO_EXPEDIENTE,
  type FichaAlumnoParaExpediente,
  type FilaExpedienteAsistencia,
} from './expedienteAlumno.ts';
import type { Asistencia, PersonaReferencia } from './tipos.ts';

function crearFicha(sobrescribir: Partial<FichaAlumnoParaExpediente> = {}): FichaAlumnoParaExpediente {
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
    personas_referencia: [],
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

function crearFilaHistorico(sobrescribir: Partial<Asistencia> = {}, profesorNombre = 'Pedro Pérez'): FilaExpedienteAsistencia {
  return { asistencia: crearAsistencia(sobrescribir), profesorNombre };
}

// --- construirDatosExpedienteAlumno: alumno --------------------------------------------------

void test('construirDatosExpedienteAlumno: alumno activo, sin avatar, con datos de contacto', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.deepEqual(datos.alumno, {
    nombreCompleto: 'Ana García López',
    centro: 'Colegio Ejemplo',
    email: 'ana@example.com',
    telefono: '611223344',
    activo: true,
    altaEn: '10/01/2026 10:00',
    bajaEn: null,
    motivoBaja: null,
    tieneAvatar: false,
  });
});

void test('construirDatosExpedienteAlumno: alumno de baja con avatar', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha({
      activo: false,
      baja_en: '2026-06-01T12:00:00.000Z',
      motivo_baja: 'Cambio de centro',
      avatar_ruta: 'alumnos/alumno-1',
    }),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.equal(datos.alumno.activo, false);
  assert.equal(datos.alumno.bajaEn, '01/06/2026 14:00');
  assert.equal(datos.alumno.motivoBaja, 'Cambio de centro');
  assert.equal(datos.alumno.tieneAvatar, true);
});

void test('construirDatosExpedienteAlumno: sin segundo apellido, sin contacto', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha({ segundo_apellido: null, email_alumno: null, telefono_alumno: null }),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.equal(datos.alumno.nombreCompleto, 'Ana García');
  assert.equal(datos.alumno.email, null);
  assert.equal(datos.alumno.telefono, null);
});

// --- construirDatosExpedienteAlumno: personas de referencia ----------------------------------

void test('construirDatosExpedienteAlumno: mapea las personas de referencia embebidas', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha({
      personas_referencia: [crearPersona(), crearPersona({ id: 'persona-2', nombre: 'Juan', email_referencia: 'juan@example.com' })],
    }),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.deepEqual(datos.personasReferencia, [
    { nombreCompleto: 'Marta López', telefono: '622334455', email: null },
    { nombreCompleto: 'Juan López', telefono: '622334455', email: 'juan@example.com' },
  ]);
});

void test('construirDatosExpedienteAlumno: sin personas de referencia da un array vacío', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.deepEqual(datos.personasReferencia, []);
});

// --- construirDatosExpedienteAlumno: histórico -----------------------------------------------

void test('construirDatosExpedienteAlumno: reordena el histórico de más antiguo a más reciente', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [
      crearFilaHistorico({ id: 'asis-3', ocurrido_en: '2026-03-06T17:00:00.000Z' }),
      crearFilaHistorico({ id: 'asis-1', ocurrido_en: '2026-03-04T17:00:00.000Z' }),
      crearFilaHistorico({ id: 'asis-2', ocurrido_en: '2026-03-05T17:00:00.000Z' }),
    ],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.deepEqual(
    datos.historicoAsistencia.map((registro) => registro.horaEntrada),
    ['04/03/2026 18:00', '05/03/2026 18:00', '06/03/2026 18:00'],
  );
});

void test('construirDatosExpedienteAlumno: no muta el array de entrada al reordenar', () => {
  const historico = [
    crearFilaHistorico({ id: 'asis-2', ocurrido_en: '2026-03-05T17:00:00.000Z' }),
    crearFilaHistorico({ id: 'asis-1', ocurrido_en: '2026-03-04T17:00:00.000Z' }),
  ];
  construirDatosExpedienteAlumno({ ficha: crearFicha(), historico, generadoEnLegible: '', generadoPor: '' });
  assert.equal(historico[0]?.asistencia.id, 'asis-2');
});

void test('construirDatosExpedienteAlumno: registro con salida marcada trae duración real', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [crearFilaHistorico({ ocurrido_en_salida: '2026-03-04T18:05:00.000Z' })],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const [registro] = datos.historicoAsistencia;
  assert.equal(registro?.horaSalida, '04/03/2026 19:05');
  assert.equal(registro.duracionRealMinutos, 65);
  assert.equal(registro.duracionTeoricaMinutos, 60);
});

void test('construirDatosExpedienteAlumno: sin salida ni slot, las duraciones son null', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [
      crearFilaHistorico({
        origen: 'manual',
        slot_id: null,
        slot_dia_semana: null,
        slot_hora_inicio: null,
        slot_hora_fin: null,
      }),
    ],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const [registro] = datos.historicoAsistencia;
  assert.equal(registro?.horaSalida, null);
  assert.equal(registro.duracionRealMinutos, null);
  assert.equal(registro.duracionTeoricaMinutos, null);
  assert.equal(registro.origen, 'Extra');
});

void test('construirDatosExpedienteAlumno: incluye anuladas y retroactivas (requisito 1)', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [
      crearFilaHistorico({ id: 'asis-anulada', estado: 'anulada', motivo_anulacion: 'Error al pasar lista' }),
      crearFilaHistorico({ id: 'asis-retro', es_retroactivo: true, ocurrido_en: '2026-03-05T17:00:00.000Z' }),
    ],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.equal(datos.historicoAsistencia.length, 2);
  const anulada = datos.historicoAsistencia.find((registro) => registro.estado === 'Anulada');
  assert.equal(anulada?.motivoAnulacion, 'Error al pasar lista');
  const retro = datos.historicoAsistencia.find((registro) => registro.retroactivo);
  assert.ok(retro);
});

void test('construirDatosExpedienteAlumno: ausencia justificada trae la etiqueta de justificación', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [
      crearFilaHistorico({
        estado: 'ausente',
        motivo_justificacion: 'cita_medica',
        nota_justificacion: 'Revisión anual',
      }),
    ],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const [registro] = datos.historicoAsistencia;
  assert.equal(registro?.estado, 'Ausente');
  assert.equal(registro.justificacion, 'Cita médica');
  assert.equal(registro.notaJustificacion, 'Revisión anual');
});

void test('construirDatosExpedienteAlumno: usa el nombre de profesor ya resuelto por fila', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [crearFilaHistorico({}, 'Laura Sánchez')],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  assert.equal(datos.historicoAsistencia[0]?.profesor, 'Laura Sánchez');
});

void test('construirDatosExpedienteAlumno: propaga fecha de generación y quién genera', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [],
    generadoEnLegible: '08/09/2026 10:30',
    generadoPor: 'Admin Dos',
  });
  assert.equal(datos.generadoEnLegible, '08/09/2026 10:30');
  assert.equal(datos.generadoPor, 'Admin Dos');
});

// --- generarJsonExpediente --------------------------------------------------------------------

void test('generarJsonExpediente: JSON indentado y que reproduce los mismos datos al parsear', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha({ personas_referencia: [crearPersona()] }),
    historico: [crearFilaHistorico()],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const json = generarJsonExpediente(datos);
  assert.ok(json.includes('\n  '), 'debe estar indentado, no en una sola línea');
  assert.deepEqual(JSON.parse(json), datos);
});

// --- filasCabeceraExpediente --------------------------------------------------------------------

void test('filasCabeceraExpediente: alumno activo no incluye filas de baja', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const filas = filasCabeceraExpediente(datos);
  assert.ok(!filas.some(([campo]) => campo === 'Baja'));
  assert.ok(!filas.some(([campo]) => campo === 'Motivo de baja'));
  assert.deepEqual(filas.find(([campo]) => campo === 'Generado por'), ['Generado por', 'Admin Uno']);
});

void test('filasCabeceraExpediente: alumno de baja SÍ incluye las filas de baja', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha({ activo: false, baja_en: '2026-06-01T12:00:00.000Z', motivo_baja: 'Cambio de centro' }),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const filas = filasCabeceraExpediente(datos);
  assert.deepEqual(filas.find(([campo]) => campo === 'Baja'), ['Baja', '01/06/2026 14:00']);
  assert.deepEqual(filas.find(([campo]) => campo === 'Motivo de baja'), ['Motivo de baja', 'Cambio de centro']);
});

void test('filasCabeceraExpediente: email/teléfono ausentes se muestran como guion', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha({ email_alumno: null, telefono_alumno: null }),
    historico: [],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const filas = filasCabeceraExpediente(datos);
  assert.deepEqual(filas.find(([campo]) => campo === 'Email'), ['Email', '—']);
  assert.deepEqual(filas.find(([campo]) => campo === 'Teléfono'), ['Teléfono', '—']);
});

// --- filaPersonaReferenciaExpediente / filaHistoricoExpediente ---------------------------------

void test('filaPersonaReferenciaExpediente: mismo orden que sus cabeceras', () => {
  const fila = filaPersonaReferenciaExpediente({ nombreCompleto: 'Marta López', telefono: '622334455', email: null });
  assert.equal(fila.length, CABECERAS_PERSONAS_REFERENCIA_EXPEDIENTE.length);
  assert.deepEqual(fila, ['Marta López', '622334455', '—']);
});

void test('filaHistoricoExpediente: mismo orden que sus cabeceras, con guiones para lo ausente', () => {
  const datos = construirDatosExpedienteAlumno({
    ficha: crearFicha(),
    historico: [crearFilaHistorico()],
    generadoEnLegible: '08/09/2026 10:00',
    generadoPor: 'Admin Uno',
  });
  const [registro] = datos.historicoAsistencia;
  assert.ok(registro);
  const fila = filaHistoricoExpediente(registro);
  assert.equal(fila.length, CABECERAS_HISTORICO_EXPEDIENTE.length);
  assert.equal(fila[1], '—'); // Salida, sin marcar
  assert.equal(fila[6], '—'); // Motivo de anulación
});
