import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUTA_ENV_LOCAL, cargarEnvLocal, nombresEnEnvFile } from './cargarEnvLocal.ts';

const CR = String.fromCharCode(13);

/** Ejecuta `usar` con un `.env.local` de mentira en un directorio temporal. `contenido: null`
 * significa "no crees el fichero", que es el caso del CI (donde no hay `.env.local`). */
function conEnvTemporal(contenido: string | null, usar: (ruta: string) => void): void {
  const directorio = mkdtempSync(join(tmpdir(), 'gestoracademia-env-'));
  const ruta = join(directorio, '.env.local');
  try {
    if (contenido !== null) {
      writeFileSync(ruta, contenido);
    }
    usar(ruta);
  } finally {
    rmSync(directorio, { recursive: true, force: true });
    delete process.env.GESTORACADEMIA_PRUEBA_A;
    delete process.env.GESTORACADEMIA_PRUEBA_B;
  }
}

void test('cargarEnvLocal mete en process.env las variables del fichero', () => {
  conEnvTemporal('GESTORACADEMIA_PRUEBA_A=valor-del-fichero\n', (ruta) => {
    assert.equal(process.env.GESTORACADEMIA_PRUEBA_A, undefined);
    const resultado = cargarEnvLocal(ruta);
    assert.equal(process.env.GESTORACADEMIA_PRUEBA_A, 'valor-del-fichero');
    assert.equal(resultado.cargado, true);
    assert.equal(resultado.ruta, ruta);
    assert.deepEqual(resultado.variables, ['GESTORACADEMIA_PRUEBA_A']);
  });
});

void test('cargarEnvLocal no pisa una variable que ya viene del entorno (los secretos del CI ganan)', () => {
  conEnvTemporal('GESTORACADEMIA_PRUEBA_A=valor-del-fichero\n', (ruta) => {
    process.env.GESTORACADEMIA_PRUEBA_A = 'valor-del-entorno';
    cargarEnvLocal(ruta);
    assert.equal(process.env.GESTORACADEMIA_PRUEBA_A, 'valor-del-entorno');
  });
});

void test('cargarEnvLocal no falla si no existe .env.local: lo reporta como no cargado', () => {
  conEnvTemporal(null, (ruta) => {
    const resultado = cargarEnvLocal(ruta);
    assert.equal(resultado.cargado, false);
    assert.deepEqual(resultado.variables, []);
    assert.equal(resultado.ruta, ruta);
  });
});

void test('cargarEnvLocal tolera los finales de línea CRLF de Windows sin colar el CR en el valor', () => {
  conEnvTemporal(`GESTORACADEMIA_PRUEBA_A=sbp_token${CR}\n${CR}\nGESTORACADEMIA_PRUEBA_B=ref${CR}\n`, (ruta) => {
    const resultado = cargarEnvLocal(ruta);
    assert.equal(process.env.GESTORACADEMIA_PRUEBA_A, 'sbp_token');
    assert.equal(process.env.GESTORACADEMIA_PRUEBA_B, 'ref');
    assert.deepEqual(resultado.variables, ['GESTORACADEMIA_PRUEBA_A', 'GESTORACADEMIA_PRUEBA_B']);
  });
});

void test('nombresEnEnvFile lista los nombres declarados, ignorando comentarios y líneas en blanco', () => {
  const contenido = `# comentario\nSUPABASE_ACCESS_TOKEN=x\n\n   # otro comentario\nSUPABASE_URL_DEV=y${CR}\n`;
  assert.deepEqual(nombresEnEnvFile(contenido), ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_URL_DEV']);
});

void test('nombresEnEnvFile no devuelve nunca valores, solo nombres', () => {
  assert.deepEqual(nombresEnEnvFile('SUPABASE_ACCESS_TOKEN=sbp_secreto_que_no_debe_aparecer\n'), [
    'SUPABASE_ACCESS_TOKEN',
  ]);
});

void test('RUTA_ENV_LOCAL apunta a .env.local en la raíz del repositorio, no al directorio de trabajo', () => {
  const raizRepositorio = dirname(dirname(fileURLToPath(import.meta.url)));
  assert.equal(RUTA_ENV_LOCAL, join(raizRepositorio, '.env.local'));
});
