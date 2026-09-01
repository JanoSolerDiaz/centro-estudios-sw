/**
 * Lectura de profesores para el selector de horario de T-16 (requisito 3: editar el horario de un
 * alumno exige elegir el profesor de cada slot). No hay tarea de alta de usuarios todavía (T-24,
 * `PENDIENTE`): este módulo solo lista los que ya existen en `perfil`, nunca escribe.
 *
 * `perfil_admin_leer_todos` (`db/000_bootstrap_perfil.sql`, aplicada a mano por el dueño) ya permite
 * a `administrator` leer cualquier fila de `perfil` — a diferencia de `alumno`, aquí no hace falta
 * ninguna vista ni restricción de columna nueva: un `teacher` nunca llama a esta función (no la usa
 * ninguna pantalla de T-16, que es enteramente de `administrator`), y si lo hiciera solo vería su
 * propia fila (`perfil_leer_propio`), nunca la de otro profesor.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { Perfil } from '../dominio/tipos.ts';

const TABLA = 'perfil';

export type ProfesorParaSelector = Pick<Perfil, 'id' | 'nombre'>;

/** Profesores activos, ordenados por nombre — lo mínimo que necesita un `<select>` de horario. */
export async function listarProfesoresActivos(cliente: ClientePostgrest): Promise<readonly ProfesorParaSelector[]> {
  return cliente
    .desde<ProfesorParaSelector>(TABLA)
    .eq('rol', 'teacher')
    .eq('activo', true)
    .order('nombre')
    .seleccionar('id,nombre');
}

/** Resuelve en LOTE (nunca una petición por fila) el nombre de cada `id` de `ids` — T-23, histórico
 * de asistencia: una página puede mezclar registros de varios profesores. Sin filtrar por
 * `rol`/`activo`: un profesor que ya no da clase, o que cambió de rol, sigue siendo el que registró
 * históricamente esa fila, y el histórico no debe perder su nombre por eso. Para un `teacher` (que
 * solo tiene `perfil_leer_propio`, nunca `perfil_admin_leer_todos`) el mapa devuelto contendrá como
 * mucho su propia fila, aunque pida más ids — coherente con que su historial de asistencia, acotado
 * por RLS a lo suyo, nunca necesita el nombre de otro profesor. Con `ids` vacío no hace ninguna
 * petición. */
export async function resolverNombresProfesores(
  cliente: ClientePostgrest,
  ids: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (ids.length === 0) {
    return new Map();
  }
  const filas = await cliente.desde<ProfesorParaSelector>(TABLA).in('id', ids).seleccionar('id,nombre');
  return new Map(filas.map((fila) => [fila.id, fila.nombre]));
}
