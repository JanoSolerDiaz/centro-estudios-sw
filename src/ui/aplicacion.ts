/**
 * Enrutado de la aplicación (T-09, requisito 8; T-16, requisitos 1 y 2). Decide qué pantalla mostrar
 * a partir del hash de la URL (enlace de recuperación de contraseña) y del `EstadoSesion` de
 * `gestorSesion.ts`. `student` y cualquier rol desconocido ven `pantallaSinAcceso`, sin ninguna
 * llamada a datos adicional.
 *
 * Desde T-16, `administrator` monta la aplicación real por primera vez: un router por `hash`
 * (`nucleo/router.ts`) que enruta entre el catálogo de centros, el listado de alumnos y la ficha
 * completa de un alumno — solo si `deps.appAdministrador` viene informado (siempre en la aplicación
 * real, `main.ts`; ausente en los tests que no ejercitan esta parte, que siguen viendo el marcador de
 * posición de T-09). `teacher` sigue con ese mismo marcador de posición hasta T-19/T-22 (decisión
 * documentada en `DECISIONES_TECNICAS.md`: T-16 es literalmente "Interfaz de gestión DEL
 * ADMINISTRADOR", y las tres pantallas que construye —centros, listado de alumnos, ficha de
 * alumno— son ya, por `permisosUi.ts`, contenido exclusivo de `administrator`).
 *
 * Este módulo es la única pieza de la capa de autenticación que toca el DOM de arranque y, desde
 * T-16, la raíz de composición de la aplicación de gestión: es quien conecta las funciones puras de
 * `src/datos/**` con el `ClientePostgrest`/`ClienteAlmacenamiento` reales y con la navegación del
 * router, para que cada pantalla siga recibiendo solo funciones ya resueltas, nunca un cliente HTTP.
 */

import type { GestorSesion, EstadoSesion } from '../nucleo/gestorSesion.ts';
import { parsearParametrosRecuperacion } from '../nucleo/enlaceRecuperacion.ts';
import { crearRouter, type ObjetivoRouter, type Ruta } from '../nucleo/router.ts';
import type { Perfil } from '../dominio/tipos.ts';
import { ETIQUETA_ROL } from '../dominio/tipos.ts';
import type { ClientePostgrest } from '../datos/postgrest.ts';
import type { ClienteAlmacenamiento } from '../datos/almacenamiento.ts';
import type { FabricaProcesadoImagen, ArchivoOrigenAvatar } from '../datos/avatarAlumno.ts';
import type { LimitadorTasa } from '../nucleo/limitadorTasa.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import { listarCentros, crearCentro, editarNombreCentro, contarAlumnosActivosDeCentro, desactivarCentro, reactivarCentro } from '../datos/centrosEstudios.ts';
import { listarAlumnos, obtenerAlumno, crearAlumno, editarAlumno, darDeBajaAlumno, reactivarAlumno } from '../datos/alumnos.ts';
import { crearPersonaReferencia, editarPersonaReferencia, eliminarPersonaReferencia } from '../datos/personasReferencia.ts';
import { subirAvatarAlumno, eliminarAvatarAlumno, urlsAvataresEnLote, SEGUNDOS_VALIDEZ_URL_AVATAR_POR_DEFECTO } from '../datos/avatarAlumno.ts';
import { listarSlotsDeAlumno, crearSlot, modificarSlot, cesarSlot } from '../datos/slotsHorario.ts';
import { listarProfesoresActivos } from '../datos/profesores.ts';
import { mostrarPantallaLogin } from './pantallaLogin.ts';
import { mostrarPantallaRecuperarContrasena } from './pantallaRecuperarContrasena.ts';
import { mostrarPantallaEstablecerContrasenaNueva } from './pantallaEstablecerContrasenaNueva.ts';
import { mostrarPantallaSinAcceso } from './pantallaSinAcceso.ts';
import { mostrarPantallaCentros } from './pantallaCentros.ts';
import { mostrarPantallaListadoAlumnos } from './pantallaListadoAlumnos.ts';
import { mostrarPantallaFichaAlumno } from './pantallaFichaAlumno.ts';
import { crearBoton } from './formularios.ts';

