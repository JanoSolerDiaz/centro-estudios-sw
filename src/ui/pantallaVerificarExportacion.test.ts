import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaVerificarExportacion } from './pantallaVerificarExportacion.ts';
import { sellarDocumento } from '../dominio/selloIntegridad.ts';
import type { Rol } from '../dominio/tipos.ts';

function montar(rol: Rol, texto: string | Error) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor);
  const leidos: File[] = [];
  mostrarPantallaVerificarExportacion(contenedor, {
    rol,
    leerFichero: {
      leerTexto: (archivo) => {
        leidos.push(archivo);
        return texto instanceof Error ? Promise.reject(texto) : Promise.resolve(texto);
      },
    },
  });
  return { contenedor, leidos };
}

function elegirFichero(contenedor: HTMLElement): void {
  const campo = contenedor.querySelector<HTMLInputElement>('#verificar-fichero');
  assert.ok(campo);
  Object.defineProperty(campo, 'files', { value: [{ name: 'x.json' }] });
}

async function verificar(contenedor: HTMLElement): Promise<string> {
  contenedor.querySelector('button')?.click();
  await new Promise((resolver) => setTimeout(resolver, 20));
  return contenedor.querySelector('[role="status"]')?.textContent ?? '';
}

void test('teacher y student no acceden y no se lee ningún fichero', () => {
  for (const rol of ['teacher', 'student'] as const) {
    const { contenedor, leidos } = montar(rol, '{}');
    assert.match(contenedor.textContent, /No tienes acceso/);
    assert.equal(contenedor.querySelector('input'), null);
    assert.equal(leidos.length, 0);
  }
});

void test('fichero sellado sin alterar: «Coincide»', async () => {
  const { json } = await sellarDocumento({ generadoPor: 'Admin', alumnos: [] });
  const { contenedor } = montar('administrator', json);
  elegirFichero(contenedor);
  assert.match(await verificar(contenedor), /^Coincide/);
});

void test('fichero alterado: «No coincide»', async () => {
  const { json } = await sellarDocumento({ generadoPor: 'Admin', alumnos: [] });
  const { contenedor } = montar('administrator', json.replace('Admin', 'Otro'));
  elegirFichero(contenedor);
  assert.match(await verificar(contenedor), /^No coincide/);
});

void test('fichero sin sello: «Sin sello», no un error', async () => {
  const { contenedor } = montar('administrator', '{"alumnos":[]}');
  elegirFichero(contenedor);
  assert.match(await verificar(contenedor), /^Sin sello/);
  assert.equal(contenedor.querySelector('[role="alert"]')?.textContent, '');
});

void test('huella pegada distinta: «No coincide» aunque el sello interno sea coherente', async () => {
  const { json } = await sellarDocumento({ generadoPor: 'Admin' });
  const { contenedor } = montar('administrator', json);
  elegirFichero(contenedor);
  const huella = contenedor.querySelector<HTMLInputElement>('#verificar-huella');
  assert.ok(huella);
  huella.value = 'b'.repeat(64);
  assert.match(await verificar(contenedor), /^No coincide/);
});

void test('sin elegir fichero avisa; un fallo de lectura se muestra como error', async () => {
  const { contenedor, leidos } = montar('administrator', new Error('fallo'));
  contenedor.querySelector('button')?.click();
  assert.match(contenedor.querySelector('[role="alert"]')?.textContent ?? '', /Elige primero/);
  assert.equal(leidos.length, 0);
  elegirFichero(contenedor);
  await verificar(contenedor);
  assert.notEqual(contenedor.querySelector('[role="alert"]')?.textContent, '');
});
