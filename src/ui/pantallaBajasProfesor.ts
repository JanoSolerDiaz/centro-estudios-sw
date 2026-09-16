/**
 * Pantalla de baja programada de un profesor (R-22): declarar una baja de varios días sobre TODOS los
 * slots de un profesor (sustitución o cancelación), con vista previa obligatoria (requisito 3, mismo
 * patrón que la importación masiva de R-08) antes de confirmar, y listar/cancelar/acortar las bajas ya
 * declaradas (requisito 5). Exclusiva de `administrator` (`puedeGestionarBajasProfesor`) — presentación,
 * no control de acceso real: el servidor la rechaza igualmente por RLS/RPC a un `teacher` que llame por
 * su cuenta (`db/018_baja_profesor.sql`).
 *
 * Standalone, alcanzable desde `#/bajas-profesor[/<profesorId>]` (`nucleo/router.ts`) — el segmento de
 * profesor es el enlace directo que ofrece `pantallaUsuarios.ts` (T-24) sobre la fila de un `teacher`
 * concreto (requisito 1: "desde la gestión de profesores"); sin él, arranca pidiendo elegir uno.
 *
 * La vista previa (`combinacionesBajaProfesor`, dominio) se invalida en cuanto cambia cualquier campo
 * del formulario: `confirmar` solo se ofrece mientras la vista previa siga vigente para los valores
 * actuales, nunca sobre una vista previa de otro rango o de otro tratamiento.
 */

