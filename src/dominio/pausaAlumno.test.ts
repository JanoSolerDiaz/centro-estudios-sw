import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PausaAlumno } from './tipos.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from './slots.ts';
import {
  rangoPausaValido,
  motivoPausaValido,
  buscarPausaSolapada,
  pausaVigenteEnFecha,
  pausaDeAlumnoEnFecha,
  esDiaPausadoParaAlumno,
  excluirAlumnosPausadosHoy,
  alumnosPausadosHoy,
  puedeCancelarPausa,
  puedeAcortarPausa,
  categoriaPausa,
} from './pausaAlumno.ts';

function crearPausa(sobrescribir: Partial<PausaAlumno> = {}): PausaAlumno {
  return {
    id: 'pausa-1',
    alumno_id: 'alumno-1',
    fecha_inicio: '2026-09-20',
    fecha_fin: '2026-09-26',
    motivo: 'Viaje familiar',
    estado: 'activa',
    motivo_anulacion: null,
    creado_por: 'admin-1',
    anulado_por: null,
    anulado_en: null,
    creado_en: '2026-09-01T00:00:00.000Z',
    actualizado_en: '2026-09-01T00:00:00.000Z',
    ...sobrescribir,
  };
}

function crearAlumno(sobrescribir: Partial<AlumnoParaPropuesta> = {}): AlumnoParaPropuesta {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
    avatar_ruta: null,
    activo: true,
    ...sobrescribir,
  };
}

function crearSlot(alumno: Partial<AlumnoParaPropuesta> = {}, sobrescribirSlot: Partial<SlotConAlumno> = {}): SlotConAlumno {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: null,
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribirSlot,
    alumno: crearAlumno({ id: 'alumno-1', ...alumno }),
  };
}

// --- rangoPausaValido ---

void test('rangoPausaValido true cuando fecha_fin es posterior a fecha_inicio', () => {
  assert.equal(rangoPausaValido('2026-09-20', '2026-09-26'), true);
});

void test('rangoPausaValido true cuando coinciden (un solo día)', () => {
  assert.equal(rangoPausaValido('2026-09-20', '2026-09-20'), true);
});

void test('rangoPausaValido false cuando fecha_fin es anterior a fecha_inicio', () => {
  assert.equal(rangoPausaValido('2026-09-26', '2026-09-20'), false);
});

// --- motivoPausaValido ---

void test('motivoPausaValido true para null/undefined (siempre opcional)', () => {
  assert.equal(motivoPausaValido(null), true);
  assert.equal(motivoPausaValido(undefined), true);
});

void test('motivoPausaValido true para texto no vacío', () => {
  assert.equal(motivoPausaValido('Viaje familiar'), true);
});

void test('motivoPausaValido false para cadena vacía o solo espacios', () => {
  assert.equal(motivoPausaValido(''), false);
  assert.equal(motivoPausaValido('   '), false);
});

// --- buscarPausaSolapada ---

