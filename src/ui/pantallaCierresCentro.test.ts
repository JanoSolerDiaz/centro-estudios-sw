import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaCierresCentro, type DependenciasPantallaCierresCentro } from './pantallaCierresCentro.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { CierreCentro } from '../dominio/tipos.ts';
import type { OpcionesListarCierres } from '../datos/cierresCentro.ts';

const NAVIDAD: CierreCentro = {
  id: 'c1',
  fecha_inicio: '2026-12-20',
  fecha_fin: '2026-12-31',
  motivo: 'Navidad',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};
const SEMANA_SANTA: CierreCentro = {
  id: 'c2',
  fecha_inicio: '2026-04-06',
  fecha_fin: '2026-04-10',
  motivo: 'Semana Santa',
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

function crearDepsFalsas(overrides: Partial<DependenciasPantallaCierresCentro> = {}): DependenciasPantallaCierresCentro {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaCierresCentro falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    listarCierres: overrides.listarCierres ?? noImplementado('listarCierres'),
    crearCierre: overrides.crearCierre ?? noImplementado('crearCierre'),
    editarCierre: overrides.editarCierre ?? noImplementado('editarCierre'),
    desactivarCierre: overrides.desactivarCierre ?? noImplementado('desactivarCierre'),
    reactivarCierre: overrides.reactivarCierre ?? noImplementado('reactivarCierre'),
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
  mostrarPantallaCierresCentro(contenedor, crearDepsFalsas({ listarCierres: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('lista vacía muestra un mensaje explícito, no una tabla en blanco', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaCierresCentro(contenedor, crearDepsFalsas({ listarCierres: () => Promise.resolve([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún cierre/);
});

void test('un fallo al listar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaCierresCentro(contenedor, crearDepsFalsas({ listarCierres: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

void test('pinta el rango de fechas, el motivo y el estado de cada cierre', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaCierresCentro(contenedor, crearDepsFalsas({ listarCierres: () => Promise.resolve([NAVIDAD, SEMANA_SANTA]) }));
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /2026-12-20 a 2026-12-31/);
  assert.match(texto, /Navidad/);
  assert.match(texto, /Activo/);
  assert.match(texto, /Semana Santa/);
  assert.match(texto, /Inactivo/);
});

void test('un cierre de un solo día no repite la fecha dos veces', async () => {
  const contenedor = crearContenedorDePruebas();
  const unDia: CierreCentro = { ...NAVIDAD, fecha_inicio: '2026-11-01', fecha_fin: '2026-11-01' };
  mostrarPantallaCierresCentro(contenedor, crearDepsFalsas({ listarCierres: () => Promise.resolve([unDia]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /2026-11-01/);
  assert.doesNotMatch(contenedor.textContent, /2026-11-01 a 2026-11-01/);
});

void test('un teacher no ve el formulario de alta ni botones de escritura, y se listan solo activos', async () => {
  const contenedor = crearContenedorDePruebas();
  const opcionesRecibidas: OpcionesListarCierres[] = [];
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      rol: 'teacher',
      listarCierres: (opciones) => {
        opcionesRecibidas.push(opciones);
        return Promise.resolve([NAVIDAD]);
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(opcionesRecibidas[0]?.estado, 'activos');
  assert.equal(contenedor.querySelector('#cierres-nuevo-motivo'), null);
  assert.equal(contenedor.querySelector('#cierres-filtro-estado'), null);
  const botones = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent);
  assert.ok(!botones.includes('Editar'));
  assert.ok(!botones.includes('Desactivar'));
});

void test('crear un cierre sin solape llama a crearCierre y recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  const datosRecibidos: { fechaInicio: string; fechaFin: string; motivo: string }[] = [];
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      listarCierres: () => {
        llamadasListar += 1;
        return Promise.resolve(llamadasListar === 1 ? [] : [NAVIDAD]);
      },
      crearCierre: (fechaInicio, fechaFin, motivo) => {
        datosRecibidos.push({ fechaInicio, fechaFin, motivo });
        return Promise.resolve({ tipo: 'guardado', cierre: NAVIDAD });
      },
    }),
  );
  await esperarMicrotareas();

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#cierres-nuevo-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#cierres-nuevo-fin');
  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#cierres-nuevo-motivo');
  const formulario = campoMotivo?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(campoInicio && campoFin && campoMotivo && formulario && ventana);
  campoInicio.value = '2026-12-20';
  campoFin.value = '2026-12-31';
  campoMotivo.value = 'Navidad';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(datosRecibidos, [{ fechaInicio: '2026-12-20', fechaFin: '2026-12-31', motivo: 'Navidad' }]);
  assert.equal(llamadasListar, 2);
  assert.match(contenedor.textContent, /Navidad/);
});

void test('crear un cierre solapado avisa del existente y no recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      listarCierres: () => {
        llamadasListar += 1;
        return Promise.resolve([NAVIDAD]);
      },
      crearCierre: () => Promise.resolve({ tipo: 'solapado', existente: NAVIDAD }),
    }),
  );
  await esperarMicrotareas();

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#cierres-nuevo-inicio');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#cierres-nuevo-fin');
  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#cierres-nuevo-motivo');
  const formulario = campoMotivo?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(campoInicio && campoFin && campoMotivo && formulario && ventana);
  campoInicio.value = '2026-12-24';
  campoFin.value = '2027-01-02';
  campoMotivo.value = 'Puente';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  const zonaInfo = contenedor.querySelector('[role="status"]');
  assert.match(zonaInfo?.textContent ?? '', /se pisa con un cierre ya activo.*Navidad/);
  assert.equal(llamadasListar, 1, 'no debe recargar la lista tras un solape');
});

void test('desactivar un cierre activo llama a desactivarCierre y recarga', async () => {
  const contenedor = crearContenedorDePruebas();
  let idDesactivado: string | undefined;
  let llamadasListar = 0;
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      listarCierres: () => {
        llamadasListar += 1;
        return Promise.resolve([NAVIDAD]);
      },
      desactivarCierre: (id) => {
        idDesactivado = id;
        return Promise.resolve({ ...NAVIDAD, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botonDesactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Desactivar');
  assert.ok(botonDesactivar);
  botonDesactivar.click();
  await esperarMicrotareas();

  assert.equal(idDesactivado, 'c1');
  assert.equal(llamadasListar, 2);
});

void test('reactivar un cierre inactivo sin solape llama a reactivarCierre', async () => {
  const contenedor = crearContenedorDePruebas();
  let idReactivado: string | undefined;
  let llamadasListar = 0;
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      listarCierres: () => {
        llamadasListar += 1;
        return Promise.resolve([SEMANA_SANTA]);
      },
      reactivarCierre: (id) => {
        idReactivado = id;
        return Promise.resolve({ tipo: 'guardado', cierre: { ...SEMANA_SANTA, activo: true } });
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

void test('reactivar un cierre que ahora se pisa avisa del existente y no recarga', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      listarCierres: () => {
        llamadasListar += 1;
        return Promise.resolve([SEMANA_SANTA]);
      },
      reactivarCierre: () => Promise.resolve({ tipo: 'solapado', existente: NAVIDAD }),
    }),
  );
  await esperarMicrotareas();

  const botonReactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Reactivar');
  assert.ok(botonReactivar);
  botonReactivar.click();
  await esperarMicrotareas();

  const zonaInfo = contenedor.querySelector('[role="status"]');
  assert.match(zonaInfo?.textContent ?? '', /se pisa con un cierre ya activo/);
  assert.equal(llamadasListar, 1, 'no debe recargar tras un solape al reactivar');
});

void test('editar un cierre muestra los campos con el valor actual y guarda al enviarlo', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: { id: string; fechaInicio: string; fechaFin: string; motivo: string }[] = [];
  let llamadasListar = 0;
  mostrarPantallaCierresCentro(
    contenedor,
    crearDepsFalsas({
      listarCierres: () => {
        llamadasListar += 1;
        return Promise.resolve([NAVIDAD]);
      },
      editarCierre: (id, fechaInicio, fechaFin, motivo) => {
        cambiosRecibidos.push({ id, fechaInicio, fechaFin, motivo });
        return Promise.resolve({ tipo: 'guardado', cierre: { ...NAVIDAD, fecha_fin: fechaFin, motivo } });
      },
    }),
  );
  await esperarMicrotareas();

  const botonEditar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Editar');
  assert.ok(botonEditar);
  botonEditar.click();
  await esperarMicrotareas();

  const campoInicio = contenedor.querySelector<HTMLInputElement>('#cierre-editar-inicio-c1');
  const campoFin = contenedor.querySelector<HTMLInputElement>('#cierre-editar-fin-c1');
  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#cierre-editar-motivo-c1');
  assert.ok(campoInicio && campoFin && campoMotivo);
  assert.equal(campoInicio.value, '2026-12-20');
  assert.equal(campoFin.value, '2026-12-31');
  assert.equal(campoMotivo.value, 'Navidad');

  const formulario = campoMotivo.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(formulario && ventana);
  campoFin.value = '2027-01-06';
  campoMotivo.value = 'Navidad y Reyes';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [
    { id: 'c1', fechaInicio: '2026-12-20', fechaFin: '2027-01-06', motivo: 'Navidad y Reyes' },
  ]);
  assert.equal(llamadasListar, 2);
});
