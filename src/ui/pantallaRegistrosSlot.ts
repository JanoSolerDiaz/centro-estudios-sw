/**
 * Pantalla «Registros» (T-21): consulta y modificación de los registros de asistencia de UN slot en
 * UN día — la que cierra el ciclo del día a día ("el profesor sale de clase, abre sus registros de
 * ese slot y arregla lo que esté mal"). Una sola pantalla con dos alcances (requisito de la propia
 * spec, "no dos pantallas"): un `teacher` solo ve sus propios slots, sin selector de profesor,
 * porque no hay nada que elegir; un `administrator` elige antes un profesor cualquiera
 * (`puedeEditarAsistenciaDeCualquiera`, `dominio/permisosUi.ts`). El alcance real lo garantiza RLS
 * (`003_politicas_rls.sql`), no esta pantalla — igual que el resto de `permisosUi.ts`.
 *
 * Desde T-22, `teacher` navega aquí por el router real de `aplicacion.ts#mostrarAppProfesor`
 * (`#/registros[/<slotId>]`) en vez de la navegación local que T-21 dejó como paso intermedio;
 * `deps.slotInicialId` es lo que "mi horario" (T-22) usa para enlazar directo a los registros de UN
 * slot concreto sin pasar por el selector.
 *
 * Ocho acciones de edición (requisito 4 de T-21, más "justificar" de R-02 y "marcar/ajustar salida"
 * de R-03), cada una su propio mini-formulario dentro del panel de edición de la fila — nunca un
 * formulario único de "corrección": cambiar el alumno (búsqueda, reutiliza `buscar_alumnos_activos`
 * de T-20), ajustar la hora, cambiar el slot atribuido (solo ofrecida si `puedeCambiarSlotAtribuido`,
 * T-21), anular (motivo obligatorio), editar la nota, justificar una ausencia (solo ofrecida si
 * `puedeJustificarAusencia`, R-02: motivo de una lista corta cerrada + nota opcional, sin
 * confirmación explícita) y marcar/ajustar la salida (R-03: un único botón con la hora real del
 * servidor mientras no haya salida, `<input type="time">` para corregirla después — nunca las dos
 * ofrecidas a la vez, ver `puedeMarcarSalida`). "Añadir un registro olvidado" (sexto punto del
 * requisito de T-21) es una acción de pantalla, no de fila:
 * llama a `registrar_asistencia` (T-18) con `ocurrido_en` declarado, para el alumno del slot
 * elegido. Anular y cambiar el alumno exigen confirmación explícita con el dato viejo y el nuevo a
 * la vista (requisito 8) — mismo patrón de "confirmando .../botón Confirmar/botón Cancelar" que
 * `pantallaFichaAlumno.ts` ya usa para dar de baja o cesar un slot.
 *
 * El historial completo de una fila (requisito 7) solo se ofrece desplegar si
 * `puedeEditarAsistenciaDeCualquiera(rol)`: `asistencia_historial` solo lo lee `administrator`
 * (`003_politicas_rls.sql`) — para `teacher`, la propia fila ya muestra "modificado el ...".
 *
 * Simplificación deliberada: quién registró y quién modificó por última vez se muestran por FECHA,
 * no por nombre — todas las filas de esta pantalla comparten el mismo profesor (el dueño del slot
 * elegido, inmutable), así que "quién registró" ya es el contexto visible (el propio `teacher`, o
 * el profesor elegido por `administrator`); resolver el nombre de quien MODIFICÓ por última vez
 * (que sí podría ser otra persona, p. ej. `administrator` sobre un registro de `teacher`) exigiría
 * otra lectura de `perfil` que un `teacher` no puede hacer para un id que no es el suyo
 * (`perfil_leer_propio`), así que no se intenta.
 */

import type { Rol } from '../dominio/tipos.ts';
import type { Asistencia, AsistenciaHistorial, MotivoJustificacionAusencia } from '../dominio/tipos.ts';
import { ETIQUETA_DIA_SEMANA } from '../dominio/tipos.ts';
import type { SlotConAlumno, AlumnoParaPropuesta } from '../dominio/slots.ts';
import { fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import { slotVigenteEn } from '../dominio/slotHorario.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import type { ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';
import {
  motivoAnulacionValido,
  motivoJustificacionValido,
  MOTIVOS_JUSTIFICACION_AUSENCIA,
  puedeCambiarSlotAtribuido,
  puedeJustificarAusencia,
  puedeMarcarSalida,
  duracionRealMinutos,
  duracionTeoricaMinutos,
} from '../dominio/asistencia.ts';
import { etiquetaMotivoJustificacion } from '../dominio/historicoAsistencia.ts';
import { puedeEditarAsistenciaDeCualquiera } from '../dominio/permisosUi.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { ActualizarAsistenciaEntrada, RegistrarAsistenciaEntrada, RegistrarAusenciaEntrada } from '../datos/asistencia.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento } from './dom.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaRegistrosSlot {
  readonly rol: Rol;
  /** El propio `teacher` (slots fijos, sin selector); ignorado para `administrator`, que elige. */
  readonly profesorId: string;
  readonly reloj: Reloj;
  /** Slot a preseleccionar al abrir (T-22, "mi horario" enlaza directo a los registros de UN slot
   * concreto). Solo tiene efecto para `teacher` (sin selector de profesor: sus slots se cargan de
   * inmediato); para `administrator`, que primero elige profesor, no hay slot que preseleccionar
   * hasta que ese paso ocurra, así que este campo no se usa en ese caso. Si no coincide con ningún
   * slot cargado (p. ej. ha cambiado de horario entre que se generó el enlace y se abrió), se
   * ignora en silencio y la pantalla arranca como siempre: "elige un slot…". */
  readonly slotInicialId?: string;
  /** Solo se llama si `rol === 'administrator'` — quien monta esta pantalla para un `teacher`
   * puede omitirla sin más. */
  listarProfesoresParaSelector?(): Promise<readonly ProfesorParaSelector[]>;
  listarSlotsDeProfesor(profesorId: string): Promise<readonly SlotConAlumno[]>;
  listarRegistros(slotId: string, fecha: Date): Promise<readonly Asistencia[]>;
  listarHistorial(asistenciaId: string): Promise<readonly AsistenciaHistorial[]>;
  obtenerAlumnoParaTarjeta(alumnoId: string): Promise<AlumnoParaPropuesta>;
  buscarAlumnos(texto: string): Promise<readonly ResultadoBusquedaAlumno[]>;
  /** `profesorDuenoId` es el `profesor_id` del registro que se edita — quien llama ya lo conoce
   * (es el mismo para todas las filas de la pantalla: el dueño del slot elegido). */
  actualizar(profesorDuenoId: string, entrada: ActualizarAsistenciaEntrada): Promise<Asistencia>;
  registrarOlvidado(entrada: RegistrarAsistenciaEntrada): Promise<Asistencia>;
  /** Marca ausente al alumno del slot elegido (R-01, requisito 1: "o desde «Registros»") — solo
   * tiene sentido cuando ese alumno todavía no tiene ningún registro ese día, igual que "Añadir
   * registro olvidado"; el propio índice único de la base de datos es quien de verdad lo impide. */
  registrarAusencia(entrada: RegistrarAusenciaEntrada): Promise<Asistencia>;
  generarPeticionId(): string;
}

