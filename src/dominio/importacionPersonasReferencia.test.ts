import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analizarCsvPersonasReferencia,
  CABECERA_PERSONAS_REFERENCIA_CSV,
  type AlumnoParaEmparejarPersonaReferencia,
} from './importacionPersonasReferencia.ts';
import type { DatosDuplicadoPersonaReferencia } from './personaReferencia.ts';

const CABECERA = CABECERA_PERSONAS_REFERENCIA_CSV.join(';');

const ALUMNO_A: AlumnoParaEmparejarPersonaReferencia = { id: 'a1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: 'Pérez' };
const ALUMNO_B: AlumnoParaEmparejarPersonaReferencia = { id: 'a2', nombre: 'Luis', primer_apellido: 'Gómez', segundo_apellido: null };

const ALUMNOS: readonly AlumnoParaEmparejarPersonaReferencia[] = [ALUMNO_A, ALUMNO_B];

const SIN_EXISTENTES: ReadonlyMap<string, readonly DatosDuplicadoPersonaReferencia[]> = new Map();

void test('cabecera inválida: errorCabecera y ninguna fila', () => {
  const resultado = analizarCsvPersonasReferencia([['algo']], ALUMNOS, SIN_EXISTENTES);
  assert.ok(resultado.errorCabecera);
  assert.deepEqual(resultado.filas, []);
});

void test('fila nueva: alumno resuelto por nombre y apellidos exactos, teléfono normalizado, sin email', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666 12 34 56', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  assert.equal(resultado.errorCabecera, null);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.deepEqual(fila.datos, {
    alumno_id: 'a1',
    nombre: 'Juan',
    primer_apellido: 'López',
    segundo_apellido: null,
    telefono_referencia: '666123456',
    email_referencia: null,
  });
  assert.equal(fila.descripcion, 'Ana García Pérez — Juan López (666123456)');
});

void test('fila nueva: con email válido, se conserva tal cual', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', 'juan@ejemplo.com']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.equal(fila.datos.email_referencia, 'juan@ejemplo.com');
});

void test('emparejamiento de alumno es EXACTO (no acento-insensible): una variante de tildes no coincide', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'Garcia', 'Perez', 'Juan', 'López', '', '666123456', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /No existe ningún alumno con el nombre y apellidos exactos «Ana Garcia Perez»/);
});

void test('alumno sin segundo apellido: coincide cuando la columna del CSV viene vacía', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Luis', 'Gómez', '', 'Juan', 'López', '', '666123456', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  assert.equal(resultado.filas[0]?.estado, 'nueva');
});

void test('nombre o primer apellido del alumno vacíos: error, sin buscar ningún alumno', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['', 'García', '', 'Juan', 'López', '', '666123456', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /El nombre y el primer apellido del alumno son obligatorios\./);
});

void test('nombre de la persona de referencia vacío: error', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', '', 'López', '', '666123456', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /El nombre de la persona de referencia no puede estar vacío\./);
});

void test('primer apellido de la persona de referencia vacío: error', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', '', '', '666123456', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /El primer apellido de la persona de referencia no puede estar vacío\./);
});

void test('teléfono vacío: error, es obligatorio', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /El teléfono es obligatorio\./);
});

void test('teléfono con formato inválido: error', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '12345', '']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /El teléfono no tiene un formato español válido\./);
});

void test('email con formato inválido: error', () => {
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', 'no-es-un-email']],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /El email no tiene un formato válido\./);
});

void test('una fila con error no bloquea las siguientes', () => {
  const resultado = analizarCsvPersonasReferencia(
    [
      CABECERA.split(';'),
      ['NoExiste', 'Nadie', '', 'Juan', 'López', '', '666123456', ''],
      ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', ''],
    ],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  assert.equal(resultado.filas.length, 2);
  assert.equal(resultado.filas[0]?.estado, 'error');
  assert.equal(resultado.filas[1]?.estado, 'nueva');
});

void test('duplicada contra una persona YA existente del mismo alumno (nombre completo + teléfono, acento-insensible)', () => {
  const existentes = new Map<string, readonly DatosDuplicadoPersonaReferencia[]>([
    ['a1', [{ nombre: 'Juan', primer_apellido: 'López', segundo_apellido: null, telefono_referencia: '666123456' }]],
  ]);
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'JUAN', 'lopez', '', '666 123 456', '']],
    ALUMNOS,
    existentes,
  );
  assert.equal(resultado.filas[0]?.estado, 'duplicada');
});

void test('la misma persona de otro alumno NO cuenta como duplicada: el filtro es por alumno', () => {
  const existentes = new Map<string, readonly DatosDuplicadoPersonaReferencia[]>([
    ['a2', [{ nombre: 'Juan', primer_apellido: 'López', segundo_apellido: null, telefono_referencia: '666123456' }]],
  ]);
  const resultado = analizarCsvPersonasReferencia(
    [CABECERA.split(';'), ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', '']],
    ALUMNOS,
    existentes,
  );
  assert.equal(resultado.filas[0]?.estado, 'nueva');
});

void test('dos filas del mismo fichero para el mismo alumno: la segunda repetida queda duplicada, sin tocar la base de datos', () => {
  const resultado = analizarCsvPersonasReferencia(
    [
      CABECERA.split(';'),
      ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', ''],
      ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', ''],
    ],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  assert.equal(resultado.filas[0]?.estado, 'nueva');
  assert.equal(resultado.filas[1]?.estado, 'duplicada');
});

void test('un alumno puede tener varias personas de referencia distintas en el mismo fichero (requisito 4)', () => {
  const resultado = analizarCsvPersonasReferencia(
    [
      CABECERA.split(';'),
      ['Ana', 'García', 'Pérez', 'Juan', 'López', '', '666123456', ''],
      ['Ana', 'García', 'Pérez', 'María', 'López', '', '677123456', ''],
    ],
    ALUMNOS,
    SIN_EXISTENTES,
  );
  assert.equal(resultado.filas[0]?.estado, 'nueva');
  assert.equal(resultado.filas[1]?.estado, 'nueva');
});
