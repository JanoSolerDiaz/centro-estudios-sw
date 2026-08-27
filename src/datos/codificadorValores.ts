/**
 * Codificador de valores de filtro para PostgREST (T-08, requisito 5): "nunca construir filtros
 * por concatenación de texto sin escapar". Dos capas independientes, siempre las dos, en este
 * orden:
 *
 *  1. Escapado sintáctico de PostgREST — los caracteres que el propio protocolo interpreta como
 *     estructura de la URL de filtro (`,` separa valores dentro de `in.(a,b)`; `.` separa el
 *     operador del valor; `(` y `)` delimitan la lista de `in`; `"` y `\` son la propia sintaxis de
 *     escapado) se neutralizan envolviendo el valor entre comillas dobles y escapando la comilla y
 *     la barra invertida internas, exactamente como documenta PostgREST para sus filtros.
 *  2. Codificación de URL (`encodeURIComponent`) del resultado del paso 1 — para que cualquier
 *     otro carácter (espacio, `%`, `&`, `=`, `#`, unicode) llegue intacto en la query string.
 *
 * Las columnas y la cadena de `select` (incluidos los recursos embebidos, p. ej.
 * `centro:centro_estudios(id,nombre)`) NO pasan por este codificador: las escribe quien programa,
 * son literales fijos como un nombre de columna SQL, no datos de usuario — el mismo criterio que
 * ya aplica `registro.ts` (T-02) al `mensaje` del logger. Solo los VALORES de los filtros (lo que
 * puede venir, directa o indirectamente, de una persona usando la aplicación) pasan por aquí.
 */

const CARACTERES_RESERVADOS_POSTGREST = /[,."\\()]/;

function requiereComillas(valor: string): boolean {
  return valor.length === 0 || CARACTERES_RESERVADOS_POSTGREST.test(valor) || valor !== valor.trim();
}

/** Codifica un único valor de filtro (`eq`, `gte`, `lte`, un patrón de `ilike`, un elemento de
 * `in`) listo para insertarse directamente en la query string de una URL de PostgREST. */
export function codificarValorFiltro(valor: string): string {
  const escapado = requiereComillas(valor)
    ? `"${valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    : valor;
  return encodeURIComponent(escapado);
}

/** Codifica una lista de valores para `in.(v1,v2,...)`. Cada valor se escapa y codifica por
 * separado con `codificarValorFiltro`; la coma que separa la lista se añade DESPUÉS, sin
 * codificar, porque es estructura de PostgREST, no parte de ningún valor — si un valor contiene
 * una coma de verdad, `codificarValorFiltro` ya la habrá convertido en `%2C` dentro de sus propias
 * comillas, así que no se confunde con el separador. */
export function codificarListaFiltro(valores: readonly string[]): string {
  return valores.map(codificarValorFiltro).join(',');
}
