/**
 * Barrido de `information_schema.role_table_grants` (T-07, punto 20b de HOJA_DE_RUTA.md): comprueba
 * que ninguna tabla de `public` concede a `anon` o `authenticated` `TRUNCATE`, `REFERENCES` ni
 * `TRIGGER` — el descuido que ya ocurrió una vez en el arranque (`authenticated` con `TRUNCATE`
 * sobre `perfil`, corregido en `db/000b_arreglo_permisos.sql`).
 *
 * Necesita una conexión real (aunque de solo lectura) al proyecto: no puede vivir en `npm test`
 * (corolario de esta sesión: la suite corre sin ninguna credencial). En su lugar es un modo del
 * mismo runner (`npm run migrate -- --verificar-privilegios`), pensado para que el dueño lo ejecute
 * tras aplicar migraciones — misma necesidad de `SUPABASE_ACCESS_TOKEN` que `npm run migrate`, el
 * agente no lo ejecuta nunca. La comprobación ESTÁTICA equivalente sobre el propio SQL, que sí corre
 * sin credenciales, está en `esquemaInicial.test.ts`.
 */

import type { ClienteManagementApi } from './clienteManagementApi.ts';

const CONSULTA_GRANTS = `
  select table_name, grantee, privilege_type
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
   order by table_name, grantee, privilege_type;
`;

const PRIVILEGIOS_PROHIBIDOS = new Set(['TRUNCATE', 'REFERENCES', 'TRIGGER']);

export interface FilaGrant {
  readonly table_name: string;
  readonly grantee: string;
  readonly privilege_type: string;
}

export interface ViolacionPrivilegio {
  readonly tabla: string;
  readonly rol: string;
  readonly privilegio: string;
}

export async function verificarPrivilegios(
  cliente: ClienteManagementApi,
  projectRef: string,
): Promise<ViolacionPrivilegio[]> {
  const filas = (await cliente.ejecutarSql(projectRef, CONSULTA_GRANTS)) as FilaGrant[];
  return filas
    .filter((fila) => PRIVILEGIOS_PROHIBIDOS.has(fila.privilege_type.toUpperCase()))
    .map((fila) => ({ tabla: fila.table_name, rol: fila.grantee, privilegio: fila.privilege_type }));
}
