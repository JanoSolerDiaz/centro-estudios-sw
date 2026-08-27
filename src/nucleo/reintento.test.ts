import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reintentarConRetroceso } from './reintento.ts';
import { crearTemporizadorDePrueba } from './temporizador.ts';

void test('si la operación tiene éxito a la primera, no espera nada', async () => {
  const temporizador = crearTemporizadorDePrueba();

  const resultado = await reintentarConRetroceso(() => Promise.resolve('ok'), {
    intentosMaximos: 3,
    retrasoBaseMs: 100,
    retrasoMaximoMs: 10_000,
    temporizador,
  });

  assert.equal(resultado, 'ok');
  assert.deepEqual(temporizador.esperas, []);
});

void test('reintenta con retroceso exponencial hasta que la operación tiene éxito', async () => {
  const temporizador = crearTemporizadorDePrueba();
  let intentos = 0;
  const operacion = () => {
    intentos += 1;
    return intentos < 3 ? Promise.reject(new Error(`fallo intento ${String(intentos)}`)) : Promise.resolve('ok');
  };

  const resultado = await reintentarConRetroceso(operacion, {
    intentosMaximos: 5,
    retrasoBaseMs: 100,
    retrasoMaximoMs: 10_000,
    temporizador,
  });

  assert.equal(resultado, 'ok');
  assert.equal(intentos, 3);
  assert.deepEqual(temporizador.esperas, [100, 200]);
});

void test('el retraso está acotado por retrasoMaximoMs', async () => {
  const temporizador = crearTemporizadorDePrueba();
  const operacion = () => Promise.reject(new Error('siempre falla'));

  await assert.rejects(
    reintentarConRetroceso(operacion, {
      intentosMaximos: 5,
      retrasoBaseMs: 1000,
      retrasoMaximoMs: 3000,
      temporizador,
    }),
  );

  assert.deepEqual(temporizador.esperas, [1000, 2000, 3000, 3000]);
});

void test('agotados los intentos, lanza el último error sin reintentar más', async () => {
  const temporizador = crearTemporizadorDePrueba();
  let intentos = 0;
  const operacion = () => {
    intentos += 1;
    return Promise.reject(new Error(`fallo ${String(intentos)}`));
  };

  await assert.rejects(
    reintentarConRetroceso(operacion, {
      intentosMaximos: 3,
      retrasoBaseMs: 50,
      retrasoMaximoMs: 1000,
      temporizador,
    }),
    /fallo 3/,
  );

  assert.equal(intentos, 3);
  assert.deepEqual(temporizador.esperas, [50, 100]);
});

void test('con intentosMaximos = 1, no reintenta ni espera: falla directamente', async () => {
  const temporizador = crearTemporizadorDePrueba();
  let intentos = 0;
  const operacion = () => {
    intentos += 1;
    return Promise.reject(new Error('único intento'));
  };

  await assert.rejects(
    reintentarConRetroceso(operacion, {
      intentosMaximos: 1,
      retrasoBaseMs: 50,
      retrasoMaximoMs: 1000,
      temporizador,
    }),
  );

  assert.equal(intentos, 1);
  assert.deepEqual(temporizador.esperas, []);
});
