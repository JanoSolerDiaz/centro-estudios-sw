/**
 * Pantalla de gestión de la ficha de alumno (T-12, requisito 1: listar con filtro y búsqueda
 * paginada en servidor, obtener, crear, editar, dar de baja y reactivar). Standalone y testeada por
 * su cuenta con `jsdom`, igual que `pantallaCentros.ts` de T-11 — todavía sin enrutar dentro de la
 * aplicación real (`src/ui/aplicacion.ts` sigue con el marcador de posición hasta T-16).
 *
 * Solo `administrator` (requisito 6 de T-12): un `teacher` nunca ve esta pantalla, ni siquiera en
 * modo lectura — a diferencia de T-11, donde el `teacher` sí tenía un listado de solo lectura. La
 * lectura de alumnos por un `teacher` vive en otras pantallas (T-19/T-22), con otras columnas
 * (`permisosUi.columnasVisiblesFichaAlumno`) y otra fuente de datos (la tabla base, no
 * `alumno_ficha`). `puedeGestionarFichaAlumno` decide aquí solo si se pinta la pantalla o un aviso
 * de acceso: es presentación, no control — el servidor rechaza igual cualquier escritura de un rol
 * sin permiso (`003_politicas_rls.sql`).
 */

import type { Rol, CentroEstudios } from '../dominio/tipos.ts';
import { puedeGestionarFichaAlumno } from '../dominio/permisosUi.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import type {
  AlumnoConCentro,
  DatosAlumno,
  FiltroEstadoAlumno,
  OpcionesListarAlumnos,
  ResultadoListarAlumnos,
} from '../datos/alumnos.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaFichaAlumno {
  readonly rol: Rol;
  listarAlumnos(opciones: OpcionesListarAlumnos): Promise<ResultadoListarAlumnos>;
  listarCentrosParaSelector(): Promise<readonly CentroEstudios[]>;
  crearAlumno(datos: DatosAlumno): Promise<AlumnoConCentro>;
  editarAlumno(id: string, datos: DatosAlumno): Promise<AlumnoConCentro>;
  darDeBajaAlumno(id: string, motivo?: string): Promise<AlumnoConCentro>;
  reactivarAlumno(id: string): Promise<AlumnoConCentro>;
}

const POR_PAGINA = 20;

interface CamposFormularioAlumno {
  readonly nombre: HTMLInputElement;
  readonly primerApellido: HTMLInputElement;
  readonly segundoApellido: HTMLInputElement;
  readonly centro: HTMLSelectElement;
  readonly email: HTMLInputElement;
  readonly telefono: HTMLInputElement;
}

function leerFormulario(campos: CamposFormularioAlumno): DatosAlumno {
  return {
    nombre: campos.nombre.value,
    primer_apellido: campos.primerApellido.value,
    segundo_apellido: campos.segundoApellido.value,
    centro_referencia_id: campos.centro.value,
    email_alumno: campos.email.value,
    telefono_alumno: campos.telefono.value,
  };
}

function limpiarFormulario(campos: CamposFormularioAlumno): void {
  campos.nombre.value = '';
  campos.primerApellido.value = '';
  campos.segundoApellido.value = '';
  campos.email.value = '';
  campos.telefono.value = '';
}

function rellenarFormulario(campos: CamposFormularioAlumno, alumno: AlumnoConCentro): void {
  campos.nombre.value = alumno.nombre;
  campos.primerApellido.value = alumno.primer_apellido;
  campos.segundoApellido.value = alumno.segundo_apellido ?? '';
  campos.centro.value = alumno.centro_referencia_id;
  campos.email.value = alumno.email_alumno ?? '';
  campos.telefono.value = alumno.telefono_alumno ?? '';
}

function crearSelectorCentro(documento: Document, id: string, centros: readonly CentroEstudios[]): HTMLSelectElement {
  const select = documento.createElement('select');
  select.id = id;
  select.required = true;
  for (const centro of centros) {
    const opcion = documento.createElement('option');
    opcion.value = centro.id;
    opcion.textContent = centro.activo ? centro.nombre : `${centro.nombre} (inactivo)`;
    select.append(opcion);
  }
  return select;
}

