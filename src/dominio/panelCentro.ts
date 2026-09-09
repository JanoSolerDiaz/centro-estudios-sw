/**
 * Panel de centro para el administrador (R-11): tres bloques calculados sobre datos ya existentes,
 * sin tabla nueva (requisito 1) — las sesiones de hoy y su estado, el ranking de alumnos con más
 * ausencias sin justificar y el ranking de profesores con menor proporción de sesiones registradas
 * frente a las esperadas. Lógica pura: nada aquí lee la hora del sistema directamente, el instante
 * y el rango de fechas siempre llegan por parámetro (guardia automática en
 * `disciplinaReloj.test.ts`); `src/ui/pantallaPanelCentro.ts` decide cuándo pedir los datos y cómo
 * pintar el resultado.
 *
 * Reutiliza sin tocarlos los dos únicos criterios ya fijados para excluir un día de "sesión
 * esperada" — `esDiaCerrado` (R-12) y `esDiaCanceladoParaSlot` (R-06) —, mismo principio que R-04 y
 * R-13: una sustitución (R-06) NO excluye el slot (hubo clase, solo cambió quién la impartió), una
 * cancelación sí. Un registro de CUALQUIER estado, incluida una anulada, cuenta como "se pasó
 * lista" ese día para ese slot (mismo criterio que `dominio/avisosPasarLista.ts`, R-13: lo que se
 * mide aquí es si hubo acción, no si fue correcta).
 */

