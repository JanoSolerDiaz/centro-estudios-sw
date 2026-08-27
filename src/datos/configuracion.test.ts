import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerConfiguracionEntorno, ErrorConfiguracionFaltante } from './configuracion.ts';

void test('leerConfiguracionEntorno devuelve la URL y la clave cuando ambas están presentes', () => {
  const configuracion = leerConfiguracionEntorno({
    SUPABASE_URL: 'https://proyecto.supabase.co',
    SUPABASE_ANON_KEY: 'clave-anonima',
  });

  assert.deepEqual(configuracion, { urlBase: 'https://proyecto.supabase.co', claveAnonima: 'clave-anonima' });
});

void test('leerConfiguracionEntorno quita la barra final de la URL', () => {
  const configuracion = leerConfiguracionEntorno({
    SUPABASE_URL: 'https://proyecto.supabase.co/',
    SUPABASE_ANON_KEY: 'clave-anonima',
  });

  assert.equal(configuracion.urlBase, 'https://proyecto.supabase.co');
});

void test('leerConfiguracionEntorno lanza ErrorConfiguracionFaltante si origen es undefined (config.js no cargado)', () => {
  assert.throws(() => leerConfiguracionEntorno(undefined), ErrorConfiguracionFaltante);
});

void test('leerConfiguracionEntorno lanza ErrorConfiguracionFaltante si falta SUPABASE_URL', () => {
  assert.throws(
    () => leerConfiguracionEntorno({ SUPABASE_ANON_KEY: 'clave-anonima' }),
    (error: unknown) => error instanceof ErrorConfiguracionFaltante && error.message.includes('SUPABASE_URL'),
  );
});

void test('leerConfiguracionEntorno lanza ErrorConfiguracionFaltante si falta SUPABASE_ANON_KEY', () => {
  assert.throws(
    () => leerConfiguracionEntorno({ SUPABASE_URL: 'https://proyecto.supabase.co' }),
    (error: unknown) => error instanceof ErrorConfiguracionFaltante && error.message.includes('SUPABASE_ANON_KEY'),
  );
});

void test('leerConfiguracionEntorno lanza ErrorConfiguracionFaltante si el valor es una cadena vacía o solo espacios', () => {
  assert.throws(
    () => leerConfiguracionEntorno({ SUPABASE_URL: '   ', SUPABASE_ANON_KEY: 'clave-anonima' }),
    ErrorConfiguracionFaltante,
  );
});

void test('leerConfiguracionEntorno lanza ErrorConfiguracionFaltante si origen no es un objeto', () => {
  assert.throws(() => leerConfiguracionEntorno('no es un objeto'), ErrorConfiguracionFaltante);
});
