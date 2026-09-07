/**
 * Pantalla «Mi horario» (T-22): la vista semanal de solo lectura que un `teacher` usa para ver a
 * quién le toca en cada tramo, sin necesidad de esperar a que el tramo esté en curso (eso es
 * `pantallaPasarLista.ts`, T-19) ni de elegir un slot a ciegas (eso es `pantallaRegistrosSlot.ts`,
 * T-21). Exclusivamente `teacher` (`puedeVerMiHorario`, `dominio/permisosUi.ts`) — el aislamiento
 * real de qué slots ve cada profesor lo garantiza RLS (`slot_horario`, T-10), no esta pantalla.
 *
 * `deps.cargarSlots()` trae TODOS los slots del profesor en una única petición (mismo contrato que
 * `dominio/slots.ts#alumnosPropuestos` ya usa en pasar lista) y se cachea en cierre; `deps.programador`
 * dispara cada `INTERVALO_TICK_MS` un recálculo puro de `vistaSemanalProfesor` sobre esa caché y el
 * instante fresco de `deps.reloj`, para que "en curso"/"siguiente" se mantengan al día sin gastar
 * ninguna petición de red mientras la pantalla permanece abierta — mismo patrón exacto que T-19
 * (incluida su misma limitación conocida: el `cada(...)` no se cancela al cambiar de vista, ver
 * `pantallaPasarLista.ts`).
 *
 * Requisito 2 de T-22 ("desde cada slot, dos accesos directos"): "Pasar lista" solo se ofrece en el
 * slot que está `esActual` (si el profesor tiene dos alumnos simultáneos, ambos lo ofrecen — pasar
 * lista ya sabe atenderlos a los dos a la vez); "Ver registros" se ofrece siempre y navega directo a
 * los registros de ESE slot (`deps.irARegistros(slotId)`, que el router de `teacher` traduce a
 * `#/registros/<slotId>` — `pantallaRegistrosSlot.ts` lo preselecciona sin más selección manual).
 *
 * Agrupada por día de la semana (requisito 1, "vista semanal"): los siete días siempre aparecen, con
 * "Sin clases este día" cuando no hay ninguno — así se ve la semana completa, no solo los días con
 * horario. Dentro de cada día, los slots se ordenan por apellido del alumno (mismo criterio "a la
 * española" que el resto de listados de alumnos, `compararAlumnosParaOrden`), no por el orden en que
 * los devuelve el servidor.
 *
 * Bloque "Sesiones sin pasar lista" (R-13): calculado en el cliente por
 * `dominio/avisosPasarLista.ts#sesionesSinPasarLista` a partir de tres lecturas nuevas, todas
 * opcionales y pedidas una única vez al cargar —mismo criterio de caché que `excepcionesHoyCache`—:
 * el histórico de los últimos días (T-23), los cierres activos (R-12) y las excepciones activas de
 * la ventana (R-06, un rango, a diferencia de `listarExcepcionesDeHoy` que solo trae hoy). Sin las
 * tres a la vez, el bloque simplemente no aparece — "Mi horario" funciona exactamente como antes de
 * R-13, mismo criterio que el resto de dependencias opcionales de este módulo. Un toque en el aviso
 * navega a «Registros» de ese slot Y esa fecha (`deps.irARegistros(slotId, fecha)`, requisito 2).
 */

