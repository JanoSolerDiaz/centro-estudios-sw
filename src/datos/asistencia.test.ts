import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearLimitadorTasa, ErrorLimiteAlcanzado } from '../nucleo/limitadorTasa.ts';
import {
  registrarAsistencia,
  listarAsistenciaDeHoy,
  actualizarAsistencia,
  listarRegistrosDeSlotYFecha,
  listarHistorialDeAsistencia,
} from './asistencia.ts';
import { Conflicto, ErrorDeValidacion, SinPermiso } from './erroresDominio.ts';
import type { Asistencia } from '../dominio/tipos.ts';

const FILA: Asistencia = {
  id: 'as1',
  alumno_id: 'al1',
  profesor_id: 'p1',
  registrado_en: '2026-08-31T09:00:00.000Z',
  ocurrido_en: '2026-08-31T09:00:00.000Z',
  es_retroactivo: false,
  origen: 'manual',
  slot_id: null,
  slot_dia_semana: null,
  slot_hora_inicio: null,
  slot_hora_fin: null,
  slot_asignatura_o_grupo: null,
  estado: 'valida',
  motivo_anulacion: null,
  nota: null,
  actualizado_en: null,
  actualizado_por: null,
  peticion_id: 'peticion-1',
};

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('registrarAsistencia llama a la RPC registrar_asistencia con el cuerpo esperado (registro en vivo)', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: FILA };
  });

  const fila = await registrarAsistencia(
    { postgrest },
    'p1',
    { alumnoId: 'al1', origen: 'manual', peticionId: 'peticion-1' },
  );

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/registrar_asistencia');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, {
    p_alumno_id: 'al1',
    p_origen: 'manual',
    p_peticion_id: 'peticion-1',
    p_slot_id: null,
    p_ocurrido_en: null,
    p_nota: null,
    p_profesor_id: null,
  });
  assert.deepEqual(fila, FILA);
});

void test('registrarAsistencia nunca envía registrado_en/es_retroactivo: no existen como parámetro del cuerpo', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: FILA };
  });

  await registrarAsistencia({ postgrest }, 'p1', { alumnoId: 'al1', origen: 'manual', peticionId: 'peticion-1' });

  assert.ok(peticion);
  const claves = Object.keys(peticion.cuerpo as Record<string, unknown>);
  assert.deepEqual(
    [...claves].sort(),
    ['p_alumno_id', 'p_nota', 'p_ocurrido_en', 'p_origen', 'p_peticion_id', 'p_profesor_id', 'p_slot_id'].sort(),
  );
});

void test('registrarAsistencia envía ocurrido_en como ISO cuando se informa un registro retroactivo', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...FILA, es_retroactivo: true } };
  });
  const ocurridoEn = new Date('2026-08-30T10:00:00.000Z');

  await registrarAsistencia({ postgrest }, 'p1', {
    alumnoId: 'al1',
    origen: 'manual',
    peticionId: 'peticion-2',
    ocurridoEn,
  });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_ocurrido_en, ocurridoEn.toISOString());
});

void test('registrarAsistencia con origen "slot" envía slot_id', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...FILA, origen: 'slot', slot_id: 'slot1' } };
  });

  await registrarAsistencia({ postgrest }, 'p1', {
    alumnoId: 'al1',
    origen: 'slot',
    slotId: 'slot1',
    peticionId: 'peticion-3',
  });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_slot_id, 'slot1');
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_origen, 'slot');
});

void test('registrarAsistencia (administrator) envía profesorId como p_profesor_id', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...FILA, profesor_id: 'profesor-objetivo' } };
  });

  await registrarAsistencia({ postgrest }, 'admin-1', {
    alumnoId: 'al1',
    origen: 'manual',
    peticionId: 'peticion-4',
    profesorId: 'profesor-objetivo',
  });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_profesor_id, 'profesor-objetivo');
});

void test('un teacher registrando en nombre de otro: el servidor rechaza y el error llega tipado (SinPermiso)', async () => {
  const postgrest = crearCliente(() => ({
    estado: 403,
    cuerpo: { message: 'registrar_asistencia: solo un administrador puede registrar en nombre de otro profesor' },
  }));

  await assert.rejects(
    () =>
      registrarAsistencia({ postgrest }, 'teacher-1', {
        alumnoId: 'al1',
        origen: 'manual',
        peticionId: 'peticion-5',
        profesorId: 'otro-profesor',
      }),
    SinPermiso,
  );
});

void test('alumno inactivo, origen incoherente y ocurrido_en futuro llegan como ErrorDeValidacion (400)', async () => {
  const postgrest = crearCliente(() => ({ estado: 400, cuerpo: { message: 'registrar_asistencia: ...' } }));

  await assert.rejects(
    () => registrarAsistencia({ postgrest }, 'p1', { alumnoId: 'al1', origen: 'manual', peticionId: 'peticion-6' }),
    ErrorDeValidacion,
  );
});

