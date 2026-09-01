/**
 * Ayudas de PRESENTACIÓN para adaptar la interfaz al rol del usuario (T-10, requisito 6 de su
 * spec: "la interfaz se adapta al rol, con un comentario explícito de que eso es presentación y no
 * control de acceso"). Este comentario es ese comentario explícito.
 *
 * Nada de este fichero controla acceso a ningún dato: el control real vive en las políticas RLS de
 * `db/003_politicas_rls.sql`, verificadas por `db/pruebas_rls.sql`. Si una pantalla futura llamara a
 * estas funciones con el rol equivocado, o no las llamara nunca, el servidor seguiría rechazando
 * cualquier operación que ese rol no tenga permitida — lo único que cambiaría es que la interfaz
 * mostraría un control que iba a fallar al pulsarlo, nunca que dejaría pasar algo indebido.
 *
 * Puras, sin acceso a red ni al DOM: cada pantalla que las consuma (T-11 en adelante) decide cómo
 * pintar el resultado.
 */

import type { Rol } from './tipos.ts';

/** Catálogo de centros: alta, edición y baja (T-11). */
export function puedeGestionarCentros(rol: Rol): boolean {
  return rol === 'administrator';
}

/** Ficha de alumno: alta, edición y baja lógica (T-12). */
export function puedeGestionarFichaAlumno(rol: Rol): boolean {
  return rol === 'administrator';
}

/** Personas de referencia del alumno: el dato más sensible junto al avatar (T-13). Un teacher no
 * ve esta sección en ninguna pantalla, ni siquiera en modo lectura. */
export function puedeVerPersonasReferencia(rol: Rol): boolean {
  return rol === 'administrator';
}

/** Horarios: alta y edición de slots de cualquier alumno/profesor (T-15/T-16). */
export function puedeGestionarHorarios(rol: Rol): boolean {
  return rol === 'administrator';
}

/** Revisar y corregir un registro de asistencia que no es el propio (T-21: administrator elige
 * slot y profesor libremente; un teacher solo su ventana de edición sobre lo suyo). */
export function puedeEditarAsistenciaDeCualquiera(rol: Rol): boolean {
  return rol === 'administrator';
}

/** El teacher SÍ ve el avatar de sus alumnos activos en las cards de pasar lista (ampliación del
 * dueño, 2026-08-25) — pero nunca en un listado general ni en el buscador de alumnos extra (T-20). */
export function puedeVerAvatarEnCards(rol: Rol): boolean {
  return rol === 'administrator' || rol === 'teacher';
}

/** Pasar lista (T-19): la pantalla que un profesor usa cada día para registrar la entrada de sus
 * propios alumnos, slot a slot. Exclusivamente `teacher` — no `administrator`, que no tiene un
 * horario propio de slots (los gestiona, no los imparte) ni necesita esta pantalla para registrar
 * en nombre de otro profesor: esa es la revisión de T-21 (`puedeEditarAsistenciaDeCualquiera`),
 * con su propia interfaz sobre un slot y un profesor elegidos a mano, no la propuesta automática
 * "quién toca ahora" de `dominio/slots.ts`, pensada para quien de verdad tiene ese horario. */
export function puedeUsarPasarLista(rol: Rol): boolean {
  return rol === 'teacher';
}

/** "Mi horario" (T-22): la vista semanal de solo lectura de los propios slots. Exclusivamente
 * `teacher`, mismo motivo que `puedeUsarPasarLista` — `administrator` no tiene horario propio que
 * consultar, el suyo es el de gestión (T-16), no uno para impartir clase. */
export function puedeVerMiHorario(rol: Rol): boolean {
  return rol === 'teacher';
}

/** Consulta y exportación del histórico de asistencia (T-23). Ambos roles con acceso real por
 * RLS —`administrator` lee todo el centro, `teacher` solo lo suyo—, así que los dos pueden ABRIR la
 * pantalla; `student` nunca (§0.2: sin acceso alguno a esta funcionalidad). */
export function puedeVerHistorico(rol: Rol): boolean {
  return rol === 'administrator' || rol === 'teacher';
}

/** Dentro de la pantalla de histórico, ¿puede elegir un profesor concreto (distinto de sí mismo) o
 * acotar por centro de estudios? Solo `administrator` — un `teacher` ya está limitado a lo suyo por
 * RLS, así que ofrecerle un selector de profesor solo mostraría un control que el servidor iba a
 * vaciar igualmente; mismo criterio exacto que `puedeEditarAsistenciaDeCualquiera` (T-21), pero
 * como función propia porque son dos capacidades distintas (consultar frente a editar) que podrían
 * divergir si el dueño decide un día que un teacher SÍ pueda ver el histórico de otro. */
export function puedeConsultarHistoricoDeCualquiera(rol: Rol): boolean {
  return rol === 'administrator';
}

/** ¿Puede pedir que la exportación CSV del histórico incluya también el email y el teléfono del
 * alumno (requisito 3 de T-23: "salvo que el administrator lo pida explícitamente")? Solo
 * `administrator` — un `teacher` no tiene acceso a esos datos ni siquiera en la ficha del alumno. */
export function puedeExportarConDatosDeContacto(rol: Rol): boolean {
  return rol === 'administrator';
}

/** Columnas de `alumno` con las que merece la pena pintar un formulario o una card para `rol`: no
 * es una lista de lo que el dato PUEDE tener, es una lista de lo que no tiene sentido dibujar
 * porque el servidor nunca lo va a devolver para ese rol (`003_politicas_rls.sql`, requisito 4 de
 * T-10: un teacher no tiene ningún GRANT de columna sobre `email_alumno`/`telefono_alumno`). Evita
 * que una pantalla futura dibuje una casilla de contacto vacía y la confunda con "sin dato". */
export function columnasVisiblesFichaAlumno(rol: Rol): readonly string[] {
  const IDENTIFICACION = ['id', 'nombre', 'primer_apellido', 'segundo_apellido', 'avatar_ruta', 'activo'] as const;
  if (rol === 'administrator') {
    return [
      ...IDENTIFICACION,
      'centro_referencia_id',
      'email_alumno',
      'telefono_alumno',
      'alta_en',
      'baja_en',
      'motivo_baja',
    ];
  }
  return IDENTIFICACION;
}
