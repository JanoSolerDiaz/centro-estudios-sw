/**
 * Detección de nombres de centro de estudios equivalentes (T-11, requisito 2): acento-insensible y
 * sin distinguir mayúsculas, para que no acaben tres variantes del mismo colegio en el catálogo
 * ("San José" / "SAN JOSE" / "san  josé" deben detectarse como el mismo). Vive en la aplicación y
 * no en el esquema a propósito: `centro_estudios.nombre` (`001_esquema_inicial.sql`) tiene un
 * `unique` exacto por diseño, documentado en el comentario de esa columna — un índice funcional con
 * `unaccent` exigiría instalar esa extensión, y esta comparación no necesita tocar la base de datos
 * para funcionar. Puro, sin dependencias: recibe la lista de centros ya cargada y no hace ninguna
 * llamada de datos.
 */

import type { CentroEstudios } from './tipos.ts';

/** Recorta extremos, colapsa espacios repetidos, elimina diacríticos (NFD + retirar marcas
 * combinantes U+0300–U+036F) y pasa a minúsculas. */
export function normalizarNombreCentro(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** ¿Son `a` y `b` el mismo nombre de centro, ignorando acentos, mayúsculas y espacios repetidos? */
export function nombresDeCentroEquivalentes(a: string, b: string): boolean {
  return normalizarNombreCentro(a) === normalizarNombreCentro(b);
}

/** El primer centro de `existentes` cuyo nombre es equivalente a `nombre`, o `undefined` si
 * ninguno lo es. No decide qué hacer con el resultado: eso es cosa de quien llama (T-11, requisito
 * 2, "ofrecer el existente en lugar de dar un error seco"). */
export function buscarCentroDuplicado(
  nombre: string,
  existentes: readonly CentroEstudios[],
): CentroEstudios | undefined {
  return existentes.find((existente) => nombresDeCentroEquivalentes(nombre, existente.nombre));
}
