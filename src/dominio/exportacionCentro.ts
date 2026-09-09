/**
 * Exportación completa del centro (R-16, copia de seguridad y portabilidad): compone, a partir del
 * catálogo de centros de referencia (T-11), TODOS los alumnos —activos e inactivos, a diferencia
 * del panel de R-11, que solo cuenta los activos: un volcado de respaldo que omitiera a quien causó
 * baja no sería un volcado completo— con su ficha completa y sus personas de referencia (T-12,
 * T-13), todos los slots de horario —vigentes e históricos, con su versionado íntegro (T-15)— y el
 * histórico completo de asistencia de TODOS los alumnos (T-23, sin filtrar por alumno ni por estado
 * — incluidas las filas anuladas con su motivo y las marcadas retroactivas, mismo criterio de
 * integridad que R-10: "un volcado que oculta lo anulado no es un volcado completo"), el único
 * documento JSON que responde "esto es exactamente todo lo que el centro tiene guardado". Lógica
 * pura: sin acceso a red ni al DOM — `src/ui/pantallaPanelCentro.ts` decide cuándo generarlo y cómo
 * descargarlo.
 *
 * Reutiliza sin duplicar las mismas etiquetas y cálculos que ya usa `expedienteAlumno.ts` (R-10)
 * para el histórico de UN alumno, para que un centro completo cuente exactamente lo mismo que
 * contaría la suma de sus expedientes individuales, nunca una tercera traducción que pudiera
 * divergir.
 *
 * Nunca incluye la fotografía de ningún avatar —solo `tieneAvatar: booleano` por alumno, mismo
 * criterio exacto que R-10 (requisito 2)— ni ninguna credencial de ningún usuario: este módulo no
 * toca `perfil`/`auth.users` en ninguna forma más allá del NOMBRE ya resuelto de un profesor (mismo
 * dato que ya aparece en el resto de informes del proyecto, nunca su email ni su contraseña).
 */

import type { Alumno, Asistencia, CentroEstudios, PersonaReferencia, SlotHorario } from './tipos.ts';
import { ETIQUETA_DIA_SEMANA } from './tipos.ts';
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

/** Lo mínimo que necesita este módulo de la ficha completa de un alumno — estructuralmente
 * compatible con la fila que devuelve `datos/alumnos.ts#listarTodosLosAlumnosParaExportacion` más
 * las personas de referencia ya agrupadas por alumno (`datos/personasReferencia.ts#listarPersonasReferenciaDeAlumnos`),
 * sin importar ninguno de los dos tipos: el dominio nunca depende de la capa de datos (mismo
 * criterio que `FichaAlumnoParaExpediente` de `expedienteAlumno.ts`). */
export interface AlumnoParaExportacionCentro extends Alumno {
  readonly centro: Pick<CentroEstudios, 'nombre'>;
  readonly personasReferencia: readonly PersonaReferencia[];
}

export interface DatosCentroExportacion {
  readonly nombre: string;
  readonly activo: boolean;
}

export interface PersonaReferenciaExportacion {
  readonly nombreCompleto: string;
  readonly telefono: string;
  readonly email: string | null;
}

export interface AlumnoExportacion {
  readonly nombreCompleto: string;
  readonly centro: string;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly activo: boolean;
  readonly altaEn: string;
  readonly bajaEn: string | null;
  readonly motivoBaja: string | null;
  /** `true`/`false`, nunca la ruta real ni una URL firmada (§0.2: "guarda en la base de datos la
   * ruta base del fichero, nunca una URL") — mismo criterio exacto que `DatosAlumnoExpediente` de
   * R-10, requisito 2 de R-16. */
  readonly tieneAvatar: boolean;
  readonly personasReferencia: readonly PersonaReferenciaExportacion[];
}

export interface SlotExportacion {
  readonly alumno: string;
  readonly profesor: string;
  readonly diaSemana: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly asignaturaOGrupo: string | null;
  readonly vigenteDesde: string;
  readonly vigenteHasta: string | null;
}

