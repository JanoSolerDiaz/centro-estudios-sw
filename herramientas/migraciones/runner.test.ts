import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ArchivoMigracion } from './archivosMigracion.ts';
import type { ClienteManagementApi } from './clienteManagementApi.ts';
import {
  aplicarPendientes,
  construirSqlTransaccional,
  ErrorGuardaContenido,
  ErrorHashCambiado,
  obtenerEstado,
  planificar,
} from './runner.ts';
import { calcularHash } from './hash.ts';

function migracion(numero: number, nombre: string, contenido: string): ArchivoMigracion {
  return { numero, nombre: `${String(numero).padStart(3, '0')}_${nombre}`, rutaCompleta: '', contenido };
}

/** Cliente falso en memoria: simula un ledger real reaccionando al SELECT de lectura y al patrón
 * begin/INSERT INTO esquema_migracion/commit que `construirSqlTransaccional` genera, sin tocar SQL
 * de verdad. Suficiente para probar la orquestación sin acoplarse a la Management API real. */
function crearClienteFalso(ledgerInicial: { numero: number; nombre: string; hash: string | null }[] = []) {
  const ledger = [...ledgerInicial];
  const sentenciasRecibidas: string[] = [];
  const cliente: ClienteManagementApi = {
    ejecutarSql(_projectRef, sql) {
      sentenciasRecibidas.push(sql);
      if (/^\s*select numero, nombre, hash/i.test(sql)) {
        return Promise.resolve(ledger.map((fila) => ({ ...fila })));
      }
      const coincidencia = /insert into public\.esquema_migracion \(numero, nombre, hash\) values \((\d+), '([^']*)', '([^']*)'\);/.exec(
        sql,
      );
      if (coincidencia) {
        ledger.push({
          numero: Number.parseInt(coincidencia[1] ?? '0', 10),
          nombre: coincidencia[2] ?? '',
          hash: coincidencia[3] ?? null,
        });
      }
      return Promise.resolve([]);
    },
  };
  return { cliente, ledger, sentenciasRecibidas };
}

void test('planificar detecta las migraciones pendientes sin escribir nada', () => {
  const migraciones = [migracion(1, 'esquema_inicial', 'select 1;'), migracion(2, 'politicas_rls', 'select 2;')];
  const plan = planificar(migraciones, [{ numero: 1, nombre: '001_esquema_inicial', hash: calcularHash('select 1;') }]);
  assert.deepEqual(
    plan.pendientes.map((m) => m.numero),
    [2],
  );
});

void test('planificar lanza ErrorHashCambiado si una ya aplicada cambió en disco', () => {
  const migraciones = [migracion(1, 'esquema_inicial', 'select 1; -- editado sin permiso')];
  assert.throws(
    () => planificar(migraciones, [{ numero: 1, nombre: '001_esquema_inicial', hash: calcularHash('select 1;') }]),
    ErrorHashCambiado,
  );
});

void test('planificar no lanza si el hash coincide exactamente', () => {
  const contenido = 'select 1;';
  const migraciones = [migracion(1, 'esquema_inicial', contenido)];
  const plan = planificar(migraciones, [{ numero: 1, nombre: '001_esquema_inicial', hash: calcularHash(contenido) }]);
  assert.deepEqual(plan.pendientes, []);
});

void test('construirSqlTransaccional envuelve el contenido en begin/commit y añade el alta en el ledger', () => {
  const sql = construirSqlTransaccional(migracion(1, 'esquema_inicial', 'create table x();'), 'abc123');
  assert.match(sql, /^begin;/);
  assert.match(sql, /create table x\(\);/);
  assert.match(sql, /insert into public\.esquema_migracion \(numero, nombre, hash\) values \(1, '001_esquema_inicial', 'abc123'\);/);
  assert.match(sql, /commit;\s*$/);
});

void test('construirSqlTransaccional escapa comillas simples en nombre y hash', () => {
  const sql = construirSqlTransaccional(migracion(1, "esquema'raro", 'select 1;'), "hash'raro");
  assert.match(sql, /esquema''raro/);
  assert.match(sql, /hash''raro/);
});

void test('aplicarPendientes aplica en orden y notifica cada una', async () => {
  const { cliente, ledger } = crearClienteFalso();
  const migraciones = [migracion(1, 'esquema_inicial', 'create table a();'), migracion(2, 'politicas_rls', 'create table b();')];
  const aplicadas: string[] = [];

  const plan = await aplicarPendientes(cliente, 'ref', migraciones, (m) => aplicadas.push(m.nombre));

  assert.deepEqual(plan.pendientes.map((m) => m.nombre), ['001_esquema_inicial', '002_politicas_rls']);
  assert.deepEqual(aplicadas, ['001_esquema_inicial', '002_politicas_rls']);
  assert.equal(ledger.length, 2);
  assert.equal(ledger[0]?.hash, calcularHash('create table a();'));
});

void test('aplicarPendientes no aplica nada si ya está todo al día', async () => {
  const contenido = 'create table a();';
  const { cliente, sentenciasRecibidas } = crearClienteFalso([
    { numero: 1, nombre: '001_esquema_inicial', hash: calcularHash(contenido) },
  ]);
  const migraciones = [migracion(1, 'esquema_inicial', contenido)];

  const plan = await aplicarPendientes(cliente, 'ref', migraciones);

  assert.deepEqual(plan.pendientes, []);
  // Solo la lectura del ledger, ninguna sentencia begin/commit de aplicación.
  assert.equal(sentenciasRecibidas.length, 1);
});

void test('aplicarPendientes rechaza una migración con contenido prohibido y no aplica ninguna, ni siquiera las anteriores válidas', async () => {
  const { cliente, ledger } = crearClienteFalso();
  const migraciones = [
    migracion(1, 'valida', 'create table a();'),
    migracion(2, 'peligrosa', 'drop table public.alumno;'),
  ];

  await assert.rejects(() => aplicarPendientes(cliente, 'ref', migraciones), ErrorGuardaContenido);
  assert.deepEqual(ledger, []);
});

void test('obtenerEstado solo lee, no aplica nada', async () => {
  const { cliente, ledger } = crearClienteFalso([{ numero: 1, nombre: '001_esquema_inicial', hash: 'x' }]);
  const estado = await obtenerEstado(cliente, 'ref');
  assert.deepEqual(estado, [{ numero: 1, nombre: '001_esquema_inicial', hash: 'x' }]);
  assert.equal(ledger.length, 1); // sin cambios
});
