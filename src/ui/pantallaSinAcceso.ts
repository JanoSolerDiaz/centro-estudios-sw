/**
 * Pantalla "sin acceso" (T-09, requisito 8): la ve `student` y cualquier rol desconocido (que se
 * trata igual que `student`, nunca como `teacher`). Recibe el `perfil` ya cargado — ninguna llamada
 * a datos propia, más allá del perfil que `gestorSesion.ts` ya cargó para poder decidir qué
 * pantalla mostrar. El mensaje orienta a hablar con el administrador en vez de parecer un error,
 * porque es también lo que ve un profesor recién creado al que nadie le ha cambiado el rol todavía.
 */

import type { Perfil } from '../dominio/tipos.ts';

export function mostrarPantallaSinAcceso(contenedor: HTMLElement, perfil: Perfil): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const titulo = documento.createElement('h1');
  titulo.textContent = `Hola, ${perfil.nombre}`;

  const mensaje = documento.createElement('p');
  mensaje.textContent =
    'Tu perfil todavía no tiene acceso a GestorAcademia. Habla con el administrador del centro para que te asigne un rol.';

  contenedor.append(titulo, mensaje);
}
