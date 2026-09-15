/**
 * Lógica pura de la pausa programada de un alumno (R-21): un periodo declarado en el que un alumno
 * concreto no da clase. Mismo principio que `dominio/cierresCentro.ts` (R-12, a nivel de centro) y
 * `dominio/excepcionSlot.ts` (R-06, a nivel de slot), aplicado esta vez a nivel de alumno — las
 * reglas de coherencia que aquí se validan se repiten en el servidor (`declarar_pausa_alumno`,
 * `db/017_pausa_alumno.sql`), que es la comprobación autoritativa; esta función solo evita un viaje
 * de red para un error evidente.
 *
 * Fechas siempre como texto `AAAA-MM-DD` (lo que devuelve una columna `date` de PostgREST): la
 * comparación lexicográfica de ese formato coincide con el orden cronológico, así que ninguna
 * función de este fichero construye un `Date` ni lee el reloj del sistema — el "hoy" con el que se
 * compara llega siempre por parámetro, resuelto por quien llama con el reloj inyectado (T-03).
 */

import type { PausaAlumno } from './tipos.ts';
import type { SlotConAlumno } from './slots.ts';

/** ¿Es `fechaFin` igual o posterior a `fechaInicio`? Única forma válida de rango (requisito 1: "con
 * fecha de inicio y fecha de fin, ambas inclusive"). */
export function rangoPausaValido(fechaInicio: string, fechaFin: string): boolean {
  return fechaFin >= fechaInicio;
}

/** ¿Es `motivo` un valor válido? SIEMPRE opcional (requisito 1 y 7: "nunca una lista cerrada de
 * motivos"): ausente o vacío es válido, y si se da, no puede ser solo espacios en blanco — mismo
 * criterio que el `CHECK pausa_alumno_motivo_no_vacio` del servidor. */
export function motivoPausaValido(motivo: string | null | undefined): boolean {
  return motivo?.trim() !== '';
}

interface RangoPausa {
  readonly fecha_inicio: string;
  readonly fecha_fin: string;
}

function rangosPausaSolapan(a: RangoPausa, b: RangoPausa): boolean {
  return a.fecha_inicio <= b.fecha_fin && b.fecha_inicio <= a.fecha_fin;
}

/** La primera pausa ACTIVA de `existentes` (ya acotadas al mismo alumno por quien llama, mismo
 * criterio que `buscarCierreSolapado` de R-12) que se pisa en fecha con `candidato`, ignorando el
 * propio `excluirId` — requisito 4 ("nunca sobre un rango que se solape con... una pausa ya
 * declarada"), comprobación rápida en el cliente antes del viaje de red; la comprobación
 * autoritativa vive en `declarar_pausa_alumno`. */
export function buscarPausaSolapada(
  candidato: RangoPausa,
  existentes: readonly PausaAlumno[],
  excluirId?: string,
): PausaAlumno | undefined {
  return existentes.find(
    (existente) => existente.id !== excluirId && existente.estado === 'activa' && rangosPausaSolapan(existente, candidato),
  );
}

/** ¿Cae `fecha` (`AAAA-MM-DD`) dentro de una pausa ACTIVA de `pausas`? Solo una pausa `'activa'`
 * cuenta — una anulada nunca afecta a nada (requisito 5: cancelarla solo tiene sentido si todavía no
 * ha empezado, así que nunca hay nada que excluir por una pausa ya anulada). */
export function pausaVigenteEnFecha(pausa: PausaAlumno, fecha: string): boolean {
  return pausa.estado === 'activa' && fecha >= pausa.fecha_inicio && fecha <= pausa.fecha_fin;
}

/** La pausa ACTIVA de `alumnoId` que cubre `fecha`, si la hay — única vía para saberlo (mismo
 * principio que `excepcionDelDia` de R-06): la usan tanto el motor de propuesta (T-19, para no
 * ofrecer a ese alumno como pendiente) como «Mi horario» (T-22, para relabelar su hueco de hoy) y el
 * bloque de pausas de la ficha de alumno (T-12, para saber qué acción ofrecer). */
export function pausaDeAlumnoEnFecha(alumnoId: string, fecha: string, pausas: readonly PausaAlumno[]): PausaAlumno | undefined {
  return pausas.find((pausa) => pausa.alumno_id === alumnoId && pausaVigenteEnFecha(pausa, fecha));
}

