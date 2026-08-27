import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaRecuperarContrasena } from './pantallaRecuperarContrasena.ts';
import { ErrorDeRed } from '../datos/erroresDominio.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function enviarConEmail(contenedor: HTMLElement, email: string): void {
  const inputEmail = contenedor.querySelector<HTMLInputElement>('#recuperar-email');
  const formulario = contenedor.querySelector('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(inputEmail);
  assert.ok(formulario);
  assert.ok(ventana);
  inputEmail.value = email;
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
}

void test('solicitar recuperación con una cuenta existente muestra el mensaje de confirmación', async () => {
  const contenedor = crearContenedorDePruebas();
  const emailsSolicitados: string[] = [];

  mostrarPantallaRecuperarContrasena(contenedor, {
    solicitarRecuperacion: (email) => {
      emailsSolicitados.push(email);
      return Promise.resolve();
    },
    volverALogin: () => undefined,
  });

  enviarConEmail(contenedor, 'existe@ejemplo.es');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.deepEqual(emailsSolicitados, ['existe@ejemplo.es']);
  const confirmacion = contenedor.querySelector('[role="status"]');
  assert.ok(confirmacion);
  assert.match(confirmacion.textContent, /si ese email tiene una cuenta/i);
});

void test('solicitar recuperación con un email inexistente produce EXACTAMENTE el mismo mensaje (no revela si existe)', async () => {
  const contenedorExiste = crearContenedorDePruebas();
  const contenedorNoExiste = crearContenedorDePruebas();

  // La pantalla no distingue: recibe la misma resolución (sin error) para los dos casos, porque es
  // `autenticacion.ts`/GoTrue quien no distingue, no esta pantalla.
  mostrarPantallaRecuperarContrasena(contenedorExiste, {
    solicitarRecuperacion: () => Promise.resolve(),
    volverALogin: () => undefined,
  });
  mostrarPantallaRecuperarContrasena(contenedorNoExiste, {
    solicitarRecuperacion: () => Promise.resolve(),
    volverALogin: () => undefined,
  });

  enviarConEmail(contenedorExiste, 'existe@ejemplo.es');
  enviarConEmail(contenedorNoExiste, 'no-existe@ejemplo.es');
  await new Promise((resolver) => setTimeout(resolver, 0));

  const mensajeExiste = contenedorExiste.querySelector('[role="status"]')?.textContent;
  const mensajeNoExiste = contenedorNoExiste.querySelector('[role="status"]')?.textContent;
  assert.equal(mensajeExiste, mensajeNoExiste);
});

void test('un fallo de red al solicitar la recuperación muestra un error, no el mensaje de confirmación', async () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaRecuperarContrasena(contenedor, {
    solicitarRecuperacion: () => Promise.reject(new ErrorDeRed()),
    volverALogin: () => undefined,
  });

  enviarConEmail(contenedor, 'alguien@ejemplo.es');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.equal(contenedor.querySelector('[role="status"]')?.textContent, '');
  assert.match(contenedor.querySelector('[role="alert"]')?.textContent ?? '', /conectar|conexión/i);
});

void test('pulsar "Volver al inicio de sesión" llama a volverALogin', () => {
  const contenedor = crearContenedorDePruebas();
  let llamado = 0;

  mostrarPantallaRecuperarContrasena(contenedor, {
    solicitarRecuperacion: () => Promise.resolve(),
    volverALogin: () => {
      llamado += 1;
    },
  });

  const botones = Array.from(contenedor.querySelectorAll('button'));
  const botonVolver = botones.find((boton) => boton.textContent.includes('Volver'));
  assert.ok(botonVolver);
  botonVolver.click();

  assert.equal(llamado, 1);
});
