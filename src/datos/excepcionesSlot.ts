/**
 * Acceso a datos de las excepciones de slot (R-06): declarar (sustitución/cancelación) y
 * desactivar, ambas EXCLUSIVAMENTE vía RPC (`declarar_excepcion_slot`/`desactivar_excepcion_slot`,
 * `db/013_excepcion_slot.sql`, `SECURITY DEFINER`) — a diferencia de `cierresCentro.ts`/
 * `slotsHorario.ts`, la tabla `excepcion_slot` no concede INSERT/UPDATE directo a `authenticated`:
 * el requisito 5 de R-06 ("nunca retroactiva sobre un slot que ya tiene registros ese día") protege
 * la misma clase de invariante que la inmutabilidad de `asistencia` (§0.2, "no reescribir
 * historia"), así que se comprueba de forma atómica en el servidor, no con un read-then-write en el
 * cliente.
 *
 * Lectura, en cambio, es una consulta directa sobre la tabla: RLS ya resuelve quién ve qué
 * (`administrator` todas, `teacher` solo las suyas —como titular o como sustituto—, activas).
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { ExcepcionSlot, TipoExcepcionSlot } from '../dominio/tipos.ts';
import type { SlotConAlumno } from '../dominio/slots.ts';

const TABLA = 'excepcion_slot';

export interface DeclararExcepcionSlotEntrada {
  readonly slotId: string;
  readonly fecha: string;
  readonly tipo: TipoExcepcionSlot;
  /** Obligatorio si `tipo === 'sustitucion'`; rechazado por la RPC en cualquier otro caso. */
  readonly profesorSustitutoId?: string | null;
  /** Obligatorio si `tipo === 'cancelacion'`; rechazado por la RPC en cualquier otro caso. */
  readonly motivo?: string | null;
}

/** Declara una excepción (requisito 1 de R-06). La RPC comprueba, en la misma transacción: que la
 * fecha caiga en el día de la semana del slot, que el slot esté vigente esa fecha, la coherencia
 * tipo/sustituto/motivo, y que ese slot no tenga ya ningún registro de asistencia esa fecha
 * (requisito 5). Cualquier rechazo llega como `ErrorDeValidacion`/`SinPermiso` (`erroresDominio.ts`,
 * resuelto por `postgrest.ts` a partir del código de error de PostgREST). */
export async function declararExcepcionSlot(cliente: ClientePostgrest, entrada: DeclararExcepcionSlotEntrada): Promise<ExcepcionSlot> {
  return cliente.rpc<ExcepcionSlot>('declarar_excepcion_slot', {
    p_slot_id: entrada.slotId,
    p_fecha: entrada.fecha,
    p_tipo: entrada.tipo,
    p_profesor_sustituto_id: entrada.profesorSustitutoId ?? null,
    p_motivo: entrada.motivo ?? null,
  });
}

/** Desactiva una excepción ya declarada (revierte al horario normal) — rechazada por la RPC si ese
 * slot ya tiene algún registro de asistencia esa fecha (requisito 5, misma comprobación que al
 * declarar: no se puede "deshacer" un día que ya ocurrió de verdad). */
export async function desactivarExcepcionSlot(cliente: ClientePostgrest, excepcionId: string): Promise<ExcepcionSlot> {
  return cliente.rpc<ExcepcionSlot>('desactivar_excepcion_slot', { p_excepcion_id: excepcionId });
}

/** Todas las excepciones ACTIVAS de `slotId` (cualquier fecha) — usa «Registros»
 * (`pantallaRegistrosSlot.ts`) para saber si el día elegido ya tiene una declarada, y ofrecer
 * declarar una nueva o desactivar la existente en consecuencia. */
export async function listarExcepcionesDeSlot(cliente: ClientePostgrest, slotId: string): Promise<readonly ExcepcionSlot[]> {
  return cliente.desde<ExcepcionSlot>(TABLA).eq('slot_id', slotId).eq('activo', true).seleccionar();
}

const SELECT_CON_SLOT = '*,slot:slot_horario(*,alumno:alumno(id,nombre,primer_apellido,segundo_apellido,avatar_ruta,activo))';

export interface ExcepcionSlotConSlot extends ExcepcionSlot {
  readonly slot: SlotConAlumno;
}

/** Todas las excepciones ACTIVAS de `fecha` relevantes para el `teacher` que llama —como titular
 * del slot o como sustituto nombrado—, con el slot y su alumno embebidos en una única petición
 * (requisito 2 de R-06: el motor de propuesta necesita esos datos para poder ofrecer el slot
 * sustituido en pasar lista, T-17/T-19). RLS resuelve el alcance
 * (`excepcion_slot_teacher_leer_relacionadas`, `013_excepcion_slot.sql`): esta función no filtra
 * por profesor, solo por fecha — un `administrator` que la llamara vería TODAS las de esa fecha
 * (no tiene "las suyas"), pero solo `teacher` la usa hoy (T-19 «pasar lista», T-22 «Mi horario»). */
export async function listarExcepcionesDelDiaParaProfesor(cliente: ClientePostgrest, fecha: string): Promise<readonly ExcepcionSlotConSlot[]> {
  return cliente.desde<ExcepcionSlotConSlot>(TABLA).eq('fecha', fecha).eq('activo', true).seleccionar(SELECT_CON_SLOT);
}
