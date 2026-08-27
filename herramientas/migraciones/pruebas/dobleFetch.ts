/** Doble mínimo de `fetch` para testear `clienteManagementApi.ts` sin red real. Deliberadamente
 * separado de `src/datos/pruebas/dobleHttp.ts` (T-03): esa pieza sirve a la capa de acceso a
 * Supabase de `src/`, esta a la herramienta de migraciones, que vive fuera de `src/` y no comparte
 * su `tsconfig` ni sus restricciones de ESLint (aquí `fetch` no está prohibido). */

export type FetchSimulado = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface PeticionSimulada {
  readonly url: string;
  readonly metodo: string;
  readonly cabeceras: Readonly<Record<string, string>>;
  readonly cuerpo: unknown;
}

export interface RespuestaSimulada {
  readonly estado: number;
  readonly cuerpo?: unknown;
}

export type ManejadorPeticionSimulada = (peticion: PeticionSimulada) => RespuestaSimulada;

function cabecerasComoObjeto(cabeceras: RequestInit['headers']): Record<string, string> {
  const resultado: Record<string, string> = {};
  if (!cabeceras) {
    return resultado;
  }
  // Normalizar vía el propio constructor de Headers (acepta las tres formas de HeadersInit y
  // junta valores repetidos con ", " como manda el estándar fetch) evita tener que desambiguar
  // a mano la unión de tipos de RequestInit['headers'].
  new Headers(cabeceras).forEach((valor, clave) => {
    resultado[clave] = valor;
  });
  return resultado;
}

export function crearFetchSimulado(manejador: ManejadorPeticionSimulada): FetchSimulado {
  return (url, init) => {
    const urlComoTexto = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    const peticion: PeticionSimulada = {
      url: urlComoTexto,
      metodo: init?.method ?? 'GET',
      cabeceras: cabecerasComoObjeto(init?.headers),
      cuerpo: typeof init?.body === 'string' && init.body.length > 0 ? (JSON.parse(init.body) as unknown) : undefined,
    };
    const respuesta = manejador(peticion);
    return Promise.resolve(
      new Response(respuesta.cuerpo === undefined ? '' : JSON.stringify(respuesta.cuerpo), {
        status: respuesta.estado,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}
