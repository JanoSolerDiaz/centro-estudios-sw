/**
 * Reglas de negocio de asistencia que no dependen de PostgreSQL (T-03, ampliado en T-18/T-21):
 * no-retroactividad del histórico y quién puede editar qué registro. Los mismos invariantes se
 * garantizan también en la base de datos (trigger, RLS, RPC — §0.2), porque el cliente es código
 * que el usuario controla; estas funciones son la versión de dominio, testeada sin red, que la
 * interfaz usa para decidir qué mostrar y qué intentar antes de que la base de datos tenga la
 * última palabra.
 */

import type { Reloj } from '../nucleo/reloj.ts';

/** Margen entre `ocurrido_en` y `registrado_en` por debajo del cual un registro se considera "en
 * vivo" y no retroactivo, para absorber la latencia normal de pasar lista. */
export const MARGEN_RETROACTIVIDAD_MS = 60_000;

/** Ventana por defecto en la que un `teacher` puede editar sus propios registros, en días. Valor
 * conservador citado en la spec de T-21 y en la pregunta abierta #para el dueño de §6 de
 * SEGUIMIENTO.md; configurable por si el dueño decide otro valor. */
export const VENTANA_EDICION_TEACHER_DIAS = 7;

/** ¿Debe marcarse `es_retroactivo`? Verdadero cuando `ocurrido_en` difiere de `registrado_en` más
 * allá del margen de tolerancia. */
export function esRetroactivo(
  ocurridoEn: Date,
  registradoEn: Date,
  margenMs: number = MARGEN_RETROACTIVIDAD_MS,
): boolean {
  return Math.abs(registradoEn.getTime() - ocurridoEn.getTime()) > margenMs;
}

export type RolUsuario = 'administrator' | 'teacher' | 'student';

export interface RegistroAsistencia {
  readonly profesorId: string;
  readonly registradoEn: Date;
}

export interface UsuarioAutenticado {
  readonly id: string;
  readonly rol: RolUsuario;
}

/**
 * ¿Puede `usuario` editar `registro`? `administrator` siempre puede, sobre cualquier registro.
 * `teacher` solo sobre sus propios registros (`profesorId === usuario.id`) y dentro de la ventana
 * de edición desde que se registraron. `student` nunca, sin excepción (§0.2: sin acceso alguno a
 * esta funcionalidad).
 */
export function puedeEditarAsistencia(
  registro: RegistroAsistencia,
  usuario: UsuarioAutenticado,
  reloj: Reloj,
  ventanaDias: number = VENTANA_EDICION_TEACHER_DIAS,
): boolean {
  if (usuario.rol === 'administrator') {
    return true;
  }
  if (usuario.rol !== 'teacher') {
    return false;
  }
  if (registro.profesorId !== usuario.id) {
    return false;
  }
  const limiteMs = ventanaDias * 24 * 60 * 60 * 1000;
  return reloj.ahora().getTime() - registro.registradoEn.getTime() <= limiteMs;
}
