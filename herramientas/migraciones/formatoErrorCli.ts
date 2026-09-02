/**
 * Formatea el error final de `migrar.ts`/`probarRls.ts` para su `console.error` (P-05, backlog de
 * `SEGUIMIENTO.md` §5). Separado de las dos CLI, sin test directo (mismo patrón que `migrar.ts`),
 * para poder testear la parte que sí importa sin fs/fetch reales.
 *
 * `ErrorManagementApi.message` es solo la plantilla genérica ("Management API respondió 400...");
 * el mensaje real de Postgres —`SQLSTATE`, `HINT`, `CONTEXT` incluidos— vive en su campo `cuerpo`, que
 * hasta ahora ningún CLI imprimía: un fallo de SQL llegaba al dueño como una única línea sin ninguna
 * pista, obligándolo a reproducir la llamada por fuera (editor SQL del panel) para ver el motivo real.
 */

import { ErrorManagementApi } from './clienteManagementApi.ts';

export function formatearErrorCli(error: unknown): string {
  if (error instanceof ErrorManagementApi) {
    return error.cuerpo.length > 0 ? `${error.message}\n${error.cuerpo}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
