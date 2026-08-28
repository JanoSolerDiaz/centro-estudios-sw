/**
 * Operaciones de dominio del catálogo de centros de estudios (T-11): listar, crear, editar el
 * nombre, desactivar y reactivar. Sin borrado — igual que el resto de bajas del sistema (§0.2), un
 * centro solo se marca `activo = false`. La detección de duplicados (requisito 2 de T-11) vive en
 * `src/dominio/centrosEstudios.ts`; este módulo solo la usa antes de escribir.
 *
 * Escritura reservada a `administrator` por RLS (`003_politicas_rls.sql`): un `teacher` que llame a
 * `crearCentro`/`editarNombreCentro`/`desactivarCentro`/`reactivarCentro` recibe `SinPermiso` del
 * servidor, no de este módulo — la comprobación de rol de la interfaz (`permisosUi.ts`) es solo
 * presentación.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { CentroEstudios } from '../dominio/tipos.ts';
import { buscarCentroDuplicado } from '../dominio/centrosEstudios.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

export type FiltroEstadoCentro = 'activos' | 'inactivos' | 'todos';

export interface OpcionesListarCentros {
  readonly estado?: FiltroEstadoCentro;
  /** Búsqueda por subcadena, insensible a mayúsculas (`ilike`). No es acento-insensible: a
   * diferencia de la detección de duplicados, PostgREST no ofrece esa comparación sin instalar la
   * extensión `unaccent`, y ninguna spec de T-11 la exige para la búsqueda, solo para el alta. */
  readonly busqueda?: string;
}

export type ResultadoGuardarCentro =
  | { readonly tipo: 'guardado'; readonly centro: CentroEstudios }
  | { readonly tipo: 'duplicado'; readonly existente: CentroEstudios };

const TABLA = 'centro_estudios';

export async function listarCentros(
  cliente: ClientePostgrest,
  opciones: OpcionesListarCentros = {},
): Promise<readonly CentroEstudios[]> {
  let consulta = cliente.desde<CentroEstudios>(TABLA);
  if (opciones.estado === 'activos') {
    consulta = consulta.eq('activo', true);
  } else if (opciones.estado === 'inactivos') {
    consulta = consulta.eq('activo', false);
  }
  const busqueda = opciones.busqueda?.trim();
  if (busqueda && busqueda.length > 0) {
    consulta = consulta.ilike('nombre', `*${busqueda}*`);
  }
  return consulta.order('nombre').seleccionar();
}

function primeraFilaOFalla(filas: readonly CentroEstudios[]): CentroEstudios {
  const [centro] = filas;
  if (!centro) {
    throw new ErrorDelServidor('El servidor no ha devuelto el centro esperado.');
  }
  return centro;
}

async function comprobarDuplicado(
  cliente: ClientePostgrest,
  nombre: string,
  idAExcluir?: string,
): Promise<CentroEstudios | undefined> {
  const todos = await cliente.desde<CentroEstudios>(TABLA).seleccionar();
  const candidatos = idAExcluir === undefined ? todos : todos.filter((centro) => centro.id !== idAExcluir);
  return buscarCentroDuplicado(nombre, candidatos);
}

function nombreValidoOFalla(nombreEntrada: string): string {
  const nombre = nombreEntrada.trim();
  if (nombre.length === 0) {
    throw new ErrorDeValidacion('El nombre del centro no puede estar vacío.');
  }
  return nombre;
}

/** Crea un centro nuevo, salvo que `nombreEntrada` sea equivalente (acento-insensible, sin
 * distinguir mayúsculas) a uno ya existente, en cuyo caso lo devuelve como `duplicado` en vez de
 * intentar el alta (requisito 2 de T-11: "ofrecer el existente en lugar de dar un error seco"). */
export async function crearCentro(cliente: ClientePostgrest, nombreEntrada: string): Promise<ResultadoGuardarCentro> {
  const nombre = nombreValidoOFalla(nombreEntrada);
  const duplicado = await comprobarDuplicado(cliente, nombre);
  if (duplicado) {
    return { tipo: 'duplicado', existente: duplicado };
  }
  const filas = await cliente.desde<CentroEstudios>(TABLA).insertar({ nombre });
  return { tipo: 'guardado', centro: primeraFilaOFalla(filas) };
}

/** Igual que `crearCentro`, pero editando el nombre de `id`. El propio centro que se edita se
 * excluye de la comprobación de duplicado (si no, un centro siempre "colisionaría consigo mismo"). */
export async function editarNombreCentro(
  cliente: ClientePostgrest,
  id: string,
  nombreEntrada: string,
): Promise<ResultadoGuardarCentro> {
  const nombre = nombreValidoOFalla(nombreEntrada);
  const duplicado = await comprobarDuplicado(cliente, nombre, id);
  if (duplicado) {
    return { tipo: 'duplicado', existente: duplicado };
  }
  const filas = await cliente.desde<CentroEstudios>(TABLA).eq('id', id).actualizar({ nombre });
  return { tipo: 'guardado', centro: primeraFilaOFalla(filas) };
}

/** Cuántos alumnos activos apuntan hoy a `centroId` — para avisar antes de desactivar (requisito 3
 * de T-11), no para impedirlo: un centro con alumnos se puede desactivar igualmente, y esos alumnos
 * siguen siendo válidos y consultables después (la baja de un centro no toca `alumno` en absoluto). */
export async function contarAlumnosActivosDeCentro(cliente: ClientePostgrest, centroId: string): Promise<number> {
  const filas = await cliente
    .desde<{ readonly id: string }>('alumno')
    .eq('centro_referencia_id', centroId)
    .eq('activo', true)
    .seleccionar('id');
  return filas.length;
}

export async function desactivarCentro(cliente: ClientePostgrest, id: string): Promise<CentroEstudios> {
  const filas = await cliente.desde<CentroEstudios>(TABLA).eq('id', id).actualizar({ activo: false });
  return primeraFilaOFalla(filas);
}

export async function reactivarCentro(cliente: ClientePostgrest, id: string): Promise<CentroEstudios> {
  const filas = await cliente.desde<CentroEstudios>(TABLA).eq('id', id).actualizar({ activo: true });
  return primeraFilaOFalla(filas);
}
