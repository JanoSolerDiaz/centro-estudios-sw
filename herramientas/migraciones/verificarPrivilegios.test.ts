import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClienteManagementApi } from './clienteManagementApi.ts';
import { verificarPrivilegios } from './verificarPrivilegios.ts';

function clienteConFilas(filas: unknown[]): ClienteManagementApi {
  return { ejecutarSql: () => Promise.resolve(filas) };
}

void test('sin ninguna fila, no hay violaciones', async () => {
  const violaciones = await verificarPrivilegios(clienteConFilas([]), 'ref');
  assert.deepEqual(violaciones, []);
});

void test('SELECT/INSERT/UPDATE normales no son violaciones', async () => {
  const violaciones = await verificarPrivilegios(
    clienteConFilas([
      { table_name: 'perfil', grantee: 'authenticated', privilege_type: 'SELECT' },
      { table_name: 'perfil', grantee: 'authenticated', privilege_type: 'INSERT' },
    ]),
    'ref',
  );
  assert.deepEqual(violaciones, []);
});

void test('TRUNCATE a authenticated se reporta como violación', async () => {
  const violaciones = await verificarPrivilegios(
    clienteConFilas([{ table_name: 'perfil', grantee: 'authenticated', privilege_type: 'TRUNCATE' }]),
    'ref',
  );
  assert.deepEqual(violaciones, [{ tabla: 'perfil', rol: 'authenticated', privilegio: 'TRUNCATE' }]);
});

void test('REFERENCES y TRIGGER a anon también se reportan', async () => {
  const violaciones = await verificarPrivilegios(
    clienteConFilas([
      { table_name: 'alumno', grantee: 'anon', privilege_type: 'REFERENCES' },
      { table_name: 'alumno', grantee: 'anon', privilege_type: 'TRIGGER' },
    ]),
    'ref',
  );
  assert.equal(violaciones.length, 2);
  assert.deepEqual(
    violaciones.map((v) => v.privilegio),
    ['REFERENCES', 'TRIGGER'],
  );
});
