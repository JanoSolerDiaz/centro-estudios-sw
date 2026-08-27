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
