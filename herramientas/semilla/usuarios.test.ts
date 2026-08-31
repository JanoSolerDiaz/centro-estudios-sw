import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorClienteAdmin, type ClienteAdmin } from './clienteAdmin.ts';
import type { UsuarioSemilla } from './datosFicticios.ts';
import { sembrarUsuarios } from './usuarios.ts';

const USUARIOS: readonly UsuarioSemilla[] = [
  { email: 'admin@t.test', password: 'x', nombre: 'Admin', rol: 'administrator' },
  { email: 'profe1@t.test', password: 'x', nombre: 'Profe Uno', rol: 'teacher' },
  { email: 'profe2@t.test', password: 'x', nombre: 'Profe Dos', rol: 'teacher' },
  { email: 'alumno@t.test', password: 'x', nombre: 'Alumno', rol: 'student' },
];

/** Doble del cliente: registra lo que se le pide y falla en los emails que se le indiquen. */
function dobleCliente(fallos: Record<string, ErrorClienteAdmin> = {}) {
  const creados: string[] = [];
  const promovidos: { id: string; rol: string }[] = [];
  const cliente: ClienteAdmin = {
    crearUsuario(email) {
      const fallo = fallos[email];
      if (fallo) {
        return Promise.reject(fallo);
      }
      creados.push(email);
      return Promise.resolve(`id-${email}`);
    },
    actualizarRolPerfil(id, rol) {
      promovidos.push({ id, rol });
      return Promise.resolve();
    },
    insertar() {
      throw new Error('no debería insertar filas al sembrar usuarios');
    },
    consultar() {
      throw new Error('no debería consultar al sembrar usuarios');
    },
  };
  return { cliente, creados, promovidos };
}

void test('crea todos los usuarios y promueve solo a los que no son student', async () => {
  const { cliente, creados, promovidos } = dobleCliente();
  const mensajes: string[] = [];

  const resumen = await sembrarUsuarios(cliente, USUARIOS, (m) => mensajes.push(m));

  assert.deepEqual(creados, ['admin@t.test', 'profe1@t.test', 'profe2@t.test', 'alumno@t.test']);
  assert.deepEqual(promovidos, [
    { id: 'id-admin@t.test', rol: 'administrator' },
    { id: 'id-profe1@t.test', rol: 'teacher' },
    { id: 'id-profe2@t.test', rol: 'teacher' },
  ]);
  assert.deepEqual(resumen, { creados: 4, omitidos: 0 });
});

void test('un usuario que ya existe no aborta el resto: se omite y los siguientes se crean', async () => {
  const yaExiste = new ErrorClienteAdmin('clienteAdmin: POST /auth/v1/admin/users respondió 422', 422, '{"msg":"already registered"}');
  const { cliente, creados, promovidos } = dobleCliente({ 'admin@t.test': yaExiste, 'profe1@t.test': yaExiste });
  const mensajes: string[] = [];

  const resumen = await sembrarUsuarios(cliente, USUARIOS, (m) => mensajes.push(m));

  // Lo importante: el segundo profesor, añadido después de la primera siembra, SÍ se crea.
  assert.deepEqual(creados, ['profe2@t.test', 'alumno@t.test']);
  assert.deepEqual(promovidos, [{ id: 'id-profe2@t.test', rol: 'teacher' }]);
  assert.deepEqual(resumen, { creados: 2, omitidos: 2 });
});

void test('el mensaje de un usuario omitido incluye el cuerpo de la respuesta, no solo el estado', async () => {
  const yaExiste = new ErrorClienteAdmin('respondió 422', 422, '{"msg":"already registered"}');
  const { cliente } = dobleCliente({ 'admin@t.test': yaExiste });
  const mensajes: string[] = [];

  await sembrarUsuarios(cliente, USUARIOS, (m) => mensajes.push(m));

  const mensaje = mensajes.find((m) => m.includes('admin@t.test'));
  assert.ok(mensaje, 'debería haber un mensaje sobre el usuario omitido');
  assert.ok(mensaje.includes('422'), 'debería decir el estado HTTP');
  assert.ok(mensaje.includes('already registered'), 'debería incluir el cuerpo de la respuesta');
});

void test('un error del servidor (5xx) SÍ se propaga: no se confunde con "ya existía"', async () => {
  const caida = new ErrorClienteAdmin('respondió 503', 503, 'service unavailable');
  const { cliente } = dobleCliente({ 'profe1@t.test': caida });

  await assert.rejects(
    () => sembrarUsuarios(cliente, USUARIOS, () => undefined),
    (error: unknown) => error instanceof ErrorClienteAdmin && error.estadoHttp === 503,
  );
});

void test('un error que no es del cliente admin se propaga tal cual', async () => {
  const { cliente } = dobleCliente();
  const roto: ClienteAdmin = {
    ...cliente,
    crearUsuario() {
      return Promise.reject(new TypeError('fetch failed'));
    },
  };

  await assert.rejects(
    () => sembrarUsuarios(roto, USUARIOS, () => undefined),
    (error: unknown) => error instanceof TypeError,
  );
});
