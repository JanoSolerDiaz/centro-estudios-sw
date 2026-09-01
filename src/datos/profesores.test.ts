import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { listarProfesoresActivos, resolverNombresProfesores } from './profesores.ts';

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

// --- resolverNombresProfesores (T-23, histórico de asistencia) ----------------------------------

void test('resolverNombresProfesores: con ids vacío, no hace ninguna petición y devuelve un mapa vacío', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  const mapa = await resolverNombresProfesores(cliente, []);

  assert.equal(llamadas, 0);
  assert.equal(mapa.size, 0);
});

void test('resolverNombresProfesores: una única petición en lote (in), sin filtrar por rol ni activo', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return {
      estado: 200,
      cuerpo: [
        { id: 'p1', nombre: 'Ana Profesora' },
        { id: 'p2', nombre: 'Luis Gómez' },
      ],
    };
  });

  const mapa = await resolverNombresProfesores(cliente, ['p1', 'p2']);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/perfil');
  assert.equal(url.searchParams.get('id'), 'in.(p1,p2)');
  assert.equal(url.searchParams.get('rol'), null);
  assert.equal(url.searchParams.get('activo'), null);
  assert.equal(mapa.get('p1'), 'Ana Profesora');
  assert.equal(mapa.get('p2'), 'Luis Gómez');
});

void test('resolverNombresProfesores: un id sin fila devuelta (p. ej. un teacher pidiendo el nombre de otro) simplemente falta en el mapa', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [{ id: 'p1', nombre: 'Ana Profesora' }] }));

  const mapa = await resolverNombresProfesores(cliente, ['p1', 'otro-profesor']);

  assert.equal(mapa.size, 1);
  assert.equal(mapa.has('otro-profesor'), false);
});
