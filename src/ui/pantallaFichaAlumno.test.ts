import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaFichaAlumno, type DependenciasPantallaFichaAlumno } from './pantallaFichaAlumno.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { CentroEstudios, PersonaReferencia } from '../dominio/tipos.ts';
import type { AlumnoConCentro, AlumnoConCentroYPersonas, OpcionesListarAlumnos } from '../datos/alumnos.ts';

const CENTRO: CentroEstudios = {
  id: 'c1',
  nombre: 'IES Cervantes',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

const GARCIA: AlumnoConCentro = {
  id: 'a1',
  nombre: 'Ana',
  primer_apellido: 'García',
  segundo_apellido: 'Pérez',
  centro_referencia_id: 'c1',
  avatar_ruta: null,
  email_alumno: 'ana@ejemplo.com',
  telefono_alumno: '666123456',
  activo: true,
  alta_en: '2026-01-01T00:00:00Z',
  baja_en: null,
  motivo_baja: null,
  usuario_id: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  centro: { id: 'c1', nombre: 'IES Cervantes' },
};

const GARCIA_CON_PERSONAS: AlumnoConCentroYPersonas = { ...GARCIA, personas_referencia: [] };

const TUTOR: PersonaReferencia = {
  id: 'pr1',
  alumno_id: 'a1',
  nombre: 'Juan',
  primer_apellido: 'García',
  segundo_apellido: null,
  email_referencia: null,
  telefono_referencia: '600000000',
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearDepsFalsas(overrides: Partial<DependenciasPantallaFichaAlumno> = {}): DependenciasPantallaFichaAlumno {
  const noImplementado = (metodo: string) => () =>
    Promise.reject(new Error(`DependenciasPantallaFichaAlumno falsas: ${metodo} no se esperaba en este test`));
  return {
    rol: 'administrator',
    listarAlumnos: overrides.listarAlumnos ?? noImplementado('listarAlumnos'),
    listarCentrosParaSelector:
      overrides.listarCentrosParaSelector ?? (() => Promise.resolve<readonly CentroEstudios[]>([CENTRO])),
    crearAlumno: overrides.crearAlumno ?? noImplementado('crearAlumno'),
    editarAlumno: overrides.editarAlumno ?? noImplementado('editarAlumno'),
    darDeBajaAlumno: overrides.darDeBajaAlumno ?? noImplementado('darDeBajaAlumno'),
    reactivarAlumno: overrides.reactivarAlumno ?? noImplementado('reactivarAlumno'),
    obtenerAlumno: overrides.obtenerAlumno ?? noImplementado('obtenerAlumno'),
    crearPersonaReferencia: overrides.crearPersonaReferencia ?? noImplementado('crearPersonaReferencia'),
    editarPersonaReferencia: overrides.editarPersonaReferencia ?? noImplementado('editarPersonaReferencia'),
    eliminarPersonaReferencia: overrides.eliminarPersonaReferencia ?? noImplementado('eliminarPersonaReferencia'),
    ...overrides,
  };
}

async function esperarMicrotareas(veces = 3): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

function resultadoListado(alumnos: readonly AlumnoConCentro[], totalAproximado: number | null = null) {
  return Promise.resolve({ alumnos, totalAproximado });
}

void test('un teacher no ve nada de esta pantalla, ni siquiera se listan alumnos', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ rol: 'teacher' }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(contenedor.querySelector('form'), null);
});

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ listarAlumnos: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando/);
});

void test('lista vacía muestra un mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ listarAlumnos: () => resultadoListado([]) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /No hay ningún alumno/);
});

void test('un fallo al listar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({ listarAlumnos: () => Promise.reject(new SinPermiso()) }),
  );
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
});

void test('pinta el nombre completo, el centro y el estado de cada alumno', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ listarAlumnos: () => resultadoListado([GARCIA]) }));
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Ana García Pérez/);
  assert.match(texto, /IES Cervantes/);
  assert.match(texto, /Activo/);
});

