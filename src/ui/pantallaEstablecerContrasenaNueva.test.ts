import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaEstablecerContrasenaNueva } from './pantallaEstablecerContrasenaNueva.ts';
import { NoAutenticado } from '../datos/erroresDominio.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function enviarConContrasenas(contenedor: HTMLElement, nueva: string, repetida: string): void {
  const inputNueva = contenedor.querySelector<HTMLInputElement>('#contrasena-nueva');
  const inputRepetir = contenedor.querySelector<HTMLInputElement>('#contrasena-repetir');
  const formulario = contenedor.querySelector('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(inputNueva);
  assert.ok(inputRepetir);
  assert.ok(formulario);
  assert.ok(ventana);
  inputNueva.value = nueva;
  inputRepetir.value = repetida;
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
}

void test('contraseñas que no coinciden: no llama a establecerContrasenaNueva, muestra el error localmente', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;

  mostrarPantallaEstablecerContrasenaNueva(contenedor, {
    establecerContrasenaNueva: () => {
      llamadas += 1;
      return Promise.resolve();
    },
  });

  enviarConContrasenas(contenedor, 'ContrasenaValida1', 'OtraDistinta1');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.equal(llamadas, 0);
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /no coinciden/i);
});

void test('contraseña demasiado corta: no llama a establecerContrasenaNueva', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;

  mostrarPantallaEstablecerContrasenaNueva(contenedor, {
    establecerContrasenaNueva: () => {
      llamadas += 1;
      return Promise.resolve();
    },
  });

  enviarConContrasenas(contenedor, 'corta1', 'corta1');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.equal(llamadas, 0);
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /al menos 8 caracteres/i);
});

void test('contraseñas válidas e iguales: llama a establecerContrasenaNueva y muestra confirmación', async () => {
  const contenedor = crearContenedorDePruebas();
  const recibidas: string[] = [];

  mostrarPantallaEstablecerContrasenaNueva(contenedor, {
    establecerContrasenaNueva: (contrasena) => {
      recibidas.push(contrasena);
      return Promise.resolve();
    },
  });

  enviarConContrasenas(contenedor, 'ContrasenaValida1', 'ContrasenaValida1');
  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.deepEqual(recibidas, ['ContrasenaValida1']);
  const confirmacion = contenedor.querySelector('[role="status"]');
  assert.ok(confirmacion);
  assert.match(confirmacion.textContent, /actualizada/i);
  // El formulario se retira: no se puede volver a enviar sobre un token de recuperación ya usado.
  assert.equal(contenedor.querySelector('form'), null);
});

void test('un token de recuperación caducado (NoAutenticado) muestra el error traducido, sin retirar el formulario', async () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaEstablecerContrasenaNueva(contenedor, {
    establecerContrasenaNueva: () => Promise.reject(new NoAutenticado()),
  });

  enviarConContrasenas(contenedor, 'ContrasenaValida1', 'ContrasenaValida1');
  await new Promise((resolver) => setTimeout(resolver, 0));

  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /sesión/i);
  assert.ok(contenedor.querySelector('form'));
});
