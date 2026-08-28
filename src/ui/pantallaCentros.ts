/**
 * Pantalla de gestión del catálogo de centros de estudios (T-11, requisito 5): listar con filtro
 * por estado y búsqueda, crear, editar el nombre, desactivar y reactivar. Standalone y testeada por
 * su cuenta con `jsdom`, igual que el resto de pantallas de T-09 — todavía sin enrutar dentro de la
 * aplicación real (`src/ui/aplicacion.ts` solo tiene el marcador de posición del `administrator`
 * hasta T-16, que es quien construye el router y monta esta pantalla dentro de él).
 *
 * La escritura (crear/editar/desactivar/reactivar) solo se ofrece si `puedeGestionarCentros(rol)` —
 * presentación, no control de acceso: el servidor la rechaza igualmente por RLS a un `teacher` que
 * llame a las funciones subyacentes por su cuenta (`permisosUi.ts`, `003_politicas_rls.sql`). Un
 * `teacher` ve solo el listado de centros activos, sin buscador de estado ni acciones.
 */

import type { Rol, CentroEstudios } from '../dominio/tipos.ts';
import { puedeGestionarCentros } from '../dominio/permisosUi.ts';
import type { OpcionesListarCentros, ResultadoGuardarCentro, FiltroEstadoCentro } from '../datos/centrosEstudios.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaCentros {
  readonly rol: Rol;
  listarCentros(opciones: OpcionesListarCentros): Promise<readonly CentroEstudios[]>;
  crearCentro(nombre: string): Promise<ResultadoGuardarCentro>;
  editarNombreCentro(id: string, nombre: string): Promise<ResultadoGuardarCentro>;
  contarAlumnosActivosDeCentro(id: string): Promise<number>;
  desactivarCentro(id: string): Promise<CentroEstudios>;
  reactivarCentro(id: string): Promise<CentroEstudios>;
}

function mensajeDuplicado(existente: CentroEstudios): string {
  return `Ya existe un centro con ese nombre: "${existente.nombre}". No se ha creado ninguno nuevo; usa el existente.`;
}

