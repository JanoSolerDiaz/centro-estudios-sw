import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularRectanguloRecorte,
  colorMonograma,
  esTipoImagenOrigenAceptado,
  inicialesAlumno,
  origenAvatarDemasiadoGrande,
  rutaBaseAvatar,
  rutaDerivadaAvatar,
  TAMANO_MAXIMO_ORIGEN_BYTES,
} from './avatarAlumno.ts';

void test('calcularRectanguloRecorte recorta por los lados en una imagen apaisada (más ancha que alta)', () => {
  assert.deepEqual(calcularRectanguloRecorte(4000, 3000), { x: 500, y: 0, lado: 3000 });
});

void test('calcularRectanguloRecorte recorta por arriba y abajo en una imagen vertical (más alta que ancha)', () => {
  assert.deepEqual(calcularRectanguloRecorte(3000, 4000), { x: 0, y: 500, lado: 3000 });
});

void test('calcularRectanguloRecorte no recorta nada en una imagen ya cuadrada', () => {
  assert.deepEqual(calcularRectanguloRecorte(2000, 2000), { x: 0, y: 0, lado: 2000 });
});

void test('calcularRectanguloRecorte redondea hacia abajo cuando el margen sobrante es impar', () => {
  assert.deepEqual(calcularRectanguloRecorte(101, 100), { x: 0, y: 0, lado: 100 });
  assert.deepEqual(calcularRectanguloRecorte(100, 101), { x: 0, y: 0, lado: 100 });
});

void test('rutaBaseAvatar construye la ruta base determinista alumno/{alumnoId}/{uuid}/', () => {
  assert.equal(rutaBaseAvatar('a1', 'u1'), 'alumno/a1/u1/');
});

void test('rutaDerivadaAvatar deriva la ruta principal y la mini de la misma ruta base', () => {
  const base = rutaBaseAvatar('a1', 'u1');
  assert.equal(rutaDerivadaAvatar(base, 'principal'), 'alumno/a1/u1/avatar.webp');
  assert.equal(rutaDerivadaAvatar(base, 'mini'), 'alumno/a1/u1/avatar-mini.webp');
});

void test('rutaBaseAvatar: dos subidas distintas del mismo alumno no colisionan (uuid distinto)', () => {
  const primera = rutaBaseAvatar('a1', 'u1');
  const segunda = rutaBaseAvatar('a1', 'u2');
  assert.notEqual(primera, segunda);
});

void test('esTipoImagenOrigenAceptado acepta los formatos de imagen habituales de un móvil', () => {
  assert.equal(esTipoImagenOrigenAceptado('image/jpeg'), true);
  assert.equal(esTipoImagenOrigenAceptado('image/png'), true);
  assert.equal(esTipoImagenOrigenAceptado('image/webp'), true);
  assert.equal(esTipoImagenOrigenAceptado('image/heic'), true);
});

void test('esTipoImagenOrigenAceptado rechaza un tipo que no es imagen', () => {
  assert.equal(esTipoImagenOrigenAceptado('application/pdf'), false);
  assert.equal(esTipoImagenOrigenAceptado('text/plain'), false);
  assert.equal(esTipoImagenOrigenAceptado(''), false);
});

void test('origenAvatarDemasiadoGrande acepta un tamaño por debajo del límite', () => {
  assert.equal(origenAvatarDemasiadoGrande(TAMANO_MAXIMO_ORIGEN_BYTES - 1), false);
});

void test('origenAvatarDemasiadoGrande rechaza un tamaño por encima del límite', () => {
  assert.equal(origenAvatarDemasiadoGrande(TAMANO_MAXIMO_ORIGEN_BYTES + 1), true);
});

void test('inicialesAlumno toma la primera letra del nombre y del primer apellido, en mayúsculas', () => {
  assert.equal(inicialesAlumno({ nombre: 'lucía', primer_apellido: 'gómez', segundo_apellido: 'ruiz' }), 'LG');
});

void test('inicialesAlumno ignora el segundo apellido', () => {
  assert.equal(inicialesAlumno({ nombre: 'Marcos', primer_apellido: 'Vidal', segundo_apellido: null }), 'MV');
});

void test('colorMonograma es estable: el mismo identificador siempre da el mismo color', () => {
  const id = '11111111-1111-1111-1111-111111111111';
  assert.equal(colorMonograma(id), colorMonograma(id));
});

void test('colorMonograma devuelve un color hexadecimal de la paleta fija', () => {
  const color = colorMonograma('cualquier-id');
  assert.match(color, /^#[0-9A-Fa-f]{6}$/);
});

void test('colorMonograma: identificadores distintos pueden dar colores distintos (paleta con más de un valor)', () => {
  const colores = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((semilla) => colorMonograma(semilla)));
  assert.ok(colores.size > 1);
});
