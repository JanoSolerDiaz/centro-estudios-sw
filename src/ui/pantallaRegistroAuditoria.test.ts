import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mostrarPantallaRegistroAuditoria,
  type DependenciasPantallaRegistroAuditoria,
  type AutorParaFiltro,
} from './pantallaRegistroAuditoria.ts';
import type { IdentificacionAlumno } from './pantallaHistorico.ts';
import type { AsistenciaHistorial } from '../dominio/tipos.ts';
import type { FiltroHistorialCentro, ResultadoHistorialCentro } from '../datos/asistencia.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';

const INSTANTE = new Date('2026-09-14T10:00:00.000Z');

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearFilaHistorial(sobrescribir: Partial<AsistenciaHistorial> = {}): AsistenciaHistorial {
  return {
    id: 'h1',
    asistencia_id: 'as1',
    cambiado_en: '2026-09-10T09:00:00.000Z',
    cambiado_por: 'admin1',
    alumno_id: 'al1',
    profesor_id: 'p1',
    registrado_en: '2026-08-31T09:00:00.000Z',
    ocurrido_en: '2026-08-31T09:00:00.000Z',
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

const ALUMNO_1: IdentificacionAlumno = { nombre: 'María', primer_apellido: 'García', segundo_apellido: 'Pérez' };

function crearDepsFalsas(overrides: Partial<DependenciasPantallaRegistroAuditoria> = {}): DependenciasPantallaRegistroAuditoria {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaRegistroAuditoria falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: overrides.rol ?? 'administrator',
    ...(overrides.zonaHoraria !== undefined ? { zonaHoraria: overrides.zonaHoraria } : {}),
    reloj: overrides.reloj ?? crearRelojFijo(INSTANTE),
    listarHistorial: overrides.listarHistorial ?? (() => Promise.resolve({ filas: [], totalAproximado: 0 })),
    resolverNombresAlumnos: overrides.resolverNombresAlumnos ?? (() => Promise.resolve(new Map())),
    resolverNombresProfesores: overrides.resolverNombresProfesores ?? (() => Promise.resolve(new Map())),
    listarAutoresParaFiltro: overrides.listarAutoresParaFiltro ?? (() => Promise.resolve([])),
    irARegistro: overrides.irARegistro ?? noImplementado('irARegistro'),
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

void test('teacher no tiene acceso a esta pantalla, y no se dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarHistorial: () => {
        llamadas += 1;
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('student no tiene acceso a esta pantalla', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('administrator accede y ve el título de la pantalla', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(contenedor, crearDepsFalsas());
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Registro de auditoría de cambios/);
});

// --- Rango de fechas por defecto (requisito 3: "por defecto los últimos 7 días") ------------

void test('al montar, filtra los últimos 7 días por defecto (según el reloj inyectado)', async () => {
  const contenedor = crearContenedorDePruebas();
  let filtroRecibido: FiltroHistorialCentro | undefined;
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: (filtro) => {
        filtroRecibido = filtro;
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();

  assert.ok(filtroRecibido);
  assert.equal(filtroRecibido.desde?.toISOString().slice(0, 10), '2026-09-07');
  assert.equal(filtroRecibido.hasta?.toISOString().slice(0, 10), '2026-09-14');

  const campoDesde = contenedor.querySelector<HTMLInputElement>('#auditoria-filtro-desde');
  const campoHasta = contenedor.querySelector<HTMLInputElement>('#auditoria-filtro-hasta');
  assert.equal(campoDesde?.value, '2026-09-07');
  assert.equal(campoHasta?.value, '2026-09-14');
});

// --- Pintado de filas ------------------------------------------------------------------------

void test('pinta cada fila con fecha del cambio, alumno, profesor y quién lo modificó', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () => Promise.resolve({ filas: [crearFilaHistorial()], totalAproximado: 1 }),
      resolverNombresAlumnos: () => Promise.resolve(new Map([['al1', ALUMNO_1]])),
      resolverNombresProfesores: () =>
        Promise.resolve(
          new Map([
            ['p1', 'Marta Ruiz'],
            ['admin1', 'Ana Admin'],
          ]),
        ),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /María García Pérez/);
  assert.match(contenedor.textContent, /Marta Ruiz/);
  assert.match(contenedor.textContent, /Ana Admin/);
});

void test('un alumno o profesor que no resuelve nombre muestra una etiqueta de repuesto, nunca en blanco', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () => Promise.resolve({ filas: [crearFilaHistorial()], totalAproximado: 1 }),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /\(alumno no disponible\)/);
  assert.match(contenedor.textContent, /\(profesor no disponible\)/);
});

void test('cambiado_por null (sin autor humano) se muestra como "(sistema)"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () => Promise.resolve({ filas: [crearFilaHistorial({ cambiado_por: null })], totalAproximado: 1 }),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /\(sistema\)/);
});

void test('sin ninguna fila, muestra el mensaje de "no hay ninguna modificación"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(contenedor, crearDepsFalsas());
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No hay ninguna modificación que coincida con este filtro/);
});

// --- Enlace al registro completo (requisito 2) ------------------------------------------------

void test('"Ver registro completo" navega con el profesor, el slot y la fecha (día de ocurrido_en) de esa fila', async () => {
  const contenedor = crearContenedorDePruebas();
  let argumentos: readonly [string, string, string] | undefined;
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () =>
        Promise.resolve({
          filas: [crearFilaHistorial({ profesor_id: 'p1', slot_id: 'slot1', ocurrido_en: '2026-08-31T09:00:00.000Z' })],
          totalAproximado: 1,
        }),
      irARegistro: (profesorId, slotId, fecha) => {
        argumentos = [profesorId, slotId, fecha];
      },
    }),
  );
  await esperarMicrotareas();

  const boton = botonPorTexto(contenedor, 'Ver registro completo');
  assert.ok(boton);
  boton.click();

  assert.ok(argumentos);
  assert.deepEqual(argumentos, ['p1', 'slot1', '2026-08-31']);
});

