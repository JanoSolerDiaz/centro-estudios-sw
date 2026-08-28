/**
 * Operaciones de acceso a datos de personas de referencia del alumno (T-13): añadir, editar y
 * eliminar. No hay una función de lectura propia aquí: se traen embebidas al cargar la ficha del
 * alumno (`alumnos.ts`, select `personas_referencia:persona_referencia(*)` de
 * `obtenerAlumno`/`crearAlumno`/`editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno`), en la misma
 * petición (requisito 5 de T-13) — no hay pantalla independiente de personas de referencia
 * (requisito 1).
 *
 * Escritura reservada a `administrator` por RLS (`003_politicas_rls.sql`, T-10): un `teacher` que
 * llame a cualquiera de estas tres funciones recibe `SinPermiso` del servidor. A diferencia de
 * `alumno` (T-12), aquí sí se puede pedir `Prefer: return=representation` (el valor por defecto de
 * `insertar`/`actualizar`) porque `persona_referencia` concede todas sus columnas a `authenticated`
 * en la tabla base — no hay ninguna vista de por medio que restrinja columnas por rol.
 *
 * `eliminarPersonaReferencia` es la única función de borrado real de todo el sistema (§0.2, RGPD):
 * no hay baja lógica que dar aquí, a diferencia de `alumno`/`centro_estudios`.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { PersonaReferencia } from '../dominio/tipos.ts';
import {
  normalizarNombrePersona,
  normalizarTelefonoAlumno as normalizarTelefonoReferencia,
  emailAlumnoValido as emailReferenciaValido,
  telefonoAlumnoValido as telefonoReferenciaValido,
} from '../dominio/alumno.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

const TABLA = 'persona_referencia';

export interface DatosPersonaReferencia {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido?: string | null;
  readonly email_referencia?: string | null;
  readonly telefono_referencia: string;
}

function nombreRequeridoOFalla(valorEntrada: string, etiqueta: string): string {
  const valor = normalizarNombrePersona(valorEntrada);
  if (valor.length === 0) {
    throw new ErrorDeValidacion(`${etiqueta} no puede estar vacío.`);
  }
  return valor;
}

function segundoApellidoOpcional(valorEntrada: string | null | undefined): string | null {
  if (valorEntrada === null || valorEntrada === undefined) {
    return null;
  }
  const valor = normalizarNombrePersona(valorEntrada);
  return valor.length === 0 ? null : valor;
}

function emailOpcionalOFalla(valorEntrada: string | null | undefined): string | null {
  if (valorEntrada === null || valorEntrada === undefined) {
    return null;
  }
  const valor = valorEntrada.trim();
  if (valor.length === 0) {
    return null;
  }
  if (!emailReferenciaValido(valor)) {
    throw new ErrorDeValidacion('El email no tiene un formato válido.');
  }
  return valor;
}

/** A diferencia de `telefono_alumno` (opcional), `telefono_referencia` es obligatorio (requisito 2
 * de T-13, exacto al `CHECK` `persona_referencia_telefono_no_vacio` y `not null` de la columna). */
function telefonoRequeridoOFalla(valorEntrada: string): string {
  const valorTrim = valorEntrada.trim();
  if (valorTrim.length === 0) {
    throw new ErrorDeValidacion('El teléfono es obligatorio.');
  }
  const valor = normalizarTelefonoReferencia(valorTrim);
  if (!telefonoReferenciaValido(valor)) {
    throw new ErrorDeValidacion('El teléfono no tiene un formato español válido.');
  }
  return valor;
}

function prepararValoresPersonaReferencia(datos: DatosPersonaReferencia): Record<string, unknown> {
  return {
    nombre: nombreRequeridoOFalla(datos.nombre, 'El nombre'),
    primer_apellido: nombreRequeridoOFalla(datos.primer_apellido, 'El primer apellido'),
    segundo_apellido: segundoApellidoOpcional(datos.segundo_apellido),
    email_referencia: emailOpcionalOFalla(datos.email_referencia),
    telefono_referencia: telefonoRequeridoOFalla(datos.telefono_referencia),
  };
}

function primeraFilaOFalla(filas: readonly PersonaReferencia[]): PersonaReferencia {
  const [persona] = filas;
  if (!persona) {
    throw new ErrorDelServidor('El servidor no ha devuelto la persona de referencia esperada.');
  }
  return persona;
}

export async function crearPersonaReferencia(
  cliente: ClientePostgrest,
  alumnoId: string,
  datos: DatosPersonaReferencia,
): Promise<PersonaReferencia> {
  const valores = prepararValoresPersonaReferencia(datos);
  const filas = await cliente.desde<PersonaReferencia>(TABLA).insertar({ alumno_id: alumnoId, ...valores });
  return primeraFilaOFalla(filas);
}

export async function editarPersonaReferencia(
  cliente: ClientePostgrest,
  id: string,
  datos: DatosPersonaReferencia,
): Promise<PersonaReferencia> {
  const valores = prepararValoresPersonaReferencia(datos);
  const filas = await cliente.desde<PersonaReferencia>(TABLA).eq('id', id).actualizar(valores);
  return primeraFilaOFalla(filas);
}

/** Borrado real (§0.2, única tabla del sistema donde está permitido): sin baja lógica. La
 * confirmación explícita de que es definitivo (requisito 3 de T-13) es responsabilidad de la
 * interfaz, no de esta función. */
export async function eliminarPersonaReferencia(cliente: ClientePostgrest, id: string): Promise<void> {
  await cliente.desde<PersonaReferencia>(TABLA).eq('id', id).eliminar();
}
