import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacenEstado } from './almacenEstado.ts';

interface EstadoDePrueba {
  readonly contador: number;
  readonly etiqueta: string;
}

void test('obtener() devuelve el estado inicial antes de cualquier actualización', () => {
  const almacen = crearAlmacenEstado<EstadoDePrueba>({ contador: 0, etiqueta: 'inicio' });
  assert.deepEqual(almacen.obtener(), { contador: 0, etiqueta: 'inicio' });
});

void test('actualizar() con un objeto fusiona sobre el estado actual, sin tocar los campos no mencionados', () => {
  const almacen = crearAlmacenEstado<EstadoDePrueba>({ contador: 0, etiqueta: 'inicio' });
  almacen.actualizar({ contador: 5 });
  assert.deepEqual(almacen.obtener(), { contador: 5, etiqueta: 'inicio' });
});

void test('actualizar() con una función recibe el estado anterior y sustituye el estado entero', () => {
  const almacen = crearAlmacenEstado<EstadoDePrueba>({ contador: 3, etiqueta: 'a' });
  almacen.actualizar((actual) => ({ contador: actual.contador + 1, etiqueta: actual.etiqueta }));
  assert.deepEqual(almacen.obtener(), { contador: 4, etiqueta: 'a' });
});

void test('suscribir() notifica el nuevo estado en cada actualizar(), no el estado en el momento de suscribirse', () => {
  const almacen = crearAlmacenEstado<EstadoDePrueba>({ contador: 0, etiqueta: 'x' });
  const recibidos: number[] = [];
  almacen.suscribir((estado) => {
    recibidos.push(estado.contador);
  });

  assert.deepEqual(recibidos, []); // ninguna llamada inmediata al suscribirse

  almacen.actualizar({ contador: 1 });
  almacen.actualizar({ contador: 2 });

  assert.deepEqual(recibidos, [1, 2]);
});

void test('la función devuelta por suscribir() desuscribe: ninguna notificación posterior le llega', () => {
  const almacen = crearAlmacenEstado<EstadoDePrueba>({ contador: 0, etiqueta: 'x' });
  const recibidos: number[] = [];
  const desuscribir = almacen.suscribir((estado) => {
    recibidos.push(estado.contador);
  });

  almacen.actualizar({ contador: 1 });
  desuscribir();
  almacen.actualizar({ contador: 2 });

  assert.deepEqual(recibidos, [1]);
});

void test('dos suscriptores independientes reciben ambos cada notificación', () => {
  const almacen = crearAlmacenEstado<EstadoDePrueba>({ contador: 0, etiqueta: 'x' });
  const recibidosA: number[] = [];
  const recibidosB: number[] = [];
  almacen.suscribir((estado) => recibidosA.push(estado.contador));
  almacen.suscribir((estado) => recibidosB.push(estado.contador));

  almacen.actualizar({ contador: 7 });

  assert.deepEqual(recibidosA, [7]);
  assert.deepEqual(recibidosB, [7]);
});
