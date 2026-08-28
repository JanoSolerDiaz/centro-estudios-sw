/**
 * Lógica pura del alumno (T-12): normalización y validación de nombre/contacto, composición del
 * nombre completo para mostrar y comparador de ordenación a la española. Sin acceso a red ni al
 * DOM — `src/datos/alumnos.ts` es quien la usa antes de escribir y quien la aplica al pintar.
 *
 * Los dos regex de validación son EXACTAMENTE los `CHECK` de `alumno.email_alumno`/
 * `alumno.telefono_alumno` en `001_esquema_inicial.sql`: si no coinciden, un valor que pasa aquí
 * podría seguir siendo rechazado por la base de datos (o viceversa), y el mensaje de error dejaría
 * de ser el amigable de `ErrorDeValidacion` para convertirse en el `CHECK constraint violated` seco
 * de Postgres.
 */

import type { Alumno } from './tipos.ts';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO_ESPANOL = /^(\+34)?[6789]\d{8}$/;

/** Recorta extremos y colapsa espacios repetidos, sin tocar mayúsculas: `nombre`/`apellidos`
 * pueden llevar mayúsculas intencionadas ("de la Fuente", "O'Donnell") que no hay que "corregir". */
export function normalizarNombrePersona(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/** Quita espacios, puntos y guiones de un teléfono tecleado con separadores ("666 12 34 56",
 * "666-12-34-56") antes de validarlo: el `CHECK` de la base de datos exige solo dígitos (con
 * prefijo `+34` opcional), así que sin esto un teléfono con separadores válido a ojos humanos
 * fallaría al guardar. */
export function normalizarTelefonoAlumno(valor: string): string {
  return valor.trim().replace(/[\s.-]/g, '');
}

/** `true` si `valor` (ya recortado, sin normalizar) tiene forma de email. No comprueba nada más
 * (existencia del dominio, buzón real): es la misma comprobación superficial que el `CHECK`. */
export function emailAlumnoValido(valor: string): boolean {
  return REGEX_EMAIL.test(valor);
}

/** `true` si `valorNormalizado` (ya pasado por `normalizarTelefonoAlumno`) es un móvil o fijo
 * español válido, con o sin el prefijo `+34`. */
export function telefonoAlumnoValido(valorNormalizado: string): boolean {
  return REGEX_TELEFONO_ESPANOL.test(valorNormalizado);
}

export type DatosNombreAlumno = Pick<Alumno, 'nombre' | 'primer_apellido' | 'segundo_apellido'>;

/** Compone el nombre para mostrar, en el orden natural de pila ("Nombre PrimerApellido
 * SegundoApellido"): la ÚNICA función del dominio que compone este texto (requisito 4 de T-12),
 * para que no haya dos sitios de la interfaz que lo hagan de forma distinta. Omite
 * `segundo_apellido` limpiamente cuando es `null`, sin dejar un espacio de más. */
export function nombreCompletoAlumno(alumno: DatosNombreAlumno): string {
  return [alumno.nombre, alumno.primer_apellido, alumno.segundo_apellido]
    .filter((parte): parte is string => parte !== null && parte.length > 0)
    .join(' ');
}

/** Clave de comparación a la española: minúsculas y luego cotejada con `localeCompare('es',
 * { sensitivity: 'base' })` por quien la use, para que "Ábalos" ordene junto a "Abalos"/"Adolfo" y
 * no después de "Zamora" (que es lo que daría una comparación de puntos de código Unicode, donde
 * 'Á' — U+00C1 — es mayor que cualquier letra ASCII mayúscula o minúscula). */
function claveApellido(valor: string | null): string {
  return valor ?? '';
}

/** Comparador para `Array.prototype.sort`: ordena por `primer_apellido`, `segundo_apellido` y
 * `nombre` — nunca por el nombre de pila primero (requisito 4 de T-12, "ordenación a la
 * española") — con las tres claves cotejadas de forma acento-insensible. */
export function compararAlumnosParaOrden(a: Alumno, b: Alumno): number {
  return (
    a.primer_apellido.localeCompare(b.primer_apellido, 'es', { sensitivity: 'base' }) ||
    claveApellido(a.segundo_apellido).localeCompare(claveApellido(b.segundo_apellido), 'es', {
      sensitivity: 'base',
    }) ||
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
}
