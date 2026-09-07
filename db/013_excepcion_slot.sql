-- =====================================================================
-- GestorAcademia — 013_excepcion_slot.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-06 (excepción puntual de un slot: sustitución o cancelación, oleada
-- v1 / F-03). Objetivo: declarar, para un slot y un día concreto, que
-- otro profesor cubre la clase (sustitución) o que la clase no se da
-- (cancelación), sin tocar el horario recurrente (T-15) ni su vigencia.
--
-- Tres piezas:
--   1. `excepcion_slot` — tabla nueva. Trae sus propias políticas RLS en
--      el mismo fichero (mismo criterio que `014_calendario_cierres.sql`:
--      no existe ningún "próximo lote de políticas" al que aplazarlas).
--      A diferencia de `cierre_centro`/`centro_estudios`, esta tabla NO
--      concede INSERT/UPDATE directo a `authenticated`: toda escritura
--      pasa por las dos RPC de la pieza 2, `SECURITY DEFINER`. Motivo:
--      el requisito 5 de R-06 ("ninguna de las dos excepciones puede
--      declararse retroactivamente sobre un slot que ya tiene registros
--      de asistencia ese día") protege la misma invariante de "no
--      reescribir historia" que ya exige RPC para `asistencia` (§0.2) —
--      un read-then-write en el cliente (como el solape, blando, de
--      `cierresCentro.ts`/`slotsHorario.ts`) dejaría una ventana de
--      carrera sobre una garantía que aquí sí debe ser dura.
--   2. `declarar_excepcion_slot(...)` / `desactivar_excepcion_slot(...)`
--      — únicas vías de escritura, `administrator` únicamente. Comprueban
--      de forma atómica, en la misma transacción de la RPC, que no exista
--      ya ningún registro de `asistencia` de ese slot ese día antes de
--      insertar o de reactivar el horario normal.
--   3. `registrar_asistencia` (`005_rpc_registrar_asistencia.sql`, YA
--      APLICADA e inmutable) se SUSTITUYE aquí con `create or replace
--      function` — misma firma exacta, ningún parámetro nuevo: la
--      cancelación/sustitución se resuelve enteramente a partir de
--      `slot_id` y la fecha ya calculada, nunca de un dato que mande el
--      cliente. Mismo patrón que `006_arreglo_limite_tasa_ambiguo.sql`
--      sustituyó `aplicar_limite_tasa()` sin tocar el fichero `005`.
--
-- `registrar_ausencia` (`010_registro_ausencias.sql`) recibe la MISMA
-- lógica, pero NO aquí: ese fichero todavía no está aplicado (sigue
-- `PENDIENTE` en `db/APLICADAS.md`, bloqueado en §3 de SEGUIMIENTO.md
-- esperando al dueño), así que la regla de inmutabilidad de §0.1 ("una
-- migración APLICADA es inmutable") no se le aplica todavía — se edita
-- directamente `010_registro_ausencias.sql` en el mismo commit que esta
-- migración, en vez de dejar aquí una segunda sustitución. Ver la
-- decisión razonada en `DECISIONES_TECNICAS.md` (R-06). Por eso esta
-- migración exige que `010` se aplique ANTES o A LA VEZ que ella (el
-- runner ya aplica siempre en orden numérico dentro de la misma
-- invocación, así que en la práctica siempre es así): si algún día se
-- aplicara `010` completamente solo, sin `013`, `registrar_ausencia`
-- referenciaría una tabla que todavía no existe — PL/pgSQL no valida los
-- nombres de tabla de su cuerpo al crear la función, solo al ejecutarla,
-- así que la creación no fallaría, solo una llamada real antes de que
-- `013` llegue.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'slot_horario') then
    raise exception 'excepcion_slot: falta la tabla slot_horario. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'excepcion_slot: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'tocar_actualizado_en') then
    raise exception 'excepcion_slot: falta la función tocar_actualizado_en(). ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'excepcion_slot: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'excepcion_slot: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'excepcion_slot: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'registrar_asistencia'
  ) then
    raise exception 'excepcion_slot: falta la función registrar_asistencia(). ¿Se aplicó 005_rpc_registrar_asistencia.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. excepcion_slot — una excepción de un solo día sobre un slot
