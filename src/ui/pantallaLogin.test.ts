import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaLogin } from './pantallaLogin.ts';
import { CredencialesInvalidas } from '../datos/autenticacion.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function enviarFormulario(contenedor: HTMLElement, email: string, contrasena: string): void {
  const inputEmail = contenedor.querySelector<HTMLInputElement>('#login-email');
  const inputContrasena = contenedor.querySelector<HTMLInputElement>('#login-contrasena');
  const formulario = contenedor.querySelector('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(inputEmail);
  assert.ok(inputContrasena);
  assert.ok(formulario);
  assert.ok(ventana);
  inputEmail.value = email;
  inputContrasena.value = contrasena;
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
}

void test('mostrarPantallaLogin pinta un campo de email y uno de contraseña, cada uno con su label', () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaLogin(contenedor, { iniciarSesion: () => Promise.resolve(), irARecuperarContrasena: () => undefined });

  const inputEmail = contenedor.querySelector<HTMLInputElement>('#login-email');
  const inputContrasena = contenedor.querySelector<HTMLInputElement>('#login-contrasena');
  assert.ok(inputEmail);
  assert.ok(inputContrasena);
  assert.equal(inputEmail.type, 'email');
  assert.equal(inputContrasena.type, 'password');
  assert.equal(contenedor.querySelector('label[for="login-email"]')?.textContent, 'Email');
});

void test('enviar el formulario llama a iniciarSesion con el email y la contraseña escritos', async () => {
  const contenedor = crearContenedorDePruebas();
  const llamadas: { email: string; contrasena: string }[] = [];

  mostrarPantallaLogin(contenedor, {
    iniciarSesion: (email, contrasena) => {
      llamadas.push({ email, contrasena });
      return Promise.resolve();
    },
    irARecuperarContrasena: () => undefined,
  });

  enviarFormulario(contenedor, 'profe@ejemplo.es', 'contrasena-correcta');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0], { email: 'profe@ejemplo.es', contrasena: 'contrasena-correcta' });
});

void test('un error de iniciarSesion se muestra traducido (mensajeAmigable), nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaLogin(contenedor, {
    iniciarSesion: () => Promise.reject(new CredencialesInvalidas()),
    irARecuperarContrasena: () => undefined,
  });

  enviarFormulario(contenedor, 'profe@ejemplo.es', 'mal');
  await new Promise((resolver) => setTimeout(resolver, 0));

  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.equal(zonaError.textContent, 'Email o contraseña incorrectos.');
  assert.doesNotMatch(zonaError.textContent, /CredencialesInvalidas/);
});

void test('un doble envío mientras la petición está en curso produce una sola llamada a iniciarSesion', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  let resolverPrimera: (() => void) | undefined;

  mostrarPantallaLogin(contenedor, {
    iniciarSesion: () => {
      llamadas += 1;
      return new Promise((resolver) => {
        resolverPrimera = resolver;
      });
    },
    irARecuperarContrasena: () => undefined,
  });

  enviarFormulario(contenedor, 'profe@ejemplo.es', 'contrasena-correcta');
  enviarFormulario(contenedor, 'profe@ejemplo.es', 'contrasena-correcta');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.equal(llamadas, 1);
  resolverPrimera?.();
});

void test('pulsar "¿Has olvidado tu contraseña?" llama a irARecuperarContrasena', () => {
  const contenedor = crearContenedorDePruebas();
  let llamado = 0;

  mostrarPantallaLogin(contenedor, {
    iniciarSesion: () => Promise.resolve(),
    irARecuperarContrasena: () => {
      llamado += 1;
    },
  });

  const botones = Array.from(contenedor.querySelectorAll('button'));
  const enlace = botones.find((boton) => boton.textContent.includes('olvidado'));
  assert.ok(enlace);
  enlace.click();

  assert.equal(llamado, 1);
});
