import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearGestorSesion, PerfilInactivo } from './gestorSesion.ts';
import { crearAlmacenSesionEnMemoria } from './almacenSesion.ts';
import { crearLogger, type EntradaLog } from './registro.ts';
import { CredencialesInvalidas } from '../datos/autenticacion.ts';
import type { ClienteAutenticacion, SesionGoTrue } from '../datos/autenticacion.ts';
import { NoAutenticado } from '../datos/erroresDominio.ts';
import { crearFetchSimulado, type PeticionSimulada } from '../datos/pruebas/dobleHttp.ts';
import type { Reloj } from './reloj.ts';
import type { Perfil } from '../dominio/tipos.ts';

const OPCIONES_BASE = { urlBase: 'https://proyecto.supabase.co', claveAnonima: 'clave-anonima' };

const SESION_1: SesionGoTrue = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiraEnMs: new Date('2026-08-27T10:00:00.000Z').getTime() + 3600_000,
  usuarioId: 'usuario-1',
};

const PERFIL_ADMIN: Perfil = {
  id: 'usuario-1',
  nombre: 'Ana Admin',
  rol: 'administrator',
  activo: true,
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
};

function crearRelojMutable(inicial: Date): { reloj: Reloj; avanzar: (ms: number) => void } {
  let actual = inicial;
  return {
    reloj: { ahora: () => actual },
    avanzar: (ms) => {
      actual = new Date(actual.getTime() + ms);
    },
  };
}

/** Doble mínimo de `ClienteAutenticacion`: cada método no sobrescrito rechaza con un error claro
 * si se llama sin que el test lo esperara, para que un uso inesperado falle ruidosamente. */
function crearClienteAutenticacionFalso(
  overrides: Partial<ClienteAutenticacion> = {},
): ClienteAutenticacion {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`ClienteAutenticacion falso: ${metodo} no se esperaba en este test`));
  return {
    iniciarSesion: overrides.iniciarSesion ?? noImplementado('iniciarSesion'),
    cerrarSesion: overrides.cerrarSesion ?? noImplementado('cerrarSesion'),
    renovarSesion: overrides.renovarSesion ?? noImplementado('renovarSesion'),
    solicitarRecuperacionContrasena: overrides.solicitarRecuperacionContrasena ?? noImplementado('solicitarRecuperacionContrasena'),
    establecerContrasenaNueva: overrides.establecerContrasenaNueva ?? noImplementado('establecerContrasenaNueva'),
  };
}

function fetchPerfil(perfil: Perfil | undefined, peticiones: PeticionSimulada[]) {
  return crearFetchSimulado((peticion) => {
    peticiones.push(peticion);
    return { estado: 200, cuerpo: perfil ? [perfil] : [] };
  });
}

function crearLoggerDePrueba(): { logger: ReturnType<typeof crearLogger>; entradas: EntradaLog[] } {
  const entradas: EntradaLog[] = [];
  return { logger: crearLogger((entrada) => entradas.push(entrada), 'debug'), entradas };
}

void test('login correcto: perfil activo, estado autenticado, token accesible, refresh guardado', async () => {
  const peticiones: PeticionSimulada[] = [];
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, peticiones),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
    }),
  });

  await gestor.iniciarSesion('admin@ejemplo.es', 'contrasena-correcta');

  const estado = gestor.obtenerEstado();
  assert.equal(estado.tipo, 'autenticado');
  assert.equal((estado as { perfil: Perfil }).perfil.rol, 'administrator');
  assert.equal(gestor.obtenerTokenSesion(), 'access-1');
  assert.deepEqual(almacen.leer(), { refreshToken: 'refresh-1' });
  assert.equal(peticiones.length, 1);
});

void test('login con contraseña errónea: no cambia el estado, no persiste nada', async () => {
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.reject(new CredencialesInvalidas()),
    }),
  });

  await assert.rejects(() => gestor.iniciarSesion('admin@ejemplo.es', 'mal'), CredencialesInvalidas);
  assert.equal(gestor.obtenerEstado().tipo, 'restaurando');
  assert.equal(almacen.leer(), null);
  assert.equal(gestor.obtenerTokenSesion(), undefined);
});

