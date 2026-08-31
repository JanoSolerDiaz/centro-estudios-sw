import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaFichaAlumno, type DependenciasPantallaFichaAlumno } from './pantallaFichaAlumno.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { AlumnoConCentro, AlumnoConCentroYPersonas, DatosAlumno } from '../datos/alumnos.ts';
import type { CentroEstudios, PersonaReferencia, SlotHorario } from '../dominio/tipos.ts';

const CENTRO: CentroEstudios = {
  id: 'c1',
  nombre: 'San José',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

function crearFicha(overrides: Partial<AlumnoConCentroYPersonas> = {}): AlumnoConCentroYPersonas {
  return {
    id: 'a1',
    nombre: 'Marta',
    primer_apellido: 'García',
    segundo_apellido: 'López',
    centro_referencia_id: 'c1',
    avatar_ruta: null,
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
    personas_referencia: [],
    ...overrides,
  };
}

const PERSONA: PersonaReferencia = {
  id: 'p1',
  alumno_id: 'a1',
  nombre: 'Juan',
  primer_apellido: 'García',
  segundo_apellido: null,
  email_referencia: null,
  telefono_referencia: '600111222',
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

const SLOT: SlotHorario = {
  id: 's1',
  alumno_id: 'a1',
  profesor_id: 'prof1',
  dia_semana: 1,
  hora_inicio: '16:00',
  hora_fin: '17:00',
  asignatura_o_grupo: 'Matemáticas',
  vigente_desde: '2026-01-01',
  vigente_hasta: null,
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
    alumnoId: null,
    listarCentrosParaSelector: overrides.listarCentrosParaSelector ?? (() => Promise.resolve([CENTRO])),
    obtenerAlumno: overrides.obtenerAlumno ?? noImplementado('obtenerAlumno'),
    crearAlumno: overrides.crearAlumno ?? noImplementado('crearAlumno'),
    editarAlumno: overrides.editarAlumno ?? noImplementado('editarAlumno'),
    darDeBajaAlumno: overrides.darDeBajaAlumno ?? noImplementado('darDeBajaAlumno'),
    reactivarAlumno: overrides.reactivarAlumno ?? noImplementado('reactivarAlumno'),
    crearPersonaReferencia: overrides.crearPersonaReferencia ?? noImplementado('crearPersonaReferencia'),
    editarPersonaReferencia: overrides.editarPersonaReferencia ?? noImplementado('editarPersonaReferencia'),
    eliminarPersonaReferencia: overrides.eliminarPersonaReferencia ?? noImplementado('eliminarPersonaReferencia'),
    obtenerUrlAvatar: overrides.obtenerUrlAvatar ?? (() => Promise.resolve(undefined)),
    subirAvatar: overrides.subirAvatar ?? noImplementado('subirAvatar'),
    eliminarAvatar: overrides.eliminarAvatar ?? noImplementado('eliminarAvatar'),
    listarSlotsDeAlumno: overrides.listarSlotsDeAlumno ?? (() => Promise.resolve([])),
    listarProfesoresParaSelector: overrides.listarProfesoresParaSelector ?? (() => Promise.resolve([])),
    crearSlot: overrides.crearSlot ?? noImplementado('crearSlot'),
    modificarSlot: overrides.modificarSlot ?? noImplementado('modificarSlot'),
    cesarSlot: overrides.cesarSlot ?? noImplementado('cesarSlot'),
    volver: overrides.volver ?? (() => undefined),
    alCrearAlumno: overrides.alCrearAlumno ?? (() => undefined),
    ...overrides,
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
  elemento.dispatchEvent(new ventana.Event(tipo, { bubbles: true, cancelable: true }));
}

function boton(contenedor: HTMLElement, texto: string): HTMLButtonElement {
  const encontrado = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === texto);
  assert.ok(encontrado, `no se encontró un botón con el texto exacto "${texto}"`);
  return encontrado;
}

// --- Acceso ---

void test('un teacher ve "No tienes acceso" y no se dispara ninguna petición', () => {
  const contenedor = crearContenedorDePruebas();
  let llamadas = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({ rol: 'teacher', listarCentrosParaSelector: () => ((llamadas += 1), Promise.resolve([])) }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
  assert.equal(llamadas, 0);
});

// --- Modo alta (alumnoId: null) ---

void test('modo alta: título "Nuevo alumno" y solo el bloque de datos, sin personas/avatar/horario', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ alumnoId: null }));
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Nuevo alumno/);
  assert.equal(contenedor.querySelector('h3'), null); // ninguna cabecera de bloque adicional
  assert.match(contenedor.textContent, /Guarda los datos del alumno/);
});

