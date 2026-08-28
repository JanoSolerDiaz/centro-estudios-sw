/**
 * Orquestación de sesión (T-09): junta el cliente de GoTrue (`autenticacion.ts`) con el cliente de
 * PostgREST (`postgrest.ts`, para cargar el `perfil` propio) y el almacén de sesión
 * (`almacenSesion.ts`), y aplica las dos reglas de negocio de la spec que no son responsabilidad de
 * ninguno de esos tres por separado: un `perfil.activo = false` no entra aunque las credenciales
 * sean correctas (requisito 7), y la renovación de token es siempre **proactiva** — se dispara
 * explícitamente al abrir una pantalla que la necesita, nunca esperando a un `401` (requisito 5).
 * Desde P-01 (ampliación de T-09), también rechaza un `perfil.bloqueado = true` de la misma forma
 * que un inactivo, y cuenta cada contraseña incorrecta contra `registrar_intento_fallido` (con la
 * clave anónima, porque todavía no hay sesión) para que la base de datos bloquee al tercer fallo.
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
import { ErrorDelServidor, NoAutenticado } from '../datos/erroresDominio.ts';
import { CredencialesInvalidas } from '../datos/autenticacion.ts';
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

/** Perfil bloqueado tras tres contraseñas incorrectas (P-01, ampliación de T-09). Igual que
 * `PerfilInactivo`: las credenciales eran correctas, pero no se entra. Solo un administrador puede
 * levantar el bloqueo (`desbloquearUsuario`); el afectado no puede hacerlo por sí mismo. */
export class CuentaBloqueada extends Error {
  constructor(
    mensaje = 'Tu cuenta se ha bloqueado por varios intentos fallidos. Habla con el administrador para desbloquearla.',
  ) {
    super(mensaje);
    this.name = 'CuentaBloqueada';
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
  /** Lanza `CredencialesInvalidas` (email o contraseña incorrectos), `PerfilInactivo` o
   * `CuentaBloqueada` (P-01, tres intentos fallidos). */
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
  /**
   * Levanta el bloqueo de una cuenta (P-01): pone `bloqueado = false` e `intentos_fallidos = 0` en
   * `perfil`. Requiere sesión de `administrator` — lo exige la RPC `admin_desbloquear_usuario` en
   * la base de datos, no esta función; un `teacher` recibiría `SinPermiso` de todos modos. Sin
   * consumidor todavía (T-24, administración de usuarios, sigue `PENDIENTE`): queda listo y
   * testeado contra dobles para cuando exista esa pantalla.
   */
  desbloquearUsuario(usuarioId: string): Promise<void>;
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

  function clientePostgrest(obtenerTokenSesion?: () => string | undefined) {
    return crearClientePostgrest({
      urlBase: opciones.urlBase,
      claveAnonima: opciones.claveAnonima,
      ...(obtenerTokenSesion !== undefined ? { obtenerTokenSesion } : {}),
      ...(opciones.fetchImpl !== undefined ? { fetchImpl: opciones.fetchImpl } : {}),
    });
  }

  async function cargarPerfilOFallar(usuarioId: string, accessToken: string): Promise<Perfil> {
    const cliente = clientePostgrest(() => accessToken);
    const filas = await cliente.desde<Perfil>('perfil').eq('id', usuarioId).seleccionar();
    const perfil = filas[0];
    if (!perfil) {
      throw new ErrorDelServidor('No se ha encontrado el perfil del usuario autenticado.');
    }
    return perfil;
  }

  /** Mejor esfuerzo: quien llama ya tiene un `CredencialesInvalidas` que lanzar, y esta llamada
   * nunca debe enmascararlo ni bloquear el login por un fallo de red al contarlo (P-01). Sin
   * `obtenerTokenSesion`: todavía no hay sesión, así que usa la clave anónima (`registrar_intento_fallido`
   * es `SECURITY DEFINER`, llamable por `anon`). Responde igual exista o no la cuenta (requisito 9
   * de T-09): esta función no distingue ningún caso, solo intenta y registra el fallo si lo hay. */
  async function registrarIntentoFallido(email: string): Promise<void> {
    try {
      await clientePostgrest().rpc('registrar_intento_fallido', { p_email: email });
    } catch (error) {
      logger.warn('No se ha podido registrar el intento de login fallido.', { error: nombreDeError(error) });
    }
  }

  /** Revoca en el servidor una sesión que no va a considerarse iniciada (perfil `inactivo` o
   * `bloqueado`), mejor esfuerzo: si la revocación falla, se registra y se sigue igual — localmente
   * esta sesión nunca llega a persistirse ni a guardarse en memoria. */
  async function revocarSesionSinDejarRastro(accessToken: string, motivo: string): Promise<void> {
    try {
      await clienteAutenticacion.cerrarSesion(accessToken);
    } catch (error) {
      logger.warn(`No se ha podido revocar en el servidor la sesión de un perfil ${motivo}.`, {
        error: nombreDeError(error),
      });
    }
  }

  /** Núcleo compartido de `iniciarSesion` y `restaurar`: a partir de una `SesionGoTrue` ya
   * obtenida, carga el perfil y aplica las puertas de `activo` y `bloqueado`; si todo va bien deja
   * la sesión activa (memoria + almacén) y notifica. Lanza `PerfilInactivo`/`CuentaBloqueada` sin
   * dejar rastro en el almacén ni en memoria. */
  async function activarSesion(sesion: SesionGoTrue): Promise<void> {
    const perfil = await cargarPerfilOFallar(sesion.usuarioId, sesion.accessToken);
    if (!perfil.activo) {
      await revocarSesionSinDejarRastro(sesion.accessToken, 'inactivo');
      throw new PerfilInactivo();
    }
    if (perfil.bloqueado) {
      await revocarSesionSinDejarRastro(sesion.accessToken, 'bloqueado');
      throw new CuentaBloqueada();
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
      let sesion: SesionGoTrue;
      try {
        sesion = await clienteAutenticacion.iniciarSesion(email, contrasena);
      } catch (error) {
        if (error instanceof CredencialesInvalidas) {
          // `registrarIntentoFallido` nunca lanza (mejor esfuerzo): un fallo de red al contar el
          // intento no debe enmascarar ni sustituir el CredencialesInvalidas de más abajo.
          await registrarIntentoFallido(email);
        }
        throw error;
      }
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
    async desbloquearUsuario(usuarioId) {
      if (!sesionActual) {
        throw new NoAutenticado();
      }
      const token = sesionActual.accessToken;
      await clientePostgrest(() => token).rpc('admin_desbloquear_usuario', { p_usuario_id: usuarioId });
    },
  };
}
