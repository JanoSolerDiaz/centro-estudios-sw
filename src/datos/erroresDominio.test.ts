import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  errorDeRespuesta,
  esFalloDeRed,
  leerCuerpoJson,
  NoAutenticado,
  SinPermiso,
  Conflicto,
  ErrorDeValidacion,
  ErrorDelServidor,
  FicheroDemasiadoGrande,
  TipoDeFicheroNoPermitido,
  REINTENTAR_MS_POR_DEFECTO_LIMITE_SERVIDOR,
} from './erroresDominio.ts';
import { ErrorLimiteAlcanzado } from '../nucleo/limitadorTasa.ts';

function respuesta(estado: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado });
}

void test('errorDeRespuesta traduce 401 a NoAutenticado', async () => {
  assert.ok((await errorDeRespuesta(respuesta(401))) instanceof NoAutenticado);
});

void test('errorDeRespuesta traduce 403 a SinPermiso', async () => {
  assert.ok((await errorDeRespuesta(respuesta(403))) instanceof SinPermiso);
});

void test('errorDeRespuesta traduce 409 a Conflicto, usando el message de Postgres si lo hay', async () => {
  const error = await errorDeRespuesta(respuesta(409, { message: 'duplicate key value' }));
  assert.ok(error instanceof Conflicto);
  assert.equal(error.message, 'duplicate key value');
});

void test('errorDeRespuesta traduce 400 y 422 a ErrorDeValidacion', async () => {
  assert.ok((await errorDeRespuesta(respuesta(400))) instanceof ErrorDeValidacion);
  assert.ok((await errorDeRespuesta(respuesta(422))) instanceof ErrorDeValidacion);
});

void test('errorDeRespuesta traduce 413 a FicheroDemasiadoGrande y 415 a TipoDeFicheroNoPermitido', async () => {
  assert.ok((await errorDeRespuesta(respuesta(413))) instanceof FicheroDemasiadoGrande);
  assert.ok((await errorDeRespuesta(respuesta(415))) instanceof TipoDeFicheroNoPermitido);
});

void test('errorDeRespuesta traduce 429 a ErrorLimiteAlcanzado (T-18, límite de tasa del servidor)', async () => {
  const error = await errorDeRespuesta(respuesta(429));
  assert.ok(error instanceof ErrorLimiteAlcanzado);
  assert.equal(error.reintentarEnMs, REINTENTAR_MS_POR_DEFECTO_LIMITE_SERVIDOR);
});

void test('errorDeRespuesta traduce cualquier 5xx a ErrorDelServidor', async () => {
  assert.ok((await errorDeRespuesta(respuesta(500))) instanceof ErrorDelServidor);
  assert.ok((await errorDeRespuesta(respuesta(503))) instanceof ErrorDelServidor);
});

void test('errorDeRespuesta traduce un estado no contemplado a ErrorDelServidor genérico', async () => {
  const error = await errorDeRespuesta(respuesta(418));
  assert.ok(error instanceof ErrorDelServidor);
});

void test('errorDeRespuesta ignora un cuerpo sin message ni válido, sin lanzar', async () => {
  const error = await errorDeRespuesta(respuesta(400, { code: 'algo' }));
  assert.ok(error instanceof ErrorDeValidacion);
});

void test('esFalloDeRed reconoce un TypeError (fallo real de fetch) pero no un DOMException AbortError', () => {
  assert.equal(esFalloDeRed(new TypeError('failed to fetch')), true);
  assert.equal(esFalloDeRed(new DOMException('cancelado', 'AbortError')), false);
  assert.equal(esFalloDeRed(new Error('otro error')), false);
});

void test('leerCuerpoJson devuelve malformado=false y valor=undefined para un cuerpo vacío', async () => {
  const resultado = await leerCuerpoJson(new Response(null, { status: 204 }));
  assert.deepEqual(resultado, { valor: undefined, malformado: false });
});

void test('leerCuerpoJson interpreta un JSON válido', async () => {
  const resultado = await leerCuerpoJson(new Response(JSON.stringify({ a: 1 }), { status: 200 }));
  assert.deepEqual(resultado, { valor: { a: 1 }, malformado: false });
});

void test('leerCuerpoJson marca malformado=true ante un cuerpo no-JSON', async () => {
  const resultado = await leerCuerpoJson(new Response('esto no es json', { status: 200 }));
  assert.equal(resultado.malformado, true);
});
