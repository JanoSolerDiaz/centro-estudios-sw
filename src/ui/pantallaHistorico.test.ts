import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mostrarPantallaHistorico,
  type DependenciasPantallaHistorico,
  type IdentificacionAlumno,
} from './pantallaHistorico.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { Asistencia, SlotHorario } from '../dominio/tipos.ts';
import type { Descargador, AbridorVentanaImpresion, VentanaImpresion } from './dom.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'as1',
    alumno_id: 'al1',
    profesor_id: 'p1',
    registrado_en: '2026-08-26T15:31:00.000Z',
    ocurrido_en: '2026-08-26T15:30:00.000Z',
    ocurrido_en_salida: null,
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

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot1',
    alumno_id: 'al1',
    profesor_id: 'p1',
    dia_semana: 3, // miércoles
    hora_inicio: '17:00',
    hora_fin: '18:00',
    asignatura_o_grupo: null,
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
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

function crearAbridorImpresionDeMentira(): AbridorVentanaImpresion & { readonly titulos: string[]; impresiones: number } {
  const titulos: string[] = [];
  const resultado = {
    titulos,
    impresiones: 0,
    abrir(titulo: string): VentanaImpresion {
      titulos.push(titulo);
      const documento = new JSDOM('<!doctype html><body></body>').window.document;
      return {
        document: documento,
        imprimir: () => {
          resultado.impresiones += 1;
        },
      };
    },
  };
  return resultado;
}

const ALUMNO_1: IdentificacionAlumno = { nombre: 'María', primer_apellido: 'García', segundo_apellido: 'Pérez' };

function crearDepsFalsas(overrides: Partial<DependenciasPantallaHistorico> = {}): DependenciasPantallaHistorico {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaHistorico falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: overrides.rol ?? 'administrator',
    usuarioId: overrides.usuarioId ?? 'profesor-1',
    ...(overrides.zonaHoraria !== undefined ? { zonaHoraria: overrides.zonaHoraria } : {}),
    ...(overrides.alumnoIdInicial !== undefined ? { alumnoIdInicial: overrides.alumnoIdInicial } : {}),
    reloj: overrides.reloj ?? crearRelojFijo(new Date('2026-03-04T10:00:00.000Z')),
    listarHistorico: overrides.listarHistorico ?? noImplementado('listarHistorico'),
    listarHistoricoCompleto: overrides.listarHistoricoCompleto ?? noImplementado('listarHistoricoCompleto'),
    resolverNombresAlumnos: overrides.resolverNombresAlumnos ?? (() => Promise.resolve(new Map())),
    resolverNombresProfesores: overrides.resolverNombresProfesores ?? (() => Promise.resolve(new Map())),
    resolverContactoAlumnos: overrides.resolverContactoAlumnos ?? noImplementado('resolverContactoAlumnos'),
    buscarAlumnos: overrides.buscarAlumnos ?? noImplementado('buscarAlumnos'),
    listarProfesoresParaFiltro: overrides.listarProfesoresParaFiltro ?? (() => Promise.resolve([])),
    listarCentrosParaFiltro: overrides.listarCentrosParaFiltro ?? (() => Promise.resolve([])),
    descargador: overrides.descargador ?? crearDescargadorDeMentira(),
    listarSlotsDeAlumnoParaInforme: overrides.listarSlotsDeAlumnoParaInforme ?? (() => Promise.resolve([])),
    listarCierresActivosParaInforme: overrides.listarCierresActivosParaInforme ?? (() => Promise.resolve([])),
    listarExcepcionesEnRangoParaInforme: overrides.listarExcepcionesEnRangoParaInforme ?? (() => Promise.resolve([])),
    // Sin valor por defecto (a diferencia de `resolverContactoAlumnos`): esta dependencia es
    // opcional de verdad — un `teacher` nunca la recibe en producción (`aplicacion.ts`) — así que el
    // doble debe reflejar "no provista" (`undefined`) salvo que el test la necesite de verdad,
    // nunca un `noImplementado` que rechazaría en cualquier generación de informe que no la pida.
    ...(overrides.resolverCentroReferenciaIdParaInforme !== undefined
      ? { resolverCentroReferenciaIdParaInforme: overrides.resolverCentroReferenciaIdParaInforme }
      : {}),
    abridorImpresion: overrides.abridorImpresion ?? crearAbridorImpresionDeMentira(),
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

// --- Registro de salida y cómputo de horas reales (R-03) -----------------------------------

void test('la cabecera de la tabla incluye las columnas Salida y Duración (R-03)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [crearAsistencia()], totalAproximado: 1 }),
    }),
  );
  await esperarMicrotareas();
  const cabeceras = [...contenedor.querySelectorAll('th')].map((th) => th.textContent);
  assert.ok(cabeceras.includes('Salida'));
  assert.ok(cabeceras.includes('Duración'));
});

void test('con salida marcada, muestra la hora de salida y la duración real junto a la teórica', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () =>
        Promise.resolve({
          filas: [crearAsistencia({ ocurrido_en: '2026-08-26T15:30:00.000Z', ocurrido_en_salida: '2026-08-26T16:15:00.000Z' })],
          totalAproximado: 1,
        }),
    }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /45 min \(teórica 60 min\)/);
});

void test('sin salida marcada, la columna Duración muestra solo la teórica', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [crearAsistencia({ ocurrido_en_salida: null })], totalAproximado: 1 }),
    }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Teórica: 60 min/);
});

