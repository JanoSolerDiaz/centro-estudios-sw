import { mostrarPantallaInicial } from './pantallaInicial.ts';
import { instalarCapturaErrores } from '../nucleo/capturaErrores.ts';
import { crearInformadorErrores, type EnviadorEventoError } from '../nucleo/informadorErrores.ts';
import { logger } from '../nucleo/registro.ts';
import { leerConfiguracionEntorno, ErrorConfiguracionFaltante } from '../datos/configuracion.ts';
import { crearEnviadorEventoError } from '../datos/eventoError.ts';

declare global {
  interface Window {
    /** Inyectado por `config.js` (ver `config.ejemplo.js` y `DECISIONES_TECNICAS.md`), cargado en
     * `index.html` ANTES de este módulo. Ausente si el despliegue no lo ha generado todavía
     * (proveedor de hosting `<pendiente>`, T-25) — `leerConfiguracionEntorno` trata ese caso. */
    __CONFIG__?: unknown;
  }
}

// T-07 ya escribió la tabla `evento_error` y la RPC (pendiente de que el dueño aplique la
// migración 001 — ver §3 de SEGUIMIENTO.md); T-08 da el cliente real. Sin `config.js` desplegado
// (todavía no hay hosting elegido, T-25) esto no puede fallar el arranque: se registra en el
// logger local y la aplicación sigue, igual que antes de que existiera esta pieza.
function crearEnviadorEventoErrorSiHayConfiguracion(): EnviadorEventoError | undefined {
  try {
    const configuracion = leerConfiguracionEntorno(window.__CONFIG__);
    return crearEnviadorEventoError(configuracion);
  } catch (error) {
    if (error instanceof ErrorConfiguracionFaltante) {
      logger.warn('Sin configuración de la aplicación: los errores no se enviarán al servidor.', {
        causa: error.message,
      });
      return undefined;
    }
    throw error;
  }
}

instalarCapturaErrores(window, crearInformadorErrores(logger, crearEnviadorEventoErrorSiHayConfiguracion()));

const contenedorApp = document.querySelector<HTMLDivElement>('#app');

if (contenedorApp) {
  mostrarPantallaInicial(contenedorApp);
}
