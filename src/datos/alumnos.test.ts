import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import {
  listarAlumnos,
  obtenerAlumno,
  crearAlumno,
  editarAlumno,
  darDeBajaAlumno,
  reactivarAlumno,
  buscarAlumnosParaExtra,
  LIMITE_BUSQUEDA_ALUMNO_EXTRA,
  obtenerAlumnoParaTarjeta,
  resolverIdentificacionAlumnos,
  resolverContactoAlumnos,
} from './alumnos.ts';
import { ErrorDeValidacion, SinPermiso } from './erroresDominio.ts';
import type { AlumnoConCentro, AlumnoConCentroYPersonas } from './alumnos.ts';

const GARCIA: AlumnoConCentro = {
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

/** Con las personas de referencia embebidas (T-13): la forma que devuelven de verdad
 * `obtenerAlumno`/`crearAlumno`/`editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno`, todas operan
 * sobre un único alumno y por eso traen `personas_referencia` en la misma petición — a diferencia
 * de `listarAlumnos`, que sigue devolviendo `GARCIA` (`AlumnoConCentro`) a secas. */
const GARCIA_CON_PERSONAS: AlumnoConCentroYPersonas = { ...GARCIA, personas_referencia: [] };

function crearCliente(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

void test('listarAlumnos lee de alumno_ficha con el centro embebido, paginado en servidor', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [GARCIA], cabeceras: { 'content-range': '0-0/1' } };
  });

  const resultado = await listarAlumnos(cliente, { pagina: 1, porPagina: 5 });

  assert.equal(peticiones.length, 1);
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/alumno_ficha');
  assert.equal(
    url.searchParams.get('select'),
    'id,nombre,primer_apellido,segundo_apellido,centro_referencia_id,email_alumno,telefono_alumno,' +
      'activo,alta_en,baja_en,motivo_baja,usuario_id,creado_en,actualizado_en,centro:centro_estudios(id,nombre)',
  );
  const peticion = peticiones[0];
  assert.ok(peticion);
  assert.equal(peticion.cabeceras.range, '5-9');
  assert.deepEqual(resultado.alumnos, [GARCIA]);
  assert.equal(resultado.totalAproximado, 1);
});

void test('listarAlumnos no pide avatar_ruta (P-02, minimización de datos: la lista no lo pinta)', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [GARCIA] };
  });

  await listarAlumnos(cliente);

  const select = new URL(peticiones[0]?.url ?? '').searchParams.get('select') ?? '';
  assert.ok(!select.split(',').includes('avatar_ruta'));
});

void test('listarAlumnos({ estado: "inactivos" }) filtra activo=eq.false', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [] };
  });

  await listarAlumnos(cliente, { estado: 'inactivos' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.searchParams.get('activo'), 'eq.false');
});

void test('listarAlumnos({ busqueda }) usa un único or=(...) sobre nombre y los dos apellidos', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [] };
  });

  await listarAlumnos(cliente, { busqueda: 'garcía' });

  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(
    url.searchParams.get('or'),
    '(nombre.ilike.*garcía*,primer_apellido.ilike.*garcía*,segundo_apellido.ilike.*garcía*)',
  );
});

void test('obtenerAlumno lee una fila de alumno_ficha filtrada por id, con las personas de referencia embebidas en la misma petición', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: [GARCIA_CON_PERSONAS] };
  });

  const alumno = await obtenerAlumno(cliente, 'a1');

  assert.deepEqual(alumno, GARCIA_CON_PERSONAS);
  assert.equal(peticiones.length, 1, 'la ficha completa se carga en una sola petición');
  const url = new URL(peticiones[0]?.url ?? '');
  assert.equal(url.pathname, '/rest/v1/alumno_ficha');
  assert.equal(url.searchParams.get('id'), 'eq.a1');
  assert.equal(
    url.searchParams.get('select'),
    '*,centro:centro_estudios(id,nombre),personas_referencia:persona_referencia(*)',
  );
});

void test('crearAlumno inserta con un id generado en el cliente, Prefer return=minimal, y relee la ficha', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'POST') {
      return { estado: 201, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [GARCIA_CON_PERSONAS] };
  });

  const alumno = await crearAlumno(cliente, {
    nombre: 'Ana',
    primer_apellido: 'García',
    centro_referencia_id: 'c1',
  });

  assert.deepEqual(alumno, GARCIA_CON_PERSONAS);
  const insercion = peticiones.find((p) => p.metodo === 'POST');
  assert.ok(insercion);
  assert.equal(insercion.cabeceras.prefer, 'return=minimal');
  const cuerpo = insercion.cuerpo as Record<string, unknown>;
  assert.equal(typeof cuerpo.id, 'string');
  assert.ok((cuerpo.id as string).length > 0);
  assert.equal(cuerpo.segundo_apellido, null);
  assert.equal(cuerpo.email_alumno, null);
  assert.equal(cuerpo.telefono_alumno, null);

  const lectura = peticiones.find((p) => p.metodo === 'GET');
  assert.ok(lectura);
  const url = new URL(lectura.url);
  assert.equal(url.pathname, '/rest/v1/alumno_ficha');
  assert.equal(url.searchParams.get('id'), `eq.${cuerpo.id as string}`);
});

