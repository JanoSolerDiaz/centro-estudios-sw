/**
 * Análisis puro de un CSV de alumnos (R-08, requisitos 1, 2 y 4). Sin acceso a red ni al DOM: recibe
 * las filas ya separadas por `nucleo/csv.ts#analizarCsv` y el catálogo de centros y la lista de
 * alumnos ya existentes (ambos ya cargados por quien llama) y decide, fila a fila, si se creará
 * (`'nueva'`), si ya existe y se omitirá (`'duplicada'`, requisito 4) o si queda en error con el
 * motivo exacto (requisito 2) — nunca escribe nada, nunca decide sola qué centro o qué alumno están
 * "vigentes": eso lo carga quien llama antes de analizar.
 *
 * Cabecera esperada, en este orden exacto (no acento-insensible: son nombres de columna, no texto
 * libre). `centro` es el NOMBRE del centro tal como aparece en el catálogo (o una variante
 * equivalente, resuelta con la misma comparación acento-insensible de T-11) — nunca un id, que nadie
 * fuera de este proyecto puede conocer al preparar el fichero.
 */

import type { CentroEstudios } from './tipos.ts';
import { buscarCentroDuplicado } from './centrosEstudios.ts';
import { normalizarNombrePersona, normalizarTelefonoAlumno, emailAlumnoValido, telefonoAlumnoValido } from './alumno.ts';

export const CABECERA_ALUMNOS_CSV = ['nombre', 'primer_apellido', 'segundo_apellido', 'centro', 'telefono', 'email'] as const;

export interface DatosAlumnoImportado {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly centro_referencia_id: string;
  readonly telefono_alumno: string | null;
  readonly email_alumno: string | null;
}

/** Lo mínimo de un alumno ya existente (importado antes, o dado de alta a mano) que hace falta para
 * la comparación de duplicados del requisito 4: "nombre completo + centro", la misma clave que usa
 * T-12 para ofrecer un aviso de persona de referencia duplicada, aplicada aquí al alumno completo. */
export interface AlumnoExistenteParaImportacion {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly centro_referencia_id: string;
}

export interface FilaAlumnoCsvNueva {
  readonly numeroFila: number;
  readonly estado: 'nueva';
  readonly datos: DatosAlumnoImportado;
  readonly nombreCompleto: string;
}

export interface FilaAlumnoCsvDuplicada {
  readonly numeroFila: number;
  readonly estado: 'duplicada';
  readonly nombreCompleto: string;
}

export interface FilaAlumnoCsvError {
  readonly numeroFila: number;
  readonly estado: 'error';
  readonly motivo: string;
  readonly valoresOriginales: readonly string[];
}

export type FilaAlumnoCsv = FilaAlumnoCsvNueva | FilaAlumnoCsvDuplicada | FilaAlumnoCsvError;

export interface ResultadoAnalisisAlumnosCsv {
  /** `null` si la cabecera coincide con `CABECERA_ALUMNOS_CSV`; el motivo exacto si no. Con cabecera
   * inválida, `filas` viene vacío: no tiene sentido interpretar columnas que no son las esperadas. */
  readonly errorCabecera: string | null;
  readonly filas: readonly FilaAlumnoCsv[];
}

/** Mismo algoritmo de normalización que `normalizarNombreCentro` (T-11, `dominio/centrosEstudios.ts`)
 * — acento-insensible, sin distinguir mayúsculas, espacios colapsados — pero aplicado al nombre
 * completo de un ALUMNO, no de un centro. Se duplica a propósito en vez de reexportar la función de
 * centros bajo un alias: el algoritmo es genérico, pero cada módulo de este proyecto lleva su propia
 * normalización con el nombre y el comentario de su propio dominio (mismo criterio que
 * `personaReferencia.ts` reexporta explícitamente en vez de comparar contra centros). */
