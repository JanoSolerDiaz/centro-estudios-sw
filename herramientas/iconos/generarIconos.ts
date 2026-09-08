#!/usr/bin/env node
/**
 * CLI de generación de los iconos estáticos de la aplicación instalable (R-09, requisito 1,
 * `npm run generar-iconos`). Capa de wiring fina, sin test directo (mismo patrón que
 * `herramientas/migrar.ts`/`herramientas/seed.ts`): la geometría y la codificación PNG están en
 * `herramientas/iconos/generarPng.ts`, testeadas por separado y sin ningún efecto de disco.
 *
 * A diferencia de `migrar.ts`/`seed.ts`, este script SÍ lo puede ejecutar el agente: no toca
 * ninguna credencial, ninguna red y ningún esquema de base de datos — solo escribe ficheros
 * estáticos locales en `iconos/`. Reejecutarlo (p. ej. si `COLOR_FONDO`/la geometría del trazo
 * cambian en `generarPng.ts`, o el día que el dueño aporte un logo real y este generador se
 * sustituya) sobrescribe los mismos ficheros, siempre con el mismo contenido determinista para la
 * misma entrada.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { generarIconoPng } from './generarPng.ts';

const COLOR_FONDO = [29, 78, 216] as const; // #1D4ED8, el mismo azul de acento que ya usa la interfaz (pantallaPasarLista.ts)
const COLOR_TRAZO = [255, 255, 255] as const;

const DESTINO = new URL('../../iconos/', import.meta.url);

interface EspecificacionIcono {
  readonly nombreFichero: string;
  readonly tamano: number;
  readonly variante: 'redondeado' | 'sangrado';
}

// 192/512 "any": los dos tamaños que exige la instalabilidad estándar (Chrome/criterios PWA).
// 512 "maskable": recomendado para que Android no recorte el icono con su propia máscara.
// 180 "apple-touch": iOS no lee manifest.json — busca <link rel="apple-touch-icon"> aparte.
const ICONOS: readonly EspecificacionIcono[] = [
  { nombreFichero: 'icono-192.png', tamano: 192, variante: 'redondeado' },
  { nombreFichero: 'icono-512.png', tamano: 512, variante: 'redondeado' },
  { nombreFichero: 'icono-512-maskable.png', tamano: 512, variante: 'sangrado' },
  { nombreFichero: 'icono-apple-touch.png', tamano: 180, variante: 'sangrado' },
];

function main(): void {
  mkdirSync(DESTINO, { recursive: true });
  for (const icono of ICONOS) {
    const png = generarIconoPng({ tamano: icono.tamano, variante: icono.variante, colorFondo: COLOR_FONDO, colorTrazo: COLOR_TRAZO });
    const destino = new URL(icono.nombreFichero, DESTINO);
    writeFileSync(destino, png);
    console.log(`generar-iconos: ${icono.nombreFichero} (${String(icono.tamano)}×${String(icono.tamano)}, ${icono.variante})`);
  }
}

main();
