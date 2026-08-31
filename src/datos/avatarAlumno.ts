/**
 * Subida, sustitución, borrado y visualización del avatar del alumno (T-14): procesado en el
 * cliente (requisito 3), subida de las dos derivadas al bucket privado `avatares` (T-08/T-10/T-14),
 * actualización de `alumno.avatar_ruta` y firma en lote de URL de visualización (requisito 5).
 *
 * El procesado de imagen (`createImageBitmap`/`canvas`/`toBlob`) es la única pieza de la aplicación
 * que necesita APIs reales del navegador que `jsdom` no implementa de verdad (no hay decodificador
 * de imagen ni rasterizado real). Igual que `Reloj`/`Temporizador` aíslan el reloj y los temporizadores
 * del sistema para que el dominio se pueda testear con un doble, aquí se aísla el navegador detrás de
 * `FabricaProcesadoImagen`: `procesarAvatar` (la orquestación — qué se recorta, a qué tamaño, en qué
 * orden) se testea con una fábrica de mentira que registra las llamadas; `crearFabricaProcesadoImagenNavegador`
 * (la implementación real, con `createImageBitmap` y un `<canvas>` de verdad) solo la ejecuta un
 * navegador real y no tiene test propio — de la misma forma que `postgrest.ts`/`almacenamiento.ts`
 * no testean el `fetch` real, solo el doble. La eliminación de metadatos EXIF (requisito 3) es una
 * garantía del propio `canvas`: repintar sobre un lienzo nuevo nunca copia los metadatos del origen,
 * así que no hace falta ni se puede comprobar con un test — es una propiedad de la plataforma, no de
 * este código.
 *
 * Orden de escritura en `subirAvatarAlumno`, deliberado (documentado en `DECISIONES_TECNICAS.md`):
 * sube primero las dos derivadas NUEVAS bajo una ruta con un `uuid` nuevo, después cambia el puntero
 * `alumno.avatar_ruta`, y solo entonces borra las derivadas ANTIGUAS. Si la subida falla, el alumno
 * conserva su avatar anterior intacto; jamás se borra lo viejo antes de tener lo nuevo a salvo.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { ClienteAlmacenamiento } from './almacenamiento.ts';
import type { LimitadorTasa } from '../nucleo/limitadorTasa.ts';
import type { Alumno } from '../dominio/tipos.ts';
import {
  calcularRectanguloRecorte,
  esTipoImagenOrigenAceptado,
  origenAvatarDemasiadoGrande,
  rutaBaseAvatar,
  rutaDerivadaAvatar,
  TIPO_MIME_SALIDA,
  LADO_PRINCIPAL_PX,
  LADO_MINI_PX,
  type RectanguloRecorte,
  type VarianteAvatar,
} from '../dominio/avatarAlumno.ts';
import { ErrorDelServidor, FicheroDemasiadoGrande, TipoDeFicheroNoPermitido } from './erroresDominio.ts';

const TABLA = 'alumno';
const BUCKET = 'avatares';
const CALIDAD_WEBP = 0.85;

/** Segundos de validez por defecto de una URL firmada de avatar: corta a propósito (§0.2, "vida
 * corta"), pero suficiente para que una pantalla de pasar lista abierta un rato no las vea caducar
 * a media clase. Quien llama puede pedir otro valor. */
export const SEGUNDOS_VALIDEZ_URL_AVATAR_POR_DEFECTO = 600;

export interface ArchivoOrigenAvatar {
  readonly tipo: string;
  readonly tamanoBytes: number;
  readonly datos: Blob;
}

function validarArchivoOrigenAvatar(archivo: Pick<ArchivoOrigenAvatar, 'tipo' | 'tamanoBytes'>): void {
  if (!esTipoImagenOrigenAceptado(archivo.tipo)) {
    throw new TipoDeFicheroNoPermitido('Solo se admiten imágenes (JPEG, PNG, WebP o HEIC).');
  }
  if (origenAvatarDemasiadoGrande(archivo.tamanoBytes)) {
    throw new FicheroDemasiadoGrande('La imagen supera el tamaño máximo permitido (15 MB).');
  }
}

/** Lo mínimo que hace falta saber de una imagen decodificada para recortarla: sus dimensiones y,
 * si el navegador lo pide (`ImageBitmap` real), cómo liberar su memoria. */
