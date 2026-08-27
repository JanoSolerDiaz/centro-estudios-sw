import { mostrarPantallaInicial } from './pantallaInicial.ts';
import { instalarCapturaErrores } from '../nucleo/capturaErrores.ts';
import { crearInformadorErrores } from '../nucleo/informadorErrores.ts';
import { logger } from '../nucleo/registro.ts';

// Sin `enviar` (T-05): hasta que T-07/T-08 den una tabla `evento_error` y un cliente reales, los
// errores no controlados quedan registrados en el logger local, ya depurado. Cuando exista ese
// cliente, se le pasa como segundo argumento aquí.
instalarCapturaErrores(window, crearInformadorErrores(logger));

const contenedorApp = document.querySelector<HTMLDivElement>('#app');

if (contenedorApp) {
  mostrarPantallaInicial(contenedorApp);
}
