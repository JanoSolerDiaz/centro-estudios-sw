/**
 * Cliente propio de PostgREST (T-08, requisito 2): la puerta única por la que la aplicación lee y
 * escribe en las tablas de Supabase, sobre `fetch` nativo — sin el SDK (§0.2). Subconjunto
 * implementado, documentado también en `DECISIONES_TECNICAS.md`: `select` (con recursos
 * embebidos, filtros `eq`/`in`/`gte`/`lte`/`ilike`, `order`, `limit`, rango para paginación con
 * total opcional), `insert`, `update`, `delete` y llamada a RPC. No implementa `upsert` explícito,
 * ni operadores `neq`/`not`/`or`/`and` compuestos, ni filtros sobre recursos embebidos: ninguna
 * tarea del roadmap los necesita todavía (T-11 a T-23 son consultas simples por tabla). Si una
 * tarea futura los necesita, es la señal para ampliar este módulo, no para volver a construir
 * filtros a mano en otro sitio.
 *
 * Todo error no exitoso se traduce a un error de dominio tipado (`erroresDominio.ts`) antes de
 * salir de este módulo. Los valores de filtro pasan siempre por `codificadorValores.ts`; los
 * nombres de columna y la cadena de `select` no (son literales que escribe quien programa).
 *
 * Dos ampliaciones de T-12, documentadas en `DECISIONES_TECNICAS.md`: `orIlike` (un `ilike` sobre
 * varias columnas a la vez, para la búsqueda de la ficha de alumno por nombre O apellidos) y la
 * opción `representar` de `insertar`/`actualizar` (para poder pedir `Prefer: return=minimal` en
 * vez del `return=representation` por defecto, necesario cuando el `RETURNING` de Postgres
 * fallaría por falta de privilegio de columna — el caso de `alumno` con `email_alumno`/
 * `telefono_alumno`, ver `003_politicas_rls.sql`).
 */

import type { FetchSimulado } from './pruebas/dobleHttp.ts';
import { codificarValorFiltro, codificarListaFiltro } from './codificadorValores.ts';
import { leerCuerpoJson, ErrorDelServidor } from './erroresDominio.ts';
import { peticionAutenticada, type OpcionesAutenticacion } from './peticionHttp.ts';

export type ValorFiltro = string | number | boolean;

export interface OpcionesOrden {
  readonly descendente?: boolean;
  readonly nullsAlFinal?: boolean;
}

export interface ResultadoPaginado<T> {
  readonly filas: readonly T[];
  /** `null` si PostgREST no ha podido calcular el total exacto (`Content-Range: .../*`) o no se
   * pidió con `seleccionarConTotal`. */
  readonly totalAproximado: number | null;
}

export interface ConstructorConsulta<T> {
  eq(columna: string, valor: ValorFiltro | null): ConstructorConsulta<T>;
  in(columna: string, valores: readonly ValorFiltro[]): ConstructorConsulta<T>;
  gte(columna: string, valor: ValorFiltro): ConstructorConsulta<T>;
  lte(columna: string, valor: ValorFiltro): ConstructorConsulta<T>;
  ilike(columna: string, patron: string): ConstructorConsulta<T>;
  /** `ilike` del mismo `patron` sobre varias columnas, unidas con `or`: cumple con una sola
   * condición de PostgREST (`or=(col1.ilike.patron,col2.ilike.patron,...)`), no con varias
   * peticiones ni con un `or` genérico de condiciones arbitrarias (esta clase de tarea no lo
   * necesita todavía). */
  orIlike(columnas: readonly string[], patron: string): ConstructorConsulta<T>;
  order(columna: string, opciones?: OpcionesOrden): ConstructorConsulta<T>;
  limit(cantidad: number): ConstructorConsulta<T>;
  /** Fija el rango de filas a pedir (cabecera `Range`/`Range-Unit`, paginación de PostgREST),
   * inclusive en ambos extremos: `range(0, 9)` pide las primeras 10 filas. */
  range(desde: number, hasta: number): ConstructorConsulta<T>;
  seleccionar(columnas?: string): Promise<readonly T[]>;
  /** Igual que `seleccionar`, y además devuelve el total de filas que cumplen el filtro (no solo
   * las de la página), leído de `Content-Range` — necesario para pintar un paginador real. */
  seleccionarConTotal(columnas?: string): Promise<ResultadoPaginado<T>>;
  /** `opciones.representar` (por defecto `true`) pide `Prefer: return=representation` y devuelve
   * la fila escrita. Pásalo a `false` para pedir `Prefer: return=minimal` en su lugar (sin cuerpo
   * en la respuesta) cuando el `RETURNING` fallaría por privilegio de columna — quien llama debe
   * volver a leer la fila por su cuenta si la necesita. */
  insertar(
    filas: Record<string, unknown> | readonly Record<string, unknown>[],
    opciones?: OpcionesEscritura,
  ): Promise<readonly T[]>;
  actualizar(cambios: Record<string, unknown>, opciones?: OpcionesEscritura): Promise<readonly T[]>;
  eliminar(): Promise<void>;
}

