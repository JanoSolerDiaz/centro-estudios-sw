/**
 * Cliente propio de Supabase Storage (T-08, requisito 3), para el bucket de avatares (T-14):
 * subida, borrado, URL firmada individual y **firma en lote de varias rutas en una sola
 * petición** — este último no es un extra, es lo que hace viable pedir de una vez las fotos de
 * todos los alumnos de un slot al abrir la pantalla de pasar lista (T-19, §0.2: "las URL firmadas
 * de una pantalla se piden SIEMPRE en lote, en una sola petición"). Comparte con `postgrest.ts` el
 * mismo manejo de errores (`peticionHttp.ts`/`erroresDominio.ts`): un fallo de red o una respuesta
 * no exitosa se traducen igual en las dos capas.
 *
 * **El bucket es siempre privado** (§0.2): este cliente nunca construye ni expone una URL pública,
 * solo firmadas de vida corta que Storage genera bajo demanda. La base de datos guarda la RUTA
 * (`avatar_ruta`), nunca una de estas URL, que caducan.
 *
 * Endpoints usados, sin poder verificarse contra documentación en vivo en esta sesión (mismo
 * aviso, y mismo motivo — sin salida de red a `supabase.com` —, que T-06/T-07 dejaron para GoTrue y
 * la Management API): `POST /storage/v1/object/{bucket}/{ruta}` (subida), `DELETE
 * /storage/v1/object/{bucket}` con `{ prefixes }` (borrado, individual o en lote), `POST
 * /storage/v1/object/sign/{bucket}/{ruta}` con `{ expiresIn }` (firma individual, responde
 * `{ signedURL }`), `POST /storage/v1/object/sign/{bucket}` con `{ expiresIn, paths }` (firma en
 * lote, responde un array de `{ path, signedURL, error }`). Si `npm run migrate`/la pantalla de
 * avatares da un `404` o una forma de respuesta inesperada en Storage, este es el primer
 * sospechoso — la guarda está aislada en las cuatro funciones de abajo, cambiar la ruta o la forma
 * del cuerpo si hace falta es un cambio local, no una reescritura.
 */

import type { FetchSimulado } from './pruebas/dobleHttp.ts';
import { leerCuerpoJson, ErrorDelServidor } from './erroresDominio.ts';
import { peticionAutenticada, type OpcionesAutenticacion } from './peticionHttp.ts';

export interface ArchivoParaSubir {
  readonly datos: Blob | ArrayBuffer | Uint8Array;
  readonly tipoContenido: string;
}

export interface UrlFirmada {
  readonly ruta: string;
  readonly url: string;
}

export interface OpcionesClienteAlmacenamiento {
  readonly urlBase: string;
  readonly claveAnonima: string;
  readonly obtenerTokenSesion?: () => string | undefined;
  readonly fetchImpl?: FetchSimulado;
}

export interface ClienteAlmacenamiento {
  /** Sube `archivo` a `bucket`/`ruta`. Sin `opciones.sobrescribir`, una ruta ya existente da
   * `Conflicto` (`erroresDominio.ts`); con él, la reemplaza — quien reemplaza un avatar es
   * responsable de borrar las derivadas anteriores (§0.2), esta función no lo hace por su cuenta. */
  subir(bucket: string, ruta: string, archivo: ArchivoParaSubir, opciones?: { readonly sobrescribir?: boolean }): Promise<void>;
  /** Borra una o varias rutas de `bucket` en una sola petición. */
  eliminar(bucket: string, rutas: readonly string[]): Promise<void>;
  urlFirmada(bucket: string, ruta: string, segundosValidez: number): Promise<string>;
  /** Firma varias rutas de `bucket` en una sola petición HTTP — ver la nota de cabecera del
   * módulo sobre por qué esto es un requisito, no una optimización. */
  urlFirmadasEnLote(bucket: string, rutas: readonly string[], segundosValidez: number): Promise<readonly UrlFirmada[]>;
}

interface RespuestaFirmaLote {
  readonly path?: unknown;
  readonly signedURL?: unknown;
  readonly error?: unknown;
}

function normalizarUrlFirmada(urlBase: string, signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) {
    return signedUrl;
  }
  return `${urlBase}/storage/v1${signedUrl.startsWith('/') ? '' : '/'}${signedUrl}`;
}

export function crearClienteAlmacenamiento(opcionesEntrada: OpcionesClienteAlmacenamiento): ClienteAlmacenamiento {
  const opciones: OpcionesAutenticacion = {
    urlBase: opcionesEntrada.urlBase,
    claveAnonima: opcionesEntrada.claveAnonima,
    fetchImpl: opcionesEntrada.fetchImpl ?? fetch,
    // Ver el mismo comentario en `postgrest.ts`: `exactOptionalPropertyTypes` exige omitir la
    // clave, no copiar un valor que podría ser `undefined`.
    ...(opcionesEntrada.obtenerTokenSesion !== undefined
      ? { obtenerTokenSesion: opcionesEntrada.obtenerTokenSesion }
      : {}),
  };

  return {
    async subir(bucket, ruta, archivo, opcionesSubida) {
      await peticionAutenticada(opciones, 'POST', `/storage/v1/object/${bucket}/${ruta}`, {
        cuerpoCrudo: archivo.datos,
        cabecerasExtra: {
          'content-type': archivo.tipoContenido,
          ...(opcionesSubida?.sobrescribir ? { 'x-upsert': 'true' } : {}),
        },
      });
    },

    async eliminar(bucket, rutas) {
      await peticionAutenticada(opciones, 'DELETE', `/storage/v1/object/${bucket}`, {
        cuerpoJson: { prefixes: rutas },
      });
    },

    async urlFirmada(bucket, ruta, segundosValidez) {
      const respuesta = await peticionAutenticada(opciones, 'POST', `/storage/v1/object/sign/${bucket}/${ruta}`, {
        cuerpoJson: { expiresIn: segundosValidez },
      });
      const { valor, malformado } = await leerCuerpoJson(respuesta);
      const signedUrl =
        !malformado && typeof valor === 'object' && valor !== null ? (valor as { signedURL?: unknown }).signedURL : undefined;
      if (typeof signedUrl !== 'string') {
        throw new ErrorDelServidor('El servidor ha devuelto una respuesta que no se puede interpretar.');
      }
      return normalizarUrlFirmada(opciones.urlBase, signedUrl);
    },

    async urlFirmadasEnLote(bucket, rutas, segundosValidez) {
      const respuesta = await peticionAutenticada(opciones, 'POST', `/storage/v1/object/sign/${bucket}`, {
        cuerpoJson: { expiresIn: segundosValidez, paths: rutas },
      });
      const { valor, malformado } = await leerCuerpoJson(respuesta);
      if (malformado || !Array.isArray(valor)) {
        throw new ErrorDelServidor('El servidor ha devuelto una respuesta que no se puede interpretar.');
      }
      return (valor as readonly RespuestaFirmaLote[]).map((entrada) => {
        if (typeof entrada.path !== 'string' || typeof entrada.signedURL !== 'string') {
          throw new ErrorDelServidor('El servidor ha devuelto una respuesta que no se puede interpretar.');
        }
        return { ruta: entrada.path, url: normalizarUrlFirmada(opciones.urlBase, entrada.signedURL) };
      });
    },
  };
}
