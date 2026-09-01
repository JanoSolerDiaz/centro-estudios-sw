/**
 * Comprobaciones estáticas de `db/pruebas_rls.sql` (P-10), sin credenciales ni red.
 *
 * La batería de RLS solo la ejecuta el dueño (`npm run probar-rls` necesita el token de la
 * Management API, §0.1), así que el agente escribe ese fichero a ciegas. Estos tests son lo único
 * que lo mira antes de pedirle una ejecución, y cubren las tres formas en que ya se ha roto:
 *
 *   1. Un bloque `exception when others` que aprueba con CUALQUIER error (P-10). El 2026-09-01 un
 *      bug de `aplicar_limite_tasa()` tumbó trece comprobaciones y nueve cantaron `[OK]`, porque
 *      `column reference is ambiguous` también es un error.
 *   2. `select f(...) into v_fila` sobre una función que devuelve una fila compuesta: mete la fila
 *      entera en el primer campo en vez de repartir sus columnas (`invalid input syntax for type
 *      uuid`). Hay que expandirla con `select * into v_fila from f(...)`.
 *   3. Un delimitador `$$` de plpgsql degradado a `$`, que rompe el fichero entero al parsear.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RUTA = fileURLToPath(new URL('../../db/pruebas_rls.sql', import.meta.url));
const CONTENIDO = readFileSync(RUTA, 'utf8');
const LINEAS = CONTENIDO.split('\n');

void test('ningún bloque "debe fallar" aprueba con cualquier error: todos declaran el motivo esperado', () => {
  const perezosos = LINEAS.map((linea, indice) => ({ linea: linea.trim(), numero: indice + 1 }))
    .filter(({ linea }) => linea.includes("'prohibido', true, sqlerrm"))
    .map(({ numero, linea }) => `${String(numero)}: ${linea}`);
  assert.deepEqual(
    perezosos,
    [],
    'estos bloques registran el rechazo como correcto sin mirar sqlerrm. Usa ' +
      'pg_temp.registrar_prohibido(celda, array[...patrones ILIKE...], sqlerrm).',
  );
});

void test('registrar_prohibido está definido una sola vez y toda llamada le pasa patrones', () => {
  const definiciones = CONTENIDO.match(/function pg_temp\.registrar_prohibido/g) ?? [];
  assert.equal(definiciones.length, 1);

  const llamadasSinPatron = LINEAS.map((linea, indice) => ({ linea: linea.trim(), numero: indice + 1 }))
    .filter(({ linea }) => linea.includes('pg_temp.registrar_prohibido('))
    .filter(({ linea }) => !linea.startsWith('create or replace function')) // la propia definición
    .filter(({ linea }) => !/array\[\s*'%/.test(linea))
    .map(({ numero, linea }) => `${String(numero)}: ${linea}`);
  assert.deepEqual(llamadasSinPatron, [], 'hay llamadas a registrar_prohibido sin una lista array[\'%…%\'] de motivos');
});

void test('las comprobaciones que leen la fila devuelta por una RPC expanden sus columnas', () => {
  // `select public.registrar_asistencia(...) into v_fila` asigna la fila COMPUESTA al primer campo
  // del rowtype (un uuid) y revienta con "invalid input syntax for type uuid".
  assert.doesNotMatch(
    CONTENIDO,
    /select\s+public\.registrar_asistencia\(/i,
    'usa `select * into v_fila from public.registrar_asistencia(...)`, no `select public.registrar_asistencia(...) into v_fila`',
  );
  // 4 de la sección 7b (T-18) + 2 de la sección 8c (T-21: los dos registros 'manual' de partida que
  // luego se editan con actualizar_asistencia).
  assert.equal((CONTENIDO.match(/select \* into v_fila from public\.registrar_asistencia\(/g) ?? []).length, 6);

  assert.doesNotMatch(
    CONTENIDO,
    /select\s+public\.actualizar_asistencia\(/i,
    'usa `select * into v_fila from public.actualizar_asistencia(...)`, no `select public.actualizar_asistencia(...) into v_fila`',
  );
  // Sección 8c (T-21): anular con motivo, teacher2 editor rechazado no cuenta (no llega a SELECT),
  // administrator edita lo de otro, cambiar alumno, cambiar el slot atribuido, administrator sin
  // límite de ventana — seis usos reales de la fila devuelta.
  assert.equal((CONTENIDO.match(/select \* into v_fila from public\.actualizar_asistencia\(/g) ?? []).length, 6);
});

void test('los delimitadores $$ de plpgsql están intactos y emparejados', () => {
  const dobles = (CONTENIDO.match(/\$\$/g) ?? []).length;
  assert.equal(dobles % 2, 0, `hay ${String(dobles)} delimitadores $$: un número impar deja una función sin cerrar`);
  assert.doesNotMatch(
    CONTENIDO,
    /as \$(?!\$)/,
    'hay un cuerpo de función abierto con `as $` en vez de `as $$` (típico de una sustitución de texto que se comió un $)',
  );
});
