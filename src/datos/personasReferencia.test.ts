import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import {
  crearPersonaReferencia,
  editarPersonaReferencia,
  eliminarPersonaReferencia,
  listarPersonasReferencia,
  listarPersonasReferenciaDeAlumnos,
} from './personasReferencia.ts';
import { ErrorDeValidacion, SinPermiso } from './erroresDominio.ts';
import type { PersonaReferencia } from '../dominio/tipos.ts';

const JUAN: PersonaReferencia = {
  id: 'pr1',
  alumno_id: 'a1',
  nombre: 'Juan',
  primer_apellido: 'García',
  segundo_apellido: null,
  email_referencia: null,
  telefono_referencia: '600000000',
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

void test('crearPersonaReferencia inserta con el alumno_id y devuelve la fila creada', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 201, cuerpo: [JUAN] };
  });

  const persona = await crearPersonaReferencia(cliente, 'a1', {
    nombre: 'Juan',
    primer_apellido: 'García',
    telefono_referencia: '600000000',
  });

  assert.deepEqual(persona, JUAN);
  assert.equal(peticiones.length, 1);
  const insercion = peticiones[0];
  assert.ok(insercion);
  const url = new URL(insercion.url);
  assert.equal(url.pathname, '/rest/v1/persona_referencia');
  assert.equal(insercion.cabeceras.prefer, 'return=representation');
  const cuerpo = insercion.cuerpo as Record<string, unknown>;
  assert.equal(cuerpo.alumno_id, 'a1');
  assert.equal(cuerpo.segundo_apellido, null);
  assert.equal(cuerpo.email_referencia, null);
});

void test('crearPersonaReferencia normaliza nombre y teléfono con separadores antes de insertar', async () => {
  let cuerpoInsertado: Record<string, unknown> | undefined;
  const cliente = crearCliente((peticion) => {
    cuerpoInsertado = peticion.cuerpo as Record<string, unknown>;
    return { estado: 201, cuerpo: [JUAN] };
  });

  await crearPersonaReferencia(cliente, 'a1', {
    nombre: '  Juan  ',
    primer_apellido: ' García ',
    segundo_apellido: '  Pérez  ',
    email_referencia: '  tutor@ejemplo.com  ',
    telefono_referencia: '600 00 00 00',
  });

  assert.ok(cuerpoInsertado);
  assert.equal(cuerpoInsertado.nombre, 'Juan');
  assert.equal(cuerpoInsertado.primer_apellido, 'García');
  assert.equal(cuerpoInsertado.segundo_apellido, 'Pérez');
  assert.equal(cuerpoInsertado.email_referencia, 'tutor@ejemplo.com');
  assert.equal(cuerpoInsertado.telefono_referencia, '600000000');
});

void test('crearPersonaReferencia con teléfono vacío lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 201, cuerpo: [JUAN] };
  });

  await assert.rejects(
    () => crearPersonaReferencia(cliente, 'a1', { nombre: 'Juan', primer_apellido: 'García', telefono_referencia: '  ' }),
    ErrorDeValidacion,
  );
  assert.equal(llamadas, 0);
});

void test('crearPersonaReferencia con teléfono sin formato español válido lanza ErrorDeValidacion', async () => {
  const cliente = crearCliente(() => ({ estado: 201, cuerpo: [JUAN] }));

  await assert.rejects(
    () =>
      crearPersonaReferencia(cliente, 'a1', {
        nombre: 'Juan',
        primer_apellido: 'García',
        telefono_referencia: '12345',
      }),
    ErrorDeValidacion,
  );
});

void test('crearPersonaReferencia con email sin formato válido lanza ErrorDeValidacion, y email vacío no', async () => {
  const cliente = crearCliente(() => ({ estado: 201, cuerpo: [JUAN] }));

  await assert.rejects(
    () =>
      crearPersonaReferencia(cliente, 'a1', {
        nombre: 'Juan',
        primer_apellido: 'García',
        telefono_referencia: '600000000',
        email_referencia: 'no-es-un-email',
      }),
    ErrorDeValidacion,
  );

  const persona = await crearPersonaReferencia(cliente, 'a1', {
    nombre: 'Juan',
    primer_apellido: 'García',
    telefono_referencia: '600000000',
    email_referencia: '   ',
  });
  assert.deepEqual(persona, JUAN);
});

