/**
 * Doble del cliente HTTP para testear la capa de acceso a Supabase sin red real (T-03). Simula
 * respuestas de PostgREST, GoTrue y Storage a partir de un manejador que el test proporciona, en
 * vez de golpear la red — precisamente lo que exige la spec de T-03: "ninguno [de los tres niveles
 * de test] con red real". El cliente propio de T-08 recibirá esta misma forma de función
 * (`FetchSimulado`, compatible con la firma de `fetch`) como su implementación de red en tests.
 */

export interface PeticionSimulada {
  readonly url: string;
  readonly metodo: string;
  readonly cabeceras: Readonly<Record<string, string>>;
  readonly cuerpo: unknown;
}

export interface RespuestaSimulada {
  readonly estado: number;
  /** `undefined` = cuerpo vacío (p. ej. un `204 No Content` o un `DELETE`). */
  readonly cuerpo?: unknown;
  readonly cabeceras?: Readonly<Record<string, string>>;
}

export type ManejadorPeticionSimulada = (peticion: PeticionSimulada) => RespuestaSimulada;

export type FetchSimulado = (url: string | URL, init?: RequestInit) => Promise<Response>;

function cabecerasComoObjeto(cabeceras: RequestInit['headers']): Record<string, string> {
  if (!cabeceras) {
    return {};
  }
  if (cabeceras instanceof Headers) {
    return Object.fromEntries(cabeceras.entries());
  }
  if (Array.isArray(cabeceras)) {
    return Object.fromEntries(cabeceras);
  }
  return { ...cabeceras };
}

function cuerpoComoObjeto(cuerpo: RequestInit['body']): unknown {
  if (typeof cuerpo !== 'string' || cuerpo.length === 0) {
    return undefined;
  }
  return JSON.parse(cuerpo) as unknown;
}

/** Crea un `fetch` simulado que resuelve cada petición con el `manejador` dado, sin tocar la red.
 * Honra `init.signal` como el `fetch` real (T-20, `nucleo/controlPeticion.ts`): si la señal ya
 * está abortada en el momento de la llamada, rechaza con el mismo `DOMException('AbortError')` que
 * un navegador real, en vez de invocar el manejador. No simula un aborto que llegue DESPUÉS de la
 * llamada (este doble resuelve síncronamente, sin ningún hueco async donde reaccionar a uno) —
 * suficiente para probar que la señal se propaga hasta `fetch`, no para probar una carrera real. */
export function crearFetchSimulado(manejador: ManejadorPeticionSimulada): FetchSimulado {
  return (url, init) => {
    if (init?.signal?.aborted) {
      return Promise.reject(new DOMException('La operación se ha cancelado.', 'AbortError'));
    }
    const peticion: PeticionSimulada = {
      url: url.toString(),
      metodo: init?.method ?? 'GET',
      cabeceras: cabecerasComoObjeto(init?.headers),
      cuerpo: cuerpoComoObjeto(init?.body),
    };
    const respuesta = manejador(peticion);
    return Promise.resolve(
      new Response(respuesta.cuerpo === undefined ? null : JSON.stringify(respuesta.cuerpo), {
        status: respuesta.estado,
        headers: { 'content-type': 'application/json', ...respuesta.cabeceras },
      }),
    );
  };
}

/** Crea un `fetch` simulado que siempre falla como un error de red (`fetch` real rechaza la
 * promesa, no devuelve una respuesta, cuando no hay conexión). */
export function crearFetchSimuladoConErrorDeRed(mensaje = 'fallo de red simulado'): FetchSimulado {
  return () => Promise.reject(new TypeError(mensaje));
}