void test('modo alta: crear con éxito llama a alCrearAlumno con el id nuevo', async () => {
  const contenedor = crearContenedorDePruebas();
  const idsCreados: string[] = [];
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: null,
      crearAlumno: () => Promise.resolve(crearFicha({ id: 'nuevo-1' })),
      alCrearAlumno: (id) => idsCreados.push(id),
    }),
  );
  await esperarMicrotareas();

  const campoNombre = contenedor.querySelector<HTMLInputElement>('#ficha-datos-nombre');
  const campoApellido = contenedor.querySelector<HTMLInputElement>('#ficha-datos-primer-apellido');
  assert.ok(campoNombre);
  assert.ok(campoApellido);
  campoNombre.value = 'Marta';
  campoApellido.value = 'García';
  const formulario = contenedor.querySelector('form');
  assert.ok(formulario);
  disparar(formulario, 'submit');
  await esperarMicrotareas();

  assert.deepEqual(idsCreados, ['nuevo-1']);
  assert.match(contenedor.textContent, /Alumno creado/);
});

// --- Modo edición: carga inicial ---

void test('modo edición: mientras carga muestra "Cargando ficha…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({ alumnoId: 'a1', obtenerAlumno: () => new Promise(() => undefined) }),
  );
  assert.match(contenedor.textContent, /Cargando ficha/);
});

void test('modo edición: un 403 (SinPermiso) al cargar muestra un mensaje comprensible, no rompe la pantalla', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({ alumnoId: 'a1', obtenerAlumno: () => Promise.reject(new SinPermiso()) }),
  );
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.ok(zonaError);
  assert.match(zonaError.textContent, /No tienes permiso/);
  assert.ok(contenedor.querySelector('button')); // "Volver al listado" sigue presente
});

void test('modo edición: carga con éxito pinta los cuatro bloques con sus cabeceras', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ personas_referencia: [PERSONA] })),
      listarSlotsDeAlumno: () => Promise.resolve([SLOT]),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
    }),
  );
  await esperarMicrotareas();

  const cabeceras = Array.from(contenedor.querySelectorAll('h3')).map((h) => h.textContent);
  assert.deepEqual(cabeceras, ['Datos y centro', 'Avatar', 'Personas de referencia', 'Horario']);
  assert.match(contenedor.textContent, /Marta García López/); // título con nombre completo
});

void test('un nombre con marcado se renderiza como texto, nunca como HTML (protección XSS)', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ nombre: '<script>window.hackeado = true</script>' })),
    }),
  );
  await esperarMicrotareas();

  assert.equal(contenedor.querySelector('script'), null);
  assert.match(contenedor.textContent, /<script>window\.hackeado = true<\/script>/);
});

// --- Bloque de datos (edición, baja, reactivar) ---

void test('bloque de datos: editar y guardar llama a editarAlumno con el id y los datos del formulario', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { id: string; datos: DatosAlumno } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      editarAlumno: (id, datos) => {
        recibido = { id, datos };
        return Promise.resolve(crearFicha({ nombre: datos.nombre }) as AlumnoConCentro);
      },
    }),
  );
  await esperarMicrotareas();

  const campoNombre = contenedor.querySelector<HTMLInputElement>('#ficha-datos-nombre');
  assert.ok(campoNombre);
  assert.equal(campoNombre.value, 'Marta'); // precargado desde la ficha
  campoNombre.value = 'Martina';
  const formularioDatos = contenedor.querySelector('form');
  assert.ok(formularioDatos);
  disparar(formularioDatos, 'submit');
  await esperarMicrotareas();

  assert.equal(recibido?.id, 'a1');
  assert.equal(recibido.datos.nombre, 'Martina');
  assert.match(contenedor.textContent, /Datos guardados/);
});

