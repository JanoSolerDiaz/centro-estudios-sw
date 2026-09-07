/**
 * Lógica pura del aviso de sesiones sin pasar lista (R-13): qué slots propios de un profesor,
 * en la ventana de los últimos `VENTANA_EDICION_TEACHER_DIAS` días (T-21, mismo valor citado
 * literalmente por el requisito 1 de R-13), quedaron sin ningún registro de asistencia pese a que
 * su hora de fin ya pasó. Nada aquí lee la hora del sistema directamente: `instante` siempre llega
 * por parámetro (guardia automática en `disciplinaReloj.test.ts`).
 *
 * Reutiliza sin tocarlas las dos únicas vías ya fijadas para excluir un día de "sesiones
 * esperadas" —`esDiaCerrado` (R-12) y `esDiaCanceladoParaSlot` (R-06)—, ambas documentadas ya en su
 * propio fichero como pensadas también para este aviso; no se inventa un tercer criterio de
 * exclusión. Una sustitución (R-06) NO excluye el slot: si nadie —ni el titular ni el sustituto—
 * registró ese día, el hueco real sigue sin cubrir y el aviso debe seguir apareciendo; si el
 * sustituto sí registró, el registro queda enganchado al MISMO `slot_id` (decisión de R-06,
 * `DECISIONES_TECNICAS.md`), así que la comprobación de "algún registro ese día" ya lo detecta sin
 * necesitar ningún caso especial.
 */

import type { CierreCentro, ExcepcionSlot } from './tipos.ts';
import type { SlotConAlumno } from './slots.ts';
import { fechaLocalISO, instanteLocal, limitesDiaLocal, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';
import { minutosDesdeMedianoche } from './slotHorario.ts';
import { esDiaCerrado } from './cierresCentro.ts';
import { esDiaCanceladoParaSlot } from './excepcionSlot.ts';
import { VENTANA_EDICION_TEACHER_DIAS } from './asistencia.ts';
import { compararAlumnosParaOrden } from './alumno.ts';

/** Lo mínimo de un registro de asistencia que hace falta para saber si YA se pasó lista de un slot
 * un día concreto — cualquier estado cuenta (entrada, ausencia, incluso una anulada: hubo acción
 * ese día, no un hueco sin nada). */
export interface RegistroParaAvisoPasarLista {
  readonly slot_id: string | null;
  readonly ocurrido_en: string;
}

export interface SesionSinPasarLista {
  readonly slot: SlotConAlumno;
  /** `AAAA-MM-DD`, el día concreto (no la vigencia recurrente) que quedó sin registrar. */
  readonly fecha: string;
}

export interface ParametrosAvisosSinPasarLista {
  readonly profesorId: string;
  readonly instante: Date;
  /** Slots del profesor con su alumno embebido, de cualquier vigencia — esta función filtra por
   * profesor y por vigencia en cada día candidato, igual que `vistaSemanalProfesor`. */
  readonly slots: readonly SlotConAlumno[];
  /** Registros del profesor en la ventana (o más: esta función solo mira los que caen dentro),
   * sin paginar — mismo criterio de "una función pura, quien llama ya trajo los datos" que el resto
   * de este módulo. */
  readonly registros: readonly RegistroParaAvisoPasarLista[];
  readonly cierres: readonly CierreCentro[];
  readonly excepciones: readonly ExcepcionSlot[];
  readonly ventanaDias?: number;
  readonly zonaHoraria?: string;
}

/** Sesiones "sin pasar lista" (requisito 1 de R-13): para cada uno de los últimos `ventanaDias`
 * días de calendario más hoy, cada slot propio vigente ese día cuya hora de fin ya pasó y que no
 * tiene ningún registro —de ningún estado— ese día, excluyendo los días cerrados (R-12) y los
 * cancelados para ese slot (R-06). Ordenadas de la más antigua a la más reciente (la más urgente,
 * la que antes sale de la ventana, primero) y, dentro del mismo día y hora, por apellido del
 * alumno — mismo criterio de orden "a la española" que el resto de listados de alumnos.
 */
export function sesionesSinPasarLista(parametros: ParametrosAvisosSinPasarLista): readonly SesionSinPasarLista[] {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const ventanaDias = parametros.ventanaDias ?? VENTANA_EDICION_TEACHER_DIAS;

  const clavesConRegistro = new Set(
    parametros.registros
      .filter((registro): registro is RegistroParaAvisoPasarLista & { slot_id: string } => registro.slot_id !== null)
      .map((registro) => `${registro.slot_id}|${fechaLocalISO(new Date(registro.ocurrido_en), zonaHoraria)}`),
  );

  const slotsDelProfesor = parametros.slots.filter((slot) => slot.profesor_id === parametros.profesorId);

  const sesiones: SesionSinPasarLista[] = [];
  let cursor = parametros.instante;
  for (let offset = 0; offset <= ventanaDias; offset += 1) {
    const limites = limitesDiaLocal(cursor, zonaHoraria);
    const fecha = fechaLocalISO(limites.inicioUtc, zonaHoraria);
    const diaSemana = instanteLocal(limites.inicioUtc, zonaHoraria).diaSemana;

    for (const slot of slotsDelProfesor) {
      if (slot.dia_semana !== diaSemana) {
        continue;
      }
      if (fecha < slot.vigente_desde || (slot.vigente_hasta !== null && fecha > slot.vigente_hasta)) {
        continue;
      }
      const horaFinInstante = new Date(limites.inicioUtc.getTime() + minutosDesdeMedianoche(slot.hora_fin) * 60_000);
      if (horaFinInstante.getTime() > parametros.instante.getTime()) {
        continue;
      }
      if (esDiaCerrado(fecha, parametros.cierres) || esDiaCanceladoParaSlot(slot.id, fecha, parametros.excepciones)) {
        continue;
      }
      if (clavesConRegistro.has(`${slot.id}|${fecha}`)) {
        continue;
      }
      sesiones.push({ slot, fecha });
    }

    cursor = new Date(limites.inicioUtc.getTime() - 1);
  }

  return sesiones.sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      minutosDesdeMedianoche(a.slot.hora_inicio) - minutosDesdeMedianoche(b.slot.hora_inicio) ||
      compararAlumnosParaOrden(a.slot.alumno, b.slot.alumno),
  );
}
