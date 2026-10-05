/**
 * Edición y anulación de un registro desde el Histórico (R-36). Lógica pura, con el reloj inyectado:
 * qué controles ofrece cada fila, y cómo se traduce el formulario de edición en UNA llamada a
 * `actualizar_asistencia` (solo lo que ha cambiado, validado con las mismas funciones de dominio que
 * usa «Registros»). La RLS y la RPC siguen siendo la barrera real; esto evita viajes inútiles y da
 * mensajes en español antes de que el servidor tenga que rechazar.
 */

import type { Reloj } from '../nucleo/reloj.ts';
import type { Asistencia, MotivoJustificacionAusencia } from './tipos.ts';
import {
  motivoAnulacionValido,
  motivoJustificacionValido,
  ocurridoEnSalidaValido,
  ocurridoEnValido,
  puedeEditarAsistencia,
  puedeJustificarAusencia,
  puedeMarcarSalida,
  type UsuarioAutenticado,
} from './asistencia.ts';
import { ZONA_HORARIA_CENTRO_POR_DEFECTO, fechaLocalISO } from './slots.ts';

export const TEXTO_SOLO_ADMINISTRADOR = 'Solo el administrador puede modificar este registro';
export const TEXTO_NECESITA_CONEXION = 'Necesitas conexión para modificar un registro';

/** `HH:MM` a partir de un `timestamptz`, en la zona horaria del centro — prellena los campos de hora. */
export function horaLocalHHMM(iso: string, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zonaHoraria, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  );
}

/** Reconstruye un instante UTC a partir de una fecha `AAAA-MM-DD` y una hora `HH:MM`, ambas en la
 * zona horaria del centro — el inverso aproximado de `horaLocalHHMM`/`fechaLocalISO`, suficiente
 * para un formulario. */
export function instanteDesdeFechaYHora(fechaIso: string, horaHHMM: string, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): Date {
  // La `Z` es imprescindible (P-34): sin ella, el navegador interpreta la cadena en SU zona horaria
  // y el desfase se restaría dos veces.
  const candidato = new Date(`${fechaIso}T${horaHHMM}:00Z`);
  const enZona = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(candidato);
  const comoUtc = new Date(`${enZona.replace(', ', 'T')}Z`);
  return new Date(candidato.getTime() + (candidato.getTime() - comoUtc.getTime()));
}

export interface ControlesFilaHistorico {
  readonly puedeEditar: boolean;
  readonly puedeAnular: boolean;
  /** Texto en lugar de los botones cuando el usuario no puede modificar una fila que sí podría
   * modificar otro rol; `null` si hay botones o si la fila está anulada (nada que ofrecer). */
  readonly textoSinPermiso: string | null;
}

/** Decide qué controles pinta una fila del Histórico (R-36, requisito 1). Misma función de dominio
 * que «Registros» (`puedeEditarAsistencia`): la regla de la ventana de 7 días no se duplica. Una
 * fila anulada no se edita ni se vuelve a anular (se muestra tachada, con su motivo). */
export function controlesFilaHistorico(registro: Asistencia, usuario: UsuarioAutenticado, reloj: Reloj): ControlesFilaHistorico {
  if (registro.estado === 'anulada') {
    return { puedeEditar: false, puedeAnular: false, textoSinPermiso: null };
  }
  const permitido = puedeEditarAsistencia(
    { profesorId: registro.profesor_id, registradoEn: new Date(registro.registrado_en) },
    usuario,
    reloj,
  );
  if (permitido) {
    return { puedeEditar: true, puedeAnular: true, textoSinPermiso: null };
  }
  return { puedeEditar: false, puedeAnular: false, textoSinPermiso: usuario.rol === 'teacher' ? TEXTO_SOLO_ADMINISTRADOR : null };
}

export interface ValoresFormularioEdicion {
  /** `HH:MM` de la hora real de entrada. */
  readonly hora: string;
  /** `HH:MM` de la hora de salida; ignorada si el registro no tiene salida marcada. */
  readonly horaSalida: string;
  /** Pide marcar la salida con la hora del servidor (solo si `puedeMarcarSalida`). */
  readonly marcarSalida: boolean;
  readonly nota: string;
  /** `''` = sin justificar. */
  readonly motivoJustificacion: string;
  readonly notaJustificacion: string;
}

export interface EntradaEdicionHistorico {
  readonly asistenciaId: string;
  readonly ocurridoEn?: Date;
  readonly marcarSalida?: boolean;
  readonly ocurridoEnSalida?: Date;
  readonly nota?: string | null;
  readonly notaProvista?: boolean;
  readonly justificar?: boolean;
  readonly motivoJustificacion?: MotivoJustificacionAusencia;
  readonly notaJustificacion?: string | null;
}

export type ResultadoEdicion =
  | { readonly ok: true; readonly entrada: EntradaEdicionHistorico }
  | { readonly ok: false; readonly error: string };

