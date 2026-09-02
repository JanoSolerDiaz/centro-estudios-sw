/**
 * Comprobaciones estáticas de `db/009_administracion_usuarios.sql` (T-24), sin credenciales ni red —
 * mismo patrón que `rpcActualizarAsistencia.test.ts`/`rpcBuscarAlumnos.test.ts`: no sustituye al
 * barrido en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el
 * momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_009 = fileURLToPath(new URL('../../db/009_administracion_usuarios.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_009, 'utf8');

void test('009_administracion_usuarios.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('no recrea la tabla perfil ni ninguna otra: solo la altera', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\b/i);
  assert.match(CONTENIDO, /alter\s+table\s+public\.perfil\s+add\s+column\s+if\s+not\s+exists\s+actualizado_por/i);
});

void test('perfil_before_update sustituye a perfil_tocar_actualizado_en, no lo deja duplicado', () => {
  assert.match(CONTENIDO, /drop\s+trigger\s+if\s+exists\s+perfil_tocar_actualizado_en\s+on\s+public\.perfil/i);
  assert.match(CONTENIDO, /create\s+trigger\s+perfil_before_update\s*\n\s*before\s+update\s+on\s+public\.perfil/i);
});

void test('el trigger sigue tocando actualizado_en y fija actualizado_por con auth.uid(), nunca con un valor del cliente', () => {
  assert.match(CONTENIDO, /new\.actualizado_en\s*:=\s*now\(\)/i);
  assert.match(CONTENIDO, /new\.actualizado_por\s*:=\s*auth\.uid\(\)/i);
});

void test('la función NO es SECURITY DEFINER: el llamante ya tiene que ser administrator y ya puede leer todo perfil', () => {
  const cabecera = /create\s+or\s+replace\s+function\s+public\.perfil_proteger_ultimo_administrator\s*\(\s*\)\s*\nreturns\s+trigger\s*\nlanguage\s+plpgsql\s*\nas\s+\$\$/i.exec(
    CONTENIDO,
  );
  assert.ok(cabecera, 'no se encuentra la cabecera de perfil_proteger_ultimo_administrator con la forma esperada');
});

void test('el guardián del último administrator compara contra OTRA fila activa (id <> old.id), nunca cuenta la propia', () => {
  assert.match(CONTENIDO, /rol\s*=\s*'administrator'\s+and\s+activo\s+and\s+id\s*<>\s*old\.id/i);
});

void test('la condición dispara con un cambio de rol O de activo, no solo con uno de los dos', () => {
  assert.match(
    CONTENIDO,
    /new\.rol\s+is\s+distinct\s+from\s+'administrator'\s+or\s+new\.activo\s+is\s+distinct\s+from\s+true/i,
  );
});

void test('el rechazo trae un mensaje reconocible por db/pruebas_rls.sql (sección 8e)', () => {
  assert.match(CONTENIDO, /último administrator activo/i);
});
