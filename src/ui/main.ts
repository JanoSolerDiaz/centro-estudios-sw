import { mostrarPantallaInicial } from './pantallaInicial.ts';
import { iniciarAplicacion } from './aplicacion.ts';
import { instalarCapturaErrores } from '../nucleo/capturaErrores.ts';
import { crearInformadorErrores, type EnviadorEventoError } from '../nucleo/informadorErrores.ts';
import { logger } from '../nucleo/registro.ts';
import { leerConfiguracionEntorno, ErrorConfiguracionFaltante, type ConfiguracionEntorno } from '../datos/configuracion.ts';
import { crearEnviadorEventoError } from '../datos/eventoError.ts';
import { crearClienteAutenticacion } from '../datos/autenticacion.ts';
import { crearGestorSesion, type GestorSesion } from '../nucleo/gestorSesion.ts';
import { crearAlmacenSesionWebStorage } from '../nucleo/almacenSesion.ts';

declare global {
  interface Window {
    /** Inyectado por `config.js` (ver `config.ejemplo.js` y `DECISIONES_TECNICAS.md`), cargado en
     * `index.html` ANTES de este módulo. Ausente si el despliegue no lo ha generado todavía
     * (proveedor de hosting `<pendiente>`, T-25) — `leerConfiguracionEntorno` trata ese caso. */
    __CONFIG__?: unknown;
  }
}

// T-07 ya escribió la tabla `evento_error` y la RPC (pendiente de que el dueño aplique la
// migración 001 — ver §3 de SEGUIMIENTO.md); T-08 dio el cliente real; T-09 añade la sesión.
function leerConfiguracionSiExiste(): ConfiguracionEntorno | undefined {
  try {
    return leerConfiguracionEntorno(window.__CONFIG__);
  } catch (error) {
    if (error instanceof ErrorConfiguracionFaltante) {
      logger.warn('Sin configuración de la aplicación: no se puede conectar con el servidor.', {
        causa: error.message,
      });
      return undefined;
    }
    throw error;
  }
}

const configuracion = leerConfiguracionSiExiste();

// Sin `config.js` desplegado no hay URL/clave con las que hablar con GoTrue ni con PostgREST:
// no hay nada que la aplicación de sesión pueda hacer, así que se queda sin construir (igual que
// el enviador de errores, más abajo) y se cae a la pantalla mínima de T-00.
const gestorSesion: GestorSesion | undefined = configuracion
  ? crearGestorSesion({
      urlBase: configuracion.urlBase,
      claveAnonima: configuracion.claveAnonima,
      clienteAutenticacion: crearClienteAutenticacion(configuracion),
      almacenSesion: crearAlmacenSesionWebStorage(sessionStorage),
      logger,
    })
  : undefined;

function crearEnviadorEventoErrorSiHayConfiguracion(): EnviadorEventoError | undefined {
  if (!configuracion) {
    return undefined;
  }
  // Desde T-09, si hay sesión, los eventos de error quedan atribuidos al usuario autenticado
  // (`registrar_evento_error` fija el autor igual que antes con `auth.uid()`, pero ahora la
  // petición viaja con su token en vez de con la clave anónima cuando la hay).
  return crearEnviadorEventoError({
    urlBase: configuracion.urlBase,
    claveAnonima: configuracion.claveAnonima,
    ...(gestorSesion ? { obtenerTokenSesion: () => gestorSesion.obtenerTokenSesion() } : {}),
  });
}

instalarCapturaErrores(window, crearInformadorErrores(logger, crearEnviadorEventoErrorSiHayConfiguracion()));

const contenedorApp = document.querySelector<HTMLDivElement>('#app');

if (contenedorApp) {
  if (gestorSesion) {
    iniciarAplicacion(contenedorApp, { gestorSesion, hashUrl: window.location.hash });
  } else {
    mostrarPantallaInicial(contenedorApp);
  }
}
