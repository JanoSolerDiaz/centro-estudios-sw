/**
 * Envío remoto de `evento_error` (T-05), vía la RPC `registrar_evento_error`, sobre el cliente
 * propio de PostgREST (`postgrest.ts`, T-08) — la única puerta hacia Supabase, en vez de construir
 * su propia petición `fetch` como hacía esta pieza antes de que ese cliente existiera. La tabla y
 * la RPC viven en `db/001_esquema_inicial.sql` (T-07); ver DECISIONES_TECNICAS.md para el contrato
 * exacto (nombre de la RPC y de sus parámetros) fijado por T-05 y que T-07 respeta.
 *
 * La RPC fija ella misma `registrado_en` y el autor (vía `auth.uid()`), igual que
 * `registrar_asistencia`: esta carga nunca los incluye.
 */

import type { CargaEventoError, EnviadorEventoError } from '../nucleo/informadorErrores.ts';
import { crearClientePostgrest, type OpcionesClientePostgrest } from './postgrest.ts';

export type ConfiguracionEnviadorEventoError = OpcionesClientePostgrest;

function cuerpoDeLaRpc(carga: CargaEventoError): Record<string, unknown> {
  const { origen, mensaje, pila, ...resto } = carga;
  return {
    p_origen: origen,
    p_mensaje: mensaje,
    p_pila: pila ?? null,
    p_contexto: Object.keys(resto).length > 0 ? resto : null,
  };
}

export function crearEnviadorEventoError(config: ConfiguracionEnviadorEventoError): EnviadorEventoError {
  const cliente = crearClientePostgrest(config);

  return async (carga) => {
    await cliente.rpc('registrar_evento_error', cuerpoDeLaRpc(carga));
  };
}
