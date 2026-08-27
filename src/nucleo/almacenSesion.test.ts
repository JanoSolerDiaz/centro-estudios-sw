import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacenSesionEnMemoria, crearAlmacenSesionWebStorage } from './almacenSesion.ts';

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

void test('almacén en memoria: vacío al crear, guarda, lee y borra', () => {
  const almacen = crearAlmacenSesionEnMemoria();
  assert.equal(almacen.leer(), null);

  almacen.guardar({ refreshToken: 'un-refresh-token' });
  assert.deepEqual(almacen.leer(), { refreshToken: 'un-refresh-token' });

  almacen.borrar();
  assert.equal(almacen.leer(), null);
});

void test('almacén web: guarda solo el refresh_token, serializado, bajo una clave propia', () => {
  const storage = crearStorageFalso();
  const almacen = crearAlmacenSesionWebStorage(storage);

  almacen.guardar({ refreshToken: 'abc-123' });

  const clavesUsadas = Array.from({ length: storage.length }, (_, indice) => storage.key(indice));
  assert.equal(clavesUsadas.length, 1);
  const clave = clavesUsadas[0];
  assert.ok(clave);
  assert.deepEqual(JSON.parse(storage.getItem(clave) ?? '{}'), { refreshToken: 'abc-123' });

  assert.deepEqual(almacen.leer(), { refreshToken: 'abc-123' });

  almacen.borrar();
  assert.equal(almacen.leer(), null);
  assert.equal(storage.length, 0);
});

void test('almacén web: un valor corrupto o con forma inesperada se trata como ausente, no lanza', () => {
  const storage = crearStorageFalso();
  const almacen = crearAlmacenSesionWebStorage(storage);

  storage.setItem('gestoracademia.sesion', 'esto no es JSON');
  assert.equal(almacen.leer(), null);

  storage.setItem('gestoracademia.sesion', JSON.stringify({ otraCosa: 'sin refreshToken' }));
  assert.equal(almacen.leer(), null);
});
