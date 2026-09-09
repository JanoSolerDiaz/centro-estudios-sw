import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrarServiceWorker, type NavegadorServiceWorker, type RegistroServiceWorker } from './registroServiceWorker.ts';

interface WorkerDePrueba {
  state: string;
  readonly mensajes: unknown[];
  postMessage(mensaje: unknown): void;
  addEventListener(tipo: 'statechange', escucha: () => void): void;
  dispararCambioEstado(): void;
}

function crearWorkerDePrueba(estadoInicial: string): WorkerDePrueba {
  const escuchas: (() => void)[] = [];
  const mensajes: unknown[] = [];
  return {
    state: estadoInicial,
    mensajes,
    postMessage(mensaje) {
      mensajes.push(mensaje);
    },
    addEventListener(_tipo, escucha) {
      escuchas.push(escucha);
    },
    dispararCambioEstado() {
      for (const escucha of escuchas) {
        escucha();
      }
    },
  };
}

interface NavegadorDePrueba extends NavegadorServiceWorker {
  controller: unknown;
  registro: RegistroServiceWorker;
  dispararControllerChange(): void;
  dispararUpdateFound(): void;
}

function crearNavegadorDePrueba(registro: RegistroServiceWorker): NavegadorDePrueba {
  const escuchasControllerChange: (() => void)[] = [];
  const escuchasUpdateFound: (() => void)[] = [];
  const registroConEscucha: RegistroServiceWorker = {
    ...registro,
    addEventListener(_tipo, escucha) {
      escuchasUpdateFound.push(escucha);
    },
  };
  return {
    controller: null,
    registro: registroConEscucha,
    // eslint-disable-next-line @typescript-eslint/require-await -- doble de prueba: `register` real es async, este no necesita esperar nada
    async register() {
      return registroConEscucha;
    },
    addEventListener(_tipo, escucha) {
      escuchasControllerChange.push(escucha);
    },
    dispararControllerChange() {
      for (const escucha of escuchasControllerChange) {
        escucha();
      }
    },
    dispararUpdateFound() {
      for (const escucha of escuchasUpdateFound) {
        escucha();
      }
    },
  };
}

void test('registrarServiceWorker: sin worker en espera y sin actualización, nunca avisa', async () => {
  const registro: RegistroServiceWorker = { installing: null, waiting: null, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  let avisado = false;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: () => {
      avisado = true;
    },
    alRecargar: () => undefined,
  });

  assert.equal(avisado, false);
});

void test('registrarServiceWorker: worker ya esperando al registrar avisa de inmediato, y "activar" le manda el mensaje de omitir espera', async () => {
  const worker = crearWorkerDePrueba('installed');
  const registro: RegistroServiceWorker = { installing: null, waiting: worker, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  let activarRecibido: (() => void) | undefined;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: (activar) => {
      activarRecibido = activar;
    },
    alRecargar: () => undefined,
  });

  assert.ok(activarRecibido, 'debe avisar de inmediato');
  activarRecibido();
  assert.deepEqual(worker.mensajes, [{ tipo: 'GESTORACADEMIA_OMITIR_ESPERA' }]);
});

void test('registrarServiceWorker: primera instalación de todas (sin controller previo) nunca avisa, aunque el worker llegue a "installed"', async () => {
  const worker = crearWorkerDePrueba('installing');
  const registro: RegistroServiceWorker = { installing: worker, waiting: null, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  navegador.controller = null; // sin Service Worker previo controlando la página
  let avisado = false;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: () => {
      avisado = true;
    },
    alRecargar: () => undefined,
  });
  navegador.dispararUpdateFound();
  worker.state = 'installed';
  worker.dispararCambioEstado();

  assert.equal(avisado, false);
});

void test('registrarServiceWorker: una versión nueva instalada CON un controller previo sí avisa', async () => {
  const worker = crearWorkerDePrueba('installing');
  const registro: RegistroServiceWorker = { installing: worker, waiting: null, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  navegador.controller = {}; // ya había una versión anterior controlando la página
  let avisado = false;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: () => {
      avisado = true;
    },
    alRecargar: () => undefined,
  });
  navegador.dispararUpdateFound();
  worker.state = 'installed';
  worker.dispararCambioEstado();

  assert.equal(avisado, true);
});

void test('registrarServiceWorker: un "statechange" en un estado intermedio (no "installed") no avisa todavía', async () => {
  const worker = crearWorkerDePrueba('installing');
  const registro: RegistroServiceWorker = { installing: worker, waiting: null, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  navegador.controller = {};
  let avisado = false;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: () => {
      avisado = true;
    },
    alRecargar: () => undefined,
  });
  navegador.dispararUpdateFound();
  worker.state = 'activating';
  worker.dispararCambioEstado();

  assert.equal(avisado, false);
});

void test('registrarServiceWorker: "controllerchange" sin controller previo (primera instalación) nunca recarga', async () => {
  const registro: RegistroServiceWorker = { installing: null, waiting: null, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  navegador.controller = null; // sin Service Worker previo controlando la página: el arranque, no una actualización
  let recargas = 0;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: () => undefined,
    alRecargar: () => {
      recargas += 1;
    },
  });
  // Un único disparo: es el que la propia toma de control inicial produce en un navegador real.
  navegador.dispararControllerChange();

  assert.equal(recargas, 0);
});

void test('registrarServiceWorker: "controllerchange" CON controller previo recarga una sola vez aunque se dispare varias', async () => {
  const registro: RegistroServiceWorker = { installing: null, waiting: null, addEventListener: () => undefined };
  const navegador = crearNavegadorDePrueba(registro);
  navegador.controller = {}; // ya había una versión anterior controlando la página: esto sí es una actualización real
  let recargas = 0;

  await registrarServiceWorker(navegador, {
    urlScript: '/sw.js',
    onNuevaVersionDisponible: () => undefined,
    alRecargar: () => {
      recargas += 1;
    },
  });
  navegador.dispararControllerChange();
  navegador.dispararControllerChange();

  assert.equal(recargas, 1);
});

void test('registrarServiceWorker: si "register" rechaza, no lanza y no avisa nunca', async () => {
  const navegador: NavegadorServiceWorker = {
    controller: null,
    register: () => Promise.reject(new Error('sin soporte')),
    addEventListener: () => undefined,
  };
  let avisado = false;

  await assert.doesNotReject(
    registrarServiceWorker(navegador, {
      urlScript: '/sw.js',
      onNuevaVersionDisponible: () => {
        avisado = true;
      },
      alRecargar: () => undefined,
    }),
  );

  assert.equal(avisado, false);
});
