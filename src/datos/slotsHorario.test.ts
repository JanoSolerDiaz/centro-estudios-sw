import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { listarSlotsDeAlumno, crearSlot, modificarSlot, cesarSlot } from './slotsHorario.ts';
import { ErrorDeValidacion } from './erroresDominio.ts';
import type { SlotHorario } from '../dominio/tipos.ts';

const SLOT_VIGENTE: SlotHorario = {
  id: 's1',
  alumno_id: 'alumno-1',
  profesor_id: 'profesor-1',
  dia_semana: 3,
  hora_inicio: '17:00',
  hora_fin: '18:00',
  asignatura_o_grupo: null,
  vigente_desde: '2026-01-01',
  vigente_hasta: null,
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

void test('listarSlotsDeAlumno pide todas las versiones ordenadas por vigente_desde descendente', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [SLOT_VIGENTE] };
  });

  const slots = await listarSlotsDeAlumno(cliente, 'alumno-1');

  assert.deepEqual(slots, [SLOT_VIGENTE]);
  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/slot_horario');
  assert.equal(url.searchParams.get('alumno_id'), 'eq.alumno-1');
  assert.equal(url.searchParams.get('order'), 'vigente_desde.desc');
});

void test('crearSlot sin conflictos: comprueba solape de alumno y de profesor, luego inserta', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      return { estado: 200, cuerpo: [] }; // ni el alumno ni el profesor tienen nada vigente todavía
    }
    return { estado: 201, cuerpo: [SLOT_VIGENTE] };
  });

  const resultado = await crearSlot(cliente, {
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
    hora_inicio: '17:00',
    hora_fin: '18:00',
    vigente_desde: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.deepEqual(resultado, { slot: SLOT_VIGENTE, avisoSolapeProfesor: false });
  const gets = peticiones.filter((p) => p.metodo === 'GET');
  assert.equal(gets.length, 2);
  const posts = peticiones.filter((p) => p.metodo === 'POST');
  assert.equal(posts.length, 1);
  const cuerpo = posts[0]?.cuerpo as Record<string, unknown>;
  assert.equal(cuerpo.vigente_desde, '2026-01-01');
  assert.equal(cuerpo.asignatura_o_grupo, null);
});

void test('crearSlot rechaza el alta si el MISMO alumno ya tiene un slot vigente que se solapa, sin llegar a insertar', async () => {
  let sePidioInsercion = false;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'POST') {
      sePidioInsercion = true;
      return { estado: 201, cuerpo: [SLOT_VIGENTE] };
    }
    // La primera GET (vigentes del alumno) ya trae un solape.
    return { estado: 200, cuerpo: [SLOT_VIGENTE] };
  });

  await assert.rejects(
    () =>
      crearSlot(cliente, {
        alumno_id: 'alumno-1',
        profesor_id: 'profesor-2',
        dia_semana: 3,
        hora_inicio: '17:30',
        hora_fin: '18:30',
        vigente_desde: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ErrorDeValidacion,
  );
  assert.equal(sePidioInsercion, false);
});

void test('crearSlot NO bloquea cuando dos alumnos distintos comparten profesor y tramo: solo lo señala como aviso', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      const url = new URL(peticion.url);
      if (url.searchParams.get('alumno_id') !== null) {
        return { estado: 200, cuerpo: [] }; // el alumno nuevo no tiene nada vigente
      }
      // El profesor ya tiene un slot vigente en ese tramo, pero con OTRO alumno.
      return { estado: 200, cuerpo: [SLOT_VIGENTE] };
    }
    return { estado: 201, cuerpo: [{ ...SLOT_VIGENTE, id: 's2', alumno_id: 'alumno-2' }] };
  });

  const resultado = await crearSlot(cliente, {
    alumno_id: 'alumno-2',
    profesor_id: 'profesor-1',
    dia_semana: 3,
    hora_inicio: '17:00',
    hora_fin: '18:00',
    vigente_desde: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.equal(resultado.avisoSolapeProfesor, true);
  assert.equal(resultado.slot.alumno_id, 'alumno-2');
});

void test('crearSlot con hora_fin anterior u igual a hora_inicio lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(
    () =>
      crearSlot(cliente, {
        alumno_id: 'alumno-1',
        profesor_id: 'profesor-1',
        dia_semana: 3,
        hora_inicio: '18:00',
        hora_fin: '18:00',
        vigente_desde: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ErrorDeValidacion,
  );
  assert.equal(llamadas, 0);
});

