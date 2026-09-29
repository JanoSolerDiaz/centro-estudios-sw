/**
 * Aviso previo al cierre por inactividad (R-35, requisito 2): `role="alertdialog"` con cuenta atrás
 * y un único botón grande «Seguir conectado». Se monta en un contenedor propio fuera de `#app`
 * (como `avisoNuevaVersion.ts`) para sobrevivir a los cambios de pantalla. El foco pasa al botón
 * solo al aparecer, no en cada tick de la cuenta atrás.
 */

import { textoAvisoInactividad } from '../dominio/inactividadSesion.ts';
import { crearBoton } from './formularios.ts';

export interface ControladorAvisoInactividad {
  mostrar(segundosRestantes: number, pendientes: number): void;
  ocultar(): void;
}

export function montarAvisoInactividad(contenedor: HTMLElement, alContinuar: () => void): ControladorAvisoInactividad {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const aviso = documento.createElement('div');
  aviso.setAttribute('role', 'alertdialog');
  aviso.setAttribute('aria-labelledby', 'aviso-inactividad-texto');
  aviso.hidden = true;

  const texto = documento.createElement('p');
  texto.id = 'aviso-inactividad-texto';

  const boton = crearBoton(documento, 'Seguir conectado', 'button');
  boton.addEventListener('click', () => {
    alContinuar();
  });

  aviso.append(texto, boton);
  contenedor.append(aviso);

  return {
    mostrar(segundosRestantes, pendientes) {
      const estabaOculto = aviso.hidden;
      texto.textContent = textoAvisoInactividad(segundosRestantes, pendientes);
      aviso.hidden = false;
      if (estabaOculto) {
        boton.focus();
      }
    },
    ocultar() {
      aviso.hidden = true;
    },
  };
}
