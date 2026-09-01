/**
 * Programador de tareas repetidas (T-19), hermano de `Temporizador` (T-06) pero con un contrato
 * distinto: `Temporizador.esperar(ms)` resuelve una sola vez; aquí `cada(ms, tarea)` sigue llamando
 * a `tarea` cada `ms` hasta que quien la programó cancele. Lo necesita la pantalla de pasar lista
 * (T-19, requisitos 1 y 5: la hora visible de la cabecera y la propuesta que se refresca sola al
 * cambiar de tramo horario) para volver a evaluar `alumnosPropuestos` con el instante actual sin
 * releer la hora del sistema desde el propio dominio (`disciplinaReloj.test.ts`) ni depender de
 * `setInterval` directamente en la pantalla, que no se podría testear sin esperar de verdad.
 *
 * Mismo patrón de inyección que `Reloj`/`Temporizador`: `programadorIntervaloReal` es la única
 * implementación que usa un temporizador real y queda confinada a los puntos de entrada de la
 * aplicación; los tests usan `crearProgramadorIntervaloDePrueba`, que no espera de verdad y deja
 * disparar los ticks a mano.
 */

export interface ProgramadorIntervalo {
  /** Llama a `tarea` cada `ms` milisegundos, empezando en el primer tick (no de inmediato).
   * Devuelve una función para cancelar: tras cancelar, `tarea` no vuelve a llamarse. */
  cada(ms: number, tarea: () => void): () => void;
}

export const programadorIntervaloReal: ProgramadorIntervalo = {
  cada(ms, tarea) {
    const id = setInterval(tarea, ms);
    return () => {
      clearInterval(id);
    };
  },
};

interface TareaProgramada {
  readonly ms: number;
  tarea: () => void;
  cancelada: boolean;
}

export interface ProgramadorIntervaloDePrueba extends ProgramadorIntervalo {
  /** Cada intervalo programado todavía vivo, en el orden en que se pidió. No se limpia al
   * cancelar: `disparar` ya comprueba `cancelada` antes de llamar. */
  readonly programadas: readonly TareaProgramada[];
  /** Ejecuta de inmediato todas las tareas programadas que sigan activas, como si hubiera pasado
   * un tick de cada una a la vez — no espera de verdad ni simula el paso exacto de `ms`. */
  disparar(): void;
}

export function crearProgramadorIntervaloDePrueba(): ProgramadorIntervaloDePrueba {
  const programadas: TareaProgramada[] = [];
  return {
    programadas,
    cada(ms, tarea) {
      const entrada: TareaProgramada = { ms, tarea, cancelada: false };
      programadas.push(entrada);
      return () => {
        entrada.cancelada = true;
      };
    },
    disparar() {
      for (const entrada of programadas) {
        if (!entrada.cancelada) {
          entrada.tarea();
        }
      }
    },
  };
}
