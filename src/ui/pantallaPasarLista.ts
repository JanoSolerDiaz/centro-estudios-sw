/**
 * Pantalla de pasar lista (T-19): la que un profesor usa cada día para registrar, en segundos, la
 * entrada de los alumnos que le tocan ahora. Exclusivamente `teacher` (`puedeUsarPasarLista`,
 * `dominio/permisosUi.ts`) — un `administrator` no tiene horario propio de slots, y su forma de
 * tocar asistencia es la revisión de T-21, con slot y profesor elegidos a mano, no la propuesta
 * automática "quién toca ahora" de `dominio/slots.ts` (T-17).
 *
 * Arquitectura: `deps.cargarPropuesta()` trae TODOS los slots del profesor en una única petición
 * (T-17, requisito 5) y `deps.cargarAsistenciaDeHoy(instante)` los registros ya válidos de hoy en
 * otra (T-19, requisito 5: "al abrir, ya se ve quién está registrado hoy en ese slot") — las dos se
 * piden en paralelo al cargar y se cachean en cierre (`slotsCache`/`registrosHoyCache`), NUNCA
 * releídas de red en cada tick. `deps.programador` (T-19, nuevo `nucleo/programadorIntervalo.ts`)
 * dispara cada `INTERVALO_TICK_MS` un recálculo puro (`alumnosPropuestos` sobre `slotsCache` y el
 * instante fresco de `deps.reloj`) — así la cabecera y la rejilla se refrescan solas al cambiar de
 * tramo horario (requisito 5) sin gastar ninguna petición de red; el botón "Actualizar" es el único
 * punto que vuelve a pedir datos al servidor (refresco manual explícito, mismo requisito).
 *
 * Cada card es un `<button type="button">` real (requisito 3, "la card entera es el objetivo
 * táctil"; requisito 7, teclado): activarla llama a `deps.registrar` con el `peticionId` FIJO de
 * esa card (generado una vez por `deps.generarPeticionId`, nunca en cada intento) protegido por
 * `crearProtectorDobleToque` por CLAVE de card (T-06) — un doble toque en la MISMA card no dispara
 * una segunda petición, pero tocar dos cards distintas casi a la vez sí registra las dos.
 *
 * `Conflicto` (409: mismo peticionId ya aplicado, o duplicado de negocio del mismo alumno/slot/día
 * — indistinguibles por diseño, ver `db/005_rpc_registrar_asistencia.sql` y
 * `DECISIONES_TECNICAS.md`) NUNCA se muestra como error: en los dos casos la fila ya existe de
 * verdad en el servidor, así que se relee `cargarAsistenciaDeHoy` y la card pasa a "registrado" con
 * la fila real — es la forma en que "el reintento no genera un segundo registro" (requisito 6) se
 * ve desde la interfaz. Cualquier OTRO error (red, límite de tasa, servidor) deja la card en
 * "pendiente"/"error" con el mismo `peticionId`, lista para reintentar con un segundo toque.
 *
 * Limitación conocida (`HISTORIAL_SESIONES.md`, sesión de T-19): el `cada(...)` del programador no
 * se cancela al desmontar — ningún componente de `src/ui/` tiene todavía un ciclo de vida de
 * desmontaje, ni siquiera los de T-16. Inocuo en la práctica: `gestorSesion` no cambia de `perfil`
 * al renovar el token, así que `aplicacion.ts` nunca vuelve a llamar a `mostrarAppProfesor` dentro
 * de una misma sesión iniciada; solo un cierre de sesión seguido de un nuevo inicio en la misma
 * pestaña dejaría un intervalo huérfano recalculando sobre un DOM ya descartado, sin ningún efecto
 * de red duplicado.
 */

