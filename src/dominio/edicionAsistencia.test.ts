import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Asistencia } from './tipos.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import {
  construirEntradaEdicion,
  controlesFilaHistorico,
  horaLocalHHMM,
  instanteDesdeFechaYHora,
  TEXTO_SOLO_ADMINISTRADOR,
  validarMotivoAnulacion,
  valoresInicialesEdicion,
} from './edicionAsistencia.ts';

// 2026-08-26 es verano: Madrid = UTC+2. Entrada 17:30 locales = 15:30Z.
const AHORA = new Date('2026-08-26T16:00:00.000Z');
const reloj = crearRelojFijo(AHORA);

function registro(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'as1',
    alumno_id: 'al1',
    profesor_id: 'p1',
    registrado_en: '2026-08-26T15:31:00.000Z',
    ocurrido_en: '2026-08-26T15:30:00.000Z',
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot1',
    slot_dia_semana: 3,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: null,
    estado: 'valida',
    motivo_anulacion: null,
    motivo_justificacion: null,
    nota_justificacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'pet1',
    ...sobrescribir,
  };
}

void test('horaLocalHHMM e instanteDesdeFechaYHora son inversas en la zona del centro, verano e invierno', () => {
  assert.equal(horaLocalHHMM('2026-08-26T15:30:00.000Z'), '17:30');
  assert.equal(horaLocalHHMM('2026-01-15T15:30:00.000Z'), '16:30');
  assert.equal(instanteDesdeFechaYHora('2026-08-26', '17:15').toISOString(), '2026-08-26T15:15:00.000Z');
  assert.equal(instanteDesdeFechaYHora('2026-01-15', '16:15').toISOString(), '2026-01-15T15:15:00.000Z');
});

void test('controles: administrator edita y anula cualquier fila no anulada, incluso muy antigua', () => {
  const vieja = registro({ registrado_en: '2026-01-01T10:00:00.000Z', profesor_id: 'otro' });
  const c = controlesFilaHistorico(vieja, { id: 'admin', rol: 'administrator' }, reloj);
  assert.deepEqual(c, { puedeEditar: true, puedeAnular: true, textoSinPermiso: null });
});

void test('controles: teacher solo en sus filas dentro de 7 días; fuera de ventana ve el texto', () => {
  const propia = registro();
  assert.equal(controlesFilaHistorico(propia, { id: 'p1', rol: 'teacher' }, reloj).puedeEditar, true);

  const hace8Dias = registro({ registrado_en: '2026-08-18T15:00:00.000Z' });
  const c = controlesFilaHistorico(hace8Dias, { id: 'p1', rol: 'teacher' }, reloj);
  assert.equal(c.puedeEditar, false);
  assert.equal(c.puedeAnular, false);
  assert.equal(c.textoSinPermiso, TEXTO_SOLO_ADMINISTRADOR);

  const justo7Dias = registro({ registrado_en: '2026-08-19T16:00:00.000Z' });
  assert.equal(controlesFilaHistorico(justo7Dias, { id: 'p1', rol: 'teacher' }, reloj).puedeEditar, true);

  const ajena = registro({ profesor_id: 'otro' });
  assert.equal(controlesFilaHistorico(ajena, { id: 'p1', rol: 'teacher' }, reloj).puedeEditar, false);
});

void test('controles: student nunca; una fila anulada no ofrece nada ni siquiera al administrador', () => {
  const sin = controlesFilaHistorico(registro(), { id: 'p1', rol: 'student' }, reloj);
  assert.equal(sin.puedeEditar, false);
  assert.equal(sin.textoSinPermiso, null);

  const anulada = registro({ estado: 'anulada', motivo_anulacion: 'x' });
  assert.deepEqual(controlesFilaHistorico(anulada, { id: 'a', rol: 'administrator' }, reloj), {
    puedeEditar: false,
    puedeAnular: false,
    textoSinPermiso: null,
  });
});

void test('edición: sin cambios no genera llamada', () => {
  const r = registro();
  const res = construirEntradaEdicion(r, valoresInicialesEdicion(r), reloj);
  assert.equal(res.ok, false);
});

void test('edición: cambiar solo la hora envía solo ocurridoEn, sin tocar nota ni salida', () => {
  const r = registro();
  const res = construirEntradaEdicion(r, { ...valoresInicialesEdicion(r), hora: '17:15' }, reloj);
  assert.ok(res.ok);
  assert.deepEqual(res.entrada, { asistenciaId: 'as1', ocurridoEn: new Date('2026-08-26T15:15:00.000Z') });
});

