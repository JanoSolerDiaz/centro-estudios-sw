/**
 * Acceso a datos de la baja programada de un profesor (R-22): declarar, cancelar y acortar,
 * EXCLUSIVAMENTE vía RPC (`declarar_baja_profesor`/`cancelar_baja_profesor`/`acortar_baja_profesor`,
 * `db/018_baja_profesor.sql`, `SECURITY DEFINER`) — mismo motivo de opacidad que
 * `datos/pausasAlumno.ts` (R-21) y `datos/excepcionesSlot.ts` (R-06): la comprobación de qué
 * combinaciones (slot, fecha) quedan excluidas (requisito 3, "ya tiene registros de asistencia") se
 * hace de forma atómica en el servidor, no con un read-then-write en el cliente. `declarar_baja_profesor`
 * reutiliza `declarar_excepcion_slot` internamente para CADA combinación que no excluye (requisito 2:
 * "ninguna RPC nueva de escritura de excepción... esta tarea solo orquesta llamadas repetidas a la ya
 * existente") — desde el punto de vista del cliente es una única llamada que crea todas las
 * excepciones de la baja en la misma transacción.
 *
 * Lectura, en cambio, es una consulta directa sobre `baja_profesor` (RLS: exclusiva de
 * `administrator`, ver `db/018_baja_profesor.sql`) o sobre `excepcion_slot` filtrando por
 * `baja_profesor_id` (para listar/mostrar juntas las excepciones de una misma baja, requisito 4).
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { BajaProfesor, ExcepcionSlot, TipoExcepcionSlot } from '../dominio/tipos.ts';

const TABLA = 'baja_profesor';
const TABLA_EXCEPCIONES = 'excepcion_slot';

export interface DeclararBajaProfesorEntrada {
  readonly profesorId: string;
  /** `AAAA-MM-DD`, inclusive. */
  readonly fechaInicio: string;
  /** `AAAA-MM-DD`, inclusive. */
  readonly fechaFin: string;
  readonly tipo: TipoExcepcionSlot;
  /** Obligatorio si `tipo === 'sustitucion'`; rechazado por la RPC en cualquier otro caso. */
  readonly profesorSustitutoId?: string | null;
  /** Obligatorio si `tipo === 'cancelacion'`; rechazado por la RPC en cualquier otro caso. */
  readonly motivo?: string | null;
}

/** Una fila del resultado de `declarar_baja_profesor` — una por cada combinación (slot, fecha) que
 * la RPC evaluó, más una fila "centinela" (`slotId`/`fecha`/`excepcionId`/`excluido` todos `null`) si
 * el profesor no tiene NINGÚN slot que caiga en el rango, para que quien llama siempre pueda leer
 * `bajaProfesorId` aunque no se haya generado ninguna excepción. */
export interface FilaResultadoBajaProfesor {
  readonly bajaProfesorId: string;
  readonly slotId: string | null;
  readonly fecha: string | null;
  readonly excepcionId: string | null;
  readonly excluido: boolean | null;
  readonly motivoExclusion: string | null;
}

/** Nombres tal como los devuelve `declarar_baja_profesor` (`db/018_baja_profesor.sql`): con prefijo
 * `out_` para no chocar con columnas reales de `excepcion_slot`/`asistencia` que la RPC consulta
 * internamente (ver el comentario de esa migración, sección 4). */
interface FilaResultadoBajaProfesorCruda {
  readonly out_baja_profesor_id: string;
  readonly out_slot_id: string | null;
  readonly out_fecha: string | null;
  readonly out_excepcion_id: string | null;
  readonly out_excluido: boolean | null;
  readonly out_motivo_exclusion: string | null;
}

function aplanarFilaResultado(fila: FilaResultadoBajaProfesorCruda): FilaResultadoBajaProfesor {
  return {
    bajaProfesorId: fila.out_baja_profesor_id,
    slotId: fila.out_slot_id,
    fecha: fila.out_fecha,
    excepcionId: fila.out_excepcion_id,
    excluido: fila.out_excluido,
    motivoExclusion: fila.out_motivo_exclusion,
  };
}

