import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mostrarPantallaHistorico,
  type DependenciasPantallaHistorico,
  type IdentificacionAlumno,
} from './pantallaHistorico.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import type { Descargador } from './dom.ts';

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'as1',
    alumno_id: 'al1',
    profesor_id: 'p1',
    registrado_en: '2026-08-26T15:31:00.000Z',
    ocurrido_en: '2026-08-26T15:30:00.000Z',
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot1',
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
    peticion_id: 'peticion-1',
    ...sobrescribir,
  };
}

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearDescargadorDeMentira(): Descargador & { llamadas: { contenido: string; nombre: string; tipo: string }[] } {
  const llamadas: { contenido: string; nombre: string; tipo: string }[] = [];
  return {
    llamadas,
    descargar(contenido, nombreFichero, tipoMime) {
      llamadas.push({ contenido, nombre: nombreFichero, tipo: tipoMime });
    },
  };
}

const ALUMNO_1: IdentificacionAlumno = { nombre: 'María', primer_apellido: 'García', segundo_apellido: 'Pérez' };

function crearDepsFalsas(overrides: Partial<DependenciasPantallaHistorico> = {}): DependenciasPantallaHistorico {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaHistorico falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: overrides.rol ?? 'administrator',
    usuarioId: overrides.usuarioId ?? 'profesor-1',
    ...(overrides.zonaHoraria !== undefined ? { zonaHoraria: overrides.zonaHoraria } : {}),
    listarHistorico: overrides.listarHistorico ?? noImplementado('listarHistorico'),
    listarHistoricoCompleto: overrides.listarHistoricoCompleto ?? noImplementado('listarHistoricoCompleto'),
    resolverNombresAlumnos: overrides.resolverNombresAlumnos ?? (() => Promise.resolve(new Map())),
    resolverNombresProfesores: overrides.resolverNombresProfesores ?? (() => Promise.resolve(new Map())),
    resolverContactoAlumnos: overrides.resolverContactoAlumnos ?? noImplementado('resolverContactoAlumnos'),
    buscarAlumnos: overrides.buscarAlumnos ?? noImplementado('buscarAlumnos'),
    listarProfesoresParaFiltro: overrides.listarProfesoresParaFiltro ?? (() => Promise.resolve([])),
    listarCentrosParaFiltro: overrides.listarCentrosParaFiltro ?? (() => Promise.resolve([])),
    descargador: overrides.descargador ?? crearDescargadorDeMentira(),
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function disparar(elemento: Element, tipo: string): void {
  const ventana = elemento.ownerDocument.defaultView;
  assert.ok(ventana);
  elemento.dispatchEvent(new ventana.Event(tipo));
}

function botonPorTexto(contenedor: HTMLElement, texto: string): HTMLButtonElement | undefined {
  return Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === texto);
}

// --- Acceso --------------------------------------------------------------------------------

void test('student ve "No tienes acceso" y no se dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      rol: 'student',
      listarHistorico: () => {
        llamadas += 1;
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('administrator y teacher sí acceden', async () => {
  for (const rol of ['administrator', 'teacher'] as const) {
    const contenedor = crearContenedorDePruebas();
    mostrarPantallaHistorico(
      contenedor,
      crearDepsFalsas({ rol, listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }) }),
    );
    await esperarMicrotareas();
    assert.doesNotMatch(contenedor.textContent, /No tienes acceso/);
  }
});

// --- Estados de carga ------------------------------------------------------------------------

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(contenedor, crearDepsFalsas({ listarHistorico: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('lista vacía muestra un mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({ listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }) }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún registro/);
});

void test('un 403 (SinPermiso) muestra un mensaje comprensible, no rompe la pantalla', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(contenedor, crearDepsFalsas({ listarHistorico: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

// --- Tabla: nombres resueltos y columnas ------------------------------------------------------

void test('pinta alumno, profesor y las columnas de la fila con los nombres ya resueltos', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [crearAsistencia()], totalAproximado: 1 }),
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      resolverNombresProfesores: () => Promise.resolve(new Map([['p1', 'Juan López']])),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /María García Pérez/);
  assert.match(texto, /Juan López/);
  assert.match(texto, /Horario/); // origen 'slot'
  assert.match(texto, /Válida/);
});

void test('un id sin nombre resuelto (alumno de baja para un teacher) muestra la etiqueta de repuesto', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarHistorico: () => Promise.resolve({ filas: [crearAsistencia()], totalAproximado: 1 }),
      resolverNombresAlumnos: () => Promise.resolve(new Map()),
      resolverNombresProfesores: () => Promise.resolve(new Map()),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /\(alumno no disponible\)/);
  assert.match(texto, /\(profesor no disponible\)/);
});

void test('una ausencia justificada muestra la etiqueta del motivo en la columna Justificación (R-02)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () =>
        Promise.resolve({
          filas: [crearAsistencia({ estado: 'ausente', motivo_justificacion: 'cita_medica' })],
          totalAproximado: 1,
        }),
    }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Cita médica/);
});

