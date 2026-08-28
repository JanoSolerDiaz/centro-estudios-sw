/**
 * Comprobaciones estáticas de `db/003_politicas_rls.sql` (T-10), sin credenciales ni red: mismo
 * patrón que `esquemaInicial.test.ts` (T-07). No sustituye a `db/pruebas_rls.sql` (que exige una
 * conexión real y lo ejecuta el dueño con `npm run probar-rls`), pero atrapa en el momento de
 * escribir el script la misma clase de descuido: una política que se le olvida a alguna tabla, una
 * política para `student` que nunca debió existir, o una columna de contacto de `alumno` que se
 * cuela en el GRANT de `authenticated`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion, quitarComentariosSql } from './guardas.ts';

const RUTA_003 = fileURLToPath(new URL('../../db/003_politicas_rls.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_003, 'utf8');
const SIN_COMENTARIOS = quitarComentariosSql(CONTENIDO);

const TABLAS_CON_POLITICA = [
  'centro_estudios',
  'alumno',
  'persona_referencia',
  'slot_horario',
  'asistencia',
  'asistencia_historial',
  'evento_error',
];

void test('003_politicas_rls.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('cada una de las siete tablas de T-10 tiene al menos una política nueva', () => {
  for (const tabla of TABLAS_CON_POLITICA) {
    const patron = new RegExp(`create\\s+policy\\s+[a-z0-9_]+\\s+on\\s+public\\.${tabla}\\b`, 'i');
    assert.ok(patron.test(SIN_COMENTARIOS), `${tabla} no tiene ninguna política nueva`);
  }
});

void test('ninguna política nueva menciona a student ni compara rol_actual() a mano', () => {
  const bloquesPolicy = SIN_COMENTARIOS.match(/create\s+policy[\s\S]*?;/gi) ?? [];
  assert.ok(bloquesPolicy.length > 0, 'no se encontró ningún CREATE POLICY');
  for (const bloque of bloquesPolicy) {
    assert.doesNotMatch(bloque, /\bstudent\b/i, `una política menciona "student": ${bloque}`);
    assert.doesNotMatch(
      bloque,
      /rol_actual\s*\(\s*\)\s*=/i,
      `una política compara rol_actual() a mano en vez de usar es_administrator()/es_teacher(): ${bloque}`,
    );
  }
});

void test('toda política nueva usa es_administrator() o es_teacher(), nunca ambas condiciones ausentes', () => {
  const bloquesPolicy = SIN_COMENTARIOS.match(/create\s+policy[\s\S]*?;/gi) ?? [];
  for (const bloque of bloquesPolicy) {
    assert.match(
      bloque,
      /es_administrator\s*\(\s*\)|es_teacher\s*\(\s*\)/i,
      `una política no usa ninguna de las dos funciones de rol: ${bloque}`,
    );
  }
});

void test('el GRANT de columnas de alumno para authenticated no incluye email_alumno ni telefono_alumno', () => {
  const grantColumnas = /grant\s+select\s*\([^)]*\)\s*on\s+public\.alumno\s+to\s+authenticated/i.exec(SIN_COMENTARIOS);
  assert.ok(grantColumnas, 'no se encontró el GRANT de columnas restringidas sobre alumno');
  const lista = grantColumnas[0];
  assert.doesNotMatch(lista, /email_alumno/i);
  assert.doesNotMatch(lista, /telefono_alumno/i);
});

void test('no hay ningún GRANT sin restricción de columnas sobre alumno para authenticated (select * encubierto)', () => {
  // Un "grant select on public.alumno to authenticated" sin lista de columnas expondría TODAS las
  // columnas, incluidas las de contacto, anulando la restricción de más arriba.
  assert.doesNotMatch(SIN_COMENTARIOS, /grant\s+select\s+on\s+public\.alumno\s+to\s+authenticated/i);
});

void test('alumno_ficha existe, filtra por es_administrator() y se concede a authenticated', () => {
  assert.match(SIN_COMENTARIOS, /create\s+view\s+public\.alumno_ficha\s+as/i);
  const vista = /create\s+view\s+public\.alumno_ficha[\s\S]*?;/i.exec(SIN_COMENTARIOS)?.[0] ?? '';
  assert.match(vista, /es_administrator\s*\(\s*\)/i);
  assert.match(SIN_COMENTARIOS, /grant\s+select\s+on\s+public\.alumno_ficha\s+to\s+authenticated/i);
});

void test('persona_referencia concede DELETE (única tabla con borrado real) solo bajo es_administrator()', () => {
  assert.match(SIN_COMENTARIOS, /grant[\s\S]*?delete[\s\S]*?on\s+public\.persona_referencia\s+to\s+authenticated/i);
  const bloque =
    /create\s+policy\s+persona_referencia_admin_todo[\s\S]*?;/i.exec(SIN_COMENTARIOS)?.[0] ?? '';
  assert.match(bloque, /for\s+all/i);
  assert.match(bloque, /es_administrator\s*\(\s*\)/i);
});

void test('no se concede INSERT ni UPDATE directo sobre asistencia ni asistencia_historial a authenticated', () => {
  const sentencias = SIN_COMENTARIOS.split(';').map((s) => s.trim());
  for (const sentencia of sentencias) {
    if (!/^grant\b/i.test(sentencia)) {
      continue;
    }
    if (!/\bauthenticated\b/i.test(sentencia)) {
      continue;
    }
    if (/\basistencia(_historial)?\b/i.test(sentencia)) {
      assert.doesNotMatch(sentencia, /\binsert\b/i, `GRANT indebido: ${sentencia}`);
      assert.doesNotMatch(sentencia, /\bupdate\b/i, `GRANT indebido: ${sentencia}`);
      assert.doesNotMatch(sentencia, /\bdelete\b/i, `GRANT indebido: ${sentencia}`);
    }
  }
});

void test('el bucket avatares tiene política de lectura para teacher acotada a alumnos activos', () => {
  const bloque =
    /create\s+policy\s+avatares_teacher_leer_alumnos_activos[\s\S]*?;/i.exec(SIN_COMENTARIOS)?.[0] ?? '';
  assert.match(bloque, /es_teacher\s*\(\s*\)/i);
  assert.match(bloque, /a\.activo/i);
  assert.match(bloque, /bucket_id\s*=\s*'avatares'/i);
});

void test('ninguna política del bucket avatares concede acceso a anon', () => {
  const bloquesStorage = SIN_COMENTARIOS.match(/create\s+policy\s+avatares_[a-z0-9_]+[\s\S]*?;/gi) ?? [];
  assert.ok(bloquesStorage.length > 0, 'no se encontró ninguna política del bucket avatares');
  for (const bloque of bloquesStorage) {
    assert.doesNotMatch(bloque, /\bto\s+anon\b/i, `una política del bucket concede acceso a anon: ${bloque}`);
  }
});

void test('el script no recrea perfil ni las funciones de rol (solo las usa)', () => {
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+table\s+public\.perfil\b/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+or\s+replace\s+function\s+public\.es_administrator\b/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+or\s+replace\s+function\s+public\.es_teacher\b/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+or\s+replace\s+function\s+public\.rol_actual\b/i);
});
