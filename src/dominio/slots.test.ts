import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alumnosPropuestos,
  fechaHoraLocalLegible,
  fechaLocalISO,
  instanteLocal,
  limitesDiaLocal,
  slotActivoEnInstante,
  vistaSemanalProfesor,
  TOLERANCIA_MINUTOS_POR_DEFECTO,
  ZONA_HORARIA_CENTRO_POR_DEFECTO,
  type AlumnoParaPropuesta,
  type SlotConAlumno,
} from './slots.ts';
import type { SlotHorario } from './tipos.ts';

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

function crearSlot(sobrescribir: Partial<SlotHorario> = {}, alumno: Partial<AlumnoParaPropuesta> = {}): SlotConAlumno {
  const slot: SlotHorario = {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3, // miércoles
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: null,
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
  };
  return { ...slot, alumno: crearAlumno({ id: slot.alumno_id, ...alumno }) };
}

// --- instanteLocal: traducción UTC -> día/hora local, incluidos los cambios de hora ------------

void test('instanteLocal usa Europe/Madrid por defecto', () => {
  // 2026-08-26 es miércoles; en agosto Madrid está en CEST (UTC+2).
  const resultado = instanteLocal(new Date('2026-08-26T17:30:00.000Z'));
  assert.deepEqual(resultado, { diaSemana: 3, horaMinuto: '19:30' });
});

void test('instanteLocal admite otra zona horaria explícita', () => {
  const resultado = instanteLocal(new Date('2026-08-26T17:30:00.000Z'), 'UTC');
  assert.deepEqual(resultado, { diaSemana: 3, horaMinuto: '17:30' });
});

void test('instanteLocal resuelve la medianoche como 00:00, no 24:00', () => {
  const resultado = instanteLocal(new Date('2026-08-25T22:00:00.000Z')); // 00:00 CEST del día siguiente
  assert.equal(resultado.horaMinuto, '00:00');
  assert.equal(resultado.diaSemana, 3); // miércoles
});

void test('instanteLocal aplica el cambio de hora de primavera (CET a CEST, 2026-03-29)', () => {
  const justoAntes = instanteLocal(new Date('2026-03-29T00:59:00.000Z'));
  const justoDespues = instanteLocal(new Date('2026-03-29T01:01:00.000Z'));
  assert.deepEqual(justoAntes, { diaSemana: 7, horaMinuto: '01:59' });
  assert.deepEqual(justoDespues, { diaSemana: 7, horaMinuto: '03:01' }); // salta de 02:xx a 03:xx
});

void test('instanteLocal aplica el cambio de hora de otoño (CEST a CET, 2026-10-25)', () => {
  const justoAntes = instanteLocal(new Date('2026-10-25T00:59:00.000Z'));
  const justoDespues = instanteLocal(new Date('2026-10-25T01:01:00.000Z'));
  assert.deepEqual(justoAntes, { diaSemana: 7, horaMinuto: '02:59' });
  assert.deepEqual(justoDespues, { diaSemana: 7, horaMinuto: '02:01' }); // retrocede de 02:59 a 02:01
});

// --- limitesDiaLocal: límites UTC del día natural del centro (T-19, requisito 5) ----------------

void test('limitesDiaLocal: un mediodía cualquiera en CET (enero, UTC+1)', () => {
  const { inicioUtc, finUtc } = limitesDiaLocal(new Date('2026-01-15T12:00:00.000Z'));
  assert.equal(inicioUtc.toISOString(), '2026-01-14T23:00:00.000Z'); // medianoche CET = 23:00Z del día anterior
  assert.equal(finUtc.toISOString(), '2026-01-15T23:00:00.000Z');
});

void test('limitesDiaLocal: un mediodía cualquiera en CEST (agosto, UTC+2)', () => {
  const { inicioUtc, finUtc } = limitesDiaLocal(new Date('2026-08-26T12:00:00.000Z'));
  assert.equal(inicioUtc.toISOString(), '2026-08-25T22:00:00.000Z');
  assert.equal(finUtc.toISOString(), '2026-08-26T22:00:00.000Z');
});

