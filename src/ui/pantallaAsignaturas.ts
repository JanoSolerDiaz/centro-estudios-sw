/**
 * Pantalla de gestión del catálogo de asignaturas/grupos (R-33, requisito 2): listar con filtro por
 * estado, crear, renombrar, desactivar y reactivar. Standalone y testeada por su cuenta con
 * `jsdom`, mismo patrón que `pantallaCierresCentro.ts` (R-12) — más simple que `pantallaCentros.ts`
 * (T-11): sin ninguna relación de clave foránea con `slot_horario`, desactivar una asignatura no
 * afecta a ningún slot existente, así que no hace falta ningún aviso de "cuántos... se ven
 * afectados" antes de confirmar la baja.
 *
 * La escritura (crear/editar/desactivar/reactivar) solo se ofrece si `puedeGestionarAsignaturas(rol)`
 * — presentación, no control de acceso: el servidor la rechaza igualmente por RLS a un `teacher` que
 * llame a las funciones subyacentes por su cuenta (`permisosUi.ts`, `db/020_catalogo_asignaturas.sql`).
 * Un `teacher` ve solo el listado de asignaturas activas, sin selector de estado ni ninguna acción.
 */

import type { Rol, Asignatura } from '../dominio/tipos.ts';
import { puedeGestionarAsignaturas } from '../dominio/permisosUi.ts';
import type { OpcionesListarAsignaturas, ResultadoGuardarAsignatura, FiltroEstadoAsignatura } from '../datos/asignaturas.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { crearElemento } from './dom.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaAsignaturas {
  readonly rol: Rol;
  listarAsignaturas(opciones: OpcionesListarAsignaturas): Promise<readonly Asignatura[]>;
  crearAsignatura(nombre: string): Promise<ResultadoGuardarAsignatura>;
  editarNombreAsignatura(id: string, nombre: string): Promise<ResultadoGuardarAsignatura>;
  desactivarAsignatura(id: string): Promise<Asignatura>;
  reactivarAsignatura(id: string): Promise<Asignatura>;
}

function mensajeDuplicado(existente: Asignatura): string {
  return `Ya existe una asignatura con ese nombre: "${existente.nombre}". No se ha creado ninguna nueva; usa la existente.`;
}

export function mostrarPantallaAsignaturas(contenedor: HTMLElement, deps: DependenciasPantallaAsignaturas): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;
  const puedeEscribir = puedeGestionarAsignaturas(deps.rol);

  let cargando = true;
  let errorCarga = '';
  let asignaturas: readonly Asignatura[] = [];
  let filtroEstado: FiltroEstadoAsignatura = 'activos';
  let idEnEdicion: string | null = null;

  const titulo = crearElemento(documento, 'h1', { texto: 'Asignaturas y grupos' });

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      asignaturas = await deps.listarAsignaturas({ estado: puedeEscribir ? filtroEstado : 'activos' });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  function pintarFila(asignatura: Asignatura): HTMLElement {
    const fila = documento.createElement('div');

    if (idEnEdicion === asignatura.id) {
      const formEdicion = documento.createElement('form');
      const campo = crearCampoTexto(documento, `asignatura-editar-${asignatura.id}`, 'Nombre', 'text', 'off');
      campo.input.value = asignatura.nombre;
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
            const resultado = await deps.editarNombreAsignatura(asignatura.id, campo.input.value);
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
    nombreEl.textContent = asignatura.nombre;
    const estadoEl = documento.createElement('span');
    estadoEl.textContent = asignatura.activo ? 'Activa' : 'Inactiva';
    fila.append(nombreEl, estadoEl);

    if (!puedeEscribir) {
      return fila;
    }

    const botonEditar = crearBoton(documento, 'Editar', 'button');
    botonEditar.addEventListener('click', () => {
      idEnEdicion = asignatura.id;
      pintar();
    });
    fila.append(botonEditar);

    if (asignatura.activo) {
      const botonDesactivar = crearBoton(documento, 'Desactivar', 'button');
      botonDesactivar.addEventListener('click', () => {
        void (async () => {
          try {
            await deps.desactivarAsignatura(asignatura.id);
            await cargar();
          } catch (error) {
            errorCarga = mensajeAmigable(error);
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
            await deps.reactivarAsignatura(asignatura.id);
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
      listaEl.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
      return;
    }

    if (asignaturas.length === 0) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'No hay ninguna asignatura que coincida con este filtro.' }));
      return;
    }

    for (const asignatura of asignaturas) {
      listaEl.append(pintarFila(asignatura));
    }
  }

  contenedor.append(titulo);

  if (puedeEscribir) {
    const selectEstado = documento.createElement('select');
    selectEstado.id = 'asignaturas-filtro-estado';
    const etiquetaFiltro = crearElemento(documento, 'label', { texto: 'Estado', atributos: { for: 'asignaturas-filtro-estado' } });
    for (const [valor, texto] of [
      ['activos', 'Activas'],
      ['inactivos', 'Inactivas'],
      ['todos', 'Todas'],
    ] as const) {
      const opcion = crearElemento(documento, 'option', { texto, atributos: { value: valor } });
      selectEstado.append(opcion);
    }
    selectEstado.addEventListener('change', () => {
      filtroEstado = selectEstado.value as FiltroEstadoAsignatura;
      void cargar();
    });
    contenedor.append(etiquetaFiltro, selectEstado);

    const formularioAlta = documento.createElement('form');
    const campoNuevoNombre = crearCampoTexto(documento, 'asignaturas-nuevo-nombre', 'Nombre de la nueva asignatura', 'text', 'off');
    const botonCrear = crearBoton(documento, 'Crear asignatura');
    formularioAlta.addEventListener('submit', (evento) => {
      evento.preventDefault();
      void (async () => {
        try {
          const resultado = await deps.crearAsignatura(campoNuevoNombre.input.value);
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

  contenedor.append(zonaInfo, zonaError, listaEl);

  void cargar();
}
