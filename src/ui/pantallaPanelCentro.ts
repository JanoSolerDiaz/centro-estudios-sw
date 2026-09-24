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
 *
 * Bloque 4, exportación completa del centro (R-16, copia de seguridad y portabilidad): un botón
 * «Exportar todo el centro» que descarga un único JSON con el catálogo de centros, todos los
 * alumnos (activos e inactivos) con sus personas de referencia, todos los slots (cualquier
 * vigencia) y el histórico completo de asistencia — sin filtro de centro ni de rango, a diferencia
 * de los tres bloques de arriba: es un volcado de TODO lo que el centro tiene guardado, no una
 * vista acotada al alcance elegido en los filtros de este panel. Reservado a `administrator` por la
 * misma guarda de la pantalla completa (`puedeVerPanelCentro`) — no hace falta una segunda función
 * de `permisosUi.ts`, mismo criterio que R-15 (requisito 5 de R-16 ya lo cubre la inaccesibilidad
 * estructural de todo el panel).
 *
 * Bloque 5, avisos de ausencia del profesor pendientes (R-29, requisito 3): `deps.listarAvisosAusenciaPendientes`/
 * `deps.marcarAvisoAusenciaAtendido`, OPCIONALES JUNTOS — mismo criterio que el par
 * `notificador`/`preferenciaRecordatorio` de R-26 en `pantallaMiHorario.ts`: sin los dos, el panel
 * funciona exactamente como antes de R-29 (ningún bloque nuevo). Ya vienen ordenados por
 * `fecha_sesion` (la propia consulta, `datos/avisosAusenciaProfesor.ts`); los nombres de profesor se
 * resuelven reutilizando `resolverNombresProfesores` sobre los ids de los avisos, fusionados con los
 * de los slots del bloque 1a en una única llamada (nunca una petición aparte). «Marcar atendido» no
 * tiene más acción asociada (requisito 3, literal) y quita el aviso de la lista al confirmar sin
 * volver a pedir toda la página.
 *
 * R-30: cada fila del bloque 5 gana un botón «Declarar sustitución o cancelación» junto a «Marcar
 * atendido» (`deps.irARegistro`, mismo patrón que `pantallaRegistroAuditoria.ts` de R-20) que navega a
 * `#/registros/<profesorId>/<slotId>/<fecha>` con los propios `profesor_id`/`slot_id`/`fecha_sesion`
 * del aviso — sin ruta ni RPC nueva. `listarAvisosAusenciaPendientes` ya filtra por `estado =
 * 'pendiente'` (requisito 4 de R-30: un aviso atendido nunca llega a esta lista, así que ninguna fila
 * necesita ocultar el botón). Opcional por sí sola: sin `deps.irARegistro`, la fila solo ofrece
 * «Marcar atendido», exactamente como antes de R-30.
 */