--    recurrente (requisito 1). `fecha` es la fecha CONCRETA de la
--    ocurrencia, no un día de la semana: debe coincidir con
--    `slot_horario.dia_semana` (comprobado en la RPC, sección 3), nunca
--    en un CHECK de esta tabla (que no puede mirar otra tabla).
-- ---------------------------------------------------------------------

create table public.excepcion_slot (
  id                    uuid        primary key default gen_random_uuid(),
  slot_id               uuid        not null references public.slot_horario (id),
  fecha                 date        not null,
  tipo                  text        not null,
  profesor_sustituto_id uuid        references public.perfil (id),
  motivo                text,
  activo                boolean     not null default true,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint excepcion_slot_tipo_valido check (tipo in ('sustitucion', 'cancelacion')),
  -- Sustitución exige sustituto y no admite motivo obligatorio; cancelación es lo contrario.
  constraint excepcion_slot_sustitucion_coherente check (
    (tipo = 'sustitucion' and profesor_sustituto_id is not null)
    or
    (tipo = 'cancelacion' and profesor_sustituto_id is null)
  ),
  constraint excepcion_slot_cancelacion_motivo_obligatorio check (
    tipo <> 'cancelacion' or (motivo is not null and btrim(motivo) <> '')
  )
);

comment on table public.excepcion_slot is
  'Excepción de UN día sobre un slot_horario recurrente (R-06): sustitución (otro profesor cubre '
  'la clase) o cancelación (no hay clase, con motivo). No modifica slot_horario ni su vigencia. '
  'Escritura exclusivamente por declarar_excepcion_slot()/desactivar_excepcion_slot() (SECURITY '
  'DEFINER, más abajo): sin GRANT de INSERT/UPDATE a authenticated. Baja lógica (activo), nunca '
  'DELETE, igual que el resto del esquema.';
comment on column public.excepcion_slot.fecha is
  'Fecha CONCRETA de la ocurrencia (no un día de la semana genérico). Debe coincidir con el '
  'dia_semana de slot_id, comprobado por la RPC al declarar, no por un CHECK de esta tabla.';
comment on column public.excepcion_slot.profesor_sustituto_id is
  'Solo para tipo = ''sustitucion''. Ese día, registrar_asistencia/registrar_ausencia tratan a '
  'este profesor como si fuera el titular del slot; el titular real queda excluido ese mismo día.';
comment on column public.excepcion_slot.activo is
  'Una excepción desactivada deja de aplicar (el horario normal vuelve). Nunca se desactiva si ya '
  'hay registros de asistencia de ese slot ese día (desactivar_excepcion_slot lo impide) — eso '
  'ocultaría quién dio la clase de verdad.';

-- Solo una excepción ACTIVA por slot y fecha: no pueden coexistir una sustitución y una
-- cancelación (o dos sustituciones) sobre el mismo día del mismo slot.
create unique index excepcion_slot_uq_slot_fecha_activa
  on public.excepcion_slot (slot_id, fecha)
  where activo;

create index excepcion_slot_slot_id_idx on public.excepcion_slot (slot_id);
create index excepcion_slot_profesor_sustituto_idx
  on public.excepcion_slot (profesor_sustituto_id)
  where profesor_sustituto_id is not null;

drop trigger if exists excepcion_slot_tocar_actualizado_en on public.excepcion_slot;
create trigger excepcion_slot_tocar_actualizado_en
  before update on public.excepcion_slot
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 2. Privilegios y políticas RLS.
--
-- Sin INSERT/UPDATE para authenticated: las dos RPC de la sección 3
-- corren como su propietario (SECURITY DEFINER) y no necesitan grant.
-- Lectura: administrator ve todas; teacher ve solo las ACTIVAS que le
-- afectan — como titular del slot (para saber que ese día no le toca, o
-- que le cubrieron) o como sustituto nombrado (para que el motor de
-- propuesta, T-17, pueda leer también el slot_horario ajeno vía la
-- política de la sección 4). Sin ninguna política para student (§0.2).
-- ---------------------------------------------------------------------

