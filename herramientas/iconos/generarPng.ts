/**
 * Generación de los iconos de la aplicación instalable (R-09, requisito 1) sin ninguna dependencia
 * de imagen: el stack fijado (§0.2) cierra la lista de `devDependencies` de herramienta a
 * `typescript, eslint, @types/*, jsdom`, así que un paquete de rasterizado/PNG queda fuera de lo
 * que este agente puede decidir por sí mismo. Todo lo de aquí es matemática de píxel + un
 * codificador PNG mínimo escrito a mano sobre `node:zlib` (que ya hace la compresión DEFLATE/Adler-32
 * del formato zlib que exige un `IDAT`; el único algoritmo que falta y que PNG sí necesita aparte es
 * el CRC-32 de cada chunk, implementado más abajo con la tabla estándar).
 *
 * Sin texto/tipografía: en vez de intentar rasterizar las letras "GA" sin ninguna fuente disponible,
 * el icono es un cuadrado con esquinas redondeadas (o a sangre, para variantes "maskable"/Apple) en
 * el azul ya usado como acento en la interfaz (`#1D4ED8`, `pantallaPasarLista.ts`) con una marca de
 * verificación blanca en el centro — el gesto central del producto (pasar lista) en vez de un
 * monograma arbitrario.
 */

import { deflateSync } from 'node:zlib';

// --- CRC-32 (tabla estándar IEEE 802.3, la que exige el formato PNG para cada chunk) ---

function construirTablaCrc32(): Uint32Array {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[n] = c >>> 0;
  }
  return tabla;
}

const TABLA_CRC32 = construirTablaCrc32();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    const indice = (c ^ byte) & 0xff;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- índice siempre en [0,255], tamaño fijo de la tabla
    c = TABLA_CRC32[indice]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// --- Codificador PNG mínimo: RGBA de 8 bits, sin entrelazado, un único IDAT ---

function escribirUint32BE(valor: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(valor >>> 0, 0);
  return buffer;
}

function crearChunk(tipo: string, datos: Buffer): Buffer {
  const tipoBuf = Buffer.from(tipo, 'ascii');
  const cuerpo = Buffer.concat([tipoBuf, datos]);
  return Buffer.concat([escribirUint32BE(datos.length), cuerpo, escribirUint32BE(crc32(cuerpo))]);
}

const FIRMA_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** `pixeles` en orden RGBA por fila (`filas[y][x] = [r,g,b,a]`, 0-255 cada canal). */
export function codificarPng(ancho: number, alto: number, pixeles: (x: number, y: number) => readonly [number, number, number, number]): Buffer {
  const bytesPorFila = 1 + ancho * 4; // 1 byte de filtro (siempre "None") + RGBA por píxel
  const datosCrudos = Buffer.alloc(bytesPorFila * alto);
  for (let y = 0; y < alto; y++) {
    const inicioFila = y * bytesPorFila;
    datosCrudos[inicioFila] = 0; // filtro "None"
    for (let x = 0; x < ancho; x++) {
      const [r, g, b, a] = pixeles(x, y);
      const offset = inicioFila + 1 + x * 4;
      datosCrudos[offset] = r;
      datosCrudos[offset + 1] = g;
      datosCrudos[offset + 2] = b;
      datosCrudos[offset + 3] = a;
    }
  }

  const ihdr = Buffer.concat([
    escribirUint32BE(ancho),
    escribirUint32BE(alto),
    Buffer.from([8, 6, 0, 0, 0]), // bitDepth=8, colorType=6 (RGBA), compression/filter/interlace=0
  ]);

  const idat = deflateSync(datosCrudos);

  return Buffer.concat([FIRMA_PNG, crearChunk('IHDR', ihdr), crearChunk('IDAT', idat), crearChunk('IEND', Buffer.alloc(0))]);
}

// --- Geometría del icono: SDF de rectángulo redondeado + distancia a segmento para el trazo ---

/** SDF de un cuadrado centrado en el origen, con esquinas redondeadas (Inigo Quilez, dominio
 * público). Negativo dentro de la forma, positivo fuera; magnitud aproximada en píxeles. */
function sdfCuadradoRedondeado(x: number, y: number, mitadLado: number, radio: number): number {
  const qx = Math.abs(x) - mitadLado + radio;
  const qy = Math.abs(y) - mitadLado + radio;
  const fueraX = Math.max(qx, 0);
  const fueraY = Math.max(qy, 0);
  const distanciaFuera = Math.hypot(fueraX, fueraY);
  const distanciaDentro = Math.min(Math.max(qx, qy), 0);
  return distanciaFuera + distanciaDentro - radio;
}

function distanciaASegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const largoAlCuadrado = abx * abx + aby * aby;
  const t = largoAlCuadrado > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / largoAlCuadrado)) : 0;
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function alfaDesdeDistancia(distancia: number): number {
  // Antialiasing de ~1px: 1 (dentro) → 0 (fuera), con una transición lineal de 1px en el borde.
  return Math.max(0, Math.min(1, 0.5 - distancia));
}

function mezclar(fondo: readonly [number, number, number, number], color: readonly [number, number, number], alfaColor: number): [number, number, number, number] {
  const alfaFondo = fondo[3] / 255;
  const alfaResultado = alfaColor + alfaFondo * (1 - alfaColor);
  if (alfaResultado <= 0) {
    return [0, 0, 0, 0];
  }
  const mezclarCanal = (canalColor: number, canalFondo: number): number =>
    Math.round((canalColor * alfaColor + canalFondo * alfaFondo * (1 - alfaColor)) / alfaResultado);
  return [mezclarCanal(color[0], fondo[0]), mezclarCanal(color[1], fondo[1]), mezclarCanal(color[2], fondo[2]), Math.round(alfaResultado * 255)];
}

export type VarianteIcono = 'redondeado' | 'sangrado';

export interface OpcionesIcono {
  readonly tamano: number;
  readonly variante: VarianteIcono;
  readonly colorFondo: readonly [number, number, number];
  readonly colorTrazo: readonly [number, number, number];
}

/** El trazo de la marca de verificación, en coordenadas normalizadas [0,1]×[0,1] sobre el icono.
 * `variante: 'sangrado'` (maskable/Apple, sin margen de seguridad garantizado por el propio SO)
 * lo encoge hacia el centro para quedar dentro del 80% central recomendado por la especificación
 * de iconos maskable. */
const PUNTOS_MARCA_NORMALIZADOS: readonly [[number, number], [number, number], [number, number]] = [
  [0.27, 0.53],
  [0.44, 0.7],
  [0.75, 0.32],
];

function puntosMarca(tamano: number, variante: VarianteIcono): readonly [[number, number], [number, number], [number, number]] {
  const factor = variante === 'sangrado' ? 0.78 : 1;
  const escalar = ([nx, ny]: readonly [number, number]): [number, number] => [(0.5 + (nx - 0.5) * factor) * tamano, (0.5 + (ny - 0.5) * factor) * tamano];
  const [a, b, c] = PUNTOS_MARCA_NORMALIZADOS;
  return [escalar(a), escalar(b), escalar(c)];
}

/** Genera la función de píxel de un icono cuadrado: fondo redondeado o a sangre según `variante`,
 * con la marca de verificación blanca centrada encima. Determinista (sin aleatoriedad ni reloj):
 * misma entrada, mismo PNG byte a byte. */
export function generarPixelesIcono(opciones: OpcionesIcono): (x: number, y: number) => [number, number, number, number] {
  const { tamano, variante, colorFondo, colorTrazo } = opciones;
  const centro = tamano / 2;
  const radioEsquina = variante === 'redondeado' ? tamano * 0.22 : 0;
  const margenFondo = variante === 'redondeado' ? tamano * 0.04 : 0;
  const mitadLadoFondo = centro - margenFondo;
  const anchoTrazo = tamano * 0.085;
  const [pa, pb, pc] = puntosMarca(tamano, variante);

  return (x: number, y: number) => {
    const px = x + 0.5;
    const py = y + 0.5;

    const distanciaFondo = sdfCuadradoRedondeado(px - centro, py - centro, mitadLadoFondo, radioEsquina);
    const alfaFondo = alfaDesdeDistancia(distanciaFondo);
    let pixel: [number, number, number, number] = [colorFondo[0], colorFondo[1], colorFondo[2], Math.round(alfaFondo * 255)];

    const distanciaTrazo = Math.min(distanciaASegmento(px, py, pa[0], pa[1], pb[0], pb[1]), distanciaASegmento(px, py, pb[0], pb[1], pc[0], pc[1])) - anchoTrazo / 2;
    const alfaTrazo = alfaDesdeDistancia(distanciaTrazo);
    if (alfaTrazo > 0) {
      pixel = mezclar(pixel, colorTrazo, alfaTrazo);
    }

    return pixel;
  };
}

export function generarIconoPng(opciones: OpcionesIcono): Buffer {
  return codificarPng(opciones.tamano, opciones.tamano, generarPixelesIcono(opciones));
}
