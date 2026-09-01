/**
 * Contrasta el hash que `db/APLICADAS.md` documenta para cada migración contra el fichero real en
 * disco. Sin credenciales ni red.
 *
 * Guarda contra una clase de fallo que ya mordió una vez (2026-09-01): el runner guarda en
 * `esquema_migracion` el SHA-256 del fichero TAL CUAL está en el disco, y los finales de línea
 * entran en ese hash. Si un checkout los reescribe —`core.autocrlf`, un clon en otra máquina—, el
 * hash de una migración que no ha cambiado ni una letra deja de coincidir y `planificar()` aborta
 * con `ErrorHashCambiado`, bloqueando además cualquier migración nueva. `.gitattributes` clava los
 * finales de línea; este test comprueba que siguen clavados.
 *
 * Lo que este test NO puede comprobar es que el valor documentado sea el que de verdad hay en el
 * ledger remoto: eso solo lo dice `npm run migrate -- --estado`, que necesita el token de la
 * Management API (§0.1) y por tanto lo ejecuta el dueño, no el agente. Lo que sí garantiza es que
 * `APLICADAS.md` y el disco no se separen en silencio entre una ejecución y la siguiente.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { calcularHash } from './hash.ts';
import { leerMigracionesDisco } from './archivosMigracion.ts';

const DIRECTORIO_DB = fileURLToPath(new URL('../../db', import.meta.url));
const RUTA_APLICADAS = join(DIRECTORIO_DB, 'APLICADAS.md');

interface FilaAplicada {
  readonly numero: string;
  readonly fichero: string;
  readonly hashCorto: string;
}

/** Extrae de `APLICADAS.md` las filas que declaran un hash. Ignora las de arranque manual
 * (`000`/`000b`), que no pasan por el runner y no tienen columna de hash rellena. */
function leerFilasDocumentadas(): FilaAplicada[] {
  const filas: FilaAplicada[] = [];
  for (const linea of readFileSync(RUTA_APLICADAS, 'utf8').split('\n')) {
    if (!linea.startsWith('| 0')) {
      continue;
    }
    const celdas = linea.split('|').map((celda) => celda.trim());
    const numero = celdas[1];
    const fichero = celdas[2];
    const hash = celdas[5];
    if (numero === undefined || fichero === undefined || hash === undefined) {
      continue;
    }
    const hashCorto = /^`([0-9a-f]{12})`$/.exec(hash)?.[1];
    if (hashCorto === undefined) {
      continue; // fila sin hash: arranque manual
    }
    filas.push({ numero, fichero: fichero.replace(/`/g, ''), hashCorto });
  }
  return filas;
}

void test('APLICADAS.md documenta al menos las migraciones aplicadas hasta hoy', () => {
  const filas = leerFilasDocumentadas();
  assert.ok(filas.length >= 6, `solo se han leído ${String(filas.length)} filas con hash de APLICADAS.md`);
});

void test('el hash documentado de cada migración coincide con el fichero en disco (guarda de finales de línea)', () => {
  for (const fila of leerFilasDocumentadas()) {
    const contenido = readFileSync(join(DIRECTORIO_DB, fila.fichero), 'utf8');
    assert.equal(
      calcularHash(contenido).slice(0, 12),
      fila.hashCorto,
      `${fila.fichero}: APLICADAS.md dice ${fila.hashCorto} y el fichero en disco da ` +
        `${calcularHash(contenido).slice(0, 12)}. Casi siempre es que un checkout le ha cambiado los ` +
        'finales de línea (ver .gitattributes): el SQL puede ser idéntico y aun así el runner lo ' +
        'rechazaría con ErrorHashCambiado. NO actualices el número de APLICADAS.md sin comprobar ' +
        'antes contra `npm run migrate -- --estado`, que es el hash que de verdad hay en el ledger.',
    );
  }
});

void test('toda migración del runner en db/ tiene su fila con hash en APLICADAS.md', () => {
  const documentadas = new Set(leerFilasDocumentadas().map((fila) => fila.fichero));
  const enDisco = leerMigracionesDisco(DIRECTORIO_DB).map((migracion) => `${migracion.nombre}.sql`);
  const sinDocumentar = enDisco.filter((nombre) => !documentadas.has(nombre));
  assert.deepEqual(
    sinDocumentar,
    [],
    'hay migraciones en db/ sin fila en APLICADAS.md. Si acabas de escribir una y todavía no está ' +
      'aplicada, anótala como pendiente FUERA de la tabla (nota al pie), no con una fila de hash.',
  );
});
