#!/usr/bin/env node
/**
 * CLI de `npm run probar-rls` (T-10, requisito 5 de su spec). Capa de wiring fina, sin test directo
 * (mismo patrón que `migrar.ts`): ejecuta `db/pruebas_rls.sql` contra el proyecto de destino a través
 * de la Management API y resume el resultado con `resumirPruebasRls` (testeada por separado).
 *
 * NO lo ejecuta el agente: necesita `SUPABASE_ACCESS_TOKEN`, que solo vive en `.env.local` del dueño
 * (§0.1 de HOJA_DE_RUTA.md), exactamente el mismo régimen que `npm run migrate`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cargarEnvLocal } from './cargarEnvLocal.ts';
import { crearClienteManagementApi } from './migraciones/clienteManagementApi.ts';
import { analizarArgv, resolverCredenciales } from './migraciones/entorno.ts';
import { resumirPruebasRls, type FilaResultadoRls } from './migraciones/resultadoPruebasRls.ts';

const RUTA_PRUEBAS = fileURLToPath(new URL('../db/pruebas_rls.sql', import.meta.url));

async function main(): Promise<void> {
  // Reutiliza el mismo analizador de argv que `migrar.ts`: solo nos interesa `--entorno`, y así
  // `--entorno=prod` exige la misma doble confirmación (§0.1) en vez de un segundo camino distinto.
  const opciones = analizarArgv(process.argv.slice(2).filter((arg) => arg.startsWith('--entorno=')));

  const carga = cargarEnvLocal();
  if (carga.cargado) {
    console.log(`probar-rls: ${carga.ruta} cargado (${String(carga.variables.length)} variables).`);
  } else {
    console.log(`probar-rls: no existe ${carga.ruta}; se usan solo las variables del entorno.`);
  }

  const credenciales = resolverCredenciales(process.env, opciones.entorno);
  console.log(`probar-rls: proyecto de destino = ${credenciales.entorno} (${credenciales.projectRef})`);

  const cliente = crearClienteManagementApi(credenciales.accessToken);
  const sql = readFileSync(RUTA_PRUEBAS, 'utf8');

  const filas = (await cliente.ejecutarSql(credenciales.projectRef, sql)) as FilaResultadoRls[];
  const resumen = resumirPruebasRls(filas);

  for (const fila of filas) {
    const etiqueta = fila.esperado === 'OMITIDO' ? 'OMITIDO' : fila.ok ? 'OK' : 'FALLO';
    console.log(`  [${etiqueta}] ${fila.celda} (esperado: ${fila.esperado})${fila.detalle ? ` — ${fila.detalle}` : ''}`);
  }

  console.log(
    `probar-rls: ${String(resumen.total)} comprobación(es), ${String(resumen.omitidas)} omitida(s), ` +
      `${String(resumen.fallidas.length)} fallida(s).`,
  );

  if (resumen.huboFallo) {
    console.error('probar-rls: hay al menos un acceso prohibido que tuvo éxito, o uno permitido que falló. Revisa el detalle de arriba.');
    process.exitCode = 1;
  } else {
    console.log('probar-rls: ningún acceso prohibido tuvo éxito.');
  }
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`probar-rls: ERROR — ${mensaje}`);
  process.exitCode = 1;
});
