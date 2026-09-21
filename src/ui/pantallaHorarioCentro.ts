/**
 * Vista de horario del centro y gestión en bloque de una sesión completa (R-25). Exclusiva de
 * `administrator` (`puedeGestionarHorarios`, ya usada por T-16 — es la misma capacidad, aplicada
 * aquí a TODO el centro en vez de a un alumno) — presentación, no control de acceso real (ver
 * cabecera de `dominio/permisosUi.ts`); esta pantalla solo se monta dentro del router de
 * `administrator`, así que un `teacher` no llega a ella por ningún camino.
 *
 * Agrupa los slots vigentes de HOY por sesión (`dominio/horarioCentro.ts#sesionesVigentesDelCentro`,
 * mismo criterio de "misma sesión" que `slotsDeLaMismaSesion`, ya usado por R-17/R-23). Editar o
 * cesar una sesión completa aplica `modificarSlot`/`cesarSlot` (T-15) A CADA ALUMNO del grupo, sin
 * ninguna RPC nueva — un fallo de un alumno concreto (p. ej. un solape con otro horario suyo) no
 * impide los demás: los que fallan quedan listados con su motivo, listos para reintentar sueltos con
 * los MISMOS datos ya elegidos, sin reabrir el formulario (requisito 4, mismo patrón que el cierre en
 * bloque de R-17/R-23 en `pantallaRegistrosSlot.ts`/`pantallaPasarLista.ts`).
 *
 * Solo nombres, nunca fotografía (requisito 1): la regla del avatar (ficha del alumno y cards de
 * pasar lista, y solo ahí) no gana aquí ninguna excepción — mismo criterio que ya respetó R-24.
 * Tampoco ofrece ningún control para editar el horario de un solo alumno del grupo (requisito 6):
 * para eso sigue existiendo la ficha del alumno (T-16), sin cambios.
 */

