/**
 * Cliente propio de GoTrue (autenticación de Supabase, T-09), sobre `fetch` nativo — sin el SDK
 * (§0.2), mismo régimen que `postgrest.ts` y `almacenamiento.ts` (T-08). Cubre exactamente lo que
 * pide la spec de T-09: inicio de sesión con email/contraseña, cierre de sesión, renovación por
 * `refresh_token`, y el flujo completo de recuperación de contraseña (solicitud + establecer una
 * nueva). No implementa alta de usuario ni gestión de usuarios por la API admin de GoTrue: el alta
 * de un profesor la hace el administrator desde el panel de Supabase (requisito 2 de T-09), no esta
 * capa.
 *
 * Los endpoints (`/auth/v1/token`, `/auth/v1/logout`, `/auth/v1/recover`, `/auth/v1/user`) **no se
 * han podido verificar contra documentación en vivo** en esta sesión — mismo aviso, y mismo motivo
 * (sin salida de red a `supabase.com`), que T-06/T-07/T-08 dejaron para los límites de Auth, la
 * Management API y Storage. Documentado también aquí para que si algo da un `404` inesperado, este
 * sea el primer sospechoso.
 */

import type { FetchSimulado } from './pruebas/dobleHttp.ts';
import { leerCuerpoJson, errorDeRespuesta, esFalloDeRed, ErrorDeRed, ErrorDelServidor, NoAutenticado } from './erroresDominio.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import { relojDelSistema } from '../nucleo/reloj.ts';

/** Fallo específico del inicio de sesión: email o contraseña incorrectos. Distinto de
 * `NoAutenticado` (T-08), que significa "no hay sesión, o ha caducado" — aquí sí hubo un intento
 * de autenticarse, y falló. El mensaje no revela si el email existe (requisito 9 de T-09). */
export class CredencialesInvalidas extends Error {
  constructor(mensaje = 'Email o contraseña incorrectos.') {
    super(mensaje);
    this.name = 'CredencialesInvalidas';
  }
}

export interface SesionGoTrue {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Instante absoluto de caducidad (epoch ms), calculado con el `Reloj` inyectado a partir del
   * `expires_in` (segundos) que devuelve GoTrue — nunca `Date.now()` leído directamente aquí. */
  readonly expiraEnMs: number;
  readonly usuarioId: string;
}

export interface OpcionesClienteAutenticacion {
  readonly urlBase: string;
  readonly claveAnonima: string;
  readonly fetchImpl?: FetchSimulado;
  readonly reloj?: Reloj;
}

export interface ClienteAutenticacion {
  iniciarSesion(email: string, contrasena: string): Promise<SesionGoTrue>;
  cerrarSesion(accessToken: string): Promise<void>;
  renovarSesion(refreshToken: string): Promise<SesionGoTrue>;
  solicitarRecuperacionContrasena(email: string): Promise<void>;
  establecerContrasenaNueva(accessToken: string, contrasenaNueva: string): Promise<void>;
}

interface OpcionesPeticionGoTrue {
  readonly cuerpoJson?: unknown;
  readonly tokenBearer?: string;
}