void test('limitesDiaLocal: la medianoche local pertenece a su propio día, no al anterior', () => {
  const medianoche = limitesDiaLocal(new Date('2026-08-25T22:00:00.000Z')); // 00:00 CEST del 26
  const mediodia = limitesDiaLocal(new Date('2026-08-26T12:00:00.000Z'));
  assert.equal(medianoche.inicioUtc.toISOString(), mediodia.inicioUtc.toISOString());
  assert.equal(medianoche.finUtc.toISOString(), mediodia.finUtc.toISOString());
});

void test('limitesDiaLocal: el día del cambio de hora de primavera dura 23 horas reales', () => {
  // 2026-03-29: a la 01:00 UTC el reloj local salta de 02:00 CET a 03:00 CEST.
  const { inicioUtc, finUtc } = limitesDiaLocal(new Date('2026-03-29T12:00:00.000Z'));
  assert.equal(inicioUtc.toISOString(), '2026-03-28T23:00:00.000Z'); // medianoche CET, antes del salto
  assert.equal(finUtc.toISOString(), '2026-03-29T22:00:00.000Z'); // medianoche del 30, ya en CEST
  assert.equal(finUtc.getTime() - inicioUtc.getTime(), 23 * 60 * 60 * 1000);
});

void test('limitesDiaLocal: el día siguiente al cambio de hora de otoño no se confunde con el propio día del cambio', () => {
  // 2026-10-25: a la 01:00 UTC el reloj local retrocede de 03:00 CEST a 02:00 CET. Sumar 24h reales
  // desde la medianoche del día 25 (CEST, +2) cae todavía dentro del día 25 (a las 23:00 CET), no en
  // la medianoche del 26 — el motivo por el que el cálculo no puede sumar milisegundos reales.
  const diaDelCambio = limitesDiaLocal(new Date('2026-10-25T12:00:00.000Z'));
  const diaSiguiente = limitesDiaLocal(new Date('2026-10-26T12:00:00.000Z'));
  assert.equal(diaDelCambio.inicioUtc.toISOString(), '2026-10-24T22:00:00.000Z'); // medianoche CEST
  assert.equal(diaDelCambio.finUtc.toISOString(), '2026-10-25T23:00:00.000Z'); // medianoche CET del 26
  assert.equal(diaSiguiente.inicioUtc.toISOString(), diaDelCambio.finUtc.toISOString());
  assert.equal(diaSiguiente.finUtc.toISOString(), '2026-10-26T23:00:00.000Z');
});

void test('limitesDiaLocal: cruza correctamente el fin de año', () => {
  const { inicioUtc, finUtc } = limitesDiaLocal(new Date('2026-12-31T23:30:00.000Z'));
  assert.equal(inicioUtc.toISOString(), '2026-12-31T23:00:00.000Z');
  assert.equal(finUtc.toISOString(), '2027-01-01T23:00:00.000Z');
});

void test('limitesDiaLocal: admite otra zona horaria explícita (UTC, sin desplazamiento)', () => {
  const { inicioUtc, finUtc } = limitesDiaLocal(new Date('2026-06-10T12:00:00.000Z'), 'UTC');
  assert.equal(inicioUtc.toISOString(), '2026-06-10T00:00:00.000Z');
  assert.equal(finUtc.toISOString(), '2026-06-11T00:00:00.000Z');
});

// --- fechaLocalISO: valor por defecto del selector de fecha de T-21 -----------------------------

void test('fechaLocalISO: un mediodía cualquiera en CEST (agosto, UTC+2)', () => {
  assert.equal(fechaLocalISO(new Date('2026-08-26T12:00:00.000Z')), '2026-08-26');
});

