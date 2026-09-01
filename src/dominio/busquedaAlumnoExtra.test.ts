import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeBuscar, resultadosParaMostrar, type ResultadoBusquedaAlumno } from './busquedaAlumnoExtra.ts';

function crearResultado(datos: Partial<ResultadoBusquedaAlumno> & { readonly id: string }): ResultadoBusquedaAlumno {
  return {
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
    centro_nombre: 'IES Prueba',
    ...datos,
  };
}

void test('debeBuscar: false con menos de dos caracteres', () => {
  assert.equal(debeBuscar(''), false);
  assert.equal(debeBuscar('a'), false);
});

void test('debeBuscar: false con dos caracteres de solo espacios (se recorta antes de contar)', () => {
  assert.equal(debeBuscar('  '), false);
  assert.equal(debeBuscar(' a '), false);
});

void test('debeBuscar: true a partir de dos caracteres reales', () => {
  assert.equal(debeBuscar('an'), true);
  assert.equal(debeBuscar('ana'), true);
});

void test('resultadosParaMostrar: sin homónimos, ninguno marca esHomonimo', () => {
  const resultados = [
    crearResultado({ id: '1', nombre: 'Ana', primer_apellido: 'García' }),
    crearResultado({ id: '2', nombre: 'Luis', primer_apellido: 'Pérez' }),
  ];
  const marcados = resultadosParaMostrar(resultados);
  assert.deepEqual(
    marcados.map((m) => m.esHomonimo),
    [false, false],
  );
});

void test('resultadosParaMostrar: dos alumnos con el mismo nombre completo se marcan homónimos entre sí', () => {
  const resultados = [
    crearResultado({ id: '1', nombre: 'Ana', primer_apellido: 'García', centro_nombre: 'IES Uno' }),
    crearResultado({ id: '2', nombre: 'Ana', primer_apellido: 'García', centro_nombre: 'IES Dos' }),
  ];
  const marcados = resultadosParaMostrar(resultados);
  assert.deepEqual(
    marcados.map((m) => m.esHomonimo),
    [true, true],
  );
});

void test('resultadosParaMostrar: la comparación de homónimos ignora mayúsculas', () => {
  const resultados = [
    crearResultado({ id: '1', nombre: 'ana', primer_apellido: 'garcía' }),
    crearResultado({ id: '2', nombre: 'Ana', primer_apellido: 'García' }),
  ];
  const marcados = resultadosParaMostrar(resultados);
  assert.deepEqual(
    marcados.map((m) => m.esHomonimo),
    [true, true],
  );
});

void test('resultadosParaMostrar: un segundo_apellido distinto no cuenta como homónimo', () => {
  const resultados = [
    crearResultado({ id: '1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: 'López' }),
    crearResultado({ id: '2', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: 'Ruiz' }),
  ];
  const marcados = resultadosParaMostrar(resultados);
  assert.deepEqual(
    marcados.map((m) => m.esHomonimo),
    [false, false],
  );
});

void test('resultadosParaMostrar: conserva el orden y el contenido de entrada', () => {
  const resultados = [crearResultado({ id: '1' }), crearResultado({ id: '2', nombre: 'Luis' })];
  const marcados = resultadosParaMostrar(resultados);
  assert.deepEqual(
    marcados.map((m) => m.resultado.id),
    ['1', '2'],
  );
});

void test('resultadosParaMostrar: lista vacía da lista vacía', () => {
  assert.deepEqual(resultadosParaMostrar([]), []);
});
