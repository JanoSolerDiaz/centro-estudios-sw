import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filaCsv, documentoCsv } from './csv.ts';

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