/** Todo lo que la aplicación real de `administrator` necesita para funcionar, ya construido por
 * `main.ts` a partir de la configuración de entorno — nunca un `fetch` a medio configurar. Ausente
 * en los tests que no ejercitan la aplicación real de administrator (siguen viendo el marcador de
 * posición). */
export interface DependenciasAppAdministrador {
  readonly objetivoRouter: ObjetivoRouter;
  readonly postgrest: ClientePostgrest;
  readonly almacenamiento: ClienteAlmacenamiento;
  readonly fabricaImagen: FabricaProcesadoImagen;
  readonly reloj: Reloj;
  /** Límite de cliente de T-06 para la subida de avatares (defensa en profundidad, ver
   * `DECISIONES_TECNICAS.md`); opcional, sin él no se limita en el cliente. */
  readonly limitadorAvatar?: LimitadorTasa;
}

export interface DependenciasAplicacion {
  readonly gestorSesion: GestorSesion;
  /** Normalmente `window.location.hash`. */
  readonly hashUrl: string;
  readonly appAdministrador?: DependenciasAppAdministrador;
}

function tieneAppPropia(rol: Perfil['rol']): boolean {
  return rol === 'administrator' || rol === 'teacher';
}

/** Marcador de posición de T-09, todavía vigente para `teacher` (T-19/T-22 construyen su
 * aplicación real) y para `administrator` en cualquier test que no pase `appAdministrador`. */
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

/** Monta la aplicación real de `administrator` (T-16): barra de navegación fija por hash + una de
 * las tres pantallas, según la ruta actual. El contenedor de la pantalla activa se reconstruye en
 * cada cambio de ruta; la barra de navegación y el botón de cerrar sesión, no. */
