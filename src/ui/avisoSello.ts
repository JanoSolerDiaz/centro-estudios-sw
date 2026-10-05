/**
 * Aviso de la huella de integridad tras una exportación (R-34, requisito 2): la huella en texto
 * copiable y la advertencia de que hay que guardarla aparte del fichero. Sin la advertencia la
 * función prometería más de lo que garantiza.
 */

import { ALGORITMO_SELLO, TEXTO_AVISO_SELLO } from '../dominio/selloIntegridad.ts';
import { crearElemento } from './dom.ts';

export function mostrarHuellaSello(zona: HTMLElement, huella: string): void {
  const documento = zona.ownerDocument;
  zona.textContent = '';
  const codigo = crearElemento(documento, 'code', { texto: huella });
  codigo.className = 'codigo-copiable';
  zona.append(
    crearElemento(documento, 'p', { texto: `Huella de integridad (${ALGORITMO_SELLO}):` }),
    codigo,
    crearElemento(documento, 'p', { texto: TEXTO_AVISO_SELLO }),
  );
}
