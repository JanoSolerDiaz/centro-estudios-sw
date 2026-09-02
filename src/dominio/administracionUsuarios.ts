/**
 * Lógica pura de administración de usuarios (T-24): validación del nombre y defensa en profundidad
 * del invariante "el último administrator activo no puede desactivarse ni degradarse a sí mismo"
 * (requisito 4 de su spec). Sin acceso a red ni al DOM, mismo criterio que `dominio/asistencia.ts`.
 *
 * El invariante real vive en la base de datos: el trigger `perfil_before_update`
 * (`db/009_administracion_usuarios.sql`) es quien de verdad lo protege, porque el cliente es código
 * que el usuario controla. `dejariaSinAdministratorActivo` replica esa MISMA condición en el
 * cliente para poder desactivar el control de la interfaz antes de que el servidor tenga que
 * rechazarlo — mismo patrón exacto que `motivoAnulacionValido`/`puedeCambiarSlotAtribuido` de
 * `dominio/asistencia.ts` (T-21) frente a `actualizar_asistencia`.
 */

import { normalizarNombrePersona } from './alumno.ts';
import type { Perfil, Rol } from './tipos.ts';

export { normalizarNombrePersona as normalizarNombreUsuario };

/** `true` si `valorNormalizado` (ya pasado por `normalizarNombreUsuario`) es un nombre aceptable
 * para mostrar: no vacío. Sin más restricciones — a diferencia del alumno, aquí no hay un `CHECK`
 * de formato que replicar, solo `not null` sobre una columna de texto libre. */
export function nombreUsuarioValido(valorNormalizado: string): boolean {
  return valorNormalizado.length > 0;
}

/** Solo los campos que importan para la comprobación de abajo: cualquier lista de perfiles sirve,
 * completa o parcial, sin arrastrar el resto de columnas de `Perfil`. */
export type PerfilParaComprobacion = Pick<Perfil, 'id' | 'rol' | 'activo'>;

/** El cambio de rol y/o de estado que se está a punto de enviar. Ambos opcionales: solo se evalúa
 * el que de verdad se está tocando, igual que `p_nota_provista` en `actualizar_asistencia` — omitir
 * un campo significa "no tocarlo", no "ponlo a un valor por defecto". */
export interface CambioPerfilUsuario {
  readonly rol?: Rol;
  readonly activo?: boolean;
}

/** `true` si aplicar `cambio` sobre `objetivo` dejaría al sistema sin ningún `administrator`
 * activo — EXACTAMENTE la condición del trigger `perfil_before_update`: la fila objetivo era un
 * administrator activo, el cambio le quita esa condición (cambia de rol o se desactiva), y no
 * queda ninguna OTRA fila de `usuarios` que sea administrator activo. No importa si el cambio lo
 * hace la propia persona o otro administrator: si el resultado deja el sistema sin ningún
 * administrator activo, es exactamente el caso que hay que impedir. */
export function dejariaSinAdministratorActivo(
  usuarios: readonly PerfilParaComprobacion[],
  objetivo: PerfilParaComprobacion,
  cambio: CambioPerfilUsuario,
): boolean {
  if (objetivo.rol !== 'administrator' || !objetivo.activo) {
    return false;
  }
  const rolFinal = cambio.rol ?? objetivo.rol;
  const activoFinal = cambio.activo ?? objetivo.activo;
  if (rolFinal === 'administrator' && activoFinal) {
    return false;
  }
  return !usuarios.some((u) => u.id !== objetivo.id && u.rol === 'administrator' && u.activo);
}
