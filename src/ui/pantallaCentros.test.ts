import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaCentros, type DependenciasPantallaCentros } from './pantallaCentros.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { CentroEstudios } from '../dominio/tipos.ts';
import type { OpcionesListarCentros } from '../datos/centrosEstudios.ts';

const SAN_JOSE: CentroEstudios = {
  id: 'c1',
  nombre: 'San José',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};
const CERVANTES: CentroEstudios = {
  id: 'c2',
  nombre: 'IES Cervantes',
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

function crearDepsFalsas(overrides: Partial<DependenciasPantallaCentros> = {}): DependenciasPantallaCentros {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaCentros falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    listarCentros: overrides.listarCentros ?? noImplementado('listarCentros'),
    crearCentro: overrides.crearCentro ?? noImplementado('crearCentro'),
    editarNombreCentro: overrides.editarNombreCentro ?? noImplementado('editarNombreCentro'),
    contarAlumnosActivosDeCentro: overrides.contarAlumnosActivosDeCentro ?? noImplementado('contarAlumnosActivosDeCentro'),
    desactivarCentro: overrides.desactivarCentro ?? noImplementado('desactivarCentro'),
    reactivarCentro: overrides.reactivarCentro ?? noImplementado('reactivarCentro'),
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
  mostrarPantallaCentros(contenedor, crearDepsFalsas({ listarCentros: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('lista vacía muestra un mensaje explícito, no una tabla en blanco', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaCentros(contenedor, crearDepsFalsas({ listarCentros: () => Promise.resolve([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún centro/);
});

void test('un fallo al listar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaCentros(contenedor, crearDepsFalsas({ listarCentros: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

void test('pinta el nombre y el estado de cada centro', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaCentros(contenedor, crearDepsFalsas({ listarCentros: () => Promise.resolve([SAN_JOSE, CERVANTES]) }));
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /San José/);
  assert.match(texto, /Activo/);
  assert.match(texto, /IES Cervantes/);
  assert.match(texto, /Inactivo/);
});

void test('un teacher no ve el formulario de alta ni botones de escritura, y se listan solo activos', async () => {
  const contenedor = crearContenedorDePruebas();
  const opcionesRecibidas: OpcionesListarCentros[] = [];
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarCentros: (opciones) => {
        opcionesRecibidas.push(opciones);
        return Promise.resolve([SAN_JOSE]);
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(opcionesRecibidas[0]?.estado, 'activos');
  assert.equal(contenedor.querySelector('#centros-nuevo-nombre'), null);
  assert.equal(contenedor.querySelector('#centros-filtro-estado'), null);
  const botones = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent);
  assert.ok(!botones.includes('Editar'));
  assert.ok(!botones.includes('Desactivar'));
});

void test('crear un centro con nombre nuevo llama a crearCentro y recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  const nombresRecibidos: string[] = [];
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: () => {
        llamadasListar += 1;
        return Promise.resolve(llamadasListar === 1 ? [] : [SAN_JOSE]);
      },
      crearCentro: (nombre) => {
        nombresRecibidos.push(nombre);
        return Promise.resolve({ tipo: 'guardado', centro: SAN_JOSE });
      },
    }),
  );
  await esperarMicrotareas();

  const input = contenedor.querySelector<HTMLInputElement>('#centros-nuevo-nombre');
  const formulario = input?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(input);
  assert.ok(formulario);
  assert.ok(ventana);
  input.value = 'San José';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(nombresRecibidos, ['San José']);
  assert.equal(llamadasListar, 2);
  assert.match(contenedor.textContent, /San José/);
});

void test('crear un centro duplicado avisa del existente y no recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: () => {
        llamadasListar += 1;
        return Promise.resolve([CERVANTES]);
      },
      crearCentro: () => Promise.resolve({ tipo: 'duplicado', existente: CERVANTES }),
    }),
  );
  await esperarMicrotareas();

  const input = contenedor.querySelector<HTMLInputElement>('#centros-nuevo-nombre');
  const formulario = input?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(input && formulario && ventana);
  input.value = 'ies cervantes';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  const zonaInfo = contenedor.querySelector('[role="status"]');
  assert.match(zonaInfo?.textContent ?? '', /Ya existe un centro.*IES Cervantes/);
  assert.equal(llamadasListar, 1, 'no debe recargar la lista tras un duplicado');
});

