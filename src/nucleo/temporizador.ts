/**
 * Temporizador inyectable (T-06), hermano de `Reloj` (T-03) pero con un contrato distinto: `Reloj`
 * responde "qué hora es ahora", `Temporizador` responde "espera este rato". El retroceso
 * exponencial de `reintento.ts` necesita lo segundo, no lo primero — un `Reloj` no puede simular el
 * paso del tiempo sin que el test real espere ese tiempo. Mismo patrón de inyección que `Reloj`:
 * `temporizadorReal` es la única implementación que usa un temporizador real y queda confinada a
 * los puntos de entrada de la aplicación; los tests usan `crearTemporizadorDePrueba`, que no espera
 * de verdad y deja registrado cuánto se le pidió esperar, para que el test siga siendo determinista
 * y rápido.
 */

export interface Temporizador {
  esperar(ms: number): Promise<void>;
}

export const temporizadorReal: Temporizador = {
  esperar: (ms) =>
    new Promise((resolver) => {
      setTimeout(resolver, ms);
    }),
};

export interface TemporizadorDePrueba extends Temporizador {
  /** Cada espera pedida, en el orden en que se pidió. No espera de verdad: resuelve al instante. */
  readonly esperas: readonly number[];
}

export function crearTemporizadorDePrueba(): TemporizadorDePrueba {
  const esperas: number[] = [];
  return {
    esperas,
    esperar(ms) {
      esperas.push(ms);
      return Promise.resolve();
    },
  };
}
