/**
 * R-37: guardas del estilo Gauss que los tests de pantalla (jsdom no aplica CSS) no pueden ver:
 * la hoja `estilos.css` enlazada sin estilos en línea (CSP de T-25), fuentes y logos presentes y
 * precacheados por el Service Worker (funcionar sin red), contraste AA de los pares de colores en
 * uso, y que los helpers de formulario emiten las clases que llevan los mínimos de 44 px / 16 px.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { crearBoton, crearCampoTexto, crearZonaMensaje, montarPanelEntrada } from './formularios.ts';

const leer = (ruta: string): string => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');

const css = leer('estilos.css');
const sw = leer('sw.js');
const indice = leer('index.html');

function variables(): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of css.matchAll(/(--gauss-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    mapa.set(m[1] ?? '', m[2] ?? '');
  }
  return mapa;
}

function luminancia(hex: string): number {
  const canal = (i: number): number => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

void test('index.html enlaza estilos.css y no lleva <style> ni atributos style (CSP style-src self)', () => {
  assert.match(indice, /<link rel="stylesheet" href="\.\/estilos\.css"/);
  assert.doesNotMatch(indice, /<style[\s>]/i);
  assert.doesNotMatch(indice, /\sstyle\s*=/i);
});

void test('toda url() de estilos.css existe, es local y está en el cascarón del Service Worker', () => {
  const urls = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1] ?? '');
  assert.ok(urls.length >= 6, 'se esperan las seis fuentes autoalojadas');
  for (const url of urls) {
    assert.ok(url.startsWith('./'), `${url} debe ser local (sin CDN)`);
    assert.ok(existsSync(new URL(`../../${url.slice(2)}`, import.meta.url)), `${url} no existe`);
    assert.ok(sw.includes(`'${url}'`), `${url} falta en CASCARON de sw.js`);
  }
  for (const recurso of ['./estilos.css', './marca/gauss-logo.png', './marca/gauss-logo-blanco.png']) {
    assert.ok(sw.includes(`'${recurso}'`), `${recurso} falta en CASCARON`);
  }
  assert.ok(existsSync(new URL('../../fuentes/OFL-Outfit.txt', import.meta.url)));
  assert.ok(existsSync(new URL('../../fuentes/OFL-Karla.txt', import.meta.url)));
});

void test('la caché del Service Worker subió de versión al cambiar el CSS (v2 o posterior)', () => {
  const version = /PREFIJO_CACHE\}v(\d+)/.exec(sw);
  assert.ok(version && Number(version[1]) >= 2);
});

void test('contraste AA de los pares de colores usados como texto y como borde de control', () => {
  const v = variables();
  const c = (nombre: string): string => {
    const valor = v.get(nombre);
    assert.ok(valor, `falta ${nombre}`);
    return valor;
  };
  const textos: [string, string][] = [
    ['--gauss-tinta', '--gauss-superficie-suave'],
    ['--gauss-texto-secundario', '--gauss-superficie'],
    ['--gauss-texto-atenuado', '--gauss-superficie'],
    ['--gauss-texto-atenuado', '--gauss-campo'],
    ['--gauss-texto-atenuado', '--gauss-fondo'],
    ['--gauss-azul', '--gauss-superficie'],
    ['--gauss-blanco', '--gauss-azul'],
    ['--gauss-azul-oscuro', '--gauss-azul-suave'],
    ['--gauss-sobre-amarillo', '--gauss-amarillo'],
    ['--gauss-sobre-amarillo', '--gauss-amarillo-hover'],
    ['--gauss-blanco', '--gauss-tinta'],
    ['--gauss-blanco', '--gauss-verde-solido'],
    ['--gauss-verde-texto', '--gauss-verde-fondo'],
    ['--gauss-rojo', '--gauss-superficie'],
    ['--gauss-blanco', '--gauss-rojo'],
    ['--gauss-rojo-oscuro', '--gauss-rojo-fondo'],
    ['--gauss-aviso-texto', '--gauss-aviso-fondo'],
    ['--gauss-texto-secundario', '--gauss-fondo-hundido'],
  ];
  for (const [texto, fondo] of textos) {
    const ratio = contraste(c(texto), c(fondo));
    assert.ok(ratio >= 4.5, `${texto} sobre ${fondo}: ${ratio.toFixed(2)} < 4,5`);
  }
  const ratioBorde = contraste(c('--gauss-borde-control'), c('--gauss-campo'));
  assert.ok(ratioBorde >= 3, `borde de campo: ${ratioBorde.toFixed(2)} < 3`);
});

void test('los helpers de formulario emiten clases, no estilos en línea', () => {
  const documento = new JSDOM('<!doctype html><body></body>').window.document;
  const campo = crearCampoTexto(documento, 'x', 'Email', 'email', 'username');
  assert.equal(campo.contenedor.className, 'campo');
  assert.equal(campo.contenedor.querySelector('label')?.className, 'campo__etiqueta');
  assert.equal(campo.input.getAttribute('style'), null);

  const primario = crearBoton(documento, 'Entrar');
  const normal = crearBoton(documento, 'Cancelar', 'button');
  assert.equal(primario.className, 'boton boton--primario');
  assert.equal(normal.className, 'boton boton--borde');
  assert.equal(primario.getAttribute('style'), null);

  assert.match(crearZonaMensaje(documento, 'alert').className, /aviso--error/);
  assert.doesNotMatch(crearZonaMensaje(documento, 'status').className, /aviso--error/);
});

void test('la clase .boton y los campos fijan 44 px y 16 px en la hoja (sustituyen a los style.* retirados)', () => {
  assert.match(css, /--gauss-altura-tactil:\s*44px/);
  const regla = (selector: string): string => {
    const i = css.indexOf(`${selector} {`);
    return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
  };
  assert.match(regla('.boton'), /min-height:\s*var\(--gauss-altura-tactil\)[^]*min-width:\s*var\(--gauss-altura-tactil\)/);
  const campos = css.slice(css.indexOf('.campo input:not'), css.indexOf('}', css.indexOf('.campo input:not')));
  assert.match(campos, /min-height:\s*var\(--gauss-altura-tactil\)/);
  assert.match(campos, /font-size:\s*16px/);
  // R-40: los iconos de la fila de acciones de pasar lista son objetivos de 44 px.
  const icono = regla('.boton-icono');
  assert.match(icono, /width:\s*var\(--gauss-altura-tactil\)/);
  assert.match(icono, /height:\s*var\(--gauss-altura-tactil\)/);
});

void test('montarPanelEntrada pinta el logo y una tarjeta donde colgar el contenido', () => {
  const documento = new JSDOM('<!doctype html><body><div id="a"></div></body>').window.document;
  const contenedor = documento.querySelector<HTMLElement>('#a');
  assert.ok(contenedor);
  const panel = montarPanelEntrada(contenedor);
  assert.ok(panel.classList.contains('tarjeta'));
  assert.equal(panel.querySelector('img')?.alt, 'Gauss Centro de Estudios');
  assert.ok(contenedor.contains(panel));
});

void test('R-39: src/ui no asigna element.style directamente (solo setProperty de variables CSS)', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('./', import.meta.url);
  for (const nombre of readdirSync(dir)) {
    if (!nombre.endsWith('.ts') || nombre.endsWith('.test.ts')) {
      continue;
    }
    const fuente = readFileSync(new URL(nombre, dir), 'utf8');
    for (const m of fuente.matchAll(/\.style\.([A-Za-z]+)/g)) {
      assert.equal(m[1], 'setProperty', `${nombre}: asignación directa a .style.${m[1] ?? ''}`);
    }
    assert.doesNotMatch(fuente, /\.style\s*=|cssText/, `${nombre}: style asignado`);
  }
});

void test('R-39: estilos.css viste tablas, formularios y la hoja de impresión de las pantallas de gestión', () => {
  assert.match(css, /main\.pagina table/);
  assert.match(css, /main\.pagina select/);
  assert.match(css, /@media print[\s\S]*main\.pagina/);
  assert.match(css, /\.avatar--grande/);
  assert.match(css, /\.combobox__opcion--activa/);
});
