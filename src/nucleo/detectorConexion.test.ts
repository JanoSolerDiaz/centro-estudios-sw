import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearDetectorConexionNavegador, crearDetectorConexionDePrueba, type FuenteConexionNavegador } from './detectorConexion.ts';

function crearFuenteFalsa(onLineInicial: boolean): FuenteConexionNavegador & { disparar(tipo: 'online' | 'offline'): void } {
  const escuchadores = new Map<'online' | 'offline', Set<() => void>>([
    ['online', new Set()],
    ['offline', new Set()],
  ]);
  return {
    navigator: { onLine: onLineInicial },
    addEventListener(tipo, escuchador) {
      escuchadores.get(tipo)?.add(escuchador);
    },
    removeEventListener(tipo, escuchador) {
      escuchadores.get(tipo)?.delete(escuchador);
    },
    disparar(tipo) {
      for (const escuchador of escuchadores.get(tipo) ?? []) {
        escuchador();
      }
    },
  };
}

void test('detector real: arranca con el estado de navigator.onLine', () => {
  const conectado = crearDetectorConexionNavegador(crearFuenteFalsa(true));
  assert.equal(conectado.estaConectado(), true);

  const desconectado = crearDetectorConexionNavegador(crearFuenteFalsa(false));
  assert.equal(desconectado.estaConectado(), false);
});

void test('detector real: un evento "offline" cambia el estado y notifica a quien escucha', () => {
  const fuente = crearFuenteFalsa(true);
  const detector = crearDetectorConexionNavegador(fuente);
  const cambios: boolean[] = [];
  detector.alCambiar((conectado) => cambios.push(conectado));

  fuente.disparar('offline');
  assert.equal(detector.estaConectado(), false);
  assert.deepEqual(cambios, [false]);

  fuente.disparar('online');
  assert.equal(detector.estaConectado(), true);
  assert.deepEqual(cambios, [false, true]);
});

void test('detector real: dejar de escuchar (la función devuelta) corta las notificaciones futuras', () => {
  const fuente = crearFuenteFalsa(true);
  const detector = crearDetectorConexionNavegador(fuente);
  const cambios: boolean[] = [];
  const dejarDeEscuchar = detector.alCambiar((conectado) => cambios.push(conectado));

  fuente.disparar('offline');
  dejarDeEscuchar();
  fuente.disparar('online');

  assert.deepEqual(cambios, [false]);
});

void test('detector de prueba: arranca conectado por defecto y simularCambio notifica sin ningún evento real', () => {
  const detector = crearDetectorConexionDePrueba();
  assert.equal(detector.estaConectado(), true);

  const cambios: boolean[] = [];
  detector.alCambiar((conectado) => cambios.push(conectado));
  detector.simularCambio(false);

  assert.equal(detector.estaConectado(), false);
  assert.deepEqual(cambios, [false]);
});

void test('detector de prueba: acepta un estado inicial explícito', () => {
  const detector = crearDetectorConexionDePrueba(false);
  assert.equal(detector.estaConectado(), false);
});