void test('crearAlumno con segundo apellido, email y teléfono los normaliza antes de insertar', async () => {
  let cuerpoInsertado: Record<string, unknown> | undefined;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'POST') {
      cuerpoInsertado = peticion.cuerpo as Record<string, unknown>;
      return { estado: 201, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [GARCIA] };
  });

  await crearAlumno(cliente, {
    nombre: '  Ana  ',
    primer_apellido: ' García ',
    segundo_apellido: '  Pérez  ',
    centro_referencia_id: 'c1',
    email_alumno: '  ana@ejemplo.com  ',
    telefono_alumno: '666 12 34 56',
  });

  assert.ok(cuerpoInsertado);
  assert.equal(cuerpoInsertado.nombre, 'Ana');
  assert.equal(cuerpoInsertado.primer_apellido, 'García');
  assert.equal(cuerpoInsertado.segundo_apellido, 'Pérez');
  assert.equal(cuerpoInsertado.email_alumno, 'ana@ejemplo.com');
  assert.equal(cuerpoInsertado.telefono_alumno, '666123456');
});

void test('crearAlumno sin centro_referencia_id lanza ErrorDeValidacion sin llamar a la red', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(
    () => crearAlumno(cliente, { nombre: 'Ana', primer_apellido: 'García', centro_referencia_id: '  ' }),
    ErrorDeValidacion,
  );
  assert.equal(llamadas, 0);
});

void test('crearAlumno con nombre vacío lanza ErrorDeValidacion', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));

  await assert.rejects(
    () => crearAlumno(cliente, { nombre: '   ', primer_apellido: 'García', centro_referencia_id: 'c1' }),
    ErrorDeValidacion,
  );
});

void test('crearAlumno con email sin formato válido lanza ErrorDeValidacion', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));

  await assert.rejects(
    () =>
      crearAlumno(cliente, {
        nombre: 'Ana',
        primer_apellido: 'García',
        centro_referencia_id: 'c1',
        email_alumno: 'no-es-un-email',
      }),
    ErrorDeValidacion,
  );
});

void test('crearAlumno con teléfono sin formato español válido lanza ErrorDeValidacion', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));

  await assert.rejects(
    () =>
      crearAlumno(cliente, {
        nombre: 'Ana',
        primer_apellido: 'García',
        centro_referencia_id: 'c1',
        telefono_alumno: '12345',
      }),
    ErrorDeValidacion,
  );
});

void test('editarAlumno hace PATCH con Prefer return=minimal y relee la ficha por id', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'PATCH') {
      return { estado: 204, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [{ ...GARCIA, nombre: 'Ana María' }] };
  });

  const alumno = await editarAlumno(cliente, 'a1', {
    nombre: 'Ana María',
    primer_apellido: 'García',
    centro_referencia_id: 'c1',
  });

  assert.equal(alumno.nombre, 'Ana María');
  const patch = peticiones.find((p) => p.metodo === 'PATCH');
  assert.ok(patch);
  assert.equal(patch.cabeceras.prefer, 'return=minimal');
  const url = new URL(patch.url);
  assert.equal(url.searchParams.get('id'), 'eq.a1');
});

void test('darDeBajaAlumno fija activo=false, baja_en al instante del reloj inyectado y motivo_baja', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'PATCH') {
      return { estado: 204, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [{ ...GARCIA, activo: false }] };
  });
  const reloj = crearRelojFijo(new Date('2026-08-28T10:00:00.000Z'));

  await darDeBajaAlumno(cliente, reloj, 'a1', 'Cambio de centro');

  const patch = peticiones.find((p) => p.metodo === 'PATCH');
  assert.ok(patch);
  assert.deepEqual(patch.cuerpo, {
    activo: false,
    baja_en: '2026-08-28T10:00:00.000Z',
    motivo_baja: 'Cambio de centro',
  });
});

