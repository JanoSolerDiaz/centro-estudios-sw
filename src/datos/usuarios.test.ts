import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { listarUsuarios, actualizarUsuario } from './usuarios.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';
import type { Perfil } from '../dominio/tipos.ts';

const ADMIN: Perfil = {
  id: 'u1',
  nombre: 'Ana Admin',
  rol: 'administrator',
  activo: true,
  intentos_fallidos: 0,
  bloqueado: false,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  actualizado_por: null,
};
const TEACHER: Perfil = {
  id: 'u2',
  nombre: 'Pedro Profesor',
  rol: 'teacher',
  activo: true,
  intentos_fallidos: 0,
  bloqueado: false,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  actualizado_por: null,
};

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('listarUsuarios sin opciones no filtra y ordena por nombre', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [ADMIN, TEACHER] };
  });

  const filas = await listarUsuarios(cliente);

  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/perfil');
  assert.equal(url.searchParams.get('rol'), null);
  assert.equal(url.searchParams.get('activo'), null);
  assert.equal(url.searchParams.get('order'), 'nombre.asc');
  assert.deepEqual(filas, [ADMIN, TEACHER]);
});

void test('listarUsuarios({ rol }) filtra rol=eq.<rol>', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [TEACHER] };
  });

  await listarUsuarios(cliente, { rol: 'teacher' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('rol'), 'eq.teacher');
});

void test('listarUsuarios({ estado: "activos" }) filtra activo=eq.true', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [] };
  });

  await listarUsuarios(cliente, { estado: 'activos' });

  assert.equal(new URL(peticiones[0]?.url ?? '').searchParams.get('activo'), 'eq.true');
});

void test('listarUsuarios({ estado: "inactivos" }) filtra activo=eq.false', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [] };
  });

  await listarUsuarios(cliente, { estado: 'inactivos' });

  assert.equal(new URL(peticiones[0]?.url ?? '').searchParams.get('activo'), 'eq.false');
});

void test('listarUsuarios({ busqueda }) añade un filtro ilike con comodines, recortando espacios', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [] };
  });

  await listarUsuarios(cliente, { busqueda: '  pedro  ' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('nombre'), 'ilike.*pedro*');
});

void test('actualizarUsuario con un único campo solo envía ese campo (edición parcial real)', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...TEACHER, activo: false }] };
  });

  const resultado = await actualizarUsuario(cliente, 'u2', { activo: false });

  assert.equal(resultado.activo, false);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PATCH');
  assert.deepEqual(peticion.cuerpo, { activo: false });
  const url = new URL(peticion.url);
  assert.equal(url.searchParams.get('id'), 'eq.u2');
});

void test('actualizarUsuario combina nombre, rol y activo en una sola llamada', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...TEACHER, nombre: 'Pedro Nuevo', rol: 'administrator', activo: false }] };
  });

  await actualizarUsuario(cliente, 'u2', { nombre: '  Pedro   Nuevo  ', rol: 'administrator', activo: false });

  assert.deepEqual(peticiones[0]?.cuerpo, { nombre: 'Pedro Nuevo', rol: 'administrator', activo: false });
});

void test('actualizarUsuario con nombre vacío lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(() => actualizarUsuario(cliente, 'u2', { nombre: '   ' }), ErrorDeValidacion);
  assert.equal(llamadas, 0);
});

void test('actualizarUsuario propaga el mensaje del trigger de "último administrator" como ErrorDeValidacion', async () => {
  const cliente = crearCliente(() => ({
    estado: 400,
    cuerpo: { message: 'perfil: no se puede desactivar ni degradar al último administrator activo del sistema' },
  }));

  await assert.rejects(
    () => actualizarUsuario(cliente, 'u1', { activo: false }),
    (error: unknown) => error instanceof ErrorDeValidacion && error.message.includes('último administrator activo'),
  );
});

void test('actualizarUsuario sin fila devuelta (id inexistente o filtrado por RLS) lanza ErrorDelServidor', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));

  await assert.rejects(() => actualizarUsuario(cliente, 'no-existe', { activo: false }), ErrorDelServidor);
});