function normalizarParaComparar(valor: string): string {
  return valor
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function nombreCompletoParaComparar(datos: {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
}): string {
  return normalizarParaComparar([datos.nombre, datos.primer_apellido, datos.segundo_apellido ?? ''].join(' '));
}

/** Requisito 4: "se identifica con la misma comparación de duplicados de T-12 (nombre completo +
 * centro)". Dos alumnos son el mismo si su nombre completo (acento-insensible) y su centro de
 * referencia coinciden — el mismo criterio se aplica tanto contra alumnos YA existentes en la base de
 * datos como entre dos filas del MISMO fichero (una fila repetida en el propio CSV tampoco debe crear
 * dos altas). */
export function alumnosSonDuplicados(
  a: { readonly nombre: string; readonly primer_apellido: string; readonly segundo_apellido: string | null; readonly centro_referencia_id: string },
  b: { readonly nombre: string; readonly primer_apellido: string; readonly segundo_apellido: string | null; readonly centro_referencia_id: string },
): boolean {
  return a.centro_referencia_id === b.centro_referencia_id && nombreCompletoParaComparar(a) === nombreCompletoParaComparar(b);
}

function celda(fila: readonly string[], indice: number): string {
  return (fila[indice] ?? '').trim();
}

function nombreCompletoParaMostrar(nombre: string, primerApellido: string, segundoApellido: string | null): string {
  return [nombre, primerApellido, segundoApellido].filter((parte): parte is string => !!parte).join(' ');
}

/** Analiza las filas ya separadas de un CSV de alumnos (requisitos 1, 2 y 4 de R-08). `filasCrudas`
 * incluye la cabecera como primera fila (la forma que devuelve `analizarCsv`). `centrosExistentes` y
 * `alumnosExistentes` deben venir ya cargados por quien llama (una única lectura de cada uno, no una
 * consulta por fila) — es lo que permite que esta función sea pura y determinista. */
export function analizarCsvAlumnos(
  filasCrudas: readonly (readonly string[])[],
  centrosExistentes: readonly CentroEstudios[],
  alumnosExistentes: readonly AlumnoExistenteParaImportacion[],
): ResultadoAnalisisAlumnosCsv {
  const [cabecera, ...filasDatos] = filasCrudas;
  if (!cabecera || cabecera.length < CABECERA_ALUMNOS_CSV.length || !CABECERA_ALUMNOS_CSV.every((col, i) => celda(cabecera, i) === col)) {
    return {
      errorCabecera: `La cabecera debe ser exactamente: ${CABECERA_ALUMNOS_CSV.join(';')}`,
      filas: [],
    };
  }

  const yaVistos: AlumnoExistenteParaImportacion[] = [...alumnosExistentes];
  const filas: FilaAlumnoCsv[] = [];

  filasDatos.forEach((filaCruda, indice) => {
    const numeroFila = indice + 2; // 1 = cabecera, para que el mensaje hable de la fila real del fichero
    const nombre = normalizarNombrePersona(celda(filaCruda, 0));
    const primerApellido = normalizarNombrePersona(celda(filaCruda, 1));
    const segundoApellidoTexto = normalizarNombrePersona(celda(filaCruda, 2));
    const segundoApellido = segundoApellidoTexto.length > 0 ? segundoApellidoTexto : null;
    const nombreCentro = celda(filaCruda, 3);
    const telefonoTexto = celda(filaCruda, 4);
    const emailTexto = celda(filaCruda, 5);

    function error(motivo: string): void {
      filas.push({ numeroFila, estado: 'error', motivo, valoresOriginales: filaCruda });
    }

    if (nombre.length === 0) {
      error('El nombre no puede estar vacío.');
      return;
    }
    if (primerApellido.length === 0) {
      error('El primer apellido no puede estar vacío.');
      return;
    }
    if (nombreCentro.length === 0) {
      error('El centro de referencia no puede estar vacío.');
      return;
    }
    const centro = buscarCentroDuplicado(nombreCentro, centrosExistentes);
    if (!centro) {
      error(`El centro «${nombreCentro}» no existe en el catálogo.`);
      return;
    }

    let telefono: string | null = null;
    if (telefonoTexto.length > 0) {
      telefono = normalizarTelefonoAlumno(telefonoTexto);
      if (!telefonoAlumnoValido(telefono)) {
        error('El teléfono no tiene un formato español válido.');
        return;
      }
    }

    let email: string | null = null;
    if (emailTexto.length > 0) {
      if (!emailAlumnoValido(emailTexto)) {
        error('El email no tiene un formato válido.');
        return;
      }
      email = emailTexto;
    }

    const candidato = { nombre, primer_apellido: primerApellido, segundo_apellido: segundoApellido, centro_referencia_id: centro.id };
    const nombreCompleto = nombreCompletoParaMostrar(nombre, primerApellido, segundoApellido);

    if (yaVistos.some((existente) => alumnosSonDuplicados(existente, candidato))) {
      filas.push({ numeroFila, estado: 'duplicada', nombreCompleto });
      return;
    }

    yaVistos.push(candidato);
    filas.push({
      numeroFila,
      estado: 'nueva',
      nombreCompleto,
      datos: {
        nombre,
        primer_apellido: primerApellido,
        segundo_apellido: segundoApellido,
        centro_referencia_id: centro.id,
        telefono_alumno: telefono,
        email_alumno: email,
      },
    });
  });

  return { errorCabecera: null, filas };
}
