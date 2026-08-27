/**
 * Retroceso exponencial acotado (T-06, requisito 3), con `Temporizador` inyectado. El límite de
 * uso está pensado SOLO para operaciones idempotentes (lecturas, o escrituras protegidas por
 * `peticion_id` único como `registrar_asistencia`, T-18): reintentar a ciegas una escritura no
 * idempotente puede duplicar el efecto en el servidor, algo que la spec de T-06 prohíbe
 * explícitamente. Quien llama a `reintentarConRetroceso` es responsable de esa distinción; esta
 * función no la puede inferir del tipo de `operacion`.
 */

import type { Temporizador } from './temporizador.ts';

export interface OpcionesReintento {
  /** Número total de intentos, incluido el primero (no solo los reintentos). Mínimo 1. */
  readonly intentosMaximos: number;
  readonly retrasoBaseMs: number;
  readonly retrasoMaximoMs: number;
  readonly temporizador: Temporizador;
}

export async function reintentarConRetroceso<T>(
  operacion: () => Promise<T>,
  opciones: OpcionesReintento,
): Promise<T> {
  const { intentosMaximos, retrasoBaseMs, retrasoMaximoMs, temporizador } = opciones;

  let ultimoError: unknown;
  for (let intento = 0; intento < intentosMaximos; intento += 1) {
    try {
      return await operacion();
    } catch (error) {
      ultimoError = error;
      if (intento === intentosMaximos - 1) {
        break;
      }
      const retrasoMs = Math.min(retrasoBaseMs * 2 ** intento, retrasoMaximoMs);
      await temporizador.esperar(retrasoMs);
    }
  }
  throw ultimoError;
}
