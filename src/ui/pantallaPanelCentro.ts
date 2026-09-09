/**
 * Panel de centro para el administrador (R-11): tres bloques de un vistazo — las sesiones de hoy y
 * su estado, el ranking de alumnos con más ausencias sin justificar y el ranking de profesores con
 * menor proporción de sesiones registradas frente a las esperadas. Reservado a `administrator`
 * (`puedeVerPanelCentro`) — presentación, no control de acceso real (ver cabecera de
 * `permisosUi.ts`).
 *
 * Sin tabla nueva (requisito 1): compone datos ya existentes de T-15 (horario), R-12 (cierres),
 * R-06 (excepciones) y T-18/R-01 (asistencia), cruzados por `dominio/panelCentro.ts` — este módulo
 * solo decide QUÉ pedir y CÓMO pintarlo. El alcance de alumnos (requisito 3: filtro por centro) se
 * resuelve UNA vez (`listarAlumnosActivos`) y el resultado, un `Map` por id, es la única fuente de
 * verdad de "quién está en alcance": los registros de asistencia que trae de vuelta el servidor
 * para el centro elegido (o para todos) se filtran contra ese mismo mapa antes de cruzarlos, para
 * que las tres secciones cuenten exactamente los mismos alumnos — activos del centro elegido, nunca
 * uno dado de baja aunque el servidor lo hubiera incluido en la respuesta de asistencia.
 *
 * Las sesiones de hoy (bloque 1a) usan siempre `deps.reloj.ahora()`, nunca el rango de fechas
 * elegido (requisito 3, el filtro es para los dos rankings): no tendría sentido preguntar "¿qué ha
 * pasado hoy?" sobre un mes ya cerrado.
 */

