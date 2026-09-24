/**
 * Análisis puro de un CSV de personas de referencia (R-31, requisitos 1 a 4 y 7). Mismo patrón que
 * `importacionAlumnos.ts`/`importacionHorarios.ts` (R-08): sin acceso a red ni al DOM, recibe las
 * filas ya separadas por `nucleo/csv.ts#analizarCsv`, el catálogo de alumnos ya cargado por quien
 * llama y las personas de referencia ya existentes (agrupadas por alumno, `datos/personasReferencia.ts
 * #listarPersonasReferenciaDeAlumnos`, R-16 ya usa la misma función para todo el centro).
 *
 * **Alumno por "nombre y apellidos exactos" (requisito 1, literal): comparación EXACTA** tras solo
 * recortar espacios — la misma decisión que `importacionHorarios.ts` (R-08, requisito 3) por el mismo
 * motivo: confundir la persona de contacto de un alumno con la de otro de nombre parecido es más grave
 * que un alta duplicada evitable a mano.
 *
 * **Duplicado de persona de referencia (requisito 3): reutiliza `buscarPersonaReferenciaDuplicada`
 * (T-13, `dominio/personaReferencia.ts`) tal cual, sin ninguna lógica de deduplicación nueva.** La
 * comparación es "dentro del mismo alumno" (requisito 3, literal): se aplica solo contra las personas
 * —ya existentes en la base de datos o ya vistas en filas anteriores de este mismo fichero— del MISMO
 * `alumno_id`, nunca contra las de otro alumno, para que dos padres homónimos de dos alumnos distintos
 * no se pisen entre sí.
 */

import type { DatosDuplicadoPersonaReferencia } from './personaReferencia.ts';
import { buscarPersonaReferenciaDuplicada } from './personaReferencia.ts';
import {
  normalizarNombrePersona,
  normalizarTelefonoAlumno as normalizarTelefonoReferencia,
  emailAlumnoValido as emailReferenciaValido,
  telefonoAlumnoValido as telefonoReferenciaValido,
  nombreCompletoAlumno,
} from './alumno.ts';

export const CABECERA_PERSONAS_REFERENCIA_CSV = [
  'alumno_nombre',
  'alumno_primer_apellido',
  'alumno_segundo_apellido',
  'nombre',
  'primer_apellido',
  'segundo_apellido',
  'telefono',
  'email',
] as const;

export interface AlumnoParaEmparejarPersonaReferencia {
  readonly id: string;
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
}

export interface DatosPersonaReferenciaImportada {
  readonly alumno_id: string;
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly telefono_referencia: string;
  readonly email_referencia: string | null;
}

export interface FilaPersonaReferenciaCsvNueva {
  readonly numeroFila: number;
  readonly estado: 'nueva';
  readonly datos: DatosPersonaReferenciaImportada;
  readonly descripcion: string;
}

export interface FilaPersonaReferenciaCsvDuplicada {
  readonly numeroFila: number;
  readonly estado: 'duplicada';
  readonly descripcion: string;
}

export interface FilaPersonaReferenciaCsvError {
  readonly numeroFila: number;
  readonly estado: 'error';
  readonly motivo: string;
  readonly valoresOriginales: readonly string[];
}

export type FilaPersonaReferenciaCsv =
  | FilaPersonaReferenciaCsvNueva
  | FilaPersonaReferenciaCsvDuplicada
  | FilaPersonaReferenciaCsvError;

export interface ResultadoAnalisisPersonasReferenciaCsv {
  readonly errorCabecera: string | null;
  readonly filas: readonly FilaPersonaReferenciaCsv[];
}

function celda(fila: readonly string[], indice: number): string {
  return (fila[indice] ?? '').trim();
}

function alumnoCoincide(
  candidato: { nombre: string; primerApellido: string; segundoApellido: string | null },
  existente: AlumnoParaEmparejarPersonaReferencia,
): boolean {
  return (
    candidato.nombre === existente.nombre &&
    candidato.primerApellido === existente.primer_apellido &&
    candidato.segundoApellido === existente.segundo_apellido
  );
}

/** Analiza las filas ya separadas de un CSV de personas de referencia (requisitos 1 a 4 de R-31).
 * `filasCrudas` incluye la cabecera como primera fila. `alumnosExistentes` es el mismo catálogo
 * completo que ya carga `pantallaImportacionMasiva.ts` para el bloque de alumnos/horarios (una única
 * lectura). `personasExistentesPorAlumno` viene ya agrupada por `alumno_id`
 * (`datos/personasReferencia.ts#listarPersonasReferenciaDeAlumnos`, una única petición). */
