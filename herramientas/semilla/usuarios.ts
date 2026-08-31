/**
 * Siembra de los usuarios de desarrollo (T-07, ampliada al resolver P-07).
 *
 * Se ejecuta SIEMPRE, al margen del marcador de idempotencia de `herramientas/seed.ts`: ese
 * marcador —el primer centro de `CENTROS_SEMILLA`— protege las FILAS DE DATOS, que sí se
 * duplicarían al re-sembrar, pero no a los usuarios. Cuando los usuarios iban detrás del
 * marcador, añadir uno nuevo a `USUARIOS_SEMILLA` no servía de nada: la siguiente ejecución veía
 * el centro y se iba sin crearlo.
 *
 * Cada usuario se intenta por separado y el fallo de uno no aborta el resto, para que añadir un
 * usuario a la lista baste para que la siguiente ejecución lo cree sin tocar los que ya están.
 * La distinción importa: un 4xx es "este usuario ya estaba, o su alta fue rechazada" y se anota;
 * un 5xx es el servidor caído y se propaga, porque tragárselo daría una siembra en verde con
 * usuarios que no existen.
 */

import { ErrorClienteAdmin, type ClienteAdmin } from './clienteAdmin.ts';
import type { UsuarioSemilla } from './datosFicticios.ts';

export interface ResumenUsuarios {
  /** Usuarios que esta ejecución ha dado de alta. */
  readonly creados: number;
  /** Usuarios que ya existían, o cuyo alta rechazó GoTrue con un 4xx. */
  readonly omitidos: number;
}

export async function sembrarUsuarios(
  cliente: ClienteAdmin,
  usuarios: readonly UsuarioSemilla[],
  registrar: (mensaje: string) => void,
): Promise<ResumenUsuarios> {
  let creados = 0;
  let omitidos = 0;

  for (const usuario of usuarios) {
    try {
      const id = await cliente.crearUsuario(usuario.email, usuario.password, usuario.nombre);
      // El trigger del bootstrap crea el perfil como 'student'; lo subimos si hace falta.
      if (usuario.rol !== 'student') {
        await cliente.actualizarRolPerfil(id, usuario.rol);
      }
      creados += 1;
      registrar(`seed: usuario ${usuario.email} (${usuario.rol}) creado`);
    } catch (error) {
      const esRechazoDelAlta =
        error instanceof ErrorClienteAdmin && error.estadoHttp >= 400 && error.estadoHttp < 500;
      if (!esRechazoDelAlta) {
        throw error;
      }
      omitidos += 1;
      // Se imprime el CUERPO, no solo el mensaje: es donde GoTrue dice si el email ya estaba
      // registrado o si el alta se rechazó por otra cosa, y son casos muy distintos.
      registrar(
        `seed: usuario ${usuario.email} no creado (HTTP ${String(error.estadoHttp)}) — ` +
          `${error.cuerpo}. Se continúa con el resto.`,
      );
    }
  }

  return { creados, omitidos };
}
