/**
 * Estado mínimo con suscripción (T-16, requisito 1: "gestión de estado mínima con suscripción"),
 * reutilizable por cualquier pantalla que necesite repintar cuando cambia alguno de varios campos
 * relacionados, sin que cada pantalla reinvente su propio publish/subscribe a mano (como hacían,
 * con variables `let` sueltas y una llamada manual a `pintar()` tras cada cambio, las pantallas de
 * T-11/T-12/T-13). Mismo contrato que ya sigue `GestorSesion` (`obtenerEstado`/`suscribir`, T-09):
 * un valor inmutable, sustituido entero en cada `actualizar`, nunca mutado en el sitio.
 *
 * Sin acceso a DOM ni a red: puro, testeable en aislamiento.
 */

export interface AlmacenEstado<T> {
  obtener(): T;
  /** Con un objeto, se fusiona sobre el estado actual (`{ ...actual, ...cambios }`); con una
   * función, sustituye el estado por lo que devuelva — necesario cuando el cambio depende del
   * valor previo de un campo que no es el que se está tocando. */
  actualizar(cambios: Partial<T> | ((actual: T) => T)): void;
  /** Devuelve una función para desuscribirse. Igual que `GestorSesion.suscribir`, no llama a la
   * escucha de inmediato con el valor actual: quien se suscribe debe leer `obtener()` primero si lo
   * necesita. */
  suscribir(escucha: (estado: T) => void): () => void;
}

export function crearAlmacenEstado<T extends object>(inicial: T): AlmacenEstado<T> {
  let estado = inicial;
  const escuchas = new Set<(estado: T) => void>();

  function notificar(): void {
    for (const escucha of escuchas) {
      escucha(estado);
    }
  }

  return {
    obtener: () => estado,
    actualizar(cambios) {
      estado = typeof cambios === 'function' ? cambios(estado) : { ...estado, ...cambios };
      notificar();
    },
    suscribir(escucha) {
      escuchas.add(escucha);
      return () => {
        escuchas.delete(escucha);
      };
    },
  };
}
