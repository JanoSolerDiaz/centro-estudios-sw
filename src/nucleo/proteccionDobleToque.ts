/**
 * Protección contra doble toque (T-06, requisito 3): envuelve una operación asíncrona para que,
 * mientras haya una llamada en curso, cualquier llamada adicional reciba la MISMA promesa en vez
 * de disparar una segunda ejecución. Pensado para el botón de "guardar" de una escritura no
 * idempotente (p. ej. `registrar_asistencia`, T-18): un doble toque en pantalla —o un doble evento
 * de `click`, típico en táctil— debe producir un único registro, no dos peticiones en carrera.
 */

export type OperacionProtegida<A extends unknown[], T> = (...args: A) => Promise<T>;

export function crearProtectorDobleToque<A extends unknown[], T>(
  operacion: OperacionProtegida<A, T>,
): OperacionProtegida<A, T> {
  let enCurso: Promise<T> | null = null;

  return (...args: A) => {
    if (enCurso) {
      return enCurso;
    }

    const promesa = Promise.resolve()
      .then(() => operacion(...args))
      .finally(() => {
        enCurso = null;
      });

    enCurso = promesa;
    return promesa;
  };
}
