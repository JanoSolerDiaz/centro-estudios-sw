/**
 * Cierre de sesión por inactividad (R-35): reglas puras. Los plazos son constantes de dominio por
 * rol (valores de partida de la pregunta #19 de §6, ajustables sin migración). El cálculo trabaja
 * con marcas de tiempo en milisegundos que se le pasan (el reloj inyectable vive en `nucleo/`), así
 * que este fichero nunca lee la hora del sistema.
 *
 * `student` (y cualquier rol desconocido) no tiene plazo: no hay sesión útil que proteger.
 */

import type { Rol } from './tipos.ts';

const MINUTO_MS = 60 * 1000;

/** Aviso previo al cierre. */
export const AVISO_PREVIO_MS = 60 * 1000;

const PLAZOS_INACTIVIDAD_MS: Readonly<Record<'administrator' | 'teacher', number>> = {
  administrator: 20 * MINUTO_MS,
  // El profesor deja el móvil entre sesiones: un plazo corto le estorbaría en el uso más frecuente.
  teacher: 60 * MINUTO_MS,
};

export function plazoInactividadMs(rol: Rol): number | undefined {
  return rol === 'administrator' || rol === 'teacher' ? PLAZOS_INACTIVIDAD_MS[rol] : undefined;
}

export type EvaluacionInactividad =
  | { readonly estado: 'activa' }
  | { readonly estado: 'aviso'; readonly segundosRestantes: number }
  | { readonly estado: 'caducada' };

export interface EntradaEvaluacionInactividad {
  readonly plazoMs: number;
  readonly ultimaActividadMs: number;
  readonly ahoraMs: number;
}

/** `caducada` al cumplirse el plazo exacto; `aviso` durante el último `AVISO_PREVIO_MS` (con los
 * segundos restantes redondeados hacia arriba, nunca 0 mientras no haya caducado). Un reloj que
 * retrocede (ahora < última actividad) cuenta como sin inactividad. */
export function evaluarInactividad(entrada: EntradaEvaluacionInactividad): EvaluacionInactividad {
  const inactivoMs = Math.max(0, entrada.ahoraMs - entrada.ultimaActividadMs);
  const restanteMs = entrada.plazoMs - inactivoMs;
  if (restanteMs <= 0) {
    return { estado: 'caducada' };
  }
  if (restanteMs <= AVISO_PREVIO_MS) {
    return { estado: 'aviso', segundosRestantes: Math.ceil(restanteMs / 1000) };
  }
  return { estado: 'activa' };
}

export const MENSAJE_SESION_CERRADA_POR_INACTIVIDAD = 'Por seguridad, la sesión se cerró tras un rato sin actividad.';

/** Texto del aviso previo; menciona los registros sin enviar solo si los hay (requisito 4). */
export function textoAvisoInactividad(segundosRestantes: number, pendientes: number): string {
  const base = `Por seguridad, la sesión se cerrará en ${String(segundosRestantes)} s por falta de actividad.`;
  if (pendientes <= 0) {
    return base;
  }
  const registros = pendientes === 1 ? 'hay 1 registro sin enviar' : `hay ${String(pendientes)} registros sin enviar`;
  return `${base} Aunque ${registros}, se enviará${pendientes === 1 ? '' : 'n'} al volver a entrar.`;
}
