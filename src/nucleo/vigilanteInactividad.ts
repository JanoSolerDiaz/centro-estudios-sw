/**
 * Vigilante de inactividad (R-35): decide cuándo avisar y cuándo cerrar la sesión. Se apoya en
 * marcas de tiempo del reloj inyectable, no solo en el temporizador: los navegadores móviles
 * retrasan los temporizadores en segundo plano, así que se reevalúa también al volver la pestaña a
 * primer plano y ANTES de contar cualquier interacción como actividad (un toque sobre una tablet
 * dormida pasado el plazo cierra la sesión, no la reactiva).
 */

import { evaluarInactividad } from '../dominio/inactividadSesion.ts';
import type { Reloj } from './reloj.ts';
import type { ProgramadorIntervalo } from './programadorIntervalo.ts';

export interface FuenteActividad {
  /** Toques, teclado, desplazamiento. Devuelve la función para dejar de escuchar. */
  alActividad(escuchador: () => void): () => void;
  /** La pestaña vuelve a primer plano. */
  alVolverAPrimerPlano(escuchador: () => void): () => void;
}

export interface OpcionesVigilanteInactividad {
  readonly plazoMs: number;
  readonly reloj: Reloj;
  readonly programador: ProgramadorIntervalo;
  readonly fuente: FuenteActividad;
  /** Registros de asistencia sin enviar (cola offline), para decirlo en el aviso. */
  readonly contarPendientes?: () => Promise<number>;
  readonly mostrarAviso: (segundosRestantes: number, pendientes: number) => void;
  readonly ocultarAviso: () => void;
  /** Cierra la sesión. Se llama una sola vez; el vigilante se detiene solo. */
  readonly alCaducar: () => void;
}

export interface VigilanteInactividad {
  /** «Seguir conectado»: cuenta como actividad. */
  continuar(): void;
  detener(): void;
}

export const PERIODO_COMPROBACION_MS = 1000;

export function crearVigilanteInactividad(opciones: OpcionesVigilanteInactividad): VigilanteInactividad {
  let ultimaActividadMs = opciones.reloj.ahora().getTime();
  let detenido = false;
  let avisoVisible = false;
  let pendientes = 0;
  let consultandoPendientes = false;

  function evaluar(): 'activa' | 'aviso' | 'caducada' {
    return evaluarInactividad({ plazoMs: opciones.plazoMs, ultimaActividadMs, ahoraMs: opciones.reloj.ahora().getTime() }).estado;
  }

  function comprobar(): void {
    if (detenido) {
      return;
    }
    const evaluacion = evaluarInactividad({
      plazoMs: opciones.plazoMs,
      ultimaActividadMs,
      ahoraMs: opciones.reloj.ahora().getTime(),
    });
    if (evaluacion.estado === 'caducada') {
      detener();
      opciones.alCaducar();
      return;
    }
    if (evaluacion.estado === 'aviso') {
      if (!avisoVisible && opciones.contarPendientes && !consultandoPendientes) {
        consultandoPendientes = true;
        void opciones
          .contarPendientes()
          .then((n) => {
            pendientes = n;
          })
          .catch(() => {
            pendientes = 0;
          })
          .finally(() => {
            consultandoPendientes = false;
          });
      }
      avisoVisible = true;
      opciones.mostrarAviso(evaluacion.segundosRestantes, pendientes);
      return;
    }
    if (avisoVisible) {
      avisoVisible = false;
      opciones.ocultarAviso();
    }
  }

  function registrarActividad(): void {
    if (detenido) {
      return;
    }
    // Primero se evalúa: pasado el plazo, la interacción no rescata la sesión.
    if (evaluar() === 'caducada') {
      comprobar();
      return;
    }
    ultimaActividadMs = opciones.reloj.ahora().getTime();
    pendientes = 0;
    comprobar();
  }

  const cancelarActividad = opciones.fuente.alActividad(registrarActividad);
  const cancelarPrimerPlano = opciones.fuente.alVolverAPrimerPlano(comprobar);
  const cancelarTemporizador = opciones.programador.cada(PERIODO_COMPROBACION_MS, comprobar);

  function detener(): void {
    if (detenido) {
      return;
    }
    detenido = true;
    cancelarActividad();
    cancelarPrimerPlano();
    cancelarTemporizador();
    if (avisoVisible) {
      avisoVisible = false;
      opciones.ocultarAviso();
    }
  }

  return { continuar: registrarActividad, detener };
}

/** Forma mínima de `Document` que necesita la fuente real. */
export interface DocumentoActividad {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(tipo: string, escuchador: () => void, opciones?: AddEventListenerOptions): void;
  removeEventListener(tipo: string, escuchador: () => void, opciones?: EventListenerOptions): void;
}

const EVENTOS_ACTIVIDAD = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

export function crearFuenteActividadNavegador(documento: DocumentoActividad): FuenteActividad {
  return {
    alActividad(escuchador) {
      for (const tipo of EVENTOS_ACTIVIDAD) {
        documento.addEventListener(tipo, escuchador, { capture: true, passive: true });
      }
      return () => {
        for (const tipo of EVENTOS_ACTIVIDAD) {
          documento.removeEventListener(tipo, escuchador, { capture: true });
        }
      };
    },
    alVolverAPrimerPlano(escuchador) {
      const alCambiar = () => {
        if (documento.visibilityState === 'visible') {
          escuchador();
        }
      };
      documento.addEventListener('visibilitychange', alCambiar);
      return () => {
        documento.removeEventListener('visibilitychange', alCambiar);
      };
    },
  };
}
