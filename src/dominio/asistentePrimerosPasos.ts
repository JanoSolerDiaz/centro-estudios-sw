/**
 * Asistente de primeros pasos para `administrator` (R-18): cuatro condiciones mínimas para que un
 * centro recién creado esté operativo — al menos un centro de estudios de referencia (T-11), un
 * alumno activo (T-12), un slot de horario vigente (T-15) y un profesor con cuenta activa además
 * del propio administrador (T-24). Puro: recibe los cuatro booleanos ya resueltos por quien llama
 * (`ui/pantallaAsistentePrimerosPasos.ts`, que los calcula contando filas ya existentes — requisito
 * 2 de R-18: "sin campo, columna ni tabla nueva") y decide la lista de pasos, en el orden fijo de la
 * spec, y si el asistente está completo.
 */

export type IdPasoAsistentePrimerosPasos = 'centro' | 'alumno' | 'horario' | 'profesor';

export interface PasoAsistentePrimerosPasos {
  readonly id: IdPasoAsistentePrimerosPasos;
  readonly etiqueta: string;
  readonly completado: boolean;
}

export interface DatosAsistentePrimerosPasos {
  readonly hayCentroDeReferencia: boolean;
  readonly hayAlumnoActivo: boolean;
  readonly haySlotVigente: boolean;
  readonly hayProfesorActivo: boolean;
}

const ETIQUETAS: Record<IdPasoAsistentePrimerosPasos, string> = {
  centro: 'Da de alta al menos un centro de estudios de referencia',
  alumno: 'Da de alta al menos un alumno activo',
  horario: 'Asigna al menos un slot de horario vigente a un alumno',
  profesor: 'Da de alta al menos un profesor con cuenta activa',
};

/** Los cuatro pasos, en el orden (a, b, c, d) de la spec — el orden en que tiene sentido
 * completarlos: sin centro no hay a quién asignar un alumno, sin alumno no hay a quién asignar un
 * horario. */
export function calcularPasosAsistentePrimerosPasos(datos: DatosAsistentePrimerosPasos): readonly PasoAsistentePrimerosPasos[] {
  return [
    { id: 'centro', etiqueta: ETIQUETAS.centro, completado: datos.hayCentroDeReferencia },
    { id: 'alumno', etiqueta: ETIQUETAS.alumno, completado: datos.hayAlumnoActivo },
    { id: 'horario', etiqueta: ETIQUETAS.horario, completado: datos.haySlotVigente },
    { id: 'profesor', etiqueta: ETIQUETAS.profesor, completado: datos.hayProfesorActivo },
  ];
}

/** ¿Están los cuatro pasos completos? (requisito 4 de R-18: deja de mostrarse por defecto cuando lo
 * están, aunque sigue accesible bajo demanda). */
export function asistentePrimerosPasosCompleto(pasos: readonly PasoAsistentePrimerosPasos[]): boolean {
  return pasos.every((paso) => paso.completado);
}
