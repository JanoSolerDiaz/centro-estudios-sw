/**
 * Diálogos modales de edición y de anulación de un registro de asistencia (R-36). `role="dialog"`
 * (edición) y `role="alertdialog"` (anulación) con foco atrapado, Escape para cancelar y devolución
 * del foco al control que los abrió — mismo patrón que `avisoInactividad.ts`. Se usa un diálogo propio
 * y no `window.confirm()` porque la RPC exige `motivo_anulacion` y un `confirm()` nativo no puede
 * recogerlo. Las reglas de validación viven en `dominio/edicionAsistencia.ts`, no aquí.
 */

import type { Reloj } from '../nucleo/reloj.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import { MOTIVOS_JUSTIFICACION_AUSENCIA, puedeJustificarAusencia, puedeMarcarSalida } from '../dominio/asistencia.ts';
import {
  construirEntradaEdicion,
  validarMotivoAnulacion,
  valoresInicialesEdicion,
  type EntradaEdicionHistorico,
} from '../dominio/edicionAsistencia.ts';
import { etiquetaMotivoJustificacion } from '../dominio/historicoAsistencia.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';
import { crearElemento } from './dom.ts';
import { crearBoton, crearCampoTexto, crearZonaMensaje } from './formularios.ts';

const SELECTOR_ENFOCABLES = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

interface Modal {
  readonly cuerpo: HTMLElement;
  cerrar(): void;
}

function abrirModal(documento: Document, rol: 'dialog' | 'alertdialog', titulo: string, alCancelar: () => void, restaurarFoco?: HTMLElement): Modal {
  const velo = documento.createElement('div');
  velo.setAttribute('data-dialogo-asistencia', rol);
  const caja = documento.createElement('div');
  caja.setAttribute('role', rol);
  caja.setAttribute('aria-modal', 'true');
  const idTitulo = `dialogo-asistencia-titulo-${rol}`;
  caja.setAttribute('aria-labelledby', idTitulo);
  const encabezado = crearElemento(documento, 'h2', { texto: titulo, atributos: { id: idTitulo } });
  const cuerpo = documento.createElement('div');
  caja.append(encabezado, cuerpo);
  velo.append(caja);
  documento.body.append(velo);

  velo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      alCancelar();
      return;
    }
    if (evento.key !== 'Tab') {
      return;
    }
    const enfocables = [...caja.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)];
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (!primero || !ultimo) {
      return;
    }
    const activo = documento.activeElement;
    if (evento.shiftKey && activo === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  });

  return {
    cuerpo,
    cerrar() {
      velo.remove();
      restaurarFoco?.focus();
    },
  };
}

export interface OpcionesDialogoEditar {
  readonly registro: Asistencia;
  readonly nombreAlumno: string;
  readonly reloj: Reloj;
  readonly zonaHoraria?: string;
  readonly restaurarFoco?: HTMLElement;
  /** Envía la entrada; si lanza, el diálogo se queda abierto y muestra el mensaje amigable. */
  guardar(entrada: EntradaEdicionHistorico): Promise<void>;
}

/** Abre el diálogo de edición (R-36, requisito 2): hora real, salida (marcar o ajustar), nota y, si es
 * una ausencia, justificación. `registrado_en`, origen y retroactivo no se muestran editables. */