export function analizarCsvPersonasReferencia(
  filasCrudas: readonly (readonly string[])[],
  alumnosExistentes: readonly AlumnoParaEmparejarPersonaReferencia[],
  personasExistentesPorAlumno: ReadonlyMap<string, readonly DatosDuplicadoPersonaReferencia[]>,
): ResultadoAnalisisPersonasReferenciaCsv {
  const [cabecera, ...filasDatos] = filasCrudas;
  if (
    !cabecera ||
    cabecera.length < CABECERA_PERSONAS_REFERENCIA_CSV.length ||
    !CABECERA_PERSONAS_REFERENCIA_CSV.every((col, i) => celda(cabecera, i) === col)
  ) {
    return {
      errorCabecera: `La cabecera debe ser exactamente: ${CABECERA_PERSONAS_REFERENCIA_CSV.join(';')}`,
      filas: [],
    };
  }

  const yaVistosPorAlumno = new Map<string, DatosDuplicadoPersonaReferencia[]>();
  function vistosDe(alumnoId: string): DatosDuplicadoPersonaReferencia[] {
    let lista = yaVistosPorAlumno.get(alumnoId);
    if (!lista) {
      lista = [...(personasExistentesPorAlumno.get(alumnoId) ?? [])];
      yaVistosPorAlumno.set(alumnoId, lista);
    }
    return lista;
  }

  const filas: FilaPersonaReferenciaCsv[] = [];

  filasDatos.forEach((filaCruda, indice) => {
    const numeroFila = indice + 2;
    const alumnoNombre = normalizarNombrePersona(celda(filaCruda, 0));
    const alumnoPrimerApellido = normalizarNombrePersona(celda(filaCruda, 1));
    const alumnoSegundoApellidoTexto = normalizarNombrePersona(celda(filaCruda, 2));
    const alumnoSegundoApellido = alumnoSegundoApellidoTexto.length > 0 ? alumnoSegundoApellidoTexto : null;
    const nombre = normalizarNombrePersona(celda(filaCruda, 3));
    const primerApellido = normalizarNombrePersona(celda(filaCruda, 4));
    const segundoApellidoTexto = normalizarNombrePersona(celda(filaCruda, 5));
    const segundoApellido = segundoApellidoTexto.length > 0 ? segundoApellidoTexto : null;
    const telefonoTexto = celda(filaCruda, 6);
    const emailTexto = celda(filaCruda, 7);

    function error(motivo: string): void {
      filas.push({ numeroFila, estado: 'error', motivo, valoresOriginales: filaCruda });
    }

    if (alumnoNombre.length === 0 || alumnoPrimerApellido.length === 0) {
      error('El nombre y el primer apellido del alumno son obligatorios.');
      return;
    }
    const alumno = alumnosExistentes.find((existente) =>
      alumnoCoincide({ nombre: alumnoNombre, primerApellido: alumnoPrimerApellido, segundoApellido: alumnoSegundoApellido }, existente),
    );
    if (!alumno) {
      const nombreCompletoAlumnoBuscado = [alumnoNombre, alumnoPrimerApellido, alumnoSegundoApellido].filter(Boolean).join(' ');
      error(`No existe ningún alumno con el nombre y apellidos exactos «${nombreCompletoAlumnoBuscado}».`);
      return;
    }

    if (nombre.length === 0) {
      error('El nombre de la persona de referencia no puede estar vacío.');
      return;
    }
    if (primerApellido.length === 0) {
      error('El primer apellido de la persona de referencia no puede estar vacío.');
      return;
    }

    if (telefonoTexto.length === 0) {
      error('El teléfono es obligatorio.');
      return;
    }
    const telefono = normalizarTelefonoReferencia(telefonoTexto);
    if (!telefonoReferenciaValido(telefono)) {
      error('El teléfono no tiene un formato español válido.');
      return;
    }

    let email: string | null = null;
    if (emailTexto.length > 0) {
      if (!emailReferenciaValido(emailTexto)) {
        error('El email no tiene un formato válido.');
        return;
      }
      email = emailTexto;
    }

    const candidato = { nombre, primer_apellido: primerApellido, segundo_apellido: segundoApellido, telefono_referencia: telefono };
    const descripcionAlumno = nombreCompletoAlumno({ nombre: alumno.nombre, primer_apellido: alumno.primer_apellido, segundo_apellido: alumno.segundo_apellido });
    const descripcionPersona = nombreCompletoAlumno({ nombre, primer_apellido: primerApellido, segundo_apellido: segundoApellido });
    const descripcion = `${descripcionAlumno} — ${descripcionPersona} (${telefono})`;

    const vistos = vistosDe(alumno.id);
    if (buscarPersonaReferenciaDuplicada(candidato, vistos)) {
      filas.push({ numeroFila, estado: 'duplicada', descripcion });
      return;
    }

    vistos.push(candidato);
    filas.push({
      numeroFila,
      estado: 'nueva',
      descripcion,
      datos: {
        alumno_id: alumno.id,
        nombre,
        primer_apellido: primerApellido,
        segundo_apellido: segundoApellido,
        telefono_referencia: telefono,
        email_referencia: email,
      },
    });
  });

  return { errorCabecera: null, filas };
}
