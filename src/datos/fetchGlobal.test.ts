/**
 * El `fetch` por defecto de los tres clientes funciona con la semántica de un navegador (P-36).
 *
 * En un navegador, `fetch` lanza `TypeError: Illegal invocation` si se le llama con un `this` que
 * no es el objeto global — que es lo que pasaba al guardarlo en un objeto de opciones y llamarlo
 * como `opciones.fetchImpl(...)`. Node no lo exige, así que el resto de tests (que además inyectan
 * un `fetchImpl` simulado) nunca podían verlo, y la aplicación no conseguía hablar con Supabase en
 * ningún navegador. Aquí se sustituye el `fetch` global por uno que se comporta como el de Chrome y
 * se crean los clientes SIN `fetchImpl`, para ejercer justo el valor por defecto.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClienteAutenticacion } from './autenticacion.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { crearClienteAlmacenamiento } from './almacenamiento.ts';
import { ErrorDeRed } from './erroresDominio.ts';

const OPCIONES = { urlBase: 'https://proyecto.supabase.co', claveAnonima: 'sb_publishable_prueba' };

async function conFetchDeNavegador(prueba: (llamadas: string[]) => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  const llamadas: string[] = [];
  globalThis.fetch = function (this: unknown, url: string | URL | Request): Promise<Response> {
    if (this !== undefined && this !== globalThis) {
      throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    }
    llamadas.push(url instanceof Request ? url.url : url.toString());
    return Promise.resolve(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
  };
  try {
    await prueba(llamadas);
  } finally {
    globalThis.fetch = original;
  }
}

void test('el doble de fetch reproduce el fallo del navegador al llamarlo como método de un objeto', async () => {
  await conFetchDeNavegador(async () => {
    const opciones = { fetchImpl: globalThis.fetch };
    await assert.rejects(async () => opciones.fetchImpl('https://ejemplo.test'), /Illegal invocation/);
  });
});

void test('autenticación: sin fetchImpl, la petición llega a la red (recuperar contraseña)', async () => {
  await conFetchDeNavegador(async (llamadas) => {
    await crearClienteAutenticacion(OPCIONES).solicitarRecuperacionContrasena('alguien@ejemplo.test');
    assert.deepEqual(llamadas, ['https://proyecto.supabase.co/auth/v1/recover']);
  });
});

void test('PostgREST: sin fetchImpl, la petición llega a la red (rpc)', async () => {
  await conFetchDeNavegador(async (llamadas) => {
    await crearClientePostgrest(OPCIONES).rpc('una_funcion');
    assert.deepEqual(llamadas, ['https://proyecto.supabase.co/rest/v1/rpc/una_funcion']);
  });
});

void test('Storage: sin fetchImpl, la petición llega a la red (eliminar)', async () => {
  await conFetchDeNavegador(async (llamadas) => {
    await crearClienteAlmacenamiento(OPCIONES).eliminar('avatares', ['a/b.webp']);
    assert.equal(llamadas.length, 1);
    assert.match(llamadas[0] ?? '', /^https:\/\/proyecto\.supabase\.co\/storage\/v1\/object\/avatares/);
  });
});

void test('un fallo de red real sigue siendo ErrorDeRed, y lleva el error original en cause', async () => {
  const original = globalThis.fetch;
  const fallo = new TypeError('Failed to fetch');
  globalThis.fetch = () => Promise.reject(fallo);
  try {
    await assert.rejects(crearClientePostgrest(OPCIONES).rpc('una_funcion'), (error: unknown) => {
      assert.ok(error instanceof ErrorDeRed);
      assert.equal(error.cause, fallo);
      return true;
    });
    await assert.rejects(crearClienteAutenticacion(OPCIONES).solicitarRecuperacionContrasena('a@b.test'), (error: unknown) => {
      assert.ok(error instanceof ErrorDeRed);
      assert.equal(error.cause, fallo);
      return true;
    });
  } finally {
    globalThis.fetch = original;
  }
});
