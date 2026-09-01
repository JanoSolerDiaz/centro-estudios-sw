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

/** Dispara la descarga de un fichero de texto en el navegador (T-23, requisito 3: exportación a
 * CSV). Inyectable — mismo criterio exacto que `FabricaProcesadoImagen` (T-14, `datos/avatarAlumno.ts`):
 * la orquestación de quien la usa se testea con un `Descargador` de mentira que solo registra la
 * llamada, y `crearDescargadorNavegador` (con `Blob`/`URL.createObjectURL`/un `<a download>`) es la
 * única implementación real, que un navegador real ejecuta y que no tiene test propio. */
export interface Descargador {
  descargar(contenido: string, nombreFichero: string, tipoMime: string): void;
}

/** La implementación real: crea un enlace `<a download>` temporal, le da clic mediante programa y
 * lo retira, liberando la URL de objeto justo después — el mismo patrón que cualquier descarga de
 * fichero generado en cliente sin backend propio. Solo tiene sentido llamarla desde un navegador
 * real: no referencia ningún global hasta que se invoca `descargar`, así que importar este módulo en
 * tests no falla, pero usarla sí exige DOM completo (`Blob`, `URL.createObjectURL`). */
export function crearDescargadorNavegador(documento: Document): Descargador {
  return {
    descargar(contenido, nombreFichero, tipoMime) {
      const blob = new Blob([contenido], { type: tipoMime });
      const url = URL.createObjectURL(blob);
      const enlace = documento.createElement('a');
      enlace.href = url;
      enlace.download = nombreFichero;
      documento.body.append(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    },
  };
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
