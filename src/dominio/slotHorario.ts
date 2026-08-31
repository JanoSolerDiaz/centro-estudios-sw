/**
 * Lógica pura de slots de horario (T-15): vigencia en un instante dado, detección de solape de
 * horario y el cálculo de fechas que exige el versionado por vigencia. Opera sobre el tipo oficial
 * `SlotHorario` de `dominio/tipos.ts` (campos `snake_case`, tal como los devuelve PostgREST). El
 * motor de "quién toca ahora" (día de la semana y hora local del centro, ventana de tolerancia)
 * vive en `dominio/slots.ts` (T-17), que reutiliza `slotVigenteEn` y `minutosDesdeMedianoche` de
 * aquí en vez de duplicar la vigencia por fecha.
 *
 * Nada de esto lee la hora del sistema directamente: toda fecha llega por parámetro (guardia
 * automática en `disciplinaReloj.test.ts`).
 */

import type { DiaSemana, SlotHorario } from './tipos.ts';

export interface DatosHorarioSlot {
  readonly dia_semana: DiaSemana;
  /** Formato `HH:MM`, 24 horas. */
  readonly hora_inicio: string;
  /** Formato `HH:MM`, 24 horas. Exclusiva: dos slots que solo se tocan en el minuto de `hora_fin`
   * de uno con el `hora_inicio` del otro NO se consideran solapados. */
  readonly hora_fin: string;
}

/** `HH:MM` a minutos desde medianoche. Compartida con `dominio/slots.ts` (T-17: la hora local del
 * centro también llega en este formato, vía `instanteLocal`), única fuente de este cálculo. */
export function minutosDesdeMedianoche(horaHHMM: string): number {
  const [horasTexto, minutosTexto] = horaHHMM.split(':');
  return Number(horasTexto) * 60 + Number(minutosTexto);
}

function rangosHorariosSolapan(a: DatosHorarioSlot, b: DatosHorarioSlot): boolean {
  if (a.dia_semana !== b.dia_semana) {
    return false;
  }
  const aInicio = minutosDesdeMedianoche(a.hora_inicio);
  const aFin = minutosDesdeMedianoche(a.hora_fin);
  const bInicio = minutosDesdeMedianoche(b.hora_inicio);
  const bFin = minutosDesdeMedianoche(b.hora_fin);
  return aInicio < bFin && bInicio < aFin;
}

/** El primer slot de `existentes` que se pisa en día y hora con `candidato`, ignorando el propio
 * `excluirId` (la versión que se está sustituyendo al editar), o `undefined` si ninguno se pisa.
 * `existentes` debe venir ya acotado a los slots relevantes (p. ej. los vigentes de un alumno o de
 * un profesor concreto) — esta función solo compara día y hora, nunca decide por sí misma qué
 * conjunto comprobar. Requisito 4 de T-15: quien llama decide si el resultado bloquea (mismo
 * alumno) o solo avisa (mismo profesor). */
export function buscarSlotSolapado(
  candidato: DatosHorarioSlot,
  existentes: readonly SlotHorario[],
  excluirId?: string,
): SlotHorario | undefined {
  return existentes.find((existente) => existente.id !== excluirId && rangosHorariosSolapan(existente, candidato));
}

/** ¿Está vigente `slot` en `fecha`? Solo mira `vigente_desde`/`vigente_hasta` (ambos límites
 * inclusivos), nunca día ni hora — para eso está `dominio/slots.ts` (`slotActivoEnInstante`, T-17,
 * que llama a esta función como parte de su comprobación). */
export function slotVigenteEn(slot: SlotHorario, fecha: Date): boolean {
  if (fecha < new Date(slot.vigente_desde)) {
    return false;
  }
  return slot.vigente_hasta === null || fecha <= new Date(slot.vigente_hasta);
}

/** Única vía para resolver qué versiones de slot estaban vigentes en `fecha` (requisito 5 de
 * T-15, literal: "función de dominio `slotsVigentesEn(fecha)` como única vía para consultar
 * horarios en un instante dado"). Cualquier código que necesite "el horario en una fecha" —
 * presente o pasada — debe pasar por aquí, nunca comparar `vigente_desde`/`vigente_hasta` a mano en
 * otro sitio: es lo que garantiza que el histórico se resuelva siempre contra el snapshot correcto,
 * nunca contra el horario vigente hoy. */
export function slotsVigentesEn(slots: readonly SlotHorario[], fecha: Date): readonly SlotHorario[] {
  return slots.filter((slot) => slotVigenteEn(slot, fecha));
}

/** Día natural anterior a `fecha`, en UTC — mismo criterio de "día" que `dominio/slots.ts` asume de
 * forma provisional (ver su cabecera). Se usa para cerrar la versión vigente de un slot al editar:
 * su `vigente_hasta` pasa a ser el día anterior a la fecha de efecto de la versión nueva, para que
 * las dos versiones nunca compartan un día de vigencia (los límites de vigencia son inclusivos). */
export function diaAnteriorUtc(fecha: Date): Date {
  const anterior = new Date(fecha.getTime());
  anterior.setUTCDate(anterior.getUTCDate() - 1);
  return anterior;
}

/** `fecha` en formato `AAAA-MM-DD` (lo que espera la columna `date` de Postgres), en UTC. */
export function fechaSoloDiaUtc(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
