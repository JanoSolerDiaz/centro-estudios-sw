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

import type { Rol } from '../dominio/tipos.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import {
  puedeVerHistorico,
  puedeConsultarHistoricoDeCualquiera,
  puedeExportarConDatosDeContacto,
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
import { fechaHoraLocalLegible } from '../dominio/slots.ts';
import type { FiltroHistorico, ResultadoHistorico } from '../datos/asistencia.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento, type Descargador } from './dom.ts';
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
}

const POR_PAGINA = 20;
const NOMBRE_FICHERO_CSV = 'historico-asistencia.csv';
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

  void cargarSelectoresFiltro();
  void cargar(0);
}
