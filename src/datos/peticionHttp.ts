/**
 * Petición HTTP autenticada compartida por `postgrest.ts` y `almacenamiento.ts` (T-08): las
 * cabeceras `apikey`/`authorization` (token de sesión si lo hay, si no la clave anónima — mismo
 * criterio que ya usaba `crearEnviadorEventoError`, T-05), la traducción de un fallo de red a
 * `ErrorDeRed` (sin tocar un `AbortError`, que se propaga tal cual, T-06) y la traducción de toda
 * respuesta no exitosa a un error de dominio tipado (`erroresDominio.ts`). Cada módulo llamante
 * decide su propio cuerpo (JSON para PostgREST y para las operaciones de Storage que no suben un
 * fichero; binario para la subida) y sus cabeceras adicionales (`Prefer`/`Range` en PostgREST,
 * `x-upsert`/`content-type` del fichero en Storage).
 */

import type { FetchSimulado } from './pruebas/dobleHttp.ts';
import { errorDeRespuesta, esFalloDeRed, ErrorDeRed } from './erroresDominio.ts';

export interface OpcionesAutenticacion {
  readonly urlBase: string;
  readonly claveAnonima: string;
  readonly obtenerTokenSesion?: () => string | undefined;
  readonly fetchImpl: FetchSimulado;
}

export interface OpcionesPeticionHttp {
  /** Se serializa con `JSON.stringify` y fija `content-type: application/json`. Incompatible con
   * `cuerpoCrudo`. */
  readonly cuerpoJson?: unknown;
  /** Cuerpo binario ya preparado (subida de fichero a Storage); quien llama fija su propio
   * `content-type` en `cabecerasExtra`. Incompatible con `cuerpoJson`. Tipado más estrecho que
   * `BodyInit` (que incluye `URLSearchParams`/`ReadableStream`, que este proyecto no usa como
   * cuerpo) porque la versión de `@types/node` de esta sesión no unifica bien `BodyInit` con los
   * `TypedArray` genéricos de TS 5.9 — se convierte a `BodyInit` en el único punto donde hace
   * falta, justo antes de pasarlo a `fetch`. */
  readonly cuerpoCrudo?: Blob | ArrayBuffer | Uint8Array;
  readonly cabecerasExtra?: Readonly<Record<string, string>>;
  /** Propagada tal cual a `fetchImpl` (T-20, `nucleo/controlPeticion.ts`): quien llama decide
   * cuándo abortar, este módulo no inventa su propio mecanismo de cancelación. Un `AbortError`
   * (`DOMException`, no `TypeError`) no pasa por `esFalloDeRed` y se propaga sin traducir. */
  readonly señal?: AbortSignal;
}

export async function peticionAutenticada(
  opciones: OpcionesAutenticacion,
  metodo: string,
  ruta: string,
  init: OpcionesPeticionHttp = {},
): Promise<Response> {
  const token = opciones.obtenerTokenSesion?.() ?? opciones.claveAnonima;
  const cabeceras: Record<string, string> = {
    apikey: opciones.claveAnonima,
    authorization: `Bearer ${token}`,
    ...init.cabecerasExtra,
  };

  let cuerpo: string | Blob | ArrayBuffer | Uint8Array | undefined;
  if (init.cuerpoJson !== undefined) {
    cabeceras['content-type'] = 'application/json';
    cuerpo = JSON.stringify(init.cuerpoJson);
  } else if (init.cuerpoCrudo !== undefined) {
    cuerpo = init.cuerpoCrudo;
  }

  let respuesta: Response;
  try {
    respuesta = await opciones.fetchImpl(`${opciones.urlBase}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      // `exactOptionalPropertyTypes`: `body`/`signal` no admiten `undefined` explícito, así que la
      // clave se omite del todo cuando no hay cuerpo o no se pidió señal de cancelación.
      ...(cuerpo !== undefined ? { body: cuerpo as BodyInit } : {}),
      ...(init.señal !== undefined ? { signal: init.señal } : {}),
    });
  } catch (error) {
    if (esFalloDeRed(error)) {
      throw new ErrorDeRed();
    }
    throw error;
  }

  if (!respuesta.ok) {
    throw await errorDeRespuesta(respuesta);
  }

  return respuesta;
}
