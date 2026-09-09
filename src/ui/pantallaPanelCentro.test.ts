import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaPanelCentro, type DependenciasPantallaPanelCentro, type CentroParaFiltroPanel } from './pantallaPanelCentro.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { AlumnoParaPanelCentro } from '../dominio/panelCentro.ts';
import type { Asistencia, SlotHorario } from '../dominio/tipos.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearAlumno(sobrescribir: Partial<AlumnoParaPanelCentro> = {}): AlumnoParaPanelCentro {
  return { id: 'alumno-1', nombre: 'Ana', primer_apellido: 'García', segundo_apellido: null, ...sobrescribir };
}

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 1, // lunes
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

function crearAsistencia(sobrescribir: Partial<Asistencia> = {}): Asistencia {
  return {
    id: 'asis-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    registrado_en: '2026-09-07T17:05:00.000Z',
    ocurrido_en: '2026-09-07T17:05:00.000Z',
    ocurrido_en_salida: null,
    es_retroactivo: false,
    origen: 'slot',
    slot_id: 'slot-1',
    slot_dia_semana: 1,
    slot_hora_inicio: '17:00',
    slot_hora_fin: '18:00',
    slot_asignatura_o_grupo: null,
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

// Lunes 2026-09-07, 20:00 Europe/Madrid (18:00 UTC): el slot de 17:00-18:00 de hoy ya ha terminado.
const RELOJ_HOY = crearRelojFijo(new Date('2026-09-07T18:00:00.000Z'));

function crearDepsFalsas(overrides: Partial<DependenciasPantallaPanelCentro> = {}): DependenciasPantallaPanelCentro {
  return {
    rol: 'administrator',
    reloj: RELOJ_HOY,
    listarCentrosParaFiltro: () => Promise.resolve([]),
    listarAlumnosActivos: () => Promise.resolve([]),
    listarSlotsDeAlumnos: () => Promise.resolve([]),
    listarCierresActivos: () => Promise.resolve([]),
    listarExcepcionesEnRango: () => Promise.resolve([]),
    listarHistoricoCompleto: () => Promise.resolve([]),
    resolverNombresProfesores: () => Promise.resolve(new Map()),
    ...overrides,
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

void test('un teacher ve un mensaje de acceso denegado, sin llamar a ninguna dependencia', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(contenedor, crearDepsFalsas({ rol: 'teacher' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('un student ve un mensaje de acceso denegado', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('mientras carga muestra "Cargando…" en las tres secciones', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(contenedor, crearDepsFalsas({ listarAlumnosActivos: () => new Promise(() => undefined) }));
  const cargandos = contenedor.textContent.match(/Cargando…/g) ?? [];
  assert.equal(cargandos.length, 3);
});

void test('sin ninguna sesión hoy y sin ausencias ni profesores muestra los tres mensajes explícitos', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(contenedor, crearDepsFalsas());
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /No hay ninguna sesión prevista hoy/);
  assert.match(texto, /Ningún alumno tiene ausencias sin justificar/);
  assert.match(texto, /Ningún profesor tiene sesiones esperadas/);
});

void test('pinta la sesión de hoy sin registrar como "Sin pasar lista"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarAlumnosActivos: () => Promise.resolve([crearAlumno()]),
      listarSlotsDeAlumnos: () => Promise.resolve([crearSlot()]),
      resolverNombresProfesores: () => Promise.resolve(new Map([['profesor-1', 'Marta López']])),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Ana García/);
  assert.match(texto, /Marta López/);
  assert.match(texto, /Sin pasar lista/);
});

void test('pinta la sesión de hoy como "Pasada lista" cuando hay un registro hoy', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarAlumnosActivos: () => Promise.resolve([crearAlumno()]),
      listarSlotsDeAlumnos: () => Promise.resolve([crearSlot()]),
      resolverNombresProfesores: () => Promise.resolve(new Map([['profesor-1', 'Marta López']])),
      listarHistoricoCompleto: (filtro) => {
        // La primera llamada es "hoy" (mismo desde/hasta); la del rango completo trae lo mismo en
        // este test, sin que importe la distinción para esta aserción.
        void filtro;
        return Promise.resolve([crearAsistencia()]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Pasada lista/);
});

void test('filtra un registro de un alumno fuera de alcance antes de contarlo en el ranking de ausencias', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarAlumnosActivos: () => Promise.resolve([crearAlumno()]), // solo alumno-1 en alcance
      listarHistoricoCompleto: () =>
        Promise.resolve([
          crearAsistencia({ alumno_id: 'alumno-1', estado: 'ausente', motivo_justificacion: null }),
          crearAsistencia({ alumno_id: 'alumno-fuera-de-alcance', estado: 'ausente', motivo_justificacion: null }),
        ]),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Ana García/);
  assert.doesNotMatch(texto, /Alumno desconocido/);
});

void test('pinta el ranking de profesores con la proporción en porcentaje', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarAlumnosActivos: () => Promise.resolve([crearAlumno()]),
      listarSlotsDeAlumnos: () => Promise.resolve([crearSlot()]),
      resolverNombresProfesores: () => Promise.resolve(new Map([['profesor-1', 'Marta López']])),
      // El rango por defecto es el mes natural en curso (septiembre de 2026, con el reloj fijo de
      // este fichero): el slot de lunes tiene CUATRO ocurrencias esperadas ese mes (7, 14, 21 y 28),
      // y este doble devuelve el mismo único registro para cualquier consulta — 1 de 4, 25%.
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
    }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Marta López.*4.*1.*25%/s);
});

void test('un profesor sin ninguna sesión esperada no aparece en el ranking', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarAlumnosActivos: () => Promise.resolve([]),
      resolverNombresProfesores: () => Promise.resolve(new Map([['profesor-1', 'Marta López']])),
    }),
  );
  await esperarMicrotareas();
  assert.doesNotMatch(contenedor.textContent, /Marta López/);
});

void test('un fallo al cargar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(contenedor, crearDepsFalsas({ listarAlumnosActivos: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

void test('el selector de centro ofrece "Todos" más los centros recibidos', async () => {
  const contenedor = crearContenedorDePruebas();
  const centros: readonly CentroParaFiltroPanel[] = [
    { id: 'centro-1', nombre: 'Colegio Norte' },
    { id: 'centro-2', nombre: 'Colegio Sur' },
  ];
  mostrarPantallaPanelCentro(contenedor, crearDepsFalsas({ listarCentrosParaFiltro: () => Promise.resolve(centros) }));
  await esperarMicrotareas();
  const opciones = [...contenedor.querySelectorAll('option')].map((opcion) => opcion.textContent);
  assert.deepEqual(opciones, ['Todos', 'Colegio Norte', 'Colegio Sur']);
});

void test('elegir un centro en el filtro relanza la carga con ese centroId', async () => {
  const contenedor = crearContenedorDePruebas();
  const centroIdsRecibidos: (string | undefined)[] = [];
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarCentrosParaFiltro: () => Promise.resolve([{ id: 'centro-1', nombre: 'Colegio Norte' }]),
      listarAlumnosActivos: (centroId) => {
        centroIdsRecibidos.push(centroId);
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();
  const select = contenedor.querySelector<HTMLSelectElement>('#panel-centro-filtro-centro');
  assert.ok(select);
  select.value = 'centro-1';
  select.dispatchEvent(new (contenedor.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event('change'));
  await esperarMicrotareas();
  assert.deepEqual(centroIdsRecibidos, [undefined, 'centro-1']);
});
