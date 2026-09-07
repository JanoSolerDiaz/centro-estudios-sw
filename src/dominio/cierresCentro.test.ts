import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CierreCentro } from './tipos.ts';
import { buscarCierreSolapado, esDiaCerrado } from './cierresCentro.ts';

function crearCierre(sobrescribir: Partial<CierreCentro> = {}): CierreCentro {
  return {
    id: 'cierre-1',
    fecha_inicio: '2026-12-20',
    fecha_fin: '2026-12-31',
    motivo: 'Navidad',
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

void test('buscarCierreSolapado detecta dos rangos que se cruzan', () => {
  const existente = crearCierre({ id: 'a', fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31' });
  const candidato = { fecha_inicio: '2026-12-25', fecha_fin: '2027-01-05' };
  assert.equal(buscarCierreSolapado(candidato, [existente])?.id, 'a');
});

void test('buscarCierreSolapado detecta solape cuando un rango contiene por completo al otro', () => {
  const existente = crearCierre({ id: 'a', fecha_inicio: '2026-12-01', fecha_fin: '2027-01-10' });
  const candidato = { fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31' };
  assert.equal(buscarCierreSolapado(candidato, [existente])?.id, 'a');
});

void test('buscarCierreSolapado SÍ marca solape cuando el fin de uno coincide con el inicio del otro (ambos límites inclusive)', () => {
  const existente = crearCierre({ id: 'a', fecha_inicio: '2026-12-20', fecha_fin: '2026-12-24' });
  const candidato = { fecha_inicio: '2026-12-24', fecha_fin: '2026-12-26' };
  assert.equal(buscarCierreSolapado(candidato, [existente])?.id, 'a');
});

void test('buscarCierreSolapado no marca solape entre dos rangos separados por al menos un día', () => {
  const existente = crearCierre({ id: 'a', fecha_inicio: '2026-12-20', fecha_fin: '2026-12-24' });
  const candidato = { fecha_inicio: '2026-12-25', fecha_fin: '2026-12-31' };
  assert.equal(buscarCierreSolapado(candidato, [existente]), undefined);
});

void test('buscarCierreSolapado un cierre de un solo día se solapa consigo mismo pero no con un día distinto', () => {
  const existente = crearCierre({ id: 'a', fecha_inicio: '2026-11-01', fecha_fin: '2026-11-01' });
  assert.equal(buscarCierreSolapado({ fecha_inicio: '2026-11-01', fecha_fin: '2026-11-01' }, [existente])?.id, 'a');
  assert.equal(buscarCierreSolapado({ fecha_inicio: '2026-11-02', fecha_fin: '2026-11-02' }, [existente]), undefined);
});

void test('buscarCierreSolapado ignora el propio excluirId (la versión que se está editando)', () => {
  const existente = crearCierre({ id: 'a', fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31' });
  const candidato = { fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31' };
  assert.equal(buscarCierreSolapado(candidato, [existente], 'a'), undefined);
});

void test('esDiaCerrado true dentro de un cierre activo, en los dos límites inclusive', () => {
  const cierre = crearCierre({ fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31', activo: true });
  assert.equal(esDiaCerrado('2026-12-20', [cierre]), true);
  assert.equal(esDiaCerrado('2026-12-25', [cierre]), true);
  assert.equal(esDiaCerrado('2026-12-31', [cierre]), true);
});

void test('esDiaCerrado false justo fuera del rango, en cualquiera de los dos extremos', () => {
  const cierre = crearCierre({ fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31', activo: true });
  assert.equal(esDiaCerrado('2026-12-19', [cierre]), false);
  assert.equal(esDiaCerrado('2027-01-01', [cierre]), false);
});

void test('esDiaCerrado false para un cierre desactivado, aunque la fecha caiga dentro de su rango', () => {
  const cierre = crearCierre({ fecha_inicio: '2026-12-20', fecha_fin: '2026-12-31', activo: false });
  assert.equal(esDiaCerrado('2026-12-25', [cierre]), false);
});

void test('esDiaCerrado false sin ningún cierre', () => {
  assert.equal(esDiaCerrado('2026-12-25', []), false);
});
