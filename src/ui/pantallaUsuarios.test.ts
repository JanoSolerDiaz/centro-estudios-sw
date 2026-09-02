import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaUsuarios, type DependenciasPantallaUsuarios } from './pantallaUsuarios.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { Perfil } from '../dominio/tipos.ts';
import type { OpcionesListarUsuarios } from '../datos/usuarios.ts';

function perfil(parcial: Partial<Perfil>): Perfil {
  return {
    id: 'u1',
    nombre: 'Ana Admin',
    rol: 'administrator',
    activo: true,
    intentos_fallidos: 0,
    bloqueado: false,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    actualizado_por: null,
    ...parcial,
  };
}

const ADMIN = perfil({ id: 'u1', nombre: 'Ana Admin', rol: 'administrator' });
const TEACHER = perfil({ id: 'u2', nombre: 'Pedro Profesor', rol: 'teacher' });
const TEACHER_INACTIVO = perfil({ id: 'u3', nombre: 'Rosa Retirada', rol: 'teacher', activo: false });

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaUsuarios> = {}): DependenciasPantallaUsuarios {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaUsuarios falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    listarUsuarios: overrides.listarUsuarios ?? noImplementado('listarUsuarios'),
    actualizarUsuario: overrides.actualizarUsuario ?? noImplementado('actualizarUsuario'),
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
  mostrarPantallaUsuarios(contenedor, crearDepsFalsas({ listarUsuarios: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('un rol sin permiso no ve nada de la pantalla, ni una sola llamada a listarUsuarios', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({ rol: 'teacher', listarUsuarios: () => ((llamadas += 1), Promise.resolve([])) }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

void test('lista vacía muestra un mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaUsuarios(contenedor, crearDepsFalsas({ listarUsuarios: () => Promise.resolve([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún usuario/);
});

void test('un fallo al listar muestra el mensaje amigable', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaUsuarios(contenedor, crearDepsFalsas({ listarUsuarios: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

void test('pinta nombre, estado y rol de cada usuario', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaUsuarios(contenedor, crearDepsFalsas({ listarUsuarios: () => Promise.resolve([ADMIN, TEACHER]) }));
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Ana Admin/);
  assert.match(texto, /Pedro Profesor/);
  assert.match(texto, /Activo/);
  const selects = Array.from(contenedor.querySelectorAll('select[aria-label]'));
  assert.equal(selects.length, 2);
});

void test('editar el nombre muestra un campo con el valor actual y guarda al enviarlo', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: { id: string; cambios: unknown }[] = [];
  let llamadasListar = 0;
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => {
        llamadasListar += 1;
        return Promise.resolve([TEACHER]);
      },
      actualizarUsuario: (id, cambios) => {
        cambiosRecibidos.push({ id, cambios });
        return Promise.resolve({ ...TEACHER, nombre: 'Pedro Nuevo' });
      },
    }),
  );
  await esperarMicrotareas();

  const botonEditar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Editar nombre');
  assert.ok(botonEditar);
  botonEditar.click();
  await esperarMicrotareas();

  const inputEdicion = contenedor.querySelector<HTMLInputElement>('#usuario-nombre-u2');
  assert.ok(inputEdicion);
  assert.equal(inputEdicion.value, 'Pedro Profesor');

  const formulario = inputEdicion.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(formulario && ventana);
  inputEdicion.value = 'Pedro Nuevo';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [{ id: 'u2', cambios: { nombre: 'Pedro Nuevo' } }]);
  assert.equal(llamadasListar, 2);
});

void test('cambiar el rol en el selector llama a actualizarUsuario con el rol nuevo', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: unknown[] = [];
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => Promise.resolve([TEACHER, ADMIN]),
      actualizarUsuario: (id, cambios) => {
        cambiosRecibidos.push({ id, cambios });
        return Promise.resolve({ ...TEACHER, rol: 'administrator' });
      },
    }),
  );
  await esperarMicrotareas();

  const selectRolTeacher = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Rol de Pedro Profesor"]');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(selectRolTeacher && ventana);
  selectRolTeacher.value = 'administrator';
  selectRolTeacher.dispatchEvent(new ventana.Event('change', { bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [{ id: 'u2', cambios: { rol: 'administrator' } }]);
});

void test('desactivar pide confirmación explícita antes de llamar a actualizarUsuario', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: unknown[] = [];
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => Promise.resolve([TEACHER, ADMIN]),
      actualizarUsuario: (id, cambios) => {
        cambiosRecibidos.push({ id, cambios });
        return Promise.resolve({ ...TEACHER, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botonDesactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Desactivar');
  assert.ok(botonDesactivar);
  botonDesactivar.click();
  await esperarMicrotareas();

  assert.equal(cambiosRecibidos.length, 0, 'no debe desactivar antes de confirmar');
  assert.match(contenedor.textContent, /Confirmas desactivar a Pedro Profesor/);

  const botonConfirmar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Confirmar desactivación');
  assert.ok(botonConfirmar);
  botonConfirmar.click();
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [{ id: 'u2', cambios: { activo: false } }]);
});

void test('reactivar un usuario inactivo llama a actualizarUsuario con activo: true, sin confirmación', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: unknown[] = [];
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => Promise.resolve([TEACHER_INACTIVO]),
      actualizarUsuario: (id, cambios) => {
        cambiosRecibidos.push({ id, cambios });
        return Promise.resolve({ ...TEACHER_INACTIVO, activo: true });
      },
    }),
  );
  await esperarMicrotareas();

  const botonReactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Reactivar');
  assert.ok(botonReactivar);
  botonReactivar.click();
  await esperarMicrotareas();

  assert.deepEqual(cambiosRecibidos, [{ id: 'u3', cambios: { activo: true } }]);
});