void test('bloque de datos: dar de baja pide confirmación y envía el motivo', async () => {
  const contenedor = crearContenedorDePruebas();
  let motivoRecibido: string | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      darDeBajaAlumno: (_id, motivo) => {
        motivoRecibido = motivo;
        return Promise.resolve(crearFicha({ activo: false }) as AlumnoConCentro);
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Dar de baja').click();
  await esperarMicrotareas();
  const campoMotivo = contenedor.querySelector<HTMLInputElement>('#ficha-motivo-baja');
  assert.ok(campoMotivo);
  campoMotivo.value = 'Cambio de centro';
  boton(contenedor, 'Confirmar baja').click();
  await esperarMicrotareas();

  assert.equal(motivoRecibido, 'Cambio de centro');
  assert.match(contenedor.textContent, /Estado: Inactivo/);
});

void test('bloque de datos: reactivar un alumno inactivo', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ activo: false })),
      reactivarAlumno: () => Promise.resolve(crearFicha({ activo: true }) as AlumnoConCentro),
    }),
  );
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Estado: Inactivo/);
  boton(contenedor, 'Reactivar').click();
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Estado: Activo/);
});

// --- Bloque de personas de referencia ---

void test('bloque de personas: sin ninguna, muestra el mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ alumnoId: 'a1', obtenerAlumno: () => Promise.resolve(crearFicha()) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /no tiene ninguna persona de referencia/);
});

void test('bloque de personas: añadir una persona la incorpora a la lista sin recargar toda la ficha', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamadasObtenerAlumno = 0;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => {
        llamadasObtenerAlumno += 1;
        return Promise.resolve(crearFicha());
      },
      crearPersonaReferencia: (_alumnoId, datos) =>
        Promise.resolve({
          id: 'p-nueva',
          alumno_id: 'a1',
          nombre: datos.nombre,
          primer_apellido: datos.primer_apellido,
          segundo_apellido: datos.segundo_apellido ?? null,
          email_referencia: datos.email_referencia ?? null,
          telefono_referencia: datos.telefono_referencia,
          creado_en: '2026-01-01T00:00:00Z',
          actualizado_en: '2026-01-01T00:00:00Z',
        }),
    }),
  );
  await esperarMicrotareas();
  assert.equal(llamadasObtenerAlumno, 1);

  const nombre = contenedor.querySelector<HTMLInputElement>('#persona-nueva-nombre');
  const apellido = contenedor.querySelector<HTMLInputElement>('#persona-nueva-primer-apellido');
  const telefono = contenedor.querySelector<HTMLInputElement>('#persona-nueva-telefono');
  assert.ok(nombre && apellido && telefono);
  nombre.value = 'Juan';
  apellido.value = 'García';
  telefono.value = '600111222';
  const formularios = Array.from(contenedor.querySelectorAll('form'));
  const formPersona = formularios.find((f) => f.querySelector('#persona-nueva-nombre'));
  assert.ok(formPersona);
  disparar(formPersona, 'submit');
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /Juan García/);
  assert.equal(llamadasObtenerAlumno, 1); // no repite la carga de toda la ficha
});

void test('bloque de personas: eliminar pide confirmación explícita ("no se puede deshacer")', async () => {
  const contenedor = crearContenedorDePruebas();
  let eliminado = false;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ personas_referencia: [PERSONA] })),
      eliminarPersonaReferencia: () => {
        eliminado = true;
        return Promise.resolve();
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Eliminar').click();
  assert.match(contenedor.textContent, /definitiva y no se puede deshacer/);
  assert.equal(eliminado, false);
  boton(contenedor, 'Confirmar eliminación').click();
  await esperarMicrotareas();
  assert.equal(eliminado, true);
});

void test('bloque de personas: editar una persona existente llama a editarPersonaReferencia con sus datos', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { id: string; telefono: string } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ personas_referencia: [PERSONA] })),
      editarPersonaReferencia: (id, datos) => {
        recibido = { id, telefono: datos.telefono_referencia };
        return Promise.resolve({ ...PERSONA, telefono_referencia: datos.telefono_referencia });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Editar').click();
  const campoTelefono = contenedor.querySelector<HTMLInputElement>('#persona-editar-p1-telefono');
  assert.ok(campoTelefono);
  assert.equal(campoTelefono.value, '600111222'); // precargado desde la persona existente
  campoTelefono.value = '611222333';
  const formEdicion = Array.from(contenedor.querySelectorAll('form')).find((f) => f.querySelector('#persona-editar-p1-telefono'));
  assert.ok(formEdicion);
  disparar(formEdicion, 'submit');
  await esperarMicrotareas();

  assert.equal(recibido?.id, 'p1');
  assert.equal(recibido.telefono, '611222333');
  assert.match(contenedor.textContent, /611222333/);
});

