/**
 * Orquestación de sesión (T-09): junta el cliente de GoTrue (`autenticacion.ts`) con el cliente de
 * PostgREST (`postgrest.ts`, para cargar el `perfil` propio) y el almacén de sesión
 * (`almacenSesion.ts`), y aplica las dos reglas de negocio de la spec que no son responsabilidad de
 * ninguno de esos tres por separado: un `perfil.activo = false` no entra aunque las credenciales
 * sean correctas (requisito 7), y la renovación de token es siempre **proactiva** — se dispara
 * explícitamente al abrir una pantalla que la necesita, nunca esperando a un `401` (requisito 5).
 *
 * El `access_token` vive SOLO en memoria, en el cierre de `crearGestorSesion` — nunca en el
 * `EstadoSesion` que se expone a la interfaz (que solo lleva `perfil`), para que ningún código de
 * pantalla pueda loguearlo o pintarlo por accidente. Quien necesite autenticar una petición usa
 * `obtenerTokenSesion()`, pensado para inyectarse como `obtenerTokenSesion` en
 * `OpcionesClientePostgrest`/`OpcionesAutenticacion` (T-08), igual que ya hace este mismo módulo
 * internamente para cargar el perfil.
 */

import type { Perfil } from '../dominio/tipos.ts';
import { crearClientePostgrest } from '../datos/postgrest.ts';
import { ErrorDelServidor } from '../datos/erroresDominio.ts';
import type { ClienteAutenticacion, SesionGoTrue } from '../datos/autenticacion.ts';
import type { AlmacenSesion } from './almacenSesion.ts';
import type { Reloj } from './reloj.ts';
import { relojDelSistema } from './reloj.ts';
import type { Logger } from './registro.ts';
import type { FetchSimulado } from '../datos/pruebas/dobleHttp.ts';

/** Un perfil existe y las credenciales eran correctas, pero `activo = false` (requisito 7 de
 * T-09): no es lo mismo que "no autenticado" (T-08), así que no reutiliza esa clase. */
export class PerfilInactivo extends Error {
  constructor(mensaje = 'Tu cuenta está desactivada. Habla con el administrador del centro.') {
    super(mensaje);
    this.name = 'PerfilInactivo';
  }
}

export type EstadoSesion =
  | { readonly tipo: 'restaurando' }
  | { readonly tipo: 'sin_sesion' }
  | { readonly tipo: 'autenticado'; readonly perfil: Perfil };

/** Margen con el que `renovarAlAbrirPasarLista` decide que un token está "a punto de caducar" y
 * conviene renovarlo ya. Valor de partida razonable (una clase dura bastante más que esto), mismo
 * criterio que los contratos recomendados que T-06 dejó para T-14/T-18/T-21: ajustable por la
 * sesión que conecte de verdad la pantalla de pasar lista (T-19) si la experiencia real lo pide. */
export const MARGEN_RENOVACION_POR_DEFECTO_MS = 5 * 60 * 1000;

export interface OpcionesGestorSesion {
  readonly urlBase: string;
  readonly claveAnonima: string;
  readonly clienteAutenticacion: ClienteAutenticacion;
  readonly almacenSesion: AlmacenSesion;
  readonly logger: Logger;
  readonly fetchImpl?: FetchSimulado;
  readonly reloj?: Reloj;
  readonly margenRenovacionMs?: number;
}

export interface GestorSesion {
  obtenerEstado(): EstadoSesion;
  /** Devuelve una función para desuscribirse. Se llama de inmediato con el estado actual no
   * incluido: quien se suscribe debe leer `obtenerEstado()` primero si necesita el valor presente. */
  suscribir(escucha: (estado: EstadoSesion) => void): () => void;
  /** Intenta recuperar una sesión persistida (arranque de la aplicación). Nunca lanza: cualquier
   * fallo termina en el estado `sin_sesion`. */
  restaurar(): Promise<void>;
  /** Lanza `CredencialesInvalidas` (email o contraseña incorrectos) o `PerfilInactivo`. */
  iniciarSesion(email: string, contrasena: string): Promise<void>;
  cerrarSesion(): Promise<void>;
  /** `undefined` si no hay sesión autenticada. */
  obtenerTokenSesion(): string | undefined;
  /**
   * Punto de enganche para T-19: se llama al abrir la pantalla de pasar lista. Si el token todavía
   * tiene margen de sobra, no hace nada (no gasta una petición de red). Si está a punto de caducar,
   * renueva. Si la renovación falla, RELANZA el error (nunca cierra la sesión ni cambia el estado
   * por su cuenta) para que quien llama decida cómo avisar sin perder lo que el profesor ya tenía
   * en pantalla (requisito 6 de T-09).
   */
  renovarAlAbrirPasarLista(): Promise<void>;
  /** Responde igual exista o no la cuenta (delegado en GoTrue, ver `autenticacion.ts`). */
  solicitarRecuperacionContrasena(email: string): Promise<void>;
  establecerContrasenaNueva(tokenRecuperacion: string, contrasenaNueva: string): Promise<void>;
}

