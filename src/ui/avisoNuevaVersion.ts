/**
 * Aviso de versión nueva (R-09, requisito 4): banner persistente, independiente de la sesión y del
 * rol — se monta desde `main.ts` en un contenedor propio, FUERA de `#app`, para que sobreviva a
 * cualquier cambio de pantalla (login, "sin acceso", o cualquiera de los routers de `aplicacion.ts`)
 * y pueda avisar incluso antes de que haya sesión iniciada. Oculto por defecto (`hidden`, no
 * `style.display`, mismo criterio que el resto de la interfaz — ver `pantallaPasarLista.ts`):
 * `nucleo/registroServiceWorker.ts` decide CUÁNDO llamar a `mostrar()`, este módulo solo sabe
 * CÓMO pintarlo.
 */

import { crearBoton, crearZonaMensaje } from './formularios.ts';

export interface ControladorAvisoNuevaVersion {
  mostrar(): void;
  ocultar(): void;
}

/** `alActualizar` es quien decide qué pasa al pulsar el botón (en la aplicación real: mandar al
 * Service Worker en espera el mensaje que le hace tomar el control, ver `registroServiceWorker.ts`).
 * Este módulo no sabe nada de Service Workers: solo pinta el aviso y delega el clic. */
export function montarAvisoNuevaVersion(contenedor: HTMLElement, alActualizar: () => void): ControladorAvisoNuevaVersion {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const mensaje = crearZonaMensaje(documento, 'status');
  mensaje.textContent = 'Hay una versión nueva de GestorAcademia lista.';

  const boton = crearBoton(documento, 'Actualizar ahora', 'button');
  boton.addEventListener('click', () => {
    alActualizar();
  });

  const aviso = documento.createElement('div');
  aviso.append(mensaje, boton);
  aviso.hidden = true;
  contenedor.append(aviso);

  return {
    mostrar() {
      aviso.hidden = false;
    },
    ocultar() {
      aviso.hidden = true;
    },
  };
}
