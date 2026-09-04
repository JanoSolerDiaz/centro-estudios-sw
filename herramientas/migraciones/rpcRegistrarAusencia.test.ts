/**
 * Comprobaciones estáticas de `db/010_registro_ausencias.sql` (R-01), sin credenciales ni red —
 * mismo patrón que `rpcRegistrarAsistencia.test.ts`/`rpcActualizarAsistencia.test.ts`: no sustituye
 * al barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en
 * el momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (un privilegio de más concedido por defecto).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_010 = fileURLToPath(new URL('../../db/010_registro_ausencias.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_010, 'utf8');

void test('010_registro_ausencias.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('el CHECK de estado admite ahora "ausente" junto a "valida" y "anulada"', () => {
  assert.match(CONTENIDO, /check\s*\(\s*estado\s+in\s*\(\s*'valida'\s*,\s*'anulada'\s*,\s*'ausente'\s*\)\s*\)/i);
});

void test('el índice de duplicado alumno+slot+día cubre ahora valida Y ausente, no solo valida', () => {
  assert.match(CONTENIDO, /create\s+unique\s+index[\s\S]*?asistencia_uq_alumno_slot_dia_activa/i);
  assert.match(CONTENIDO, /where\s+estado\s+in\s*\(\s*'valida'\s*,\s*'ausente'\s*\)\s+and\s+slot_id\s+is\s+not\s+null/i);
});

void test('el índice viejo, acotado solo a valida, se retira explícitamente (no queda huérfano)', () => {
  assert.match(CONTENIDO, /drop\s+index\s+if\s+exists\s+public\.asistencia_uq_alumno_slot_dia_valida/i);
});

void test('registrar_ausencia es SECURITY DEFINER', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.registrar_ausencia[\s\S]*?security\s+definer/i);
});

void test('registrar_ausencia se concede exactamente a authenticated, nunca a anon', () => {
  const coincidencia = /grant\s+execute\s+on\s+function\s+public\.registrar_ausencia\([^)]*\)\s+to\s+([a-z_,\s]+);/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra el GRANT EXECUTE de registrar_ausencia');
  const roles = coincidencia[1];
  assert.ok(roles, 'el GRANT no captura la lista de roles');
  assert.match(roles, /\bauthenticated\b/i);
  assert.doesNotMatch(roles, /\banon\b/i);
});

void test('la función no declara ningún parámetro p_origen: una ausencia siempre es de origen "slot"', () => {
  const firma = /create\s+or\s+replace\s+function\s+public\.registrar_ausencia\s*\(([\s\S]*?)\)\s*\n?returns/i.exec(
    CONTENIDO,
  );
  assert.ok(firma, 'no se encuentra la firma de registrar_ausencia');
  const parametros = firma[1];
  assert.ok(parametros);
  assert.doesNotMatch(parametros, /\bp_origen\b/i);
  assert.doesNotMatch(parametros, /\bp_registrado_en\b/i);
  assert.doesNotMatch(parametros, /\bp_estado\b/i);
});

void test('el INSERT fija estado = \'ausente\' y origen = \'slot\' como literales, nunca desde un parámetro', () => {
  const coincidencia = /insert\s+into\s+public\.asistencia\s*\(([\s\S]*?)\)\s*\n\s*values\s*\(([\s\S]*?)\)\s*\n\s*returning/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra el INSERT sobre asistencia');
  const [, columnas, valores] = coincidencia;
  assert.ok(columnas && valores);
  assert.match(columnas, /\bestado\b/);
  assert.match(valores, /'ausente'/);
  assert.match(valores, /'slot'/);
  assert.doesNotMatch(columnas, /\bactualizado_en\b/i);
  assert.doesNotMatch(columnas, /\bactualizado_por\b/i);
});

void test('reutiliza aplicar_limite_tasa con la MISMA clave que registrar_asistencia/actualizar_asistencia', () => {
  assert.match(CONTENIDO, /aplicar_limite_tasa\('asistencia:'\s*\|\|\s*v_profesor_id::text,\s*60,\s*60\)/);
});

void test('la fórmula de es_retroactivo usa el margen de 300 segundos, igual que registrar_asistencia', () => {
  assert.match(CONTENIDO, /abs\(extract\(epoch\s+from\s+\(v_ocurrido_en\s*-\s*v_registrado_en\)\)\)\s*>\s*300/i);
});

void test('no recrea la tabla asistencia ni sustituye actualizar_asistencia/registrar_asistencia', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.actualizar_asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_asistencia\b/i);
});