void test('un peticion_id repetido, o un segundo registro del mismo alumno/slot/día, llega como Conflicto (409)', async () => {
  const postgrest = crearCliente(() => ({ estado: 409, cuerpo: { message: 'duplicate key value' } }));

  await assert.rejects(
    () => registrarAsistencia({ postgrest }, 'p1', { alumnoId: 'al1', origen: 'manual', peticionId: 'peticion-1' }),
    Conflicto,
  );
});

void test('el limitador de cliente (T-06) se comprueba antes de llamar a la red, con la clave del profesor que registra', () => {
  const reloj = crearRelojFijo(new Date('2026-08-31T09:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj });
  const postgrest = crearCliente(() => ({ estado: 200, cuerpo: FILA }));

  const entrada = { alumnoId: 'al1', origen: 'manual' as const, peticionId: 'peticion-1' };
  void registrarAsistencia({ postgrest, limitador }, 'p1', entrada);

  assert.throws(() => {
    limitador.comprobar('asistencia:p1');
  }, ErrorLimiteAlcanzado);
});

void test('el límite de cliente se cuenta sobre el profesor objetivo (profesorId), no sobre quien llama', () => {
  const reloj = crearRelojFijo(new Date('2026-08-31T09:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj });
  const postgrest = crearCliente(() => ({ estado: 200, cuerpo: FILA }));

  void registrarAsistencia({ postgrest, limitador }, 'admin-1', {
    alumnoId: 'al1',
    origen: 'manual',
    peticionId: 'peticion-1',
    profesorId: 'profesor-objetivo',
  });

  assert.throws(() => {
    limitador.comprobar('asistencia:profesor-objetivo');
  }, ErrorLimiteAlcanzado);
  // El admin puede seguir registrando en nombre de OTRO profesor sin verse afectado.
  limitador.comprobar('asistencia:admin-1');
});

void test('listarAsistenciaDeHoy: una única petición, acotada al profesor, estado válido y al día natural del centro', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [FILA] };
  });

  // 2026-08-26T12:00Z es mediodía en CEST (UTC+2): el día local va de 2026-08-25T22:00Z a 2026-08-26T22:00Z.
  const filas = await listarAsistenciaDeHoy(postgrest, 'p1', new Date('2026-08-26T12:00:00.000Z'));

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'GET');
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/asistencia');
  assert.equal(url.searchParams.get('profesor_id'), 'eq.p1');
  assert.equal(url.searchParams.get('estado'), 'eq.valida');
  // El punto de los milisegundos es un carácter reservado de PostgREST (`codificadorValores.ts`):
  // el valor viaja entrecomillado, como cualquier otro valor de texto con "." en un filtro.
  assert.deepEqual(url.searchParams.getAll('ocurrido_en'), ['gte."2026-08-25T22:00:00.000Z"', 'lte."2026-08-26T21:59:59.999Z"']);
  assert.deepEqual(filas, [FILA]);
});

void test('listarAsistenciaDeHoy: admite otra zona horaria explícita', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await listarAsistenciaDeHoy(postgrest, 'p1', new Date('2026-06-10T12:00:00.000Z'), 'UTC');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.deepEqual(url.searchParams.getAll('ocurrido_en'), ['gte."2026-06-10T00:00:00.000Z"', 'lte."2026-06-10T23:59:59.999Z"']);
});

void test('actualizarAsistencia llama a la RPC actualizar_asistencia con el cuerpo esperado (solo la nota)', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...FILA, nota: 'Llegó tarde' } };
  });

  const fila = await actualizarAsistencia({ postgrest }, 'p1', {
    asistenciaId: 'as1',
    nota: 'Llegó tarde',
    notaProvista: true,
  });

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/actualizar_asistencia');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, {
    p_asistencia_id: 'as1',
    p_alumno_id: null,
    p_slot_id: null,
    p_ocurrido_en: null,
    p_anular: false,
    p_motivo_anulacion: null,
    p_nota: 'Llegó tarde',
    p_nota_provista: true,
  });
  assert.deepEqual(fila, { ...FILA, nota: 'Llegó tarde' });
});

void test('actualizarAsistencia: sin notaProvista, p_nota viaja null aunque se pase un valor (no se toca la nota)', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: FILA };
  });

  await actualizarAsistencia({ postgrest }, 'p1', { asistenciaId: 'as1', nota: 'no debería enviarse' });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_nota_provista, false);
});

