/**
 * Sello de integridad de las exportaciones JSON (R-34): añade a un documento exportado (expediente
 * de alumno de R-10, volcado del centro de R-16) un bloque `sello` con el algoritmo (`SHA-256`) y la
 * huella calculada sobre el contenido de DATOS en forma canónica —claves ordenadas, sin espacios—,
 * de modo que reformatear el JSON o reordenar sus claves no cambia la huella, y cambiar un solo dato
 * (incluidas la fecha de generación y el autor, que forman parte de los datos) sí.
 *
 * Alcance honesto: un sello guardado dentro del propio fichero prueba COHERENCIA INTERNA, no
 * procedencia (quien altera el fichero puede recalcular el sello); por eso la huella se muestra
 * aparte al terminar la exportación, para que se guarde fuera del fichero (`TEXTO_AVISO_SELLO`).
 *
 * Lógica pura: el cálculo de la huella se inyecta (`CalculadorHuella`) y el de producción usa
 * `crypto.subtle` nativo, sin librería. Ningún dato sale del navegador: la verificación trabaja
 * sobre el texto del fichero ya leído en memoria.
 */

export const ALGORITMO_SELLO = 'SHA-256';

export const TEXTO_AVISO_SELLO =
  'Guarda esta huella aparte del fichero (en el correo enviado, en un acta): un sello guardado solo dentro del propio fichero prueba coherencia interna, no procedencia.';

export interface SelloIntegridad {
  readonly algoritmo: typeof ALGORITMO_SELLO;
  readonly huella: string;
}

/** Huella hexadecimal en minúsculas de los bytes UTF-8 de `texto`. */
export type CalculadorHuella = (texto: string) => Promise<string>;

export const calcularHuellaSha256: CalculadorHuella = async (texto) => {
  const resumen = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(resumen)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** Serialización canónica: claves de objeto ordenadas, sin espacios, arrays en su orden. */
export function jsonCanonico(valor: unknown): string {
  if (valor === undefined) {
    return 'null';
  }
  if (valor === null || typeof valor !== 'object') {
    return JSON.stringify(valor);
  }
  if (Array.isArray(valor)) {
    return `[${(valor as readonly unknown[]).map((elemento) => jsonCanonico(elemento)).join(',')}]`;
  }
  const objeto = valor as Record<string, unknown>;
  const partes = Object.keys(objeto)
    .filter((clave) => objeto[clave] !== undefined)
    .sort()
    .map((clave) => `${JSON.stringify(clave)}:${jsonCanonico(objeto[clave])}`);
  return `{${partes.join(',')}}`;
}

export interface DocumentoSellado {
  /** JSON indentado, listo para descargar: los datos originales más el bloque `sello`. */
  readonly json: string;
  readonly huella: string;
}

/** Calcula el sello de `datos` y devuelve el JSON legible con `sello` añadido. */
export async function sellarDocumento(
  datos: object,
  calcular: CalculadorHuella = calcularHuellaSha256,
): Promise<DocumentoSellado> {
  const huella = await calcular(jsonCanonico(datos));
  const sello: SelloIntegridad = { algoritmo: ALGORITMO_SELLO, huella };
  return { json: JSON.stringify({ ...datos, sello }, null, 2), huella };
}

export type ResultadoVerificacion = 'coincide' | 'no-coincide' | 'sin-sello';

export interface InformeVerificacion {
  readonly resultado: ResultadoVerificacion;
  /** Huella recalculada; `null` si no hay sello o el formato no se reconoce. */
  readonly huellaCalculada: string | null;
  /** Huella que declara el fichero; `null` si no hay sello. */
  readonly huellaDelFichero: string | null;
}

export const ETIQUETA_RESULTADO_VERIFICACION: Readonly<Record<ResultadoVerificacion, string>> = {
  coincide: 'Coincide: el contenido no ha cambiado desde que se exportó.',
  'no-coincide': 'No coincide: el contenido ha cambiado o la huella indicada no es la de este fichero.',
  'sin-sello': 'Sin sello o formato no reconocido: este fichero no lleva un sello de integridad válido.',
};

export function normalizarHuella(texto: string): string {
  return texto.replace(/\s+/g, '').toLowerCase();
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Recalcula la huella de un fichero exportado y la compara con su bloque `sello` y, si se aporta,
 * con `huellaPegada` (la guardada aparte). Un fichero que no es JSON, no es un objeto, no tiene
 * `sello` o lo tiene con otro algoritmo o forma da `sin-sello`, nunca una excepción (requisito 4).
 */
export async function verificarDocumentoSellado(
  texto: string,
  huellaPegada: string | undefined,
  calcular: CalculadorHuella = calcularHuellaSha256,
): Promise<InformeVerificacion> {
  let analizado: unknown;
  try {
    analizado = JSON.parse(texto);
  } catch {
    return { resultado: 'sin-sello', huellaCalculada: null, huellaDelFichero: null };
  }
  if (!esObjetoPlano(analizado) || !esObjetoPlano(analizado.sello)) {
    return { resultado: 'sin-sello', huellaCalculada: null, huellaDelFichero: null };
  }
  const { sello, ...datos } = analizado;
  if (sello.algoritmo !== ALGORITMO_SELLO || typeof sello.huella !== 'string' || sello.huella.length === 0) {
    return { resultado: 'sin-sello', huellaCalculada: null, huellaDelFichero: null };
  }
  const huellaDelFichero = normalizarHuella(sello.huella);
  const huellaCalculada = await calcular(jsonCanonico(datos));
  const pegada = huellaPegada === undefined ? '' : normalizarHuella(huellaPegada);
  const coincide = huellaCalculada === huellaDelFichero && (pegada.length === 0 || pegada === huellaCalculada);
  return { resultado: coincide ? 'coincide' : 'no-coincide', huellaCalculada, huellaDelFichero };
}
