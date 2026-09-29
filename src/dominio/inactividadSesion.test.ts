import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVISO_PREVIO_MS, evaluarInactividad, plazoInactividadMs, textoAvisoInactividad } from './inactividadSesion.ts';

const MIN = 60 * 1000;

void test('plazoInactividadMs: administrator 20 min, teacher 60 min, student y desconocido sin plazo', () => {
  assert.equal(plazoInactividadMs('administrator'), 20 * MIN);
  assert.equal(plazoInactividadMs('teacher'), 60 * MIN);
  assert.equal(plazoInactividadMs('student'), undefined);
  assert.equal(plazoInactividadMs('otro' as never), undefined);
});

void test('evaluarInactividad: teacher a 58 min activa, a 59 min aviso, a 60 min caducada', () => {
  const base = { plazoMs: 60 * MIN, ultimaActividadMs: 1_000_000 };
  assert.deepEqual(evaluarInactividad({ ...base, ahoraMs: base.ultimaActividadMs + 58 * MIN }), { estado: 'activa' });
  assert.deepEqual(evaluarInactividad({ ...base, ahoraMs: base.ultimaActividadMs + 59 * MIN }), {
    estado: 'aviso',
    segundosRestantes: 60,
  });
  assert.deepEqual(evaluarInactividad({ ...base, ahoraMs: base.ultimaActividadMs + 60 * MIN - 1 }), {
    estado: 'aviso',
    segundosRestantes: 1,
  });
  assert.deepEqual(evaluarInactividad({ ...base, ahoraMs: base.ultimaActividadMs + 60 * MIN }), { estado: 'caducada' });
  assert.deepEqual(evaluarInactividad({ ...base, ahoraMs: base.ultimaActividadMs + 5 * 60 * MIN }), { estado: 'caducada' });
});

void test('evaluarInactividad: el aviso empieza justo AVISO_PREVIO_MS antes del plazo', () => {
  const base = { plazoMs: 20 * MIN, ultimaActividadMs: 0 };
  assert.equal(evaluarInactividad({ ...base, ahoraMs: 20 * MIN - AVISO_PREVIO_MS - 1 }).estado, 'activa');
  assert.equal(evaluarInactividad({ ...base, ahoraMs: 20 * MIN - AVISO_PREVIO_MS }).estado, 'aviso');
});

void test('evaluarInactividad: un reloj que retrocede cuenta como sin inactividad', () => {
  assert.deepEqual(evaluarInactividad({ plazoMs: 20 * MIN, ultimaActividadMs: 500, ahoraMs: 100 }), { estado: 'activa' });
});

void test('textoAvisoInactividad: menciona los registros sin enviar solo si los hay, con singular y plural', () => {
  assert.equal(textoAvisoInactividad(45, 0), 'Por seguridad, la sesión se cerrará en 45 s por falta de actividad.');
  assert.match(textoAvisoInactividad(45, 1), /hay 1 registro sin enviar, se enviará al volver a entrar/);
  assert.match(textoAvisoInactividad(45, 3), /hay 3 registros sin enviar, se enviarán al volver a entrar/);
});
