/**
 * Ninguna política RLS forma un ciclo entre tablas (P-33), sin credenciales ni red.
 *
 * PostgreSQL expande todas las políticas de una tabla al planificar una consulta. Si la política
 * de A consulta B y la de B consulta A, aborta con `infinite recursion detected in policy for
 * relation` — con CUALQUIER rol, porque el ciclo se detecta antes de evaluar la condición. Así
 * rompió `013_excepcion_slot.sql` todas las lecturas de `slot_horario` en `dev` (2026-10-01), y
 * nadie lo vio hasta la primera ejecución de `npm run probar-rls`: ninguna de las cuatro puertas
 * (typecheck, lint, test, build) mira dentro de una política.
 *
 * Este test reconstruye el estado final de las políticas recorriendo `db/NNN_*.sql` en orden
 * (`create policy` añade, `drop policy` quita), arma el grafo «la política de A lee la tabla B»
 * con los `from`/`join` de cada `using`/`with check`, y busca ciclos. La lectura a través de una
 * función `SECURITY DEFINER` —la forma correcta de romper un ciclo, ver `000_bootstrap_perfil.sql`—
 * no deja arista, que es justo lo que se quiere: esa lectura no pasa por las políticas.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { quitarComentariosSql } from './guardas.ts';

const DIRECTORIO_DB = fileURLToPath(new URL('../../db', import.meta.url));

interface FicheroSql {
  readonly nombre: string;
  readonly contenido: string;
}

/** Todas las migraciones, arranque manual incluido (`000`/`000b` crean las políticas de `perfil`),
 * en el orden en que se aplican. */
function leerMigraciones(): FicheroSql[] {
  return readdirSync(DIRECTORIO_DB)
    .filter((nombre) => /^\d{3}[a-z]?_[a-z0-9_]+\.sql$/.test(nombre))
    .sort()
    .map((nombre) => ({ nombre, contenido: readFileSync(join(DIRECTORIO_DB, nombre), 'utf8') }));
}

/** Clave de una política: su nombre solo es único dentro de su tabla. */
type Politicas = Map<string, { readonly tabla: string; readonly lee: ReadonlySet<string> }>;

function normalizarTabla(nombre: string): string {
  return nombre.includes('.') ? nombre.toLowerCase() : `public.${nombre.toLowerCase()}`;
}

/** Estado final de las políticas tras aplicar los ficheros en orden. */
export function politicasFinales(ficheros: readonly FicheroSql[]): Politicas {
  const politicas: Politicas = new Map();
  for (const fichero of ficheros) {
    // Partir por `;` trocea también los cuerpos `$$ … $$`, pero ningún trozo de un cuerpo empieza
    // por `create policy`/`drop policy`, así que no se confunden con una sentencia.
    for (const bruta of quitarComentariosSql(fichero.contenido).split(';')) {
      const sentencia = bruta.trim();
      const borrada = /^drop\s+policy\s+(?:if\s+exists\s+)?"?([a-z0-9_]+)"?\s+on\s+([a-z0-9_.]+)/i.exec(sentencia);
      if (borrada?.[1] !== undefined && borrada[2] !== undefined) {
        politicas.delete(`${normalizarTabla(borrada[2])}#${borrada[1].toLowerCase()}`);
        continue;
      }
      const creada = /^create\s+policy\s+"?([a-z0-9_]+)"?\s+on\s+([a-z0-9_.]+)/i.exec(sentencia);
      if (creada?.[1] === undefined || creada[2] === undefined) {
        continue;
      }
      const tabla = normalizarTabla(creada[2]);
      const lee = new Set(
        [...sentencia.matchAll(/\b(?:from|join)\s+([a-z0-9_]+\.[a-z0-9_]+|[a-z0-9_]+)\b/gi)]
          .map((coincidencia) => coincidencia[1])
          .filter((nombre): nombre is string => nombre !== undefined)
          .map(normalizarTabla),
      );
      politicas.set(`${tabla}#${creada[1].toLowerCase()}`, { tabla, lee });
    }
  }
  return politicas;
}

/** Ciclos del grafo tabla → tablas que leen sus políticas, cada uno como `a -> b -> a`. */
export function ciclos(politicas: Politicas): string[] {
  const grafo = new Map<string, Set<string>>();
  for (const { tabla, lee } of politicas.values()) {
    const destinos = grafo.get(tabla) ?? new Set<string>();
    for (const destino of lee) {
      destinos.add(destino);
    }
    grafo.set(tabla, destinos);
  }

  const encontrados = new Set<string>();
  const visitar = (nodo: string, camino: readonly string[]): void => {
    const indice = camino.indexOf(nodo);
    if (indice !== -1) {
      const ciclo = camino.slice(indice);
      // Normaliza la rotación para no contar el mismo ciclo una vez por cada nodo de partida.
      const minimo = ciclo.indexOf([...ciclo].sort()[0] ?? nodo);
      const rotado = [...ciclo.slice(minimo), ...ciclo.slice(0, minimo)];
      encontrados.add([...rotado, rotado[0]].join(' -> '));
      return;
    }
    for (const siguiente of grafo.get(nodo) ?? []) {
      visitar(siguiente, [...camino, nodo]);
    }
  };
  for (const nodo of grafo.keys()) {
    visitar(nodo, []);
  }
  return [...encontrados].sort();
}

void test('ninguna política RLS forma un ciclo entre tablas en el estado final de las migraciones', () => {
  assert.deepEqual(
    ciclos(politicasFinales(leerMigraciones())),
    [],
    'estas políticas se consultan en ciclo y PostgreSQL abortará con "infinite recursion detected in policy". ' +
      'Rompe el ciclo leyendo una de las tablas a través de una función SECURITY DEFINER (ver 021).',
  );
});

void test('sin 021, el detector encuentra el ciclo slot_horario <-> excepcion_slot que rompió dev el 2026-10-01', () => {
  const sin021 = leerMigraciones().filter((fichero) => !fichero.nombre.startsWith('021_'));
  assert.deepEqual(ciclos(politicasFinales(sin021)), [
    'public.excepcion_slot -> public.slot_horario -> public.excepcion_slot',
  ]);
});

void test('el detector reconoce también una política que se lee a sí misma', () => {
  const politicas = politicasFinales([
    {
      nombre: '900_prueba.sql',
      contenido:
        'create policy p on public.perfil for select to authenticated\n' +
        '  using (exists (select 1 from public.perfil q where q.id = auth.uid()));\n',
    },
  ]);
  assert.deepEqual(ciclos(politicas), ['public.perfil -> public.perfil']);
});

void test('un drop policy retira la arista de la política borrada', () => {
  const politicas = politicasFinales([
    { nombre: '900_a.sql', contenido: 'create policy p on public.a using (exists (select 1 from public.b));' },
    { nombre: '901_b.sql', contenido: 'create policy q on public.b using (exists (select 1 from public.a));' },
    { nombre: '902_c.sql', contenido: 'drop policy if exists p on public.a;\ncreate policy p on public.a using (true);' },
  ]);
  assert.deepEqual(ciclos(politicas), []);
});
