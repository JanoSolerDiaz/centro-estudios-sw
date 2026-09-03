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

/**
 * P-16: toda variable `v_…` que se lea tiene que estar declarada en un ámbito que la contenga.
 *
 * En plpgsql un `declare` pertenece al `begin … end;` que lo sigue, y nada más: un segundo
 * `begin … end;` HERMANO ya no ve esas variables. La sección 8e las declaraba en el primer
 * sub-bloque (el del SELECT) y las leía en el segundo (el del UPDATE), así que el `do` entero
 * fallaba al compilar con «"v_filas" is not a known variable» — y como es un error de compilación
 * y el fichero se envía en una sola sentencia, tumbaba la batería COMPLETA, no solo su sección.
 *
 * El seguimiento de ámbitos es deliberadamente literal: sirve porque el fichero se escribe con
 * un `declare`/`begin`/`end;` por línea. Si eso deja de ser cierto, este test avisará con falsos
 * positivos antes de dejar pasar un falso negativo.
 */
void test('ninguna variable v_ se lee fuera del ámbito que la declara', () => {
  const sinComentario = (linea: string): string => {
    let enCadena = false;
    for (let i = 0; i < linea.length; i += 1) {
      if (linea[i] === "'") enCadena = !enCadena;
      else if (!enCadena && linea[i] === '-' && linea[i + 1] === '-') return linea.slice(0, i);
    }
    return linea;
  };

  const ambitos: Set<string>[] = [];
  let declarando: Set<string> | null = null;
  const fueraDeAmbito: string[] = [];

  LINEAS.forEach((cruda, indice) => {
    const linea = sinComentario(cruda).trim();
    if (linea === '') return;
    const nombreDeclarado = (texto: string): string | null =>
      /^([a-z_][a-z0-9_]*)\s+\S/i.exec(texto)?.[1] ?? null;

    if (declarando !== null) {
      if (/^begin\b/i.test(linea)) {
        ambitos.push(declarando);
        declarando = null;
        return;
      }
      const nombre = nombreDeclarado(linea);
      if (nombre !== null) declarando.add(nombre);
      return; // las propias declaraciones no se comprueban
    }

    if (/^declare\b/i.test(linea)) {
      declarando = new Set();
      const resto = linea.replace(/^declare\b/i, '').trim();
      const nombre = resto === '' ? null : nombreDeclarado(resto);
      if (nombre !== null) declarando.add(nombre);
      return;
    }
    // `begin;` a secas es la transacción del fichero (línea 42), no un bloque plpgsql.
    if (/^begin\b(?!\s*;)/i.test(linea)) {
      ambitos.push(new Set());
      return;
    }
    if (/^end\s*(\$\$)?\s*;/i.test(linea)) {
      ambitos.pop(); // `end if;` y `end loop;` no cierran ámbito y no encajan aquí
      return;
    }

    for (const referencia of linea.match(/\bv_[a-z0-9_]*/gi) ?? []) {
      if (!ambitos.some((ambito) => ambito.has(referencia))) {
        fueraDeAmbito.push(`${String(indice + 1)}: ${referencia} — ${linea}`);
      }
    }
  });

  assert.deepEqual(ambitos, [], 'quedaron bloques begin sin su end;: el seguimiento de ámbitos no cuadra');
  assert.deepEqual(
    fueraDeAmbito,
    [],
    'estas variables se leen desde un bloque que no las declara ni está dentro del que lo hace. ' +
      'Declara la variable en el `declare` del bloque que la usa, o súbela al `declare` del `do` ' +
      'que contiene a los dos.',
  );
});
