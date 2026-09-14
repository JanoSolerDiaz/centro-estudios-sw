/**
 * Registro de auditoría de cambios (R-20): índice de CENTRO COMPLETO, cronológico inverso, de cada
 * modificación o anulación de un registro de asistencia — quién la hizo y cuándo, sobre un alumno y
 * un profesor concretos. `asistencia_historial` ya guarda una fila por cada `UPDATE` desde T-07/T-18
 * (el trigger `asistencia_copiar_a_historial`), con lectura reservada a `administrator` desde T-10
 * (`asistencia_historial_admin_leer`); esta pantalla simplemente las lista, sin tabla ni migración
 * nueva (requisito 5).
 *
 * Cada fila enlaza al registro completo en «Registros» (T-21, requisito 2), donde ya vive el botón
 * "Ver historial" que despliega la comparación de valores previos y posteriores de ESE registro
 * concreto — este enlace es un ÍNDICE de centro ("dónde mirar"), no una segunda vista de la
 * comparación en sí. El enlace usa el `slot_id`/`ocurrido_en` que la propia fila de historial ya
 * trae (snapshot del estado justo ANTES de ese cambio): en el caso normal — una corrección de hora,
 * nota o estado que no mueve la sesión de día ni de slot — coincide con dónde vive hoy el registro
 * corregido. Si el cambio en cuestión fue precisamente "cambiar el slot atribuido" (T-21) o mover
 * `ocurrido_en` a otro día, el enlace apunta al slot/día de ANTES de ese cambio concreto, no al
 * actual — limitación conocida y aceptada (ver `DECISIONES_TECNICAS.md`): sigue siendo un lugar
 * correcto por el que empezar a mirar, nunca un dato incorrecto. Sin `slot_id` (origen `manual`, sin
 * ningún slot al que enlazar) la fila no ofrece enlace.
 *
 * Mismo patrón exacto que `pantallaHistorico.ts` (T-23) para resolver nombres en lote y paginar en
 * servidor, con dos diferencias: el filtro por defecto son los últimos 7 días (requisito 3, "por
 * ejemplo, cuántas correcciones ha hecho un profesor concreto en un periodo") y el filtro de autor
 * es `cambiado_por` (quien corrigió), no `profesor_id` (el dueño del registro) — los dos pueden ser
 * personas distintas (un `administrator` corrigiendo el registro de un `teacher`), así que el
 * selector de autor lista CUALQUIER perfil activo, no solo profesores (`deps.listarAutoresParaFiltro`,
 * sobre `perfil` sin filtrar por rol). Exclusivamente `administrator` (requisito 6,
 * `puedeVerRegistroAuditoria`).
 */

import type { AsistenciaHistorial, Rol } from '../dominio/tipos.ts';
import { puedeVerRegistroAuditoria } from '../dominio/permisosUi.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { fechaHoraLocalLegible, fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { FiltroHistorialCentro, ResultadoHistorialCentro } from '../datos/asistencia.ts';
import type { IdentificacionAlumno } from './pantallaHistorico.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface AutorParaFiltro {
  readonly id: string;
  readonly nombre: string;
}

export interface MapaNombresAuditoria {
  readonly alumnos: ReadonlyMap<string, IdentificacionAlumno>;
  readonly profesores: ReadonlyMap<string, string>;
}

export interface DependenciasPantallaRegistroAuditoria {
  readonly rol: Rol;
  readonly zonaHoraria?: string;
  readonly reloj: Reloj;
  listarHistorial(filtro: FiltroHistorialCentro): Promise<ResultadoHistorialCentro>;
  resolverNombresAlumnos(ids: readonly string[]): Promise<ReadonlyMap<string, IdentificacionAlumno>>;
  resolverNombresProfesores(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
  /** CUALQUIER perfil activo (no solo `teacher`, ver cabecera del módulo) — para el filtro de autor. */
  listarAutoresParaFiltro(): Promise<readonly AutorParaFiltro[]>;
  /** Navega a «Registros» (T-21) con el profesor, el slot y la fecha ya elegidos (requisito 2). */
  irARegistro(profesorId: string, slotId: string, fecha: string): void;
}

const POR_PAGINA = 20;
const DIAS_RANGO_POR_DEFECTO = 7;
const ETIQUETA_ALUMNO_NO_DISPONIBLE = '(alumno no disponible)';
const ETIQUETA_PROFESOR_NO_DISPONIBLE = '(profesor no disponible)';

interface EstadoAuditoria {
  readonly cargando: boolean;
  readonly errorCarga: string;
  readonly filas: readonly AsistenciaHistorial[];
  readonly totalAproximado: number | null;
  readonly pagina: number;
  readonly nombres: MapaNombresAuditoria;