void test('una fila de origen manual (sin slot_id) no ofrece ningún enlace', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () =>
        Promise.resolve({ filas: [crearFilaHistorial({ slot_id: null, origen: 'manual' })], totalAproximado: 1 }),
    }),
  );
  await esperarMicrotareas();

  assert.equal(botonPorTexto(contenedor, 'Ver registro completo'), undefined);
  assert.match(contenedor.textContent, /—/);
});

// --- Filtros ------------------------------------------------------------------------------------

void test('el filtro de autor se puebla desde listarAutoresParaFiltro y se envía como cambiadoPorId', async () => {
  const contenedor = crearContenedorDePruebas();
  const autores: readonly AutorParaFiltro[] = [
    { id: 'admin1', nombre: 'Ana Admin' },
    { id: 'p1', nombre: 'Marta Ruiz' },
  ];
  let filtroRecibido: FiltroHistorialCentro | undefined;
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarAutoresParaFiltro: () => Promise.resolve(autores),
      listarHistorial: (filtro) => {
        filtroRecibido = filtro;
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();

  const selectAutor = contenedor.querySelector<HTMLSelectElement>('#auditoria-filtro-autor');
  assert.ok(selectAutor);
  assert.ok(Array.from(selectAutor.options).some((o) => o.textContent === 'Ana Admin'));
  assert.ok(Array.from(selectAutor.options).some((o) => o.textContent === 'Marta Ruiz'));

  selectAutor.value = 'admin1';
  disparar(selectAutor, 'change');
  await esperarMicrotareas();

  assert.equal(filtroRecibido?.cambiadoPorId, 'admin1');
});

void test('cambiar el rango de fechas dispara una nueva carga con el filtro actualizado', async () => {
  const contenedor = crearContenedorDePruebas();
  const filtrosRecibidos: FiltroHistorialCentro[] = [];
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: (filtro) => {
        filtrosRecibidos.push(filtro);
        return Promise.resolve({ filas: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();

  const campoDesde = contenedor.querySelector<HTMLInputElement>('#auditoria-filtro-desde');
  assert.ok(campoDesde);
  campoDesde.value = '2026-09-01';
  disparar(campoDesde, 'change');
  await esperarMicrotareas();

  const ultimo = filtrosRecibidos.at(-1);
  assert.ok(ultimo);
  assert.equal(ultimo.desde?.toISOString().slice(0, 10), '2026-09-01');
  assert.equal(ultimo.pagina, 0);
});

// --- Paginación -----------------------------------------------------------------------------

void test('"Siguiente" pide la página siguiente; "Anterior" está deshabilitado en la primera página', async () => {
  const contenedor = crearContenedorDePruebas();
  const paginasPedidas: (number | undefined)[] = [];
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: (filtro) => {
        paginasPedidas.push(filtro.pagina);
        return Promise.resolve({
          filas: Array.from({ length: 20 }, (_, i) => crearFilaHistorial({ id: `h${String(i)}` })),
          totalAproximado: 45,
        });
      },
    }),
  );
  await esperarMicrotareas();

  const botonAnterior = botonPorTexto(contenedor, 'Anterior');
  const botonSiguiente = botonPorTexto(contenedor, 'Siguiente');
  assert.ok(botonAnterior);
  assert.ok(botonSiguiente);
  assert.equal(botonAnterior.disabled, true);
  assert.equal(botonSiguiente.disabled, false);

  botonSiguiente.click();
  await esperarMicrotareas();

  assert.deepEqual(paginasPedidas, [0, 1]);
});

void test('un error al cargar se muestra en la zona de mensajes, sin romper la pantalla', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () => Promise.reject(new Error('fallo de red')),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No se ha podido completar la acción/);
});

void test('un resultado como el del criterio de aceptación: tres modificaciones se muestran en el orden que llegan (cronológico inverso, decisión del servidor)', async () => {
  const contenedor = crearContenedorDePruebas();
  const filas = [
    crearFilaHistorial({ id: 'h3', cambiado_en: '2026-09-12T10:00:00.000Z', cambiado_por: 'admin1' }),
    crearFilaHistorial({ id: 'h2', cambiado_en: '2026-09-11T10:00:00.000Z', cambiado_por: 'p2' }),
    crearFilaHistorial({ id: 'h1', cambiado_en: '2026-09-10T10:00:00.000Z', cambiado_por: 'admin1' }),
  ];
  mostrarPantallaRegistroAuditoria(
    contenedor,
    crearDepsFalsas({
      listarHistorial: () => Promise.resolve<ResultadoHistorialCentro>({ filas, totalAproximado: 3 }),
      resolverNombresProfesores: () =>
        Promise.resolve(
          new Map([
            ['p1', 'Marta Ruiz'],
            ['admin1', 'Ana Admin'],
            ['p2', 'Bruno Ruiz'],
          ]),
        ),
    }),
  );
  await esperarMicrotareas();

  const filasHtml = Array.from(contenedor.querySelectorAll('tbody tr'));
  assert.equal(filasHtml.length, 3);
  const autores = filasHtml.map((tr) => tr.querySelectorAll('td')[3]?.textContent);
  assert.deepEqual(autores, ['Ana Admin', 'Bruno Ruiz', 'Ana Admin']);
});
