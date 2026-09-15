/**
 * Acceso a datos de la pausa programada de un alumno (R-21): declarar, cancelar y acortar,
 * EXCLUSIVAMENTE vía RPC (`declarar_pausa_alumno`/`cancelar_pausa_alumno`/`acortar_pausa_alumno`,
 * `db/017_pausa_alumno.sql`, `SECURITY DEFINER`) — mismo motivo de opacidad que
 * `datos/excepcionesSlot.ts` (R-06): el requisito 4 ("nunca sobre un rango que se solape con un
 * registro de asistencia ya existente") protege la misma clase de invariante que la inmutabilidad de
 * `asistencia` (§0.2, "no reescribir historia"), así que se comprueba de forma atómica en el
 * servidor, no con un read-then-write en el cliente.
 *
 * Lectura, en cambio, es una consulta directa sobre la tabla: RLS ya resuelve quién ve qué
 * (`administrator` todas, `teacher` solo las activas de sus propios alumnos).
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { PausaAlumno } from '../dominio/tipos.ts';

const TABLA = 'pausa_alumno';

export interface DeclararPausaAlumnoEntrada {
  readonly alumnoId: string;
  /** `AAAA-MM-DD`, inclusive. */
  readonly fechaInicio: string;
  /** `AAAA-MM-DD`, inclusive. */
  readonly fechaFin: string;
  readonly motivo?: string | null;
}

/** Declara una pausa (requisito 1 de R-21). La RPC comprueba, en la misma transacción: que el
 * alumno exista, que el rango sea válido, que no se solape con una pausa ya activa del mismo
 * alumno, y que el alumno no tenga ya ningún registro de asistencia (entrada o ausencia) dentro del
 * rango (requisito 4). Cualquier rechazo llega como `ErrorDeValidacion`/`SinPermiso`
 * (`erroresDominio.ts`, resuelto por `postgrest.ts` a partir del código de error de PostgREST). */
export async function declararPausaAlumno(cliente: ClientePostgrest, entrada: DeclararPausaAlumnoEntrada): Promise<PausaAlumno> {
  return cliente.rpc<PausaAlumno>('declarar_pausa_alumno', {
    p_alumno_id: entrada.alumnoId,
    p_fecha_inicio: entrada.fechaInicio,
    p_fecha_fin: entrada.fechaFin,
    p_motivo: entrada.motivo ?? null,
  });
}

/** Cancela una pausa que todavía no ha empezado (requisito 5): queda `'anulada'` con motivo, nunca
 * borrada. Rechazada por la RPC si la pausa ya empezó — para eso está `acortarPausaAlumno`. */
export async function cancelarPausaAlumno(cliente: ClientePostgrest, pausaId: string, motivo: string): Promise<PausaAlumno> {
  return cliente.rpc<PausaAlumno>('cancelar_pausa_alumno', { p_pausa_id: pausaId, p_motivo: motivo });
}

/** Acorta una pausa EN CURSO adelantando su `fecha_fin` (requisito 5) — nunca hacia el pasado, y
 * nunca más allá de la fecha de fin actual (eso sería alargarla). Rechazada por la RPC si la pausa
 * todavía no ha empezado (usar `cancelarPausaAlumno`) o ya ha terminado. */
export async function acortarPausaAlumno(cliente: ClientePostgrest, pausaId: string, nuevaFechaFin: string): Promise<PausaAlumno> {
  return cliente.rpc<PausaAlumno>('acortar_pausa_alumno', { p_pausa_id: pausaId, p_nueva_fecha_fin: nuevaFechaFin });
}

/** Todas las pausas (cualquier estado) de `alumnoId` — para el bloque de la ficha de alumno (T-12,
 * requisito 5: "lista las pausas del alumno, pasadas, en curso y futuras"). Solo `administrator`
 * llega a llamarla: RLS le concede lectura de todas; un `teacher` que la intentara para un alumno
 * ajeno a sus slots simplemente no vería ninguna fila, salvo las activas de sus propios alumnos. */
export async function listarPausasDeAlumno(cliente: ClientePostgrest, alumnoId: string): Promise<readonly PausaAlumno[]> {
  return cliente.desde<PausaAlumno>(TABLA).eq('alumno_id', alumnoId).order('fecha_inicio', { descendente: true }).seleccionar();
}

/** Todas las pausas ACTIVAS de VARIOS alumnos a la vez, en una única petición (R-11, panel de
 * centro: cruza el rango elegido con los alumnos en alcance, nunca una petición por alumno) — misma
 * forma exacta que `listarSlotsDeAlumnos` (T-15/R-11). Con `alumnoIds` vacío no hace ninguna
 * petición. */
export async function listarPausasActivasDeAlumnos(cliente: ClientePostgrest, alumnoIds: readonly string[]): Promise<readonly PausaAlumno[]> {
  if (alumnoIds.length === 0) {
    return [];
  }
  return cliente.desde<PausaAlumno>(TABLA).in('alumno_id', alumnoIds).eq('estado', 'activa').seleccionar();
}

/** Todas las pausas ACTIVAS que afectan a los alumnos del `teacher` que llama (RLS,
 * `pausa_alumno_teacher_leer_de_sus_alumnos`) — usada por pasar lista (T-19) y «Mi horario» (T-22)
 * para saber, sin elegir alumno a mano, quién está en pausa hoy. Esta función no filtra por fecha:
 * el dominio (`dominio/pausaAlumno.ts`) decide qué pausa aplica a qué día. */
export async function listarPausasActivasDeMisAlumnos(cliente: ClientePostgrest): Promise<readonly PausaAlumno[]> {
  return cliente.desde<PausaAlumno>(TABLA).eq('estado', 'activa').seleccionar();
}
