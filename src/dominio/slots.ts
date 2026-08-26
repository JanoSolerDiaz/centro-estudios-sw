/**
 * Vigencia de slots de horario y resolución de "qué alumnos tocan ahora" (T-03, ampliado en T-15
 * y T-17). Lógica pura: ninguna función de aquí lee la hora del sistema directamente, siempre
 * reciben un `Reloj` inyectado (ver `src/nucleo/reloj.ts` y el test de guardia
 * `src/dominio/disciplinaReloj.test.ts`).
 *
 * Provisional: el día de la semana y la hora se leen en UTC (`getUTCDay`/`getUTCHours`), no en la
 * zona horaria del centro (`ZONA_HORARIA_CENTRO`, ver `.env.ejemplo`). Es una simplificación
 * deliberada para no depender de ninguna variable de entorno en los tests (§0.1: la suite corre
 * sin credenciales ni configuración). La zona horaria real y la ventana de tolerancia son pregunta
 * abierta para T-17 (ver §6 de SEGUIMIENTO.md); cuando se resuelva, esta función pasa a recibir la
 * zona horaria como parámetro explícito en vez de asumir UTC.
 */

import type { Reloj } from '../nucleo/reloj.ts';

/** ISO 8601: 1 = lunes ... 7 = domingo. */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SlotHorario {
  readonly id: string;
  readonly alumnoId: string;
  readonly profesorId: string;
  readonly diaSemana: DiaSemana;
  /** Formato `HH:MM`, 24 horas. */
  readonly horaInicio: string;
  /** Formato `HH:MM`, 24 horas. Exclusiva: el slot no está activo en el minuto de `horaFin`. */
  readonly horaFin: string;
  readonly vigenteDesde: Date;
  /** `null` = todavía vigente, sin fecha de fin. */
  readonly vigenteHasta: Date | null;
}

function diaSemanaIso(fecha: Date): DiaSemana {
  const diaJs = fecha.getUTCDay(); // 0 = domingo ... 6 = sábado
  return (diaJs === 0 ? 7 : diaJs) as DiaSemana;
}

function minutosDesdeMedianoche(horaHHMM: string): number {
  const [horasTexto, minutosTexto] = horaHHMM.split(':');
  return Number(horasTexto) * 60 + Number(minutosTexto);
}

/** ¿Está el slot vigente (dentro de `vigenteDesde`/`vigenteHasta`) en ese instante? No mira el día
 * ni la hora del slot, solo su ventana de vigencia. */
export function slotVigente(slot: SlotHorario, instante: Date): boolean {
  if (instante < slot.vigenteDesde) {
    return false;
  }
  return slot.vigenteHasta === null || instante <= slot.vigenteHasta;
}

/** ¿Toca este slot exactamente en ese instante? Vigente, mismo día de la semana y dentro del
 * rango horario (`horaInicio` inclusiva, `horaFin` exclusiva). */
export function slotActivoEnInstante(slot: SlotHorario, instante: Date): boolean {
  if (!slotVigente(slot, instante)) {
    return false;
  }
  if (diaSemanaIso(instante) !== slot.diaSemana) {
    return false;
  }
  const minutosInstante = instante.getUTCHours() * 60 + instante.getUTCMinutes();
  return (
    minutosInstante >= minutosDesdeMedianoche(slot.horaInicio) &&
    minutosInstante < minutosDesdeMedianoche(slot.horaFin)
  );
}

/** Los slots que tocan ahora mismo, según el reloj inyectado. Base del motor de propuesta de
 * T-17: aquí solo resuelve el cruce de vigencia + día + hora, sin alumnos extra ni ventana de
 * tolerancia. */
export function slotsQueTocanAhora(slots: readonly SlotHorario[], reloj: Reloj): SlotHorario[] {
  const instante = reloj.ahora();
  return slots.filter((slot) => slotActivoEnInstante(slot, instante));
}
