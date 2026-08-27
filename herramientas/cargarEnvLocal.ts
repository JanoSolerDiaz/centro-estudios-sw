/**
 * Carga de `.env.local` en `process.env` para los CLI que ejecuta el dueño en su máquina
 * (`npm run migrate`, `npm run seed`, T-07).
 *
 * Existe porque faltaba: los dos CLI resuelven sus credenciales desde `process.env`, pero nada
 * metía `.env.local` ahí — `dependencies` está vacío por §0.2 (no hay `dotenv`) y los scripts de
 * `package.json` no pasaban `--env-file`. El síntoma era un `.env.local` correcto y el runner
 * afirmando que faltaba `SUPABASE_ACCESS_TOKEN`.
 *
 * Se usa el cargador nativo de Node (`process.loadEnvFile`, disponible desde Node 20.12, y el
 * proyecto exige >= 22.22): no añade dependencia, normaliza los finales de línea CRLF de Windows
 * sin colar el `\r` en el valor, y **no pisa** las variables ya presentes en el entorno, así que
 * los secretos del CI siguen ganando al fichero.
 *
 * La ruta se resuelve desde `import.meta.url`, no desde el directorio de trabajo: `npm run` deja
 * el `cwd` en la raíz del paquete, pero ejecutar el CLI a mano desde otro directorio no debe
 * cambiar qué fichero se lee.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const RUTA_ENV_LOCAL = fileURLToPath(new URL('../.env.local', import.meta.url));

export interface ResultadoCargaEnv {
  /** Ruta absoluta del fichero que se intentó cargar. */
  readonly ruta: string;
  /** `false` si el fichero no existe (el caso del CI): no es un error, se sigue con el entorno. */
  readonly cargado: boolean;
  /** Nombres declarados en el fichero, para poder decir en pantalla qué se cargó. Nunca valores. */
  readonly variables: readonly string[];
}

/** Nombres de variable declarados en el contenido de un fichero de entorno, en orden de aparición.
 * Ignora líneas en blanco y comentarios. Devuelve solo nombres: los valores son secretos y no
 * salen de aquí. */
export function nombresEnEnvFile(contenido: string): readonly string[] {
  const nombres: string[] = [];
  for (const linea of contenido.split('\n')) {
    const limpia = linea.trim();
    if (limpia === '' || limpia.startsWith('#')) {
      continue;
    }
    const separador = limpia.indexOf('=');
    if (separador <= 0) {
      continue;
    }
    nombres.push(limpia.slice(0, separador).trim());
  }
  return nombres;
}

/** Carga `ruta` en `process.env` si existe. No lanza cuando el fichero no está: quien pida una
 * credencial concreta ya falla con su propio mensaje claro (ver `migraciones/entorno.ts`). */
export function cargarEnvLocal(ruta: string = RUTA_ENV_LOCAL): ResultadoCargaEnv {
  if (!existsSync(ruta)) {
    return { ruta, cargado: false, variables: [] };
  }
  const variables = nombresEnEnvFile(readFileSync(ruta, 'utf8'));
  process.loadEnvFile(ruta);
  return { ruta, cargado: true, variables };
}