import type { Rol, CierreCentro, ExcepcionSlot, SlotHorario } from '../dominio/tipos.ts';
import { puedeVerPanelCentro } from '../dominio/permisosUi.ts';
import {
  sesionesDeHoyPanelCentro,
  rankingAusenciasSinJustificarPanelCentro,
  rankingAsistenciaProfesoresPanelCentro,
  type AlumnoParaPanelCentro,
  type SesionHoyPanelCentro,
  type FilaRankingAusenciasPanelCentro,
  type FilaRankingAsistenciaProfesorPanelCentro,
} from '../dominio/panelCentro.ts';
import { fechaLocalISO, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import { limitesDelMes } from '../dominio/informeMensualAlumno.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { FiltroHistorico } from '../datos/asistencia.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import { crearElemento } from './dom.ts';
import { crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface CentroParaFiltroPanel {
  readonly id: string;
  readonly nombre: string;
}

const ETIQUETA_ESTADO_SESION: Readonly<Record<SesionHoyPanelCentro['estado'], string>> = {
  pasada_lista: 'Pasada lista',
  pendiente: 'Pendiente',
  sin_pasar_lista: 'Sin pasar lista',
};

export interface DependenciasPantallaPanelCentro {
  readonly rol: Rol;
  readonly reloj: Reloj;
  readonly zonaHoraria?: string;
  listarCentrosParaFiltro(): Promise<readonly CentroParaFiltroPanel[]>;
  listarAlumnosActivos(centroId?: string): Promise<readonly AlumnoParaPanelCentro[]>;
  listarSlotsDeAlumnos(alumnoIds: readonly string[]): Promise<readonly SlotHorario[]>;
  listarCierresActivos(): Promise<readonly CierreCentro[]>;
  listarExcepcionesEnRango(desde: string, hasta: string): Promise<readonly ExcepcionSlot[]>;
  listarHistoricoCompleto(filtro: Omit<FiltroHistorico, 'pagina' | 'porPagina'>): Promise<readonly Asistencia[]>;
  resolverNombresProfesores(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export function mostrarPantallaPanelCentro(contenedor: HTMLElement, deps: DependenciasPantallaPanelCentro): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerPanelCentro(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const zonaHoraria = deps.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const ahoraInicial = deps.reloj.ahora();
  const fechaInicial = fechaLocalISO(ahoraInicial, zonaHoraria);
  const { primerDia, ultimoDia } = limitesDelMes(Number(fechaInicial.slice(0, 4)), Number(fechaInicial.slice(5, 7)));

  let cargando = true;
  let errorCarga = '';
  let filtroCentroId: string | null = null;
  let filtroDesde = primerDia;
  let filtroHasta = ultimoDia;
  let centrosDisponibles: readonly CentroParaFiltroPanel[] = [];
  let sesionesHoy: readonly SesionHoyPanelCentro[] = [];
  let rankingAusencias: readonly FilaRankingAusenciasPanelCentro[] = [];
  let rankingProfesores: readonly FilaRankingAsistenciaProfesorPanelCentro[] = [];

  const titulo = crearElemento(documento, 'h1', { texto: 'Panel de centro' });
  const zonaError = crearZonaMensaje(documento, 'alert');

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      const ahora = deps.reloj.ahora();
      const hoyIso = fechaLocalISO(ahora, zonaHoraria);
      const centroId = filtroCentroId ?? undefined;

      const alumnos = await deps.listarAlumnosActivos(centroId);
      const alumnosPorId = new Map(alumnos.map((alumno) => [alumno.id, alumno]));
      const alumnoIds = alumnos.map((alumno) => alumno.id);

      const filtroBase: Omit<FiltroHistorico, 'pagina' | 'porPagina' | 'desde' | 'hasta'> = centroId ? { centroId } : {};

      const [slots, cierres, excepcionesHoy, excepcionesRango, registrosHoyBruto, registrosRangoBruto] = await Promise.all([
        deps.listarSlotsDeAlumnos(alumnoIds),
        deps.listarCierresActivos(),
        deps.listarExcepcionesEnRango(hoyIso, hoyIso),
        deps.listarExcepcionesEnRango(filtroDesde, filtroHasta),
        deps.listarHistoricoCompleto({
          ...filtroBase,
          desde: new Date(`${hoyIso}T00:00:00.000Z`),
          hasta: new Date(`${hoyIso}T00:00:00.000Z`),
        }),
        deps.listarHistoricoCompleto({
          ...filtroBase,
          desde: new Date(`${filtroDesde}T00:00:00.000Z`),
          hasta: new Date(`${filtroHasta}T00:00:00.000Z`),
        }),
      ]);

      const nombresProfesores = await deps.resolverNombresProfesores([...new Set(slots.map((slot) => slot.profesor_id))]);

      // Vuelve a acotar al alcance elegido (requisito 3): la respuesta del servidor para un centro
      // puede incluir alumnos ya de baja (el histórico de T-23 no filtra por `activo`), que este
      // panel nunca debe contar — ver cabecera del módulo.
      const registrosHoy = registrosHoyBruto.filter((registro) => alumnosPorId.has(registro.alumno_id));
      const registrosRango = registrosRangoBruto.filter((registro) => alumnosPorId.has(registro.alumno_id));

      sesionesHoy = sesionesDeHoyPanelCentro({
        instante: ahora,
        slots,
        alumnosPorId,
        nombresProfesores,
        registrosHoy,
        cierres,
        excepciones: excepcionesHoy,
        zonaHoraria,
      });
      rankingAusencias = rankingAusenciasSinJustificarPanelCentro(registrosRango, alumnosPorId);
      rankingProfesores = rankingAsistenciaProfesoresPanelCentro({
        desde: filtroDesde,
        hasta: filtroHasta,
        slots,
        cierres,
        excepciones: excepcionesRango,
        asistencias: registrosRango,
        nombresProfesores,
        zonaHoraria,
      });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  // --- Filtros (requisito 3): centro de referencia y rango de fechas ---
  const selectCentro = documento.createElement('select');
  selectCentro.id = 'panel-centro-filtro-centro';
  const etiquetaCentro = crearElemento(documento, 'label', { texto: 'Centro de estudios', atributos: { for: 'panel-centro-filtro-centro' } });
  selectCentro.addEventListener('change', () => {
    filtroCentroId = selectCentro.value.length > 0 ? selectCentro.value : null;
    void cargar();
  });

  const campoDesde = documento.createElement('input');
  campoDesde.type = 'date';
  campoDesde.id = 'panel-centro-filtro-desde';
  campoDesde.value = filtroDesde;
  const etiquetaDesde = crearElemento(documento, 'label', { texto: 'Desde', atributos: { for: 'panel-centro-filtro-desde' } });
  campoDesde.addEventListener('change', () => {
    if (campoDesde.value.length > 0) {
      filtroDesde = campoDesde.value;
      void cargar();
    }
  });

  const campoHasta = documento.createElement('input');
  campoHasta.type = 'date';
  campoHasta.id = 'panel-centro-filtro-hasta';
  campoHasta.value = filtroHasta;
  const etiquetaHasta = crearElemento(documento, 'label', { texto: 'Hasta', atributos: { for: 'panel-centro-filtro-hasta' } });
  campoHasta.addEventListener('change', () => {
    if (campoHasta.value.length > 0) {
      filtroHasta = campoHasta.value;
      void cargar();
    }
  });

  function pintarTablaSesionesHoy(): HTMLElement {
    if (sesionesHoy.length === 0) {
      return crearElemento(documento, 'p', { texto: 'No hay ninguna sesión prevista hoy para este alcance.' });
    }
    const tabla = documento.createElement('table');
    const cabecera = documento.createElement('thead');
    const filaCabecera = documento.createElement('tr');
    for (const texto of ['Hora', 'Alumno', 'Profesor', 'Asignatura / grupo', 'Estado']) {
      filaCabecera.append(crearElemento(documento, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = documento.createElement('tbody');
    for (const sesion of sesionesHoy) {
      const fila = documento.createElement('tr');
      fila.append(
        crearElemento(documento, 'td', { texto: `${sesion.horaInicio}–${sesion.horaFin}` }),
        crearElemento(documento, 'td', { texto: sesion.alumnoNombre }),
        crearElemento(documento, 'td', { texto: sesion.profesorNombre }),
        crearElemento(documento, 'td', { texto: sesion.asignaturaOGrupo ?? '' }),
        crearElemento(documento, 'td', { texto: ETIQUETA_ESTADO_SESION[sesion.estado] }),
      );
      cuerpo.append(fila);
    }
    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  function pintarTablaRankingAusencias(): HTMLElement {
    if (rankingAusencias.length === 0) {
      return crearElemento(documento, 'p', { texto: 'Ningún alumno tiene ausencias sin justificar en este rango.' });
    }
    const tabla = documento.createElement('table');
    const cabecera = documento.createElement('thead');
    const filaCabecera = documento.createElement('tr');
    for (const texto of ['Alumno', 'Ausencias sin justificar']) {
      filaCabecera.append(crearElemento(documento, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = documento.createElement('tbody');
    for (const fila of rankingAusencias) {
      const filaEl = documento.createElement('tr');
      filaEl.append(
        crearElemento(documento, 'td', { texto: fila.alumnoNombre }),
        crearElemento(documento, 'td', { texto: String(fila.ausenciasSinJustificar) }),
      );
      cuerpo.append(filaEl);
    }
    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  function pintarTablaRankingProfesores(): HTMLElement {
    if (rankingProfesores.length === 0) {
      return crearElemento(documento, 'p', { texto: 'Ningún profesor tiene sesiones esperadas en este rango.' });
    }
    const tabla = documento.createElement('table');
    const cabecera = documento.createElement('thead');
    const filaCabecera = documento.createElement('tr');
    for (const texto of ['Profesor', 'Esperadas', 'Registradas', 'Proporción']) {
      filaCabecera.append(crearElemento(documento, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = documento.createElement('tbody');
    for (const fila of rankingProfesores) {
      const filaEl = documento.createElement('tr');
      filaEl.append(
        crearElemento(documento, 'td', { texto: fila.profesorNombre }),
        crearElemento(documento, 'td', { texto: String(fila.sesionesEsperadas) }),
        crearElemento(documento, 'td', { texto: String(fila.sesionesRegistradas) }),
        crearElemento(documento, 'td', { texto: fila.proporcion === null ? '—' : `${String(Math.round(fila.proporcion * 100))}%` }),
      );
      cuerpo.append(filaEl);
    }
    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  const seccionSesionesHoy = documento.createElement('section');
  const seccionRankingAusencias = documento.createElement('section');
  const seccionRankingProfesores = documento.createElement('section');

  function pintar(): void {
    zonaError.textContent = errorCarga;

    seccionSesionesHoy.textContent = '';
    seccionSesionesHoy.append(
      crearElemento(documento, 'h2', { texto: 'Sesiones de hoy' }),
      cargando ? crearElemento(documento, 'p', { texto: 'Cargando…' }) : pintarTablaSesionesHoy(),
    );

    seccionRankingAusencias.textContent = '';
    seccionRankingAusencias.append(
      crearElemento(documento, 'h2', { texto: 'Alumnos con más ausencias sin justificar' }),
      cargando ? crearElemento(documento, 'p', { texto: 'Cargando…' }) : pintarTablaRankingAusencias(),
    );

    seccionRankingProfesores.textContent = '';
    seccionRankingProfesores.append(
      crearElemento(documento, 'h2', { texto: 'Profesores con menor proporción de sesiones registradas' }),
      cargando ? crearElemento(documento, 'p', { texto: 'Cargando…' }) : pintarTablaRankingProfesores(),
    );
  }

  contenedor.append(
    titulo,
    zonaError,
    etiquetaCentro,
    selectCentro,
    etiquetaDesde,
    campoDesde,
    etiquetaHasta,
    campoHasta,
    seccionSesionesHoy,
    seccionRankingAusencias,
    seccionRankingProfesores,
  );

  async function iniciar(): Promise<void> {
    // `cargar()` arranca ya (su prefijo síncrono deja `cargando` pintado antes del primer `await`,
    // mismo criterio que el resto de pantallas del proyecto) en paralelo con el selector de centro,
    // que no depende de ella ni ella de él.
    const cargaInicial = cargar();
    centrosDisponibles = await deps.listarCentrosParaFiltro().catch(() => []);
    selectCentro.append(crearElemento(documento, 'option', { texto: 'Todos', atributos: { value: '' } }));
    for (const centro of centrosDisponibles) {
      selectCentro.append(crearElemento(documento, 'option', { texto: centro.nombre, atributos: { value: centro.id } }));
    }
    await cargaInicial;
  }

  void iniciar();
}
