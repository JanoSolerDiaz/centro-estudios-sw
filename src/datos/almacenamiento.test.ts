import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClienteAlmacenamiento } from './almacenamiento.ts';
import { SinPermiso, ErrorDelServidor, Conflicto } from './erroresDominio.ts';

function crearCliente(fetchImpl: ReturnType<typeof crearFetchSimulado>) {
  return crearClienteAlmacenamiento({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl,
  });
}

void test('subir() manda POST al objeto con el content-type del fichero y las cabeceras de autenticación', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { Key: 'avatares/a1/512.webp' } };
  });

  await crearCliente(fetchImpl).subir(
    'avatares',
    'a1/512.webp',
    { datos: new Uint8Array([1, 2, 3]), tipoContenido: 'image/webp' },
  );

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/storage/v1/object/avatares/a1/512.webp');
  assert.equal(peticion.metodo, 'POST');
  assert.equal(peticion.cabeceras['content-type'], 'image/webp');
  assert.equal(peticion.cabeceras.apikey, 'clave-anonima');
  assert.equal(peticion.cabeceras.authorization, 'Bearer clave-anonima');
  assert.equal(peticion.cabeceras['x-upsert'], undefined);
});

void test('subir() con sobrescribir:true añade la cabecera x-upsert', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: {} };
  });

  await crearCliente(fetchImpl).subir(
    'avatares',
    'a1/512.webp',
    { datos: new Uint8Array([1]), tipoContenido: 'image/webp' },
    { sobrescribir: true },
  );

  assert.equal(peticion?.cabeceras['x-upsert'], 'true');
});

void test('subir() sin sobrescribir sobre una ruta ya existente se traduce a Conflicto (409)', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 409, cuerpo: { message: 'The resource already exists' } }));
  await assert.rejects(
    () => crearCliente(fetchImpl).subir('avatares', 'a1/512.webp', { datos: new Uint8Array(), tipoContenido: 'image/webp' }),
    Conflicto,
  );
});

void test('eliminar() manda un único DELETE con todas las rutas en prefixes, sin importar cuántas sean', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await crearCliente(fetchImpl).eliminar('avatares', ['a1/512.webp', 'a1/96.webp']);

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/storage/v1/object/avatares');
  assert.equal(peticion.metodo, 'DELETE');
  assert.deepEqual(peticion.cuerpo, { prefixes: ['a1/512.webp', 'a1/96.webp'] });
});

void test('un 403 al subir se traduce a SinPermiso', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 403, cuerpo: { message: 'new row violates policy' } }));
  await assert.rejects(
    () => crearCliente(fetchImpl).subir('avatares', 'a1/512.webp', { datos: new Uint8Array(), tipoContenido: 'image/webp' }),
    SinPermiso,
  );
});

void test('urlFirmada() manda POST a /object/sign/<bucket>/<ruta> y devuelve la URL absoluta', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { signedURL: '/object/sign/avatares/a1/512.webp?token=abc' } };
  });

  const url = await crearCliente(fetchImpl).urlFirmada('avatares', 'a1/512.webp', 60);

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/storage/v1/object/sign/avatares/a1/512.webp');
  assert.deepEqual(peticion.cuerpo, { expiresIn: 60 });
  assert.equal(url, 'https://proyecto.supabase.co/storage/v1/object/sign/avatares/a1/512.webp?token=abc');
});

void test('urlFirmada() ante una respuesta sin signedURL se traduce a ErrorDelServidor', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 200, cuerpo: { otraCosa: 1 } }));
  await assert.rejects(() => crearCliente(fetchImpl).urlFirmada('avatares', 'a1/512.webp', 60), ErrorDelServidor);
});

void test('urlFirmadasEnLote() pide TODAS las rutas en UNA sola petición HTTP y devuelve una URL por ruta', async () => {
  let numeroDePeticiones = 0;
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    numeroDePeticiones += 1;
    peticion = p;
    return {
      estado: 200,
      cuerpo: [
        { path: 'a1/96.webp', signedURL: '/object/sign/avatares/a1/96.webp?token=1', error: null },
        { path: 'a2/96.webp', signedURL: '/object/sign/avatares/a2/96.webp?token=2', error: null },
        { path: 'a3/96.webp', signedURL: '/object/sign/avatares/a3/96.webp?token=3', error: null },
      ],
    };
  });

  const resultado = await crearCliente(fetchImpl).urlFirmadasEnLote(
    'avatares',
    ['a1/96.webp', 'a2/96.webp', 'a3/96.webp'],
    60,
  );

  assert.equal(numeroDePeticiones, 1);
  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/storage/v1/object/sign/avatares');
  assert.deepEqual(peticion.cuerpo, { expiresIn: 60, paths: ['a1/96.webp', 'a2/96.webp', 'a3/96.webp'] });
  assert.equal(resultado.length, 3);
  const primerResultado = resultado[0];
  assert.ok(primerResultado);
  assert.equal(primerResultado.ruta, 'a1/96.webp');
  assert.equal(primerResultado.url, 'https://proyecto.supabase.co/storage/v1/object/sign/avatares/a1/96.webp?token=1');
});

void test('urlFirmadasEnLote() ante una respuesta que no es un array se traduce a ErrorDelServidor', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 200, cuerpo: { no: 'es un array' } }));
  await assert.rejects(() => crearCliente(fetchImpl).urlFirmadasEnLote('avatares', ['a1/96.webp'], 60), ErrorDelServidor);
});