void test('la búsqueda escrita y el filtro de estado se envían a listarAlumnos', async () => {
  const contenedor = crearContenedorDePruebas();
  const opcionesRecibidas: OpcionesListarAlumnos[] = [];
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: (opciones) => {
        opcionesRecibidas.push(opciones);
        return resultadoListado([]);
      },
    }),
  );
  await esperarMicrotareas();

  const inputBusqueda = contenedor.querySelector<HTMLInputElement>('#alumnos-busqueda');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(inputBusqueda && ventana);
  inputBusqueda.value = 'garcía';
  inputBusqueda.dispatchEvent(new ventana.Event('input', { bubbles: true }));
  await esperarMicrotareas();

  assert.equal(opcionesRecibidas.at(-1)?.busqueda, 'garcía');

  const selectEstado = contenedor.querySelector<HTMLSelectElement>('#alumnos-filtro-estado');
  assert.ok(selectEstado);
  selectEstado.value = 'inactivos';
  selectEstado.dispatchEvent(new ventana.Event('change', { bubbles: true }));
  await esperarMicrotareas();

  assert.equal(opcionesRecibidas.at(-1)?.estado, 'inactivos');
});

void test('crear un alumno con solo un apellido y sin contacto envía los datos y recarga la lista', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasListar = 0;
  const datosRecibidos: unknown[] = [];
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => {
        llamadasListar += 1;
        return resultadoListado(llamadasListar === 1 ? [] : [GARCIA]);
      },
      crearAlumno: (datos) => {
        datosRecibidos.push(datos);
        return Promise.resolve(GARCIA);
      },
    }),
  );
  await esperarMicrotareas();

  const nombre = contenedor.querySelector<HTMLInputElement>('#alumno-nuevo-nombre');
  const primerApellido = contenedor.querySelector<HTMLInputElement>('#alumno-nuevo-primer-apellido');
  const centro = contenedor.querySelector<HTMLSelectElement>('#alumno-nuevo-centro');
  const formulario = nombre?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(nombre && primerApellido && centro && formulario && ventana);

  nombre.value = 'Ana';
  primerApellido.value = 'García';
  centro.value = 'c1';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.deepEqual(datosRecibidos, [
    {
      nombre: 'Ana',
      primer_apellido: 'García',
      segundo_apellido: '',
      centro_referencia_id: 'c1',
      email_alumno: '',
      telefono_alumno: '',
    },
  ]);
  assert.equal(llamadasListar, 2);
  assert.match(contenedor.textContent, /Ana García Pérez/);
});

void test('editar un alumno muestra el formulario con los valores actuales y guarda al enviarlo', async () => {
  const contenedor = crearContenedorDePruebas();
  const cambiosRecibidos: unknown[] = [];
  let llamadasListar = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => {
        llamadasListar += 1;
        return resultadoListado([GARCIA]);
      },
      editarAlumno: (id, datos) => {
        cambiosRecibidos.push({ id, datos });
        return Promise.resolve(GARCIA);
      },
    }),
  );
  await esperarMicrotareas();

  const botonEditar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Editar');
  assert.ok(botonEditar);
  botonEditar.click();
  await esperarMicrotareas();

  const nombre = contenedor.querySelector<HTMLInputElement>('#alumno-editar-a1-nombre');
  assert.ok(nombre);
  assert.equal(nombre.value, 'Ana');

  const formulario = nombre.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(formulario && ventana);
  nombre.value = 'Ana María';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.equal(cambiosRecibidos.length, 1);
  assert.equal((cambiosRecibidos[0] as { id: string }).id, 'a1');
  assert.equal(llamadasListar, 2);
});

void test('dar de baja pide un motivo opcional y llama a darDeBajaAlumno al confirmar', async () => {
  const contenedor = crearContenedorDePruebas();
  const bajasRecibidas: { id: string; motivo: string | undefined }[] = [];
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      darDeBajaAlumno: (id, motivo) => {
        bajasRecibidas.push({ id, motivo });
        return Promise.resolve({ ...GARCIA, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botonBaja = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Dar de baja');
  assert.ok(botonBaja);
  botonBaja.click();
  await esperarMicrotareas();

  assert.equal(bajasRecibidas.length, 0, 'no debe dar de baja antes de confirmar');
  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#alumno-motivo-baja-a1');
  assert.ok(campoMotivo);
  campoMotivo.value = 'Cambio de centro';

  const botonConfirmar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Confirmar baja');
  assert.ok(botonConfirmar);
  botonConfirmar.click();
  await esperarMicrotareas();

  assert.deepEqual(bajasRecibidas, [{ id: 'a1', motivo: 'Cambio de centro' }]);
});

void test('cancelar la confirmación de baja no llama a darDeBajaAlumno', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      darDeBajaAlumno: () => {
        llamadas += 1;
        return Promise.resolve({ ...GARCIA, activo: false });
      },
    }),
  );
  await esperarMicrotareas();

  const botonBaja = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Dar de baja');
  botonBaja?.click();
  await esperarMicrotareas();
  const botonCancelar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Cancelar');
  botonCancelar?.click();
  await esperarMicrotareas();

  assert.equal(llamadas, 0);
  assert.equal(Array.from(contenedor.querySelectorAll('button')).some((b) => b.textContent === 'Confirmar baja'), false);
});

