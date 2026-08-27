/**
 * Cliente mínimo para la semilla de desarrollo (T-07): crea usuarios reales por la API admin de
 * GoTrue e inserta filas por PostgREST, ambos con la clave `service_role` (que bypasea RLS a
 * propósito — la semilla necesita escribir en tablas que hoy no tienen ninguna política, T-10). Al
 * igual que `SUPABASE_ACCESS_TOKEN` del runner de migraciones, esta clave solo vive en `.env.local`
 * del dueño: el agente no la tiene ni la usa nunca, solo escribe y testea el código que la
 * consumirá cuando el dueño ejecute `npm run seed` en su máquina.
 */

export interface ClienteAdmin {
  /** Crea un usuario confirmado en `auth.users` (dispara el trigger del bootstrap, que le crea su
   * `perfil` como `student`) y devuelve su id. */
  crearUsuario(email: string, password: string, nombre: string): Promise<string>;
  /** Sube el rol de un perfil ya creado (nace `student` por el trigger del bootstrap). */
  actualizarRolPerfil(id: string, rol: string): Promise<void>;
  /** Inserta filas en `tabla` y devuelve las filas insertadas (con sus columnas generadas). */
  insertar(tabla: string, filas: readonly Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
  /** Lectura simple, usada por la comprobación de idempotencia antes de insertar nada. */
  consultar(tabla: string, filtro: string): Promise<Record<string, unknown>[]>;
}

export class ErrorClienteAdmin extends Error {
  readonly estadoHttp: number;
  readonly cuerpo: string;

  constructor(message: string, estadoHttp: number, cuerpo: string) {
    super(message);
    this.name = 'ErrorClienteAdmin';
    this.estadoHttp = estadoHttp;
    this.cuerpo = cuerpo;
  }
}

export function crearClienteAdmin(
  urlProyecto: string,
  serviceRoleKey: string,
  fetchImpl: typeof fetch = fetch,
): ClienteAdmin {
  async function peticion(
    ruta: string,
    init: { method: string; body?: string; headers?: Readonly<Record<string, string>> },
  ): Promise<Response> {
    const respuesta = await fetchImpl(`${urlProyecto}${ruta}`, {
      method: init.method,
      ...(init.body === undefined ? {} : { body: init.body }),
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!respuesta.ok) {
      const texto = await respuesta.text();
      throw new ErrorClienteAdmin(
        `clienteAdmin: ${init.method} ${ruta} respondió ${String(respuesta.status)}`,
        respuesta.status,
        texto,
      );
    }
    return respuesta;
  }

  return {
    async crearUsuario(email, password, nombre) {
      const respuesta = await peticion('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { nombre } }),
      });
      const cuerpo = (await respuesta.json()) as { id: string };
      return cuerpo.id;
    },
    async actualizarRolPerfil(id, rol) {
      await peticion(`/rest/v1/perfil?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ rol }),
      });
    },
    async insertar(tabla, filas) {
      const respuesta = await peticion(`/rest/v1/${tabla}`, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(filas),
      });
      return (await respuesta.json()) as Record<string, unknown>[];
    },
    async consultar(tabla, filtro) {
      const respuesta = await peticion(`/rest/v1/${tabla}?${filtro}`, { method: 'GET' });
      return (await respuesta.json()) as Record<string, unknown>[];
    },
  };
}
