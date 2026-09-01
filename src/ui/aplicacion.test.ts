import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { iniciarAplicacion, type DependenciasAppAdministrador, type DependenciasAppProfesor } from './aplicacion.ts';
import type { GestorSesion, EstadoSesion } from '../nucleo/gestorSesion.ts';
import type { Perfil } from '../dominio/tipos.ts';
import { crearClientePostgrest } from '../datos/postgrest.ts';
import { crearFetchSimulado, type PeticionSimulada } from '../datos/pruebas/dobleHttp.ts';
import type { ClienteAlmacenamiento } from '../datos/almacenamiento.ts';
import type { FabricaProcesadoImagen } from '../datos/avatarAlumno.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearProgramadorIntervaloDePrueba } from '../nucleo/programadorIntervalo.ts';
import type { ObjetivoRouter } from '../nucleo/router.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

const PERFIL_ADMIN: Perfil = {
  id: 'u1',
  nombre: 'Ana Admin',
  rol: 'administrator',
  activo: true,
  intentos_fallidos: 0,
  bloqueado: false,
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
};

function crearGestorSesionFalso(estadoInicial: EstadoSesion): {
  gestor: GestorSesion;
  emitir: (estado: EstadoSesion) => void;
  restaurarLlamado: () => number;
} {
  let estado = estadoInicial;
  const escuchas = new Set<(estado: EstadoSesion) => void>();
  let restaurarLlamado = 0;

  const gestor: GestorSesion = {
    obtenerEstado: () => estado,
    suscribir: (escucha) => {
      escuchas.add(escucha);
      return () => {
        escuchas.delete(escucha);
      };
    },
    restaurar: () => {
      restaurarLlamado += 1;
      return Promise.resolve();
    },
    iniciarSesion: () => Promise.resolve(),
    cerrarSesion: () => Promise.resolve(),
    obtenerTokenSesion: () => undefined,
    renovarAlAbrirPasarLista: () => Promise.resolve(),
    solicitarRecuperacionContrasena: () => Promise.resolve(),
    establecerContrasenaNueva: () => Promise.resolve(),
    desbloquearUsuario: () => Promise.resolve(),
  };

  return {
    gestor,
    emitir: (nuevo) => {
      estado = nuevo;
      for (const escucha of escuchas) {
        escucha(estado);
      }
    },
    restaurarLlamado: () => restaurarLlamado,
  };
}

async function esperarMicrotareas(veces = 3): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

/** Mismo objetivo de mentira que `router.test.ts`: su `location.hash` dispara `hashchange` al
 * cambiar, para que `router.navegar()` (los botones de navegación de la app real) se puedan probar
 * sin `jsdom`. */
function crearObjetivoRouterDePrueba(hashInicial: string): ObjetivoRouter {
  let hashActual = hashInicial;
  const escuchas = new Set<() => void>();
  return {
    location: {
      get hash() {
        return hashActual;
      },
      set hash(valor: string) {
        hashActual = valor;
        for (const escucha of escuchas) {
          escucha();
        }
      },
    },
    addEventListener: (_tipo, escucha) => {
      escuchas.add(escucha);
    },
    removeEventListener: (_tipo, escucha) => {
      escuchas.delete(escucha);
    },
  };
}

const ALMACENAMIENTO_NO_IMPLEMENTADO: ClienteAlmacenamiento = {
  subir: () => Promise.reject(new Error('no se esperaba subir() en este test')),
  eliminar: () => Promise.reject(new Error('no se esperaba eliminar() en este test')),
  urlFirmada: () => Promise.reject(new Error('no se esperaba urlFirmada() en este test')),
  urlFirmadasEnLote: () => Promise.reject(new Error('no se esperaba urlFirmadasEnLote() en este test')),
};

const FABRICA_IMAGEN_NO_IMPLEMENTADA: FabricaProcesadoImagen = {
  crearBitmap: () => Promise.reject(new Error('no se esperaba crearBitmap() en este test')),
  crearLienzo: () => {
    throw new Error('no se esperaba crearLienzo() en este test');
  },
};

/** Construye un `DependenciasAppAdministrador` de pruebas: un `ClientePostgrest` real sobre un
 * `fetch` simulado (así se reutiliza el cliente de verdad en vez de tener que reimplementar
 * `ConstructorConsulta`), con almacenamiento/fábrica de imagen que fallan si se llaman —
 * suficiente para los tests de enrutado, que no tocan avatares. */
