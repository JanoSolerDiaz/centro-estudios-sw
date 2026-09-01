/**
 * Comprobaciones estáticas de `db/007_rpc_buscar_alumnos.sql` (T-20), sin credenciales ni red —
 * mismo patrón que `rpcRegistrarAsistencia.test.ts`: no sustituye al barrido en vivo que ejecuta el
 * dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el momento de escribir el script
 * la misma clase de descuido que ya causó el incidente de `000b_arreglo_permisos.sql`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_007 = fileURLToPath(new URL('../../db/007_rpc_buscar_alumnos.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_007, 'utf8');

void test('007_rpc_buscar_alumnos.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('buscar_alumnos_activos es SECURITY DEFINER', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.buscar_alumnos_activos[\s\S]*?security\s+definer/i);
});

void test('buscar_alumnos_activos se concede exactamente a authenticated, nunca a anon', () => {
  const coincidencia = /grant\s+execute\s+on\s+function\s+public\.buscar_alumnos_activos\([^)]*\)\s+to\s+([a-z_,\s]+);/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra el GRANT EXECUTE de buscar_alumnos_activos');
  const roles = coincidencia[1];
  assert.ok(roles, 'el GRANT no captura la lista de roles');
  assert.match(roles, /\bauthenticated\b/i);
  assert.doesNotMatch(roles, /\banon\b/i);
});

void test('rechaza a cualquiera que no sea administrator ni teacher, con el mismo mensaje que exige db/pruebas_rls.sql', () => {
  assert.match(CONTENIDO, /if\s+not\s*\(\s*public\.es_teacher\(\)\s+or\s+public\.es_administrator\(\)\s*\)\s+then/i);
  assert.match(CONTENIDO, /solo administrator o teacher pueden buscar alumnos/i);
});

void test('el tipo de retorno solo trae columnas de identificación y el nombre del centro: nunca contacto, avatar ni personas de referencia', () => {
  const firma = /returns\s+table\s*\(([\s\S]*?)\)\s*\nlanguage/i.exec(CONTENIDO);
  assert.ok(firma, 'no se encuentra la firma "returns table (...)" de buscar_alumnos_activos');
  const columnas = firma[1];
  assert.ok(columnas);
  assert.match(columnas, /\bid\b/i);
  assert.match(columnas, /\bnombre\b/i);
  assert.match(columnas, /\bcentro_nombre\b/i);
  assert.doesNotMatch(columnas, /email_alumno|telefono_alumno|avatar_ruta|persona/i);
});

void test('filtra por a.activo y no consulta nada con texto vacío', () => {
  assert.match(CONTENIDO, /where\s+a\.activo/i);
  assert.match(CONTENIDO, /if\s+p_texto\s+is\s+null\s+or\s+btrim\(p_texto\)\s*=\s*''\s+then\s*\n\s*return;/i);
});

void test('el patrón de búsqueda se construye con un bind parameter (v_patron), nunca interpolando p_texto directo en el SQL', () => {
  assert.match(CONTENIDO, /v_patron\s*:=\s*'%'\s*\|\|\s*btrim\(p_texto\)\s*\|\|\s*'%'/i);
  assert.doesNotMatch(CONTENIDO, /execute\s+format/i);
});

void test('el límite de resultados queda acotado en servidor entre 1 y 20, defensa en profundidad además del cliente', () => {
  assert.match(CONTENIDO, /limit\s+least\(greatest\(coalesce\(p_limite,\s*8\),\s*1\),\s*20\)/i);
});

void test('no recrea la tabla alumno ni centro_estudios: solo añade la función', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.(alumno|centro_estudios)\b/i);
});
