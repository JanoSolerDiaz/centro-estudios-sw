/**
 * Alta de asistencia (T-18), vía la RPC `SECURITY DEFINER` `registrar_asistencia`
 * (`db/005_rpc_registrar_asistencia.sql`) — el `INSERT` directo sobre `asistencia` está revocado
 * (requisito 3 de T-18), así que esta es la ÚNICA puerta de escritura. La RPC fija ella misma
 * `registrado_en`/`profesor_id`/`es_retroactivo` y construye el snapshot del slot leyéndolo de la
 * base de datos: este módulo nunca envía esos campos, y no podría aunque quisiera — no existen
 * como parámetro de la función.
 *
 * `peticionId` es obligatorio y no se genera aquí: es responsabilidad de quien llama (la pantalla
 * de pasar lista, T-19, junto con `proteccionDobleToque` de T-06) generarlo una única vez por
 * intención de registro y REUTILIZAR el mismo valor en un reintento genuino — si esta función
 * generase uno nuevo en cada llamada, un reintento perdería la protección de idempotencia que da
 * la restricción `unique` de `peticion_id` en la base de datos (ver `db/MODELO.md`).
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { LimitadorTasa } from '../nucleo/limitadorTasa.ts';
import type { Asistencia, AsistenciaHistorial, OrigenAsistencia } from '../dominio/tipos.ts';
import { limitesDiaLocal, ZONA_HORARIA_CENTRO_POR_DEFECTO } from '../dominio/slots.ts';
import { logger, type Logger } from '../nucleo/registro.ts';

const TABLA = 'asistencia';

export interface RegistrarAsistenciaEntrada {
  readonly alumnoId: string;
  readonly origen: OrigenAsistencia;
  /** Obligatorio si `origen === 'slot'`; debe ser `null`/omitido si `origen === 'manual'` — la RPC
   * rechaza cualquier otra combinación (requisito 1 de T-18, `origenCoherente` en el dominio). */
  readonly slotId?: string | null;
  /** `null`/omitido para un registro en vivo (la RPC usa `now()` del servidor). Informado, marca el
   * registro como potencialmente retroactivo — la RPC decide el valor final de `es_retroactivo`. */
  readonly ocurridoEn?: Date | null;
  readonly nota?: string | null;
  /** Clave de idempotencia; ver la cabecera del módulo. */
  readonly peticionId: string;
  /** Solo tiene efecto si quien llama es `administrator` (requisito 2 de T-18): registra en nombre
   * de este profesor en vez de la identidad de la sesión. La RPC rechaza este parámetro para un
   * `teacher`, incluso si coincide con su propio id. */
  readonly profesorId?: string | null;
}

export interface DependenciasAsistencia {
  readonly postgrest: ClientePostgrest;
  /** Límite de cliente del contrato de T-06 (60 operaciones por profesor y minuto, ver
   * `DECISIONES_TECNICAS.md`) — defensa en profundidad; el límite autoritativo vive en la RPC
   * (`aplicar_limite_tasa`). Opcional: sin él, no se limita en el cliente. */
  readonly limitador?: LimitadorTasa;
}

/** Clave del limitador de tasa: el profesor cuya cuota se consume es el que REGISTRA la
 * asistencia (`profesorId` si un `administrator` registra en su nombre; si no, `usuarioId`), nunca
 * quien llama — así un `administrator` que registra en nombre de varios profesores en la misma
 * sesión no agota de golpe la cuota de ninguno de ellos por su propia actividad. */
function claveLimiteTasa(usuarioId: string, profesorId: string | null | undefined): string {
  return `asistencia:${profesorId ?? usuarioId}`;
}

/** Registra la entrada de un alumno (requisito 1 de T-18). Devuelve la fila creada tal como la
 * base de datos la guardó, incluidas las horas — nunca las que se enviaron, que la RPC ignora
 * salvo `ocurrido_en` (el único campo temporal que de verdad acepta como parámetro). */
