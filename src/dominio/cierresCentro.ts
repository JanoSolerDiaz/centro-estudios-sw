/**
 * Lógica pura del calendario de cierres del centro (R-12): detección de solape entre dos periodos
 * de fecha y la única vía para consultar si una fecha cae dentro de un cierre vigente
 * (`esDiaCerrado`, requisito 4 — mismo principio que `slotsVigentesEn` de T-15: una sola función,
 * reutilizada por todo lo que necesite saberlo, nunca una comparación de fechas repetida a mano en
 * otro sitio).
 *
 * Las fechas viajan siempre como texto `AAAA-MM-DD` (el formato que devuelve una columna `date` de
 * PostgREST): la comparación lexicográfica de ese formato coincide con el orden cronológico, así
 * que no hace falta construir ningún `Date` ni leer el reloj del sistema — ninguna función de este
 * fichero toca la hora actual.
 */

import type { CierreCentro } from './tipos.ts';

export interface DatosCierreCentro {
  /** `AAAA-MM-DD`, inclusive. */
  readonly fecha_inicio: string;
  /** `AAAA-MM-DD`, inclusive; puede coincidir con `fecha_inicio` (un solo día). */
  readonly fecha_fin: string;
}

function rangosDeCierreSolapan(a: DatosCierreCentro, b: DatosCierreCentro): boolean {
  return a.fecha_inicio <= b.fecha_fin && b.fecha_inicio <= a.fecha_fin;
}

/** El primer cierre de `existentes` que se pisa en fecha con `candidato`, ignorando el propio
 * `excluirId` (la versión que se está editando), o `undefined` si ninguno se pisa (requisito 3 de
 * R-12). `existentes` debe venir ya acotado a los cierres relevantes — igual que
 * `buscarSlotSolapado` (T-15), esta función no decide por sí misma qué conjunto comprobar: quien
 * llama filtra, por ejemplo, solo los cierres activos, para que desactivar uno libere su periodo. */
export function buscarCierreSolapado(
  candidato: DatosCierreCentro,
  existentes: readonly CierreCentro[],
  excluirId?: string,
): CierreCentro | undefined {
  return existentes.find((existente) => existente.id !== excluirId && rangosDeCierreSolapan(existente, candidato));
}

/** ¿Cae `fecha` (`AAAA-MM-DD`) dentro de algún cierre ACTIVO de `cierres`? Única vía para consultar
 * esto (requisito 4 de R-12): cualquier código que necesite saber si un día está cerrado —el
 * informe mensual de R-04, el aviso de R-13— debe pasar por aquí. Un cierre desactivado nunca
 * cuenta (requisito 6: no reescribe el histórico ya registrado, solo deja de afectar a un cálculo
 * hecho después de desactivarlo). */
export function esDiaCerrado(fecha: string, cierres: readonly CierreCentro[]): boolean {
  return cierres.some((cierre) => cierre.activo && fecha >= cierre.fecha_inicio && fecha <= cierre.fecha_fin);
}
