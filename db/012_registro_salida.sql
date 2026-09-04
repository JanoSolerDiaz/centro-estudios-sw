-- =====================================================================
-- GestorAcademia — 012_registro_salida.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-03 (registro de salida y cómputo de horas reales, oleada v1 / F-01).
-- Objetivo: que una entrada ya registrada se pueda cerrar con una hora de
-- salida, para calcular horas reales por alumno — sin reescribir la fila
-- original ni obligar a nadie a rellenarla (requisito 2: "la salida es
-- opcional").
--
-- Tres piezas, ninguna recrea `asistencia`/`asistencia_historial` ni sus
-- triggers/políticas existentes:
--   1. Columna nueva en `asistencia`: `ocurrido_en_salida` (nullable).
--      `CHECK` de coherencia: nula, o estrictamente posterior a
--      `ocurrido_en` (no se puede salir antes o en el mismo instante en
--      que se entró) — defensa de fondo; la RPC de abajo es quien de
--      verdad aplica esta regla en cada llamada, este `CHECK` solo cubre
--      el caso en que alguien la sortease desde otro camino.
--      Deliberadamente SIN ningún `CHECK` que la ate a `estado = 'valida'`
--      — mismo criterio exacto que R-02 con `motivo_justificacion` (ver
--      `011_justificacion_ausencia.sql`): si lo tuviera, anular DESPUÉS
--      un registro que ya tiene salida (`actualizar_asistencia` ya lo
--      permite sin cambios) violaría el `CHECK` en el mismo `UPDATE` que
--      lo anula. La regla "solo se marca salida de un registro presente"
--      vive en la RPC, que la evalúa una vez al marcar, no como
--      invariante permanente de la fila.
--   2. La misma columna en `asistencia_historial` (append-only), y el
--      trigger `asistencia_copiar_a_historial()` (definido en
--      `001_esquema_inicial.sql`, inmutable: se sustituye aquí con
--      `create or replace function`, mismo patrón exacto que `009`/`011`
--      ya usaron) para que seguir copiando TODAS las columnas de la fila
--      anterior incluya también esta — es lo que satisface el requisito
--      4 ("ajustar la salida... queda trazado en asistencia_historial")
--      sin ningún código nuevo: el trigger ya existente lo hace gratis en
--      cuanto la columna existe y el UPDATE la toca.
--   3. `actualizar_asistencia(...)` (`008_rpc_actualizar_asistencia.sql`,
--      inmutable, ya en su tercera versión tras `010`/`011`) gana un
--      SÉPTIMO par de acciones combinables: "marcar salida"
--      (`p_marcar_salida`, cierra con la hora real del SERVIDOR, nunca
--      un valor que envíe el cliente — requisito 1: "igual de
--      inalterable por el cliente que la de entrada") y "ajustar la
--      salida" (`p_ocurrido_en_salida`, corrige una salida YA marcada a
--      un valor explícito, mismo régimen que `p_ocurrido_en` sobre la
--      entrada — requisito 4). Son dos acciones distintas, mutuamente
--      excluyentes en la misma llamada (ver el primer `if` de la sección
--      8 de la función): la primera CREA el valor con el reloj del
--      servidor, la segunda CORRIGE un valor que ya existe; confundirlas
--      en un solo parámetro habría hecho ambiguo si un valor nulo
--      significa "no tocar" o "usar el reloj del servidor", el mismo
--      problema tri-estado que `p_nota`/`p_nota_provista` ya resolvió en
--      `008` separando en dos parámetros. Como PL/pgSQL identifica una
--      función por nombre + tipos de parámetro, añadir parámetros nuevos
--      con `create or replace function` crearía una SEGUNDA sobrecarga en
--      vez de sustituir la firma anterior: se hace `drop function`
--      seguido de `create function` con la firma completa (los once
--      parámetros de `011` más los dos nuevos al final), sin tocar los
--      ficheros `008`/`011`.
--
-- Decisión de reloj, documentada también en DECISIONES_TECNICAS.md:
-- "marcar salida" usa `clock_timestamp()`, NUNCA `now()`. `now()` (alias
-- de `transaction_timestamp()`) devuelve el MISMO instante durante toda
-- una transacción — y tanto una llamada real a esta RPC como, sobre
-- todo, la batería `db/pruebas_rls.sql` (que corre el fichero ENTERO
-- dentro de un único `begin ... rollback`) harían que "marcar salida"
-- justo después de registrar la entrada devolviera el mismo instante que
-- `ocurrido_en`, violando el propio `CHECK`/comprobación de "la salida
-- tiene que ser posterior a la entrada" por una razón puramente artificial
-- de cómo Postgres resuelve `now()`, no un error de la lógica. Autorización
-- (requisito 4, en servidor): la ventana de edición del profesor (7 días
-- desde `registrado_en`) y el privilegio ilimitado de `administrator`
-- gobiernan ya TODA la función desde su primer `if` (paso 1), antes de
-- mirar qué parámetro se usa — "marcar o ajustar salida fuera de la
-- ventana del profesor" se rechaza para `teacher` y se acepta para
-- `administrator` sin ningún código adicional, mismo criterio que R-02.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'registro_salida: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'actualizar_asistencia') then
    raise exception 'registro_salida: falta actualizar_asistencia(). ¿Se aplicó 011_justificacion_ausencia.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'registro_salida: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Columna nueva en asistencia
-- ---------------------------------------------------------------------

alter table public.asistencia
  add column ocurrido_en_salida timestamptz,
  add constraint asistencia_salida_posterior_a_entrada check (
    ocurrido_en_salida is null or ocurrido_en_salida > ocurrido_en
  );

comment on column public.asistencia.ocurrido_en_salida is
  'Hora de salida (R-03), NULL mientras no se cierre la entrada — opcional, no bloquea nada. La fija '
  'el servidor al marcar salida (clock_timestamp(), nunca un valor del cliente); editable después '
  'dentro de la misma ventana que ocurrido_en. No cambia estado ni ningún otro campo.';


-- ---------------------------------------------------------------------
-- 2. Misma columna en asistencia_historial (append-only) + trigger de
--    copia sustituido para incluirla — mismo criterio que 009/011
--    sustituyeron sus respectivos triggers sin recrear la tabla.
-- ---------------------------------------------------------------------

alter table public.asistencia_historial
  add column ocurrido_en_salida timestamptz;

create or replace function public.asistencia_copiar_a_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.asistencia_historial (
    asistencia_id, cambiado_por,
    alumno_id, profesor_id, registrado_en, ocurrido_en, ocurrido_en_salida, es_retroactivo, origen,
    slot_id, slot_dia_semana, slot_hora_inicio, slot_hora_fin, slot_asignatura_o_grupo,
    estado, motivo_anulacion, motivo_justificacion, nota_justificacion, nota,
    actualizado_en, actualizado_por, peticion_id
  )
  values (
    old.id, auth.uid(),
    old.alumno_id, old.profesor_id, old.registrado_en, old.ocurrido_en, old.ocurrido_en_salida, old.es_retroactivo, old.origen,
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
-- 3. actualizar_asistencia gana las acciones "marcar salida" y "ajustar
--    salida" (requisitos 1 y 4 de R-03). Firma completa: los once
--    parámetros de 011 + los dos nuevos, en ese orden — drop + create,
--    no "or replace" (ver cabecera).
-- ---------------------------------------------------------------------

drop function if exists public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean, boolean, text, text);

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
  p_nota_justificacion    text default null,
  p_marcar_salida         boolean default false,
  p_ocurrido_en_salida    timestamptz default null
)
returns public.asistencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol                    text := public.rol_actual();
  v_actual                 public.asistencia%rowtype;
  v_alumno_final           uuid;
  v_alumno_activo          boolean;
  v_ocurrido_final         timestamptz;
  v_es_retroactivo         boolean;
  v_estado_final           text;
  v_slot                   public.slot_horario%rowtype;
  v_fecha_local            date;
  v_ocurrido_salida_final  timestamptz;
  v_fila                   public.asistencia;
