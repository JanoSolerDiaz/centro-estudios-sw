import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearFetchSimulado,
  crearFetchSimuladoConErrorDeRed,
  type PeticionSimulada,
  type FetchSimulado,
} from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import {
  NoAutenticado,
  SinPermiso,
  Conflicto,
  ErrorDeRed,
  ErrorDelServidor,
} from './erroresDominio.ts';

interface AlumnoDePrueba {
  readonly id: string;
  readonly nombre: string;
}

function crearCliente(fetchImpl: FetchSimulado) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl,
  });
}

void test('seleccionar() con filtros construye la query string esperada y usa las cabeceras correctas', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [{ id: 'a1', nombre: 'Ana' }] };
  });
  const cliente = crearCliente(fetchImpl);

  const filas = await cliente
    .desde<AlumnoDePrueba>('alumno')
    .eq('activo', true)
    .gte('creado_en', '2026-01-01')
    .in('centro_referencia_id', ['c1', 'c2'])
    .ilike('nombre', '*ana*')
    .order('nombre')
    .limit(10)
    .seleccionar('id,nombre');

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'GET');
  assert.equal(peticion.cabeceras.apikey, 'clave-anonima');
  assert.equal(peticion.cabeceras.authorization, 'Bearer clave-anonima');
  const url = new URL(peticion.url);
  assert.equal(url.pathname, '/rest/v1/alumno');
  assert.equal(url.searchParams.get('select'), 'id,nombre');
  assert.equal(url.searchParams.get('activo'), 'eq.true');
  assert.equal(url.searchParams.get('creado_en'), 'gte.2026-01-01');
  assert.equal(url.searchParams.get('centro_referencia_id'), 'in.(c1,c2)');
  assert.equal(url.searchParams.get('nombre'), 'ilike.*ana*');
  assert.equal(url.searchParams.get('order'), 'nombre.asc');
  assert.equal(url.searchParams.get('limit'), '10');
  assert.deepEqual(filas, [{ id: 'a1', nombre: 'Ana' }]);
});

void test('eq(columna, null) genera is.null en vez de eq.null', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });
  const cliente = crearCliente(fetchImpl);

  await cliente.desde<AlumnoDePrueba>('alumno').eq('baja_en', null).seleccionar();

  const url = new URL(peticion?.url ?? '');
  assert.equal(url.searchParams.get('baja_en'), 'is.null');
});

void test('order(columna, { descendente: true }) genera .desc', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });
  await crearCliente(fetchImpl).desde<AlumnoDePrueba>('alumno').order('creado_en', { descendente: true }).seleccionar();

  const url = new URL(peticion?.url ?? '');
  assert.equal(url.searchParams.get('order'), 'creado_en.desc');
});

void test('seleccionar() admite un recurso embebido en la cadena de select sin transformarla', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return {
      estado: 200,
      cuerpo: [{ id: 'a1', nombre: 'Ana', centro: { id: 'c1', nombre: 'IES Uno' } }],
    };
  });

  await crearCliente(fetchImpl)
    .desde('alumno')
    .eq('id', 'a1')
    .seleccionar('id,nombre,centro:centro_estudios(id,nombre)');

  const url = new URL(peticion?.url ?? '');
  assert.equal(url.searchParams.get('select'), 'id,nombre,centro:centro_estudios(id,nombre)');
});

void test('seleccionarConTotal() manda Range/Range-Unit y Prefer count=exact, y lee Content-Range', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return {
      estado: 200,
      cuerpo: [{ id: 'a1', nombre: 'Ana' }],
      cabeceras: { 'content-range': '0-0/38' },
    };
  });

  const resultado = await crearCliente(fetchImpl).desde<AlumnoDePrueba>('alumno').range(0, 9).seleccionarConTotal();

  assert.ok(peticion);
  assert.equal(peticion.cabeceras.range, '0-9');
  assert.equal(peticion.cabeceras['range-unit'], 'items');
  assert.equal(peticion.cabeceras.prefer, 'count=exact');
  assert.deepEqual(resultado.filas, [{ id: 'a1', nombre: 'Ana' }]);
  assert.equal(resultado.totalAproximado, 38);
});

