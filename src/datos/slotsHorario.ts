/**
 * Operaciones de acceso a datos de slots de horario (T-15): listar los de un alumno, crear,
 * modificar (versionado: cierra la vigente y abre una nueva desde la fecha de efecto) y cesar. Sin
 * `eliminar*`: `slot_horario` no tiene política de `DELETE` (003_politicas_rls.sql, T-10) — el
 * horario se versiona, nunca se borra una fila, mismo criterio que `alumno`/`centro_estudios`.
 *
 * Escritura reservada a `administrator` por RLS: un `teacher` que llame a
 * `crearSlot`/`modificarSlot`/`cesarSlot` recibe `SinPermiso` del servidor.
 *
 * **Solape de horario (requisito 4 de T-15) — validado aquí, en el cliente, contra una lectura
 * fresca de los slots vigentes justo antes de escribir.** No hay ninguna restricción de exclusión a
 * nivel de base de datos que lo impida: T-15 tiene `Migración: No` en su spec, así que no puede
 * añadir una `EXCLUDE CONSTRAINT` nueva sobre `slot_horario`. Es una limitación conocida y
 * documentada en `DECISIONES_TECNICAS.md` (dos peticiones simultáneas podrían colarse las dos antes
 * de que ninguna vea el conflicto de la otra) — aceptable porque quien escribe horarios es siempre
 * `administrator` en una única sesión de gestión, nunca una operación de alta frecuencia como pasar
 * lista.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { DiaSemana, SlotHorario } from '../dominio/tipos.ts';
import {
  buscarSlotSolapado,
  diaAnteriorUtc,
  fechaSoloDiaUtc,
  type DatosHorarioSlot,
} from '../dominio/slotHorario.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

const TABLA = 'slot_horario';

export interface DatosNuevoSlot {
  readonly alumno_id: string;
  readonly profesor_id: string;
  readonly dia_semana: DiaSemana;
  /** Formato `HH:MM`, 24 horas. */
  readonly hora_inicio: string;
  readonly hora_fin: string;
  readonly asignatura_o_grupo?: string | null;
  readonly vigente_desde: Date;
}

export interface CambiosSlot {
  readonly profesor_id?: string;
  readonly dia_semana?: DiaSemana;
  readonly hora_inicio?: string;
  readonly hora_fin?: string;
  readonly asignatura_o_grupo?: string | null;
}

export interface ResultadoEscrituraSlot {
  readonly slot: SlotHorario;
  /** `true` si el profesor ya tenía otro slot vigente que se pisa en día y hora con este, con un
   * alumno DISTINTO — válido (un profesor atiende a varios alumnos a la vez), pero conviene
   * avisarlo (requisito 4 de T-15: "para el mismo profesor se avisa sin bloquear"). */
  readonly avisoSolapeProfesor: boolean;
}

function validarHorario(datos: DatosHorarioSlot): void {
  if (datos.dia_semana < 1 || datos.dia_semana > 7) {
    throw new ErrorDeValidacion('El día de la semana debe estar entre 1 (lunes) y 7 (domingo).');
  }
  if (!/^\d{2}:\d{2}$/.test(datos.hora_inicio) || !/^\d{2}:\d{2}$/.test(datos.hora_fin)) {
    throw new ErrorDeValidacion('La hora debe tener el formato HH:MM.');
  }
  if (datos.hora_fin <= datos.hora_inicio) {
    throw new ErrorDeValidacion('La hora de fin debe ser posterior a la hora de inicio.');
  }
}

function primeraFilaOFalla<T>(filas: readonly T[]): T {
  const [fila] = filas;
  if (!fila) {
    throw new ErrorDelServidor('El servidor no ha devuelto el slot esperado.');
  }
  return fila;
}

/** Todas las versiones del horario de un alumno (pasadas y la vigente), más recientes primero. La
 * vigente en un instante concreto se resuelve con `slotsVigentesEn` de `dominio/slotHorario.ts`
 * sobre el resultado de esta función — esta función no filtra por vigencia. */
export async function listarSlotsDeAlumno(cliente: ClientePostgrest, alumnoId: string): Promise<readonly SlotHorario[]> {
  return cliente
    .desde<SlotHorario>(TABLA)
    .eq('alumno_id', alumnoId)
    .order('vigente_desde', { descendente: true })
    .seleccionar();
}

async function slotsAbiertosDe(cliente: ClientePostgrest, columna: 'alumno_id' | 'profesor_id', id: string) {
  return cliente.desde<SlotHorario>(TABLA).eq(columna, id).eq('vigente_hasta', null).seleccionar();
}

/** Crea un slot nuevo desde `datos.vigente_desde`, sin `vigente_hasta` (versión abierta). Rechaza
 * el alta si se pisa en día y hora con otro slot vigente del MISMO alumno (requisito 4); si se pisa
 * con uno de otro alumno para el mismo profesor, no bloquea, solo lo señala en
 * `avisoSolapeProfesor`. */
