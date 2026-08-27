/**
 * Cliente mínimo de la Management API de Supabase, usado EXCLUSIVAMENTE por el runner de
 * migraciones (nunca por código de aplicación, §0.2 de HOJA_DE_RUTA.md: "la Management API se usa
 * igual, con fetch, y solo desde el runner de migraciones"). Necesita el access token, que solo
 * vive en `.env.local` del dueño — este cliente nunca lo lee del entorno por sí mismo, lo recibe
 * como parámetro para poder testearse sin él.
 *
 * AVISO DE INCERTIDUMBRE (documentado también en DECISIONES_TECNICAS.md): el endpoint exacto
 * (`POST /v1/projects/{ref}/database/query`) no se ha podido verificar contra la documentación en
 * vivo en esta sesión — sin salida de red hacia supabase.com, misma limitación que T-06 documentó
 * para los límites de Auth. Si el dueño ve un 404 al ejecutar `npm run migrate`, esta es la
 * primera sospechosa; el resto del runner (guardas, hash, ledger) no depende de que sea exacto.
 */

export interface ClienteManagementApi {
  /** Ejecuta `sql` contra el proyecto `projectRef` y devuelve las filas de la última sentencia que
   * produce resultado (vacío para DDL puro). Lanza `ErrorManagementApi` en cualquier respuesta que
   * no sea 2xx. */
  ejecutarSql(projectRef: string, sql: string): Promise<unknown[]>;
}

export class ErrorManagementApi extends Error {
  readonly estadoHttp: number;
  readonly cuerpo: string;

  constructor(message: string, estadoHttp: number, cuerpo: string) {
    super(message);
    this.name = 'ErrorManagementApi';
    this.estadoHttp = estadoHttp;
    this.cuerpo = cuerpo;
  }
}

const URL_BASE = 'https://api.supabase.com/v1';

export function crearClienteManagementApi(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): ClienteManagementApi {
  return {
    async ejecutarSql(projectRef, sql) {
      const respuesta = await fetchImpl(`${URL_BASE}/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      const texto = await respuesta.text();
      if (!respuesta.ok) {
        throw new ErrorManagementApi(
          `Management API respondió ${String(respuesta.status)} al ejecutar SQL contra el proyecto ${projectRef}`,
          respuesta.status,
          texto,
        );
      }
      return texto.length > 0 ? (JSON.parse(texto) as unknown[]) : [];
    },
  };
}
