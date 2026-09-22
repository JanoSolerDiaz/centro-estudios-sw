/**
 * Lógica pura del recordatorio local antes de que empiece una sesión (R-26): dado un profesor y un
 * instante, decide qué sesiones de HOY empiezan dentro de la ventana de aviso y todavía no han
 * disparado su notificación. Nada aquí llama a ninguna API del navegador (`Notification`,
 * `ServiceWorkerRegistration`) ni decide CÓMO mostrar el aviso — eso vive en
 * `nucleo/notificadorRecordatorio.ts` y en la orquestación de `ui/pantallaMiHorario.ts`, que es
 * quien de verdad conoce el instante en que ya se avisó cada sesión. `instante` siempre llega por
 * parámetro (guardia automática en `disciplinaReloj.test.ts`).
 *
 * Reutiliza `instanteLocal`/`slotVigenteEn`/`minutosDesdeMedianoche` en vez de reimplementar la
 * hora local del centro o la vigencia del slot — mismo criterio que `vistaSemanalProfesor` (T-17)
 * y `sesionesSinPasarLista` (R-13).
 */

import type { SlotConAlumno } from './slots.ts';
import { instanteLocal, fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';
import { minutosDesdeMedianoche, slotVigenteEn } from './slotHorario.ts';

/** Minutos antes de `hora_inicio` en los que se dispara el recordatorio (requisito 3 de R-26).
 * Valor conservador, coherente con `TOLERANCIA_MINUTOS_POR_DEFECTO` (10) de `dominio/slots.ts`:
 * avisa a tiempo de llegar dentro de la ventana en la que el slot ya se ofrece como propuesta. */
export const MINUTOS_AVISO_RECORDATORIO_POR_DEFECTO = 5;

/** Clave estable de "esta sesión concreta, este día" — la misma sesión (mismo slot) en un día
 * distinto es una sesión distinta a efectos de "ya avisada" (requisito 5: "cada combinación sesión
 * + día avisa una sola vez"). */
export function claveRecordatorioSesion(slotId: string, fecha: string): string {
  return `${slotId}|${fecha}`;
}

export interface SesionParaRecordatorio {
  readonly slot: SlotConAlumno;
  /** `AAAA-MM-DD` del día natural de hoy en la zona horaria del centro. */
  readonly fecha: string;
  readonly minutosHastaInicio: number;
  /** Instante UTC aproximado de inicio de la sesión — `instante + minutosHastaInicio` en tiempo
   * real, sin recalcular la medianoche local: la ventana de aviso es de pocos minutos, un cambio de
   * hora estacional (siempre de madrugada) nunca cae dentro de ella. */
  readonly inicioUtc: Date;
  readonly clave: string;
}

export interface ParametrosRecordatorioSesion {
  readonly profesorId: string;
  readonly instante: Date;
  /** Slots del profesor con su alumno embebido, de cualquier vigencia — igual que
   * `ParametrosVistaSemanal.slots`, esta función filtra por profesor y por vigencia en `instante`. */
  readonly slots: readonly SlotConAlumno[];
  /** Claves (`claveRecordatorioSesion`) de sesiones que YA dispararon su aviso — no se repiten
   * aunque sigan dentro de la ventana (requisito 5). Lo mantiene quien llama (la pantalla), no este
   * módulo: una función pura no tiene dónde recordar nada entre una llamada y la siguiente. */
  readonly yaAvisadas: ReadonlySet<string>;
  readonly minutosAviso?: number;
  readonly zonaHoraria?: string;
}

/** Sesiones de HOY del profesor que empiezan dentro de `[0, minutosAviso]` minutos desde
 * `instante` y no están ya en `yaAvisadas` (requisitos 3 y 5 de R-26). El alumno del slot solo se
 * usa para comprobar que sigue activo — quien reciba el resultado NUNCA debe mostrar su nombre en
 * la notificación (requisito 7, sin dato de alumno en un aviso del sistema operativo). */
export function sesionesParaRecordatorio(parametros: ParametrosRecordatorioSesion): readonly SesionParaRecordatorio[] {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const minutosAviso = parametros.minutosAviso ?? MINUTOS_AVISO_RECORDATORIO_POR_DEFECTO;
  const local = instanteLocal(parametros.instante, zonaHoraria);
  const minutosAhora = minutosDesdeMedianoche(local.horaMinuto);
  const fechaHoy = fechaLocalISO(parametros.instante, zonaHoraria);

  const resultado: SesionParaRecordatorio[] = [];
  for (const slot of parametros.slots) {
    if (slot.profesor_id !== parametros.profesorId || !slot.alumno.activo) {
      continue;
    }
    if (slot.dia_semana !== local.diaSemana || !slotVigenteEn(slot, parametros.instante)) {
      continue;
    }
    const minutosHastaInicio = minutosDesdeMedianoche(slot.hora_inicio) - minutosAhora;
    if (minutosHastaInicio < 0 || minutosHastaInicio > minutosAviso) {
      continue;
    }
    const clave = claveRecordatorioSesion(slot.id, fechaHoy);
    if (parametros.yaAvisadas.has(clave)) {
      continue;
    }
    resultado.push({
      slot,
      fecha: fechaHoy,
      minutosHastaInicio,
      inicioUtc: new Date(parametros.instante.getTime() + minutosHastaInicio * 60_000),
      clave,
    });
  }

  return resultado.sort((a, b) => minutosDesdeMedianoche(a.slot.hora_inicio) - minutosDesdeMedianoche(b.slot.hora_inicio));
}
