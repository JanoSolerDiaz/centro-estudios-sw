/**
 * Análisis puro de un CSV de horarios (R-08, requisito 3). Sin acceso a red ni al DOM, igual que
 * `importacionAlumnos.ts`: recibe las filas ya separadas por `nucleo/csv.ts#analizarCsv`, la lista de
 * alumnos ya existentes (los recién importados por el CSV de alumnos en esta misma sesión cuentan
 * como "ya existentes" en cuanto se confirman, igual que uno dado de alta a mano — la spec dice
 * literalmente "de una fila ya importada o ya existente": desde el punto de vista de este CSV son la
 * misma comprobación) y un mapa de profesores ya resueltos por email (requisito 3: "profesor por
 * email de una cuenta que ya existe") — resolver un email exige red (`datos/profesores.ts#
 * resolverProfesorPorEmail`, RPC `resolver_profesor_por_email`), así que esa parte la hace quien
 * llama, ANTES de invocar esta función, con `emailsProfesorUnicosDeCsvHorarios` para saber qué
 * emails resolver sin repetir peticiones por cada fila que comparta el mismo profesor.
 *
 * **Alumno por "nombre y apellidos exactos" (requisito 3, literal):** a diferencia de la comparación
 * de duplicados de `importacionAlumnos.ts` (acento-insensible, para no crear un alumno que ya existe
 * bajo una variante de tildes), aquí el emparejamiento es EXACTO tras solo recortar espacios — la
 * spec no pide tolerancia aquí, y confundir a un alumno con otro de nombre parecido en un horario
 * sería más grave que un alta duplicada evitable a mano.
 *
 * **Sin comprobación de duplicado propia para reimportar (a diferencia de los alumnos):** un horario
 * repetido para el mismo alumno, día y hora ya lo rechaza `slotHorario.ts#buscarSlotSolapado`
 * (requisito 4 de T-15, "el mismo alumno... bloquea") en el momento de escribir
 * (`datos/importacionMasiva.ts#importarHorariosValidados`, que reutiliza `crearSlot` fila a fila) —
 * a diferencia de `alumno`, que no tiene ninguna restricción de unicidad natural y por eso SÍ necesita
 * el filtro de cliente de `importacionAlumnos.ts`. Reimportar el mismo fichero de horarios sin
 * corregir nada simplemente falla esa fila al confirmar, con el mismo motivo que cualquier otro
 * solape — documentado en DECISIONES_TECNICAS.md.
 */

import type { DiaSemana } from './tipos.ts';
import { ETIQUETA_DIA_SEMANA } from './tipos.ts';
import { normalizarNombrePersona } from './alumno.ts';

export const CABECERA_HORARIOS_CSV = [
  'alumno_nombre',
  'alumno_primer_apellido',
  'alumno_segundo_apellido',
  'profesor_email',
  'dia_semana',
  'hora_inicio',
  'hora_fin',
  'asignatura_o_grupo',
] as const;

export interface AlumnoParaEmparejarHorario {
  readonly id: string;
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
}

export interface ProfesorResuelto {
  readonly id: string;
  readonly nombre: string;
}

export interface DatosHorarioImportado {
  readonly alumno_id: string;
  readonly profesor_id: string;
  readonly dia_semana: DiaSemana;
  readonly hora_inicio: string;
  readonly hora_fin: string;
  readonly asignatura_o_grupo: string | null;
}

export interface FilaHorarioCsvNueva {
  readonly numeroFila: number;
  readonly estado: 'nueva';
  readonly datos: DatosHorarioImportado;
  readonly descripcion: string;
}

export interface FilaHorarioCsvError {
  readonly numeroFila: number;
  readonly estado: 'error';
  readonly motivo: string;
  readonly valoresOriginales: readonly string[];
}

export type FilaHorarioCsv = FilaHorarioCsvNueva | FilaHorarioCsvError;

export interface ResultadoAnalisisHorariosCsv {
  readonly errorCabecera: string | null;
  readonly filas: readonly FilaHorarioCsv[];
}

function celda(fila: readonly string[], indice: number): string {
  return (fila[indice] ?? '').trim();
}

