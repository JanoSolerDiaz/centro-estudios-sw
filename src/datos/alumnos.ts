/**
 * Operaciones de acceso a datos de la ficha de alumno (T-12): listar, obtener, crear, editar, dar
 * de baja y reactivar. Sin borrado — igual que el centro de estudios de T-11, un alumno solo se
 * marca `activo = false`, con instante y motivo opcional; el histórico de asistencia y de slots
 * pasados permanece intacto (`001_esquema_inicial.sql`, comentario de `alumno`).
 *
 * Escritura reservada a `administrator` por RLS (`003_politicas_rls.sql`, T-10): un `teacher` que
 * llame a `crearAlumno`/`editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno` recibe `SinPermiso` del
 * servidor.
 *
 * **Por qué el INSERT/UPDATE no pide `return=representation` (decisión de T-10, anotada para T-12
 * en `DECISIONES_TECNICAS.md` el 2026-08-28):** `email_alumno`/`telefono_alumno` están concedidas a
 * `authenticated` solo a través de la vista `alumno_ficha`, nunca en la tabla base, porque
 * administrator y teacher comparten ese mismo rol de Postgres y un GRANT de columna no puede darle
 * la columna a uno sin dársela al otro. El `RETURNING` de un INSERT/UPDATE contra la tabla base
 * fallaría en cuanto intentara devolver esas columnas, aunque quien escribe sea administrator. Por
 * eso este módulo: (1) genera el `id` en el cliente antes de insertar (así lo conoce sin necesitar
 * la respuesta), (2) escribe con `{ representar: false }` (`Prefer: return=minimal`), y (3) vuelve
 * a leer la fila completa de `alumno_ficha`, que sí puede devolver esas columnas porque su filtro
 * de rol vive en la propia vista, no en un GRANT de la tabla base.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import type { Alumno, CentroEstudios, PersonaReferencia } from '../dominio/tipos.ts';
import {
  normalizarNombrePersona,
  normalizarTelefonoAlumno,
  emailAlumnoValido,
  telefonoAlumnoValido,
  compararAlumnosParaOrden,
} from '../dominio/alumno.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

export type FiltroEstadoAlumno = 'activos' | 'inactivos' | 'todos';

export interface OpcionesListarAlumnos {
  readonly estado?: FiltroEstadoAlumno;
  /** Busca por subcadena en `nombre`, `primer_apellido` o `segundo_apellido` a la vez (`ilike`,
   * insensible a mayúsculas). NO es acento-insensible — igual limitación, y por el mismo motivo,
   * que la búsqueda de T-11 (`centrosEstudios.ts`): sin la extensión `unaccent` no hay forma de
   * pedírselo a PostgREST sin una migración, y T-12 tiene `Migración: No`. Documentado como
   * limitación conocida en `DECISIONES_TECNICAS.md` y en la pregunta abierta de `SEGUIMIENTO.md`. */
  readonly busqueda?: string;
  /** Página 0-based. */
  readonly pagina?: number;
  readonly porPagina?: number;
}

/** `alumno_ficha` con el centro embebido (requisito 1 de T-12, "obtener con su centro embebido").
 * `centro` no puede ser `null` en la práctica porque `centro_referencia_id` es `not null` con una
 * referencia de clave foránea (`001_esquema_inicial.sql`): no existe fila de `alumno` sin centro. */
export interface AlumnoConCentro extends Alumno {
  readonly centro: Pick<CentroEstudios, 'id' | 'nombre'>;
}

/** `AlumnoConCentro` con sus personas de referencia embebidas (T-13, requisito 5: "se traen
 * embebidas al cargar la ficha, en la misma petición, para que editar un alumno no sean tres
 * viajes"). Es lo que devuelven todas las operaciones sobre un único alumno (`obtenerAlumno`,
 * `crearAlumno`, `editarAlumno`, `darDeBajaAlumno`, `reactivarAlumno`); `listarAlumnos` sigue
 * devolviendo `AlumnoConCentro` a secas, sin este embebido — la lista paginada no necesita las
 * personas de referencia de cada fila, solo la ficha abierta de una en una. */
export interface AlumnoConCentroYPersonas extends AlumnoConCentro {
  readonly personas_referencia: readonly PersonaReferencia[];
}

/** `AlumnoConCentro` sin `avatar_ruta` (P-02, minimización de datos: `pantallaFichaAlumno.ts` no
 * pinta ningún avatar en la lista paginada, solo en la ficha abierta de uno en uno — traerla ahí
 * es superficie de más). Si T-16/T-19 necesitan avatar en un listado en el futuro, es una decisión
 * de diseño nueva, no un descuido que corregir en este tipo. */
