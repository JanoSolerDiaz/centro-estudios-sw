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

/** Documento CSV con una cabecera de METADATOS (pares campo/valor, una fila cada uno) antes de la
 * tabla principal — para un informe cuya cabecera de contexto (p. ej. rango de fechas y fecha de
 * generación, R-15) no comparte el número de columnas de sus filas de datos, a diferencia del
 * informe de una sola entidad de `generarCsvInformeMensual` (R-04), que sí lo comparte y por eso le
 * basta `documentoCsv`. Una línea en blanco separa los metadatos de la tabla, para que se distingan
 * a simple vista al abrir el fichero en una hoja de cálculo. */
export function documentoCsvConMetadatos(
  metadatos: readonly (readonly [string, string])[],
  cabeceras: readonly string[],
  filas: readonly (readonly string[])[],
): string {
  const lineas = [
    ...metadatos.map(([campo, valor]) => filaCsv([campo, valor])),
    '',
    filaCsv(cabeceras),
    ...filas.map((fila) => filaCsv(fila)),
  ];
  return BOM_UTF8 + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

/**
 * Análisis de CSV (R-08, requisito 6: "parseo de CSV con código propio, sin librería de terceros").
 * Complementa a `documentoCsv`/`filaCsv` de arriba (T-23, solo generación): un fichero subido por el
 * administrator puede venir de cualquier hoja de cálculo, no solo de la exportación de este proyecto,
 * así que el separador se detecta en vez de asumir siempre `;` — Excel en español exporta con `;`,
 * pero otras herramientas (Google Sheets con configuración regional inglesa, por ejemplo) exportan
 * con `,`. El BOM UTF-8 inicial (si lo hay) se descarta antes de analizar, y tanto `\r\n` como `\n`
 * cuentan como fin de línea, para aceptar el fichero tal cual lo entregue cualquier sistema.
 */

export type SeparadorCsv = ';' | ',';

/** Cuenta cuál de los dos separadores conocidos aparece más veces en `primeraLinea` (normalmente la
 * cabecera) y asume que ese es el separador de todo el documento — no hace falta más para las dos
 * hojas de cálculo reales que este proyecto necesita soportar (Excel en español, con `;`; el resto,
 * con `,`), y evita depender de la extensión del fichero, que un usuario puede cambiar sin querer. */
export function detectarSeparadorCsv(primeraLinea: string): SeparadorCsv {
  const puntoYComa = (primeraLinea.match(/;/g) ?? []).length;
  const coma = (primeraLinea.match(/,/g) ?? []).length;
  return coma > puntoYComa ? ',' : ';';
}

/** Analiza `texto` como CSV con comillas dobles (RFC 4180: un campo con el separador, una comilla o
 * un salto de línea va entre comillas, y una comilla interna se duplica) y devuelve sus filas como
 * matrices de cadenas — la cabecera incluida como primera fila, sin ningún tratamiento especial:
 * decidir qué fila es la cabecera es cosa de quien llama. Sin `separador` explícito, se detecta con
 * `detectarSeparadorCsv` sobre la primera línea. Las líneas completamente vacías (un único campo
 * vacío) se omiten, para que una línea en blanco al final del fichero —habitual al guardar desde una
 * hoja de cálculo— no aparezca como una fila fantasma. */
export function analizarCsv(texto: string, separador?: SeparadorCsv): readonly (readonly string[])[] {
  const sinBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const sep = separador ?? detectarSeparadorCsv(/^[^\r\n]*/.exec(sinBom)?.[0] ?? '');

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < sinBom.length; i += 1) {
    const c = sinBom.charAt(i);
    if (entreComillas) {
      if (c === '"') {
        if (sinBom.charAt(i + 1) === '"') {
          campo += '"';
          i += 1;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') {
      entreComillas = true;
    } else if (c === sep) {
      fila.push(campo);
      campo = '';
    } else if (c === '\r') {
      // ignorado: el \n que le sigue cierra la fila.
    } else if (c === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => !(f.length === 1 && f[0] === ''));
}
