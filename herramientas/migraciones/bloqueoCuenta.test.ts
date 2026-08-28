/**
 * Comprobaciones estáticas de `db/002_bloqueo_cuenta.sql` (P-01), sin credenciales ni red — mismo
 * patrón que `esquemaInicial.test.ts` (T-07): no sustituye al barrido en vivo que ejecuta el dueño,
 * pero atrapa en el momento de escribir el script la misma clase de descuido.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_002 = fileURLToPath(new URL('../../db/002_bloqueo_cuenta.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_002, 'utf8');

void test('002_bloqueo_cuenta.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('no recrea la tabla perfil ni las funciones es_administrator/es_teacher del bootstrap', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.perfil\b/i);
  assert.doesNotMatch(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.es_administrator\b/i);
  assert.doesNotMatch(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.es_teacher\b/i);
});

void test('redefine rol_actual() añadiendo "not bloqueado", conservando security definer', () => {
  const coincidencia = /create\s+or\s+replace\s+function\s+public\.rol_actual\s*\([^)]*\)[\s\S]*?\$\$;/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra la redefinición de rol_actual()');
  const cuerpo = coincidencia[0];
  assert.match(cuerpo, /security\s+definer/i);
  assert.match(cuerpo, /not\s+bloqueado/i);
  assert.match(cuerpo, /and\s+activo/i);
});

void test('registrar_intento_fallido es security definer y ejecutable por anon y authenticated', () => {
  assert.match(
    CONTENIDO,
    /create\s+or\s+replace\s+function\s+public\.registrar_intento_fallido\s*\(\s*p_email\s+text\s*\)/i,
  );
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.registrar_intento_fallido\(text\)\s+to\s+anon,\s*authenticated/i,
  );
});

void test('admin_desbloquear_usuario es security definer, comprueba es_administrator() y solo se concede a authenticated', () => {
  const coincidencia = /create\s+or\s+replace\s+function\s+public\.admin_desbloquear_usuario[\s\S]*?\$\$;/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra admin_desbloquear_usuario');
  assert.match(coincidencia[0], /es_administrator\s*\(\s*\)/);
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.admin_desbloquear_usuario\(uuid\)\s+to\s+authenticated\s*;/i,
  );
  // Nunca a anon: solo un administrador ya autenticado puede desbloquear a otro usuario.
  assert.doesNotMatch(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.admin_desbloquear_usuario\(uuid\)\s+to\s+[^;]*\banon\b/i,
  );
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
