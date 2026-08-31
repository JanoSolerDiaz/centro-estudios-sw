/**
 * Helpers de creación de elementos con escapado seguro (T-16, requisito 1). No sustituyen a
 * `formularios.ts` (campos, botones y zonas de mensaje ya resueltos ahí desde T-09): esto es para
 * el resto del marcado de una pantalla (títulos, párrafos, listas, contenedores), para no repetir
 * en cada pantalla nueva el mismo `documento.createElement(...)` + `elemento.textContent = ...` +
 * `elemento.append(...)`.
 *
 * Todo el texto pasa siempre por `textContent`, nunca por `innerHTML` (prohibido por lint, T-01):
 * un valor con marcado (`<script>...`) se pinta como texto literal, nunca se interpreta como HTML.
 */

export interface OpcionesElemento {
  readonly texto?: string;
  readonly atributos?: Readonly<Record<string, string>>;
}

export function crearElemento<K extends keyof HTMLElementTagNameMap>(
  documento: Document,
  etiqueta: K,
  opciones: OpcionesElemento = {},
  hijos: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const elemento = documento.createElement(etiqueta);
  if (opciones.texto !== undefined) {
    elemento.textContent = opciones.texto;
  }
  if (opciones.atributos) {
    for (const [nombre, valor] of Object.entries(opciones.atributos)) {
      elemento.setAttribute(nombre, valor);
    }
  }
  for (const hijo of hijos) {
    elemento.append(typeof hijo === 'string' ? documento.createTextNode(hijo) : hijo);
  }
  return elemento;
}