function claveDia(etiqueta: string): string {
  return etiqueta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const DIAS_POR_ETIQUETA: ReadonlyMap<string, DiaSemana> = new Map([
  [claveDia(ETIQUETA_DIA_SEMANA[1]), 1],
  [claveDia(ETIQUETA_DIA_SEMANA[2]), 2],
  [claveDia(ETIQUETA_DIA_SEMANA[3]), 3],
  [claveDia(ETIQUETA_DIA_SEMANA[4]), 4],
  [claveDia(ETIQUETA_DIA_SEMANA[5]), 5],
  [claveDia(ETIQUETA_DIA_SEMANA[6]), 6],
  [claveDia(ETIQUETA_DIA_SEMANA[7]), 7],
]);

/** Acepta el dígito `1`-`7` o el nombre del día en español (acento-insensible, sin distinguir
 * mayúsculas: "Miércoles", "miercoles" y "MIÉRCOLES" son todos `3`) — más cómodo de teclear en una
 * hoja de cálculo que el número interno. `undefined` si no coincide con ninguno de los dos. */
export function diaSemanaDesdeTexto(texto: string): DiaSemana | undefined {
  const valor = texto.trim();
  if (/^[1-7]$/.test(valor)) {
    return Number(valor) as DiaSemana;
  }
  return DIAS_POR_ETIQUETA.get(valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
}

/** Emails distintos (recortados, en minúsculas) que aparecen en la columna `profesor_email` de las
 * filas de datos — para que quien llama resuelva cada uno una sola vez con
 * `datos/profesores.ts#resolverProfesorPorEmail` antes de invocar `analizarCsvHorarios`, en vez de
 * repetir la misma petición de red por cada fila que comparta profesor. Ignora la cabecera (siempre
 * la primera fila) y cualquier valor vacío. */
export function emailsProfesorUnicosDeCsvHorarios(filasCrudas: readonly (readonly string[])[]): readonly string[] {
  const [, ...filasDatos] = filasCrudas;
  const emails = new Set<string>();
  for (const fila of filasDatos) {
    const email = celda(fila, 3).toLowerCase();
    if (email.length > 0) {
      emails.add(email);
    }
  }
  return [...emails];
}

function alumnoCoincide(candidato: { nombre: string; primerApellido: string; segundoApellido: string | null }, existente: AlumnoParaEmparejarHorario): boolean {
  return (
    candidato.nombre === existente.nombre &&
    candidato.primerApellido === existente.primer_apellido &&
    candidato.segundoApellido === existente.segundo_apellido
  );
}

/** Analiza las filas ya separadas de un CSV de horarios (requisito 3 de R-08). `filasCrudas` incluye
 * la cabecera como primera fila. `alumnosExistentes` es el mismo catálogo completo que usa
 * `importacionAlumnos.ts` (una única lectura, no una consulta por fila); `profesoresPorEmail` ya
 * viene resuelto (clave: email en minúsculas recortado, valor `null` si no hay ninguna cuenta de
 * `teacher` activo con ese email) por quien llama, con `emailsProfesorUnicosDeCsvHorarios` de arriba. */
export function analizarCsvHorarios(
  filasCrudas: readonly (readonly string[])[],
  alumnosExistentes: readonly AlumnoParaEmparejarHorario[],
  profesoresPorEmail: ReadonlyMap<string, ProfesorResuelto | null>,
): ResultadoAnalisisHorariosCsv {
  const [cabecera, ...filasDatos] = filasCrudas;
  if (!cabecera || cabecera.length < CABECERA_HORARIOS_CSV.length || !CABECERA_HORARIOS_CSV.every((col, i) => celda(cabecera, i) === col)) {
    return {
      errorCabecera: `La cabecera debe ser exactamente: ${CABECERA_HORARIOS_CSV.join(';')}`,
      filas: [],
    };
  }

  const filas: FilaHorarioCsv[] = [];

  filasDatos.forEach((filaCruda, indice) => {
    const numeroFila = indice + 2;
    const nombre = normalizarNombrePersona(celda(filaCruda, 0));
    const primerApellido = normalizarNombrePersona(celda(filaCruda, 1));
    const segundoApellidoTexto = normalizarNombrePersona(celda(filaCruda, 2));
    const segundoApellido = segundoApellidoTexto.length > 0 ? segundoApellidoTexto : null;
    const emailProfesor = celda(filaCruda, 3).toLowerCase();
    const diaTexto = celda(filaCruda, 4);
    const horaInicio = celda(filaCruda, 5);
    const horaFin = celda(filaCruda, 6);
    const asignaturaTexto = normalizarNombrePersona(celda(filaCruda, 7));
    const asignatura = asignaturaTexto.length > 0 ? asignaturaTexto : null;

    function error(motivo: string): void {
      filas.push({ numeroFila, estado: 'error', motivo, valoresOriginales: filaCruda });
    }

    if (nombre.length === 0 || primerApellido.length === 0) {
      error('El nombre y el primer apellido del alumno son obligatorios.');
      return;
    }
    const alumno = alumnosExistentes.find((existente) => alumnoCoincide({ nombre, primerApellido, segundoApellido }, existente));
    if (!alumno) {
      error(`No existe ningún alumno con el nombre y apellidos exactos «${[nombre, primerApellido, segundoApellido].filter(Boolean).join(' ')}».`);
      return;
    }

    if (emailProfesor.length === 0) {
      error('El email del profesor no puede estar vacío.');
      return;
    }
    const profesor = profesoresPorEmail.get(emailProfesor);
    if (!profesor) {
      error(`No existe ninguna cuenta de profesor activa con el email «${emailProfesor}».`);
      return;
    }

    const diaSemana = diaSemanaDesdeTexto(diaTexto);
    if (diaSemana === undefined) {
      error('El día de la semana debe ser un número de 1 (lunes) a 7 (domingo), o su nombre en español.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaFin)) {
      error('La hora de inicio y de fin deben tener el formato HH:MM.');
      return;
    }
    if (horaFin <= horaInicio) {
      error('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    filas.push({
      numeroFila,
      estado: 'nueva',
      descripcion: `${[nombre, primerApellido, segundoApellido].filter(Boolean).join(' ')} — ${ETIQUETA_DIA_SEMANA[diaSemana]} ${horaInicio}-${horaFin}`,
      datos: {
        alumno_id: alumno.id,
        profesor_id: profesor.id,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        asignatura_o_grupo: asignatura,
      },
    });
  });

  return { errorCabecera: null, filas };
}
