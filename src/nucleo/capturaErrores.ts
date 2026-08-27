/**
 * Captura de errores no controlados (T-05): conecta los eventos globales del navegador
 * (`error`, `unhandledrejection`) con un `InformadorErrores`. Recibe el `objetivo` por parámetro
 * (nunca lee `window` directamente) para poder testearse con un `EventTarget` de `jsdom`, igual
 * que el resto de módulos de este proyecto reciben sus dependencias por inyección.
 */

import type { InformadorErrores } from './informadorErrores.ts';

/** Subconjunto de `Window` que este módulo necesita: los dos eventos globales de error. */
export interface ObjetivoDeCapturaDeErrores {
  addEventListener(tipo: 'error', listener: (evento: ErrorEvent) => void): void;
  addEventListener(tipo: 'unhandledrejection', listener: (evento: PromiseRejectionEvent) => void): void;
  removeEventListener(tipo: 'error', listener: (evento: ErrorEvent) => void): void;
  removeEventListener(tipo: 'unhandledrejection', listener: (evento: PromiseRejectionEvent) => void): void;
}

/** Desinstala los manejadores instalados por `instalarCapturaErrores`. */
export type Desinstalador = () => void;

export function instalarCapturaErrores(
  objetivo: ObjetivoDeCapturaDeErrores,
  informador: InformadorErrores,
): Desinstalador {
  function manejarError(evento: ErrorEvent): void {
    informador.informar('no_controlado', evento.error ?? evento.message, {
      archivo: evento.filename || undefined,
      linea: evento.lineno || undefined,
      columna: evento.colno || undefined,
    });
  }

  function manejarRechazo(evento: PromiseRejectionEvent): void {
    informador.informar('promesa_rechazada', evento.reason);
  }

  objetivo.addEventListener('error', manejarError);
  objetivo.addEventListener('unhandledrejection', manejarRechazo);

  return () => {
    objetivo.removeEventListener('error', manejarError);
    objetivo.removeEventListener('unhandledrejection', manejarRechazo);
  };
}
