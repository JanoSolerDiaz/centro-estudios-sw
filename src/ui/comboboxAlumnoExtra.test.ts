import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { montarComboboxAlumnoExtra, type DependenciasComboboxAlumnoExtra } from './comboboxAlumnoExtra.ts';
import { crearReboteDePrueba, type ReboteDePrueba } from '../nucleo/rebote.ts';
import type { ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

const ANA: ResultadoBusquedaAlumno = {
  id: 'a1',
  nombre: 'Ana',
  primer_apellido: 'García',
  segundo_apellido: 'López',
  centro_nombre: 'IES Cervantes',
};
const OTRA_ANA: ResultadoBusquedaAlumno = {
  id: 'a2',
  nombre: 'Ana',
  primer_apellido: 'García',
  segundo_apellido: 'López',
  centro_nombre: 'IES Delibes',
};

interface Montaje {
  readonly contenedor: HTMLElement;
  readonly input: HTMLInputElement;
  readonly rebote: ReboteDePrueba;
  readonly seleccionados: { readonly resultado: ResultadoBusquedaAlumno; readonly nota: string | null }[];
}

function montar(overrides: Partial<DependenciasComboboxAlumnoExtra> = {}): Montaje {
  const contenedor = crearContenedorDePruebas();
  const rebote = crearReboteDePrueba();
  const seleccionados: Montaje['seleccionados'] = [];
  const deps: DependenciasComboboxAlumnoExtra = {
    buscar: overrides.buscar ?? (() => Promise.resolve([])),
    onSeleccionar: overrides.onSeleccionar ?? ((resultado, nota) => seleccionados.push({ resultado, nota })),
    rebote: overrides.rebote ?? rebote,
  };
  montarComboboxAlumnoExtra(contenedor, deps);
  const input = contenedor.querySelector<HTMLInputElement>('input[role="combobox"]');
  assert.ok(input, 'no se encuentra el input del combobox');
  return { contenedor, input, rebote, seleccionados };
}

function escribir(input: HTMLInputElement, valor: string): void {
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.value = valor;
  input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
}

function tecla(input: HTMLInputElement, key: string): void {
  const ventana = input.ownerDocument.defaultView;
  assert.ok(ventana);
  input.dispatchEvent(new ventana.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function disparar(elemento: Element, tipo: string): void {
  const ventana = elemento.ownerDocument.defaultView;
  assert.ok(ventana);
  elemento.dispatchEvent(new ventana.Event(tipo, { bubbles: true, cancelable: true }));
}

async function esperarMicrotareas(veces = 5): Promise<void> {
  for (let i = 0; i < veces; i += 1) {
    await new Promise((resolver) => setTimeout(resolver, 0));
  }
}

// --- Atributos ARIA base -------------------------------------------------------------------------

void test('el input nace con los atributos ARIA de combobox correctos', () => {
  const { input, contenedor } = montar();
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.getAttribute('aria-autocomplete'), 'list');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  const idListbox = input.getAttribute('aria-controls');
  assert.ok(idListbox);
  assert.ok(contenedor.querySelector(`#${idListbox}[role="listbox"]`));
});

void test('el input no es required: la nota tampoco', () => {
  const { input, contenedor } = montar();
  assert.equal(input.required, false);
  const nota = contenedor.querySelectorAll('input')[1];
  assert.ok(nota);
  assert.equal(nota.required, false);
});

// --- Umbral y rebote ------------------------------------------------------------------------------

void test('con un solo carácter no se programa ninguna búsqueda', () => {
  const { input, rebote } = montar();
  escribir(input, 'a');
  assert.equal(rebote.pendiente, undefined);
});

void test('con dos caracteres se aplaza la búsqueda 250 ms', () => {
  const { input, rebote } = montar();
  escribir(input, 'an');
  assert.equal(rebote.pendiente, 250);
});

void test('la búsqueda solo se dispara cuando el rebote se dispara, no antes', async () => {
  let llamadas = 0;
  const { input, rebote } = montar({
    buscar: () => {
      llamadas += 1;
      return Promise.resolve([]);
    },
  });
  escribir(input, 'ana');
  assert.equal(llamadas, 0);
  rebote.disparar();
  await esperarMicrotareas();
  assert.equal(llamadas, 1);
});

void test('borrar hasta menos de dos caracteres cancela el rebote pendiente', () => {
  const { input, rebote } = montar();
  escribir(input, 'an');
  assert.equal(rebote.pendiente, 250);
  escribir(input, 'a');
  assert.equal(rebote.pendiente, undefined);
});

// --- Estados explícitos (requisito 6) --------------------------------------------------------------

void test('estado "buscando" mientras la promesa no resuelve', async () => {
  let resolver: ((filas: readonly ResultadoBusquedaAlumno[]) => void) | undefined;
  const { input, rebote, contenedor } = montar({
    buscar: () => new Promise((resolve) => { resolver = resolve; }),
  });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  const estado = contenedor.querySelector('p[role="status"]');
  assert.ok(estado);
  assert.equal(estado.textContent, 'Buscando…');
  assert.ok(resolver);
});

void test('sin resultados muestra el mensaje que explica una posible baja (requisito 7)', async () => {
  const { input, rebote, contenedor } = montar({ buscar: () => Promise.resolve([]) });
  escribir(input, 'zzz');
  rebote.disparar();
  await esperarMicrotareas();

  const estado = contenedor.querySelector('p[role="status"]');
  assert.match(estado?.textContent ?? '', /puede estar dado de baja/);
  const listbox = contenedor.querySelector<HTMLElement>('[role="listbox"]');
  assert.ok(listbox);
  assert.equal(listbox.hidden, true);
});

void test('con resultados, el estado anuncia el recuento y la lista se rellena', async () => {
  const { input, rebote, contenedor } = montar({ buscar: () => Promise.resolve([ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  const estado = contenedor.querySelector('p[role="status"]');
  assert.equal(estado?.textContent, '1 resultado encontrado.');
  const opciones = contenedor.querySelectorAll('[role="option"]');
  assert.equal(opciones.length, 1);
  assert.equal(opciones[0]?.textContent, 'Ana García López');
});

void test('un error de red muestra un mensaje amigable, nunca el texto técnico', async () => {
  const { input, rebote, contenedor } = montar({ buscar: () => Promise.reject(new TypeError('fetch failed')) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  const estado = contenedor.querySelector('p[role="status"]');
  assert.ok(estado?.textContent && estado.textContent.length > 0);
  assert.doesNotMatch(estado.textContent, /fetch failed/);
});

// --- Homónimos (requisito 3) -----------------------------------------------------------------------

void test('dos homónimos muestran el centro para desambiguar; uno solo no', async () => {
  const { input, rebote, contenedor } = montar({ buscar: () => Promise.resolve([ANA, OTRA_ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  const textos = Array.from(contenedor.querySelectorAll('[role="option"]')).map((el) => el.textContent);
  assert.deepEqual(textos, ['Ana García López (IES Cervantes)', 'Ana García López (IES Delibes)']);
});

// --- Nunca pide avatar (requisito 3) ----------------------------------------------------------------

void test('buscar() nunca recibe ni necesita avatar_ruta: el tipo de resultado no lo tiene', async () => {
  let textoRecibido: string | undefined;
  const { input, rebote } = montar({
    buscar: (texto) => {
      textoRecibido = texto;
      return Promise.resolve([ANA]);
    },
  });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  assert.equal(textoRecibido, 'ana');
  assert.ok(!('avatar_ruta' in ANA));
});

// --- Teclado (requisito 4) --------------------------------------------------------------------------

void test('ArrowDown mueve el activedescendant a la primera opción, y ArrowUp lo saca', async () => {
  const { input, rebote } = montar({ buscar: () => Promise.resolve([ANA, OTRA_ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  const idListbox = input.getAttribute('aria-controls');
  assert.ok(idListbox);

  assert.equal(input.hasAttribute('aria-activedescendant'), false);
  tecla(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-activedescendant'), `${idListbox}-opt-0`);
  tecla(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-activedescendant'), `${idListbox}-opt-1`);
  tecla(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-activedescendant'), `${idListbox}-opt-1`, 'no debe pasar del último resultado');
  tecla(input, 'ArrowUp');
  assert.equal(input.getAttribute('aria-activedescendant'), `${idListbox}-opt-0`);
});

void test('Enter con una opción activa selecciona y limpia el combobox', async () => {
  const { input, rebote, seleccionados, contenedor } = montar({ buscar: () => Promise.resolve([ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  tecla(input, 'ArrowDown');
  tecla(input, 'Enter');

  assert.deepEqual(seleccionados, [{ resultado: ANA, nota: null }]);
  assert.equal(input.value, '');
  const listbox = contenedor.querySelector<HTMLElement>('[role="listbox"]');
  assert.ok(listbox);
  assert.equal(listbox.hidden, true);
});

void test('Enter sin ninguna opción activa no selecciona nada', async () => {
  const { input, rebote, seleccionados } = montar({ buscar: () => Promise.resolve([ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  tecla(input, 'Enter');
  assert.deepEqual(seleccionados, []);
});

void test('Escape cierra la lista sin seleccionar ni borrar el texto tecleado', async () => {
  const { input, rebote, contenedor, seleccionados } = montar({ buscar: () => Promise.resolve([ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  tecla(input, 'ArrowDown');
  tecla(input, 'Escape');

  assert.deepEqual(seleccionados, []);
  assert.equal(input.value, 'ana');
  const listbox = contenedor.querySelector<HTMLElement>('[role="listbox"]');
  assert.ok(listbox);
  assert.equal(listbox.hidden, true);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
});

// --- Selección con el motivo (requisito 8) -----------------------------------------------------------

void test('el motivo (nota) opcional viaja a onSeleccionar recortado, y se limpia tras seleccionar', async () => {
  const { input, rebote, contenedor, seleccionados } = montar({ buscar: () => Promise.resolve([ANA]) });
  const notaInput = contenedor.querySelectorAll('input')[1];
  assert.ok(notaInput);
  notaInput.value = '  cubre a otro profesor  ';

  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  tecla(input, 'ArrowDown');
  tecla(input, 'Enter');

  assert.deepEqual(seleccionados, [{ resultado: ANA, nota: 'cubre a otro profesor' }]);
  assert.equal(notaInput.value, '');
});

void test('sin motivo escrito, la nota que llega a onSeleccionar es null, nunca una cadena vacía', async () => {
  const { input, rebote, seleccionados } = montar({ buscar: () => Promise.resolve([ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  tecla(input, 'ArrowDown');
  tecla(input, 'Enter');
  assert.equal(seleccionados[0]?.nota, null);
});

void test('un clic (mousedown) sobre una opción también selecciona', async () => {
  const { input, rebote, contenedor, seleccionados } = montar({ buscar: () => Promise.resolve([ANA]) });
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  const opcion = contenedor.querySelector('[role="option"]');
  assert.ok(opcion);
  disparar(opcion, 'mousedown');
  assert.deepEqual(seleccionados, [{ resultado: ANA, nota: null }]);
});

// --- Cancelación (requisito 2) ------------------------------------------------------------------------

void test('una tecla nueva cancela (aborta) la búsqueda anterior en curso', async () => {
  const señales: AbortSignal[] = [];
  const { input, rebote } = montar({
    buscar: (_texto, señal) => {
      señales.push(señal);
      return new Promise(() => {
        /* nunca resuelve en este test: solo interesa observar el aborto */
      });
    },
  });

  escribir(input, 'an');
  rebote.disparar();
  await esperarMicrotareas();
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  assert.equal(señales.length, 2);
  assert.equal(señales[0]?.aborted, true, 'la primera búsqueda debe abortarse al llegar la segunda');
  assert.equal(señales[1]?.aborted, false);
});

void test('una respuesta que llega abortada se ignora en silencio, sin pasar a estado "error"', async () => {
  let rechazarPrimera: ((error: unknown) => void) | undefined;
  let contador = 0;
  const { input, rebote, contenedor } = montar({
    buscar: (_texto, señal) => {
      contador += 1;
      if (contador === 1) {
        return new Promise((_resolve, reject) => {
          rechazarPrimera = reject;
          señal.addEventListener('abort', () => {
            reject(new DOMException('Abortado', 'AbortError'));
          });
        });
      }
      return Promise.resolve([ANA]);
    },
  });

  escribir(input, 'an');
  rebote.disparar();
  await esperarMicrotareas();
  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();

  const estado = contenedor.querySelector('p[role="status"]');
  assert.equal(estado?.textContent, '1 resultado encontrado.');
  assert.ok(rechazarPrimera, 'la primera búsqueda debía tener un rechazo pendiente registrado');
});

void test('borrar el texto por debajo del umbral cancela cualquier búsqueda en curso', async () => {
  let señalDeLaBusqueda: AbortSignal | undefined;
  const { input, rebote } = montar({
    buscar: (_texto, señal) => {
      señalDeLaBusqueda = señal;
      return new Promise(() => undefined);
    },
  });

  escribir(input, 'ana');
  rebote.disparar();
  await esperarMicrotareas();
  assert.ok(señalDeLaBusqueda);
  assert.equal(señalDeLaBusqueda.aborted, false);

  escribir(input, 'a');
  await esperarMicrotareas();
  assert.equal(señalDeLaBusqueda.aborted, true);
});

// --- Dos instancias no comparten estado (varias pantallas podrían montar el combobox) -----------------

void test('dos combobox montados a la vez no comparten rebote ni resultados', async () => {
  const uno = montar({ buscar: () => Promise.resolve([ANA]) });
  const dos = montar({ buscar: () => Promise.resolve([OTRA_ANA]) });

  escribir(uno.input, 'ana');
  uno.rebote.disparar();
  await esperarMicrotareas();

  const opcionesDos = dos.contenedor.querySelectorAll('[role="option"]');
  assert.equal(opcionesDos.length, 0, 'el segundo combobox no debe reaccionar a la búsqueda del primero');
});
