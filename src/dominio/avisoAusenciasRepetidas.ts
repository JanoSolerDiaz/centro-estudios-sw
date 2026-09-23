/**
 * Aviso de ausencias repetidas, donde el profesor ya mira (R-28): qué alumnos, entre los que trae
 * quien llama, acumulan `UMBRAL_AVISO_AUSENCIAS_REPETIDAS` ausencias sin justificar o más en los
 * últimos `VENTANA_AVISO_AUSENCIAS_REPETIDAS_DIAS` días — para pintar un indicador discreto en
 * `pantallaPasarLista.ts` (T-19) y `pantallaMiHorario.ts` (T-22), las dos pantallas donde un
 * profesor ya mira a diario (requisito 1/2 de R-28).
 *
 * Requisito 3 de R-28, literal: reutiliza `dominio/panelCentro.ts#rankingAusenciasSinJustificarPanelCentro`
 * (R-11) TAL CUAL, sin ninguna función nueva de conteo — incluido su filtro de días pausados (R-21)
 * vía el parámetro `pausas`. Este módulo solo filtra el resultado al umbral y lo indexa por
 * `alumnoId` para una consulta O(1) por card, en vez del orden pensado para un ranking legible. El
 * mapa de alumnos que pide `rankingAusenciasSinJustificarPanelCentro` para resolver nombres se pasa
 * vacío a propósito: ni pasar lista ni "Mi horario" necesitan aquí el nombre (ya lo pintan ellos
 * mismos con el dato que ya tienen de la card), así que ningún alumno queda fuera del conteo por no
 * estar en un mapa que este módulo no construye.
 */

import type { Asistencia, PausaAlumno } from './tipos.ts';
import { rankingAusenciasSinJustificarPanelCentro, type AlumnoParaPanelCentro } from './panelCentro.ts';
import { ZONA_HORARIA_CENTRO_POR_DEFECTO } from './slots.ts';

/** Requisito 1 de R-28: a partir de cuántas ausencias sin justificar recientes aparece el indicador. */
export const UMBRAL_AVISO_AUSENCIAS_REPETIDAS = 3;

/** Requisito 1 de R-28: ventana de días naturales en la que se cuentan las ausencias sin justificar. */
export const VENTANA_AVISO_AUSENCIAS_REPETIDAS_DIAS = 30;

export interface ParametrosAusenciasRepetidas {
  /** Registros del profesor (o de los alumnos en alcance) en la ventana — mismo criterio que
   * `rankingAusenciasSinJustificarPanelCentro`: quien llama ya acotó la consulta por fecha y, en
   * pasar lista/"Mi horario", por `profesorId` (requisito 3: "nunca a todo el centro"). */
  readonly asistencias: readonly Pick<Asistencia, 'alumno_id' | 'estado' | 'motivo_justificacion' | 'ocurrido_en'>[];
  /** Pausas ACTIVAS (R-21) de los alumnos en alcance — mismo criterio de exclusión que el ranking
   * del panel de centro (requisito 3). Opcional: sin ella, ninguna ausencia se excluye por pausa. */
  readonly pausas?: readonly PausaAlumno[];
  readonly umbral?: number;
  readonly zonaHoraria?: string;
}

/** `alumnoId` → nº de ausencias sin justificar recientes, solo para quienes alcanzan `umbral`
 * (por defecto `UMBRAL_AVISO_AUSENCIAS_REPETIDAS`) — ver cabecera del módulo. */
export function ausenciasRepetidasPorAlumno(parametros: ParametrosAusenciasRepetidas): ReadonlyMap<string, number> {
  const umbral = parametros.umbral ?? UMBRAL_AVISO_AUSENCIAS_REPETIDAS;
  const ranking = rankingAusenciasSinJustificarPanelCentro(
    parametros.asistencias,
    new Map<string, AlumnoParaPanelCentro>(),
    parametros.pausas ?? [],
    parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO,
  );

  const mapa = new Map<string, number>();
  for (const fila of ranking) {
    if (fila.ausenciasSinJustificar >= umbral) {
      mapa.set(fila.alumnoId, fila.ausenciasSinJustificar);
    }
  }
  return mapa;
}
