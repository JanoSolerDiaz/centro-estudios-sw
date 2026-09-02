import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorManagementApi } from './clienteManagementApi.ts';
import { formatearErrorCli } from './formatoErrorCli.ts';

void test('un ErrorManagementApi incluye el cuerpo de la respuesta, no solo la plantilla genérica', () => {
  const error = new ErrorManagementApi(
    'Management API respondió 400 al ejecutar SQL contra el proyecto abc',
    400,
    '{"message":"column reference \\"ventana_inicio\\" is ambiguous","code":"42702"}',
  );
  const formateado = formatearErrorCli(error);
  assert.match(formateado, /Management API respondió 400/);
  assert.match(formateado, /ventana_inicio.*is ambiguous/);
});

void test('un Error normal se formatea con su message, sin más', () => {
  assert.equal(formatearErrorCli(new Error('fallo de red')), 'fallo de red');
});

void test('algo lanzado que no es un Error se formatea con String()', () => {
  assert.equal(formatearErrorCli('cadena lanzada a mano'), 'cadena lanzada a mano');
  assert.equal(formatearErrorCli(42), '42');
});

void test('un ErrorManagementApi con cuerpo vacío no añade una línea vacía engañosa', () => {
  const error = new ErrorManagementApi('Management API respondió 500', 500, '');
  assert.equal(formatearErrorCli(error), 'Management API respondió 500');
});
