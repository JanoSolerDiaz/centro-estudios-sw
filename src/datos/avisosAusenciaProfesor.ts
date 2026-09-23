/**
 * Acceso a datos del aviso de ausencia del profesor (R-29): avisar y marcar atendido, las dos
 * EXCLUSIVAMENTE vía RPC (`avisar_ausencia_profesor`/`marcar_aviso_ausencia_atendido`,
 * `db/019_aviso_ausencia_profesor.sql`, `SECURITY DEFINER`) — mismo motivo de opacidad que
 * `excepcionesSlot.ts`/`pausasAlumno.ts`: la tabla `aviso_ausencia_profesor` no concede
 * INSERT/UPDATE directo a `authenticated`.
 *
 * Lectura, en cambio, es una consulta directa sobre la tabla: RLS ya resuelve quién ve qué
 * (`administrator` todos, `teacher` solo los suyos).
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { AvisoAusenciaProfesor } from '../dominio/tipos.ts';

const TABLA = 'aviso_ausencia_profesor';

/** Avisa de que el profesor que llama no podrá dar la sesión de `slotId` en `fechaSesion` (requisito
 * 2). La RPC comprueba, en la misma transacción: que el slot pertenezca al profesor que llama, que
 * la fecha caiga en el día de la semana del slot y que esté vigente esa fecha, y que la sesión no
 * sea ni pasada ni de hoy ya en curso. Un segundo aviso de la MISMA sesión (mismo profesor/fecha/
 * tramo horario) mientras el primero siga `pendiente` choca con el índice único parcial y llega
 * como `Conflicto` (requisito 5, `erroresDominio.ts`, resuelto por `postgrest.ts` a partir del
 * código de error de PostgREST). */
export async function avisarAusenciaProfesor(
  cliente: ClientePostgrest,
  slotId: string,
  fechaSesion: string,
  motivo?: string,
): Promise<AvisoAusenciaProfesor> {
  return cliente.rpc<AvisoAusenciaProfesor>('avisar_ausencia_profesor', {
    p_slot_id: slotId,
    p_fecha_sesion: fechaSesion,
    p_motivo: motivo ?? null,
  });
}

/** Marca `avisoId` como `atendido` (requisito 3), sin más acción asociada — cubre igual el caso de
 * que ya se resolvió por teléfono antes de que existiera esta pantalla. Rechazada por la RPC si el
 * aviso ya estaba atendido. */
export async function marcarAvisoAusenciaAtendido(cliente: ClientePostgrest, avisoId: string): Promise<AvisoAusenciaProfesor> {
  return cliente.rpc<AvisoAusenciaProfesor>('marcar_aviso_ausencia_atendido', { p_aviso_id: avisoId });
}

/** Todos los avisos `pendiente` (de cualquier profesor, RLS ya acota a lo que puede ver quien llama)
 * ordenados por `fecha_sesion` (requisito 3: "ordenados por fecha de la sesión afectada") — para el
 * bloque nuevo del panel de centro (R-11). */
export async function listarAvisosAusenciaPendientes(cliente: ClientePostgrest): Promise<readonly AvisoAusenciaProfesor[]> {
  return cliente.desde<AvisoAusenciaProfesor>(TABLA).eq('estado', 'pendiente').order('fecha_sesion').seleccionar();
}
