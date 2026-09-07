/**
 * Pantalla de gestión del calendario de cierres del centro (R-12, requisito 8): listar con filtro
 * por estado, crear, editar, desactivar y reactivar. Standalone y testeada por su cuenta con
 * `jsdom`, mismo patrón que `pantallaCentros.ts` (T-11).
 *
 * La escritura (crear/editar/desactivar/reactivar) solo se ofrece si `puedeGestionarCierresCentro(rol)`
 * — presentación, no control de acceso: el servidor la rechaza igualmente por RLS a un `teacher` que
 * llame a las funciones subyacentes por su cuenta (`permisosUi.ts`, `db/014_calendario_cierres.sql`).
 * Un `teacher` ve solo el listado de cierres activos (requisito 7 de R-12: "solo lectura"), sin
 * selector de estado ni ninguna acción.
 */

import type { Rol, CierreCentro } from '../dominio/tipos.ts';
import { puedeGestionarCierresCentro } from '../dominio/permisosUi.ts';
import type { OpcionesListarCierres, ResultadoGuardarCierre, FiltroEstadoCierre } from '../datos/cierresCentro.ts';
import { crearZonaMensaje, crearBoton } from './formularios.ts';
import { crearElemento } from './dom.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaCierresCentro {
  readonly rol: Rol;
  listarCierres(opciones: OpcionesListarCierres): Promise<readonly CierreCentro[]>;
  /** Las cuatro siguientes solo se llaman si `puedeGestionarCierresCentro(rol)` — opcionales
   * porque un `teacher` (que nunca las ve ni las invoca) no tiene por qué proveerlas, mismo
   * criterio que `resolverContactoAlumnos` en `pantallaHistorico.ts`. */
  crearCierre?(fechaInicio: string, fechaFin: string, motivo: string): Promise<ResultadoGuardarCierre>;
  editarCierre?(id: string, fechaInicio: string, fechaFin: string, motivo: string): Promise<ResultadoGuardarCierre>;
  desactivarCierre?(id: string): Promise<CierreCentro>;
  reactivarCierre?(id: string): Promise<ResultadoGuardarCierre>;
}

/** Las cuatro operaciones de escritura son opcionales en `DependenciasPantallaCierresCentro` (un
 * `teacher` nunca las provee), pero todo punto de llamada ya está gateado por `puedeEscribir` —
 * este rechazo nunca debería alcanzarse en la práctica; existe solo para que un fallo de cableado
 * futuro se vea como un mensaje de error amigable, no como una excepción sin capturar. */
function noDisponible<T>(): Promise<T> {
  return Promise.reject(new Error('Esta operación no está disponible para tu rol.'));
}

function mensajeSolapado(existente: CierreCentro): string {
  return `El periodo se pisa con un cierre ya activo: "${existente.motivo}" (${existente.fecha_inicio} a ${existente.fecha_fin}). No se ha guardado ningún cambio.`;
}

function crearCampoFecha(documento: Document, id: string, etiquetaTexto: string): { contenedor: HTMLDivElement; input: HTMLInputElement } {
  const contenedor = documento.createElement('div');
  const etiqueta = crearElemento(documento, 'label', { texto: etiquetaTexto, atributos: { for: id } });
  const input = documento.createElement('input');
  input.type = 'date';
  input.id = id;
  input.required = true;
  contenedor.append(etiqueta, input);
  return { contenedor, input };
}

