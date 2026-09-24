/**
 * Orquestación de red de la importación masiva (R-08, R-31): cargar el catálogo completo de alumnos
 * que necesitan `dominio/importacionAlumnos.ts` (duplicados), `dominio/importacionHorarios.ts`
 * (emparejar por nombre) y `dominio/importacionPersonasReferencia.ts` (emparejar por nombre y
 * deduplicar dentro del mismo alumno), y confirmar las filas ya validadas por esas tres funciones
 * puras.
 *
 * **Personas de referencia (R-31): mismo patrón de `INSERT` único en lote e idempotencia por `id`
 * estable que alumnos** (ver P-25 más abajo) — `persona_referencia` tampoco tiene ninguna restricción
 * que dependa de las demás filas del lote.
 *
 * **Alumnos: una única petición `INSERT` con todas las filas nuevas**, con `Prefer: return=minimal`
 * (`email_alumno`/`telefono_alumno` no se pueden `RETURNING` desde la tabla base) en vez de una
 * llamada por fila: `alumno` no tiene ninguna restricción que dependa de las demás filas del lote (a
 * diferencia de `slot_horario`, que sí valida solape contra lo ya existente), así que un único
 * `INSERT` con un array es correcto y evita 50 peticiones HTTP para un alta de 50 alumnos.
 *
 * **P-25 (hallazgo #15 de `auditoriacontinua.md`): el `id` de cada fila lo genera y mantiene quien
 * llama, nunca esta función.** Antes, `importarAlumnosValidados` generaba un `id` nuevo con
 * `crypto.randomUUID()` en cada invocación — un corte de red justo después de que el `INSERT` llegara
 * al servidor pero antes de que la respuesta llegara al navegador dejaba la pantalla en estado de
 * error con el mismo lote listo para reenviar, y un reintento generaba 48 `id` distintos de los ya
 * creados, duplicando el alta entera. Con el `id` fijado por quien llama (`ui/pantallaImportacionMasiva.ts`,
 * una vez por fila analizada, nunca recalculado en un reintento) un reintento reenvía el MISMO `id`
 * por fila: si el primer intento sí llegó a escribir, el reintento choca con la clave primaria de
 * `alumno` y PostgREST responde `409` (`Conflicto`, mapeado en `erroresDominio.ts`) en vez de crear
 * una segunda fila — la restricción de unicidad ya existente de la clave primaria hace de clave de
 * idempotencia, sin ninguna migración nueva.
 *
 * **Horarios: una llamada a `crearSlot` por fila, sin abortar en la primera que falle** (criterio de
 * aceptación de R-08: "un CSV de horarios que referencia un profesor sin cuenta... deja esa fila en
 * error sin bloquear el resto" — aplicado aquí también a un fallo que solo puede detectarse al
 * escribir, como un solape con un horario ya existente). A diferencia de `alumno`, `slot_horario` SÍ
 * necesita la validación de solape de `crearSlot` (requisito 4 de T-15) contra el estado real de la
 * base en el momento de la escritura, así que no se puede resolver con un único `INSERT` en lote.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import { listarAlumnos } from './alumnos.ts';
import { crearSlot } from './slotsHorario.ts';
import { listarPersonasReferenciaDeAlumnos } from './personasReferencia.ts';
import type { AlumnoExistenteParaImportacion, DatosAlumnoImportado } from '../dominio/importacionAlumnos.ts';
import type { AlumnoParaEmparejarHorario, DatosHorarioImportado } from '../dominio/importacionHorarios.ts';
import type { DatosPersonaReferenciaImportada } from '../dominio/importacionPersonasReferencia.ts';
import type { DatosDuplicadoPersonaReferencia } from '../dominio/personaReferencia.ts';

/** El motivo exacto del rechazo (p. ej. "Este alumno ya tiene un horario que se solapa en ese día y
 * hora.", de `crearSlot`) es justo lo que el administrator necesita para decidir qué corregir en el
 * fichero — a diferencia de `mensajeAmigable` (T-06), pensado para un usuario final sin acceso al
 * detalle técnico, que reduce cualquier `ErrorDeValidacion` al mismo texto genérico. */
function motivoDelError(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido al crear el horario.';
}

const TABLA_ALUMNO = 'alumno';

/** Todos los alumnos, activos e inactivos (un alumno dado de baja sigue siendo un duplicado real si
 * se reimporta, y sigue siendo un destinatario válido de horario), con solo las columnas que
 * necesitan las dos funciones puras de análisis — nunca contacto, nunca avatar. Una única petición:
 * el catálogo de una academia (§0.2, "sin multi-tenant") no llega a un tamaño que justifique paginar
 * aquí, mismo criterio que `centrosEstudios.ts` (T-11) para su propio catálogo. */
const LIMITE_CATALOGO_COMPLETO = 5000;

export async function listarAlumnosParaImportacion(
  cliente: ClientePostgrest,
): Promise<readonly (AlumnoExistenteParaImportacion & AlumnoParaEmparejarHorario)[]> {
  const { alumnos } = await listarAlumnos(cliente, { estado: 'todos', pagina: 0, porPagina: LIMITE_CATALOGO_COMPLETO });
  return alumnos.map((alumno) => ({
    id: alumno.id,
    nombre: alumno.nombre,
    primer_apellido: alumno.primer_apellido,
    segundo_apellido: alumno.segundo_apellido,
    centro_referencia_id: alumno.centro_referencia_id,
  }));
}

