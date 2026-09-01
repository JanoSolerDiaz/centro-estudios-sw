/**
 * Mensajes al usuario en español (T-06, requisito 4): "qué hacer, no el código de error". Cubre
 * los errores de T-06 (límite de tasa, cancelación/tiempo de espera agotado) y, desde T-08, la
 * taxonomía completa de errores de dominio de la capa de acceso a Supabase
 * (`src/datos/erroresDominio.ts`). Los mensajes de esos errores son siempre fijos, escritos aquí —
 * **nunca** se usa `error.message` directamente: para `Conflicto`/`ErrorDeValidacion` ese mensaje
 * puede venir tal cual de Postgres/PostgREST (texto técnico, a veces en inglés), y esta función
 * existe precisamente para que ese texto no llegue nunca a la interfaz. Desde T-09, añade
 * `CredencialesInvalidas` (login) y `PerfilInactivo` (perfil desactivado) — sus mensajes no revelan
 * si el email existe (requisito 9 de T-09). Desde P-01, añade `CuentaBloqueada` (tres intentos
 * fallidos).
 */

import { ErrorLimiteAlcanzado } from './limitadorTasa.ts';
import { esErrorDeCancelacion } from './controlPeticion.ts';
import { PerfilInactivo, CuentaBloqueada } from './gestorSesion.ts';
import {
  NoAutenticado,
  SinPermiso,
  Conflicto,
  ErrorDeValidacion,
  ErrorDeRed,
  ErrorDelServidor,
  FicheroDemasiadoGrande,
  TipoDeFicheroNoPermitido,
} from '../datos/erroresDominio.ts';
import { CredencialesInvalidas } from '../datos/autenticacion.ts';

const MENSAJE_POR_DEFECTO = 'No se ha podido completar la acción. Inténtalo de nuevo en unos segundos.';

function formatearSegundos(ms: number): string {
  const segundos = Math.max(1, Math.ceil(ms / 1000));
  return `${String(segundos)} segundo${segundos === 1 ? '' : 's'}`;
}

/** Traduce un error técnico a un mensaje accionable en español. No revela nunca el error original. */
export function mensajeAmigable(error: unknown): string {
  if (error instanceof ErrorLimiteAlcanzado) {
    return `Estás haciendo esta acción demasiado rápido. Espera ${formatearSegundos(error.reintentarEnMs)} e inténtalo de nuevo.`;
  }
  if (esErrorDeCancelacion(error)) {
    return 'La operación ha tardado demasiado o se ha cancelado. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof CredencialesInvalidas) {
    return 'Email o contraseña incorrectos.';
  }
  if (error instanceof PerfilInactivo) {
    return 'Tu cuenta está desactivada. Habla con el administrador del centro.';
  }
  if (error instanceof CuentaBloqueada) {
    return 'Tu cuenta se ha bloqueado por varios intentos fallidos. Habla con el administrador para desbloquearla.';
  }
  if (error instanceof NoAutenticado) {
    return 'Tu sesión ha caducado o no has iniciado sesión. Vuelve a iniciar sesión.';
  }
  if (error instanceof SinPermiso) {
    return 'No tienes permiso para hacer esto. Si crees que deberías tenerlo, habla con el administrador.';
  }
  if (error instanceof Conflicto) {
    return 'Esta acción no se puede completar porque entra en conflicto con datos ya existentes.';
  }
  if (error instanceof ErrorDeValidacion) {
    return 'Revisa los datos introducidos: alguno de ellos no es válido.';
  }
  if (error instanceof FicheroDemasiadoGrande) {
    return 'El fichero es demasiado grande. Elige uno más pequeño.';
  }
  if (error instanceof TipoDeFicheroNoPermitido) {
    return 'Ese tipo de fichero no está permitido.';
  }
  if (error instanceof ErrorDeRed) {
    return 'No se ha podido conectar. Comprueba tu conexión a internet e inténtalo de nuevo.';
  }
  if (error instanceof ErrorDelServidor) {
    return MENSAJE_POR_DEFECTO;
  }
  return MENSAJE_POR_DEFECTO;
}
