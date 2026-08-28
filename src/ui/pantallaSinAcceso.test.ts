import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mostrarPantallaSinAcceso } from './pantallaSinAcceso.ts';
import type { Perfil } from '../dominio/tipos.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

const PERFIL_STUDENT: Perfil = {
  id: 'usuario-1',
  nombre: 'Alex Alumno',
  rol: 'student',
  activo: true,
  intentos_fallidos: 0,
  bloqueado: false,
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
};

void test('saluda por el nombre del perfil y explica que todavía no tiene acceso', () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaSinAcceso(contenedor, PERFIL_STUDENT);

  assert.match(contenedor.textContent, /Alex Alumno/);
  assert.match(contenedor.textContent, /todavía no tiene acceso/i);
  assert.match(contenedor.textContent, /administrador/i);
});

void test('no pinta ningún formulario ni control interactivo: es una pantalla de solo lectura', () => {
  const contenedor = crearContenedorDePruebas();

  mostrarPantallaSinAcceso(contenedor, PERFIL_STUDENT);

  assert.equal(contenedor.querySelectorAll('form, button, input').length, 0);
});

void test('un rol desconocido se muestra igual que student (misma pantalla, mismo trato)', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilRolDesconocido = { ...PERFIL_STUDENT, rol: 'lo-que-sea' } as unknown as Perfil;

  mostrarPantallaSinAcceso(contenedor, perfilRolDesconocido);

  assert.match(contenedor.textContent, /todavía no tiene acceso/i);
});
