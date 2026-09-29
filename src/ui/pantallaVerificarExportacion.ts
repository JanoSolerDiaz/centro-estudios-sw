/**
 * Verificar exportación (R-34, requisito 3): el administrador elige un fichero JSON local (expediente
 * de R-10 o volcado de R-16), se recalcula su huella y se compara con el bloque `sello` del fichero
 * y, si la pega, con la huella guardada aparte. El resultado se dice con TEXTO, no solo con color.
 * El fichero se lee y procesa solo en el navegador: esta pantalla no hace ninguna petición de red ni
 * registra su contenido. Exclusivamente `administrator` (`puedeVerificarExportacion`).
 */

import type { Rol } from '../dominio/tipos.ts';
import { puedeVerificarExportacion } from '../dominio/permisosUi.ts';
import {
  calcularHuellaSha256,
  ETIQUETA_RESULTADO_VERIFICACION,
  verificarDocumentoSellado,
  type CalculadorHuella,
} from '../dominio/selloIntegridad.ts';
import type { LectorFichero } from './dom.ts';
import { crearElemento } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaVerificarExportacion {
  readonly rol: Rol;
  readonly leerFichero: LectorFichero;
  readonly calcularHuella?: CalculadorHuella;
}

export function mostrarPantallaVerificarExportacion(contenedor: HTMLElement, deps: DependenciasPantallaVerificarExportacion): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerificarExportacion(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const campoFichero = documento.createElement('input');
  campoFichero.type = 'file';
  campoFichero.accept = 'application/json,.json';
  campoFichero.id = 'verificar-fichero';
  const etiquetaFichero = crearElemento(documento, 'label', { texto: 'Fichero JSON exportado', atributos: { for: 'verificar-fichero' } });

  const campoHuella = documento.createElement('input');
  campoHuella.type = 'text';
  campoHuella.id = 'verificar-huella';
  campoHuella.autocomplete = 'off';
  const etiquetaHuella = crearElemento(documento, 'label', {
    texto: 'Huella guardada aparte (opcional)',
    atributos: { for: 'verificar-huella' },
  });

  const boton = crearBoton(documento, 'Verificar', 'button');
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaResultado = crearZonaMensaje(documento, 'status');
  const zonaDetalle = crearElemento(documento, 'div');
  let verificando = false;

  boton.addEventListener('click', () => {
    if (verificando) {
      return;
    }
    zonaError.textContent = '';
    zonaResultado.textContent = '';
    zonaDetalle.textContent = '';
    const archivo = campoFichero.files?.[0];
    if (!archivo) {
      zonaError.textContent = 'Elige primero un fichero JSON.';
      return;
    }
    verificando = true;
    void (async () => {
      try {
        const texto = await deps.leerFichero.leerTexto(archivo);
        const informe = await verificarDocumentoSellado(texto, campoHuella.value, deps.calcularHuella ?? calcularHuellaSha256);
        zonaResultado.textContent = ETIQUETA_RESULTADO_VERIFICACION[informe.resultado];
        if (informe.huellaCalculada !== null) {
          zonaDetalle.append(
            crearElemento(documento, 'p', { texto: `Huella recalculada: ${informe.huellaCalculada}` }),
            crearElemento(documento, 'p', { texto: `Huella del fichero: ${informe.huellaDelFichero ?? ''}` }),
          );
        }
      } catch (error) {
        zonaError.textContent = mensajeAmigable(error);
      } finally {
        verificando = false;
      }
    })();
  });

  contenedor.append(
    crearElemento(documento, 'h1', { texto: 'Verificar exportación' }),
    crearElemento(documento, 'p', {
      texto:
        'Comprueba que un expediente o una exportación del centro no se ha modificado desde que salió del sistema. El fichero se procesa solo en tu navegador: no se sube a ningún servidor.',
    }),
    etiquetaFichero,
    campoFichero,
    etiquetaHuella,
    campoHuella,
    boton,
    zonaError,
    zonaResultado,
    zonaDetalle,
  );
}
