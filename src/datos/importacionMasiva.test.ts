import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { listarAlumnosParaImportacion, importarAlumnosValidados, importarHorariosValidados } from './importacionMasiva.ts';
import type { AlumnoConCentro } from './alumnos.ts';
import type { SlotHorario } from '../dominio/tipos.ts';
import type { DatosHorarioImportado } from '../dominio/importacionHorarios.ts';

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

const ALUMNO: AlumnoConCentro = {
  id: 'a1',
  nombre: 'Ana',
  primer_apellido: 'García',
  segundo_apellido: 'Pérez',
  centro_referencia_id: 'c1',
  avatar_ruta: null,
  email_alumno: 'ana@ejemplo.com',
  telefono_alumno: '666123456',
  activo: true,
  alta_en: '2026-01-01T00:00:00Z',
  baja_en: null,
  motivo_baja: null,
  usuario_id: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  centro: { id: 'c1', nombre: 'IES Cervantes' },
};

// --- listarAlumnosParaImportacion -----------------------------------------------------------

void test('listarAlumnosParaImportacion: pide todos los estados y solo las columnas de emparejamiento', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [ALUMNO], cabeceras: { 'content-range': '0-0/1' } };
  });

  const alumnos = await listarAlumnosParaImportacion(cliente);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.searchParams.get('activo'), null); // 'todos': sin filtro de estado
  assert.deepEqual(alumnos, [
    { id: 'a1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: 'Pérez', centro_referencia_id: 'c1' },
  ]);
});

// --- importarAlumnosValidados ----------------------------------------------------------------

void test('importarAlumnosValidados: con filas vacío, no hace ninguna petición y devuelve 0', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  assert.equal(await importarAlumnosValidados(cliente, []), 0);
  assert.equal(llamadas, 0);
});

void test('importarAlumnosValidados: una única petición INSERT con todas las filas y return=minimal', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: undefined };
  });

  const filas = [
    { id: 'id-1', datos: { nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null, centro_referencia_id: 'c1', telefono_alumno: null, email_alumno: null } },
    { id: 'id-2', datos: { nombre: 'Luis', primer_apellido: 'Gómez', segundo_apellido: null, centro_referencia_id: 'c1', telefono_alumno: null, email_alumno: null } },
  ];

  const creados = await importarAlumnosValidados(cliente, filas);

  assert.equal(creados, 2);
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'POST');
  assert.equal(new URL(peticion.url).pathname, '/rest/v1/alumno');
  assert.equal(peticion.cabeceras.prefer, 'return=minimal');
  const cuerpo = peticion.cuerpo as { readonly id: string; readonly nombre: string }[];
  assert.equal(cuerpo.length, 2);
  assert.equal(cuerpo[0]?.id, 'id-1');
  assert.equal(cuerpo[1]?.id, 'id-2');
  assert.equal(cuerpo[0].nombre, 'Ana');
  assert.equal(cuerpo[1].nombre, 'Luis');
});

void test('importarAlumnosValidados: no genera ningún id — usa siempre el que trae la fila (P-25, idempotencia ante reintento)', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((p) => {
    peticiones.push(p);
    return { estado: 200, cuerpo: undefined };
  });

  const filas = [
    { id: 'id-estable', datos: { nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null, centro_referencia_id: 'c1', telefono_alumno: null, email_alumno: null } },
  ];

  await importarAlumnosValidados(cliente, filas);
  await importarAlumnosValidados(cliente, filas); // simula el reintento de un mismo lote tras un corte de red

  assert.equal(peticiones.length, 2);
  const idsEnviados = peticiones.map((p) => (p.cuerpo as { readonly id: string }[])[0]?.id);
  assert.deepEqual(idsEnviados, ['id-estable', 'id-estable']);
});

// --- importarHorariosValidados ----------------------------------------------------------------

const DATOS_A1: DatosHorarioImportado = {
  alumno_id: 'a1',
  profesor_id: 'p1',
  dia_semana: 1,
  hora_inicio: '10:00',
  hora_fin: '11:00',
  asignatura_o_grupo: null,
};

const DATOS_A2_SOLAPADO: DatosHorarioImportado = {
  alumno_id: 'a2',
  profesor_id: 'p1',
  dia_semana: 2,
  hora_inicio: '10:00',
  hora_fin: '11:00',
  asignatura_o_grupo: null,
};

const SLOT_EXISTENTE_A2: SlotHorario = {
  id: 's-existente',
  alumno_id: 'a2',
  profesor_id: 'p1',
  dia_semana: 2,
  hora_inicio: '10:00',
  hora_fin: '11:00',
  asignatura_o_grupo: null,
  vigente_desde: '2026-01-01',
  vigente_hasta: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

const NUEVO_SLOT: SlotHorario = {
  id: 's-nuevo',
  alumno_id: 'a1',
  profesor_id: 'p1',
  dia_semana: 1,
  hora_inicio: '10:00',
  hora_fin: '11:00',
  asignatura_o_grupo: null,
  vigente_desde: '2026-02-01',
  vigente_hasta: null,
  creado_en: '2026-02-01T00:00:00Z',
  actualizado_en: '2026-02-01T00:00:00Z',
};

void test('importarHorariosValidados: con filas vacío, no hace ninguna petición y devuelve 0 creados', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });
  const reloj = crearRelojFijo(new Date('2026-02-01T00:00:00Z'));

  const resultado = await importarHorariosValidados(cliente, reloj, []);

  assert.deepEqual(resultado, { creados: 0, errores: [] });
  assert.equal(llamadas, 0);
});

void test('importarHorariosValidados: crea la primera fila y sigue con la segunda aunque la primera falle', async () => {
  const cliente = crearCliente((peticion) => {
    const url = new URL(peticion.url);
    if (peticion.metodo === 'GET') {
      if (url.searchParams.get('alumno_id') === 'eq.a2') {
        return { estado: 200, cuerpo: [SLOT_EXISTENTE_A2] };
      }
      return { estado: 200, cuerpo: [] };
    }
    return { estado: 201, cuerpo: [NUEVO_SLOT] };
  });
  const reloj = crearRelojFijo(new Date('2026-02-01T00:00:00Z'));

  const resultado = await importarHorariosValidados(cliente, reloj, [
    { descripcion: 'Ana — lunes 10:00-11:00', datos: DATOS_A1 },
    { descripcion: 'Luis — martes 10:00-11:00', datos: DATOS_A2_SOLAPADO },
  ]);

  assert.equal(resultado.creados, 1);
  assert.equal(resultado.errores.length, 1);
  assert.equal(resultado.errores[0]?.descripcion, 'Luis — martes 10:00-11:00');
  assert.match(resultado.errores[0].motivo, /solapa/);
});

void test('importarHorariosValidados: usa el instante del reloj inyectado como vigente_desde, nunca la hora del sistema', async () => {
  let cuerpoInsert: Record<string, unknown> | undefined;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [] };
    }
    cuerpoInsert = peticion.cuerpo as Record<string, unknown>;
    return { estado: 201, cuerpo: [NUEVO_SLOT] };
  });
  const reloj = crearRelojFijo(new Date('2026-03-15T00:00:00Z'));

  await importarHorariosValidados(cliente, reloj, [{ descripcion: 'x', datos: DATOS_A1 }]);

  assert.equal(cuerpoInsert?.vigente_desde, '2026-03-15');
});
