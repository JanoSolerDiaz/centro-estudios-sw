import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, type DOMWindow } from 'jsdom';
import { instalarCapturaErrores } from './capturaErrores.ts';
import type { InformadorErrores, OrigenErrorCapturado } from './informadorErrores.ts';

interface LlamadaInformar {
  readonly origen: OrigenErrorCapturado;
  readonly error: unknown;
  readonly contexto: Record<string, unknown> | undefined;
}

function crearInformadorDePruebas(): { informador: InformadorErrores; llamadas: LlamadaInformar[] } {
  const llamadas: LlamadaInformar[] = [];
  return {
    informador: {
      informar(origen, error, contexto) {
        llamadas.push({ origen, error, contexto });
      },
    },
    llamadas,
  };
}

function crearVentanaDePruebas(): DOMWindow {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
  return dom.window;
}

void test('instalarCapturaErrores informa un error no controlado con origen `no_controlado`', () => {
  const ventana = crearVentanaDePruebas();
  const { informador, llamadas } = crearInformadorDePruebas();

  instalarCapturaErrores(ventana, informador);

  const error = new Error('boom');
  const evento = new ventana.ErrorEvent('error', { message: 'boom', error, filename: 'app.js', lineno: 12 });
  ventana.dispatchEvent(evento);

  assert.equal(llamadas.length, 1);
  const llamada = llamadas[0];
  assert.ok(llamada);
  assert.equal(llamada.origen, 'no_controlado');
  assert.equal(llamada.error, error);
  assert.ok(llamada.contexto);
  assert.equal(llamada.contexto.archivo, 'app.js');
  assert.equal(llamada.contexto.linea, 12);
});

void test('instalarCapturaErrores informa una promesa rechazada con origen `promesa_rechazada`', () => {
  const ventana = crearVentanaDePruebas();
  const { informador, llamadas } = crearInformadorDePruebas();

  instalarCapturaErrores(ventana, informador);

  const razon = new Error('promesa rota');
  const promesaRota = Promise.reject(razon);
  promesaRota.catch(() => undefined);
  // `DOMWindow` (@types/jsdom) no tipa `PromiseRejectionEvent` (a diferencia de `ErrorEvent`): cae
  // en su índice `[key: string]: any`. Se recupera el tipo real de la librería `DOM` para evitar
  // propagar `any` al resto del test.
  const ConstructorPromiseRejectionEvent = ventana.PromiseRejectionEvent as typeof PromiseRejectionEvent;
  const evento = new ConstructorPromiseRejectionEvent('unhandledrejection', { promise: promesaRota, reason: razon });
  ventana.dispatchEvent(evento);

  assert.equal(llamadas.length, 1);
  const llamada = llamadas[0];
  assert.ok(llamada);
  assert.equal(llamada.origen, 'promesa_rechazada');
  assert.equal(llamada.error, razon);
});

void test('el desinstalador deja de informar tras llamarlo', () => {
  const ventana = crearVentanaDePruebas();
  const { informador, llamadas } = crearInformadorDePruebas();

  const desinstalar = instalarCapturaErrores(ventana, informador);
  desinstalar();

  ventana.dispatchEvent(new ventana.ErrorEvent('error', { message: 'boom' }));

  assert.equal(llamadas.length, 0);
});