export async function registrarAsistencia(
  deps: DependenciasAsistencia,
  usuarioId: string,
  entrada: RegistrarAsistenciaEntrada,
): Promise<Asistencia> {
  deps.limitador?.comprobar(claveLimiteTasa(usuarioId, entrada.profesorId));

  return deps.postgrest.rpc<Asistencia>('registrar_asistencia', {
    p_alumno_id: entrada.alumnoId,
    p_origen: entrada.origen,
    p_peticion_id: entrada.peticionId,
    p_slot_id: entrada.slotId ?? null,
    p_ocurrido_en: entrada.ocurridoEn ? entrada.ocurridoEn.toISOString() : null,
    p_nota: entrada.nota ?? null,
    p_profesor_id: entrada.profesorId ?? null,
  });
}

export interface ActualizarAsistenciaEntrada {
  readonly asistenciaId: string;
  /** Cambiar el alumno (T-21, requisito 4: "se tocó al equivocado"). `undefined`/`null` no lo toca. */
  readonly alumnoId?: string | null;
  /** Cambiar el slot atribuido, recalculando su snapshot en el servidor. Solo tiene efecto sobre un
   * registro de origen `slot` (la RPC lo rechaza si no); `undefined`/`null` no lo toca. */
  readonly slotId?: string | null;
  /** Ajustar la hora. `undefined`/`null` no la toca. */
  readonly ocurridoEn?: Date | null;
  /** Anular, con `motivoAnulacion` obligatorio cuando `anular` es `true` — la RPC lo exige y
   * rechaza sin él. Sin `desanular`: esta función no ofrece volver de 'anulada' a 'valida'. */
  readonly anular?: boolean;
  readonly motivoAnulacion?: string | null;
  /** Único par de parámetros con semántica tri-estado del módulo: sin `notaProvista: true`, `nota`
   * se ignora por completo — así "no tocar la nota" (omitir los dos) y "vaciarla" (`nota: null,
   * notaProvista: true`) son intenciones distintas y no se pueden confundir por descuido. */
  readonly nota?: string | null;
  readonly notaProvista?: boolean;
}

/** Modifica un registro de asistencia ya existente (T-21), vía la RPC `SECURITY DEFINER`
 * `actualizar_asistencia` (`db/008_rpc_actualizar_asistencia.sql`) — el UPDATE directo sobre
 * `asistencia` está revocado, igual que el INSERT (T-18): esta es la ÚNICA puerta de modificación.
 * `profesorDuenoId` es el `profesor_id` DUEÑO del registro (no necesariamente quien llama: un
 * `administrator` edita registros de cualquier profesor) — es la clave del límite de cliente de
 * T-06, defensa en profundidad; el límite autoritativo lo aplica la RPC sobre el mismo dueño. */
export async function actualizarAsistencia(
  deps: DependenciasAsistencia,
  profesorDuenoId: string,
  entrada: ActualizarAsistenciaEntrada,
): Promise<Asistencia> {
  deps.limitador?.comprobar(`asistencia:${profesorDuenoId}`);

  return deps.postgrest.rpc<Asistencia>('actualizar_asistencia', {
    p_asistencia_id: entrada.asistenciaId,
    p_alumno_id: entrada.alumnoId ?? null,
    p_slot_id: entrada.slotId ?? null,
    p_ocurrido_en: entrada.ocurridoEn ? entrada.ocurridoEn.toISOString() : null,
    p_anular: entrada.anular ?? false,
    p_motivo_anulacion: entrada.motivoAnulacion ?? null,
    p_nota: entrada.nota ?? null,
    p_nota_provista: entrada.notaProvista ?? false,
  });
}