import type { Rol, SlotHorario } from '../dominio/tipos.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import {
  alumnosPropuestos,
  instanteLocal,
  ZONA_HORARIA_CENTRO_POR_DEFECTO,
  type AlumnoParaPropuesta,
  type AlumnoPropuesto,
  type OpcionesPropuesta,
  type PropuestaAsistencia,
  type SlotConAlumno,
} from '../dominio/slots.ts';
import { claveRegistroPorSlot, registrosDeHoyPorAlumnoSlot } from '../dominio/asistencia.ts';
import { compararAlumnosParaOrden } from '../dominio/alumno.ts';
import { inicialesAlumno, colorMonograma } from '../dominio/avatarAlumno.ts';
import { puedeUsarPasarLista } from '../dominio/permisosUi.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { ProgramadorIntervalo } from '../nucleo/programadorIntervalo.ts';
import { crearProtectorDobleToque } from '../nucleo/proteccionDobleToque.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';
import { crearElemento } from './dom.ts';
import { crearZonaMensaje, crearBoton } from './formularios.ts';
import type { RegistrarAsistenciaEntrada } from '../datos/asistencia.ts';
import type { AlumnoConRutaAvatar } from '../datos/avatarAlumno.ts';
import { Conflicto } from '../datos/erroresDominio.ts';

/** Cada cuánto se recalcula la propuesta y se refresca la hora visible de la cabecera, sin red
 * (requisito 1 y 5 de T-19). Ni tan corto que recargue la rejilla (y con ella el foco, ver
 * `elementoConFoco`) más de lo necesario, ni tan largo que un cambio de tramo horario tarde en
 * notarse una clase entera. */
const INTERVALO_TICK_MS = 20_000;

export interface DependenciasPantallaPasarLista {
  readonly rol: Rol;
  readonly profesorId: string;
  readonly reloj: Reloj;
  readonly programador: ProgramadorIntervalo;
  cargarPropuesta(): Promise<readonly SlotConAlumno[]>;
  cargarAsistenciaDeHoy(instante: Date): Promise<readonly Asistencia[]>;
  registrar(entrada: RegistrarAsistenciaEntrada): Promise<Asistencia>;
  /** Firma en lote (§0.2) las URL de la derivada `mini` (96 px, requisito 2) de los alumnos con
   * avatar que todavía no se hayan pedido. */
  obtenerUrlsAvataresMini(alumnos: readonly AlumnoConRutaAvatar[]): Promise<ReadonlyMap<string, string>>;
  /** Inyectable para tests deterministas; por defecto `crypto.randomUUID()` en el punto de
   * composición (`aplicacion.ts`), nunca aquí (mismo criterio que `avatarAlumno.ts`). */
  generarPeticionId(): string;
  /** Punto de enganche de T-09 (`GestorSesion.renovarAlAbrirPasarLista`): se llama una vez al
   * montar la pantalla, en el mejor esfuerzo — un fallo no bloquea ni vacía lo que ya hay en
   * pantalla (requisito 6 de T-09), la siguiente petición real revelará si la sesión sigue viva. */
  renovarSesion(): Promise<void>;
  readonly zonaHoraria?: string;
  readonly tolerancia?: number;
}

type FaseTarjeta = 'pendiente' | 'enviando' | 'registrado' | 'error';

interface EstadoTarjeta {
  readonly alumno: AlumnoParaPropuesta;
  readonly slot: SlotHorario;
  readonly fase: FaseTarjeta;
  readonly peticionId: string;
  readonly asistencia?: Asistencia;
  readonly mensajeError?: string;
}

interface EstadoPantalla {
  readonly cargando: boolean;
  readonly errorCarga: string;
  readonly propuesta: PropuestaAsistencia | null;
  readonly instante: Date;
  readonly tarjetas: ReadonlyMap<string, EstadoTarjeta>;
  readonly avatares: ReadonlyMap<string, string>;
}

function formatearMinutos(minutos: number): string {
  const redondeado = Math.max(0, Math.round(minutos));
  return `${String(redondeado)} minuto${redondeado === 1 ? '' : 's'}`;
}

/** Agrupa los slots de `alumnos` por (hora_inicio, hora_fin, asignatura_o_grupo) — normalmente uno
 * solo (un grupo entero comparte tramo y asignatura), pero nunca se asume: si hubiera varias
 * combinaciones distintas activas a la vez, se listan todas en vez de mostrar solo la primera. */
