/**
 * Informe de horas propias para el profesor (R-19): el mismo cálculo de `dominio/informeHorasProfesor.ts`
 * (R-15), acotado exclusivamente a sí mismo, sin selector de otro profesor ni ninguna cifra ajena
 * (requisitos 1-2). Reservado a `teacher` (`puedeVerInformeHorasPropio`) — presentación, no control
 * de acceso real (ver cabecera de `permisosUi.ts`); además, esta pantalla solo se monta dentro del
 * router de `teacher` (`nucleo/router.ts`/`ui/aplicacion.ts`), así que un `administrator` no llega a
 * ella por ningún camino — mismo criterio de inaccesibilidad estructural ya aceptado para R-15/R-10
 * (ver `DECISIONES_TECNICAS.md`).
 *
 * A diferencia de `pantallaInformeHorasProfesor.ts` (R-15, un profesor por fila de una lista
 * abierta), aquí el conjunto de "profesores" que recibe `informeHorasProfesor` es SIEMPRE el propio
 * profesor, fijado por `deps.profesorId`/`deps.profesorNombre` — nunca resuelto contra un listado
 * del centro. Sin la comprobación de "sin profesores en este rango" de aquella pantalla: la fila
 * propia existe siempre, en ceros si no hay ninguna sesión (mismo criterio de R-15, requisito 1:
 * "un dato que hace falta ver, no una fila que sobra").
 *
 * CSV y tabla en pantalla comparten la misma fuente (`filasTablaInformeHorasProfesor`), igual que
 * R-15, para que los dos formatos coincidan siempre en las cifras (criterio de aceptación de R-19).
 */

