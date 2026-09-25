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
 *
 * **Alta de una sesión de grupo (R-27):** acción de nivel de pantalla, no de una sesión existente —
 * el administrador elige día/hora/profesor/asignatura una sola vez y selecciona varios alumnos ya
 * existentes con el mismo buscador de T-20 (`comboboxAlumnoExtra.ts`, con `mostrarNota: false`: un
 * motivo por alumno no tiene sentido aquí). Al confirmar, llama a `crearSlot` (T-15) una vez por
 * alumno elegido — mismo patrón de "reintento solo con quien falló" que la edición/cese en bloque de
 * arriba: un solape del propio alumno rechaza SOLO su alta (requisito 4), el resto del grupo se crea
 * con normalidad. Un alumno ya elegido no puede repetirse en la selección (requisito 5).
 *
 * **Botón «Imprimir horario» (R-32):** mismo mecanismo de ventana de impresión ya construido por
 * R-04/R-15 (`AbridorVentanaImpresion`, `window.open` con una tabla HTML propia, sin librería de
 * terceros ni PDF), sobre las MISMAS `sesiones` que la pantalla ya tiene en memoria en el momento de
 * imprimir — sin ninguna petición de red adicional (requisito 4). Una fila por sesión con día, hora,
 * asignatura/grupo, profesor y los nombres de sus alumnos separados por coma — nunca su fotografía
 * (requisito 1, mismo criterio que el resto de la pantalla).
 */

