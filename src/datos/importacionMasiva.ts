/**
 * Orquestación de red de la importación masiva (R-08): cargar el catálogo completo de alumnos que
 * necesitan `dominio/importacionAlumnos.ts` (duplicados) y `dominio/importacionHorarios.ts`
 * (emparejar por nombre), y confirmar las filas ya validadas por esas dos funciones puras.
 *
 * **Alumnos: una única petición `INSERT` con todas las filas nuevas** (mismo patrón de generación de
 * `id` en el cliente que `datos/alumnos.ts#crearAlumno`, con `Prefer: return=minimal` por el mismo
 * motivo — `email_alumno`/`telefono_alumno` no se pueden `RETURNING` desde la tabla base) en vez de
 * una llamada por fila: `alumno` no tiene ninguna restricción que dependa de las demás filas del lote
 * (a diferencia de `slot_horario`, que sí valida solape contra lo ya existente), así que un único
 * `INSERT` con un array es correcto y evita 50 peticiones HTTP para un alta de 50 alumnos.
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
import type { AlumnoExistenteParaImportacion, DatosAlumnoImportado } from '../dominio/importacionAlumnos.ts';
import type { AlumnoParaEmparejarHorario, DatosHorarioImportado } from '../dominio/importacionHorarios.ts';

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

/** Inserta de una vez todas las filas ya validadas como `'nueva'` por `analizarCsvAlumnos`. Con
 * `filas` vacío no hace ninguna petición. Devuelve cuántas se crearon — no hace falta releer cada
 * ficha completa: la pantalla solo necesita confirmar un recuento (requisito 2: "permite confirmar
 * las 48 correctas"), no volver a mostrarlas una a una. */
export async function importarAlumnosValidados(cliente: ClientePostgrest, filas: readonly DatosAlumnoImportado[]): Promise<number> {
  if (filas.length === 0) {
    return 0;
  }
  const conId = filas.map((datos) => ({ id: crypto.randomUUID(), ...datos }));
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
