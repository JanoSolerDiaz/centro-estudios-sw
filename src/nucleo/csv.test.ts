import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filaCsv, documentoCsv, documentoCsvConMetadatos, analizarCsv, detectarSeparadorCsv } from './csv.ts';

void test('filaCsv une los valores con punto y coma, no con coma', () => {
  assert.equal(filaCsv(['a', 'b', 'c']), 'a;b;c');
});

void test('filaCsv deja pasar una coma simple sin entrecomillar, porque no es el separador', () => {
  assert.equal(filaCsv(['García, María']), 'García, María');
});

void test('filaCsv entrecomilla un valor que contiene el separador', () => {
  assert.equal(filaCsv(['a;b']), '"a;b"');
});

void test('filaCsv entrecomilla y duplica las comillas internas de un valor', () => {
  assert.equal(filaCsv(['Alias "el profe"']), '"Alias ""el profe"""');
});

void test('filaCsv entrecomilla un valor con salto de línea', () => {
  assert.equal(filaCsv(['línea uno\nlínea dos']), '"línea uno\nlínea dos"');
});

void test('filaCsv conserva tildes y eñes sin ningún escapado especial', () => {
  assert.equal(filaCsv(['José Muñoz Peña']), 'José Muñoz Peña');
});

void test('filaCsv antepone un apóstrofo a un valor que empieza por "=" (inyección de fórmula CSV)', () => {
  assert.equal(filaCsv(['=1+1']), "'=1+1");
});

void test('filaCsv antepone un apóstrofo a un valor que empieza por "+", "-" o "@"', () => {
  assert.equal(filaCsv(['+1234']), "'+1234");
  assert.equal(filaCsv(['-1234']), "'-1234");
  assert.equal(filaCsv(['@alguien'])[0], "'");
});

void test('filaCsv no toca un valor que no empieza por un prefijo de fórmula, aunque los contenga en medio', () => {
  assert.equal(filaCsv(['Precio: -5']), 'Precio: -5');
});

void test('filaCsv entrecomilla también un valor neutralizado que además necesita comillas por el separador', () => {
  assert.equal(filaCsv(['=a;b']), '"\'=a;b"');
});

void test('documentoCsv empieza por el BOM UTF-8, seguido de la cabecera y las filas separadas por CRLF', () => {
  const documento = documentoCsv(['Alumno', 'Profesor'], [
    ['María Ábalos', 'Juan Pérez'],
    ['José, Muñoz "el chico"', 'Ana López'],
  ]);

  assert.equal(documento.codePointAt(0), 0xfeff);
  const sinBom = documento.slice(1);
  assert.equal(
    sinBom,
    'Alumno;Profesor\r\nMaría Ábalos;Juan Pérez\r\n"José, Muñoz ""el chico""";Ana López\r\n',
  );
});

void test('documentoCsv sin filas es solo el BOM y la cabecera', () => {
  const documento = documentoCsv(['Alumno'], []);
  assert.equal(documento, '\uFEFFAlumno\r\n');
});

void test('documentoCsvConMetadatos antepone los metadatos y una l\u00EDnea en blanco antes de la tabla (R-15)', () => {
  const documento = documentoCsvConMetadatos(
    [
      ['Rango', '2026-09-01 \u2013 2026-09-30'],
      ['Fecha de generaci\u00F3n', '09/09/2026 10:00'],
    ],
    ['Profesor', 'Sesiones'],
    [['Ana L\u00F3pez', '12']],
  );

  assert.equal(documento.codePointAt(0), 0xfeff);
  assert.equal(
    documento.slice(1),
    'Rango;2026-09-01 \u2013 2026-09-30\r\nFecha de generaci\u00F3n;09/09/2026 10:00\r\n\r\nProfesor;Sesiones\r\nAna L\u00F3pez;12\r\n',
  );
});

void test('documentoCsvConMetadatos sin filas es solo los metadatos, la l\u00EDnea en blanco y la cabecera', () => {
  const documento = documentoCsvConMetadatos([['Rango', 'x']], ['Profesor'], []);
  assert.equal(documento, '\uFEFFRango;x\r\n\r\nProfesor\r\n');
});

