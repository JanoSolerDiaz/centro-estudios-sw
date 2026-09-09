/**
 * Informe de horas por profesor (R-15): para un rango de fechas (por defecto el mes en curso), la
 * tabla de sesiones y horas reales/teóricas de cada profesor activo, con sus horas de sustitución
 * (R-06) separadas de las propias. Reservado a `administrator` (`puedeVerInformeHorasProfesor`) —
 * presentación, no control de acceso real (ver cabecera de `permisosUi.ts`); además, esta pantalla
 * solo se monta dentro del router de `administrator` (`nucleo/router.ts`/`ui/aplicacion.ts`), así
 * que un `teacher` no llega a ella por ningún camino (mismo criterio ya aceptado para R-10 y R-11,
 * ver `DECISIONES_TECNICAS.md`).
 *
 * Pantalla propia, no un bloque del panel de centro (R-11, `pantallaPanelCentro.ts`): el filtro de
 * "centro" de ese panel es el `centro_referencia_id` del ALUMNO (su colegio de origen), un concepto
 * sin ningún sentido para un informe cuyo sujeto es el profesor, así que reutilizar esa pantalla
 * habría dejado un control de filtro que no se aplicaría a este bloque, o habría exigido ignorarlo
 * en silencio — decisión documentada en `DECISIONES_TECNICAS.md`.
 *
 * CSV y tabla en pantalla comparten la misma fuente (`filasTablaInformeHorasProfesor`), igual que el
 * informe mensual de R-04, para que los dos formatos coincidan siempre en las cifras (criterio de
 * aceptación de R-15).
 */

