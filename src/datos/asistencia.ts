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
import type { Asistencia, OrigenAsistencia } from '../dominio/tipos.ts';

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
