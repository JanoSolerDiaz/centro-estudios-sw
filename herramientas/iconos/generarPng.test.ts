import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { crc32, codificarPng, generarPixelesIcono, generarIconoPng } from './generarPng.ts';

void test('crc32: vector de prueba conocido ("123456789" → 0xCBF43926, IEEE 802.3)', () => {
  const resultado = crc32(Buffer.from('123456789', 'ascii'));
  assert.equal(resultado.toString(16), 'cbf43926');
});

void test('crc32: cadena vacía da 0', () => {
  assert.equal(crc32(Buffer.alloc(0)), 0);
});

void test('codificarPng: cabecera y estructura de chunks correctas para un 2×2 sólido', () => {
  const png = codificarPng(2, 2, () => [10, 20, 30, 255]);

  // Firma PNG estándar.
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: longitud 13, tipo "IHDR", ancho=2, alto=2, bitDepth=8, colorType=6 (RGBA).
  const longitudIhdr = png.readUInt32BE(8);
  assert.equal(longitudIhdr, 13);
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), 2);
  assert.equal(png.readUInt32BE(20), 2);
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);

  // El fichero termina en el chunk IEND (longitud 0).
  const finIend = png.length;
  const tipoIend = png.subarray(finIend - 8, finIend - 4).toString('ascii');
  assert.equal(tipoIend, 'IEND');
});

void test('codificarPng: el IDAT descomprime a los píxeles RGBA exactos, con el byte de filtro "None"', () => {
  const ancho = 2;
  const alto = 2;
  const pixelesEsperados: Record<string, [number, number, number, number]> = {
    '0,0': [255, 0, 0, 255],
    '1,0': [0, 255, 0, 128],
    '0,1': [0, 0, 255, 0],
    '1,1': [255, 255, 255, 255],
  };
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- clave siempre presente, generada por el propio bucle de abajo
  const png = codificarPng(ancho, alto, (x, y) => pixelesEsperados[`${String(x)},${String(y)}`]!);

  // Localizar el chunk IDAT (longitud + tipo + datos + crc) para descomprimirlo con zlib real.
  const longitudIdat = png.readUInt32BE(33); // 8 firma + 25 chunk IHDR completo
  const datosIdat = png.subarray(33 + 8, 33 + 8 + longitudIdat);
  const crudo = inflateSync(datosIdat);

  const bytesPorFila = 1 + ancho * 4;
  assert.equal(crudo.length, bytesPorFila * alto);
  for (let y = 0; y < alto; y++) {
    const inicio = y * bytesPorFila;
    assert.equal(crudo[inicio], 0, `fila ${String(y)}: byte de filtro debe ser 0 (None)`);
    for (let x = 0; x < ancho; x++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- misma clave que arriba
      const [r, g, b, a] = pixelesEsperados[`${String(x)},${String(y)}`]!;
      const offset = inicio + 1 + x * 4;
      assert.deepEqual([crudo[offset], crudo[offset + 1], crudo[offset + 2], crudo[offset + 3]], [r, g, b, a]);
    }
  }
});

void test('generarPixelesIcono: determinista — dos llamadas con la misma entrada dan el mismo píxel', () => {
  const opciones = { tamano: 64, variante: 'redondeado' as const, colorFondo: [29, 78, 216] as const, colorTrazo: [255, 255, 255] as const };
  const pixelesA = generarPixelesIcono(opciones);
  const pixelesB = generarPixelesIcono(opciones);
  for (let y = 0; y < 64; y += 7) {
    for (let x = 0; x < 64; x += 7) {
      assert.deepEqual(pixelesA(x, y), pixelesB(x, y));
    }
  }
});

void test('generarPixelesIcono "redondeado": la esquina extrema es transparente y el centro es opaco', () => {
  const pixeles = generarPixelesIcono({ tamano: 100, variante: 'redondeado', colorFondo: [29, 78, 216], colorTrazo: [255, 255, 255] });
  const [, , , alfaEsquina] = pixeles(0, 0);
  const [, , , alfaCentro] = pixeles(50, 85); // fuera del trazo, dentro del fondo
  assert.equal(alfaEsquina, 0);
  assert.equal(alfaCentro, 255);
});

void test('generarPixelesIcono "sangrado": la esquina extrema NO es transparente (a sangre, sin redondeo)', () => {
  const pixeles = generarPixelesIcono({ tamano: 100, variante: 'sangrado', colorFondo: [29, 78, 216], colorTrazo: [255, 255, 255] });
  const [, , , alfaEsquina] = pixeles(0, 0);
  assert.equal(alfaEsquina, 255);
});

void test('generarPixelesIcono: el centro de la marca de verificación es del color de trazo (blanco), no del fondo', () => {
  const colorFondo = [29, 78, 216] as const;
  const colorTrazo = [255, 255, 255] as const;
  const pixeles = generarPixelesIcono({ tamano: 100, variante: 'redondeado', colorFondo, colorTrazo });
  // Punto medio del segmento central de la marca (entre los puntos normalizados 0.44,0.7 y 0.75,0.32).
  const [r, g, b, a] = pixeles(60, 51);
  assert.equal(a, 255);
  assert.deepEqual([r, g, b], [...colorTrazo]);
});

void test('generarIconoPng: produce un Buffer con la firma PNG y del tamaño pedido', () => {
  const png = generarIconoPng({ tamano: 8, variante: 'sangrado', colorFondo: [29, 78, 216], colorTrazo: [255, 255, 255] });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 8);
  assert.equal(png.readUInt32BE(20), 8);
});
