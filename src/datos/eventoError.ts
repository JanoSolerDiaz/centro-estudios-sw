/**
 * Envío remoto de `evento_error` (T-05), vía la RPC `registrar_evento_error`. La tabla y la RPC
 * no existen todavía: viajan en el script de esquema de T-07 (ver la nota de T-05 en
 * `HOJA_DE_RUTA.md`). Este módulo queda escrito y testeado contra un doble de `fetch`
 * (`crearFetchSimulado`, T-03) y **latente**: nadie lo conecta a `crearInformadorErrores` hasta
 * que T-08 tenga un cliente real con URL y clave anónima que inyectarle — ver
 * DECISIONES_TECNICAS.md para el contrato exacto (nombre de la RPC y de sus parámetros) que T-07
 * debe respetar al escribir la función SQL.
 *
 * La RPC fija ella misma `registrado_en` y el autor (vía `auth.uid()`), igual que
 * `registrar_asistencia`: esta carga nunca los incluye.
 */

import type { CargaEventoError, EnviadorEventoError } from '../nucleo/informadorErrores.ts';
import type { FetchSimulado } from './pruebas/dobleHttp.ts';

export interface ConfiguracionEnviadorEventoError {
  /** URL base del proyecto Supabase, p. ej. `https://xxxx.supabase.co` (sin barra final). */
  readonly urlBase: string;
  /** Clave anónima (`anon key`): la única credencial de Supabase permitida en el cliente. */
  readonly claveAnonima: string;
  /** Token de sesión del usuario autenticado, si lo hay: un error puede ocurrir sin sesión. */
  readonly obtenerTokenSesion?: () => string | undefined;
  /** Implementación de red inyectable; por defecto el `fetch` global (permitido en `src/datos/`). */
  readonly fetchImpl?: FetchSimulado;
}

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
  const fetchImpl = config.fetchImpl ?? fetch;

  return async (carga) => {
    const token = config.obtenerTokenSesion?.() ?? config.claveAnonima;
    const respuesta = await fetchImpl(`${config.urlBase}/rest/v1/rpc/registrar_evento_error`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: config.claveAnonima,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cuerpoDeLaRpc(carga)),
    });

    if (!respuesta.ok) {
      throw new Error(`registrar_evento_error respondió con estado ${String(respuesta.status)}`);
    }
  };
}
