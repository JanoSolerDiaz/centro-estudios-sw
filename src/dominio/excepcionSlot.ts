/**
 * Lógica pura de las excepciones de slot (R-06): sustitución o cancelación de UN día concreto sobre
 * un slot recurrente, sin tocar el propio `slot_horario` (T-15) ni su vigencia. Las reglas de
 * coherencia que aquí se validan se repiten en el servidor (`declarar_excepcion_slot`,
 * `db/013_excepcion_slot.sql`) — la base de datos no confía en el cliente (§0.2) —, pero fallar
 * rápido aquí evita un viaje de red para un error evidente.
 *
 * Fechas siempre como texto `AAAA-MM-DD` (lo que devuelve una columna `date` de PostgREST): ninguna
 * función de este fichero construye un `Date` ni lee el reloj del sistema.
 */

import type { DiaSemana, ExcepcionSlot } from './tipos.ts';
import type { SlotConAlumno } from './slots.ts';

/** ¿`fecha` (`AAAA-MM-DD`) cae en el mismo día de la semana que `diaSemana` (1=lunes…7=domingo,
 * ISO-8601)? Una excepción solo tiene sentido sobre una ocurrencia real del slot: declarar
 * "sustituye este lunes" con una fecha que en realidad es martes no correspondería a ninguna clase
 * real (requisito 1 de R-06, "para un slot y una fecha concreta"). Fórmula de calendario pura,
 * independiente de zona horaria: `fecha` viaja siempre como `AAAA-MM-DD` de calendario, la misma
 * cadena que devuelve una columna `date`, así que se interpreta como UTC solo para calcular el día
 * de la semana — no representa ningún instante real. */
export function fechaCoincideConDiaSemana(fecha: string, diaSemana: DiaSemana): boolean {
  const partes = fecha.split('-').map(Number);
  const [anio = 0, mes = 1, dia = 1] = partes;
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemanaIso = ((fechaUtc.getUTCDay() + 6) % 7) + 1; // getUTCDay: 0=domingo…6=sábado → 1=lunes…7=domingo
  return diaSemanaIso === diaSemana;
}

/** ¿Es `motivo` un texto no vacío? Única forma válida de motivo de cancelación (requisito 1: "con
 * motivo breve en texto libre"). */
export function motivoCancelacionValido(motivo: string | null | undefined): boolean {
  return typeof motivo === 'string' && motivo.trim() !== '';
}

/** ¿Puede declararse (o desactivarse) una excepción sobre un slot en `fecha`? No, si ese slot ya
 * tiene algún registro de asistencia ese día (requisito 5: "ninguna de las dos excepciones puede
 * declararse retroactivamente sobre un slot que ya tiene registros ese día") — sustituir o cancelar
 * a posteriori alteraría quién aparece como autor, o borraría de hecho una clase que sí se dio
 * (reescribir historia, §0.2). `fechasConRegistro` es el conjunto de fechas (`AAAA-MM-DD`) con al
 * menos un registro de ese slot, resuelto por quien llama contra `datos/asistencia.ts` — esta
 * función es pura, no toca la red; la comprobación autoritativa vive de todos modos en la RPC. */
export function puedeDeclararExcepcion(fecha: string, fechasConRegistro: ReadonlySet<string>): boolean {
  return !fechasConRegistro.has(fecha);
}

/** La excepción ACTIVA de `slotId` en `fecha`, si la hay — única vía para saberlo (mismo principio
 * que `esDiaCerrado`, R-12): la usan tanto el motor de propuesta (T-17, para no ofrecer ese slot al
 * titular ese día) como «Mi horario» (T-22, para relabelarlo en vez de mostrarlo como un slot
 * normal) y «Registros» (T-21, para ofrecer declarar/desactivar). */
export function excepcionDelDia(slotId: string, fecha: string, excepciones: readonly ExcepcionSlot[]): ExcepcionSlot | undefined {
  return excepciones.find((excepcion) => excepcion.activo && excepcion.slot_id === slotId && excepcion.fecha === fecha);
}

/** ¿`fecha` queda excluida de "sesiones esperadas" para los alumnos de `slotId` (requisito 6 de
 * R-06, mismo principio que `esDiaCerrado` de R-12 pero a nivel de slot en vez de centro entero)?
 * Solo una cancelación excluye: la sustitución sigue contando como sesión esperada y dada (hubo
 * clase, solo cambió quién la impartió) — pensada para el informe mensual de R-04, que no existe
 * todavía; se expone ya para que esa tarea no tenga que reinventar el criterio. */
export function esDiaCanceladoParaSlot(slotId: string, fecha: string, excepciones: readonly ExcepcionSlot[]): boolean {
  const excepcion = excepcionDelDia(slotId, fecha, excepciones);
  return excepcion?.tipo === 'cancelacion';
}

/** Texto legible de una excepción (requisito 4: «Mi horario» del titular la muestra así ese día).
 * `nombreSustituto` ya resuelto por quien llama — esta función es pura, no busca perfiles. */
export function etiquetaExcepcion(excepcion: ExcepcionSlot, nombreSustituto?: string): string {
  if (excepcion.tipo === 'sustitucion') {
    return `Cubierto por ${nombreSustituto ?? 'otro profesor'}`;
  }
  return `Cancelada — ${excepcion.motivo ?? ''}`;
}

/** Excepción de `fecha` que involucra a `profesorId`, como titular del slot O como sustituto
 * nombrado — forma mínima que necesita `slotsEfectivosDelDia`, cumplida por
 * `datos/excepcionesSlot.ts#ExcepcionSlotConSlot` sin ningún cambio (tipado estructural: este
 * fichero de dominio no importa nada de `datos/`, mismo criterio que el resto del proyecto). */
export interface ExcepcionConSlot extends ExcepcionSlot {
  readonly slot: SlotConAlumno;
}

/** Los slots que de verdad le tocan a `profesorId` en `fecha` (requisitos 2 y 3 de R-06), para
 * alimentar el motor de propuesta (T-17, `alumnosPropuestos`) sin tocar esa función: un slot propio
 * con una excepción activa ese día (cancelado O sustituido) se EXCLUYE por completo —ni siquiera se
 * ofrece "sin clases", el titular sencillamente no lo ve ese día—, y un slot ajeno donde
 * `profesorId` es el sustituto nombrado se AÑADE, con `profesor_id` sobrescrito a `profesorId`: es
 * el único campo que cambia, a propósito, para que `alumnosPropuestos` (que filtra
 * `slot.profesor_id === profesorId`) lo trate como si fuera suyo ESE DÍA, sin tener que tocar esa
 * función ni enseñarle qué es una excepción. `excepciones` debe venir ya acotada a `fecha` — esta
 * función no filtra por fecha, solo por a quién afecta cada una. */
export function slotsEfectivosDelDia(
  profesorId: string,
  slotsPropios: readonly SlotConAlumno[],
  excepcionesDeHoy: readonly ExcepcionConSlot[],
): readonly SlotConAlumno[] {
  const slotsAfectadosHoy = new Set(
    excepcionesDeHoy.filter((excepcion) => excepcion.slot.profesor_id === profesorId).map((excepcion) => excepcion.slot_id),
  );
  const propiosSinAfectar = slotsPropios.filter((slot) => !slotsAfectadosHoy.has(slot.id));
  const sustituidos = excepcionesDeHoy
    .filter((excepcion) => excepcion.tipo === 'sustitucion' && excepcion.profesor_sustituto_id === profesorId)
    .map((excepcion): SlotConAlumno => ({ ...excepcion.slot, profesor_id: profesorId }));
  return [...propiosSinAfectar, ...sustituidos];
}
