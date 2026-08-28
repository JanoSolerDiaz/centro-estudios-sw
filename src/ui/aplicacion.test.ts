import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { iniciarAplicacion } from './aplicacion.ts';
import type { GestorSesion, EstadoSesion } from '../nucleo/gestorSesion.ts';
import type { Perfil } from '../dominio/tipos.ts';

function crearContenedorDePruebas(): HTMLElement {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  const contenedor = dom.window.document.querySelector<HTMLElement>('#app');
  assert.ok(contenedor, 'el documento de pruebas no tiene #app');
  return contenedor;
}

const PERFIL_ADMIN: Perfil = {
  id: 'u1',
  nombre: 'Ana Admin',
  rol: 'administrator',
  activo: true,
  intentos_fallidos: 0,
  bloqueado: false,
  creado_en: '2026-01-01T00:00:00.000Z',
  actualizado_en: '2026-01-01T00:00:00.000Z',
};

function crearGestorSesionFalso(estadoInicial: EstadoSesion): {
  gestor: GestorSesion;
  emitir: (estado: EstadoSesion) => void;
  restaurarLlamado: () => number;
} {
  let estado = estadoInicial;
  const escuchas = new Set<(estado: EstadoSesion) => void>();
  let restaurarLlamado = 0;

  const gestor: GestorSesion = {
    obtenerEstado: () => estado,
    suscribir: (escucha) => {
      escuchas.add(escucha);
      return () => {
        escuchas.delete(escucha);
      };
    },
    restaurar: () => {
      restaurarLlamado += 1;
      return Promise.resolve();
    },
    iniciarSesion: () => Promise.resolve(),
    cerrarSesion: () => Promise.resolve(),
    obtenerTokenSesion: () => undefined,
    renovarAlAbrirPasarLista: () => Promise.resolve(),
    solicitarRecuperacionContrasena: () => Promise.resolve(),
    establecerContrasenaNueva: () => Promise.resolve(),
    desbloquearUsuario: () => Promise.resolve(),
  };

  return {
    gestor,
    emitir: (nuevo) => {
      estado = nuevo;
      for (const escucha of escuchas) {
        escucha(estado);
      }
    },
    restaurarLlamado: () => restaurarLlamado,
  };
}

void test('un hash de enlace de recuperación muestra "elige tu nueva contraseña", sin restaurar sesión', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor, restaurarLlamado } = crearGestorSesionFalso({ tipo: 'sin_sesion' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '#access_token=tok&type=recovery' });

  assert.match(contenedor.querySelector('h1')?.textContent ?? '', /nueva contraseña/i);
  assert.equal(restaurarLlamado(), 0);
});

void test('sin sesión (estado inicial) muestra la pantalla de login', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'sin_sesion' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.ok(contenedor.querySelector('#login-email'));
});

void test('restaurando (estado inicial) muestra un indicador de carga, y llama a restaurar()', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor, restaurarLlamado } = crearGestorSesionFalso({ tipo: 'restaurando' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /cargando/i);
  assert.equal(restaurarLlamado(), 1);
});

void test('al emitir sin_sesion tras restaurando, se muestra el login (reacciona a la suscripción)', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor, emitir } = crearGestorSesionFalso({ tipo: 'restaurando' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });
  emitir({ tipo: 'sin_sesion' });

  assert.ok(contenedor.querySelector('#login-email'));
});

void test('ir a recuperar contraseña y volver alterna entre las dos pantallas sin perder la suscripción', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'sin_sesion' });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });
  assert.ok(contenedor.querySelector('#login-email'));

  const botones = Array.from(contenedor.querySelectorAll('button'));
  const enlaceRecuperar = botones.find((boton) => boton.textContent.includes('olvidado'));
  assert.ok(enlaceRecuperar);
  enlaceRecuperar.click();
  assert.ok(contenedor.querySelector('#recuperar-email'));

  const botonesRecuperar = Array.from(contenedor.querySelectorAll('button'));
  const botonVolver = botonesRecuperar.find((boton) => boton.textContent.includes('Volver'));
  assert.ok(botonVolver);
  botonVolver.click();
  assert.ok(contenedor.querySelector('#login-email'));
});

void test('rol administrator: pantalla temporal de la app, con su nombre, sin login', () => {
  const contenedor = crearContenedorDePruebas();
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: PERFIL_ADMIN });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /Ana Admin/);
  assert.match(contenedor.textContent, /Administrador/);
  assert.equal(contenedor.querySelector('#login-email'), null);
});

void test('rol teacher: también accede a la pantalla temporal de la app (no a sin acceso)', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilTeacher: Perfil = { ...PERFIL_ADMIN, rol: 'teacher' };
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: perfilTeacher });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /Profesor/);
});

void test('rol student: pantalla sin acceso, no la app', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilStudent: Perfil = { ...PERFIL_ADMIN, rol: 'student' };
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: perfilStudent });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /todavía no tiene acceso/i);
});

void test('rol desconocido: se trata igual que student, nunca como teacher (requisito 8 de T-09)', () => {
  const contenedor = crearContenedorDePruebas();
  const perfilDesconocido = { ...PERFIL_ADMIN, rol: 'lo-que-sea' } as unknown as Perfil;
  const { gestor } = crearGestorSesionFalso({ tipo: 'autenticado', perfil: perfilDesconocido });

  iniciarAplicacion(contenedor, { gestorSesion: gestor, hashUrl: '' });

  assert.match(contenedor.textContent, /todavía no tiene acceso/i);
});