import type { Rol, CierreCentro, ExcepcionSlot, SlotHorario, Asistencia } from '../dominio/tipos.ts';
import { puedeVerInformeHorasProfesor } from '../dominio/permisosUi.ts';
import {
  informeHorasProfesor,
  filasTablaInformeHorasProfesor,
  generarCsvInformeHorasProfesor,
  CABECERA_TABLA_INFORME_HORAS_PROFESOR,
  type ProfesorParaInformeHoras,
  type FilaInformeHorasProfesor,
  type RegistroParaInformeHorasProfesor,
} from '../dominio/informeHorasProfesor.ts';
import { limitesDelMes } from '../dominio/informeMensualAlumno.ts';
import { fechaLocalISO, fechaHoraLocalLegible, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { FiltroHistorico } from '../datos/asistencia.ts';
import { crearElemento, type Descargador, type AbridorVentanaImpresion } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

const NOMBRE_FICHERO_CSV = 'informe-horas-profesor.csv';
const TIPO_MIME_CSV = 'text/csv;charset=utf-8';

export interface DependenciasPantallaInformeHorasProfesor {
  readonly rol: Rol;
  readonly reloj: Reloj;
  readonly zonaHoraria?: string;
  listarProfesoresActivos(): Promise<readonly ProfesorParaInformeHoras[]>;
  listarSlotsDeProfesores(profesorIds: readonly string[]): Promise<readonly SlotHorario[]>;
  listarCierresActivos(): Promise<readonly CierreCentro[]>;
  listarExcepcionesEnRango(desde: string, hasta: string): Promise<readonly ExcepcionSlot[]>;
  listarHistoricoCompleto(filtro: Omit<FiltroHistorico, 'pagina' | 'porPagina'>): Promise<readonly Asistencia[]>;
  readonly descargador: Descargador;
  readonly abridorImpresion: AbridorVentanaImpresion;
}

export function mostrarPantallaInformeHorasProfesor(contenedor: HTMLElement, deps: DependenciasPantallaInformeHorasProfesor): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerInformeHorasProfesor(deps.rol)) {
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
  let filas: readonly FilaInformeHorasProfesor[] = [];

  const titulo = crearElemento(documento, 'h1', { texto: 'Informe de horas por profesor' });
  const zonaError = crearZonaMensaje(documento, 'alert');

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      const profesores = await deps.listarProfesoresActivos();
      const profesorIds = profesores.map((profesor) => profesor.id);

      const [slots, cierres, excepciones, asistenciasBrutas] = await Promise.all([
        deps.listarSlotsDeProfesores(profesorIds),
        deps.listarCierresActivos(),
        deps.listarExcepcionesEnRango(filtroDesde, filtroHasta),
        deps.listarHistoricoCompleto({
          desde: new Date(`${filtroDesde}T00:00:00.000Z`),
          hasta: new Date(`${filtroHasta}T00:00:00.000Z`),
        }),
      ]);
      const asistencias: readonly RegistroParaInformeHorasProfesor[] = asistenciasBrutas;

      filas = informeHorasProfesor({
        desde: filtroDesde,
        hasta: filtroHasta,
        profesores,
        slots,
        cierres,
        excepciones,
        asistencias,
        zonaHoraria,
      });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  const campoDesde = documento.createElement('input');
  campoDesde.type = 'date';
  campoDesde.id = 'informe-horas-filtro-desde';
  campoDesde.value = filtroDesde;
  const etiquetaDesde = crearElemento(documento, 'label', { texto: 'Desde', atributos: { for: 'informe-horas-filtro-desde' } });
  campoDesde.addEventListener('change', () => {
    if (campoDesde.value.length > 0) {
      filtroDesde = campoDesde.value;
      void cargar();
    }
  });

  const campoHasta = documento.createElement('input');
  campoHasta.type = 'date';
  campoHasta.id = 'informe-horas-filtro-hasta';
  campoHasta.value = filtroHasta;
  const etiquetaHasta = crearElemento(documento, 'label', { texto: 'Hasta', atributos: { for: 'informe-horas-filtro-hasta' } });
  campoHasta.addEventListener('change', () => {
    if (campoHasta.value.length > 0) {
      filtroHasta = campoHasta.value;
      void cargar();
    }
  });

  const botonCsv = crearBoton(documento, 'Descargar CSV', 'button');
  botonCsv.addEventListener('click', () => {
    const csv = generarCsvInformeHorasProfesor({
      desde: filtroDesde,
      hasta: filtroHasta,
      generadoEnLegible: fechaHoraLocalLegible(deps.reloj.ahora(), zonaHoraria),
      filas,
    });
    deps.descargador.descargar(csv, NOMBRE_FICHERO_CSV, TIPO_MIME_CSV);
  });

  const botonImprimir = crearBoton(documento, 'Imprimir / PDF', 'button');
  botonImprimir.addEventListener('click', () => {
    imprimir();
  });

  /** Ventana de impresión (mismo mecanismo que el informe mensual de R-04): construye la tabla con
   * las mismas funciones de creación de elementos que el resto del proyecto, nunca con una cadena
   * HTML cruda, sobre las MISMAS filas que ve la pantalla y que exporta el CSV. */
  function imprimir(): void {
    const ventana = deps.abridorImpresion.abrir('Informe de horas por profesor');
    if (!ventana) {
      errorCarga = 'El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.';
      pintar();
      return;
    }
    const docImpresion = ventana.document;
    const tituloImpresion = crearElemento(docImpresion, 'h1', { texto: `Informe de horas por profesor — ${filtroDesde} – ${filtroHasta}` });
    const tabla = construirTabla(docImpresion);
    docImpresion.body.append(tituloImpresion, tabla);
    ventana.imprimir();
  }

  function construirTabla(doc: Document): HTMLTableElement {
    const tabla = doc.createElement('table');
    const cabecera = doc.createElement('thead');
    const filaCabecera = doc.createElement('tr');
    for (const texto of CABECERA_TABLA_INFORME_HORAS_PROFESOR) {
      filaCabecera.append(crearElemento(doc, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = doc.createElement('tbody');
    for (const valores of filasTablaInformeHorasProfesor(filas)) {
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
    } else if (filas.length === 0) {
      seccionTabla.append(crearElemento(documento, 'p', { texto: 'Ningún profesor activo en este rango.' }));
    } else {
      seccionTabla.append(construirTabla(documento));
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