function mostrarAppAdministrador(
  contenedor: HTMLElement,
  perfil: Perfil,
  app: DependenciasAppAdministrador,
  cerrarSesion: () => Promise<void>,
): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;
  const router = crearRouter(app.objetivoRouter);

  const cabecera = documento.createElement('header');
  const titulo = documento.createElement('h1');
  titulo.textContent = `GestorAcademia — ${ETIQUETA_ROL[perfil.rol]}`;
  const saludo = documento.createElement('p');
  saludo.textContent = `Sesión iniciada como ${perfil.nombre}.`;

  const nav = documento.createElement('nav');
  const enlaceCentros = crearBoton(documento, 'Centros', 'button');
  enlaceCentros.addEventListener('click', () => {
    router.navegar({ nombre: 'centros' });
  });
  const enlaceAlumnos = crearBoton(documento, 'Alumnos', 'button');
  enlaceAlumnos.addEventListener('click', () => {
    router.navegar({ nombre: 'alumnos' });
  });
  const botonSalir = crearBoton(documento, 'Cerrar sesión', 'button');
  botonSalir.addEventListener('click', () => {
    void cerrarSesion();
  });
  nav.append(enlaceCentros, enlaceAlumnos, botonSalir);

  cabecera.append(titulo, saludo, nav);

  const areaPantalla = documento.createElement('div');

  function pintarRuta(ruta: Ruta): void {
    areaPantalla.textContent = '';
    if (ruta.nombre === 'centros') {
      mostrarPantallaCentros(areaPantalla, {
        rol: perfil.rol,
        listarCentros: (opciones) => listarCentros(app.postgrest, opciones),
        crearCentro: (nombre) => crearCentro(app.postgrest, nombre),
        editarNombreCentro: (id, nombre) => editarNombreCentro(app.postgrest, id, nombre),
        contarAlumnosActivosDeCentro: (id) => contarAlumnosActivosDeCentro(app.postgrest, id),
        desactivarCentro: (id) => desactivarCentro(app.postgrest, id),
        reactivarCentro: (id) => reactivarCentro(app.postgrest, id),
      });
      return;
    }

    if (ruta.nombre === 'alumnos') {
      mostrarPantallaListadoAlumnos(areaPantalla, {
        rol: perfil.rol,
        listarAlumnos: (opciones) => listarAlumnos(app.postgrest, opciones),
        irAFicha: (alumnoId) => {
          router.navegar({ nombre: 'alumno-detalle', alumnoId });
        },
        irANuevoAlumno: () => {
          router.navegar({ nombre: 'alumno-nuevo' });
        },
      });
      return;
    }

    const alumnoId = ruta.nombre === 'alumno-detalle' ? ruta.alumnoId : null;
    mostrarPantallaFichaAlumno(areaPantalla, {
      rol: perfil.rol,
      alumnoId,
      listarCentrosParaSelector: () => listarCentros(app.postgrest, { estado: 'activos' }),
      obtenerAlumno: (id) => obtenerAlumno(app.postgrest, id),
      crearAlumno: (datos) => crearAlumno(app.postgrest, datos),
      editarAlumno: (id, datos) => editarAlumno(app.postgrest, id, datos),
      darDeBajaAlumno: (id, motivo) => darDeBajaAlumno(app.postgrest, app.reloj, id, motivo),
      reactivarAlumno: (id) => reactivarAlumno(app.postgrest, id),
      crearPersonaReferencia: (alumnoId2, datos) => crearPersonaReferencia(app.postgrest, alumnoId2, datos),
      editarPersonaReferencia: (id, datos) => editarPersonaReferencia(app.postgrest, id, datos),
      eliminarPersonaReferencia: (id) => eliminarPersonaReferencia(app.postgrest, id),
      obtenerUrlAvatar: async (rutaBase) => {
        // La clave del lote no tiene por qué ser el id del alumno: `rutaBase` ya es única y
        // permite resolver este único elemento sin depender de `alumnoId` (que aquí podría ser
        // `null` en el hueco entre crear un alumno y navegar a su ficha).
        const urls = await urlsAvataresEnLote(app.almacenamiento, [{ alumnoId: rutaBase, rutaBase }], 'principal', SEGUNDOS_VALIDEZ_URL_AVATAR_POR_DEFECTO);
        return urls.get(rutaBase);
      },
      subirAvatar: (id, archivo: ArchivoOrigenAvatar, rutaBaseAnterior) =>
        subirAvatarAlumno(
          {
            postgrest: app.postgrest,
            almacenamiento: app.almacenamiento,
            fabrica: app.fabricaImagen,
            ...(app.limitadorAvatar ? { limitador: app.limitadorAvatar } : {}),
          },
          id,
          perfil.id,
          archivo,
          rutaBaseAnterior,
        ),
      eliminarAvatar: (id, rutaBaseActual) => eliminarAvatarAlumno({ postgrest: app.postgrest, almacenamiento: app.almacenamiento }, id, rutaBaseActual),
      listarSlotsDeAlumno: (id) => listarSlotsDeAlumno(app.postgrest, id),
      listarProfesoresParaSelector: () => listarProfesoresActivos(app.postgrest),
      crearSlot: (datos) => crearSlot(app.postgrest, datos),
      modificarSlot: (slotId, cambios, fechaEfecto) => modificarSlot(app.postgrest, slotId, cambios, fechaEfecto),
      cesarSlot: (slotId, fechaEfecto) => cesarSlot(app.postgrest, slotId, fechaEfecto),
      volver: () => {
        router.navegar({ nombre: 'alumnos' });
      },
      alCrearAlumno: (nuevoId) => {
        router.navegar({ nombre: 'alumno-detalle', alumnoId: nuevoId });
      },
    });
  }

  router.suscribir(pintarRuta);
  pintarRuta(router.obtenerRuta());

  contenedor.append(cabecera, areaPantalla);
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
    if (!tieneAppPropia(perfil.rol)) {
      mostrarPantallaSinAcceso(contenedor, perfil);
      return;
    }
    if (perfil.rol === 'administrator' && deps.appAdministrador) {
      mostrarAppAdministrador(contenedor, perfil, deps.appAdministrador, () => deps.gestorSesion.cerrarSesion());
      return;
    }
    mostrarPantallaAppTemporal(contenedor, perfil, () => deps.gestorSesion.cerrarSesion());
  }

  deps.gestorSesion.suscribir(renderizar);
  renderizar(deps.gestorSesion.obtenerEstado());
  void deps.gestorSesion.restaurar();
}
