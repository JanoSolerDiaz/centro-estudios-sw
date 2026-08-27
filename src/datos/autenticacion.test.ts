import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClienteAutenticacion, CredencialesInvalidas } from './autenticacion.ts';
import { NoAutenticado, ErrorDeRed, ErrorDelServidor } from './erroresDominio.ts';
import { crearFetchSimulado, crearFetchSimuladoConErrorDeRed, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';

const OPCIONES_BASE = { urlBase: 'https://proyecto.supabase.co', claveAnonima: 'clave-anonima' };
const RELOJ_FIJO = crearRelojFijo(new Date('2026-08-27T10:00:00.000Z'));

const SESION_CUERPO = {
  access_token: 'token-de-acceso',
  refresh_token: 'token-de-refresco',
  expires_in: 3600,
  user: { id: 'usuario-1' },
};

void test('iniciarSesion con credenciales correctas devuelve la sesión con la caducidad calculada por el reloj inyectado', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    reloj: RELOJ_FIJO,
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return { estado: 200, cuerpo: SESION_CUERPO };
    }),
  });

  const sesion = await cliente.iniciarSesion('profe@ejemplo.es', 'contrasena-correcta');

  assert.equal(sesion.accessToken, 'token-de-acceso');
  assert.equal(sesion.refreshToken, 'token-de-refresco');
  assert.equal(sesion.usuarioId, 'usuario-1');
  assert.equal(sesion.expiraEnMs, RELOJ_FIJO.ahora().getTime() + 3600 * 1000);

  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'POST');
  assert.match(peticion.url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.deepEqual(peticion.cuerpo, { email: 'profe@ejemplo.es', password: 'contrasena-correcta' });
});

void test('iniciarSesion con contraseña errónea lanza CredencialesInvalidas, no el error genérico de validación', async () => {
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimulado(() => ({
      estado: 400,
      cuerpo: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    })),
  });

  await assert.rejects(
    () => cliente.iniciarSesion('profe@ejemplo.es', 'contrasena-equivocada'),
    CredencialesInvalidas,
  );
});

void test('cerrarSesion envía el access_token como Bearer', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return { estado: 204 };
    }),
  });

  await cliente.cerrarSesion('token-de-acceso');

  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.cabeceras.authorization, 'Bearer token-de-acceso');
  assert.match(peticion.url, /\/auth\/v1\/logout$/);
});

void test('renovarSesion con un refresh_token válido devuelve una sesión nueva', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    reloj: RELOJ_FIJO,
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return { estado: 200, cuerpo: { ...SESION_CUERPO, access_token: 'token-renovado' } };
    }),
  });

  const sesion = await cliente.renovarSesion('token-de-refresco');

  assert.equal(sesion.accessToken, 'token-renovado');
  assert.match(peticiones[0]?.url ?? '', /\/auth\/v1\/token\?grant_type=refresh_token$/);
  assert.deepEqual(peticiones[0]?.cuerpo, { refresh_token: 'token-de-refresco' });
});

void test('renovarSesion con un refresh_token inválido lanza NoAutenticado', async () => {
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimulado(() => ({ estado: 400, cuerpo: { error: 'invalid_grant' } })),
  });

  await assert.rejects(() => cliente.renovarSesion('token-caducado'), NoAutenticado);
});

void test('solicitarRecuperacionContrasena responde igual (sin lanzar) exista o no la cuenta', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    // GoTrue no distingue por diseño: el doble responde 200 en los dos casos, y el cliente no debe
    // añadir ninguna lógica que sí distinga (requisito 9 de T-09).
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return { estado: 200, cuerpo: {} };
    }),
  });

  await cliente.solicitarRecuperacionContrasena('existe@ejemplo.es');
  await cliente.solicitarRecuperacionContrasena('no-existe@ejemplo.es');

  assert.equal(peticiones.length, 2);
  assert.deepEqual(peticiones[0]?.cuerpo, { email: 'existe@ejemplo.es' });
  assert.deepEqual(peticiones[1]?.cuerpo, { email: 'no-existe@ejemplo.es' });
});

void test('establecerContrasenaNueva envía el token de recuperación como Bearer y la contraseña nueva', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return { estado: 200, cuerpo: { id: 'usuario-1' } };
    }),
  });

  await cliente.establecerContrasenaNueva('token-de-recuperacion', 'ContrasenaNueva123');

  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PUT');
  assert.equal(peticion.cabeceras.authorization, 'Bearer token-de-recuperacion');
  assert.deepEqual(peticion.cuerpo, { password: 'ContrasenaNueva123' });
});

void test('establecerContrasenaNueva con un token de recuperación caducado lanza el error de dominio traducido (401 -> NoAutenticado)', async () => {
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimulado(() => ({ estado: 401 })),
  });

  await assert.rejects(() => cliente.establecerContrasenaNueva('token-caducado', 'ContrasenaNueva123'), NoAutenticado);
});

void test('un fallo de red se traduce a ErrorDeRed', async () => {
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimuladoConErrorDeRed(),
  });

  await assert.rejects(() => cliente.iniciarSesion('profe@ejemplo.es', 'contrasena'), ErrorDeRed);
});

void test('una sesión con forma inesperada en un 200 se traduce a ErrorDelServidor, no se propaga tal cual', async () => {
  const cliente = crearClienteAutenticacion({
    ...OPCIONES_BASE,
    fetchImpl: crearFetchSimulado(() => ({ estado: 200, cuerpo: { esto: 'no es una sesión' } })),
  });

  await assert.rejects(() => cliente.iniciarSesion('profe@ejemplo.es', 'contrasena'), ErrorDelServidor);
});
