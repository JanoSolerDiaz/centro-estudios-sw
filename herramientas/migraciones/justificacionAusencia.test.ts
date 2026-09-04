/**
 * Comprobaciones estáticas de `db/011_justificacion_ausencia.sql` (R-02), sin credenciales ni red —
 * mismo patrón que `rpcActualizarAsistencia.test.ts`/`rpcRegistrarAusencia.test.ts`: no sustituye al
 * barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el
 * momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (un privilegio de más concedido por defecto).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_011 = fileURLToPath(new URL('../../db/011_justificacion_ausencia.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_011, 'utf8');

void test('011_justificacion_ausencia.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('las columnas nuevas existen en asistencia Y en asistencia_historial', () => {
  assert.match(CONTENIDO, /alter\s+table\s+public\.asistencia\s*\n\s*add\s+column\s+motivo_justificacion\s+text,\s*\n\s*add\s+column\s+nota_justificacion\s+text/i);
  assert.match(CONTENIDO, /alter\s+table\s+public\.asistencia_historial\s*\n\s*add\s+column\s+motivo_justificacion\s+text,\s*\n\s*add\s+column\s+nota_justificacion\s+text/i);
});

void test('el CHECK de motivo_justificacion exige la lista corta cerrada de cuatro valores', () => {
  assert.match(
    CONTENIDO,
    /check\s*\(\s*motivo_justificacion\s+is\s+null\s*\n?\s*or\s+motivo_justificacion\s+in\s*\(\s*'enfermedad'\s*,\s*'cita_medica'\s*,\s*'motivo_familiar'\s*,\s*'otro'\s*\)\s*\)/i,
  );
});

void test('no hay ningún CHECK que ate motivo_justificacion a estado = \'ausente\' (ver DECISIONES_TECNICAS.md)', () => {
  assert.doesNotMatch(CONTENIDO, /check\s*\([^)]*motivo_justificacion[^)]*estado\s*=\s*'ausente'/i);
});

void test('el trigger asistencia_copiar_a_historial se sustituye (create or replace) sin recrear la tabla', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.asistencia_copiar_a_historial/i);
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia_historial\b/i);
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia\b/i);
});

void test('el INSERT del trigger de historial copia las dos columnas nuevas', () => {
  const coincidencia =
    /insert\s+into\s+public\.asistencia_historial\s*\(([\s\S]*?)\)\s*\n\s*values\s*\(([\s\S]*?)\)\s*;/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra el INSERT del trigger de historial');
  const [, columnas, valores] = coincidencia;
  assert.ok(columnas && valores);
  assert.match(columnas, /\bmotivo_justificacion\b/);
  assert.match(columnas, /\bnota_justificacion\b/);
  assert.match(valores, /old\.motivo_justificacion/);
  assert.match(valores, /old\.nota_justificacion/);
});

void test('actualizar_asistencia se sustituye con drop + create, no con una segunda sobrecarga', () => {
  assert.match(
    CONTENIDO,
    /drop\s+function\s+if\s+exists\s+public\.actualizar_asistencia\(uuid,\s*uuid,\s*uuid,\s*timestamptz,\s*boolean,\s*text,\s*text,\s*boolean\)/i,
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

void test('justificar exige que el registro esté ausente y un motivo de la lista permitida, dentro de la propia RPC', () => {
  assert.match(CONTENIDO, /if\s+p_justificar\s+then/i);
  assert.match(CONTENIDO, /v_actual\.estado\s*<>\s*'ausente'/);
  assert.match(CONTENIDO, /p_motivo_justificacion\s+not\s+in\s*\(\s*'enfermedad'\s*,\s*'cita_medica'\s*,\s*'motivo_familiar'\s*,\s*'otro'\s*\)/i);
});

void test('el UPDATE final escribe motivo_justificacion/nota_justificacion solo cuando p_justificar es verdadero', () => {
  assert.match(CONTENIDO, /motivo_justificacion\s*=\s*case\s+when\s+p_justificar\s+then\s+p_motivo_justificacion\s+else\s+v_actual\.motivo_justificacion\s+end/i);
  assert.match(CONTENIDO, /nota_justificacion\s*=\s*case\s+when\s+p_justificar\s+then\s+p_nota_justificacion\s+else\s+v_actual\.nota_justificacion\s+end/i);
});

void test('no toca registrar_asistencia ni registrar_ausencia', () => {
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_asistencia\b/i);
  assert.doesNotMatch(CONTENIDO, /function\s+public\.registrar_ausencia\b/i);
});