import type { Rol, CierreCentro, ExcepcionSlot, SlotHorario } from '../dominio/tipos.ts';
import { puedeVerInformeHorasPropio } from '../dominio/permisosUi.ts';
import {
  informeHorasProfesor,
  filasTablaInformeHorasProfesor,
  generarCsvInformeHorasProfesor,
  CABECERA_TABLA_INFORME_HORAS_PROFESOR,
  type FilaInformeHorasProfesor,
  type RegistroParaInformeHorasProfesor,
} from '../dominio/informeHorasProfesor.ts';
import { limitesDelMes } from '../dominio/informeMensualAlumno.ts';
import { fechaLocalISO, fechaHoraLocalLegible, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import { crearElemento, type Descargador, type AbridorVentanaImpresion } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

const NOMBRE_FICHERO_CSV = 'mis-horas.csv';
const TIPO_MIME_CSV = 'text/csv;charset=utf-8';

export interface DependenciasPantallaMisHorasProfesor {
  readonly rol: Rol;
  readonly profesorId: string;
  readonly profesorNombre: string;
  readonly reloj: Reloj;
  readonly zonaHoraria?: string;
  listarSlotsPropios(): Promise<readonly SlotHorario[]>;
  listarCierresActivos(): Promise<readonly CierreCentro[]>;
  listarExcepcionesEnRango(desde: string, hasta: string): Promise<readonly ExcepcionSlot[]>;
  /** Registros del propio profesor en `[desde, hasta]` (mismo contrato que `listarRegistrosRecientes`
   * de `pantallaMiHorario.ts`) — de cualquier estado, esta pantalla descarta internamente lo que no
   * cuenta como hora impartida (requisito 3 de R-19, vía `informeHorasProfesor`). */
  listarHistoricoPropio(desde: Date, hasta: Date): Promise<readonly RegistroParaInformeHorasProfesor[]>;
  readonly descargador: Descargador;
  readonly abridorImpresion: AbridorVentanaImpresion;
}

export function mostrarPantallaMisHorasProfesor(contenedor: HTMLElement, deps: DependenciasPantallaMisHorasProfesor): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerInformeHorasPropio(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const zonaHoraria = deps.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const fechaInicial = fechaLocalISO(deps.reloj.ahora(), zonaHoraria);
  const { primerDia, ultimoDia } = limitesDelMes(Number(fechaInicial.slice(0, 4)), Number(fechaInicial.slice(5, 7)));

  let cargando = true;
  let errorCarga = '';
  let filtroDesde = primerDia;
  let filtroHasta = ultimoDia;
  let fila: FilaInformeHorasProfesor | null = null;

  const titulo = crearElemento(documento, 'h1', { texto: 'Mis horas' });
  const zonaError = crearZonaMensaje(documento, 'alert');

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      const [slots, cierres, excepciones, asistencias] = await Promise.all([
        deps.listarSlotsPropios(),
        deps.listarCierresActivos(),
        deps.listarExcepcionesEnRango(filtroDesde, filtroHasta),
        deps.listarHistoricoPropio(new Date(`${filtroDesde}T00:00:00.000Z`), new Date(`${filtroHasta}T00:00:00.000Z`)),
      ]);

      const [filaPropia] = informeHorasProfesor({
        desde: filtroDesde,
        hasta: filtroHasta,
        profesores: [{ id: deps.profesorId, nombre: deps.profesorNombre }],
        slots,
        cierres,
        excepciones,
        asistencias,
        zonaHoraria,
      });
      fila = filaPropia ?? null;
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  const campoDesde = documento.createElement('input');
  campoDesde.type = 'date';
  campoDesde.id = 'mis-horas-filtro-desde';
  campoDesde.value = filtroDesde;
  const etiquetaDesde = crearElemento(documento, 'label', { texto: 'Desde', atributos: { for: 'mis-horas-filtro-desde' } });
  campoDesde.addEventListener('change', () => {
    if (campoDesde.value.length > 0) {
      filtroDesde = campoDesde.value;
      void cargar();
    }
  });

  const campoHasta = documento.createElement('input');
  campoHasta.type = 'date';
  campoHasta.id = 'mis-horas-filtro-hasta';
  campoHasta.value = filtroHasta;
  const etiquetaHasta = crearElemento(documento, 'label', { texto: 'Hasta', atributos: { for: 'mis-horas-filtro-hasta' } });
  campoHasta.addEventListener('change', () => {
    if (campoHasta.value.length > 0) {
      filtroHasta = campoHasta.value;
      void cargar();
    }
  });

  const botonCsv = crearBoton(documento, 'Descargar CSV', 'button');
  botonCsv.addEventListener('click', () => {
    if (!fila) {
      return;
    }
    const csv = generarCsvInformeHorasProfesor({
      desde: filtroDesde,
      hasta: filtroHasta,
      generadoEnLegible: fechaHoraLocalLegible(deps.reloj.ahora(), zonaHoraria),
      filas: [fila],
    });
    deps.descargador.descargar(csv, NOMBRE_FICHERO_CSV, TIPO_MIME_CSV);
  });

  const botonImprimir = crearBoton(documento, 'Imprimir / PDF', 'button');
  botonImprimir.addEventListener('click', () => {
    imprimir();
  });

  function imprimir(): void {
    if (!fila) {
      return;
    }
    const ventana = deps.abridorImpresion.abrir('Mis horas');
    if (!ventana) {
      errorCarga = 'El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.';
      pintar();
      return;
    }
    const docImpresion = ventana.document;
    const tituloImpresion = crearElemento(docImpresion, 'h1', { texto: `Mis horas — ${filtroDesde} – ${filtroHasta}` });
    const tabla = construirTabla(docImpresion, fila);
    docImpresion.body.append(tituloImpresion, tabla);
    ventana.imprimir();
  }

  function construirTabla(doc: Document, filaTabla: FilaInformeHorasProfesor): HTMLTableElement {
    const tabla = doc.createElement('table');
    const cabecera = doc.createElement('thead');
    const filaCabecera = doc.createElement('tr');
    for (const texto of CABECERA_TABLA_INFORME_HORAS_PROFESOR) {
      filaCabecera.append(crearElemento(doc, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = doc.createElement('tbody');
    for (const valores of filasTablaInformeHorasProfesor([filaTabla])) {
      const filaEl = doc.createElement('tr');
      for (const valor of valores) {
        filaEl.append(crearElemento(doc, 'td', { texto: valor }));
      }
      cuerpo.append(filaEl);
    }
    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  const seccionTabla = documento.createElement('section');

  function pintar(): void {
    zonaError.textContent = errorCarga;

    seccionTabla.textContent = '';
    if (cargando) {
      seccionTabla.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
    } else if (fila) {
      seccionTabla.append(construirTabla(documento, fila));
    }
  }

  contenedor.append(
    titulo,
    zonaError,
    etiquetaDesde,
    campoDesde,
    etiquetaHasta,
    campoHasta,
    botonCsv,
    botonImprimir,
    seccionTabla,
  );

  void cargar();
}