void test('reactivar un alumno inactivo llama a reactivarAlumno', async () => {
  const contenedor = crearContenedorDePruebas();
  let idReactivado: string | undefined;
  let llamadasListar = 0;
  const inactiva = { ...GARCIA, activo: false };
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => {
        llamadasListar += 1;
        return resultadoListado([inactiva]);
      },
      reactivarAlumno: (id) => {
        idReactivado = id;
        return Promise.resolve({ ...GARCIA, activo: true });
      },
    }),
  );
  await esperarMicrotareas();

  const botonReactivar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Reactivar');
  assert.ok(botonReactivar);
  botonReactivar.click();
  await esperarMicrotareas();

  assert.equal(idReactivado, 'a1');
  assert.equal(llamadasListar, 2);
});

void test('el paginador deshabilita "Anterior" en la primera página y "Siguiente" cuando no hay más', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({ listarAlumnos: () => resultadoListado([GARCIA], 1) }),
  );
  await esperarMicrotareas();

  const botonAnterior = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Anterior');
  const botonSiguiente = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Siguiente');
  assert.ok(botonAnterior);
  assert.ok(botonSiguiente);
  assert.equal(botonAnterior.disabled, true);
  assert.equal(botonSiguiente.disabled, true);
});

void test('pulsar "Siguiente" pide la página siguiente a listarAlumnos', async () => {
  const contenedor = crearContenedorDePruebas();
  const paginasRecibidas: (number | undefined)[] = [];
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: (opciones) => {
        paginasRecibidas.push(opciones.pagina);
        return resultadoListado(Array.from({ length: 20 }, () => GARCIA), 100);
      },
    }),
  );
  await esperarMicrotareas();

  const botonSiguiente = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Siguiente');
  assert.ok(botonSiguiente);
  assert.equal(botonSiguiente.disabled, false);
  botonSiguiente.click();
  await esperarMicrotareas();

  assert.deepEqual(paginasRecibidas, [0, 1]);
});

void test('pulsar "Personas de referencia" pide la ficha completa y pinta a las personas ya existentes', async () => {
  const contenedor = crearContenedorDePruebas();
  const idsPedidos: string[] = [];
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      obtenerAlumno: (id) => {
        idsPedidos.push(id);
        return Promise.resolve({ ...GARCIA_CON_PERSONAS, personas_referencia: [TUTOR] });
      },
    }),
  );
  await esperarMicrotareas();

  const botonPersonas = Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent === 'Personas de referencia',
  );
  assert.ok(botonPersonas);
  botonPersonas.click();
  await esperarMicrotareas();

  assert.deepEqual(idsPedidos, ['a1']);
  assert.match(contenedor.textContent, /Juan García/);
  assert.match(contenedor.textContent, /600000000/);
});

void test('un alumno sin ninguna persona de referencia muestra el mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      obtenerAlumno: () => Promise.resolve(GARCIA_CON_PERSONAS),
    }),
  );
  await esperarMicrotareas();

  const botonPersonas = Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent === 'Personas de referencia',
  );
  botonPersonas?.click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /no tiene ninguna persona de referencia/);
});

