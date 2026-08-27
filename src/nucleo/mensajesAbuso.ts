/**
 * Mensajes al usuario en español (T-06, requisito 4): "qué hacer, no el código de error". Cubre
 * los errores que introduce esta tarea (límite de tasa, cancelación/tiempo de espera agotado); la
 * traducción completa de errores de dominio (`NoAutenticado`, `SinPermiso`, `Conflicto`, etc.) es
 * de T-08, que puede ampliar esta función cuando esos tipos existan — no se inventan aquí.
 */

import { ErrorLimiteAlcanzado } from './limitadorTasa.ts';

const MENSAJE_POR_DEFECTO = 'No se ha podido completar la acción. Inténtalo de nuevo en unos segundos.';

function esErrorDeAborto(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function formatearSegundos(ms: number): string {
  const segundos = Math.max(1, Math.ceil(ms / 1000));
  return `${String(segundos)} segundo${segundos === 1 ? '' : 's'}`;
}

/** Traduce un error técnico a un mensaje accionable en español. No revela nunca el error original. */
export function mensajeAmigable(error: unknown): string {
  if (error instanceof ErrorLimiteAlcanzado) {
    return `Estás haciendo esta acción demasiado rápido. Espera ${formatearSegundos(error.reintentarEnMs)} e inténtalo de nuevo.`;
  }
  if (esErrorDeAborto(error)) {
    return 'La operación ha tardado demasiado o se ha cancelado. Comprueba tu conexión e inténtalo de nuevo.';
  }
  return MENSAJE_POR_DEFECTO;
}
