/**
 * Informe mensual por alumno (R-04): sesiones esperadas de un mes natural según el horario vigente
 * cada semana (snapshot histórico, requisito 3 — nunca el horario actual) y el resumen agregado
 * cruzado con los registros reales de asistencia de ese mes. Lógica pura: `datos/asistencia.ts` (ya
 * existente desde T-23), `datos/slotsHorario.ts` (T-15), `datos/cierresCentro.ts` (R-12) y
 * `datos/excepcionesSlot.ts` (R-06) resuelven las consultas; `src/ui/pantallaHistorico.ts` compone
 * el resultado y decide cómo exportarlo.
 *
 * Reutiliza sin tocarlos los dos únicos criterios ya fijados para excluir un día de "sesiones
 * esperadas" —`esDiaCerrado` (R-12) y `esDiaCanceladoParaSlot` (R-06)—, ambos documentados ya en su
 * propio fichero como pensados también para este informe (mismo principio que R-13, que ya los
 * reutilizó primero): una sustitución NO excluye (hubo clase, solo cambió quién la impartió), una
 * cancelación sí. Las fechas viajan siempre como texto `AAAA-MM-DD`: ninguna función de este fichero
 * construye un `Date` ni lee el reloj del sistema — el reloj para "fecha de generación" es
 * responsabilidad exclusiva de quien llama (la pantalla), nunca de este módulo.
 */

import type { Asistencia, CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';
import { duracionRealMinutos } from './asistencia.ts';
import { fechaCoincideConDiaSemana, esDiaCanceladoParaSlot } from './excepcionSlot.ts';
import { esDiaCerrado } from './cierresCentro.ts';
import { minutosDesdeMedianoche } from './slotHorario.ts';
import { documentoCsv } from '../nucleo/csv.ts';

/** Último día (1-31) del mes `mes` (1-12) de `anio`, en calendario gregoriano puro — sin
 * construir ningún instante real, solo aritmética de fecha (mismo criterio que `diaAnteriorUtc` de
 * `slotHorario.ts`: un `Date` usado como calculadora de calendario, nunca como instante). */
export function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** Primer y último día (`AAAA-MM-DD`, ambos inclusive) del mes `mes` (1-12) de `anio` — límites que
 * usa quien llama para acotar las consultas de asistencia y de excepciones a este mes concreto. */
export function limitesDelMes(anio: number, mes: number): { readonly primerDia: string; readonly ultimoDia: string } {
  const cabecera = `${String(anio).padStart(4, '0')}-${dosDigitos(mes)}`;
  return { primerDia: `${cabecera}-01`, ultimoDia: `${cabecera}-${dosDigitos(ultimoDiaDelMes(anio, mes))}` };
}

/** Un día concreto (`AAAA-MM-DD`) en el que `slot` tenía sesión esperada. */
export interface DiaEsperadoInformeMensual {
  readonly fecha: string;
  readonly slot: SlotHorario;
}

export interface ParametrosSesionesEsperadas {
  readonly anio: number;
  readonly mes: number;
  /** Todas las versiones (pasadas y vigente) del horario del alumno — de `listarSlotsDeAlumno`
   * (T-15), ya acotadas por RLS a lo que puede ver quien pide el informe (un `teacher` solo ve sus
   * propias filas, requisito 4: "teacher solo sobre alumnos de sus propios slots"). */
  readonly slots: readonly SlotHorario[];
  /** Cierres del centro ACTIVOS (R-12) — un cierre desactivado no excluye nada, mismo criterio que
   * `esDiaCerrado`. */
  readonly cierres: readonly CierreCentro[];
  /** Excepciones de slot ACTIVAS (R-06) cuya fecha cae dentro del mes — de cualquier slot, esta
   * función filtra por `slot.id` internamente vía `esDiaCanceladoParaSlot`. */
  readonly excepciones: readonly ExcepcionSlot[];
}

/** Sesiones esperadas del mes natural (requisito 1 de R-04): para cada día del mes cuyo día de la
 * semana coincide con `slot.dia_semana` Y el slot está vigente ese día concreto (`vigente_desde`/
 * `vigente_hasta`, snapshot histórico — requisito 3: "usa los slots vigentes de cada semana del
 * mes... coherente con la no-retroactividad de T-15"), salvo que el día esté cerrado (R-12) o
 * cancelado para ESE slot (R-06). Una sustitución no excluye. Ordenadas por fecha y, dentro del
 * mismo día, por hora de inicio. */
export function sesionesEsperadasDelMes(parametros: ParametrosSesionesEsperadas): readonly DiaEsperadoInformeMensual[] {
  const { primerDia, ultimoDia } = limitesDelMes(parametros.anio, parametros.mes);
  const cabecera = primerDia.slice(0, 7);
  const totalDias = Number(ultimoDia.slice(8, 10));

  const sesiones: DiaEsperadoInformeMensual[] = [];
  for (let dia = 1; dia <= totalDias; dia += 1) {
    const fecha = `${cabecera}-${dosDigitos(dia)}`;
    for (const slot of parametros.slots) {
      if (fecha < slot.vigente_desde || (slot.vigente_hasta !== null && fecha > slot.vigente_hasta)) {
        continue;
      }
      if (!fechaCoincideConDiaSemana(fecha, slot.dia_semana)) {
        continue;
      }
      if (esDiaCerrado(fecha, parametros.cierres) || esDiaCanceladoParaSlot(slot.id, fecha, parametros.excepciones)) {
        continue;
      }
      sesiones.push({ fecha, slot });
    }
  }
  // El bucle exterior por día ya deja el resultado ordenado por fecha; dentro del mismo día, por
  // hora de inicio (dos slots distintos del mismo alumno el mismo día, p. ej. mañana y tarde).
  return sesiones.sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || minutosDesdeMedianoche(a.slot.hora_inicio) - minutosDesdeMedianoche(b.slot.hora_inicio),
  );
}

