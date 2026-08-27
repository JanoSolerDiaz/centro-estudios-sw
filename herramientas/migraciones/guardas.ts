/**
 * Guardas de contenido del runner de migraciones (T-07, requisito 4 de HOJA_DE_RUTA.md): convierten
 * en código, no en promesa, la lista de operaciones de esquema prohibidas de §0.2 — DROP TABLE,
 * DROP SCHEMA, TRUNCATE, DISABLE ROW LEVEL SECURITY, un DROP POLICY sin su CREATE POLICY, un DELETE
 * sobre `asistencia`, y un UPDATE o DELETE sobre `asistencia_historial`. El chequeo corre sobre el
 * SQL sin comentarios, para que una frase explicativa en un comentario ("sin UPDATE ni DELETE para
 * nadie") nunca dispare una guarda pensada para SQL ejecutable de verdad.
 */

export interface ViolacionGuarda {
  readonly guarda: string;
  readonly detalle: string;
}

/** Quita comentarios de línea (`-- ...`) y de bloque (`/* ... *\/`) de un texto SQL. No es un
 * tokenizador completo (no distingue un `--` dentro de una cadena literal), suficiente para el
 * estilo de este repositorio, donde el SQL no lleva literales con esa secuencia. */
export function quitarComentariosSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((linea) => {
      const indice = linea.indexOf('--');
      return indice === -1 ? linea : linea.slice(0, indice);
    })
    .join('\n');
}

function nombresPolicy(sql: string, patron: RegExp): Set<string> {
  const nombres = new Set<string>();
  for (const coincidencia of sql.matchAll(patron)) {
    const nombre = coincidencia[1];
    if (nombre) {
      nombres.add(nombre.toLowerCase());
    }
  }
  return nombres;
}

const GUARDAS: readonly {
  readonly nombre: string;
  readonly detectar: (sqlSinComentarios: string) => string[];
}[] = [
  {
    nombre: 'DROP TABLE',
    detectar: (sql) => (/\bdrop\s+table\b/i.test(sql) ? ['contiene DROP TABLE'] : []),
  },
  {
    nombre: 'DROP SCHEMA',
    detectar: (sql) => (/\bdrop\s+schema\b/i.test(sql) ? ['contiene DROP SCHEMA'] : []),
  },
  {
    nombre: 'TRUNCATE',
    detectar: (sql) => (/\btruncate\b/i.test(sql) ? ['contiene TRUNCATE'] : []),
  },
  {
    nombre: 'DISABLE ROW LEVEL SECURITY',
    detectar: (sql) =>
      /disable\s+row\s+level\s+security/i.test(sql) ? ['contiene DISABLE ROW LEVEL SECURITY'] : [],
  },
  {
    nombre: 'DROP POLICY sin CREATE POLICY',
    detectar: (sql) => {
      const eliminadas = nombresPolicy(sql, /drop\s+policy\s+(?:if\s+exists\s+)?"?([a-z0-9_]+)"?/gi);
      const creadas = nombresPolicy(sql, /create\s+policy\s+"?([a-z0-9_]+)"?/gi);
      return [...eliminadas]
        .filter((nombre) => !creadas.has(nombre))
        .map((nombre) => `DROP POLICY "${nombre}" sin su CREATE POLICY correspondiente en el mismo fichero`);
    },
  },
  {
    nombre: 'DELETE sobre asistencia',
    detectar: (sql) =>
      /\bdelete\s+from\s+(?:public\.)?asistencia\b/i.test(sql) ? ['contiene DELETE FROM asistencia'] : [],
  },
  {
    nombre: 'UPDATE o DELETE sobre asistencia_historial',
    detectar: (sql) => {
      const resultado: string[] = [];
      if (/\bupdate\s+(?:public\.)?asistencia_historial\b/i.test(sql)) {
        resultado.push('contiene UPDATE sobre asistencia_historial');
      }
      if (/\bdelete\s+from\s+(?:public\.)?asistencia_historial\b/i.test(sql)) {
        resultado.push('contiene DELETE FROM asistencia_historial');
      }
      return resultado;
    },
  },
];

/** Devuelve la lista de violaciones encontradas en `sqlOriginal`; vacío si el script no dispara
 * ninguna guarda. */
export function validarContenidoMigracion(sqlOriginal: string): ViolacionGuarda[] {
  const sinComentarios = quitarComentariosSql(sqlOriginal);
  const violaciones: ViolacionGuarda[] = [];
  for (const guarda of GUARDAS) {
    for (const detalle of guarda.detectar(sinComentarios)) {
      violaciones.push({ guarda: guarda.nombre, detalle });
    }
  }
  return violaciones;
}
