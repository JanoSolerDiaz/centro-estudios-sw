/**
 * Lógica pura del buscador de "alumno extra" (T-20): cuándo dispara la búsqueda, y cuándo un
 * resultado necesita mostrar el centro de estudios para desambiguar un homónimo (requisito 3: "el
 * centro de estudios cuando hay homónimos" — nunca siempre, solo cuando de verdad hace falta). Sin
 * acceso a red ni al DOM, igual que el resto de `dominio/`.
 */

import { nombreCompletoAlumno, type DatosNombreAlumno } from './alumno.ts';

/** Longitud mínima del texto (ya recortado) para disparar una búsqueda en servidor — requisito 2 de
 * T-20: "desde el segundo carácter". Un solo carácter sobra resultados y satura la red para nada. */
export const LONGITUD_MINIMA_BUSQUEDA = 2;

/** ¿Debe dispararse una búsqueda para `texto`? Puro: la pantalla decide con esto si vale la pena
 * llamar al servidor, antes incluso de programar el rebote. */
export function debeBuscar(texto: string): boolean {
  return texto.trim().length >= LONGITUD_MINIMA_BUSQUEDA;
}

export interface ResultadoBusquedaAlumno extends DatosNombreAlumno {
  readonly id: string;
  readonly centro_nombre: string;
}

export interface ResultadoBusquedaParaMostrar<T extends ResultadoBusquedaAlumno = ResultadoBusquedaAlumno> {
  readonly resultado: T;
  /** `true` si otro resultado de la misma lista comparte nombre completo — solo entonces vale la
   * pena pintar el centro (requisito 3: "el centro de estudios CUANDO hay homónimos", no siempre). */
  readonly esHomonimo: boolean;
}

/** Empareja cada resultado con si necesita mostrar el centro para desambiguarse de otro con el
 * mismo nombre completo en la MISMA lista de resultados — no contra el resto del alumnado, que el
 * buscador nunca ve entero. Conserva el orden de entrada (el servidor ya ordena por apellido). */
export function resultadosParaMostrar<T extends ResultadoBusquedaAlumno>(
  resultados: readonly T[],
): readonly ResultadoBusquedaParaMostrar<T>[] {
  const porNombre = new Map<string, number>();
  for (const resultado of resultados) {
    const clave = nombreCompletoAlumno(resultado).toLocaleLowerCase('es');
    porNombre.set(clave, (porNombre.get(clave) ?? 0) + 1);
  }
  return resultados.map((resultado) => ({
    resultado,
    esHomonimo: (porNombre.get(nombreCompletoAlumno(resultado).toLocaleLowerCase('es')) ?? 0) > 1,
  }));
}