export interface ResumenInformeMensual {
  readonly sesionesEsperadas: number;
  /** Registros con `estado === 'valida'` (requisito 1: "entradas registradas"). */
  readonly entradasRegistradas: number;
  readonly ausenciasJustificadas: number;
  readonly ausenciasSinJustificar: number;
  /** Visibles pero NO contadas como asistencia (requisito 1, literal). */
  readonly anuladas: number;
  readonly retroactivos: number;
  /** Suma de minutos reales (R-03) de los registros `valida` con salida marcada — `null` si ningún
   * registro del mes tiene `ocurrido_en_salida`, para distinguir "cero minutos" de "sin dato". */
  readonly minutosRealesTotales: number | null;
}

/** Resumen agregado (requisito 1 de R-04) cruzando `sesiones` (lo esperado, del horario) con
 * `asistencias` (lo real, ya acotado al alumno y al mes por quien llama —
 * `listarHistoricoAsistenciaCompleto`, T-23). Las dos listas no se emparejan una a una: el conteo de
 * asistencias es sobre TODO lo registrado ese mes para el alumno, sea o no exactamente uno de los
 * días esperados (un registro `manual`, T-20, sigue contando como entrada real aunque no viniera de
 * un slot recurrente). */
export function resumenInformeMensual(
  sesiones: readonly DiaEsperadoInformeMensual[],
  asistencias: readonly Asistencia[],
): ResumenInformeMensual {
  let entradasRegistradas = 0;
  let ausenciasJustificadas = 0;
  let ausenciasSinJustificar = 0;
  let anuladas = 0;
  let retroactivos = 0;
  let minutosReales = 0;
  let algunaConSalida = false;

  for (const fila of asistencias) {
    if (fila.es_retroactivo) {
      retroactivos += 1;
    }
    if (fila.estado === 'anulada') {
      anuladas += 1;
      continue;
    }
    if (fila.estado === 'valida') {
      entradasRegistradas += 1;
      if (fila.ocurrido_en_salida) {
        algunaConSalida = true;
        minutosReales += duracionRealMinutos(new Date(fila.ocurrido_en), new Date(fila.ocurrido_en_salida));
      }
      continue;
    }
    if (fila.motivo_justificacion !== null) {
      ausenciasJustificadas += 1;
    } else {
      ausenciasSinJustificar += 1;
    }
  }

  return {
    sesionesEsperadas: sesiones.length,
    entradasRegistradas,
    ausenciasJustificadas,
    ausenciasSinJustificar,
    anuladas,
    retroactivos,
    minutosRealesTotales: algunaConSalida ? minutosReales : null,
  };
}

