/**
 * Administración de usuarios y roles (T-24): listado y edición (nombre, rol, desactivación) sobre
 * `perfil`. Escritura reservada a `administrator` por RLS (`perfil_admin_actualizar`, bootstrap):
 * un `teacher` o `student` que llame a `actualizarUsuario` sobre un perfil ajeno recibe una lista
 * vacía de PostgREST (RLS filtra la fila, no es un error HTTP), nunca datos ajenos.
 *
 * El invariante "no dejar el sistema sin ningún administrator activo" (requisito 4 de T-24) no se
 * comprueba aquí: lo impone el trigger `perfil_before_update` de `db/009_administracion_usuarios.sql`
 * en la base de datos, y llega como un `ErrorDeValidacion` con el mensaje del propio trigger (sin
 * `errcode` de permiso a propósito, para que ese mensaje no se pierda) por el mismo mecanismo
 * genérico de `erroresDominio.ts` que ya traduce cualquier otro `400` de Postgres. La comprobación
 * de cliente (`dominio/administracionUsuarios.ts#dejariaSinAdministratorActivo`) es solo para
 * desactivar el control ANTES de llamar aquí, no una segunda fuente de verdad.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { Perfil, Rol } from '../dominio/tipos.ts';
import { normalizarNombreUsuario, nombreUsuarioValido } from '../dominio/administracionUsuarios.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

const TABLA = 'perfil';

export type FiltroEstadoUsuario = 'activos' | 'inactivos' | 'todos';

export interface OpcionesListarUsuarios {
  readonly rol?: Rol;
  readonly estado?: FiltroEstadoUsuario;
  /** Búsqueda por subcadena del nombre, insensible a mayúsculas (`ilike`). Mismo criterio que
   * `listarCentros` (T-11): no acento-insensible. */
  readonly busqueda?: string;
}

export async function listarUsuarios(
  cliente: ClientePostgrest,
  opciones: OpcionesListarUsuarios = {},
): Promise<readonly Perfil[]> {
  let consulta = cliente.desde<Perfil>(TABLA);
  if (opciones.rol !== undefined) {
    consulta = consulta.eq('rol', opciones.rol);
  }
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

export interface CambiosUsuario {
  readonly nombre?: string;
  readonly rol?: Rol;
  readonly activo?: boolean;
}

function nombreValidoOFalla(nombreEntrada: string): string {
  const nombre = normalizarNombreUsuario(nombreEntrada);
  if (!nombreUsuarioValido(nombre)) {
    throw new ErrorDeValidacion('El nombre no puede estar vacío.');
  }
  return nombre;
}

/** Edita nombre y/o rol y/o estado de `id`, combinables en una sola llamada — cada campo ausente en
 * `cambios` se deja tal como está, igual que el resto de ediciones parciales del proyecto (nunca se
 * reescribe una columna con un valor por defecto por no haberla mencionado). */
export async function actualizarUsuario(cliente: ClientePostgrest, id: string, cambios: CambiosUsuario): Promise<Perfil> {
  const cuerpo: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) {
    cuerpo.nombre = nombreValidoOFalla(cambios.nombre);
  }
  if (cambios.rol !== undefined) {
    cuerpo.rol = cambios.rol;
  }
  if (cambios.activo !== undefined) {
    cuerpo.activo = cambios.activo;
  }
  const filas = await cliente.desde<Perfil>(TABLA).eq('id', id).actualizar(cuerpo);
  const [perfil] = filas;
  if (!perfil) {
    throw new ErrorDelServidor('El servidor no ha devuelto el perfil esperado.');
  }
  return perfil;
}