function crearCampoFormulario(
  documento: Document,
  contenedor: HTMLElement,
  campos: CamposFormularioAlumno,
  prefijo: string,
  centros: readonly CentroEstudios[],
): void {
  const nombreCampo = crearCampoTexto(documento, `${prefijo}-nombre`, 'Nombre', 'text', 'off');
  const primerApellidoCampo = crearCampoTexto(documento, `${prefijo}-primer-apellido`, 'Primer apellido', 'text', 'off');
  const segundoApellidoCampo = crearCampoTexto(documento, `${prefijo}-segundo-apellido`, 'Segundo apellido (opcional)', 'text', 'off');
  segundoApellidoCampo.input.required = false;
  const emailCampo = crearCampoTexto(documento, `${prefijo}-email`, 'Email (opcional)', 'email', 'off');
  emailCampo.input.required = false;
  const telefonoCampo = crearCampoTexto(documento, `${prefijo}-telefono`, 'Teléfono (opcional)', 'text', 'off');
  telefonoCampo.input.required = false;

  const etiquetaCentro = documento.createElement('label');
  etiquetaCentro.setAttribute('for', `${prefijo}-centro`);
  etiquetaCentro.textContent = 'Centro de referencia';
  const selectCentro = crearSelectorCentro(documento, `${prefijo}-centro`, centros);

  Object.assign(campos, {
    nombre: nombreCampo.input,
    primerApellido: primerApellidoCampo.input,
    segundoApellido: segundoApellidoCampo.input,
    centro: selectCentro,
    email: emailCampo.input,
    telefono: telefonoCampo.input,
  });

  contenedor.append(
    nombreCampo.contenedor,
    primerApellidoCampo.contenedor,
    segundoApellidoCampo.contenedor,
    etiquetaCentro,
    selectCentro,
    emailCampo.contenedor,
    telefonoCampo.contenedor,
  );
}