export type AlumnoListado = Omit<AlumnoConCentro, 'avatar_ruta'>;

export interface ResultadoListarAlumnos {
  readonly alumnos: readonly AlumnoListado[];
  readonly totalAproximado: number | null;
}

export interface DatosAlumno {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido?: string | null;
  readonly centro_referencia_id: string;
  readonly email_alumno?: string | null;
  readonly telefono_alumno?: string | null;
}

const TABLA = 'alumno';
const VISTA_FICHA = 'alumno_ficha';
/** Sin `avatar_ruta` (P-02): columnas explícitas en vez de `*` para el listado paginado — el único
 * consumidor (`pantallaFichaAlumno.ts`) no pinta ningún avatar en esa lista. `leerFichaPorId` (una
 * sola fila, la ficha abierta) sigue usando `*` en `SELECT_FICHA_COMPLETA`, donde el avatar sí hace
 * falta. */
const SELECT_LISTADO =
  'id,nombre,primer_apellido,segundo_apellido,centro_referencia_id,email_alumno,telefono_alumno,' +
  'activo,alta_en,baja_en,motivo_baja,usuario_id,creado_en,actualizado_en,centro:centro_estudios(id,nombre)';
/** Usado solo por `leerFichaPorId` (una operación sobre un único alumno), nunca por `listarAlumnos`
 * (T-13, requisito 5). El nombre embebido, `personas_referencia`, es el que PostgREST expone de la
 * relación inversa de `persona_referencia.alumno_id`; no es una columna real de `alumno_ficha`. */
const SELECT_FICHA_COMPLETA = '*,centro:centro_estudios(id,nombre),personas_referencia:persona_referencia(*)';
const PAGINA_POR_DEFECTO = 20;

function nombreRequeridoOFalla(valorEntrada: string, etiqueta: string): string {
  const valor = normalizarNombrePersona(valorEntrada);
  if (valor.length === 0) {
    throw new ErrorDeValidacion(`${etiqueta} no puede estar vacío.`);
  }
  return valor;
}

function segundoApellidoOpcional(valorEntrada: string | null | undefined): string | null {
  if (valorEntrada === null || valorEntrada === undefined) {
    return null;
  }
  const valor = normalizarNombrePersona(valorEntrada);
  return valor.length === 0 ? null : valor;
}

function emailOpcionalOFalla(valorEntrada: string | null | undefined): string | null {
  if (valorEntrada === null || valorEntrada === undefined) {
    return null;
  }
  const valor = valorEntrada.trim();
  if (valor.length === 0) {
    return null;
  }
  if (!emailAlumnoValido(valor)) {
    throw new ErrorDeValidacion('El email no tiene un formato válido.');
  }
  return valor;
}

function telefonoOpcionalOFalla(valorEntrada: string | null | undefined): string | null {
  if (valorEntrada === null || valorEntrada === undefined) {
    return null;
  }
  const valorTrim = valorEntrada.trim();
  if (valorTrim.length === 0) {
    return null;
  }
  const valor = normalizarTelefonoAlumno(valorTrim);
  if (!telefonoAlumnoValido(valor)) {
    throw new ErrorDeValidacion('El teléfono no tiene un formato español válido.');
  }
  return valor;
}

function prepararValoresAlumno(datos: DatosAlumno): Record<string, unknown> {
  const centroReferenciaId = datos.centro_referencia_id.trim();
  if (centroReferenciaId.length === 0) {
    throw new ErrorDeValidacion('El centro de referencia es obligatorio.');
  }
  return {
    nombre: nombreRequeridoOFalla(datos.nombre, 'El nombre'),
    primer_apellido: nombreRequeridoOFalla(datos.primer_apellido, 'El primer apellido'),
    segundo_apellido: segundoApellidoOpcional(datos.segundo_apellido),
    centro_referencia_id: centroReferenciaId,
    email_alumno: emailOpcionalOFalla(datos.email_alumno),
    telefono_alumno: telefonoOpcionalOFalla(datos.telefono_alumno),
  };
}

function primeraFilaOFalla<T>(filas: readonly T[]): T {
  const [fila] = filas;
  if (!fila) {
    throw new ErrorDelServidor('El servidor no ha devuelto el alumno esperado.');
  }
  return fila;
}

async function leerFichaPorId(cliente: ClientePostgrest, id: string): Promise<AlumnoConCentroYPersonas> {
  const filas = await cliente
    .desde<AlumnoConCentroYPersonas>(VISTA_FICHA)
    .eq('id', id)
    .seleccionar(SELECT_FICHA_COMPLETA);
  return primeraFilaOFalla(filas);
}