// --- detectarSeparadorCsv / analizarCsv (R-08, importaci\u00F3n) --------------------------------------

void test('detectarSeparadorCsv: m\u00E1s punto y coma que comas, asume punto y coma', () => {
  assert.equal(detectarSeparadorCsv('nombre;apellido;centro'), ';');
});

void test('detectarSeparadorCsv: m\u00E1s comas que puntos y coma, asume coma', () => {
  assert.equal(detectarSeparadorCsv('nombre,apellido,centro'), ',');
});

void test('detectarSeparadorCsv: empate o ninguno de los dos, asume punto y coma (por defecto del proyecto)', () => {
  assert.equal(detectarSeparadorCsv('una,sola;cabecera'), ';');
  assert.equal(detectarSeparadorCsv('sin separador'), ';');
});

void test('analizarCsv: separa por punto y coma detectado y devuelve la cabecera como primera fila', () => {
  const filas = analizarCsv('nombre;apellido\r\nJuan;P\u00E9rez\r\n');
  assert.deepEqual(filas, [
    ['nombre', 'apellido'],
    ['Juan', 'P\u00E9rez'],
  ]);
});

void test('analizarCsv: quita el BOM UTF-8 inicial antes de analizar', () => {
  const filas = analizarCsv('\uFEFFnombre;apellido\r\nJuan;P\u00E9rez\r\n');
  assert.deepEqual(filas[0], ['nombre', 'apellido']);
});

void test('analizarCsv: acepta \\n solo, sin \\r', () => {
  const filas = analizarCsv('a;b\nc;d\n');
  assert.deepEqual(filas, [
    ['a', 'b'],
    ['c', 'd'],
  ]);
});

void test('analizarCsv: la \u00FAltima l\u00EDnea sin salto final tambi\u00E9n se analiza', () => {
  const filas = analizarCsv('a;b\r\nc;d');
  assert.deepEqual(filas, [
    ['a', 'b'],
    ['c', 'd'],
  ]);
});

void test('analizarCsv: un campo entrecomillado puede contener el separador', () => {
  const filas = analizarCsv('nombre;nota\r\n"P\u00E9rez;Garc\u00EDa";"bien"\r\n');
  assert.deepEqual(filas[1], ['P\u00E9rez;Garc\u00EDa', 'bien']);
});

void test('analizarCsv: una comilla doble interna escapada como "" se convierte en una sola', () => {
  const filas = analizarCsv('alias\r\n"Alias ""el profe"""\r\n');
  assert.deepEqual(filas[1], ['Alias "el profe"']);
});

void test('analizarCsv: un campo entrecomillado puede contener un salto de l\u00EDnea', () => {
  const filas = analizarCsv('nota\r\n"l\u00EDnea uno\nl\u00EDnea dos"\r\nsiguiente\r\n');
  assert.deepEqual(filas, [['nota'], ['l\u00EDnea uno\nl\u00EDnea dos'], ['siguiente']]);
});

void test('analizarCsv: conserva tildes y e\u00F1es sin ning\u00FAn escapado especial', () => {
  const filas = analizarCsv('nombre;apellido\r\nJos\u00E9;Mu\u00F1oz Pe\u00F1a\r\n');
  assert.deepEqual(filas[1], ['Jos\u00E9', 'Mu\u00F1oz Pe\u00F1a']);
});

void test('analizarCsv: omite una l\u00EDnea en blanco al final del fichero', () => {
  const filas = analizarCsv('a;b\r\nc;d\r\n\r\n');
  assert.equal(filas.length, 2);
});

void test('analizarCsv: acepta separador por coma cuando se detecta o se fuerza', () => {
  assert.deepEqual(analizarCsv('a,b\r\nc,d\r\n'), [
    ['a', 'b'],
    ['c', 'd'],
  ]);
  assert.deepEqual(analizarCsv('a;b,c\r\n1;2,3\r\n', ','), [
    ['a;b', 'c'],
    ['1;2', '3'],
  ]);
});

void test('analizarCsv: texto vac\u00EDo no produce ninguna fila', () => {
  assert.deepEqual(analizarCsv(''), []);
});
