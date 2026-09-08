/**
 * Expediente completo del alumno (R-10, acceso y portabilidad RGPD): compone, a partir de la
 * ficha ya cargada (T-12/T-13, con centro y personas de referencia embebidos) y el histórico
 * íntegro de asistencia (T-23, sin filtrar por mes ni por estado — incluidas las filas anuladas
 * con su motivo y las marcadas retroactivas, requisito 1: "un derecho de acceso que oculta lo
 * anulado no es un acceso completo"), el documento único que responde "esto es exactamente todo lo
 * que tenemos" ante una solicitud de una familia. Lógica pura: sin acceso a red ni al DOM —
 * `src/ui/pantallaFichaAlumno.ts` decide cuándo generarlo y cómo exportarlo (descarga de JSON o
 * ventana de impresión).
 *
 * Reutiliza sin duplicar las etiquetas de `historicoAsistencia.ts` (T-23) y las duraciones de
 * `asistencia.ts`, para que el expediente cuente EXACTAMENTE lo mismo que ya cuentan el histórico
 * en pantalla y su CSV — nunca una tercera traducción de los mismos datos que pudiera divergir.
 * Ninguna función de este fichero construye un `Date` a partir del reloj del sistema: la fecha de
 * generación (`generadoEnLegible`) y quién lo genera (`generadoPor`) llegan ya resueltos de quien
 * llama, mismo criterio que `informeMensualAlumno.ts` (R-04).
 */

