/**
 * Detección de nombres de asignatura/grupo equivalentes (R-33): acento-insensible y sin distinguir
 * mayúsculas, mismo criterio exacto que `centrosEstudios.ts` (T-11) — "Matemáticas 4ESO" y
 * "matematicas 4 eso" deben detectarse como la misma entrada del catálogo. Vive en la aplicación y
 * no en el esquema a propósito: `asignatura.nombre` (`db/020_catalogo_asignaturas.sql`) tiene un
 * `unique` exacto por diseño. Puro, sin dependencias: recibe el catálogo ya cargado y no hace
 * ninguna llamada de datos.
 */

import type { Asignatura } from './tipos.ts';

/** Recorta extremos, colapsa espacios repetidos, elimina diacríticos (NFD + retirar marcas
 * combinantes U+0300–U+036F) y pasa a minúsculas. */
export function normalizarNombreAsignatura(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** ¿Son `a` y `b` el mismo nombre de asignatura, ignorando acentos, mayúsculas y espacios
 * repetidos? */
export function nombresDeAsignaturaEquivalentes(a: string, b: string): boolean {
  return normalizarNombreAsignatura(a) === normalizarNombreAsignatura(b);
}

/** La primera asignatura de `existentes` cuyo nombre es equivalente a `nombre`, o `undefined` si
 * ninguna lo es. No decide qué hacer con el resultado: eso es cosa de quien llama (mismo patrón que
 * `buscarCentroDuplicado`, T-11: "ofrecer la existente en lugar de dar un error seco"). */
export function buscarAsignaturaDuplicada(
  nombre: string,
  existentes: readonly Asignatura[],
): Asignatura | undefined {
  return existentes.find((existente) => nombresDeAsignaturaEquivalentes(nombre, existente.nombre));
}

/** Asignaturas de `catalogo` cuyo nombre contiene `texto` (acento-insensible), para el filtro local
 * del combobox (`comboboxAsignatura.ts`, requisito 3 de R-33). Con `texto` vacío devuelve el
 * catálogo completo, para que el combobox pueda ofrecer todas las opciones nada más abrirse, sin
 * exigir que el usuario escriba primero — el catálogo es pequeño (decenas, no miles), así que no hay
 * ningún coste de red que ahorrar con un mínimo de caracteres (a diferencia de `buscarAlumnosParaExtra`,
 * T-20, que sí lo necesita por ser una búsqueda en servidor). */
export function asignaturasQueCoinciden(texto: string, catalogo: readonly Asignatura[]): readonly Asignatura[] {
  const normalizado = normalizarNombreAsignatura(texto);
  if (normalizado.length === 0) {
    return catalogo;
  }
  return catalogo.filter((asignatura) => normalizarNombreAsignatura(asignatura.nombre).includes(normalizado));
}
