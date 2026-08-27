import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, crearFetchSimuladoConErrorDeRed, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearEnviadorEventoError } from './eventoError.ts';
import type { CargaEventoError } from '../nucleo/informadorErrores.ts';

const CARGA_DE_PRUEBAS: CargaEventoError = {
  origen: 'capa_datos',
  mensaje: 'fallo al guardar',
  pila: 'Error: fallo al guardar\n    at algo',
  alumno_id: 'a1',
};

void test('crearEnviadorEventoError llama a la RPC registrar_evento_error con la carga y las cabeceras esperadas', async () => {
  let peticionRecibida: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((peticion) => {
    peticionRecibida = peticion;
    return { estado: 200, cuerpo: undefined };
  });

  const enviar = crearEnviadorEventoError({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl,
  });

  await enviar(CARGA_DE_PRUEBAS);

  assert.ok(peticionRecibida);
  assert.equal(peticionRecibida.url, 'https://proyecto.supabase.co/rest/v1/rpc/registrar_evento_error');
  assert.equal(peticionRecibida.metodo, 'POST');
  assert.equal(peticionRecibida.cabeceras.apikey, 'clave-anonima');
  assert.equal(peticionRecibida.cabeceras.authorization, 'Bearer clave-anonima');
  assert.deepEqual(peticionRecibida.cuerpo, {
    p_origen: 'capa_datos',
    p_mensaje: 'fallo al guardar',
    p_pila: 'Error: fallo al guardar\n    at algo',
    p_contexto: { alumno_id: 'a1' },
  });
});

void test('crearEnviadorEventoError usa el token de sesión cuando hay uno, en vez de la clave anónima', async () => {
  let peticionRecibida: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((peticion) => {
    peticionRecibida = peticion;
    return { estado: 200, cuerpo: undefined };
  });

  const enviar = crearEnviadorEventoError({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    obtenerTokenSesion: () => 'token-de-sesion',
    fetchImpl,
  });

  await enviar(CARGA_DE_PRUEBAS);

  assert.ok(peticionRecibida);
  assert.equal(peticionRecibida.cabeceras.authorization, 'Bearer token-de-sesion');
});

void test('crearEnviadorEventoError rechaza si la RPC responde con un error', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 500, cuerpo: { message: 'error interno' } }));
  const enviar = crearEnviadorEventoError({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl,
  });

  await assert.rejects(() => enviar(CARGA_DE_PRUEBAS));
});

void test('crearEnviadorEventoError rechaza ante un fallo de red', async () => {
  const enviar = crearEnviadorEventoError({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimuladoConErrorDeRed(),
  });

  await assert.rejects(() => enviar(CARGA_DE_PRUEBAS));
});
