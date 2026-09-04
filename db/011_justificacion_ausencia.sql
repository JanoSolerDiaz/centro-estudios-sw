-- =====================================================================
-- GestorAcademia — 011_justificacion_ausencia.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-02 (justificación de una ausencia, oleada v1 / F-01). Objetivo: que
-- una ausencia ya registrada (R-01) se pueda marcar como justificada
-- —motivo de una lista corta cerrada más una nota libre opcional— sin
-- reescribir la fila original ni "des-ausentarla": el alumno sigue
-- constando como ausente, solo se cualifica el hecho.
--
-- Tres piezas, ninguna recrea `asistencia`/`asistencia_historial` ni sus
-- triggers/políticas existentes:
--   1. Dos columnas nuevas en `asistencia`: `motivo_justificacion`
--      (lista corta cerrada, CHECK) y `nota_justificacion` (texto libre
--      opcional). Deliberadamente SIN ningún CHECK que las ate a
--      `estado = 'ausente'` — ver el comentario junto al ALTER TABLE.
--   2. Las mismas dos columnas en `asistencia_historial` (append-only),
--      y el trigger `asistencia_copiar_a_historial()` (definido en
--      `001_esquema_inicial.sql`, inmutable: se sustituye aquí con
--      `create or replace function`, mismo patrón exacto que
--      `perfil_before_update` sustituyó a `perfil_tocar_actualizado_en`
--      en `009_administracion_usuarios.sql`) para que seguir copiando
--      TODAS las columnas de la fila anterior incluya también estas dos.
--   3. `actualizar_asistencia(...)` (`008_rpc_actualizar_asistencia.sql`,
--      inmutable) gana un SEXTO par de parámetros combinable
--      (`p_justificar` + `p_motivo_justificacion` +
--      `p_nota_justificacion`), no una RPC nueva: la propia cabecera de
--      `008` ya describe esa función como "cinco acciones, todas
--      opcionales y combinables en una misma llamada" sobre un registro
--      YA EXISTENTE — justificar es una sexta acción de la misma
--      familia (autorización, ventana de edición y auditoría ya
--      resueltas por esa función), a diferencia de R-01
--      (`registrar_ausencia`), que sí necesitó una RPC separada de
--      `registrar_asistencia` por tratarse de dos intenciones de
--      CREACIÓN distintas. Como PL/pgSQL identifica una función por
--      nombre + tipos de parámetro, añadir parámetros nuevos con
--      `create or replace function` crearía una SEGUNDA sobrecarga en
--      vez de sustituir la firma anterior: se hace `drop function`
--      seguido de `create function` con la firma completa (los ocho
--      parámetros de `008` más los tres nuevos al final), sin tocar el
--      fichero `008`.
--
-- Autorización: automática, sin ningún cambio de código — la ventana de
-- edición del profesor (7 días desde `registrado_en`) y el privilegio
-- ilimitado de `administrator` ya gobiernan TODA la función desde su
-- primer `if` (paso 1), antes de que importe qué parámetro se use. Por
-- eso el criterio de aceptación de R-02 ("justificar fuera de la
-- ventana del profesor es rechazado para teacher y aceptado para
-- administrator") sale gratis de la estructura ya existente.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'justificacion_ausencia: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'actualizar_asistencia') then
    raise exception 'justificacion_ausencia: falta actualizar_asistencia(). ¿Se aplicó 008_rpc_actualizar_asistencia.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'justificacion_ausencia: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Columnas nuevas en asistencia
--
-- Sin CHECK que exija estado = 'ausente' cuando motivo_justificacion no
-- es nulo: si se atara así, anular DESPUÉS una ausencia ya justificada
-- (actualizar_asistencia ya lo permite sin cambios, ver 010) violaría
-- el CHECK en el mismo UPDATE que la anula, bloqueando una operación
-- que la spec de R-01 sí permite ("no existe des-ausentar: eso es
-- anular con motivo"). La RPC, más abajo, sí exige estado = 'ausente'
-- en el momento de justificar — la regla vive donde puede evaluarse una
-- vez, no como un invariante permanente de la fila.
-- ---------------------------------------------------------------------

alter table public.asistencia
  add column motivo_justificacion text,
  add column nota_justificacion   text,
  add constraint asistencia_motivo_justificacion_valido check (
    motivo_justificacion is null
    or motivo_justificacion in ('enfermedad', 'cita_medica', 'motivo_familiar', 'otro')
  );

comment on column public.asistencia.motivo_justificacion is
  'Motivo de justificación de una ausencia (R-02), lista corta cerrada. NULL mientras no se '
  'justifique. No cambia estado: el alumno sigue constando como ausente, solo se cualifica.';
comment on column public.asistencia.nota_justificacion is
  'Texto libre opcional que acompaña a motivo_justificacion (R-02). NULL si no se ha justificado '
  'o si se justificó sin nota adicional.';


-- ---------------------------------------------------------------------
-- 2. Mismas columnas en asistencia_historial (append-only) + trigger
--    de copia sustituido para incluirlas — mismo criterio que 009
--    sustituyó perfil_tocar_actualizado_en sin recrear la tabla.
-- ---------------------------------------------------------------------

alter table public.asistencia_historial
  add column motivo_justificacion text,
  add column nota_justificacion   text;

create or replace function public.asistencia_copiar_a_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.asistencia_historial (
    asistencia_id, cambiado_por,
    alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen,
    slot_id, slot_dia_semana, slot_hora_inicio, slot_hora_fin, slot_asignatura_o_grupo,
    estado, motivo_anulacion, motivo_justificacion, nota_justificacion, nota,
    actualizado_en, actualizado_por, peticion_id
  )
  values (
    old.id, auth.uid(),
    old.alumno_id, old.profesor_id, old.registrado_en, old.ocurrido_en, old.es_retroactivo, old.origen,
    old.slot_id, old.slot_dia_semana, old.slot_hora_inicio, old.slot_hora_fin, old.slot_asignatura_o_grupo,
    old.estado, old.motivo_anulacion, old.motivo_justificacion, old.nota_justificacion, old.nota,
    old.actualizado_en, old.actualizado_por, old.peticion_id
  );
  return new;
end;
$$;
-- El trigger asistencia_after_update (001) ya apunta a esta función por nombre: create or replace
-- no requiere recrear el trigger en sí.


-- ---------------------------------------------------------------------
-- 3. actualizar_asistencia gana la acción "justificar" (requisitos 1 y
--    2 de R-02). Firma completa: los ocho parámetros de 008 + los tres
--    nuevos, en ese orden — drop + create, no "or replace" (ver cabecera).
-- ---------------------------------------------------------------------

drop function if exists public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean);

create function public.actualizar_asistencia(
  p_asistencia_id         uuid,
  p_alumno_id             uuid default null,
  p_slot_id               uuid default null,
  p_ocurrido_en           timestamptz default null,
  p_anular                boolean default false,
  p_motivo_anulacion      text default null,
  p_nota                  text default null,
  p_nota_provista         boolean default false,
  p_justificar            boolean default false,
  p_motivo_justificacion  text default null,
  p_nota_justificacion    text default null
)
returns public.asistencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol             text := public.rol_actual();
  v_actual          public.asistencia%rowtype;
  v_alumno_final    uuid;
  v_alumno_activo   boolean;
  v_ocurrido_final  timestamptz;
  v_es_retroactivo  boolean;
  v_estado_final    text;
  v_slot            public.slot_horario%rowtype;
  v_fecha_local     date;
  v_fila            public.asistencia;
begin
  select * into v_actual from public.asistencia where id = p_asistencia_id;
  if not found then
    raise exception 'actualizar_asistencia: el registro indicado no existe';
  end if;

  -- 1. Quién puede modificar ESTE registro — sin cambios respecto a 008: administrator siempre;
  --    teacher solo lo suyo y dentro de la ventana de 7 días desde que se registró. Esta misma
  --    comprobación, sin distinguir qué parámetro se use, es la que hace que "justificar fuera de
  --    la ventana del profesor" quede rechazado para teacher y aceptado para administrator
  --    (criterio de aceptación de R-02) sin ningún código adicional.
  if v_rol = 'administrator' then
    null;
  elsif v_rol = 'teacher' then
    if v_actual.profesor_id <> auth.uid() then
      raise exception 'actualizar_asistencia: no puedes modificar un registro de otro profesor'
        using errcode = '42501';
    end if;
    if now() - v_actual.registrado_en > interval '7 days' then
      raise exception 'actualizar_asistencia: ha pasado la ventana de edición de 7 días'
        using errcode = '42501';
    end if;
  else
    raise exception 'actualizar_asistencia: solo administrator o teacher pueden modificar asistencia'
      using errcode = '42501';
  end if;

  -- 2. Límite de abuso (T-06), mismo cupo compartido con registrar_asistencia/registrar_ausencia.
  perform public.aplicar_limite_tasa('asistencia:' || v_actual.profesor_id::text, 60, 60);

  -- 3. Cambiar el alumno — se valida solo si de verdad cambia.
  v_alumno_final := coalesce(p_alumno_id, v_actual.alumno_id);
  if p_alumno_id is not null and p_alumno_id <> v_actual.alumno_id then
    select activo into v_alumno_activo from public.alumno where id = p_alumno_id;
    if not found then
      raise exception 'actualizar_asistencia: el alumno indicado no existe';
    end if;
    if not v_alumno_activo then
      raise exception 'actualizar_asistencia: el alumno está dado de baja';
    end if;
  end if;

  -- 4. Ajustar la hora — nunca en el futuro, nunca más allá de la ventana retroactiva máxima.
  if p_ocurrido_en is not null then
    if p_ocurrido_en > now() then
      raise exception 'actualizar_asistencia: ocurrido_en no puede estar en el futuro';
    end if;
    if now() - p_ocurrido_en > interval '7 days' then
      raise exception 'actualizar_asistencia: ocurrido_en supera la ventana permitida hacia atrás (7 días)';
    end if;
    v_ocurrido_final := p_ocurrido_en;
  else
    v_ocurrido_final := v_actual.ocurrido_en;
  end if;
  v_es_retroactivo := abs(extract(epoch from (v_ocurrido_final - v_actual.registrado_en))) > 300;

  -- 5. Cambiar el slot atribuido — solo sobre un registro de origen 'slot'.
  if p_slot_id is not null then
    if v_actual.origen <> 'slot' then
      raise exception 'actualizar_asistencia: solo se puede cambiar el slot de un registro de origen "slot"';
    end if;
    select * into v_slot from public.slot_horario where id = p_slot_id;
    if not found then
      raise exception 'actualizar_asistencia: el slot indicado no existe';
    end if;
    if v_slot.profesor_id <> v_actual.profesor_id then
      raise exception 'actualizar_asistencia: el slot pertenece a otro profesor';
    end if;
    if v_slot.alumno_id <> v_alumno_final then
      raise exception 'actualizar_asistencia: el slot no corresponde a este alumno';
    end if;

    v_fecha_local := (v_ocurrido_final at time zone 'Europe/Madrid')::date;
    if v_slot.vigente_desde > v_fecha_local
       or (v_slot.vigente_hasta is not null and v_slot.vigente_hasta < v_fecha_local) then
      raise exception 'actualizar_asistencia: el slot no está vigente en la fecha del registro';
    end if;
  end if;

  -- 6. Anular — motivo obligatorio. No hay "desanular".
  if p_anular then
    if p_motivo_anulacion is null or length(trim(p_motivo_anulacion)) = 0 then
      raise exception 'actualizar_asistencia: anular exige un motivo';
    end if;
    v_estado_final := 'anulada';
  else
    v_estado_final := v_actual.estado;
  end if;

  -- 7. Justificar (R-02, requisitos 1 y 3) — solo sobre una ausencia YA registrada (v_actual.estado,
  --    el estado ANTES de este UPDATE: si esta misma llamada también anula, sigue contando como
  --    "sobre una ausencia" porque en el instante de justificar lo era). Motivo obligatorio, de la
  --    lista corta cerrada — el CHECK de la tabla es la defensa de fondo, este mensaje es el que
  --    llega al cliente sin genérico. No existe "des-justificar" en esta migración: no se ofrece
  --    forma de volver motivo_justificacion a null una vez puesto (fuera del alcance de R-02).
  if p_justificar then
    if v_actual.estado <> 'ausente' then
      raise exception 'actualizar_asistencia: solo se puede justificar un registro con estado ausente';
    end if;
    if p_motivo_justificacion is null
       or p_motivo_justificacion not in ('enfermedad', 'cita_medica', 'motivo_familiar', 'otro') then
      raise exception 'actualizar_asistencia: justificar exige un motivo de la lista permitida';
    end if;
  end if;

  -- 8. UPDATE. registrado_en/profesor_id/peticion_id no aparecen aquí: el trigger
  --    asistencia_proteger_inmutables (001) abortaría igualmente si se intentase.
  update public.asistencia set
    alumno_id               = v_alumno_final,
    ocurrido_en              = v_ocurrido_final,
    es_retroactivo           = v_es_retroactivo,
    slot_id                  = coalesce(p_slot_id, v_actual.slot_id),
    slot_dia_semana          = case when p_slot_id is not null then v_slot.dia_semana else v_actual.slot_dia_semana end,
    slot_hora_inicio         = case when p_slot_id is not null then v_slot.hora_inicio else v_actual.slot_hora_inicio end,
    slot_hora_fin            = case when p_slot_id is not null then v_slot.hora_fin else v_actual.slot_hora_fin end,
    slot_asignatura_o_grupo  = case when p_slot_id is not null then v_slot.asignatura_o_grupo else v_actual.slot_asignatura_o_grupo end,
    estado                   = v_estado_final,
    motivo_anulacion         = case when p_anular then p_motivo_anulacion else v_actual.motivo_anulacion end,
    motivo_justificacion     = case when p_justificar then p_motivo_justificacion else v_actual.motivo_justificacion end,
    nota_justificacion       = case when p_justificar then p_nota_justificacion else v_actual.nota_justificacion end,
    nota                     = case when p_nota_provista then p_nota else v_actual.nota end
  where id = p_asistencia_id
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean, boolean, text, text) from public;
grant execute on function public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean, boolean, text, text) to authenticated;
-- Granted a authenticated en general, mismo patrón que el resto de RPC de asistencia: la
-- comprobación de rol del paso 1 es quien de verdad rechaza a student y a cualquier rol desconocido.
