import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mostrarPantallaInformeHorasProfesor,
  type DependenciasPantallaInformeHorasProfesor,
} from './pantallaInformeHorasProfesor.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { SinPermiso } from '../datos/erroresDominio.ts';
import type { Descargador, AbridorVentanaImpresion, VentanaImpresion } from './dom.ts';
import type { Asistencia, SlotHorario } from '../dominio/tipos.ts';
import type { ProfesorParaInformeHoras } from '../dominio/informeHorasProfesor.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

function crearProfesor(sobrescribir: Partial<ProfesorParaInformeHoras> = {}): ProfesorParaInformeHoras {
  return { id: 'profesor-1', nombre: 'Marta López', ...sobrescribir };
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
    ocurrido_en_salida: '2026-09-07T18:00:00.000Z',
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

function crearDepsFalsas(overrides: Partial<DependenciasPantallaInformeHorasProfesor> = {}): DependenciasPantallaInformeHorasProfesor {
  return {
    rol: 'administrator',
    reloj: RELOJ_HOY,
    listarProfesoresActivos: () => Promise.resolve([]),
    listarSlotsDeProfesores: () => Promise.resolve([]),
    listarCierresActivos: () => Promise.resolve([]),
    listarExcepcionesEnRango: () => Promise.resolve([]),
    listarHistoricoCompleto: () => Promise.resolve([]),
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

void test('un teacher ve un mensaje de acceso denegado, sin llamar a ninguna dependencia', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(
    contenedor,
    crearDepsFalsas({ rol: 'teacher', listarProfesoresActivos: () => Promise.reject(new Error('no se esperaba esta llamada')) }),
  );
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('un student ve un mensaje de acceso denegado', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(contenedor, crearDepsFalsas({ rol: 'student' }));
  assert.match(contenedor.textContent, /No tienes acceso/);
});

void test('mientras carga muestra "Cargando…"', () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(contenedor, crearDepsFalsas({ listarProfesoresActivos: () => new Promise(() => undefined) }));
  assert.match(contenedor.textContent, /Cargando…/);
});

void test('sin ningún profesor activo muestra el mensaje explícito', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(contenedor, crearDepsFalsas());
  await esperarMicrotareas();
  assert.match(contenedor.textContent, /Ningún profesor activo en este rango/);
});

void test('pinta una fila por profesor activo, con sesiones propias y horas teóricas', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarProfesoresActivos: () => Promise.resolve([crearProfesor()]),
      listarSlotsDeProfesores: () => Promise.resolve([crearSlot()]),
      // El rango por defecto es el mes natural en curso (septiembre de 2026, reloj fijo de este
      // fichero): el slot de lunes tiene cuatro ocurrencias esperadas (7, 14, 21 y 28).
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Marta López/);
  assert.match(texto, /55min/); // horas reales propias (17:05-18:00)
  assert.match(texto, /4h 0min/); // horas teóricas: 4 lunes de septiembre × 60 min
});

void test('un profesor activo sin ninguna sesión aparece igualmente, en ceros', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarProfesoresActivos: () => Promise.resolve([crearProfesor({ id: 'profesor-sin-clases', nombre: 'Sin Clases' })]),
    }),
  );
  await esperarMicrotareas();
  const texto = contenedor.textContent;
  assert.match(texto, /Sin Clases/);
  assert.match(texto, /Sin datos de salida marcada/);
});

void test('un fallo al cargar muestra el mensaje amigable, nunca el error técnico', async () => {
  const contenedor = crearContenedorDePruebas();
  mostrarPantallaInformeHorasProfesor(contenedor, crearDepsFalsas({ listarProfesoresActivos: () => Promise.reject(new SinPermiso()) }));
  await esperarMicrotareas();
  const zonaError = contenedor.querySelector('[role="alert"]');
  assert.match(zonaError?.textContent ?? '', /permiso/i);
});

void test('el botón "Descargar CSV" descarga el CSV con las mismas cifras que la tabla', async () => {
  const contenedor = crearContenedorDePruebas();
  const descargador = crearDescargadorDeMentira();
  mostrarPantallaInformeHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarProfesoresActivos: () => Promise.resolve([crearProfesor()]),
      listarSlotsDeProfesores: () => Promise.resolve([crearSlot()]),
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
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
  assert.equal(llamada.nombre, 'informe-horas-profesor.csv');
  assert.equal(llamada.tipo, 'text/csv;charset=utf-8');
  assert.match(llamada.contenido, /Marta López/);
  assert.match(llamada.contenido, /Rango;2026-09-01 – 2026-09-30/);
});

void test('el botón "Imprimir / PDF" abre la ventana de impresión con la misma tabla', async () => {
  const contenedor = crearContenedorDePruebas();
  const abridorImpresion = crearAbridorImpresionDeMentira();
  mostrarPantallaInformeHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarProfesoresActivos: () => Promise.resolve([crearProfesor()]),
      listarSlotsDeProfesores: () => Promise.resolve([crearSlot()]),
      listarHistoricoCompleto: () => Promise.resolve([crearAsistencia()]),
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
  mostrarPantallaInformeHorasProfesor(
    contenedor,
    crearDepsFalsas({
      listarProfesoresActivos: () => {
        vecesLlamado += 1;
        return Promise.resolve([]);
      },
    }),
  );
  await esperarMicrotareas();
  assert.equal(vecesLlamado, 1);

  const campoDesde = contenedor.querySelector<HTMLInputElement>('#informe-horas-filtro-desde');
  assert.ok(campoDesde);
  campoDesde.value = '2026-08-01';
  campoDesde.dispatchEvent(new (contenedor.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event('change'));
  await esperarMicrotareas();
  assert.equal(vecesLlamado, 2);
});
