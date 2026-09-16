/**
 * Lógica pura de la baja programada de un profesor (R-22): la cuarta combinación de la matriz de
 * excepciones, simétrica a `dominio/excepcionSlot.ts` (R-06, un slot y un día), `dominio/cierresCentro.ts`
 * (R-12, todo el centro y un rango) y `dominio/pausaAlumno.ts` (R-21, un alumno y un rango) — esta vez
 * TODOS los slots de un profesor durante un rango de días. Las reglas de coherencia que aquí se
 * validan se repiten en el servidor (`declarar_baja_profesor`, `db/018_baja_profesor.sql`), que es la
 * comprobación autoritativa; esta función solo evita un viaje de red para un error evidente y calcula
 * la vista previa (requisito 3 de R-22, mismo patrón que la importación masiva de R-08).
 *
 * Fechas siempre como texto `AAAA-MM-DD`: ninguna función de este fichero construye un `Date` salvo
 * como calculadora de calendario pura (mismo criterio que `excepcionSlot.ts`/`informeMensualAlumno.ts`),
 * nunca como instante ni leyendo el reloj del sistema.
 */

import type { BajaProfesor, SlotHorario } from './tipos.ts';
import { fechaCoincideConDiaSemana } from './excepcionSlot.ts';

/** ¿Es `fechaFin` igual o posterior a `fechaInicio`? Único rango válido (requisito 1: "fecha de
 * inicio, fecha de fin, ambas inclusive"), mismo criterio que `rangoPausaValido` de R-21. */
export function rangoBajaValido(fechaInicio: string, fechaFin: string): boolean {
  return fechaFin >= fechaInicio;
}

/** Clave estable `slotId|fecha` para indexar en un `Set`/`Map` qué combinaciones ya tienen registro
 * de asistencia o excepción activa — única forma de construir esa clave, para que quien llama
 * (`datos/bajasProfesor.ts`) y quien la consulta (`combinacionesBajaProfesor`) nunca diverjan. */
export function claveCombinacionBaja(slotId: string, fecha: string): string {
  return `${slotId}|${fecha}`;
}

function siguienteFecha(fecha: string): string {
  const partes = fecha.split('-').map(Number);
  const [anio = 0, mes = 1, dia = 1] = partes;
  return new Date(Date.UTC(anio, mes - 1, dia + 1)).toISOString().slice(0, 10);
}

export interface CombinacionBajaProfesor {
  readonly slot: SlotHorario;
  readonly fecha: string;
  readonly excluido: boolean;
  /** `null` si `excluido` es `false`. */
  readonly motivoExclusion: string | null;
}

export interface ParametrosCombinacionesBajaProfesor {
  readonly fechaInicio: string;
  readonly fechaFin: string;
  /** Todos los slots (cualquier vigencia) del profesor titular de la baja —
   * `listarSlotsDeProfesores(cliente, [profesorId])`, T-15. */
  readonly slots: readonly SlotHorario[];
  /** Claves (`claveCombinacionBaja`) con al menos un registro de asistencia ya existente ese slot
   * ese día (requisito 3: excluye la creación, no bloquea el resto). */
  readonly clavesConAsistencia: ReadonlySet<string>;
  /** Claves (`claveCombinacionBaja`) con una excepción ACTIVA ya declarada ese slot ese día —
   * `declarar_excepcion_slot` la rechazaría por duplicado; se excluye por el mismo motivo que un
   * registro de asistencia existente, en vez de dejar que la RPC la rechace con error. */
  readonly clavesConExcepcionActiva: ReadonlySet<string>;
}

const MOTIVO_EXCLUSION_ASISTENCIA = 'Ya hay registros de asistencia de este slot ese día.';
const MOTIVO_EXCLUSION_EXCEPCION = 'Ya hay una excepción declarada para este slot y esta fecha.';

/** Todas las combinaciones (slot, fecha) que caen dentro de `[fechaInicio, fechaFin]` (requisito 2 de
 * R-22): un slot solo cuenta los días que coinciden con su propio día de la semana, y solo mientras
 * esté vigente ese día concreto (snapshot histórico, mismo criterio que `sesionesEsperadasDelMes` de
 * R-04). Cada combinación llega marcada `excluido`/`motivoExclusion` si ya hay un registro de
 * asistencia o una excepción activa ese día (requisito 3) — la vista previa (y la propia RPC,
 * autoritativa) nunca declaran una excepción sobre esas, pero el resto del rango se declara
 * igualmente. Ordenadas por fecha y, dentro del mismo día, por slot. */
export function combinacionesBajaProfesor(parametros: ParametrosCombinacionesBajaProfesor): readonly CombinacionBajaProfesor[] {
  const { fechaInicio, fechaFin, slots, clavesConAsistencia, clavesConExcepcionActiva } = parametros;
  const combinaciones: CombinacionBajaProfesor[] = [];

  for (let fecha = fechaInicio; fecha <= fechaFin; fecha = siguienteFecha(fecha)) {
    for (const slot of slots) {
      if (fecha < slot.vigente_desde || (slot.vigente_hasta !== null && fecha > slot.vigente_hasta)) {
        continue;
      }
      if (!fechaCoincideConDiaSemana(fecha, slot.dia_semana)) {
        continue;
      }
      const clave = claveCombinacionBaja(slot.id, fecha);
      if (clavesConAsistencia.has(clave)) {
        combinaciones.push({ slot, fecha, excluido: true, motivoExclusion: MOTIVO_EXCLUSION_ASISTENCIA });
      } else if (clavesConExcepcionActiva.has(clave)) {
        combinaciones.push({ slot, fecha, excluido: true, motivoExclusion: MOTIVO_EXCLUSION_EXCEPCION });
      } else {
        combinaciones.push({ slot, fecha, excluido: false, motivoExclusion: null });
      }
    }
  }

  return combinaciones;
}

/** ¿Puede cancelarse `baja` hoy (requisito 5)? Solo si sigue `'activa'` Y todavía no ha empezado —
 * una baja ya en curso no se cancela entera, se acorta (`puedeAcortarBaja`). Mismo criterio exacto
 * que `puedeCancelarPausa` de R-21. */
export function puedeCancelarBaja(baja: BajaProfesor, hoy: string): boolean {
  return baja.estado === 'activa' && baja.fecha_inicio > hoy;
}

/** ¿Puede acortarse `baja` hoy (requisito 5)? Solo si sigue `'activa'` Y hoy cae dentro de su rango —
 * mismo criterio exacto que `puedeAcortarPausa` de R-21. */
export function puedeAcortarBaja(baja: BajaProfesor, hoy: string): boolean {
  return baja.estado === 'activa' && baja.fecha_inicio <= hoy && baja.fecha_fin >= hoy;
}

export type CategoriaBaja = 'anulada' | 'pasada' | 'en_curso' | 'futura';

/** Categoría de `baja` respecto a `hoy`, para que la pantalla agrupe y ofrezca la acción correcta sin
 * repetir esta lógica — mismo criterio exacto que `categoriaPausa` de R-21. */
export function categoriaBaja(baja: BajaProfesor, hoy: string): CategoriaBaja {
  if (baja.estado === 'anulada') {
    return 'anulada';
  }
  if (baja.fecha_fin < hoy) {
    return 'pasada';
  }
  if (baja.fecha_inicio > hoy) {
    return 'futura';
  }
  return 'en_curso';
}