interface EstadoFila {
  readonly panelAbierto: boolean;
  readonly guardando: boolean;
  readonly error: string;
  readonly nota: string;
  readonly ocurridoEnLocal: string;
  /** Ajustar la salida (R-03, requisito 4) — solo tiene sentido cuando ya hay una salida marcada
   * (`registro.ocurrido_en_salida !== null`); "marcar salida" por primera vez no usa este campo, va
   * directa con la hora real del servidor (sin formulario, un único botón). */
  readonly ocurridoEnSalidaLocal: string;
  readonly textoBusquedaAlumno: string;
  readonly resultadosBusquedaAlumno: readonly ResultadoBusquedaAlumno[];
  readonly candidatoAlumno: ResultadoBusquedaAlumno | null;
  readonly slotDestinoId: string;
  readonly motivoAnulacion: string;
  readonly confirmandoAnular: boolean;
  /** Justificar una ausencia (R-02) — sin confirmación explícita (a diferencia de anular): la spec
   * no la exige, y "editar la nota" (mismo tipo de acción, un único campo que se guarda con un
   * botón) tampoco la lleva. */
  readonly motivoJustificacion: MotivoJustificacionAusencia | '';
  readonly notaJustificacion: string;
  readonly historial: readonly AsistenciaHistorial[] | null;
}

const ESTADO_FILA_INICIAL: EstadoFila = {
  panelAbierto: false,
  guardando: false,
  error: '',
  nota: '',
  ocurridoEnLocal: '',
  ocurridoEnSalidaLocal: '',
  textoBusquedaAlumno: '',
  resultadosBusquedaAlumno: [],
  candidatoAlumno: null,
  slotDestinoId: '',
  motivoAnulacion: '',
  confirmandoAnular: false,
  motivoJustificacion: '',
  notaJustificacion: '',
  historial: null,
};

interface EstadoPantalla {
  readonly profesores: readonly ProfesorParaSelector[];
  readonly profesorSeleccionadoId: string;
  readonly slots: readonly SlotConAlumno[];
  readonly slotSeleccionadoId: string;
  readonly fechaIso: string;
  readonly cargando: boolean;
  readonly error: string;
  readonly registros: readonly Asistencia[];
  readonly nombresAlumno: ReadonlyMap<string, string>;
  readonly filas: ReadonlyMap<string, EstadoFila>;
  readonly olvidadoAbierto: boolean;
  readonly olvidadoHora: string;
  readonly olvidadoNota: string;
  readonly olvidadoGuardando: boolean;
  readonly olvidadoError: string;
  /** R-01: "Marcar ausente" desde Registros, mismo criterio de confirmación explícita que anular
   * (requisito 8 de T-21) — aquí sin motivo, porque R-01 no lo exige. */
  readonly ausenteConfirmando: boolean;
  readonly ausenteGuardando: boolean;
  readonly ausenteError: string;
}

/** `HH:MM` a partir de un `timestamptz` de PostgREST, en la zona horaria del centro — para
 * prellenar los campos de hora de los formularios de esta pantalla. */
function horaLocalHHMM(iso: string, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zonaHoraria, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  );
}

/** Reconstruye un instante UTC a partir de una fecha `AAAA-MM-DD` y una hora `HH:MM`, ambas en la
 * zona horaria del centro — el inverso aproximado de `horaLocalHHMM`/`fechaLocalISO`, suficiente
 * para un formulario (el usuario nunca elige un instante en el filo exacto de un cambio de hora). */
function instanteDesdeFechaYHora(fechaIso: string, horaHHMM: string, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): Date {
  const candidato = new Date(`${fechaIso}T${horaHHMM}:00`);
  const enZona = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(candidato);
  const comoUtc = new Date(`${enZona.replace(', ', 'T')}Z`);
  return new Date(candidato.getTime() + (candidato.getTime() - comoUtc.getTime()));
}