export interface OpcionesEscritura {
  readonly representar?: boolean;
}

export interface OpcionesClientePostgrest {
  readonly urlBase: string;
  readonly claveAnonima: string;
  /** Token de sesión del usuario autenticado; si no hay sesión (o no se proporciona esta función)
   * se usa la clave anónima, igual que ya hacía `crearEnviadorEventoError` (T-05). */
  readonly obtenerTokenSesion?: () => string | undefined;
  /** Implementación de red inyectable; por defecto el `fetch` global (permitido en `src/datos/`). */
  readonly fetchImpl?: FetchSimulado;
}

export interface ClientePostgrest {
  desde<T>(tabla: string): ConstructorConsulta<T>;
  rpc<T>(nombre: string, parametros?: Record<string, unknown>): Promise<T>;
}

interface EstadoConsulta {
  filtros: string[];
  ordenes: string[];
  limite: number | undefined;
  rango: { desde: number; hasta: number } | undefined;
}

interface OpcionesPeticion {
  readonly cuerpo?: unknown;
  readonly prefer?: readonly string[];
  // `| undefined` explícito (no solo `?`): `estado.rango` es `{...} | undefined` porque `range()`
  // es opcional, y con `exactOptionalPropertyTypes` una propiedad opcional sin `| undefined` en su
  // tipo no admite que se le asigne `undefined` de forma explícita como aquí.
  readonly rango?: { desde: number; hasta: number } | undefined;
}

async function ejecutarPeticion(
  opciones: OpcionesAutenticacion,
  metodo: string,
  ruta: string,
  init: OpcionesPeticion = {},
): Promise<Response> {
  const cabecerasExtra: Record<string, string> = {};
  if (init.prefer && init.prefer.length > 0) {
    cabecerasExtra.prefer = init.prefer.join(',');
  }
  if (init.rango) {
    cabecerasExtra.range = `${String(init.rango.desde)}-${String(init.rango.hasta)}`;
    cabecerasExtra['range-unit'] = 'items';
  }

  return peticionAutenticada(opciones, metodo, ruta, {
    cuerpoJson: init.cuerpo,
    cabecerasExtra,
  });
}

async function leerFilas<T>(respuesta: Response): Promise<readonly T[]> {
  const { valor, malformado } = await leerCuerpoJson(respuesta);
  if (malformado || (valor !== undefined && !Array.isArray(valor))) {
    throw new ErrorDelServidor('El servidor ha devuelto una respuesta que no se puede interpretar.');
  }
  return (valor ?? []) as readonly T[];
}

function parsearTotalContentRange(valor: string | null): number | null {
  if (!valor) {
    return null;
  }
  const total = valor.split('/')[1];
  if (total === undefined || total === '*') {
    return null;
  }
  const numero = Number(total);
  return Number.isFinite(numero) ? numero : null;
}

function valorParaOperador(valor: ValorFiltro): string {
  return typeof valor === 'string' ? codificarValorFiltro(valor) : String(valor);
}

function valorPlano(valor: ValorFiltro): string {
  return typeof valor === 'string' ? valor : String(valor);
}

function construirRuta(tabla: string, estado: EstadoConsulta, columnas?: string): string {
  const partes: string[] = [];
  if (columnas !== undefined) {
    partes.push(`select=${columnas}`);
  }
  partes.push(...estado.filtros);
  if (estado.ordenes.length > 0) {
    partes.push(`order=${estado.ordenes.join(',')}`);
  }
  if (estado.limite !== undefined) {
    partes.push(`limit=${String(estado.limite)}`);
  }
  const query = partes.join('&');
  return `/rest/v1/${tabla}${query.length > 0 ? `?${query}` : ''}`;
}

