/**
 * Lógica pura de personas de referencia del alumno (T-13): detección de altas duplicadas por
 * nombre completo y teléfono, sin bloquear el alta (requisito 6). No hay normalización ni
 * validación propias que escribir aquí: los `CHECK` de `persona_referencia.email_referencia`/
 * `persona_referencia.telefono_referencia` en `001_esquema_inicial.sql` son EXACTAMENTE los mismos
 * regex que los de `alumno.email_alumno`/`alumno.telefono_alumno` (T-12), así que este módulo
 * reexporta las funciones de `dominio/alumno.ts` en vez de duplicarlas.
 */

import type { PersonaReferencia } from './tipos.ts';
import { normalizarNombrePersona } from './alumno.ts';

export {
  normalizarTelefonoAlumno as normalizarTelefonoReferencia,
  emailAlumnoValido as emailReferenciaValido,
  telefonoAlumnoValido as telefonoReferenciaValido,
} from './alumno.ts';

export interface DatosNombrePersonaReferencia {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido?: string | null;
}

function nombreCompletoNormalizado(datos: DatosNombrePersonaReferencia): string {
  return [datos.nombre, datos.primer_apellido, datos.segundo_apellido ?? null]
    .filter((parte): parte is string => parte !== null && parte.length > 0)
    .map(normalizarNombrePersona)
    .join(' ');
}

function mismoNombreCompleto(a: DatosNombrePersonaReferencia, b: DatosNombrePersonaReferencia): boolean {
  return (
    nombreCompletoNormalizado(a).localeCompare(nombreCompletoNormalizado(b), 'es', { sensitivity: 'base' }) === 0
  );
}

export interface DatosDuplicadoPersonaReferencia extends DatosNombrePersonaReferencia {
  /** Ya normalizado con `normalizarTelefonoReferencia`, para comparar contra el valor tal y como
   * queda guardado en `existentes`. */
  readonly telefono_referencia: string;
}

/** La primera persona de `existentes` con el mismo nombre completo (acento-insensible, igual
 * criterio que `compararAlumnosParaOrden` de T-12) y el mismo teléfono que `datos`, o `undefined`
 * si ninguna coincide. Requisito 6 de T-13: es un aviso, no un bloqueo — quien llama (la interfaz)
 * decide qué hacer con el resultado, igual que `buscarCentroDuplicado` de T-11. */
export function buscarPersonaReferenciaDuplicada(
  datos: DatosDuplicadoPersonaReferencia,
  existentes: readonly PersonaReferencia[],
): PersonaReferencia | undefined {
  return existentes.find(
    (existente) =>
      mismoNombreCompleto(datos, existente) && existente.telefono_referencia === datos.telefono_referencia,
  );
}
