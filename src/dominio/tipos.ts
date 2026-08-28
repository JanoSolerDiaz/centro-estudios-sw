/**
 * Tipos oficiales del dominio (T-07), escritos a mano a partir de `db/001_esquema_inicial.sql` —
 * no generados. Sustituyen a los tipos provisionales de `slots.ts`/`asistencia.ts` (T-03) en cuanto
 * esas piezas se amplíen con lógica real (T-15/T-17/T-18/T-21). Los nombres de campo son EXACTAMENTE
 * los nombres de columna de PostgreSQL: PostgREST los devuelve tal cual, sin transformar mayúsculas
 * ni estilo. `src/dominio/tipos.test.ts` confronta esta forma con la que produciría PostgREST según
 * el doble de `fetch` de T-03.
 */

export type Rol = 'administrator' | 'teacher' | 'student';

/** Etiquetas de interfaz en español (§0.2 de HOJA_DE_RUTA.md): el identificador de rol es inglés
 * en base de datos y en código, y esta es la ÚNICA traducción a texto visible — nunca comparar el
 * rol contra la etiqueta traducida. */
export const ETIQUETA_ROL: Readonly<Record<Rol, string>> = {
  administrator: 'Administrador',
  teacher: 'Profesor',
  student: 'Alumno',
};

export interface Perfil {
  readonly id: string;
  readonly nombre: string;
  readonly rol: Rol;
  readonly activo: boolean;
  /** Contraseñas incorrectas contadas por `registrar_intento_fallido` (P-01). No se resetea al
   * iniciar sesión con éxito, solo al desbloquear. */
  readonly intentos_fallidos: number;
  /** true al llegar a 3 intentos fallidos. Un perfil bloqueado sigue leyendo su propia fila (para
   * poder avisarle), pero `rol_actual()` deja de reconocerle ningún rol en el resto del esquema. */
  readonly bloqueado: boolean;
  readonly creado_en: string;
  readonly actualizado_en: string;
}

export interface CentroEstudios {
  readonly id: string;
  readonly nombre: string;
  readonly activo: boolean;
  readonly creado_en: string;
  readonly actualizado_en: string;
}

export interface Alumno {
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
}

export interface PersonaReferencia {
  readonly id: string;
  readonly alumno_id: string;
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly email_referencia: string | null;
  readonly telefono_referencia: string;
  readonly creado_en: string;
  readonly actualizado_en: string;
}

export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SlotHorario {
  readonly id: string;
  readonly alumno_id: string;
  readonly profesor_id: string;
  readonly dia_semana: DiaSemana;
  readonly hora_inicio: string;
  readonly hora_fin: string;
  readonly asignatura_o_grupo: string | null;
  readonly vigente_desde: string;
  readonly vigente_hasta: string | null;
  readonly creado_en: string;
  readonly actualizado_en: string;
}

export type OrigenAsistencia = 'slot' | 'manual';
export type EstadoAsistencia = 'valida' | 'anulada';

export interface Asistencia {
  readonly id: string;
  readonly alumno_id: string;
  readonly profesor_id: string;
  readonly registrado_en: string;
  readonly ocurrido_en: string;
  readonly es_retroactivo: boolean;
  readonly origen: OrigenAsistencia;
  readonly slot_id: string | null;
  readonly slot_dia_semana: DiaSemana | null;
  readonly slot_hora_inicio: string | null;
  readonly slot_hora_fin: string | null;
  readonly slot_asignatura_o_grupo: string | null;
  readonly estado: EstadoAsistencia;
  readonly motivo_anulacion: string | null;
  readonly nota: string | null;
  readonly actualizado_en: string | null;
  readonly actualizado_por: string | null;
  readonly peticion_id: string;
}

export interface AsistenciaHistorial {
  readonly id: string;
  readonly asistencia_id: string;
  readonly cambiado_en: string;
  readonly cambiado_por: string | null;
  readonly alumno_id: string;
  readonly profesor_id: string;
  readonly registrado_en: string;
  readonly ocurrido_en: string;
  readonly es_retroactivo: boolean;
  readonly origen: OrigenAsistencia;
  readonly slot_id: string | null;
  readonly slot_dia_semana: DiaSemana | null;
  readonly slot_hora_inicio: string | null;
  readonly slot_hora_fin: string | null;
  readonly slot_asignatura_o_grupo: string | null;
  readonly estado: EstadoAsistencia;
  readonly motivo_anulacion: string | null;
  readonly nota: string | null;
  readonly actualizado_en: string | null;
  readonly actualizado_por: string | null;
  readonly peticion_id: string;
}

export type OrigenEventoError = 'no_controlado' | 'promesa_rechazada' | 'capa_datos';

export interface EventoError {
  readonly id: string;
  readonly origen: OrigenEventoError;
  readonly mensaje: string;
  readonly pila: string | null;
  readonly contexto: Record<string, unknown> | null;
  readonly registrado_en: string;
  readonly registrado_por: string | null;
}