const ETIQUETA_MES: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Nombre en español de `mes` (1-12) — única traducción a texto visible, mismo criterio que
 * `ETIQUETA_DIA_SEMANA` de `dominio/tipos.ts`. */
export function etiquetaMes(mes: number): string {
  const etiqueta = ETIQUETA_MES[mes - 1];
  if (etiqueta === undefined) {
    throw new Error(`Mes fuera de rango: ${String(mes)}`);
  }
  return etiqueta;
}

/** `minutos` como texto legible "AhBmin" (p. ej. `95` → `1h 35min`), o `"0min"` si es cero — sin
 * redondeo a horas completas, para no perder precisión en un informe que se archiva. */
export function formatearMinutosComoHoras(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas > 0 ? `${String(horas)}h ${String(resto)}min` : `${String(resto)}min`;
}

export interface DatosInformeMensual {
  readonly alumnoNombre: string;
  /** `null` si no se ha podido resolver (un `teacher`, que no tiene acceso al centro de referencia
   * del alumno — §0.2, ni siquiera vía `alumno_ficha`, que solo devuelve fila a `administrator`) —
   * ver DECISIONES_TECNICAS.md. */
  readonly centroNombre: string | null;
  readonly anio: number;
  readonly mes: number;
  /** Ya formateada por quien llama (`fechaHoraLocalLegible`, con el `Reloj` inyectado de la
   * pantalla) — este módulo no construye ningún `Date` ni conoce ninguna zona horaria. */
  readonly generadoEnLegible: string;
  readonly resumen: ResumenInformeMensual;
}

/** Pares campo/valor del informe, en el orden en que deben mostrarse (requisito 2: "cabecera de
 * alumno, centro, mes y fecha de generación") — única fuente para el CSV y para la tabla que pinta
 * la pantalla en la ventana de impresión, así que los dos formatos SIEMPRE coinciden en las cifras
 * (criterio de aceptación de R-04): ninguno de los dos calcula nada por su cuenta. */
export function filasInformeMensual(datos: DatosInformeMensual): readonly (readonly [string, string])[] {
  const { resumen } = datos;
  const filas: (readonly [string, string])[] = [['Alumno', datos.alumnoNombre]];
  if (datos.centroNombre !== null) {
    filas.push(['Centro', datos.centroNombre]);
  }
  filas.push(
    ['Mes', `${etiquetaMes(datos.mes)} ${String(datos.anio)}`],
    ['Fecha de generación', datos.generadoEnLegible],
    ['Sesiones esperadas', String(resumen.sesionesEsperadas)],
    ['Entradas registradas', String(resumen.entradasRegistradas)],
    ['Ausencias justificadas', String(resumen.ausenciasJustificadas)],
    ['Ausencias sin justificar', String(resumen.ausenciasSinJustificar)],
    ['Registros anulados (no cuentan como asistencia)', String(resumen.anuladas)],
    ['Registros retroactivos', String(resumen.retroactivos)],
    [
      'Horas reales totales',
      resumen.minutosRealesTotales === null ? 'Sin datos de salida marcada' : formatearMinutosComoHoras(resumen.minutosRealesTotales),
    ],
  );
  return filas;
}

/** CSV del informe (requisito 2: "exportable... a CSV, con cabecera de alumno, centro, mes y fecha
 * de generación") — dos columnas (Campo/Valor), mismo formato de CSV que el resto del proyecto
 * (`nucleo/csv.ts`: separador `;`, BOM UTF-8, `\r\n`). Un informe de un único alumno y mes no es una
 * tabla de muchas filas de datos (eso ya lo cubre exportar el histórico de T-23 con el mismo filtro
 * de alumno y de fechas): es un resumen, así que el formato vertical es el que de verdad representa
 * su contenido. */
export function generarCsvInformeMensual(datos: DatosInformeMensual): string {
  return documentoCsv(
    ['Campo', 'Valor'],
    filasInformeMensual(datos).map(([campo, valor]) => [campo, valor]),
  );
}
