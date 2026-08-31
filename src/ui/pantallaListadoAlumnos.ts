/**
 * Listado de alumnos con búsqueda y filtro por estado (T-16, requisito 2, primera de las tres
 * pantallas). Sustituye a la lista con edición en línea que traía `pantallaFichaAlumno.ts` desde
 * T-12: aquí solo se busca y se navega — la ficha completa (datos, personas de referencia, avatar,
 * horario) vive ahora en su propia pantalla de pantalla completa (`pantallaFichaAlumno.ts`,
 * reescrita en esta misma tarea), a la que se llega por `deps.irAFicha`/`deps.irANuevoAlumno` (el
 * router de `aplicacion.ts` decide qué hash corresponde a cada una).
 *
 * Enteramente de `administrator`, igual que la pantalla que sustituye (T-12, requisito 6): un
 * `teacher` ve solo "No tienes acceso a esta pantalla." y no se dispara ninguna petición de datos —
 * la lectura de alumnos por un `teacher` es alcance de T-19/T-22, con otras columnas y otra fuente.
 */

import type { Rol } from '../dominio/tipos.ts';
import { puedeGestionarFichaAlumno } from '../dominio/permisosUi.ts';
import type { AlumnoListado, FiltroEstadoAlumno, OpcionesListarAlumnos, ResultadoListarAlumnos } from '../datos/alumnos.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento } from './dom.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaListadoAlumnos {
  readonly rol: Rol;
  listarAlumnos(opciones: OpcionesListarAlumnos): Promise<ResultadoListarAlumnos>;
  irAFicha(alumnoId: string): void;
  irANuevoAlumno(): void;
}

const POR_PAGINA = 20;

interface EstadoListado {
  readonly cargando: boolean;
  readonly errorCarga: string;
  readonly alumnos: readonly AlumnoListado[];
  readonly totalAproximado: number | null;
  readonly filtroEstado: FiltroEstadoAlumno;
  readonly busqueda: string;
  readonly pagina: number;
}

const ESTADO_INICIAL: EstadoListado = {
  cargando: true,
  errorCarga: '',
  alumnos: [],
  totalAproximado: null,
  filtroEstado: 'activos',
  busqueda: '',
  pagina: 0,
};

export function mostrarPantallaListadoAlumnos(contenedor: HTMLElement, deps: DependenciasPantallaListadoAlumnos): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeGestionarFichaAlumno(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const almacen = crearAlmacenEstado<EstadoListado>(ESTADO_INICIAL);

  const titulo = crearElemento(documento, 'h1', { texto: 'Alumnos' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const listaEl = documento.createElement('div');
  const paginadorEl = documento.createElement('div');

  const campoBusqueda = crearCampoTexto(documento, 'alumnos-busqueda', 'Buscar por nombre o apellidos', 'text', 'off');
  campoBusqueda.input.required = false;

  const botonNuevo = crearBoton(documento, 'Nuevo alumno', 'button');
  botonNuevo.addEventListener('click', () => {
    deps.irANuevoAlumno();
  });

  const selectEstado = documento.createElement('select');
  selectEstado.id = 'alumnos-filtro-estado';
  const etiquetaFiltro = crearElemento(documento, 'label', { texto: 'Estado', atributos: { for: 'alumnos-filtro-estado' } });
  for (const [valor, texto] of [
    ['activos', 'Activos'],
    ['inactivos', 'Inactivos'],
    ['todos', 'Todos'],
  ] as const) {
    const opcion = documento.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    selectEstado.append(opcion);
  }

  async function cargar(): Promise<void> {
    almacen.actualizar({ cargando: true, errorCarga: '' });
    const { filtroEstado, busqueda, pagina } = almacen.obtener();
    try {
      const resultado = await deps.listarAlumnos({ estado: filtroEstado, busqueda, pagina, porPagina: POR_PAGINA });
      almacen.actualizar({ cargando: false, alumnos: resultado.alumnos, totalAproximado: resultado.totalAproximado });
    } catch (error) {
      almacen.actualizar({ cargando: false, errorCarga: mensajeAmigable(error) });
    }
  }

  function pintarFila(alumno: AlumnoListado): HTMLElement {
    const nombreEl = crearElemento(documento, 'span', { texto: nombreCompletoAlumno(alumno) });
    const centroEl = crearElemento(documento, 'span', { texto: alumno.centro.nombre });
    const estadoEl = crearElemento(documento, 'span', { texto: alumno.activo ? 'Activo' : 'Inactivo' });
    const botonVer = crearBoton(documento, 'Ver ficha', 'button');
    botonVer.addEventListener('click', () => {
      deps.irAFicha(alumno.id);
    });
    return crearElemento(documento, 'div', {}, [nombreEl, centroEl, estadoEl, botonVer]);
  }

  function pintarPaginador(estado: EstadoListado): void {
    paginadorEl.textContent = '';
    if (estado.cargando) {
      return;
    }
    const botonAnterior = crearBoton(documento, 'Anterior', 'button');
    botonAnterior.disabled = estado.pagina === 0;
    botonAnterior.addEventListener('click', () => {
      almacen.actualizar({ pagina: estado.pagina - 1 });
      void cargar();
    });
    const totalPaginas = estado.totalAproximado === null ? null : Math.max(1, Math.ceil(estado.totalAproximado / POR_PAGINA));
    const finDePagina = estado.alumnos.length < POR_PAGINA;
    const botonSiguiente = crearBoton(documento, 'Siguiente', 'button');
    botonSiguiente.disabled = totalPaginas === null ? finDePagina : estado.pagina + 1 >= totalPaginas;
    botonSiguiente.addEventListener('click', () => {
      almacen.actualizar({ pagina: estado.pagina + 1 });
      void cargar();
    });
    const indicador = crearElemento(documento, 'span', {
      texto: `Página ${String(estado.pagina + 1)}${totalPaginas === null ? '' : ` de ${String(totalPaginas)}`}`,
    });
    paginadorEl.append(botonAnterior, indicador, botonSiguiente);
  }

  function pintar(estado: EstadoListado): void {
    zonaError.textContent = estado.errorCarga;
    listaEl.textContent = '';

    if (estado.cargando) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
      pintarPaginador(estado);
      return;
    }

    if (estado.alumnos.length === 0) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'No hay ningún alumno que coincida con este filtro.' }));
      pintarPaginador(estado);
      return;
    }

    for (const alumno of estado.alumnos) {
      listaEl.append(pintarFila(alumno));
    }
    pintarPaginador(estado);
  }

  almacen.suscribir(pintar);

  campoBusqueda.input.addEventListener('input', () => {
    almacen.actualizar({ busqueda: campoBusqueda.input.value, pagina: 0 });
    void cargar();
  });
  selectEstado.addEventListener('change', () => {
    almacen.actualizar({ filtroEstado: selectEstado.value as FiltroEstadoAlumno, pagina: 0 });
    void cargar();
  });

  contenedor.append(titulo, botonNuevo, etiquetaFiltro, selectEstado, campoBusqueda.contenedor, zonaError, listaEl, paginadorEl);
  // Pinta el estado de carga de inmediato, antes de que resuelva ninguna promesa.
  pintar(almacen.obtener());
  void cargar();
}
