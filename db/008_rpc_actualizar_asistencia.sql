-- =====================================================================
-- GestorAcademia — 008_rpc_actualizar_asistencia.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que 001/002/003/004/005/006/007: el runner envuelve
-- esto en una transacción y añade la fila de `esquema_migracion` con su
-- propio hash.
--
-- T-21 (revisar y modificar los registros por slot). Renumerada dos
-- veces antes de llegar aquí, documentado en §7 de SEGUIMIENTO.md y en
-- DECISIONES_TECNICAS.md: la hoja de ruta original la llamaba
-- `005_rpc_actualizar_asistencia`; la renumeración en cadena de T-18
-- (2026-08-31) la subió a `006`; el arreglo de T-18
-- (`006_arreglo_limite_tasa_ambiguo.sql`, mismo día) le quitó ese número;
-- y T-20 tomó el `007` que había quedado libre (2026-09-01). Le toca
-- `008`. La hoja de ruta es inmutable (§0.1): la corrección se anota ahí
-- y aquí, no editándola.
--
-- Una única pieza nueva: `actualizar_asistencia(...)`, `SECURITY
-- DEFINER`, la única vía de modificación de una fila de `asistencia` ya
-- existente (el UPDATE directo sigue revocado desde `001_esquema_inicial.sql`).
-- Cinco acciones, todas opcionales y combinables en una misma llamada:
--   - cambiar el alumno (p_alumno_id)
--   - ajustar la hora atribuida (p_ocurrido_en)
--   - cambiar el slot atribuido, recalculando su snapshot (p_slot_id)
--   - anular, con motivo obligatorio (p_anular + p_motivo_anulacion)
--   - editar la nota, incluido vaciarla (p_nota + p_nota_provista, el
--     único par de parámetros con semántica "tri-estado": sin
--     p_nota_provista=true no se toca la nota, así que enviar
--     p_nota=null a secas no la borra por descuido)
-- "Añadir un registro olvidado" (requisito 4, sexto punto) NO es
-- responsabilidad de esta función: sigue siendo `registrar_asistencia`
-- (T-18) con `p_ocurrido_en` declarado, tal como pide la spec.
--
-- Autorización (requisito 5, en servidor, no solo en la interfaz):
-- `administrator` sobre cualquier registro, sin límite temporal;
-- `teacher` solo sobre los suyos (`profesor_id = auth.uid()`) y dentro
-- de `VENTANA_EDICION_TEACHER_DIAS` (7 días desde `registrado_en`,
-- mismo valor conservador que `src/dominio/asistencia.ts`, constante
-- DISTINTA de `VENTANA_RETROACTIVA_MAXIMA_DIAS` aunque hoy coincidan en
-- cifra — ver DECISIONES_TECNICAS.md, misma decisión que T-18 tomó para
-- su propia ventana); `student`, nunca. `registrado_en`, `profesor_id`
-- y `peticion_id` no son parámetros de esta función: no hay forma de
-- pedir cambiarlos, y si alguna vez se intentara desde SQL a mano el
-- trigger `asistencia_proteger_inmutables` (001) seguiría abortando.
--
-- Límite de abuso: reutiliza `aplicar_limite_tasa()` (T-18,
-- `005_rpc_registrar_asistencia.sql`) con la MISMA clave que
-- `registrar_asistencia` (`'asistencia:' || profesor_id`) — cupo
-- compartido entre alta y edición del mismo profesor, decisión
-- documentada en DECISIONES_TECNICAS.md desde el 2026-08-31.
--
-- No recrea `asistencia` ni ninguna de sus columnas/triggers/políticas:
-- todos existen desde `001_esquema_inicial.sql`/`003_politicas_rls.sql`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'rpc_actualizar_asistencia: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'rpc_actualizar_asistencia: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'aplicar_limite_tasa') then
    raise exception 'rpc_actualizar_asistencia: falta aplicar_limite_tasa(). ¿Se aplicó 005_rpc_registrar_asistencia.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. actualizar_asistencia(...) — requisitos 4 y 5 de T-21
-- ---------------------------------------------------------------------

create or replace function public.actualizar_asistencia(
  p_asistencia_id    uuid,
  p_alumno_id        uuid default null,
  p_slot_id          uuid default null,
  p_ocurrido_en      timestamptz default null,
  p_anular           boolean default false,
  p_motivo_anulacion text default null,
  p_nota             text default null,
  p_nota_provista    boolean default false
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

  -- 1. Quién puede modificar ESTE registro (requisito 2 de la consulta / requisito 5 de la
  --    modificación): administrator siempre; teacher solo lo suyo y dentro de la ventana de 7 días
  --    desde que se registró (no desde ocurrido_en: un registro retroactivo antiguo sigue
  --    editable si se registró hace poco, y uno reciente deja de serlo si se registró hace mucho).
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

  -- 2. Límite de abuso (T-06), mismo cupo compartido con registrar_asistencia: se cuenta sobre el
  --    profesor DUEÑO del registro (v_actual.profesor_id), que no cambia con esta función.
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

  -- 4. Ajustar la hora — mismas reglas exactas que el alta (requisito 1 de T-18): nunca en el
  --    futuro, nunca más allá de la ventana retroactiva máxima (7 días). es_retroactivo se
  --    recalcula SIEMPRE con la fórmula del CHECK, aunque ocurrido_en no cambie, porque el alumno
  --    o el slot sí podrían haber cambiado en esta misma llamada.
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

  -- 5. Cambiar el slot atribuido — solo tiene sentido sobre un registro que ya es de origen
  --    'slot' (nunca convierte un 'manual' en 'slot', ni al revés: origen es invariante aquí).
  --    El snapshot se recalcula desde el slot NUEVO, nunca del cliente, mismo criterio que el alta.
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

  -- 6. Anular — motivo obligatorio (requisito 4). No hay "desanular": una vez anulada, esta
  --    función no ofrece forma de volver a 'valida' (fuera del alcance de la spec).
  if p_anular then
    if p_motivo_anulacion is null or length(trim(p_motivo_anulacion)) = 0 then
      raise exception 'actualizar_asistencia: anular exige un motivo';
    end if;
    v_estado_final := 'anulada';
  else
    v_estado_final := v_actual.estado;
  end if;

  -- 7. UPDATE. registrado_en/profesor_id/peticion_id no aparecen aquí: no son parámetros de esta
  --    función, y el trigger asistencia_proteger_inmutables (001) abortaría igualmente si alguien
  --    lo intentase desde otro sitio. actualizado_en/actualizado_por los fija ESE MISMO trigger
  --    (BEFORE UPDATE), no esta función. La copia en asistencia_historial la hace el trigger AFTER
  --    UPDATE (001) con la fila tal como estaba justo antes de este UPDATE.
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
    nota                     = case when p_nota_provista then p_nota else v_actual.nota end
  where id = p_asistencia_id
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean) from public;
grant execute on function public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean) to authenticated;
-- Granted a `authenticated` en general, mismo patrón que registrar_asistencia: la comprobación de
-- rol de arriba (paso 1) es quien de verdad rechaza a `student` y a cualquier rol desconocido, no
-- la ausencia de GRANT.
