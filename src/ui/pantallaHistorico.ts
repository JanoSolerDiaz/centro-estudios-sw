/**
 * Consulta y exportación del histórico de asistencia (T-23). Filtros por alumno (búsqueda simple,
 * requisito 1), por profesor y por centro (solo `administrator`, `puedeConsultarHistoricoDeCualquiera`
 * — un `teacher` ya está acotado a lo suyo por RLS, así que ninguno de los dos controles tendría
 * sentido para él) y por rango de fechas. Tabla con paginación real en servidor (requisito 5) y
 * botón de exportación a CSV (requisito 3) que trae TODO lo que cumple el filtro, no solo la página
 * visible, reutilizando exactamente los mismos filtros.
 *
 * Primera pantalla del proyecto que usa un `<table>` real en vez del patrón de `div`/`span` de
 * `pantallaListadoAlumnos.ts`: es la primera vez que hace falta mostrar una tabla de verdad (once
 * columnas por fila — la novena, "Justificación", añadida por R-02; "Salida" y "Duración", décima y
 * undécima, añadidas por R-03), y un lector de pantalla se beneficia de `<th scope="col">` frente a
 * una lista de bloques sin relación tabular declarada (decisión documentada en
 * `DECISIONES_TECNICAS.md`).
 *
 * Los nombres de alumno y profesor se resuelven en LOTE (nunca una petición por fila, §0.2) sobre
 * los ids que aparecen en la página actual — o, para la exportación, sobre los ids de TODO el
 * histórico exportado — con `resolverIdentificacionAlumnos`/`resolverNombresProfesores`. Un id que
 * no resuelve (alumno de baja para un `teacher`, cuya RLS lo oculta) se muestra con una etiqueta de
 * repuesto explícita, nunca en blanco ni con el id crudo.
 */