export function mostrarPantallaFichaAlumno(contenedor: HTMLElement, deps: DependenciasPantallaFichaAlumno): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeGestionarFichaAlumno(deps.rol)) {
    const aviso = documento.createElement('p');
    aviso.textContent = 'No tienes acceso a esta pantalla.';
    contenedor.append(aviso);
    return;
  }

  let cargando = true;
  let errorCarga = '';
  let alumnos: readonly AlumnoConCentro[] = [];
  let totalAproximado: number | null = null;
  let centros: readonly CentroEstudios[] = [];
  let filtroEstado: FiltroEstadoAlumno = 'activos';
  let busqueda = '';
  let pagina = 0;
  let idEnEdicion: string | null = null;
  let idConfirmandoBaja: string | null = null;

  const titulo = documento.createElement('h1');
  titulo.textContent = 'Ficha de alumno';

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');
  const paginadorEl = documento.createElement('div');

  const campoBusqueda = crearCampoTexto(documento, 'alumnos-busqueda', 'Buscar por nombre o apellidos', 'text', 'off');
  campoBusqueda.input.required = false;

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      const resultado = await deps.listarAlumnos({ estado: filtroEstado, busqueda, pagina, porPagina: POR_PAGINA });
      alumnos = resultado.alumnos;
      totalAproximado = resultado.totalAproximado;
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  function pintarFila(alumno: AlumnoConCentro): HTMLElement {
    const fila = documento.createElement('div');

    if (idEnEdicion === alumno.id) {
      const formEdicion = documento.createElement('form');
      const campos = {} as CamposFormularioAlumno;
      crearCampoFormulario(documento, formEdicion, campos, `alumno-editar-${alumno.id}`, centros);
      rellenarFormulario(campos, alumno);
      const botonGuardar = crearBoton(documento, 'Guardar');
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.addEventListener('click', () => {
        idEnEdicion = null;
        pintar();
      });
      formEdicion.addEventListener('submit', (evento) => {
        evento.preventDefault();
        void (async () => {
          try {
            await deps.editarAlumno(alumno.id, leerFormulario(campos));
            zonaInfo.textContent = '';
            idEnEdicion = null;
            await cargar();
          } catch (error) {
            errorCarga = mensajeAmigable(error);
            pintar();
          }
        })();
      });
      formEdicion.append(botonGuardar, botonCancelar);
      fila.append(formEdicion);
      return fila;
    }

    const nombreEl = documento.createElement('span');
    nombreEl.textContent = nombreCompletoAlumno(alumno);
    const centroEl = documento.createElement('span');
    centroEl.textContent = alumno.centro.nombre;
    const estadoEl = documento.createElement('span');
    estadoEl.textContent = alumno.activo ? 'Activo' : 'Inactivo';
    fila.append(nombreEl, centroEl, estadoEl);

    const botonEditar = crearBoton(documento, 'Editar', 'button');
    botonEditar.addEventListener('click', () => {
      idEnEdicion = alumno.id;
      pintar();
    });
    fila.append(botonEditar);

    if (idConfirmandoBaja === alumno.id) {
      const campoMotivo = crearCampoTexto(documento, `alumno-motivo-baja-${alumno.id}`, 'Motivo (opcional)', 'text', 'off');
      campoMotivo.input.required = false;
      const botonConfirmar = crearBoton(documento, 'Confirmar baja', 'button');
      botonConfirmar.addEventListener('click', () => {
        void (async () => {
          try {
            await deps.darDeBajaAlumno(alumno.id, campoMotivo.input.value);
            idConfirmandoBaja = null;
            await cargar();
          } catch (error) {
            errorCarga = mensajeAmigable(error);
            pintar();
          }
        })();
      });
      const botonCancelarBaja = crearBoton(documento, 'Cancelar', 'button');
      botonCancelarBaja.addEventListener('click', () => {
        idConfirmandoBaja = null;
        pintar();
      });
      fila.append(campoMotivo.contenedor, botonConfirmar, botonCancelarBaja);
      return fila;
    }

    if (alumno.activo) {
      const botonDarDeBaja = crearBoton(documento, 'Dar de baja', 'button');
      botonDarDeBaja.addEventListener('click', () => {
        idConfirmandoBaja = alumno.id;
        pintar();
      });
      fila.append(botonDarDeBaja);
    } else {
      const botonReactivar = crearBoton(documento, 'Reactivar', 'button');
      botonReactivar.addEventListener('click', () => {
        void (async () => {
          try {
            await deps.reactivarAlumno(alumno.id);
            await cargar();
          } catch (error) {
            errorCarga = mensajeAmigable(error);
            pintar();
          }
        })();
      });
      fila.append(botonReactivar);
    }

    return fila;
  }

  function pintarPaginador(): void {
    paginadorEl.textContent = '';
    if (cargando) {
      return;
    }
    const botonAnterior = crearBoton(documento, 'Anterior', 'button');
    botonAnterior.disabled = pagina === 0;
    botonAnterior.addEventListener('click', () => {
      pagina -= 1;
      void cargar();
    });
    const totalPaginas = totalAproximado === null ? null : Math.max(1, Math.ceil(totalAproximado / POR_PAGINA));
    const finDePagina = alumnos.length < POR_PAGINA;
    const botonSiguiente = crearBoton(documento, 'Siguiente', 'button');
    botonSiguiente.disabled = totalPaginas === null ? finDePagina : pagina + 1 >= totalPaginas;
    botonSiguiente.addEventListener('click', () => {
      pagina += 1;
      void cargar();
    });
    const indicador = documento.createElement('span');
    indicador.textContent = `Página ${String(pagina + 1)}${totalPaginas === null ? '' : ` de ${String(totalPaginas)}`}`;
    paginadorEl.append(botonAnterior, indicador, botonSiguiente);
  }

  function pintar(): void {
    zonaError.textContent = errorCarga;
    listaEl.textContent = '';

    if (cargando) {
      const cargandoEl = documento.createElement('p');
      cargandoEl.textContent = 'Cargando…';
      listaEl.append(cargandoEl);
      pintarPaginador();
      return;
    }

    if (alumnos.length === 0) {
      const vacioEl = documento.createElement('p');
      vacioEl.textContent = 'No hay ningún alumno que coincida con este filtro.';
      listaEl.append(vacioEl);
      pintarPaginador();
      return;
    }

    for (const alumno of alumnos) {
      listaEl.append(pintarFila(alumno));
    }
    pintarPaginador();
  }

  campoBusqueda.input.addEventListener('input', () => {
    busqueda = campoBusqueda.input.value;
    pagina = 0;
    void cargar();
  });

  const selectEstado = documento.createElement('select');
  selectEstado.id = 'alumnos-filtro-estado';
  const etiquetaFiltro = documento.createElement('label');
  etiquetaFiltro.setAttribute('for', 'alumnos-filtro-estado');
  etiquetaFiltro.textContent = 'Estado';
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
  selectEstado.addEventListener('change', () => {
    filtroEstado = selectEstado.value as FiltroEstadoAlumno;
    pagina = 0;
    void cargar();
  });

  const formularioAlta = documento.createElement('form');
  const camposAlta = {} as CamposFormularioAlumno;

  formularioAlta.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void (async () => {
      try {
        await deps.crearAlumno(leerFormulario(camposAlta));
        zonaInfo.textContent = '';
        limpiarFormulario(camposAlta);
        pagina = 0;
        await cargar();
      } catch (error) {
        errorCarga = mensajeAmigable(error);
        pintar();
      }
    })();
  });

  contenedor.append(
    titulo,
    etiquetaFiltro,
    selectEstado,
    campoBusqueda.contenedor,
    zonaInfo,
    zonaError,
    formularioAlta,
    listaEl,
    paginadorEl,
  );
  // Pinta el estado de carga de inmediato, antes de que resuelva ninguna promesa: quien monta la
  // pantalla ve "Cargando…" en el mismo turno de síncrono, no solo tras el primer `await`.
  pintar();

  async function cargarCentrosYPintar(): Promise<void> {
    try {
      centros = await deps.listarCentrosParaSelector();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    }
    crearCampoFormulario(documento, formularioAlta, camposAlta, 'alumno-nuevo', centros);
    const botonCrear = crearBoton(documento, 'Crear alumno');
    formularioAlta.append(botonCrear);
    await cargar();
  }

  void cargarCentrosYPintar();
}