import type { Asistencia, CierreCentro, ExcepcionSlot, SlotHorario } from './tipos.ts';
import { fechaCoincideConDiaSemana, esDiaCanceladoParaSlot } from './excepcionSlot.ts';
import { esDiaCerrado } from './cierresCentro.ts';
import { minutosDesdeMedianoche } from './slotHorario.ts';
import { fechaLocalISO, instanteLocal, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';
import { nombreCompletoAlumno } from './alumno.ts';

/** Lo mínimo de un alumno que hace falta para nombrarlo en el panel — nunca avatar (requisito 2:
 * "los rankings muestran solo nombre y cifra, nunca avatar"; las sesiones de hoy tampoco lo pintan,
 * mismo criterio de superficie mínima que el resto de listados transitorios del proyecto). */
export interface AlumnoParaPanelCentro {
  readonly id: string;
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
}

function comparacionAlfabetica(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

/** Lo mínimo de un registro de asistencia que hace falta para saber que un slot tuvo acción un
 * día concreto — cualquier estado cuenta (mismo criterio que `RegistroParaAvisoPasarLista` de R-13,
 * ver cabecera del módulo). */
export interface RegistroParaPanelCentro {
  readonly slot_id: string | null;
  readonly ocurrido_en: string;
}

export type EstadoSesionHoyPanel = 'pasada_lista' | 'pendiente' | 'sin_pasar_lista';

export interface SesionHoyPanelCentro {
  readonly slotId: string;
  readonly alumnoNombre: string;
  readonly profesorNombre: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly asignaturaOGrupo: string | null;
  readonly estado: EstadoSesionHoyPanel;
}

export interface ParametrosSesionesHoyPanelCentro {
  readonly instante: Date;
  /** Slots de los alumnos en alcance (el centro elegido, o todos), de cualquier vigencia — esta
   * función filtra por vigencia y por día de la semana internamente, quien llama no necesita
   * acotar la consulta de antemano (mismo criterio que `sesionesEsperadasDelMes`, R-04). */
  readonly slots: readonly SlotHorario[];
  readonly alumnosPorId: ReadonlyMap<string, AlumnoParaPanelCentro>;
  readonly nombresProfesores: ReadonlyMap<string, string>;
  /** Registros de HOY (cualquier estado) de los alumnos en alcance. */
  readonly registrosHoy: readonly RegistroParaPanelCentro[];
  readonly cierres: readonly CierreCentro[];
  readonly excepciones: readonly ExcepcionSlot[];
  readonly zonaHoraria?: string;
}

/** Sesiones de hoy y su estado (requisito 1a de R-11): para cada slot vigente hoy de un alumno en
 * alcance, "pasada_lista" si ya hay algún registro hoy para ese slot, "sin_pasar_lista" si su hora
 * de fin ya pasó y no hay ninguno, o "pendiente" en cualquier otro caso. Excluye los días cerrados
 * (R-12) y los cancelados para ese slot (R-06). Ordenadas por hora de inicio y, dentro de la misma
 * hora, por nombre de alumno. */
export function sesionesDeHoyPanelCentro(parametros: ParametrosSesionesHoyPanelCentro): readonly SesionHoyPanelCentro[] {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const fecha = fechaLocalISO(parametros.instante, zonaHoraria);
  const local = instanteLocal(parametros.instante, zonaHoraria);
  const minutosAhora = minutosDesdeMedianoche(local.horaMinuto);

  const slotsConRegistroHoy = new Set(
    parametros.registrosHoy
      .filter((registro): registro is RegistroParaPanelCentro & { slot_id: string } => registro.slot_id !== null)
      .map((registro) => registro.slot_id),
  );

  const sesiones: SesionHoyPanelCentro[] = [];
  for (const slot of parametros.slots) {
    if (slot.dia_semana !== local.diaSemana) {
      continue;
    }
    if (fecha < slot.vigente_desde || (slot.vigente_hasta !== null && fecha > slot.vigente_hasta)) {
      continue;
    }
    if (esDiaCerrado(fecha, parametros.cierres) || esDiaCanceladoParaSlot(slot.id, fecha, parametros.excepciones)) {
      continue;
    }
    const alumno = parametros.alumnosPorId.get(slot.alumno_id);
    if (!alumno) {
      // El alumno no está en el alcance elegido (otro centro, o inactivo): quien llama ya decidió
      // qué alumnos entran en `alumnosPorId`, esta función no vuelve a comprobar el motivo.
      continue;
    }

    let estado: EstadoSesionHoyPanel;
    if (slotsConRegistroHoy.has(slot.id)) {
      estado = 'pasada_lista';
    } else if (minutosAhora < minutosDesdeMedianoche(slot.hora_fin)) {
      estado = 'pendiente';
    } else {
      estado = 'sin_pasar_lista';
    }

    sesiones.push({
      slotId: slot.id,
      alumnoNombre: nombreCompletoAlumno(alumno),
      profesorNombre: parametros.nombresProfesores.get(slot.profesor_id) ?? 'Profesor desconocido',
      horaInicio: slot.hora_inicio,
      horaFin: slot.hora_fin,
      asignaturaOGrupo: slot.asignatura_o_grupo,
      estado,
    });
  }

  return sesiones.sort(
    (a, b) => minutosDesdeMedianoche(a.horaInicio) - minutosDesdeMedianoche(b.horaInicio) || comparacionAlfabetica(a.alumnoNombre, b.alumnoNombre),
  );
}

export interface FilaRankingAusenciasPanelCentro {
  readonly alumnoId: string;
  readonly alumnoNombre: string;
  readonly ausenciasSinJustificar: number;
}

/** Ranking de alumnos con más ausencias SIN justificar (requisito 1b de R-11) en el rango de fechas
 * elegido: cuenta los registros `estado === 'ausente'` con `motivo_justificacion === null` de cada
 * alumno en alcance, de mayor a menor y, en empate, por nombre. Solo alumnos con al menos una
 * ausencia sin justificar aparecen — un alumno sin ninguna no aporta nada a un ranking de "más
 * ausencias". */
export function rankingAusenciasSinJustificarPanelCentro(
  asistencias: readonly Pick<Asistencia, 'alumno_id' | 'estado' | 'motivo_justificacion'>[],
  alumnosPorId: ReadonlyMap<string, AlumnoParaPanelCentro>,
): readonly FilaRankingAusenciasPanelCentro[] {
  const conteos = new Map<string, number>();
  for (const fila of asistencias) {
    if (fila.estado !== 'ausente' || fila.motivo_justificacion !== null) {
      continue;
    }
    conteos.set(fila.alumno_id, (conteos.get(fila.alumno_id) ?? 0) + 1);
  }

  const filas: FilaRankingAusenciasPanelCentro[] = [];
  for (const [alumnoId, ausenciasSinJustificar] of conteos) {
    const alumno = alumnosPorId.get(alumnoId);
    filas.push({
      alumnoId,
      alumnoNombre: alumno ? nombreCompletoAlumno(alumno) : 'Alumno desconocido',
      ausenciasSinJustificar,
    });
  }

  return filas.sort(
    (a, b) => b.ausenciasSinJustificar - a.ausenciasSinJustificar || comparacionAlfabetica(a.alumnoNombre, b.alumnoNombre),
  );
}

export interface FilaRankingAsistenciaProfesorPanelCentro {
  readonly profesorId: string;
  readonly profesorNombre: string;
  readonly sesionesEsperadas: number;
  readonly sesionesRegistradas: number;
  /** `sesionesRegistradas / sesionesEsperadas`, o `null` si `sesionesEsperadas` es cero — un
   * profesor sin ninguna sesión esperada en el rango no participa del ranking (no hay proporción
   * que calcular, no es un cero). */
  readonly proporcion: number | null;
}

/** Día de calendario siguiente a `fecha` (`AAAA-MM-DD`) — aritmética de CALENDARIO pura sobre un
 * `Date` usado como calculadora, nunca como instante real (mismo criterio que `diaAnteriorUtc` de
 * `slotHorario.ts` y `calendarioManana` de `limitesDiaLocal`): sumar milisegundos reales se
 * equivocaría de día en el que sigue a un cambio de hora. Exportada (no solo de uso interno) porque
 * `dominio/informeHorasProfesor.ts` (R-15) necesita el mismo recorrido día a día de un rango de
 * fechas — reutilizada en vez de duplicada. */
export function diaSiguiente(fecha: string): string {
  const partes = fecha.split('-').map(Number);
  const [anio = 0, mes = 1, dia = 1] = partes;
  const utc = new Date(Date.UTC(anio, mes - 1, dia));
  utc.setUTCDate(utc.getUTCDate() + 1);
  return `${String(utc.getUTCFullYear()).padStart(4, '0')}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

export interface ParametrosRankingAsistenciaProfesoresPanelCentro {
  /** `AAAA-MM-DD`, ambos inclusive. */
  readonly desde: string;
  readonly hasta: string;
  readonly slots: readonly SlotHorario[];
  readonly cierres: readonly CierreCentro[];
  readonly excepciones: readonly ExcepcionSlot[];
  /** Registros (cualquier estado) de los alumnos en alcance que caen en `[desde, hasta]`. */
  readonly asistencias: readonly RegistroParaPanelCentro[];
  readonly nombresProfesores: ReadonlyMap<string, string>;
  readonly zonaHoraria?: string;
}

/** Ranking de profesores con menor proporción de sesiones registradas frente a las esperadas
 * (requisito 1c de R-11): para cada día de `[desde, hasta]`, cada slot vigente ese día (excluidos
 * cierres de R-12 y cancelaciones de R-06, mismo criterio que `sesionesDeHoyPanelCentro`) suma una
 * sesión esperada al profesor TITULAR del slot; si el slot tiene algún registro ese día (una
 * sustitución de R-06 cuenta — queda enganchada al mismo `slot_id`, decisión de R-06 documentada en
 * `DECISIONES_TECNICAS.md`), suma también una registrada. De menor a mayor proporción (el peor
 * primero) y, en empate, por nombre; un profesor sin ninguna sesión esperada en el rango no aparece. */
export function rankingAsistenciaProfesoresPanelCentro(
  parametros: ParametrosRankingAsistenciaProfesoresPanelCentro,
): readonly FilaRankingAsistenciaProfesorPanelCentro[] {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;

  const clavesConRegistro = new Set(
    parametros.asistencias
      .filter((registro): registro is RegistroParaPanelCentro & { slot_id: string } => registro.slot_id !== null)
      .map((registro) => `${registro.slot_id}|${fechaLocalISO(new Date(registro.ocurrido_en), zonaHoraria)}`),
  );

  const esperadas = new Map<string, number>();
  const registradas = new Map<string, number>();

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

      esperadas.set(slot.profesor_id, (esperadas.get(slot.profesor_id) ?? 0) + 1);
      if (clavesConRegistro.has(`${slot.id}|${fecha}`)) {
        registradas.set(slot.profesor_id, (registradas.get(slot.profesor_id) ?? 0) + 1);
      }
    }
  }

  const filas: FilaRankingAsistenciaProfesorPanelCentro[] = [];
  for (const [profesorId, sesionesEsperadas] of esperadas) {
    const sesionesRegistradas = registradas.get(profesorId) ?? 0;
    filas.push({
      profesorId,
      profesorNombre: parametros.nombresProfesores.get(profesorId) ?? 'Profesor desconocido',
      sesionesEsperadas,
      sesionesRegistradas,
      proporcion: sesionesEsperadas > 0 ? sesionesRegistradas / sesionesEsperadas : null,
    });
  }

  return filas.sort((a, b) => {
    const proporcionA = a.proporcion ?? Number.POSITIVE_INFINITY;
    const proporcionB = b.proporcion ?? Number.POSITIVE_INFINITY;
    return proporcionA - proporcionB || comparacionAlfabetica(a.profesorNombre, b.profesorNombre);
  });
}