import type { Alumno, Asistencia, CentroEstudios, PersonaReferencia } from './tipos.ts';
import { nombreCompletoAlumno } from './alumno.ts';
import { nombreCompletoPersonaReferencia } from './personaReferencia.ts';
import {
  etiquetaEstadoAsistencia,
  etiquetaMotivoJustificacion,
  etiquetaOrigenAsistencia,
  tieneModificaciones,
} from './historicoAsistencia.ts';
import { duracionRealMinutos, duracionTeoricaMinutos } from './asistencia.ts';
import { fechaHoraLocalLegible, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';

/** Lo mínimo que necesita este módulo de la ficha completa (T-12/T-13) — estructuralmente
 * compatible con `AlumnoConCentroYPersonas` de `datos/alumnos.ts`, sin importarlo: el dominio nunca
 * depende de la capa de datos (mismo criterio que `FilaHistoricoResuelta` de `historicoAsistencia.ts`,
 * que tampoco importa nada de `datos/`). */
export interface FichaAlumnoParaExpediente extends Alumno {
  readonly centro: Pick<CentroEstudios, 'nombre'>;
  readonly personas_referencia: readonly PersonaReferencia[];
}

/** Una fila de `asistencia` con el nombre del profesor ya resuelto (`datos/profesores.ts`,
 * `resolverNombresProfesores`, mismo resolutor en lote que ya usa `pantallaHistorico.ts`) — este
 * módulo nunca resuelve un id de profesor por su cuenta. */
export interface FilaExpedienteAsistencia {
  readonly asistencia: Asistencia;
  readonly profesorNombre: string;
}

export interface DatosAlumnoExpediente {
  readonly nombreCompleto: string;
  readonly centro: string;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly activo: boolean;
  readonly altaEn: string;
  readonly bajaEn: string | null;
  readonly motivoBaja: string | null;
  /** `true`/`false`, nunca la ruta real ni una URL firmada (§0.2: "guarda en la base de datos la
   * ruta base del fichero, nunca una URL"; una firmada además caduca, así que no tendría sentido en
   * un documento archivado) — el expediente informa de que existe una fotografía, no la sirve. */
  readonly tieneAvatar: boolean;
}

export interface PersonaReferenciaExpediente {
  readonly nombreCompleto: string;
  readonly telefono: string;
  readonly email: string | null;
}

export interface RegistroAsistenciaExpediente {
  readonly horaEntrada: string;
  readonly horaSalida: string | null;
  readonly profesor: string;
  readonly origen: string;
  readonly retroactivo: boolean;
  readonly estado: string;
  readonly motivoAnulacion: string | null;
  readonly justificacion: string | null;
  readonly notaJustificacion: string | null;
  readonly modificado: boolean;
  readonly nota: string | null;
  readonly duracionRealMinutos: number | null;
  readonly duracionTeoricaMinutos: number | null;
}

export interface DatosExpedienteAlumno {
  readonly alumno: DatosAlumnoExpediente;
  readonly personasReferencia: readonly PersonaReferenciaExpediente[];
  readonly historicoAsistencia: readonly RegistroAsistenciaExpediente[];
  /** Ya formateada por quien llama (`fechaHoraLocalLegible`, con el `Reloj` inyectado de la
   * pantalla) — requisito 2: "la fecha de generación y quién la generó, dentro del propio
   * documento". */
  readonly generadoEnLegible: string;
  readonly generadoPor: string;
}

function datosAlumnoExpediente(ficha: FichaAlumnoParaExpediente, zonaHoraria: string): DatosAlumnoExpediente {
  return {
    nombreCompleto: nombreCompletoAlumno(ficha),
    centro: ficha.centro.nombre,
    email: ficha.email_alumno,
    telefono: ficha.telefono_alumno,
    activo: ficha.activo,
    altaEn: fechaHoraLocalLegible(new Date(ficha.alta_en), zonaHoraria),
    bajaEn: ficha.baja_en ? fechaHoraLocalLegible(new Date(ficha.baja_en), zonaHoraria) : null,
    motivoBaja: ficha.motivo_baja,
    tieneAvatar: ficha.avatar_ruta !== null,
  };
}

function personasReferenciaExpediente(personas: readonly PersonaReferencia[]): readonly PersonaReferenciaExpediente[] {
  return personas.map((persona) => ({
    nombreCompleto: nombreCompletoPersonaReferencia(persona),
    telefono: persona.telefono_referencia,
    email: persona.email_referencia,
  }));
}

function registroAsistenciaExpediente(fila: FilaExpedienteAsistencia, zonaHoraria: string): RegistroAsistenciaExpediente {
  const { asistencia } = fila;
  return {
    horaEntrada: fechaHoraLocalLegible(new Date(asistencia.ocurrido_en), zonaHoraria),
    horaSalida: asistencia.ocurrido_en_salida ? fechaHoraLocalLegible(new Date(asistencia.ocurrido_en_salida), zonaHoraria) : null,
    profesor: fila.profesorNombre,
    origen: etiquetaOrigenAsistencia(asistencia.origen),
    retroactivo: asistencia.es_retroactivo,
    estado: etiquetaEstadoAsistencia(asistencia.estado),
    motivoAnulacion: asistencia.motivo_anulacion,
    justificacion: asistencia.motivo_justificacion ? etiquetaMotivoJustificacion(asistencia.motivo_justificacion) : null,
    notaJustificacion: asistencia.nota_justificacion,
    modificado: tieneModificaciones(asistencia),
    nota: asistencia.nota,
    duracionRealMinutos: asistencia.ocurrido_en_salida
      ? duracionRealMinutos(new Date(asistencia.ocurrido_en), new Date(asistencia.ocurrido_en_salida))
      : null,
    duracionTeoricaMinutos:
      asistencia.slot_hora_inicio && asistencia.slot_hora_fin
        ? duracionTeoricaMinutos(asistencia.slot_hora_inicio, asistencia.slot_hora_fin)
        : null,
  };
}

/** El histórico completo (T-23) llega de `listarHistoricoAsistenciaCompleto` ordenado del más
 * reciente al más antiguo (pensado para una consulta de revisión) — un expediente que se archiva
 * es una narrativa, así que este módulo lo reordena de más antiguo a más reciente, sin depender de
 * en qué orden llegue `filas`: `[...filas].sort` nunca muta el array de quien llama. */
function ordenarCronologico(filas: readonly FilaExpedienteAsistencia[]): readonly FilaExpedienteAsistencia[] {
  return [...filas].sort((a, b) => {
    const ocurridoA = a.asistencia.ocurrido_en;
    const ocurridoB = b.asistencia.ocurrido_en;
    return ocurridoA.localeCompare(ocurridoB);
  });
}

export interface ParametrosExpedienteAlumno {
  readonly ficha: FichaAlumnoParaExpediente;
  readonly historico: readonly FilaExpedienteAsistencia[];
  readonly generadoEnLegible: string;
  readonly generadoPor: string;
  readonly zonaHoraria?: string;
}

/** Único punto de composición del expediente (requisito 1): ficha completa, personas de
 * referencia y todo el histórico de asistencia, ya en la forma que consumen tanto la exportación a
 * JSON como el documento imprimible — ninguno de los dos calcula nada por su cuenta, así que los
 * dos formatos SIEMPRE coinciden (mismo criterio que `filasInformeMensual` de R-04). */
export function construirDatosExpedienteAlumno(parametros: ParametrosExpedienteAlumno): DatosExpedienteAlumno {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  return {
    alumno: datosAlumnoExpediente(parametros.ficha, zonaHoraria),
    personasReferencia: personasReferenciaExpediente(parametros.ficha.personas_referencia),
    historicoAsistencia: ordenarCronologico(parametros.historico).map((fila) => registroAsistenciaExpediente(fila, zonaHoraria)),
    generadoEnLegible: parametros.generadoEnLegible,
    generadoPor: parametros.generadoPor,
  };
}

/** JSON legible (requisito 1: "JSON legible") — indentado, para que abrirlo en cualquier editor de
 * texto sea suficiente para leerlo, sin necesitar un formateador aparte. */
export function generarJsonExpediente(datos: DatosExpedienteAlumno): string {
  return JSON.stringify(datos, null, 2);
}

/** Pares campo/valor de la cabecera del expediente (alumno + fecha de generación) — única fuente
 * para la tabla de cabecera del documento imprimible, mismo criterio que `filasInformeMensual` de
 * R-04. Los campos de baja solo aparecen si el alumno está de baja: mostrarlos vacíos para un
 * alumno activo no aportaría nada al documento. */
export function filasCabeceraExpediente(datos: DatosExpedienteAlumno): readonly (readonly [string, string])[] {
  const { alumno } = datos;
  const filas: (readonly [string, string])[] = [
    ['Alumno', alumno.nombreCompleto],
    ['Centro de referencia', alumno.centro],
    ['Email', alumno.email ?? '—'],
    ['Teléfono', alumno.telefono ?? '—'],
    ['Estado', alumno.activo ? 'Activo' : 'De baja'],
    ['Alta', alumno.altaEn],
  ];
  if (!alumno.activo) {
    filas.push(['Baja', alumno.bajaEn ?? '—'], ['Motivo de baja', alumno.motivoBaja ?? '—']);
  }
  filas.push(
    ['Fotografía', alumno.tieneAvatar ? 'Sí' : 'No'],
    ['Fecha de generación', datos.generadoEnLegible],
    ['Generado por', datos.generadoPor],
  );
  return filas;
}

export const CABECERAS_PERSONAS_REFERENCIA_EXPEDIENTE: readonly string[] = ['Nombre', 'Teléfono', 'Email'];

/** Fila de la tabla de personas de referencia del documento imprimible, mismo orden que
 * `CABECERAS_PERSONAS_REFERENCIA_EXPEDIENTE`. */
export function filaPersonaReferenciaExpediente(persona: PersonaReferenciaExpediente): readonly string[] {
  return [persona.nombreCompleto, persona.telefono, persona.email ?? '—'];
}

export const CABECERAS_HISTORICO_EXPEDIENTE: readonly string[] = [
  'Entrada',
  'Salida',
  'Profesor',
  'Origen',
  'Retroactivo',
  'Estado',
  'Motivo de anulación',
  'Justificación',
  'Nota de justificación',
  'Modificado',
  'Nota',
  'Duración real (min)',
  'Duración teórica (min)',
];

/** Fila de la tabla de histórico del documento imprimible, mismo orden que
 * `CABECERAS_HISTORICO_EXPEDIENTE`. */
export function filaHistoricoExpediente(registro: RegistroAsistenciaExpediente): readonly string[] {
  return [
    registro.horaEntrada,
    registro.horaSalida ?? '—',
    registro.profesor,
    registro.origen,
    registro.retroactivo ? 'Sí' : 'No',
    registro.estado,
    registro.motivoAnulacion ?? '—',
    registro.justificacion ?? '—',
    registro.notaJustificacion ?? '—',
    registro.modificado ? 'Sí' : 'No',
    registro.nota ?? '—',
    registro.duracionRealMinutos !== null ? String(registro.duracionRealMinutos) : '—',
    registro.duracionTeoricaMinutos !== null ? String(registro.duracionTeoricaMinutos) : '—',
  ];
}
