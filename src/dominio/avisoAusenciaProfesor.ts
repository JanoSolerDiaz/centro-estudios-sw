/**
 * Lógica pura del aviso de ausencia del profesor (R-29): cuándo puede un profesor avisar de que no
 * podrá dar una sesión futura propia desde «Mi horario» (T-22) — nunca sobre una sesión de hoy ya en
 * curso ni sobre una pasada (requisito 2). La misma regla se repite en el servidor
 * (`avisar_ausencia_profesor`, `db/019_aviso_ausencia_profesor.sql`) — la base de datos no confía en
 * el cliente (§0.2) —, pero fallar rápido aquí evita ofrecer un botón que solo puede rechazarse.
 *
 * «Mi horario» es una vista SEMANAL recurrente (T-22): cada fila es un `slot_horario`, sin una fecha
 * de calendario propia salvo la de HOY. Avisar necesita una fecha concreta (`fecha_sesion` de la
 * RPC), así que este fichero también resuelve la PRÓXIMA ocurrencia del día de la semana de cada
 * fila — hoy mismo si coincide, o el próximo día de esa semana en adelante.
 *
 * Ninguna función de este fichero lee la hora del sistema: el instante siempre llega por parámetro
 * (guarda automática en `disciplinaReloj.test.ts`).
 */

import type { DiaSemana } from './tipos.ts';
import { instanteLocal, fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';
import { minutosDesdeMedianoche } from './slotHorario.ts';

/** La próxima fecha (`AAAA-MM-DD`, en `zonaHoraria`) en la que cae `diaSemana` — HOY cuenta como
 * válido si coincide (nunca devuelve una fecha pasada). No decide si esa sesión de hoy ya empezó:
 * eso lo resuelve `puedeAvisarAusenciaSesion`, más abajo, con la hora de inicio del propio slot. */
export function proximaFechaDiaSemana(
  diaSemana: DiaSemana,
  instante: Date,
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): string {
  const local = instanteLocal(instante, zonaHoraria);
  const diasHastaAdelante = ((diaSemana - local.diaSemana) % 7 + 7) % 7;
  const fechaHoy = fechaLocalISO(instante, zonaHoraria);
  if (diasHastaAdelante === 0) {
    return fechaHoy;
  }
  const [anio = 0, mes = 1, dia = 1] = fechaHoy.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia + diasHastaAdelante));
  const dosDigitos = (numero: number): string => String(numero).padStart(2, '0');
  return `${String(fechaUtc.getUTCFullYear()).padStart(4, '0')}-${dosDigitos(fechaUtc.getUTCMonth() + 1)}-${dosDigitos(fechaUtc.getUTCDate())}`;
}

/** ¿Puede avisarse de la sesión que cae en `fecha` con hora de inicio `horaInicio` (requisito 2:
 * "sobre una sesión futura propia, nunca sobre una de hoy ya en curso ni sobre una pasada")? `fecha`
 * viene siempre de `proximaFechaDiaSemana` (nunca pasada por construcción), así que la única
 * comprobación real es: si `fecha` es hoy, que su hora de inicio todavía no haya llegado. */
export function puedeAvisarAusenciaSesion(
  fecha: string,
  horaInicio: string,
  instante: Date,
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): boolean {
  const fechaHoy = fechaLocalISO(instante, zonaHoraria);
  if (fecha !== fechaHoy) {
    return true;
  }
  const local = instanteLocal(instante, zonaHoraria);
  return minutosDesdeMedianoche(horaInicio) > minutosDesdeMedianoche(local.horaMinuto);
}