void test('el ÚNICO administrator activo: el botón Desactivar está deshabilitado y no llama al servidor', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => Promise.resolve([ADMIN, TEACHER]),
      actualizarUsuario: () => {
        llamadas += 1;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();

  const botonDesactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Desactivar');
  assert.ok(botonDesactivar);
  assert.equal(botonDesactivar.disabled, true, 'el botón debe estar deshabilitado, no solo rechazar al pulsarlo');
  botonDesactivar.click();
  await esperarMicrotareas();

  assert.equal(llamadas, 0, 'un botón deshabilitado no dispara su evento click, ni en jsdom ni en un navegador real');
});

void test('el ÚNICO administrator activo: el selector de rol está deshabilitado', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaUsuarios(contenedor, crearDepsFalsas({ listarUsuarios: () => Promise.resolve([ADMIN, TEACHER]) }));
  await esperarMicrotareas();

  const selectRolAdmin = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Rol de Ana Admin"]');
  assert.ok(selectRolAdmin);
  assert.equal(selectRolAdmin.disabled, true);
});

void test('segunda barrera: aunque se fuerce el evento "change" del selector deshabilitado, no llama al servidor', async () => {
  // El atributo `disabled` ya impide la interacción real (test anterior); esta prueba comprueba la
  // MISMA comprobación de dominio dentro del manejador (`dejariaSinAdministratorActivo`), por si
  // algún día ese evento llegara a dispararse por una vía que este test no anticipa.
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => Promise.resolve([ADMIN, TEACHER]),
      actualizarUsuario: () => {
        llamadas += 1;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();

  const selectRolAdmin = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Rol de Ana Admin"]');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(selectRolAdmin && ventana);
  selectRolAdmin.value = 'teacher';
  selectRolAdmin.dispatchEvent(new ventana.Event('change', { bubbles: true }));
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.match(contenedor.textContent, /sin ningún administrator activo/);
});

void test('con OTRO administrator activo, ni el botón ni el selector están deshabilitados', async () => {
  const contenedor = crearContenedorDePruebas();
  const ADMIN2 = perfil({ id: 'u4', nombre: 'Bruno Backup', rol: 'administrator' });
  mostrarPantallaUsuarios(contenedor, crearDepsFalsas({ listarUsuarios: () => Promise.resolve([ADMIN, ADMIN2]) }));
  await esperarMicrotareas();

  const botonesDesactivar = Array.from(contenedor.querySelectorAll('button')).filter((b) => b.textContent === 'Desactivar');
  assert.equal(botonesDesactivar.length, 2);
  assert.ok(botonesDesactivar.every((b) => !b.disabled));

  const selectRolAdmin = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Rol de Ana Admin"]');
  assert.ok(selectRolAdmin);
  assert.equal(selectRolAdmin.disabled, false);
});

void test('el filtro de rol y de estado se envían a listarUsuarios', async () => {
  const contenedor = crearContenedorDePruebas();
  const opcionesRecibidas: OpcionesListarUsuarios[] = [];
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: (opciones) => {
        opcionesRecibidas.push(opciones);
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal(opcionesRecibidas[0]?.estado, 'activos');

  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(ventana);
  const selectRol = contenedor.querySelector<HTMLSelectElement>('#usuarios-filtro-rol');
  assert.ok(selectRol);
  selectRol.value = 'teacher';
  selectRol.dispatchEvent(new ventana.Event('change', { bubbles: true }));
  await esperarMicrotareas();
  assert.equal(opcionesRecibidas.at(-1)?.rol, 'teacher');

  const selectEstado = contenedor.querySelector<HTMLSelectElement>('#usuarios-filtro-estado');
  assert.ok(selectEstado);
  selectEstado.value = 'todos';
  selectEstado.dispatchEvent(new ventana.Event('change', { bubbles: true }));
  await esperarMicrotareas();
  assert.equal(opcionesRecibidas.at(-1)?.estado, 'todos');
});

void test('la búsqueda escrita se envía a listarUsuarios', async () => {
  const contenedor = crearContenedorDePruebas();
  const busquedasRecibidas: (string | undefined)[] = [];
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: (opciones) => {
        busquedasRecibidas.push(opciones.busqueda);
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();

  const input = contenedor.querySelector<HTMLInputElement>('#usuarios-busqueda');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(input && ventana);
  input.value = 'pedro';
  input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
  await esperarMicrotareas();

  assert.equal(busquedasRecibidas.at(-1), 'pedro');
});

void test('un error del servidor al aplicar un cambio se muestra sin perder la fila', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaUsuarios(
    contenedor,
    crearDepsFalsas({
      listarUsuarios: () => Promise.resolve([TEACHER, ADMIN]),
      actualizarUsuario: () => Promise.reject(new SinPermiso()),
    }),
  );
  await esperarMicrotareas();

  const botonDesactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Desactivar');
  botonDesactivar?.click();
  await esperarMicrotareas();
  const botonConfirmar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Confirmar desactivación');
  botonConfirmar?.click();
  await esperarMicrotareas();

  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
  assert.match(contenedor.textContent, /Pedro Profesor/);
});
