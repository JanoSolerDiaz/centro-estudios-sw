/**
 * Comprobaciones estáticas de `db/015_aviso_cancelacion_slot.sql` (R-14), sin credenciales ni red —
 * mismo patrón que `excepcionSlot.test.ts`/`calendarioCierres.test.ts`: no sustituye al barrido en
 * vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el momento de
 * escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (privilegios por defecto de Supabase, aquí sobre una función nueva).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_015 = fileURLToPath(new URL('../../db/015_aviso_cancelacion_slot.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_015, 'utf8');

void test('015_aviso_cancelacion_slot.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('no recrea excepcion_slot ni ninguna otra tabla: solo la amplía', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\./i);
  assert.match(CONTENIDO, /alter\s+table\s+public\.excepcion_slot\s+add\s+column\s+if\s+not\s+exists\s+aviso_familias_quien\s+text/i);
  assert.match(CONTENIDO, /alter\s+table\s+public\.excepcion_slot\s+add\s+column\s+if\s+not\s+exists\s+aviso_familias_en\s+timestamptz/i);
});

void test('aviso solo sobre una cancelación, y quien/en siempre juntos (CHECK)', () => {
  assert.match(
    CONTENIDO,
    /constraint\s+excepcion_slot_aviso_solo_cancelacion\s+check\s*\(\s*aviso_familias_en\s+is\s+null\s+or\s+tipo\s*=\s*'cancelacion'\s*\)/i,
  );
  assert.match(
    CONTENIDO,
    /constraint\s+excepcion_slot_aviso_quien_y_en_juntos\s+check\s*\(\s*\(\s*aviso_familias_quien\s+is\s+null\s*\)\s*=\s*\(\s*aviso_familias_en\s+is\s+null\s*\)\s*\)/i,
  );
});

void test('registrar_aviso_cancelacion_slot es SECURITY DEFINER, solo authenticated (comprobación de rol dentro)', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.registrar_aviso_cancelacion_slot[\s\S]*?security\s+definer/i);
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.registrar_aviso_cancelacion_slot\(uuid,\s*text\)\s+to\s+authenticated/i,
  );
});

void test('registrar_aviso_cancelacion_slot rechaza a quien no es administrator', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.registrar_aviso_cancelacion_slot[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo, 'no se encuentra el cuerpo de registrar_aviso_cancelacion_slot');
  assert.match(cuerpo, /v_rol\s*<>\s*'administrator'/i);
  assert.match(cuerpo, /errcode\s*=\s*'42501'/i);
});

void test('registrar_aviso_cancelacion_slot exige quien no vacío, la excepción activa y de tipo cancelacion', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.registrar_aviso_cancelacion_slot[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo);
  assert.match(cuerpo, /p_quien\s+is\s+null\s+or\s+btrim\(p_quien\)\s*=\s*''/i);
  assert.match(cuerpo, /not\s+v_exc\.activo/i);
  assert.match(cuerpo, /v_exc\.tipo\s*<>\s*'cancelacion'/i);
});

void test('registrar_aviso_cancelacion_slot fija aviso_familias_en con now(), nunca con un valor del cliente', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.registrar_aviso_cancelacion_slot[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo);
  assert.match(cuerpo, /aviso_familias_en\s*=\s*now\(\)/i);
  assert.doesNotMatch(cuerpo, /p_aviso_familias_en/i);
});

void test('las comprobaciones que leen la fila devuelta expanden columnas (select * into, no select f() into)', () => {
  assert.doesNotMatch(
    CONTENIDO,
    /select\s+public\.registrar_aviso_cancelacion_slot\(/i,
    'usa `select * into v_fila from public.registrar_aviso_cancelacion_slot(...)`, no `select public.registrar_aviso_cancelacion_slot(...) into v_fila`',
  );
});

void test('no recrea excepcion_slot, no toca declarar_excepcion_slot/desactivar_excepcion_slot ni registrar_asistencia/registrar_ausencia', () => {
  assert.doesNotMatch(CONTENIDO, /function\s+public\.declarar_excepcion_slot\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.desactivar_excepcion_slot\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_ausencia\b/i);
});
