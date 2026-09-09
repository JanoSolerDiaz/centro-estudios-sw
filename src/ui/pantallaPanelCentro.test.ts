import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mostrarPantallaPanelCentro,
  type DependenciasPantallaPanelCentro,
  type CentroParaFiltroPanel,
  type AlumnoParaExportacionPanel,
} from './pantallaPanelCentro.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { AlumnoParaPanelCentro } from '../dominio/panelCentro.ts';
import type { Asistencia, CentroEstudios, PersonaReferencia, SlotHorario } from '../dominio/tipos.ts';
import type { Descargador } from './dom.ts';

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

function crearDescargadorDeMentira(): Descargador & { llamadas: { contenido: string; nombre: string; tipo: string }[] } {
  const llamadas: { contenido: string; nombre: string; tipo: string }[] = [];
  return {
    llamadas,
    descargar(contenido, nombreFichero, tipoMime) {
      llamadas.push({ contenido, nombre: nombreFichero, tipo: tipoMime });
    },
  };
}

function crearAlumnoParaExportacion(sobrescribir: Partial<AlumnoParaExportacionPanel> = {}): AlumnoParaExportacionPanel {
  return {
    id: 'alumno-1',
    nombre: 'Ana',
    primer_apellido: 'García',
    segundo_apellido: null,
    centro_referencia_id: 'centro-1',
    avatar_ruta: null,
    email_alumno: 'ana@ejemplo.com',
    telefono_alumno: '611223344',
    activo: true,
    alta_en: '2026-01-01T00:00:00.000Z',
    baja_en: null,
    motivo_baja: null,
    usuario_id: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    centro: { nombre: 'Colegio Ejemplo' },
    ...sobrescribir,
  };
}

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
    nombreUsuarioActual: 'Ana Admin',
    descargador: crearDescargadorDeMentira(),
    listarTodosLosCentros: () => Promise.resolve([]),
    listarTodosLosAlumnos: () => Promise.resolve([]),
    listarPersonasReferenciaDeAlumnos: () => Promise.resolve(new Map()),
    ...overrides,
  };
}

function boton(contenedor: HTMLElement, texto: string): HTMLButtonElement {
  const encontrado = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === texto);
  assert.ok(encontrado, `no se encontró un botón con el texto exacto "${texto}"`);
  return encontrado;
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

// --- Bloque de exportación completa del centro (R-16) -------------------------------------------

const CENTRO: CentroEstudios = {
  id: 'centro-1',
  nombre: 'Colegio Ejemplo',
  activo: true,
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
};

const PERSONA: PersonaReferencia = {
  id: 'persona-1',
  alumno_id: 'alumno-1',
  nombre: 'Marta',
  primer_apellido: 'López',
  segundo_apellido: null,
  email_referencia: null,
  telefono_referencia: '622334455',
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
};

void test('exportación: descarga un único JSON con centros, alumnos, personas de referencia, slots e histórico', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      descargador,
      listarTodosLosCentros: () => Promise.resolve([CENTRO]),
      listarTodosLosAlumnos: () => Promise.resolve([crearAlumnoParaExportacion()]),
      listarPersonasReferenciaDeAlumnos: () => Promise.resolve(new Map([['alumno-1', [PERSONA]]])),
      listarSlotsDeAlumnos: () => Promise.resolve([crearSlot()]),
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
      resolverNombresProfesores: () => Promise.resolve(new Map([['profesor-1', 'Pedro Pérez']])),
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Exportar todo el centro').click();
  await esperarMicrotareas();

  assert.equal(descargador.llamadas.length, 1);
  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.match(llamada.nombre, /^exportacion-centro-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(llamada.tipo, 'application/json;charset=utf-8');
  const datos = JSON.parse(llamada.contenido) as {
    centros: unknown[];
    alumnos: { nombreCompleto: string; personasReferencia: unknown[] }[];
    slots: unknown[];
    historicoAsistencia: { profesor: string }[];
    generadoPor: string;
  };
  assert.equal(datos.centros.length, 1);
  assert.equal(datos.alumnos.length, 1);
  const alumno = datos.alumnos[0];
  assert.ok(alumno);
  assert.equal(alumno.nombreCompleto, 'Ana García');
  assert.equal(alumno.personasReferencia.length, 1);
  assert.equal(datos.slots.length, 1);
  assert.equal(datos.historicoAsistencia.length, 1);
  assert.equal(datos.historicoAsistencia[0]?.profesor, 'Pedro Pérez');
  assert.equal(datos.generadoPor, 'Ana Admin');
});

void test('exportación: nunca incluye avatar_ruta ni ninguna otra pista de la foto en el JSON descargado', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      descargador,
      listarTodosLosAlumnos: () => Promise.resolve([crearAlumnoParaExportacion({ avatar_ruta: 'alumnos/alumno-1/avatar.webp' })]),
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Exportar todo el centro').click();
  await esperarMicrotareas();

  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.equal(llamada.contenido.includes('avatar.webp'), false);
  assert.equal(llamada.contenido.includes('avatar_ruta'), false);
  const datos = JSON.parse(llamada.contenido) as { alumnos: { tieneAvatar: boolean }[] };
  assert.equal(datos.alumnos[0]?.tieneAvatar, true);
});

void test('exportación: un fallo se muestra en su propia zona de mensaje, sin tirar el resto del panel', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      listarTodosLosAlumnos: () => Promise.reject(new SinPermiso()),
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Exportar todo el centro').click();
  await esperarMicrotareas();

  const zonas = contenedor.querySelectorAll('[role="alert"]');
  const mensajes = Array.from(zonas).map((zona) => zona.textContent);
  assert.ok(mensajes.some((texto) => texto.includes('No tienes permiso')));
  assert.match(contenedor.textContent, /Sesiones de hoy/);
});

void test('exportación: un segundo clic mientras la primera exportación está en curso no dispara una segunda descarga', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  let resolver: (() => void) | undefined;
  mostrarPantallaPanelCentro(
    contenedor,
    crearDepsFalsas({
      descargador,
      listarTodosLosAlumnos: () =>
        new Promise((resolve) => {
          resolver = () => {
            resolve([]);
          };
        }),
    }),
  );
  await esperarMicrotareas();

  const botonExportar = boton(contenedor, 'Exportar todo el centro');
  botonExportar.click();
  botonExportar.click();
  await esperarMicrotareas();
  resolver?.();
  await esperarMicrotareas();

  assert.equal(descargador.llamadas.length, 1);
});