function descripcionesSlot(alumnos: readonly AlumnoPropuesto[]): readonly string[] {
  const vistos = new Map<string, { readonly asignatura: string; readonly inicio: string; readonly fin: string }>();
  for (const { slot } of alumnos) {
    const clave = `${slot.hora_inicio}|${slot.hora_fin}|${slot.asignatura_o_grupo ?? ''}`;
    if (!vistos.has(clave)) {
      vistos.set(clave, {
        asignatura: slot.asignatura_o_grupo ?? 'Sin asignatura',
        inicio: slot.hora_inicio,
        fin: slot.hora_fin,
      });
    }
  }
  return [...vistos.values()]
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((d) => `${d.asignatura} · ${d.inicio}–${d.fin}`);
}

function textoEstadoTarjeta(tarjeta: EstadoTarjeta, zonaHoraria: string): string {
  switch (tarjeta.fase) {
    case 'pendiente':
      return 'Pendiente';
    case 'enviando':
      return 'Registrando…';
    case 'registrado': {
      const hora = tarjeta.asistencia ? instanteLocal(new Date(tarjeta.asistencia.registrado_en), zonaHoraria).horaMinuto : '';
      return `Registrado a las ${hora}`;
    }
    case 'error':
      return `Pendiente — ${tarjeta.mensajeError ?? 'No se ha podido registrar.'}`;
  }
}

