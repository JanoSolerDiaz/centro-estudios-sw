/**
 * Orquestación del registro del Service Worker (R-09, requisitos 2-4). El fichero real (`sw.js`,
 * raíz del repositorio) es JavaScript plano fuera de `src/` (ver su cabecera); este módulo es la
 * pieza que SÍ vive en `src/` y SÍ se testea: decide cuándo avisar de que hay una versión nueva
 * lista y qué hacer cuando la persona confirma actualizar, sobre una interfaz mínima que envuelve
 * `navigator.serviceWorker`/`ServiceWorkerRegistration`, nunca esos objetos reales directamente —
 * mismo criterio exacto que `ObjetivoRouter` (`nucleo/router.ts`) envolviendo `window`: la interfaz
 * es la porción mínima que la orquestación necesita, y `window.navigator.serviceWorker` ya la
 * cumple estructuralmente sin ningún adaptador de por medio en `main.ts`.
 *
 * Sin test posible de la implementación real (mismo criterio ya documentado para
 * `crearAlmacenColaAsistenciaIndexedDB`, R-07): `jsdom` no implementa la API de Service Worker.
 * Lo que sí se testea aquí, con un `NavegadorServiceWorker` de mentira, es la orquestación
 * completa: cuándo se dispara el aviso de versión nueva y qué mensaje recibe el worker en espera.
 */

/** La porción de `ServiceWorker`/`Worker` que hace falta: mandarle un mensaje y saber su estado. */
export interface WorkerServicioRegistrado {
  postMessage(mensaje: unknown): void;
  readonly state: string;
  addEventListener(tipo: 'statechange', escucha: () => void): void;
}

/** La porción de `ServiceWorkerRegistration` que hace falta. */
export interface RegistroServiceWorker {
  installing: WorkerServicioRegistrado | null;
  readonly waiting: WorkerServicioRegistrado | null;
  addEventListener(tipo: 'updatefound', escucha: () => void): void;
}

/** La porción de `ServiceWorkerContainer` (`navigator.serviceWorker`) que hace falta. */
export interface NavegadorServiceWorker {
  register(urlScript: string): Promise<RegistroServiceWorker>;
  readonly controller: unknown;
  addEventListener(tipo: 'controllerchange', escucha: () => void): void;
}

const MENSAJE_OMITIR_ESPERA = { tipo: 'GESTORACADEMIA_OMITIR_ESPERA' };

export interface OpcionesRegistroServiceWorker {
  readonly urlScript: string;
  /** Se llama, como mucho una vez, cuando hay una versión nueva instalada y esperando: `activar`
   * manda al Service Worker en espera el mensaje que le hace tomar el control (dispara después
   * `controllerchange`, que a su vez recarga la página). Quien reciba esto decide CÓMO avisar
   * (`ui/avisoNuevaVersion.ts` en la aplicación real). */
  readonly onNuevaVersionDisponible: (activar: () => void) => void;
  /** Se llama una única vez, cuando el Service Worker en espera toma el control tras `activar()`. */
  readonly alRecargar: () => void;
}

/** Registra el Service Worker y conecta el aviso de versión nueva. No lanza si `register` rechaza
 * (un navegador sin soporte, o un error de red al pedir `sw.js`): la aplicación sigue funcionando
 * exactamente igual que sin Service Worker, solo sin caché ni arranque sin red. */
export async function registrarServiceWorker(navegador: NavegadorServiceWorker, opciones: OpcionesRegistroServiceWorker): Promise<void> {
  let yaRecargando = false;
  // Si YA había un `controller` antes de este registro, cualquier `controllerchange` posterior es
  // una actualización real. Si no lo había, el PRIMER `controllerchange` es solo el arranque inicial
  // tomando el control por primera vez (mismo criterio que ya aplica el guard de `updatefound`
  // abajo) — avisar aquí recargaría la página a mitad de que alguien escriba su email/contraseña.
  let esPrimerEvento = true;
  const huboControllerAlRegistrar = Boolean(navegador.controller);
  navegador.addEventListener('controllerchange', () => {
    const esArranqueInicial = esPrimerEvento && !huboControllerAlRegistrar;
    esPrimerEvento = false;
    if (esArranqueInicial || yaRecargando) {
      return;
    }
    yaRecargando = true;
    opciones.alRecargar();
  });

  let registro: RegistroServiceWorker;
  try {
    registro = await navegador.register(opciones.urlScript);
  } catch {
    return;
  }

  function avisarSiHayWorkerEnEspera(worker: WorkerServicioRegistrado | null): void {
    if (!worker) {
      return;
    }
    opciones.onNuevaVersionDisponible(() => {
      worker.postMessage(MENSAJE_OMITIR_ESPERA);
    });
  }

  // Caso 1: ya había una versión esperando cuando se registró (p. ej. una pestaña que quedó
  // abierta desde antes del despliegue anterior y todavía no se recargó).
  avisarSiHayWorkerEnEspera(registro.waiting);

  // Caso 2: una versión nueva termina de instalarse MIENTRAS la pestaña sigue abierta. Solo cuenta
  // como "versión nueva" si YA había un Service Worker controlando la página — la primera
  // instalación de todas (sin `controller` todavía) no es una actualización, es el arranque.
  registro.addEventListener('updatefound', () => {
    const nuevoWorker = registro.installing;
    if (!nuevoWorker) {
      return;
    }
    nuevoWorker.addEventListener('statechange', () => {
      if (nuevoWorker.state === 'installed' && navegador.controller) {
        avisarSiHayWorkerEnEspera(nuevoWorker);
      }
    });
  });
}