alter table public.excepcion_slot enable row level security;
revoke all on public.excepcion_slot from anon, authenticated, service_role;
grant select, insert, update, delete on public.excepcion_slot to service_role;
grant select on public.excepcion_slot to authenticated;

create policy excepcion_slot_admin_leer_todo on public.excepcion_slot
  for select to authenticated
  using (public.es_administrator());

create policy excepcion_slot_teacher_leer_relacionadas on public.excepcion_slot
  for select to authenticated
  using (
    public.es_teacher()
    and activo
    and (
      profesor_sustituto_id = auth.uid()
      or exists (
        select 1 from public.slot_horario s
         where s.id = excepcion_slot.slot_id
           and s.profesor_id = auth.uid()
      )
    )
  );


-- ---------------------------------------------------------------------
-- 3. Ampliación de slot_horario (003_politicas_rls.sql, ya aplicada e
--    inmutable): el sustituto necesita leer el slot_horario AJENO que
--    cubre, aunque `slot_horario_teacher_leer_propios` no se lo permita.
--    No se toca esa política (inmutable): se AÑADE una nueva, mismo
--    patrón exacto que `avatares_teacher_leer_alumnos_activos`
--    (`003_politicas_rls.sql`) — una política adicional sobre una tabla
--    ya existente, en vez de reescribir la que ya hay.
-- ---------------------------------------------------------------------

