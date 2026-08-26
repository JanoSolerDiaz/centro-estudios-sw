/**
 * Guardia estática (T-03): falla si aparece una lectura directa de la hora del sistema
 * (`new Date()` / `Date.now()`) en `src/dominio/`. El dominio recibe siempre un `Reloj` inyectado
 * (`src/nucleo/reloj.ts`); `new Date(...)` con argumentos (construir una fecha a partir de un
 * valor conocido, como en los propios tests) no cuenta como lectura del reloj y no se prohíbe.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PATRON_LECTURA_RELOJ_SISTEMA = /\bnew\s+Date\s*\(\s*\)|\bDate\.now\s*\(/;

async function listarFicherosDeDominio(directorio: string): Promise<string[]> {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const ficheros: string[] = [];
  for (const entrada of entradas) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      ficheros.push(...(await listarFicherosDeDominio(ruta)));
    } else if (entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts')) {
      ficheros.push(ruta);
    }
  }
  return ficheros;
}

void test('ninguna función de src/dominio/ lee la hora del sistema directamente: reciben un Reloj inyectado', async () => {
  const directorioDominio = import.meta.dirname;
  const ficheros = await listarFicherosDeDominio(directorioDominio);

  assert.ok(ficheros.length > 0, 'no se encontró ningún fichero de dominio que comprobar');

  for (const fichero of ficheros) {
    const contenido = await readFile(fichero, 'utf8');
    assert.equal(
      PATRON_LECTURA_RELOJ_SISTEMA.test(contenido),
      false,
      `${fichero} lee la hora del sistema directamente (new Date() / Date.now()): debe recibir un Reloj inyectado (src/nucleo/reloj.ts).`,
    );
  }
});
