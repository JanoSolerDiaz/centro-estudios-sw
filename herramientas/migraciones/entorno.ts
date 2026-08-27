/**
 * Resolución de entorno del runner (T-07): qué proyecto de Supabase es el destino, y con qué
 * credenciales. `dev` es el entorno por defecto; apuntar a `prod` exige el flag `--entorno=prod`
 * **y además** `PERMITIR_PROD=1` en el entorno — ninguno de los dos basta por sí solo (§0.1).
 */

export class ErrorCredencialesFaltantes extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCredencialesFaltantes';
  }
}

export interface Credenciales {
  readonly entorno: 'dev' | 'prod';
  readonly projectRef: string;
  readonly accessToken: string;
}

export interface OpcionesCli {
  readonly entorno: 'dev' | 'prod';
  readonly soloEstado: boolean;
  readonly verificarPrivilegios: boolean;
}

export function analizarArgv(argv: readonly string[]): OpcionesCli {
  let entorno: 'dev' | 'prod' = 'dev';
  let soloEstado = false;
  let verificarPrivilegios = false;
  for (const arg of argv) {
    if (arg === '--estado') {
      soloEstado = true;
    } else if (arg === '--verificar-privilegios') {
      verificarPrivilegios = true;
    } else if (arg.startsWith('--entorno=')) {
      const valor = arg.slice('--entorno='.length);
      if (valor !== 'dev' && valor !== 'prod') {
        throw new Error(`--entorno debe ser "dev" o "prod", recibido "${valor}"`);
      }
      entorno = valor;
    } else {
      throw new Error(`migrar: opción no reconocida "${arg}"`);
    }
  }
  return { entorno, soloEstado, verificarPrivilegios };
}

/** Resuelve el access token y el project ref para `entorno` a partir de `env` (normalmente
 * `process.env`, inyectado para poder testear sin variables de entorno reales). Falla con un
 * mensaje claro en español ante cualquier cosa que falte, en vez de continuar con un valor vacío. */
export function resolverCredenciales(
  env: Readonly<Record<string, string | undefined>>,
  entorno: 'dev' | 'prod',
): Credenciales {
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new ErrorCredencialesFaltantes(
      'Falta SUPABASE_ACCESS_TOKEN en .env.local: el runner no puede aplicar ninguna migración sin ' +
        'el access token de la Management API. Este comando lo ejecuta el dueño en su máquina, nunca ' +
        'un agente (§0.1 de HOJA_DE_RUTA.md).',
    );
  }
  if (entorno === 'prod' && env.PERMITIR_PROD !== '1') {
    throw new Error(
      'Apuntar a producción exige --entorno=prod Y ADEMÁS PERMITIR_PROD=1 en el entorno: ninguna de ' +
        'las dos cosas basta por sí sola, y ninguna se activa por accidente.',
    );
  }
  const projectRef =
    entorno === 'prod'
      ? (env.SUPABASE_PROJECT_REF_PROD ?? env.SUPABASE_PROJECT_REF)
      : (env.SUPABASE_PROJECT_REF_DEV ?? env.SUPABASE_PROJECT_REF);
  if (!projectRef) {
    throw new ErrorCredencialesFaltantes(
      `Falta SUPABASE_PROJECT_REF_${entorno.toUpperCase()} (o SUPABASE_PROJECT_REF) en .env.local: ` +
        `no se sabe a qué proyecto de Supabase escribir en el entorno "${entorno}".`,
    );
  }
  return { entorno, projectRef, accessToken };
}