/** Lectura completa (incluidos `email_alumno`/`telefono_alumno`) con el centro embebido, paginada
 * en servidor. Lee de `alumno_ficha` (solo `administrator`, ver cabecera del módulo): esta pantalla
 * es de gestión, nunca la usa un `teacher` (T-19/T-22 leen `alumno` directamente, columnas de
 * identificación únicamente). */
export async function listarAlumnos(
  cliente: ClientePostgrest,
  opciones: OpcionesListarAlumnos = {},
): Promise<ResultadoListarAlumnos> {
  let consulta = cliente.desde<AlumnoListado>(VISTA_FICHA);
  if (opciones.estado === 'activos') {
    consulta = consulta.eq('activo', true);
  } else if (opciones.estado === 'inactivos') {
    consulta = consulta.eq('activo', false);
  }
  const busqueda = opciones.busqueda?.trim();
  if (busqueda && busqueda.length > 0) {
    consulta = consulta.orIlike(['nombre', 'primer_apellido', 'segundo_apellido'], `*${busqueda}*`);
  }
  const porPagina = opciones.porPagina ?? PAGINA_POR_DEFECTO;
  const pagina = opciones.pagina ?? 0;
  const desde = pagina * porPagina;
  const { filas, totalAproximado } = await consulta
    .order('primer_apellido')
    .order('segundo_apellido', { nullsAlFinal: true })
    .order('nombre')
    .range(desde, desde + porPagina - 1)
    .seleccionarConTotal(SELECT_LISTADO);
  // El `order=` de arriba ya pide el orden correcto por columna, pero la colación de Postgres del
  // servidor no está garantizada acento-insensible (dependería de configurar el `COLLATE` de la
  // base de datos, fuera del alcance de esta tarea: `Migración: No`). Se reordena la página ya
  // recibida con el comparador del dominio (`compararAlumnosParaOrden`) para que la ordenación a la
  // española (requisito 4 de T-12) sea correcta con certeza dentro de cada página, sin depender de
  // la configuración del servidor.
  return { alumnos: [...filas].sort(compararAlumnosParaOrden), totalAproximado };
}

export async function obtenerAlumno(cliente: ClientePostgrest, id: string): Promise<AlumnoConCentroYPersonas> {
  return leerFichaPorId(cliente, id);
}

export async function crearAlumno(cliente: ClientePostgrest, datos: DatosAlumno): Promise<AlumnoConCentroYPersonas> {
  const valores = prepararValoresAlumno(datos);
  const id = crypto.randomUUID();
  await cliente.desde<Alumno>(TABLA).insertar({ id, ...valores }, { representar: false });
  return leerFichaPorId(cliente, id);
}

export async function editarAlumno(
  cliente: ClientePostgrest,
  id: string,
  datos: DatosAlumno,
): Promise<AlumnoConCentroYPersonas> {
  const valores = prepararValoresAlumno(datos);
  await cliente.desde<Alumno>(TABLA).eq('id', id).actualizar(valores, { representar: false });
  return leerFichaPorId(cliente, id);
}

/** Da de baja al alumno (`activo = false`, `baja_en` al instante de `reloj`, `motivo_baja`
 * opcional). No toca `asistencia` ni `slot_horario` en ningún momento — el histórico de un alumno
 * de baja permanece íntegro por diseño de esquema, no por nada que haga este módulo. */
export async function darDeBajaAlumno(
  cliente: ClientePostgrest,
  reloj: Reloj,
  id: string,
  motivo?: string,
): Promise<AlumnoConCentroYPersonas> {
  const motivoNormalizado = motivo?.trim();
  await cliente
    .desde<Alumno>(TABLA)
    .eq('id', id)
    .actualizar(
      {
        activo: false,
        baja_en: reloj.ahora().toISOString(),
        motivo_baja: motivoNormalizado && motivoNormalizado.length > 0 ? motivoNormalizado : null,
      },
      { representar: false },
    );
  return leerFichaPorId(cliente, id);
}

/** Reactiva al alumno: `activo = true`, y se limpian `baja_en`/`motivo_baja` (una nueva baja futura
 * registrará su propio instante, no el de la baja anterior). */
export async function reactivarAlumno(cliente: ClientePostgrest, id: string): Promise<AlumnoConCentroYPersonas> {
  await cliente
    .desde<Alumno>(TABLA)
    .eq('id', id)
    .actualizar({ activo: true, baja_en: null, motivo_baja: null }, { representar: false });
  return leerFichaPorId(cliente, id);
}
