import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaMisHorasProfesor, type DependenciasPantallaMisHorasProfesor } from './pantallaMisHorasProfesor.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { Descargador, AbridorVentanaImpresion, VentanaImpresion } from './dom.ts';
import type { SlotHorario } from '../dominio/tipos.ts';
import type { RegistroParaInformeHorasProfesor } from '../dominio/informeHorasProfesor.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearSlot(sobrescribir: Partial<SlotHorario> = {}): SlotHorario {
  return {
    id: 'slot-1',
    alumno_id: 'alumno-1',
    profesor_id: 'profesor-propio',
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

function crearRegistro(sobrescribir: Partial<RegistroParaInformeHorasProfesor> = {}): RegistroParaInformeHorasProfesor {
  return {
    profesor_id: 'profesor-propio',
    slot_id: 'slot-1',
    estado: 'valida',
    ocurrido_en: '2026-09-07T17:05:00.000Z',
    ocurrido_en_salida: '2026-09-07T18:00:00.000Z',
    ...sobrescribir,
  };
}

function crearDescargadorDeMentira(): Descargador & { llamadas: { contenido: string; nombre: string; tipo: string }[] } {
  const llamadas: { contenido: string; nombre: string; tipo: string }[] = [];
  return {
    llamadas,
    descargar(contenido, nombreFichero, tipoMime) {
      llamadas.push({ contenido, nombre: nombreFichero, tipo: tipoMime });
    },
  };
}

function crearAbridorImpresionDeMentira(): AbridorVentanaImpresion & { readonly titulos: string[]; impresiones: number } {
  const titulos: string[] = [];
  const resultado = {
    titulos,
    impresiones: 0,
    abrir(titulo: string): VentanaImpresion {
      titulos.push(titulo);
      const documento = new JSDOM('<!doctype html><body></body>').window.document;
      return {
        document: documento,
        imprimir: () => {
          resultado.impresiones += 1;
        },
      };
    },
  };
  return resultado;
}

// Lunes 2026-09-07, 20:00 Europe/Madrid (18:00 UTC).
const RELOJ_HOY = crearRelojFijo(new Date('2026-09-07T18:00:00.000Z'));

function crearDepsFalsas(overrides: Partial<DependenciasPantallaMisHorasProfesor> = {}): DependenciasPantallaMisHorasProfesor {
  return {
    rol: 'teacher',
    profesorId: 'profesor-propio',
    profesorNombre: 'Marta López',
    reloj: RELOJ_HOY,
    listarSlotsPropios: () => Promise.resolve([]),
    listarCierresActivos: () => Promise.resolve([]),
    listarExcepcionesEnRango: () => Promise.resolve([]),
    listarHistoricoPropio: () => Promise.resolve([]),
    descargador: crearDescargadorDeMentira(),
    abridorImpresion: crearAbridorImpresionDeMentira(),
    ...overrides,
  };
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

void test('un administrator ve un mensaje de acceso denegado, sin llamar a ninguna dependencia', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({ rol: 'administrator', listarSlotsPropios: () => Promise.reject(new Error('no se esperaba esta llamada')) }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('un student ve un mensaje de acceso denegado', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(contenedor, crearDepsFalsas({ listarSlotsPropios: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando…/);
});

void test('un profesor sin ninguna sesión ve su propia fila, en ceros', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(contenedor, crearDepsFalsas());
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Marta López/);
  assert.match(texto, /Sin datos de salida marcada/);
});

void test('pinta la fila propia con sesiones propias y horas teóricas', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarSlotsPropios: () => Promise.resolve([crearSlot()]),
      // El rango por defecto es el mes natural en curso (septiembre de 2026, reloj fijo de este
      // fichero): el slot de lunes tiene cuatro ocurrencias esperadas (7, 14, 21 y 28).
      listarHistoricoPropio: () => Promise.resolve([crearRegistro()]),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Marta López/);
  assert.match(texto, /55min/); // horas reales propias (17:05-18:00)
  assert.match(texto, /4h 0min/); // horas teóricas: 4 lunes de septiembre × 60 min
});

void test('una sustitución (profesor_id distinto del titular del slot) cuenta aparte, nunca como propia', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarSlotsPropios: () => Promise.resolve([crearSlot({ id: 'slot-ajeno', profesor_id: 'profesor-titular' })]),
      listarHistoricoPropio: () => Promise.resolve([crearRegistro({ slot_id: 'slot-ajeno' })]),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  // Sin slot propio en el rango: 0min de horas teóricas propias, pero la sesión de sustitución cuenta.
  assert.match(texto, /Marta López0Sin datos de salida marcada0min155min/);
});

void test('sin ningún control para elegir otro profesor ni ninguna cifra ajena', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarSlotsPropios: () => Promise.resolve([crearSlot()]),
      listarHistoricoPropio: () => Promise.resolve([crearRegistro()]),
    }),
  );
  await esperarMicrotareas();
  // Una sola fila de tabla (más la de cabecera) — nunca un selector de profesor.
  const filas = contenedor.querySelectorAll('tbody tr');
  assert.equal(filas.length, 1);
  const selectores = contenedor.querySelectorAll('select');
  assert.equal(selectores.length, 0);
});

void test('un fallo al cargar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaMisHorasProfesor(contenedor, crearDepsFalsas({ listarSlotsPropios: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.match(zonaError?.textContent ?? '', /permiso/i);
});

void test('el botón "Descargar CSV" descarga el CSV con las mismas cifras que la tabla', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarSlotsPropios: () => Promise.resolve([crearSlot()]),
      listarHistoricoPropio: () => Promise.resolve([crearRegistro()]),
      descargador,
    }),
  );
  await esperarMicrotareas();
  const boton = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Descargar CSV');
  assert.ok(boton);
  boton.click();

  assert.equal(descargador.llamadas.length, 1);
  const llamada = descargador.llamadas[0];
  assert.ok(llamada);
  assert.equal(llamada.nombre, 'mis-horas.csv');
  assert.equal(llamada.tipo, 'text/csv;charset=utf-8');
  assert.match(llamada.contenido, /Marta López/);
  assert.match(llamada.contenido, /Rango;2026-09-01 – 2026-09-30/);
});

void test('el botón "Imprimir / PDF" abre la ventana de impresión con la misma tabla', async () => {
  const contenedor = crearContenedorDePruebas();
  const abridorImpresion = crearAbridorImpresionDeMentira();
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarSlotsPropios: () => Promise.resolve([crearSlot()]),
      listarHistoricoPropio: () => Promise.resolve([crearRegistro()]),
      abridorImpresion,
    }),
  );
  await esperarMicrotareas();
  const boton = Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent === 'Imprimir / PDF');
  assert.ok(boton);
  boton.click();

  assert.equal(abridorImpresion.titulos.length, 1);
  assert.equal(abridorImpresion.impresiones, 1);
});

void test('cambiar el rango de fechas vuelve a cargar el informe', async () => {
  const contenedor = crearContenedorDePruebas();
  let vecesLlamado = 0;
  mostrarPantallaMisHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarSlotsPropios: () => {
        vecesLlamado += 1;
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal(vecesLlamado, 1);

  const campoDesde = contenedor.querySelector<HTMLInputElement>('#mis-horas-filtro-desde');
  assert.ok(campoDesde);
  campoDesde.value = '2026-08-01';
  campoDesde.dispatchEvent(new (contenedor.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event('change'));
  await esperarMicrotareas();
  assert.equal(vecesLlamado, 2);
});