export async function crearSlot(cliente: ClientePostgrest, datos: DatosNuevoSlot): Promise<ResultadoEscrituraSlot> {
  const candidato: DatosHorarioSlot = { dia_semana: datos.dia_semana, hora_inicio: datos.hora_inicio, hora_fin: datos.hora_fin };
  validarHorario(candidato);

  const vigentesAlumno = await slotsAbiertosDe(cliente, 'alumno_id', datos.alumno_id);
  if (buscarSlotSolapado(candidato, vigentesAlumno)) {
    throw new ErrorDeValidacion('Este alumno ya tiene un horario que se solapa en ese día y hora.');
  }

  const vigentesProfesor = await slotsAbiertosDe(cliente, 'profesor_id', datos.profesor_id);
  const avisoSolapeProfesor = buscarSlotSolapado(candidato, vigentesProfesor) !== undefined;

  const filas = await cliente.desde<SlotHorario>(TABLA).insertar({
    alumno_id: datos.alumno_id,
    profesor_id: datos.profesor_id,
    dia_semana: datos.dia_semana,
    hora_inicio: datos.hora_inicio,
    hora_fin: datos.hora_fin,
    asignatura_o_grupo: datos.asignatura_o_grupo ?? null,
    vigente_desde: fechaSoloDiaUtc(datos.vigente_desde),
  });
  return { slot: primeraFilaOFalla(filas), avisoSolapeProfesor };
}

/** Edición como versionado (requisito 2 de T-15): cierra la versión vigente de `slotId`
 * (`vigente_hasta` al día anterior a `fechaEfecto`) y crea una versión nueva desde `fechaEfecto`
 * con los campos de `cambios` superpuestos sobre los de la versión actual. La versión anterior se
 * conserva íntegra — las asistencias que la referencian por su propio snapshot (T-18) siguen
 * resolviéndose contra ella, nunca contra esta edición. */
export async function modificarSlot(
  cliente: ClientePostgrest,
  slotId: string,
  cambios: CambiosSlot,
  fechaEfecto: Date,
): Promise<ResultadoEscrituraSlot> {
  const actual = primeraFilaOFalla(await cliente.desde<SlotHorario>(TABLA).eq('id', slotId).seleccionar());

  if (fechaEfecto <= new Date(actual.vigente_desde)) {
    throw new ErrorDeValidacion('La fecha de efecto debe ser posterior al inicio de la versión actual.');
  }

  const nuevo: DatosNuevoSlot = {
    alumno_id: actual.alumno_id,
    profesor_id: cambios.profesor_id ?? actual.profesor_id,
    dia_semana: cambios.dia_semana ?? actual.dia_semana,
    hora_inicio: cambios.hora_inicio ?? actual.hora_inicio,
    hora_fin: cambios.hora_fin ?? actual.hora_fin,
    asignatura_o_grupo:
      cambios.asignatura_o_grupo === undefined ? actual.asignatura_o_grupo : cambios.asignatura_o_grupo,
    vigente_desde: fechaEfecto,
  };
  const candidato: DatosHorarioSlot = { dia_semana: nuevo.dia_semana, hora_inicio: nuevo.hora_inicio, hora_fin: nuevo.hora_fin };
  validarHorario(candidato);

  const vigentesAlumno = await slotsAbiertosDe(cliente, 'alumno_id', actual.alumno_id);
  if (buscarSlotSolapado(candidato, vigentesAlumno, slotId)) {
    throw new ErrorDeValidacion('Este alumno ya tiene un horario que se solapa en ese día y hora.');
  }
  const vigentesProfesor = await slotsAbiertosDe(cliente, 'profesor_id', nuevo.profesor_id);
  const avisoSolapeProfesor = buscarSlotSolapado(candidato, vigentesProfesor, slotId) !== undefined;

  // Cierra la versión actual ANTES de crear la nueva: si la creación fallara más adelante, es
  // preferible dejar la versión vieja cerrada sin sustituta (detectable y corregible a mano) que
  // dejar dos versiones vigentes del mismo horario a la vez.
  await cliente
    .desde<SlotHorario>(TABLA)
    .eq('id', slotId)
    .actualizar({ vigente_hasta: fechaSoloDiaUtc(diaAnteriorUtc(fechaEfecto)) }, { representar: false });

  const filasNuevas = await cliente.desde<SlotHorario>(TABLA).insertar({
    alumno_id: nuevo.alumno_id,
    profesor_id: nuevo.profesor_id,
    dia_semana: nuevo.dia_semana,
    hora_inicio: nuevo.hora_inicio,
    hora_fin: nuevo.hora_fin,
    asignatura_o_grupo: nuevo.asignatura_o_grupo,
    vigente_desde: fechaSoloDiaUtc(fechaEfecto),
  });
  return { slot: primeraFilaOFalla(filasNuevas), avisoSolapeProfesor };
}

/** Cesa el slot desde `fechaEfecto` (`vigente_hasta = fechaEfecto`), sin crear ninguna versión
 * nueva — a diferencia de `modificarSlot`, que siempre sustituye la versión cerrada por otra. */
export async function cesarSlot(cliente: ClientePostgrest, slotId: string, fechaEfecto: Date): Promise<SlotHorario> {
  const filas = await cliente
    .desde<SlotHorario>(TABLA)
    .eq('id', slotId)
    .actualizar({ vigente_hasta: fechaSoloDiaUtc(fechaEfecto) });
  return primeraFilaOFalla(filas);
}
