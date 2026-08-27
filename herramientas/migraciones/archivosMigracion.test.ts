import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leerMigracionesDisco } from './archivosMigracion.ts';

function conDirectorioTemporal(ficheros: Record<string, string>, usar: (directorio: string) => void): void {
  const directorio = mkdtempSync(join(tmpdir(), 'gestoracademia-migraciones-'));
  try {
    for (const [nombre, contenido] of Object.entries(ficheros)) {
      writeFileSync(join(directorio, nombre), contenido);
    }
    usar(directorio);
  } finally {
    rmSync(directorio, { recursive: true, force: true });
  }
}

void test('lee y ordena las migraciones por número, no por orden alfabético del fichero', () => {
  conDirectorioTemporal(
    {
      '010_algo.sql': 'select 10;',
      '002_politicas_rls.sql': 'select 2;',
      '001_esquema_inicial.sql': 'select 1;',
    },
    (directorio) => {
      const migraciones = leerMigracionesDisco(directorio);
      assert.deepEqual(
        migraciones.map((m) => m.numero),
        [1, 2, 10],
      );
      assert.ok(migraciones[0]);
      assert.equal(migraciones[0].nombre, '001_esquema_inicial');
      assert.equal(migraciones[0].contenido, 'select 1;');
    },
  );
});

void test('ignora el bootstrap manual (000_*) y (000b_*)', () => {
  conDirectorioTemporal(
    {
      '000_bootstrap_perfil.sql': 'select 0;',
      '000b_arreglo_permisos.sql': 'select 0;',
      '001_esquema_inicial.sql': 'select 1;',
    },
    (directorio) => {
      const migraciones = leerMigracionesDisco(directorio);
      assert.deepEqual(
        migraciones.map((m) => m.nombre),
        ['001_esquema_inicial'],
      );
    },
  );
});

void test('ignora ficheros que no siguen el patrón NNN_nombre.sql', () => {
  conDirectorioTemporal(
    {
      'README.md': '# no es una migración',
      'notas.sql': 'select 1;',
      '001_esquema_inicial.sql': 'select 1;',
    },
    (directorio) => {
      const migraciones = leerMigracionesDisco(directorio);
      assert.deepEqual(
        migraciones.map((m) => m.nombre),
        ['001_esquema_inicial'],
      );
    },
  );
});

void test('un directorio sin migraciones del runner devuelve una lista vacía', () => {
  conDirectorioTemporal({ '000_bootstrap_perfil.sql': 'select 0;' }, (directorio) => {
    assert.deepEqual(leerMigracionesDisco(directorio), []);
  });
});