void test('darDeBajaAlumno sin motivo lo deja en null', async () => {
  let cuerpoPatch: Record<string, unknown> | undefined;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'PATCH') {
      cuerpoPatch = peticion.cuerpo as Record<string, unknown>;
      return { estado: 204, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [{ ...GARCIA, activo: false }] };
  });
  const reloj = crearRelojFijo(new Date('2026-08-28T10:00:00.000Z'));

  await darDeBajaAlumno(cliente, reloj, 'a1');

  assert.equal(cuerpoPatch?.motivo_baja, null);
});

void test('reactivarAlumno fija activo=true y limpia baja_en/motivo_baja', async () => {
  let cuerpoPatch: Record<string, unknown> | undefined;
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'PATCH') {
      cuerpoPatch = peticion.cuerpo as Record<string, unknown>;
      return { estado: 204, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [{ ...GARCIA, activo: true, baja_en: null, motivo_baja: null }] };
  });

  const alumno = await reactivarAlumno(cliente, 'a1');

  assert.equal(alumno.activo, true);
  assert.deepEqual(cuerpoPatch, { activo: true, baja_en: null, motivo_baja: null });
});

void test('un teacher (rechazado por RLS al escribir) recibe SinPermiso, no un error genérico', async () => {
  const cliente = crearCliente((peticion) => {
    if (peticion.metodo === 'POST') {
      return { estado: 403, cuerpo: { message: 'new row violates row-level security policy' } };
    }
    return { estado: 200, cuerpo: [] };
  });

  await assert.rejects(
    () => crearAlumno(cliente, { nombre: 'Ana', primer_apellido: 'García', centro_referencia_id: 'c1' }),
    SinPermiso,
  );
});

void test('dar de baja a un alumno no envía ninguna petición a asistencia ni a slot_horario', async () => {
  const peticiones: PeticionSimulada[] = [];
  const cliente = crearCliente((peticion) => {
    peticiones.push(peticion);
    if (peticion.metodo === 'PATCH') {
      return { estado: 204, cuerpo: undefined };
    }
    return { estado: 200, cuerpo: [{ ...GARCIA, activo: false }] };
  });
  const reloj = crearRelojFijo(new Date('2026-08-28T10:00:00.000Z'));

  await darDeBajaAlumno(cliente, reloj, 'a1');

  assert.ok(
    !peticiones.some((p) => p.url.includes('/asistencia') || p.url.includes('/slot_horario')),
    'la baja de un alumno no debe tocar asistencia ni slot_horario',
  );
});

void test('este módulo no expone ninguna operación de borrado de alumno', async () => {
  const modulo = (await import('./alumnos.ts')) as Record<string, unknown>;
  const nombresExportados = Object.keys(modulo);
  assert.ok(
    nombresExportados.every((nombre) => !/eliminar|borrar/i.test(nombre)),
    `no debe existir ninguna función de borrado; exportado: ${nombresExportados.join(', ')}`,
  );
});

// --- buscarAlumnosParaExtra (T-20) --------------------------------------------------------------

void test('buscarAlumnosParaExtra llama a la RPC buscar_alumnos_activos con el texto recortado y el límite por defecto', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await buscarAlumnosParaExtra(cliente, '  ana  ');

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/buscar_alumnos_activos');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, { p_texto: 'ana', p_limite: LIMITE_BUSQUEDA_ALUMNO_EXTRA });
});

void test('buscarAlumnosParaExtra con texto vacío o solo espacios no llama al servidor', async () => {
  let seLlamo = false;
  const cliente = crearCliente(() => {
    seLlamo = true;
    return { estado: 200, cuerpo: [] };
  });

  assert.deepEqual(await buscarAlumnosParaExtra(cliente, ''), []);
  assert.deepEqual(await buscarAlumnosParaExtra(cliente, '   '), []);
  assert.equal(seLlamo, false);
});

void test('buscarAlumnosParaExtra devuelve las filas de la RPC tal cual, incluido centro_nombre', async () => {
  const filas = [
    { id: 'a1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null, centro_nombre: 'IES Cervantes' },
  ];
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: filas }));

  const resultado = await buscarAlumnosParaExtra(cliente, 'an');

  assert.deepEqual(resultado, filas);
});

void test('buscarAlumnosParaExtra propaga la señal de cancelación hasta fetch', async () => {
  let señalRecibida: AbortSignal | undefined;
  const cliente = crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: (_url, init) => {
      señalRecibida = init?.signal ?? undefined;
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    },
  });
  const controlador = new AbortController();

  await buscarAlumnosParaExtra(cliente, 'ana', controlador.signal);

  assert.equal(señalRecibida, controlador.signal);
});

