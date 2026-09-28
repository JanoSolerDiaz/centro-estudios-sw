import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaAsignaturas, type DependenciasPantallaAsignaturas } from './pantallaAsignaturas.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { Asignatura } from '../dominio/tipos.ts';
import type { OpcionesListarAsignaturas } from '../datos/asignaturas.ts';

const MATEMATICAS: Asignatura = {
  id: 'a1',
  nombre: 'Matemáticas 4ESO',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};
const LENGUA: Asignatura = {
  id: 'a2',
  nombre: 'Lengua 1ESO',
  activo: false,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaAsignaturas> = {}): DependenciasPantallaAsignaturas {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaAsignaturas falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    listarAsignaturas: overrides.listarAsignaturas ?? noImplementado('listarAsignaturas'),
    crearAsignatura: overrides.crearAsignatura ?? noImplementado('crearAsignatura'),
    editarNombreAsignatura: overrides.editarNombreAsignatura ?? noImplementado('editarNombreAsignatura'),
    desactivarAsignatura: overrides.desactivarAsignatura ?? noImplementado('desactivarAsignatura'),
    reactivarAsignatura: overrides.reactivarAsignatura ?? noImplementado('reactivarAsignatura'),
    ...overrides,
  };
}

async function esperarMicrotareas(veces = 3): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsignaturas(contenedor, crearDepsFalsas({ listarAsignaturas: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('lista vacía muestra un mensaje explícito, no una tabla en blanco', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsignaturas(contenedor, crearDepsFalsas({ listarAsignaturas: () => Promise.resolve([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ninguna asignatura/);
});

void test('un fallo al listar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsignaturas(contenedor, crearDepsFalsas({ listarAsignaturas: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

void test('pinta el nombre y el estado de cada asignatura', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaAsignaturas(contenedor, crearDepsFalsas({ listarAsignaturas: () => Promise.resolve([MATEMATICAS, LENGUA]) }));
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Matemáticas 4ESO/);
  assert.match(texto, /Activa/);
  assert.match(texto, /Lengua 1ESO/);
  assert.match(texto, /Inactiva/);
});

void test('un teacher no ve el formulario de alta ni botones de escritura, y se listan solo activas', async () => {
  const contenedor = crearContenedorDePruebas();
  const opcionesRecibidas: OpcionesListarAsignaturas[] = [];
  mostrarPantallaAsignaturas(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarAsignaturas: (opciones) => {
        opcionesRecibidas.push(opciones);
        return Promise.resolve([MATEMATICAS]);
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(opcionesRecibidas[0]?.estado, 'activos');
  assert.equal(contenedor.querySelector('#asignaturas-nuevo-nombre'), null);
  assert.equal(contenedor.querySelector('#asignaturas-filtro-estado'), null);
  const botones = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent);
  assert.ok(!botones.includes('Editar'));
  assert.ok(!botones.includes('Desactivar'));
});

void test('crear una asignatura nueva llama a crearAsignatura y recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  const nombresRecibidos: string[] = [];
  mostrarPantallaAsignaturas(
    contenedor,
    crearDepsFalsas({
      listarAsignaturas: () => {
        llamadasListar += 1;
        return Promise.resolve(llamadasListar === 1 ? [] : [MATEMATICAS]);
      },
      crearAsignatura: (nombre) => {
        nombresRecibidos.push(nombre);
        return Promise.resolve({ tipo: 'guardado', asignatura: MATEMATICAS });
      },
    }),
  );
  await esperarMicrotareas();

  const campoNombre = contenedor.querySelector<HTMLInputElement>('#asignaturas-nuevo-nombre');
  const formulario = campoNombre?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(campoNombre && formulario && ventana);
  campoNombre.value = 'Matemáticas 4ESO';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(nombresRecibidos, ['Matemáticas 4ESO']);
  assert.equal(llamadasListar, 2);
  assert.match(contenedor.textContent, /Matemáticas 4ESO/);
});

void test('crear una asignatura duplicada avisa de la existente y no recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  mostrarPantallaAsignaturas(
    contenedor,
    crearDepsFalsas({
      listarAsignaturas: () => {
        llamadasListar += 1;
        return Promise.resolve([MATEMATICAS]);
      },
      crearAsignatura: () => Promise.resolve({ tipo: 'duplicado', existente: MATEMATICAS }),
    }),
  );
  await esperarMicrotareas();

  const campoNombre = contenedor.querySelector<HTMLInputElement>('#asignaturas-nuevo-nombre');
  const formulario = campoNombre?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(campoNombre && formulario && ventana);
  campoNombre.value = 'matematicas 4eso';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  const zonaInfo = contenedor.querySelector('[role="status"]');
  assert.match(zonaInfo?.textContent ?? '', /Ya existe una asignatura.*Matemáticas 4ESO/);
  assert.equal(llamadasListar, 1, 'no debe recargar la lista tras un duplicado');
});

void test('desactivar una asignatura activa llama a desactivarAsignatura y recarga', async () => {
  const contenedor = crearContenedorDePruebas();
  let idDesactivado: string | undefined;
  let llamadasListar = 0;
  mostrarPantallaAsignaturas(
    contenedor,
    crearDepsFalsas({
      listarAsignaturas: () => {
        llamadasListar += 1;
        return Promise.resolve([MATEMATICAS]);
      },
      desactivarAsignatura: (id) => {
        idDesactivado = id;
        return Promise.resolve({ ...MATEMATICAS, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botonDesactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Desactivar');
  assert.ok(botonDesactivar);
  botonDesactivar.click();
  await esperarMicrotareas();

  assert.equal(idDesactivado, 'a1');
  assert.equal(llamadasListar, 2);
});

void test('reactivar una asignatura inactiva llama a reactivarAsignatura y recarga', async () => {
  const contenedor = crearContenedorDePruebas();
  let idReactivado: string | undefined;
  let llamadasListar = 0;
  mostrarPantallaAsignaturas(
    contenedor,
    crearDepsFalsas({
      listarAsignaturas: () => {
        llamadasListar += 1;
        return Promise.resolve([LENGUA]);
      },
      reactivarAsignatura: (id) => {
        idReactivado = id;
        return Promise.resolve({ ...LENGUA, activo: true });
      },
    }),
  );
  await esperarMicrotareas();

  const botonReactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Reactivar');
  assert.ok(botonReactivar);
  botonReactivar.click();
  await esperarMicrotareas();

  assert.equal(idReactivado, 'a2');
  assert.equal(llamadasListar, 2);
});

void test('editar una asignatura muestra el campo con el valor actual y guarda al enviarlo', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: { id: string; nombre: string }[] = [];
  let llamadasListar = 0;
  mostrarPantallaAsignaturas(
    contenedor,
    crearDepsFalsas({
      listarAsignaturas: () => {
        llamadasListar += 1;
        return Promise.resolve([MATEMATICAS]);
      },
      editarNombreAsignatura: (id, nombre) => {
        cambiosRecibidos.push({ id, nombre });
        return Promise.resolve({ tipo: 'guardado', asignatura: { ...MATEMATICAS, nombre } });
      },
    }),
  );
  await esperarMicrotareas();

  const botonEditar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Editar');
  assert.ok(botonEditar);
  botonEditar.click();
  await esperarMicrotareas();

  const campoEditar = contenedor.querySelector<HTMLInputElement>('#asignatura-editar-a1');
  assert.ok(campoEditar);
  assert.equal(campoEditar.value, 'Matemáticas 4ESO');

  const formulario = campoEditar.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(formulario && ventana);
  campoEditar.value = 'Matemáticas 4ESO B';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [{ id: 'a1', nombre: 'Matemáticas 4ESO B' }]);
  assert.equal(llamadasListar, 2);
});