void test('fechaLocalISO: la medianoche local pertenece a su propio día, no al anterior', () => {
  assert.equal(fechaLocalISO(new Date('2026-08-25T22:00:00.000Z')), '2026-08-26'); // 00:00 CEST del 26
});

void test('fechaLocalISO: rellena mes y día a dos cifras', () => {
  assert.equal(fechaLocalISO(new Date('2026-01-05T12:00:00.000Z')), '2026-01-05');
});

void test('fechaLocalISO: admite otra zona horaria explícita (UTC, sin desplazamiento)', () => {
  assert.equal(fechaLocalISO(new Date('2026-06-10T23:30:00.000Z'), 'UTC'), '2026-06-10');
});

// --- fechaHoraLocalLegible: columnas "hora atribuida"/"hora de creación" del histórico (T-23) ---

void test('fechaHoraLocalLegible: formato DD/MM/AAAA HH:MM en CEST (agosto, UTC+2)', () => {
  assert.equal(fechaHoraLocalLegible(new Date('2026-08-26T15:05:00.000Z')), '26/08/2026 17:05');
});

void test('fechaHoraLocalLegible: formato DD/MM/AAAA HH:MM en CET (enero, UTC+1)', () => {
  assert.equal(fechaHoraLocalLegible(new Date('2026-01-05T09:00:00.000Z')), '05/01/2026 10:00');
});

void test('fechaHoraLocalLegible: rellena día, mes, hora y minuto a dos cifras', () => {
  assert.equal(fechaHoraLocalLegible(new Date('2026-01-01T07:03:00.000Z')), '01/01/2026 08:03');
});

void test('fechaHoraLocalLegible: admite otra zona horaria explícita (UTC, sin desplazamiento)', () => {
  assert.equal(fechaHoraLocalLegible(new Date('2026-06-10T23:30:00.000Z'), 'UTC'), '10/06/2026 23:30');
});

// --- slotActivoEnInstante: la batería exacta del criterio de aceptación de T-17 -----------------

void test('slotActivoEnInstante: dentro del slot', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T15:30:00.000Z')), true); // 17:30 CEST
});

void test('slotActivoEnInstante: borde de inicio, inclusivo', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T15:00:00.000Z')), true); // 17:00 CEST exacto
});

void test('slotActivoEnInstante: borde de fin, exclusivo', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T16:00:00.000Z')), false); // 18:00 CEST exacto
});

void test('slotActivoEnInstante: dentro de la tolerancia, antes del inicio', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  // 16:55 CEST, 5 minutos antes de las 17:00, dentro de los 10 de tolerancia por defecto.
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T14:55:00.000Z')), true);
});

void test('slotActivoEnInstante: fuera de horario, más allá de la tolerancia', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  // 16:45 CEST, 15 minutos antes: fuera de los 10 de tolerancia por defecto.
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T14:45:00.000Z')), false);
});

void test('slotActivoEnInstante: la tolerancia es configurable', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  const instante = new Date('2026-08-26T14:45:00.000Z'); // 16:45 CEST
  assert.equal(slotActivoEnInstante(slot, instante, { tolerancia: 20 }), true);
  assert.equal(slotActivoEnInstante(slot, instante), false); // por defecto, 10
  assert.equal(TOLERANCIA_MINUTOS_POR_DEFECTO, 10);
});

void test('slotActivoEnInstante: día distinto (día sin clase ese día de la semana)', () => {
  const slot = crearSlot({ dia_semana: 3 }); // miércoles
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-27T15:30:00.000Z')), false); // jueves
});

void test('slotActivoEnInstante: slot cesado (vigente_hasta anterior al instante)', () => {
  const slot = crearSlot({ vigente_desde: '2026-01-01', vigente_hasta: '2026-06-30' });
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T15:30:00.000Z')), false);
});

