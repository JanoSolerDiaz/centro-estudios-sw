import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import {
  listarCentros,
  crearCentro,
  editarNombreCentro,
  contarAlumnosActivosDeCentro,
  desactivarCentro,
  reactivarCentro,
} from './centrosEstudios.ts';
import { ErrorDeValidacion, SinPermiso } from './erroresDominio.ts';
import type { CentroEstudios } from '../dominio/tipos.ts';

const SAN_JOSE: CentroEstudios = {
  id: 'c1',
  nombre: 'San José',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};
const CERVANTES: CentroEstudios = {
  id: 'c2',
  nombre: 'IES Cervantes',
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

void test('listarCentros sin opciones no filtra por estado y ordena por nombre', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [SAN_JOSE, CERVANTES] };
  });

  const filas = await listarCentros(cliente);

  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/centro_estudios');
  assert.equal(url.searchParams.get('activo'), null);
  assert.equal(url.searchParams.get('order'), 'nombre.asc');
  assert.deepEqual(filas, [SAN_JOSE, CERVANTES]);
});

void test('listarCentros({ estado: "activos" }) filtra activo=eq.true', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [SAN_JOSE] };
  });

  await listarCentros(cliente, { estado: 'activos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
});

void test('listarCentros({ estado: "inactivos" }) filtra activo=eq.false', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [CERVANTES] };
  });

  await listarCentros(cliente, { estado: 'inactivos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.false');
});

void test('listarCentros({ busqueda }) añade un filtro ilike con comodines', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [] };
  });

  await listarCentros(cliente, { busqueda: '  cervantes  ' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('nombre'), 'ilike.*cervantes*');
});

void test('crearCentro inserta cuando no hay ningún nombre equivalente ya existente', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [SAN_JOSE, CERVANTES] };
    }
    return { estado: 201, cuerpo: [{ ...CERVANTES, id: 'c3', nombre: 'Colegio Nuevo' }] };
  });

  const resultado = await crearCentro(cliente, 'Colegio Nuevo');

  assert.equal(resultado.tipo, 'guardado');
  assert.equal(resultado.centro.nombre, 'Colegio Nuevo');
  const peticionInsertar = peticiones.find((p) => p.metodo === 'POST');
  assert.ok(peticionInsertar);
  assert.deepEqual(peticionInsertar.cuerpo, { nombre: 'Colegio Nuevo' });
});

void test('crearCentro ofrece el existente cuando el nombre es equivalente, sin llegar a insertar', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [SAN_JOSE, CERVANTES] };
  });

  const resultado = await crearCentro(cliente, '  SAN   JOSÉ ');

  assert.equal(resultado.tipo, 'duplicado');
  assert.equal(resultado.existente.id, 'c1');
  assert.ok(!peticiones.some((p) => p.metodo === 'POST'), 'no debe intentar insertar un duplicado');
});

void test('crearCentro con nombre vacío lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(() => crearCentro(cliente, '   '), ErrorDeValidacion);
  assert.equal(llamadas, 0);
});

void test('editarNombreCentro excluye al propio centro de la comprobación de duplicado', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [SAN_JOSE, CERVANTES] };
    }
    return { estado: 200, cuerpo: [{ ...SAN_JOSE, nombre: 'San José Nuevo' }] };
  });

  const resultado = await editarNombreCentro(cliente, 'c1', 'San José Nuevo');

  assert.equal(resultado.tipo, 'guardado');
});

void test('editarNombreCentro detecta el duplicado con otro centro distinto de sí mismo', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [SAN_JOSE, CERVANTES] }));

  const resultado = await editarNombreCentro(cliente, 'c1', 'ies cervantes');

  assert.equal(resultado.tipo, 'duplicado');
  assert.equal(resultado.existente.id, 'c2');
});

void test('contarAlumnosActivosDeCentro consulta alumno filtrado por centro y activo=true', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ id: 'a1' }, { id: 'a2' }] };
  });

  const total = await contarAlumnosActivosDeCentro(cliente, 'c1');

  assert.equal(total, 2);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/alumno');
  assert.equal(url.searchParams.get('centro_referencia_id'), 'eq.c1');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
});

void test('desactivarCentro hace PATCH activo=false y devuelve la fila actualizada', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...SAN_JOSE, activo: false }] };
  });

  const centro = await desactivarCentro(cliente, 'c1');

  assert.equal(centro.activo, false);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PATCH');
  assert.deepEqual(peticion.cuerpo, { activo: false });
});

void test('reactivarCentro hace PATCH activo=true y devuelve la fila actualizada', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [{ ...CERVANTES, activo: true }] }));

  const centro = await reactivarCentro(cliente, 'c2');

  assert.equal(centro.activo, true);
});

void test('un teacher (rechazado por RLS al escribir) recibe SinPermiso, no un error genérico', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [] };
    }
    // 403: lo que devuelve PostgREST cuando la política de RLS rechaza la escritura de un `teacher`.
    return { estado: 403, cuerpo: { message: 'new row violates row-level security policy' } };
  });

  await assert.rejects(() => crearCentro(cliente, 'Colegio Nuevo'), SinPermiso);
});

void test('desactivarCentro solo toca centro_estudios: no envía ninguna petición a alumno', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...SAN_JOSE, activo: false }] };
  });

  await desactivarCentro(cliente, 'c1');

  assert.ok(!peticiones.some((p) => p.url.includes('/alumno')), 'la baja de un centro no debe tocar alumno');
});