create policy slot_horario_teacher_leer_sustituciones on public.slot_horario
  for select to authenticated
  using (
    public.es_teacher()
    and exists (
      select 1 from public.excepcion_slot e
       where e.slot_id = slot_horario.id
         and e.tipo = 'sustitucion'
         and e.activo
         and e.profesor_sustituto_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- 4. declarar_excepcion_slot(...) — requisito 1, administrator únicamente.
-- ---------------------------------------------------------------------

create or replace function public.declarar_excepcion_slot(
  p_slot_id               uuid,
  p_fecha                 date,
  p_tipo                  text,
  p_profesor_sustituto_id uuid default null,
  p_motivo                text default null
)
returns public.excepcion_slot
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol               text := public.rol_actual();
  v_slot               public.slot_horario%rowtype;
  v_dia_semana_fecha   smallint;
  v_existe_asistencia  boolean;
  v_fila               public.excepcion_slot;
begin
  if v_rol <> 'administrator' then
    raise exception 'declarar_excepcion_slot: solo un administrador puede declarar una excepción'
      using errcode = '42501';
  end if;

  if p_tipo not in ('sustitucion', 'cancelacion') then
    raise exception 'declarar_excepcion_slot: tipo no válido (%), debe ser "sustitucion" o "cancelacion"', p_tipo;
  end if;

  select * into v_slot from public.slot_horario where id = p_slot_id;
  if not found then
    raise exception 'declarar_excepcion_slot: el slot indicado no existe';
  end if;

  -- La fecha debe caer en el mismo día de la semana que el slot (requisito 1: "para un slot y una
  -- fecha concreta"), y el slot debe estar vigente ese día — mismo criterio que
  -- registrar_asistencia/registrar_ausencia.
  v_dia_semana_fecha := extract(isodow from p_fecha);
  if v_dia_semana_fecha <> v_slot.dia_semana then
    raise exception 'declarar_excepcion_slot: la fecha indicada no cae en el día de la semana del slot (%)', v_slot.dia_semana;
  end if;
  if v_slot.vigente_desde > p_fecha or (v_slot.vigente_hasta is not null and v_slot.vigente_hasta < p_fecha) then
    raise exception 'declarar_excepcion_slot: el slot no está vigente en la fecha indicada';
  end if;

  if p_tipo = 'sustitucion' then
    if p_profesor_sustituto_id is null then
      raise exception 'declarar_excepcion_slot: una sustitución exige el profesor sustituto';
    end if;
    if p_profesor_sustituto_id = v_slot.profesor_id then
      raise exception 'declarar_excepcion_slot: el sustituto no puede ser el propio titular del slot';
    end if;
    if not exists (select 1 from public.perfil where id = p_profesor_sustituto_id and rol = 'teacher' and activo) then
      raise exception 'declarar_excepcion_slot: el profesor sustituto no existe o no está activo';
    end if;
    if p_motivo is not null then
      raise exception 'declarar_excepcion_slot: una sustitución no admite motivo (ese campo es solo de la cancelación)';
    end if;
  else
    if p_profesor_sustituto_id is not null then
      raise exception 'declarar_excepcion_slot: una cancelación no admite profesor sustituto';
    end if;
    if p_motivo is null or btrim(p_motivo) = '' then
      raise exception 'declarar_excepcion_slot: una cancelación exige un motivo';
    end if;
  end if;

  -- Requisito 5: nunca retroactiva sobre un slot que ya tiene registros de asistencia ese día.
  select exists(
    select 1 from public.asistencia
     where slot_id = p_slot_id
       and (ocurrido_en at time zone 'Europe/Madrid')::date = p_fecha
  ) into v_existe_asistencia;
  if v_existe_asistencia then
    raise exception 'declarar_excepcion_slot: ya hay registros de asistencia de este slot ese día; no se puede declarar una excepción retroactiva';
  end if;

  insert into public.excepcion_slot (slot_id, fecha, tipo, profesor_sustituto_id, motivo)
    values (p_slot_id, p_fecha, p_tipo, p_profesor_sustituto_id, p_motivo)
  returning * into v_fila;

  return v_fila;
exception
  when unique_violation then
    raise exception 'declarar_excepcion_slot: ya hay una excepción activa para este slot y esta fecha'
      using errcode = '23505';
end;
$$;

revoke all on function public.declarar_excepcion_slot(uuid, date, text, uuid, text) from public;
grant execute on function public.declarar_excepcion_slot(uuid, date, text, uuid, text) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que registrar_asistencia): la comprobación de
-- rol del primer `if` es quien de verdad rechaza a `teacher`/`student`, no la ausencia de GRANT.


-- ---------------------------------------------------------------------
-- 5. desactivar_excepcion_slot(...) — revierte al horario normal. Mismo
--    requisito 5: nunca si ya hay registros de asistencia ese día (si
--    los hubiera, sería porque el sustituto ya dio la clase o porque el
--    día ya pasó sin dar marcha atrás en algo que sí ocurrió).
-- ---------------------------------------------------------------------

create or replace function public.desactivar_excepcion_slot(p_excepcion_id uuid)
returns public.excepcion_slot
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol               text := public.rol_actual();
  v_exc               public.excepcion_slot%rowtype;
  v_existe_asistencia boolean;
  v_fila              public.excepcion_slot;
begin
  if v_rol <> 'administrator' then
    raise exception 'desactivar_excepcion_slot: solo un administrador puede desactivar una excepción'
      using errcode = '42501';
  end if;

  select * into v_exc from public.excepcion_slot where id = p_excepcion_id;
  if not found then
    raise exception 'desactivar_excepcion_slot: la excepción indicada no existe';
  end if;
  if not v_exc.activo then
    raise exception 'desactivar_excepcion_slot: la excepción ya está desactivada';
  end if;

  select exists(
    select 1 from public.asistencia
     where slot_id = v_exc.slot_id
       and (ocurrido_en at time zone 'Europe/Madrid')::date = v_exc.fecha
  ) into v_existe_asistencia;
  if v_existe_asistencia then
    raise exception 'desactivar_excepcion_slot: ya hay registros de asistencia de este slot ese día; no se puede revertir';
  end if;

  update public.excepcion_slot set activo = false where id = p_excepcion_id
    returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.desactivar_excepcion_slot(uuid) from public;
grant execute on function public.desactivar_excepcion_slot(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 6. registrar_asistencia — SUSTITUIDA (create or replace, misma firma
--    exacta de 005_rpc_registrar_asistencia.sql, inmutable, sin tocar
--    ese fichero — mismo patrón que 006 sustituyó aplicar_limite_tasa()).
--
--    Única diferencia con la versión de 005: antes de comprobar "el slot
--    pertenece a otro profesor" (requisito 2/3 de R-06), mira si hay una
--    excepción ACTIVA para slot_id/fecha. Cancelación: rechaza a
--    CUALQUIERA (ni siquiera el titular puede registrar; requisito 3,
--    "no se crea ninguna fila de asistencia para ningún alumno del
--    slot"). Sustitución: el profesor sustituto puede registrar aunque
--    el slot no sea suyo (la fila queda con profesor_id = sustituto,
--    tal como ya hacía antes con v_profesor_id — sin cambio ahí, solo se
--    relaja QUIÉN puede ser v_profesor_id); el titular, en cambio,
--    queda excluido ese día (requisito 2: "el titular no lo ve", y aquí
--    además no puede, aunque insistiera saltándose la interfaz).
-- ---------------------------------------------------------------------

create or replace function public.registrar_asistencia(
  p_alumno_id   uuid,
  p_origen      text,
  p_peticion_id uuid,
  p_slot_id     uuid default null,
  p_ocurrido_en timestamptz default null,
  p_nota        text default null,
  p_profesor_id uuid default null
)
returns public.asistencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol                 text := public.rol_actual();
  v_profesor_id         uuid;
  v_registrado_en       timestamptz := now();
  v_ocurrido_en         timestamptz;
  v_es_retroactivo      boolean;
  v_alumno_activo       boolean;
  v_slot                public.slot_horario%rowtype;
  v_slot_dia_semana     smallint;
  v_slot_hora_ini       time;
  v_slot_hora_fin       time;
  v_slot_asignatura     text;
  v_fecha_local         date;
  v_exc_tipo            text;
  v_exc_sustituto_id    uuid;
  v_fila                public.asistencia;
begin
  -- 1. Quién llama y en nombre de quién (requisito 2 de T-18: solo administrator registra por otro).
  if p_profesor_id is not null then
    if v_rol <> 'administrator' then
      raise exception 'registrar_asistencia: solo un administrador puede registrar en nombre de otro profesor'
        using errcode = '42501';
    end if;
    if not exists (select 1 from public.perfil where id = p_profesor_id and rol = 'teacher' and activo) then
      raise exception 'registrar_asistencia: el profesor indicado no existe o no está activo';
    end if;
    v_profesor_id := p_profesor_id;
  else
    if v_rol not in ('administrator', 'teacher') then
      raise exception 'registrar_asistencia: solo administrator o teacher pueden registrar asistencia'
        using errcode = '42501';
    end if;
    v_profesor_id := auth.uid();
  end if;

  -- 2. Límite de abuso (T-06, contrato: 60 operaciones por profesor y minuto), contado sobre el
  --    profesor que REGISTRA (v_profesor_id), no sobre quien llama.
  perform public.aplicar_limite_tasa('asistencia:' || v_profesor_id::text, 60, 60);

  -- 3. Instante atribuido y marca de retroactividad. La fórmula de es_retroactivo es EXACTAMENTE
  --    la del CHECK asistencia_retroactivo_coherente (001_esquema_inicial.sql, ya aplicado e
  --    inmutable): esa restricción es la fuente de verdad, no una interpretación distinta aquí.
  if p_ocurrido_en is null then
    v_ocurrido_en := v_registrado_en;
  else
    if p_ocurrido_en > v_registrado_en then
      raise exception 'registrar_asistencia: ocurrido_en no puede estar en el futuro';
    end if;
    -- Ventana máxima hacia atrás (7 días): valor conservador de partida, pregunta abierta #12 de
    -- §6 de SEGUIMIENTO.md, igual que dominio/asistencia.ts VENTANA_RETROACTIVA_MAXIMA_DIAS.
    if v_registrado_en - p_ocurrido_en > interval '7 days' then
      raise exception 'registrar_asistencia: ocurrido_en supera la ventana permitida hacia atrás (7 días)';
    end if;
    v_ocurrido_en := p_ocurrido_en;
  end if;
  v_es_retroactivo := abs(extract(epoch from (v_ocurrido_en - v_registrado_en))) > 300;

  -- 4. Alumno existe y está activo.
  select activo into v_alumno_activo from public.alumno where id = p_alumno_id;
  if not found then
    raise exception 'registrar_asistencia: el alumno indicado no existe';
  end if;
  if not v_alumno_activo then
    raise exception 'registrar_asistencia: el alumno está dado de baja';
  end if;

  -- 5. Origen coherente y snapshot del slot — nunca del cliente, siempre leído aquí.
  if p_origen not in ('slot', 'manual') then
    raise exception 'registrar_asistencia: origen no válido (%), debe ser "slot" o "manual"', p_origen;
  end if;

  if p_origen = 'slot' then
    if p_slot_id is null then
      raise exception 'registrar_asistencia: origen "slot" exige slot_id';
    end if;
    select * into v_slot from public.slot_horario where id = p_slot_id;
    if not found then
      raise exception 'registrar_asistencia: el slot indicado no existe';
    end if;

    v_fecha_local := (v_ocurrido_en at time zone 'Europe/Madrid')::date;

    -- R-06: ¿hay una excepción activa para este slot y esta fecha?
    select tipo, profesor_sustituto_id into v_exc_tipo, v_exc_sustituto_id
      from public.excepcion_slot
     where slot_id = p_slot_id and fecha = v_fecha_local and activo;

    if v_exc_tipo = 'cancelacion' then
      raise exception 'registrar_asistencia: la clase de este slot fue cancelada ese día';
    elsif v_exc_tipo = 'sustitucion' then
      if v_profesor_id <> v_exc_sustituto_id then
        raise exception 'registrar_asistencia: este día el slot lo cubre otro profesor'
          using errcode = '42501';
      end if;
      -- v_profesor_id = sustituto: se salta la comprobación de dueño de abajo a propósito.
    elsif v_slot.profesor_id <> v_profesor_id then
      raise exception 'registrar_asistencia: el slot pertenece a otro profesor';
    end if;

    if v_slot.alumno_id <> p_alumno_id then
      raise exception 'registrar_asistencia: el slot no corresponde a este alumno';
    end if;

    if v_slot.vigente_desde > v_fecha_local
       or (v_slot.vigente_hasta is not null and v_slot.vigente_hasta < v_fecha_local) then
      raise exception 'registrar_asistencia: el slot no está vigente en la fecha del registro';
    end if;

    v_slot_dia_semana := v_slot.dia_semana;
    v_slot_hora_ini   := v_slot.hora_inicio;
    v_slot_hora_fin   := v_slot.hora_fin;
    v_slot_asignatura := v_slot.asignatura_o_grupo;
  elsif p_slot_id is not null then
    raise exception 'registrar_asistencia: origen "manual" no admite slot_id';
  end if;

  -- 6. Inserción. Un peticion_id repetido choca con asistencia_peticion_id_unico; un segundo
  --    registro del mismo alumno/slot/día choca con asistencia_uq_alumno_slot_dia_activa (o su
  --    predecesora asistencia_uq_alumno_slot_dia_valida si 010 no está aplicada) — las dos formas
  --    de duplicado llegan como 23505 → 409 → Conflicto.
  insert into public.asistencia (
    alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen,
    slot_id, slot_dia_semana, slot_hora_inicio, slot_hora_fin, slot_asignatura_o_grupo,
    nota, peticion_id
  )
  values (
    p_alumno_id, v_profesor_id, v_registrado_en, v_ocurrido_en, v_es_retroactivo, p_origen,
    p_slot_id, v_slot_dia_semana, v_slot_hora_ini, v_slot_hora_fin, v_slot_asignatura,
    p_nota, p_peticion_id
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.registrar_asistencia(uuid, text, uuid, uuid, timestamptz, text, uuid) from public;
grant execute on function public.registrar_asistencia(uuid, text, uuid, uuid, timestamptz, text, uuid) to authenticated;
