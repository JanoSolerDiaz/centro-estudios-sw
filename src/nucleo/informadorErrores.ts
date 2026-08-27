/**
 * Informador de errores (T-05). Punto único por el que pasa cualquier error no controlado antes
 * de llegar al logger (T-02) y, opcionalmente, a la RPC remota `registrar_evento_error` (la tabla
 * y la RPC viajan en el esquema de T-07; hasta que exista, `enviar` queda sin configurar y el
 * informador solo registra en local — ver DECISIONES_TECNICAS.md). El `contexto` — y el propio
 * `mensaje`/`pila`, que no son cadenas fijas escritas por quien programa sino texto arbitrario de
 * una excepción real — pasan por `depurarContexto` antes de salir de este módulo: nunca deben
 * llegar datos personales, rutas de avatar ni tokens al sumidero remoto.
 */

import { type Logger, depurarContexto } from './registro.ts';

export type OrigenErrorCapturado = 'no_controlado' | 'promesa_rechazada' | 'capa_datos';

/** Carga ya depurada, lista para viajar a la RPC remota. */
export type CargaEventoError = Readonly<Record<string, unknown>> & {
  readonly origen: OrigenErrorCapturado;
};

/** Implementación real en `src/datos/eventoError.ts` (T-05): la RPC fija ella misma el instante y
 * el autor, así que esta carga nunca incluye ninguno de los dos. */
export type EnviadorEventoError = (carga: CargaEventoError) => Promise<void>;

export interface InformadorErrores {
  informar(origen: OrigenErrorCapturado, error: unknown, contexto?: Record<string, unknown>): void;
}

function extraerMensaje(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return String(error);
  } catch {
    return 'Error desconocido';
  }
}

function extraerPila(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/**
 * Fábrica del informador. `enviar` es opcional a propósito: sin él (hoy, antes de T-07/T-08), el
 * informador se limita a registrar en el logger local, que ya depura por su cuenta. Con él, además
 * intenta persistir en `evento_error` — y **nunca** deja que ese intento falle en cascada: un
 * fallo de `enviar` se registra una sola vez con `logger.warn` y ahí termina, sin volver a llamar
 * a `informar` (eso sería la recursión que la spec de T-05 prohíbe explícitamente).
 */
export function crearInformadorErrores(logger: Logger, enviar?: EnviadorEventoError): InformadorErrores {
  return {
    informar(origen, error, contexto) {
      try {
        const cargaCruda = {
          origen,
          mensaje: extraerMensaje(error),
          pila: extraerPila(error),
          ...contexto,
        };
        const cargaDepurada = depurarContexto(cargaCruda) as CargaEventoError;

        logger.error('Error capturado', cargaDepurada);

        if (!enviar) {
          return;
        }

        try {
          enviar(cargaDepurada).catch((fallo: unknown) => {
            logger.warn('No se pudo registrar el evento de error en el servidor', {
              origen,
              causa: extraerMensaje(fallo),
            });
          });
        } catch (fallo) {
          logger.warn('No se pudo registrar el evento de error en el servidor', {
            origen,
            causa: extraerMensaje(fallo),
          });
        }
      } catch (falloInterno) {
        // Defensa final: informar() se llama desde manejadores globales (window.onerror,
        // unhandledrejection). Si algo de lo anterior lanzara, NO debe volver a disparar esos
        // manejadores (eso sí sería un bucle real). No hay nada más seguro que hacer aquí que
        // tragarse el fallo tras un único intento de log.
        try {
          logger.warn('Fallo interno del informador de errores', { causa: extraerMensaje(falloInterno) });
        } catch {
          // Ni siquiera el logger puede fallar de forma segura más allá de esto.
        }
      }
    },
  };
}
