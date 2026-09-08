import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analizarCsvHorarios,
  diaSemanaDesdeTexto,
  emailsProfesorUnicosDeCsvHorarios,
  CABECERA_HORARIOS_CSV,
  type AlumnoParaEmparejarHorario,
  type ProfesorResuelto,
} from './importacionHorarios.ts';

const CABECERA = CABECERA_HORARIOS_CSV.join(';');

const ALUMNOS: readonly AlumnoParaEmparejarHorario[] = [
  { id: 'a1', nombre: 'Juan', primer_apellido: 'Pérez', segundo_apellido: 'García' },
  { id: 'a2', nombre: 'Ana', primer_apellido: 'López', segundo_apellido: null },
];

const PROFESOR: ProfesorResuelto = { id: 'p1', nombre: 'Ana Profesora' };

function mapaProfesores(entradas: readonly (readonly [string, ProfesorResuelto | null])[]): ReadonlyMap<string, ProfesorResuelto | null> {
  return new Map(entradas);
}

// --- diaSemanaDesdeTexto --------------------------------------------------------------------

void test('diaSemanaDesdeTexto: acepta el dígito 1-7', () => {
  assert.equal(diaSemanaDesdeTexto('1'), 1);
  assert.equal(diaSemanaDesdeTexto('7'), 7);
});

void test('diaSemanaDesdeTexto: acepta el nombre del día en español, acento-insensible y sin distinguir mayúsculas', () => {
  assert.equal(diaSemanaDesdeTexto('Lunes'), 1);
  assert.equal(diaSemanaDesdeTexto('miercoles'), 3);
  assert.equal(diaSemanaDesdeTexto('MIÉRCOLES'), 3);
  assert.equal(diaSemanaDesdeTexto('domingo'), 7);
});

void test('diaSemanaDesdeTexto: texto que no coincide con nada, undefined', () => {
  assert.equal(diaSemanaDesdeTexto('8'), undefined);
  assert.equal(diaSemanaDesdeTexto('0'), undefined);
  assert.equal(diaSemanaDesdeTexto('lunesX'), undefined);
});

// --- emailsProfesorUnicosDeCsvHorarios ------------------------------------------------------

void test('emailsProfesorUnicosDeCsvHorarios: distintos, en minúsculas, sin repetir ni contar la cabecera', () => {
  const filas = [
    CABECERA.split(';'),
    ['Juan', 'Pérez', '', 'Ana@Example.com', '1', '10:00', '11:00', ''],
    ['Ana', 'López', '', 'ana@example.com', '2', '10:00', '11:00', ''],
    ['Juan', 'Pérez', '', 'otro@example.com', '3', '10:00', '11:00', ''],
    ['Juan', 'Pérez', '', '', '3', '10:00', '11:00', ''],
  ];
  assert.deepEqual(emailsProfesorUnicosDeCsvHorarios(filas), ['ana@example.com', 'otro@example.com']);
});

// --- analizarCsvHorarios ---------------------------------------------------------------------

void test('cabecera inválida: errorCabecera y ninguna fila', () => {
  const resultado = analizarCsvHorarios([['algo']], ALUMNOS, mapaProfesores([]));
  assert.ok(resultado.errorCabecera);
  assert.deepEqual(resultado.filas, []);
});

void test('fila válida: alumno resuelto por nombre exacto, profesor resuelto por email, día por número', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'ana@example.com', '1', '10:00', '11:00', 'Matemáticas']],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  assert.equal(resultado.errorCabecera, null);
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.deepEqual(fila.datos, {
    alumno_id: 'a1',
    profesor_id: 'p1',
    dia_semana: 1,
    hora_inicio: '10:00',
    hora_fin: '11:00',
    asignatura_o_grupo: 'Matemáticas',
  });
});

void test('día de la semana por nombre en español', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Ana', 'López', '', 'ana@example.com', 'Miércoles', '10:00', '11:00', '']],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  const [fila] = resultado.filas;
  assert.equal(fila?.estado, 'nueva');
  assert.equal(fila.datos.dia_semana, 3);
  assert.equal(fila.datos.asignatura_o_grupo, null);
});

void test('alumno inexistente (nombre y apellidos no coinciden exactamente): fila en error, no bloquea el resto', () => {
  const resultado = analizarCsvHorarios(
    [
      CABECERA.split(';'),
      ['Nadie', 'Desconocido', '', 'ana@example.com', '1', '10:00', '11:00', ''],
      ['Ana', 'López', '', 'ana@example.com', '2', '10:00', '11:00', ''],
    ],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  assert.equal(resultado.filas[0]?.estado, 'error');
  assert.equal(resultado.filas[1]?.estado, 'nueva');
});

void test('alumno con nombre parecido pero no exacto (falta el segundo apellido) no coincide', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Juan', 'Pérez', '', 'ana@example.com', '1', '10:00', '11:00', '']],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  assert.equal(resultado.filas[0]?.estado, 'error');
});

void test('criterio de aceptación: profesor sin cuenta en el sistema deja esa fila en error sin bloquear el resto', () => {
  const resultado = analizarCsvHorarios(
    [
      CABECERA.split(';'),
      ['Juan', 'Pérez', 'García', 'inexistente@example.com', '1', '10:00', '11:00', ''],
      ['Ana', 'López', '', 'ana@example.com', '2', '10:00', '11:00', ''],
    ],
    ALUMNOS,
    mapaProfesores([
      ['inexistente@example.com', null],
      ['ana@example.com', PROFESOR],
    ]),
  );
  const [primeraFila] = resultado.filas;
  assert.equal(primeraFila?.estado, 'error');
  assert.match(primeraFila.motivo, /profesor/i);
  assert.equal(resultado.filas[1]?.estado, 'nueva');
});

void test('email de profesor vacío: fila en error', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', '', '1', '10:00', '11:00', '']],
    ALUMNOS,
    mapaProfesores([]),
  );
  assert.equal(resultado.filas[0]?.estado, 'error');
});

void test('día de la semana inválido: fila en error', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'ana@example.com', '9', '10:00', '11:00', '']],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  assert.equal(resultado.filas[0]?.estado, 'error');
});

void test('formato de hora inválido: fila en error', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'ana@example.com', '1', '10h00', '11:00', '']],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  assert.equal(resultado.filas[0]?.estado, 'error');
});

void test('hora de fin no posterior a la de inicio: fila en error', () => {
  const resultado = analizarCsvHorarios(
    [CABECERA.split(';'), ['Juan', 'Pérez', 'García', 'ana@example.com', '1', '11:00', '10:00', '']],
    ALUMNOS,
    mapaProfesores([['ana@example.com', PROFESOR]]),
  );
  assert.equal(resultado.filas[0]?.estado, 'error');
});
