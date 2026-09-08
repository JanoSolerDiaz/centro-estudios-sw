/**
 * Detector de conectividad (R-07, requisito 3: "indicador de estado de conexión... visible en la
 * pantalla de pasar lista"), sobre los eventos nativos `online`/`offline` del navegador — sin
 * dependencia nueva (§0.2). Mismo patrón de inyección que `AlmacenSesion`
 * (`nucleo/almacenSesion.ts`): `crearDetectorConexionNavegador` recibe la forma MÍNIMA que necesita
 * (`FuenteConexionNavegador`, no el `Window` completo), así que en un test cualquier objeto que la
 * cumpla sirve — no hace falta `jsdom` para probar la implementación real, a diferencia de
 * `FabricaProcesadoImagen` (T-14) o `copiarAlPortapapelesDelNavegador` (R-05).
 *
 * El estado que expone `estaConectado()` no relee `navigator.onLine` en cada llamada: se fija una
 * vez al crear el detector y se actualiza solo con los propios eventos `online`/`offline` —
 * `navigator.onLine` es de solo lectura y no se puede forzar en un test, así que la única forma de
 * comprobar la transición es que el propio detector mantenga su estado a partir de los eventos que
 * escucha, no de una relectura de la propiedad.
 */

export interface DetectorConexion {
  estaConectado(): boolean;
  /** Se llama con el nuevo estado en cada cambio real (`online`/`offline`). Devuelve una función
   * para dejar de escuchar. */
  alCambiar(escuchador: (conectado: boolean) => void): () => void;
}

/** Forma mínima de `Window` que necesita este módulo — nunca `Window` completo, mismo criterio que
 * `ObjetivoRouter` de `nucleo/router.ts` o `AbridorVentanaImpresion` de `ui/dom.ts`: no referenciar
 * un global del navegador directamente fuera del punto de composición. */
export interface FuenteConexionNavegador {
  readonly navigator: { readonly onLine: boolean };
  addEventListener(tipo: 'online' | 'offline', escuchador: () => void): void;
  removeEventListener(tipo: 'online' | 'offline', escuchador: () => void): void;
}

export function crearDetectorConexionNavegador(fuente: FuenteConexionNavegador): DetectorConexion {
  let conectado = fuente.navigator.onLine;
  const escuchadores = new Set<(conectado: boolean) => void>();

  const notificar = (nuevoEstado: boolean) => {
    conectado = nuevoEstado;
    for (const escuchador of escuchadores) {
      escuchador(nuevoEstado);
    }
  };
  const alConectar = () => {
    notificar(true);
  };
  const alDesconectar = () => {
    notificar(false);
  };
  fuente.addEventListener('online', alConectar);
  fuente.addEventListener('offline', alDesconectar);

  return {
    estaConectado: () => conectado,
    alCambiar(escuchador) {
      escuchadores.add(escuchador);
      return () => {
        escuchadores.delete(escuchador);
      };
    },
  };
}

export interface DetectorConexionDePrueba extends DetectorConexion {
  /** Simula un cambio de conectividad real (equivalente a un evento `online`/`offline`), sin pasar
   * por ningún `Window` ni evento del DOM. */
  simularCambio(conectado: boolean): void;
}

export function crearDetectorConexionDePrueba(conectadoInicial = true): DetectorConexionDePrueba {
  let conectado = conectadoInicial;
  const escuchadores = new Set<(conectado: boolean) => void>();
  return {
    estaConectado: () => conectado,
    alCambiar(escuchador) {
      escuchadores.add(escuchador);
      return () => {
        escuchadores.delete(escuchador);
      };
    },
    simularCambio(nuevoEstado) {
      conectado = nuevoEstado;
      for (const escuchador of escuchadores) {
        escuchador(nuevoEstado);
      }
    },
  };
}