/** Una fila ya validada como `'nueva'`, con el `id` que le asignó quien llama (ver la nota de P-25 en
 * la cabecera del módulo: ese `id` debe mantenerse estable entre el primer intento y cualquier
 * reintento del mismo lote, nunca regenerarse aquí). */
export interface FilaAlumnoParaConfirmar {
  readonly id: string;
  readonly datos: DatosAlumnoImportado;
}

/** Inserta de una vez todas las filas ya validadas como `'nueva'` por `analizarCsvAlumnos`. Con
 * `filas` vacío no hace ninguna petición. Devuelve cuántas se crearon — no hace falta releer cada
 * ficha completa: la pantalla solo necesita confirmar un recuento (requisito 2: "permite confirmar
 * las 48 correctas"), no volver a mostrarlas una a una. */
export async function importarAlumnosValidados(cliente: ClientePostgrest, filas: readonly FilaAlumnoParaConfirmar[]): Promise<number> {
  if (filas.length === 0) {
    return 0;
  }
  const conId = filas.map((fila) => ({ id: fila.id, ...fila.datos }));
  await cliente.desde(TABLA_ALUMNO).insertar(conId, { representar: false });
  return conId.length;
}

export interface ErrorImportacionHorario {
  readonly descripcion: string;
  readonly motivo: string;
}

export interface ResultadoImportacionHorarios {
  readonly creados: number;
  readonly errores: readonly ErrorImportacionHorario[];
}

/** Crea, una a una, todas las filas ya validadas como `'nueva'` por `analizarCsvHorarios` — reutiliza
 * `crearSlot` (T-15) tal cual, así que hereda su comprobación de solape sin duplicar esa lógica.
 * `vigente_desde` es el instante de `reloj` (nunca `new Date()` directo, mismo criterio de reloj
 * inyectable que `darDeBajaAlumno`): un horario importado empieza a regir hoy, no en una fecha que el
 * CSV no tiene ningún campo para especificar. Una fila que falla (solape con un horario ya existente,
 * incluida la reimportación del mismo fichero sin cambios — ver la cabecera de
 * `dominio/importacionHorarios.ts`) no interrumpe las siguientes: se recoge en `errores` con la misma
 * descripción que ya mostró la vista previa, para que el administrator sepa exactamente cuál sin
 * tener que adivinarlo por su posición en el fichero. */
export async function importarHorariosValidados(
  cliente: ClientePostgrest,
  reloj: Reloj,
  filas: readonly { readonly descripcion: string; readonly datos: DatosHorarioImportado }[],
): Promise<ResultadoImportacionHorarios> {
  let creados = 0;
  const errores: ErrorImportacionHorario[] = [];
  for (const fila of filas) {
    try {
      await crearSlot(cliente, { ...fila.datos, vigente_desde: reloj.ahora() });
      creados += 1;
    } catch (error) {
      errores.push({ descripcion: fila.descripcion, motivo: motivoDelError(error) });
    }
  }
  return { creados, errores };
}

const TABLA_PERSONA_REFERENCIA = 'persona_referencia';

/** Personas de referencia ya existentes de TODOS los alumnos que aparecen en `alumnosExistentes`
 * (`dominio/importacionPersonasReferencia.ts`, requisito 3: la deduplicación es "dentro del mismo
 * alumno"), agrupadas por `alumno_id` en una única petición — reutiliza tal cual
 * `datos/personasReferencia.ts#listarPersonasReferenciaDeAlumnos` (R-16 ya trae exactamente esta
 * forma para todo el centro), sin ninguna función de lectura nueva. */
export async function listarPersonasReferenciaExistentesParaImportacion(
  cliente: ClientePostgrest,
  alumnoIds: readonly string[],
): Promise<ReadonlyMap<string, readonly DatosDuplicadoPersonaReferencia[]>> {
  return listarPersonasReferenciaDeAlumnos(cliente, alumnoIds);
}

/** Una fila ya validada como `'nueva'` por `analizarCsvPersonasReferencia`, con el `id` que le asignó
 * quien llama — mismo criterio de idempotencia ante reintento que `FilaAlumnoParaConfirmar` (P-25,
 * ver la cabecera del módulo): el `id` se genera una única vez al analizar el fichero, nunca aquí. */
export interface FilaPersonaReferenciaParaConfirmar {
  readonly id: string;
  readonly datos: DatosPersonaReferenciaImportada;
}

/** Inserta de una vez todas las filas ya validadas como `'nueva'` por `analizarCsvPersonasReferencia`
 * — mismo patrón que `importarAlumnosValidados`: `persona_referencia` no tiene ninguna restricción
 * que dependa de las demás filas del lote, así que un único `INSERT` con un array es correcto. Con
 * `filas` vacío no hace ninguna petición. */
export async function importarPersonasReferenciaValidados(
  cliente: ClientePostgrest,
  filas: readonly FilaPersonaReferenciaParaConfirmar[],
): Promise<number> {
  if (filas.length === 0) {
    return 0;
  }
  const conId = filas.map((fila) => ({ id: fila.id, ...fila.datos }));
  await cliente.desde(TABLA_PERSONA_REFERENCIA).insertar(conId, { representar: false });
  return conId.length;
}
