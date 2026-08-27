/**
 * Limitador de tasa genérico (T-06), en memoria, por clave y ventana fija con reloj inyectado.
 * Cubre el requisito 2 de T-06 ("máximo de operaciones por usuario y minuto, devolviendo un error
 * identificable") como pieza reutilizable: hoy no hay ninguna RPC de escritura a la que conectarlo
 * (`registrar_asistencia`/`actualizar_asistencia` son T-18/T-21, la subida de avatar es T-14, todas
 * con migración propia todavía sin escribir), así que el límite real y autoritativo siempre vivirá
 * en la RPC de PostgreSQL, donde no se puede esquivar. Este limitador es la pieza de cliente para
 * defensa en profundidad (evita disparar una petición que el servidor va a rechazar de todos
 * modos) y fija el contrato — clave, máximo, ventana, error identificable — que esas tareas
 * futuras deben replicar en SQL. Los valores recomendados de máximo/ventana por operación quedan
 * documentados en `DECISIONES_TECNICAS.md`, no aquí: este módulo no conoce ninguna operación
 * concreta.
 */

import type { Reloj } from './reloj.ts';

/** Error identificable (requisito 2 de T-06): el llamante lo distingue de cualquier otro fallo y
 * puede mostrar un mensaje distinto (ver `mensajesAbuso.ts`) sin inspeccionar texto de error. */
export class ErrorLimiteAlcanzado extends Error {
  readonly reintentarEnMs: number;

  constructor(reintentarEnMs: number) {
    super(`Límite de operaciones alcanzado; se puede reintentar en ${String(reintentarEnMs)} ms`);
    this.name = 'ErrorLimiteAlcanzado';
    this.reintentarEnMs = reintentarEnMs;
  }
}

export interface OpcionesLimitadorTasa {
  /** Número máximo de operaciones permitidas por clave dentro de una ventana. */
  readonly maximo: number;
  /** Duración de la ventana, en milisegundos. */
  readonly ventanaMs: number;
  readonly reloj: Reloj;
}

export interface LimitadorTasa {
  /**
   * Cuenta un intento para `clave` (p. ej. `${operacion}:${usuarioId}`). Lanza
   * `ErrorLimiteAlcanzado` si `clave` ya alcanzó el máximo en la ventana actual; si no, registra el
   * intento y no lanza.
   */
  comprobar(clave: string): void;
}

interface EstadoVentana {
  inicioMs: number;
  cuenta: number;
}

export function crearLimitadorTasa(opciones: OpcionesLimitadorTasa): LimitadorTasa {
  const { maximo, ventanaMs, reloj } = opciones;
  const ventanasPorClave = new Map<string, EstadoVentana>();

  return {
    comprobar(clave) {
      const ahoraMs = reloj.ahora().getTime();
      const ventana = ventanasPorClave.get(clave);

      if (!ventana || ahoraMs - ventana.inicioMs >= ventanaMs) {
        ventanasPorClave.set(clave, { inicioMs: ahoraMs, cuenta: 1 });
        return;
      }

      if (ventana.cuenta >= maximo) {
        throw new ErrorLimiteAlcanzado(ventana.inicioMs + ventanaMs - ahoraMs);
      }

      ventana.cuenta += 1;
    },
  };
}
