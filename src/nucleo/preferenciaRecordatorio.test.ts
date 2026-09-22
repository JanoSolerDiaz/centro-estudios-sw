import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacenPreferenciaRecordatorioEnMemoria, crearAlmacenPreferenciaRecordatorioWebStorage } from './preferenciaRecordatorio.ts';

function crearStorageFalso(): Storage {
  const datos = new Map<string, string>();
  return {
    get length() {
      return datos.size;
    },
    clear: () => {
      datos.clear();
    },
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => Array.from(datos.keys())[indice] ?? null,
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
  };
}

void test('almacén en memoria: apagado por defecto (requisito 1), guarda y lee', () => {
  const almacen = crearAlmacenPreferenciaRecordatorioEnMemoria();
  assert.equal(almacen.leer(), 'apagado');

  almacen.guardar('activado');
  assert.equal(almacen.leer(), 'activado');

  almacen.guardar('apagado');
  assert.equal(almacen.leer(), 'apagado');
});

void test('almacén web: apagado por defecto sin nada guardado', () => {
  const storage = crearStorageFalso();
  const almacen = crearAlmacenPreferenciaRecordatorioWebStorage(storage);
  assert.equal(almacen.leer(), 'apagado');
});

void test('almacén web: guarda y lee bajo una clave propia', () => {
  const storage = crearStorageFalso();
  const almacen = crearAlmacenPreferenciaRecordatorioWebStorage(storage);

  almacen.guardar('activado');

  assert.equal(storage.getItem('gestoracademia.recordatorioSesion'), 'activado');
  assert.equal(almacen.leer(), 'activado');

  almacen.guardar('apagado');
  assert.equal(almacen.leer(), 'apagado');
});

void test('almacén web: un valor guardado no reconocible se trata como "apagado", nunca lanza', () => {
  const storage = crearStorageFalso();
  const almacen = crearAlmacenPreferenciaRecordatorioWebStorage(storage);

  storage.setItem('gestoracademia.recordatorioSesion', 'cualquier-cosa');
  assert.equal(almacen.leer(), 'apagado');
});
