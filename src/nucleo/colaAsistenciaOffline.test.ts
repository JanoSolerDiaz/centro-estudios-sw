import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacenColaAsistenciaEnMemoria, type ElementoColaAsistencia } from './colaAsistenciaOffline.ts';

function crearElementoPresencia(sobrescribir: Partial<ElementoColaAsistencia & { readonly tipo: 'presencia' }> = {}): ElementoColaAsistencia {
  return {
    clave: 'alumno-1|slot-1',
    tipo: 'presencia',
    entrada: { alumnoId: 'alumno-1', origen: 'slot', slotId: 'slot-1', peticionId: 'peticion-1' },
    ...sobrescribir,
  };
}

void test('almacén en memoria: vacío al crear', async () => {
  const almacen = crearAlmacenColaAsistenciaEnMemoria();
  assert.deepEqual(await almacen.listar(), []);
});

void test('almacén en memoria: agregar y listar devuelve el elemento tal cual', async () => {
  const almacen = crearAlmacenColaAsistenciaEnMemoria();
  const elemento = crearElementoPresencia();
  await almacen.agregar(elemento);
  assert.deepEqual(await almacen.listar(), [elemento]);
});

void test('almacén en memoria: agregar dos veces con el MISMO peticionId sustituye, nunca duplica', async () => {
  const almacen = crearAlmacenColaAsistenciaEnMemoria();
  await almacen.agregar(crearElementoPresencia({ entrada: { alumnoId: 'alumno-1', origen: 'slot', slotId: 'slot-1', peticionId: 'peticion-1' } }));
  await almacen.agregar(
    crearElementoPresencia({ entrada: { alumnoId: 'alumno-1', origen: 'slot', slotId: 'slot-1', peticionId: 'peticion-1', nota: 'reencolado' } }),
  );

  const elementos = await almacen.listar();
  assert.equal(elementos.length, 1);
  assert.equal(elementos[0]?.tipo === 'presencia' ? elementos[0].entrada.nota : undefined, 'reencolado');
});

void test('almacén en memoria: eliminar quita solo el elemento con ese peticionId', async () => {
  const almacen = crearAlmacenColaAsistenciaEnMemoria();
  await almacen.agregar(crearElementoPresencia({ clave: 'a', entrada: { alumnoId: 'a', origen: 'slot', slotId: 's', peticionId: 'peticion-a' } }));
  await almacen.agregar(crearElementoPresencia({ clave: 'b', entrada: { alumnoId: 'b', origen: 'slot', slotId: 's', peticionId: 'peticion-b' } }));

  await almacen.eliminar('peticion-a');

  const elementos = await almacen.listar();
  assert.equal(elementos.length, 1);
  assert.equal(elementos[0]?.clave, 'b');
});

void test('almacén en memoria: eliminar un peticionId que no existe no falla y no cambia nada', async () => {
  const almacen = crearAlmacenColaAsistenciaEnMemoria();
  await almacen.agregar(crearElementoPresencia());
  await almacen.eliminar('peticion-inexistente');
  assert.equal((await almacen.listar()).length, 1);
});

void test('almacén en memoria: conserva un elemento de tipo "ausencia" con su propia forma de entrada', async () => {
  const almacen = crearAlmacenColaAsistenciaEnMemoria();
  const elemento: ElementoColaAsistencia = {
    clave: 'alumno-1|slot-1',
    tipo: 'ausencia',
    entrada: { alumnoId: 'alumno-1', slotId: 'slot-1', peticionId: 'peticion-ausencia-1' },
  };
  await almacen.agregar(elemento);
  assert.deepEqual(await almacen.listar(), [elemento]);
});

void test('almacén en memoria: dos instancias son independientes (dos pantallas nunca comparten cola)', async () => {
  const almacenA = crearAlmacenColaAsistenciaEnMemoria();
  const almacenB = crearAlmacenColaAsistenciaEnMemoria();
  await almacenA.agregar(crearElementoPresencia());
  assert.deepEqual(await almacenB.listar(), []);
});
