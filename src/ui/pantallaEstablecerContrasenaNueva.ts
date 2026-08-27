/**
 * Pantalla de "elige tu nueva contraseña" (T-09, requisito 2), a la que se llega al volver del
 * enlace de recuperación del correo. El `accessToken` de recuperación ya viene resuelto por quien
 * llama (`aplicacion.ts`, a partir de `enlaceRecuperacion.ts`): esta pantalla solo conoce la
 * función `establecerContrasenaNueva`, ya cerrada sobre ese token. Validación local mínima (las dos
 * contraseñas coinciden, longitud mínima) antes de gastar una petición de red — la validación real
 * la exige también GoTrue, esto es solo cortesía (§0.2: "la validación de cliente es solo
 * cortesía").
 */

import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { crearProtectorDobleToque } from '../nucleo/proteccionDobleToque.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

const LONGITUD_MINIMA_CONTRASENA = 8;

export interface DependenciasPantallaEstablecerContrasenaNueva {
  establecerContrasenaNueva(contrasenaNueva: string): Promise<void>;
}

export function mostrarPantallaEstablecerContrasenaNueva(
  contenedor: HTMLElement,
  deps: DependenciasPantallaEstablecerContrasenaNueva,
): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const titulo = documento.createElement('h1');
  titulo.textContent = 'Elige tu nueva contraseña';

  const formulario = documento.createElement('form');
  const campoNueva = crearCampoTexto(documento, 'contrasena-nueva', 'Contraseña nueva', 'password', 'new-password');
  campoNueva.input.minLength = LONGITUD_MINIMA_CONTRASENA;
  const campoRepetir = crearCampoTexto(documento, 'contrasena-repetir', 'Repite la contraseña', 'password', 'new-password');

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaConfirmacion = crearZonaMensaje(documento, 'status');
  const botonGuardar = crearBoton(documento, 'Guardar contraseña');

  const enviar = crearProtectorDobleToque(async () => {
    zonaError.textContent = '';

    if (campoNueva.input.value !== campoRepetir.input.value) {
      zonaError.textContent = 'Las dos contraseñas no coinciden.';
      zonaError.focus();
      return;
    }
    if (campoNueva.input.value.length < LONGITUD_MINIMA_CONTRASENA) {
      zonaError.textContent = `La contraseña debe tener al menos ${String(LONGITUD_MINIMA_CONTRASENA)} caracteres.`;
      zonaError.focus();
      return;
    }

    botonGuardar.disabled = true;
    try {
      await deps.establecerContrasenaNueva(campoNueva.input.value);
      zonaConfirmacion.textContent = 'Contraseña actualizada. Ya puedes iniciar sesión con ella.';
      zonaConfirmacion.focus();
      formulario.remove();
    } catch (error) {
      zonaError.textContent = mensajeAmigable(error);
      zonaError.focus();
    } finally {
      botonGuardar.disabled = false;
    }
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void enviar();
  });

  formulario.append(campoNueva.contenedor, campoRepetir.contenedor, botonGuardar);
  contenedor.append(titulo, formulario, zonaConfirmacion, zonaError);
}
