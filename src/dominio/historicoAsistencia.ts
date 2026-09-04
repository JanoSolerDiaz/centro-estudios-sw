/**
 * Consulta y exportación del histórico de asistencia (T-23). Lógica pura: qué significa "tiene
 * modificaciones" y cómo se traduce una fila del histórico ya resuelta (con los nombres de alumno y
 * profesor embebidos, no solo sus ids) a las columnas de un CSV en español. Nada de este fichero lee
 * red ni el DOM — `src/datos/asistencia.ts` resuelve la consulta y `src/ui/pantallaHistorico.ts`
 * decide cuándo llamar a `generarCsvHistorico` y cómo disparar la descarga.
 *
 * Requisito 3 de T-23, explícito: "no incluye datos de contacto ni de personas de referencia salvo
 * que el administrator lo pida explícitamente" — por defecto `filaCsvHistorico` no sabe nada de
 * email ni teléfono; solo si quien llama pasa `incluirContacto: true` Y provee esos dos campos
 * aparecen columnas nuevas al final. Ninguna otra combinación puede filtrarlos por descuido, porque
 * la función no los lee de ningún sitio si no se los dan.
 */

import type { Asistencia, EstadoAsistencia, MotivoJustificacionAusencia, OrigenAsistencia } from './tipos.ts';
import { fechaHoraLocalLegible, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';
import { documentoCsv } from '../nucleo/csv.ts';

/** ¿Tiene `registro` al menos una modificación registrada (requisito 1 de T-23: "si tiene
 * modificaciones")? El propio `actualizar_asistencia` (T-21) es la única vía que puede dejar
 * `actualizado_en` distinto de `null` — un registro recién creado por `registrar_asistencia` (T-18)
 * siempre lo trae a `null`, así que esta comprobación no necesita consultar `asistencia_historial`:
 * la propia fila ya lo sabe. */
export function tieneModificaciones(registro: Pick<Asistencia, 'actualizado_en'>): boolean {
  return registro.actualizado_en !== null;
}

const ETIQUETA_ORIGEN: Readonly<Record<OrigenAsistencia, string>> = {
  slot: 'Horario',
  manual: 'Extra',
};

const ETIQUETA_ESTADO: Readonly<Record<EstadoAsistencia, string>> = {
  valida: 'Válida',
  anulada: 'Anulada',
  ausente: 'Ausente',
};

/** Misma etiqueta que usa la columna "Origen" del CSV — exportada para que la tabla en pantalla
 * (`pantallaHistorico.ts`) no la duplique. */
export function etiquetaOrigenAsistencia(origen: OrigenAsistencia): string {
  return ETIQUETA_ORIGEN[origen];
}

/** Misma etiqueta que usa la columna "Estado" del CSV — exportada por el mismo motivo. */
export function etiquetaEstadoAsistencia(estado: EstadoAsistencia): string {
  return ETIQUETA_ESTADO[estado];
}

const ETIQUETA_MOTIVO_JUSTIFICACION: Readonly<Record<MotivoJustificacionAusencia, string>> = {
  enfermedad: 'Enfermedad',
  cita_medica: 'Cita médica',
  motivo_familiar: 'Motivo familiar',
  otro: 'Otro',
};

/** Etiqueta en español de un motivo de justificación de ausencia (R-02) — usada por el `<select>` de
 * `pantallaRegistrosSlot.ts`, la columna "Justificación" de `pantallaHistorico.ts` y la columna
 * homóloga del CSV. `null` (sin justificar) no tiene etiqueta propia: quien llama decide qué mostrar
 * en ese caso (columnas vacías en el CSV, "Sin justificar" en pantalla). */
export function etiquetaMotivoJustificacion(motivo: MotivoJustificacionAusencia): string {
  return ETIQUETA_MOTIVO_JUSTIFICACION[motivo];
}

/** Lo mínimo que necesita una fila del histórico ya resuelta: la fila de `asistencia` tal cual, más
 * el nombre para mostrar de alumno y profesor (`src/datos/asistencia.ts` y sus resolutores en lote
 * de `datos/alumnos.ts`/`datos/profesores.ts` los completan; esta función nunca los resuelve por su
 * cuenta). */
export interface FilaHistoricoResuelta {
  readonly asistencia: Asistencia;
  readonly alumnoNombre: string;
  readonly profesorNombre: string;
}

/** `FilaHistoricoResuelta` con el contacto del alumno opcionalmente adjunto — solo lo provee quien
 * llama cuando `administrator` pidió explícitamente incluirlo (requisito 3 de T-23), nunca esta
 * función ni la consulta por defecto de `datos/asistencia.ts`. */
export interface FilaHistoricoResueltaConContacto extends FilaHistoricoResuelta {
  readonly emailAlumno?: string | null;
  readonly telefonoAlumno?: string | null;
}

export interface OpcionesCsvHistorico {
  /** `true` solo si `administrator` lo pidió explícitamente (requisito 3 de T-23) Y la pantalla
   * proveyó `emailAlumno`/`telefonoAlumno` en cada fila — sin las dos condiciones a la vez, las
   * columnas de contacto no aparecen. */
  readonly incluirContacto?: boolean;
}

export const CABECERAS_CSV_HISTORICO: readonly string[] = [
  'Alumno',
  'Profesor',
  'Hora atribuida',
  'Hora de creación',
  'Origen',
  'Retroactivo',
  'Estado',
  'Motivo de anulación',
  'Justificación',
  'Nota de justificación',
  'Modificado',
  'Nota',
];

const CABECERAS_CONTACTO: readonly string[] = ['Email del alumno', 'Teléfono del alumno'];

export function cabecerasCsvHistorico(opciones: OpcionesCsvHistorico = {}): readonly string[] {
  return opciones.incluirContacto ? [...CABECERAS_CSV_HISTORICO, ...CABECERAS_CONTACTO] : CABECERAS_CSV_HISTORICO;
}

/** Fila de `fila` como valores de texto, en el mismo orden que `cabecerasCsvHistorico`. Solo lee
 * `fila.asistencia` (el snapshot inmutable que guardó el servidor al registrar, requisito 2: "los
 * cambios de horario posteriores no alteran ni un dato de una fila histórica") — nunca un
 * `SlotHorario` vigente, que ni siquiera recibe como parámetro: no hay forma de que esta función
 * refleje por accidente un horario editado después de que la fila se creara. */
export function filaCsvHistorico(
  fila: FilaHistoricoResueltaConContacto,
  opciones: OpcionesCsvHistorico = {},
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): readonly string[] {
  const { asistencia } = fila;
  const base = [
    fila.alumnoNombre,
    fila.profesorNombre,
    fechaHoraLocalLegible(new Date(asistencia.ocurrido_en), zonaHoraria),
    fechaHoraLocalLegible(new Date(asistencia.registrado_en), zonaHoraria),
    ETIQUETA_ORIGEN[asistencia.origen],
    asistencia.es_retroactivo ? 'Sí' : 'No',
    ETIQUETA_ESTADO[asistencia.estado],
    asistencia.motivo_anulacion ?? '',
    asistencia.motivo_justificacion ? ETIQUETA_MOTIVO_JUSTIFICACION[asistencia.motivo_justificacion] : '',
    asistencia.nota_justificacion ?? '',
    tieneModificaciones(asistencia) ? 'Sí' : 'No',
    asistencia.nota ?? '',
  ];
  if (opciones.incluirContacto) {
    return [...base, fila.emailAlumno ?? '', fila.telefonoAlumno ?? ''];
  }
  return base;
}

/** Documento CSV completo del histórico exportado (requisito 3 de T-23): cabecera + una fila por
 * registro, en el mismo orden en que llegan `filas` (quien llama decide el orden de la consulta). */
export function generarCsvHistorico(
  filas: readonly FilaHistoricoResueltaConContacto[],
  opciones: OpcionesCsvHistorico = {},
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): string {
  return documentoCsv(
    cabecerasCsvHistorico(opciones),
    filas.map((fila) => filaCsvHistorico(fila, opciones, zonaHoraria)),
  );
}