/** Declara una baja (requisito 1 de R-22) y, en la misma transacción, crea una excepción de slot
 * (`declarar_excepcion_slot`, reutilizada tal cual) por cada combinación (slot, fecha) del profesor
 * que caiga en el rango y no tenga ya un registro de asistencia o una excepción activa ese día
 * (requisito 2/3) — devuelve una fila por combinación evaluada, para que la pantalla informe cuántas
 * se crearon y cuáles quedaron excluidas y por qué. Cualquier rechazo de la baja en sí (rango
 * invertido, sustituto inválido, motivo de cancelación vacío) llega como `ErrorDeValidacion`/
 * `SinPermiso` (`erroresDominio.ts`). */
export async function declararBajaProfesor(
  cliente: ClientePostgrest,
  entrada: DeclararBajaProfesorEntrada,
): Promise<readonly FilaResultadoBajaProfesor[]> {
  const filas = await cliente.rpc<readonly FilaResultadoBajaProfesorCruda[]>('declarar_baja_profesor', {
    p_profesor_id: entrada.profesorId,
    p_fecha_inicio: entrada.fechaInicio,
    p_fecha_fin: entrada.fechaFin,
    p_tipo: entrada.tipo,
    p_profesor_sustituto_id: entrada.profesorSustitutoId ?? null,
    p_motivo: entrada.motivo ?? null,
  });
  return filas.map(aplanarFilaResultado);
}

/** Cancela una baja que todavía no ha empezado (requisito 5): queda `'anulada'` con motivo, y anula
 * en bloque todas las excepciones futuras que generó — nunca borrada. Rechazada por la RPC si la
 * baja ya empezó (usar `acortarBajaProfesor`). */
export async function cancelarBajaProfesor(cliente: ClientePostgrest, bajaId: string, motivo: string): Promise<BajaProfesor> {
  return cliente.rpc<BajaProfesor>('cancelar_baja_profesor', { p_baja_id: bajaId, p_motivo: motivo });
}

/** Acorta una baja EN CURSO adelantando su `fecha_fin` (requisito 5) — anula las excepciones de los
 * días que quedan fuera del nuevo rango, nunca las de un día ya pasado. Rechazada por la RPC si la
 * baja todavía no ha empezado (usar `cancelarBajaProfesor`) o ya ha terminado. */
export async function acortarBajaProfesor(cliente: ClientePostgrest, bajaId: string, nuevaFechaFin: string): Promise<BajaProfesor> {
  return cliente.rpc<BajaProfesor>('acortar_baja_profesor', { p_baja_id: bajaId, p_nueva_fecha_fin: nuevaFechaFin });
}

/** Todas las bajas (cualquier estado) de `profesorId` — para la pantalla de gestión (requisito 4:
 * "poder listarlas... desde una única pantalla"). Solo `administrator` llega a llamarla: RLS
 * (`db/018_baja_profesor.sql`) no concede ninguna lectura a `teacher` sobre esta tabla — un `teacher`
 * ve el EFECTO de la baja (las excepciones de slot que generó) en «Mi horario» (T-22), nunca la baja
 * en sí. */
export async function listarBajasDeProfesor(cliente: ClientePostgrest, profesorId: string): Promise<readonly BajaProfesor[]> {
  return cliente.desde<BajaProfesor>(TABLA).eq('profesor_id', profesorId).order('fecha_inicio', { descendente: true }).seleccionar();
}

/** Todas las excepciones de slot (activas o no) que `declarar_baja_profesor` generó para `bajaId`
 * (requisito 4: "poder... cancelarlas juntas desde una única pantalla") — un día editado
 * individualmente después (requisito 6) sigue apareciendo aquí aunque su `tipo`/sustituto/motivo ya
 * no coincida con el de la baja. */
export async function listarExcepcionesDeBaja(cliente: ClientePostgrest, bajaId: string): Promise<readonly ExcepcionSlot[]> {
  return cliente.desde<ExcepcionSlot>(TABLA_EXCEPCIONES).eq('baja_profesor_id', bajaId).order('fecha', { descendente: false }).seleccionar();
}
