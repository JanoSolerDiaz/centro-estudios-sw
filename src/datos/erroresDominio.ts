/**
 * Taxonomía de errores de dominio (T-08, requisito 4): todo fallo que llega desde PostgREST,
 * GoTrue o Storage se traduce a uno de estos tipos antes de salir de `src/datos/**`, para que el
 * resto de la aplicación nunca tenga que mirar un código de estado HTTP ni el cuerpo crudo de una
 * respuesta. Un `403` de RLS, por ejemplo, siempre llega como `SinPermiso`, nunca como un `Error`
 * genérico con el texto de Postgres dentro. `mensajesAbuso.ts` (T-06) es quien traduce estos tipos
 * a un mensaje en español para la interfaz; este módulo solo los distingue.
 *
 * Desde T-18, `errorDeRespuesta` también traduce un `429` (límite de tasa del lado del servidor,
 * `aplicar_limite_tasa`/`registrar_asistencia` en `db/005_rpc_registrar_asistencia.sql`) a
 * `ErrorLimiteAlcanzado` — la MISMA clase que T-06 ya usa para el límite de cliente, reutilizada en
 * vez de añadir una novena clase a la taxonomía cerrada de ocho de T-08. Ver DECISIONES_TECNICAS.md:
 * el mapeo SQLSTATE `PT429`→HTTP 429 de PostgREST no se ha podido verificar contra documentación en
 * vivo en esta sesión (mismo motivo que el endpoint de la Management API en T-07); la degradación si
 * no se cumple es seguir devolviendo un error (el límite se aplica igual, la inserción no llega a
 * ejecutarse), solo con una clasificación menos precisa.
 */

import { ErrorLimiteAlcanzado } from '../nucleo/limitadorTasa.ts';

export class NoAutenticado extends Error {
  constructor(mensaje = 'No has iniciado sesión, o tu sesión ha caducado.') {
    super(mensaje);
    this.name = 'NoAutenticado';
  }
}

export class SinPermiso extends Error {
  constructor(mensaje = 'No tienes permiso para realizar esta acción.') {
    super(mensaje);
    this.name = 'SinPermiso';
  }
}

export class Conflicto extends Error {
  constructor(mensaje = 'La operación entra en conflicto con datos ya existentes.') {
    super(mensaje);
    this.name = 'Conflicto';
  }
}

export class ErrorDeValidacion extends Error {
  constructor(mensaje = 'Los datos enviados no son válidos.') {
    super(mensaje);
    this.name = 'ErrorDeValidacion';
  }
}

export class ErrorDeRed extends Error {
  constructor(mensaje = 'No se ha podido conectar. Comprueba tu conexión a internet.') {
    super(mensaje);
    this.name = 'ErrorDeRed';
  }
}

export class ErrorDelServidor extends Error {
  constructor(mensaje = 'El servidor no ha podido completar la operación. Inténtalo de nuevo.') {
    super(mensaje);
    this.name = 'ErrorDelServidor';
  }
}

export class FicheroDemasiadoGrande extends Error {
  constructor(mensaje = 'El fichero supera el tamaño máximo permitido.') {
    super(mensaje);
    this.name = 'FicheroDemasiadoGrande';
  }
}

export class TipoDeFicheroNoPermitido extends Error {
  constructor(mensaje = 'El tipo de fichero no está permitido.') {
    super(mensaje);
    this.name = 'TipoDeFicheroNoPermitido';
  }
}

/** Cota superior conservadora para `ErrorLimiteAlcanzado.reintentarEnMs` cuando el `429` viene del
 * servidor: el tamaño íntegro de la ventana del contrato de T-06/T-18 (60 operaciones por profesor
 * y MINUTO), no el resto exacto de la ventana — este módulo no tiene forma de conocerlo sin que la
 * RPC exponga una cabecera `Retry-After` (deliberadamente no implementado, ver DECISIONES_TECNICAS.md). */
export const REINTENTAR_MS_POR_DEFECTO_LIMITE_SERVIDOR = 60_000;

/** Cualquier error tipado de este módulo — el conjunto exacto que exige el requisito 4 de T-08. */
export type ErrorDeDominioSupabase =
  | NoAutenticado
  | SinPermiso
  | Conflicto
  | ErrorDeValidacion
  | ErrorDeRed
  | ErrorDelServidor
  | FicheroDemasiadoGrande
  | TipoDeFicheroNoPermitido;

/** Resultado de intentar interpretar el cuerpo de una `Response` como JSON: distingue "sin
 * cuerpo" (`204`, `DELETE`) de "cuerpo que no se pudo interpretar", que son casos distintos para
 * quien llama (un cuerpo vacío es normal; uno malformado es un fallo del servidor). */
export interface CuerpoLeido {
  readonly valor: unknown;
  readonly malformado: boolean;
}

export async function leerCuerpoJson(respuesta: Response): Promise<CuerpoLeido> {
  const texto = await respuesta.text();
  if (texto.length === 0) {
    return { valor: undefined, malformado: false };
  }
  try {
    return { valor: JSON.parse(texto) as unknown, malformado: false };
  } catch {
    return { valor: undefined, malformado: true };
  }
}

function mensajePostgrestDe(valor: unknown): string | undefined {
  if (typeof valor !== 'object' || valor === null) {
    return undefined;
  }
  const { message } = valor as { message?: unknown };
  return typeof message === 'string' && message.length > 0 ? message : undefined;
}

/** Traduce una `Response` HTTP no exitosa (`!respuesta.ok`) de PostgREST, GoTrue o Storage a un
 * error de dominio tipado, a partir de su código de estado y, cuando lo hay, el `message` que
 * Postgres/PostgREST incluyen en el cuerpo. Nunca lanza: devuelve el error para que quien llama lo
 * lance con el `throw` que corresponda a su propio contexto. */
export async function errorDeRespuesta(
  respuesta: Response,
): Promise<ErrorDeDominioSupabase | ErrorLimiteAlcanzado> {
  const { valor } = await leerCuerpoJson(respuesta);
  const mensaje = mensajePostgrestDe(valor);

  switch (respuesta.status) {
    case 401:
      return new NoAutenticado();
    case 403:
      return new SinPermiso();
    case 409:
      return new Conflicto(mensaje ?? 'La operación entra en conflicto con datos ya existentes.');
    case 400:
    case 422:
      return new ErrorDeValidacion(mensaje ?? 'Los datos enviados no son válidos.');
    case 413:
      return new FicheroDemasiadoGrande();
    case 415:
      return new TipoDeFicheroNoPermitido();
    case 429:
      return new ErrorLimiteAlcanzado(REINTENTAR_MS_POR_DEFECTO_LIMITE_SERVIDOR);
    default:
      return respuesta.status >= 500
        ? new ErrorDelServidor()
        : new ErrorDelServidor(`Respuesta inesperada del servidor (estado ${String(respuesta.status)}).`);
  }
}

/** `fetch` rechaza con un `TypeError` cuando la petición no puede ni siquiera llegar a la red
 * (DNS, CORS, sin conexión) — a diferencia de un `AbortError` (`DOMException`), que es una
 * cancelación deliberada (T-06, `controlPeticion.ts`) y debe propagarse tal cual, no traducirse. */
export function esFalloDeRed(error: unknown): boolean {
  return error instanceof TypeError;
}