void test('un registro manual (sin snapshot de slot ni salida) deja la columna Duración vacía', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () =>
        Promise.resolve({
          filas: [
            crearAsistencia({
              origen: 'manual',
              slot_id: null,
              slot_hora_inicio: null,
              slot_hora_fin: null,
              ocurrido_en_salida: null,
            }),
          ],
          totalAproximado: 1,
        }),
    }),
  );
  await esperarMicrotareas();
  const filas = [...contenedor.querySelectorAll('tbody tr')];
  assert.equal(filas.length, 1);
  const fila = filas[0];
  assert.ok(fila);
  const celdas = [...fila.querySelectorAll('td')].map((td) => td.textContent);
  assert.equal(celdas.at(-1), '');
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

// --- Informe mensual por alumno (R-04) ----------------------------------------------------------

const RELOJ_MARZO_2026 = () => new Date('2026-03-04T10:00:00.000Z');

void test('informe mensual: sin ningún alumno seleccionado, generar CSV avisa y no descarga nada', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      descargador,
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Informe: descargar CSV')?.click();
  await esperarMicrotareas();

  assert.equal(descargador.llamadas.length, 0);
  assert.match(contenedor.textContent, /Elige un alumno.*y un mes/);
});

void test('informe mensual: con el alumno preseleccionado desde la ficha (#/historico/<alumnoId>) y el mes actual, el CSV trae las cifras correctas', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      alumnoIdInicial: 'al1',
      reloj: { ahora: RELOJ_MARZO_2026 },
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarCentrosParaFiltro: () => Promise.resolve([{ id: 'c1', nombre: 'IES Cervantes' }]),
      listarSlotsDeAlumnoParaInforme: (alumnoId) => {
        assert.equal(alumnoId, 'al1');
        return Promise.resolve([crearSlot()]);
      },
      listarCierresActivosParaInforme: () => Promise.resolve([]),
      listarExcepcionesEnRangoParaInforme: (desde, hasta) => {
        assert.equal(desde, '2026-03-01');
        assert.equal(hasta, '2026-03-31');
        return Promise.resolve([]);
      },
      listarHistoricoCompleto: (filtro) => {
        assert.equal(filtro.alumnoId, 'al1');
        return Promise.resolve([
          crearAsistencia({ id: 'a1', ocurrido_en: '2026-03-04T17:00:00.000Z' }),
          crearAsistencia({ id: 'a2', ocurrido_en: '2026-03-11T17:00:00.000Z', estado: 'ausente', motivo_justificacion: null }),
        ]);
      },
      resolverCentroReferenciaIdParaInforme: (alumnoId) => {
        assert.equal(alumnoId, 'al1');
        return Promise.resolve('c1');
      },
      descargador,
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Informe: descargar CSV')?.click();
  await esperarMicrotareas();

  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.equal(llamada.nombre, 'informe-mensual.csv');
  assert.match(llamada.contenido, /Alumno;María García Pérez/);
  assert.match(llamada.contenido, /Centro;IES Cervantes/);
  assert.match(llamada.contenido, /Mes;Marzo 2026/);
  assert.match(llamada.contenido, /Sesiones esperadas;4/); // 4 miércoles en marzo de 2026
  assert.match(llamada.contenido, /Entradas registradas;1/);
  assert.match(llamada.contenido, /Ausencias sin justificar;1/);
});

void test('informe mensual: imprimir abre la ventana de impresión con el alumno en el título y llama a imprimir()', async () => {
  const contenedor = crearContenedorDePruebas();
  const abridorImpresion = crearAbridorImpresionDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      alumnoIdInicial: 'al1',
      reloj: { ahora: RELOJ_MARZO_2026 },
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarSlotsDeAlumnoParaInforme: () => Promise.resolve([crearSlot()]),
      listarCierresActivosParaInforme: () => Promise.resolve([]),
      listarExcepcionesEnRangoParaInforme: () => Promise.resolve([]),
      listarHistoricoCompleto: () => Promise.resolve([]),
      abridorImpresion,
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Informe: imprimir / PDF')?.click();
  await esperarMicrotareas();

  assert.equal(abridorImpresion.titulos.length, 1);
  assert.match(abridorImpresion.titulos[0] ?? '', /María García Pérez/);
  assert.equal(abridorImpresion.impresiones, 1);
});

void test('informe mensual: un teacher, sin resolverCentroReferenciaIdParaInforme, exporta el CSV sin la fila Centro', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      usuarioId: 'p1',
      alumnoIdInicial: 'al1',
      reloj: { ahora: RELOJ_MARZO_2026 },
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarSlotsDeAlumnoParaInforme: () => Promise.resolve([crearSlot()]),
      listarCierresActivosParaInforme: () => Promise.resolve([]),
      listarExcepcionesEnRangoParaInforme: () => Promise.resolve([]),
      listarHistoricoCompleto: () => Promise.resolve([]),
      descargador,
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Informe: descargar CSV')?.click();
  await esperarMicrotareas();

  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.doesNotMatch(llamada.contenido, /Centro;/);
  assert.match(llamada.contenido, /Alumno;María García Pérez/);
});

void test('informe mensual: un fallo al construir los datos se muestra sin romper la pantalla, y no descarga nada', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaHistorico(
    contenedor,
    crearDepsFalsas({
      alumnoIdInicial: 'al1',
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      listarHistorico: () => Promise.resolve({ filas: [], totalAproximado: 0 }),
      listarSlotsDeAlumnoParaInforme: () => Promise.reject(new SinPermiso()),
      listarCierresActivosParaInforme: () => Promise.resolve([]),
      listarExcepcionesEnRangoParaInforme: () => Promise.resolve([]),
      descargador,
    }),
  );
  await esperarMicrotareas();

  botonPorTexto(contenedor, 'Informe: descargar CSV')?.click();
  await esperarMicrotareas();

  assert.equal(descargador.llamadas.length, 0);
  assert.match(contenedor.textContent, /No tienes permiso/);
});
