import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quitarComentariosSql, validarContenidoMigracion } from './guardas.ts';

void test('quitarComentariosSql descarta comentarios de línea pero deja el SQL', () => {
  const resultado = quitarComentariosSql("select 1; -- borra la tabla asistencia\nselect 2;");
  assert.doesNotMatch(resultado, /borra la tabla asistencia/);
  assert.match(resultado, /select 1;/);
  assert.match(resultado, /select 2;/);
});

void test('quitarComentariosSql descarta comentarios de bloque', () => {
  const resultado = quitarComentariosSql('select 1; /* truncate perfil; */ select 2;');
  assert.doesNotMatch(resultado, /truncate/);
});

void test('un script limpio no dispara ninguna guarda', () => {
  const sql = `
    create table public.demo (id uuid primary key);
    alter table public.demo enable row level security;
  `;
  assert.deepEqual(validarContenidoMigracion(sql), []);
});

void test('DROP TABLE dispara su guarda', () => {
  const violaciones = validarContenidoMigracion('drop table public.alumno;');
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0]?.guarda, 'DROP TABLE');
});

void test('DROP SCHEMA dispara su guarda', () => {
  const violaciones = validarContenidoMigracion('drop schema public cascade;');
  assert.equal(violaciones[0]?.guarda, 'DROP SCHEMA');
});

void test('TRUNCATE dispara su guarda', () => {
  const violaciones = validarContenidoMigracion('truncate public.perfil;');
  assert.equal(violaciones[0]?.guarda, 'TRUNCATE');
});

void test('DISABLE ROW LEVEL SECURITY dispara su guarda', () => {
  const violaciones = validarContenidoMigracion('alter table public.alumno disable row level security;');
  assert.equal(violaciones[0]?.guarda, 'DISABLE ROW LEVEL SECURITY');
});

void test('DROP POLICY con su CREATE POLICY correspondiente no dispara nada', () => {
  const sql = `
    drop policy if exists alumno_leer on public.alumno;
    create policy alumno_leer on public.alumno for select to authenticated using (true);
  `;
  assert.deepEqual(validarContenidoMigracion(sql), []);
});

void test('DROP POLICY sin su CREATE POLICY dispara la guarda', () => {
  const violaciones = validarContenidoMigracion('drop policy if exists alumno_leer on public.alumno;');
  assert.equal(violaciones.length, 1);
  const [violacion] = violaciones;
  assert.ok(violacion);
  assert.equal(violacion.guarda, 'DROP POLICY sin CREATE POLICY');
  assert.match(violacion.detalle, /alumno_leer/);
});

void test('DELETE FROM asistencia dispara su guarda', () => {
  const violaciones = validarContenidoMigracion('delete from public.asistencia where id = 1;');
  assert.equal(violaciones[0]?.guarda, 'DELETE sobre asistencia');
});

void test('DELETE FROM asistencia_historial NO dispara la guarda de asistencia (falso positivo evitado)', () => {
  // Cubierto en cambio por su propia guarda, no por "DELETE sobre asistencia".
  const violaciones = validarContenidoMigracion('delete from public.asistencia_historial where id = 1;');
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0]?.guarda, 'UPDATE o DELETE sobre asistencia_historial');
});

void test('UPDATE sobre asistencia_historial dispara su guarda', () => {
  const violaciones = validarContenidoMigracion("update public.asistencia_historial set nota = 'x';");
  assert.equal(violaciones[0]?.guarda, 'UPDATE o DELETE sobre asistencia_historial');
});

void test('UPDATE sobre asistencia (permitido) no dispara ninguna guarda', () => {
  assert.deepEqual(validarContenidoMigracion("update public.asistencia set nota = 'x' where id = 1;"), []);
});

void test('un patrón prohibido mencionado solo en un comentario no dispara nada', () => {
  const sql = `
    -- Nunca hagas TRUNCATE ni DROP TABLE aquí, ni un DELETE FROM asistencia
    create table public.demo (id uuid primary key);
  `;
  assert.deepEqual(validarContenidoMigracion(sql), []);
});

void test('acumula varias violaciones distintas del mismo script', () => {
  const violaciones = validarContenidoMigracion('truncate public.alumno; drop table public.centro_estudios;');
  const nombres = violaciones.map((v) => v.guarda).sort();
  assert.deepEqual(nombres, ['DROP TABLE', 'TRUNCATE']);
});
