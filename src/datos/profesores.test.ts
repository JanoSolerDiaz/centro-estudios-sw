import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { listarProfesoresActivos } from './profesores.ts';

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('pide solo id y nombre, filtrando rol=eq.teacher y activo=eq.true, ordenado por nombre', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ id: 'p1', nombre: 'Ana Profesora' }] };
  });

  const profesores = await listarProfesoresActivos(cliente);

  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/perfil');
  assert.equal(url.searchParams.get('rol'), 'eq.teacher');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
  assert.equal(url.searchParams.get('order'), 'nombre.asc');
  assert.equal(url.searchParams.get('select'), 'id,nombre');
  assert.deepEqual(profesores, [{ id: 'p1', nombre: 'Ana Profesora' }]);
});

void test('sin profesores activos, devuelve una lista vacía', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));
  assert.deepEqual(await listarProfesoresActivos(cliente), []);
});
