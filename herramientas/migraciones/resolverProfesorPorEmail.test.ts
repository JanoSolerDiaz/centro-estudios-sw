/**
 * Comprobaciones estáticas de `db/016_resolver_profesor_por_email.sql` (R-08), sin credenciales ni
 * red — mismo patrón que `avisoCancelacionSlot.test.ts`/`excepcionSlot.test.ts`: no sustituye al
 * barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el
 * momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (privilegios por defecto de Supabase, aquí sobre una función nueva).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_016 = fileURLToPath(new URL('../../db/016_resolver_profesor_por_email.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_016, 'utf8');

void test('016_resolver_profesor_por_email.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('no crea ni recrea ninguna tabla: solo una función', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\./i);
  assert.doesNotMatch(CONTENIDO, /alter\s+table\s+public\./i);
});

void test('resolver_profesor_por_email es SECURITY DEFINER, solo authenticated (comprobación de rol dentro)', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.resolver_profesor_por_email[\s\S]*?security\s+definer/i);
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.resolver_profesor_por_email\(text\)\s+to\s+authenticated/i,
  );
  assert.match(CONTENIDO, /revoke\s+all\s+on\s+function\s+public\.resolver_profesor_por_email\(text\)\s+from\s+public/i);
});

void test('resolver_profesor_por_email rechaza a quien no es administrator', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.resolver_profesor_por_email[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo, 'no se encuentra el cuerpo de resolver_profesor_por_email');
  assert.match(cuerpo, /not\s+public\.es_administrator\(\)/i);
  assert.match(cuerpo, /errcode\s*=\s*'42501'/i);
});

void test('solo devuelve un teacher activo, comparando el email sin distinguir mayúsculas', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.resolver_profesor_por_email[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo);
  assert.match(cuerpo, /p\.rol\s*=\s*'teacher'/i);
  assert.match(cuerpo, /p\.activo/i);
  assert.match(cuerpo, /lower\(u\.email\)\s*=\s*lower\(/i);
  assert.match(cuerpo, /limit\s+1/i);
});

void test('lee auth.users solo para el email, nunca escribe en perfil ni en auth.users', () => {
  assert.doesNotMatch(CONTENIDO, /update\s+public\.perfil/i);
  assert.doesNotMatch(CONTENIDO, /insert\s+into\s+public\.perfil/i);
  assert.doesNotMatch(CONTENIDO, /update\s+auth\.users/i);
  assert.doesNotMatch(CONTENIDO, /insert\s+into\s+auth\.users/i);
});