void test('añadir una persona de referencia llama a crearPersonaReferencia y recarga la sección', async () => {
  const contenedor = crearContenedorDePruebas();
  const datosRecibidos: unknown[] = [];
  let vecesObtenido = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      obtenerAlumno: () => {
        vecesObtenido += 1;
        return Promise.resolve({
          ...GARCIA_CON_PERSONAS,
          personas_referencia: vecesObtenido === 1 ? [] : [TUTOR],
        });
      },
      crearPersonaReferencia: (alumnoId, datos) => {
        datosRecibidos.push({ alumnoId, datos });
        return Promise.resolve(TUTOR);
      },
    }),
  );
  await esperarMicrotareas();

  const botonPersonas = Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent === 'Personas de referencia',
  );
  botonPersonas?.click();
  await esperarMicrotareas();

  const nombre = contenedor.querySelector<HTMLInputElement>('#persona-nueva-a1-nombre');
  const primerApellido = contenedor.querySelector<HTMLInputElement>('#persona-nueva-a1-primer-apellido');
  const telefono = contenedor.querySelector<HTMLInputElement>('#persona-nueva-a1-telefono');
  const formulario = nombre?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(nombre && primerApellido && telefono && formulario && ventana);

  nombre.value = 'Juan';
  primerApellido.value = 'García';
  telefono.value = '600000000';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.equal(datosRecibidos.length, 1);
  assert.equal((datosRecibidos[0] as { alumnoId: string }).alumnoId, 'a1');
  assert.match(contenedor.textContent, /Juan García/);
});

void test('añadir una persona con el mismo nombre y teléfono que otra ya existente avisa sin bloquear', async () => {
  const contenedor = crearContenedorDePruebas();
  let vecesCreado = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      obtenerAlumno: () => Promise.resolve({ ...GARCIA_CON_PERSONAS, personas_referencia: [TUTOR] }),
      crearPersonaReferencia: () => {
        vecesCreado += 1;
        return Promise.resolve(TUTOR);
      },
    }),
  );
  await esperarMicrotareas();

  const botonPersonas = Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent === 'Personas de referencia',
  );
  botonPersonas?.click();
  await esperarMicrotareas();

  const nombre = contenedor.querySelector<HTMLInputElement>('#persona-nueva-a1-nombre');
  const primerApellido = contenedor.querySelector<HTMLInputElement>('#persona-nueva-a1-primer-apellido');
  const telefono = contenedor.querySelector<HTMLInputElement>('#persona-nueva-a1-telefono');
  const formulario = nombre?.closest('form');
  const ventana = contenedor.ownerDocument.defaultView;
  assert.ok(nombre && primerApellido && telefono && formulario && ventana);

  nombre.value = 'Juan';
  primerApellido.value = 'García';
  telefono.value = '600000000';
  formulario.dispatchEvent(new ventana.Event('submit', { cancelable: true, bubbles: true }));
  await esperarMicrotareas();

  assert.equal(vecesCreado, 1, 'el aviso no debe bloquear el alta');
  assert.match(contenedor.textContent, /Ya existe una persona de referencia/);
});

void test('eliminar una persona de referencia pide confirmación explícita y definitiva antes de borrar', async () => {
  const contenedor = crearContenedorDePruebas();
  let vecesEliminado = 0;
  let vecesObtenido = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      listarAlumnos: () => resultadoListado([GARCIA]),
      obtenerAlumno: () => {
        vecesObtenido += 1;
        return Promise.resolve({
          ...GARCIA_CON_PERSONAS,
          personas_referencia: vecesObtenido === 1 ? [TUTOR] : [],
        });
      },
      eliminarPersonaReferencia: (id) => {
        vecesEliminado += 1;
        assert.equal(id, 'pr1');
        return Promise.resolve();
      },
    }),
  );
  await esperarMicrotareas();

  const botonPersonas = Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent === 'Personas de referencia',
  );
  botonPersonas?.click();
  await esperarMicrotareas();

  const botonEliminar = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Eliminar');
  assert.ok(botonEliminar);
  botonEliminar.click();
  await esperarMicrotareas();

  assert.equal(vecesEliminado, 0, 'no debe borrar antes de confirmar');
  assert.match(contenedor.textContent, /definitiva y no se puede deshacer/);

  const botonConfirmar = Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent === 'Confirmar eliminación',
  );
  assert.ok(botonConfirmar);
  botonConfirmar.click();
  await esperarMicrotareas();

  assert.equal(vecesEliminado, 1);
  assert.match(contenedor.textContent, /no tiene ninguna persona de referencia/);
});
