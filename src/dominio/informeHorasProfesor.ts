/**
 * Informe de horas por profesor (R-15): para un rango de fechas (por defecto el mes en curso, fijado
 * por quien llama), cuántas horas reales impartió cada profesor `activo` — separando las de su propio
 * horario de las dadas como sustituto de otro slot (R-06), sin que ninguna sesión anulada ni ningún
 * día cancelado las infle (requisito 3). Lógica pura, mismo estilo que `dominio/panelCentro.ts` (R-11)
 * y `dominio/informeMensualAlumno.ts` (R-04): ningún `Date` construido con el reloj del sistema, el
 * rango y el instante de generación siempre llegan por parámetro.
 *
 * Reutiliza sin tocarlos los dos únicos criterios ya fijados para excluir un día de "sesión
 * esperada" — `esDiaCerrado` (R-12) y `esDiaCanceladoParaSlot` (R-06) — y el recorrido día a día de
 * un rango arbitrario (`diaSiguiente`, exportada de `panelCentro.ts` para esto, R-11).
 *
 * Separar horas propias de horas de sustitución (requisito 2) sin ninguna tabla ni columna nueva: la
 * RPC de R-06 inserta siempre el registro con `profesor_id` de quien de verdad da la clase (titular o
 * sustituto), pero el `slot_id` sigue apuntando al slot cuyo `slot_horario.profesor_id` es el
 * TITULAR (decisión ya tomada por R-06, ver `DECISIONES_TECNICAS.md`) — comparar ambos valores para
 * el mismo `slot_id` es la única señal que hace falta. Una clase extra sin slot (T-20, `slot_id`
 * `null`) nunca puede ser una sustitución (no hay slot ajeno que sustituir), así que cuenta siempre
 * como propia de quien la registró.
 */