  readonly filtroDesde: string;
  readonly filtroHasta: string;
  readonly filtroAutorId: string | null;
  readonly autoresDisponibles: readonly AutorParaFiltro[];
}

/** `AAAA-MM-DD` (valor de un `<input type="date">`) a un instante que cae, con certeza, dentro de
 * ese día natural en cualquier zona horaria positiva respecto a UTC — mismo criterio que
 * `pantallaHistorico.ts#fechaFiltroAInstante`. */
function fechaFiltroAInstante(valor: string): Date | undefined {
  if (valor.trim().length === 0) {
    return undefined;
  }
  return new Date(`${valor}T00:00:00.000Z`);
}

/** Ids únicos de alumno y de profesor presentes en `filas`, entrada de los dos resolutores en lote
 * (mismo criterio que `pantallaHistorico.ts#idsUnicos`). */
function idsUnicos(filas: readonly AsistenciaHistorial[]): { readonly alumnoIds: readonly string[]; readonly profesorIds: readonly string[] } {
  const alumnoIds = [...new Set(filas.map((fila) => fila.alumno_id))];
  const profesorIds = [...new Set(filas.map((fila) => fila.profesor_id))];
  return { alumnoIds, profesorIds };
}

export function mostrarPantallaRegistroAuditoria(contenedor: HTMLElement, deps: DependenciasPantallaRegistroAuditoria): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerRegistroAuditoria(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const zonaHoraria = deps.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const hoy = deps.reloj.ahora();
  const hastaPorDefecto = fechaLocalISO(hoy, zonaHoraria);
  const desdePorDefecto = fechaLocalISO(new Date(hoy.getTime() - DIAS_RANGO_POR_DEFECTO * 24 * 60 * 60 * 1000), zonaHoraria);

  const almacen = crearAlmacenEstado<EstadoAuditoria>({
    cargando: true,
    errorCarga: '',
    filas: [],
    totalAproximado: null,
    pagina: 0,
    nombres: { alumnos: new Map(), profesores: new Map() },
    filtroDesde: desdePorDefecto,
    filtroHasta: hastaPorDefecto,
    filtroAutorId: null,
    autoresDisponibles: [],
  });

  const titulo = crearElemento(documento, 'h1', { texto: 'Registro de auditoría de cambios' });
  const zonaError = crearZonaMensaje(documento, 'alert');

  function filtroActual(pagina: number): FiltroHistorialCentro {
    const estado = almacen.obtener();
    const filtro: { cambiadoPorId?: string; desde?: Date; hasta?: Date; pagina: number; porPagina: number } = {
      pagina,
      porPagina: POR_PAGINA,
    };
    if (estado.filtroAutorId) {
      filtro.cambiadoPorId = estado.filtroAutorId;
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

  async function cargar(pagina: number): Promise<void> {
    almacen.actualizar({ cargando: true, errorCarga: '', pagina });
    try {
      const resultado = await deps.listarHistorial(filtroActual(pagina));
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

  // --- Filtros: rango de fechas (últimos 7 días por defecto, requisito 3) y autor del cambio -----
  const campoDesde = documento.createElement('input');
  campoDesde.type = 'date';
  campoDesde.id = 'auditoria-filtro-desde';
  campoDesde.value = desdePorDefecto;
  const etiquetaDesde = crearElemento(documento, 'label', { texto: 'Desde', atributos: { for: 'auditoria-filtro-desde' } });
  campoDesde.addEventListener('change', () => {
    almacen.actualizar({ filtroDesde: campoDesde.value });
    void cargar(0);
  });

  const campoHasta = documento.createElement('input');
  campoHasta.type = 'date';
  campoHasta.id = 'auditoria-filtro-hasta';
  campoHasta.value = hastaPorDefecto;
  const etiquetaHasta = crearElemento(documento, 'label', { texto: 'Hasta', atributos: { for: 'auditoria-filtro-hasta' } });
  campoHasta.addEventListener('change', () => {
    almacen.actualizar({ filtroHasta: campoHasta.value });
    void cargar(0);
  });

  const selectAutor = documento.createElement('select');
  selectAutor.id = 'auditoria-filtro-autor';
  const etiquetaAutor = crearElemento(documento, 'label', { texto: 'Autor del cambio', atributos: { for: 'auditoria-filtro-autor' } });
  selectAutor.addEventListener('change', () => {
    almacen.actualizar({ filtroAutorId: selectAutor.value.length > 0 ? selectAutor.value : null });
    void cargar(0);
  });

  const tablaContenedor = documento.createElement('div');
  const paginadorEl = documento.createElement('div');

  function pintarFila(fila: AsistenciaHistorial, nombres: MapaNombresAuditoria): HTMLTableRowElement {
    const tr = documento.createElement('tr');
    const alumno = nombres.alumnos.get(fila.alumno_id);
    const autor = fila.cambiado_por ? (nombres.profesores.get(fila.cambiado_por) ?? ETIQUETA_PROFESOR_NO_DISPONIBLE) : '(sistema)';
    const celdas = [
      fechaHoraLocalLegible(new Date(fila.cambiado_en), zonaHoraria),
      alumno ? nombreCompletoAlumno(alumno) : ETIQUETA_ALUMNO_NO_DISPONIBLE,
      nombres.profesores.get(fila.profesor_id) ?? ETIQUETA_PROFESOR_NO_DISPONIBLE,
      autor,
    ];
    for (const texto of celdas) {
      tr.append(crearElemento(documento, 'td', { texto }));
    }
    const celdaEnlace = documento.createElement('td');
    if (fila.slot_id) {
      const slotId = fila.slot_id;
      const fecha = fechaLocalISO(new Date(fila.ocurrido_en), zonaHoraria);
      const boton = crearBoton(documento, 'Ver registro completo', 'button');
      boton.addEventListener('click', () => {
        deps.irARegistro(fila.profesor_id, slotId, fecha);
      });
      celdaEnlace.append(boton);
    } else {
      celdaEnlace.textContent = '—';
    }
    tr.append(celdaEnlace);
    return tr;
  }

  function pintarPaginador(estado: EstadoAuditoria): void {
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

  function pintar(estado: EstadoAuditoria): void {
    zonaError.textContent = estado.errorCarga;

    tablaContenedor.textContent = '';
    if (estado.cargando) {
      tablaContenedor.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
      pintarPaginador(estado);
      return;
    }
    if (estado.filas.length === 0) {
      tablaContenedor.append(crearElemento(documento, 'p', { texto: 'No hay ninguna modificación que coincida con este filtro.' }));
      pintarPaginador(estado);
      return;
    }

    const tabla = documento.createElement('table');
    const cabecera = documento.createElement('thead');
    const filaCabecera = documento.createElement('tr');
    for (const texto of ['Fecha y hora del cambio', 'Alumno', 'Profesor', 'Modificado por', 'Registro']) {
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

  contenedor.append(
    titulo,
    zonaError,
    etiquetaDesde,
    campoDesde,
    etiquetaHasta,
    campoHasta,
    etiquetaAutor,
    selectAutor,
    tablaContenedor,
    paginadorEl,
  );

  pintar(almacen.obtener());

  async function iniciar(): Promise<void> {
    const autores = await deps.listarAutoresParaFiltro();
    almacen.actualizar({ autoresDisponibles: autores });
    selectAutor.append(crearElemento(documento, 'option', { texto: 'Todos', atributos: { value: '' } }));
    for (const autor of autores) {
      selectAutor.append(crearElemento(documento, 'option', { texto: autor.nombre, atributos: { value: autor.id } }));
    }
    await cargar(0);
  }

  void iniciar();
}