import { ETIQUETA_DIA_SEMANA, type Rol, type DiaSemana } from '../dominio/tipos.ts';
import { puedeGestionarHorarios } from '../dominio/permisosUi.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { sesionesVigentesDelCentro, claveSesionHorarioCentro, type SesionHorarioCentro } from '../dominio/horarioCentro.ts';
import { fechaLocalISO, fechaHoraLocalLegible, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import type { SlotConAlumno } from '../dominio/slots.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';
import type { CambiosSlot, DatosNuevoSlot, ResultadoEscrituraSlot } from '../datos/slotsHorario.ts';
import type { SlotHorario } from '../dominio/tipos.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { Rebote } from '../nucleo/rebote.ts';
import type { ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton, crearMensajeErrorCampo } from './formularios.ts';
import { crearElemento, type AbridorVentanaImpresion } from './dom.ts';
import { montarComboboxAlumnoExtra } from './comboboxAlumnoExtra.ts';
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
  /** Alta de sesión de grupo (R-27): `crearSlot` (T-15), llamada una vez por alumno elegido, sin
   * ninguna RPC nueva. */
  crearSlot(datos: DatosNuevoSlot): Promise<ResultadoEscrituraSlot>;
  /** Mismo buscador de T-20 (`buscar_alumnos_activos`), reutilizado aquí en modo de selección
   * múltiple (R-27, requisito 2). */
  buscarAlumnos(texto: string, señal?: AbortSignal): Promise<readonly ResultadoBusquedaAlumno[]>;
  /** Fábrica NUEVA por montaje de pantalla (`crearRebote()`), nunca compartida con otra pantalla —
   * mismo criterio que el resto de consumidores de `comboboxAlumnoExtra.ts`. */
  readonly rebote: Rebote;
  /** R-32: abre la ventana de impresión del horario del centro — mismo contrato exacto que
   * `pantallaInformeHorasProfesor.ts` (R-15). */
  readonly abridorImpresion: AbridorVentanaImpresion;
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

/** Un alumno ya elegido para la sesión de grupo nueva (R-27) — solo lo necesario para pintar la
 * lista y para volver a llamar a `crearSlot` si hace falta reintentar. */
interface CandidatoAltaGrupo {
  readonly id: string;
  readonly nombre: string;
}

interface CamposSesionGrupo {
  readonly profesor_id: string;
  readonly dia_semana: DiaSemana;
  readonly hora_inicio: string;
  readonly hora_fin: string;
  readonly asignatura_o_grupo: string | null;
}

interface AccionCrear {
  readonly tipo: 'crear';
  /** Antes de `intentado`: el grupo elegido en el buscador. Después: solo quienes todavía no se
   * pudieron dar de alta — mismo papel que `pendientes` en `AccionEditar`/`AccionCesar`. */
  readonly seleccionados: readonly CandidatoAltaGrupo[];
  readonly campos: CamposSesionGrupo | null;
  readonly fechaEfecto: Date | null;
  readonly intentado: boolean;
  readonly guardando: boolean;
  readonly error: string;
  readonly aviso: string;
  /** Mensaje de "ese alumno ya está en la selección" (requisito 5) — se limpia en la siguiente
   * selección válida, nunca sobrevive a un envío. */
  readonly avisoDuplicado: string;
}

type AccionEnCurso = AccionEditar | AccionCesar | AccionCrear;

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

  // R-32: independiente del resto de acciones de la pantalla (nunca se oculta mientras hay un
  // formulario abierto), mismo criterio que los botones de descarga/impresión de R-15.
  const botonImprimir = crearBoton(documento, 'Imprimir horario', 'button');
  botonImprimir.addEventListener('click', () => {
    imprimirHorario();
  });

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

  function abrirCrear(): void {
    avisoGlobal = '';
    accion = {
      tipo: 'crear',
      seleccionados: [],
      campos: null,
      fechaEfecto: null,
      intentado: false,
      guardando: false,
      error: '',
      aviso: '',
      avisoDuplicado: '',
    };
    pintar();
  }

  function cancelarAccion(): void {
    accion = null;
    pintar();
  }

  /** Añade `resultado` al grupo en formación, o avisa sin añadir si ya estaba (requisito 5) — el
   * combobox se encarga de limpiar su propio campo de texto tras cada selección, así que este
   * re-pintado nunca pierde nada que el usuario estuviera tecleando. */
  function agregarAlGrupo(resultado: ResultadoBusquedaAlumno): void {
    if (accion?.tipo !== 'crear') {
      return;
    }
    if (accion.seleccionados.some((seleccionado) => seleccionado.id === resultado.id)) {
      accion = { ...accion, avisoDuplicado: `${nombreCompletoAlumno(resultado)} ya está en la selección.` };
      pintar();
      return;
    }
    accion = {
      ...accion,
      seleccionados: [...accion.seleccionados, { id: resultado.id, nombre: nombreCompletoAlumno(resultado) }],
      avisoDuplicado: '',
    };
    pintar();
  }

  function quitarDelGrupo(alumnoId: string): void {
    if (accion?.tipo !== 'crear') {
      return;
    }
    accion = { ...accion, seleccionados: accion.seleccionados.filter((seleccionado) => seleccionado.id !== alumnoId) };
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

  /** Alta en bloque de la sesión de grupo nueva (R-27, requisitos 3 y 4): `crearSlot` una vez por
   * alumno de `accion.seleccionados`, mismo día/hora/profesor/asignatura para todos. Un solape del
   * propio alumno rechaza SOLO su alta (el resto sigue) y queda en `seleccionados` para reintentar —
   * mismo patrón exacto que `ejecutarEdicionEnBloque`/`ejecutarCeseEnBloque`. */
  async function ejecutarAltaGrupoEnBloque(): Promise<void> {
    if (accion?.tipo !== 'crear' || accion.campos === null || accion.fechaEfecto === null) {
      return;
    }
    const candidatos = accion.seleccionados;
    const campos = accion.campos;
    const fechaEfecto = accion.fechaEfecto;
    const restantes: CandidatoAltaGrupo[] = [];
    const fallidos: string[] = [];
    let avisoSolape = false;
    for (const candidato of candidatos) {
      try {
        const resultado = await deps.crearSlot({
          alumno_id: candidato.id,
          profesor_id: campos.profesor_id,
          dia_semana: campos.dia_semana,
          hora_inicio: campos.hora_inicio,
          hora_fin: campos.hora_fin,
          asignatura_o_grupo: campos.asignatura_o_grupo,
          vigente_desde: fechaEfecto,
        });
        if (resultado.avisoSolapeProfesor) {
          avisoSolape = true;
        }
      } catch (error) {
        restantes.push(candidato);
        fallidos.push(`${candidato.nombre}: ${mensajeAmigable(error)}`);
      }
    }
    if (restantes.length === 0) {
      accion = null;
      avisoGlobal = avisoSolape ? AVISO_SOLAPE_PROFESOR : '';
    } else {
      accion = {
        ...accion,
        seleccionados: restantes,
        guardando: false,
        error: `No se pudo crear la sesión para: ${fallidos.join('; ')}.`,
        aviso: avisoSolape ? AVISO_SOLAPE_PROFESOR : '',
      };
    }
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

  /** Formulario de "Nueva sesión de grupo" (R-27) — a diferencia de `pintarFormularioEdicion`/
   * `pintarFormularioCese`, no parte de ninguna `sesion` existente: día/hora/profesor/asignatura
   * nacen vacíos y el grupo se construye alumno a alumno con el buscador de T-20. */
  function pintarFormularioCrear(): HTMLElement {
    const contenedorAccion = documento.createElement('div');
    if (accion?.tipo !== 'crear') {
      return contenedorAccion;
    }
    const enCurso = accion;

    if (enCurso.intentado) {
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
      for (const pendiente of enCurso.seleccionados) {
        lista.append(crearElemento(documento, 'li', { texto: pendiente.nombre }));
      }
      contenedorAccion.append(crearElemento(documento, 'p', { texto: 'Todavía no se pudo crear la sesión para:' }), lista);

      const botonReintentar = crearBoton(documento, 'Reintentar', 'button');
      botonReintentar.disabled = enCurso.guardando;
      botonReintentar.addEventListener('click', () => {
        accion = { ...enCurso, guardando: true, error: '' };
        pintar();
        void ejecutarAltaGrupoEnBloque();
      });
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.disabled = enCurso.guardando;
      botonCancelar.addEventListener('click', cancelarAccion);
      contenedorAccion.append(botonReintentar, botonCancelar);
      return contenedorAccion;
    }

    const idProfesor = 'horario-centro-crear-profesor';
    const selectProfesor = crearSelectorProfesor(documento, idProfesor, profesores);
    const etiquetaProfesor = crearElemento(documento, 'label', { texto: 'Profesor', atributos: { for: idProfesor } });

    const idDia = 'horario-centro-crear-dia';
    const selectDia = crearSelectorDiaSemana(documento, idDia);
    const etiquetaDia = crearElemento(documento, 'label', { texto: 'Día de la semana', atributos: { for: idDia } });

    const idInicio = 'horario-centro-crear-inicio';
    const campoInicio = documento.createElement('input');
    campoInicio.type = 'time';
    campoInicio.id = idInicio;
    campoInicio.required = true;
    const etiquetaInicio = crearElemento(documento, 'label', { texto: 'Hora de inicio', atributos: { for: idInicio } });

    const idFin = 'horario-centro-crear-fin';
    const campoFin = documento.createElement('input');
    campoFin.type = 'time';
    campoFin.id = idFin;
    campoFin.required = true;
    const etiquetaFin = crearElemento(documento, 'label', { texto: 'Hora de fin', atributos: { for: idFin } });

    const campoAsignatura = crearCampoTexto(documento, 'horario-centro-crear-asignatura', 'Asignatura o grupo (opcional)', 'text', 'off');
    campoAsignatura.input.required = false;

    const idFechaEfecto = 'horario-centro-crear-fecha-efecto';
    const campoFechaEfecto = documento.createElement('input');
    campoFechaEfecto.type = 'date';
    campoFechaEfecto.id = idFechaEfecto;
    campoFechaEfecto.required = true;
    campoFechaEfecto.value = fechaLocalISO(deps.reloj.ahora(), zonaHoraria);
    const etiquetaFechaEfecto = crearElemento(documento, 'label', { texto: 'Fecha de efecto', atributos: { for: idFechaEfecto } });

    const errorHora = crearMensajeErrorCampo(documento, campoFin, 'horario-centro-crear-fin-error');

    const zonaAvisoDuplicado = crearZonaMensaje(documento, 'status');
    zonaAvisoDuplicado.textContent = enCurso.avisoDuplicado;

    const listaSeleccionados = documento.createElement('ul');
    for (const seleccionado of enCurso.seleccionados) {
      const item = documento.createElement('li');
      item.append(documento.createTextNode(`${seleccionado.nombre} `));
      const botonQuitar = crearBoton(documento, 'Quitar', 'button');
      botonQuitar.addEventListener('click', () => {
        quitarDelGrupo(seleccionado.id);
      });
      item.append(botonQuitar);
      listaSeleccionados.append(item);
    }

    const contenedorBuscador = documento.createElement('div');
    montarComboboxAlumnoExtra(contenedorBuscador, {
      buscar: (texto, señal) => deps.buscarAlumnos(texto, señal),
      onSeleccionar: (resultado) => {
        agregarAlGrupo(resultado);
      },
      rebote: deps.rebote,
      mostrarNota: false,
    });

    const errorSeleccion = crearZonaMensaje(documento, 'alert');

    const botonConfirmar = crearBoton(documento, 'Crear sesión de grupo', 'button');
    const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
    botonCancelar.addEventListener('click', cancelarAccion);

    botonConfirmar.addEventListener('click', () => {
      if (campoFin.value <= campoInicio.value) {
        errorHora.establecer('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
      errorHora.limpiar();
      if (enCurso.seleccionados.length === 0) {
        errorSeleccion.textContent = 'Selecciona al menos un alumno para el grupo.';
        return;
      }
      errorSeleccion.textContent = '';
      const campos: CamposSesionGrupo = {
        profesor_id: selectProfesor.value,
        dia_semana: Number(selectDia.value) as DiaSemana,
        hora_inicio: campoInicio.value,
        hora_fin: campoFin.value,
        asignatura_o_grupo: campoAsignatura.input.value.trim().length > 0 ? campoAsignatura.input.value.trim() : null,
      };
      accion = { ...enCurso, campos, fechaEfecto: fechaUtcDeCampo(campoFechaEfecto.value), intentado: true, guardando: true };
      pintar();
      void ejecutarAltaGrupoEnBloque();
    });

    contenedorAccion.append(
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
      crearElemento(documento, 'h4', { texto: 'Alumnos del grupo' }),
      contenedorBuscador,
      zonaAvisoDuplicado,
      listaSeleccionados,
      errorSeleccion,
      botonConfirmar,
      botonCancelar,
    );
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

    if (accion !== null && accion.tipo !== 'crear' && accion.claveSesion === clave) {
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
    // Nivel de pantalla, no de una sesión existente (R-27) — visible incluso con el centro vacío
    // (requisito 1: primer grupo de todos), oculto mientras cualquier otra acción está en curso,
    // igual que el resto de botones de esta pantalla.
    if (accion === null) {
      const botonCrear = crearBoton(documento, 'Nueva sesión de grupo', 'button');
      botonCrear.addEventListener('click', () => {
        abrirCrear();
      });
      listaEl.append(botonCrear);
    } else if (accion.tipo === 'crear') {
      listaEl.append(pintarFormularioCrear());
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

  /** Ventana de impresión del horario del centro (R-32, requisito 1): sobre las MISMAS `sesiones`
   * que la pantalla ya tiene cargadas — sin ninguna petición de red adicional (requisito 4). Una
   * fila por sesión, con día, hora, asignatura/grupo, profesor y los nombres de sus alumnos
   * separados por coma — nunca su fotografía. */
  function imprimirHorario(): void {
    const ventana = deps.abridorImpresion.abrir('Horario del centro');
    if (!ventana) {
      errorCarga = 'El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.';
      pintar();
      return;
    }
    const docImpresion = ventana.document;
    const tituloImpresion = crearElemento(docImpresion, 'h1', { texto: 'Horario del centro' });
    const generado = crearElemento(docImpresion, 'p', {
      texto: `Generado el ${fechaHoraLocalLegible(deps.reloj.ahora(), zonaHoraria)}`,
    });
    const tabla = docImpresion.createElement('table');
    const cabecera = docImpresion.createElement('thead');
    const filaCabecera = docImpresion.createElement('tr');
    for (const texto of ['Día', 'Hora', 'Asignatura/grupo', 'Profesor', 'Alumnos']) {
      filaCabecera.append(crearElemento(docImpresion, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = docImpresion.createElement('tbody');
    for (const sesion of sesiones) {
      const fila = docImpresion.createElement('tr');
      const valores = [
        ETIQUETA_DIA_SEMANA[sesion.diaSemana],
        `${sesion.horaInicio.slice(0, 5)}–${sesion.horaFin.slice(0, 5)}`,
        sesion.asignaturaOGrupo ?? 'Sin asignatura o grupo',
        nombreProfesor(sesion.profesorId),
        sesion.slots.map((slot) => nombreCompletoAlumno(slot.alumno)).join(', '),
      ];
      for (const valor of valores) {
        fila.append(crearElemento(docImpresion, 'td', { texto: valor }));
      }
      cuerpo.append(fila);
    }
    tabla.append(cabecera, cuerpo);
    docImpresion.body.append(tituloImpresion, generado, tabla);
    ventana.imprimir();
  }

  contenedor.append(titulo, zonaError, zonaAviso, botonImprimir, listaEl);
  void cargar();
}
