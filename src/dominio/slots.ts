/**
 * Motor de propuesta "quién toca ahora" (T-17): dado un profesor y un instante, resuelve qué
 * alumnos le tocan atender — el corazón del producto, del que dependen T-19 (pasar lista) y T-22
 * ("mi horario"). Lógica pura sobre el tipo oficial `SlotHorario` de `dominio/tipos.ts`: nada aquí
 * lee la hora del sistema directamente, el instante siempre llega por parámetro (guardia
 * automática en `disciplinaReloj.test.ts`).
 *
 * Sustituye a la versión provisional de T-03 (tipos locales `camelCase`, día/hora en UTC — ver
 * `DECISIONES_TECNICAS.md`, entrada de T-03 sobre `slots.ts`), que solo existía para que T-03
 * tuviera lógica de dominio real desde el día 1 sin esperar a T-07/T-17. Nada más en el repositorio
 * dependía de esos tipos provisionales.
 */

import type { Alumno, DiaSemana, SlotHorario } from './tipos.ts';
import { minutosDesdeMedianoche, slotVigenteEn } from './slotHorario.ts';

/** Zona horaria del centro (§6 de SEGUIMIENTO.md, pregunta abierta de esta tarea): única y fija
 * para todo el sistema, coherente con `ZONA_HORARIA_CENTRO` de `.env.ejemplo`. No llega por
 * variable de entorno porque el cliente no tiene bundler ni acceso a `process.env` (§0.2): es una
 * constante de dominio, parametrizable en las funciones de abajo para cuando el dueño confirme si
 * hace falta otro valor o hacerla configurable de verdad. */
export const ZONA_HORARIA_CENTRO_POR_DEFECTO = 'Europe/Madrid';

/** Minutos antes de `hora_inicio` en los que un slot ya se considera "en curso" (requisito 2 de
 * T-17). Valor conservador mientras el dueño no responda la pregunta abierta de §6: ni tan corto
 * que un profesor que llega puntual se quede sin propuesta, ni tan largo que aparezca la clase
 * siguiente mientras todavía dura la anterior. */
export const TOLERANCIA_MINUTOS_POR_DEFECTO = 10;

const DIA_SEMANA_ISO: Readonly<Record<string, DiaSemana>> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export interface InstanteLocal {
  readonly diaSemana: DiaSemana;
  /** Formato `HH:MM`, 24 horas, en la zona horaria pedida. */
  readonly horaMinuto: string;
}

/** Traduce un instante UTC (`timestamptz`, tal como llega de PostgREST) al día de la semana ISO
 * (1 = lunes … 7 = domingo) y la hora local de `zonaHoraria`, usando `Intl` — sin librería nueva,
 * el `tz database` completo ya vive en el runtime de Node y del navegador (§0.2: `dependencies`
 * vacío). `Intl.DateTimeFormat` resuelve el desplazamiento real de esa zona para ESE instante
 * exacto, así que los cambios de hora estacionales (`Europe/Madrid`: último domingo de marzo y de
 * octubre) quedan tratados correctamente sin ningún cálculo manual de offset. `hourCycle: 'h23'`
 * evita el `'24'` que devuelven algunas configuraciones de ICU a medianoche con `hour12: false`. */
export function instanteLocal(instante: Date, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): InstanteLocal {
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const partes = new Map(formato.formatToParts(instante).map((parte) => [parte.type, parte.value]));
  const diaTexto = partes.get('weekday');
  const horaTexto = partes.get('hour');
  const minutoTexto = partes.get('minute');
  const diaSemana = diaTexto === undefined ? undefined : DIA_SEMANA_ISO[diaTexto];

  if (diaSemana === undefined || horaTexto === undefined || minutoTexto === undefined) {
    throw new Error(`No se ha podido resolver la hora local en la zona horaria "${zonaHoraria}".`);
  }
  return { diaSemana, horaMinuto: `${horaTexto}:${minutoTexto}` };
}

/** Lo mínimo que hace falta de un instante para reconstruir uno equivalente en UTC: año, mes y
 * día del calendario GREGORIANO (1-12, 1-31), más hora/minuto/segundo. Intermedio de
 * `limitesDiaLocal`, sin uso fuera de este módulo. */
interface FechaLocalCompleta {
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
  readonly hora: number;
  readonly minuto: number;
  readonly segundo: number;
}

function fechaLocalCompleta(instante: Date, zonaHoraria: string): FechaLocalCompleta {
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const partes = new Map(formato.formatToParts(instante).map((parte) => [parte.type, parte.value]));
  const anio = Number(partes.get('year'));
  const mes = Number(partes.get('month'));
  const dia = Number(partes.get('day'));
  const hora = Number(partes.get('hour'));
  const minuto = Number(partes.get('minute'));
  const segundo = Number(partes.get('second'));
  if ([anio, mes, dia, hora, minuto, segundo].some((numero) => Number.isNaN(numero))) {
    throw new Error(`No se ha podido resolver la fecha local en la zona horaria "${zonaHoraria}".`);
  }
  return { anio, mes, dia, hora, minuto, segundo };
}