function formatearFechaHora(iso: string, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): string {
  return new Intl.DateTimeFormat('es', {
    timeZone: zonaHoraria,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Frase de la columna de detalle con la salida y la duración (R-03, requisito 3: "junto a la
 * duración teórica del slot"), vacía si todavía no hay salida marcada — mismo criterio de "leer solo
 * el snapshot de la propia fila" que el resto de esta pantalla. */
function textoSalida(registro: Asistencia, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): string {
  if (!registro.ocurrido_en_salida) {
    return '';
  }
  const real = duracionRealMinutos(new Date(registro.ocurrido_en), new Date(registro.ocurrido_en_salida));
  const teorica =
    registro.slot_hora_inicio && registro.slot_hora_fin ? duracionTeoricaMinutos(registro.slot_hora_inicio, registro.slot_hora_fin) : null;
  const duracion = teorica === null ? `${String(real)} min` : `${String(real)} min (teórica ${String(teorica)} min)`;
  return ` Salida a las ${formatearFechaHora(registro.ocurrido_en_salida, zonaHoraria)}. Duración real: ${duracion}.`;
}

export function mostrarPantallaRegistrosSlot(contenedor: HTMLElement, deps: DependenciasPantallaRegistrosSlot): void {
  const documento = contenedor.ownerDocument;

  if (deps.rol !== 'teacher' && deps.rol !== 'administrator') {
    contenedor.textContent = '';
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const puedeElegirProfesor = puedeEditarAsistenciaDeCualquiera(deps.rol);
  const almacen = crearAlmacenEstado<EstadoPantalla>({
    profesores: [],
    profesorSeleccionadoId: puedeElegirProfesor ? '' : deps.profesorId,
    slots: [],
    slotSeleccionadoId: '',
    fechaIso: fechaLocalISO(deps.reloj.ahora()),
    cargando: false,
    error: '',
    registros: [],
    nombresAlumno: new Map(),
    filas: new Map(),
    olvidadoAbierto: false,
    olvidadoHora: '',
    olvidadoNota: '',
    olvidadoGuardando: false,
    olvidadoError: '',
    ausenteConfirmando: false,
    ausenteGuardando: false,
    ausenteError: '',
  });

  function actualizarFila(id: string, cambios: Partial<EstadoFila>): void {
    const actual = almacen.obtener();
    const filaActual = actual.filas.get(id) ?? ESTADO_FILA_INICIAL;
    const filas = new Map(actual.filas);
    filas.set(id, { ...filaActual, ...cambios });
    almacen.actualizar({ filas });
  }

  async function nombreParaAlumno(alumnoId: string, nombresConocidos: ReadonlyMap<string, string>): Promise<string> {
    const conocido = nombresConocidos.get(alumnoId);
    if (conocido !== undefined) {
      return conocido;
    }
    try {
      const alumno = await deps.obtenerAlumnoParaTarjeta(alumnoId);
      return nombreCompletoAlumno(alumno);
    } catch {
      return 'Alumno';
    }
  }

  async function cargarRegistros(): Promise<void> {
    const { slotSeleccionadoId, fechaIso, slots } = almacen.obtener();
    if (!slotSeleccionadoId) {
      almacen.actualizar({ registros: [], filas: new Map() });
      return;
    }
    almacen.actualizar({ cargando: true, error: '' });
    try {
      const fecha = new Date(`${fechaIso}T12:00:00Z`);
      const registros = await deps.listarRegistros(slotSeleccionadoId, fecha);
      const slotElegido = slots.find((s) => s.id === slotSeleccionadoId);
      const nombresBase = new Map<string, string>();
      if (slotElegido) {
        nombresBase.set(slotElegido.alumno_id, nombreCompletoAlumno(slotElegido.alumno));
      }
      const idsDesconocidos = [...new Set(registros.map((r) => r.alumno_id))].filter((id) => !nombresBase.has(id));
      const resueltos = await Promise.all(idsDesconocidos.map(async (id) => [id, await nombreParaAlumno(id, nombresBase)] as const));
      const nombresAlumno = new Map(nombresBase);
      for (const [id, nombre] of resueltos) {
        nombresAlumno.set(id, nombre);
      }
      almacen.actualizar({ registros, nombresAlumno, cargando: false, filas: new Map() });
    } catch (error) {
      almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
    }
  }

  async function cargarSlots(profesorId: string): Promise<void> {
    almacen.actualizar({ cargando: true, error: '', slots: [], slotSeleccionadoId: '', registros: [], filas: new Map() });
    try {
      const slots = await deps.listarSlotsDeProfesor(profesorId);
      const slotPreseleccionado = deps.slotInicialId && slots.some((slot) => slot.id === deps.slotInicialId) ? deps.slotInicialId : '';
      almacen.actualizar({ slots, cargando: false, slotSeleccionadoId: slotPreseleccionado });
      if (slotPreseleccionado) {
        await cargarRegistros();
      }
    } catch (error) {
      almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
    }
  }

  function reemplazarRegistro(fila: Asistencia): void {
    const actual = almacen.obtener();
    const yaEstaba = actual.registros.some((r) => r.id === fila.id);
    const registros = yaEstaba ? actual.registros.map((r) => (r.id === fila.id ? fila : r)) : [...actual.registros, fila];
    almacen.actualizar({ registros });
  }

  // --- Cabecera: selector de profesor (solo administrator), selector de slot y de fecha ----------

  const cabecera = crearElemento(documento, 'div');
  const tituloPantalla = crearElemento(documento, 'h2', { texto: 'Registros' });
  cabecera.append(tituloPantalla);

  let selectProfesor: HTMLSelectElement | null = null;
  if (puedeElegirProfesor) {
    const etiquetaProfesor = crearElemento(documento, 'label', { texto: 'Profesor', atributos: { for: 'registros-profesor' } });
    selectProfesor = documento.createElement('select');
    selectProfesor.id = 'registros-profesor';
    const opcionVacia = crearElemento(documento, 'option', { texto: 'Elige un profesor…', atributos: { value: '' } });
    selectProfesor.append(opcionVacia);
    selectProfesor.addEventListener('change', () => {
      const id = selectProfesor?.value ?? '';
      almacen.actualizar({ profesorSeleccionadoId: id });
      if (id) {
        void cargarSlots(id);
      } else {
        almacen.actualizar({ slots: [], slotSeleccionadoId: '', registros: [], filas: new Map() });
      }
    });
    cabecera.append(etiquetaProfesor, selectProfesor);
  }

  const etiquetaSlot = crearElemento(documento, 'label', { texto: 'Slot', atributos: { for: 'registros-slot' } });
  const selectSlot = documento.createElement('select');
  selectSlot.id = 'registros-slot';
  selectSlot.disabled = true;
  selectSlot.addEventListener('change', () => {
    almacen.actualizar({ slotSeleccionadoId: selectSlot.value });
    void cargarRegistros();
  });
  cabecera.append(etiquetaSlot, selectSlot);

  const etiquetaFecha = crearElemento(documento, 'label', { texto: 'Fecha', atributos: { for: 'registros-fecha' } });
  const campoFecha = documento.createElement('input');
  campoFecha.type = 'date';
  campoFecha.id = 'registros-fecha';
  campoFecha.value = almacen.obtener().fechaIso;
  campoFecha.addEventListener('change', () => {
    if (campoFecha.value) {
      almacen.actualizar({ fechaIso: campoFecha.value });
      void cargarRegistros();
    }
  });
  cabecera.append(etiquetaFecha, campoFecha);

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaEstado = crearZonaMensaje(documento, 'status');
  cabecera.append(zonaError, zonaEstado);

  const listaRegistros = crearElemento(documento, 'ul', { atributos: { 'aria-label': 'Registros del slot y día elegidos' } });
  listaRegistros.style.listStyle = 'none';
  listaRegistros.style.padding = '0';

  const zonaOlvidado = crearElemento(documento, 'div');

  contenedor.append(cabecera, zonaOlvidado, listaRegistros);

  // --- Panel de edición de una fila ---------------------------------------------------------------

  function pintarPanelEdicion(li: HTMLElement, registro: Asistencia, filaEstado: EstadoFila, slotsDelAlumno: readonly SlotConAlumno[]): void {
    const panel = crearElemento(documento, 'div');
    const puedeCambiarSlot = puedeCambiarSlotAtribuido(registro);

    if (filaEstado.error) {
      const mensaje = crearZonaMensaje(documento, 'alert');
      mensaje.textContent = filaEstado.error;
      panel.append(mensaje);
    }

    async function ejecutar(entrada: ActualizarAsistenciaEntrada): Promise<void> {
      actualizarFila(registro.id, { guardando: true, error: '' });
      try {
        const fila = await deps.actualizar(registro.profesor_id, entrada);
        reemplazarRegistro(fila);
        actualizarFila(registro.id, {
          guardando: false,
          nota: '',
          candidatoAlumno: null,
          textoBusquedaAlumno: '',
          resultadosBusquedaAlumno: [],
          confirmandoAnular: false,
          motivoAnulacion: '',
          motivoJustificacion: '',
          notaJustificacion: '',
        });
      } catch (error) {
        actualizarFila(registro.id, { guardando: false, error: mensajeAmigable(error) });
      }
    }

    // Editar la nota.
    const bloqueNota = crearElemento(documento, 'div');
    const campoNota = crearCampoTexto(documento, `nota-${registro.id}`, 'Nota', 'text', 'off');
    campoNota.input.required = false;
    campoNota.input.value = filaEstado.nota || (registro.nota ?? '');
    campoNota.input.addEventListener('input', () => {
      actualizarFila(registro.id, { nota: campoNota.input.value });
    });
    const botonGuardarNota = crearBoton(documento, 'Guardar nota', 'button');
    botonGuardarNota.disabled = filaEstado.guardando;
    botonGuardarNota.addEventListener('click', () => {
      void ejecutar({ asistenciaId: registro.id, nota: campoNota.input.value, notaProvista: true });
    });
    bloqueNota.append(campoNota.contenedor, botonGuardarNota);
    panel.append(bloqueNota);

    // Ajustar la hora.
    const bloqueHora = crearElemento(documento, 'div');
    const etiquetaHora = crearElemento(documento, 'label', { texto: 'Hora', atributos: { for: `hora-${registro.id}` } });
    const campoHora = documento.createElement('input');
    campoHora.type = 'time';
    campoHora.id = `hora-${registro.id}`;
    campoHora.value = filaEstado.ocurridoEnLocal || horaLocalHHMM(registro.ocurrido_en);
    campoHora.addEventListener('input', () => {
      actualizarFila(registro.id, { ocurridoEnLocal: campoHora.value });
    });
    const botonGuardarHora = crearBoton(documento, 'Guardar hora', 'button');
    botonGuardarHora.disabled = filaEstado.guardando;
    botonGuardarHora.addEventListener('click', () => {
      const fechaDelRegistro = fechaLocalISO(new Date(registro.ocurrido_en));
      void ejecutar({ asistenciaId: registro.id, ocurridoEn: instanteDesdeFechaYHora(fechaDelRegistro, campoHora.value) });
    });
    bloqueHora.append(etiquetaHora, campoHora, botonGuardarHora);
    panel.append(bloqueHora);

    // Salida (R-03): "marcar" (primer toque, un único botón, hora real del servidor — sin campo que
    // rellenar) o "ajustar" (una salida ya marcada, mismo patrón que "Ajustar la hora" de arriba)
    // — nunca las dos cosas ofrecidas a la vez, ver puedeMarcarSalida.
    const bloqueSalida = crearElemento(documento, 'div');
    if (puedeMarcarSalida(registro)) {
      const botonMarcarSalida = crearBoton(documento, 'Marcar salida', 'button');
      botonMarcarSalida.disabled = filaEstado.guardando;
      botonMarcarSalida.addEventListener('click', () => {
        void ejecutar({ asistenciaId: registro.id, marcarSalida: true });
      });
      bloqueSalida.append(botonMarcarSalida);
    } else if (registro.ocurrido_en_salida) {
      const etiquetaSalida = crearElemento(documento, 'label', { texto: 'Salida', atributos: { for: `salida-${registro.id}` } });
      const campoSalida = documento.createElement('input');
      campoSalida.type = 'time';
      campoSalida.id = `salida-${registro.id}`;
      campoSalida.value = filaEstado.ocurridoEnSalidaLocal || horaLocalHHMM(registro.ocurrido_en_salida);
      campoSalida.addEventListener('input', () => {
        actualizarFila(registro.id, { ocurridoEnSalidaLocal: campoSalida.value });
      });
      const botonGuardarSalida = crearBoton(documento, 'Guardar salida', 'button');
      botonGuardarSalida.disabled = filaEstado.guardando;
      botonGuardarSalida.addEventListener('click', () => {
        const fechaDelRegistro = fechaLocalISO(new Date(registro.ocurrido_en_salida ?? registro.ocurrido_en));
        void ejecutar({ asistenciaId: registro.id, ocurridoEnSalida: instanteDesdeFechaYHora(fechaDelRegistro, campoSalida.value) });
      });
      bloqueSalida.append(etiquetaSalida, campoSalida, botonGuardarSalida);
    }
    panel.append(bloqueSalida);

    // Cambiar el slot atribuido (solo si tiene sentido: registro de origen "slot").
    if (puedeCambiarSlot) {
      const bloqueSlot = crearElemento(documento, 'div');
      const etiquetaSlotDestino = crearElemento(documento, 'label', { texto: 'Cambiar el slot atribuido', atributos: { for: `slot-${registro.id}` } });
      const selectSlotDestino = documento.createElement('select');
      selectSlotDestino.id = `slot-${registro.id}`;
      const candidatos = slotsDelAlumno.filter((s) => s.id !== registro.slot_id);
      for (const candidato of candidatos) {
        selectSlotDestino.append(
          crearElemento(documento, 'option', {
            texto: `${ETIQUETA_DIA_SEMANA[candidato.dia_semana]} ${candidato.hora_inicio}–${candidato.hora_fin}`,
            atributos: { value: candidato.id },
          }),
        );
      }
      const botonCambiarSlot = crearBoton(documento, 'Cambiar slot', 'button');
      botonCambiarSlot.disabled = filaEstado.guardando || candidatos.length === 0;
      botonCambiarSlot.addEventListener('click', () => {
        if (selectSlotDestino.value) {
          void ejecutar({ asistenciaId: registro.id, slotId: selectSlotDestino.value });
        }
      });
      bloqueSlot.append(etiquetaSlotDestino, selectSlotDestino, botonCambiarSlot);
      panel.append(bloqueSlot);
    }

    // Cambiar el alumno — búsqueda + confirmación explícita (requisito 8).
    const bloqueAlumno = crearElemento(documento, 'div');
    if (filaEstado.candidatoAlumno) {
      const confirmacion = crearElemento(documento, 'p', {
        texto: `¿Cambiar el alumno? Antes: ${almacen.obtener().nombresAlumno.get(registro.alumno_id) ?? 'alumno actual'}. Nuevo: ${nombreCompletoAlumno(filaEstado.candidatoAlumno)}.`,
      });
      const botonConfirmarAlumno = crearBoton(documento, 'Confirmar cambio de alumno', 'button');
      botonConfirmarAlumno.disabled = filaEstado.guardando;
      botonConfirmarAlumno.addEventListener('click', () => {
        const candidato = filaEstado.candidatoAlumno;
        if (candidato) {
          void ejecutar({ asistenciaId: registro.id, alumnoId: candidato.id });
        }
      });
      const botonCancelarAlumno = crearBoton(documento, 'Cancelar', 'button');
      botonCancelarAlumno.addEventListener('click', () => {
        actualizarFila(registro.id, { candidatoAlumno: null });
      });
      bloqueAlumno.append(confirmacion, botonConfirmarAlumno, botonCancelarAlumno);
    } else {
      const campoBusquedaAlumno = crearCampoTexto(documento, `buscar-alumno-${registro.id}`, 'Cambiar el alumno (buscar)', 'text', 'off');
      campoBusquedaAlumno.input.required = false;
      campoBusquedaAlumno.input.value = filaEstado.textoBusquedaAlumno;
      campoBusquedaAlumno.input.addEventListener('input', () => {
        actualizarFila(registro.id, { textoBusquedaAlumno: campoBusquedaAlumno.input.value });
      });
      const botonBuscarAlumno = crearBoton(documento, 'Buscar', 'button');
      botonBuscarAlumno.addEventListener('click', () => {
        void deps.buscarAlumnos(campoBusquedaAlumno.input.value).then((resultados) => {
          actualizarFila(registro.id, { resultadosBusquedaAlumno: resultados });
        });
      });
      bloqueAlumno.append(campoBusquedaAlumno.contenedor, botonBuscarAlumno);

      if (filaEstado.resultadosBusquedaAlumno.length > 0) {
        const listaResultados = crearElemento(documento, 'ul');
        listaResultados.style.listStyle = 'none';
        for (const resultado of filaEstado.resultadosBusquedaAlumno) {
          const item = documento.createElement('li');
          const botonResultado = crearBoton(documento, nombreCompletoAlumno(resultado), 'button');
          botonResultado.addEventListener('click', () => {
            actualizarFila(registro.id, { candidatoAlumno: resultado, resultadosBusquedaAlumno: [] });
          });
          item.append(botonResultado);
          listaResultados.append(item);
        }
        bloqueAlumno.append(listaResultados);
      }
    }
    panel.append(bloqueAlumno);

    // Anular — motivo obligatorio + confirmación explícita (requisito 8), salvo si ya está anulada.
    if (registro.estado !== 'anulada') {
      const bloqueAnular = crearElemento(documento, 'div');
      if (filaEstado.confirmandoAnular) {
        const confirmacion = crearElemento(documento, 'p', { texto: `¿Anular este registro? Motivo: "${filaEstado.motivoAnulacion}".` });
        const botonConfirmarAnular = crearBoton(documento, 'Confirmar anulación', 'button');
        botonConfirmarAnular.disabled = filaEstado.guardando;
        botonConfirmarAnular.addEventListener('click', () => {
          void ejecutar({ asistenciaId: registro.id, anular: true, motivoAnulacion: filaEstado.motivoAnulacion });
        });
        const botonCancelarAnular = crearBoton(documento, 'Cancelar', 'button');
        botonCancelarAnular.addEventListener('click', () => {
          actualizarFila(registro.id, { confirmandoAnular: false });
        });
        bloqueAnular.append(confirmacion, botonConfirmarAnular, botonCancelarAnular);
      } else {
        const campoMotivo = crearCampoTexto(documento, `motivo-${registro.id}`, 'Motivo de la anulación', 'text', 'off');
        campoMotivo.input.value = filaEstado.motivoAnulacion;
        campoMotivo.input.addEventListener('input', () => {
          actualizarFila(registro.id, { motivoAnulacion: campoMotivo.input.value });
        });
        const botonAnular = crearBoton(documento, 'Anular', 'button');
        botonAnular.disabled = !motivoAnulacionValido(campoMotivo.input.value);
        botonAnular.addEventListener('click', () => {
          actualizarFila(registro.id, { confirmandoAnular: true });
        });
        bloqueAnular.append(campoMotivo.contenedor, botonAnular);
      }
      panel.append(bloqueAnular);
    }

    // Justificar (R-02): solo tiene sentido sobre una ausencia. Sin confirmación explícita — un
    // único campo obligatorio (motivo) más uno opcional (nota), como el bloque de "Editar la nota".
    if (puedeJustificarAusencia(registro)) {
      const bloqueJustificar = crearElemento(documento, 'div');
      const motivoActual = filaEstado.motivoJustificacion || (registro.motivo_justificacion ?? '');
      const etiquetaMotivo = crearElemento(documento, 'label', {
        texto: 'Motivo de la justificación',
        atributos: { for: `motivo-justificacion-${registro.id}` },
      });
      const selectMotivo = documento.createElement('select');
      selectMotivo.id = `motivo-justificacion-${registro.id}`;
      selectMotivo.append(crearElemento(documento, 'option', { texto: 'Sin justificar', atributos: { value: '' } }));
      for (const motivo of MOTIVOS_JUSTIFICACION_AUSENCIA) {
        selectMotivo.append(
          crearElemento(documento, 'option', { texto: etiquetaMotivoJustificacion(motivo), atributos: { value: motivo } }),
        );
      }
      selectMotivo.value = motivoActual;
      selectMotivo.addEventListener('change', () => {
        actualizarFila(registro.id, { motivoJustificacion: selectMotivo.value as MotivoJustificacionAusencia | '' });
      });
      const campoNotaJustificacion = crearCampoTexto(
        documento,
        `nota-justificacion-${registro.id}`,
        'Nota de la justificación (opcional)',
        'text',
        'off',
      );
      campoNotaJustificacion.input.required = false;
      campoNotaJustificacion.input.value = filaEstado.notaJustificacion || (registro.nota_justificacion ?? '');
      campoNotaJustificacion.input.addEventListener('input', () => {
        actualizarFila(registro.id, { notaJustificacion: campoNotaJustificacion.input.value });
      });
      const botonJustificar = crearBoton(documento, 'Guardar justificación', 'button');
      botonJustificar.disabled = filaEstado.guardando || !motivoJustificacionValido(selectMotivo.value || null);
      botonJustificar.addEventListener('click', () => {
        const motivo = selectMotivo.value;
        if (motivoJustificacionValido(motivo || null)) {
          void ejecutar({
            asistenciaId: registro.id,
            justificar: true,
            motivoJustificacion: motivo as MotivoJustificacionAusencia,
            notaJustificacion: campoNotaJustificacion.input.value || null,
          });
        }
      });
      bloqueJustificar.append(etiquetaMotivo, selectMotivo, campoNotaJustificacion.contenedor, botonJustificar);
      panel.append(bloqueJustificar);
    }

    // Historial completo (requisito 7): solo administrator.
    if (puedeElegirProfesor) {
      const bloqueHistorial = crearElemento(documento, 'div');
      const botonHistorial = crearBoton(documento, filaEstado.historial ? 'Ocultar historial' : 'Ver historial', 'button');
      botonHistorial.addEventListener('click', () => {
        if (filaEstado.historial) {
          actualizarFila(registro.id, { historial: null });
          return;
        }
        void deps.listarHistorial(registro.id).then((historial) => {
          actualizarFila(registro.id, { historial });
        });
      });
      bloqueHistorial.append(botonHistorial);
      if (filaEstado.historial) {
        const listaHistorial = crearElemento(documento, 'ul');
        for (const version of filaEstado.historial) {
          listaHistorial.append(
            crearElemento(documento, 'li', {
              texto: `${formatearFechaHora(version.cambiado_en)} — hora atribuida: ${formatearFechaHora(version.ocurrido_en)}, estado: ${version.estado}, nota: ${version.nota ?? '(sin nota)'}`,
            }),
          );
        }
        bloqueHistorial.append(listaHistorial);
      }
      panel.append(bloqueHistorial);
    }

    li.append(panel);
  }

  // --- Lista de registros --------------------------------------------------------------------------

  function pintarLista(): void {
    const estado = almacen.obtener();
    listaRegistros.textContent = '';

    for (const registro of estado.registros) {
      const li = documento.createElement('li');
      li.dataset.registroId = registro.id;

      const nombreAlumno = estado.nombresAlumno.get(registro.alumno_id) ?? 'Alumno';
      const sufijoEstado =
        registro.estado === 'anulada'
          ? ' (anulada)'
          : registro.estado === 'ausente'
            ? registro.motivo_justificacion
              ? ' (ausente, justificada)'
              : ' (ausente)'
            : '';
      const lineaTexto = [
        `${nombreAlumno}${sufijoEstado}`,
        formatearFechaHora(registro.ocurrido_en),
        registro.origen === 'slot' ? 'por horario' : 'extra',
        registro.es_retroactivo ? 'retroactivo' : null,
      ]
        .filter((parte): parte is string => parte !== null)
        .join(' · ');

      const info = crearElemento(documento, 'span', { texto: lineaTexto });
      if (registro.estado === 'anulada') {
        info.style.textDecoration = 'line-through';
      }
      li.append(info);

      const detalle = crearElemento(documento, 'p', {
        texto: `Registrado el ${formatearFechaHora(registro.registrado_en)}.${
          registro.actualizado_en ? ` Modificado el ${formatearFechaHora(registro.actualizado_en)}.` : ''
        }${registro.motivo_anulacion ? ` Motivo de anulación: ${registro.motivo_anulacion}.` : ''}${
          registro.motivo_justificacion
            ? ` Justificación: ${etiquetaMotivoJustificacion(registro.motivo_justificacion)}.${
                registro.nota_justificacion ? ` ${registro.nota_justificacion}` : ''
              }`
            : ''
        }${textoSalida(registro)}`,
      });
      li.append(detalle);

      const filaEstado = estado.filas.get(registro.id) ?? ESTADO_FILA_INICIAL;
      const botonEditar = crearBoton(documento, filaEstado.panelAbierto ? 'Cerrar' : 'Editar', 'button');
      botonEditar.addEventListener('click', () => {
        actualizarFila(registro.id, { panelAbierto: !filaEstado.panelAbierto });
      });
      li.append(botonEditar);

      if (filaEstado.panelAbierto) {
        const slotsDelAlumno = estado.slots.filter((s) => s.alumno_id === registro.alumno_id);
        pintarPanelEdicion(li, registro, filaEstado, slotsDelAlumno);
      }

      listaRegistros.append(li);
    }
  }

  // --- Añadir un registro olvidado (requisito 4, sexto punto) ---------------------------------------

  /** "Marcar ausente" (R-01, requisito 1: "o desde «Registros»"), junto a "Añadir registro
   * olvidado": mismo alumno del slot elegido, mismo criterio de confirmación explícita que anular
   * (requisito 8 de T-21), pero sin motivo obligatorio — R-01 no lo exige. Vive en la misma zona
   * (`zonaOlvidado`) que "Añadir registro olvidado" porque las dos son la única forma de cerrar el
   * hueco de un alumno del slot que todavía no tiene ningún registro ese día; el propio índice
   * único de la base de datos (`asistencia_uq_alumno_slot_dia_activa`) es quien de verdad impide
   * marcar ausente a quien ya tiene una fila. */
  function pintarAusente(contenedorAcciones: HTMLElement, slotElegido: SlotConAlumno, estado: EstadoPantalla): void {
    if (!estado.ausenteConfirmando) {
      const botonAusente = crearBoton(documento, 'Marcar ausente', 'button');
      botonAusente.addEventListener('click', () => {
        almacen.actualizar({ ausenteConfirmando: true, ausenteError: '' });
      });
      contenedorAcciones.append(botonAusente);
      return;
    }

    if (estado.ausenteError) {
      const mensaje = crearZonaMensaje(documento, 'alert');
      mensaje.textContent = estado.ausenteError;
      contenedorAcciones.append(mensaje);
    }
    const confirmacion = crearElemento(documento, 'p', {
      texto: `¿Marcar ausente a ${nombreCompletoAlumno(slotElegido.alumno)} el ${estado.fechaIso}?`,
    });
    const botonConfirmarAusente = crearBoton(documento, 'Confirmar ausencia', 'button');
    botonConfirmarAusente.disabled = estado.ausenteGuardando;
    botonConfirmarAusente.addEventListener('click', () => {
      void (async () => {
        almacen.actualizar({ ausenteGuardando: true, ausenteError: '' });
        try {
          const fila = await deps.registrarAusencia({
            alumnoId: slotElegido.alumno_id,
            slotId: slotElegido.id,
            peticionId: deps.generarPeticionId(),
            ocurridoEn: instanteDesdeFechaYHora(estado.fechaIso, slotElegido.hora_inicio),
          });
          reemplazarRegistro(fila);
          const nombresAlumno = new Map(almacen.obtener().nombresAlumno);
          nombresAlumno.set(fila.alumno_id, nombreCompletoAlumno(slotElegido.alumno));
          almacen.actualizar({ ausenteConfirmando: false, ausenteGuardando: false, nombresAlumno });
        } catch (error) {
          almacen.actualizar({ ausenteGuardando: false, ausenteError: mensajeAmigable(error) });
        }
      })();
    });
    const botonCancelarAusente = crearBoton(documento, 'Cancelar', 'button');
    botonCancelarAusente.addEventListener('click', () => {
      almacen.actualizar({ ausenteConfirmando: false, ausenteError: '' });
    });
    contenedorAcciones.append(confirmacion, botonConfirmarAusente, botonCancelarAusente);
  }

  function pintarOlvidado(): void {
    const estado = almacen.obtener();
    zonaOlvidado.textContent = '';
    const slotElegido = estado.slots.find((s) => s.id === estado.slotSeleccionadoId);
    if (!slotElegido) {
      return;
    }

    if (!estado.olvidadoAbierto) {
      const acciones = crearElemento(documento, 'div');
      const botonOlvidado = crearBoton(documento, 'Añadir registro olvidado', 'button');
      botonOlvidado.addEventListener('click', () => {
        almacen.actualizar({ olvidadoAbierto: true, olvidadoHora: slotElegido.hora_inicio, olvidadoError: '' });
      });
      acciones.append(botonOlvidado);
      pintarAusente(acciones, slotElegido, estado);
      zonaOlvidado.append(acciones);
      return;
    }

    const formulario = crearElemento(documento, 'div');
    const titulo = crearElemento(documento, 'p', {
      texto: `Añadir registro olvidado para ${nombreCompletoAlumno(slotElegido.alumno)} el ${estado.fechaIso}.`,
    });
    const etiquetaHora = crearElemento(documento, 'label', { texto: 'Hora', atributos: { for: 'olvidado-hora' } });
    const campoHora = documento.createElement('input');
    campoHora.type = 'time';
    campoHora.id = 'olvidado-hora';
    campoHora.value = estado.olvidadoHora;
    campoHora.addEventListener('input', () => {
      almacen.actualizar({ olvidadoHora: campoHora.value });
    });
    const campoNota = crearCampoTexto(documento, 'olvidado-nota', 'Nota (opcional)', 'text', 'off');
    campoNota.input.required = false;
    campoNota.input.value = estado.olvidadoNota;
    campoNota.input.addEventListener('input', () => {
      almacen.actualizar({ olvidadoNota: campoNota.input.value });
    });
    if (estado.olvidadoError) {
      const mensaje = crearZonaMensaje(documento, 'alert');
      mensaje.textContent = estado.olvidadoError;
      formulario.append(mensaje);
    }
    const botonRegistrar = crearBoton(documento, 'Registrar', 'button');
    botonRegistrar.disabled = estado.olvidadoGuardando;
    botonRegistrar.addEventListener('click', () => {
      void (async () => {
        almacen.actualizar({ olvidadoGuardando: true, olvidadoError: '' });
        try {
          const fila = await deps.registrarOlvidado({
            alumnoId: slotElegido.alumno_id,
            origen: 'slot',
            slotId: slotElegido.id,
            peticionId: deps.generarPeticionId(),
            ocurridoEn: instanteDesdeFechaYHora(estado.fechaIso, campoHora.value),
            nota: campoNota.input.value.trim() || null,
          });
          reemplazarRegistro(fila);
          const nombresAlumno = new Map(almacen.obtener().nombresAlumno);
          nombresAlumno.set(fila.alumno_id, nombreCompletoAlumno(slotElegido.alumno));
          almacen.actualizar({
            olvidadoAbierto: false,
            olvidadoHora: '',
            olvidadoNota: '',
            olvidadoGuardando: false,
            nombresAlumno,
          });
        } catch (error) {
          almacen.actualizar({ olvidadoGuardando: false, olvidadoError: mensajeAmigable(error) });
        }
      })();
    });
    const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
    botonCancelar.addEventListener('click', () => {
      almacen.actualizar({ olvidadoAbierto: false, olvidadoError: '' });
    });

    formulario.append(titulo, etiquetaHora, campoHora, campoNota.contenedor, botonRegistrar, botonCancelar);
    zonaOlvidado.append(formulario);
  }

  // --- Repintado de la cabecera (selectores) --------------------------------------------------------

  function pintarCabecera(): void {
    const estado = almacen.obtener();

    if (selectProfesor) {
      const opciones = [...selectProfesor.querySelectorAll('option')].map((o) => o.value);
      const necesarias = ['', ...estado.profesores.map((p) => p.id)];
      if (opciones.length !== necesarias.length) {
        selectProfesor.textContent = '';
        selectProfesor.append(crearElemento(documento, 'option', { texto: 'Elige un profesor…', atributos: { value: '' } }));
        for (const profesor of estado.profesores) {
          selectProfesor.append(crearElemento(documento, 'option', { texto: profesor.nombre, atributos: { value: profesor.id } }));
        }
      }
      selectProfesor.value = estado.profesorSeleccionadoId;
    }

    const fechaSeleccionada = new Date(`${estado.fechaIso}T12:00:00Z`);
    // `estado.slots.filter(...)` en vez de `slotsVigentesEn(estado.slots, fecha)`: esa función está
    // tipada sobre `SlotHorario[]` y devolvería esa misma forma, perdiendo `.alumno` — el filtro
    // directo conserva `SlotConAlumno[]`, que el selector necesita para el nombre del alumno.
    const slotsVigentesEseDia = estado.slots.filter((slot) => slotVigenteEn(slot, fechaSeleccionada));
    selectSlot.disabled = slotsVigentesEseDia.length === 0;
    selectSlot.textContent = '';
    if (slotsVigentesEseDia.length === 0) {
      selectSlot.append(crearElemento(documento, 'option', { texto: 'Sin slots ese día', atributos: { value: '' } }));
    } else {
      selectSlot.append(crearElemento(documento, 'option', { texto: 'Elige un slot…', atributos: { value: '' } }));
      for (const slot of slotsVigentesEseDia) {
        selectSlot.append(
          crearElemento(documento, 'option', {
            texto: `${ETIQUETA_DIA_SEMANA[slot.dia_semana]} ${slot.hora_inicio}–${slot.hora_fin} — ${nombreCompletoAlumno(slot.alumno)}`,
            atributos: { value: slot.id },
          }),
        );
      }
    }
    selectSlot.value = estado.slotSeleccionadoId;

    zonaError.textContent = estado.error;
    zonaEstado.textContent = estado.cargando ? 'Cargando…' : '';
  }

  almacen.suscribir(() => {
    pintarCabecera();
    pintarOlvidado();
    pintarLista();
  });
  pintarCabecera();
  pintarOlvidado();
  pintarLista();

  if (puedeElegirProfesor) {
    void (deps.listarProfesoresParaSelector?.() ?? Promise.resolve([])).then((profesores) => {
      almacen.actualizar({ profesores });
    });
  } else {
    void cargarSlots(deps.profesorId);
  }
}