import type {
  Rol,
  CentroEstudios,
  CierreCentro,
  ExcepcionSlot,
  PausaAlumno,
  PersonaReferencia,
  SlotHorario,
  AvisoAusenciaProfesor,
} from '../dominio/tipos.ts';
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
import {
  construirDatosExportacionCentro,
  generarJsonExportacionCentro,
  type AlumnoParaExportacionCentro,
} from '../dominio/exportacionCentro.ts';
import { fechaLocalISO, fechaHoraLocalLegible, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import { limitesDelMes } from '../dominio/informeMensualAlumno.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { FiltroHistorico } from '../datos/asistencia.ts';
import type { Asistencia } from '../dominio/tipos.ts';
import { crearElemento, type Descargador } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface CentroParaFiltroPanel {
  readonly id: string;
  readonly nombre: string;
}

/** Lo mínimo que necesita este módulo de un alumno para la exportación (R-16) — estructuralmente
 * compatible con `datos/alumnos.ts#AlumnoConCentro`, sin importarla (esta pantalla ya evita ese
 * acoplamiento para el resto de sus dependencias). */
export interface AlumnoParaExportacionPanel {
  readonly id: string;
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly centro_referencia_id: string;
  readonly avatar_ruta: string | null;
  readonly email_alumno: string | null;
  readonly telefono_alumno: string | null;
  readonly activo: boolean;
  readonly alta_en: string;
  readonly baja_en: string | null;
  readonly motivo_baja: string | null;
  readonly usuario_id: string | null;
  readonly creado_en: string;
  readonly actualizado_en: string;
  readonly centro: Pick<CentroEstudios, 'nombre'>;
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
  /** Pausas ACTIVAS (R-21) de los alumnos en alcance, en una única petición — excluye del ranking
   * de ausencias sin justificar (requisito 3 de R-21) cualquier registro que cayera dentro de una
   * pausa del propio alumno. */
  listarPausasActivasDeAlumnos(alumnoIds: readonly string[]): Promise<readonly PausaAlumno[]>;
  listarHistoricoCompleto(filtro: Omit<FiltroHistorico, 'pagina' | 'porPagina'>): Promise<readonly Asistencia[]>;
  resolverNombresProfesores(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
  /** Solo para el bloque de exportación completa (R-16) — el resto de la pantalla nunca necesita el
   * catálogo entero, activos e inactivos, de centros. */
  readonly nombreUsuarioActual: string;
  readonly descargador: Descargador;
  listarTodosLosCentros(): Promise<readonly CentroEstudios[]>;
  listarTodosLosAlumnos(): Promise<readonly AlumnoParaExportacionPanel[]>;
  listarPersonasReferenciaDeAlumnos(alumnoIds: readonly string[]): Promise<ReadonlyMap<string, readonly PersonaReferencia[]>>;
  /** R-29, requisito 3: avisos `pendiente` de cualquier profesor, ya ordenados por `fecha_sesion`.
   * Opcional JUNTO a `marcarAvisoAusenciaAtendido` — sin las dos, no aparece ningún bloque nuevo. */
  listarAvisosAusenciaPendientes?(): Promise<readonly AvisoAusenciaProfesor[]>;
  /** R-29, requisito 3: marca un aviso como atendido, sin más acción asociada. Opcional junto a
   * `listarAvisosAusenciaPendientes`. */
  marcarAvisoAusenciaAtendido?(avisoId: string): Promise<AvisoAusenciaProfesor>;
  /** R-30: navega a «Registros» (T-21/R-06) con el profesor, el slot y la fecha del propio aviso ya
   * elegidos — mismo `deps.irARegistro` que R-20 usa en `pantallaRegistroAuditoria.ts`, sin ruta ni
   * parámetro nuevo. Opcional: sin ella, la fila del aviso solo ofrece «Marcar atendido», igual que
   * antes de R-30 (el enlace no condiciona el resto del bloque). */
  irARegistro?(profesorId: string, slotId: string, fecha: string): void;
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
  // R-29: solo se rellena cuando las dos dependencias del bloque 5 están presentes (ver cabecera).
  let avisosAusenciaPendientes: readonly AvisoAusenciaProfesor[] = [];
  let nombresProfesoresAviso: ReadonlyMap<string, string> = new Map();
  const avisosAusenciaAtendiendo = new Set<string>();
  let errorAvisoAusencia = '';

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

      const [slots, cierres, excepcionesHoy, excepcionesRango, pausas, registrosHoyBruto, registrosRangoBruto, avisosAusencia] =
        await Promise.all([
          deps.listarSlotsDeAlumnos(alumnoIds),
          deps.listarCierresActivos(),
          deps.listarExcepcionesEnRango(hoyIso, hoyIso),
          deps.listarExcepcionesEnRango(filtroDesde, filtroHasta),
          deps.listarPausasActivasDeAlumnos(alumnoIds),
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
          deps.listarAvisosAusenciaPendientes && deps.marcarAvisoAusenciaAtendido
            ? deps.listarAvisosAusenciaPendientes()
            : Promise.resolve([]),
        ]);
      avisosAusenciaPendientes = avisosAusencia;

      const nombresProfesores = await deps.resolverNombresProfesores([
        ...new Set([...slots.map((slot) => slot.profesor_id), ...avisosAusencia.map((aviso) => aviso.profesor_id)]),
      ]);
      nombresProfesoresAviso = nombresProfesores;

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
      rankingAusencias = rankingAusenciasSinJustificarPanelCentro(registrosRango, alumnosPorId, pausas, zonaHoraria);
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

  /** R-29: las dos dependencias del bloque 5 vienen juntas o no vienen — mismo criterio que el par
   * `notificador`/`preferenciaRecordatorio` de R-26 en `pantallaMiHorario.ts`. */
  function bloqueAvisosAusenciaDisponible(): boolean {
    return deps.listarAvisosAusenciaPendientes !== undefined && deps.marcarAvisoAusenciaAtendido !== undefined;
  }

  function pintarTablaAvisosAusencia(): HTMLElement {
    if (avisosAusenciaPendientes.length === 0) {
      return crearElemento(documento, 'p', { texto: 'Ningún profesor ha avisado de una ausencia pendiente de atender.' });
    }
    const tabla = documento.createElement('table');
    const cabecera = documento.createElement('thead');
    const filaCabecera = documento.createElement('tr');
    for (const texto of ['Profesor', 'Fecha', 'Hora', 'Asignatura / grupo', 'Motivo', '']) {
      filaCabecera.append(crearElemento(documento, 'th', { texto, atributos: { scope: 'col' } }));
    }
    cabecera.append(filaCabecera);
    const cuerpo = documento.createElement('tbody');
    for (const aviso of avisosAusenciaPendientes) {
      const fila = documento.createElement('tr');
      fila.append(
        crearElemento(documento, 'td', { texto: nombresProfesoresAviso.get(aviso.profesor_id) ?? aviso.profesor_id }),
        crearElemento(documento, 'td', { texto: aviso.fecha_sesion }),
        crearElemento(documento, 'td', { texto: `${aviso.hora_inicio}–${aviso.hora_fin}` }),
        crearElemento(documento, 'td', { texto: aviso.asignatura_o_grupo ?? '' }),
        crearElemento(documento, 'td', { texto: aviso.motivo ?? '' }),
      );
      const celdaAccion = documento.createElement('td');
      const atendiendo = avisosAusenciaAtendiendo.has(aviso.id);
      const botonAtendido = crearBoton(documento, atendiendo ? 'Marcando…' : 'Marcar atendido', 'button');
      botonAtendido.disabled = atendiendo;
      botonAtendido.addEventListener('click', () => {
        void marcarAvisoAusenciaAtendidoYRepintar(aviso.id);
      });
      celdaAccion.append(botonAtendido);
      if (deps.irARegistro) {
        const botonDeclarar = crearBoton(documento, 'Declarar sustitución o cancelación', 'button');
        botonDeclarar.addEventListener('click', () => {
          deps.irARegistro?.(aviso.profesor_id, aviso.slot_id, aviso.fecha_sesion);
        });
        celdaAccion.append(botonDeclarar);
      }
      fila.append(celdaAccion);
      cuerpo.append(fila);
    }
    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  /** R-29, requisito 3: "sin más acción asociada" — solo quita el aviso de la lista al confirmar,
   * sin recargar el resto del panel. */
  async function marcarAvisoAusenciaAtendidoYRepintar(avisoId: string): Promise<void> {
    if (!deps.marcarAvisoAusenciaAtendido || avisosAusenciaAtendiendo.has(avisoId)) {
      return;
    }
    avisosAusenciaAtendiendo.add(avisoId);
    errorAvisoAusencia = '';
    pintar();
    try {
      await deps.marcarAvisoAusenciaAtendido(avisoId);
      avisosAusenciaPendientes = avisosAusenciaPendientes.filter((aviso) => aviso.id !== avisoId);
    } catch (error) {
      errorAvisoAusencia = mensajeAmigable(error);
    }
    avisosAusenciaAtendiendo.delete(avisoId);
    pintar();
  }

  const seccionSesionesHoy = documento.createElement('section');
  const seccionRankingAusencias = documento.createElement('section');
  const seccionRankingProfesores = documento.createElement('section');
  const seccionAvisosAusencia = documento.createElement('section');

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

    seccionAvisosAusencia.textContent = '';
    if (bloqueAvisosAusenciaDisponible()) {
      seccionAvisosAusencia.append(
        crearElemento(documento, 'h2', { texto: 'Avisos de ausencia pendientes' }),
        cargando ? crearElemento(documento, 'p', { texto: 'Cargando…' }) : pintarTablaAvisosAusencia(),
      );
      if (errorAvisoAusencia) {
        seccionAvisosAusencia.append(crearElemento(documento, 'p', { texto: errorAvisoAusencia }));
      }
    }
  }

  // --- Bloque 4: exportación completa del centro (R-16) ---
  const seccionExportacion = documento.createElement('section');
  const zonaMensajeExportacion = crearZonaMensaje(documento, 'alert');
  const botonExportar = crearBoton(documento, 'Exportar todo el centro', 'button');
  let exportando = false;

  botonExportar.addEventListener('click', () => {
    if (exportando) {
      return;
    }
    void (async () => {
      exportando = true;
      zonaMensajeExportacion.textContent = '';
      try {
        const [centros, alumnosBase] = await Promise.all([deps.listarTodosLosCentros(), deps.listarTodosLosAlumnos()]);
        const alumnoIds = alumnosBase.map((alumno) => alumno.id);
        const [personasPorAlumno, slotsExportacion, historicoExportacion] = await Promise.all([
          deps.listarPersonasReferenciaDeAlumnos(alumnoIds),
          deps.listarSlotsDeAlumnos(alumnoIds),
          deps.listarHistoricoCompleto({}),
        ]);
        const alumnosExportacion: readonly AlumnoParaExportacionCentro[] = alumnosBase.map((alumno) => ({
          ...alumno,
          personasReferencia: personasPorAlumno.get(alumno.id) ?? [],
        }));
        const idsProfesores = [
          ...new Set([...slotsExportacion.map((slot) => slot.profesor_id), ...historicoExportacion.map((registro) => registro.profesor_id)]),
        ];
        const nombresProfesoresExportacion = await deps.resolverNombresProfesores(idsProfesores);
        const datosExportacion = construirDatosExportacionCentro({
          centros,
          alumnos: alumnosExportacion,
          slots: slotsExportacion,
          historico: historicoExportacion,
          nombresProfesores: nombresProfesoresExportacion,
          generadoEnLegible: fechaHoraLocalLegible(deps.reloj.ahora(), zonaHoraria),
          generadoPor: deps.nombreUsuarioActual,
          zonaHoraria,
        });
        deps.descargador.descargar(
          generarJsonExportacionCentro(datosExportacion),
          `exportacion-centro-${fechaLocalISO(deps.reloj.ahora(), zonaHoraria)}.json`,
          'application/json;charset=utf-8',
        );
      } catch (error) {
        zonaMensajeExportacion.textContent = mensajeAmigable(error);
      } finally {
        exportando = false;
      }
    })();
  });

  seccionExportacion.append(
    crearElemento(documento, 'h2', { texto: 'Copia de seguridad y portabilidad' }),
    crearElemento(documento, 'p', {
      texto: 'Descarga un único documento JSON con todo lo que el centro tiene guardado: centros, alumnos, personas de referencia, horarios e histórico completo de asistencia.',
    }),
    botonExportar,
    zonaMensajeExportacion,
  );

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
    seccionAvisosAusencia,
    seccionExportacion,
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
