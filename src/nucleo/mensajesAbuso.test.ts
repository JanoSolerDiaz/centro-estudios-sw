import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeAmigable } from './mensajesAbuso.ts';
import { ErrorLimiteAlcanzado } from './limitadorTasa.ts';
import { PerfilInactivo, CuentaBloqueada } from './gestorSesion.ts';
import {
  NoAutenticado,
  SinPermiso,
  Conflicto,
  ErrorDeValidacion,
  ErrorDeRed,
  ErrorDelServidor,
  FicheroDemasiadoGrande,
  TipoDeFicheroNoPermitido,
} from '../datos/erroresDominio.ts';
import { CredencialesInvalidas } from '../datos/autenticacion.ts';

void test('un límite de tasa produce un mensaje que dice cuánto esperar, no el error técnico', () => {
  const mensaje = mensajeAmigable(new ErrorLimiteAlcanzado(5000));

  assert.match(mensaje, /espera/i);
  assert.match(mensaje, /5 segundos/);
  assert.doesNotMatch(mensaje, /ErrorLimiteAlcanzado/);
});

void test('un límite de tasa con menos de un segundo restante se redondea a "1 segundo" (singular)', () => {
  const mensaje = mensajeAmigable(new ErrorLimiteAlcanzado(200));

  assert.match(mensaje, /1 segundo\b/);
  assert.doesNotMatch(mensaje, /1 segundos/);
});

void test('un AbortError produce un mensaje sobre la conexión, no el nombre técnico del error', () => {
  const mensaje = mensajeAmigable(new DOMException('Abortado', 'AbortError'));

  assert.match(mensaje, /conexión|tardado/i);
  assert.doesNotMatch(mensaje, /AbortError/);
});

void test('cualquier otro error cae en el mensaje genérico, sin exponer el error original', () => {
  const mensaje = mensajeAmigable(new Error('detalle interno sensible que no debe verse'));

  assert.doesNotMatch(mensaje, /detalle interno sensible/);
  assert.equal(mensaje.length > 0, true);
});

void test('un valor que no es un Error también cae en el mensaje genérico sin lanzar', () => {
  assert.doesNotThrow(() => {
    mensajeAmigable(undefined);
  });
  assert.doesNotThrow(() => {
    mensajeAmigable('cadena cualquiera');
  });
});

void test('NoAutenticado produce un mensaje sobre volver a iniciar sesión', () => {
  assert.match(mensajeAmigable(new NoAutenticado()), /inicia(r)? sesión/i);
});

void test('SinPermiso produce un mensaje sobre no tener permiso', () => {
  assert.match(mensajeAmigable(new SinPermiso()), /permiso/i);
});

void test('Conflicto NUNCA expone el message crudo de Postgres (puede ser texto técnico en inglés)', () => {
  const mensaje = mensajeAmigable(new Conflicto('duplicate key value violates unique constraint "alumno_pkey"'));
  assert.doesNotMatch(mensaje, /duplicate key|constraint/i);
  assert.match(mensaje, /conflicto|ya existentes/i);
});

void test('ErrorDeValidacion NUNCA expone el message crudo de Postgres', () => {
  const mensaje = mensajeAmigable(new ErrorDeValidacion('null value in column "telefono_referencia" violates not-null constraint'));
  assert.doesNotMatch(mensaje, /column|constraint/i);
  assert.match(mensaje, /revisa|válido/i);
});

void test('FicheroDemasiadoGrande y TipoDeFicheroNoPermitido producen mensajes distintos y accionables', () => {
  assert.match(mensajeAmigable(new FicheroDemasiadoGrande()), /grande/i);
  assert.match(mensajeAmigable(new TipoDeFicheroNoPermitido()), /tipo de fichero/i);
});

void test('ErrorDeRed produce un mensaje sobre la conexión', () => {
  assert.match(mensajeAmigable(new ErrorDeRed()), /conectar|conexión/i);
});

void test('ErrorDelServidor cae en el mensaje genérico de reintentar', () => {
  assert.equal(mensajeAmigable(new ErrorDelServidor('detalle interno de Postgres')), mensajeAmigable(undefined));
});

void test('CredencialesInvalidas produce un mensaje que no revela si el email existe (T-09)', () => {
  const mensaje = mensajeAmigable(new CredencialesInvalidas());
  assert.match(mensaje, /email.*contraseña|contraseña.*email/i);
  assert.doesNotMatch(mensaje, /existe|no encontrad/i);
});

void test('PerfilInactivo produce un mensaje que orienta a hablar con el administrador (T-09)', () => {
  assert.match(mensajeAmigable(new PerfilInactivo()), /desactivad|administrador/i);
});

void test('CuentaBloqueada produce un mensaje que orienta a hablar con el administrador (P-01)', () => {
  assert.match(mensajeAmigable(new CuentaBloqueada()), /bloquead|administrador/i);
});