/** Registros de UN slot concreto en el día natural (`limitesDiaLocal`, `dominio/slots.ts`) que
 * contiene `fecha` — CUALQUIER estado, incluidos los anulados (T-21, requisito 4: "la fila
 * permanece y se muestra tachada"), a diferencia de `listarAsistenciaDeHoy` (T-19), que siempre es
 * "hoy" y solo trae los válidos. `fecha` puede ser cualquier día, pasado o presente: la pantalla de
 * revisión de T-21 (`pantallaRegistrosSlot.ts`) elige slot y fecha a mano, nunca "ahora". `RLS`
 * (`003_politicas_rls.sql`) acota el resultado a los propios registros de un `teacher`, o a todos
 * para un `administrator` — este filtro por `slot_id` es sobre lo que el servidor ya deja ver. */
export async function listarRegistrosDeSlotYFecha(
  cliente: ClientePostgrest,
  slotId: string,
  fecha: Date,
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): Promise<readonly Asistencia[]> {
  const { inicioUtc, finUtc } = limitesDiaLocal(fecha, zonaHoraria);
  return cliente
    .desde<Asistencia>(TABLA)
    .eq('slot_id', slotId)
    .gte('ocurrido_en', inicioUtc.toISOString())
    .lte('ocurrido_en', new Date(finUtc.getTime() - 1).toISOString())
    .order('ocurrido_en', { descendente: false })
    .seleccionar();
}

/** Registros ya válidos de `profesorId` cuyo `ocurrido_en` cae en el día natural (`limitesDiaLocal`,
 * `dominio/slots.ts`) que contiene `instante` — una única petición a PostgREST (T-19, requisito 5:
 * "al abrir, ya se ve quién está registrado hoy en ese slot"; §0.2, "las URL firmadas de una
 * pantalla se piden SIEMPRE en lote", mismo criterio aplicado aquí a la consulta de registros).
 * `RLS` (`003_politicas_rls.sql`) ya acota el resultado a los propios registros de `profesorId`
 * para un `teacher`, o a todos para un `administrator` que llame en nombre de otro — este filtro
 * `eq('profesor_id', ...)` es defensa en profundidad, no la protección real. Incluye tanto los de
 * origen `slot` (la rejilla de cards) como los `manual` (T-20): quien llama decide qué hacer con
 * cada uno, esta función no filtra por origen. */
export async function listarAsistenciaDeHoy(
  cliente: ClientePostgrest,
  profesorId: string,
  instante: Date,
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): Promise<readonly Asistencia[]> {
  const { inicioUtc, finUtc } = limitesDiaLocal(instante, zonaHoraria);
  return cliente
    .desde<Asistencia>(TABLA)
    .eq('profesor_id', profesorId)
    .in('estado', ['valida', 'ausente'])
    .gte('ocurrido_en', inicioUtc.toISOString())
    .lte('ocurrido_en', new Date(finUtc.getTime() - 1).toISOString())
    .seleccionar();
}

export interface RegistrarAusenciaEntrada {
  readonly alumnoId: string;
  readonly slotId: string;
  /** `null`/omitido para una ausencia marcada en vivo (la RPC usa `now()` del servidor). Informado
   * (p. ej. al cerrar los registros de un día pasado desde `pantallaRegistrosSlot.ts`), atribuye la
   * ausencia a ese instante — la RPC decide el valor final de `es_retroactivo`. */
  readonly ocurridoEn?: Date | null;
  readonly nota?: string | null;
  readonly peticionId: string;
  /** Solo tiene efecto si quien llama es `administrator`: registra en nombre de este profesor en
   * vez de la identidad de la sesión, mismo criterio que `RegistrarAsistenciaEntrada`. */
  readonly profesorId?: string | null;
}

/** Marca como ausente a un alumno de UN slot (R-01, requisito 2), vía la RPC `SECURITY DEFINER`
 * `registrar_ausencia` (`db/010_registro_ausencias.sql`) — siempre de origen `slot`: una ausencia es
 * "no vino a lo que tocaba", nunca de un alumno extra que no tenía nada previsto. Reutiliza el mismo
 * limitador de cliente y la misma clave que `registrarAsistencia` (cupo compartido del profesor). */
