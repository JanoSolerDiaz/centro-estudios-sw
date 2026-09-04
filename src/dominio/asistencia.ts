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
import type { Asistencia, MotivoJustificacionAusencia, OrigenAsistencia, Rol } from './tipos.ts';
import { minutosDesdeMedianoche } from './slotHorario.ts';

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

/** ¿Es válido `motivo` para anular un registro (requisito 4 de T-21: "motivo obligatorio")? Rechaza
 * `null` y una cadena que, una vez recortada, quede vacía — misma condición exacta que la RPC
 * `actualizar_asistencia` (`db/008_rpc_actualizar_asistencia.sql`: `length(trim(p_motivo_anulacion))
 * = 0`), para que la interfaz pueda deshabilitar el botón de confirmar antes de que el servidor
 * tenga que rechazarlo. */
export function motivoAnulacionValido(motivo: string | null): boolean {
  return motivo !== null && motivo.trim().length > 0;
}

/** Lista corta cerrada de motivos de justificación de una ausencia (R-02, requisito 1) — debe
 * coincidir EXACTAMENTE con el `CHECK asistencia_motivo_justificacion_valido` de
 * `db/011_justificacion_ausencia.sql`. Exportada para que la interfaz construya el `<select>` de
 * motivos sin duplicar la lista. */
export const MOTIVOS_JUSTIFICACION_AUSENCIA: readonly MotivoJustificacionAusencia[] = [
  'enfermedad',
  'cita_medica',
  'motivo_familiar',
  'otro',
];

/** ¿Es válido `motivo` para justificar una ausencia (requisito 1 de R-02: "motivo de una lista corta
 * cerrada")? A diferencia de `motivoAnulacionValido` (texto libre no vacío), aquí el valor tiene que
 * ser exactamente uno de `MOTIVOS_JUSTIFICACION_AUSENCIA` — misma condición exacta que la RPC
 * `actualizar_asistencia` (`db/011_justificacion_ausencia.sql`). */
export function motivoJustificacionValido(motivo: string | null): motivo is MotivoJustificacionAusencia {
  return motivo !== null && (MOTIVOS_JUSTIFICACION_AUSENCIA as readonly string[]).includes(motivo);
}

/** ¿Tiene sentido ofrecer "justificar" (requisitos 1 y 3 de R-02) sobre `registro`? Solo una ausencia
 * ya registrada se puede justificar — "la justificación no cambia el hecho registrado... no existe
 * des-ausentar". La RPC aplica la misma condición exacta (`v_actual.estado <> 'ausente'`) y la
 * rechaza si se intenta de todos modos; esta función es solo para que la interfaz no ofrezca la
 * acción donde no puede funcionar nunca. */
export function puedeJustificarAusencia(registro: Pick<Asistencia, 'estado'>): boolean {
  return registro.estado === 'ausente';
}

/** ¿Tiene sentido ofrecer "cambiar el slot atribuido" (requisito 4 de T-21) sobre `registro`? Solo
 * un registro de origen `slot` tiene un slot que cambiar — uno `manual` (T-20, alumno extra) no. La
 * RPC aplica la misma condición exacta (`v_actual.origen <> 'slot'`) y la rechaza si se intenta de
 * todos modos; esta función es solo para que la interfaz no ofrezca la acción donde no puede
 * funcionar nunca. */
export function puedeCambiarSlotAtribuido(registro: Pick<Asistencia, 'origen'>): boolean {
  return registro.origen === 'slot';
}

/** Clave de un registro por alumno y slot (T-19, requisito 5: "al abrir, ya se ve quién está
 * registrado hoy en ese slot"), único criterio para cruzar la propuesta (`alumnosPropuestos`,
 * `dominio/slots.ts`) con lo que ya devolvió el servidor — mismas dos columnas que la restricción
 * `asistencia_uq_alumno_slot_dia_valida` de `db/005_rpc_registrar_asistencia.sql` (más el día, que
 * aquí no hace falta comparar porque quien llama ya acota la consulta a "hoy" con `limitesDiaLocal`). */
export function claveRegistroPorSlot(alumnoId: string, slotId: string): string {
  return `${alumnoId}:${slotId}`;
}

