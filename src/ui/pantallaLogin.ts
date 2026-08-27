/**
 * Pantalla de login (T-09, requisito 9): DOM nativo, en español, con enlace visible a la
 * recuperación de contraseña. Protegida contra doble toque (T-06) además de deshabilitar el botón
 * mientras la petición está en curso — las dos defensas son baratas y cubren casos ligeramente
 * distintos (doble `click`/`submit` en carrera vs. un usuario que pulsa nada más soltar el foco).
 * Los mensajes de error nunca exponen el error técnico: siempre pasan por `mensajeAmigable`
 * (`CredencialesInvalidas` produce el mismo mensaje exista o no la cuenta, requisito 9).
 */

import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { crearProtectorDobleToque } from '../nucleo/proteccionDobleToque.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaLogin {
  iniciarSesion(email: string, contrasena: string): Promise<void>;
  irARecuperarContrasena(): void;
}

export function mostrarPantallaLogin(contenedor: HTMLElement, deps: DependenciasPantallaLogin): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const titulo = documento.createElement('h1');
  titulo.textContent = 'GestorAcademia';

  const subtitulo = documento.createElement('p');
  subtitulo.textContent = 'Inicia sesión con tu email y contraseña.';

  const formulario = documento.createElement('form');

  const campoEmail = crearCampoTexto(documento, 'login-email', 'Email', 'email', 'username');
  const campoContrasena = crearCampoTexto(documento, 'login-contrasena', 'Contraseña', 'password', 'current-password');

  const zonaError = crearZonaMensaje(documento, 'alert');

  const botonEntrar = crearBoton(documento, 'Entrar');

  const enlaceRecuperar = documento.createElement('button');
  enlaceRecuperar.type = 'button';
  enlaceRecuperar.textContent = '¿Has olvidado tu contraseña?';
  enlaceRecuperar.style.minHeight = '44px';
  enlaceRecuperar.addEventListener('click', () => {
    deps.irARecuperarContrasena();
  });

  const enviar = crearProtectorDobleToque(async () => {
    zonaError.textContent = '';
    botonEntrar.disabled = true;
    try {
      await deps.iniciarSesion(campoEmail.input.value, campoContrasena.input.value);
    } catch (error) {
      zonaError.textContent = mensajeAmigable(error);
      zonaError.focus();
    } finally {
      botonEntrar.disabled = false;
    }
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void enviar();
  });

  formulario.append(campoEmail.contenedor, campoContrasena.contenedor, botonEntrar);
  contenedor.append(titulo, subtitulo, formulario, enlaceRecuperar, zonaError);
}
