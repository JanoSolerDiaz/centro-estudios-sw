import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEjecutorUltimaPeticion, conTiempoDeEspera } from './controlPeticion.ts';

function operacionQueEsperaAborto<T>(resultadoSiNoSeAborta: T): (señal: AbortSignal) => Promise<T> {
  return (señal) =>
    new Promise((resolver, rechazar) => {
      if (señal.aborted) {
        rechazar(new DOMException('Abortado', 'AbortError'));
        return;
      }
      señal.addEventListener('abort', () => {
        rechazar(new DOMException('Abortado', 'AbortError'));
      });
      // Sin resolver hasta que algo la resuelva o la aborte: simula una petición en curso.
      setTimeout(() => {
        resolver(resultadoSiNoSeAborta);
      }, 20);
    });
}

void test('la petición anterior se aborta en cuanto se inicia una nueva', async () => {
  const ejecutar = crearEjecutorUltimaPeticion<string>();
  let señalDeLaPrimera: AbortSignal | undefined;

  const primera = ejecutar((señal) => {
    señalDeLaPrimera = señal;
    return operacionQueEsperaAborto('primera')(señal);
  });

  // Se dispara antes de que la primera resuelva: debe abortar la primera.
  const segunda = ejecutar((señal) => operacionQueEsperaAborto('segunda')(señal));

  await assert.rejects(primera, /AbortError|Abortado/);
  assert.equal(señalDeLaPrimera?.aborted, true);

  const resultado = await segunda;
  assert.equal(resultado, 'segunda');
});

void test('sin una petición nueva, la primera no se aborta y resuelve con normalidad', async () => {
  const ejecutar = crearEjecutorUltimaPeticion<string>();

  const resultado = await ejecutar((señal) => operacionQueEsperaAborto('única')(señal));

  assert.equal(resultado, 'única');
});

void test('conTiempoDeEspera aborta la operación si no resuelve dentro del plazo', async () => {
  await assert.rejects(conTiempoDeEspera(operacionQueEsperaAborto('tarde'), 5), /AbortError|Abortado/);
});

void test('conTiempoDeEspera no aborta una operación que resuelve dentro del plazo', async () => {
  const resultado = await conTiempoDeEspera(operacionQueEsperaAborto('a tiempo'), 200);
  assert.equal(resultado, 'a tiempo');
});