export interface BitmapImagen {
  readonly width: number;
  readonly height: number;
  close?(): void;
}

/** Un lienzo cuadrado de un lado fijo, ya preparado para recibir el recorte de `BitmapImagen`. */
export interface LienzoDibujo {
  dibujarRecortado(bitmap: BitmapImagen, recorte: RectanguloRecorte, ladoDestino: number): void;
  aBlob(tipo: string, calidad?: number): Promise<Blob>;
}

/** Frontera con el navegador real (ver cabecera del módulo): `procesarAvatar` solo conoce esta
 * interfaz, nunca `createImageBitmap`/`HTMLCanvasElement` directamente. */
export interface FabricaProcesadoImagen {
  crearBitmap(origen: Blob): Promise<BitmapImagen>;
  crearLienzo(lado: number): LienzoDibujo;
}

async function dibujarYCodificar(
  fabrica: FabricaProcesadoImagen,
  bitmap: BitmapImagen,
  recorte: RectanguloRecorte,
  lado: number,
): Promise<Blob> {
  const lienzo = fabrica.crearLienzo(lado);
  lienzo.dibujarRecortado(bitmap, recorte, lado);
  return lienzo.aBlob(TIPO_MIME_SALIDA, CALIDAD_WEBP);
}

/** Recorta al cuadrado y genera las dos derivadas WebP (requisitos 2 y 3 de T-14). No valida el
 * fichero de origen — eso es responsabilidad de quien llama antes de invocar esta función (aquí,
 * `subirAvatarAlumno`), para que `procesarAvatar` se pueda testear en aislamiento con cualquier
 * bitmap de mentira sin arrastrar la validación. */
export async function procesarAvatar(
  origen: Blob,
  fabrica: FabricaProcesadoImagen,
): Promise<{ readonly principal: Blob; readonly mini: Blob }> {
  const bitmap = await fabrica.crearBitmap(origen);
  try {
    const recorte = calcularRectanguloRecorte(bitmap.width, bitmap.height);
    const principal = await dibujarYCodificar(fabrica, bitmap, recorte, LADO_PRINCIPAL_PX);
    const mini = await dibujarYCodificar(fabrica, bitmap, recorte, LADO_MINI_PX);
    return { principal, mini };
  } finally {
    bitmap.close?.();
  }
}

/** La `FabricaProcesadoImagen` real, con `createImageBitmap` y un `<canvas>` de verdad. Solo tiene
 * sentido llamarla desde un navegador real (T-16): no referencia ningún global del navegador hasta
 * que se invoca, así que importar este módulo en Node/tests no falla, pero USARLA sí exige DOM. */
export function crearFabricaProcesadoImagenNavegador(): FabricaProcesadoImagen {
  return {
    async crearBitmap(origen) {
      return createImageBitmap(origen);
    },
    crearLienzo(lado) {
      const elemento = document.createElement('canvas');
      elemento.width = lado;
      elemento.height = lado;
      const contexto = elemento.getContext('2d');
      if (!contexto) {
        throw new ErrorDelServidor('El navegador no puede procesar imágenes (sin contexto de canvas).');
      }
      return {
        dibujarRecortado(bitmap, recorte, ladoDestino) {
          contexto.drawImage(
            bitmap as unknown as CanvasImageSource,
            recorte.x,
            recorte.y,
            recorte.lado,
            recorte.lado,
            0,
            0,
            ladoDestino,
            ladoDestino,
          );
        },
        aBlob(tipo, calidad) {
          return new Promise<Blob>((resolve, reject) => {
            elemento.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new ErrorDelServidor('No se ha podido generar la imagen procesada.'));
              }
            }, tipo, calidad);
          });
        },
      };
    },
  };
}

export interface DependenciasAvatarAlumno {
  readonly postgrest: ClientePostgrest;
  readonly almacenamiento: ClienteAlmacenamiento;
  readonly fabrica: FabricaProcesadoImagen;
  /** Inyectable para tests deterministas; por defecto `crypto.randomUUID()`. */
  readonly generarUuid?: () => string;
  /** Límite de cliente del contrato de T-06 (20 subidas por `administrator` y hora, ver
   * `DECISIONES_TECNICAS.md`) — defensa en profundidad; el límite autoritativo vive en la RPC/política
   * del servidor cuando exista. Opcional: sin él, no se limita en el cliente. */
  readonly limitador?: LimitadorTasa;
}

