import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaListadoAlumnos, type DependenciasPantallaListadoAlumnos } from './pantallaListadoAlumnos.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { AlumnoListado } from '../datos/alumnos.ts';

const ALUMNO: AlumnoListado = {
  id: 'a1',
  nombre: 'Marta',
  primer_apellido: 'García',
  segundo_apellido: 'López',
  centro_referencia_id: 'c1',
  email_alumno: null,
  telefono_alumno: null,
  activo: true,
  alta_en: '2026-01-01T00:00:00Z',
  baja_en: null,
  motivo_baja: null,
  usuario_id: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  centro: { id: 'c1', nombre: 'San José' },
};

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaListadoAlumnos> = {}): DependenciasPantallaListadoAlumnos {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaListadoAlumnos falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: overrides.rol ?? 'administrator',
    listarAlumnos: overrides.listarAlumnos ?? noImplementado('listarAlumnos'),
    irAFicha: overrides.irAFicha ?? (() => undefined),
    irANuevoAlumno: overrides.irANuevoAlumno ?? (() => undefined),
  };
}

async function esperarMicrotareas(veces = 3): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function disparar(elemento: Element, tipo: string): void {
  const ventana = elemento.ownerDocument.defaultView;
  assert.ok(ventana);
  elemento.dispatchEvent(new ventana.Event(tipo));
}

void test('un teacher ve "No tienes acceso" y no se dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarAlumnos: () => {
        llamadas += 1;
        return Promise.resolve({ alumnos: [], totalAproximado: 0 });
      },
    }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaListadoAlumnos(contenedor, crearDepsFalsas({ listarAlumnos: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('lista vacía muestra un mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({ listarAlumnos: () => Promise.resolve({ alumnos: [], totalAproximado: 0 }) }),
  );
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún alumno/);
});

void test('un 403 (SinPermiso) muestra un mensaje comprensible, no rompe la pantalla', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaListadoAlumnos(contenedor, crearDepsFalsas({ listarAlumnos: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
  // La pantalla sigue montada y usable: el buscador sigue en el DOM.
  assert.ok(contenedor.querySelector('#alumnos-busqueda'));
});

void test('pinta nombre completo, centro y estado de cada alumno', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({ listarAlumnos: () => Promise.resolve({ alumnos: [ALUMNO], totalAproximado: 1 }) }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Marta García López/);
  assert.match(texto, /San José/);
  assert.match(texto, /Activo/);
});

void test('"Ver ficha" navega con el id del alumno', async () => {
  const contenedor = crearContenedorDePruebas();
  const idsVisitados: string[] = [];
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => Promise.resolve({ alumnos: [ALUMNO], totalAproximado: 1 }),
      irAFicha: (id) => idsVisitados.push(id),
    }),
  );
  await esperarMicrotareas();
  const boton = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent.includes('Ver ficha'));
  assert.ok(boton);
  boton.click();
  assert.deepEqual(idsVisitados, ['a1']);
});

void test('"Nuevo alumno" navega al alta', () => {
  const contenedor = crearContenedorDePruebas();
  let llamado = 0;
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({ listarAlumnos: () => new Promise(() => undefined), irANuevoAlumno: () => (llamado += 1) }),
  );
  const boton = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent.includes('Nuevo alumno'));
  assert.ok(boton);
  boton.click();
  assert.equal(llamado, 1);
});

void test('escribir en el buscador reinicia la página a 0 y vuelve a pedir', async () => {
  const contenedor = crearContenedorDePruebas();
  const busquedas: (string | undefined)[] = [];
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: (opciones) => {
        busquedas.push(opciones.busqueda);
        return Promise.resolve({ alumnos: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();
  const campo = contenedor.querySelector<HTMLInputElement>('#alumnos-busqueda');
  assert.ok(campo);
  campo.value = 'mar';
  disparar(campo, 'input');
  await esperarMicrotareas();
  assert.deepEqual(busquedas, ['', 'mar']);
});

void test('cambiar el filtro de estado vuelve a pedir con el nuevo estado', async () => {
  const contenedor = crearContenedorDePruebas();
  const estados: (string | undefined)[] = [];
  mostrarPantallaListadoAlumnos(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: (opciones) => {
        estados.push(opciones.estado);
        return Promise.resolve({ alumnos: [], totalAproximado: 0 });
      },
    }),
  );
  await esperarMicrotareas();
  const select = contenedor.querySelector<HTMLSelectElement>('#alumnos-filtro-estado');
  assert.ok(select);
  select.value = 'inactivos';
  disparar(select, 'change');
  await esperarMicrotareas();
  assert.deepEqual(estados, ['activos', 'inactivos']);
});
