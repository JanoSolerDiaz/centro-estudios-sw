import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarCsvAlumnos, alumnosSonDuplicados, CABECERA_ALUMNOS_CSV } from './importacionAlumnos.ts';
import type { CentroEstudios } from './tipos.ts';

function centro(id: string, nombre: string): CentroEstudios {
  return { id, nombre, activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' };
}

const CENTROS: readonly CentroEstudios[] = [centro('c1', 'San José'), centro('c2', 'Centro Norte')];
const CABECERA = CABECERA_ALUMNOS_CSV.join(';');

void test('cabecera inválida: devuelve errorCabecera y ninguna fila', () => {
  const resultado = analizarCsvAlumnos([['nombre', 'apellido']], CENTROS, []);
  assert.ok(resultado.errorCabecera);
  assert.deepEqual(resultado.filas, []);
});

void test('fila válida: nombre, apellidos, centro resuelto por nombre, teléfono y email', () => {
  const resultado = analizarCsvAlumnos(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'San José', '666123456', 'juan@example.com']],
    CENTROS,
    [],
  );
  assert.equal(resultado.errorCabecera, null);
  assert.equal(resultado.filas.length, 1);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.equal(fila.numeroFila, 2);
  assert.equal(fila.nombreCompleto, 'Juan Pérez García');
  assert.deepEqual(fila.datos, {
    nombre: 'Juan',
    primer_apellido: 'Pérez',
    segundo_apellido: 'García',
    centro_referencia_id: 'c1',
    telefono_alumno: '666123456',
    email_alumno: 'juan@example.com',
  });
});

void test('segundo apellido, teléfono y email vacíos son opcionales: segundo_apellido null', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['Ana', 'López', '', 'San José', '', '']], CENTROS, []);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.equal(fila.datos.segundo_apellido, null);
  assert.equal(fila.datos.telefono_alumno, null);
  assert.equal(fila.datos.email_alumno, null);
});

void test('centro resuelto de forma acento-insensible (mismo criterio que T-11)', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['Ana', 'López', '', 'SAN JOSE', '', '']], CENTROS, []);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.equal(fila.datos.centro_referencia_id, 'c1');
});

void test('nombre vacío: fila en error, no bloquea el análisis', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['', 'Pérez', '', 'San José', '', '']], CENTROS, []);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /nombre/i);
});

void test('primer apellido vacío: fila en error', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['Ana', '', '', 'San José', '', '']], CENTROS, []);
  assert.equal(resultado.filas[0]?.estado, 'error');
});

void test('centro no encontrado en el catálogo: fila en error con el nombre exacto tecleado', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['Ana', 'López', '', 'Centro Inexistente', '', '']], CENTROS, []);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /Centro Inexistente/);
});

void test('teléfono con formato inválido: fila en error', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['Ana', 'López', '', 'San José', '123', '']], CENTROS, []);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /teléfono/i);
});

void test('email con formato inválido: fila en error', () => {
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ['Ana', 'López', '', 'San José', '', 'no-es-un-email']], CENTROS, []);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'error');
  assert.match(fila.motivo, /email/i);
});

void test('criterio de aceptación: 50 filas con 2 errores (centro inexistente, teléfono inválido) deja las 48 correctas como nuevas', () => {
  const filasDatos = Array.from({ length: 50 }, (_v, i) => [`Alumno${String(i)}`, 'Apellido', '', 'San José', '666123456', '']);
  filasDatos[10] = ['AlumnoCentro', 'Apellido', '', 'Centro Que No Existe', '666123456', ''];
  filasDatos[20] = ['AlumnoTelefono', 'Apellido', '', 'San José', '123', ''];
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ...filasDatos], CENTROS, []);
  const nuevas = resultado.filas.filter((f) => f.estado === 'nueva');
  const errores = resultado.filas.filter((f) => f.estado === 'error');
  assert.equal(nuevas.length, 48);
  assert.equal(errores.length, 2);
});

void test('duplicado contra un alumno ya existente (mismo nombre completo + mismo centro): fila "duplicada", no "nueva"', () => {
  const resultado = analizarCsvAlumnos(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'San José', '', '']],
    CENTROS,
    [{ nombre: 'Juan', primer_apellido: 'Pérez', segundo_apellido: 'García', centro_referencia_id: 'c1' }],
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'duplicada');
});

void test('mismo nombre pero centro distinto: NO es duplicado', () => {
  const resultado = analizarCsvAlumnos(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'Centro Norte', '', '']],
    CENTROS,
    [{ nombre: 'Juan', primer_apellido: 'Pérez', segundo_apellido: 'García', centro_referencia_id: 'c1' }],
  );
  assert.equal(resultado.filas[0]?.estado, 'nueva');
});

void test('reintentar el mismo fichero tras corregir errores no duplica las filas ya importadas (requisito 4)', () => {
  // Simula la reimportación: las 48 filas correctas de la primera vuelta ya están en `alumnosExistentes`.
  const yaImportados = Array.from({ length: 48 }, (_v, i) => ({
    nombre: `Alumno${String(i)}`,
    primer_apellido: 'Apellido',
    segundo_apellido: null,
    centro_referencia_id: 'c1',
  }));
  const filasDatos = Array.from({ length: 50 }, (_v, i) => [`Alumno${String(i)}`, 'Apellido', '', 'San José', '', '']);
  const resultado = analizarCsvAlumnos([CABECERA.split(';'), ...filasDatos], CENTROS, yaImportados);
  const duplicadas = resultado.filas.filter((f) => f.estado === 'duplicada');
  const nuevas = resultado.filas.filter((f) => f.estado === 'nueva');
  assert.equal(duplicadas.length, 48);
  assert.equal(nuevas.length, 2);
});

void test('dos filas repetidas DENTRO del mismo fichero: la segunda se marca duplicada, no crea dos altas', () => {
  const resultado = analizarCsvAlumnos(
    [
      CABECERA.split(';'),
      ['Juan', 'Pérez', 'García', 'San José', '', ''],
      ['Juan', 'Pérez', 'García', 'San José', '', ''],
    ],
    CENTROS,
    [],
  );
  assert.equal(resultado.filas[0]?.estado, 'nueva');
  assert.equal(resultado.filas[1]?.estado, 'duplicada');
});

// --- alumnosSonDuplicados --------------------------------------------------------------------

void test('alumnosSonDuplicados: acento-insensible y sin distinguir mayúsculas, igual que centros', () => {
  assert.equal(
    alumnosSonDuplicados(
      { nombre: 'José', primer_apellido: 'Muñoz', segundo_apellido: null, centro_referencia_id: 'c1' },
      { nombre: 'jose', primer_apellido: 'MUÑOZ', segundo_apellido: null, centro_referencia_id: 'c1' },
    ),
    true,
  );
});

void test('alumnosSonDuplicados: segundo apellido null en uno y presente en otro no son iguales', () => {
  assert.equal(
    alumnosSonDuplicados(
      { nombre: 'Ana', primer_apellido: 'López', segundo_apellido: null, centro_referencia_id: 'c1' },
      { nombre: 'Ana', primer_apellido: 'López', segundo_apellido: 'García', centro_referencia_id: 'c1' },
    ),
    false,
  );
});