async function peticionGoTrue(
  opciones: { urlBase: string; claveAnonima: string; fetchImpl: FetchSimulado },
  metodo: string,
  ruta: string,
  init: OpcionesPeticionGoTrue = {},
): Promise<Response> {
  const cabeceras: Record<string, string> = {
    apikey: opciones.claveAnonima,
    authorization: `Bearer ${init.tokenBearer ?? opciones.claveAnonima}`,
  };

  let cuerpo: string | undefined;
  if (init.cuerpoJson !== undefined) {
    cabeceras['content-type'] = 'application/json';
    cuerpo = JSON.stringify(init.cuerpoJson);
  }

  try {
    return await opciones.fetchImpl(`${opciones.urlBase}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      ...(cuerpo !== undefined ? { body: cuerpo } : {}),
    });
  } catch (error) {
    if (esFalloDeRed(error)) {
      throw new ErrorDeRed();
    }
    throw error;
  }
}

async function sesionDeRespuesta(respuesta: Response, reloj: Reloj): Promise<SesionGoTrue> {
  const { valor, malformado } = await leerCuerpoJson(respuesta);
  if (malformado || typeof valor !== 'object' || valor === null) {
    throw new ErrorDelServidor('El servidor ha devuelto una sesión que no se puede interpretar.');
  }
  const cuerpo = valor as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    user?: { id?: unknown };
  };
  const accessToken = cuerpo.access_token;
  const refreshToken = cuerpo.refresh_token;
  const expiresIn = cuerpo.expires_in;
  const usuarioId = cuerpo.user?.id;
  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresIn !== 'number' ||
    typeof usuarioId !== 'string'
  ) {
    throw new ErrorDelServidor('El servidor ha devuelto una sesión que no se puede interpretar.');
  }
  return {
    accessToken,
    refreshToken,
    expiraEnMs: reloj.ahora().getTime() + expiresIn * 1000,
    usuarioId,
  };
}

export function crearClienteAutenticacion(opcionesEntrada: OpcionesClienteAutenticacion): ClienteAutenticacion {
  const opciones = {
    urlBase: opcionesEntrada.urlBase,
    claveAnonima: opcionesEntrada.claveAnonima,
    fetchImpl: opcionesEntrada.fetchImpl ?? fetch,
  };
  const reloj = opcionesEntrada.reloj ?? relojDelSistema;

  return {
    async iniciarSesion(email, contrasena) {
      const respuesta = await peticionGoTrue(opciones, 'POST', '/auth/v1/token?grant_type=password', {
        cuerpoJson: { email, password: contrasena },
      });
      // GoTrue responde 400 (no 401) a credenciales incorrectas en grant_type=password: es un caso
      // aparte, no la traducción genérica de `errorDeRespuesta` (que daría ErrorDeValidacion).
      if (respuesta.status === 400) {
        throw new CredencialesInvalidas();
      }
      if (!respuesta.ok) {
        throw await errorDeRespuesta(respuesta);
      }
      return sesionDeRespuesta(respuesta, reloj);
    },

    async cerrarSesion(accessToken) {
      const respuesta = await peticionGoTrue(opciones, 'POST', '/auth/v1/logout', { tokenBearer: accessToken });
      if (!respuesta.ok) {
        throw await errorDeRespuesta(respuesta);
      }
    },

    async renovarSesion(refreshToken) {
      const respuesta = await peticionGoTrue(opciones, 'POST', '/auth/v1/token?grant_type=refresh_token', {
        cuerpoJson: { refresh_token: refreshToken },
      });
      // Un refresh_token inválido o ya usado significa lo mismo que no tener sesión: NoAutenticado
      // (T-08) encaja exactamente, sin inventar un tipo de error nuevo para esto.
      if (respuesta.status === 400 || respuesta.status === 401) {
        throw new NoAutenticado();
      }
      if (!respuesta.ok) {
        throw await errorDeRespuesta(respuesta);
      }
      return sesionDeRespuesta(respuesta, reloj);
    },

    async solicitarRecuperacionContrasena(email) {
      // GoTrue responde 200 con cuerpo vacío tanto si el email existe como si no — es lo que hace
      // posible el requisito 9 de T-09 ("responde igual con un email inexistente"): este cliente no
      // necesita ninguna lógica adicional para eso, solo no fallar si la cuenta no existe.
      const respuesta = await peticionGoTrue(opciones, 'POST', '/auth/v1/recover', { cuerpoJson: { email } });
      if (!respuesta.ok) {
        throw await errorDeRespuesta(respuesta);
      }
    },

    async establecerContrasenaNueva(accessToken, contrasenaNueva) {
      const respuesta = await peticionGoTrue(opciones, 'PUT', '/auth/v1/user', {
        tokenBearer: accessToken,
        cuerpoJson: { password: contrasenaNueva },
      });
      if (!respuesta.ok) {
        throw await errorDeRespuesta(respuesta);
      }
    },
  };
}