function crearConstructorConsulta<T>(opciones: OpcionesAutenticacion, tabla: string): ConstructorConsulta<T> {
  const estado: EstadoConsulta = { filtros: [], ordenes: [], limite: undefined, rango: undefined };

  const objetoConsulta: ConstructorConsulta<T> = {
    eq(columna, valor) {
      estado.filtros.push(valor === null ? `${columna}=is.null` : `${columna}=eq.${valorParaOperador(valor)}`);
      return objetoConsulta;
    },
    in(columna, valores) {
      estado.filtros.push(`${columna}=in.(${codificarListaFiltro(valores.map(valorPlano))})`);
      return objetoConsulta;
    },
    gte(columna, valor) {
      estado.filtros.push(`${columna}=gte.${valorParaOperador(valor)}`);
      return objetoConsulta;
    },
    lte(columna, valor) {
      estado.filtros.push(`${columna}=lte.${valorParaOperador(valor)}`);
      return objetoConsulta;
    },
    ilike(columna, patron) {
      estado.filtros.push(`${columna}=ilike.${codificarValorFiltro(patron)}`);
      return objetoConsulta;
    },
    orIlike(columnas, patron) {
      const valor = codificarValorFiltro(patron);
      estado.filtros.push(`or=(${columnas.map((columna) => `${columna}.ilike.${valor}`).join(',')})`);
      return objetoConsulta;
    },
    order(columna, opcionesOrden) {
      const direccion = opcionesOrden?.descendente ? 'desc' : 'asc';
      const sufijoNulls =
        opcionesOrden?.nullsAlFinal === undefined ? '' : opcionesOrden.nullsAlFinal ? '.nullslast' : '.nullsfirst';
      estado.ordenes.push(`${columna}.${direccion}${sufijoNulls}`);
      return objetoConsulta;
    },
    limit(cantidad) {
      estado.limite = cantidad;
      return objetoConsulta;
    },
    range(desde, hasta) {
      estado.rango = { desde, hasta };
      return objetoConsulta;
    },
    async seleccionar(columnas = '*') {
      const respuesta = await ejecutarPeticion(opciones, 'GET', construirRuta(tabla, estado, columnas), {
        rango: estado.rango,
      });
      return leerFilas<T>(respuesta);
    },
    async seleccionarConTotal(columnas = '*') {
      const respuesta = await ejecutarPeticion(opciones, 'GET', construirRuta(tabla, estado, columnas), {
        prefer: ['count=exact'],
        rango: estado.rango,
      });
      const filas = await leerFilas<T>(respuesta);
      return { filas, totalAproximado: parsearTotalContentRange(respuesta.headers.get('content-range')) };
    },
    async insertar(filas, opcionesEscritura) {
      const respuesta = await ejecutarPeticion(opciones, 'POST', construirRuta(tabla, estado), {
        cuerpo: filas,
        prefer: [opcionesEscritura?.representar === false ? 'return=minimal' : 'return=representation'],
      });
      return leerFilas<T>(respuesta);
    },
    async actualizar(cambios, opcionesEscritura) {
      const respuesta = await ejecutarPeticion(opciones, 'PATCH', construirRuta(tabla, estado), {
        cuerpo: cambios,
        prefer: [opcionesEscritura?.representar === false ? 'return=minimal' : 'return=representation'],
      });
      return leerFilas<T>(respuesta);
    },
    async eliminar() {
      await ejecutarPeticion(opciones, 'DELETE', construirRuta(tabla, estado));
    },
  };

  return objetoConsulta;
}

export function crearClientePostgrest(opcionesEntrada: OpcionesClientePostgrest): ClientePostgrest {
  const opciones: OpcionesAutenticacion = {
    urlBase: opcionesEntrada.urlBase,
    claveAnonima: opcionesEntrada.claveAnonima,
    fetchImpl: opcionesEntrada.fetchImpl ?? fetch,
    // `exactOptionalPropertyTypes`: no se puede asignar `obtenerTokenSesion: undefined`
    // explícitamente a una propiedad opcional, así que se omite la clave por completo cuando no
    // hay función, en vez de copiar el valor (posiblemente `undefined`) tal cual.
    ...(opcionesEntrada.obtenerTokenSesion !== undefined
      ? { obtenerTokenSesion: opcionesEntrada.obtenerTokenSesion }
      : {}),
  };

  return {
    desde<T>(tabla: string): ConstructorConsulta<T> {
      return crearConstructorConsulta<T>(opciones, tabla);
    },
    async rpc<T>(nombre: string, parametros?: Record<string, unknown>): Promise<T> {
      const respuesta = await ejecutarPeticion(opciones, 'POST', `/rest/v1/rpc/${nombre}`, {
        cuerpo: parametros ?? {},
      });
      const { valor, malformado } = await leerCuerpoJson(respuesta);
      if (malformado) {
        throw new ErrorDelServidor('El servidor ha devuelto una respuesta que no se puede interpretar.');
      }
      return valor as T;
    },
  };
}
