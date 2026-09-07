/**
 * Comprobaciones estáticas de `db/014_calendario_cierres.sql` (R-12), sin credenciales ni red —
 * mismo patrón que `esquemaInicial.test.ts`/`administracionUsuarios.test.ts`: no sustituye al
 * barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el
 * momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (privilegios por defecto de Supabase sobre una tabla nueva).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_014 = fileURLToPath(new URL('../../db/014_calendario_cierres.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_014, 'utf8');

void test('014_calendario_cierres.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('crea cierre_centro con fecha_inicio, fecha_fin, motivo y activo', () => {
  assert.match(CONTENIDO, /create\s+table\s+public\.cierre_centro\s*\(/i);
  assert.match(CONTENIDO, /fecha_inicio\s+date\s+not\s+null/i);
  assert.match(CONTENIDO, /fecha_fin\s+date\s+not\s+null/i);
  assert.match(CONTENIDO, /motivo\s+text\s+not\s+null/i);
  assert.match(CONTENIDO, /activo\s+boolean\s+not\s+null\s+default\s+true/i);
});

void test('exige motivo no vacío y fecha_fin >= fecha_inicio', () => {
  assert.match(CONTENIDO, /constraint\s+cierre_centro_motivo_no_vacio\s+check\s*\(\s*btrim\(motivo\)\s*<>\s*''\s*\)/i);
  assert.match(CONTENIDO, /constraint\s+cierre_centro_rango_valido\s+check\s*\(\s*fecha_fin\s*>=\s*fecha_inicio\s*\)/i);
});

void test('ninguna columna de alumno ni de persona de referencia: solo fechas y motivo', () => {
  assert.doesNotMatch(CONTENIDO, /alumno_id/i);
  assert.doesNotMatch(CONTENIDO, /persona_referencia/i);
});

void test('reutiliza tocar_actualizado_en(), no redefine el trigger genérico', () => {
  assert.match(
    CONTENIDO,
    /create\s+trigger\s+cierre_centro_tocar_actualizado_en\s*\n\s*before\s+update\s+on\s+public\.cierre_centro\s*\n\s*for\s+each\s+row\s+execute\s+function\s+public\.tocar_actualizado_en\(\)/i,
  );
  assert.doesNotMatch(CONTENIDO, /create\s+(?:or\s+replace\s+)?function\s+public\.tocar_actualizado_en/i);
});

void test('habilita RLS y revoca todo antes de conceder nada, sobre los tres roles', () => {
  assert.match(CONTENIDO, /alter\s+table\s+public\.cierre_centro\s+enable\s+row\s+level\s+security/i);
  assert.match(
    CONTENIDO,
    /revoke\s+all\s+on\s+public\.cierre_centro\s+from\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );
});

void test('el revoke precede a cualquier grant sobre la tabla', () => {
  const indiceRevoke = CONTENIDO.search(/revoke\s+all\s+on\s+public\.cierre_centro/i);
  const indicePrimerGrant = CONTENIDO.search(/grant\s+select.*on\s+public\.cierre_centro/i);
  assert.ok(indiceRevoke >= 0 && indicePrimerGrant >= 0);
  assert.ok(indiceRevoke < indicePrimerGrant, 'el revoke debe escribirse antes que el primer grant');
});

void test('nunca concede TRUNCATE, REFERENCES ni TRIGGER a anon o authenticated', () => {
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

void test('authenticated nunca recibe DELETE: sin borrado real, mismo patrón que centro_estudios', () => {
  const otorgaDeleteAAuthenticated = CONTENIDO.split(';').some((sentencia) => {
    const trimmed = sentencia.trim();
    return /^grant\b/i.test(trimmed) && /\bdelete\b/i.test(trimmed) && /\bauthenticated\b/i.test(trimmed);
  });
  assert.equal(otorgaDeleteAAuthenticated, false);
});

void test('ninguna política menciona a student: la única suya en todo el sistema sigue siendo perfil_leer_propio', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+policy[^;]*student/i);
});

void test('el teacher solo lee cierres activos; el administrator lee, inserta y actualiza sin esa condición', () => {
  assert.match(
    CONTENIDO,
    /create\s+policy\s+cierre_centro_teacher_leer_activos\s+on\s+public\.cierre_centro\s*\n\s*for\s+select\s+to\s+authenticated\s*\n\s*using\s*\(\s*public\.es_teacher\(\)\s+and\s+activo\s*\)/i,
  );
  assert.match(CONTENIDO, /create\s+policy\s+cierre_centro_admin_leer_todos[\s\S]*?public\.es_administrator\(\)/i);
  assert.match(CONTENIDO, /create\s+policy\s+cierre_centro_admin_insertar[\s\S]*?with\s+check\s*\(\s*public\.es_administrator\(\)\s*\)/i);
  assert.match(
    CONTENIDO,
    /create\s+policy\s+cierre_centro_admin_actualizar[\s\S]*?using\s*\(\s*public\.es_administrator\(\)\s*\)\s*\n\s*with\s+check\s*\(\s*public\.es_administrator\(\)\s*\)/i,
  );
});

void test('sin política de DELETE (ninguna baja real: baja lógica con activo)', () => {
  assert.doesNotMatch(CONTENIDO, /for\s+delete/i);
});
