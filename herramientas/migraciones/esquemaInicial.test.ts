/**
 * Comprobaciones estáticas de `db/001_esquema_inicial.sql` (T-07), sin credenciales ni red: la
 * versión hermética del barrido de privilegios de `verificarPrivilegios.ts` (punto 20b) y de los
 * requisitos de RLS/triggers/revocaciones de la propia spec de T-07. No sustituye al barrido en vivo
 * contra `information_schema.role_table_grants` (eso lo ejecuta el dueño), pero atrapa en el momento
 * de escribir el script exactamente la misma clase de descuido.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarContenidoMigracion } from './guardas.ts';

const RUTA_001 = fileURLToPath(new URL('../../db/001_esquema_inicial.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_001, 'utf8');

function tablasCreadas(sql: string): string[] {
  const nombres: string[] = [];
  for (const coincidencia of sql.matchAll(/create\s+table\s+public\.([a-z0-9_]+)/gi)) {
    const nombre = coincidencia[1];
    if (nombre) {
      nombres.push(nombre);
    }
  }
  return nombres;
}

void test('001_esquema_inicial.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('crea al menos las siete tablas nuevas que exige la spec de T-07', () => {
  const tablas = tablasCreadas(CONTENIDO);
  for (const esperada of [
    'centro_estudios',
    'alumno',
    'persona_referencia',
    'slot_horario',
    'asistencia',
    'asistencia_historial',
    'evento_error',
  ]) {
    assert.ok(tablas.includes(esperada), `falta la tabla ${esperada}`);
  }
});

void test('toda tabla creada por el script tiene enable row level security', () => {
  for (const tabla of tablasCreadas(CONTENIDO)) {
    const patron = new RegExp(`alter\\s+table\\s+public\\.${tabla}\\s+enable\\s+row\\s+level\\s+security`, 'i');
    assert.ok(patron.test(CONTENIDO), `${tabla} no tiene "enable row level security"`);
  }
});

void test('toda tabla creada revoca privilegios por defecto explícitamente (anon, authenticated, service_role)', () => {
  for (const tabla of tablasCreadas(CONTENIDO)) {
    const patron = new RegExp(
      `revoke\\s+all\\s+on\\s+public\\.${tabla}\\s+from\\s+anon,\\s*authenticated,\\s*service_role`,
      'i',
    );
    assert.ok(patron.test(CONTENIDO), `${tabla} no revoca privilegios por defecto explícitamente`);
  }
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

void test('ningún GRANT del script da a anon o authenticated acceso directo a asistencia ni a asistencia_historial', () => {
  const sospechosos = CONTENIDO.split(';').filter((sentencia) => {
    const trimmed = sentencia.trim();
    if (!/^grant\b/i.test(trimmed)) {
      return false;
    }
    const mencionaTabla = /\basistencia(_historial)?\b/i.test(trimmed);
    const mencionaRolProhibido = /\b(anon|authenticated)\b/i.test(trimmed);
    return mencionaTabla && mencionaRolProhibido;
  });
  assert.deepEqual(sospechosos, []);
});

void test('asistencia tiene el trigger BEFORE UPDATE de inmutabilidad y el AFTER UPDATE de historial', () => {
  assert.match(CONTENIDO, /create\s+trigger\s+asistencia_before_update\s+before\s+update\s+on\s+public\.asistencia/i);
  assert.match(CONTENIDO, /create\s+trigger\s+asistencia_after_update\s+after\s+update\s+on\s+public\.asistencia/i);
});

void test('la RPC registrar_evento_error sigue el contrato fijado por T-05 (p_origen/p_mensaje/p_pila/p_contexto)', () => {
  assert.match(
    CONTENIDO,
    /create\s+or\s+replace\s+function\s+public\.registrar_evento_error\s*\(\s*p_origen\s+text,\s*p_mensaje\s+text,\s*p_pila\s+text\s+default\s+null,\s*p_contexto\s+jsonb\s+default\s+null\s*\)/i,
  );
});

void test('el script no recrea perfil, esquema_migracion ni las funciones de rol del bootstrap', () => {
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.perfil\b/i);
  assert.doesNotMatch(CONTENIDO, /create\s+table\s+public\.esquema_migracion\b/i);
  assert.doesNotMatch(CONTENIDO, /create\s+or\s+replace\s+function\s+public\.es_administrator\b/i);
});
