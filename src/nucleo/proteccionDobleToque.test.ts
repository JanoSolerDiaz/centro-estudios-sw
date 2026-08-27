import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProtectorDobleToque } from './proteccionDobleToque.ts';

void test('un doble toque produce exactamente una ejecución de la operación (un registro)', async () => {
  let registros = 0;
  let resolverOperacion!: (valor: number) => void;
  const operacion = () =>
    new Promise<number>((resolver) => {
      resolverOperacion = resolver;
    }).then((valor) => {
      registros += 1;
      return valor;
    });

  const protegida = crearProtectorDobleToque(operacion);

  const primeraLlamada = protegida();
  const segundaLlamada = protegida(); // "doble toque": llega antes de que la primera resuelva

  // `crearProtectorDobleToque` invoca `operacion` en un microtask (vía `Promise.resolve().then`),
  // no de forma síncrona: hay que dejarlo correr antes de que `resolverOperacion` esté asignado.
  await new Promise((resolver) => {
    setTimeout(resolver, 0);
  });

  resolverOperacion(42);

  const [resultado1, resultado2] = await Promise.all([primeraLlamada, segundaLlamada]);

  assert.equal(registros, 1, 'la operación subyacente debe ejecutarse una única vez');
  assert.equal(resultado1, 42);
  assert.equal(resultado2, 42);
});

void test('tras resolver, una llamada nueva sí dispara una ejecución nueva', async () => {
  let registros = 0;
  const operacion = () => {
    registros += 1;
    return Promise.resolve(registros);
  };

  const protegida = crearProtectorDobleToque(operacion);

  await protegida();
  await protegida();

  assert.equal(registros, 2);
});

void test('si la operación rechaza, la protección se libera para el siguiente intento', async () => {
  let intentos = 0;
  const operacion = () => {
    intentos += 1;
    return intentos === 1 ? Promise.reject(new Error('fallo de red')) : Promise.resolve('ok');
  };

  const protegida = crearProtectorDobleToque(operacion);

  await assert.rejects(protegida());
  const resultado = await protegida();

  assert.equal(intentos, 2);
  assert.equal(resultado, 'ok');
});

void test('si la operación lanza de forma síncrona, se comporta igual que un rechazo', async () => {
  const protegida = crearProtectorDobleToque((): Promise<never> => {
    throw new Error('fallo síncrono');
  });

  await assert.rejects(protegida(), /fallo síncrono/);
});
