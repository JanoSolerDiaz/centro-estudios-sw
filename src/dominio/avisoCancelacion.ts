/**
 * Lógica pura del aviso de clase cancelada a las familias (R-14): ampliación del mecanismo ya
 * construido por R-05 (requisito 7 de R-06, "avisar a las familias de una clase cancelada... es una
 * ampliación del mecanismo ya construido por R-05, no una pieza nueva") para una CANCELACIÓN de
 * `excepcion_slot` en vez de una ausencia individual. Reutiliza la forma `MensajeAvisoAusencia`
 * (asunto/cuerpo) de `dominio/avisoAusencia.ts` sin reexportarla como propia — mismo criterio que
 * `dominio/personaReferencia.ts#nombreCompletoPersonaReferencia`.
 *
 * A diferencia de R-05 (sin columna propia: reutiliza `asistencia.nota`, sumándose), R-14 SÍ declara
 * migración (`db/015_aviso_cancelacion_slot.sql`, `excepcion_slot.aviso_familias_quien`/
 * `aviso_familias_en`): la anotación es UNA SOLA para la excepción completa (requisito 3: "no una por
 * alumno"), así que no hace falta ninguna función de composición como `notaConAvisoAusencia` — el
 * servidor fija los dos campos directamente, sin nada previo que conservar.
 */

import type { MensajeAvisoAusencia } from './avisoAusencia.ts';

export interface DatosMensajeAvisoCancelacion {
  readonly alumnoNombreCompleto: string;
  /** Fecha de la clase cancelada, ya formateada — este módulo no formatea fechas (dependería de la
   * zona horaria del centro), solo compone el texto alrededor del valor que le entregan. */
  readonly fechaTexto: string;
  /** Asignatura o grupo del slot, o `null` si no tiene (mismo criterio que `mensajeAvisoAusencia`). */
  readonly claseNombre: string | null;
  /** Motivo de la cancelación (`excepcion_slot.motivo`, obligatorio para `tipo === 'cancelacion'`). */
  readonly motivo: string;
}

/** Compone el mensaje ya redactado (requisito 2 de R-14): mismo asunto/cuerpo tanto para el
 * `mailto:` como para copiar al portapapeles (mismas dos acciones que R-05) — sin firma ni datos de
 * contacto del centro, que la persona de referencia complete a mano si hace falta una respuesta. */
export function mensajeAvisoCancelacion(datos: DatosMensajeAvisoCancelacion): MensajeAvisoAusencia {
  const clase = datos.claseNombre ?? 'su clase';
  return {
    asunto: `Aviso de clase cancelada — ${datos.alumnoNombreCompleto}`,
    cuerpo:
      `Le informamos de que se cancela la clase de ${datos.alumnoNombreCompleto} (${clase}) del ${datos.fechaTexto}. ` +
      `Motivo: ${datos.motivo}. Póngase en contacto con el centro si necesita más información.`,
  };
}

/** Texto de la anotación manual «aviso enviado» (requisito 3 de R-14), para mostrarla ya registrada
 * — mismo criterio exacto que `textoAvisoRegistrado` de R-05: "no es un estado verificado por el
 * sistema", así que lo dice el propio texto, no solo la interfaz. Aquí es solo de PRESENTACIÓN (el
 * servidor no guarda este texto compuesto, guarda `aviso_familias_quien`/`aviso_familias_en` por
 * separado en columnas propias — a diferencia de R-05, que sí necesitaba componerlo para guardarlo
 * en el campo `nota` genérico). */
export function textoAvisoCancelacionRegistrado(nombreQuienAvisa: string, cuandoTexto: string): string {
  return `Aviso de clase cancelada comunicado a las familias (anotación manual, sin confirmación de entrega) por ${nombreQuienAvisa} el ${cuandoTexto}.`;
}