export async function registrarAusencia(
  deps: DependenciasAsistencia,
  usuarioId: string,
  entrada: RegistrarAusenciaEntrada,
): Promise<Asistencia> {
  deps.limitador?.comprobar(claveLimiteTasa(usuarioId, entrada.profesorId));

  return deps.postgrest.rpc<Asistencia>('registrar_ausencia', {
    p_alumno_id: entrada.alumnoId,
    p_slot_id: entrada.slotId,
    p_peticion_id: entrada.peticionId,
    p_ocurrido_en: entrada.ocurridoEn ? entrada.ocurridoEn.toISOString() : null,
    p_nota: entrada.nota ?? null,
    p_profesor_id: entrada.profesorId ?? null,
  });
}

export interface FiltroHistorico {
  readonly alumnoId?: string;
  readonly profesorId?: string;
  /** Ignorado si `alumnoId` también está presente (ese filtro es más específico y no hace falta
   * resolver la lista de alumnos del centro para acotar a uno solo que ya se conoce). */
  readonly centroId?: string;
  /** Día de calendario (en `zonaHoraria`) desde el que empieza el rango, inclusive. */
  readonly desde?: Date;
  /** Día de calendario (en `zonaHoraria`) en el que termina el rango, inclusive. */
  readonly hasta?: Date;
  /** Página 0-based. */
  readonly pagina?: number;
  readonly porPagina?: number;
}

export interface ResultadoHistorico {
  readonly filas: readonly Asistencia[];
  readonly totalAproximado: number | null;
}

const PAGINA_POR_DEFECTO_HISTORICO = 20;

/** Ids de los alumnos de `centroId` (T-23, requisito 1: "por centro de estudios de referencia") —
 * contra la tabla base `alumno`, columnas de identificación que `authenticated` ya tiene concedidas
 * (`003_politicas_rls.sql`), así que también resuelve para un `teacher` (acotado a `activo = true`
 * por su propia RLS, igual que cualquier otra lectura suya de `alumno`). Sin paginar: el número de
 * alumnos de un centro es un conjunto acotado, del mismo orden que `listarProfesoresActivos`. */
async function idsAlumnosDeCentro(cliente: ClientePostgrest, centroId: string): Promise<readonly string[]> {
  const filas = await cliente
    .desde<{ readonly id: string }>('alumno')
    .eq('centro_referencia_id', centroId)
    .seleccionar('id');
  return filas.map((fila) => fila.id);
}

/** Consulta transversal del histórico (T-23, requisito 1: por alumno, por profesor, por centro y
 * por rango de fechas), paginada en servidor (requisito 5: "el histórico crece sin límite"). `RLS`
 * (`003_politicas_rls.sql`) ya acota el resultado a lo propio de un `teacher`, o a todo el centro
 * para un `administrator` — los filtros de aquí son sobre lo que el servidor ya deja ver, igual que
 * el resto de este módulo. Ordenado del más reciente al más antiguo: es una consulta de revisión,
 * no una rejilla de "lo de hoy" que tenga sentido leer cronológicamente hacia delante. */
