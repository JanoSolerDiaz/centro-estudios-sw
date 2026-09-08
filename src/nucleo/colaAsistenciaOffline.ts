/**
 * Cola local de toques de asistencia que no se pudieron enviar por falta de red (R-07). Persiste
 * cada intento con el MISMO `peticionId` que habría usado la llamada directa (T-18: idempotencia de
 * `registrar_asistencia`/`registrar_ausencia`), para que un reintento posterior —automático, al
 * recuperar conexión— nunca duplique el registro en el servidor.
 *
 * `AlmacenColaAsistenciaOffline` es la única interfaz que conoce `pantallaPasarLista.ts`; tiene dos
 * implementaciones:
 * - `crearAlmacenColaAsistenciaEnMemoria`: para tests, y es la que demuestra el requisito 4
 *   ("sobrevive a un cierre de pestaña") sin `jsdom` — dos montajes sucesivos de la pantalla sobre
 *   la MISMA instancia de este almacén simulan exactamente "cerrar y reabrir la pestaña", porque lo
 *   que en un navegador real sobrevive al cierre es el propio IndexedDB, no ninguna variable en
 *   memoria de la pantalla.
 * - `crearAlmacenColaAsistenciaIndexedDB`: la implementación real (requisito 5: IndexedDB, API del
 *   navegador, sin librería). `jsdom` no implementa IndexedDB — limitación conocida y documentada
 *   del propio proyecto (`jsdom/jsdom`, sin soporte previsto) —, así que sigue el mismo criterio ya
 *   establecido para `FabricaProcesadoImagen` (T-14) y `copiarAlPortapapelesDelNavegador` (R-05):
 *   se aísla detrás de esta interfaz, sin test propio; lo que se testea es la orquestación de quien
 *   la usa, contra el almacén en memoria.
 */

import type { RegistrarAsistenciaEntrada, RegistrarAusenciaEntrada } from '../datos/asistencia.ts';

export type ElementoColaAsistencia =
  | { readonly clave: string; readonly tipo: 'presencia'; readonly entrada: RegistrarAsistenciaEntrada }
  | { readonly clave: string; readonly tipo: 'ausencia'; readonly entrada: RegistrarAusenciaEntrada };

export function peticionIdDeElemento(elemento: ElementoColaAsistencia): string {
  return elemento.entrada.peticionId;
}

export interface AlmacenColaAsistenciaOffline {
  /** Todo lo pendiente, en el orden en que se encoló. */
  listar(): Promise<readonly ElementoColaAsistencia[]>;
  /** Encola `elemento` — si ya existía uno con el mismo `peticionId` (mismo intento, reencolado tras
   * un segundo fallo de red), lo sustituye en vez de duplicarlo. */
  agregar(elemento: ElementoColaAsistencia): Promise<void>;
  /** Quita de la cola el elemento con este `peticionId` (ya confirmado por el servidor, o descartado
   * por un error que un reintento no arreglaría). Sin efecto si no existe. */
  eliminar(peticionId: string): Promise<void>;
}

export function crearAlmacenColaAsistenciaEnMemoria(): AlmacenColaAsistenciaOffline {
  const elementos = new Map<string, ElementoColaAsistencia>();
  return {
    listar: () => Promise.resolve([...elementos.values()]),
    agregar(elemento) {
      elementos.set(peticionIdDeElemento(elemento), elemento);
      return Promise.resolve();
    },
    eliminar(peticionId) {
      elementos.delete(peticionId);
      return Promise.resolve();
    },
  };
}

const NOMBRE_BASE_DE_DATOS = 'gestoracademia-cola-asistencia-offline';
const VERSION_BASE_DE_DATOS = 1;
const NOMBRE_ALMACEN_OBJETOS = 'elementos';

/** Forma de la fila tal como vive en IndexedDB: `peticionId` explícito en la raíz porque el
 * `keyPath` de un almacén de objetos no puede apuntar dentro de una unión discriminada
 * (`entrada.peticionId` sirve para TypeScript, no para IndexedDB) — se deriva al guardar y se
 * descarta al leer, `ElementoColaAsistencia` nunca lo expone. */
interface FilaColaAsistencia {
  readonly peticionId: string;
  readonly elemento: ElementoColaAsistencia;
}

function abrirBaseDeDatos(fabrica: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const peticion = fabrica.open(NOMBRE_BASE_DE_DATOS, VERSION_BASE_DE_DATOS);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(NOMBRE_ALMACEN_OBJETOS, { keyPath: 'peticionId' });
    };
    peticion.onsuccess = () => {
      resolver(peticion.result);
    };
    peticion.onerror = () => {
      rechazar(peticion.error ?? new Error('No se ha podido abrir la cola local de asistencia.'));
    };
  });
}

function promesaDePeticion<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => {
      resolver(peticion.result);
    };
    peticion.onerror = () => {
      rechazar(peticion.error ?? new Error('Error al acceder a la cola local de asistencia.'));
    };
  });
}

/** Implementación real (requisito 5). `fabrica` es `window.indexedDB`, inyectada para no
 * referenciarla directamente fuera del punto de composición (mismo criterio que el resto de este
 * proyecto para una API global del navegador). */
export function crearAlmacenColaAsistenciaIndexedDB(fabrica: IDBFactory): AlmacenColaAsistenciaOffline {
  async function conAlmacenObjetos<T>(modo: IDBTransactionMode, usar: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const bd = await abrirBaseDeDatos(fabrica);
    try {
      const transaccion = bd.transaction(NOMBRE_ALMACEN_OBJETOS, modo);
      return await promesaDePeticion(usar(transaccion.objectStore(NOMBRE_ALMACEN_OBJETOS)));
    } finally {
      bd.close();
    }
  }

  return {
    async listar() {
      const filas = await conAlmacenObjetos<FilaColaAsistencia[]>('readonly', (almacen) => almacen.getAll() as IDBRequest<FilaColaAsistencia[]>);
      return filas.map((fila) => fila.elemento);
    },
    async agregar(elemento) {
      const fila: FilaColaAsistencia = { peticionId: peticionIdDeElemento(elemento), elemento };
      await conAlmacenObjetos('readwrite', (almacen) => almacen.put(fila));
    },
    async eliminar(peticionId) {
      await conAlmacenObjetos('readwrite', (almacen) => almacen.delete(peticionId));
    },
  };
}
