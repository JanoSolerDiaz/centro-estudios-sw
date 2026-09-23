import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { avisarAusenciaProfesor, marcarAvisoAusenciaAtendido, listarAvisosAusenciaPendientes } from './avisosAusenciaProfesor.ts';
import { SinPermiso, Conflicto } from './erroresDominio.ts';
import type { AvisoAusenciaProfesor } from '../dominio/tipos.ts';

const AVISO: AvisoAusenciaProfesor = {
  id: 'aviso1',
  profesor_id: 'teacher1',
  slot_id: 'slot1',
  fecha_sesion: '2026-12-21',
  hora_inicio: '09:00',
  hora_fin: '10:00',
  asignatura_o_grupo: 'Matemáticas',
  motivo: null,
  estado: 'pendiente',
  atendido_por: null,
  atendido_en: null,
  registrado_en: '2026-12-01T00:00:00Z',
  actualizado_en: '2026-12-01T00:00:00Z',
};

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('avisarAusenciaProfesor llama a la RPC avisar_ausencia_profesor con el cuerpo esperado', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: AVISO };
  });

  const fila = await avisarAusenciaProfesor(cliente, 'slot1', '2026-12-21', 'Imprevisto');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/avisar_ausencia_profesor');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, { p_slot_id: 'slot1', p_fecha_sesion: '2026-12-21', p_motivo: 'Imprevisto' });
  assert.deepEqual(fila, AVISO);
});

void test('avisarAusenciaProfesor envía motivo null cuando se omite', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: AVISO };
  });

  await avisarAusenciaProfesor(cliente, 'slot1', '2026-12-21');

  assert.ok(peticion);
  assert.deepEqual(peticion.cuerpo, { p_slot_id: 'slot1', p_fecha_sesion: '2026-12-21', p_motivo: null });
});

void test('avisarAusenciaProfesor propaga SinPermiso cuando la RPC rechaza a un administrator', async () => {
  const cliente = crearCliente(() => ({ estado: 403, cuerpo: { message: 'solo un profesor puede avisar de su propia ausencia' } }));

  await assert.rejects(() => avisarAusenciaProfesor(cliente, 'slot1', '2026-12-21'), SinPermiso);
});

void test('avisarAusenciaProfesor propaga Conflicto cuando la sesión ya tiene un aviso pendiente', async () => {
  const cliente = crearCliente(() => ({ estado: 409, cuerpo: { message: 'ya avisaste de esta sesión y sigue pendiente' } }));

  await assert.rejects(() => avisarAusenciaProfesor(cliente, 'slot1', '2026-12-21'), Conflicto);
});

void test('marcarAvisoAusenciaAtendido llama a la RPC marcar_aviso_ausencia_atendido con el id', async () => {
  let peticion: PeticionSimulada | undefined;
  const atendido: AvisoAusenciaProfesor = { ...AVISO, estado: 'atendido', atendido_por: 'admin1', atendido_en: '2026-12-02T00:00:00Z' };
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: atendido };
  });

  const fila = await marcarAvisoAusenciaAtendido(cliente, 'aviso1');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/marcar_aviso_ausencia_atendido');
  assert.deepEqual(peticion.cuerpo, { p_aviso_id: 'aviso1' });
  assert.equal(fila.estado, 'atendido');
});

void test('marcarAvisoAusenciaAtendido propaga SinPermiso cuando la RPC rechaza a un teacher', async () => {
  const cliente = crearCliente(() => ({ estado: 403, cuerpo: { message: 'solo un administrador puede marcar un aviso como atendido' } }));

  await assert.rejects(() => marcarAvisoAusenciaAtendido(cliente, 'aviso1'), SinPermiso);
});

void test('listarAvisosAusenciaPendientes filtra por estado=eq.pendiente y ordena por fecha_sesion', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [AVISO] };
  });

  const filas = await listarAvisosAusenciaPendientes(cliente);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/aviso_ausencia_profesor');
  assert.equal(url.searchParams.get('estado'), 'eq.pendiente');
  assert.equal(url.searchParams.get('order'), 'fecha_sesion.asc');
  assert.deepEqual(filas, [AVISO]);
});
