/**
 * Comprobaciones estáticas de `db/021_arreglo_recursion_excepcion_slot.sql` (P-33), sin
 * credenciales ni red — mismo patrón que `arregloLimiteTasaAmbiguo.test.ts`.
 *
 * Que el ciclo de políticas quede roto lo comprueba `politicasSinCiclos.test.ts` sobre todas las
 * migraciones. Aquí se comprueba lo demás: que el arreglo no cambia la semántica que pretendía
 * `013` ni toca nada más.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { quitarComentariosSql, validarContenidoMigracion } from './guardas.ts';

const RUTA_021 = fileURLToPath(new URL('../../db/021_arreglo_recursion_excepcion_slot.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_021, 'utf8');
const SIN_COMENTARIOS = quitarComentariosSql(CONTENIDO);

void test('021_arreglo_recursion_excepcion_slot.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('es_sustituto_activo_de_slot es SECURITY DEFINER, stable y con search_path fijado', () => {
  const definicion = /create\s+or\s+replace\s+function\s+public\.es_sustituto_activo_de_slot\s*\(\s*p_slot_id\s+uuid\s*\)([\s\S]*?)as\s+\$\$/i.exec(
    SIN_COMENTARIOS,
  );
  assert.ok(definicion?.[1], 'no se encuentra la cabecera de es_sustituto_activo_de_slot(uuid)');
  assert.match(definicion[1], /returns\s+boolean/i);
  assert.match(definicion[1], /\bstable\b/i);
  assert.match(definicion[1], /security\s+definer/i);
  assert.match(definicion[1], /set\s+search_path\s*=\s*public/i);
});

void test('la función conserva la condición exacta de 013: sustitución activa con el llamante como sustituto', () => {
  const cuerpo = /as\s+\$\$([\s\S]*?)\$\$/i.exec(SIN_COMENTARIOS)?.[1] ?? '';
  assert.match(cuerpo, /from\s+public\.excepcion_slot/i);
  assert.match(cuerpo, /slot_id\s*=\s*p_slot_id/i);
  assert.match(cuerpo, /tipo\s*=\s*'sustitucion'/i);
  assert.match(cuerpo, /\.activo\b/i);
  assert.match(cuerpo, /profesor_sustituto_id\s*=\s*auth\.uid\(\)/i);
});

void test('la función solo se concede a authenticated, nunca a public ni a anon', () => {
  assert.match(SIN_COMENTARIOS, /revoke\s+all\s+on\s+function\s+public\.es_sustituto_activo_de_slot\(uuid\)\s+from\s+public/i);
  assert.match(SIN_COMENTARIOS, /grant\s+execute\s+on\s+function\s+public\.es_sustituto_activo_de_slot\(uuid\)\s+to\s+authenticated\s*;/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /\bto\s+anon\b/i);
});

void test('la política se recrea con el mismo nombre, solo para teacher, y ya no consulta excepcion_slot directamente', () => {
  const politica = /create\s+policy\s+slot_horario_teacher_leer_sustituciones\s+on\s+public\.slot_horario([\s\S]*?);/i.exec(
    SIN_COMENTARIOS,
  );
  assert.ok(politica?.[1], 'no se recrea slot_horario_teacher_leer_sustituciones');
  assert.match(politica[1], /for\s+select\s+to\s+authenticated/i);
  assert.match(politica[1], /public\.es_teacher\(\)/i);
  assert.match(politica[1], /public\.es_sustituto_activo_de_slot\(\s*slot_horario\.id\s*\)/i);
  assert.doesNotMatch(politica[1], /\bfrom\b/i);
});

void test('el arreglo no toca nada más: ni la política de excepcion_slot, ni tablas, ni RPC', () => {
  assert.doesNotMatch(SIN_COMENTARIOS, /excepcion_slot_teacher_leer_relacionadas/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /\b(?:create|alter)\s+table\b/i);
  assert.equal((SIN_COMENTARIOS.match(/create\s+or\s+replace\s+function/gi) ?? []).length, 1);
  assert.equal((SIN_COMENTARIOS.match(/create\s+policy/gi) ?? []).length, 1);
  assert.equal((SIN_COMENTARIOS.match(/drop\s+policy/gi) ?? []).length, 1);
});
