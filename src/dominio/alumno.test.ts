import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarNombrePersona,
  normalizarTelefonoAlumno,
  emailAlumnoValido,
  telefonoAlumnoValido,
  nombreCompletoAlumno,
  compararAlumnosParaOrden,
} from './alumno.ts';
import type { Alumno } from './tipos.ts';

function alumno(parcial: Partial<Alumno>): Alumno {
  return {
    id: 'id',
    nombre: 'Nombre',
    primer_apellido: 'Apellido',
    segundo_apellido: null,
    centro_referencia_id: 'centro',
    avatar_ruta: null,
    email_alumno: null,
    telefono_alumno: null,
    activo: true,
    alta_en: '2026-01-01T00:00:00Z',
    baja_en: null,
    motivo_baja: null,
    usuario_id: null,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    ...parcial,
  };
}

void test('normalizarNombrePersona recorta y colapsa espacios sin tocar mayúsculas', () => {
  assert.equal(normalizarNombrePersona('  de   la  Fuente  '), 'de la Fuente');
  assert.equal(normalizarNombrePersona("O'Donnell"), "O'Donnell");
});

void test('normalizarTelefonoAlumno quita espacios, puntos y guiones', () => {
  assert.equal(normalizarTelefonoAlumno('666 12 34 56'), '666123456');
  assert.equal(normalizarTelefonoAlumno('+34 666-12.34-56'), '+34666123456');
});

void test('emailAlumnoValido acepta un email con forma correcta', () => {
  assert.equal(emailAlumnoValido('alumno@ejemplo.com'), true);
});

void test('emailAlumnoValido rechaza texto sin @ o sin dominio', () => {
  assert.equal(emailAlumnoValido('sin-arroba.com'), false);
  assert.equal(emailAlumnoValido('sin-dominio@ejemplo'), false);
});

void test('telefonoAlumnoValido acepta un móvil español con y sin prefijo +34', () => {
  assert.equal(telefonoAlumnoValido('666123456'), true);
  assert.equal(telefonoAlumnoValido('+34666123456'), true);
});

void test('telefonoAlumnoValido rechaza un número que no empieza por 6/7/8/9 o con longitud incorrecta', () => {
  assert.equal(telefonoAlumnoValido('566123456'), false);
  assert.equal(telefonoAlumnoValido('66612345'), false);
  assert.equal(telefonoAlumnoValido('6661234567'), false);
});

void test('nombreCompletoAlumno compone "Nombre PrimerApellido SegundoApellido" con los tres apellidos', () => {
  assert.equal(
    nombreCompletoAlumno({ nombre: 'María', primer_apellido: 'García', segundo_apellido: 'Pérez' }),
    'María García Pérez',
  );
});

void test('nombreCompletoAlumno omite el segundo apellido null sin dejar un espacio de más', () => {
  assert.equal(
    nombreCompletoAlumno({ nombre: 'Juan', primer_apellido: 'Ábalos', segundo_apellido: null }),
    'Juan Ábalos',
  );
});

void test('compararAlumnosParaOrden ordena por primer_apellido, segundo_apellido y nombre, acento-insensible', () => {
  const garciaPerez = alumno({ nombre: 'Ana', primer_apellido: 'García', segundo_apellido: 'Pérez' });
  const garciaLopez = alumno({ nombre: 'Luis', primer_apellido: 'García', segundo_apellido: 'López' });
  const abalos = alumno({ nombre: 'Zoe', primer_apellido: 'Ábalos', segundo_apellido: null });

  const ordenados = [garciaPerez, garciaLopez, abalos].sort(compararAlumnosParaOrden);

  assert.deepEqual(
    ordenados.map((a) => a.primer_apellido),
    ['Ábalos', 'García', 'García'],
  );
  assert.deepEqual(
    ordenados.map((a) => a.segundo_apellido),
    [null, 'López', 'Pérez'],
  );
});

void test('compararAlumnosParaOrden no ordena por el nombre de pila cuando los apellidos ya distinguen', () => {
  const primero = alumno({ nombre: 'Zoe', primer_apellido: 'Aguilar', segundo_apellido: 'Ruiz' });
  const segundo = alumno({ nombre: 'Ana', primer_apellido: 'Bermejo', segundo_apellido: 'Ruiz' });

  assert.ok(compararAlumnosParaOrden(primero, segundo) < 0);
});
