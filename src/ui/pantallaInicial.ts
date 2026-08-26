/** Pantalla mínima de arranque (T-00), separada de `main.ts` para poder testearla (T-03) montando
 * un contenedor real en `jsdom` en vez de depender del `document` global del navegador. */

const MENSAJE_EN_CONSTRUCCION = 'GestorAcademia — en construcción.';

export function mostrarPantallaInicial(contenedor: HTMLElement): void {
  contenedor.textContent = MENSAJE_EN_CONSTRUCCION;
}
