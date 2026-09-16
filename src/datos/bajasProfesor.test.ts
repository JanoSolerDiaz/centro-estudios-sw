import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { declararBajaProfesor, cancelarBajaProfesor, acortarBajaProfesor, listarBajasDeProfesor, listarExcepcionesDeBaja } from './bajasProfesor.ts';
import { SinPermiso } from './erroresDominio.ts';
import type { BajaProfesor, ExcepcionSlot } from '../dominio/tipos.ts';

const BAJA: BajaProfesor = {
  id: 'baja1',
  profesor_id: 'teacher1',
  fecha_inicio: '2026-09-21',
  fecha_fin: '2026-09-25',
  tipo: 'cancelacion',
  profesor_sustituto_id: null,
  motivo: 'Baja médica',
  estado: 'activa',
  motivo_anulacion: null,
  creado_por: 'admin1',
  anulado_por: null,
  anulado_en: null,
  creado_en: '2026-09-01T00:00:00Z',
  actualizado_en: '2026-09-01T00:00:00Z',
};

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('declararBajaProfesor llama a la RPC declarar_baja_profesor con el cuerpo esperado (cancelación) y aplana el resultado', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return {
      estado: 200,
      cuerpo: [
        { out_baja_profesor_id: 'baja1', out_slot_id: 'slot1', out_fecha: '2026-09-21', out_excepcion_id: 'exc1', out_excluido: false, out_motivo_exclusion: null },
        {
          out_baja_profesor_id: 'baja1',
          out_slot_id: 'slot2',
          out_fecha: '2026-09-22',
          out_excepcion_id: null,
          out_excluido: true,
          out_motivo_exclusion: 'Ya hay registros de asistencia de este slot ese día.',
        },
      ],
    };
  });

  const filas = await declararBajaProfesor(cliente, {
    profesorId: 'teacher1',
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-25',
    tipo: 'cancelacion',
    motivo: 'Baja médica',
  });

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/declarar_baja_profesor');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, {
    p_profesor_id: 'teacher1',
    p_fecha_inicio: '2026-09-21',
    p_fecha_fin: '2026-09-25',
    p_tipo: 'cancelacion',
    p_profesor_sustituto_id: null,
    p_motivo: 'Baja médica',
  });
  assert.deepEqual(filas, [
    { bajaProfesorId: 'baja1', slotId: 'slot1', fecha: '2026-09-21', excepcionId: 'exc1', excluido: false, motivoExclusion: null },
    {
      bajaProfesorId: 'baja1',
      slotId: 'slot2',
      fecha: '2026-09-22',
      excepcionId: null,
      excluido: true,
      motivoExclusion: 'Ya hay registros de asistencia de este slot ese día.',
    },
  ]);
});

void test('declararBajaProfesor: sustitución envía el profesor sustituto y ningún motivo', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await declararBajaProfesor(cliente, {
    profesorId: 'teacher1',
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-25',
    tipo: 'sustitucion',
    profesorSustitutoId: 'teacher2',
  });

  assert.ok(peticion);
  assert.deepEqual(peticion.cuerpo, {
    p_profesor_id: 'teacher1',
    p_fecha_inicio: '2026-09-21',
    p_fecha_fin: '2026-09-25',
    p_tipo: 'sustitucion',
    p_profesor_sustituto_id: 'teacher2',
    p_motivo: null,
  });
});

void test('declararBajaProfesor: sin ningún slot en rango, una única fila centinela con solo el id de la baja', async () => {
  const cliente = crearCliente(() => ({
    estado: 200,
    cuerpo: [{ out_baja_profesor_id: 'baja1', out_slot_id: null, out_fecha: null, out_excepcion_id: null, out_excluido: null, out_motivo_exclusion: null }],
  }));

  const filas = await declararBajaProfesor(cliente, {
    profesorId: 'teacher1',
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-25',
    tipo: 'cancelacion',
    motivo: 'Baja médica',
  });

  assert.deepEqual(filas, [{ bajaProfesorId: 'baja1', slotId: null, fecha: null, excepcionId: null, excluido: null, motivoExclusion: null }]);
});

void test('declararBajaProfesor propaga SinPermiso cuando la RPC rechaza a un teacher', async () => {
  const cliente = crearCliente(() => ({ estado: 403, cuerpo: { message: 'solo un administrador puede declarar una baja' } }));

  await assert.rejects(
    () =>
      declararBajaProfesor(cliente, {
        profesorId: 'teacher1',
        fechaInicio: '2026-09-21',
        fechaFin: '2026-09-25',
        tipo: 'cancelacion',
        motivo: 'x',
      }),
    SinPermiso,
  );
});

void test('cancelarBajaProfesor llama a la RPC cancelar_baja_profesor con el id y el motivo', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...BAJA, estado: 'anulada', motivo_anulacion: 'Se resolvió antes de tiempo' } };
  });

  const fila = await cancelarBajaProfesor(cliente, 'baja1', 'Se resolvió antes de tiempo');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/cancelar_baja_profesor');
  assert.deepEqual(peticion.cuerpo, { p_baja_id: 'baja1', p_motivo: 'Se resolvió antes de tiempo' });
  assert.equal(fila.estado, 'anulada');
});

void test('acortarBajaProfesor llama a la RPC acortar_baja_profesor con el id y la nueva fecha de fin', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...BAJA, fecha_fin: '2026-09-23' } };
  });

  const fila = await acortarBajaProfesor(cliente, 'baja1', '2026-09-23');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/acortar_baja_profesor');
  assert.deepEqual(peticion.cuerpo, { p_baja_id: 'baja1', p_nueva_fecha_fin: '2026-09-23' });
  assert.equal(fila.fecha_fin, '2026-09-23');
});

void test('listarBajasDeProfesor filtra por profesor_id y ordena por fecha_inicio descendente', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [BAJA] };
  });

  const filas = await listarBajasDeProfesor(cliente, 'teacher1');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/baja_profesor');
  assert.equal(url.searchParams.get('profesor_id'), 'eq.teacher1');
  assert.equal(url.searchParams.get('order'), 'fecha_inicio.desc');
  assert.deepEqual(filas, [BAJA]);
});

void test('listarExcepcionesDeBaja filtra por baja_profesor_id y ordena por fecha ascendente', async () => {
  let peticion: PeticionSimulada | undefined;
  const excepcion: ExcepcionSlot = {
    id: 'exc1',
    slot_id: 'slot1',
    fecha: '2026-09-21',
    tipo: 'cancelacion',
    profesor_sustituto_id: null,
    motivo: 'Baja médica',
    activo: true,
    aviso_familias_quien: null,
    aviso_familias_en: null,
    creado_en: '2026-09-01T00:00:00Z',
    actualizado_en: '2026-09-01T00:00:00Z',
  };
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [excepcion] };
  });

  const filas = await listarExcepcionesDeBaja(cliente, 'baja1');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/excepcion_slot');
  assert.equal(url.searchParams.get('baja_profesor_id'), 'eq.baja1');
  assert.equal(url.searchParams.get('order'), 'fecha.asc');
  assert.deepEqual(filas, [excepcion]);
});