export function mostrarPantallaCierresCentro(contenedor: HTMLElement, deps: DependenciasPantallaCierresCentro): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;
  const puedeEscribir = puedeGestionarCierresCentro(deps.rol);

  let cargando = true;
  let errorCarga = '';
  let cierres: readonly CierreCentro[] = [];
  let filtroEstado: FiltroEstadoCierre = 'activos';
  let idEnEdicion: string | null = null;

  const titulo = crearElemento(documento, 'h1', { texto: 'Cierres del centro' });

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      cierres = await deps.listarCierres({ estado: puedeEscribir ? filtroEstado : 'activos' });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  function pintarFila(cierre: CierreCentro): HTMLElement {
    const fila = documento.createElement('div');

    if (idEnEdicion === cierre.id) {
      const formEdicion = documento.createElement('form');
      const campoInicio = crearCampoFecha(documento, `cierre-editar-inicio-${cierre.id}`, 'Fecha de inicio');
      campoInicio.input.value = cierre.fecha_inicio;
      const campoFin = crearCampoFecha(documento, `cierre-editar-fin-${cierre.id}`, 'Fecha de fin');
      campoFin.input.value = cierre.fecha_fin;
      const campoMotivo = crearElemento(documento, 'input', {
        atributos: { id: `cierre-editar-motivo-${cierre.id}`, type: 'text', required: '' },
      });
      campoMotivo.value = cierre.motivo;
      const etiquetaMotivo = crearElemento(documento, 'label', {
        texto: 'Motivo',
        atributos: { for: `cierre-editar-motivo-${cierre.id}` },
      });
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
            const resultado = await (deps.editarCierre?.(cierre.id, campoInicio.input.value, campoFin.input.value, campoMotivo.value) ?? noDisponible());
            if (resultado.tipo === 'solapado') {
              zonaInfo.textContent = mensajeSolapado(resultado.existente);
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
      formEdicion.append(campoInicio.contenedor, campoFin.contenedor, etiquetaMotivo, campoMotivo, botonGuardar, botonCancelar);
      fila.append(formEdicion);
      return fila;
    }

    const rangoEl = documento.createElement('span');
    rangoEl.textContent = cierre.fecha_inicio === cierre.fecha_fin ? cierre.fecha_inicio : `${cierre.fecha_inicio} a ${cierre.fecha_fin}`;
    const motivoEl = documento.createElement('span');
    motivoEl.textContent = cierre.motivo;
    const estadoEl = documento.createElement('span');
    estadoEl.textContent = cierre.activo ? 'Activo' : 'Inactivo';
    fila.append(rangoEl, motivoEl, estadoEl);

    if (!puedeEscribir) {
      return fila;
    }

    const botonEditar = crearBoton(documento, 'Editar', 'button');
    botonEditar.addEventListener('click', () => {
      idEnEdicion = cierre.id;
      pintar();
    });
    fila.append(botonEditar);

    if (cierre.activo) {
      const botonDesactivar = crearBoton(documento, 'Desactivar', 'button');
      botonDesactivar.addEventListener('click', () => {
        void (async () => {
          try {
            await (deps.desactivarCierre?.(cierre.id) ?? noDisponible());
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
            const resultado = await (deps.reactivarCierre?.(cierre.id) ?? noDisponible());
            if (resultado.tipo === 'solapado') {
              zonaInfo.textContent = mensajeSolapado(resultado.existente);
              return;
            }
            zonaInfo.textContent = '';
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

    if (cierres.length === 0) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'No hay ningún cierre que coincida con este filtro.' }));
      return;
    }

    for (const cierre of cierres) {
      listaEl.append(pintarFila(cierre));
    }
  }

  contenedor.append(titulo);

  if (puedeEscribir) {
    const selectEstado = documento.createElement('select');
    selectEstado.id = 'cierres-filtro-estado';
    const etiquetaFiltro = crearElemento(documento, 'label', { texto: 'Estado', atributos: { for: 'cierres-filtro-estado' } });
    for (const [valor, texto] of [
      ['activos', 'Activos'],
      ['inactivos', 'Inactivos'],
      ['todos', 'Todos'],
    ] as const) {
      const opcion = crearElemento(documento, 'option', { texto, atributos: { value: valor } });
      selectEstado.append(opcion);
    }
    selectEstado.addEventListener('change', () => {
      filtroEstado = selectEstado.value as FiltroEstadoCierre;
      void cargar();
    });
    contenedor.append(etiquetaFiltro, selectEstado);

    const formularioAlta = documento.createElement('form');
    const campoNuevoInicio = crearCampoFecha(documento, 'cierres-nuevo-inicio', 'Fecha de inicio');
    const campoNuevoFin = crearCampoFecha(documento, 'cierres-nuevo-fin', 'Fecha de fin');
    const campoNuevoMotivo = crearElemento(documento, 'input', {
      atributos: { id: 'cierres-nuevo-motivo', type: 'text', required: '' },
    });
    const etiquetaNuevoMotivo = crearElemento(documento, 'label', { texto: 'Motivo', atributos: { for: 'cierres-nuevo-motivo' } });
    const botonCrear = crearBoton(documento, 'Crear cierre');
    formularioAlta.addEventListener('submit', (evento) => {
      evento.preventDefault();
      void (async () => {
        try {
          const resultado = await (deps.crearCierre?.(campoNuevoInicio.input.value, campoNuevoFin.input.value, campoNuevoMotivo.value) ?? noDisponible());
          if (resultado.tipo === 'solapado') {
            zonaInfo.textContent = mensajeSolapado(resultado.existente);
            return;
          }
          zonaInfo.textContent = '';
          campoNuevoInicio.input.value = '';
          campoNuevoFin.input.value = '';
          campoNuevoMotivo.value = '';
          await cargar();
        } catch (error) {
          errorCarga = mensajeAmigable(error);
          pintar();
        }
      })();
    });
    formularioAlta.append(
      campoNuevoInicio.contenedor,
      campoNuevoFin.contenedor,
      etiquetaNuevoMotivo,
      campoNuevoMotivo,
      botonCrear,
    );
    contenedor.append(formularioAlta);
  }

  contenedor.append(zonaInfo, zonaError, listaEl);

  void cargar();
}
