/**
 * Vista de horario del centro (R-25): agrupa los slots vigentes del centro por SESIÓN — profesor,
 * día de la semana, hora de inicio/fin y asignatura/grupo compartidos —, mismo criterio de "misma
 * sesión" que `slotsDeLaMismaSesion` de `dominio/asistencia.ts` (ya usado por R-17/R-23 para
 * agrupar "quiénes son de la misma sesión" en un día de asistencia concreto), reutilizado aquí tal
 * cual pero aplicado a la vigencia de HOY en vez de a un día de asistencia — sin duplicar el
 * criterio de agrupación en un segundo sitio.
 *
 * Pura: quien llama decide cómo ordenar/pintar el resultado y de dónde sale `fecha` (el reloj
 * inyectado de la pantalla, nunca leído aquí).
 */

import type { DiaSemana, SlotHorario } from './tipos.ts';
import { slotVigenteEn, minutosDesdeMedianoche } from './slotHorario.ts';
import { slotsDeLaMismaSesion } from './asistencia.ts';

export interface SesionHorarioCentro<T extends SlotHorario & { readonly alumno: { readonly activo: boolean } }> {
  readonly profesorId: string;
  readonly diaSemana: DiaSemana;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly asignaturaOGrupo: string | null;
  /** Un slot por alumno del grupo — nunca vacío. */
  readonly slots: readonly T[];
}

/** Clave estable de una sesión: dos slots la comparten si y solo si coinciden en los cinco campos
 * que definen "la misma sesión" (mismo criterio que `slotsDeLaMismaSesion`). Se usa tanto para
 * agrupar aquí como, en la pantalla, para volver a encontrar una sesión tras recargar los datos —
 * los slots de los alumnos que NO se movieron conservan la misma clave de antes y después de un
 * intento fallido de edición en bloque. */
export function claveSesionHorarioCentro(sesion: {
  readonly profesorId: string;
  readonly diaSemana: DiaSemana;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly asignaturaOGrupo: string | null;
}): string {
  return [sesion.profesorId, sesion.diaSemana, sesion.horaInicio, sesion.horaFin, sesion.asignaturaOGrupo ?? '']
    .join('|');
}

/** Las sesiones vigentes en `fecha`, cada una con el alumno ACTIVO embebido de cada uno de sus
 * slots — un alumno de baja no aparece en ninguna sesión, mismo criterio que `slotsDeLaMismaSesion`
 * y que el motor de propuesta de `dominio/slots.ts` (T-17). Ordenadas por día de la semana y luego
 * por hora de inicio, para que la pantalla las pinte agrupadas por día sin tener que reordenar. */
export function sesionesVigentesDelCentro<T extends SlotHorario & { readonly alumno: { readonly activo: boolean } }>(
  slots: readonly T[],
  fecha: Date,
): readonly SesionHorarioCentro<T>[] {
  const candidatos = slots.filter((slot) => slot.alumno.activo && slotVigenteEn(slot, fecha));
  const vistos = new Set<string>();
  const sesiones: SesionHorarioCentro<T>[] = [];

  for (const slot of candidatos) {
    if (vistos.has(slot.id)) {
      continue;
    }
    const grupo = slotsDeLaMismaSesion(slot, candidatos, fecha);
    for (const slotDelGrupo of grupo) {
      vistos.add(slotDelGrupo.id);
    }
    sesiones.push({
      profesorId: slot.profesor_id,
      diaSemana: slot.dia_semana,
      horaInicio: slot.hora_inicio,
      horaFin: slot.hora_fin,
      asignaturaOGrupo: slot.asignatura_o_grupo,
      slots: grupo,
    });
  }

  return [...sesiones].sort((a, b) =>
    a.diaSemana !== b.diaSemana
      ? a.diaSemana - b.diaSemana
      : minutosDesdeMedianoche(a.horaInicio) - minutosDesdeMedianoche(b.horaInicio),
  );
}