export function mostrarPantallaCentros(contenedor: HTMLElement, deps: DependenciasPantallaCentros): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;
  const puedeEscribir = puedeGestionarCentros(deps.rol);

  let cargando = true;
  let errorCarga = '';
  let centros: readonly CentroEstudios[] = [];
  let filtroEstado: FiltroEstadoCentro = 'activos';
  let busqueda = '';
  let idEnEdicion: string | null = null;
  let idConfirmandoBaja: string | null = null;
  let alumnosAfectados: number | null = null;

  const titulo = documento.createElement('h1');
  titulo.textContent = 'Centros de estudios';

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');

  const campoBusqueda = crearCampoTexto(documento, 'centros-busqueda', 'Buscar por nombre', 'text', 'off');
  campoBusqueda.input.required = false;

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      centros = await deps.listarCentros({
        estado: puedeEscribir ? filtroEstado : 'activos',
        busqueda,
      });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  function pintarFila(centro: CentroEstudios): HTMLElement {
    const fila = documento.createElement('div');

    if (idEnEdicion === centro.id) {
      const formEdicion = documento.createElement('form');
      const campo = crearCampoTexto(documento, `centro-editar-${centro.id}`, 'Nombre', 'text', 'off');
      campo.input.value = centro.nombre;
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
            const resultado = await deps.editarNombreCentro(centro.id, campo.input.value);
            if (resultado.tipo === 'duplicado') {
              zonaInfo.textContent = mensajeDuplicado(resultado.existente);
              return;
            }
            zonaInfo.textContent = '';
            idEnEdicion = null;
            await cargar();
          } catch (error) {
            errorCarga = mensajeAmigable(error);
            pintar();
          }
        })();
      });
      formEdicion.append(campo.contenedor, botonGuardar, botonCancelar);
      fila.append(formEdicion);
      return fila;
    }

    const nombreEl = documento.createElement('span');
    nombreEl.textContent = centro.nombre;
    const estadoEl = documento.createElement('span');
    estadoEl.textContent = centro.activo ? 'Activo' : 'Inactivo';
    fila.append(nombreEl, estadoEl);

    if (!puedeEscribir) {
      return fila;
    }

    const botonEditar = crearBoton(documento, 'Editar', 'button');
    botonEditar.addEventListener('click', () => {
      idEnEdicion = centro.id;
      pintar();
    });
    fila.append(botonEditar);

    if (idConfirmandoBaja === centro.id) {
      const avisoEl = documento.createElement('span');
      avisoEl.setAttribute('role', 'status');
      avisoEl.textContent =
        alumnosAfectados === null
          ? 'Calculando cuántos alumnos se ven afectados…'
          : `${String(alumnosAfectados)} alumno(s) activo(s) siguen apuntando a este centro y seguirán siendo válidos; el centro quedará inactivo. ¿Confirmas?`;
      const botonConfirmar = crearBoton(documento, 'Confirmar baja', 'button');
      botonConfirmar.disabled = alumnosAfectados === null;
      botonConfirmar.addEventListener('click', () => {
        void (async () => {
          try {
            await deps.desactivarCentro(centro.id);
            idConfirmandoBaja = null;
            alumnosAfectados = null;
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
        alumnosAfectados = null;
        pintar();
      });
      fila.append(avisoEl, botonConfirmar, botonCancelarBaja);
      return fila;
    }

    if (centro.activo) {
      const botonDesactivar = crearBoton(documento, 'Desactivar', 'button');
      botonDesactivar.addEventListener('click', () => {
        idConfirmandoBaja = centro.id;
        alumnosAfectados = null;
        pintar();
        void (async () => {
          try {
            const total = await deps.contarAlumnosActivosDeCentro(centro.id);
            alumnosAfectados = total;
            pintar();
          } catch (error) {
            errorCarga = mensajeAmigable(error);
            idConfirmandoBaja = null;
            pintar();
          }
        })();
      });
      fila.append(botonDesactivar);
    } else {
      const botonReactivar = crearBoton(documento, 'Reactivar', 'button');
      botonReactivar.addEventListener('click', () => {
        void (async () => {
          try {
            await deps.reactivarCentro(centro.id);
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

  function pintar(): void {
    zonaError.textContent = errorCarga;
    listaEl.textContent = '';

    if (cargando) {
      const cargandoEl = documento.createElement('p');
      cargandoEl.textContent = 'Cargando…';
      listaEl.append(cargandoEl);
      return;
    }

    if (centros.length === 0) {
      const vacioEl = documento.createElement('p');
      vacioEl.textContent = 'No hay ningún centro de estudios que coincida con este filtro.';
      listaEl.append(vacioEl);
      return;
    }

    for (const centro of centros) {
      listaEl.append(pintarFila(centro));
    }
  }

  campoBusqueda.input.addEventListener('input', () => {
    busqueda = campoBusqueda.input.value;
    void cargar();
  });

  contenedor.append(titulo);

  if (puedeEscribir) {
    const selectEstado = documento.createElement('select');
    selectEstado.id = 'centros-filtro-estado';
    const etiquetaFiltro = documento.createElement('label');
    etiquetaFiltro.setAttribute('for', 'centros-filtro-estado');
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
      filtroEstado = selectEstado.value as FiltroEstadoCentro;
      void cargar();
    });
    contenedor.append(etiquetaFiltro, selectEstado);

    const formularioAlta = documento.createElement('form');
    const campoNuevoNombre = crearCampoTexto(documento, 'centros-nuevo-nombre', 'Nombre del nuevo centro', 'text', 'off');
    const botonCrear = crearBoton(documento, 'Crear centro');
    formularioAlta.addEventListener('submit', (evento) => {
      evento.preventDefault();
      void (async () => {
        try {
          const resultado = await deps.crearCentro(campoNuevoNombre.input.value);
          if (resultado.tipo === 'duplicado') {
            zonaInfo.textContent = mensajeDuplicado(resultado.existente);
            return;
          }
          zonaInfo.textContent = '';
          campoNuevoNombre.input.value = '';
          await cargar();
        } catch (error) {
          errorCarga = mensajeAmigable(error);
          pintar();
        }
      })();
    });
    formularioAlta.append(campoNuevoNombre.contenedor, botonCrear);
    contenedor.append(formularioAlta);
  }

  contenedor.append(campoBusqueda.contenedor, zonaInfo, zonaError, listaEl);

  void cargar();
}