void test('edición: una hora en el futuro o fuera de ventana se rechaza antes de enviar', () => {
  const r = registro();
  const futuro = construirEntradaEdicion(r, { ...valoresInicialesEdicion(r), hora: '19:00' }, reloj);
  assert.equal(futuro.ok, false);
  const invalida = construirEntradaEdicion(r, { ...valoresInicialesEdicion(r), hora: '' }, reloj);
  assert.equal(invalida.ok, false);
});

void test('edición: vaciar la nota la envía como null con notaProvista; dejarla igual no la envía', () => {
  const r = registro({ nota: 'tarde' });
  const vaciar = construirEntradaEdicion(r, { ...valoresInicialesEdicion(r), nota: '  ' }, reloj);
  assert.ok(vaciar.ok);
  assert.deepEqual(vaciar.entrada, { asistenciaId: 'as1', nota: null, notaProvista: true });
});

void test('edición: marcar salida solo si el registro la admite; una ausencia no la ofrece', () => {
  const presente = registro();
  const ok = construirEntradaEdicion(presente, { ...valoresInicialesEdicion(presente), marcarSalida: true }, reloj);
  assert.ok(ok.ok);
  assert.equal(ok.entrada.marcarSalida, true);

  const ausente = registro({ estado: 'ausente' });
  const no = construirEntradaEdicion(ausente, { ...valoresInicialesEdicion(ausente), marcarSalida: true }, reloj);
  assert.equal(no.ok, false);
});

void test('edición: ajustar la salida exige que sea posterior a la entrada (incluida la entrada ya editada)', () => {
  const r = registro({ ocurrido_en_salida: '2026-08-26T15:50:00.000Z' }); // 17:50 locales
  const base = valoresInicialesEdicion(r);
  const buena = construirEntradaEdicion(r, { ...base, horaSalida: '17:55' }, reloj);
  assert.ok(buena.ok);
  assert.deepEqual(buena.entrada.ocurridoEnSalida, new Date('2026-08-26T15:55:00.000Z'));

  const antes = construirEntradaEdicion(r, { ...base, horaSalida: '17:20' }, reloj);
  assert.equal(antes.ok, false);

  // Mover la entrada a las 17:55 hace inválida una salida a las 17:50 que no se ha tocado: no se
  // envía la salida (no ha cambiado), pero SÍ debe rechazarse si se pide ajustarla a algo anterior.
  const conEntradaNueva = construirEntradaEdicion(r, { ...base, hora: '17:55', horaSalida: '17:52' }, reloj);
  assert.equal(conEntradaNueva.ok, false);

  const futura = construirEntradaEdicion(r, { ...base, horaSalida: '19:30' }, reloj);
  assert.equal(futura.ok, false);
});

void test('edición: justificar exige motivo de la lista y solo aplica a ausencias', () => {
  const ausente = registro({ estado: 'ausente' });
  const base = valoresInicialesEdicion(ausente);
  const ok = construirEntradaEdicion(ausente, { ...base, motivoJustificacion: 'enfermedad', notaJustificacion: 'gripe' }, reloj);
  assert.ok(ok.ok);
  assert.equal(ok.entrada.justificar, true);
  assert.equal(ok.entrada.motivoJustificacion, 'enfermedad');
  assert.equal(ok.entrada.notaJustificacion, 'gripe');

  const sinMotivo = construirEntradaEdicion(ausente, { ...base, notaJustificacion: 'solo nota' }, reloj);
  assert.equal(sinMotivo.ok, false);

  const presente = registro();
  const ignorado = construirEntradaEdicion(presente, { ...valoresInicialesEdicion(presente), motivoJustificacion: 'otro' }, reloj);
  assert.equal(ignorado.ok, false, 'sobre un presente la justificación se ignora y no queda ningún cambio');
});

void test('anular: el motivo es obligatorio y se recorta', () => {
  assert.equal(validarMotivoAnulacion('   ').ok, false);
  assert.equal(validarMotivoAnulacion('').ok, false);
  const ok = validarMotivoAnulacion('  toque equivocado ');
  assert.ok(ok.ok);
  assert.equal(ok.motivo, 'toque equivocado');
});
