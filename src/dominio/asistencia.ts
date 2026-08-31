/**
 * Reglas de negocio de asistencia (T-03, reescrito por completo en T-18 sobre el tipo oficial
 * `Rol` de `dominio/tipos.ts`, igual que T-15/T-17 hicieron con `slotHorario.ts`/`slots.ts`): qué
 * `ocurrido_en` es válido al registrar, si el origen declarado es coherente con el `slot_id`
 * recibido, quién puede registrar en nombre de otro profesor, y quién puede editar qué registro
 * (T-21). Los mismos invariantes se garantizan también en la base de datos (la RPC
 * `registrar_asistencia`, `db/005_rpc_registrar_asistencia.sql`), porque el cliente es código que
 * el usuario controla; estas funciones son la versión de dominio, testeada sin red y con el reloj
 * inyectado, que la interfaz usa para dar feedback inmediato antes de que la base de datos tenga
 * la última palabra.
 *
 * Corrección de bookkeeping (documentada en DECISIONES_TECNICAS.md): la versión provisional de
 * T-03 fijaba `MARGEN_RETROACTIVIDAD_MS` en 60 000 ms (1 minuto), pero el `CHECK
 * asistencia_retroactivo_coherente` de `db/001_esquema_inicial.sql` —ya aplicado e inmutable—
 * exige exactamente 300 segundos (5 minutos). Esta reescritura corrige la constante para que
 * coincida con la restricción real de la base de datos, que es la fuente de verdad.
 */

import type { Reloj } from '../nucleo/reloj.ts';
import type { OrigenAsistencia, Rol } from './tipos.ts';

/** Margen entre `ocurrido_en` y `registrado_en` por debajo del cual un registro se considera "en
 * vivo" y no retroactivo. Debe coincidir EXACTAMENTE con el `CHECK asistencia_retroactivo_coherente`
 * de `db/001_esquema_inicial.sql` (300 segundos): la RPC `registrar_asistencia` inserta con este
 * mismo criterio, y el `CHECK` aborta la inserción si alguna vez se desincronizan. */
export const MARGEN_RETROACTIVIDAD_MS = 300_000;

/** Ventana máxima hacia atrás que admite un `ocurrido_en` explícito al REGISTRAR por primera vez
 * (requisito 1 de T-18: "valida que no está en el futuro ni más allá de la ventana permitida hacia
 * atrás"). Valor conservador de partida, mismo criterio que el resto de cifras de este proyecto
 * (T-06, T-17): documentado como pregunta abierta en §6 de SEGUIMIENTO.md para que el dueño lo
 * confirme; configurable sin migración porque la RPC la aplica como constante SQL, no leída de
 * ninguna tabla. Coincide numéricamente con `VENTANA_EDICION_TEACHER_DIAS` de T-21, pero son dos
 * conceptos distintos (registrar por primera vez vs. editar un registro ya existente) que podrían
 * divergir si el dueño responde de forma distinta a cada pregunta. */
export const VENTANA_RETROACTIVA_MAXIMA_DIAS = 7;

/** Ventana por defecto en la que un `teacher` puede editar sus propios registros, en días. Valor
 * conservador citado en la spec de T-21 y en la pregunta abierta #para el dueño de §6 de
 * SEGUIMIENTO.md; configurable por si el dueño decide otro valor. */
export const VENTANA_EDICION_TEACHER_DIAS = 7;

/** ¿Debe marcarse `es_retroactivo`? Verdadero cuando `ocurrido_en` difiere de `registrado_en` más
 * allá del margen de tolerancia — misma fórmula exacta que el `CHECK` de la base de datos. */
export function esRetroactivo(
  ocurridoEn: Date,
  registradoEn: Date,
  margenMs: number = MARGEN_RETROACTIVIDAD_MS,
): boolean {
  return Math.abs(registradoEn.getTime() - ocurridoEn.getTime()) > margenMs;
}

/** ¿Es coherente `origen` con `slotId` (requisito 1 de T-18)? `slot` exige un `slotId` no nulo;
 * `manual` exige que sea nulo. Misma condición exacta que el `CHECK
 * asistencia_snapshot_slot_coherente` de la base de datos (que además exige el resto del snapshot,
 * fuera del alcance de esta función pura). */
export function origenCoherente(origen: OrigenAsistencia, slotId: string | null): boolean {
  return origen === 'slot' ? slotId !== null : slotId === null;
}

/**
 * ¿Es válido `ocurridoEn` como instante atribuido a un registro nuevo? Rechaza un instante en el
 * futuro (estrictamente posterior a `registradoEn`) y uno que supere `ventanaMaximaDias` hacia
 * atrás. No decide `es_retroactivo` (eso es `esRetroactivo`, con su propio margen mucho más corto):
 * un `ocurridoEn` puede ser válido y retroactivo a la vez.
 */
export function ocurridoEnValido(
  ocurridoEn: Date,
  registradoEn: Date,
  ventanaMaximaDias: number = VENTANA_RETROACTIVA_MAXIMA_DIAS,
): boolean {
  if (ocurridoEn.getTime() > registradoEn.getTime()) {
    return false;
  }
  const limiteMs = ventanaMaximaDias * 24 * 60 * 60 * 1000;
  return registradoEn.getTime() - ocurridoEn.getTime() <= limiteMs;
}

export interface UsuarioAutenticado {
  readonly id: string;
  readonly rol: Rol;
}

/** ¿Puede `usuario` registrar asistencia en nombre de OTRO profesor (requisito 2 de T-18)? Solo
 * `administrator`; ni siquiera para sí mismo hace falta esta función (un `teacher` registra sin
 * pasar ningún `profesorId` explícito, usando su propia identidad). */
export function puedeRegistrarEnNombreDeOtro(usuario: UsuarioAutenticado): boolean {
  return usuario.rol === 'administrator';
}

export interface RegistroAsistencia {
  readonly profesorId: string;
  readonly registradoEn: Date;
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