void test('actualizarAsistencia: anular envía p_anular y p_motivo_anulacion', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...FILA, estado: 'anulada', motivo_anulacion: 'Registrado por error' } };
  });

  const fila = await actualizarAsistencia({ postgrest }, 'p1', {
    asistenciaId: 'as1',
    anular: true,
    motivoAnulacion: 'Registrado por error',
  });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_anular, true);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_motivo_anulacion, 'Registrado por error');
  assert.equal(fila.estado, 'anulada');
});

void test('actualizarAsistencia: anular sin motivo llega como ErrorDeValidacion (400)', async () => {
  const postgrest = crearCliente(() => ({ estado: 400, cuerpo: { message: 'actualizar_asistencia: anular exige un motivo' } }));

  await assert.rejects(() => actualizarAsistencia({ postgrest }, 'p1', { asistenciaId: 'as1', anular: true }), ErrorDeValidacion);
});

void test('actualizarAsistencia: cambiar alumno y ajustar la hora envían sus parámetros, con la fecha en ISO', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: FILA };
  });
  const ocurridoEn = new Date('2026-08-30T10:00:00.000Z');

  await actualizarAsistencia({ postgrest }, 'p1', { asistenciaId: 'as1', alumnoId: 'al2', ocurridoEn });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_alumno_id, 'al2');
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_ocurrido_en, ocurridoEn.toISOString());
});

void test('actualizarAsistencia: cambiar el slot atribuido envía p_slot_id', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ...FILA, slot_id: 'slot2' } };
  });

  await actualizarAsistencia({ postgrest }, 'p1', { asistenciaId: 'as1', slotId: 'slot2' });

  assert.ok(peticion);
  assert.equal((peticion.cuerpo as Record<string, unknown>).p_slot_id, 'slot2');
});

void test('un teacher editando el registro de otro profesor, o fuera de la ventana de edición: SinPermiso (403)', async () => {
  const postgrest = crearCliente(() => ({
    estado: 403,
    cuerpo: { message: 'actualizar_asistencia: no puedes modificar un registro de otro profesor' },
  }));

  await assert.rejects(
    () => actualizarAsistencia({ postgrest }, 'p1', { asistenciaId: 'as1', nota: 'x', notaProvista: true }),
    SinPermiso,
  );
});

void test('actualizarAsistencia: el limitador de cliente (T-06) se comprueba con la clave del profesor DUEÑO del registro', () => {
  const reloj = crearRelojFijo(new Date('2026-08-31T09:00:00.000Z'));
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj });
  const postgrest = crearCliente(() => ({ estado: 200, cuerpo: FILA }));

  void actualizarAsistencia({ postgrest, limitador }, 'profesor-dueno', { asistenciaId: 'as1', nota: 'x', notaProvista: true });

  assert.throws(() => {
    limitador.comprobar('asistencia:profesor-dueno');
  }, ErrorLimiteAlcanzado);
});

void test('listarRegistrosDeSlotYFecha: una única petición, acotada al slot y al día natural de fecha (cualquier estado)', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [FILA, { ...FILA, id: 'as2', estado: 'anulada', motivo_anulacion: 'Registrado por error' }] };
  });

  // 2026-08-26T12:00Z es mediodía en CEST (UTC+2): el día local va de 2026-08-25T22:00Z a 2026-08-26T22:00Z.
  const filas = await listarRegistrosDeSlotYFecha(postgrest, 'slot1', new Date('2026-08-26T12:00:00.000Z'));

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'GET');
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/asistencia');
  assert.equal(url.searchParams.get('slot_id'), 'eq.slot1');
  assert.equal(url.searchParams.get('estado'), null);
  assert.deepEqual(url.searchParams.getAll('ocurrido_en'), ['gte."2026-08-25T22:00:00.000Z"', 'lte."2026-08-26T21:59:59.999Z"']);
  assert.equal(filas.length, 2);
});

void test('listarRegistrosDeSlotYFecha: admite otra zona horaria explícita', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await listarRegistrosDeSlotYFecha(postgrest, 'slot1', new Date('2026-06-10T12:00:00.000Z'), 'UTC');

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.deepEqual(url.searchParams.getAll('ocurrido_en'), ['gte."2026-06-10T00:00:00.000Z"', 'lte."2026-06-10T23:59:59.999Z"']);
});

void test('listarHistorialDeAsistencia: una única petición, acotada al registro y ordenada por cambiado_en ascendente', async () => {
  let peticion: PeticionSimulada | undefined;
  const postgrest = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await listarHistorialDeAsistencia(postgrest, 'as1');

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'GET');
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/asistencia_historial');
  assert.equal(url.searchParams.get('asistencia_id'), 'eq.as1');
  assert.equal(url.searchParams.get('order'), 'cambiado_en.asc');
});