function crearAppAdministradorFalso(
  manejador: Parameters<typeof crearFetchSimulado>[0],
  hashInicial = '#/alumnos',
): { app: DependenciasAppAdministrador; objetivoRouter: ObjetivoRouter; peticiones: PeticionSimulada[] } {
  const peticiones: PeticionSimulada[] = [];
  const postgrest = crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return manejador(peticion);
    }),
  });
  const objetivoRouter = crearObjetivoRouterDePrueba(hashInicial);
  return {
    app: {
      objetivoRouter,
      postgrest,
      almacenamiento: ALMACENAMIENTO_NO_IMPLEMENTADO,
      fabricaImagen: FABRICA_IMAGEN_NO_IMPLEMENTADA,
      reloj: crearRelojFijo(new Date('2026-01-01T00:00:00Z')),
    },
    objetivoRouter,
    peticiones,
  };
}

/** Construye un `DependenciasAppProfesor` de pruebas: mismo criterio que `crearAppAdministradorFalso`
 * (`ClientePostgrest` real sobre un `fetch` simulado, y desde T-22 el mismo `ObjetivoRouter` de
 * mentira), con un `ProgramadorIntervalo` de prueba (sin `setInterval` real) y un reloj fijo. */
function crearAppProfesorFalso(
  manejador: Parameters<typeof crearFetchSimulado>[0],
  hashInicial = '#/pasar-lista',
): { app: DependenciasAppProfesor; objetivoRouter: ObjetivoRouter; peticiones: PeticionSimulada[] } {
  const peticiones: PeticionSimulada[] = [];
  const postgrest = crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado((peticion) => {
      peticiones.push(peticion);
      return manejador(peticion);
    }),
  });
  const objetivoRouter = crearObjetivoRouterDePrueba(hashInicial);
  return {
    app: {
      objetivoRouter,
      postgrest,
      almacenamiento: ALMACENAMIENTO_NO_IMPLEMENTADO,
      reloj: crearRelojFijo(new Date('2026-01-07T10:00:00.000Z')), // miércoles a mediodía en Madrid
      programador: crearProgramadorIntervaloDePrueba(),
    },
    objetivoRouter,
    peticiones,
  };
}

void test('un hash de enlace de recuperación muestra "elige tu nueva contraseña", sin restaurar sesión', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor, restaurarLlamado } = crearGestorSesionFalso({ tipo: 'sin_sesion' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '#access_token=tok&type=recovery' });

  assert.match(contenedor.querySelector('h1')?.textContent ?? '', /nueva contraseña/i);
  assert.equal(restaurarLlamado(), 0);
});

void test('sin sesión (estado inicial) muestra la pantalla de login', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'sin_sesion' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.ok(contenedor.querySelector('#login-email'));
});

void test('restaurando (estado inicial) muestra un indicador de carga, y llama a restaurar()', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor, restaurarLlamado } = crearGestorSesionFalso({ tipo: 'restaurando' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /cargando/i);
  assert.equal(restaurarLlamado(), 1);
});

void test('al emitir sin_sesion tras restaurando, se muestra el login (reacciona a la suscripción)', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor, emitir } = crearGestorSesionFalso({ tipo: 'restaurando' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });
  emitir({ tipo: 'sin_sesion' });

  assert.ok(contenedor.querySelector('#login-email'));
});

void test('ir a recuperar contraseña y volver alterna entre las dos pantallas sin perder la suscripción', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'sin_sesion' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });
  assert.ok(contenedor.querySelector('#login-email'));

  const botones = Array.from(contenedor.querySelectorAll('button'));
  const enlaceRecuperar = botones.find((boton) => boton.textContent.includes('olvidado'));
  assert.ok(enlaceRecuperar);
  enlaceRecuperar.click();
  assert.ok(contenedor.querySelector('#recuperar-email'));

  const botonesRecuperar = Array.from(contenedor.querySelectorAll('button'));
  const botonVolver = botonesRecuperar.find((boton) => boton.textContent.includes('Volver'));
  assert.ok(botonVolver);
  botonVolver.click();
  assert.ok(contenedor.querySelector('#login-email'));
});

void test('rol administrator: pantalla temporal de la app, con su nombre, sin login', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /Ana Admin/);
  assert.match(contenedor.textContent, /Administrador/);
  assert.equal(contenedor.querySelector('#login-email'), null);
});