// --- Bloque de avatar ---

void test('bloque de avatar: sin foto, muestra el monograma con las iniciales', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ alumnoId: 'a1', obtenerAlumno: () => Promise.resolve(crearFicha()) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /MG/); // iniciales de Marta García
  assert.equal(contenedor.querySelector('img'), null);
});

void test('bloque de avatar: con avatar_ruta, pide la URL firmada y pinta la imagen', async () => {
  const contenedor = crearContenedorDePruebas();
  let rutaPedida: string | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ avatar_ruta: 'alumno/a1/uuid1/' })),
      obtenerUrlAvatar: (rutaBase) => {
        rutaPedida = rutaBase;
        return Promise.resolve('https://firmada.example/avatar.webp');
      },
    }),
  );
  await esperarMicrotareas();

  assert.equal(rutaPedida, 'alumno/a1/uuid1/');
  const imagen = contenedor.querySelector('img');
  assert.ok(imagen);
  assert.equal(imagen.getAttribute('src'), 'https://firmada.example/avatar.webp');
});

void test('bloque de avatar: si la firma falla, cae al monograma en vez de dejar un hueco roto', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ avatar_ruta: 'alumno/a1/uuid1/' })),
      obtenerUrlAvatar: () => Promise.reject(new Error('almacenamiento no disponible')),
    }),
  );
  await esperarMicrotareas();

  assert.equal(contenedor.querySelector('img'), null);
  assert.match(contenedor.textContent, /MG/);
});

void test('bloque de avatar: subir un fichero llama a subirAvatar con el id del alumno y la ruta anterior', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { alumnoId: string; tipo: string; rutaAnterior: string | null } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ avatar_ruta: 'alumno/a1/vieja/' })),
      obtenerUrlAvatar: () => Promise.resolve('https://firmada.example/vieja.webp'),
      subirAvatar: (alumnoId, archivo, rutaBaseAnterior) => {
        recibido = { alumnoId, tipo: archivo.tipo, rutaAnterior: rutaBaseAnterior };
        return Promise.resolve({ rutaBase: 'alumno/a1/nueva/' });
      },
    }),
  );
  await esperarMicrotareas();

  const inputArchivo = contenedor.querySelector<HTMLInputElement>('#ficha-avatar-archivo');
  assert.ok(inputArchivo);
  const archivo = new File(['contenido'], 'foto.png', { type: 'image/png' });
  Object.defineProperty(inputArchivo, 'files', { value: [archivo], configurable: true });
  boton(contenedor, 'Sustituir').click();
  await esperarMicrotareas();

  assert.equal(recibido?.alumnoId, 'a1');
  assert.equal(recibido.tipo, 'image/png');
  assert.equal(recibido.rutaAnterior, 'alumno/a1/vieja/');
});

void test('bloque de avatar: sin elegir fichero, avisa y no llama a subirAvatar', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamado = false;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      subirAvatar: () => {
        llamado = true;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Subir').click();
  assert.equal(llamado, false);
  assert.match(contenedor.textContent, /Elige primero una fotografía/);
});

void test('bloque de avatar: quitar avatar llama a eliminarAvatar y vuelve al monograma', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { alumnoId: string; ruta: string } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha({ avatar_ruta: 'alumno/a1/vieja/' })),
      obtenerUrlAvatar: () => Promise.resolve('https://firmada.example/vieja.webp'),
      eliminarAvatar: (alumnoId, ruta) => {
        recibido = { alumnoId, ruta };
        return Promise.resolve();
      },
    }),
  );
  await esperarMicrotareas();

  assert.ok(contenedor.querySelector('img'));
  boton(contenedor, 'Quitar avatar').click();
  await esperarMicrotareas();

  assert.deepEqual(recibido, { alumnoId: 'a1', ruta: 'alumno/a1/vieja/' });
  assert.equal(contenedor.querySelector('img'), null);
  assert.match(contenedor.textContent, /MG/);
});

