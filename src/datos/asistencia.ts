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
    .eq('estado', 'valida')
    .gte('ocurrido_en', inicioUtc.toISOString())
    .lte('ocurrido_en', new Date(finUtc.getTime() - 1).toISOString())
    .seleccionar();
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
