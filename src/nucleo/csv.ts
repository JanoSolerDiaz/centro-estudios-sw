/**
 * Generación de CSV (T-23, requisito 3: "exportación a CSV, con cabeceras en español y separador y
 * codificación correctos para abrirse sin destrozos en una hoja de cálculo española"). Excel en
 * configuración española usa la coma como separador DECIMAL, así que interpreta un CSV separado por
 * comas como una única columna: el separador de campo tiene que ser `;`. El BOM UTF-8 al principio
 * del documento es lo que hace que Excel detecte la codificación como UTF-8 en vez de asumir
 * Windows-1252 y destrozar cualquier tilde o eñe. `\r\n` como fin de línea, no `\n`: es el que
 * espera un lector de Windows, y un lector de cualquier otro sistema lo acepta igual.
 *
 * Sin dependencia de ninguna librería (§0.2): un CSV con estas reglas es tan simple que no lo
 * justifica.
 */

const SEPARADOR = ';';
const FIN_DE_LINEA = '\r\n';
const BOM_UTF8 = '\uFEFF';

/** Un campo necesita comillas si contiene el separador, una comilla doble, o un salto de línea —
 * las comillas internas se duplican, que es como CSV escapa una comilla dentro de un campo ya
 * entrecomillado. Un campo con una coma simple (que no es el separador aquí) no necesita nada. */
function escaparCampo(valor: string): string {
  if (valor.includes(SEPARADOR) || valor.includes('"') || valor.includes('\n') || valor.includes('\r')) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/** Une `valores` ya escapados con el separador de campo — una fila sin el fin de línea, para que
 * quien llama decida si es la cabecera o una fila de datos. */
export function filaCsv(valores: readonly string[]): string {
  return valores.map(escaparCampo).join(SEPARADOR);
}

/** Documento CSV completo: BOM, cabecera, filas, cada una en su propia línea `\r\n`. */
export function documentoCsv(cabeceras: readonly string[], filas: readonly (readonly string[])[]): string {
  const lineas = [filaCsv(cabeceras), ...filas.map((fila) => filaCsv(fila))];
  return BOM_UTF8 + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}