/** Instante UTC (milisegundos desde época) de la MEDIANOCHE local de `anio`-`mes`-`dia` en
 * `zonaHoraria` — la mitad "difícil" de `limitesDiaLocal`, aislada para poder converger por
 * aproximaciones sucesivas: no hay fórmula cerrada porque el desplazamiento de la zona horaria
 * respecto a UTC depende del propio instante que se busca (cambios de hora estacionales). Dos
 * iteraciones bastan siempre: la primera acierta el desplazamiento correcto salvo, como mucho, en
 * el borde exacto de un cambio de hora, que la segunda corrige. */
function medianocheLocalUtcMs(anio: number, mes: number, dia: number, zonaHoraria: string): number {
  const objetivoMs = Date.UTC(anio, mes - 1, dia, 0, 0, 0);
  let candidatoMs = objetivoMs;
  for (let intento = 0; intento < 2; intento += 1) {
    const local = fechaLocalCompleta(new Date(candidatoMs), zonaHoraria);
    const localComoUtcMs = Date.UTC(local.anio, local.mes - 1, local.dia, local.hora, local.minuto, local.segundo);
    candidatoMs -= localComoUtcMs - objetivoMs;
  }
  return candidatoMs;
}

export interface LimitesDiaLocal {
  /** Medianoche local (inclusiva) del día que contiene `instante`, en UTC. */
  readonly inicioUtc: Date;
  /** Medianoche local del día SIGUIENTE (exclusiva), en UTC — nunca ocurre de verdad dentro del
   * día que se está acotando, así que sirve como límite superior estricto. */
  readonly finUtc: Date;
}

/** Límites, en UTC, del día natural de `zonaHoraria` que contiene `instante` (T-19, requisito 5:
 * "al abrir, ya se ve quién está registrado hoy en ese slot" — hace falta acotar qué es "hoy" para
 * poder pedirle a PostgREST solo esa franja, en vez de traer el histórico entero y filtrar en el
 * cliente). Mismo criterio de "día" que la restricción `asistencia_uq_alumno_slot_dia_valida` de
 * `db/005_rpc_registrar_asistencia.sql`: el día de calendario en `Europe/Madrid`, no en UTC. */
export function limitesDiaLocal(instante: Date, zonaHoraria: string = ZONA_HORARIA_CENTRO_POR_DEFECTO): LimitesDiaLocal {
  const { anio, mes, dia } = fechaLocalCompleta(instante, zonaHoraria);
  const inicioMs = medianocheLocalUtcMs(anio, mes, dia, zonaHoraria);

  // El día siguiente se calcula como aritmética de CALENDARIO pura (campos UTC de un `Date` que
  // solo se usa como calculadora de fechas, nunca como instante real), no sumando 24h reales ni
  // formateando un instante aproximado: las dos alternativas se equivocan de día exactamente en el
  // día que sigue a un cambio de hora de otoño (`Europe/Madrid`, +2 → +1: 24h reales desde la
  // medianoche de hoy caen todavía en el día de hoy, no en el de mañana), mismo motivo por el que
  // `diaAnteriorUtc` (`slotHorario.ts`) tampoco suma milisegundos reales.
  const calendarioManana = new Date(Date.UTC(anio, mes - 1, dia));
  calendarioManana.setUTCDate(calendarioManana.getUTCDate() + 1);
  const finMs = medianocheLocalUtcMs(calendarioManana.getUTCFullYear(), calendarioManana.getUTCMonth() + 1, calendarioManana.getUTCDate(), zonaHoraria);

  return { inicioUtc: new Date(inicioMs), finUtc: new Date(finMs) };
}

export interface OpcionesPropuesta {
  readonly zonaHoraria?: string;
  /** Minutos de tolerancia antes de `hora_inicio` (requisito 2 de T-17). */
  readonly tolerancia?: number;
}

/** ¿Toca `slot` en `instante`? Vigente en esa fecha (`slotVigenteEn`, T-15), mismo día de la
 * semana en la zona horaria del centro, y hora local dentro de `[hora_inicio - tolerancia,
 * hora_fin)` — `hora_inicio` inclusiva incluso sin tolerancia, `hora_fin` exclusiva (mismo
 * criterio que el resto del dominio: dos slots consecutivos no se solapan en su minuto de corte). */
