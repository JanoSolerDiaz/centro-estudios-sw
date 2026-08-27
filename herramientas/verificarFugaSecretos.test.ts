/**
 * Test de fuga de secretos (T-07, punto 23 de HOJA_DE_RUTA.md): construye `dist/` de verdad
 * (`tsc -b tsconfig.build.json`, sin red ni credenciales — solo compila TypeScript) y falla si el
 * paquete que se sirve al navegador contiene el nombre de un secreto de servidor o una cadena con
 * forma de token/JWT. No hay bundler que inline variables de entorno (§0.2): el único modo realista
 * de que un secreto llegue aquí es que alguien lo escriba literalmente en el código fuente.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_REPO = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(RAIZ_REPO, 'dist');

const PATRON_JWT = /[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

const NOMBRES_SECRETOS_PROHIBIDOS = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'service_role',
  'PERMITIR_PROD',
];

function listarFicheros(directorio: string): string[] {
  const resultado: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) {
      resultado.push(...listarFicheros(ruta));
    } else {
      resultado.push(ruta);
    }
  }
  return resultado;
}

void test('npm run build no filtra secretos de servidor al paquete servido al navegador', () => {
  // Se invoca el ejecutable JS de TypeScript con el propio Node (`process.execPath`) en vez de
  // `node_modules/.bin/tsc`: ese shim sin extensión es un script de shell que `execFileSync` no
  // puede lanzar en Windows (ENOENT), donde el ejecutable real es `tsc.cmd`. Así el test es
  // portable y no depende del shell del sistema.
  execFileSync(process.execPath, [join(RAIZ_REPO, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', 'tsconfig.build.json'], {
    cwd: RAIZ_REPO,
    stdio: 'pipe',
  });

  const ficherosJs = listarFicheros(DIST).filter((ruta) => ruta.endsWith('.js'));
  assert.ok(ficherosJs.length > 0, 'el build no generó ningún .js: no hay nada que comprobar, algo va mal');

  for (const fichero of ficherosJs) {
    const contenido = readFileSync(fichero, 'utf8');
    for (const nombreProhibido of NOMBRES_SECRETOS_PROHIBIDOS) {
      assert.ok(
        !contenido.includes(nombreProhibido),
        `${fichero} menciona "${nombreProhibido}": el paquete del cliente no debe referenciar ningún secreto de servidor`,
      );
    }
    assert.equal(
      PATRON_JWT.exec(contenido),
      null,
      `${fichero} contiene una cadena con forma de JWT: posible secreto hardcodeado`,
    );
  }
});