void test('rol teacher: también accede a la pantalla temporal de la app (no a sin acceso)', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilTeacher: Perfil = { ...PERFIL_ADMIN, rol: 'teacher' };
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: perfilTeacher });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /Profesor/);
});

void test('rol student: pantalla sin acceso, no la app', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilStudent: Perfil = { ...PERFIL_ADMIN, rol: 'student' };
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: perfilStudent });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /todavía no tiene acceso/i);
});

void test('rol desconocido: se trata igual que student, nunca como teacher (requisito 8 de T-09)', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilDesconocido = { ...PERFIL_ADMIN, rol: 'lo-que-sea' } as unknown as Perfil;
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: perfilDesconocido });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /todavía no tiene acceso/i);
});

// --- T-16: la aplicación real de administrator, cuando `appAdministrador` viene informado. ---

void test('administrator con appAdministrador: ruta por defecto es el listado de alumnos, con barra de navegación', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppAdministradorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appAdministrador: app });
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Alumnos/);
  const botones = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent);
  assert.ok(botones.some((texto) => texto === 'Centros'));
  assert.ok(botones.some((texto) => texto === 'Alumnos'));
  assert.ok(botones.some((texto) => texto === 'Cerrar sesión'));
});

void test('administrator con appAdministrador: hashUrl inicial "#/centros" abre directamente el catálogo de centros', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app, peticiones } = crearAppAdministradorFalso(() => ({ estado: 200, cuerpo: [] }), '#/centros');
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appAdministrador: app });
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Centros de estudios/);
  assert.ok(peticiones.some((p) => new URL(p.url).pathname === '/rest/v1/centro_estudios'));
});

void test('administrator con appAdministrador: pulsar "Centros" navega sin recargar la sesión', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppAdministradorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appAdministrador: app });
  await esperarMicrotareas();

  const botonCentros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Centros');
  assert.ok(botonCentros);
  botonCentros.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Centros de estudios/);
  // La cabecera (nav, saludo) sigue siendo la misma: no se ha vuelto a pintar la pantalla de login.
  assert.match(contenedor.textContent, /Ana Admin/);
});

void test('administrator con appAdministrador: "Nuevo alumno" navega al alta y "Volver al listado" vuelve', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppAdministradorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appAdministrador: app });
  await esperarMicrotareas();

  const botonNuevo = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Nuevo alumno');
  assert.ok(botonNuevo);
  botonNuevo.click();
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Nuevo alumno/);

  const botonVolver = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Volver al listado');
  assert.ok(botonVolver);
  botonVolver.click();
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún alumno/);
});

void test('administrator sin appAdministrador: sigue viendo la pantalla temporal (compatibilidad)', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /todavía está en construcción/i);
});

// --- T-19: la aplicación real de teacher (pasar lista), cuando `appProfesor` viene informado. ---

const PERFIL_TEACHER: Perfil = { ...PERFIL_ADMIN, id: 'profesor-1', nombre: 'Pedro Profesor', rol: 'teacher' };

void test('teacher con appProfesor: ve la pantalla de pasar lista, no la temporal', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppProfesorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Pedro Profesor/);
  assert.doesNotMatch(contenedor.textContent, /todavía está en construcción/i);
  assert.match(contenedor.textContent, /No tienes ninguna clase más hoy/);
  const botones = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent);
  assert.ok(botones.some((texto) => texto === 'Cerrar sesión'));
  assert.ok(botones.some((texto) => texto === 'Actualizar'));
});

void test('teacher con appProfesor: pide sus slots y su asistencia de hoy, nunca los de otro profesor', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app, peticiones } = crearAppProfesorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });
  await esperarMicrotareas();

  const rutasVisitadas = peticiones.map((p) => new URL(p.url).pathname);
  assert.ok(rutasVisitadas.includes('/rest/v1/slot_horario'));
  assert.ok(rutasVisitadas.includes('/rest/v1/asistencia'));
  for (const peticion of peticiones) {
    const url = new URL(peticion.url);
    if (url.pathname === '/rest/v1/slot_horario' || url.pathname === '/rest/v1/asistencia') {
      assert.equal(url.searchParams.get('profesor_id'), 'eq.profesor-1');
    }
  }
});

void test('administrator con appProfesor informado: NUNCA monta la app de teacher (exclusiva de teacher)', () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppProfesorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });

  assert.doesNotMatch(contenedor.textContent, /No tienes ninguna clase más hoy/);
  assert.match(contenedor.textContent, /todavía está en construcción/i);
});

