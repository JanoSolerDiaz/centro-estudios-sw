import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claveSesionHorarioCentro, sesionesVigentesDelCentro } from './horarioCentro.ts';
import type { SlotHorario } from './tipos.ts';

interface SlotConAlumnoDePrueba extends SlotHorario {
  readonly alumno: { readonly activo: boolean };
}

function crearSlot(sobrescribir: Partial<SlotConAlumnoDePrueba> = {}): SlotConAlumnoDePrueba {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: 'Matemáticas 4º ESO',
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    alumno: { activo: true },
    ...sobrescribir,
  };
}

const HOY = new Date('2026-09-10T12:00:00Z'); // jueves

void test('sesionesVigentesDelCentro: agrupa varios alumnos del mismo profesor/día/hora/asignatura en una única sesión', () => {
  const uno = crearSlot({ id: 'slot-1', alumno_id: 'alumno-1' });
  const dos = crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' });
  const resultado = sesionesVigentesDelCentro([uno, dos], HOY);
  assert.equal(resultado.length, 1);
  const sesion = resultado[0];
  assert.ok(sesion);
  assert.deepEqual(
    sesion.slots.map((s) => s.id),
    ['slot-1', 'slot-2'],
  );
  assert.equal(sesion.profesorId, 'profesor-1');
  assert.equal(sesion.diaSemana, 3);
  assert.equal(sesion.horaInicio, '17:00');
  assert.equal(sesion.asignaturaOGrupo, 'Matemáticas 4º ESO');
});

void test('sesionesVigentesDelCentro: dos asignaturas distintas en el mismo día/hora/profesor son dos sesiones', () => {
  const uno = crearSlot({ id: 'slot-1', alumno_id: 'alumno-1', asignatura_o_grupo: 'Matemáticas' });
  const dos = crearSlot({ id: 'slot-2', alumno_id: 'alumno-2', asignatura_o_grupo: 'Física' });
  const resultado = sesionesVigentesDelCentro([uno, dos], HOY);
  assert.equal(resultado.length, 2);
});

void test('sesionesVigentesDelCentro: excluye un slot de un alumno de baja', () => {
  const activo = crearSlot({ id: 'slot-1', alumno_id: 'alumno-1' });
  const deBaja = crearSlot({ id: 'slot-2', alumno_id: 'alumno-2', alumno: { activo: false } });
  const resultado = sesionesVigentesDelCentro([activo, deBaja], HOY);
  assert.equal(resultado.length, 1);
  assert.deepEqual(
    resultado[0]?.slots.map((s) => s.id),
    ['slot-1'],
  );
});

void test('sesionesVigentesDelCentro: excluye un slot no vigente hoy (todavía no empieza)', () => {
  const futuro = crearSlot({ id: 'slot-1', vigente_desde: '2099-01-01' });
  const resultado = sesionesVigentesDelCentro([futuro], HOY);
  assert.equal(resultado.length, 0);
});

void test('sesionesVigentesDelCentro: excluye un slot ya cesado', () => {
  const cesado = crearSlot({ id: 'slot-1', vigente_hasta: '2026-01-31' });
  const resultado = sesionesVigentesDelCentro([cesado], HOY);
  assert.equal(resultado.length, 0);
});

void test('sesionesVigentesDelCentro: ordena por día de la semana y luego por hora de inicio', () => {
  const martesTarde = crearSlot({ id: 'slot-1', alumno_id: 'alumno-1', dia_semana: 2, hora_inicio: '18:00', hora_fin: '19:00' });
  const luevesTemprano = crearSlot({ id: 'slot-2', alumno_id: 'alumno-2', dia_semana: 4, hora_inicio: '09:00', hora_fin: '10:00' });
  const martesTemprano = crearSlot({ id: 'slot-3', alumno_id: 'alumno-3', dia_semana: 2, hora_inicio: '09:00', hora_fin: '10:00' });
  const resultado = sesionesVigentesDelCentro([martesTarde, luevesTemprano, martesTemprano], HOY);
  assert.deepEqual(
    resultado.map((s) => s.slots[0]?.id),
    ['slot-3', 'slot-1', 'slot-2'],
  );
});

void test('sesionesVigentesDelCentro: un único alumno también forma su propia sesión', () => {
  const resultado = sesionesVigentesDelCentro([crearSlot()], HOY);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.slots.length, 1);
});

void test('claveSesionHorarioCentro: dos sesiones con los mismos cinco campos comparten clave', () => {
  const a = { profesorId: 'p1', diaSemana: 3 as const, horaInicio: '17:00', horaFin: '18:00', asignaturaOGrupo: 'Física' };
  const b = { profesorId: 'p1', diaSemana: 3 as const, horaInicio: '17:00', horaFin: '18:00', asignaturaOGrupo: 'Física' };
  assert.equal(claveSesionHorarioCentro(a), claveSesionHorarioCentro(b));
});

void test('claveSesionHorarioCentro: distingue dos sesiones con distinto profesor aunque compartan el resto', () => {
  const a = { profesorId: 'p1', diaSemana: 3 as const, horaInicio: '17:00', horaFin: '18:00', asignaturaOGrupo: null };
  const b = { profesorId: 'p2', diaSemana: 3 as const, horaInicio: '17:00', horaFin: '18:00', asignaturaOGrupo: null };
  assert.notEqual(claveSesionHorarioCentro(a), claveSesionHorarioCentro(b));
});
