import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mostrarPantallaAsistentePrimerosPasos,
  type DependenciasPantallaAsistentePrimerosPasos,
} from './pantallaAsistentePrimerosPasos.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { CentroEstudios, SlotHorario } from '../dominio/tipos.ts';
import type { AlumnoParaPanelCentro } from '../dominio/panelCentro.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearCentro(sobrescribir: Partial<CentroEstudios> = {}): CentroEstudios {
  return { id: 'centro-1', nombre: 'IES Uno', activo: true, creado_en: '2026-01-01T00:00:00.000Z', actualizado_en: '2026-01-01T00:00:00.000Z', ...sobrescribir };
}

function crearAlumno(sobrescribir: Partial<AlumnoParaPanelCentro> = {}): AlumnoParaPanelCentro {
  return { id: 'alumno-1', nombre: 'Lucía', primer_apellido: 'Gómez', segundo_apellido: null, ...sobrescribir };
}

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-1',
    dia_semana: 1,
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

function crearProfesor(sobrescribir: Partial<ProfesorParaSelector> = {}): ProfesorParaSelector {
  return { id: 'profesor-1', nombre: 'Marta López', ...sobrescribir };
}

const RELOJ_HOY = crearRelojFijo(new Date('2026-09-10T10:00:00.000Z'));

function crearDepsFalsas(overrides: Partial<DependenciasPantallaAsistentePrimerosPasos> = {}): DependenciasPantallaAsistentePrimerosPasos {
  return {
    rol: 'administrator',
    reloj: RELOJ_HOY,
    listarCentrosActivos: () => Promise.resolve([]),
    listarAlumnosActivos: () => Promise.resolve([]),
    listarSlots: () => Promise.resolve([]),
    listarProfesoresActivos: () => Promise.resolve([]),
    irACentros: () => undefined,
    irAAlumnoNuevo: () => undefined,
    irAAlumnos: () => undefined,
    irAUsuarios: () => undefined,
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
  mostrarPantallaAsistentePrimerosPasos(
    contenedor,
    crearDepsFalsas({ rol: 'teacher', listarCentrosActivos: () => Promise.reject(new Error('no se esperaba esta llamada')) }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('un student ve un mensaje de acceso denegado', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(contenedor, crearDepsFalsas({ listarCentrosActivos: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando…/);
});

void test('centro recién creado: los cuatro pasos pendientes, cada uno con su botón "Ir"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(contenedor, crearDepsFalsas());
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Pendiente: Da de alta al menos un centro de estudios/);
  assert.match(texto, /Pendiente: Da de alta al menos un alumno activo/);
  assert.match(texto, /Pendiente: Asigna al menos un slot de horario vigente/);
  assert.match(texto, /Pendiente: Da de alta al menos un profesor/);
  const botones = Array.from(contenedor.querySelectorAll('button')).filter((b) => b.textContent === 'Ir');
  assert.equal(botones.length, 4);
});

void test('dar de alta el primer alumno marca (b) como hecho sin ninguna acción manual adicional', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(
    contenedor,
    crearDepsFalsas({ listarAlumnosActivos: () => Promise.resolve([crearAlumno()]) }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Hecho: Da de alta al menos un alumno activo/);
  assert.match(texto, /Pendiente: Da de alta al menos un centro de estudios/);
});

void test('un slot CESADO (vigente_hasta en el pasado) no cuenta como vigente', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(
    contenedor,
    crearDepsFalsas({ listarSlots: () => Promise.resolve([crearSlot({ vigente_hasta: '2026-01-31' })]) }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Pendiente: Asigna al menos un slot de horario vigente/);
});

void test('un slot vigente hoy marca (c) como hecho', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(
    contenedor,
    crearDepsFalsas({ listarSlots: () => Promise.resolve([crearSlot()]) }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Hecho: Asigna al menos un slot de horario vigente/);
});

void test('con los cuatro pasos completos, ningún botón "Ir" y el mensaje de "ya tiene lo mínimo"', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(
    contenedor,
    crearDepsFalsas({
      listarCentrosActivos: () => Promise.resolve([crearCentro()]),
      listarAlumnosActivos: () => Promise.resolve([crearAlumno()]),
      listarSlots: () => Promise.resolve([crearSlot()]),
      listarProfesoresActivos: () => Promise.resolve([crearProfesor()]),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /ya tiene lo mínimo para funcionar/);
  assert.match(texto, /Hecho: Da de alta al menos un centro de estudios/);
  assert.match(texto, /Hecho: Da de alta al menos un alumno activo/);
  assert.match(texto, /Hecho: Asigna al menos un slot de horario vigente/);
  assert.match(texto, /Hecho: Da de alta al menos un profesor/);
  const botones = Array.from(contenedor.querySelectorAll('button')).filter((b) => b.textContent === 'Ir');
  assert.equal(botones.length, 0);
});

void test('cada botón "Ir" navega al destino de su propio paso, nunca al de otro', async () => {
  const contenedor = crearContenedorDePruebas();
  const llamadas: string[] = [];
  mostrarPantallaAsistentePrimerosPasos(
    contenedor,
    crearDepsFalsas({
      irACentros: () => llamadas.push('centros'),
      irAAlumnoNuevo: () => llamadas.push('alumno-nuevo'),
      irAAlumnos: () => llamadas.push('alumnos'),
      irAUsuarios: () => llamadas.push('usuarios'),
    }),
  );
  await esperarMicrotareas();
  const filas = Array.from(contenedor.querySelectorAll('li'));
  assert.equal(filas.length, 4);

  function clicEnFila(indice: number): void {
    const boton = filas[indice]?.querySelector('button');
    assert.ok(boton, `sin botón "Ir" en la fila ${String(indice)}`);
    boton.click();
  }

  clicEnFila(0);
  clicEnFila(1);
  clicEnFila(2);
  clicEnFila(3);
  assert.deepEqual(llamadas, ['centros', 'alumno-nuevo', 'alumnos', 'usuarios']);
});

void test('un fallo al cargar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsistentePrimerosPasos(contenedor, crearDepsFalsas({ listarCentrosActivos: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.match(zonaError?.textContent ?? '', /permiso/i);
});
