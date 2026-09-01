/**
 * Comprobaciones estáticas de `db/006_arreglo_limite_tasa_ambiguo.sql`, sin credenciales ni red —
 * mismo patrón que `rpcRegistrarAsistencia.test.ts`.
 *
 * El test que importa es el de las referencias cualificadas: es la regresión exacta que rompió
 * `005` en `dev` (`column reference "ventana_inicio" is ambiguous`, 2026-09-01). Dentro de un
 * `INSERT ... ON CONFLICT ... DO UPDATE` la tabla destino y `excluded` están las dos en ámbito, así
 * que toda lectura de la fila existente tiene que ir cualificada. No sustituye al barrido en vivo
 * (`npm run migrate` + `npm run probar-rls`, que ejecuta el dueño), pero sí lo habría atrapado
 * antes de pedirle una migración.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { quitarComentariosSql, validarContenidoMigracion } from './guardas.ts';

const RUTA_006 = fileURLToPath(new URL('../../db/006_arreglo_limite_tasa_ambiguo.sql', import.meta.url));
const RUTA_005 = fileURLToPath(new URL('../../db/005_rpc_registrar_asistencia.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA_006, 'utf8');
const SIN_COMENTARIOS = quitarComentariosSql(CONTENIDO);

/** Firma de `aplicar_limite_tasa` tal y como la declara un script, normalizada de espacios. */
function firmaAplicarLimiteTasa(sql: string): string {
  const coincidencia =
    /create\s+or\s+replace\s+function\s+public\.aplicar_limite_tasa\s*\(([\s\S]*?)\)\s*returns\s+void/i.exec(sql);
  assert.ok(coincidencia, 'no se encuentra la firma de aplicar_limite_tasa');
  const parametros = coincidencia[1];
  assert.ok(parametros, 'la firma no captura la lista de parámetros');
  return parametros.replace(/\s+/g, ' ').trim();
}

void test('006_arreglo_limite_tasa_ambiguo.sql no dispara ninguna guarda de contenido del runner', () => {
  assert.deepEqual(validarContenidoMigracion(CONTENIDO), []);
});

void test('el ON CONFLICT DO UPDATE lee la fila existente siempre cualificada: ninguna referencia ambigua', () => {
  const bloque = /on\s+conflict[\s\S]*?returning/i.exec(SIN_COMENTARIOS);
  assert.ok(bloque, 'no se encuentra el bloque ON CONFLICT ... RETURNING');
  const sql = bloque[0];

  // Quita lo que SÍ es legítimo: las lecturas cualificadas y los dos destinos del SET (que van
  // sin cualificar por obligación de la sintaxis de PostgreSQL). Lo que quede sin cualificar es
  // una referencia ambigua entre `limite_tasa` y `excluded`.
  const restante = sql
    .replace(/limite_tasa\.(?:ventana_inicio|contador)\b/gi, '<<cualificada>>')
    .replace(/\bset\s+contador\s*=/i, '<<destino>>')
    .replace(/,\s*ventana_inicio\s*=/i, '<<destino>>');

  assert.doesNotMatch(restante, /\bventana_inicio\b/i);
  assert.doesNotMatch(restante, /\bcontador\b/i);
});

void test('las cuatro lecturas de la fila previa están cualificadas con limite_tasa.', () => {
  const cualificadas = SIN_COMENTARIOS.match(/limite_tasa\.(?:ventana_inicio|contador)\b/gi) ?? [];
  assert.equal(cualificadas.length, 4);
});

void test('la firma de aplicar_limite_tasa es exactamente la misma que la de 005: es un reemplazo, no una sobrecarga', () => {
  const contenido005 = readFileSync(RUTA_005, 'utf8');
  assert.equal(firmaAplicarLimiteTasa(SIN_COMENTARIOS), firmaAplicarLimiteTasa(quitarComentariosSql(contenido005)));
});

void test('sigue siendo SECURITY DEFINER con search_path fijado', () => {
  assert.match(
    SIN_COMENTARIOS,
    /create\s+or\s+replace\s+function\s+public\.aplicar_limite_tasa[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public/i,
  );
});

void test('conserva el errcode PT429 del límite alcanzado', () => {
  assert.match(SIN_COMENTARIOS, /using\s+errcode\s*=\s*'PT429'/i);
});

void test('aplicar_limite_tasa sigue sin concederse a ningún rol', () => {
  assert.doesNotMatch(SIN_COMENTARIOS, /grant\s+execute\s+on\s+function\s+public\.aplicar_limite_tasa/i);
  assert.match(SIN_COMENTARIOS, /revoke\s+all\s+on\s+function\s+public\.aplicar_limite_tasa/i);
});

void test('el arreglo no toca nada más: ni recrea limite_tasa, ni redefine registrar_asistencia, ni toca políticas', () => {
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+table\b/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /alter\s+table\b/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+or\s+replace\s+function\s+public\.registrar_asistencia/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /\bpolicy\b/i);
  assert.doesNotMatch(SIN_COMENTARIOS, /create\s+(?:unique\s+)?index\b/i);
});