void test('buscarAlumnosParaExtra: si el servidor rechaza (student), el error de dominio se propaga', async () => {
  const cliente = crearCliente(() => ({
    estado: 403,
    cuerpo: { message: 'solo administrator o teacher pueden buscar alumnos' },
  }));

  await assert.rejects(buscarAlumnosParaExtra(cliente, 'ana'), SinPermiso);
});

// --- obtenerAlumnoParaTarjeta (T-20) ------------------------------------------------------------

void test('obtenerAlumnoParaTarjeta lee de la tabla base alumno, columnas de identificación exactas', async () => {
  let peticion: PeticionSimulada | undefined;
  const fila = {
    id: 'a1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
    avatar_ruta: 'alumno/a1/foo/',
    activo: true,
  };
  const cliente = crearCliente((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [fila] };
  });

  const resultado = await obtenerAlumnoParaTarjeta(cliente, 'a1');

  assert.ok(peticion);
  assert.ok(peticion.url.startsWith('https://proyecto.supabase.co/rest/v1/alumno?'));
  assert.ok(peticion.url.includes('id=eq.a1'));
  assert.ok(peticion.url.includes('select=id,nombre,primer_apellido,segundo_apellido,avatar_ruta,activo'));
  assert.deepEqual(resultado, fila);
});

void test('obtenerAlumnoParaTarjeta lanza ErrorDelServidor si el servidor no devuelve ninguna fila', async () => {
  const cliente = crearCliente(() => ({ estado: 200, cuerpo: [] }));
  await assert.rejects(obtenerAlumnoParaTarjeta(cliente, 'no-existe'));
});

// --- resolverIdentificacionAlumnos (T-23, histórico de asistencia) ------------------------------

void test('resolverIdentificacionAlumnos: con ids vacío, no hace ninguna petición y devuelve un mapa vacío', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  const mapa = await resolverIdentificacionAlumnos(cliente, []);

  assert.equal(llamadas, 0);
  assert.equal(mapa.size, 0);
});

void test('resolverIdentificacionAlumnos: una única petición en lote (in), columnas de identificación', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return {
      estado: 200,
      cuerpo: [
        { id: 'a1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null },
        { id: 'a2', nombre: 'Luis', primer_apellido: 'Pérez', segundo_apellido: 'Ruiz' },
      ],
    };
  });

  const mapa = await resolverIdentificacionAlumnos(cliente, ['a1', 'a2']);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/alumno');
  assert.equal(url.searchParams.get('id'), 'in.(a1,a2)');
  assert.equal(url.searchParams.get('select'), 'id,nombre,primer_apellido,segundo_apellido');
  assert.equal(mapa.size, 2);
  assert.deepEqual(mapa.get('a1'), { id: 'a1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null });
  assert.equal(mapa.get('a2')?.nombre, 'Luis');
});

void test('resolverIdentificacionAlumnos: un id sin fila devuelta (p. ej. de baja, para un teacher) simplemente falta en el mapa', async () => {
  const cliente = crearCliente(() => ({
    estado: 200,
    cuerpo: [{ id: 'a1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null }],
  }));

  const mapa = await resolverIdentificacionAlumnos(cliente, ['a1', 'a2-de-baja']);

  assert.equal(mapa.size, 1);
  assert.equal(mapa.has('a2-de-baja'), false);
});

// --- resolverContactoAlumnos (T-23, exportación con datos de contacto) --------------------------

void test('resolverContactoAlumnos: con ids vacío, no hace ninguna petición y devuelve un mapa vacío', async () => {
  let llamadas = 0;
  const cliente = crearCliente(() => {
    llamadas += 1;
    return { estado: 200, cuerpo: [] };
  });

  const mapa = await resolverContactoAlumnos(cliente, []);

  assert.equal(llamadas, 0);
  assert.equal(mapa.size, 0);
});

void test('resolverContactoAlumnos: una única petición en lote (in) contra alumno_ficha', async () => {
  let peticion: PeticionSimulada | undefined;
  const cliente = crearCliente((p) => {
    peticion = p;
    return {
      estado: 200,
      cuerpo: [{ id: 'a1', email_alumno: 'ana@ejemplo.com', telefono_alumno: '666123456' }],
    };
  });

  const mapa = await resolverContactoAlumnos(cliente, ['a1']);

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/alumno_ficha');
  assert.equal(url.searchParams.get('id'), 'in.(a1)');
  assert.equal(url.searchParams.get('select'), 'id,email_alumno,telefono_alumno');
  assert.deepEqual(mapa.get('a1'), { id: 'a1', email_alumno: 'ana@ejemplo.com', telefono_alumno: '666123456' });
});
