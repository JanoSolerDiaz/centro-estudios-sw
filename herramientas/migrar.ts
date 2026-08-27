#!/usr/bin/env node
/**
 * CLI del runner de migraciones (T-07, `npm run migrate`). Capa de wiring fina: toda la lógica
 * real vive en `herramientas/migraciones/*.ts`, testeada por separado contra dobles. Este fichero
 * no se testea directamente (mismo patrón que `src/ui/main.ts`, T-03): solo conecta fs/fetch/argv
 * reales con las funciones puras/inyectables de más abajo.
 *
 * NO lo ejecuta el agente: necesita `SUPABASE_ACCESS_TOKEN`, que solo vive en `.env.local` del
 * dueño (§0.1 de HOJA_DE_RUTA.md).
 */

import { fileURLToPath } from 'node:url';
import { leerMigracionesDisco } from './migraciones/archivosMigracion.ts';
import { crearClienteManagementApi } from './migraciones/clienteManagementApi.ts';
import { analizarArgv, resolverCredenciales } from './migraciones/entorno.ts';
import { aplicarPendientes, obtenerEstado } from './migraciones/runner.ts';
import { verificarPrivilegios } from './migraciones/verificarPrivilegios.ts';

const DIRECTORIO_MIGRACIONES = fileURLToPath(new URL('../db', import.meta.url));

async function main(): Promise<void> {
  const opciones = analizarArgv(process.argv.slice(2));
  const credenciales = resolverCredenciales(process.env, opciones.entorno);
  console.log(`migrar: proyecto de destino = ${credenciales.entorno} (${credenciales.projectRef})`);

  const cliente = crearClienteManagementApi(credenciales.accessToken);

  if (opciones.verificarPrivilegios) {
    const violaciones = await verificarPrivilegios(cliente, credenciales.projectRef);
    if (violaciones.length === 0) {
      console.log('migrar --verificar-privilegios: sin violaciones. Ninguna tabla concede TRUNCATE, REFERENCES ni TRIGGER a anon/authenticated.');
      return;
    }
    console.error('migrar --verificar-privilegios: violaciones encontradas:');
    for (const violacion of violaciones) {
      console.error(`  ${violacion.tabla}: ${violacion.rol} tiene ${violacion.privilegio}`);
    }
    process.exitCode = 1;
    return;
  }

  const migraciones = leerMigracionesDisco(DIRECTORIO_MIGRACIONES);

  if (opciones.soloEstado) {
    const ledger = await obtenerEstado(cliente, credenciales.projectRef);
    if (ledger.length === 0) {
      console.log('migrar --estado: no hay ninguna migración aplicada todavía.');
      return;
    }
    for (const fila of ledger) {
      console.log(`  ${String(fila.numero).padStart(3, '0')}  ${fila.nombre}  (hash ${fila.hash ?? 'sin hash'})`);
    }
    return;
  }

  const plan = await aplicarPendientes(cliente, credenciales.projectRef, migraciones, (migracion) => {
    console.log(`migrar: aplicada ${migracion.nombre}`);
  });
  if (plan.pendientes.length === 0) {
    console.log('migrar: no había ninguna migración pendiente.');
  } else {
    console.log(`migrar: ${String(plan.pendientes.length)} migración(es) aplicada(s) correctamente.`);
  }
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`migrar: ERROR — ${mensaje}`);
  process.exitCode = 1;
});