/** ¿`fecha` queda excluida de "sesiones esperadas" para `alumnoId` (requisito 3 de R-21, mismo
 * principio que `esDiaCerrado` de R-12 y `esDiaCanceladoParaSlot` de R-06, aplicado a nivel de
 * alumno)? Pensada para el informe mensual (R-04) y el ranking de ausencias del panel de centro
 * (R-11), que reutilizan esta única función en vez de comparar fechas cada uno por su cuenta. */
export function esDiaPausadoParaAlumno(alumnoId: string, fecha: string, pausas: readonly PausaAlumno[]): boolean {
  return pausaDeAlumnoEnFecha(alumnoId, fecha, pausas) !== undefined;
}

/** Los slots de `slots` cuyo alumno NO está en pausa en `fecha` (requisito 2 de R-21): alimenta el
 * motor de propuesta (T-19, `dominio/slots.ts#alumnosPropuestos`) sin tocar esa función, mismo
 * patrón exacto que `slotsEfectivosDelDia` de R-06 — un alumno en pausa simplemente no se ofrece
 * como pendiente ese día, en ninguno de sus slots; el resto de alumnos del mismo slot (si el slot
 * fuera compartido) no se ven afectados en absoluto, porque este filtro es por alumno, no por
 * slot. */
export function excluirAlumnosPausadosHoy(
  slots: readonly SlotConAlumno[],
  fecha: string,
  pausas: readonly PausaAlumno[],
): readonly SlotConAlumno[] {
  return slots.filter((slot) => !esDiaPausadoParaAlumno(slot.alumno.id, fecha, pausas));
}

export interface AlumnoPausadoHoy {
  readonly alumno: SlotConAlumno['alumno'];
  readonly pausa: PausaAlumno;
}

/** Los alumnos de `slots` que SÍ están en pausa hoy, uno por alumno (requisito 6: el teacher ve,
 * sobre el hueco donde estaría el alumno, que está en pausa y hasta cuándo, para no interpretarlo
 * como un alumno que ha dejado de existir en ese slot ese día) — un alumno con varios slots con el
 * mismo profesor aparece una sola vez. Ordenados por nombre. */
export function alumnosPausadosHoy(
  slots: readonly SlotConAlumno[],
  fecha: string,
  pausas: readonly PausaAlumno[],
): readonly AlumnoPausadoHoy[] {
  const vistos = new Map<string, AlumnoPausadoHoy>();
  for (const slot of slots) {
    if (vistos.has(slot.alumno.id)) {
      continue;
    }
    const pausa = pausaDeAlumnoEnFecha(slot.alumno.id, fecha, pausas);
    if (pausa) {
      vistos.set(slot.alumno.id, { alumno: slot.alumno, pausa });
    }
  }
  return [...vistos.values()].sort((a, b) =>
    `${a.alumno.primer_apellido} ${a.alumno.nombre}`.localeCompare(`${b.alumno.primer_apellido} ${b.alumno.nombre}`, 'es', {
      sensitivity: 'base',
    }),
  );
}

/** ¿Puede cancelarse `pausa` hoy (requisito 5)? Solo si sigue `'activa'` Y todavía no ha empezado —
 * una pausa ya en curso no se cancela entera, se acorta (`puedeAcortarPausa`). */
export function puedeCancelarPausa(pausa: PausaAlumno, hoy: string): boolean {
  return pausa.estado === 'activa' && pausa.fecha_inicio > hoy;
}

/** ¿Puede acortarse `pausa` hoy (requisito 5)? Solo si sigue `'activa'` Y hoy cae dentro de su
 * rango — una que todavía no ha empezado se cancela entera (`puedeCancelarPausa`), no se acorta. */
export function puedeAcortarPausa(pausa: PausaAlumno, hoy: string): boolean {
  return pausa.estado === 'activa' && pausa.fecha_inicio <= hoy && pausa.fecha_fin >= hoy;
}

export type CategoriaPausa = 'anulada' | 'pasada' | 'en_curso' | 'futura';

/** Categoría de `pausa` respecto a `hoy` (requisito 5: la ficha de alumno lista "pasadas, en curso y
 * futuras"), para que la pantalla agrupe y ofrezca la acción correcta sin repetir esta lógica. Una
 * pausa anulada lo es con independencia de sus fechas — quedó cancelada antes de que llegara a
 * regir. */
export function categoriaPausa(pausa: PausaAlumno, hoy: string): CategoriaPausa {
  if (pausa.estado === 'anulada') {
    return 'anulada';
  }
  if (pausa.fecha_fin < hoy) {
    return 'pasada';
  }
  if (pausa.fecha_inicio > hoy) {
    return 'futura';
  }
  return 'en_curso';
}