/** ¿Tiene sentido ofrecer "marcar salida" (requisito 1 de R-03) sobre `registro`? Solo un registro
 * `estado === 'valida'` (presente) sin salida marcada todavía — una ausencia no tiene entrada que
 * cerrar, y una salida ya marcada se corrige con el ajuste (`ocurridoEnSalidaValido`), no
 * volviéndola a marcar. La RPC aplica la misma condición exacta (`v_estado_final <> 'valida'` /
 * `v_actual.ocurrido_en_salida is not null`, `db/012_registro_salida.sql`) y la rechaza si se
 * intenta de todos modos; esta función es solo para que la interfaz no ofrezca la acción donde no
 * puede funcionar nunca. */
export function puedeMarcarSalida(registro: Pick<Asistencia, 'estado' | 'ocurrido_en_salida'>): boolean {
  return registro.estado === 'valida' && registro.ocurrido_en_salida === null;
}

/**
 * ¿Es válido `ocurridoEnSalida` como AJUSTE de una salida ya marcada (requisito 4 de R-03: "editable
 * con el mismo régimen que la hora de entrada")? Rechaza un instante en el futuro (relativo a
 * `ahora`), uno anterior o igual a `ocurridoEnEntrada` (no se puede salir antes o en el mismo
 * instante en que se entró) y uno que supere `ventanaMaximaDias` hacia atrás — misma ventana
 * conservadora que `ocurridoEnValido`. No decide si HAY una salida que ajustar (`puedeMarcarSalida`
 * cubre lo contrario, "todavía no tiene"); esta función solo valida el VALOR propuesto.
 */
export function ocurridoEnSalidaValido(
  ocurridoEnSalida: Date,
  ocurridoEnEntrada: Date,
  ahora: Date,
  ventanaMaximaDias: number = VENTANA_RETROACTIVA_MAXIMA_DIAS,
): boolean {
  if (ocurridoEnSalida.getTime() > ahora.getTime()) {
    return false;
  }
  if (ocurridoEnSalida.getTime() <= ocurridoEnEntrada.getTime()) {
    return false;
  }
  const limiteMs = ventanaMaximaDias * 24 * 60 * 60 * 1000;
  return ahora.getTime() - ocurridoEnSalida.getTime() <= limiteMs;
}

/** Duración real en minutos entre la entrada y la salida (requisito 3 de R-03), redondeada al
 * minuto — solo tiene sentido llamarla cuando la salida existe (`ocurrido_en_salida !== null`);
 * quien llama es responsable de esa comprobación, esta función no la repite. */
export function duracionRealMinutos(ocurridoEnEntrada: Date, ocurridoEnSalida: Date): number {
  return Math.round((ocurridoEnSalida.getTime() - ocurridoEnEntrada.getTime()) / 60_000);
}

/** Duración TEÓRICA del slot en minutos (requisito 3 de R-03: "junto a la duración teórica del
 * slot"), a partir del snapshot inmutable que guarda la propia fila de asistencia
 * (`slot_hora_inicio`/`slot_hora_fin`) — nunca de un `SlotHorario` vigente, que podría haber
 * cambiado después (no-retroactividad, §0.2). Reutiliza `minutosDesdeMedianoche` de
 * `slotHorario.ts` en vez de duplicar el análisis de `HH:MM`. */
export function duracionTeoricaMinutos(slotHoraInicio: string, slotHoraFin: string): number {
  return minutosDesdeMedianoche(slotHoraFin) - minutosDesdeMedianoche(slotHoraInicio);
}

/** Indexa `asistencias` (ya acotadas a "hoy" por quien llama) por `claveRegistroPorSlot`, para que
 * la pantalla de pasar lista (T-19) resuelva en O(1) si una card concreta ya está registrada o
 * marcada ausente. Solo indexa filas de origen `slot` (`slot_id` no nulo) con `estado` `'valida'` o
 * `'ausente'` (R-01): un registro `manual` (alumno extra, T-20) no bloquea ni marca ninguna card de
 * la rejilla, y uno `anulado` no cuenta como activo — mismo criterio EXACTO que el índice único
 * parcial `asistencia_uq_alumno_slot_dia_activa` de `db/010_registro_ausencias.sql`. */
export function registrosDeHoyPorAlumnoSlot(asistencias: readonly Asistencia[]): ReadonlyMap<string, Asistencia> {
  const mapa = new Map<string, Asistencia>();
  for (const fila of asistencias) {
    if (fila.slot_id !== null && (fila.estado === 'valida' || fila.estado === 'ausente')) {
      mapa.set(claveRegistroPorSlot(fila.alumno_id, fila.slot_id), fila);
    }
  }
  return mapa;
}