import type { Rol, DiaSemana, ExcepcionSlot, CierreCentro } from '../dominio/tipos.ts';
import { ETIQUETA_DIA_SEMANA } from '../dominio/tipos.ts';
import {
  fechaLocalISO,
  instanteLocal,
  vistaSemanalProfesor,
  ZONA_HORARIA_CENTRO_POR_DEFECTO,
  type SlotConAlumno,
  type SlotSemanal,
} from '../dominio/slots.ts';
import { nombreCompletoAlumno, compararAlumnosParaOrden } from '../dominio/alumno.ts';
import { puedeVerMiHorario } from '../dominio/permisosUi.ts';
import { etiquetaExcepcion, excepcionDelDia } from '../dominio/excepcionSlot.ts';
import { VENTANA_EDICION_TEACHER_DIAS } from '../dominio/asistencia.ts';
import { sesionesSinPasarLista, type RegistroParaAvisoPasarLista, type SesionSinPasarLista } from '../dominio/avisosPasarLista.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { ProgramadorIntervalo } from '../nucleo/programadorIntervalo.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento } from './dom.ts';
import { crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

const INTERVALO_TICK_MS = 20_000;

/** Margen extra sobre `VENTANA_EDICION_TEACHER_DIAS` al pedir el histórico y las excepciones de la
 * ventana (requisito 1 de R-13): sobra un día de más, nunca falta uno por un simple redondeo de
 * milisegundos a día de calendario — `sesionesSinPasarLista` ya filtra con precisión por fecha, así
 * que traer de más aquí es inofensivo, nunca incorrecto. */
const MARGEN_VENTANA_DIAS = 1;

const DIAS_SEMANA: readonly DiaSemana[] = [1, 2, 3, 4, 5, 6, 7];

export interface DependenciasPantallaMiHorario {
  readonly rol: Rol;
  readonly profesorId: string;
  readonly reloj: Reloj;
  readonly programador: ProgramadorIntervalo;
  cargarSlots(): Promise<readonly SlotConAlumno[]>;
  /** Excepciones de HOY (R-06) que afectan a alguno de los slots del profesor —como titular de un
   * slot cancelado o sustituido—, para relabelar esa fila (requisito 4: "Cubierto por X"/"Cancelada
   * — motivo", nunca como el slot normal ni como "Sin clases este día"). Opcional: sin ella, «Mi
   * horario» funciona exactamente como antes de R-06. */
  listarExcepcionesDeHoy?(fecha: string): Promise<readonly ExcepcionSlot[]>;
  /** R-13: registros del profesor entre `desde` y `hasta` (inclusive), de cualquier estado —
   * mismo criterio que `datos/asistencia.ts#listarHistoricoAsistenciaCompleto` filtrado por
   * `profesorId`. Junto con `listarCierresActivos`/`listarExcepcionesRecientes`, las tres
   * dependencias del bloque "Sesiones sin pasar lista"; sin las tres a la vez, no aparece. */
  listarRegistrosRecientes?(desde: Date, hasta: Date): Promise<readonly RegistroParaAvisoPasarLista[]>;
  /** R-13: cierres ACTIVOS del centro (R-12), para excluir un día cerrado de "sesiones esperadas". */
  listarCierresActivos?(): Promise<readonly CierreCentro[]>;
  /** R-13: excepciones ACTIVAS (R-06) cuya `fecha` cae en `[desde, hasta]` — a diferencia de
   * `listarExcepcionesDeHoy` (un único día, para relabelar la fila de hoy), esta trae todo el rango
   * de la ventana de aviso. */
  listarExcepcionesRecientes?(desde: string, hasta: string): Promise<readonly ExcepcionSlot[]>;
  /** Navega a pasar lista (T-19) — sin parámetros: pasar lista siempre muestra lo que toque ahora,
   * que si este botón está visible ya coincide con este slot. */
  irAPasarLista(): void;
  /** Navega a los registros (T-21) de `slotId`, preseleccionado. `fecha` (R-13, `AAAA-MM-DD`)
   * preselecciona también el día — omitida, el enlace de "Ver registros" de la vista semanal sigue
   * yendo al día de hoy, igual que antes de R-13. */
  irARegistros(slotId: string, fecha?: string): void;
}

interface EstadoPantalla {
  readonly cargando: boolean;
  readonly error: string;
  readonly instante: Date;
  readonly avisos: readonly SesionSinPasarLista[];
}

export function mostrarPantallaMiHorario(contenedor: HTMLElement, deps: DependenciasPantallaMiHorario): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerMiHorario(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  let slotsCache: readonly SlotConAlumno[] = [];
  // R-06: excepciones de HOY, pedidas una vez al cargar (mismo criterio de caché que `slotsCache` —
  // sin refetch en cada tick del programador; un cambio de día de calendario con la pantalla
  // abierta sin cerrar sesión es el mismo escenario ya aceptado como riesgo inocuo en
  // `pantallaPasarLista.ts`).
  let excepcionesHoyCache: readonly ExcepcionSlot[] = [];

  const almacen = crearAlmacenEstado<EstadoPantalla>({
    cargando: true,
    error: '',
    instante: deps.reloj.ahora(),
    avisos: [],
  });

  const tituloPantalla = crearElemento(documento, 'h2', { texto: 'Mi horario' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaEstado = documento.createElement('div');
  const zonaResumen = documento.createElement('div');
  const zonaAvisos = documento.createElement('div');
  const listaDias = documento.createElement('div');

  /** R-13: las tres dependencias del bloque de avisos vienen juntas o no vienen — así se decide una
   * sola vez si hace falta pedir nada. */
  function puedeCalcularAvisos(): boolean {
    return deps.listarRegistrosRecientes !== undefined && deps.listarCierresActivos !== undefined && deps.listarExcepcionesRecientes !== undefined;
  }

  async function cargarAvisos(instante: Date): Promise<readonly SesionSinPasarLista[]> {
    if (!deps.listarRegistrosRecientes || !deps.listarCierresActivos || !deps.listarExcepcionesRecientes) {
      return [];
    }
    const ventanaDias = VENTANA_EDICION_TEACHER_DIAS + MARGEN_VENTANA_DIAS;
    const desde = new Date(instante.getTime() - ventanaDias * 24 * 60 * 60 * 1000);
    const [registros, cierres, excepciones] = await Promise.all([
      deps.listarRegistrosRecientes(desde, instante),
      deps.listarCierresActivos(),
      deps.listarExcepcionesRecientes(fechaLocalISO(desde), fechaLocalISO(instante)),
    ]);
    return sesionesSinPasarLista({
      profesorId: deps.profesorId,
      instante,
      slots: slotsCache,
      registros,
      cierres,
      excepciones,
    });
  }

  async function cargar(): Promise<void> {
    almacen.actualizar({ cargando: true, error: '' });
    const instante = deps.reloj.ahora();
    const fechaHoy = fechaLocalISO(instante);
    try {
      const [slots, excepciones] = await Promise.all([
        deps.cargarSlots(),
        deps.listarExcepcionesDeHoy ? deps.listarExcepcionesDeHoy(fechaHoy) : Promise.resolve([]),
      ]);
      slotsCache = slots;
      excepcionesHoyCache = excepciones;
      const avisos = puedeCalcularAvisos() ? await cargarAvisos(instante) : [];
      almacen.actualizar({ cargando: false, instante: deps.reloj.ahora(), avisos });
    } catch (error) {
      almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
    }
  }

  function pintarAvisos(): void {
    zonaAvisos.textContent = '';
    const { avisos } = almacen.obtener();
    if (avisos.length === 0) {
      return;
    }
    zonaAvisos.append(crearElemento(documento, 'h3', { texto: 'Sesiones sin pasar lista' }));
    const lista = documento.createElement('ul');
    for (const aviso of avisos) {
      const li = documento.createElement('li');
      const tramo = `${aviso.fecha} ${aviso.slot.hora_inicio}–${aviso.slot.hora_fin}`;
      li.append(crearElemento(documento, 'span', { texto: `${tramo} — ${nombreCompletoAlumno(aviso.slot.alumno)}` }));
      const boton = crearBoton(documento, 'Completar registro', 'button');
      boton.addEventListener('click', () => {
        deps.irARegistros(aviso.slot.id, aviso.fecha);
      });
      li.append(boton);
      lista.append(li);
    }
    zonaAvisos.append(lista);
  }

  function pintarResumen(vista: readonly SlotSemanal[], instante: Date): void {
    zonaResumen.textContent = '';
    // R-06: un slot cancelado o sustituido hoy no cuenta como "Ahora" en el resumen — coherente con
    // que su fila, más abajo, ya no dice "En curso" (mismo criterio, misma comprobación).
    const actuales = vista.filter((slot) => slot.esActual && !excepcionDeHoy(slot, instante));
    if (actuales.length > 0) {
      const nombres = actuales.map((slot) => nombreCompletoAlumno(slot.alumno)).join(', ');
      zonaResumen.append(crearElemento(documento, 'p', { texto: `Ahora: ${nombres}` }));
      return;
    }
    const siguientes = vista.filter((slot) => slot.esSiguiente);
    const primerSiguiente = siguientes[0];
    if (primerSiguiente) {
      const nombres = siguientes.map((slot) => nombreCompletoAlumno(slot.alumno)).join(', ');
      const tramo = `${ETIQUETA_DIA_SEMANA[primerSiguiente.dia_semana]} ${primerSiguiente.hora_inicio}–${primerSiguiente.hora_fin}`;
      zonaResumen.append(crearElemento(documento, 'p', { texto: `Siguiente: ${tramo} — ${nombres}` }));
      return;
    }
    zonaResumen.append(crearElemento(documento, 'p', { texto: 'Sin horario asignado.' }));
  }

  /** ¿Tiene `slot` una excepción activa HOY (R-06)? Solo puede haberla si `slot.dia_semana` es de
   * verdad el día de la semana de hoy — el resto de filas de la vista semanal (otros días del
   * ciclo) no tienen una fecha concreta que comprobar, así que nunca se relabelan (limitación
   * conocida: una excepción declarada para un día futuro no se anticipa aquí, solo el mismo día en
   * que ocurre). */
  function excepcionDeHoy(slot: SlotSemanal, instante: Date): ExcepcionSlot | undefined {
    if (slot.dia_semana !== instanteLocal(instante, ZONA_HORARIA_CENTRO_POR_DEFECTO).diaSemana) {
      return undefined;
    }
    return excepcionDelDia(slot.id, fechaLocalISO(instante), excepcionesHoyCache);
  }

  function pintarFilaSlot(slot: SlotSemanal, instante: Date): HTMLLIElement {
    const li = documento.createElement('li');
    li.append(
      crearElemento(documento, 'span', { texto: `${slot.hora_inicio}–${slot.hora_fin}` }),
      crearElemento(documento, 'span', { texto: slot.asignatura_o_grupo ?? '—' }),
      crearElemento(documento, 'span', { texto: nombreCompletoAlumno(slot.alumno) }),
    );
    // R-06, requisito 4: una excepción de hoy manda sobre "en curso"/"siguiente" — nunca las dos
    // etiquetas a la vez, y "Pasar lista" no se ofrece (para que el titular no piense que tiene
    // que pasar lista sobre una clase cancelada o cubierta por otro).
    const excepcion = excepcionDeHoy(slot, instante);
    if (excepcion) {
      li.append(crearElemento(documento, 'span', { texto: etiquetaExcepcion(excepcion) }));
    } else if (slot.esActual) {
      li.append(crearElemento(documento, 'span', { texto: 'En curso' }));
    } else if (slot.esSiguiente) {
      li.append(crearElemento(documento, 'span', { texto: 'Siguiente' }));
    }
    if (slot.esActual && !excepcion) {
      const botonPasarLista = crearBoton(documento, 'Pasar lista', 'button');
      botonPasarLista.addEventListener('click', () => {
        deps.irAPasarLista();
      });
      li.append(botonPasarLista);
    }
    const botonRegistros = crearBoton(documento, 'Ver registros', 'button');
    botonRegistros.addEventListener('click', () => {
      deps.irARegistros(slot.id);
    });
    li.append(botonRegistros);
    return li;
  }

  function pintarDias(vista: readonly SlotSemanal[], instante: Date): void {
    listaDias.textContent = '';
    for (const diaSemana of DIAS_SEMANA) {
      const slotsDelDia = vista.filter((slot) => slot.dia_semana === diaSemana).sort((a, b) => compararAlumnosParaOrden(a.alumno, b.alumno));

      const seccion = documento.createElement('section');
      seccion.append(crearElemento(documento, 'h3', { texto: ETIQUETA_DIA_SEMANA[diaSemana] }));
      if (slotsDelDia.length === 0) {
        seccion.append(crearElemento(documento, 'p', { texto: 'Sin clases este día.' }));
      } else {
        const lista = documento.createElement('ul');
        for (const slot of slotsDelDia) {
          lista.append(pintarFilaSlot(slot, instante));
        }
        seccion.append(lista);
      }
      listaDias.append(seccion);
    }
  }

  function pintar(): void {
    const estado = almacen.obtener();
    zonaError.textContent = estado.error;
    zonaEstado.textContent = estado.cargando ? 'Cargando…' : '';
    if (estado.cargando) {
      zonaResumen.textContent = '';
      zonaAvisos.textContent = '';
      listaDias.textContent = '';
      return;
    }
    const vista = vistaSemanalProfesor({ profesorId: deps.profesorId, instante: estado.instante, slots: slotsCache });
    pintarResumen(vista, estado.instante);
    pintarAvisos();
    pintarDias(vista, estado.instante);
  }

  almacen.suscribir(pintar);
  pintar();

  contenedor.append(tituloPantalla, zonaError, zonaEstado, zonaResumen, zonaAvisos, listaDias);

  deps.programador.cada(INTERVALO_TICK_MS, () => {
    almacen.actualizar({ instante: deps.reloj.ahora() });
  });

  void cargar();
}
