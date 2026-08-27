/**
 * Enrutado de la aplicación (T-09, requisito 8): decide qué pantalla mostrar a partir del hash de
 * la URL (enlace de recuperación de contraseña) y del `EstadoSesion` de `gestorSesion.ts`.
 * `administrator` y `teacher` acceden a su aplicación (todavía sin construir — T-16/T-19 en
 * adelante — así que de momento ven un marcador de posición); `student` y cualquier rol
 * desconocido ven `pantallaSinAcceso`, sin ninguna llamada a datos adicional (la única petición ya
 * la hizo `gestorSesion.ts` al cargar el perfil propio). Este módulo es la única pieza de la capa de
 * autenticación que toca el DOM de arranque; recibe sus dependencias (el gestor de sesión, el hash
 * de la URL) en vez de leer `window`/`location` directamente, para poder testearse con `jsdom`.
 */

import type { GestorSesion, EstadoSesion } from '../nucleo/gestorSesion.ts';
import { parsearParametrosRecuperacion } from '../nucleo/enlaceRecuperacion.ts';
import type { Perfil } from '../dominio/tipos.ts';
import { ETIQUETA_ROL } from '../dominio/tipos.ts';
import { mostrarPantallaLogin } from './pantallaLogin.ts';
import { mostrarPantallaRecuperarContrasena } from './pantallaRecuperarContrasena.ts';
import { mostrarPantallaEstablecerContrasenaNueva } from './pantallaEstablecerContrasenaNueva.ts';
import { mostrarPantallaSinAcceso } from './pantallaSinAcceso.ts';
import { crearBoton } from './formularios.ts';

export interface DependenciasAplicacion {
  readonly gestorSesion: GestorSesion;
  /** Normalmente `window.location.hash`. */
  readonly hashUrl: string;
}

function tieneAppPropia(rol: Perfil['rol']): boolean {
  return rol === 'administrator' || rol === 'teacher';
}

/** Marcador de posición para `administrator`/`teacher`: la aplicación real de cada rol nace en
 * T-16 (gestión) y T-19 (pasar lista) — T-09 solo necesita demostrar que el enrutado por rol llega
 * hasta aquí y que hay una sesión utilizable (con botón de cerrar sesión de verdad). */
function mostrarPantallaAppTemporal(contenedor: HTMLElement, perfil: Perfil, cerrarSesion: () => Promise<void>): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  const titulo = documento.createElement('h1');
  titulo.textContent = `GestorAcademia — ${ETIQUETA_ROL[perfil.rol]}`;

  const saludo = documento.createElement('p');
  saludo.textContent = `Sesión iniciada como ${perfil.nombre}. Esta parte de la aplicación todavía está en construcción.`;

  const botonSalir = crearBoton(documento, 'Cerrar sesión', 'button');
  botonSalir.addEventListener('click', () => {
    void cerrarSesion();
  });

  contenedor.append(titulo, saludo, botonSalir);
}

export function iniciarAplicacion(contenedor: HTMLElement, deps: DependenciasAplicacion): void {
  const parametrosRecuperacion = parsearParametrosRecuperacion(deps.hashUrl);
  if (parametrosRecuperacion) {
    mostrarPantallaEstablecerContrasenaNueva(contenedor, {
      establecerContrasenaNueva: (nueva) =>
        deps.gestorSesion.establecerContrasenaNueva(parametrosRecuperacion.accessToken, nueva),
    });
    return;
  }

  let modoSinSesion: 'login' | 'recuperar' = 'login';

  function renderizar(estado: EstadoSesion): void {
    if (estado.tipo === 'restaurando') {
      contenedor.textContent = 'Cargando…';
      return;
    }

    if (estado.tipo === 'sin_sesion') {
      if (modoSinSesion === 'recuperar') {
        mostrarPantallaRecuperarContrasena(contenedor, {
          solicitarRecuperacion: (email) => deps.gestorSesion.solicitarRecuperacionContrasena(email),
          volverALogin: () => {
            modoSinSesion = 'login';
            renderizar(deps.gestorSesion.obtenerEstado());
          },
        });
        return;
      }
      mostrarPantallaLogin(contenedor, {
        iniciarSesion: (email, contrasena) => deps.gestorSesion.iniciarSesion(email, contrasena),
        irARecuperarContrasena: () => {
          modoSinSesion = 'recuperar';
          renderizar(deps.gestorSesion.obtenerEstado());
        },
      });
      return;
    }

    const { perfil } = estado;
    if (tieneAppPropia(perfil.rol)) {
      mostrarPantallaAppTemporal(contenedor, perfil, () => deps.gestorSesion.cerrarSesion());
    } else {
      mostrarPantallaSinAcceso(contenedor, perfil);
    }
  }

  deps.gestorSesion.suscribir(renderizar);
  renderizar(deps.gestorSesion.obtenerEstado());
  void deps.gestorSesion.restaurar();
}
