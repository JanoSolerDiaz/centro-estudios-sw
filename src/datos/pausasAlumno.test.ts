import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import {
  declararPausaAlumno,
  cancelarPausaAlumno,
  acortarPausaAlumno,
  listarPausasDeAlumno,
  listarPausasActivasDeAlumnos,
  listarPausasActivasDeMisAlumnos,
} from './pausasAlumno.ts';
import { SinPermiso } from './erroresDominio.ts';
import type { PausaAlumno } from '../dominio/tipos.ts';

const PAUSA: PausaAlumno = {
  id: 'pausa1',
  alumno_id: 'alumno1',
  fecha_inicio: '2026-09-20',
  fecha_fin: '2026-09-26',
  motivo: 'Viaje familiar',
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

void test('declararPausaAlumno llama a la RPC declarar_pausa_alumno con el cuerpo esperado', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: PAUSA };
  });

  const fila = await declararPausaAlumno(cliente, {
    alumnoId: 'alumno1',
    fechaInicio: '2026-09-20',
    fechaFin: '2026-09-26',
    motivo: 'Viaje familiar',
  });

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/declarar_pausa_alumno');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, {
    p_alumno_id: 'alumno1',
    p_fecha_inicio: '2026-09-20',
    p_fecha_fin: '2026-09-26',
    p_motivo: 'Viaje familiar',
  });
  assert.deepEqual(fila, PAUSA);
});

void test('declararPausaAlumno envía motivo null cuando no se da ninguno', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...PAUSA, motivo: null } };
  });

  await declararPausaAlumno(cliente, { alumnoId: 'alumno1', fechaInicio: '2026-09-20', fechaFin: '2026-09-26' });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_motivo, null);
});

void test('declararPausaAlumno propaga SinPermiso cuando la RPC rechaza a un teacher', async () => {
  const cliente = crearCliente(() => ({ estado: 403, cuerpo: { message: 'solo un administrador puede declarar una pausa' } }));

  await assert.rejects(
    () => declararPausaAlumno(cliente, { alumnoId: 'alumno1', fechaInicio: '2026-09-20', fechaFin: '2026-09-26' }),
    SinPermiso,
  );
});

void test('cancelarPausaAlumno llama a la RPC cancelar_pausa_alumno con el id y el motivo', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...PAUSA, estado: 'anulada', motivo_anulacion: 'Ya no hace falta' } };
  });

  const fila = await cancelarPausaAlumno(cliente, 'pausa1', 'Ya no hace falta');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/cancelar_pausa_alumno');
  assert.deepEqual(peticion.cuerpo, { p_pausa_id: 'pausa1', p_motivo: 'Ya no hace falta' });
  assert.equal(fila.estado, 'anulada');
});

void test('acortarPausaAlumno llama a la RPC acortar_pausa_alumno con el id y la nueva fecha de fin', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...PAUSA, fecha_fin: '2026-09-22' } };
  });

  const fila = await acortarPausaAlumno(cliente, 'pausa1', '2026-09-22');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/acortar_pausa_alumno');
  assert.deepEqual(peticion.cuerpo, { p_pausa_id: 'pausa1', p_nueva_fecha_fin: '2026-09-22' });
  assert.equal(fila.fecha_fin, '2026-09-22');
});

void test('acortarPausaAlumno propaga SinPermiso cuando la RPC rechaza a un teacher', async () => {
  const cliente = crearCliente(() => ({ estado: 403, cuerpo: { message: 'solo un administrador puede acortar una pausa' } }));

  await assert.rejects(() => acortarPausaAlumno(cliente, 'pausa1', '2026-09-22'), SinPermiso);
});

void test('listarPausasDeAlumno filtra por alumno_id, ordenado por fecha_inicio descendente', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [PAUSA] };
  });

  const filas = await listarPausasDeAlumno(cliente, 'alumno1');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/pausa_alumno');
  assert.equal(url.searchParams.get('alumno_id'), 'eq.alumno1');
  assert.equal(url.searchParams.get('order'), 'fecha_inicio.desc');
  assert.deepEqual(filas, [PAUSA]);
});

void test('listarPausasActivasDeAlumnos filtra por alumno_id en lista y estado=eq.activa', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [PAUSA] };
  });

  const filas = await listarPausasActivasDeAlumnos(cliente, ['alumno1', 'alumno2']);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/pausa_alumno');
  assert.equal(url.searchParams.get('alumno_id'), 'in.(alumno1,alumno2)');
  assert.equal(url.searchParams.get('estado'), 'eq.activa');
  assert.deepEqual(filas, [PAUSA]);
});

void test('listarPausasActivasDeAlumnos con lista vacía no hace ninguna petición', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  const filas = await listarPausasActivasDeAlumnos(cliente, []);

  assert.equal(llamadas, 0);
  assert.deepEqual(filas, []);
});

void test('listarPausasActivasDeMisAlumnos filtra por estado=eq.activa (RLS acota al teacher que llama)', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [PAUSA] };
  });

  const filas = await listarPausasActivasDeMisAlumnos(cliente);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/pausa_alumno');
  assert.equal(url.searchParams.get('estado'), 'eq.activa');
  assert.deepEqual(filas, [PAUSA]);
});