export function mostrarPantallaPasarLista(contenedor: HTMLElement, deps: DependenciasPantallaPasarLista): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeUsarPasarLista(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const zonaHoraria = deps.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  // Mejor esfuerzo (T-09, requisito 6): un fallo aquí no debe vaciar ni bloquear la pantalla.
  deps.renovarSesion().catch(() => undefined);

  let slotsCache: readonly SlotConAlumno[] = [];
  let registrosHoyCache: ReadonlyMap<string, Asistencia> = new Map();
  const avataresPedidos = new Set<string>();
  const protectoresTarjeta = new Map<string, () => Promise<void>>();

  const almacen = crearAlmacenEstado<EstadoPantalla>({
    cargando: true,
    errorCarga: '',
    propuesta: null,
    instante: deps.reloj.ahora(),
    tarjetas: new Map(),
    avatares: new Map(),
  });

  const zonaError = crearZonaMensaje(documento, 'alert');
  const cabecera = documento.createElement('div');
  const horaEl = crearElemento(documento, 'p', {});
  const estadoSlotEl = documento.createElement('div');
  const botonActualizar = crearBoton(documento, 'Actualizar', 'button');
  botonActualizar.addEventListener('click', () => {
    void cargar();
  });
  cabecera.append(horaEl, estadoSlotEl, botonActualizar);

  const mensajeCargando = crearElemento(documento, 'p', { texto: 'Cargando…' });
  const rejilla = documento.createElement('div');
  rejilla.style.display = 'grid';
  rejilla.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
  rejilla.style.gap = '12px';

  function pintarEstadoSlot(propuesta: PropuestaAsistencia | null): void {
    estadoSlotEl.textContent = '';
    if (propuesta === null) {
      return;
    }
    if (propuesta.tipo === 'sin_clases_hoy') {
      estadoSlotEl.append(crearElemento(documento, 'p', { texto: 'No tienes ninguna clase más hoy.' }));
      return;
    }
    const titulo = propuesta.tipo === 'en_curso' ? 'En curso' : `Próxima clase en ${formatearMinutos(propuesta.minutosHastaInicio)}`;
    estadoSlotEl.append(crearElemento(documento, 'p', { texto: titulo }));
    for (const descripcion of descripcionesSlot(propuesta.alumnos)) {
      estadoSlotEl.append(crearElemento(documento, 'p', { texto: descripcion }));
    }
  }

  function crearMonograma(alumno: AlumnoParaPropuesta): HTMLElement {
    const monograma = crearElemento(documento, 'div', {
      texto: inicialesAlumno(alumno),
      atributos: { 'aria-hidden': 'true' },
    });
    monograma.style.backgroundColor = colorMonograma(alumno.id);
    monograma.style.color = '#FFFFFF';
    monograma.style.display = 'flex';
    monograma.style.alignItems = 'center';
    monograma.style.justifyContent = 'center';
    monograma.style.width = '96px';
    monograma.style.height = '96px';
    monograma.style.borderRadius = '50%';
    monograma.style.fontSize = '28px';
    return monograma;
  }

  function crearTarjetaElemento(clave: string, tarjeta: EstadoTarjeta, avatares: ReadonlyMap<string, string>): HTMLButtonElement {
    const { alumno } = tarjeta;
    const boton = documento.createElement('button');
    boton.type = 'button';
    boton.dataset.clave = clave;
    boton.style.minHeight = '44px';
    boton.style.minWidth = '44px';
    boton.style.display = 'flex';
    boton.style.flexDirection = 'column';
    boton.style.alignItems = 'center';
    boton.style.gap = '4px';
    boton.style.padding = '8px';
    boton.style.border = '2px solid #374151';
    boton.style.borderRadius = '8px';
    boton.style.fontSize = '16px';
    boton.style.backgroundColor = tarjeta.fase === 'registrado' ? '#DCFCE7' : tarjeta.fase === 'error' ? '#FEE2E2' : '#FFFFFF';

    const avatarWrap = documento.createElement('div');
    avatarWrap.style.position = 'relative';
    avatarWrap.style.width = '96px';
    avatarWrap.style.height = '96px';
    const monograma = crearMonograma(alumno);
    avatarWrap.append(monograma);

    const urlAvatar = alumno.avatar_ruta ? avatares.get(alumno.id) : undefined;
    if (urlAvatar) {
      const imagen = documento.createElement('img');
      imagen.src = urlAvatar;
      imagen.alt = '';
      imagen.width = 96;
      imagen.height = 96;
      imagen.hidden = true;
      imagen.style.borderRadius = '50%';
      imagen.style.objectFit = 'cover';
      imagen.addEventListener('load', () => {
        monograma.hidden = true;
        imagen.hidden = false;
      });
      imagen.addEventListener('error', () => {
        // Requisito 4 de T-19: una foto que falla deja el monograma, nunca un hueco roto.
        imagen.remove();
      });
      avatarWrap.append(imagen);
    }

    const nombreEl = crearElemento(documento, 'span', { texto: `${alumno.nombre} ${alumno.primer_apellido}` });
    nombreEl.style.fontWeight = 'bold';
    boton.append(avatarWrap, nombreEl);

    if (alumno.segundo_apellido) {
      boton.append(crearElemento(documento, 'span', { texto: alumno.segundo_apellido }));
    }

    const textoEstado = textoEstadoTarjeta(tarjeta, zonaHoraria);
    boton.append(crearElemento(documento, 'span', { texto: textoEstado }));
    boton.setAttribute(
      'aria-label',
      `${alumno.nombre} ${alumno.primer_apellido}${alumno.segundo_apellido ? ` ${alumno.segundo_apellido}` : ''}. ${textoEstado}`,
    );
    boton.disabled = tarjeta.fase === 'registrado' || tarjeta.fase === 'enviando';

    boton.addEventListener('click', () => {
      void obtenerProtector(clave)();
    });

    return boton;
  }

  function elementoConFoco(): string | null {
    // Sin `instanceof HTMLElement`: esa clase vive en `window`, y este módulo nunca referencia un
    // global del navegador directamente (mismo criterio que el resto de `src/ui/`, que recibe
    // `documento` por parámetro) — buscar el atributo `data-clave` basta para reconocer la card.
    return documento.activeElement?.getAttribute('data-clave') ?? null;
  }

  function pintar(estado: EstadoPantalla): void {
    zonaError.textContent = estado.errorCarga;
    horaEl.textContent = `Hora actual: ${instanteLocal(estado.instante, zonaHoraria).horaMinuto}`;
    botonActualizar.disabled = estado.cargando;
    pintarEstadoSlot(estado.propuesta);

    mensajeCargando.hidden = !estado.cargando;
    rejilla.hidden = estado.cargando;
    if (estado.cargando) {
      return;
    }

    const claveEnfocada = elementoConFoco();
    rejilla.textContent = '';
    for (const [clave, tarjeta] of estado.tarjetas) {
      const elemento = crearTarjetaElemento(clave, tarjeta, estado.avatares);
      rejilla.append(elemento);
      if (clave === claveEnfocada) {
        elemento.focus();
      }
    }
  }

  function construirTarjetas(lista: readonly AlumnoPropuesto[], anterior: ReadonlyMap<string, EstadoTarjeta>): ReadonlyMap<string, EstadoTarjeta> {
    const nuevo = new Map<string, EstadoTarjeta>();
    for (const { alumno, slot } of lista) {
      const clave = claveRegistroPorSlot(alumno.id, slot.id);
      const registro = registrosHoyCache.get(clave);
      if (registro) {
        nuevo.set(clave, { alumno, slot, fase: 'registrado', peticionId: registro.peticion_id, asistencia: registro });
        continue;
      }
      const previa = anterior.get(clave);
      if (previa && (previa.fase === 'enviando' || previa.fase === 'error')) {
        nuevo.set(clave, previa);
        continue;
      }
      nuevo.set(clave, { alumno, slot, fase: 'pendiente', peticionId: deps.generarPeticionId() });
    }
    // Una petición en curso nunca desaparece de la rejilla aunque el tramo horario cambie mientras
    // se espera la respuesta del servidor (p. ej. la ventana de tolerancia se cierra justo en ese
    // instante): solo se retira cuando la propia petición resuelve y `fijarTarjeta` la reemplaza.
    for (const [clave, tarjeta] of anterior) {
      if (!nuevo.has(clave) && tarjeta.fase === 'enviando') {
        nuevo.set(clave, tarjeta);
      }
    }
    return nuevo;
  }

  function aplicarRecalculo(instante: Date): void {
    const opciones: OpcionesPropuesta = {
      ...(deps.zonaHoraria !== undefined ? { zonaHoraria: deps.zonaHoraria } : {}),
      ...(deps.tolerancia !== undefined ? { tolerancia: deps.tolerancia } : {}),
    };
    const propuesta = alumnosPropuestos({ profesorId: deps.profesorId, instante, slots: slotsCache, ...opciones });
    const lista =
      propuesta.tipo === 'sin_clases_hoy' ? [] : [...propuesta.alumnos].sort((a, b) => compararAlumnosParaOrden(a.alumno, b.alumno));
    almacen.actualizar((actual) => ({ ...actual, instante, propuesta, tarjetas: construirTarjetas(lista, actual.tarjetas) }));
  }

  async function cargarAvataresPendientes(): Promise<void> {
    const estado = almacen.obtener();
    const pendientes: AlumnoConRutaAvatar[] = [];
    for (const tarjeta of estado.tarjetas.values()) {
      const { id, avatar_ruta: rutaBase } = tarjeta.alumno;
      if (rutaBase && !estado.avatares.has(id) && !avataresPedidos.has(id)) {
        avataresPedidos.add(id);
        pendientes.push({ alumnoId: id, rutaBase });
      }
    }
    if (pendientes.length === 0) {
      return;
    }
    try {
      const urls = await deps.obtenerUrlsAvataresMini(pendientes);
      almacen.actualizar((actual) => ({ ...actual, avatares: new Map([...actual.avatares, ...urls]) }));
    } catch {
      // Firma fallida: cada card se queda con su monograma (requisito 4); permite reintentarlo en
      // el próximo tick o refresco manual en vez de dejarlo marcado como "pedido" para siempre.
      for (const pendiente of pendientes) {
        avataresPedidos.delete(pendiente.alumnoId);
      }
    }
  }

  async function cargar(): Promise<void> {
    almacen.actualizar({ cargando: true, errorCarga: '' });
    const instante = deps.reloj.ahora();
    try {
      const [slots, asistenciaHoy] = await Promise.all([deps.cargarPropuesta(), deps.cargarAsistenciaDeHoy(instante)]);
      slotsCache = slots;
      registrosHoyCache = registrosDeHoyPorAlumnoSlot(asistenciaHoy);
      aplicarRecalculo(instante);
      almacen.actualizar({ cargando: false });
      void cargarAvataresPendientes();
    } catch (error) {
      almacen.actualizar({ cargando: false, errorCarga: mensajeAmigable(error) });
    }
  }

  function fijarTarjeta(clave: string, tarjeta: EstadoTarjeta): void {
    almacen.actualizar((actual) => {
      const nuevoMapa = new Map(actual.tarjetas);
      nuevoMapa.set(clave, tarjeta);
      return { ...actual, tarjetas: nuevoMapa };
    });
  }

  async function reconciliarConflicto(clave: string, tarjeta: EstadoTarjeta): Promise<void> {
    try {
      const registros = await deps.cargarAsistenciaDeHoy(almacen.obtener().instante);
      registrosHoyCache = registrosDeHoyPorAlumnoSlot(registros);
      const fila = registrosHoyCache.get(clave);
      if (fila) {
        fijarTarjeta(clave, { alumno: tarjeta.alumno, slot: tarjeta.slot, fase: 'registrado', peticionId: tarjeta.peticionId, asistencia: fila });
        return;
      }
      fijarTarjeta(clave, {
        alumno: tarjeta.alumno,
        slot: tarjeta.slot,
        fase: 'error',
        peticionId: tarjeta.peticionId,
        mensajeError: 'Ya hay un registro para este alumno hoy, pero no se ha podido recuperar. Actualiza la pantalla.',
      });
    } catch (error) {
      fijarTarjeta(clave, {
        alumno: tarjeta.alumno,
        slot: tarjeta.slot,
        fase: 'error',
        peticionId: tarjeta.peticionId,
        mensajeError: mensajeAmigable(error),
      });
    }
  }

  async function manejarToque(clave: string): Promise<void> {
    const tarjeta = almacen.obtener().tarjetas.get(clave);
    if (!tarjeta || tarjeta.fase === 'registrado' || tarjeta.fase === 'enviando') {
      return;
    }
    fijarTarjeta(clave, { alumno: tarjeta.alumno, slot: tarjeta.slot, fase: 'enviando', peticionId: tarjeta.peticionId });
    try {
      const fila = await deps.registrar({
        alumnoId: tarjeta.alumno.id,
        origen: 'slot',
        slotId: tarjeta.slot.id,
        peticionId: tarjeta.peticionId,
      });
      registrosHoyCache = new Map([...registrosHoyCache, [clave, fila]]);
      fijarTarjeta(clave, { alumno: tarjeta.alumno, slot: tarjeta.slot, fase: 'registrado', peticionId: tarjeta.peticionId, asistencia: fila });
    } catch (error) {
      if (error instanceof Conflicto) {
        await reconciliarConflicto(clave, tarjeta);
        return;
      }
      fijarTarjeta(clave, { alumno: tarjeta.alumno, slot: tarjeta.slot, fase: 'error', peticionId: tarjeta.peticionId, mensajeError: mensajeAmigable(error) });
    }
  }

  function obtenerProtector(clave: string): () => Promise<void> {
    let protector = protectoresTarjeta.get(clave);
    if (!protector) {
      protector = crearProtectorDobleToque(() => manejarToque(clave));
      protectoresTarjeta.set(clave, protector);
    }
    return protector;
  }

  almacen.suscribir(pintar);
  contenedor.append(zonaError, cabecera, mensajeCargando, rejilla);
  pintar(almacen.obtener());
  void cargar();

  deps.programador.cada(INTERVALO_TICK_MS, () => {
    aplicarRecalculo(deps.reloj.ahora());
    void cargarAvataresPendientes();
  });
}
