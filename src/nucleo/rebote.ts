/**
 * Rebote/"debounce" cancelable (T-20, requisito 2: "búsqueda en servidor... con rebote (unos
 * 250 ms)"), hermano de `Temporizador` (T-06) y `ProgramadorIntervalo` (T-19) pero con un contrato
 * distinto: `aplazar(ms, tarea)` programa `tarea` para dentro de `ms`, y si ya había una tarea
 * pendiente la cancela primero — solo la ÚLTIMA llamada dentro de la ventana sobrevive, que es
 * exactamente lo que necesita un campo de búsqueda que dispara una llamada por cada tecla.
 *
 * `crearRebote()` es una FÁBRICA, no una instancia compartida (mismo criterio que
 * `crearProtectorDobleToque` de T-06, nunca un protector único global): cada campo de búsqueda de
 * la aplicación necesita su propio temporizador pendiente, y una única instancia compartida entre
 * dos combobox cancelaría la búsqueda del uno al escribir en el otro. Mismo patrón de inyección que
 * `Temporizador`/`ProgramadorIntervalo`: `crearRebote` es la única implementación con un
 * temporizador real, confinada a los puntos de entrada de la aplicación; los tests usan
 * `crearReboteDePrueba`, que no espera de verdad y deja disparar la tarea pendiente a mano.
 */

export interface Rebote {
  /** Programa `tarea` para dentro de `ms`; si ya había una tarea pendiente sin disparar, la
   * cancela primero. */
  aplazar(ms: number, tarea: () => void): void;
  /** Cancela la tarea pendiente, si la hay, sin programar ninguna nueva. */
  cancelar(): void;
}

export function crearRebote(): Rebote {
  let idTemporizador: ReturnType<typeof setTimeout> | undefined;
  return {
    aplazar(ms, tarea) {
      if (idTemporizador !== undefined) {
        clearTimeout(idTemporizador);
      }
      idTemporizador = setTimeout(tarea, ms);
    },
    cancelar() {
      if (idTemporizador !== undefined) {
        clearTimeout(idTemporizador);
        idTemporizador = undefined;
      }
    },
  };
}

export interface ReboteDePrueba extends Rebote {
  /** `ms` del aplazamiento pendiente (no disparado ni cancelado), o `undefined` si no hay
   * ninguno — nunca más de un elemento a la vez, porque `aplazar` cancela el anterior. */
  readonly pendiente: number | undefined;
  /** Ejecuta de inmediato la tarea pendiente, como si hubiera pasado su `ms` — no espera de
   * verdad. No hace nada si no hay ninguna pendiente. */
  disparar(): void;
}

export function crearReboteDePrueba(): ReboteDePrueba {
  let tareaPendiente: (() => void) | undefined;
  let msPendiente: number | undefined;

  return {
    get pendiente() {
      return msPendiente;
    },
    aplazar(ms, tarea) {
      msPendiente = ms;
      tareaPendiente = tarea;
    },
    cancelar() {
      tareaPendiente = undefined;
      msPendiente = undefined;
    },
    disparar() {
      const tarea = tareaPendiente;
      tareaPendiente = undefined;
      msPendiente = undefined;
      tarea?.();
    },
  };
}
