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
 */

import type { Rol, DiaSemana } from '../dominio/tipos.ts';
import { ETIQUETA_DIA_SEMANA } from '../dominio/tipos.ts';
import { vistaSemanalProfesor, type SlotConAlumno, type SlotSemanal } from '../dominio/slots.ts';
import { nombreCompletoAlumno, compararAlumnosParaOrden } from '../dominio/alumno.ts';
import { puedeVerMiHorario } from '../dominio/permisosUi.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { ProgramadorIntervalo } from '../nucleo/programadorIntervalo.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { crearElemento } from './dom.ts';
import { crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

const INTERVALO_TICK_MS = 20_000;

const DIAS_SEMANA: readonly DiaSemana[] = [1, 2, 3, 4, 5, 6, 7];

export interface DependenciasPantallaMiHorario {
  readonly rol: Rol;
  readonly profesorId: string;
  readonly reloj: Reloj;
  readonly programador: ProgramadorIntervalo;
  cargarSlots(): Promise<readonly SlotConAlumno[]>;
  /** Navega a pasar lista (T-19) — sin parámetros: pasar lista siempre muestra lo que toque ahora,
   * que si este botón está visible ya coincide con este slot. */
  irAPasarLista(): void;
  /** Navega a los registros (T-21) de `slotId`, preseleccionado. */
  irARegistros(slotId: string): void;
}

interface EstadoPantalla {
  readonly cargando: boolean;
  readonly error: string;
  readonly instante: Date;
}

export function mostrarPantallaMiHorario(contenedor: HTMLElement, deps: DependenciasPantallaMiHorario): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerMiHorario(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  let slotsCache: readonly SlotConAlumno[] = [];

  const almacen = crearAlmacenEstado<EstadoPantalla>({
    cargando: true,
    error: '',
    instante: deps.reloj.ahora(),
  });

  const tituloPantalla = crearElemento(documento, 'h2', { texto: 'Mi horario' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaEstado = documento.createElement('div');
  const zonaResumen = documento.createElement('div');
  const listaDias = documento.createElement('div');

  async function cargar(): Promise<void> {
    almacen.actualizar({ cargando: true, error: '' });
    try {
      slotsCache = await deps.cargarSlots();
      almacen.actualizar({ cargando: false, instante: deps.reloj.ahora() });
    } catch (error) {
      almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
    }
  }

  function pintarResumen(vista: readonly SlotSemanal[]): void {
    zonaResumen.textContent = '';
    const actuales = vista.filter((slot) => slot.esActual);
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

  function pintarFilaSlot(slot: SlotSemanal): HTMLLIElement {
    const li = documento.createElement('li');
    li.append(
      crearElemento(documento, 'span', { texto: `${slot.hora_inicio}–${slot.hora_fin}` }),
      crearElemento(documento, 'span', { texto: slot.asignatura_o_grupo ?? '—' }),
      crearElemento(documento, 'span', { texto: nombreCompletoAlumno(slot.alumno) }),
    );
    if (slot.esActual) {
      li.append(crearElemento(documento, 'span', { texto: 'En curso' }));
    } else if (slot.esSiguiente) {
      li.append(crearElemento(documento, 'span', { texto: 'Siguiente' }));
    }
    if (slot.esActual) {
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

  function pintarDias(vista: readonly SlotSemanal[]): void {
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
          lista.append(pintarFilaSlot(slot));
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
      listaDias.textContent = '';
      return;
    }
    const vista = vistaSemanalProfesor({ profesorId: deps.profesorId, instante: estado.instante, slots: slotsCache });
    pintarResumen(vista);
    pintarDias(vista);
  }

  almacen.suscribir(pintar);
  pintar();

  contenedor.append(tituloPantalla, zonaError, zonaEstado, zonaResumen, listaDias);

  deps.programador.cada(INTERVALO_TICK_MS, () => {
    almacen.actualizar({ instante: deps.reloj.ahora() });
  });

  void cargar();
}
