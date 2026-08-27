/** Resolución de credenciales de la semilla de desarrollo (T-07): misma salvaguarda de producción
 * que el runner de migraciones (`herramientas/migraciones/entorno.ts`), aplicada aquí a la clave
 * `service_role` en vez del access token — ninguna de las dos la tiene el agente. */

export class ErrorCredencialesSemillaFaltantes extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCredencialesSemillaFaltantes';
  }
}

export interface CredencialesSemilla {
  readonly entorno: 'dev' | 'prod';
  readonly url: string;
  readonly serviceRoleKey: string;
}

export function resolverCredencialesSemilla(
  env: Readonly<Record<string, string | undefined>>,
  entorno: 'dev' | 'prod' = 'dev',
): CredencialesSemilla {
  if (entorno === 'prod' && env.PERMITIR_PROD !== '1') {
    throw new Error(
      'La semilla de desarrollo nunca se ejecuta contra producción: --entorno=prod exige además ' +
        'PERMITIR_PROD=1, y aun con eso no tiene sentido sembrar datos ficticios ahí.',
    );
  }
  const url = entorno === 'prod' ? env.SUPABASE_URL_PROD : env.SUPABASE_URL_DEV;
  if (!url) {
    throw new ErrorCredencialesSemillaFaltantes(
      `Falta SUPABASE_URL_${entorno.toUpperCase()} en .env.local: no se sabe contra qué proyecto sembrar.`,
    );
  }
  const serviceRoleKey =
    entorno === 'prod' ? env.SUPABASE_SERVICE_ROLE_KEY_PROD : env.SUPABASE_SERVICE_ROLE_KEY_DEV;
  if (!serviceRoleKey) {
    throw new ErrorCredencialesSemillaFaltantes(
      `Falta SUPABASE_SERVICE_ROLE_KEY_${entorno.toUpperCase()} en .env.local: la semilla necesita ` +
        'bypasear RLS para crear usuarios y filas de las tres tablas de ejemplo. Esta clave nunca la ' +
        'tiene un agente, solo el dueño en su máquina.',
    );
  }
  return { entorno, url, serviceRoleKey };
}