export function slotActivoEnInstante(slot: SlotHorario, instante: Date, opciones: OpcionesPropuesta = {}): boolean {
  if (!slotVigenteEn(slot, instante)) {
    return false;
  }
  const zonaHoraria = opciones.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const tolerancia = opciones.tolerancia ?? TOLERANCIA_MINUTOS_POR_DEFECTO;
  const local = instanteLocal(instante, zonaHoraria);

  if (local.diaSemana !== slot.dia_semana) {
    return false;
  }
  const minutosLocal = minutosDesdeMedianoche(local.horaMinuto);
  const inicioConTolerancia = minutosDesdeMedianoche(slot.hora_inicio) - tolerancia;
  return minutosLocal >= inicioConTolerancia && minutosLocal < minutosDesdeMedianoche(slot.hora_fin);
}

/** Forma restringida de `Alumno` que embebe la consulta de `datos/slotsHorario.ts`: exactamente
 * las columnas que la tabla base concede a `authenticated` (`003_politicas_rls.sql`), nunca
 * `email_alumno`/`telefono_alumno`/`centro_referencia_id` — un `teacher` no puede leerlas ni con
 * una consulta directa a PostgREST, así que este tipo no puede extender `Alumno` completo. */
export type AlumnoParaPropuesta = Pick<
  Alumno,
  'id' | 'nombre' | 'primer_apellido' | 'segundo_apellido' | 'avatar_ruta' | 'activo'
>;

export interface SlotConAlumno extends SlotHorario {
  readonly alumno: AlumnoParaPropuesta;
}

export interface AlumnoPropuesto {
  readonly alumno: AlumnoParaPropuesta;
  readonly slot: SlotHorario;
}

/** Resultado del motor de propuesta (requisito 3 de T-17): nunca una lista vacía sin explicación.
 * `en_curso` — al menos un slot toca ahora (incluida su tolerancia). `proximo` — nada toca ahora,
 * pero queda al menos un slot vigente más tarde el mismo día; puede haber varios simultáneos, se
 * devuelven todos los que comparten la hora de inicio más próxima. `sin_clases_hoy` — no queda
 * ningún slot vigente para este profesor en lo que resta de día. */
export type PropuestaAsistencia =
  | { readonly tipo: 'en_curso'; readonly alumnos: readonly AlumnoPropuesto[] }
  | { readonly tipo: 'proximo'; readonly alumnos: readonly AlumnoPropuesto[]; readonly minutosHastaInicio: number }
  | { readonly tipo: 'sin_clases_hoy' };

export interface ParametrosPropuesta extends OpcionesPropuesta {
  readonly profesorId: string;
  readonly instante: Date;
  /** Slots del profesor con su alumno embebido, tal como los trae `datos/slotsHorario.ts` en una
   * única petición (requisito 5 de T-17) — de cualquier vigencia, pasada o presente: esta función
   * filtra por vigencia y por profesor, quien llama no necesita acotar la consulta de antemano. */
  readonly slots: readonly SlotConAlumno[];
}

/** Función pura `alumnosPropuestos({ profesorId, instante, tolerancia })` (requisito 1 de T-17):
 * cruza los slots del profesor, vigentes en `instante`, con el alumno activo que los justifica. */
export function alumnosPropuestos(parametros: ParametrosPropuesta): PropuestaAsistencia {
  const zonaHoraria = parametros.zonaHoraria ?? ZONA_HORARIA_CENTRO_POR_DEFECTO;
  const tolerancia = parametros.tolerancia ?? TOLERANCIA_MINUTOS_POR_DEFECTO;
  const opciones: OpcionesPropuesta = { zonaHoraria, tolerancia };

  const slotsDelProfesor = parametros.slots.filter(
    (slot) => slot.profesor_id === parametros.profesorId && slot.alumno.activo,
  );

  const enCurso = slotsDelProfesor.filter((slot) => slotActivoEnInstante(slot, parametros.instante, opciones));
  if (enCurso.length > 0) {
    return { tipo: 'en_curso', alumnos: enCurso.map((slot) => ({ alumno: slot.alumno, slot })) };
  }

  const local = instanteLocal(parametros.instante, zonaHoraria);
  const minutosAhora = minutosDesdeMedianoche(local.horaMinuto);

  const restantesHoy = slotsDelProfesor.filter(
    (slot) =>
      slotVigenteEn(slot, parametros.instante) &&
      slot.dia_semana === local.diaSemana &&
      minutosDesdeMedianoche(slot.hora_inicio) - tolerancia > minutosAhora,
  );
  if (restantesHoy.length === 0) {
    return { tipo: 'sin_clases_hoy' };
  }

  const inicioMasProximo = Math.min(...restantesHoy.map((slot) => minutosDesdeMedianoche(slot.hora_inicio)));
  const proximos = restantesHoy.filter((slot) => minutosDesdeMedianoche(slot.hora_inicio) === inicioMasProximo);

  return {
    tipo: 'proximo',
    alumnos: proximos.map((slot) => ({ alumno: slot.alumno, slot })),
    minutosHastaInicio: inicioMasProximo - minutosAhora,
  };
}
