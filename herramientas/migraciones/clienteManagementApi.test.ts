import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado } from './pruebas/dobleFetch.ts';
import { crearClienteManagementApi, ErrorManagementApi } from './clienteManagementApi.ts';

void test('construye la URL, el método, la cabecera de autorización y el cuerpo correctamente', async () => {
  let peticionCapturada: { url: string; metodo: string; cabeceras: Readonly<Record<string, string>>; cuerpo: unknown } | undefined;
  const fetchDoble = crearFetchSimulado((peticion) => {
    peticionCapturada = peticion;
    return { estado: 200, cuerpo: [] };
  });
  const cliente = crearClienteManagementApi('token-secreto-de-prueba', fetchDoble);

  await cliente.ejecutarSql('mi-proyecto', 'select 1;');

  assert.ok(peticionCapturada);
  assert.equal(peticionCapturada.url, 'https://api.supabase.com/v1/projects/mi-proyecto/database/query');
  assert.equal(peticionCapturada.metodo, 'POST');
  assert.equal(peticionCapturada.cabeceras.authorization, 'Bearer token-secreto-de-prueba');
  assert.deepEqual(peticionCapturada.cuerpo, { query: 'select 1;' });
});

void test('devuelve las filas de una respuesta 200 con cuerpo', async () => {
  const filas = [{ numero: 1, nombre: '001_esquema_inicial' }];
  const fetchDoble = crearFetchSimulado(() => ({ estado: 200, cuerpo: filas }));
  const cliente = crearClienteManagementApi('token', fetchDoble);

  const resultado = await cliente.ejecutarSql('ref', 'select * from esquema_migracion;');

  assert.deepEqual(resultado, filas);
});

void test('una respuesta 200 sin cuerpo devuelve una lista vacía (DDL puro)', async () => {
  const fetchDoble = crearFetchSimulado(() => ({ estado: 200 }));
  const cliente = crearClienteManagementApi('token', fetchDoble);

  assert.deepEqual(await cliente.ejecutarSql('ref', 'create table x();'), []);
});

void test('una respuesta que no es 2xx lanza ErrorManagementApi con estado y cuerpo', async () => {
  const fetchDoble = crearFetchSimulado(() => ({
    estado: 404,
    cuerpo: { message: 'Project not found' },
  }));
  const cliente = crearClienteManagementApi('token', fetchDoble);

  await assert.rejects(
    () => cliente.ejecutarSql('ref-inexistente', 'select 1;'),
    (error: unknown) => {
      assert.ok(error instanceof ErrorManagementApi);
      assert.equal(error.estadoHttp, 404);
      assert.match(error.cuerpo, /Project not found/);
      return true;
    },
  );
});

void test('una respuesta 401 (access token inválido) también lanza ErrorManagementApi', async () => {
  const fetchDoble = crearFetchSimulado(() => ({ estado: 401, cuerpo: { message: 'Unauthorized' } }));
  const cliente = crearClienteManagementApi('token-malo', fetchDoble);

  await assert.rejects(() => cliente.ejecutarSql('ref', 'select 1;'), ErrorManagementApi);
});