void test('slotActivoEnInstante respeta una zona horaria distinta', () => {
  const slot = crearSlot({ dia_semana: 3, hora_inicio: '17:00', hora_fin: '18:00' });
  assert.equal(slotActivoEnInstante(slot, new Date('2026-08-26T17:30:00.000Z'), { zonaHoraria: 'UTC' }), true);
  assert.equal(
    slotActivoEnInstante(slot, new Date('2026-08-26T17:30:00.000Z'), { zonaHoraria: ZONA_HORARIA_CENTRO_POR_DEFECTO }),
    false, // 19:30 CEST, fuera del slot
  );
});

// --- alumnosPropuestos: la propuesta completa ----------------------------------------------------

const INSTANTE_BASE = new Date('2026-08-26T15:30:00.000Z'); // miércoles, 17:30 CEST

void test('alumnosPropuestos: en_curso con un único alumno', () => {
  const slot = crearSlot({}, { id: 'alumno-1' });
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado.tipo, 'en_curso');
  assert.equal(resultado.alumnos.length, 1);
  assert.equal(resultado.alumnos[0]?.alumno.id, 'alumno-1');
});

void test('alumnosPropuestos: dos slots simultáneos del mismo profesor, alumnos distintos', () => {
  const slotA = crearSlot({ id: 'slot-a', alumno_id: 'alumno-a' }, { id: 'alumno-a' });
  const slotB = crearSlot({ id: 'slot-b', alumno_id: 'alumno-b' }, { id: 'alumno-b' });
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slotA, slotB] });
  assert.equal(resultado.tipo, 'en_curso');
  const ids = resultado.alumnos.map((a) => a.alumno.id).sort();
  assert.deepEqual(ids, ['alumno-a', 'alumno-b']);
});

void test('alumnosPropuestos: dos slots consecutivos, el que toca es el que ha empezado', () => {
  const slotQueTermina = crearSlot(
    { id: 'slot-termina', alumno_id: 'alumno-a', hora_inicio: '16:00', hora_fin: '17:00' },
    { id: 'alumno-a' },
  );
  const slotQueEmpieza = crearSlot(
    { id: 'slot-empieza', alumno_id: 'alumno-b', hora_inicio: '17:00', hora_fin: '18:00' },
    { id: 'alumno-b' },
  );
  // 17:00:00 CEST exacto: el primero ya ha terminado (fin exclusivo), el segundo ya ha empezado.
  const instante = new Date('2026-08-26T15:00:00.000Z');
  const resultado = alumnosPropuestos({
    profesorId: 'profesor-1',
    instante,
    slots: [slotQueTermina, slotQueEmpieza],
  });
  assert.equal(resultado.tipo, 'en_curso');
  assert.deepEqual(resultado.alumnos.map((a) => a.alumno.id), ['alumno-b']);
});

void test('alumnosPropuestos: alumno dado de baja no aparece aunque su slot toque', () => {
  const slot = crearSlot({}, { activo: false });
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado.tipo, 'sin_clases_hoy');
});

void test('alumnosPropuestos: filtra por profesor, no por cualquier slot de la lista', () => {
  const slotDeOtro = crearSlot({ profesor_id: 'profesor-2' });
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slotDeOtro] });
  assert.equal(resultado.tipo, 'sin_clases_hoy');
});

void test('alumnosPropuestos: sin ningún slot en curso ni próximo, sin_clases_hoy', () => {
  const slot = crearSlot({ dia_semana: 1 }); // lunes, no coincide con el miércoles de INSTANTE_BASE
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.deepEqual(resultado, { tipo: 'sin_clases_hoy' });
});

void test('alumnosPropuestos: sin nada en curso, propone el más próximo del día con los minutos que faltan', () => {
  // INSTANTE_BASE = 17:30 CEST; un slot a las 18:00 CEST el mismo día, todavía no ha empezado.
  const slot = crearSlot({ hora_inicio: '18:00', hora_fin: '19:00' });
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado.tipo, 'proximo');
  assert.equal(resultado.minutosHastaInicio, 30);
  assert.equal(resultado.alumnos.length, 1);
});

