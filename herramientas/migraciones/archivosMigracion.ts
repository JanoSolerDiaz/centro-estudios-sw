/** Lectura de los scripts `db/NNN_*.sql` del disco, en orden (T-07). */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ArchivoMigracion {
  readonly numero: number;
  readonly nombre: string;
  readonly rutaCompleta: string;
  readonly contenido: string;
}

const PATRON_NOMBRE = /^(\d{3,})_([a-z0-9_]+)\.sql$/;

/** Lee y ordena las migraciones de `directorio` (normalmente `db/`). Ignora `000_*`/`000b_*`
 * (bootstrap manual del dueño, fuera del alcance del runner: `000b_arreglo_permisos.sql` ni
 * siquiera coincide con el patrón `NNN_nombre.sql` por la "b") y cualquier fichero que no siga el
 * patrón `NNN_nombre.sql`. */
export function leerMigracionesDisco(directorio: string): ArchivoMigracion[] {
  const ficheros = readdirSync(directorio).filter((nombre) => PATRON_NOMBRE.test(nombre));
  const migraciones = ficheros.map((nombreFichero) => {
    const coincidencia = PATRON_NOMBRE.exec(nombreFichero);
    if (!coincidencia) {
      // Inalcanzable: el filtro de arriba ya garantiza que coincide. Solo satisface a tsc.
      throw new Error(`archivosMigracion: ${nombreFichero} no coincide con su propio patrón`);
    }
    const rutaCompleta = join(directorio, nombreFichero);
    return {
      numero: Number.parseInt(coincidencia[1] ?? '', 10),
      nombre: nombreFichero.replace(/\.sql$/, ''),
      rutaCompleta,
      contenido: readFileSync(rutaCompleta, 'utf8'),
    };
  });
  return migraciones
    .filter((migracion) => migracion.numero > 0) // 0 = 000_bootstrap_perfil, arranque manual
    .sort((a, b) => a.numero - b.numero);
}