export async function listarHistoricoAsistencia(
  cliente: ClientePostgrest,
  filtro: FiltroHistorico = {},
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
  /** Inyectable para tests deterministas (mismo criterio que `Reloj`/`ProgramadorIntervalo`); por
   * defecto la instancia real de T-02. */
  logAuditoria: Logger = logger,
): Promise<ResultadoHistorico> {
  // Traza mínima de la consulta (requisito 4 de T-23: "las consultas de datos personales dejan
  // traza mínima en el log") — solo ids (nunca un nombre, que este módulo ni siquiera resuelve) y
  // la página pedida, para poder auditar quién consultó qué sin guardar el dato personal en sí.
  logAuditoria.info('Consulta de histórico de asistencia', {
    alumno_id: filtro.alumnoId ?? null,
    profesor_id: filtro.profesorId ?? null,
    centro_id: filtro.centroId ?? null,
    pagina: filtro.pagina ?? 0,
  });

  let consulta = cliente.desde<Asistencia>(TABLA);

  if (filtro.alumnoId) {
    consulta = consulta.eq('alumno_id', filtro.alumnoId);
  } else if (filtro.centroId) {
    const ids = await idsAlumnosDeCentro(cliente, filtro.centroId);
    if (ids.length === 0) {
      return { filas: [], totalAproximado: 0 };
    }
    consulta = consulta.in('alumno_id', ids);
  }
  if (filtro.profesorId) {
    consulta = consulta.eq('profesor_id', filtro.profesorId);
  }
  if (filtro.desde) {
    consulta = consulta.gte('ocurrido_en', limitesDiaLocal(filtro.desde, zonaHoraria).inicioUtc.toISOString());
  }
  if (filtro.hasta) {
    const { finUtc } = limitesDiaLocal(filtro.hasta, zonaHoraria);
    consulta = consulta.lte('ocurrido_en', new Date(finUtc.getTime() - 1).toISOString());
  }

  const porPagina = filtro.porPagina ?? PAGINA_POR_DEFECTO_HISTORICO;
  const pagina = filtro.pagina ?? 0;
  const desde = pagina * porPagina;
  const { filas, totalAproximado } = await consulta
    .order('ocurrido_en', { descendente: true })
    .range(desde, desde + porPagina - 1)
    .seleccionarConTotal();
  return { filas, totalAproximado };
}

/** Tamaño de lote al traer el histórico COMPLETO para exportar (T-23, requisito 3) — no el de la
 * página que ve la pantalla. Un valor alto reduce el número de peticiones sin arriesgar una URL
 * desmedida (esta consulta no usa `in` con muchos valores, salvo el filtro de centro, ya resuelto
 * antes de paginar). */
const TAMANIO_LOTE_EXPORTACION = 500;

/** Todo el histórico que cumple `filtro`, sin paginar para la pantalla (T-23, requisito 3:
 * "exportación a CSV") — recorre `listarHistoricoAsistencia` página a página hasta que una página
 * viene incompleta, reutilizando exactamente la misma consulta y los mismos filtros que ve la
 * pantalla, nunca una segunda implementación en paralelo. Sensato para el volumen de un centro
 * privado; si algún día no lo fuera, la señal sería exigir la paginación también en el CSV, no
 * optimizar esto por adelantado. */
export async function listarHistoricoAsistenciaCompleto(
  cliente: ClientePostgrest,
  filtro: Omit<FiltroHistorico, 'pagina' | 'porPagina'> = {},
  zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO,
): Promise<readonly Asistencia[]> {
  const filasCompletas: Asistencia[] = [];
  let pagina = 0;
  for (;;) {
    const { filas } = await listarHistoricoAsistencia(
      cliente,
      { ...filtro, pagina, porPagina: TAMANIO_LOTE_EXPORTACION },
      zonaHoraria,
    );
    filasCompletas.push(...filas);
    if (filas.length < TAMANIO_LOTE_EXPORTACION) {
      break;
    }
    pagina += 1;
  }
  return filasCompletas;
}

const TABLA_HISTORIAL = 'asistencia_historial';

/** Historial completo de modificaciones de UN registro (T-21, requisito 7: "la pantalla... permite
 * desplegar el historial de esa fila; el historial completo es lectura de administrator"). RLS
 * (`asistencia_historial_admin_leer`, `003_politicas_rls.sql`) ya rechaza a `teacher` — esta
 * función solo tiene sentido detrás de `puedeEditarAsistenciaDeCualquiera(rol)` en la interfaz. Más
 * antiguo primero: cada fila es el estado justo ANTES de la modificación que la generó, así que
 * leídas en orden cuentan la historia de la fila de principio a fin. */
export async function listarHistorialDeAsistencia(
  cliente: ClientePostgrest,
  asistenciaId: string,
): Promise<readonly AsistenciaHistorial[]> {
  return cliente
    .desde<AsistenciaHistorial>(TABLA_HISTORIAL)
    .eq('asistencia_id', asistenciaId)
    .order('cambiado_en', { descendente: false })
    .seleccionar();
}