/** Procesa, sube las dos derivadas nuevas, actualiza `alumno.avatar_ruta` y, solo entonces, borra
 * las derivadas anteriores si las había (`rutaBaseAnterior`, típicamente el `avatar_ruta` que ya
 * traía la ficha cargada — sin una lectura extra). Ver la cabecera del módulo para el porqué de este
 * orden. */
export async function subirAvatarAlumno(
  deps: DependenciasAvatarAlumno,
  alumnoId: string,
  administratorId: string,
  archivoOrigen: ArchivoOrigenAvatar,
  rutaBaseAnterior: string | null,
): Promise<{ readonly rutaBase: string }> {
  deps.limitador?.comprobar(`avatar:${administratorId}`);
  validarArchivoOrigenAvatar(archivoOrigen);

  const { principal, mini } = await procesarAvatar(archivoOrigen.datos, deps.fabrica);
  const uuid = (deps.generarUuid ?? (() => crypto.randomUUID()))();
  const rutaBase = rutaBaseAvatar(alumnoId, uuid);

  await deps.almacenamiento.subir(BUCKET, rutaDerivadaAvatar(rutaBase, 'principal'), {
    datos: principal,
    tipoContenido: TIPO_MIME_SALIDA,
  });
  await deps.almacenamiento.subir(BUCKET, rutaDerivadaAvatar(rutaBase, 'mini'), {
    datos: mini,
    tipoContenido: TIPO_MIME_SALIDA,
  });

  await deps.postgrest.desde<Alumno>(TABLA).eq('id', alumnoId).actualizar({ avatar_ruta: rutaBase }, { representar: false });

  if (rutaBaseAnterior) {
    await deps.almacenamiento.eliminar(BUCKET, [
      rutaDerivadaAvatar(rutaBaseAnterior, 'principal'),
      rutaDerivadaAvatar(rutaBaseAnterior, 'mini'),
    ]);
  }

  return { rutaBase };
}

/** Quita el avatar (requisito 6): primero deja `avatar_ruta` a `NULL` — para que nadie pida ya una
 * URL firmada de un fichero a punto de desaparecer — y solo entonces borra las dos derivadas. */
export async function eliminarAvatarAlumno(
  deps: Pick<DependenciasAvatarAlumno, 'postgrest' | 'almacenamiento'>,
  alumnoId: string,
  rutaBaseActual: string,
): Promise<void> {
  await deps.postgrest.desde<Alumno>(TABLA).eq('id', alumnoId).actualizar({ avatar_ruta: null }, { representar: false });
  await deps.almacenamiento.eliminar(BUCKET, [
    rutaDerivadaAvatar(rutaBaseActual, 'principal'),
    rutaDerivadaAvatar(rutaBaseActual, 'mini'),
  ]);
}

export interface AlumnoConRutaAvatar {
  readonly alumnoId: string;
  readonly rutaBase: string;
}

/** Firma en una sola petición (requisito 5) la variante `principal`/`mini` de todos los alumnos que
 * traigan `rutaBase` — quien llama filtra antes los que no tienen avatar, esta función no distingue
 * ese caso. Devuelve solo las entradas que el servidor consiguió firmar, indexadas por `alumnoId`
 * para que la pantalla que las pinta (T-16/T-19) no tenga que volver a componer la ruta. */
export async function urlsAvataresEnLote(
  almacenamiento: ClienteAlmacenamiento,
  alumnos: readonly AlumnoConRutaAvatar[],
  variante: VarianteAvatar,
  segundosValidez: number = SEGUNDOS_VALIDEZ_URL_AVATAR_POR_DEFECTO,
): Promise<ReadonlyMap<string, string>> {
  if (alumnos.length === 0) {
    return new Map();
  }
  const rutas = alumnos.map((alumno) => rutaDerivadaAvatar(alumno.rutaBase, variante));
  const firmadas = await almacenamiento.urlFirmadasEnLote(BUCKET, rutas, segundosValidez);
  const urlPorRuta = new Map(firmadas.map((firma) => [firma.ruta, firma.url]));

  const resultado = new Map<string, string>();
  for (const alumno of alumnos) {
    const url = urlPorRuta.get(rutaDerivadaAvatar(alumno.rutaBase, variante));
    if (url !== undefined) {
      resultado.set(alumno.alumnoId, url);
    }
  }
  return resultado;
}