void test('seleccionarConTotal() devuelve totalAproximado null cuando Content-Range es "*"', async () => {
  const fetchImpl = crearFetchSimulado(() => ({
    estado: 200,
    cuerpo: [],
    cabeceras: { 'content-range': '0-0/*' },
  }));

  const resultado = await crearCliente(fetchImpl).desde<AlumnoDePrueba>('alumno').range(0, 9).seleccionarConTotal();

  assert.equal(resultado.totalAproximado, null);
});

void test('insertar() manda POST con Prefer return=representation y el cuerpo tal cual', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 201, cuerpo: [{ id: 'nuevo', nombre: 'X' }] };
  });

  const filas = await crearCliente(fetchImpl).desde<AlumnoDePrueba>('alumno').insertar({ nombre: 'X' });

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'POST');
  assert.equal(peticion.cabeceras.prefer, 'return=representation');
  assert.deepEqual(peticion.cuerpo, { nombre: 'X' });
  assert.deepEqual(filas, [{ id: 'nuevo', nombre: 'X' }]);
});

void test('actualizar() manda PATCH con los filtros aplicados y el cuerpo de cambios', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [{ id: 'a1', nombre: 'Nuevo nombre' }] };
  });

  await crearCliente(fetchImpl).desde<AlumnoDePrueba>('alumno').eq('id', 'a1').actualizar({ nombre: 'Nuevo nombre' });

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'PATCH');
  const url = new URL(peticion.url);
  assert.equal(url.searchParams.get('id'), 'eq.a1');
  assert.deepEqual(peticion.cuerpo, { nombre: 'Nuevo nombre' });
});

void test('insertar(filas, { representar: false }) manda Prefer return=minimal y no lee cuerpo', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 201, cuerpo: undefined };
  });

  const filas = await crearCliente(fetchImpl)
    .desde<AlumnoDePrueba>('alumno')
    .insertar({ nombre: 'X' }, { representar: false });

  assert.ok(peticion);
  assert.equal(peticion.cabeceras.prefer, 'return=minimal');
  assert.deepEqual(filas, []);
});

void test('actualizar(cambios, { representar: false }) manda Prefer return=minimal', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 204, cuerpo: undefined };
  });

  await crearCliente(fetchImpl)
    .desde<AlumnoDePrueba>('alumno')
    .eq('id', 'a1')
    .actualizar({ nombre: 'Nuevo' }, { representar: false });

  assert.ok(peticion);
  assert.equal(peticion.cabeceras.prefer, 'return=minimal');
});

void test('orIlike(columnas, patron) genera un único or=(...) con ilike sobre cada columna', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await crearCliente(fetchImpl)
    .desde<AlumnoDePrueba>('alumno')
    .orIlike(['nombre', 'primer_apellido', 'segundo_apellido'], '*garcía*')
    .seleccionar();

  assert.ok(peticion);
  const url = new URL(peticion.url);
  assert.equal(
    url.searchParams.get('or'),
    '(nombre.ilike.*garcía*,primer_apellido.ilike.*garcía*,segundo_apellido.ilike.*garcía*)',
  );
});

void test('eliminar() manda DELETE con los filtros aplicados y sin cuerpo', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 204, cuerpo: undefined };
  });

  await crearCliente(fetchImpl).desde('persona_referencia').eq('id', 'p1').eliminar();

  assert.ok(peticion);
  assert.equal(peticion.metodo, 'DELETE');
  assert.equal(peticion.cabeceras['content-type'], undefined);
});

void test('rpc() manda POST a /rest/v1/rpc/<nombre> con los parámetros como cuerpo', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: { ok: true } };
  });

  const resultado = await crearCliente(fetchImpl).rpc<{ ok: boolean }>('registrar_evento_error', { p_origen: 'capa_datos' });

  assert.ok(peticion);
  assert.equal(peticion.url, 'https://proyecto.supabase.co/rest/v1/rpc/registrar_evento_error');
  assert.equal(peticion.metodo, 'POST');
  assert.deepEqual(peticion.cuerpo, { p_origen: 'capa_datos' });
  assert.deepEqual(resultado, { ok: true });
});

