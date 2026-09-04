import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaPasarLista, type DependenciasPantallaPasarLista } from './pantallaPasarLista.ts';
import type { AlumnoParaPropuesta, SlotConAlumno } from '../dominio/slots.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearProgramadorIntervaloDePrueba, type ProgramadorIntervaloDePrueba } from '../nucleo/programadorIntervalo.ts';
import { crearReboteDePrueba } from '../nucleo/rebote.ts';
import type { ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';
import { Conflicto, ErrorDeRed } from '../datos/erroresDominio.ts';

// Miércoles 2026-08-26, 17:30 CEST (15:30 UTC): dentro del slot 17:00-18:00 local de dia_semana 3.
const INSTANTE_EN_CLASE = new Date('2026-08-26T15:30:00.000Z');

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearAlumno(sobrescribir: Partial<AlumnoParaPropuesta> = {}): AlumnoParaPropuesta {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: 'López',
    avatar_ruta: null,
    activo: true,
    ...sobrescribir,
  };
}

function crearSlot(sobrescribir: Partial<SlotConAlumno> = {}, alumno: Partial<AlumnoParaPropuesta> = {}): SlotConAlumno {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 3,
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: 'Matemáticas',
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...sobrescribir,
    alumno: crearAlumno({ id: sobrescribir.alumno_id ?? 'alumno-1', ...alumno }),
  };
}

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asistencia-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-08-26T15:30:05.000Z',
    ocurrido_en: '2026-08-26T15:30:05.000Z',
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 3,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: 'Matemáticas',
    estado: 'valida',
    motivo_anulacion: null,
    motivo_justificacion: null,
    nota_justificacion: null,
    nota: null,
    actualizado_en: null,
    actualizado_por: null,
    peticion_id: 'peticion-servidor-1',
    ...sobrescribir,
  };
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaPasarLista> = {}): DependenciasPantallaPasarLista {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaPasarLista falsas: ${metodo} no se esperaba en este test`));
  let contadorPeticionId = 0;

  return {
    rol: overrides.rol ?? 'teacher',
    profesorId: overrides.profesorId ?? 'profesor-1',
    reloj: overrides.reloj ?? crearRelojFijo(INSTANTE_EN_CLASE),
    programador: overrides.programador ?? crearProgramadorIntervaloDePrueba(),
    cargarPropuesta: overrides.cargarPropuesta ?? noImplementado('cargarPropuesta'),
    cargarAsistenciaDeHoy: overrides.cargarAsistenciaDeHoy ?? (() => Promise.resolve([])),
    registrar: overrides.registrar ?? noImplementado('registrar'),
    registrarAusencia: overrides.registrarAusencia ?? noImplementado('registrarAusencia'),
    obtenerUrlsAvataresMini: overrides.obtenerUrlsAvataresMini ?? (() => Promise.resolve(new Map())),
    generarPeticionId:
      overrides.generarPeticionId ??
      (() => {
        contadorPeticionId += 1;
        return `peticion-cliente-${String(contadorPeticionId)}`;
      }),
    renovarSesion: overrides.renovarSesion ?? (() => Promise.resolve()),
    buscarAlumnosExtra: overrides.buscarAlumnosExtra ?? (() => Promise.resolve([])),
    obtenerAlumnoParaTarjeta: overrides.obtenerAlumnoParaTarjeta ?? noImplementado('obtenerAlumnoParaTarjeta'),
    rebote: overrides.rebote ?? crearReboteDePrueba(),
    ...(overrides.zonaHoraria !== undefined ? { zonaHoraria: overrides.zonaHoraria } : {}),
    ...(overrides.tolerancia !== undefined ? { tolerancia: overrides.tolerancia } : {}),
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function botonesDeTarjeta(contenedor: HTMLElement): HTMLButtonElement[] {
  return Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button[data-clave]'));
}

function dispararEvento(elemento: Element, tipo: string): void {
  const ventana = elemento.ownerDocument.defaultView;
  assert.ok(ventana);
  elemento.dispatchEvent(new ventana.Event(tipo));
}

// --- Acceso ---------------------------------------------------------------------------------

void test('un rol distinto de teacher ve "No tienes acceso" y no dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      rol: 'administrator',
      cargarPropuesta: () => {
        llamadas += 1;
        return Promise.resolve([]);
      },
    }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('student tampoco tiene acceso a pasar lista', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

// --- Carga y estados de la cabecera ----------------------------------------------------------

void test('mientras carga muestra "Cargando…" y no pinta la rejilla', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => new Promise(() => undefined),
    }),
  );
  assert.match(contenedor.textContent, /Cargando/);
  assert.equal(botonesDeTarjeta(contenedor).length, 0);
});

void test('llama a renovarSesion una vez al montar la pantalla', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      renovarSesion: () => {
        llamadas += 1;
        return Promise.resolve();
      },
      cargarPropuesta: () => new Promise(() => undefined),
    }),
  );
  assert.equal(llamadas, 1);
});

void test('un fallo de renovarSesion no bloquea ni rompe la carga de la pantalla', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      renovarSesion: () => Promise.reject(new Error('token caducado')),
      cargarPropuesta: () => Promise.resolve([crearSlot()]),
    }),
  );
  await esperarMicrotareas();
  assert.equal(botonesDeTarjeta(contenedor).length, 1);
});

void test('sin_clases_hoy: mensaje explícito y ninguna card', async () => {
  const contenedor = crearContenedorDePruebas();
  // Slot de otro día de la semana: no hay nada en curso ni próximo hoy.
  const slot = crearSlot({ dia_semana: 1 });
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No tienes ninguna clase más hoy/);
  assert.equal(botonesDeTarjeta(contenedor).length, 0);
});

void test('próxima clase: la cabecera indica los minutos que faltan y la asignatura', async () => {
  const contenedor = crearContenedorDePruebas();
  // Instante fijo: 17:30 local. Slot de 18:00-19:00 -> empieza en 30 minutos.
  const slot = crearSlot({ hora_inicio: '18:00', hora_fin: '19:00', asignatura_o_grupo: 'Física' });
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Próxima clase en 30 minutos/);
  assert.match(contenedor.textContent, /Física · 18:00–19:00/);
  // Requisito de T-19: un alumno "próximo" también se puede tocar por adelantado.
  assert.equal(botonesDeTarjeta(contenedor).length, 1);
});

void test('en curso: la cabecera muestra "En curso" y la asignatura del slot', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({ asignatura_o_grupo: 'Matemáticas' });
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /En curso/);
  assert.match(contenedor.textContent, /Matemáticas · 17:00–18:00/);
});

void test('la hora actual visible se toma del reloj inyectado (17:30 CEST)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /17:30/);
});

// --- Orden por apellidos -----------------------------------------------------------------------

void test('las cards se ordenan por apellidos, no por el orden que devuelve el servidor', async () => {
  const contenedor = crearContenedorDePruebas();
  const slotZ = crearSlot({ id: 'slot-z', alumno_id: 'alumno-z' }, { id: 'alumno-z', nombre: 'Zoe', primer_apellido: 'Zamora', segundo_apellido: null });
  const slotA = crearSlot({ id: 'slot-a', alumno_id: 'alumno-a' }, { id: 'alumno-a', nombre: 'Ana', primer_apellido: 'Alonso', segundo_apellido: null });
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([slotZ, slotA]) }));
  await esperarMicrotareas();

  const botones = botonesDeTarjeta(contenedor);
  assert.equal(botones.length, 2);
  assert.match(botones[0]?.textContent ?? '', /Alonso/);
  assert.match(botones[1]?.textContent ?? '', /Zamora/);
});

// --- Requisito 5: ya registrado al abrir --------------------------------------------------------

void test('un alumno ya registrado hoy aparece como "registrado" al abrir la pantalla, sin tocarlo', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const fila = crearAsistencia({ registrado_en: '2026-08-26T15:05:00.000Z' });
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      cargarAsistenciaDeHoy: () => Promise.resolve([fila]),
      registrar: () => Promise.reject(new Error('no se esperaba una llamada a registrar')),
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  assert.match(boton.textContent, /Registrado a las 17:05/);
  assert.equal(boton.disabled, true);
});

// --- Flujo completo: toque, registro, hora real del servidor -----------------------------------

void test('flujo completo: toque en la card registra y muestra la hora real devuelta por el servidor', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let entradaRecibida: unknown;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: (entrada) => {
        entradaRecibida = entrada;
        return Promise.resolve(crearAsistencia({ registrado_en: '2026-08-26T15:31:42.000Z' }));
      },
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  assert.match(boton.textContent, /Pendiente/);
  assert.equal(boton.disabled, false);

  boton.click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    alumnoId: 'alumno-1',
    origen: 'slot',
    slotId: 'slot-1',
    peticionId: 'peticion-cliente-1',
  });

  const botonActualizado = botonesDeTarjeta(contenedor)[0];
  assert.ok(botonActualizado);
  assert.match(botonActualizado.textContent, /Registrado a las 17:31/);
  assert.equal(botonActualizado.disabled, true);
});

void test('mientras la petición de registro está en curso, la card muestra "Registrando…" y queda deshabilitada', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let resolver: ((fila: Asistencia) => void) | undefined;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: () => new Promise((resolve) => { resolver = resolve; }),
    }),
  );
  await esperarMicrotareas();

  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  const botonEnviando = botonesDeTarjeta(contenedor)[0];
  assert.ok(botonEnviando);
  assert.match(botonEnviando.textContent, /Registrando/);
  assert.equal(botonEnviando.disabled, true);

  assert.ok(resolver);
  resolver(crearAsistencia());
  await esperarMicrotareas();
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Registrado/);
});

// --- Doble toque (T-06) -------------------------------------------------------------------------

void test('un doble toque en la MISMA card mientras está en curso no dispara una segunda petición', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let llamadas = 0;
  let resolver: ((fila: Asistencia) => void) | undefined;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: () => {
        llamadas += 1;
        return new Promise((resolve) => { resolver = resolve; });
      },
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  boton.click();
  await esperarMicrotareas();
  // El botón ya está `disabled` (fase "enviando"), pero se dispara el evento igualmente para
  // comprobar que la protección de T-06, no solo el atributo `disabled`, es lo que corta el paso.
  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  assert.equal(llamadas, 1);
  assert.ok(resolver);
  resolver(crearAsistencia());
});

// --- Error de registro: la card vuelve a pendiente, mensaje honesto, reintento --------------------

void test('un error de registro deja la card en pendiente con el mensaje, sin fingir un registro', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: () => Promise.reject(new ErrorDeRed()),
    }),
  );
  await esperarMicrotareas();

  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  assert.match(boton.textContent, /Pendiente/);
  assert.match(boton.textContent, /No se ha podido conectar/);
  assert.equal(boton.disabled, false);
});

void test('el reintento tras un error reutiliza el MISMO peticionId, nunca uno nuevo', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const peticionesRecibidas: string[] = [];
  let primeraVez = true;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: (entrada) => {
        peticionesRecibidas.push(entrada.peticionId);
        if (primeraVez) {
          primeraVez = false;
          return Promise.reject(new ErrorDeRed());
        }
        return Promise.resolve(crearAsistencia());
      },
    }),
  );
  await esperarMicrotareas();

  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();
  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  assert.equal(peticionesRecibidas.length, 2);
  assert.equal(peticionesRecibidas[0], peticionesRecibidas[1]);
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Registrado/);
});

// --- Conflicto: el reintento no genera un segundo registro visible como error --------------------

void test('un Conflicto (409) nunca se muestra como error: se relee el registro real y la card pasa a registrado', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const filaYaExistente = crearAsistencia({ registrado_en: '2026-08-26T15:29:50.000Z', peticion_id: 'peticion-cliente-1' });
  let llamadasCargarHoy = 0;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      cargarAsistenciaDeHoy: () => {
        llamadasCargarHoy += 1;
        return Promise.resolve(llamadasCargarHoy === 1 ? [] : [filaYaExistente]);
      },
      registrar: () => Promise.reject(new Conflicto()),
    }),
  );
  await esperarMicrotareas();

  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  assert.doesNotMatch(boton.textContent, /conflicto/i);
  assert.doesNotMatch(boton.textContent, /No se ha podido/i);
  assert.match(boton.textContent, /Registrado a las 17:29/);
  assert.equal(boton.disabled, true);
  assert.equal(llamadasCargarHoy, 2);
});

// --- Marcar ausente (R-01): control secundario, distinguible del toque simple --------------------

function botonAusenteDeTarjeta(contenedor: HTMLElement): HTMLButtonElement[] {
  return Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button[data-ausente-clave]'));
}

void test('cada card ofrece un control "Marcar ausente" distinto del botón principal, nunca anidado dentro de él', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([slot]) }));
  await esperarMicrotareas();

  const botonPrincipal = botonesDeTarjeta(contenedor)[0];
  const botonAusente = botonAusenteDeTarjeta(contenedor)[0];
  assert.ok(botonPrincipal);
  assert.ok(botonAusente);
  assert.notEqual(botonPrincipal, botonAusente);
  // Dos <button> HERMANOS, nunca uno anidado dentro del otro (un <button> no admite contenido
  // interactivo válido) — requisito 1 de R-01: "un gesto distinguible, nunca el mismo doble".
  assert.equal(botonPrincipal.contains(botonAusente), false);
  assert.match(botonAusente.textContent, /Marcar ausente/);
});

void test('flujo completo: "Marcar ausente" registra la ausencia y la card queda marcada como tal, sin tocar registrar()', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let entradaRecibida: unknown;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: () => Promise.reject(new Error('no se esperaba una llamada a registrar (presencia)')),
      registrarAusencia: (entrada) => {
        entradaRecibida = entrada;
        return Promise.resolve(crearAsistencia({ estado: 'ausente', registrado_en: '2026-08-26T15:31:42.000Z' }));
      },
    }),
  );
  await esperarMicrotareas();

  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  assert.deepEqual(entradaRecibida, {
    alumnoId: 'alumno-1',
    slotId: 'slot-1',
    peticionId: 'peticion-cliente-2',
  });

  const botonPrincipal = botonesDeTarjeta(contenedor)[0];
  const botonAusente = botonAusenteDeTarjeta(contenedor)[0];
  assert.ok(botonPrincipal);
  assert.ok(botonAusente);
  assert.match(botonPrincipal.textContent, /Ausente/);
  assert.equal(botonPrincipal.disabled, true);
  assert.equal(botonAusente.disabled, true);
});

void test('marcar ausente usa un peticionId propio, distinto del de registrar presencia (dos intenciones)', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const peticiones: { presencia?: string; ausencia?: string } = {};
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: (entrada) => {
        peticiones.presencia = entrada.peticionId;
        return Promise.resolve(crearAsistencia());
      },
      registrarAusencia: (entrada) => {
        peticiones.ausencia = entrada.peticionId;
        return Promise.reject(new ErrorDeRed());
      },
    }),
  );
  await esperarMicrotareas();

  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  assert.ok(peticiones.ausencia);
  assert.notEqual(peticiones.ausencia, undefined);
  assert.notEqual(peticiones.ausencia, 'peticion-cliente-1');
});

void test('mientras se marca la ausencia, los dos controles de la card quedan deshabilitados', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let resolver: ((fila: Asistencia) => void) | undefined;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrarAusencia: () => new Promise((resolve) => { resolver = resolve; }),
    }),
  );
  await esperarMicrotareas();

  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  assert.equal(botonesDeTarjeta(contenedor)[0]?.disabled, true);
  assert.equal(botonAusenteDeTarjeta(contenedor)[0]?.disabled, true);

  assert.ok(resolver);
  resolver(crearAsistencia({ estado: 'ausente' }));
  await esperarMicrotareas();
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Ausente/);
});

void test('un doble toque en "Marcar ausente" mientras está en curso no dispara una segunda petición', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let llamadas = 0;
  let resolver: ((fila: Asistencia) => void) | undefined;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrarAusencia: () => {
        llamadas += 1;
        return new Promise((resolve) => { resolver = resolve; });
      },
    }),
  );
  await esperarMicrotareas();

  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();
  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  assert.equal(llamadas, 1);
  assert.ok(resolver);
  resolver(crearAsistencia({ estado: 'ausente' }));
});

void test('un alumno ya marcado ausente al abrir la pantalla aparece como tal, con el botón principal deshabilitado', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const fila = crearAsistencia({ estado: 'ausente', registrado_en: '2026-08-26T15:05:00.000Z' });
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      cargarAsistenciaDeHoy: () => Promise.resolve([fila]),
    }),
  );
  await esperarMicrotareas();

  const botonPrincipal = botonesDeTarjeta(contenedor)[0];
  const botonAusente = botonAusenteDeTarjeta(contenedor)[0];
  assert.ok(botonPrincipal);
  assert.ok(botonAusente);
  assert.match(botonPrincipal.textContent, /Ausente/);
  assert.equal(botonPrincipal.disabled, true);
  assert.equal(botonAusente.disabled, true);
});

void test('un Conflicto (409) al marcar ausente relee el registro real: si ya estaba presente, la card pasa a registrado', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  const filaYaPresente = crearAsistencia({ registrado_en: '2026-08-26T15:29:50.000Z' });
  let llamadasCargarHoy = 0;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      cargarAsistenciaDeHoy: () => {
        llamadasCargarHoy += 1;
        return Promise.resolve(llamadasCargarHoy === 1 ? [] : [filaYaPresente]);
      },
      registrarAusencia: () => Promise.reject(new Conflicto()),
    }),
  );
  await esperarMicrotareas();

  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  const botonPrincipal = botonesDeTarjeta(contenedor)[0];
  assert.ok(botonPrincipal);
  assert.doesNotMatch(botonPrincipal.textContent, /conflicto/i);
  assert.match(botonPrincipal.textContent, /Registrado a las 17:29/);
  assert.equal(llamadasCargarHoy, 2);
});

void test('un error al marcar ausente deja los dos controles reactivados, con el mensaje en la card', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrarAusencia: () => Promise.reject(new ErrorDeRed()),
    }),
  );
  await esperarMicrotareas();

  botonAusenteDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();

  const botonPrincipal = botonesDeTarjeta(contenedor)[0];
  const botonAusente = botonAusenteDeTarjeta(contenedor)[0];
  assert.ok(botonPrincipal);
  assert.ok(botonAusente);
  assert.match(botonPrincipal.textContent, /No se ha podido conectar/);
  assert.equal(botonPrincipal.disabled, false);
  assert.equal(botonAusente.disabled, false);
});

// --- Avatares: monograma primero, lote único, imagen rota deja el monograma ----------------------

void test('la card se pinta con el monograma antes de que resuelva la URL del avatar', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({}, { avatar_ruta: 'alumno/alumno-1/uuid/' });
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      obtenerUrlsAvataresMini: () => new Promise(() => undefined), // nunca resuelve en este test
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  assert.match(boton.textContent, /GA/); // iniciales del monograma (Ana García)
  assert.equal(boton.querySelector('img'), null);
});

void test('un alumno sin avatar nunca dispara ninguna petición de imagen', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({}, { avatar_ruta: null });
  let llamadas = 0;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      obtenerUrlsAvataresMini: () => {
        llamadas += 1;
        return Promise.resolve(new Map());
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
});

void test('varios alumnos con avatar se firman en una única petición (en lote)', async () => {
  const contenedor = crearContenedorDePruebas();
  const slots = [
    crearSlot({ id: 'slot-1', alumno_id: 'alumno-1' }, { id: 'alumno-1', avatar_ruta: 'alumno/alumno-1/uuid/', primer_apellido: 'Alonso' }),
    crearSlot({ id: 'slot-2', alumno_id: 'alumno-2' }, { id: 'alumno-2', avatar_ruta: 'alumno/alumno-2/uuid/', primer_apellido: 'Beltrán' }),
    crearSlot({ id: 'slot-3', alumno_id: 'alumno-3' }, { id: 'alumno-3', avatar_ruta: 'alumno/alumno-3/uuid/', primer_apellido: 'Cortés' }),
  ];
  let llamadas = 0;
  let alumnosPedidos: readonly { readonly alumnoId: string }[] = [];
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve(slots),
      obtenerUrlsAvataresMini: (alumnos) => {
        llamadas += 1;
        alumnosPedidos = alumnos;
        return Promise.resolve(new Map());
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(llamadas, 1);
  assert.equal(alumnosPedidos.length, 3);
});

void test('una imagen que falla al cargar deja el monograma, no un hueco roto', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({}, { avatar_ruta: 'alumno/alumno-1/uuid/' });
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      obtenerUrlsAvataresMini: () => Promise.resolve(new Map([['alumno-1', 'https://ejemplo.test/avatar-mini.webp']])),
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  const imagen = boton.querySelector('img');
  assert.ok(imagen);
  dispararEvento(imagen, 'error');

  assert.equal(boton.querySelector('img'), null);
  assert.match(boton.textContent, /GA/);
});

void test('una imagen que carga con éxito sustituye al monograma', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot({}, { avatar_ruta: 'alumno/alumno-1/uuid/' });
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      obtenerUrlsAvataresMini: () => Promise.resolve(new Map([['alumno-1', 'https://ejemplo.test/avatar-mini.webp']])),
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  const imagen = boton.querySelector('img');
  assert.ok(imagen);
  assert.equal(imagen.hidden, true);
  dispararEvento(imagen, 'load');

  assert.equal(imagen.hidden, false);
});

// --- Teclado (requisito 7) ------------------------------------------------------------------

void test('cada card es un <button> nativo, alcanzable por teclado y activable', async () => {
  const contenedor = crearContenedorDePruebas();
  const slot = crearSlot();
  let registrado = false;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: () => {
        registrado = true;
        return Promise.resolve(crearAsistencia());
      },
    }),
  );
  await esperarMicrotareas();

  const boton = botonesDeTarjeta(contenedor)[0];
  assert.ok(boton);
  assert.equal(boton.tagName, 'BUTTON');
  assert.equal(boton.type, 'button');

  boton.focus();
  assert.equal(contenedor.ownerDocument.activeElement, boton);

  // Un <button> real activa con Enter/Espacio disparando "click" — este es exactamente el evento
  // que produce esa activación en un navegador real (jsdom no simula el paso intermedio).
  boton.click();
  await esperarMicrotareas();
  assert.equal(registrado, true);
});

void test('el botón "Actualizar" hace un refresco manual explícito, con una nueva petición completa', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => {
        llamadas += 1;
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal(llamadas, 1);

  const botonActualizar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Actualizar');
  assert.ok(botonActualizar);
  botonActualizar.click();
  await esperarMicrotareas();

  assert.equal(llamadas, 2);
});

void test('una petición en curso no desaparece de la rejilla si un tick deja el slot fuera de la propuesta', async () => {
  const contenedor = crearContenedorDePruebas();
  const programador: ProgramadorIntervaloDePrueba = crearProgramadorIntervaloDePrueba();
  const reloj = crearRelojFijo(INSTANTE_EN_CLASE);
  const slot = crearSlot(); // en curso en INSTANTE_EN_CLASE (17:00-18:00 local)
  let resolver: ((fila: Asistencia) => void) | undefined;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      reloj,
      programador,
      cargarPropuesta: () => Promise.resolve([slot]),
      registrar: () => new Promise((resolve) => { resolver = resolve; }),
    }),
  );
  await esperarMicrotareas();

  botonesDeTarjeta(contenedor)[0]?.click();
  await esperarMicrotareas();
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Registrando/);

  // Un tick recalcula la propuesta con el MISMO instante fijo (no ha cambiado la hora), así que en
  // este test concreto el slot sigue "en curso" — lo que importa es que la card sobrevive al
  // recálculo mientras la petición sigue en el aire, tal como exige el requisito 6 (honestidad).
  programador.disparar();
  await esperarMicrotareas();
  assert.equal(botonesDeTarjeta(contenedor).length, 1);
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Registrando/);

  assert.ok(resolver);
  resolver(crearAsistencia());
  await esperarMicrotareas();
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Registrado/);
});

// --- Refresco automático (requisito 5): recalcula sin red al pasar un tick -----------------------

void test('un tick del programador recalcula la propuesta sin volver a pedir datos al servidor', async () => {
  const contenedor = crearContenedorDePruebas();
  const programador: ProgramadorIntervaloDePrueba = crearProgramadorIntervaloDePrueba();
  let llamadasCargarPropuesta = 0;
  const slotQueEmpiezaEn18 = crearSlot({ hora_inicio: '18:00', hora_fin: '19:00' });
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      programador,
      cargarPropuesta: () => {
        llamadasCargarPropuesta += 1;
        return Promise.resolve([slotQueEmpiezaEn18]);
      },
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Próxima clase en 30 minutos/);
  assert.equal(llamadasCargarPropuesta, 1);

  programador.disparar();
  await esperarMicrotareas();

  // El instante no cambia (reloj fijo), así que el recálculo da el mismo resultado, pero sin
  // haber vuelto a pedir la propuesta al servidor.
  assert.equal(llamadasCargarPropuesta, 1);
});

// --- Alumno extra (T-20) -------------------------------------------------------------------------

const ALUMNO_EXTRA_BUSCADO: ResultadoBusquedaAlumno = {
  id: 'alumno-extra-1',
  nombre: 'Luis',
  primer_apellido: 'Martín',
  segundo_apellido: null,
  centro_nombre: 'IES Cervantes',
};

function escribirEnCombobox(input: HTMLInputElement, valor: string): void {
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.value = valor;
  input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
}

function teclaEnCombobox(input: HTMLInputElement, key: string): void {
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.dispatchEvent(new ventana.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

async function buscarYSeleccionarExtra(
  contenedor: HTMLElement,
  rebote: ReturnType<typeof crearReboteDePrueba>,
  texto = 'luis',
): Promise<void> {
  const input = contenedor.querySelector<HTMLInputElement>('input[role="combobox"]');
  assert.ok(input, 'la pantalla de pasar lista debe montar el combobox de alumno extra');
  escribirEnCombobox(input, texto);
  rebote.disparar();
  await esperarMicrotareas();
  teclaEnCombobox(input, 'ArrowDown');
  teclaEnCombobox(input, 'Enter');
  await esperarMicrotareas();
}

void test('la pantalla de pasar lista monta el buscador de alumno extra sin navegar fuera (requisito 1)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPasarLista(contenedor, crearDepsFalsas({ cargarPropuesta: () => Promise.resolve([]) }));
  await esperarMicrotareas();

  assert.ok(contenedor.querySelector('input[role="combobox"]'));
  assert.match(contenedor.textContent, /Añadir alumno extra/);
});

void test('seleccionar un resultado registra con origen manual, slot_id nulo y la nota escrita (requisitos 5 y 8)', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  let entradaRecibida: unknown;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([]),
      rebote,
      buscarAlumnosExtra: () => Promise.resolve([ALUMNO_EXTRA_BUSCADO]),
      registrar: (entrada) => {
        entradaRecibida = entrada;
        return Promise.resolve(crearAsistencia({ id: 'asistencia-extra', alumno_id: 'alumno-extra-1', origen: 'manual', slot_id: null, nota: 'cubre guardia' }));
      },
      obtenerAlumnoParaTarjeta: () =>
        Promise.resolve({
          id: 'alumno-extra-1',
          nombre: 'Luis',
          primer_apellido: 'Martín',
          segundo_apellido: null,
          avatar_ruta: null,
          activo: true,
        }),
    }),
  );
  await esperarMicrotareas();

  const notaInput = contenedor.querySelectorAll('input')[1];
  assert.ok(notaInput);
  notaInput.value = 'cubre guardia';

  await buscarYSeleccionarExtra(contenedor, rebote);

  assert.deepEqual(entradaRecibida, {
    alumnoId: 'alumno-extra-1',
    origen: 'manual',
    slotId: null,
    peticionId: 'peticion-cliente-1',
    nota: 'cubre guardia',
  });
});

void test('el alumno extra registrado aparece como card marcada "Extra" en la misma rejilla', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([]),
      rebote,
      buscarAlumnosExtra: () => Promise.resolve([ALUMNO_EXTRA_BUSCADO]),
      registrar: () => Promise.resolve(crearAsistencia({ id: 'asistencia-extra', alumno_id: 'alumno-extra-1', origen: 'manual', slot_id: null })),
      obtenerAlumnoParaTarjeta: () =>
        Promise.resolve({
          id: 'alumno-extra-1',
          nombre: 'Luis',
          primer_apellido: 'Martín',
          segundo_apellido: null,
          avatar_ruta: null,
          activo: true,
        }),
    }),
  );
  await esperarMicrotareas();

  await buscarYSeleccionarExtra(contenedor, rebote);

  const tarjetas = botonesDeTarjeta(contenedor);
  assert.equal(tarjetas.length, 1);
  assert.match(tarjetas[0]?.textContent ?? '', /Extra/);
  assert.match(tarjetas[0]?.textContent ?? '', /Luis Martín/);
  assert.match(tarjetas[0]?.textContent ?? '', /Registrado/);
});

void test('un error al registrar un extra deja la card en error, lista para reintentar con el MISMO peticionId', async () => {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  const peticionesRecibidas: string[] = [];
  let falla = true;
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([]),
      rebote,
      buscarAlumnosExtra: () => Promise.resolve([ALUMNO_EXTRA_BUSCADO]),
      registrar: (entrada) => {
        peticionesRecibidas.push(entrada.peticionId);
        if (falla) {
          falla = false;
          return Promise.reject(new ErrorDeRed());
        }
        return Promise.resolve(crearAsistencia({ id: 'asistencia-extra', alumno_id: 'alumno-extra-1', origen: 'manual', slot_id: null }));
      },
      obtenerAlumnoParaTarjeta: () =>
        Promise.resolve({
          id: 'alumno-extra-1',
          nombre: 'Luis',
          primer_apellido: 'Martín',
          segundo_apellido: null,
          avatar_ruta: null,
          activo: true,
        }),
    }),
  );
  await esperarMicrotareas();

  await buscarYSeleccionarExtra(contenedor, rebote);

  const tarjetaError = botonesDeTarjeta(contenedor)[0];
  assert.ok(tarjetaError);
  assert.match(tarjetaError.textContent, /Pendiente/);
  assert.equal(tarjetaError.disabled, false);

  tarjetaError.click();
  await esperarMicrotareas();

  assert.deepEqual(peticionesRecibidas, ['peticion-cliente-1', 'peticion-cliente-1']);
  assert.match(botonesDeTarjeta(contenedor)[0]?.textContent ?? '', /Registrado/);
});

void test('un alumno inactivo no aparece en el listado del buscador (requisito 7, garantizado por el servidor)', async () => {
  // El propio buscar() de la RPC ya filtra por activo (007_rpc_buscar_alumnos.sql): esta pantalla
  // no repite el filtro, solo confirma que no pinta nada que buscarAlumnosExtra no le devuelva.
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  mostrarPantallaPasarLista(
    contenedor,
    crearDepsFalsas({
      cargarPropuesta: () => Promise.resolve([]),
      rebote,
      buscarAlumnosExtra: () => Promise.resolve([]),
    }),
  );
  await esperarMicrotareas();

  const input = contenedor.querySelector<HTMLInputElement>('input[role="combobox"]');
  assert.ok(input);
  escribirEnCombobox(input, 'nadie');
  rebote.disparar();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /puede estar dado de baja/);
});
