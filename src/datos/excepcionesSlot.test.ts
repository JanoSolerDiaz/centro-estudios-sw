import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import {
  declararExcepcionSlot,
  desactivarExcepcionSlot,
  listarExcepcionesDeSlot,
  listarExcepcionesDelDiaParaProfesor,
  listarExcepcionesDeProfesorEnRango,
} from './excepcionesSlot.ts';
import { SinPermiso } from './erroresDominio.ts';
import type { ExcepcionSlot } from '../dominio/tipos.ts';

const SUSTITUCION: ExcepcionSlot = {
  id: 'exc1',
  slot_id: 'slot1',
  fecha: '2026-12-21',
  tipo: 'sustitucion',
  profesor_sustituto_id: 'teacher2',
  motivo: null,
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('declararExcepcionSlot llama a la RPC declarar_excepcion_slot con el cuerpo esperado (sustitución)', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: SUSTITUCION };
  });

  const fila = await declararExcepcionSlot(cliente, {
    slotId: 'slot1',
    fecha: '2026-12-21',
    tipo: 'sustitucion',
    profesorSustitutoId: 'teacher2',
  });

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/declarar_excepcion_slot');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, {
    p_slot_id: 'slot1',
    p_fecha: '2026-12-21',
    p_tipo: 'sustitucion',
    p_profesor_sustituto_id: 'teacher2',
    p_motivo: null,
  });
  assert.deepEqual(fila, SUSTITUCION);
});

void test('declararExcepcionSlot (cancelación) envía motivo y profesor_sustituto_id null', async () => {
  let peticion: PeticionSimulada | undefined;
  const cancelacion: ExcepcionSlot = { ...SUSTITUCION, tipo: 'cancelacion', profesor_sustituto_id: null, motivo: 'Imprevisto' };
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: cancelacion };
  });

  await declararExcepcionSlot(cliente, { slotId: 'slot1', fecha: '2026-12-21', tipo: 'cancelacion', motivo: 'Imprevisto' });

  assert.ok(peticion);
  assert.deepEqual(peticion.cuerpo, {
    p_slot_id: 'slot1',
    p_fecha: '2026-12-21',
    p_tipo: 'cancelacion',
    p_profesor_sustituto_id: null,
    p_motivo: 'Imprevisto',
  });
});

void test('declararExcepcionSlot propaga SinPermiso cuando la RPC rechaza a un teacher', async () => {
  const cliente = crearCliente(() => ({ estado: 403, cuerpo: { message: 'solo un administrador puede declarar una excepción' } }));

  await assert.rejects(
    () => declararExcepcionSlot(cliente, { slotId: 'slot1', fecha: '2026-12-21', tipo: 'cancelacion', motivo: 'x' }),
    SinPermiso,
  );
});

void test('desactivarExcepcionSlot llama a la RPC desactivar_excepcion_slot con el id', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...SUSTITUCION, activo: false } };
  });

  const fila = await desactivarExcepcionSlot(cliente, 'exc1');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/desactivar_excepcion_slot');
  assert.deepEqual(peticion.cuerpo, { p_excepcion_id: 'exc1' });
  assert.equal(fila.activo, false);
});

void test('listarExcepcionesDeSlot filtra por slot_id y activo=eq.true', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [SUSTITUCION] };
  });

  const filas = await listarExcepcionesDeSlot(cliente, 'slot1');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/excepcion_slot');
  assert.equal(url.searchParams.get('slot_id'), 'eq.slot1');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
  assert.deepEqual(filas, [SUSTITUCION]);
});

void test('listarExcepcionesDelDiaParaProfesor filtra por fecha y activo, con el slot y el alumno embebidos', async () => {
  let peticion: PeticionSimulada | undefined;
  const conSlot = {
    ...SUSTITUCION,
    slot: {
      id: 'slot1',
      alumno_id: 'al1',
      profesor_id: 'teacher1',
      dia_semana: 1,
      hora_inicio: '09:00',
      hora_fin: '10:00',
      asignatura_o_grupo: null,
      vigente_desde: '2026-01-01',
      vigente_hasta: null,
      creado_en: '2026-01-01T00:00:00Z',
      actualizado_en: '2026-01-01T00:00:00Z',
      alumno: { id: 'al1', nombre: 'Ana', primer_apellido: 'Gómez', segundo_apellido: null, avatar_ruta: null, activo: true },
    },
  };
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [conSlot] };
  });

  const filas = await listarExcepcionesDelDiaParaProfesor(cliente, '2026-12-21');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/excepcion_slot');
  assert.equal(url.searchParams.get('fecha'), 'eq.2026-12-21');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
  assert.match(url.searchParams.get('select') ?? '', /slot:slot_horario/);
  assert.equal(filas[0]?.slot.alumno.nombre, 'Ana');
});

void test('listarExcepcionesDeProfesorEnRango filtra por fecha entre desde y hasta, y activo=eq.true (R-13)', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [SUSTITUCION] };
  });

  const filas = await listarExcepcionesDeProfesorEnRango(cliente, '2026-08-31', '2026-09-07');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/excepcion_slot');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
  assert.deepEqual(url.searchParams.getAll('fecha'), ['gte.2026-08-31', 'lte.2026-09-07']);
  assert.deepEqual(filas, [SUSTITUCION]);
});