void test('alumnosPropuestos: el próximo agrupa los que comparten la hora de inicio más cercana', () => {
  const slotCercano1 = crearSlot(
    { id: 'slot-cerca-1', alumno_id: 'alumno-a', hora_inicio: '18:00', hora_fin: '19:00' },
    { id: 'alumno-a' },
  );
  const slotCercano2 = crearSlot(
    { id: 'slot-cerca-2', alumno_id: 'alumno-b', hora_inicio: '18:00', hora_fin: '19:00' },
    { id: 'alumno-b' },
  );
  const slotLejano = crearSlot(
    { id: 'slot-lejos', alumno_id: 'alumno-c', hora_inicio: '20:00', hora_fin: '21:00' },
    { id: 'alumno-c' },
  );
  const resultado = alumnosPropuestos({
    profesorId: 'profesor-1',
    instante: INSTANTE_BASE,
    slots: [slotCercano1, slotCercano2, slotLejano],
  });
  assert.equal(resultado.tipo, 'proximo');
  const ids = resultado.alumnos.map((a) => a.alumno.id).sort();
  assert.deepEqual(ids, ['alumno-a', 'alumno-b']);
});

void test('alumnosPropuestos: un slot cesado no cuenta como próximo', () => {
  const slot = crearSlot({ hora_inicio: '18:00', hora_fin: '19:00', vigente_hasta: '2026-06-30' });
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.deepEqual(resultado, { tipo: 'sin_clases_hoy' });
});

void test('alumnosPropuestos: cambio de hora estacional no rompe la propuesta', () => {
  // Domingo 2026-03-29: a la 01:00 UTC el reloj local salta de 02:00 CET a 03:00 CEST. Un slot de
  // 03:00 a 04:00 domingo debe seguir resolviéndose bien justo después del cambio.
  const slot = crearSlot({ dia_semana: 7, hora_inicio: '03:00', hora_fin: '04:00' }, { id: 'alumno-1' });
  const justoDespuesDelCambio = new Date('2026-03-29T01:05:00.000Z'); // 03:05 CEST
  const resultado = alumnosPropuestos({ profesorId: 'profesor-1', instante: justoDespuesDelCambio, slots: [slot] });
  assert.equal(resultado.tipo, 'en_curso');
  assert.equal(resultado.alumnos[0]?.alumno.id, 'alumno-1');
});

// --- vistaSemanalProfesor: "mi horario" (T-22) ---------------------------------------------------

void test('vistaSemanalProfesor: filtra por profesor, no por cualquier slot de la lista', () => {
  const slotDeOtro = crearSlot({ profesor_id: 'profesor-2' });
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slotDeOtro] });
  assert.deepEqual(resultado, []);
});

void test('vistaSemanalProfesor: excluye al alumno dado de baja', () => {
  const slot = crearSlot({}, { activo: false });
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.deepEqual(resultado, []);
});

void test('vistaSemanalProfesor: excluye un slot ya cesado (fuera de vigencia)', () => {
  const slot = crearSlot({ vigente_hasta: '2026-06-30' });
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.deepEqual(resultado, []);
});

void test('vistaSemanalProfesor: incluye un slot vigente aunque su día ya haya pasado esta semana', () => {
  const slot = crearSlot({ dia_semana: 1 }); // lunes, INSTANTE_BASE es miércoles
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.id, slot.id);
});

void test('vistaSemanalProfesor: marca esActual en el slot que toca ahora mismo', () => {
  const slot = crearSlot({});
  const [resultado] = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado?.esActual, true);
  assert.equal(resultado.esSiguiente, false);
});

void test('vistaSemanalProfesor: dos slots el mismo día con dos alumnos simultáneos, los dos esActual', () => {
  const slotA = crearSlot({ id: 'slot-a', alumno_id: 'alumno-a' }, { id: 'alumno-a' });
  const slotB = crearSlot({ id: 'slot-b', alumno_id: 'alumno-b' }, { id: 'alumno-b' });
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slotA, slotB] });
  assert.equal(resultado.length, 2);
  assert.ok(resultado.every((slot) => slot.esActual));
  assert.ok(resultado.every((slot) => !slot.esSiguiente));
});