void test('crearSlot con día de la semana fuera de 1-7 lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(
    () =>
      crearSlot(cliente, {
        alumno_id: 'alumno-1',
        profesor_id: 'profesor-1',
        dia_semana: 8 as unknown as SlotHorario['dia_semana'],
        hora_inicio: '17:00',
        hora_fin: '18:00',
        vigente_desde: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ErrorDeValidacion,
  );
  assert.equal(llamadas, 0);
});

void test('modificarSlot cierra la versión vigente el día antes de la fecha de efecto y crea la versión nueva', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'GET') {
      const url = new URL(peticion.url);
      if (url.searchParams.get('id') === 'eq.s1') {
        return { estado: 200, cuerpo: [SLOT_VIGENTE] };
      }
      return { estado: 200, cuerpo: [] }; // sin otros slots vigentes que solapen
    }
    if (peticion.metodo === 'PATCH') {
      return { estado: 200, cuerpo: [] };
    }
    return { estado: 201, cuerpo: [{ ...SLOT_VIGENTE, id: 's2', hora_inicio: '19:00', hora_fin: '20:00', vigente_desde: '2026-06-01' }] };
  });

  const resultado = await modificarSlot(
    cliente,
    's1',
    { hora_inicio: '19:00', hora_fin: '20:00' },
    new Date('2026-06-01T00:00:00.000Z'),
  );

  assert.equal(resultado.slot.id, 's2');
  assert.equal(resultado.avisoSolapeProfesor, false);

  const patch = peticiones.find((p) => p.metodo === 'PATCH');
  assert.ok(patch);
  const urlPatch = new URL(patch.url);
  assert.equal(urlPatch.searchParams.get('id'), 'eq.s1');
  assert.equal((patch.cuerpo as Record<string, unknown>).vigente_hasta, '2026-05-31');

  const post = peticiones.find((p) => p.metodo === 'POST');
  assert.ok(post);
  const cuerpoPost = post.cuerpo as Record<string, unknown>;
  assert.equal(cuerpoPost.vigente_desde, '2026-06-01');
  assert.equal(cuerpoPost.hora_inicio, '19:00');
  // Los campos que modificarSlot no recibe en `cambios` se conservan de la versión actual.
  assert.equal(cuerpoPost.alumno_id, SLOT_VIGENTE.alumno_id);
  assert.equal(cuerpoPost.profesor_id, SLOT_VIGENTE.profesor_id);
});

void test('modificarSlot con fecha de efecto anterior o igual al inicio de la versión actual lanza ErrorDeValidacion', async () => {
  let sePidioEscritura = false;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo !== 'GET') {
      sePidioEscritura = true;
    }
    return { estado: 200, cuerpo: [SLOT_VIGENTE] };
  });

  await assert.rejects(
    () => modificarSlot(cliente, 's1', { hora_inicio: '19:00', hora_fin: '20:00' }, new Date('2026-01-01T00:00:00.000Z')),
    ErrorDeValidacion,
  );
  assert.equal(sePidioEscritura, false);
});

void test('modificarSlot rechaza la versión nueva si se solapa con OTRO slot vigente del mismo alumno', async () => {
  const otroSlotDelAlumno: SlotHorario = { ...SLOT_VIGENTE, id: 'otro', dia_semana: 4 };
  let sePidioEscritura = false;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'GET') {
      const url = new URL(peticion.url);
      if (url.searchParams.get('id') === 'eq.s1') {
        return { estado: 200, cuerpo: [SLOT_VIGENTE] };
      }
      return { estado: 200, cuerpo: [SLOT_VIGENTE, otroSlotDelAlumno] };
    }
    sePidioEscritura = true;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(
    () =>
      // Se cambia el día del slot s1 al 4 (jueves), el mismo día que "otro" ya ocupa a la misma hora.
      modificarSlot(cliente, 's1', { dia_semana: 4 }, new Date('2026-06-01T00:00:00.000Z')),
    ErrorDeValidacion,
  );
  assert.equal(sePidioEscritura, false);
});

void test('cesarSlot hace PATCH de vigente_hasta filtrado por id, sin crear ninguna versión nueva', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [{ ...SLOT_VIGENTE, vigente_hasta: '2026-06-01' }] };
  });

  const slot = await cesarSlot(cliente, 's1', new Date('2026-06-01T00:00:00.000Z'));

  assert.equal(slot.vigente_hasta, '2026-06-01');
  assert.equal(peticiones.length, 1);
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PATCH');
  const url = new URL(peticion.url);
  assert.equal(url.searchParams.get('id'), 'eq.s1');
  assert.equal((peticion.cuerpo as Record<string, unknown>).vigente_hasta, '2026-06-01');
});