import type { Asistencia, CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';
import { fechaCoincideConDiaSemana, esDiaCanceladoParaSlot } from './excepcionSlot.ts';
import { esDiaCerrado } from './cierresCentro.ts';
import { minutosDesdeMedianoche } from './slotHorario.ts';
import { duracionRealMinutos } from './asistencia.ts';
import { diaSiguiente } from './panelCentro.ts';
import { fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';
import { formatearMinutosComoHoras } from './informeMensualAlumno.ts';
import { documentoCsvConMetadatos } from '../nucleo/csv.ts';

function comparacionAlfabetica(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

export interface ProfesorParaInformeHoras {
  readonly id: string;
  readonly nombre: string;
}

/** Lo mínimo de un registro de asistencia que hace falta para atribuir horas a un profesor. */
export type RegistroParaInformeHorasProfesor = Pick<Asistencia, 'profesor_id' | 'slot_id' | 'estado' | 'ocurrido_en' | 'ocurrido_en_salida'>;

export interface ParametrosInformeHorasProfesor {
  /** `AAAA-MM-DD`, ambos inclusive. */
  readonly desde: string;
  readonly hasta: string;
  /** Profesores `rol = 'teacher'` y `activo = true` (requisito 1) — una fila por cada uno, aunque no
   * tenga ninguna sesión en el rango (a diferencia de los rankings de R-11, que omiten a quien no
   * aporta nada: aquí el objetivo es la nómina, y un profesor sin horas ese mes sigue siendo un dato
   * que hace falta ver, no una fila que sobra). */
  readonly profesores: readonly ProfesorParaInformeHoras[];
  /** Slots de CUALQUIER profesor, cualquier vigencia — esta función filtra por vigencia y por día de
   * la semana internamente, quien llama no necesita acotar la consulta de antemano (mismo criterio
   * que `sesionesEsperadasDelMes`/`rankingAsistenciaProfesoresPanelCentro`). */
  readonly slots: readonly SlotHorario[];
  readonly cierres: readonly CierreCentro[];
  readonly excepciones: readonly ExcepcionSlot[];
  /** Registros de CUALQUIER estado, alumno o profesor en `[desde, hasta]` — esta función descarta
   * internamente lo que no cuenta como hora impartida (requisito 3). */
  readonly asistencias: readonly RegistroParaInformeHorasProfesor[];
  readonly zonaHoraria?: string;
}

export interface FilaInformeHorasProfesor {
  readonly profesorId: string;
  readonly profesorNombre: string;
  readonly sesionesPropias: number;
  /** Suma de minutos reales (R-03) de las entradas propias con salida marcada — `null`, nunca `0`,
   * si ninguna la tiene (requisito 1, misma regla que `resumenInformeMensual` de R-04). */
  readonly minutosRealesPropios: number | null;
  /** Minutos teóricos del conjunto de slots vigentes de este profesor como TITULAR en el rango,
   * excluidos los días cerrados o cancelados — nunca afectados por una sustitución (requisito 2: el
   * slot sigue siendo suyo aunque ese día lo cubriera otro). */
  readonly minutosTeoricos: number;
  readonly sesionesSustitucion: number;
  readonly minutosRealesSustitucion: number | null;
}

interface Acumulado {
  sesiones: number;
  minutos: number;
  algunaConSalida: boolean;
}

function sumarEntrada(mapa: Map<string, Acumulado>, profesorId: string, registro: RegistroParaInformeHorasProfesor): void {
  const actual = mapa.get(profesorId) ?? { sesiones: 0, minutos: 0, algunaConSalida: false };
  actual.sesiones += 1;
  if (registro.ocurrido_en_salida) {
    actual.algunaConSalida = true;
    actual.minutos += duracionRealMinutos(new Date(registro.ocurrido_en), new Date(registro.ocurrido_en_salida));
  }
  mapa.set(profesorId, actual);
}

/** Informe de horas por profesor (requisitos 1-3 de R-15). Ordenado por nombre — no es un ranking
 * (a diferencia de R-11), es un listado de nómina que se consulta por persona, no por "quién va
 * peor". */
export function informeHorasProfesor(parametros: ParametrosInformeHorasProfesor): readonly FilaInformeHorasProfesor[] {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const slotsPorId = new Map(parametros.slots.map((slot) => [slot.id, slot]));

  const minutosTeoricosPorProfesor = new Map<string, number>();
  for (let fecha = parametros.desde; fecha <= parametros.hasta; fecha = diaSiguiente(fecha)) {
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
      const minutos = minutosDesdeMedianoche(slot.hora_fin) - minutosDesdeMedianoche(slot.hora_inicio);
      minutosTeoricosPorProfesor.set(slot.profesor_id, (minutosTeoricosPorProfesor.get(slot.profesor_id) ?? 0) + minutos);
    }
  }

  const propias = new Map<string, Acumulado>();
  const sustituciones = new Map<string, Acumulado>();

  for (const registro of parametros.asistencias) {
    if (registro.estado !== 'valida') {
      continue; // ni anulada ni ausente es una hora impartida (requisito 3)
    }
    if (registro.slot_id === null) {
      sumarEntrada(propias, registro.profesor_id, registro);
      continue;
    }
    const slot = slotsPorId.get(registro.slot_id);
    if (!slot) {
      continue; // slot fuera del alcance recibido por quien llama — no debería ocurrir, se ignora
    }
    const fecha = fechaLocalISO(new Date(registro.ocurrido_en), zonaHoraria);
    if (esDiaCanceladoParaSlot(slot.id, fecha, parametros.excepciones)) {
      continue; // defensivo: una cancelación nunca cuenta como hora impartida (requisito 3)
    }
    if (registro.profesor_id === slot.profesor_id) {
      sumarEntrada(propias, registro.profesor_id, registro);
    } else {
      sumarEntrada(sustituciones, registro.profesor_id, registro);
    }
  }

  return parametros.profesores
    .map((profesor) => {
      const propia = propias.get(profesor.id);
      const sustitucion = sustituciones.get(profesor.id);
      return {
        profesorId: profesor.id,
        profesorNombre: profesor.nombre,
        sesionesPropias: propia?.sesiones ?? 0,
        minutosRealesPropios: propia?.algunaConSalida ? propia.minutos : null,
        minutosTeoricos: minutosTeoricosPorProfesor.get(profesor.id) ?? 0,
        sesionesSustitucion: sustitucion?.sesiones ?? 0,
        minutosRealesSustitucion: sustitucion?.algunaConSalida ? sustitucion.minutos : null,
      };
    })
    .sort((a, b) => comparacionAlfabetica(a.profesorNombre, b.profesorNombre));
}

export const CABECERA_TABLA_INFORME_HORAS_PROFESOR: readonly string[] = [
  'Profesor',
  'Sesiones propias',
  'Horas reales propias',
  'Horas teóricas',
  'Sesiones sustitución',
  'Horas reales sustitución',
];

/** Filas de texto listas para pintar (tabla en pantalla y ventana de impresión) o para exportar a
 * CSV — única fuente para los dos formatos, mismo criterio que `filasInformeMensual` (R-04), para que
 * coincidan siempre en las cifras (criterio de aceptación de R-15). */
export function filasTablaInformeHorasProfesor(filas: readonly FilaInformeHorasProfesor[]): readonly (readonly string[])[] {
  return filas.map((fila) => [
    fila.profesorNombre,
    String(fila.sesionesPropias),
    fila.minutosRealesPropios === null ? 'Sin datos de salida marcada' : formatearMinutosComoHoras(fila.minutosRealesPropios),
    formatearMinutosComoHoras(fila.minutosTeoricos),
    String(fila.sesionesSustitucion),
    fila.minutosRealesSustitucion === null ? 'Sin datos de salida marcada' : formatearMinutosComoHoras(fila.minutosRealesSustitucion),
  ]);
}

export interface DatosInformeHorasProfesor {
  /** `AAAA-MM-DD`, ambos inclusive. */
  readonly desde: string;
  readonly hasta: string;
  /** Ya formateada por quien llama (`fechaHoraLocalLegible`, con el `Reloj` inyectado de la
   * pantalla) — este módulo no construye ningún `Date` ni conoce ninguna zona horaria. */
  readonly generadoEnLegible: string;
  readonly filas: readonly FilaInformeHorasProfesor[];
}

/** CSV del informe (requisito 4: "cabecera... de rango de fechas y fecha de generación, una fila por
 * profesor"). Sin campo de "Centro" —a diferencia de `generarCsvInformeMensual` (R-04)—: ese informe
 * es sobre UN alumno con un `centro_referencia_id` propio, mientras que este es sobre el conjunto de
 * profesores del centro, sin ningún alumno concreto del que resolver un centro de referencia —
 * decisión documentada en `DECISIONES_TECNICAS.md`. Usa `documentoCsvConMetadatos` (no
 * `documentoCsv`): la cabecera de metadatos (dos filas) y la tabla de profesores (seis columnas) no
 * comparten número de columnas. */
export function generarCsvInformeHorasProfesor(datos: DatosInformeHorasProfesor): string {
  return documentoCsvConMetadatos(
    [
      ['Rango', `${datos.desde} – ${datos.hasta}`],
      ['Fecha de generación', datos.generadoEnLegible],
    ],
    CABECERA_TABLA_INFORME_HORAS_PROFESOR,
    filasTablaInformeHorasProfesor(datos.filas),
  );
}