function nombreDeError(error: unknown): string {
  return error instanceof Error ? error.name : 'desconocido';
}

export function crearGestorSesion(opciones: OpcionesGestorSesion): GestorSesion {
  const { clienteAutenticacion, almacenSesion, logger } = opciones;
  const reloj = opciones.reloj ?? relojDelSistema;
  const margenRenovacionMs = opciones.margenRenovacionMs ?? MARGEN_RENOVACION_POR_DEFECTO_MS;

  let sesionActual: SesionGoTrue | undefined;
  let estado: EstadoSesion = { tipo: 'restaurando' };
  const escuchas = new Set<(estado: EstadoSesion) => void>();

  function fijarEstado(nuevo: EstadoSesion): void {
    estado = nuevo;
    for (const escucha of escuchas) {
      escucha(estado);
    }
  }

  async function cargarPerfilOFallar(usuarioId: string, accessToken: string): Promise<Perfil> {
    const cliente = crearClientePostgrest({
      urlBase: opciones.urlBase,
      claveAnonima: opciones.claveAnonima,
      obtenerTokenSesion: () => accessToken,
      ...(opciones.fetchImpl !== undefined ? { fetchImpl: opciones.fetchImpl } : {}),
    });
    const filas = await cliente.desde<Perfil>('perfil').eq('id', usuarioId).seleccionar();
    const perfil = filas[0];
    if (!perfil) {
      throw new ErrorDelServidor('No se ha encontrado el perfil del usuario autenticado.');
    }
    return perfil;
  }

  /** Núcleo compartido de `iniciarSesion` y `restaurar`: a partir de una `SesionGoTrue` ya
   * obtenida, carga el perfil, aplica la puerta de `activo`, y si todo va bien deja la sesión
   * activa (memoria + almacén) y notifica. Lanza `PerfilInactivo` sin dejar rastro en el almacén ni
   * en memoria. */
  async function activarSesion(sesion: SesionGoTrue): Promise<void> {
    const perfil = await cargarPerfilOFallar(sesion.usuarioId, sesion.accessToken);
    if (!perfil.activo) {
      try {
        await clienteAutenticacion.cerrarSesion(sesion.accessToken);
      } catch (error) {
        // Mejor esfuerzo: aunque falle la revocación en el servidor, localmente esta sesión nunca
        // llega a considerarse iniciada (no se persiste ni se guarda en memoria).
        logger.warn('No se ha podido revocar en el servidor la sesión de un perfil inactivo.', {
          error: nombreDeError(error),
        });
      }
      throw new PerfilInactivo();
    }
    sesionActual = sesion;
    almacenSesion.guardar({ refreshToken: sesion.refreshToken });
    fijarEstado({ tipo: 'autenticado', perfil });
  }

  return {
    obtenerEstado: () => estado,
    suscribir(escucha) {
      escuchas.add(escucha);
      return () => {
        escuchas.delete(escucha);
      };
    },
    async restaurar() {
      const persistida = almacenSesion.leer();
      if (!persistida) {
        fijarEstado({ tipo: 'sin_sesion' });
        return;
      }
      try {
        const sesion = await clienteAutenticacion.renovarSesion(persistida.refreshToken);
        await activarSesion(sesion);
      } catch (error) {
        logger.warn('No se ha podido restaurar la sesión guardada.', { error: nombreDeError(error) });
        almacenSesion.borrar();
        fijarEstado({ tipo: 'sin_sesion' });
      }
    },
    async iniciarSesion(email, contrasena) {
      const sesion = await clienteAutenticacion.iniciarSesion(email, contrasena);
      await activarSesion(sesion);
    },
    async cerrarSesion() {
      const token = sesionActual?.accessToken;
      sesionActual = undefined;
      almacenSesion.borrar();
      fijarEstado({ tipo: 'sin_sesion' });
      if (token) {
        try {
          await clienteAutenticacion.cerrarSesion(token);
        } catch (error) {
          logger.warn('No se ha podido cerrar la sesión en el servidor (ya se ha cerrado localmente).', {
            error: nombreDeError(error),
          });
        }
      }
    },
    obtenerTokenSesion: () => sesionActual?.accessToken,
    async renovarAlAbrirPasarLista() {
      if (!sesionActual) {
        return;
      }
      const restanteMs = sesionActual.expiraEnMs - reloj.ahora().getTime();
      if (restanteMs > margenRenovacionMs) {
        return;
      }
      try {
        const nuevaSesion = await clienteAutenticacion.renovarSesion(sesionActual.refreshToken);
        sesionActual = nuevaSesion;
        almacenSesion.guardar({ refreshToken: nuevaSesion.refreshToken });
      } catch (error) {
        logger.warn('No se ha podido renovar la sesión de forma proactiva.', { error: nombreDeError(error) });
        throw error;
      }
    },
    solicitarRecuperacionContrasena: (email) => clienteAutenticacion.solicitarRecuperacionContrasena(email),
    establecerContrasenaNueva: (tokenRecuperacion, contrasenaNueva) =>
      clienteAutenticacion.establecerContrasenaNueva(tokenRecuperacion, contrasenaNueva),
  };
}
