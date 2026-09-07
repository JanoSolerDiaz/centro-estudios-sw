/**
 * Comprobaciones estáticas de `db/013_excepcion_slot.sql` (R-06), sin credenciales ni red — mismo
 * patrón que `calendarioCierres.test.ts`/`registroSalida.test.ts`: no sustituye al barrido en vivo
 * que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el momento de
 * escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (privilegios por defecto de Supabase sobre una tabla nueva).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_013 = fileURLToPath(new URL('../../db/013_excepcion_slot.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_013, 'utf8');

void test('013_excepcion_slot.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('crea excepcion_slot con slot_id, fecha, tipo, profesor_sustituto_id, motivo y activo', () => {
  assert.match(CONTENIDO, /create\s+table\s+public\.excepcion_slot\s*\(/i);
  assert.match(CONTENIDO, /slot_id\s+uuid\s+not\s+null\s+references\s+public\.slot_horario\s*\(id\)/i);
  assert.match(CONTENIDO, /fecha\s+date\s+not\s+null/i);
  assert.match(CONTENIDO, /tipo\s+text\s+not\s+null/i);
  assert.match(CONTENIDO, /profesor_sustituto_id\s+uuid\s+references\s+public\.perfil\s*\(id\)/i);
  assert.match(CONTENIDO, /activo\s+boolean\s+not\s+null\s+default\s+true/i);
});

void test('tipo limitado a sustitucion/cancelacion y coherencia sustituto/motivo', () => {
  assert.match(CONTENIDO, /constraint\s+excepcion_slot_tipo_valido\s+check\s*\(\s*tipo\s+in\s*\(\s*'sustitucion'\s*,\s*'cancelacion'\s*\)\s*\)/i);
  assert.match(CONTENIDO, /constraint\s+excepcion_slot_sustitucion_coherente\s+check\s*\(/i);
  assert.match(CONTENIDO, /constraint\s+excepcion_slot_cancelacion_motivo_obligatorio\s+check\s*\(/i);
});

void test('una sola excepción activa por slot y fecha (índice único parcial)', () => {
  assert.match(
    CONTENIDO,
    /create\s+unique\s+index\s+excepcion_slot_uq_slot_fecha_activa\s*\n\s*on\s+public\.excepcion_slot\s*\(\s*slot_id\s*,\s*fecha\s*\)\s*\n\s*where\s+activo/i,
  );
});

void test('reutiliza tocar_actualizado_en(), no redefine el trigger genérico', () => {
  assert.match(
    CONTENIDO,
    /create\s+trigger\s+excepcion_slot_tocar_actualizado_en\s*\n\s*before\s+update\s+on\s+public\.excepcion_slot\s*\n\s*for\s+each\s+row\s+execute\s+function\s+public\.tocar_actualizado_en\(\)/i,
  );
  assert.doesNotMatch(CONTENIDO, /create\s+(?:or\s+replace\s+)?function\s+public\.tocar_actualizado_en/i);
});

void test('habilita RLS y revoca todo antes de conceder nada, sobre los tres roles', () => {
  assert.match(CONTENIDO, /alter\s+table\s+public\.excepcion_slot\s+enable\s+row\s+level\s+security/i);
  assert.match(
    CONTENIDO,
    /revoke\s+all\s+on\s+public\.excepcion_slot\s+from\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );
});

void test('el revoke precede a cualquier grant sobre la tabla', () => {
  const indiceRevoke = CONTENIDO.search(/revoke\s+all\s+on\s+public\.excepcion_slot/i);
  const indicePrimerGrant = CONTENIDO.search(/grant\s+select.*on\s+public\.excepcion_slot/i);
  assert.ok(indiceRevoke >= 0 && indicePrimerGrant >= 0);
  assert.ok(indiceRevoke < indicePrimerGrant, 'el revoke debe escribirse antes que el primer grant');
});

void test('authenticated NUNCA recibe INSERT/UPDATE/DELETE directo sobre excepcion_slot: solo SELECT, escritura vía RPC', () => {
  const otorgados = CONTENIDO.split(';')
    .filter((sentencia) => {
      const trimmed = sentencia.trim();
      return /^grant\b/i.test(trimmed) && /\bon\s+public\.excepcion_slot\b/i.test(trimmed) && /\bauthenticated\b/i.test(trimmed);
    })
    .join(' ; ');
  assert.match(otorgados, /\bselect\b/i);
  assert.doesNotMatch(otorgados, /\binsert\b/i);
  assert.doesNotMatch(otorgados, /\bupdate\b/i);
  assert.doesNotMatch(otorgados, /\bdelete\b/i);
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

void test('ninguna política menciona a student: la única suya en todo el sistema sigue siendo perfil_leer_propio', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+policy[^;]*student/i);
});

void test('administrator lee todas; teacher solo las activas relacionadas (titular o sustituto)', () => {
  assert.match(CONTENIDO, /create\s+policy\s+excepcion_slot_admin_leer_todo[\s\S]*?public\.es_administrator\(\)/i);
  assert.match(
    CONTENIDO,
    /create\s+policy\s+excepcion_slot_teacher_leer_relacionadas[\s\S]*?public\.es_teacher\(\)\s*\n\s*and\s+activo/i,
  );
  assert.match(CONTENIDO, /profesor_sustituto_id\s*=\s*auth\.uid\(\)/i);
});

void test('slot_horario gana una política nueva para que el sustituto lea el slot ajeno, sin tocar la de 003 (inmutable)', () => {
  assert.match(
    CONTENIDO,
    /create\s+policy\s+slot_horario_teacher_leer_sustituciones\s+on\s+public\.slot_horario/i,
  );
  assert.doesNotMatch(CONTENIDO, /create\s+policy\s+slot_horario_teacher_leer_propios/i);
});

void test('declarar_excepcion_slot y desactivar_excepcion_slot son SECURITY DEFINER, solo authenticated', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.declarar_excepcion_slot[\s\S]*?security\s+definer/i);
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.desactivar_excepcion_slot[\s\S]*?security\s+definer/i);
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.declarar_excepcion_slot\([^)]*\)\s+to\s+authenticated/i,
  );
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.desactivar_excepcion_slot\([^)]*\)\s+to\s+authenticated/i,
  );
});

void test('declarar_excepcion_slot comprueba la ausencia de registros de asistencia ese día antes de insertar (requisito 5)', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.declarar_excepcion_slot[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo, 'no se encuentra el cuerpo de declarar_excepcion_slot');
  assert.match(cuerpo, /select\s+exists\(\s*\n?\s*select\s+1\s+from\s+public\.asistencia/i);
  assert.match(cuerpo, /excepción retroactiva/i);
});

void test('desactivar_excepcion_slot comprueba la ausencia de registros de asistencia ese día antes de revertir (requisito 5)', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.desactivar_excepcion_slot[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo, 'no se encuentra el cuerpo de desactivar_excepcion_slot');
  assert.match(cuerpo, /select\s+exists\(\s*\n?\s*select\s+1\s+from\s+public\.asistencia/i);
});

void test('registrar_asistencia se sustituye con la MISMA firma exacta que 005_rpc_registrar_asistencia.sql', () => {
  const firma = /create\s+or\s+replace\s+function\s+public\.registrar_asistencia\s*\(([\s\S]*?)\)\s*\n?returns/i.exec(CONTENIDO);
  assert.ok(firma, 'no se encuentra la firma de registrar_asistencia');
  const parametros = firma[1];
  assert.ok(parametros);
  for (const nombre of ['p_alumno_id', 'p_origen', 'p_peticion_id', 'p_slot_id', 'p_ocurrido_en', 'p_nota', 'p_profesor_id']) {
    assert.match(parametros, new RegExp(`\\b${nombre}\\b`));
  }
  assert.doesNotMatch(parametros, /\bp_tipo\b/i);
  assert.doesNotMatch(parametros, /\bp_excepcion/i);
  assert.match(
    CONTENIDO,
    /revoke\s+all\s+on\s+function\s+public\.registrar_asistencia\(uuid,\s*text,\s*uuid,\s*uuid,\s*timestamptz,\s*text,\s*uuid\)/i,
  );
  assert.match(
    CONTENIDO,
    /grant\s+execute\s+on\s+function\s+public\.registrar_asistencia\(uuid,\s*text,\s*uuid,\s*uuid,\s*timestamptz,\s*text,\s*uuid\)\s+to\s+authenticated/i,
  );
});

void test('registrar_asistencia: cancelación bloquea a cualquiera antes de mirar el dueño del slot', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.registrar_asistencia[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo);
  const indiceExcepcion = cuerpo.search(/select\s+tipo\s*,\s*profesor_sustituto_id\s+into\s+v_exc_tipo/i);
  const indiceCancelacion = cuerpo.search(/v_exc_tipo\s*=\s*'cancelacion'/i);
  const indiceDueno = cuerpo.search(/el slot pertenece a otro profesor/i);
  assert.ok(indiceExcepcion >= 0 && indiceCancelacion >= 0 && indiceDueno >= 0);
  assert.ok(indiceExcepcion < indiceCancelacion && indiceCancelacion < indiceDueno);
});

void test('registrar_asistencia: el sustituto puede saltarse la comprobación de dueño', () => {
  const cuerpo = /create\s+or\s+replace\s+function\s+public\.registrar_asistencia[\s\S]*?\$\$;/i.exec(CONTENIDO)?.[0];
  assert.ok(cuerpo);
  assert.match(cuerpo, /v_exc_tipo\s*=\s*'sustitucion'/i);
  assert.match(cuerpo, /v_profesor_id\s*<>\s*v_exc_sustituto_id/i);
});

void test('no recrea la tabla asistencia ni sustituye actualizar_asistencia/registrar_ausencia', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.actualizar_asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_ausencia\b/i);
});

void test('sin política de DELETE (ninguna baja real: baja lógica con activo)', () => {
  assert.doesNotMatch(CONTENIDO, /for\s+delete/i);
});
