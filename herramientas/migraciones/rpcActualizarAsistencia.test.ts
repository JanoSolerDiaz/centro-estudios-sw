/**
 * Comprobaciones estáticas de `db/008_rpc_actualizar_asistencia.sql` (T-21), sin credenciales ni
 * red — mismo patrón que `rpcRegistrarAsistencia.test.ts`/`rpcBuscarAlumnos.test.ts`: no sustituye
 * al barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en
 * el momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (un privilegio de más concedido por defecto).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_008 = fileURLToPath(new URL('../../db/008_rpc_actualizar_asistencia.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_008, 'utf8');

void test('008_rpc_actualizar_asistencia.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('actualizar_asistencia es SECURITY DEFINER', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.actualizar_asistencia[\s\S]*?security\s+definer/i);
});

void test('actualizar_asistencia se concede exactamente a authenticated, nunca a anon', () => {
  const coincidencia = /grant\s+execute\s+on\s+function\s+public\.actualizar_asistencia\([^)]*\)\s+to\s+([a-z_,\s]+);/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra el GRANT EXECUTE de actualizar_asistencia');
  const roles = coincidencia[1];
  assert.ok(roles, 'el GRANT no captura la lista de roles');
  assert.match(roles, /\bauthenticated\b/i);
  assert.doesNotMatch(roles, /\banon\b/i);
});

void test('la firma no declara p_registrado_en, p_profesor_id ni p_peticion_id: son inmutables, no editables por esta RPC', () => {
  const firma = /create\s+or\s+replace\s+function\s+public\.actualizar_asistencia\s*\(([\s\S]*?)\)\s*\nreturns/i.exec(
    CONTENIDO,
  );
  assert.ok(firma, 'no se encuentra la firma de actualizar_asistencia');
  const parametros = firma[1];
  assert.ok(parametros);
  assert.doesNotMatch(parametros, /\bp_registrado_en\b/i);
  assert.doesNotMatch(parametros, /\bp_profesor_id\b/i);
  assert.doesNotMatch(parametros, /\bp_peticion_id\b/i);
});

void test('el UPDATE de asistencia nunca toca registrado_en, profesor_id, peticion_id, actualizado_en ni actualizado_por', () => {
  const coincidencia = /update\s+public\.asistencia\s+set([\s\S]*?)where\s+id\s*=\s*p_asistencia_id/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra el UPDATE sobre asistencia');
  const bloqueSet = coincidencia[1];
  assert.ok(bloqueSet);
  assert.doesNotMatch(bloqueSet, /\bregistrado_en\s*=/i);
  assert.doesNotMatch(bloqueSet, /\bprofesor_id\s*=/i);
  assert.doesNotMatch(bloqueSet, /\bpeticion_id\s*=/i);
  assert.doesNotMatch(bloqueSet, /\bactualizado_en\s*=/i);
  assert.doesNotMatch(bloqueSet, /\bactualizado_por\s*=/i);
});

void test('la ventana de edición del teacher es de 7 días, contada desde registrado_en', () => {
  assert.match(CONTENIDO, /now\(\)\s*-\s*v_actual\.registrado_en\s*>\s*interval\s*'7 days'/i);
});

void test('anular exige un motivo no vacío antes de fijar estado = anulada', () => {
  assert.match(CONTENIDO, /p_motivo_anulacion\s+is\s+null\s+or\s+length\(trim\(p_motivo_anulacion\)\)\s*=\s*0/i);
  assert.match(CONTENIDO, /v_estado_final\s*:=\s*'anulada'/i);
});

void test('la fórmula de es_retroactivo usa el margen de 300 segundos, igual que el CHECK ya aplicado de 001', () => {
  assert.match(CONTENIDO, /abs\(extract\(epoch\s+from\s+\(v_ocurrido_final\s*-\s*v_actual\.registrado_en\)\)\)\s*>\s*300/i);
});

void test('reutiliza aplicar_limite_tasa con la misma clave que registrar_asistencia (cupo compartido por profesor)', () => {
  assert.match(CONTENIDO, /aplicar_limite_tasa\('asistencia:'\s*\|\|\s*v_actual\.profesor_id::text,\s*60,\s*60\)/i);
});

void test('no recrea la tabla asistencia ni ninguna otra: solo añade la función', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\b/i);
});

void test('cambiar el slot exige que el registro sea de origen "slot" (nunca convierte un manual en slot)', () => {
  assert.match(CONTENIDO, /v_actual\.origen\s*<>\s*'slot'/i);
});