import type { Rol, SlotHorario, Asistencia, ExcepcionSlot, BajaProfesor, TipoExcepcionSlot } from '../dominio/tipos.ts';
import { ETIQUETA_DIA_SEMANA } from '../dominio/tipos.ts';
import { puedeGestionarBajasProfesor } from '../dominio/permisosUi.ts';
import {
  rangoBajaValido,
  claveCombinacionBaja,
  combinacionesBajaProfesor,
  puedeCancelarBaja,
  puedeAcortarBaja,
  categoriaBaja,
  type CombinacionBajaProfesor,
} from '../dominio/bajaProfesor.ts';
import { motivoCancelacionValido } from '../dominio/excepcionSlot.ts';
import { fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';
import type { DeclararBajaProfesorEntrada, FilaResultadoBajaProfesor } from '../datos/bajasProfesor.ts';
import { crearElemento } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaBajasProfesor {
  readonly rol: Rol;
  readonly reloj: Reloj;
  readonly zonaHoraria?: string;
  /** Preselecciona el profesor titular — enlace desde `pantallaUsuarios.ts` sobre una fila concreta. */
  readonly profesorIdInicial?: string;
  listarProfesoresActivos(): Promise<readonly ProfesorParaSelector[]>;
  listarSlotsDeProfesor(profesorId: string): Promise<readonly SlotHorario[]>;
  listarRegistrosEnRango(slotIds: readonly string[], desde: Date, hasta: Date): Promise<readonly Asistencia[]>;
  listarExcepcionesActivasEnRango(slotIds: readonly string[], desde: string, hasta: string): Promise<readonly ExcepcionSlot[]>;
  declararBaja(entrada: DeclararBajaProfesorEntrada): Promise<readonly FilaResultadoBajaProfesor[]>;
  listarBajasDeProfesor(profesorId: string): Promise<readonly BajaProfesor[]>;
  cancelarBaja(bajaId: string, motivo: string): Promise<BajaProfesor>;
  acortarBaja(bajaId: string, nuevaFechaFin: string): Promise<BajaProfesor>;
  listarExcepcionesDeBaja(bajaId: string): Promise<readonly ExcepcionSlot[]>;
}

interface SnapshotFormulario {
  readonly profesorId: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly tipo: TipoExcepcionSlot;
  readonly sustitutoId: string | null;
  readonly motivo: string | null;
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

const ETIQUETA_CATEGORIA_BAJA: Readonly<Record<ReturnType<typeof categoriaBaja>, string>> = {
  anulada: 'Anulada',
  pasada: 'Pasada',
  en_curso: 'En curso',
  futura: 'Futura',
};

export function mostrarPantallaBajasProfesor(contenedor: HTMLElement, deps: DependenciasPantallaBajasProfesor): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeGestionarBajasProfesor(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const zonaHoraria = deps.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const hoy = fechaLocalISO(deps.reloj.ahora(), zonaHoraria);

  let profesores: readonly ProfesorParaSelector[] = [];
  let cargandoProfesores = true;
  let profesorId: string | null = deps.profesorIdInicial ?? null;

  let bajas: readonly BajaProfesor[] = [];
  let cargandoBajas = false;

  let fechaInicio = '';
  let fechaFin = '';
  let tipo: TipoExcepcionSlot = 'cancelacion';
  let sustitutoId = '';
  let motivo = '';

  let vistaPrevia: readonly CombinacionBajaProfesor[] | null = null;
  let snapshotVistaPrevia: SnapshotFormulario | null = null;
  let cargandoPrevia = false;

  let resultadoConfirmacion: readonly FilaResultadoBajaProfesor[] | null = null;
  let confirmando = false;

  let idConfirmandoCancelar: string | null = null;
  let motivoCancelacion = '';
  let idEnEdicionAcortar: string | null = null;
  let idExpandido: string | null = null;
  let excepcionesExpandidas: readonly ExcepcionSlot[] = [];

  let errorCarga = '';

  const titulo = crearElemento(documento, 'h1', { texto: 'Baja programada de un profesor' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');

  const seccionSelectorProfesor = documento.createElement('div');
  const seccionFormulario = documento.createElement('section');
  const seccionPrevia = documento.createElement('section');
  const seccionBajas = documento.createElement('section');

  function snapshotActual(): SnapshotFormulario | null {
    if (profesorId === null) {
      return null;
    }
    return {
      profesorId,
      fechaInicio,
      fechaFin,
      tipo,
      sustitutoId: tipo === 'sustitucion' ? sustitutoId || null : null,
      motivo: tipo === 'cancelacion' ? motivo || null : null,
    };
  }

  function invalidarVistaPrevia(): void {
    vistaPrevia = null;
    snapshotVistaPrevia = null;
  }

  function snapshotsIguales(a: SnapshotFormulario, b: SnapshotFormulario): boolean {
    return (
      a.profesorId === b.profesorId &&
      a.fechaInicio === b.fechaInicio &&
      a.fechaFin === b.fechaFin &&
      a.tipo === b.tipo &&
      a.sustitutoId === b.sustitutoId &&
      a.motivo === b.motivo
    );
  }

  async function cargarProfesores(): Promise<void> {
    cargandoProfesores = true;
    pintar();
    try {
      profesores = await deps.listarProfesoresActivos();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargandoProfesores = false;
      pintar();
    }
  }

  async function cargarBajas(): Promise<void> {
    if (profesorId === null) {
      bajas = [];
      return;
    }
    cargandoBajas = true;
    pintar();
    try {
      bajas = await deps.listarBajasDeProfesor(profesorId);
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargandoBajas = false;
      pintar();
    }
  }

  function formularioValido(): boolean {
    if (profesorId === null || fechaInicio === '' || fechaFin === '') {
      return false;
    }
    if (!rangoBajaValido(fechaInicio, fechaFin)) {
      return false;
    }
    if (tipo === 'sustitucion') {
      return sustitutoId !== '' && sustitutoId !== profesorId;
    }
    return motivoCancelacionValido(motivo);
  }

  async function calcularVistaPrevia(): Promise<void> {
    if (profesorId === null || !formularioValido()) {
      return;
    }
    cargandoPrevia = true;
    errorCarga = '';
    pintar();
    try {
      const slots = await deps.listarSlotsDeProfesor(profesorId);
      const slotIds = slots.map((slot) => slot.id);
      const [asistencias, excepciones] = await Promise.all([
        deps.listarRegistrosEnRango(slotIds, new Date(`${fechaInicio}T00:00:00.000Z`), new Date(`${fechaFin}T00:00:00.000Z`)),
        deps.listarExcepcionesActivasEnRango(slotIds, fechaInicio, fechaFin),
      ]);
      const clavesConAsistencia = new Set(asistencias.map((fila) => claveCombinacionBaja(fila.slot_id ?? '', fechaLocalISO(new Date(fila.ocurrido_en), zonaHoraria))));
      const clavesConExcepcionActiva = new Set(excepciones.map((excepcion) => claveCombinacionBaja(excepcion.slot_id, excepcion.fecha)));
      vistaPrevia = combinacionesBajaProfesor({
        fechaInicio,
        fechaFin,
        slots,
        clavesConAsistencia,
        clavesConExcepcionActiva,
      });
      snapshotVistaPrevia = snapshotActual();
      resultadoConfirmacion = null;
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargandoPrevia = false;
      pintar();
    }
  }

  async function confirmarBaja(): Promise<void> {
    // Guarda funcional, no solo visual (mismo criterio de defensa en profundidad que el resto del
    // proyecto): nunca confirma si los campos ya no coinciden con la vista previa vigente, aunque el
    // atributo `disabled` del botón no se haya vuelto a pintar todavía tras el último cambio.
    const snapshot = snapshotActual();
    if (profesorId === null || !formularioValido() || snapshotVistaPrevia === null || snapshot === null || !snapshotsIguales(snapshotVistaPrevia, snapshot)) {
      return;
    }
    confirmando = true;
    errorCarga = '';
    pintar();
    try {
      resultadoConfirmacion = await deps.declararBaja({
        profesorId,
        fechaInicio,
        fechaFin,
        tipo,
        profesorSustitutoId: tipo === 'sustitucion' ? sustitutoId : null,
        motivo: tipo === 'cancelacion' ? motivo : null,
      });
      fechaInicio = '';
      fechaFin = '';
      sustitutoId = '';
      motivo = '';
      invalidarVistaPrevia();
      await cargarBajas();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      confirmando = false;
      pintar();
    }
  }

  async function cancelarBaja(bajaId: string): Promise<void> {
    if (!motivoCancelacionValido(motivoCancelacion)) {
      return;
    }
    try {
      await deps.cancelarBaja(bajaId, motivoCancelacion);
      idConfirmandoCancelar = null;
      motivoCancelacion = '';
      zonaInfo.textContent = 'Baja cancelada.';
      await cargarBajas();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
      pintar();
    }
  }

  async function acortarBaja(bajaId: string, nuevaFechaFin: string): Promise<void> {
    if (nuevaFechaFin === '') {
      return;
    }
    try {
      await deps.acortarBaja(bajaId, nuevaFechaFin);
      idEnEdicionAcortar = null;
      zonaInfo.textContent = 'Baja acortada.';
      await cargarBajas();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
      pintar();
    }
  }

  async function alternarExcepcionesDeBaja(bajaId: string): Promise<void> {
    if (idExpandido === bajaId) {
      idExpandido = null;
      pintar();
      return;
    }
    try {
      excepcionesExpandidas = await deps.listarExcepcionesDeBaja(bajaId);
      idExpandido = bajaId;
      pintar();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
      pintar();
    }
  }

  function pintarSelectorProfesor(): void {
    seccionSelectorProfesor.textContent = '';
    if (cargandoProfesores) {
      seccionSelectorProfesor.append(crearElemento(documento, 'p', { texto: 'Cargando profesores…' }));
      return;
    }
    const select = documento.createElement('select');
    select.id = 'bajas-profesor-selector';
    const etiqueta = crearElemento(documento, 'label', { texto: 'Profesor', atributos: { for: 'bajas-profesor-selector' } });
    const opcionVacia = crearElemento(documento, 'option', { texto: 'Elige un profesor…', atributos: { value: '' } });
    select.append(opcionVacia);
    for (const profesor of profesores) {
      const opcion = crearElemento(documento, 'option', { texto: profesor.nombre, atributos: { value: profesor.id } });
      opcion.selected = profesor.id === profesorId;
      select.append(opcion);
    }
    select.addEventListener('change', () => {
      profesorId = select.value === '' ? null : select.value;
      invalidarVistaPrevia();
      resultadoConfirmacion = null;
      void cargarBajas();
    });
    seccionSelectorProfesor.append(etiqueta, select);
  }

  function pintarFormulario(): void {
    seccionFormulario.textContent = '';
    if (profesorId === null) {
      return;
    }

    const form = documento.createElement('form');

    const campoInicio = crearCampoFecha(documento, 'bajas-profesor-inicio', 'Fecha de inicio');
    campoInicio.input.value = fechaInicio;
    campoInicio.input.addEventListener('change', () => {
      fechaInicio = campoInicio.input.value;
      invalidarVistaPrevia();
      pintar();
    });

    const campoFin = crearCampoFecha(documento, 'bajas-profesor-fin', 'Fecha de fin');
    campoFin.input.value = fechaFin;
    campoFin.input.addEventListener('change', () => {
      fechaFin = campoFin.input.value;
      invalidarVistaPrevia();
      pintar();
    });

    const selectTipo = documento.createElement('select');
    selectTipo.id = 'bajas-profesor-tipo';
    const etiquetaTipo = crearElemento(documento, 'label', { texto: 'Tratamiento', atributos: { for: 'bajas-profesor-tipo' } });
    for (const [valor, texto] of [
      ['cancelacion', 'Cancelación (sin sustituto)'],
      ['sustitucion', 'Sustitución (un profesor cubre toda la baja)'],
    ] as const) {
      const opcion = crearElemento(documento, 'option', { texto, atributos: { value: valor } });
      opcion.selected = valor === tipo;
      selectTipo.append(opcion);
    }
    selectTipo.addEventListener('change', () => {
      tipo = selectTipo.value as TipoExcepcionSlot;
      invalidarVistaPrevia();
      pintar();
    });

    form.append(campoInicio.contenedor, campoFin.contenedor, etiquetaTipo, selectTipo);

    if (tipo === 'sustitucion') {
      const selectSustituto = documento.createElement('select');
      selectSustituto.id = 'bajas-profesor-sustituto';
      const etiquetaSustituto = crearElemento(documento, 'label', { texto: 'Profesor sustituto', atributos: { for: 'bajas-profesor-sustituto' } });
      const opcionVacia = crearElemento(documento, 'option', { texto: 'Elige un sustituto…', atributos: { value: '' } });
      selectSustituto.append(opcionVacia);
      for (const profesor of profesores.filter((candidato) => candidato.id !== profesorId)) {
        const opcion = crearElemento(documento, 'option', { texto: profesor.nombre, atributos: { value: profesor.id } });
        opcion.selected = profesor.id === sustitutoId;
        selectSustituto.append(opcion);
      }
      selectSustituto.addEventListener('change', () => {
        sustitutoId = selectSustituto.value;
        invalidarVistaPrevia();
        pintar();
      });
      form.append(etiquetaSustituto, selectSustituto);
    } else {
      const etiquetaMotivo = crearElemento(documento, 'label', { texto: 'Motivo', atributos: { for: 'bajas-profesor-motivo' } });
      const campoMotivo = documento.createElement('input');
      campoMotivo.type = 'text';
      campoMotivo.id = 'bajas-profesor-motivo';
      campoMotivo.value = motivo;
      // 'change' (se confirma al perder el foco), no 'input': igual que las fechas, para no repintar
      // (y perder el punto de edición) en cada tecla mientras se escribe el motivo.
      campoMotivo.addEventListener('change', () => {
        motivo = campoMotivo.value;
        invalidarVistaPrevia();
        pintar();
      });
      form.append(etiquetaMotivo, campoMotivo);
    }

    const botonPrevia = crearBoton(documento, 'Vista previa', 'button');
    botonPrevia.disabled = cargandoPrevia;
    botonPrevia.addEventListener('click', () => {
      if (!formularioValido()) {
        errorCarga = 'Completa fecha de inicio, fecha de fin (fin no anterior a inicio) y, según el tratamiento, el sustituto o el motivo.';
        pintar();
        return;
      }
      void calcularVistaPrevia();
    });
    form.append(botonPrevia);

    const snapshot = snapshotActual();
    const puedeConfirmar = snapshotVistaPrevia !== null && snapshot !== null && snapshotsIguales(snapshotVistaPrevia, snapshot);
    const botonConfirmar = crearBoton(documento, 'Confirmar baja', 'button');
    botonConfirmar.disabled = !puedeConfirmar || confirmando;
    botonConfirmar.addEventListener('click', () => {
      void confirmarBaja();
    });
    form.append(botonConfirmar);

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
    });

    seccionFormulario.append(form);
  }

  function pintarVistaPrevia(): void {
    seccionPrevia.textContent = '';
    if (cargandoPrevia) {
      seccionPrevia.append(crearElemento(documento, 'p', { texto: 'Calculando vista previa…' }));
      return;
    }
    if (vistaPrevia !== null) {
      const excluidas = vistaPrevia.filter((combinacion) => combinacion.excluido);
      const resumen = crearElemento(documento, 'p', {
        texto: `Vista previa: ${String(vistaPrevia.length)} combinación(es), ${String(excluidas.length)} excluida(s).`,
      });
      seccionPrevia.append(resumen);
      const lista = documento.createElement('ul');
      for (const combinacion of vistaPrevia) {
        const item = documento.createElement('li');
        const etiquetaSlot = `${ETIQUETA_DIA_SEMANA[combinacion.slot.dia_semana]} ${combinacion.slot.hora_inicio}–${combinacion.slot.hora_fin}`;
        item.textContent = combinacion.excluido
          ? `${combinacion.fecha} (${etiquetaSlot}) — excluida: ${combinacion.motivoExclusion ?? ''}`
          : `${combinacion.fecha} (${etiquetaSlot}) — se creará`;
        lista.append(item);
      }
      seccionPrevia.append(lista);
    }
    if (resultadoConfirmacion !== null) {
      const creadas = resultadoConfirmacion.filter((fila) => fila.excluido === false).length;
      const excluidas = resultadoConfirmacion.filter((fila) => fila.excluido === true).length;
      seccionPrevia.append(
        crearElemento(documento, 'p', { texto: `Baja declarada: ${String(creadas)} excepción(es) creada(s), ${String(excluidas)} excluida(s).` }),
      );
    }
  }

  function pintarFilaBaja(baja: BajaProfesor): HTMLElement {
    const fila = documento.createElement('div');
    const categoria = categoriaBaja(baja, hoy);
    const rango = baja.fecha_inicio === baja.fecha_fin ? baja.fecha_inicio : `${baja.fecha_inicio} a ${baja.fecha_fin}`;
    const descripcion =
      baja.tipo === 'sustitucion' ? 'Sustitución' : `Cancelación${baja.motivo !== null ? ` — ${baja.motivo}` : ''}`;
    fila.append(
      crearElemento(documento, 'span', { texto: rango }),
      crearElemento(documento, 'span', { texto: descripcion }),
      crearElemento(documento, 'span', { texto: ETIQUETA_CATEGORIA_BAJA[categoria] }),
    );

    const botonVer = crearBoton(documento, idExpandido === baja.id ? 'Ocultar excepciones' : 'Ver excepciones generadas', 'button');
    botonVer.addEventListener('click', () => {
      void alternarExcepcionesDeBaja(baja.id);
    });
    fila.append(botonVer);

    if (idExpandido === baja.id) {
      const lista = documento.createElement('ul');
      if (excepcionesExpandidas.length === 0) {
        lista.append(crearElemento(documento, 'li', { texto: 'Ninguna excepción generada (ningún slot coincidía con el rango).' }));
      }
      for (const excepcion of excepcionesExpandidas) {
        lista.append(
          crearElemento(documento, 'li', {
            texto: `${excepcion.fecha} — ${excepcion.tipo === 'sustitucion' ? 'sustitución' : 'cancelación'}${excepcion.activo ? '' : ' (desactivada)'}`,
          }),
        );
      }
      fila.append(lista);
    }

    if (idConfirmandoCancelar === baja.id) {
      const campoMotivo = documento.createElement('input');
      campoMotivo.type = 'text';
      campoMotivo.setAttribute('aria-label', 'Motivo de la cancelación');
      campoMotivo.value = motivoCancelacion;
      campoMotivo.addEventListener('input', () => {
        motivoCancelacion = campoMotivo.value;
      });
      const botonConfirmarCancelar = crearBoton(documento, 'Confirmar cancelación', 'button');
      botonConfirmarCancelar.addEventListener('click', () => {
        void cancelarBaja(baja.id);
      });
      const botonVolver = crearBoton(documento, 'Volver', 'button');
      botonVolver.addEventListener('click', () => {
        idConfirmandoCancelar = null;
        motivoCancelacion = '';
        pintar();
      });
      fila.append(campoMotivo, botonConfirmarCancelar, botonVolver);
    } else if (puedeCancelarBaja(baja, hoy)) {
      const botonCancelar = crearBoton(documento, 'Cancelar baja', 'button');
      botonCancelar.addEventListener('click', () => {
        idConfirmandoCancelar = baja.id;
        motivoCancelacion = '';
        pintar();
      });
      fila.append(botonCancelar);
    }

    if (idEnEdicionAcortar === baja.id) {
      const campoNuevaFecha = documento.createElement('input');
      campoNuevaFecha.type = 'date';
      campoNuevaFecha.setAttribute('aria-label', 'Nueva fecha de fin');
      const botonConfirmarAcortar = crearBoton(documento, 'Confirmar acortar', 'button');
      botonConfirmarAcortar.addEventListener('click', () => {
        void acortarBaja(baja.id, campoNuevaFecha.value);
      });
      const botonVolver = crearBoton(documento, 'Volver', 'button');
      botonVolver.addEventListener('click', () => {
        idEnEdicionAcortar = null;
        pintar();
      });
      fila.append(campoNuevaFecha, botonConfirmarAcortar, botonVolver);
    } else if (puedeAcortarBaja(baja, hoy)) {
      const botonAcortar = crearBoton(documento, 'Acortar baja', 'button');
      botonAcortar.addEventListener('click', () => {
        idEnEdicionAcortar = baja.id;
        pintar();
      });
      fila.append(botonAcortar);
    }

    return fila;
  }

  function pintarBajas(): void {
    seccionBajas.textContent = '';
    if (profesorId === null) {
      return;
    }
    seccionBajas.append(crearElemento(documento, 'h2', { texto: 'Bajas de este profesor' }));
    if (cargandoBajas) {
      seccionBajas.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
      return;
    }
    if (bajas.length === 0) {
      seccionBajas.append(crearElemento(documento, 'p', { texto: 'Este profesor no tiene ninguna baja declarada.' }));
      return;
    }
    for (const baja of bajas) {
      seccionBajas.append(pintarFilaBaja(baja));
    }
  }

  function pintar(): void {
    zonaError.textContent = errorCarga;
    pintarSelectorProfesor();
    pintarFormulario();
    pintarVistaPrevia();
    pintarBajas();
  }

  contenedor.append(titulo, zonaError, zonaInfo, seccionSelectorProfesor, seccionFormulario, seccionPrevia, seccionBajas);

  void cargarProfesores();
  if (profesorId !== null) {
    void cargarBajas();
  }
}