export function abrirDialogoEditar(documento: Document, opciones: OpcionesDialogoEditar): void {
  const { registro } = opciones;
  const modal = abrirModal(documento, 'dialog', `Editar registro de ${opciones.nombreAlumno}`, () => {
    modal.cerrar();
  }, opciones.restaurarFoco);
  const iniciales = valoresInicialesEdicion(registro, opciones.zonaHoraria);
  const sufijo = registro.id;
  const zonaError = crearZonaMensaje(documento, 'alert');

  const etiquetaHora = crearElemento(documento, 'label', { texto: 'Hora real', atributos: { for: `edit-hora-${sufijo}` } });
  const campoHora = documento.createElement('input');
  campoHora.type = 'time';
  campoHora.id = `edit-hora-${sufijo}`;
  campoHora.value = iniciales.hora;

  const bloques: (HTMLElement | Text)[] = [zonaError, etiquetaHora, campoHora];

  let casillaSalida: HTMLInputElement | undefined;
  let campoSalida: HTMLInputElement | undefined;
  if (puedeMarcarSalida(registro)) {
    casillaSalida = documento.createElement('input');
    casillaSalida.type = 'checkbox';
    casillaSalida.id = `edit-marcar-salida-${sufijo}`;
    bloques.push(crearElemento(documento, 'label', { texto: 'Marcar salida ahora', atributos: { for: casillaSalida.id } }), casillaSalida);
  } else if (registro.ocurrido_en_salida) {
    campoSalida = documento.createElement('input');
    campoSalida.type = 'time';
    campoSalida.id = `edit-salida-${sufijo}`;
    campoSalida.value = iniciales.horaSalida;
    bloques.push(crearElemento(documento, 'label', { texto: 'Hora de salida', atributos: { for: campoSalida.id } }), campoSalida);
  }

  const campoNota = crearCampoTexto(documento, `edit-nota-${sufijo}`, 'Nota', 'text', 'off');
  campoNota.input.required = false;
  campoNota.input.value = iniciales.nota;
  bloques.push(campoNota.contenedor);

  let selectMotivo: HTMLSelectElement | undefined;
  let campoNotaJustificacion: { readonly input: HTMLInputElement } | undefined;
  if (puedeJustificarAusencia(registro)) {
    selectMotivo = documento.createElement('select');
    selectMotivo.id = `edit-motivo-justificacion-${sufijo}`;
    selectMotivo.append(crearElemento(documento, 'option', { texto: 'Sin justificar', atributos: { value: '' } }));
    for (const motivo of MOTIVOS_JUSTIFICACION_AUSENCIA) {
      selectMotivo.append(crearElemento(documento, 'option', { texto: etiquetaMotivoJustificacion(motivo), atributos: { value: motivo } }));
    }
    selectMotivo.value = iniciales.motivoJustificacion;
    const notaJust = crearCampoTexto(documento, `edit-nota-justificacion-${sufijo}`, 'Nota de la justificación (opcional)', 'text', 'off');
    notaJust.input.required = false;
    notaJust.input.value = iniciales.notaJustificacion;
    campoNotaJustificacion = notaJust;
    bloques.push(
      crearElemento(documento, 'label', { texto: 'Motivo de la justificación', atributos: { for: selectMotivo.id } }),
      selectMotivo,
      notaJust.contenedor,
    );
  }

  const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
  const botonGuardar = crearBoton(documento, 'Guardar cambios', 'button');
  botonCancelar.addEventListener('click', () => {
    modal.cerrar();
  });
  botonGuardar.addEventListener('click', () => {
    const resultado = construirEntradaEdicion(
      registro,
      {
        hora: campoHora.value,
        horaSalida: campoSalida?.value ?? '',
        marcarSalida: casillaSalida?.checked ?? false,
        nota: campoNota.input.value,
        motivoJustificacion: selectMotivo?.value ?? '',
        notaJustificacion: campoNotaJustificacion?.input.value ?? '',
      },
      opciones.reloj,
      opciones.zonaHoraria,
    );
    if (!resultado.ok) {
      zonaError.textContent = resultado.error;
      return;
    }
    zonaError.textContent = '';
    botonGuardar.disabled = true;
    opciones.guardar(resultado.entrada).then(
      () => {
        modal.cerrar();
      },
      (error: unknown) => {
        botonGuardar.disabled = false;
        zonaError.textContent = mensajeAmigable(error);
      },
    );
  });

  modal.cuerpo.append(...bloques, botonCancelar, botonGuardar);
  campoHora.focus();
}

export interface OpcionesDialogoAnular {
  readonly nombreAlumno: string;
  readonly restaurarFoco?: HTMLElement;
  /** Envía el motivo ya validado; si lanza, el diálogo se queda abierto con el mensaje amigable. El
   * motivo nunca se registra en el log ni en el informador de errores. */
  anular(motivo: string): Promise<void>;
}

/** Abre la confirmación de anulación (R-36, requisito 3): motivo obligatorio, «Cancelar» con el foco
 * inicial (para no anular por accidente) y «Anular registro». */
export function abrirDialogoAnular(documento: Document, opciones: OpcionesDialogoAnular): void {
  const modal = abrirModal(documento, 'alertdialog', 'Anular registro', () => {
    modal.cerrar();
  }, opciones.restaurarFoco);
  const zonaError = crearZonaMensaje(documento, 'alert');
  const texto = crearElemento(documento, 'p', {
    texto: `¿Seguro que quieres anular este registro de ${opciones.nombreAlumno}? No se borra: queda marcado como anulado y se conserva el rastro.`,
  });
  const campoMotivo = crearCampoTexto(documento, 'anular-motivo', 'Motivo de la anulación', 'text', 'off');
  const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
  const botonAnular = crearBoton(documento, 'Anular registro', 'button');
  botonCancelar.addEventListener('click', () => {
    modal.cerrar();
  });
  botonAnular.addEventListener('click', () => {
    const resultado = validarMotivoAnulacion(campoMotivo.input.value);
    if (!resultado.ok) {
      zonaError.textContent = resultado.error;
      campoMotivo.input.focus();
      return;
    }
    zonaError.textContent = '';
    botonAnular.disabled = true;
    opciones.anular(resultado.motivo).then(
      () => {
        modal.cerrar();
      },
      (error: unknown) => {
        botonAnular.disabled = false;
        zonaError.textContent = mensajeAmigable(error);
      },
    );
  });
  modal.cuerpo.append(texto, zonaError, campoMotivo.contenedor, botonCancelar, botonAnular);
  botonCancelar.focus();
}