void test('vistaSemanalProfesor: marca esSiguiente en el próximo slot del mismo día, no en el actual', () => {
  const actual = crearSlot({ id: 'slot-actual', hora_inicio: '17:00', hora_fin: '18:00' });
  const siguiente = crearSlot(
    { id: 'slot-siguiente', alumno_id: 'alumno-b', hora_inicio: '19:00', hora_fin: '20:00' },
    { id: 'alumno-b' },
  );
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [actual, siguiente] });
  const porId = new Map(resultado.map((slot) => [slot.id, slot]));
  assert.deepEqual(
    { esActual: porId.get('slot-actual')?.esActual, esSiguiente: porId.get('slot-actual')?.esSiguiente },
    { esActual: true, esSiguiente: false },
  );
  assert.deepEqual(
    { esActual: porId.get('slot-siguiente')?.esActual, esSiguiente: porId.get('slot-siguiente')?.esSiguiente },
    { esActual: false, esSiguiente: true },
  );
});

void test('vistaSemanalProfesor: sin nada actual, el próximo del día es esSiguiente', () => {
  const slot = crearSlot({ hora_inicio: '18:00', hora_fin: '19:00' }); // más tarde que INSTANTE_BASE (17:30)
  const [resultado] = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado?.esActual, false);
  assert.equal(resultado.esSiguiente, true);
});

void test('vistaSemanalProfesor: empata varios como siguiente si comparten día y hora de inicio', () => {
  const slotA = crearSlot(
    { id: 'slot-a', alumno_id: 'alumno-a', hora_inicio: '18:00', hora_fin: '19:00' },
    { id: 'alumno-a' },
  );
  const slotB = crearSlot(
    { id: 'slot-b', alumno_id: 'alumno-b', hora_inicio: '18:00', hora_fin: '19:00' },
    { id: 'alumno-b' },
  );
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slotA, slotB] });
  assert.ok(resultado.every((slot) => slot.esSiguiente));
});

void test('vistaSemanalProfesor: el próximo puede dar la vuelta a la semana que viene', () => {
  // INSTANTE_BASE es miércoles 17:30 CEST; un único slot el lunes anterior a las 09:00 ya pasó esta
  // semana entera — el "próximo" solo puede ser su ocurrencia de la semana que viene.
  const slot = crearSlot({ dia_semana: 1, hora_inicio: '09:00', hora_fin: '10:00' });
  const [resultado] = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [slot] });
  assert.equal(resultado?.esActual, false);
  assert.equal(resultado.esSiguiente, true);
});

void test('vistaSemanalProfesor: ordena por día de la semana y hora de inicio', () => {
  const jueves = crearSlot({ id: 'slot-jueves', dia_semana: 4, hora_inicio: '09:00', hora_fin: '10:00' });
  const lunesTarde = crearSlot({ id: 'slot-lunes-tarde', dia_semana: 1, hora_inicio: '18:00', hora_fin: '19:00' });
  const lunesTemprano = crearSlot({ id: 'slot-lunes-temprano', dia_semana: 1, hora_inicio: '09:00', hora_fin: '10:00' });
  const resultado = vistaSemanalProfesor({
    profesorId: 'profesor-1',
    instante: INSTANTE_BASE,
    slots: [jueves, lunesTarde, lunesTemprano],
  });
  assert.deepEqual(
    resultado.map((slot) => slot.id),
    ['slot-lunes-temprano', 'slot-lunes-tarde', 'slot-jueves'],
  );
});

void test('vistaSemanalProfesor: sin ningún slot vigente, lista vacía', () => {
  const resultado = vistaSemanalProfesor({ profesorId: 'profesor-1', instante: INSTANTE_BASE, slots: [] });
  assert.deepEqual(resultado, []);
});
