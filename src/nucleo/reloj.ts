/**
 * Reloj inyectable (T-03). Ninguna función de `src/dominio/` puede leer la hora del sistema
 * directamente (`new Date()` / `Date.now()`): reciben un `Reloj` como parámetro. `relojDelSistema`
 * es la única implementación real y su uso queda confinado a los puntos de entrada de la
 * aplicación (nunca al propio dominio) — ver `src/dominio/disciplinaReloj.test.ts`, que falla si
 * aparece una lectura directa de la hora del sistema fuera de aquí.
 */

export interface Reloj {
  ahora(): Date;
}

export const relojDelSistema: Reloj = {
  ahora: () => new Date(),
};

/** Reloj de valor fijo, para tests deterministas. */
export function crearRelojFijo(instante: Date): Reloj {
  return {
    ahora: () => instante,
  };
}
