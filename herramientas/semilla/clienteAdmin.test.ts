import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado } from '../migraciones/pruebas/dobleFetch.ts';
import { crearClienteAdmin, ErrorClienteAdmin } from './clienteAdmin.ts';

void test('crearUsuario llama al endpoint admin de GoTrue con la clave de servicio y devuelve el id', async () => {
  let peticionCapturada:
    | { url: string; metodo: string; cabeceras: Readonly<Record<string, string>>; cuerpo: unknown }
    | undefined;
  const fetchDoble = crearFetchSimulado((peticion) => {
    peticionCapturada = peticion;
    return { estado: 200, cuerpo: { id: 'user-1' } };
  });
  const cliente = crearClienteAdmin('https://proyecto.supabase.co', 'clave-de-servicio', fetchDoble);

  const id = await cliente.crearUsuario('a@example.test', 'Password-1!', 'Ana');

  assert.equal(id, 'user-1');
  assert.ok(peticionCapturada);
  assert.equal(peticionCapturada.url, 'https://proyecto.supabase.co/auth/v1/admin/users');
  assert.equal(peticionCapturada.metodo, 'POST');
  assert.equal(peticionCapturada.cabeceras.authorization, 'Bearer clave-de-servicio');
  assert.equal(peticionCapturada.cabeceras.apikey, 'clave-de-servicio');
  assert.deepEqual(peticionCapturada.cuerpo, {
    email: 'a@example.test',
    password: 'Password-1!',
    email_confirm: true,
    user_metadata: { nombre: 'Ana' },
  });
});

void test('actualizarRolPerfil hace un PATCH filtrado por id', async () => {
  let peticionCapturada:
    | { url: string; metodo: string; cuerpo: unknown }
    | undefined;
  const fetchDoble = crearFetchSimulado((peticion) => {
    peticionCapturada = peticion;
    return { estado: 200 };
  });
  const cliente = crearClienteAdmin('https://proyecto.supabase.co', 'clave', fetchDoble);

  await cliente.actualizarRolPerfil('user-1', 'administrator');

  assert.ok(peticionCapturada);
  assert.equal(peticionCapturada.url, 'https://proyecto.supabase.co/rest/v1/perfil?id=eq.user-1');
  assert.equal(peticionCapturada.metodo, 'PATCH');
  assert.deepEqual(peticionCapturada.cuerpo, { rol: 'administrator' });
});

void test('insertar hace un POST y devuelve las filas insertadas', async () => {
  const fetchDoble = crearFetchSimulado(() => ({ estado: 201, cuerpo: [{ id: 'c1', nombre: 'IES Uno' }] }));
  const cliente = crearClienteAdmin('https://proyecto.supabase.co', 'clave', fetchDoble);

  const filas = await cliente.insertar('centro_estudios', [{ nombre: 'IES Uno' }]);

  assert.deepEqual(filas, [{ id: 'c1', nombre: 'IES Uno' }]);
});

void test('consultar hace un GET con el filtro en la query string', async () => {
  let peticionCapturada: { url: string; metodo: string } | undefined;
  const fetchDoble = crearFetchSimulado((peticion) => {
    peticionCapturada = peticion;
    return { estado: 200, cuerpo: [] };
  });
  const cliente = crearClienteAdmin('https://proyecto.supabase.co', 'clave', fetchDoble);

  await cliente.consultar('centro_estudios', 'nombre=eq.IES Semilla Uno');

  assert.ok(peticionCapturada);
  assert.equal(peticionCapturada.metodo, 'GET');
  assert.equal(peticionCapturada.url, 'https://proyecto.supabase.co/rest/v1/centro_estudios?nombre=eq.IES Semilla Uno');
});

void test('una respuesta que no es 2xx lanza ErrorClienteAdmin con el estado', async () => {
  const fetchDoble = crearFetchSimulado(() => ({ estado: 409, cuerpo: { message: 'duplicate key' } }));
  const cliente = crearClienteAdmin('https://proyecto.supabase.co', 'clave', fetchDoble);

  await assert.rejects(
    () => cliente.insertar('centro_estudios', [{ nombre: 'IES Uno' }]),
    (error: unknown) => {
      assert.ok(error instanceof ErrorClienteAdmin);
      assert.equal(error.estadoHttp, 409);
      return true;
    },
  );
});
