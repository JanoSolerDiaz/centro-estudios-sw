/**
 * Cancelación de peticiones obsoletas y tiempos de espera (T-06, requisito 3), sobre
 * `AbortController`/`AbortSignal` nativos — sin dependencia nueva. La operación recibe la señal y
 * es responsable de propagarla (a `fetch`, típicamente, en la capa `src/datos/**`, T-08) y de
 * rechazar con el `AbortError` estándar cuando se dispara: estas funciones no inventan su propio
 * tipo de error de cancelación.
 */

export type OperacionCancelable<T> = (señal: AbortSignal) => Promise<T>;

/**
 * Devuelve un ejecutor de "solo la última petición importa": cada llamada nueva aborta la anterior
 * antes de empezar. Pensado para una pantalla donde un cambio de filtro o de pestaña deja obsoleta
 * la petición en curso (p. ej. cambiar de slot en pasar lista antes de que la petición anterior
 * haya vuelto).
 */
export function crearEjecutorUltimaPeticion<T>(): (operacion: OperacionCancelable<T>) => Promise<T> {
  let controladorActual: AbortController | null = null;

  return (operacion) => {
    controladorActual?.abort();
    const controlador = new AbortController();
    controladorActual = controlador;
    return operacion(controlador.signal);
  };
}

/** `true` si `error` es la cancelación deliberada de una petición (el `AbortError` estándar que
 * `fetch` rechaza cuando su señal se dispara), no un fallo real. `mensajesAbuso.ts` (T-06) lo usa
 * para dar un mensaje de "se ha cancelado"; una búsqueda con rebote que queda obsoleta porque llegó
 * una tecla nueva (T-20, `crearEjecutorUltimaPeticion` de arriba) debe usarlo para lo contrario:
 * ignorar el error por completo, nunca mostrarlo — la petición nueva es la que manda. */
export function esErrorDeCancelacion(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Aborta `operacion` si no ha resuelto (ni rechazado) dentro de `ms`. */
export async function conTiempoDeEspera<T>(operacion: OperacionCancelable<T>, ms: number): Promise<T> {
  const controlador = new AbortController();
  const idTemporizador = setTimeout(() => {
    controlador.abort();
  }, ms);

  try {
    return await operacion(controlador.signal);
  } finally {
    clearTimeout(idTemporizador);
  }
}