void test('una ausencia sin justificar muestra "Sin justificar" en la columna Justificación (R-02)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () =>
        Promise.resolve({ filas: [crearAsistencia({ estado: 'ausente' })], totalAproximado: 1 }),
    }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Sin justificar/);
});

void test('una fila anulada y retroactiva se muestra correctamente', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () =>
        Promise.resolve({
          filas: [crearAsistencia({ estado: 'anulada', motivo_anulacion: 'Error', es_retroactivo: true })],
          totalAproximado: 1,
        }),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Anulada/);
  assert.match(texto, /Sí/); // retroactivo
});

// --- Alcance por rol: teacher siempre filtra por su propio id --------------------------------

void test('teacher: la consulta siempre lleva profesorId = usuarioId, sin selector de profesor ni de centro', async () => {
  const contenedor = crearContenedorDePruebas();
  const filtrosPedidos: unknown[] = [];
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      usuarioId: 'profesor-propio',
      listarHistorico: (filtro) => {
        filtrosPedidos.push(filtro);
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal((filtrosPedidos[0] as { profesorId?: string }).profesorId, 'profesor-propio');
  assert.equal(contenedor.querySelector('#historico-filtro-profesor'), null);
  assert.equal(contenedor.querySelector('#historico-filtro-centro'), null);
});

void test('administrator: ve los selectores de profesor y centro, cargados desde las dependencias', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarProfesoresParaFiltro: () => Promise.resolve([{ id: 'p1', nombre: 'Ana Profesora' }]),
      listarCentrosParaFiltro: () => Promise.resolve([{ id: 'c1', nombre: 'IES Cervantes' }]),
    }),
  );
  await esperarMicrotareas();
  const selectProfesor = contenedor.querySelector<HTMLSelectElement>('#historico-filtro-profesor');
  const selectCentro = contenedor.querySelector<HTMLSelectElement>('#historico-filtro-centro');
  assert.ok(selectProfesor);
  assert.ok(selectCentro);
  assert.match(selectProfesor.textContent, /Ana Profesora/);
  assert.match(selectCentro.textContent, /IES Cervantes/);
});

void test('administrator: elegir un profesor en el selector vuelve a pedir con ese profesorId', async () => {
  const contenedor = crearContenedorDePruebas();
  const filtrosPedidos: { profesorId?: string }[] = [];
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: (filtro) => {
        filtrosPedidos.push(filtro);
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
      listarProfesoresParaFiltro: () => Promise.resolve([{ id: 'p1', nombre: 'Ana Profesora' }]),
    }),
  );
  await esperarMicrotareas();
  const select = contenedor.querySelector<HTMLSelectElement>('#historico-filtro-profesor');
  assert.ok(select);
  select.value = 'p1';
  disparar(select, 'change');
  await esperarMicrotareas();
  assert.equal(filtrosPedidos.at(-1)?.profesorId, 'p1');
});

// --- Filtro de alumno: búsqueda simple ---------------------------------------------------------

void test('filtro de alumno: buscar, elegir un resultado, y la consulta siguiente lleva ese alumnoId', async () => {
  const contenedor = crearContenedorDePruebas();
  const filtrosPedidos: { alumnoId?: string }[] = [];
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: (filtro) => {
        filtrosPedidos.push(filtro);
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
      buscarAlumnos: (texto) =>
        Promise.resolve(
          texto === 'mar'
            ? [{ id: 'al1', nombre: 'María', primer_apellido: 'García', segundo_apellido: null, centro_nombre: 'IES Cervantes' }]
            : [],
        ),
    }),
  );
  await esperarMicrotareas();
  const campo = contenedor.querySelector<HTMLInputElement>('#historico-buscar-alumno');
  assert.ok(campo);
  campo.value = 'mar';
  const botonBuscar = botonPorTexto(contenedor, 'Buscar');
  assert.ok(botonBuscar);
  botonBuscar.click();
  await esperarMicrotareas();

  const botonResultado = botonPorTexto(contenedor, 'María García');
  assert.ok(botonResultado);
  botonResultado.click();
  await esperarMicrotareas();

  assert.equal(filtrosPedidos.at(-1)?.alumnoId, 'al1');
  assert.match(contenedor.textContent, /Filtrando por: María García/);
});

void test('quitar el filtro de alumno vuelve a pedir sin alumnoId', async () => {
  const contenedor = crearContenedorDePruebas();
  const filtrosPedidos: { alumnoId?: string }[] = [];
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: (filtro) => {
        filtrosPedidos.push(filtro);
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
      buscarAlumnos: () =>
        Promise.resolve([
          { id: 'al1', nombre: 'María', primer_apellido: 'García', segundo_apellido: null, centro_nombre: 'IES Cervantes' },
        ]),
    }),
  );
  await esperarMicrotareas();
  const campo = contenedor.querySelector<HTMLInputElement>('#historico-buscar-alumno');
  assert.ok(campo);
  campo.value = 'mar';
  botonPorTexto(contenedor, 'Buscar')?.click();
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'María García')?.click();
  await esperarMicrotareas();

  const botonQuitar = botonPorTexto(contenedor, 'Quitar filtro de alumno');
  assert.ok(botonQuitar);
  botonQuitar.click();
  await esperarMicrotareas();

  assert.equal(filtrosPedidos.at(-1)?.alumnoId, undefined);
});

