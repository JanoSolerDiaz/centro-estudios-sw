/**
 * Pantalla de recuperación de contraseña (T-09, requisito 2): pide solo el email y muestra SIEMPRE
 * el mismo mensaje de confirmación, exista o no la cuenta — el requisito 9 de T-09 ("responde igual
 * con un email inexistente") se cumple en `autenticacion.ts` (GoTrue no distingue), y esta pantalla
 * no añade ninguna rama que sí distinga.
 */

import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { crearProtectorDobleToque } from '../nucleo/proteccionDobleToque.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

const MENSAJE_CONFIRMACION = 'Si ese email tiene una cuenta, recibirás un enlace para elegir una contraseña nueva.';

export interface DependenciasPantallaRecuperarContrasena {
  solicitarRecuperacion(email: string): Promise<void>;
  volverALogin(): void;
}

export function mostrarPantallaRecuperarContrasena(
  contenedor: HTMLElement,
  deps: DependenciasPantallaRecuperarContrasena,
): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const titulo = documento.createElement('h1');
  titulo.textContent = 'Recuperar contraseña';

  const instrucciones = documento.createElement('p');
  instrucciones.textContent = 'Escribe tu email. Si tiene una cuenta, te enviaremos un enlace para elegir una contraseña nueva.';

  const formulario = documento.createElement('form');
  const campoEmail = crearCampoTexto(documento, 'recuperar-email', 'Email', 'email', 'username');

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaConfirmacion = crearZonaMensaje(documento, 'status');

  const botonEnviar = crearBoton(documento, 'Enviar enlace');

  const botonVolver = documento.createElement('button');
  botonVolver.type = 'button';
  botonVolver.textContent = 'Volver al inicio de sesión';
  botonVolver.style.minHeight = '44px';
  botonVolver.addEventListener('click', () => {
    deps.volverALogin();
  });

  const enviar = crearProtectorDobleToque(async () => {
    zonaError.textContent = '';
    zonaConfirmacion.textContent = '';
    botonEnviar.disabled = true;
    try {
      await deps.solicitarRecuperacion(campoEmail.input.value);
      zonaConfirmacion.textContent = MENSAJE_CONFIRMACION;
      zonaConfirmacion.focus();
    } catch (error) {
      zonaError.textContent = mensajeAmigable(error);
      zonaError.focus();
    } finally {
      botonEnviar.disabled = false;
    }
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void enviar();
  });

  formulario.append(campoEmail.contenedor, botonEnviar);
  contenedor.append(titulo, instrucciones, formulario, botonVolver, zonaConfirmacion, zonaError);
}