void test('teacher sin appProfesor: sigue viendo la pantalla temporal (compatibilidad)', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /todavía está en construcción/i);
});

// --- T-21/T-22: la pantalla de registros, enrutada para administrator y para teacher. -----------

void test('administrator con appAdministrador: "Registros" navega a la pantalla de registros', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppAdministradorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appAdministrador: app });
  await esperarMicrotareas();

  const botonRegistros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Registros');
  assert.ok(botonRegistros);
  botonRegistros.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Registros/);
  assert.ok(contenedor.querySelector('#registros-profesor')); // administrator elige profesor
});

void test('teacher con appProfesor: "Registros" alterna a la pantalla de registros sin selector de profesor, y "Pasar lista" vuelve', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppProfesorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });
  await esperarMicrotareas();

  const botonRegistros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Registros');
  assert.ok(botonRegistros);
  botonRegistros.click();
  await esperarMicrotareas();

  assert.doesNotMatch(contenedor.textContent, /No tienes ninguna clase más hoy/);
  assert.equal(contenedor.querySelector('#registros-profesor'), null); // teacher no elige profesor
  assert.ok(contenedor.querySelector('#registros-slot'));

  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.ok(botonPasarLista);
  botonPasarLista.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No tienes ninguna clase más hoy/);
});

// --- T-22: "mi horario" y el router real de teacher (sustituye a la navegación local de T-21). ---

/** Slot vigente el miércoles de 10:00 a 12:00 con el alumno embebido, tal como lo devuelve
 * PostgREST para `listarSlotsDeProfesorConAlumno` — el reloj fijo de `crearAppProfesorFalso` es
 * miércoles 11:00 en Madrid, así que este slot está `esActual`. */
const SLOT_TEACHER_EN_CURSO = {
  id: 'slot-1',
  alumno_id: 'alumno-1',
  profesor_id: 'profesor-1',
  dia_semana: 3,
  hora_inicio: '10:00',
  hora_fin: '12:00',
  asignatura_o_grupo: 'Matemáticas',
  vigente_desde: '2026-01-01',
  vigente_hasta: null,
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
  alumno: {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
    avatar_ruta: null,
    activo: true,
  },
};

function manejadorConSlotDelTeacher(peticion: PeticionSimulada): { estado: number; cuerpo: unknown } {
  const url = new URL(peticion.url);
  if (url.pathname === '/rest/v1/slot_horario') {
    return { estado: 200, cuerpo: [SLOT_TEACHER_EN_CURSO] };
  }
  return { estado: 200, cuerpo: [] };
}

void test('teacher con appProfesor: "Mi horario" navega a la vista semanal', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppProfesorFalso(() => ({ estado: 200, cuerpo: [] }));
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });
  await esperarMicrotareas();

  const botonHorario = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Mi horario');
  assert.ok(botonHorario);
  botonHorario.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Mi horario/);
  assert.match(contenedor.textContent, /Sin horario asignado/);
});

void test('teacher: desde mi horario, "Ver registros" de un slot navega directo a los registros de ESE slot (requisito 2 de T-22)', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app, objetivoRouter } = crearAppProfesorFalso(manejadorConSlotDelTeacher, '#/horario');
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });
  await esperarMicrotareas();

  const botonRegistros = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Ver registros');
  assert.ok(botonRegistros);
  botonRegistros.click();
  await esperarMicrotareas();

  assert.equal(objetivoRouter.location.hash, '#/registros/slot-1');
  const selectSlot = contenedor.querySelector<HTMLSelectElement>('#registros-slot');
  assert.ok(selectSlot);
  assert.equal(selectSlot.value, 'slot-1');
});

void test('teacher: desde mi horario, "Pasar lista" solo se ofrece en el slot en curso y navega a pasar lista', async () => {
  const contenedor = crearContenedorDePruebas();
  const { app } = crearAppProfesorFalso(manejadorConSlotDelTeacher, '#/horario');
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_TEACHER });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '', appProfesor: app });
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /En curso/);
  const botonPasarLista = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Pasar lista');
  assert.ok(botonPasarLista);
  botonPasarLista.click();
  await esperarMicrotareas();

  assert.ok(contenedor.querySelector('button[data-clave]'), 'debe mostrar las cards de pasar lista, no mi horario');
  assert.equal(contenedor.querySelectorAll('section').length, 0, 'mi horario ya no debe seguir montado');
});
