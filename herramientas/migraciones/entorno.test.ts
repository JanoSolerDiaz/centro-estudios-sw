import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarArgv, resolverCredenciales, ErrorCredencialesFaltantes } from './entorno.ts';

void test('analizarArgv por defecto apunta a dev y no pide solo estado', () => {
  assert.deepEqual(analizarArgv([]), { entorno: 'dev', soloEstado: false, verificarPrivilegios: false });
});

void test('analizarArgv reconoce --entorno=prod', () => {
  assert.deepEqual(analizarArgv(['--entorno=prod']), {
    entorno: 'prod',
    soloEstado: false,
    verificarPrivilegios: false,
  });
});

void test('analizarArgv reconoce --estado y --verificar-privilegios', () => {
  assert.deepEqual(analizarArgv(['--estado']), { entorno: 'dev', soloEstado: true, verificarPrivilegios: false });
  assert.deepEqual(analizarArgv(['--verificar-privilegios']), {
    entorno: 'dev',
    soloEstado: false,
    verificarPrivilegios: true,
  });
});

void test('analizarArgv rechaza un --entorno con valor desconocido', () => {
  assert.throws(() => analizarArgv(['--entorno=staging']), /dev.*prod/);
});

void test('analizarArgv rechaza una opción no reconocida', () => {
  assert.throws(() => analizarArgv(['--algo-raro']), /no reconocida/);
});

void test('resolverCredenciales falla con mensaje claro si falta el access token', () => {
  assert.throws(() => resolverCredenciales({}, 'dev'), ErrorCredencialesFaltantes);
  assert.throws(() => resolverCredenciales({}, 'dev'), /SUPABASE_ACCESS_TOKEN/);
});

void test('resolverCredenciales falla si falta el project ref de dev', () => {
  assert.throws(
    () => resolverCredenciales({ SUPABASE_ACCESS_TOKEN: 't' }, 'dev'),
    ErrorCredencialesFaltantes,
  );
});

void test('resolverCredenciales acepta dev con SUPABASE_PROJECT_REF_DEV', () => {
  const credenciales = resolverCredenciales(
    { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF_DEV: 'ref-dev' },
    'dev',
  );
  assert.deepEqual(credenciales, { entorno: 'dev', projectRef: 'ref-dev', accessToken: 't' });
});

void test('resolverCredenciales acepta el SUPABASE_PROJECT_REF genérico como respaldo', () => {
  const credenciales = resolverCredenciales(
    { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: 'ref-generico' },
    'dev',
  );
  assert.equal(credenciales.projectRef, 'ref-generico');
});

void test('resolverCredenciales rechaza prod sin PERMITIR_PROD=1 aunque el resto esté completo', () => {
  assert.throws(
    () =>
      resolverCredenciales(
        { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF_PROD: 'ref-prod' },
        'prod',
      ),
    /PERMITIR_PROD/,
  );
});

void test('resolverCredenciales rechaza prod con PERMITIR_PROD=1 pero sin ref', () => {
  assert.throws(
    () => resolverCredenciales({ SUPABASE_ACCESS_TOKEN: 't', PERMITIR_PROD: '1' }, 'prod'),
    ErrorCredencialesFaltantes,
  );
});

void test('resolverCredenciales acepta prod solo con --entorno=prod Y PERMITIR_PROD=1 Y ref', () => {
  const credenciales = resolverCredenciales(
    { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF_PROD: 'ref-prod', PERMITIR_PROD: '1' },
    'prod',
  );
  assert.deepEqual(credenciales, { entorno: 'prod', projectRef: 'ref-prod', accessToken: 't' });
});

void test('resolverCredenciales rechaza PERMITIR_PROD con otro valor que no sea exactamente "1"', () => {
  assert.throws(
    () =>
      resolverCredenciales(
        { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF_PROD: 'ref-prod', PERMITIR_PROD: 'true' },
        'prod',
      ),
    /PERMITIR_PROD/,
  );
});
