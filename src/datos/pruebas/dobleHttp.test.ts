import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, crearFetchSimuladoConErrorDeRed, type PeticionSimulada } from './dobleHttp.ts';

void test('el doble responde 200 con el cuerpo JSON configurado, simulando una lista de PostgREST', async () => {
  const fetchSimulado = crearFetchSimulado(() => ({
    estado: 200,
    cuerpo: [{ id: '1', nombre: 'Colegio San José' }],
  }));

  const respuesta = await fetchSimulado('https://proyecto.supabase.co/rest/v1/centro_estudios');
  const cuerpo = (await respuesta.json()) as unknown[];

  assert.equal(respuesta.status, 200);
  assert.deepEqual(cuerpo, [{ id: '1', nombre: 'Colegio San José' }]);
});

void test('el doble simula un 401 de GoTrue (sin autenticar)', async () => {
  const fetchSimulado = crearFetchSimulado(() => ({
    estado: 401,
    cuerpo: { message: 'invalid JWT' },
  }));

  const respuesta = await fetchSimulado('https://proyecto.supabase.co/auth/v1/user');

  assert.equal(respuesta.status, 401);
});

void test('el doble simula un 403 de una política RLS que rechaza el acceso', async () => {
  const fetchSimulado = crearFetchSimulado(() => ({
    estado: 403,
    cuerpo: { message: 'permission denied for table persona_referencia' },
  }));

  const respuesta = await fetchSimulado('https://proyecto.supabase.co/rest/v1/persona_referencia');

  assert.equal(respuesta.status, 403);
});

void test('el doble simula un 409 de conflicto (p. ej. peticion_id duplicado)', async () => {
  const fetchSimulado = crearFetchSimulado(() => ({
    estado: 409,
    cuerpo: { message: 'duplicate key value violates unique constraint' },
  }));

  const respuesta = await fetchSimulado('https://proyecto.supabase.co/rest/v1/rpc/registrar_asistencia', {
    method: 'POST',
    body: JSON.stringify({ peticion_id: 'ya-existe' }),
  });

  assert.equal(respuesta.status, 409);
});

void test('el doble simula una respuesta vacía (204, p. ej. tras un DELETE de Storage)', async () => {
  const fetchSimulado = crearFetchSimulado(() => ({ estado: 204 }));

  const respuesta = await fetchSimulado('https://proyecto.supabase.co/storage/v1/object/avatares/x.webp', {
    method: 'DELETE',
  });
  const texto = await respuesta.text();

  assert.equal(respuesta.status, 204);
  assert.equal(texto, '');
});

void test('el doble rechaza la promesa para simular un fallo de red, sin devolver ninguna respuesta', async () => {
  const fetchSimulado = crearFetchSimuladoConErrorDeRed('sin conexión');

  await assert.rejects(() => fetchSimulado('https://proyecto.supabase.co/rest/v1/alumno'), TypeError);
});

void test('el doble expone al manejador el método, las cabeceras y el cuerpo decodificado de la petición', async () => {
  let peticionRecibida: PeticionSimulada | undefined;
  const fetchSimulado = crearFetchSimulado((peticion) => {
    peticionRecibida = peticion;
    return { estado: 201, cuerpo: { ok: true } };
  });

  await fetchSimulado('https://proyecto.supabase.co/rest/v1/alumno', {
    method: 'POST',
    headers: { apikey: 'clave-anonima', Authorization: 'Bearer token' },
    body: JSON.stringify({ nombre: 'Ana' }),
  });

  assert.ok(peticionRecibida);
  assert.equal(peticionRecibida.metodo, 'POST');
  assert.equal(peticionRecibida.cabeceras.apikey, 'clave-anonima');
  assert.deepEqual(peticionRecibida.cuerpo, { nombre: 'Ana' });
});
