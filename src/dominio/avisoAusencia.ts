/**
 * Lógica pura del aviso de ausencia injustificada a la familia (R-05): compone el mensaje ya
 * redactado (requisitos 1 y 2 — mismo texto para el `mailto:` y para copiar al portapapeles) y el
 * texto de la anotación manual «aviso enviado» (requisito 3). Sin acceso a red ni al DOM ni al
 * reloj del sistema — quien llama (la pantalla) resuelve la fecha/hora ya formateada con la zona
 * horaria del centro (mismo criterio que el resto de este proyecto: el formateo con `Intl` vive en
 * la interfaz, nunca en el dominio, ver `dominio/historicoAsistencia.ts`) y el reloj inyectado.
 *
 * Decisión de diseño (ver DECISIONES_TECNICAS.md): R-05 declara «Migración: No», así que no hay
 * ninguna columna dedicada para «aviso enviado» en `asistencia`. La anotación reutiliza el campo
 * `nota` genérico, ya editable por `actualizar_asistencia` (T-21) — pero SUMÁNDOSE al valor
 * existente, nunca sustituyéndolo, para no borrar una nota anterior sin relación con este aviso
 * (a diferencia de R-02, que sí pudo permitirse una columna propia, `motivo_justificacion`/
 * `nota_justificacion`, distinta del `nota` genérico).
 */

export interface DatosMensajeAvisoAusencia {
  readonly alumnoNombreCompleto: string;
  /** Fecha de la ausencia, ya formateada en el formato que se quiere mostrar — este módulo no
   * formatea fechas (dependería de la zona horaria del centro, decisión de T-17), solo compone el
   * texto alrededor del valor que le entregan. */
  readonly fechaTexto: string;
  /** Asignatura o grupo del slot (`slot_asignatura_o_grupo`), o `null` si el registro no tiene slot
   * asociado — no debería ocurrir nunca para una ausencia (R-01 siempre fija `origen = 'slot'`),
   * pero esta función no asume esa invariante. */
  readonly claseNombre: string | null;
}

export interface MensajeAvisoAusencia {
  readonly asunto: string;
  readonly cuerpo: string;
}

/** Compone el mensaje ya redactado (requisito 1 de R-05): mismo asunto/cuerpo tanto para el
 * `mailto:` como para copiar al portapapeles (requisito 2) — sin firma ni datos de contacto del
 * centro, que la persona de referencia complete a mano si hace falta una respuesta. */
export function mensajeAvisoAusencia(datos: DatosMensajeAvisoAusencia): MensajeAvisoAusencia {
  const clase = datos.claseNombre ?? 'su clase';
  return {
    asunto: `Aviso de ausencia — ${datos.alumnoNombreCompleto}`,
    cuerpo:
      `Le informamos de que ${datos.alumnoNombreCompleto} no ha asistido el ${datos.fechaTexto} a ${clase}. ` +
      'Póngase en contacto con el centro si necesita más información.',
  };
}

/** Texto de la anotación manual «aviso enviado» (requisito 3 de R-05): "no es un estado verificado
 * por el sistema", así que lo dice el propio texto, no solo la interfaz — si la nota se lee después
 * fuera de esta pantalla (histórico, CSV, sección «editar la nota»), sigue quedando claro que es una
 * anotación manual y no una confirmación de entrega. */
export function textoAvisoRegistrado(nombreQuienAvisa: string, cuandoTexto: string): string {
  return `Aviso de ausencia comunicado a la familia (anotación manual, sin confirmación de entrega) por ${nombreQuienAvisa} el ${cuandoTexto}.`;
}

/** Combina la nota existente de un registro con la anotación de «aviso enviado», sin perder lo que
 * ya hubiera escrito (requisito 3: reutiliza el campo `nota` genérico, nunca lo sustituye). */
export function notaConAvisoAusencia(notaActual: string | null, nombreQuienAvisa: string, cuandoTexto: string): string {
  const anotacion = textoAvisoRegistrado(nombreQuienAvisa, cuandoTexto);
  const actual = notaActual?.trim();
  return actual ? `${actual}\n${anotacion}` : anotacion;
}
