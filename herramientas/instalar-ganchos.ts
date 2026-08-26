/**
 * Instala el hook de pre-commit en el checkout local. Se ejecuta solo (script `prepare` de
 * `package.json`) tras `npm install`. No usa `git config` ni toca el repositorio compartido: se
 * limita a copiar un fichero versionado a `.git/hooks/pre-commit`, que nunca se commitea.
 */
import { chmodSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepo = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raizRepo, 'herramientas', 'git-hooks', 'pre-commit');
const directorioGit = join(raizRepo, '.git');

if (!existsSync(directorioGit) || !statSync(directorioGit).isDirectory()) {
  // No es un checkout de git normal (p. ej. paquete instalado como dependencia, o worktree con
  // `.git` como fichero). No hay nada que instalar; no es un error.
  console.log('instalar-ganchos: no hay .git/ como directorio, se omite la instalación del hook.');
  process.exit(0);
}

const destino = join(directorioGit, 'hooks', 'pre-commit');
copyFileSync(origen, destino);
chmodSync(destino, 0o755);
console.log(`instalar-ganchos: hook de pre-commit instalado en ${destino}`);
