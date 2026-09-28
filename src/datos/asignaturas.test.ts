import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { listarAsignaturas, crearAsignatura, editarNombreAsignatura, desactivarAsignatura, reactivarAsignatura } from './asignaturas.ts';
import { ErrorDeValidacion, SinPermiso } from './erroresDominio.ts';
import type { Asignatura } from '../dominio/tipos.ts';

const MATEMATICAS: Asignatura = {
  id: 'a1',
  nombre: 'Matemáticas 4ESO',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};
const LENGUA: Asignatura = {
  id: 'a2',
  nombre: 'Lengua 1ESO',
  activo: false,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('listarAsignaturas sin opciones no filtra por estado y ordena por nombre', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [MATEMATICAS, LENGUA] };
  });

  const filas = await listarAsignaturas(cliente);

  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/asignatura');
  assert.equal(url.searchParams.get('activo'), null);
  assert.equal(url.searchParams.get('order'), 'nombre.asc');
  assert.deepEqual(filas, [MATEMATICAS, LENGUA]);
});

void test('listarAsignaturas({ estado: "activos" }) filtra activo=eq.true', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [MATEMATICAS] };
  });

  await listarAsignaturas(cliente, { estado: 'activos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
});

void test('listarAsignaturas({ estado: "inactivos" }) filtra activo=eq.false', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [LENGUA] };
  });

  await listarAsignaturas(cliente, { estado: 'inactivos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.false');
});

void test('crearAsignatura inserta cuando no hay ningún nombre equivalente ya existente', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [MATEMATICAS, LENGUA] };
    }
    return { estado: 201, cuerpo: [{ ...LENGUA, id: 'a3', nombre: 'Física 4ESO' }] };
  });

  const resultado = await crearAsignatura(cliente, 'Física 4ESO');

  assert.equal(resultado.tipo, 'guardado');
  assert.equal(resultado.asignatura.nombre, 'Física 4ESO');
  const peticionInsertar = peticiones.find((p) => p.metodo === 'POST');
  assert.ok(peticionInsertar);
  assert.deepEqual(peticionInsertar.cuerpo, { nombre: 'Física 4ESO' });
});

void test('crearAsignatura ofrece la existente cuando el nombre es equivalente, sin llegar a insertar', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [MATEMATICAS, LENGUA] };
  });

  const resultado = await crearAsignatura(cliente, '  matematicas   4eso ');

  assert.equal(resultado.tipo, 'duplicado');
  assert.equal(resultado.existente.id, 'a1');
  assert.ok(!peticiones.some((p) => p.metodo === 'POST'), 'no debe intentar insertar un duplicado');
});

void test('crearAsignatura con nombre vacío lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(() => crearAsignatura(cliente, '   '), ErrorDeValidacion);
  assert.equal(llamadas, 0);
});

void test('editarNombreAsignatura excluye a la propia asignatura de la comprobación de duplicado', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [MATEMATICAS, LENGUA] };
    }
    return { estado: 200, cuerpo: [{ ...MATEMATICAS, nombre: 'Matemáticas 4ESO B' }] };
  });

  const resultado = await editarNombreAsignatura(cliente, 'a1', 'Matemáticas 4ESO B');

  assert.equal(resultado.tipo, 'guardado');
});

void test('editarNombreAsignatura detecta el duplicado con otra asignatura distinta de sí misma', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [MATEMATICAS, LENGUA] }));

  const resultado = await editarNombreAsignatura(cliente, 'a1', 'lengua 1eso');

  assert.equal(resultado.tipo, 'duplicado');
  assert.equal(resultado.existente.id, 'a2');
});

void test('desactivarAsignatura hace PATCH activo=false y devuelve la fila actualizada', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...MATEMATICAS, activo: false }] };
  });

  const asignatura = await desactivarAsignatura(cliente, 'a1');

  assert.equal(asignatura.activo, false);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PATCH');
  assert.deepEqual(peticion.cuerpo, { activo: false });
});

void test('reactivarAsignatura hace PATCH activo=true y devuelve la fila actualizada', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [{ ...LENGUA, activo: true }] }));

  const asignatura = await reactivarAsignatura(cliente, 'a2');

  assert.equal(asignatura.activo, true);
});

void test('un teacher (rechazado por RLS al escribir) recibe SinPermiso, no un error genérico', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [] };
    }
    // 403: lo que devuelve PostgREST cuando la política de RLS rechaza la escritura de un `teacher`.
    return { estado: 403, cuerpo: { message: 'new row violates row-level security policy' } };
  });

  await assert.rejects(() => crearAsignatura(cliente, 'Física 4ESO'), SinPermiso);
});