void test('rpc() sin parámetros manda un cuerpo {} vacío', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 204, cuerpo: undefined };
  });

  await crearCliente(fetchImpl).rpc('alguna_funcion');

  assert.deepEqual(peticion?.cuerpo, {});
});

void test('rpc() con señal la propaga hasta fetch (T-20, cancelación de búsqueda)', async () => {
  let señalRecibida: AbortSignal | undefined;
  const fetchImpl: FetchSimulado = (_url, init) => {
    señalRecibida = init?.signal ?? undefined;
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  };
  const controlador = new AbortController();

  await crearCliente(fetchImpl).rpc('buscar_alumnos_activos', { p_texto: 'ab' }, controlador.signal);

  assert.equal(señalRecibida, controlador.signal);
});

void test('rpc() con una señal ya abortada rechaza con AbortError, sin traducirlo a un error de dominio', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 200, cuerpo: [] }));
  const controlador = new AbortController();
  controlador.abort();

  await assert.rejects(
    crearCliente(fetchImpl).rpc('buscar_alumnos_activos', { p_texto: 'ab' }, controlador.signal),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
});

void test('rpc() sin señal no le pasa signal a fetch', async () => {
  let init: RequestInit | undefined;
  const fetchImpl: FetchSimulado = (_url, initRecibido) => {
    init = initRecibido;
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  };

  await crearCliente(fetchImpl).rpc('alguna_funcion');

  assert.equal(init?.signal, undefined);
});

void test('usa el token de sesión en vez de la clave anónima cuando hay uno', async () => {
  let peticion: PeticionSimulada | undefined;
  const fetchImpl = crearFetchSimulado((p) => {
    peticion = p;
    return { estado: 200, cuerpo: [] };
  });

  await crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    obtenerTokenSesion: () => 'token-de-sesion',
    fetchImpl,
  })
    .desde('alumno')
    .seleccionar();

  assert.equal(peticion?.cabeceras.authorization, 'Bearer token-de-sesion');
});

void test('un 401 se traduce a NoAutenticado', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 401, cuerpo: { message: 'JWT expired' } }));
  await assert.rejects(() => crearCliente(fetchImpl).desde('alumno').seleccionar(), NoAutenticado);
});

void test('un 403 se traduce a SinPermiso', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 403, cuerpo: { message: 'RLS denied' } }));
  await assert.rejects(() => crearCliente(fetchImpl).desde('persona_referencia').seleccionar(), SinPermiso);
});

void test('un 409 se traduce a Conflicto', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 409, cuerpo: { message: 'duplicate key' } }));
  await assert.rejects(() => crearCliente(fetchImpl).desde('alumno').insertar({ nombre: 'X' }), Conflicto);
});

void test('un fallo de red se traduce a ErrorDeRed', async () => {
  const fetchImpl = crearFetchSimuladoConErrorDeRed();
  await assert.rejects(() => crearCliente(fetchImpl).desde('alumno').seleccionar(), ErrorDeRed);
});

void test('una respuesta 200 con un cuerpo que no es JSON válido se traduce a ErrorDelServidor', async () => {
  const fetchImpl: FetchSimulado = () =>
    Promise.resolve(new Response('esto no es json', { status: 200, headers: { 'content-type': 'application/json' } }));

  await assert.rejects(() => crearCliente(fetchImpl).desde('alumno').seleccionar(), ErrorDelServidor);
});

void test('una respuesta 200 con un cuerpo JSON que no es un array se traduce a ErrorDelServidor en seleccionar()', async () => {
  const fetchImpl = crearFetchSimulado(() => ({ estado: 200, cuerpo: { no: 'es una lista' } }));
  await assert.rejects(() => crearCliente(fetchImpl).desde('alumno').seleccionar(), ErrorDelServidor);
});

void test('un AbortError se propaga tal cual, sin traducirse a ErrorDeRed', async () => {
  const fetchImpl: FetchSimulado = () => Promise.reject(new DOMException('cancelado', 'AbortError'));

  await assert.rejects(
    () => crearCliente(fetchImpl).desde('alumno').seleccionar(),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
});
