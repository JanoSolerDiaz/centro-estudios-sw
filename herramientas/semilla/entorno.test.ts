import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverCredencialesSemilla, ErrorCredencialesSemillaFaltantes } from './entorno.ts';

void test('falla con mensaje claro si falta la URL de dev', () => {
  assert.throws(() => resolverCredencialesSemilla({}), ErrorCredencialesSemillaFaltantes);
});

void test('falla con mensaje claro si falta la service_role key de dev', () => {
  assert.throws(
    () => resolverCredencialesSemilla({ SUPABASE_URL_DEV: 'https://x.supabase.co' }),
    ErrorCredencialesSemillaFaltantes,
  );
});

void test('acepta dev con URL y clave presentes', () => {
  const credenciales = resolverCredencialesSemilla({
    SUPABASE_URL_DEV: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY_DEV: 'clave',
  });
  assert.deepEqual(credenciales, { entorno: 'dev', url: 'https://x.supabase.co', serviceRoleKey: 'clave' });
});

void test('rechaza prod sin PERMITIR_PROD=1', () => {
  assert.throws(
    () =>
      resolverCredencialesSemilla(
        { SUPABASE_URL_PROD: 'https://y.supabase.co', SUPABASE_SERVICE_ROLE_KEY_PROD: 'clave' },
        'prod',
      ),
    /PERMITIR_PROD/,
  );
});

void test('acepta prod solo con PERMITIR_PROD=1 y credenciales completas', () => {
  const credenciales = resolverCredencialesSemilla(
    {
      SUPABASE_URL_PROD: 'https://y.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY_PROD: 'clave',
      PERMITIR_PROD: '1',
    },
    'prod',
  );
  assert.equal(credenciales.entorno, 'prod');
});