begin
  select * into v_actual from public.asistencia where id = p_asistencia_id;
  if not found then
    raise exception 'actualizar_asistencia: el registro indicado no existe';
  end if;

  -- 1. Quién puede modificar ESTE registro — sin cambios respecto a 008/011: administrator siempre;
  --    teacher solo lo suyo y dentro de la ventana de 7 días desde que se registró. Esta misma
  --    comprobación, sin distinguir qué parámetro se use, es la que hace que "marcar o ajustar
  --    salida fuera de la ventana del profesor" quede rechazado para teacher y aceptado para
  --    administrator (criterio de aceptación de R-03) sin ningún código adicional.
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

  -- 7. Justificar (R-02) — solo sobre una ausencia YA registrada.
  if p_justificar then
    if v_actual.estado <> 'ausente' then
      raise exception 'actualizar_asistencia: solo se puede justificar un registro con estado ausente';
    end if;
    if p_motivo_justificacion is null
       or p_motivo_justificacion not in ('enfermedad', 'cita_medica', 'motivo_familiar', 'otro') then
      raise exception 'actualizar_asistencia: justificar exige un motivo de la lista permitida';
    end if;
  end if;

  -- 8. Salida (R-03, requisitos 1 y 4) — dos acciones mutuamente excluyentes en la misma llamada:
  --    "marcar" (crea el valor con el reloj del SERVIDOR, clock_timestamp() y no now(): ver la
  --    cabecera de este fichero) solo sobre un registro que, tras esta misma llamada, quede
  --    'valida' y todavía sin salida; "ajustar" (corrige un valor que YA existe a uno explícito,
  --    mismo régimen que p_ocurrido_en sobre la entrada) exige que ya hubiera una salida marcada.
  --    No existe "desmarcar": esta función no ofrece volver ocurrido_en_salida a null.
  if p_marcar_salida and p_ocurrido_en_salida is not null then
    raise exception 'actualizar_asistencia: no se puede marcar y ajustar la salida en la misma llamada';
  end if;
  if p_marcar_salida then
    if v_estado_final <> 'valida' then
      raise exception 'actualizar_asistencia: solo se puede marcar salida de un registro presente';
    end if;
    if v_actual.ocurrido_en_salida is not null then
      raise exception 'actualizar_asistencia: el registro ya tiene una hora de salida; para corregirla, ajústala';
    end if;
    v_ocurrido_salida_final := clock_timestamp();
    if v_ocurrido_salida_final <= v_ocurrido_final then
      raise exception 'actualizar_asistencia: la salida no puede ser anterior o igual a la entrada';
    end if;
  elsif p_ocurrido_en_salida is not null then
    if v_actual.ocurrido_en_salida is null then
      raise exception 'actualizar_asistencia: el registro no tiene salida marcada; márcala antes de ajustarla';
    end if;
    if p_ocurrido_en_salida > clock_timestamp() then
      raise exception 'actualizar_asistencia: la salida no puede estar en el futuro';
    end if;
    if clock_timestamp() - p_ocurrido_en_salida > interval '7 days' then
      raise exception 'actualizar_asistencia: la salida supera la ventana permitida hacia atrás (7 días)';
    end if;
    if p_ocurrido_en_salida <= v_ocurrido_final then
      raise exception 'actualizar_asistencia: la salida no puede ser anterior o igual a la entrada';
    end if;
    v_ocurrido_salida_final := p_ocurrido_en_salida;
  else
    v_ocurrido_salida_final := v_actual.ocurrido_en_salida;
  end if;

  -- 9. UPDATE. registrado_en/profesor_id/peticion_id no aparecen aquí: el trigger
  --    asistencia_proteger_inmutables (001) abortaría igualmente si se intentase.
  update public.asistencia set
    alumno_id               = v_alumno_final,
    ocurrido_en              = v_ocurrido_final,
    ocurrido_en_salida       = v_ocurrido_salida_final,
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

revoke all on function public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean, boolean, text, text, boolean, timestamptz) from public;
grant execute on function public.actualizar_asistencia(uuid, uuid, uuid, timestamptz, boolean, text, text, boolean, boolean, text, text, boolean, timestamptz) to authenticated;
-- Granted a authenticated en general, mismo patrón que el resto de RPC de asistencia: la
-- comprobación de rol del paso 1 es quien de verdad rechaza a student y a cualquier rol desconocido.