// --- Bloque de horario ---

void test('bloque de horario: sin ningún slot, muestra el mensaje explícito y la nota de que el histórico no cambia', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(contenedor, crearDepsFalsas({ alumnoId: 'a1', obtenerAlumno: () => Promise.resolve(crearFicha()) }));
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /no tiene ningún horario asignado/);
  assert.match(contenedor.textContent, /no cambia el histórico/);
});

void test('bloque de horario: pinta profesor, día, horas y la fecha de efecto (vigente_desde) de cada versión', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      listarSlotsDeAlumno: () => Promise.resolve([SLOT]),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
    }),
  );
  await esperarMicrotareas();

  const texto = contenedor.textContent;
  assert.match(texto, /Pedro Profesor/);
  assert.match(texto, /Lunes/);
  assert.match(texto, /16:00–17:00/);
  assert.match(texto, /Desde: 2026-01-01/);
  assert.match(texto, /Vigente/);
});

void test('bloque de horario: la hora de fin anterior a la de inicio se rechaza en el cliente, sin llamar a crearSlot', async () => {
  const contenedor = crearContenedorDePruebas();
  let llamado = false;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
      crearSlot: () => {
        llamado = true;
        return Promise.reject(new Error('no debería llamarse'));
      },
    }),
  );
  await esperarMicrotareas();

  const inicio = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-inicio');
  const fin = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-fin');
  const fechaEfecto = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-fecha-efecto');
  assert.ok(inicio && fin && fechaEfecto);
  inicio.value = '17:00';
  fin.value = '16:00';
  fechaEfecto.value = '2026-02-01';
  const formHorario = Array.from(contenedor.querySelectorAll('form')).find((f) => f.querySelector('#slot-nuevo-inicio'));
  assert.ok(formHorario);
  disparar(formHorario, 'submit');
  await esperarMicrotareas();

  assert.equal(llamado, false);
  assert.match(contenedor.textContent, /La hora de fin debe ser posterior a la de inicio/);
});

void test('bloque de horario: alta válida llama a crearSlot con alumno_id y la fecha de efecto', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { alumno_id: string; hora_inicio: string; hora_fin: string; vigente_desde: Date } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
      crearSlot: (datos) => {
        recibido = datos;
        return Promise.resolve({ slot: { ...SLOT, id: 's-nuevo' }, avisoSolapeProfesor: false });
      },
    }),
  );
  await esperarMicrotareas();

  const inicio = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-inicio');
  const fin = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-fin');
  const fechaEfecto = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-fecha-efecto');
  assert.ok(inicio && fin && fechaEfecto);
  inicio.value = '16:00';
  fin.value = '17:00';
  fechaEfecto.value = '2026-02-01';
  const formHorario = Array.from(contenedor.querySelectorAll('form')).find((f) => f.querySelector('#slot-nuevo-inicio'));
  assert.ok(formHorario);
  disparar(formHorario, 'submit');
  await esperarMicrotareas();

  assert.equal(recibido?.alumno_id, 'a1');
  assert.equal(recibido.hora_inicio, '16:00');
  assert.equal(recibido.hora_fin, '17:00');
  assert.equal(recibido.vigente_desde.toISOString().slice(0, 10), '2026-02-01');
});

void test('bloque de horario: un aviso de solape de profesor se muestra sin bloquear el alta', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
      crearSlot: () => Promise.resolve({ slot: { ...SLOT, id: 's-nuevo' }, avisoSolapeProfesor: true }),
    }),
  );
  await esperarMicrotareas();

  const inicio = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-inicio');
  const fin = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-fin');
  const fechaEfecto = contenedor.querySelector<HTMLInputElement>('#slot-nuevo-fecha-efecto');
  assert.ok(inicio && fin && fechaEfecto);
  inicio.value = '16:00';
  fin.value = '17:00';
  fechaEfecto.value = '2026-02-01';
  const formHorario = Array.from(contenedor.querySelectorAll('form')).find((f) => f.querySelector('#slot-nuevo-inicio'));
  assert.ok(formHorario);
  disparar(formHorario, 'submit');
  await esperarMicrotareas();

  assert.match(contenedor.textContent, /ya tiene otro alumno en este mismo día y hora/);
});