import type { CierreCentro, ExcepcionSlot, Rol, SlotHorario } from '../dominio/tipos.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import {
  puedeVerHistorico,
  puedeConsultarHistoricoDeCualquiera,
  puedeExportarConDatosDeContacto,
  puedeGenerarInformeMensual,
} from '../dominio/permisosUi.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { debeBuscar, type ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';
import {
  tieneModificaciones,
  etiquetaOrigenAsistencia,
  etiquetaEstadoAsistencia,
  etiquetaMotivoJustificacion,
  generarCsvHistorico,
  type FilaHistoricoResueltaConContacto,
} from '../dominio/historicoAsistencia.ts';
import { duracionRealMinutos, duracionTeoricaMinutos } from '../dominio/asistencia.ts';
import { fechaHoraLocalLegible, fechaLocalISO } from '../dominio/slots.ts';
import {
  sesionesEsperadasDelMes,
  resumenInformeMensual,
  filasInformeMensual,
  generarCsvInformeMensual,
  limitesDelMes,
  etiquetaMes,
  type DatosInformeMensual,
} from '../dominio/informeMensualAlumno.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { FiltroHistorico, ResultadoHistorico } from '../datos/asistencia.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento, type Descargador, type AbridorVentanaImpresion } from './dom.ts';
import { crearCampoTexto, crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface ProfesorParaFiltro {
  readonly id: string;
  readonly nombre: string;
}

export interface CentroParaFiltro {
  readonly id: string;
  readonly nombre: string;
}

export interface IdentificacionAlumno {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
}

export interface MapaNombres {
  readonly alumnos: ReadonlyMap<string, IdentificacionAlumno>;
  readonly profesores: ReadonlyMap<string, string>;
}

export interface DependenciasPantallaHistorico {
  readonly rol: Rol;
  /** Id del profesor cuando `rol === 'teacher'` — se aplica siempre como filtro, sin que la
   * interfaz ofrezca cambiarlo (RLS ya lo garantiza; esto es defensa en profundidad, mismo criterio
   * que el resto del proyecto). Sin efecto para `administrator`. */
  readonly usuarioId: string;
  readonly zonaHoraria?: string;
  listarHistorico(filtro: FiltroHistorico): Promise<ResultadoHistorico>;
  listarHistoricoCompleto(filtro: Omit<FiltroHistorico, 'pagina' | 'porPagina'>): Promise<readonly Asistencia[]>;
  resolverNombresAlumnos(ids: readonly string[]): Promise<ReadonlyMap<string, IdentificacionAlumno>>;
  resolverNombresProfesores(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
  /** Solo se llama si `puedeExportarConDatosDeContacto(rol)` y la casilla está marcada — opcional
   * porque un `teacher` (que nunca la ve ni la marca) no tiene por qué proveerla, mismo criterio que
   * `listarProfesoresParaSelector` en `pantallaRegistrosSlot.ts`. */
  resolverContactoAlumnos?(ids: readonly string[]): Promise<ReadonlyMap<string, { readonly email_alumno: string | null; readonly telefono_alumno: string | null }>>;
  buscarAlumnos(texto: string): Promise<readonly ResultadoBusquedaAlumno[]>;
  /** Solo se llama si `puedeConsultarHistoricoDeCualquiera(rol)` — opcional por el mismo motivo. */
  listarProfesoresParaFiltro?(): Promise<readonly ProfesorParaFiltro[]>;
  /** Solo se llama si `puedeConsultarHistoricoDeCualquiera(rol)` — opcional por el mismo motivo. */
  listarCentrosParaFiltro?(): Promise<readonly CentroParaFiltro[]>;
  readonly descargador: Descargador;

  /** Preselecciona el filtro de alumno al montar (R-04, enlace desde la ficha de alumno,
   * `#/historico/<alumnoId>`) — se ignora en silencio si no resuelve ningún nombre (mismo criterio
   * que `slotInicialId` de `pantallaRegistrosSlot.ts`, T-22): sin esta prop, la pantalla arranca
   * exactamente igual que antes de R-04. */
  readonly alumnoIdInicial?: string;
  /** Reloj inyectado (T-03: ninguna pantalla lee la hora del sistema directamente) — solo para la
   * "Fecha de generación" del informe mensual (R-04, requisito 2), nunca para ningún cálculo de
   * negocio (eso vive en `dominio/informeMensualAlumno.ts`, que no toca el reloj en absoluto). */
  readonly reloj: Reloj;
  /** Todas las versiones del horario del alumno (R-04, requisito 3: snapshot histórico) — de
   * `listarSlotsDeAlumno` (T-15), ya acotado por RLS a lo que puede ver quien pide el informe. */
  listarSlotsDeAlumnoParaInforme(alumnoId: string): Promise<readonly SlotHorario[]>;
  /** Cierres ACTIVOS del centro (R-12), para excluir un día cerrado de "sesiones esperadas". */
  listarCierresActivosParaInforme(): Promise<readonly CierreCentro[]>;
  /** Excepciones ACTIVAS (R-06) cuya fecha cae en `[desde, hasta]` (`AAAA-MM-DD`, el mes del
   * informe) — de cualquier slot, `sesionesEsperadasDelMes` filtra por slot internamente. */
  listarExcepcionesEnRangoParaInforme(desde: string, hasta: string): Promise<readonly ExcepcionSlot[]>;
  /** El `centro_referencia_id` del alumno (R-04, cabecera del informe) — solo resuelve para
   * `administrator` (`alumno_ficha` no devuelve fila a `teacher`, ver `datos/alumnos.ts`); opcional
   * porque un `teacher` (para quien esta llamada siempre daría `null`) no tiene por qué proveerla,
   * mismo criterio que `resolverContactoAlumnos`. Sin esta prop, el informe simplemente no incluye
   * el campo "Centro". */
  resolverCentroReferenciaIdParaInforme?(alumnoId: string): Promise<string | null>;
  readonly abridorImpresion: AbridorVentanaImpresion;
}

const POR_PAGINA = 20;
const NOMBRE_FICHERO_CSV = 'historico-asistencia.csv';
const NOMBRE_FICHERO_CSV_INFORME = 'informe-mensual.csv';
const TIPO_MIME_CSV = 'text/csv;charset=utf-8';

interface EstadoHistorico {
  readonly cargando: boolean;
  readonly errorCarga: string;
  readonly filas: readonly Asistencia[];
  readonly totalAproximado: number | null;
  readonly pagina: number;
  readonly nombres: MapaNombres;

  readonly filtroAlumnoId: string | null;
  readonly filtroAlumnoNombre: string;
  readonly filtroProfesorId: string | null;
  readonly filtroCentroId: string | null;
  readonly filtroDesde: string;
  readonly filtroHasta: string;

  readonly profesoresDisponibles: readonly ProfesorParaFiltro[];
  readonly centrosDisponibles: readonly CentroParaFiltro[];

  readonly textoBusquedaAlumno: string;
  readonly resultadosBusquedaAlumno: readonly ResultadoBusquedaAlumno[];

  readonly incluirContacto: boolean;
  readonly exportando: boolean;
  readonly errorExportacion: string;

  /** `AAAA-MM` (valor de un `<input type="month">`) — vacío mientras no se elige ningún mes. */
  readonly informeMes: string;
  readonly generandoInforme: boolean;
  readonly errorInforme: string;
}

const ESTADO_INICIAL: EstadoHistorico = {
  cargando: true,
  errorCarga: '',
  filas: [],
  totalAproximado: null,
  pagina: 0,
  nombres: { alumnos: new Map(), profesores: new Map() },
  filtroAlumnoId: null,
  filtroAlumnoNombre: '',
  filtroProfesorId: null,
  filtroCentroId: null,
  filtroDesde: '',
  filtroHasta: '',
  profesoresDisponibles: [],
  centrosDisponibles: [],
  textoBusquedaAlumno: '',
  resultadosBusquedaAlumno: [],
  incluirContacto: false,
  exportando: false,
  errorExportacion: '',
  informeMes: '',
  generandoInforme: false,
  errorInforme: '',
};

/** Ids únicos de alumno y de profesor presentes en `filas`, en el orden de primera aparición —
 * entrada de los dos resolutores en lote, para no pedir dos veces el mismo id. */
function idsUnicos(filas: readonly Asistencia[]): { readonly alumnoIds: readonly string[]; readonly profesorIds: readonly string[] } {
  const alumnoIds = [...new Set(filas.map((fila) => fila.alumno_id))];
  const profesorIds = [...new Set(filas.map((fila) => fila.profesor_id))];
  return { alumnoIds, profesorIds };
}

/** `AAAA-MM-DD` (valor de un `<input type="date">`) a un instante que cae, con certeza, dentro de
 * ese día natural en cualquier zona horaria positiva respecto a UTC (`Europe/Madrid` lo es siempre,
 * +1 o +2) — medianoche UTC de esa fecha es ya primera hora de la mañana local, nunca el día
 * anterior. `limitesDiaLocal` (capa de datos) resuelve desde aquí los límites exactos del día. */
function fechaFiltroAInstante(valor: string): Date | undefined {
  if (valor.trim().length === 0) {
    return undefined;
  }
  return new Date(`${valor}T00:00:00.000Z`);
}

const ETIQUETA_ALUMNO_NO_DISPONIBLE = '(alumno no disponible)';
const ETIQUETA_PROFESOR_NO_DISPONIBLE = '(profesor no disponible)';

export function mostrarPantallaHistorico(contenedor: HTMLElement, deps: DependenciasPantallaHistorico): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerHistorico(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const puedeElegirProfesorYCentro = puedeConsultarHistoricoDeCualquiera(deps.rol);
  const puedeIncluirContacto = puedeExportarConDatosDeContacto(deps.rol);
  const zonaHoraria = deps.zonaHoraria;

  const almacen = crearAlmacenEstado<EstadoHistorico>(ESTADO_INICIAL);

  const titulo = crearElemento(documento, 'h1', { texto: 'Histórico de asistencia' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaErrorExportacion = crearZonaMensaje(documento, 'alert');
  const tablaContenedor = documento.createElement('div');
  const paginadorEl = documento.createElement('div');

  function construirFiltroBase(): Omit<FiltroHistorico, 'pagina' | 'porPagina'> {
    const estado = almacen.obtener();
    const filtro: { alumnoId?: string; profesorId?: string; centroId?: string; desde?: Date; hasta?: Date } = {};

    if (estado.filtroAlumnoId) {
      filtro.alumnoId = estado.filtroAlumnoId;
    }
    if (!puedeElegirProfesorYCentro) {
      filtro.profesorId = deps.usuarioId;
    } else if (estado.filtroProfesorId) {
      filtro.profesorId = estado.filtroProfesorId;
    }
    if (puedeElegirProfesorYCentro && estado.filtroCentroId) {
      filtro.centroId = estado.filtroCentroId;
    }
    const desde = fechaFiltroAInstante(estado.filtroDesde);
    if (desde) {
      filtro.desde = desde;
    }
    const hasta = fechaFiltroAInstante(estado.filtroHasta);
    if (hasta) {
      filtro.hasta = hasta;
    }
    return filtro;
  }

  function filtroActual(pagina: number): FiltroHistorico {
    return { ...construirFiltroBase(), pagina, porPagina: POR_PAGINA };
  }

  async function cargar(pagina: number): Promise<void> {
    almacen.actualizar({ cargando: true, errorCarga: '', pagina });
    try {
      const resultado = await deps.listarHistorico(filtroActual(pagina));
      const { alumnoIds, profesorIds } = idsUnicos(resultado.filas);
      const [alumnos, profesores] = await Promise.all([
        deps.resolverNombresAlumnos(alumnoIds),
        deps.resolverNombresProfesores(profesorIds),
      ]);
      almacen.actualizar({
        cargando: false,
        filas: resultado.filas,
        totalAproximado: resultado.totalAproximado,
        nombres: { alumnos, profesores },
      });
    } catch (error) {
      almacen.actualizar({ cargando: false, errorCarga: mensajeAmigable(error) });
    }
  }

  // --- Filtro de alumno: búsqueda simple + lista de resultados, mismo patrón que "cambiar el
  // alumno" de pantallaRegistrosSlot.ts (sin el combobox ARIA completo de T-20: aquí no hace falta
  // porque no es un campo obligatorio de un formulario, es un filtro que se puede quitar). ---
  const campoBusquedaAlumno = crearCampoTexto(documento, 'historico-buscar-alumno', 'Filtrar por alumno', 'text', 'off');
  campoBusquedaAlumno.input.required = false;
  const botonBuscarAlumno = crearBoton(documento, 'Buscar', 'button');
  const resultadosBusquedaEl = documento.createElement('ul');
  const filtroAlumnoActivoEl = documento.createElement('p');
  const botonQuitarFiltroAlumno = crearBoton(documento, 'Quitar filtro de alumno', 'button');

  botonBuscarAlumno.addEventListener('click', () => {
    const texto = campoBusquedaAlumno.input.value;
    if (!debeBuscar(texto)) {
      almacen.actualizar({ resultadosBusquedaAlumno: [] });
      return;
    }
    void deps.buscarAlumnos(texto).then((resultados) => {
      almacen.actualizar({ resultadosBusquedaAlumno: resultados });
    });
  });
  botonQuitarFiltroAlumno.addEventListener('click', () => {
    almacen.actualizar({ filtroAlumnoId: null, filtroAlumnoNombre: '' });
    void cargar(0);
  });

  // --- Filtro de profesor y de centro: solo administrator ---
  const selectProfesor = documento.createElement('select');
  selectProfesor.id = 'historico-filtro-profesor';
  const etiquetaProfesor = crearElemento(documento, 'label', {
    texto: 'Profesor',
    atributos: { for: 'historico-filtro-profesor' },
  });
  selectProfesor.addEventListener('change', () => {
    almacen.actualizar({ filtroProfesorId: selectProfesor.value.length > 0 ? selectProfesor.value : null });
    void cargar(0);
  });

  const selectCentro = documento.createElement('select');
  selectCentro.id = 'historico-filtro-centro';
  const etiquetaCentro = crearElemento(documento, 'label', {
    texto: 'Centro de estudios',
    atributos: { for: 'historico-filtro-centro' },
  });
  selectCentro.addEventListener('change', () => {
    almacen.actualizar({ filtroCentroId: selectCentro.value.length > 0 ? selectCentro.value : null });
    void cargar(0);
  });

  // --- Filtro de rango de fechas ---
  const campoDesde = documento.createElement('input');
  campoDesde.type = 'date';
  campoDesde.id = 'historico-filtro-desde';
  const etiquetaDesde = crearElemento(documento, 'label', { texto: 'Desde', atributos: { for: 'historico-filtro-desde' } });
  campoDesde.addEventListener('change', () => {
    almacen.actualizar({ filtroDesde: campoDesde.value });
    void cargar(0);
  });

  const campoHasta = documento.createElement('input');
  campoHasta.type = 'date';
  campoHasta.id = 'historico-filtro-hasta';
  const etiquetaHasta = crearElemento(documento, 'label', { texto: 'Hasta', atributos: { for: 'historico-filtro-hasta' } });
  campoHasta.addEventListener('change', () => {
    almacen.actualizar({ filtroHasta: campoHasta.value });
    void cargar(0);
  });

  // --- Exportación CSV ---
  const casillaContacto = documento.createElement('input');
  casillaContacto.type = 'checkbox';
  casillaContacto.id = 'historico-incluir-contacto';
  const etiquetaContacto = crearElemento(documento, 'label', {
    texto: 'Incluir email y teléfono del alumno en la exportación',
    atributos: { for: 'historico-incluir-contacto' },
  });
  casillaContacto.addEventListener('change', () => {
    almacen.actualizar({ incluirContacto: casillaContacto.checked });
  });
  const botonExportar = crearBoton(documento, 'Exportar CSV', 'button');
  botonExportar.addEventListener('click', () => {
    void exportarCsv();
  });

  async function exportarCsv(): Promise<void> {
    const estado = almacen.obtener();
    almacen.actualizar({ exportando: true, errorExportacion: '' });
    try {
      const filas = await deps.listarHistoricoCompleto(construirFiltroBase());
      const { alumnoIds, profesorIds } = idsUnicos(filas);
      const incluirContacto = puedeIncluirContacto && estado.incluirContacto;
      const sinContactos: ReadonlyMap<string, { readonly email_alumno: string | null; readonly telefono_alumno: string | null }> =
        new Map();
      const [alumnos, profesores, contactos] = await Promise.all([
        deps.resolverNombresAlumnos(alumnoIds),
        deps.resolverNombresProfesores(profesorIds),
        incluirContacto ? (deps.resolverContactoAlumnos?.(alumnoIds) ?? Promise.resolve(sinContactos)) : Promise.resolve(sinContactos),
      ]);
      const filasCsv: FilaHistoricoResueltaConContacto[] = filas.map((fila) => {
        const contacto = contactos.get(fila.alumno_id);
        return {
          asistencia: fila,
          alumnoNombre: nombreParaMostrar(alumnos, fila.alumno_id),
          profesorNombre: profesores.get(fila.profesor_id) ?? ETIQUETA_PROFESOR_NO_DISPONIBLE,
          emailAlumno: contacto?.email_alumno ?? null,
          telefonoAlumno: contacto?.telefono_alumno ?? null,
        };
      });
      const csv = generarCsvHistorico(filasCsv, { incluirContacto }, zonaHoraria);
      deps.descargador.descargar(csv, NOMBRE_FICHERO_CSV, TIPO_MIME_CSV);
      almacen.actualizar({ exportando: false });
    } catch (error) {
      almacen.actualizar({ exportando: false, errorExportacion: mensajeAmigable(error) });
    }
  }

  // --- Informe mensual por alumno (R-04): requiere un alumno filtrado (arriba) y un mes elegido.
  // Reutiliza el mismo filtro de alumno que el resto de la pantalla, en vez de duplicar un segundo
  // buscador — "desde el histórico" (requisito 1) es justo esta misma pantalla. ---
  const tituloInforme = crearElemento(documento, 'h2', { texto: 'Informe mensual' });
  const campoMesInforme = documento.createElement('input');
  campoMesInforme.type = 'month';
  campoMesInforme.id = 'historico-informe-mes';
  const etiquetaMesInforme = crearElemento(documento, 'label', { texto: 'Mes', atributos: { for: 'historico-informe-mes' } });
  campoMesInforme.value = fechaLocalISO(deps.reloj.ahora(), zonaHoraria).slice(0, 7);
  campoMesInforme.addEventListener('change', () => {
    almacen.actualizar({ informeMes: campoMesInforme.value });
  });
  const zonaErrorInforme = crearZonaMensaje(documento, 'alert');
  const botonInformeCsv = crearBoton(documento, 'Informe: descargar CSV', 'button');
  const botonInformePdf = crearBoton(documento, 'Informe: imprimir / PDF', 'button');
  botonInformeCsv.addEventListener('click', () => {
    void generarInforme('csv');
  });
  botonInformePdf.addEventListener('click', () => {
    void generarInforme('pdf');
  });

  /** Cruza el horario del alumno (con sus versiones pasadas, requisito 3), los cierres y las
   * excepciones del mes con lo realmente registrado — `undefined` si todavía falta elegir alumno o
   * mes, para que `generarInforme` avise en vez de generar un informe sin sentido. */
  async function construirDatosInforme(): Promise<DatosInformeMensual | undefined> {
    const estado = almacen.obtener();
    if (!estado.filtroAlumnoId || estado.informeMes.length === 0) {
      return undefined;
    }
    const alumnoId = estado.filtroAlumnoId;
    const anio = Number(estado.informeMes.slice(0, 4));
    const mes = Number(estado.informeMes.slice(5, 7));
    const { primerDia, ultimoDia } = limitesDelMes(anio, mes);

    const [slots, cierres, excepciones, asistencias, centroReferenciaId] = await Promise.all([
      deps.listarSlotsDeAlumnoParaInforme(alumnoId),
      deps.listarCierresActivosParaInforme(),
      deps.listarExcepcionesEnRangoParaInforme(primerDia, ultimoDia),
      deps.listarHistoricoCompleto({
        alumnoId,
        desde: new Date(`${primerDia}T00:00:00.000Z`),
        hasta: new Date(`${ultimoDia}T00:00:00.000Z`),
      }),
      deps.resolverCentroReferenciaIdParaInforme?.(alumnoId) ?? Promise.resolve(null),
    ]);

    const sesiones = sesionesEsperadasDelMes({ anio, mes, slots, cierres, excepciones });
    const resumen = resumenInformeMensual(sesiones, asistencias);
    const centroNombre = centroReferenciaId
      ? (estado.centrosDisponibles.find((centro) => centro.id === centroReferenciaId)?.nombre ?? null)
      : null;

    return {
      alumnoNombre: estado.filtroAlumnoNombre,
      centroNombre,
      anio,
      mes,
      generadoEnLegible: fechaHoraLocalLegible(deps.reloj.ahora(), zonaHoraria),
      resumen,
    };
  }

  /** Ventana de impresión (requisito 2: "PDF... con impresión de HTML"): construye la tabla con las
   * mismas funciones de creación de elementos que el resto del proyecto, sobre el `document` de la
   * ventana nueva — nunca con una cadena HTML cruda — y llama a imprimir. Las MISMAS cifras que el
   * CSV (`filasInformeMensual`, única fuente para los dos formatos). */
  function imprimirInforme(datos: DatosInformeMensual): void {
    const ventana = deps.abridorImpresion.abrir(`Informe mensual — ${datos.alumnoNombre}`);
    if (!ventana) {
      almacen.actualizar({ errorInforme: 'El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.' });
      return;
    }
    const docImpresion = ventana.document;
    const titulo = crearElemento(docImpresion, 'h1', { texto: `Informe mensual — ${etiquetaMes(datos.mes)} ${String(datos.anio)}` });
    const tabla = docImpresion.createElement('table');
    const cuerpo = docImpresion.createElement('tbody');
    for (const [campo, valor] of filasInformeMensual(datos)) {
      const fila = docImpresion.createElement('tr');
      fila.append(crearElemento(docImpresion, 'th', { texto: campo, atributos: { scope: 'row' } }), crearElemento(docImpresion, 'td', { texto: valor }));
      cuerpo.append(fila);
    }
    tabla.append(cuerpo);
    docImpresion.body.append(titulo, tabla);
    ventana.imprimir();
  }

  async function generarInforme(formato: 'csv' | 'pdf'): Promise<void> {
    almacen.actualizar({ generandoInforme: true, errorInforme: '' });
    try {
      const datos = await construirDatosInforme();
      if (!datos) {
        almacen.actualizar({ generandoInforme: false, errorInforme: 'Elige un alumno (arriba) y un mes antes de generar el informe.' });
        return;
      }
      if (formato === 'csv') {
        deps.descargador.descargar(generarCsvInformeMensual(datos), NOMBRE_FICHERO_CSV_INFORME, TIPO_MIME_CSV);
      } else {
        imprimirInforme(datos);
      }
      almacen.actualizar({ generandoInforme: false });
    } catch (error) {
      almacen.actualizar({ generandoInforme: false, errorInforme: mensajeAmigable(error) });
    }
  }

  function nombreParaMostrar(
    alumnos: ReadonlyMap<string, { readonly nombre: string; readonly primer_apellido: string; readonly segundo_apellido: string | null }>,
    alumnoId: string,
  ): string {
    const alumno = alumnos.get(alumnoId);
    return alumno ? nombreCompletoAlumno(alumno) : ETIQUETA_ALUMNO_NO_DISPONIBLE;
  }

  function pintarFilaBusquedaAlumno(estado: EstadoHistorico): void {
    resultadosBusquedaEl.textContent = '';
    for (const resultado of estado.resultadosBusquedaAlumno) {
      const item = documento.createElement('li');
      const botonResultado = crearBoton(documento, nombreCompletoAlumno(resultado), 'button');
      botonResultado.addEventListener('click', () => {
        almacen.actualizar({
          filtroAlumnoId: resultado.id,
          filtroAlumnoNombre: nombreCompletoAlumno(resultado),
          resultadosBusquedaAlumno: [],
        });
        campoBusquedaAlumno.input.value = '';
        void cargar(0);
      });
      item.append(botonResultado);
      resultadosBusquedaEl.append(item);
    }
  }

  /** Columna "Duración" (R-03, requisito 3): real y teórica juntas cuando hay salida marcada, solo
   * la teórica si aún no la hay (mientras siga en curso o se olvidara cerrar), vacía si el registro
   * no tiene snapshot de slot (origen `manual`) ni salida — nada que calcular en ningún caso. Lee
   * exclusivamente el snapshot ya guardado en la propia fila, nunca un `SlotHorario` vigente
   * (no-retroactividad, §0.2), mismo criterio que el resto de esta pantalla y del CSV. */
  function textoDuracion(fila: Asistencia): string {
    const teorica = fila.slot_hora_inicio && fila.slot_hora_fin ? duracionTeoricaMinutos(fila.slot_hora_inicio, fila.slot_hora_fin) : null;
    if (fila.ocurrido_en_salida) {
      const real = duracionRealMinutos(new Date(fila.ocurrido_en), new Date(fila.ocurrido_en_salida));
      return teorica === null ? `${String(real)} min` : `${String(real)} min (teórica ${String(teorica)} min)`;
    }
    return teorica === null ? '' : `Teórica: ${String(teorica)} min`;
  }

  function pintarFila(fila: Asistencia, nombres: MapaNombres): HTMLTableRowElement {
    const tr = documento.createElement('tr');
    const celdas = [
      nombreParaMostrar(nombres.alumnos, fila.alumno_id),
      nombres.profesores.get(fila.profesor_id) ?? ETIQUETA_PROFESOR_NO_DISPONIBLE,
      fechaHoraLocalLegible(new Date(fila.ocurrido_en), zonaHoraria),
      fechaHoraLocalLegible(new Date(fila.registrado_en), zonaHoraria),
      etiquetaOrigenAsistencia(fila.origen),
      fila.es_retroactivo ? 'Sí' : 'No',
      etiquetaEstadoAsistencia(fila.estado),
      fila.motivo_justificacion ? etiquetaMotivoJustificacion(fila.motivo_justificacion) : fila.estado === 'ausente' ? 'Sin justificar' : '',
      tieneModificaciones(fila) ? 'Sí' : 'No',
      fila.ocurrido_en_salida ? fechaHoraLocalLegible(new Date(fila.ocurrido_en_salida), zonaHoraria) : '',
      textoDuracion(fila),
    ];
    for (const texto of celdas) {
      tr.append(crearElemento(documento, 'td', { texto }));
    }
    return tr;
  }

  function pintarPaginador(estado: EstadoHistorico): void {
    paginadorEl.textContent = '';
    if (estado.cargando) {
      return;
    }
    const botonAnterior = crearBoton(documento, 'Anterior', 'button');
    botonAnterior.disabled = estado.pagina === 0;
    botonAnterior.addEventListener('click', () => {
      void cargar(estado.pagina - 1);
    });
    const totalPaginas = estado.totalAproximado === null ? null : Math.max(1, Math.ceil(estado.totalAproximado / POR_PAGINA));
    const finDePagina = estado.filas.length < POR_PAGINA;
    const botonSiguiente = crearBoton(documento, 'Siguiente', 'button');
    botonSiguiente.disabled = totalPaginas === null ? finDePagina : estado.pagina + 1 >= totalPaginas;
    botonSiguiente.addEventListener('click', () => {
      void cargar(estado.pagina + 1);
    });
    const indicador = crearElemento(documento, 'span', {
      texto: `Página ${String(estado.pagina + 1)}${totalPaginas === null ? '' : ` de ${String(totalPaginas)}`}`,
    });
    paginadorEl.append(botonAnterior, indicador, botonSiguiente);
  }

  function pintar(estado: EstadoHistorico): void {
    zonaError.textContent = estado.errorCarga;
    zonaErrorExportacion.textContent = estado.errorExportacion;
    botonExportar.disabled = estado.exportando;
    botonExportar.textContent = estado.exportando ? 'Exportando…' : 'Exportar CSV';

    filtroAlumnoActivoEl.textContent = estado.filtroAlumnoId ? `Filtrando por: ${estado.filtroAlumnoNombre}` : '';
    botonQuitarFiltroAlumno.hidden = estado.filtroAlumnoId === null;
    pintarFilaBusquedaAlumno(estado);

    zonaErrorInforme.textContent = estado.errorInforme;
    botonInformeCsv.disabled = estado.generandoInforme;
    botonInformePdf.disabled = estado.generandoInforme;
    botonInformeCsv.textContent = estado.generandoInforme ? 'Generando…' : 'Informe: descargar CSV';
    botonInformePdf.textContent = estado.generandoInforme ? 'Generando…' : 'Informe: imprimir / PDF';

    tablaContenedor.textContent = '';
    if (estado.cargando) {
      tablaContenedor.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
      pintarPaginador(estado);
      return;
    }
    if (estado.filas.length === 0) {
      tablaContenedor.append(crearElemento(documento, 'p', { texto: 'No hay ningún registro que coincida con este filtro.' }));
      pintarPaginador(estado);
      return;
    }

    const tabla = documento.createElement('table');
    const cabecera = documento.createElement('thead');
    const filaCabecera = documento.createElement('tr');
    for (const texto of [
      'Alumno',
      'Profesor',
      'Hora atribuida',
      'Hora de creación',
      'Origen',
      'Retroactivo',
      'Estado',
      'Justificación',
      'Modificado',
      'Salida',
      'Duración',
    ]) {
      filaCabecera.append(crearElemento(documento, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = documento.createElement('tbody');
    for (const fila of estado.filas) {
      cuerpo.append(pintarFila(fila, estado.nombres));
    }
    tabla.append(cabecera, cuerpo);
    tablaContenedor.append(tabla);
    pintarPaginador(estado);
  }

  almacen.suscribir(pintar);

  const filtros: (HTMLElement | Text)[] = [
    etiquetaDesde,
    campoDesde,
    etiquetaHasta,
    campoHasta,
    campoBusquedaAlumno.contenedor,
    botonBuscarAlumno,
    resultadosBusquedaEl,
    filtroAlumnoActivoEl,
    botonQuitarFiltroAlumno,
  ];
  if (puedeElegirProfesorYCentro) {
    filtros.push(etiquetaProfesor, selectProfesor, etiquetaCentro, selectCentro);
  }

  const exportacion: (HTMLElement | Text)[] = [zonaErrorExportacion, botonExportar];
  if (puedeIncluirContacto) {
    exportacion.unshift(casillaContacto, etiquetaContacto);
  }

  contenedor.append(titulo, zonaError, ...filtros, ...exportacion, tablaContenedor, paginadorEl);

  // Bloque de informe mensual (R-04): mismo criterio de presentación que el resto de esta pantalla
  // (`puedeGenerarInformeMensual` es hoy el mismo conjunto de roles que `puedeVerHistorico`, pero es
  // una capacidad propia — podría divergir el día que el dueño decida otra cosa para una de las dos).
  if (puedeGenerarInformeMensual(deps.rol)) {
    contenedor.append(tituloInforme, etiquetaMesInforme, campoMesInforme, zonaErrorInforme, botonInformeCsv, botonInformePdf);
  }

  pintar(almacen.obtener());

  async function cargarSelectoresFiltro(): Promise<void> {
    if (!puedeElegirProfesorYCentro) {
      return;
    }
    const [profesores, centros] = await Promise.all([
      deps.listarProfesoresParaFiltro?.() ?? Promise.resolve([]),
      deps.listarCentrosParaFiltro?.() ?? Promise.resolve([]),
    ]);
    almacen.actualizar({ profesoresDisponibles: profesores, centrosDisponibles: centros });
    selectProfesor.append(crearElemento(documento, 'option', { texto: 'Todos', atributos: { value: '' } }));
    for (const profesor of profesores) {
      selectProfesor.append(crearElemento(documento, 'option', { texto: profesor.nombre, atributos: { value: profesor.id } }));
    }
    selectCentro.append(crearElemento(documento, 'option', { texto: 'Todos', atributos: { value: '' } }));
    for (const centro of centros) {
      selectCentro.append(crearElemento(documento, 'option', { texto: centro.nombre, atributos: { value: centro.id } }));
    }
  }

  async function iniciar(): Promise<void> {
    almacen.actualizar({ informeMes: campoMesInforme.value });
    if (deps.alumnoIdInicial) {
      // R-04: la ficha de alumno enlaza aquí con `#/historico/<alumnoId>` para generar su informe
      // mensual sin tener que volver a buscarlo — se ignora en silencio si no resuelve ningún
      // nombre (mismo criterio que `slotInicialId` de `pantallaRegistrosSlot.ts`, T-22): el filtro
      // se aplica igualmente por id, con una etiqueta de repuesto en vez de dejarlo en blanco.
      const nombres = await deps.resolverNombresAlumnos([deps.alumnoIdInicial]);
      const alumno = nombres.get(deps.alumnoIdInicial);
      almacen.actualizar({
        filtroAlumnoId: deps.alumnoIdInicial,
        filtroAlumnoNombre: alumno ? nombreCompletoAlumno(alumno) : ETIQUETA_ALUMNO_NO_DISPONIBLE,
      });
    }
    await Promise.all([cargarSelectoresFiltro(), cargar(0)]);
  }

  void iniciar();
}