/** Valores iniciales del formulario a partir del registro. */
export function valoresInicialesEdicion(registro: Asistencia, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): ValoresFormularioEdicion {
  return {
    hora: horaLocalHHMM(registro.ocurrido_en, zonaHoraria),
    horaSalida: registro.ocurrido_en_salida ? horaLocalHHMM(registro.ocurrido_en_salida, zonaHoraria) : '',
    marcarSalida: false,
    nota: registro.nota ?? '',
    motivoJustificacion: registro.motivo_justificacion ?? '',
    notaJustificacion: registro.nota_justificacion ?? '',
  };
}

/** Traduce el formulario en la entrada de `actualizar_asistencia` con SOLO lo que ha cambiado
 * (R-36, requisito 2). `registrado_en`, origen y retroactivo no se tocan ni se envían. Valida con
 * `ocurridoEnValido` / `ocurridoEnSalidaValido` / `motivoJustificacionValido`, las mismas funciones
 * que «Registros». Sin ningún cambio devuelve un error (no se envía una llamada vacía). */
export function construirEntradaEdicion(
  registro: Asistencia,
  valores: ValoresFormularioEdicion,
  reloj: Reloj,
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): ResultadoEdicion {
  const ahora = reloj.ahora();
  const iniciales = valoresInicialesEdicion(registro, zonaHoraria);
  const cambios: { -readonly [K in keyof EntradaEdicionHistorico]: EntradaEdicionHistorico[K] } = { asistenciaId: registro.id };
  let hayCambios = false;

  const entradaActual = new Date(registro.ocurrido_en);
  let entradaFinal = entradaActual;

  if (valores.hora !== iniciales.hora) {
    if (!/^\d{2}:\d{2}$/.test(valores.hora)) {
      return { ok: false, error: 'La hora no es válida.' };
    }
    const nueva = instanteDesdeFechaYHora(fechaLocalISO(entradaActual, zonaHoraria), valores.hora, zonaHoraria);
    if (!ocurridoEnValido(nueva, ahora)) {
      return { ok: false, error: 'La hora no puede estar en el futuro ni a más de 7 días en el pasado.' };
    }
    cambios.ocurridoEn = nueva;
    entradaFinal = nueva;
    hayCambios = true;
  }

  if (valores.marcarSalida && puedeMarcarSalida(registro)) {
    cambios.marcarSalida = true;
    hayCambios = true;
  } else if (registro.ocurrido_en_salida && valores.horaSalida !== iniciales.horaSalida) {
    if (!/^\d{2}:\d{2}$/.test(valores.horaSalida)) {
      return { ok: false, error: 'La hora de salida no es válida.' };
    }
    const salidaActual = new Date(registro.ocurrido_en_salida);
    const nuevaSalida = instanteDesdeFechaYHora(fechaLocalISO(salidaActual, zonaHoraria), valores.horaSalida, zonaHoraria);
    if (!ocurridoEnSalidaValido(nuevaSalida, entradaFinal, ahora)) {
      return { ok: false, error: 'La salida debe ser posterior a la entrada y no puede estar en el futuro ni a más de 7 días en el pasado.' };
    }
    cambios.ocurridoEnSalida = nuevaSalida;
    hayCambios = true;
  }

  if (valores.nota !== iniciales.nota) {
    cambios.nota = valores.nota.trim().length === 0 ? null : valores.nota;
    cambios.notaProvista = true;
    hayCambios = true;
  }

  const cambiaJustificacion =
    valores.motivoJustificacion !== iniciales.motivoJustificacion || valores.notaJustificacion !== iniciales.notaJustificacion;
  if (cambiaJustificacion && puedeJustificarAusencia(registro)) {
    if (!motivoJustificacionValido(valores.motivoJustificacion || null)) {
      return { ok: false, error: 'Elige un motivo de la lista para justificar la ausencia.' };
    }
    cambios.justificar = true;
    cambios.motivoJustificacion = valores.motivoJustificacion as MotivoJustificacionAusencia;
    cambios.notaJustificacion = valores.notaJustificacion.trim().length === 0 ? null : valores.notaJustificacion;
    hayCambios = true;
  }

  if (!hayCambios) {
    return { ok: false, error: 'No hay ningún cambio que guardar.' };
  }
  return { ok: true, entrada: cambios };
}

export type ResultadoAnulacion =
  | { readonly ok: true; readonly motivo: string }
  | { readonly ok: false; readonly error: string };

/** Valida el motivo de anulación (R-36, requisito 3): obligatorio, mismo criterio que la RPC. */
export function validarMotivoAnulacion(motivo: string): ResultadoAnulacion {
  if (!motivoAnulacionValido(motivo)) {
    return { ok: false, error: 'Escribe el motivo de la anulación.' };
  }
  return { ok: true, motivo: motivo.trim() };
}
