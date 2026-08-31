/**
 * Comprobaciones estáticas de `db/005_rpc_registrar_asistencia.sql` (T-18), sin credenciales ni
 * red — mismo patrón que `bloqueoCuenta.test.ts`/`bucketAvatares.test.ts`: no sustituye al barrido
 * en vivo que ejecuta el dueño (`npm run migrate` + `npm run probar-rls`), pero atrapa en el
 * momento de escribir el script la misma clase de descuido que ya causó el incidente de
 * `000b_arreglo_permisos.sql` (un privilegio de más concedido por defecto).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_005 = fileURLToPath(new URL('../../db/005_rpc_registrar_asistencia.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_005, 'utf8');

void test('005_rpc_registrar_asistencia.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('limite_tasa nace con RLS habilitada y sin ningún privilegio para anon/authenticated/service_role', () => {
  assert.match(CONTENIDO, /alter\s+table\s+public\.limite_tasa\s+enable\s+row\s+level\s+security/i);
  assert.match(CONTENIDO, /revoke\s+all\s+on\s+public\.limite_tasa\s+from\s+anon,\s*authenticated,\s*service_role/i);
});

void test('limite_tasa no recibe ningún GRANT explícito (solo la alcanza aplicar_limite_tasa, SECURITY DEFINER)', () => {
  assert.doesNotMatch(CONTENIDO, /grant\s+[\s\S]*?\son\s+(?:public\.)?limite_tasa\s+to/i);
});

void test('ningún GRANT del script concede TRUNCATE, REFERENCES ni TRIGGER a anon o authenticated', () => {
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

void test('registrar_asistencia y aplicar_limite_tasa son SECURITY DEFINER', () => {
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.registrar_asistencia[\s\S]*?security\s+definer/i);
  assert.match(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.aplicar_limite_tasa[\s\S]*?security\s+definer/i);
});

void test('aplicar_limite_tasa no se concede a ningún rol (solo la llaman otras funciones SECURITY DEFINER)', () => {
  assert.doesNotMatch(CONTENIDO, /grant\s+execute\s+on\s+function\s+public\.aplicar_limite_tasa/i);
  assert.match(CONTENIDO, /revoke\s+all\s+on\s+function\s+public\.aplicar_limite_tasa/i);
});

void test('registrar_asistencia se concede exactamente a authenticated, nunca a anon', () => {
  const coincidencia = /grant\s+execute\s+on\s+function\s+public\.registrar_asistencia\([^)]*\)\s+to\s+([a-z_,\s]+);/i.exec(
    CONTENIDO,
  );
  assert.ok(coincidencia, 'no se encuentra el GRANT EXECUTE de registrar_asistencia');
  const roles = coincidencia[1];
  assert.ok(roles, 'el GRANT no captura la lista de roles');
  assert.match(roles, /\bauthenticated\b/i);
  assert.doesNotMatch(roles, /\banon\b/i);
});

void test('la función no declara ningún parámetro p_registrado_en/p_profesor_id-inmutable: el cliente no puede enviar la hora de creación', () => {
  const firma = /create\s+or\s+replace\s+function\s+public\.registrar_asistencia\s*\(([\s\S]*?)\)\s*\n?returns/i.exec(
    CONTENIDO,
  );
  assert.ok(firma, 'no se encuentra la firma de registrar_asistencia');
  const parametros = firma[1];
  assert.ok(parametros);
  assert.doesNotMatch(parametros, /\bp_registrado_en\b/i);
  assert.doesNotMatch(parametros, /\bp_es_retroactivo\b/i);
});

void test('el INSERT de asistencia nunca incluye actualizado_en/actualizado_por: los fija solo el trigger de UPDATE (T-21)', () => {
  const coincidencia = /insert\s+into\s+public\.asistencia\s*\(([\s\S]*?)\)/i.exec(CONTENIDO);
  assert.ok(coincidencia, 'no se encuentra el INSERT sobre asistencia');
  const columnas = coincidencia[1];
  assert.ok(columnas);
  assert.doesNotMatch(columnas, /\bactualizado_en\b/i);
  assert.doesNotMatch(columnas, /\bactualizado_por\b/i);
});

void test('registrado_en se inserta desde v_registrado_en (calculado por el servidor), nunca desde un parámetro del cliente', () => {
  assert.match(CONTENIDO, /v_registrado_en\s+timestamptz\s*:=\s*now\(\)/i);
  const valores = /values\s*\(([\s\S]*?)\)\s*\n\s*returning/i.exec(CONTENIDO);
  assert.ok(valores, 'no se encuentra la lista VALUES del INSERT sobre asistencia');
  const listaValores = valores[1];
  assert.ok(listaValores, 'el INSERT no captura la lista de valores');
  assert.match(listaValores, /v_registrado_en/);
  assert.doesNotMatch(listaValores, /\bp_registrado_en\b/i);
});

void test('la fórmula de es_retroactivo usa el margen de 300 segundos, igual que el CHECK ya aplicado de 001', () => {
  assert.match(CONTENIDO, /abs\(extract\(epoch\s+from\s+\(v_ocurrido_en\s*-\s*v_registrado_en\)\)\)\s*>\s*300/i);
});

void test('existe el índice único parcial de duplicado alumno+slot+día, acotado a estado=valida y slot_id no nulo', () => {
  assert.match(CONTENIDO, /create\s+unique\s+index[\s\S]*?asistencia_uq_alumno_slot_dia_valida/i);
  assert.match(CONTENIDO, /where\s+estado\s*=\s*'valida'\s+and\s+slot_id\s+is\s+not\s+null/i);
});

void test('no recrea la tabla asistencia ni sus columnas: solo añade el índice, la tabla limite_tasa y las funciones', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.asistencia\b/i);
});
