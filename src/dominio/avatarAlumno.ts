/**
 * Lógica pura del avatar del alumno (T-14): ruta determinista de las dos derivadas, geometría del
 * recorte al cuadrado, validación superficial del fichero de origen y el monograma de iniciales
 * que sustituye a la foto cuando no hay ninguna (requisito 7). Sin acceso a `Blob`, `canvas` ni
 * Storage — eso vive en `src/datos/avatarAlumno.ts`, que es quien decide qué error de dominio
 * lanzar cuando estas funciones dicen que un fichero no vale.
 *
 * El bucket privado `avatares` y sus políticas RLS son de T-10/T-14 (`003_politicas_rls.sql`,
 * `004_bucket_avatares.sql`, ya aplicadas). La única lista blanca de tipos MIME que importa de
 * verdad es la del propio bucket (`image/webp`): el cliente nunca sube el fichero original del
 * móvil, solo las dos derivadas ya recodificadas. `TIPOS_MIME_ORIGEN_ACEPTADOS` de aquí es la
 * validación de cliente sobre lo que el usuario selecciona ANTES de procesar, con el único fin de
 * dar un mensaje claro en vez de que `createImageBitmap` falle con un error críptico.
 */

import type { DatosNombreAlumno } from './alumno.ts';

export const LADO_PRINCIPAL_PX = 512;
export const LADO_MINI_PX = 96;
export const TIPO_MIME_SALIDA = 'image/webp';
export const NOMBRE_ARCHIVO_PRINCIPAL = 'avatar.webp';
export const NOMBRE_ARCHIVO_MINI = 'avatar-mini.webp';

/** Mismo límite que `file_size_limit` de `004_bucket_avatares.sql` (2 MiB): el bucket solo
 * recibe las derivadas ya recodificadas, así que este es el límite real de subida. */
export const TAMANO_MAXIMO_DERIVADA_BYTES = 2 * 1024 * 1024;

/** El fichero de ORIGEN (la foto tal cual la entrega el móvil, antes de procesar) puede pesar
 * mucho más que la derivada final: una foto de móvil típica pesa entre 2 y 8 MiB. 15 MiB es margen
 * amplio sin dejar que el navegador intente decodificar algo desproporcionado. */
export const TAMANO_MAXIMO_ORIGEN_BYTES = 15 * 1024 * 1024;

export const TIPOS_MIME_ORIGEN_ACEPTADOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export type VarianteAvatar = 'principal' | 'mini';

/** `true` si `tipo` (el `type` del `File`/`Blob` seleccionado) es una imagen de un formato que el
 * cliente sabe procesar. No comprueba el contenido real del fichero: eso lo hace, indirectamente,
 * `createImageBitmap` al fallar con un fichero que miente sobre su tipo. */
export function esTipoImagenOrigenAceptado(tipo: string): boolean {
  return TIPOS_MIME_ORIGEN_ACEPTADOS.includes(tipo);
}

/** `true` si `tamanoBytes` (el fichero de origen, sin procesar) supera el límite razonable antes
 * de intentar decodificarlo. */
export function origenAvatarDemasiadoGrande(tamanoBytes: number): boolean {
  return tamanoBytes > TAMANO_MAXIMO_ORIGEN_BYTES;
}

/** Ruta base determinista del avatar de un alumno (requisito 2 de T-14): `alumno/{alumnoId}/{uuid}/`.
 * Se guarda en `alumno.avatar_ruta` — nunca una URL — y de ella se derivan, por convención, los dos
 * ficheros reales. Un `uuid` nuevo en cada subida (no reutilizar el de la subida anterior) es lo
 * que permite el orden seguro "sube lo nuevo, cambia el puntero, borra lo viejo" que sigue
 * `src/datos/avatarAlumno.ts`: si la subida falla, no hay colisión con el fichero todavía vigente. */
export function rutaBaseAvatar(alumnoId: string, uuid: string): string {
  return `alumno/${alumnoId}/${uuid}/`;
}

/** Ruta completa de una de las dos derivadas, a partir de la ruta base guardada en
 * `alumno.avatar_ruta`. */
export function rutaDerivadaAvatar(rutaBase: string, variante: VarianteAvatar): string {
  const nombre = variante === 'principal' ? NOMBRE_ARCHIVO_PRINCIPAL : NOMBRE_ARCHIVO_MINI;
  return `${rutaBase}${nombre}`;
}

export interface RectanguloRecorte {
  readonly x: number;
  readonly y: number;
  readonly lado: number;
}

/** Geometría del recorte centrado al cuadrado (requisito 3: "recorte al cuadrado") sobre una
 * imagen de `anchoOrigen`×`altoOrigen` píxeles: el lado es el menor de los dos, y el recorte queda
 * centrado sobre el lado más largo. Pura — sin tocar ningún píxel real, eso lo hace el `canvas`
 * inyectado en `src/datos/avatarAlumno.ts` con estos números. */
export function calcularRectanguloRecorte(anchoOrigen: number, altoOrigen: number): RectanguloRecorte {
  const lado = Math.min(anchoOrigen, altoOrigen);
  return {
    x: Math.floor((anchoOrigen - lado) / 2),
    y: Math.floor((altoOrigen - lado) / 2),
    lado,
  };
}

/** Paleta fija de colores oscuros para el monograma (requisito 7): con texto blanco encima, los
 * ocho dan contraste alto sin necesidad de calcularlo por fórmula para cada alumno — es una paleta
 * cerrada, no un color arbitrario por alumno. */
const PALETA_MONOGRAMA: readonly string[] = [
  '#4338CA',
  '#0F766E',
  '#B91C1C',
  '#15803D',
  '#B45309',
  '#1E40AF',
  '#7E22CE',
  '#374151',
];

function hashEstable(texto: string): number {
  let hash = 0;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash = (Math.imul(hash, 31) + texto.charCodeAt(indice)) >>> 0;
  }
  return hash;
}

/** Color de fondo del monograma, derivado de forma estable de `semilla` (el `id` del alumno): el
 * mismo alumno siempre saca el mismo color, sin guardarlo en ningún sitio. */
export function colorMonograma(semilla: string): string {
  const indice = hashEstable(semilla) % PALETA_MONOGRAMA.length;
  const color = PALETA_MONOGRAMA[indice];
  if (color === undefined) {
    throw new Error('Índice de paleta de monograma fuera de rango.');
  }
  return color;
}

/** Iniciales de nombre y primer apellido, en mayúsculas — el texto del monograma. Nunca usa el
 * segundo apellido: dos letras es lo que cabe con legibilidad en 96 px. */
export function inicialesAlumno(datos: DatosNombreAlumno): string {
  const inicialNombre = datos.nombre.trim().charAt(0).toUpperCase();
  const inicialApellido = datos.primer_apellido.trim().charAt(0).toUpperCase();
  return `${inicialNombre}${inicialApellido}`;
}