import { ETIQUETA_DIA_SEMANA, type Rol, type DiaSemana } from '../dominio/tipos.ts';
import { puedeGestionarHorarios } from '../dominio/permisosUi.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { sesionesVigentesDelCentro, claveSesionHorarioCentro, type SesionHorarioCentro } from '../dominio/horarioCentro.ts';
import { fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import type { SlotConAlumno } from '../dominio/slots.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';
import type { CambiosSlot, ResultadoEscrituraSlot } from '../datos/slotsHorario.ts';
import type { SlotHorario } from '../dominio/tipos.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton, crearMensajeErrorCampo } from './formularios.ts';
import { crearElemento } from './dom.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaHorarioCentro {
  readonly rol: Rol;
  readonly reloj: Reloj;
  readonly zonaHoraria?: string;
  listarSlots(): Promise<readonly SlotConAlumno[]>;
  listarProfesoresParaSelector(): Promise<readonly ProfesorParaSelector[]>;
  resolverNombresProfesores(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
  modificarSlot(slotId: string, cambios: CambiosSlot, fechaEfecto: Date): Promise<ResultadoEscrituraSlot>;
  cesarSlot(slotId: string, fechaEfecto: Date): Promise<SlotHorario>;
}

const AVISO_SOLAPE_PROFESOR = 'Aviso: algún profesor ya tenía otro alumno en este mismo día y hora.';

interface AccionEditar {
  readonly tipo: 'editar';
  readonly claveSesion: string;
  readonly pendientes: readonly SlotConAlumno[];
  readonly campos: CambiosSlot | null;
  readonly fechaEfecto: Date | null;
  readonly intentado: boolean;
  readonly guardando: boolean;
  readonly error: string;
  readonly aviso: string;
}

interface AccionCesar {
  readonly tipo: 'cesar';
  readonly claveSesion: string;
  readonly pendientes: readonly SlotConAlumno[];
  readonly fechaEfecto: Date | null;
  readonly intentado: boolean;
  readonly guardando: boolean;
  readonly error: string;
}

type AccionEnCurso = AccionEditar | AccionCesar;

function fechaUtcDeCampo(valorFecha: string): Date {
  return new Date(`${valorFecha}T00:00:00Z`);
}

function crearSelectorProfesor(documento: Document, id: string, profesores: readonly ProfesorParaSelector[]): HTMLSelectElement {
  const select = documento.createElement('select');
  select.id = id;
  select.required = true;
  for (const profesor of profesores) {
    const opcion = documento.createElement('option');
    opcion.value = profesor.id;
    opcion.textContent = profesor.nombre;
    select.append(opcion);
  }
  return select;
}

function crearSelectorDiaSemana(documento: Document, id: string): HTMLSelectElement {
  const select = documento.createElement('select');
  select.id = id;
  select.required = true;
  for (const [valor, texto] of Object.entries(ETIQUETA_DIA_SEMANA)) {
    const opcion = documento.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    select.append(opcion);
  }
  return select;
}

export function mostrarPantallaHorarioCentro(contenedor: HTMLElement, deps: DependenciasPantallaHorarioCentro): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeGestionarHorarios(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const zonaHoraria = deps.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;

  let cargando = true;
  let errorCarga = '';
  let todosLosSlots: readonly SlotConAlumno[] = [];
  let sesiones: readonly SesionHorarioCentro<SlotConAlumno>[] = [];
  let profesores: readonly ProfesorParaSelector[] = [];
  let nombresProfesores: ReadonlyMap<string, string> = new Map();
  let accion: AccionEnCurso | null = null;
  /** Aviso de solape de profesor (requisito 4: "nunca bloqueo") de la ÚLTIMA edición completada con
   * éxito — se muestra aunque la acción ya se haya cerrado, porque el propio cierre de `accion` no
   * debe hacer desaparecer un aviso que sigue siendo cierto sobre el horario resultante. */
  let avisoGlobal = '';

  const titulo = crearElemento(documento, 'h1', { texto: 'Horario del centro' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaAviso = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');

  function nombreProfesor(profesorId: string): string {
    return nombresProfesores.get(profesorId) ?? profesores.find((p) => p.id === profesorId)?.nombre ?? 'Profesor no disponible';
  }

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      const [slots, listaProfesores] = await Promise.all([deps.listarSlots(), deps.listarProfesoresParaSelector()]);
      todosLosSlots = slots;
      profesores = listaProfesores;
      const idsProfesores = [...new Set(slots.map((slot) => slot.profesor_id))];
      nombresProfesores = await deps.resolverNombresProfesores(idsProfesores);
      sesiones = sesionesVigentesDelCentro(todosLosSlots, deps.reloj.ahora());
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  function abrirEdicion(sesion: SesionHorarioCentro<SlotConAlumno>): void {
    avisoGlobal = '';
    accion = {
      tipo: 'editar',
      claveSesion: claveSesionHorarioCentro(sesion),
      pendientes: sesion.slots,
      campos: null,
      fechaEfecto: null,
      intentado: false,
      guardando: false,
      error: '',
      aviso: '',
    };
    pintar();
  }

  function abrirCese(sesion: SesionHorarioCentro<SlotConAlumno>): void {
    avisoGlobal = '';
    accion = {
      tipo: 'cesar',
      claveSesion: claveSesionHorarioCentro(sesion),
      pendientes: sesion.slots,
      fechaEfecto: null,
      intentado: false,
      guardando: false,
      error: '',
    };
    pintar();
  }

  function cancelarAccion(): void {
    accion = null;
    pintar();
  }

  /** Aplica la edición en bloque (requisito 2) a `accion.pendientes`, uno por uno (requisito 4): un
   * fallo de un alumno concreto no impide los demás. Sin round-trip completo: los datos elegidos
   * (`campos`/`fechaEfecto`) ya quedaron fijados en el primer envío, reintentar repite exactamente
   * la misma operación solo sobre quienes siguen sin moverse. */
  async function ejecutarEdicionEnBloque(): Promise<void> {
    if (accion?.tipo !== 'editar' || accion.campos === null || accion.fechaEfecto === null) {
      return;
    }
    const candidatos = accion.pendientes;
    const campos = accion.campos;
    const fechaEfecto = accion.fechaEfecto;
    const restantes: SlotConAlumno[] = [];
    const fallidos: string[] = [];
    let avisoSolape = false;
    for (const candidato of candidatos) {
      try {
        const resultado = await deps.modificarSlot(candidato.id, campos, fechaEfecto);
        if (resultado.avisoSolapeProfesor) {
          avisoSolape = true;
        }
      } catch (error) {
        restantes.push(candidato);
        fallidos.push(`${nombreCompletoAlumno(candidato.alumno)}: ${mensajeAmigable(error)}`);
      }
    }
    if (restantes.length === 0) {
      accion = null;
      avisoGlobal = avisoSolape ? AVISO_SOLAPE_PROFESOR : '';
    } else {
      accion = {
        ...accion,
        pendientes: restantes,
        guardando: false,
        error: `No se pudo mover a: ${fallidos.join('; ')}.`,
        aviso: avisoSolape ? AVISO_SOLAPE_PROFESOR : '',
      };
    }
    await cargar();
  }

  /** Aplica el cese en bloque (requisito 3), mismo criterio exacto que `ejecutarEdicionEnBloque`. */
  async function ejecutarCeseEnBloque(): Promise<void> {
    if (accion?.tipo !== 'cesar' || accion.fechaEfecto === null) {
      return;
    }
    const candidatos = accion.pendientes;
    const fechaEfecto = accion.fechaEfecto;
    const restantes: SlotConAlumno[] = [];
    const fallidos: string[] = [];
    for (const candidato of candidatos) {
      try {
        await deps.cesarSlot(candidato.id, fechaEfecto);
      } catch (error) {
        restantes.push(candidato);
        fallidos.push(`${nombreCompletoAlumno(candidato.alumno)}: ${mensajeAmigable(error)}`);
      }
    }
    accion =
      restantes.length === 0
        ? null
        : { ...accion, pendientes: restantes, guardando: false, error: `No se pudo cesar a: ${fallidos.join('; ')}.` };
    await cargar();
  }

  function pintarFormularioEdicion(sesion: SesionHorarioCentro<SlotConAlumno>): HTMLElement {
    const contenedorAccion = documento.createElement('div');
    if (accion?.tipo !== 'editar') {
      return contenedorAccion;
    }
    const enCurso = accion;

    if (enCurso.intentado) {
      // Fase de reintento: los datos ya están fijados, solo queda mostrar a quién falta y por qué.
      if (enCurso.error) {
        const mensaje = crearZonaMensaje(documento, 'alert');
        mensaje.textContent = enCurso.error;
        contenedorAccion.append(mensaje);
      }
      if (enCurso.aviso) {
        const mensaje = crearZonaMensaje(documento, 'status');
        mensaje.textContent = enCurso.aviso;
        contenedorAccion.append(mensaje);
      }
      const lista = documento.createElement('ul');
      for (const pendiente of enCurso.pendientes) {
        lista.append(crearElemento(documento, 'li', { texto: nombreCompletoAlumno(pendiente.alumno) }));
      }
      contenedorAccion.append(crearElemento(documento, 'p', { texto: 'Todavía no se pudo mover a:' }), lista);

      const botonReintentar = crearBoton(documento, 'Reintentar', 'button');
      botonReintentar.disabled = enCurso.guardando;
      botonReintentar.addEventListener('click', () => {
        accion = { ...enCurso, guardando: true, error: '' };
        pintar();
        void ejecutarEdicionEnBloque();
      });
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.disabled = enCurso.guardando;
      botonCancelar.addEventListener('click', cancelarAccion);
      contenedorAccion.append(botonReintentar, botonCancelar);
      return contenedorAccion;
    }

    const form = documento.createElement('form');
    const idProfesor = 'horario-centro-editar-profesor';
    const selectProfesor = crearSelectorProfesor(documento, idProfesor, profesores);
    selectProfesor.value = sesion.profesorId;
    const etiquetaProfesor = crearElemento(documento, 'label', { texto: 'Profesor', atributos: { for: idProfesor } });

    const idDia = 'horario-centro-editar-dia';
    const selectDia = crearSelectorDiaSemana(documento, idDia);
    selectDia.value = String(sesion.diaSemana);
    const etiquetaDia = crearElemento(documento, 'label', { texto: 'Día de la semana', atributos: { for: idDia } });

    const idInicio = 'horario-centro-editar-inicio';
    const campoInicio = documento.createElement('input');
    campoInicio.type = 'time';
    campoInicio.id = idInicio;
    campoInicio.required = true;
    campoInicio.value = sesion.horaInicio.slice(0, 5);
    const etiquetaInicio = crearElemento(documento, 'label', { texto: 'Hora de inicio', atributos: { for: idInicio } });

    const idFin = 'horario-centro-editar-fin';
    const campoFin = documento.createElement('input');
    campoFin.type = 'time';
    campoFin.id = idFin;
    campoFin.required = true;
    campoFin.value = sesion.horaFin.slice(0, 5);
    const etiquetaFin = crearElemento(documento, 'label', { texto: 'Hora de fin', atributos: { for: idFin } });

    const campoAsignatura = crearCampoTexto(documento, 'horario-centro-editar-asignatura', 'Asignatura o grupo (opcional)', 'text', 'off');
    campoAsignatura.input.required = false;
    campoAsignatura.input.value = sesion.asignaturaOGrupo ?? '';

    const idFechaEfecto = 'horario-centro-editar-fecha-efecto';
    const campoFechaEfecto = documento.createElement('input');
    campoFechaEfecto.type = 'date';
    campoFechaEfecto.id = idFechaEfecto;
    campoFechaEfecto.required = true;
    campoFechaEfecto.value = fechaLocalISO(deps.reloj.ahora(), zonaHoraria);
    const etiquetaFechaEfecto = crearElemento(documento, 'label', { texto: 'Fecha de efecto', atributos: { for: idFechaEfecto } });

    const errorHora = crearMensajeErrorCampo(documento, campoFin, 'horario-centro-editar-fin-error');

    const botonGuardar = crearBoton(documento, 'Guardar');
    const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
    botonCancelar.addEventListener('click', cancelarAccion);

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      if (campoFin.value <= campoInicio.value) {
        errorHora.establecer('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
      errorHora.limpiar();
      const campos: CambiosSlot = {
        profesor_id: selectProfesor.value,
        dia_semana: Number(selectDia.value) as DiaSemana,
        hora_inicio: campoInicio.value,
        hora_fin: campoFin.value,
        asignatura_o_grupo: campoAsignatura.input.value.trim().length > 0 ? campoAsignatura.input.value.trim() : null,
      };
      accion = { ...enCurso, campos, fechaEfecto: fechaUtcDeCampo(campoFechaEfecto.value), intentado: true, guardando: true };
      pintar();
      void ejecutarEdicionEnBloque();
    });

    form.append(
      etiquetaProfesor,
      selectProfesor,
      etiquetaDia,
      selectDia,
      etiquetaInicio,
      campoInicio,
      etiquetaFin,
      campoFin,
      errorHora.elemento,
      campoAsignatura.contenedor,
      etiquetaFechaEfecto,
      campoFechaEfecto,
      botonGuardar,
      botonCancelar,
    );
    contenedorAccion.append(form);
    return contenedorAccion;
  }

  function pintarFormularioCese(): HTMLElement {
    const contenedorAccion = documento.createElement('div');
    if (accion?.tipo !== 'cesar') {
      return contenedorAccion;
    }
    const enCurso = accion;

    if (enCurso.intentado) {
      if (enCurso.error) {
        const mensaje = crearZonaMensaje(documento, 'alert');
        mensaje.textContent = enCurso.error;
        contenedorAccion.append(mensaje);
      }
      const lista = documento.createElement('ul');
      for (const pendiente of enCurso.pendientes) {
        lista.append(crearElemento(documento, 'li', { texto: nombreCompletoAlumno(pendiente.alumno) }));
      }
      contenedorAccion.append(crearElemento(documento, 'p', { texto: 'Todavía no se pudo cesar a:' }), lista);

      const botonReintentar = crearBoton(documento, 'Reintentar', 'button');
      botonReintentar.disabled = enCurso.guardando;
      botonReintentar.addEventListener('click', () => {
        accion = { ...enCurso, guardando: true, error: '' };
        pintar();
        void ejecutarCeseEnBloque();
      });
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.disabled = enCurso.guardando;
      botonCancelar.addEventListener('click', cancelarAccion);
      contenedorAccion.append(botonReintentar, botonCancelar);
      return contenedorAccion;
    }

    const idFechaEfecto = 'horario-centro-cesar-fecha-efecto';
    const campoFechaEfecto = documento.createElement('input');
    campoFechaEfecto.type = 'date';
    campoFechaEfecto.id = idFechaEfecto;
    campoFechaEfecto.required = true;
    campoFechaEfecto.value = fechaLocalISO(deps.reloj.ahora(), zonaHoraria);
    const etiqueta = crearElemento(documento, 'label', { texto: 'Fecha de efecto del cese', atributos: { for: idFechaEfecto } });

    const botonConfirmar = crearBoton(documento, 'Confirmar cese', 'button');
    botonConfirmar.addEventListener('click', () => {
      if (!campoFechaEfecto.value) {
        return;
      }
      accion = { ...enCurso, fechaEfecto: fechaUtcDeCampo(campoFechaEfecto.value), intentado: true, guardando: true };
      pintar();
      void ejecutarCeseEnBloque();
    });
    const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
    botonCancelar.addEventListener('click', cancelarAccion);

    contenedorAccion.append(etiqueta, campoFechaEfecto, botonConfirmar, botonCancelar);
    return contenedorAccion;
  }

  function pintarSesion(sesion: SesionHorarioCentro<SlotConAlumno>): HTMLElement {
    const clave = claveSesionHorarioCentro(sesion);
    const tarjeta = documento.createElement('article');
    tarjeta.append(
      crearElemento(documento, 'h4', {
        texto: `${sesion.horaInicio.slice(0, 5)}–${sesion.horaFin.slice(0, 5)} — ${nombreProfesor(sesion.profesorId)}`,
      }),
      crearElemento(documento, 'p', { texto: sesion.asignaturaOGrupo ?? 'Sin asignatura o grupo' }),
    );
    const listaAlumnos = documento.createElement('ul');
    for (const slot of sesion.slots) {
      listaAlumnos.append(crearElemento(documento, 'li', { texto: nombreCompletoAlumno(slot.alumno) }));
    }
    tarjeta.append(listaAlumnos);

    if (accion !== null && accion.claveSesion === clave) {
      tarjeta.append(accion.tipo === 'editar' ? pintarFormularioEdicion(sesion) : pintarFormularioCese());
      return tarjeta;
    }

    if (accion === null) {
      const botonEditar = crearBoton(documento, 'Editar sesión completa', 'button');
      botonEditar.addEventListener('click', () => {
        abrirEdicion(sesion);
      });
      const botonCesar = crearBoton(documento, 'Cesar sesión completa', 'button');
      botonCesar.addEventListener('click', () => {
        abrirCese(sesion);
      });
      tarjeta.append(botonEditar, botonCesar);
    }

    return tarjeta;
  }

  function pintar(): void {
    zonaError.textContent = errorCarga;
    zonaAviso.textContent = avisoGlobal;
    listaEl.textContent = '';
    if (cargando) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'Cargando horario…' }));
      return;
    }
    if (sesiones.length === 0) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'Este centro no tiene ningún horario vigente.' }));
      return;
    }
    let diaActual: DiaSemana | null = null;
    for (const sesion of sesiones) {
      if (sesion.diaSemana !== diaActual) {
        diaActual = sesion.diaSemana;
        listaEl.append(crearElemento(documento, 'h3', { texto: ETIQUETA_DIA_SEMANA[diaActual] }));
      }
      listaEl.append(pintarSesion(sesion));
    }
  }

  contenedor.append(titulo, zonaError, zonaAviso, listaEl);
  void cargar();
}