void test('desactivar pide confirmación mostrando cuántos alumnos activos se ven afectados', async () => {
  const contenedor = crearContenedorDePruebas();
  let idDesactivado: string | undefined;
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: () => Promise.resolve([SAN_JOSE]),
      contarAlumnosActivosDeCentro: () => Promise.resolve(3),
      desactivarCentro: (id) => {
        idDesactivado = id;
        return Promise.resolve({ ...SAN_JOSE, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botones = Array.from(contenedor.querySelectorAll('button'));
  const botonDesactivar = botones.find((b) => b.textContent === 'Desactivar');
  assert.ok(botonDesactivar);
  botonDesactivar.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /3 alumno/);
  assert.equal(idDesactivado, undefined, 'no debe desactivar antes de confirmar');

  const botonesTrasAviso = Array.from(contenedor.querySelectorAll('button'));
  const botonConfirmar = botonesTrasAviso.find((b) => b.textContent === 'Confirmar baja');
  assert.ok(botonConfirmar);
  botonConfirmar.click();
  await esperarMicrotareas();

  assert.equal(idDesactivado, 'c1');
});

void test('cancelar la confirmación de baja no llama a desactivarCentro', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasDesactivar = 0;
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: () => Promise.resolve([SAN_JOSE]),
      contarAlumnosActivosDeCentro: () => Promise.resolve(0),
      desactivarCentro: () => {
        llamadasDesactivar += 1;
        return Promise.resolve({ ...SAN_JOSE, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botonDesactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Desactivar');
  botonDesactivar?.click();
  await esperarMicrotareas();
  const botonCancelar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Cancelar');
  botonCancelar?.click();
  await esperarMicrotareas();

  assert.equal(llamadasDesactivar, 0);
  assert.equal(Array.from(contenedor.querySelectorAll('button')).some((b) => b.textContent === 'Confirmar baja'), false);
});

void test('reactivar un centro inactivo llama a reactivarCentro', async () => {
  const contenedor = crearContenedorDePruebas();
  let idReactivado: string | undefined;
  let llamadasListar = 0;
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: () => {
        llamadasListar += 1;
        return Promise.resolve([CERVANTES]);
      },
      reactivarCentro: (id) => {
        idReactivado = id;
        return Promise.resolve({ ...CERVANTES, activo: true });
      },
    }),
  );
  await esperarMicrotareas();

  const botonReactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Reactivar');
  assert.ok(botonReactivar);
  botonReactivar.click();
  await esperarMicrotareas();

  assert.equal(idReactivado, 'c2');
  assert.equal(llamadasListar, 2);
});

void test('editar el nombre de un centro muestra un campo con el valor actual y guarda al enviarlo', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: { id: string; nombre: string }[] = [];
  let llamadasListar = 0;
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: () => {
        llamadasListar += 1;
        return Promise.resolve([SAN_JOSE]);
      },
      editarNombreCentro: (id, nombre) => {
        cambiosRecibidos.push({ id, nombre });
        return Promise.resolve({ tipo: 'guardado', centro: { ...SAN_JOSE, nombre } });
      },
    }),
  );
  await esperarMicrotareas();

  const botonEditar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Editar');
  assert.ok(botonEditar);
  botonEditar.click();
  await esperarMicrotareas();

  const inputEdicion = contenedor.querySelector<HTMLInputElement>('#centro-editar-c1');
  assert.ok(inputEdicion);
  assert.equal(inputEdicion.value, 'San José');

  const formulario = inputEdicion.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(formulario && ventana);
  inputEdicion.value = 'San José (Sede Norte)';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [{ id: 'c1', nombre: 'San José (Sede Norte)' }]);
  assert.equal(llamadasListar, 2);
});

void test('la búsqueda escrita se envía a listarCentros', async () => {
  const contenedor = crearContenedorDePruebas();
  const busquedasRecibidas: (string | undefined)[] = [];
  mostrarPantallaCentros(
    contenedor,
    crearDepsFalsas({
      listarCentros: (opciones) => {
        busquedasRecibidas.push(opciones.busqueda);
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();

  const input = contenedor.querySelector<HTMLInputElement>('#centros-busqueda');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(input && ventana);
  input.value = 'cerv';
  input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
  await esperarMicrotareas();

  assert.equal(busquedasRecibidas.at(-1), 'cerv');
});