void test('login con perfil inactivo: se rechaza con PerfilInactivo, se revoca en el servidor, no queda sesión', async () => {
  const peticiones: PeticionSimulada[] = [];
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  let cerrarSesionLlamadaCon: string | undefined;
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil({ ...PERFIL_ADMIN, activo: false }, peticiones),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
      cerrarSesion: (token) => {
        cerrarSesionLlamadaCon = token;
        return Promise.resolve();
      },
    }),
  });

  await assert.rejects(() => gestor.iniciarSesion('admin@ejemplo.es', 'contrasena-correcta'), PerfilInactivo);

  assert.equal(gestor.obtenerEstado().tipo, 'restaurando');
  assert.equal(almacen.leer(), null);
  assert.equal(cerrarSesionLlamadaCon, 'access-1');
});

void test('ausencia de sesión: restaurar sin nada guardado deja sin_sesion sin llamar a la red', async () => {
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  const peticionesPerfil: PeticionSimulada[] = [];
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, peticionesPerfil),
    clienteAutenticacion: crearClienteAutenticacionFalso(),
  });

  await gestor.restaurar();

  assert.equal(gestor.obtenerEstado().tipo, 'sin_sesion');
  assert.equal(peticionesPerfil.length, 0);
});

void test('restaurar con refresh_token guardado y renovación exitosa: vuelve a autenticado', async () => {
  const almacen = crearAlmacenSesionEnMemoria();
  almacen.guardar({ refreshToken: 'refresh-1' });
  const peticiones: PeticionSimulada[] = [];
  const { logger } = crearLoggerDePrueba();
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, peticiones),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      renovarSesion: (token) => (token === 'refresh-1' ? Promise.resolve(SESION_1) : Promise.reject(new NoAutenticado())),
    }),
  });

  await gestor.restaurar();

  assert.equal(gestor.obtenerEstado().tipo, 'autenticado');
  assert.equal(gestor.obtenerTokenSesion(), 'access-1');
});

void test('restaurar con refresh_token inválido: cae a sin_sesion y borra el almacén', async () => {
  const almacen = crearAlmacenSesionEnMemoria();
  almacen.guardar({ refreshToken: 'refresh-caducado' });
  const { logger, entradas } = crearLoggerDePrueba();
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      renovarSesion: () => Promise.reject(new NoAutenticado()),
    }),
  });

  await gestor.restaurar();

  assert.equal(gestor.obtenerEstado().tipo, 'sin_sesion');
  assert.equal(almacen.leer(), null);
  assert.ok(entradas.some((entrada) => entrada.nivel === 'warn'));
});

void test('renovación proactiva al abrir pasar lista: si el token está fresco, no llama a renovar', async () => {
  const { reloj } = crearRelojMutable(new Date('2026-08-27T10:00:00.000Z'));
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  let renovarLlamado = 0;
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    reloj,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
      renovarSesion: () => {
        renovarLlamado += 1;
        return Promise.reject(new Error('no debería llamarse: el token todavía es fresco'));
      },
    }),
  });
  await gestor.iniciarSesion('admin@ejemplo.es', 'contrasena-correcta');

  await gestor.renovarAlAbrirPasarLista();

  assert.equal(renovarLlamado, 0);
});

void test('renovación proactiva al abrir pasar lista: token a punto de caducar se renueva SIN esperar un 401', async () => {
  const { reloj, avanzar } = crearRelojMutable(new Date('2026-08-27T10:00:00.000Z'));
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  let renovarLlamado = 0;
  const sesionRenovada: SesionGoTrue = { ...SESION_1, accessToken: 'access-2', refreshToken: 'refresh-2' };
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    reloj,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
      renovarSesion: () => {
        renovarLlamado += 1;
        return Promise.resolve(sesionRenovada);
      },
    }),
  });
  await gestor.iniciarSesion('admin@ejemplo.es', 'contrasena-correcta');

  // SESION_1 caduca a las 11:00; avanzamos a las 10:56, dentro del margen de 5 minutos.
  avanzar(56 * 60 * 1000);
  await gestor.renovarAlAbrirPasarLista();

  assert.equal(renovarLlamado, 1);
  assert.equal(gestor.obtenerTokenSesion(), 'access-2');
  assert.deepEqual(almacen.leer(), { refreshToken: 'refresh-2' });
  // El estado sigue autenticado con el mismo perfil: la renovación no reinicia la pantalla.
  assert.equal(gestor.obtenerEstado().tipo, 'autenticado');
});

