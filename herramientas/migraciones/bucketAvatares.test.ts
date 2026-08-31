/**
 * Comprobaciones estáticas de `db/004_bucket_avatares.sql` (T-14), sin credenciales ni red — mismo
 * patrón que `esquemaInicial.test.ts`/`bloqueoCuenta.test.ts`/`politicasRls.test.ts`: no sustituye
 * al barrido en vivo que ejecuta el dueño, pero atrapa en el momento de escribir el script la misma
 * clase de descuido (en particular, un bucket público con fotos de menores, §0.2: "el peor fallo
 * posible de este proyecto").
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_004 = fileURLToPath(new URL('../../db/004_bucket_avatares.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_004, 'utf8');

void test('004_bucket_avatares.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('crea el bucket "avatares" y ninguno más', () => {
  const insercionesBucket = CONTENIDO.match(/insert\s+into\s+storage\.buckets/gi) ?? [];
  assert.equal(insercionesBucket.length, 1, 'debe insertar exactamente un bucket');
  assert.match(CONTENIDO, /values\s*\(\s*'avatares'\s*,\s*'avatares'\s*,/i);
});

void test('el bucket se crea privado: public = false', () => {
  const coincidencia = /insert\s+into\s+storage\.buckets[\s\S]*?values\s*\(([\s\S]*?)\)\s*;/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra el INSERT del bucket');
  const valores = coincidencia[1];
  assert.ok(valores, 'el INSERT no captura la lista de valores');
  assert.match(valores, /\bfalse\b/i);
  assert.doesNotMatch(valores, /\btrue\b/i);
});

void test('declara file_size_limit y allowed_mime_types en la propia configuración del bucket', () => {
  assert.match(CONTENIDO, /file_size_limit/i);
  assert.match(CONTENIDO, /allowed_mime_types/i);
});

void test('la lista blanca de tipos MIME es exactamente image/webp: el cliente solo sube derivadas ya recodificadas', () => {
  const coincidencia = /allowed_mime_types[\s\S]*?array\s*\[\s*'([^']+)'\s*\]/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra allowed_mime_types como array');
  const tipoMime = coincidencia[1];
  assert.ok(tipoMime, 'no se captura ningún tipo MIME dentro del array');
  assert.equal(tipoMime, 'image/webp');
});

void test('no recrea las políticas de storage.objects: exige que 003_politicas_rls.sql ya las haya creado', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+policy\s+avatares_/i);
  assert.match(CONTENIDO, /avatares_admin_leer/);
});

void test('ningún GRANT del script concede TRUNCATE, REFERENCES ni TRIGGER a anon o authenticated', () => {
  const sospechosos = CONTENIDO.split(';').filter((sentencia) => {
    const trimmed = sentencia.trim();
    if (!/^grant\b/i.test(trimmed)) {
      return false;
    }
    const mencionaRolProhibido = /\b(anon|authenticated)\b/i.test(trimmed);
    const mencionaPrivilegioProhibido = /\b(truncate|references|trigger)\b/i.test(trimmed);
    return mencionaRolProhibido && mencionaPrivilegioProhibido;
  });
  assert.deepEqual(sospechosos, []);
});
