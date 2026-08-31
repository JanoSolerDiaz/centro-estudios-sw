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