void test('renovación proactiva fallida: no cierra la sesión ni pierde el estado, y avisa por el logger', async () => {
  const { reloj, avanzar } = crearRelojMutable(new Date('2026-08-27T10:00:00.000Z'));
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger, entradas } = crearLoggerDePrueba();
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    reloj,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
      renovarSesion: () => Promise.reject(new Error('fallo de red simulado durante la renovación')),
    }),
  });
  await gestor.iniciarSesion('admin@ejemplo.es', 'contrasena-correcta');
  avanzar(56 * 60 * 1000);

  await assert.rejects(() => gestor.renovarAlAbrirPasarLista());

  // Sigue autenticado, con el token ANTERIOR (no se ha perdido nada de lo que había en pantalla).
  const estado = gestor.obtenerEstado();
  assert.equal(estado.tipo, 'autenticado');
  assert.equal(gestor.obtenerTokenSesion(), 'access-1');
  assert.deepEqual(almacen.leer(), { refreshToken: 'refresh-1' });
  assert.ok(entradas.some((entrada) => entrada.nivel === 'warn'));
});

void test('cerrar sesión: limpia estado y almacén, y revoca en el servidor con el token correcto', async () => {
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  let cerrarSesionLlamadaCon: string | undefined;
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
      cerrarSesion: (token) => {
        cerrarSesionLlamadaCon = token;
        return Promise.resolve();
      },
    }),
  });
  await gestor.iniciarSesion('admin@ejemplo.es', 'contrasena-correcta');

  await gestor.cerrarSesion();

  assert.equal(gestor.obtenerEstado().tipo, 'sin_sesion');
  assert.equal(almacen.leer(), null);
  assert.equal(gestor.obtenerTokenSesion(), undefined);
  assert.equal(cerrarSesionLlamadaCon, 'access-1');
});

void test('un perfil student (o con un rol desconocido) queda autenticado con UNA sola llamada de datos, nunca más', async () => {
  const peticiones: PeticionSimulada[] = [];
  const almacen = crearAlmacenSesionEnMemoria();
  const { logger } = crearLoggerDePrueba();
  const perfilRolDesconocido = { ...PERFIL_ADMIN, rol: 'lo-que-sea' } as unknown as Perfil;
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(perfilRolDesconocido, peticiones),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
    }),
  });

  await gestor.iniciarSesion('alguien@ejemplo.es', 'contrasena-correcta');

  const estado = gestor.obtenerEstado();
  assert.equal(estado.tipo, 'autenticado');
  assert.equal((estado as { perfil: Perfil }).perfil.rol, 'lo-que-sea');
  assert.equal(peticiones.length, 1);
});

void test('ningún log del flujo completo (login, renovación, cierre) contiene la contraseña ni un token en claro', async () => {
  const almacen = crearAlmacenSesionEnMemoria();
  const { reloj, avanzar } = crearRelojMutable(new Date('2026-08-27T10:00:00.000Z'));
  const { logger, entradas } = crearLoggerDePrueba();
  const CONTRASENA_SECRETA = 'MiContrasenaSecreta987!';
  const gestor = crearGestorSesion({
    ...OPCIONES_BASE,
    logger,
    reloj,
    almacenSesion: almacen,
    fetchImpl: fetchPerfil(PERFIL_ADMIN, []),
    clienteAutenticacion: crearClienteAutenticacionFalso({
      iniciarSesion: () => Promise.resolve(SESION_1),
      renovarSesion: () => Promise.resolve({ ...SESION_1, accessToken: 'access-2', refreshToken: 'refresh-2' }),
      cerrarSesion: () => Promise.resolve(),
    }),
  });

  await gestor.iniciarSesion('admin@ejemplo.es', CONTRASENA_SECRETA);
  avanzar(56 * 60 * 1000);
  await gestor.renovarAlAbrirPasarLista();
  await gestor.cerrarSesion();

  const textoCompleto = JSON.stringify(entradas);
  assert.ok(!textoCompleto.includes(CONTRASENA_SECRETA));
  assert.ok(!textoCompleto.includes('access-1'));
  assert.ok(!textoCompleto.includes('access-2'));
  assert.ok(!textoCompleto.includes('refresh-1'));
  assert.ok(!textoCompleto.includes('refresh-2'));
});
