import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { listarCierres, crearCierre, editarCierre, desactivarCierre, reactivarCierre } from './cierresCentro.ts';
import { ErrorDeValidacion, SinPermiso } from './erroresDominio.ts';
import type { CierreCentro } from '../dominio/tipos.ts';

const NAVIDAD: CierreCentro = {
  id: 'c1',
  fecha_inicio: '2026-12-20',
  fecha_fin: '2026-12-31',
  motivo: 'Navidad',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};
const SEMANA_SANTA: CierreCentro = {
  id: 'c2',
  fecha_inicio: '2026-04-06',
  fecha_fin: '2026-04-10',
  motivo: 'Semana Santa',
  activo: false,
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

void test('listarCierres sin opciones no filtra por estado y ordena por fecha_inicio', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [SEMANA_SANTA, NAVIDAD] };
  });

  const filas = await listarCierres(cliente);

  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/cierre_centro');
  assert.equal(url.searchParams.get('activo'), null);
  assert.equal(url.searchParams.get('order'), 'fecha_inicio.asc');
  assert.deepEqual(filas, [SEMANA_SANTA, NAVIDAD]);
});

void test('listarCierres({ estado: "activos" }) filtra activo=eq.true', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [NAVIDAD] };
  });

  await listarCierres(cliente, { estado: 'activos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
});

void test('listarCierres({ estado: "inactivos" }) filtra activo=eq.false', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [SEMANA_SANTA] };
  });

  await listarCierres(cliente, { estado: 'inactivos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.false');
});

void test('crearCierre inserta cuando no hay ningún cierre activo que se pise en fecha', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [NAVIDAD] };
    }
    return { estado: 201, cuerpo: [{ ...SEMANA_SANTA, id: 'c3', activo: true }] };
  });

  const resultado = await crearCierre(cliente, '2026-04-06', '2026-04-10', 'Semana Santa');

  assert.equal(resultado.tipo, 'guardado');
  const peticionGet = peticiones.find((p) => p.metodo === 'GET');
  assert.ok(peticionGet);
  const urlGet = new URL(peticionGet.url);
  assert.equal(urlGet.searchParams.get('activo'), 'eq.true');
  const peticionInsertar = peticiones.find((p) => p.metodo === 'POST');
  assert.ok(peticionInsertar);
  assert.deepEqual(peticionInsertar.cuerpo, {
    fecha_inicio: '2026-04-06',
    fecha_fin: '2026-04-10',
    motivo: 'Semana Santa',
  });
});

void test('crearCierre ofrece el existente cuando el rango se pisa con un cierre activo, sin llegar a insertar', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [NAVIDAD] };
  });

  const resultado = await crearCierre(cliente, '2026-12-24', '2027-01-02', 'Puente');

  assert.equal(resultado.tipo, 'solapado');
  assert.equal(resultado.existente.id, 'c1');
  assert.ok(!peticiones.some((p) => p.metodo === 'POST'), 'no debe intentar insertar un solapado');
});

void test('crearCierre ignora los cierres INACTIVOS al comprobar solape: un periodo liberado se puede reutilizar', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      // El doble de HTTP ya filtra por activo=eq.true en un servidor real; aquí solo se comprueba
      // que la consulta de comprobarSolape pide justamente eso.
      return { estado: 200, cuerpo: [] };
    }
    return { estado: 201, cuerpo: [{ ...SEMANA_SANTA, id: 'c4', activo: true }] };
  });

  const resultado = await crearCierre(cliente, '2026-04-06', '2026-04-10', 'Semana Santa (corregida)');

  assert.equal(resultado.tipo, 'guardado');
  const peticionGet = peticiones.find((p) => p.metodo === 'GET');
  assert.ok(peticionGet);
  const urlGet = new URL(peticionGet.url);
  assert.equal(urlGet.searchParams.get('activo'), 'eq.true');
});

void test('crearCierre con motivo vacío lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(() => crearCierre(cliente, '2026-04-06', '2026-04-10', '   '), ErrorDeValidacion);
  assert.equal(llamadas, 0);
});

void test('crearCierre con fecha_fin anterior a fecha_inicio lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(() => crearCierre(cliente, '2026-04-10', '2026-04-06', 'Semana Santa'), ErrorDeValidacion);
  assert.equal(llamadas, 0);
});

void test('editarCierre excluye al propio cierre de la comprobación de solape', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [NAVIDAD] };
    }
    return { estado: 200, cuerpo: [{ ...NAVIDAD, fecha_fin: '2027-01-02' }] };
  });

  const resultado = await editarCierre(cliente, 'c1', '2026-12-20', '2027-01-02', 'Navidad');

  assert.equal(resultado.tipo, 'guardado');
});

void test('editarCierre detecta el solape con OTRO cierre distinto de sí mismo', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [NAVIDAD] }));

  const resultado = await editarCierre(cliente, 'c2', '2026-12-24', '2027-01-02', 'Puente');

  assert.equal(resultado.tipo, 'solapado');
  assert.equal(resultado.existente.id, 'c1');
});

void test('desactivarCierre hace PATCH activo=false y devuelve la fila actualizada', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...NAVIDAD, activo: false }] };
  });

  const cierre = await desactivarCierre(cliente, 'c1');

  assert.equal(cierre.activo, false);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PATCH');
  assert.deepEqual(peticion.cuerpo, { activo: false });
});

void test('reactivarCierre hace PATCH activo=true cuando su periodo no se pisa con ningún otro cierre activo', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [SEMANA_SANTA] };
    }
    return { estado: 200, cuerpo: [{ ...SEMANA_SANTA, activo: true }] };
  });

  const resultado = await reactivarCierre(cliente, 'c2');

  assert.equal(resultado.tipo, 'guardado');
  assert.equal(resultado.cierre.activo, true);
});

void test('reactivarCierre devuelve solapado, sin llegar a reactivar, si otro cierre activo ya cubre su periodo', async () => {
  const puenteAbril: CierreCentro = {
    ...SEMANA_SANTA,
    id: 'c5',
    fecha_inicio: '2026-04-08',
    fecha_fin: '2026-04-09',
    activo: true,
  };
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo !== 'PATCH') {
      // Primera GET: la propia fila del cierre a reactivar; segunda GET (comprobarSolape): los activos.
      return peticiones.filter((p) => p.metodo === 'GET').length === 1
        ? { estado: 200, cuerpo: [{ ...SEMANA_SANTA, activo: false }] }
        : { estado: 200, cuerpo: [puenteAbril] };
    }
    return { estado: 200, cuerpo: [{ ...SEMANA_SANTA, activo: true }] };
  });

  const resultado = await reactivarCierre(cliente, 'c2');

  assert.equal(resultado.tipo, 'solapado');
  assert.ok(!peticiones.some((p) => p.metodo === 'PATCH'), 'no debe reactivar si sigue habiendo solape');
});

void test('un teacher (rechazado por RLS al escribir) recibe SinPermiso, no un error genérico', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [] };
    }
    // 403: lo que devuelve PostgREST cuando la política de RLS rechaza la escritura de un `teacher`.
    return { estado: 403, cuerpo: { message: 'new row violates row-level security policy' } };
  });

  await assert.rejects(() => crearCierre(cliente, '2026-04-06', '2026-04-10', 'Semana Santa'), SinPermiso);
});