void test('crearPersonaReferencia con nombre vacío lanza ErrorDeValidacion', async () => {
  const cliente = crearCliente(() => ({ estado: 201, cuerpo: [JUAN] }));

  await assert.rejects(
    () => crearPersonaReferencia(cliente, 'a1', { nombre: '   ', primer_apellido: 'García', telefono_referencia: '600000000' }),
    ErrorDeValidacion,
  );
});

void test('editarPersonaReferencia hace PATCH filtrado por id y devuelve la fila actualizada', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...JUAN, telefono_referencia: '611111111' }] };
  });

  const persona = await editarPersonaReferencia(cliente, 'pr1', {
    nombre: 'Juan',
    primer_apellido: 'García',
    telefono_referencia: '611111111',
  });

  assert.equal(persona.telefono_referencia, '611111111');
  const patch = peticiones.find((p) => p.metodo === 'PATCH');
  assert.ok(patch);
  const url = new URL(patch.url);
  assert.equal(url.searchParams.get('id'), 'eq.pr1');
});

void test('eliminarPersonaReferencia hace DELETE filtrado por id, sin baja lógica', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 204, cuerpo: undefined };
  });

  await eliminarPersonaReferencia(cliente, 'pr1');

  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'DELETE');
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/persona_referencia');
  assert.equal(url.searchParams.get('id'), 'eq.pr1');
});

void test('un teacher (rechazado por RLS al escribir) recibe SinPermiso, no un error genérico', async () => {
  const cliente = crearCliente(() => ({
    estado: 403,
    cuerpo: { message: 'new row violates row-level security policy' },
  }));

  await assert.rejects(
    () => crearPersonaReferencia(cliente, 'a1', { nombre: 'Juan', primer_apellido: 'García', telefono_referencia: '600000000' }),
    SinPermiso,
  );
});

void test('listarPersonasReferencia filtra por alumno_id y ordena por creado_en (R-05, requisito 1)', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [JUAN] };
  });

  const personas = await listarPersonasReferencia(cliente, 'a1');

  assert.deepEqual(personas, [JUAN]);
  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'GET');
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/persona_referencia');
  assert.equal(url.searchParams.get('alumno_id'), 'eq.a1');
  assert.equal(url.searchParams.get('order'), 'creado_en.asc');
});

void test('listarPersonasReferencia: un teacher (0 filas por RLS, no un error) recibe un array vacío', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));

  const personas = await listarPersonasReferencia(cliente, 'a1');

  assert.deepEqual(personas, []);
});

void test('listarPersonasReferenciaDeAlumnos: una única petición con "in", agrupada por alumno_id (R-16)', async () => {
  const peticiones: PeticionSimulada[] = [];
  const MARIA: PersonaReferencia = { ...JUAN, id: 'pr2', alumno_id: 'a2', nombre: 'María' };
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [JUAN, MARIA] };
  });

  const mapa = await listarPersonasReferenciaDeAlumnos(cliente, ['a1', 'a2']);

  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.searchParams.get('alumno_id'), 'in.(a1,a2)');
  assert.deepEqual(mapa.get('a1'), [JUAN]);
  assert.deepEqual(mapa.get('a2'), [MARIA]);
  assert.equal(mapa.get('a3'), undefined);
});

void test('listarPersonasReferenciaDeAlumnos: agrupa varias personas del mismo alumno en un único array', async () => {
  const SEGUNDA: PersonaReferencia = { ...JUAN, id: 'pr2', nombre: 'María' };
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [JUAN, SEGUNDA] }));

  const mapa = await listarPersonasReferenciaDeAlumnos(cliente, ['a1']);

  assert.deepEqual(mapa.get('a1'), [JUAN, SEGUNDA]);
});

void test('listarPersonasReferenciaDeAlumnos: con alumnoIds vacío no hace ninguna petición', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  const mapa = await listarPersonasReferenciaDeAlumnos(cliente, []);

  assert.equal(llamadas, 0);
  assert.equal(mapa.size, 0);
});