void test('bloque de horario: cesar un slot vigente llama a cesarSlot con la fecha de efecto', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { slotId: string; fecha: Date } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      listarSlotsDeAlumno: () => Promise.resolve([SLOT]),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
      cesarSlot: (slotId, fecha) => {
        recibido = { slotId, fecha };
        return Promise.resolve({ ...SLOT, vigente_hasta: '2026-03-01' });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Cesar').click();
  await esperarMicrotareas();
  const campoFecha = Array.from(contenedor.querySelectorAll<HTMLInputElement>('input[type="date"]')).find((i) =>
    i.id.startsWith('slot-cesar-fecha-efecto'),
  );
  assert.ok(campoFecha);
  campoFecha.value = '2026-03-01';
  boton(contenedor, 'Confirmar cese').click();
  await esperarMicrotareas();

  assert.equal(recibido?.slotId, 's1');
  assert.equal(recibido.fecha.toISOString().slice(0, 10), '2026-03-01');
});

void test('bloque de horario: editar un slot vigente (versionado) llama a modificarSlot con la fecha de efecto', async () => {
  const contenedor = crearContenedorDePruebas();
  let recibido: { slotId: string; horaFin: string; fecha: Date } | undefined;
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      listarSlotsDeAlumno: () => Promise.resolve([SLOT]),
      listarProfesoresParaSelector: () => Promise.resolve([{ id: 'prof1', nombre: 'Pedro Profesor' }]),
      modificarSlot: (slotId, cambios, fecha) => {
        recibido = { slotId, horaFin: cambios.hora_fin ?? '', fecha };
        return Promise.resolve({ slot: { ...SLOT, hora_fin: cambios.hora_fin ?? SLOT.hora_fin }, avisoSolapeProfesor: false });
      },
    }),
  );
  await esperarMicrotareas();

  boton(contenedor, 'Editar').click();
  const campoFin = contenedor.querySelector<HTMLInputElement>('#slot-editar-fin-s1');
  const campoFechaEfecto = contenedor.querySelector<HTMLInputElement>('#slot-editar-fecha-efecto-s1');
  assert.ok(campoFin && campoFechaEfecto);
  assert.equal(campoFin.value, '17:00'); // precargado desde el slot vigente
  campoFin.value = '18:00';
  campoFechaEfecto.value = '2026-04-01';
  const formEdicion = Array.from(contenedor.querySelectorAll('form')).find((f) => f.querySelector('#slot-editar-fin-s1'));
  assert.ok(formEdicion);
  disparar(formEdicion, 'submit');
  await esperarMicrotareas();

  assert.equal(recibido?.slotId, 's1');
  assert.equal(recibido.horaFin, '18:00');
  assert.equal(recibido.fecha.toISOString().slice(0, 10), '2026-04-01');
});

// --- Requisito 5: aislamiento entre bloques ---

void test('un fallo al subir el avatar no descarta los cambios sin guardar del bloque de datos', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaFichaAlumno(
    contenedor,
    crearDepsFalsas({
      alumnoId: 'a1',
      obtenerAlumno: () => Promise.resolve(crearFicha()),
      subirAvatar: () => Promise.reject(new Error('el almacenamiento ha fallado')),
    }),
  );
  await esperarMicrotareas();

  const campoNombre = contenedor.querySelector<HTMLInputElement>('#ficha-datos-nombre');
  assert.ok(campoNombre);
  campoNombre.value = 'Cambio sin guardar';

  const inputArchivo = contenedor.querySelector<HTMLInputElement>('#ficha-avatar-archivo');
  assert.ok(inputArchivo);
  const archivo = new File(['contenido'], 'foto.png', { type: 'image/png' });
  Object.defineProperty(inputArchivo, 'files', { value: [archivo], configurable: true });
  boton(contenedor, 'Subir').click();
  await esperarMicrotareas();

  // El bloque de avatar muestra su propio error...
  assert.match(contenedor.textContent, /No se ha podido completar la acción/);
  // ...pero el campo de nombre del bloque de datos conserva el cambio sin guardar.
  const campoNombreTrasFallo = contenedor.querySelector<HTMLInputElement>('#ficha-datos-nombre');
  assert.equal(campoNombreTrasFallo?.value, 'Cambio sin guardar');
});