void test('buscarPausaSolapada detecta dos rangos que se cruzan', () => {
  const existente = crearPausa({ id: 'a', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const candidato = { fecha_inicio: '2026-09-25', fecha_fin: '2026-10-01' };
  assert.equal(buscarPausaSolapada(candidato, [existente])?.id, 'a');
});

void test('buscarPausaSolapada no marca solape entre rangos separados', () => {
  const existente = crearPausa({ id: 'a', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-24' });
  const candidato = { fecha_inicio: '2026-09-25', fecha_fin: '2026-09-30' };
  assert.equal(buscarPausaSolapada(candidato, [existente]), undefined);
});

void test('buscarPausaSolapada ignora una pausa anulada', () => {
  const existente = crearPausa({ id: 'a', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26', estado: 'anulada' });
  const candidato = { fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' };
  assert.equal(buscarPausaSolapada(candidato, [existente]), undefined);
});

void test('buscarPausaSolapada ignora el propio excluirId', () => {
  const existente = crearPausa({ id: 'a', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const candidato = { fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' };
  assert.equal(buscarPausaSolapada(candidato, [existente], 'a'), undefined);
});

// --- pausaVigenteEnFecha / pausaDeAlumnoEnFecha / esDiaPausadoParaAlumno ---

void test('pausaVigenteEnFecha true dentro del rango, en los dos límites inclusive', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  assert.equal(pausaVigenteEnFecha(pausa, '2026-09-20'), true);
  assert.equal(pausaVigenteEnFecha(pausa, '2026-09-23'), true);
  assert.equal(pausaVigenteEnFecha(pausa, '2026-09-26'), true);
});

void test('pausaVigenteEnFecha false justo fuera del rango', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  assert.equal(pausaVigenteEnFecha(pausa, '2026-09-19'), false);
  assert.equal(pausaVigenteEnFecha(pausa, '2026-09-27'), false);
});

void test('pausaVigenteEnFecha false para una pausa anulada, aunque la fecha caiga dentro de su rango', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26', estado: 'anulada' });
  assert.equal(pausaVigenteEnFecha(pausa, '2026-09-23'), false);
});

void test('pausaDeAlumnoEnFecha encuentra la pausa del alumno correcto, ignora las de otro alumno', () => {
  const pausaAjena = crearPausa({ id: 'ajena', alumno_id: 'otro-alumno', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const pausaPropia = crearPausa({ id: 'propia', alumno_id: 'alumno-1', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  assert.equal(pausaDeAlumnoEnFecha('alumno-1', '2026-09-23', [pausaAjena, pausaPropia])?.id, 'propia');
});

void test('esDiaPausadoParaAlumno refleja pausaDeAlumnoEnFecha', () => {
  const pausa = crearPausa({ alumno_id: 'alumno-1', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  assert.equal(esDiaPausadoParaAlumno('alumno-1', '2026-09-23', [pausa]), true);
  assert.equal(esDiaPausadoParaAlumno('alumno-1', '2026-10-01', [pausa]), false);
  assert.equal(esDiaPausadoParaAlumno('otro-alumno', '2026-09-23', [pausa]), false);
});

// --- excluirAlumnosPausadosHoy / alumnosPausadosHoy ---

void test('excluirAlumnosPausadosHoy quita el slot del alumno en pausa, deja los demás', () => {
  const slotPausado = crearSlot({ id: 'alumno-1' }, { id: 'slot-1', alumno_id: 'alumno-1' });
  const slotNormal = crearSlot({ id: 'alumno-2' }, { id: 'slot-2', alumno_id: 'alumno-2' });
  const pausa = crearPausa({ alumno_id: 'alumno-1', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const resultado = excluirAlumnosPausadosHoy([slotPausado, slotNormal], '2026-09-23', [pausa]);
  assert.deepEqual(
    resultado.map((s) => s.id),
    ['slot-2'],
  );
});

void test('excluirAlumnosPausadosHoy no quita nada fuera del rango de la pausa', () => {
  const slotPausado = crearSlot({ id: 'alumno-1' }, { id: 'slot-1', alumno_id: 'alumno-1' });
  const pausa = crearPausa({ alumno_id: 'alumno-1', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const resultado = excluirAlumnosPausadosHoy([slotPausado], '2026-10-01', [pausa]);
  assert.equal(resultado.length, 1);
});

void test('alumnosPausadosHoy devuelve un único alumno aunque tenga varios slots', () => {
  const slotA = crearSlot({ id: 'alumno-1', nombre: 'Ana' }, { id: 'slot-1', alumno_id: 'alumno-1' });
  const slotB = crearSlot({ id: 'alumno-1', nombre: 'Ana' }, { id: 'slot-2', alumno_id: 'alumno-1' });
  const pausa = crearPausa({ alumno_id: 'alumno-1', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const resultado = alumnosPausadosHoy([slotA, slotB], '2026-09-23', [pausa]);
  assert.equal(resultado.length, 1);
  const [primero] = resultado;
  assert.ok(primero);
  assert.equal(primero.alumno.id, 'alumno-1');
  assert.equal(primero.pausa.id, pausa.id);
});

void test('alumnosPausadosHoy vacío cuando nadie está en pausa', () => {
  const slot = crearSlot({ id: 'alumno-1' }, { id: 'slot-1', alumno_id: 'alumno-1' });
  assert.deepEqual(alumnosPausadosHoy([slot], '2026-09-23', []), []);
});

void test('alumnosPausadosHoy ordena por apellido y nombre', () => {
  const slotZ = crearSlot({ id: 'alumno-z', nombre: 'Zoe', primer_apellido: 'Zapata' }, { id: 'slot-z', alumno_id: 'alumno-z' });
  const slotA = crearSlot({ id: 'alumno-a', nombre: 'Ana', primer_apellido: 'Alba' }, { id: 'slot-a', alumno_id: 'alumno-a' });
  const pausaZ = crearPausa({ id: 'pz', alumno_id: 'alumno-z', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const pausaA = crearPausa({ id: 'pa', alumno_id: 'alumno-a', fecha_inicio: '2026-09-20', fecha_fin: '2026-09-26' });
  const resultado = alumnosPausadosHoy([slotZ, slotA], '2026-09-23', [pausaZ, pausaA]);
  assert.deepEqual(
    resultado.map((r) => r.alumno.id),
    ['alumno-a', 'alumno-z'],
  );
});

// --- puedeCancelarPausa / puedeAcortarPausa ---

void test('puedeCancelarPausa true solo si activa y todavía no ha empezado', () => {
  const futura = crearPausa({ fecha_inicio: '2026-09-25', fecha_fin: '2026-09-30' });
  assert.equal(puedeCancelarPausa(futura, '2026-09-20'), true);
});

void test('puedeCancelarPausa false si ya ha empezado', () => {
  const enCurso = crearPausa({ fecha_inicio: '2026-09-20', fecha_fin: '2026-09-30' });
  assert.equal(puedeCancelarPausa(enCurso, '2026-09-20'), false);
});

void test('puedeCancelarPausa false si ya está anulada', () => {
  const anulada = crearPausa({ fecha_inicio: '2026-09-25', fecha_fin: '2026-09-30', estado: 'anulada' });
  assert.equal(puedeCancelarPausa(anulada, '2026-09-20'), false);
});

void test('puedeAcortarPausa true solo si activa y hoy cae dentro de su rango', () => {
  const enCurso = crearPausa({ fecha_inicio: '2026-09-20', fecha_fin: '2026-09-30' });
  assert.equal(puedeAcortarPausa(enCurso, '2026-09-25'), true);
});

void test('puedeAcortarPausa false si todavía no ha empezado', () => {
  const futura = crearPausa({ fecha_inicio: '2026-09-25', fecha_fin: '2026-09-30' });
  assert.equal(puedeAcortarPausa(futura, '2026-09-20'), false);
});

void test('puedeAcortarPausa false si ya terminó', () => {
  const pasada = crearPausa({ fecha_inicio: '2026-09-01', fecha_fin: '2026-09-10' });
  assert.equal(puedeAcortarPausa(pasada, '2026-09-20'), false);
});

// --- categoriaPausa ---

void test('categoriaPausa anulada tiene prioridad sobre las fechas', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-01', fecha_fin: '2026-09-10', estado: 'anulada' });
  assert.equal(categoriaPausa(pausa, '2026-09-05'), 'anulada');
});

void test('categoriaPausa pasada cuando fecha_fin es anterior a hoy', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-01', fecha_fin: '2026-09-10' });
  assert.equal(categoriaPausa(pausa, '2026-09-20'), 'pasada');
});

void test('categoriaPausa futura cuando fecha_inicio es posterior a hoy', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-25', fecha_fin: '2026-09-30' });
  assert.equal(categoriaPausa(pausa, '2026-09-20'), 'futura');
});

void test('categoriaPausa en_curso cuando hoy cae dentro del rango', () => {
  const pausa = crearPausa({ fecha_inicio: '2026-09-20', fecha_fin: '2026-09-30' });
  assert.equal(categoriaPausa(pausa, '2026-09-25'), 'en_curso');
});
