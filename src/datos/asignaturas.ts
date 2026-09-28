/**
 * Operaciones de dominio del catálogo de asignaturas/grupos (R-33): listar, crear, editar el
 * nombre, desactivar y reactivar. Sin borrado — igual que el resto de bajas del sistema (§0.2), una
 * asignatura solo se marca `activo = false`; sin ninguna relación de clave foránea con
 * `slot_horario`, desactivar una asignatura no afecta a ningún slot existente. La detección de
 * duplicados (mismo criterio que T-11) vive en `src/dominio/asignaturas.ts`; este módulo solo la
 * usa antes de escribir.
 *
 * Escritura reservada a `administrator` por RLS (`db/020_catalogo_asignaturas.sql`): un `teacher`
 * que llame a `crearAsignatura`/`editarNombreAsignatura`/`desactivarAsignatura`/`reactivarAsignatura`
 * recibe `SinPermiso` del servidor, no de este módulo — la comprobación de rol de la interfaz
 * (`permisosUi.ts`) es solo presentación. Sin ninguna RPC: mismo patrón que `centrosEstudios.ts`
 * (T-11) y `cierresCentro.ts` (R-12) — el `INSERT`/`UPDATE` directo ya queda aislado por RLS.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { Asignatura } from '../dominio/tipos.ts';
import { buscarAsignaturaDuplicada } from '../dominio/asignaturas.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

export type FiltroEstadoAsignatura = 'activos' | 'inactivos' | 'todos';

export interface OpcionesListarAsignaturas {
  readonly estado?: FiltroEstadoAsignatura;
}

export type ResultadoGuardarAsignatura =
  | { readonly tipo: 'guardado'; readonly asignatura: Asignatura }
  | { readonly tipo: 'duplicado'; readonly existente: Asignatura };

const TABLA = 'asignatura';

export async function listarAsignaturas(
  cliente: ClientePostgrest,
  opciones: OpcionesListarAsignaturas = {},
): Promise<readonly Asignatura[]> {
  let consulta = cliente.desde<Asignatura>(TABLA);
  if (opciones.estado === 'activos') {
    consulta = consulta.eq('activo', true);
  } else if (opciones.estado === 'inactivos') {
    consulta = consulta.eq('activo', false);
  }
  return consulta.order('nombre').seleccionar();
}

function primeraFilaOFalla(filas: readonly Asignatura[]): Asignatura {
  const [asignatura] = filas;
  if (!asignatura) {
    throw new ErrorDelServidor('El servidor no ha devuelto la asignatura esperada.');
  }
  return asignatura;
}

async function comprobarDuplicado(
  cliente: ClientePostgrest,
  nombre: string,
  idAExcluir?: string,
): Promise<Asignatura | undefined> {
  const todas = await cliente.desde<Asignatura>(TABLA).seleccionar();
  const candidatas = idAExcluir === undefined ? todas : todas.filter((asignatura) => asignatura.id !== idAExcluir);
  return buscarAsignaturaDuplicada(nombre, candidatas);
}

function nombreValidoOFalla(nombreEntrada: string): string {
  const nombre = nombreEntrada.trim();
  if (nombre.length === 0) {
    throw new ErrorDeValidacion('El nombre de la asignatura no puede estar vacío.');
  }
  return nombre;
}

/** Crea una asignatura nueva, salvo que `nombreEntrada` sea equivalente (acento-insensible, sin
 * distinguir mayúsculas) a una ya existente, en cuyo caso la devuelve como `duplicado` en vez de
 * intentar el alta — mismo criterio que `crearCentro` (T-11). */
export async function crearAsignatura(cliente: ClientePostgrest, nombreEntrada: string): Promise<ResultadoGuardarAsignatura> {
  const nombre = nombreValidoOFalla(nombreEntrada);
  const duplicado = await comprobarDuplicado(cliente, nombre);
  if (duplicado) {
    return { tipo: 'duplicado', existente: duplicado };
  }
  const filas = await cliente.desde<Asignatura>(TABLA).insertar({ nombre });
  return { tipo: 'guardado', asignatura: primeraFilaOFalla(filas) };
}

/** Igual que `crearAsignatura`, pero editando el nombre de `id`. La propia asignatura que se edita
 * se excluye de la comprobación de duplicado. */
export async function editarNombreAsignatura(
  cliente: ClientePostgrest,
  id: string,
  nombreEntrada: string,
): Promise<ResultadoGuardarAsignatura> {
  const nombre = nombreValidoOFalla(nombreEntrada);
  const duplicado = await comprobarDuplicado(cliente, nombre, id);
  if (duplicado) {
    return { tipo: 'duplicado', existente: duplicado };
  }
  const filas = await cliente.desde<Asignatura>(TABLA).eq('id', id).actualizar({ nombre });
  return { tipo: 'guardado', asignatura: primeraFilaOFalla(filas) };
}

export async function desactivarAsignatura(cliente: ClientePostgrest, id: string): Promise<Asignatura> {
  const filas = await cliente.desde<Asignatura>(TABLA).eq('id', id).actualizar({ activo: false });
  return primeraFilaOFalla(filas);
}

export async function reactivarAsignatura(cliente: ClientePostgrest, id: string): Promise<Asignatura> {
  const filas = await cliente.desde<Asignatura>(TABLA).eq('id', id).actualizar({ activo: true });
  return primeraFilaOFalla(filas);
}