export interface RegistroAsistenciaExportacion {
  readonly alumno: string;
  readonly profesor: string;
  readonly entrada: string;
  readonly salida: string | null;
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

export interface DatosExportacionCentro {
  readonly centros: readonly DatosCentroExportacion[];
  readonly alumnos: readonly AlumnoExportacion[];
  readonly slots: readonly SlotExportacion[];
  readonly historicoAsistencia: readonly RegistroAsistenciaExportacion[];
  /** Ya formateada por quien llama (`fechaHoraLocalLegible`, con el `Reloj` inyectado de la
   * pantalla) — requisito 3: "la fecha de generación y quién la generó, dentro del propio
   * documento". */
  readonly generadoEnLegible: string;
  readonly generadoPor: string;
}

const ALUMNO_NO_DISPONIBLE_EXPORTACION = '(alumno no disponible)';
const PROFESOR_NO_DISPONIBLE_EXPORTACION = '(profesor no disponible)';

function alumnoExportacion(alumno: AlumnoParaExportacionCentro, zonaHoraria: string): AlumnoExportacion {
  return {
    nombreCompleto: nombreCompletoAlumno(alumno),
    centro: alumno.centro.nombre,
    email: alumno.email_alumno,
    telefono: alumno.telefono_alumno,
    activo: alumno.activo,
    altaEn: fechaHoraLocalLegible(new Date(alumno.alta_en), zonaHoraria),
    bajaEn: alumno.baja_en ? fechaHoraLocalLegible(new Date(alumno.baja_en), zonaHoraria) : null,
    motivoBaja: alumno.motivo_baja,
    tieneAvatar: alumno.avatar_ruta !== null,
    personasReferencia: alumno.personasReferencia.map((persona) => ({
      nombreCompleto: nombreCompletoPersonaReferencia(persona),
      telefono: persona.telefono_referencia,
      email: persona.email_referencia,
    })),
  };
}

function slotExportacion(
  slot: SlotHorario,
  nombresAlumnos: ReadonlyMap<string, string>,
  nombresProfesores: ReadonlyMap<string, string>,
): SlotExportacion {
  return {
    alumno: nombresAlumnos.get(slot.alumno_id) ?? ALUMNO_NO_DISPONIBLE_EXPORTACION,
    profesor: nombresProfesores.get(slot.profesor_id) ?? PROFESOR_NO_DISPONIBLE_EXPORTACION,
    diaSemana: ETIQUETA_DIA_SEMANA[slot.dia_semana],
    horaInicio: slot.hora_inicio,
    horaFin: slot.hora_fin,
    asignaturaOGrupo: slot.asignatura_o_grupo,
    vigenteDesde: slot.vigente_desde,
    vigenteHasta: slot.vigente_hasta,
  };
}

function registroAsistenciaExportacion(
  asistencia: Asistencia,
  nombresAlumnos: ReadonlyMap<string, string>,
  nombresProfesores: ReadonlyMap<string, string>,
  zonaHoraria: string,
): RegistroAsistenciaExportacion {
  return {
    alumno: nombresAlumnos.get(asistencia.alumno_id) ?? ALUMNO_NO_DISPONIBLE_EXPORTACION,
    profesor: nombresProfesores.get(asistencia.profesor_id) ?? PROFESOR_NO_DISPONIBLE_EXPORTACION,
    entrada: fechaHoraLocalLegible(new Date(asistencia.ocurrido_en), zonaHoraria),
    salida: asistencia.ocurrido_en_salida ? fechaHoraLocalLegible(new Date(asistencia.ocurrido_en_salida), zonaHoraria) : null,
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

/** El histórico completo (T-23) llega sin ningún orden garantizado especial para esta exportación
 * (viene de recorrer página a página); un volcado de respaldo se reordena de más antiguo a más
 * reciente por el mismo motivo que ya usó R-10 para el expediente de un único alumno — es una
 * narrativa que se archiva, no una bandeja de revisión donde lo último importa más. Sobre una
 * copia: nunca muta el array de quien llama. */
function ordenarCronologico(historico: readonly Asistencia[]): readonly Asistencia[] {
  return [...historico].sort((a, b) => a.ocurrido_en.localeCompare(b.ocurrido_en));
}

export interface ParametrosExportacionCentro {
  readonly centros: readonly CentroEstudios[];
  readonly alumnos: readonly AlumnoParaExportacionCentro[];
  readonly slots: readonly SlotHorario[];
  readonly historico: readonly Asistencia[];
  /** Resuelto en LOTE por quien llama (`datos/profesores.ts#resolverNombresProfesores`, mismo
   * resolutor que ya usan `expedienteAlumno.ts`/`informeHorasProfesor.ts`/`panelCentro.ts`) — este
   * módulo nunca resuelve un id de profesor por su cuenta. */
  readonly nombresProfesores: ReadonlyMap<string, string>;
  readonly generadoEnLegible: string;
  readonly generadoPor: string;
  readonly zonaHoraria?: string;
}

/** Único punto de composición de la exportación completa del centro (requisito 1): catálogo de
 * centros, todos los alumnos con sus personas de referencia, todos los slots (cualquier vigencia) y
 * todo el histórico de asistencia, ya en la forma que consume la descarga de JSON — ninguna otra
 * función de este módulo calcula nada por su cuenta. */
export function construirDatosExportacionCentro(parametros: ParametrosExportacionCentro): DatosExportacionCentro {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const nombresAlumnos = new Map(parametros.alumnos.map((alumno) => [alumno.id, nombreCompletoAlumno(alumno)]));

  return {
    centros: parametros.centros.map((centro) => ({ nombre: centro.nombre, activo: centro.activo })),
    alumnos: parametros.alumnos.map((alumno) => alumnoExportacion(alumno, zonaHoraria)),
    slots: parametros.slots.map((slot) => slotExportacion(slot, nombresAlumnos, parametros.nombresProfesores)),
    historicoAsistencia: ordenarCronologico(parametros.historico).map((registro) =>
      registroAsistenciaExportacion(registro, nombresAlumnos, parametros.nombresProfesores, zonaHoraria),
    ),
    generadoEnLegible: parametros.generadoEnLegible,
    generadoPor: parametros.generadoPor,
  };
}

/** JSON legible (requisito 1: "un único documento JSON legible") — indentado, mismo criterio que
 * `generarJsonExpediente` (R-10). */
export function generarJsonExportacionCentro(datos: DatosExportacionCentro): string {
  return JSON.stringify(datos, null, 2);
}