// --- Rango de fechas -----------------------------------------------------------------------

void test('elegir desde/hasta acota el rango de fechas de la consulta', async () => {
  const contenedor = crearContenedorDePruebas();
  const filtrosPedidos: { desde?: Date; hasta?: Date }[] = [];
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: (filtro) => {
        filtrosPedidos.push(filtro);
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();
  const campoDesde = contenedor.querySelector<HTMLInputElement>('#historico-filtro-desde');
  const campoHasta = contenedor.querySelector<HTMLInputElement>('#historico-filtro-hasta');
  assert.ok(campoDesde);
  assert.ok(campoHasta);
  campoDesde.value = '2026-08-01';
  disparar(campoDesde, 'change');
  await esperarMicrotareas();
  campoHasta.value = '2026-08-31';
  disparar(campoHasta, 'change');
  await esperarMicrotareas();

  const ultimo = filtrosPedidos.at(-1);
  assert.ok(ultimo?.desde instanceof Date);
  assert.ok(ultimo.hasta instanceof Date);
});

// --- Paginador -------------------------------------------------------------------------------

void test('el botón Siguiente pide la página 1 y el botón Anterior vuelve a la 0', async () => {
  const contenedor = crearContenedorDePruebas();
  const paginasPedidas: number[] = [];
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: (filtro) => {
        paginasPedidas.push(filtro.pagina ?? 0);
        return Promise.resolve({
          filas: Array.from({ length: 20 }, (_, i) => crearAsistencia({ id: `as-${String(i)}` })),
          totalAproximado: 40,
        });
      },
    }),
  );
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Siguiente')?.click();
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Anterior')?.click();
  await esperarMicrotareas();

  assert.deepEqual(paginasPedidas, [0, 1, 0]);
});

// --- Exportación CSV -------------------------------------------------------------------------

void test('exportar CSV: pide TODO el histórico (sin paginar), resuelve nombres, y dispara la descarga', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  let filtroCompletoRecibido: unknown;
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [crearAsistencia()], totalAproximado: 1 }),
      listarHistoricoCompleto: (filtro) => {
        filtroCompletoRecibido = filtro;
        return Promise.resolve([crearAsistencia()]);
      },
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      resolverNombresProfesores: () => Promise.resolve(new Map([['p1', 'Juan López']])),
      descargador,
    }),
  );
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Exportar CSV')?.click();
  await esperarMicrotareas();

  assert.equal(descargador.llamadas.length, 1);
  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.equal(llamada.nombre, 'historico-asistencia.csv');
  assert.equal(llamada.tipo, 'text/csv;charset=utf-8');
  assert.match(llamada.contenido, /María García Pérez/);
  assert.match(llamada.contenido, /Juan López/);
  // El filtro de exportación no lleva pagina/porPagina propios de la pantalla (trae TODO).
  assert.equal((filtroCompletoRecibido as { pagina?: number }).pagina, undefined);
});

void test('exportar CSV sin marcar "incluir contacto": nunca llama a resolverContactoAlumnos', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasContacto = 0;
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
      resolverContactoAlumnos: () => {
        llamadasContacto += 1;
        return Promise.resolve(new Map());
      },
    }),
  );
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Exportar CSV')?.click();
  await esperarMicrotareas();
  assert.equal(llamadasContacto, 0);
});

void test('teacher: nunca ve la casilla de incluir contacto', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({ rol: 'teacher', listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }) }),
  );
  await esperarMicrotareas();
  assert.equal(contenedor.querySelector('#historico-incluir-contacto'), null);
});

void test('administrator: marcar "incluir contacto" antes de exportar añade email y teléfono al CSV', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      resolverNombresProfesores: () => Promise.resolve(new Map([['p1', 'Juan López']])),
      resolverContactoAlumnos: () =>
        Promise.resolve(new Map([['al1', { email_alumno: 'madre@example.com', telefono_alumno: '600111222' }]])),
      descargador,
    }),
  );
  await esperarMicrotareas();
  const casilla = contenedor.querySelector<HTMLInputElement>('#historico-incluir-contacto');
  assert.ok(casilla);
  casilla.checked = true;
  disparar(casilla, 'change');
  botonPorTexto(contenedor, 'Exportar CSV')?.click();
  await esperarMicrotareas();

  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.match(llamada.contenido, /madre@example\.com/);
  assert.match(llamada.contenido, /600111222/);
});

void test('un error al exportar se muestra sin romper la pantalla, y no dispara ninguna descarga', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarHistoricoCompleto: () => Promise.reject(new SinPermiso()),
      descargador,
    }),
  );
  await esperarMicrotareas();
  botonPorTexto(contenedor, 'Exportar CSV')?.click();
  await esperarMicrotareas();

  assert.equal(descargador.llamadas.length, 0);
  const zonasError = contenedor.querySelectorAll('[role="alert"]');
  const algunoConMensaje = Array.from(zonasError).some((zona) => zona.textContent.includes('No tienes permiso'));
  assert.ok(algunoConMensaje);
});
