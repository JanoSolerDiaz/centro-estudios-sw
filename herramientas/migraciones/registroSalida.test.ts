/**
 * Comprobaciones estáticas de `db/012_registro_salida.sql` (R-03), sin credenciales ni red — mismo
 * patrón que `justificacionAusencia.test.ts`/`rpcActualizarAsistencia.test.ts`: no sustituye al
 * barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el
 * momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (un privilegio de más concedido por defecto).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_012 = fileURLToPath(new URL('../../db/012_registro_salida.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_012, 'utf8');

void test('012_registro_salida.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('la columna ocurrido_en_salida existe en asistencia Y en asistencia_historial', () => {
  assert.match(CONTENIDO, /alter\s+table\s+public\.asistencia\s*\n\s*add\s+column\s+ocurrido_en_salida\s+timestamptz/i);
  assert.match(CONTENIDO, /alter\s+table\s+public\.asistencia_historial\s*\n\s*add\s+column\s+ocurrido_en_salida\s+timestamptz/i);
});

void test('el CHECK exige que la salida sea nula o posterior a la entrada', () => {
  assert.match(
    CONTENIDO,
    /check\s*\(\s*ocurrido_en_salida\s+is\s+null\s+or\s+ocurrido_en_salida\s*>\s*ocurrido_en\s*\)/i,
  );
});

void test('no hay ningún CHECK que ate ocurrido_en_salida a estado = \'valida\' (ver DECISIONES_TECNICAS.md)', () => {
  assert.doesNotMatch(CONTENIDO, /check\s*\([^)]*ocurrido_en_salida[^)]*estado\s*=\s*'valida'/i);
});

void test('el trigger asistencia_copiar_a_historial se sustituye (create or replace) sin recrear la tabla', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.asistencia_copiar_a_historial/i);
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia_historial\b/i);
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia\b/i);
});

void test('el INSERT del trigger de historial copia la columna nueva', () => {
  const coincidencia =
    /insert\s+into\s+public\.asistencia_historial\s*\(([\s\S]*?)\)\s*\n\s*values\s*\(([\s\S]*?)\)\s*;/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra el INSERT del trigger de historial');
  const [, columnas, valores] = coincidencia;
  assert.ok(columnas && valores);
  assert.match(columnas, /\bocurrido_en_salida\b/);
  assert.match(valores, /old\.ocurrido_en_salida/);
});

void test('actualizar_asistencia se sustituye con drop + create, no con una segunda sobrecarga', () => {
  assert.match(
    CONTENIDO,
    /drop\s+function\s+if\s+exists\s+public\.actualizar_asistencia\(uuid,\s*uuid,\s*uuid,\s*timestamptz,\s*boolean,\s*text,\s*text,\s*boolean,\s*boolean,\s*text,\s*text\)/i,
  );
  assert.match(CONTENIDO, /create\s+function\s+public\.actualizar_asistencia\s*\(/i);
  assert.doesNotMatch(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.actualizar_asistencia/i);
});

void test('actualizar_asistencia sigue siendo SECURITY DEFINER', () => {
  assert.match(CONTENIDO, /create\s+function\s+public\.actualizar_asistencia[\s\S]*?security\s+definer/i);
});

void test('el GRANT EXECUTE final va exactamente a authenticated, nunca a anon', () => {
  const coincidencia =
    /grant\s+execute\s+on\s+function\s+public\.actualizar_asistencia\([^)]*\)\s+to\s+([a-z_,\s]+);/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra el GRANT EXECUTE de actualizar_asistencia');
  const roles = coincidencia[1];
  assert.ok(roles);
  assert.match(roles, /\bauthenticated\b/i);
  assert.doesNotMatch(roles, /\banon\b/i);
});

void test('marcar salida usa clock_timestamp(), nunca now() (ver DECISIONES_TECNICAS.md)', () => {
  const bloque = /if\s+p_marcar_salida\s+then([\s\S]*?)elsif\s+p_ocurrido_en_salida/i.exec(CONTENIDO);
  assert.ok(bloque, 'no se encuentra el bloque de "marcar salida"');
  const [, cuerpo] = bloque;
  assert.ok(cuerpo);
  assert.match(cuerpo, /clock_timestamp\(\)/);
  assert.doesNotMatch(cuerpo, /:=\s*now\(\)/);
});

void test('marcar salida exige un registro presente sin salida ya marcada', () => {
  assert.match(CONTENIDO, /v_estado_final\s*<>\s*'valida'/);
  assert.match(CONTENIDO, /v_actual\.ocurrido_en_salida\s+is\s+not\s+null/);
});

void test('marcar y ajustar la salida en la misma llamada se rechazan combinados', () => {
  assert.match(CONTENIDO, /p_marcar_salida\s+and\s+p_ocurrido_en_salida\s+is\s+not\s+null/i);
});

void test('ajustar una salida exige que ya exista una marcada', () => {
  assert.match(CONTENIDO, /elsif\s+p_ocurrido_en_salida\s+is\s+not\s+null\s+then\s*\n\s*if\s+v_actual\.ocurrido_en_salida\s+is\s+null\s+then/i);
});

void test('el UPDATE final escribe ocurrido_en_salida con el valor resuelto en la sección 8', () => {
  assert.match(CONTENIDO, /ocurrido_en_salida\s*=\s*v_ocurrido_salida_final/);
});

void test('no toca registrar_asistencia ni registrar_ausencia', () => {
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_ausencia\b/i);
});
