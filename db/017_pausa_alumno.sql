-- =====================================================================
-- GestorAcademia — 017_pausa_alumno.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-21 (pausa programada de un alumno, oleada v7 / F-12). Objetivo: el
-- caso simétrico a R-06 (excepción de UN slot) y R-12 (cierre de TODO el
-- centro), esta vez a nivel de UN alumno concreto durante un rango de
-- días: mientras la fecha de hoy cae dentro de una pausa vigente, ese
-- alumno no se ofrece como pendiente en pasar lista (T-19) en ninguno de
-- sus slots, y esos días quedan excluidos de "sesiones esperadas" en el
-- informe mensual (R-04) y del ranking de ausencias del panel de centro
-- (R-11) — sin generar ninguna fila de asistencia ni de ausencia por
-- omisión, mismo principio que una cancelación de slot.
--
-- Tres piezas, mismo patrón exacto que `013_excepcion_slot.sql`:
--   1. `pausa_alumno` — tabla nueva, RLS y políticas en el mismo fichero
--      (no existe ningún "próximo lote de políticas" al que aplazarlas,
--      igual que `013`/`014`). Sin GRANT de INSERT/UPDATE a
--      `authenticated`: toda escritura pasa por las tres RPC de la pieza
--      2, `SECURITY DEFINER` — el requisito 4 ("nunca sobre un rango que
--      se solape con un registro de asistencia ya existente") protege la
--      misma invariante de "no reescribir historia" que ya exige RPC
--      para `excepcion_slot`, así que se comprueba de forma atómica en
--      el servidor, no con un read-then-write en el cliente.
--   2. `declarar_pausa_alumno(...)` / `cancelar_pausa_alumno(...)` /
--      `acortar_pausa_alumno(...)` — únicas vías de escritura,
--      `administrator` únicamente (requisito 6). Una pausa nunca se
--      borra (requisito 5, "jamás un DELETE real"): cancelarla la deja
--      `anulada` con motivo, y acortarla solo mueve `fecha_fin` a una
--      fecha futura.
--
-- El motivo (requisito 1 y 7) es SIEMPRE texto libre opcional, nunca una
-- lista cerrada de motivos ni ninguna opción que categorice salud —
-- lección explícita del hallazgo #8/pregunta #16 de §6 sobre R-02 (dato
-- del artículo 9 del RGPD sin decisión del dueño), citada así en la
-- propia spec de R-21 para no repetir el mismo problema con una tabla
-- nueva.
--
-- Ninguna otra migración se sustituye aquí: a diferencia de R-06, R-21
-- no cambia el comportamiento de `registrar_asistencia`/
-- `registrar_ausencia` (requisito 2: la pausa hace que el alumno no se
-- OFREZCA como pendiente — una decisión del motor de propuesta en el
-- cliente, `dominio/pausaAlumno.ts` — no que el servidor rechace un alta
-- manual sobre él; un `administrator`/`teacher` que insistiera fuera de
-- la interfaz seguiría pudiendo registrar, igual que ya podía hacerlo un
-- profesor sobre un slot ajeno vía T-20 antes de que existiera R-06). Es
-- una decisión razonada, no una omisión: ver `DECISIONES_TECNICAS.md`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'alumno') then
    raise exception 'pausa_alumno: falta la tabla alumno. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'pausa_alumno: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'tocar_actualizado_en') then
    raise exception 'pausa_alumno: falta la función tocar_actualizado_en(). ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'pausa_alumno: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'pausa_alumno: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'pausa_alumno: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. pausa_alumno — un periodo declarado en el que un alumno concreto no
--    da clase (requisito 1). `fecha_inicio`/`fecha_fin`, ambas inclusive.
-- ---------------------------------------------------------------------

create table public.pausa_alumno (
  id               uuid        primary key default gen_random_uuid(),
  alumno_id        uuid        not null references public.alumno (id),
  fecha_inicio     date        not null,
  fecha_fin        date        not null,
  motivo           text,
  estado           text        not null default 'activa',
  motivo_anulacion text,
  creado_por       uuid        references public.perfil (id),
  anulado_por      uuid        references public.perfil (id),
  anulado_en       timestamptz,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  constraint pausa_alumno_estado_valido check (estado in ('activa', 'anulada')),
  constraint pausa_alumno_rango_valido check (fecha_fin >= fecha_inicio),
  -- Requisito 1/7: motivo SIEMPRE opcional y libre; si se da, no puede ser solo espacios.
  constraint pausa_alumno_motivo_no_vacio check (motivo is null or btrim(motivo) <> ''),
  -- Requisito 5: anulada exige su motivo y quién/cuándo, a la vez y solo entonces (nunca a medias).
  constraint pausa_alumno_anulacion_coherente check (
    (estado = 'anulada' and motivo_anulacion is not null and btrim(motivo_anulacion) <> '' and anulado_por is not null and anulado_en is not null)
    or
    (estado = 'activa' and motivo_anulacion is null and anulado_por is null and anulado_en is null)
  )
);

comment on table public.pausa_alumno is
  'Periodo declarado (R-21) en el que un alumno concreto no da clase: no se ofrece como pendiente '
  'en pasar lista (T-19) ni cuenta como sesión esperada en el informe mensual (R-04) ni en el '
  'ranking de ausencias del panel de centro (R-11). Escritura exclusivamente por '
  'declarar_pausa_alumno()/cancelar_pausa_alumno()/acortar_pausa_alumno() (SECURITY DEFINER, más '
  'abajo): sin GRANT de INSERT/UPDATE a authenticated. Baja lógica (estado), nunca DELETE.';
comment on column public.pausa_alumno.fecha_inicio is 'Inclusive.';
comment on column public.pausa_alumno.fecha_fin is 'Inclusive; puede coincidir con fecha_inicio (un solo día).';
comment on column public.pausa_alumno.motivo is
  'SIEMPRE texto libre opcional, nunca una lista cerrada ni ninguna opción que categorice salud '
  '(requisito 7 de R-21, lección del hallazgo #8/pregunta #16 de §6 sobre R-02).';
comment on column public.pausa_alumno.estado is
  '''activa'' mientras rige; ''anulada'' tras cancelar_pausa_alumno() (solo posible antes de '
  'empezar, requisito 5). Una pausa en curso se acorta (acortar_pausa_alumno, cambia fecha_fin), '
  'nunca se anula.';

create index pausa_alumno_alumno_id_idx on public.pausa_alumno (alumno_id);
-- Acelera "¿hay una pausa ACTIVA de este alumno que cubra la fecha X?" — la comprobación que hace
-- el motor de propuesta (T-19) en cada carga y las dos RPC de solape más abajo.
create index pausa_alumno_activa_rango_idx
  on public.pausa_alumno (alumno_id, fecha_inicio, fecha_fin)
  where estado = 'activa';

drop trigger if exists pausa_alumno_tocar_actualizado_en on public.pausa_alumno;
create trigger pausa_alumno_tocar_actualizado_en
  before update on public.pausa_alumno
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 2. Privilegios y políticas RLS (requisito 6): administrator gestiona
--    (lee todas, declara, cancela, acorta); teacher solo LEE las pausas
--    ACTIVAS de los alumnos que tiene en sus propios slots (para no
--    interpretar el hueco como un alumno que ha dejado de existir,
--    requisito 6); sin ninguna política para student (§0.2).
-- ---------------------------------------------------------------------

alter table public.pausa_alumno enable row level security;
revoke all on public.pausa_alumno from anon, authenticated, service_role;
grant select, insert, update, delete on public.pausa_alumno to service_role;
grant select on public.pausa_alumno to authenticated;

create policy pausa_alumno_admin_leer_todas on public.pausa_alumno
  for select to authenticated
  using (public.es_administrator());

create policy pausa_alumno_teacher_leer_de_sus_alumnos on public.pausa_alumno
  for select to authenticated
  using (
    public.es_teacher()
    and estado = 'activa'
    and exists (
      select 1 from public.slot_horario s
       where s.alumno_id = pausa_alumno.alumno_id
         and s.profesor_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- 3. declarar_pausa_alumno(...) — requisito 1, administrator únicamente.
--    Requisito 4: rechazada si el alumno ya tiene algún registro de
--    asistencia (entrada o ausencia, cualquier estado) dentro del rango.
-- ---------------------------------------------------------------------

create or replace function public.declarar_pausa_alumno(
  p_alumno_id    uuid,
  p_fecha_inicio date,
  p_fecha_fin    date,
  p_motivo       text default null
)
returns public.pausa_alumno
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol               text := public.rol_actual();
  v_existe_asistencia boolean;
  v_existe_solape     boolean;
  v_fila              public.pausa_alumno;
begin
  if v_rol <> 'administrator' then
    raise exception 'declarar_pausa_alumno: solo un administrador puede declarar una pausa'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.alumno where id = p_alumno_id) then
    raise exception 'declarar_pausa_alumno: el alumno indicado no existe';
  end if;

  if p_fecha_fin < p_fecha_inicio then
    raise exception 'declarar_pausa_alumno: la fecha de fin no puede ser anterior a la fecha de inicio';
  end if;

  if p_motivo is not null and btrim(p_motivo) = '' then
    raise exception 'declarar_pausa_alumno: el motivo no puede ser solo espacios en blanco';
  end if;

  -- Requisito 4: no retroactiva sobre ningún registro de asistencia ya existente del alumno
  -- (entrada o ausencia, cualquier estado) dentro del rango declarado.
  select exists(
    select 1 from public.asistencia
     where alumno_id = p_alumno_id
       and (ocurrido_en at time zone 'Europe/Madrid')::date between p_fecha_inicio and p_fecha_fin
  ) into v_existe_asistencia;
  if v_existe_asistencia then
    raise exception 'declarar_pausa_alumno: el alumno ya tiene algún registro de asistencia en ese rango de fechas; anúlalo primero si de verdad quieres cubrir esas fechas con una pausa';
  end if;

  -- Dos pausas ACTIVAS del mismo alumno nunca se solapan en fecha.
  select exists(
    select 1 from public.pausa_alumno
     where alumno_id = p_alumno_id
       and estado = 'activa'
       and fecha_inicio <= p_fecha_fin
       and p_fecha_inicio <= fecha_fin
  ) into v_existe_solape;
  if v_existe_solape then
    raise exception 'declarar_pausa_alumno: ya hay una pausa activa de este alumno que se solapa con ese rango de fechas';
  end if;

  insert into public.pausa_alumno (alumno_id, fecha_inicio, fecha_fin, motivo, creado_por)
    values (p_alumno_id, p_fecha_inicio, p_fecha_fin, p_motivo, auth.uid())
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.declarar_pausa_alumno(uuid, date, date, text) from public;
grant execute on function public.declarar_pausa_alumno(uuid, date, date, text) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que declarar_excepcion_slot): la comprobación
-- de rol del primer `if` es quien de verdad rechaza a `teacher`/`student`, no la ausencia de GRANT.


-- ---------------------------------------------------------------------
-- 4. cancelar_pausa_alumno(...) — requisito 5: solo sobre una pausa que
--    todavía no ha empezado. Queda anulada, con motivo, nunca borrada.
-- ---------------------------------------------------------------------

create or replace function public.cancelar_pausa_alumno(
  p_pausa_id uuid,
  p_motivo   text
)
returns public.pausa_alumno
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol   text := public.rol_actual();
  v_pausa public.pausa_alumno%rowtype;
  v_hoy   date := (now() at time zone 'Europe/Madrid')::date;
  v_fila  public.pausa_alumno;
begin
  if v_rol <> 'administrator' then
    raise exception 'cancelar_pausa_alumno: solo un administrador puede cancelar una pausa'
      using errcode = '42501';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'cancelar_pausa_alumno: cancelar una pausa exige un motivo';
  end if;

  select * into v_pausa from public.pausa_alumno where id = p_pausa_id;
  if not found then
    raise exception 'cancelar_pausa_alumno: la pausa indicada no existe';
  end if;
  if v_pausa.estado <> 'activa' then
    raise exception 'cancelar_pausa_alumno: la pausa ya está anulada';
  end if;
  if v_pausa.fecha_inicio <= v_hoy then
    raise exception 'cancelar_pausa_alumno: la pausa ya ha empezado; usa acortar_pausa_alumno para adelantar su fin';
  end if;

  update public.pausa_alumno
     set estado = 'anulada', motivo_anulacion = p_motivo, anulado_por = auth.uid(), anulado_en = now()
   where id = p_pausa_id
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.cancelar_pausa_alumno(uuid, text) from public;
grant execute on function public.cancelar_pausa_alumno(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. acortar_pausa_alumno(...) — requisito 5: solo sobre una pausa EN
--    CURSO, adelantando fecha_fin a una fecha futura (nunca pasada, y
--    nunca posterior a la fecha_fin actual — eso sería alargarla, no
--    acortarla).
-- ---------------------------------------------------------------------

create or replace function public.acortar_pausa_alumno(
  p_pausa_id        uuid,
  p_nueva_fecha_fin date
)
returns public.pausa_alumno
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol   text := public.rol_actual();
  v_pausa public.pausa_alumno%rowtype;
  v_hoy   date := (now() at time zone 'Europe/Madrid')::date;
  v_fila  public.pausa_alumno;
begin
  if v_rol <> 'administrator' then
    raise exception 'acortar_pausa_alumno: solo un administrador puede acortar una pausa'
      using errcode = '42501';
  end if;

  select * into v_pausa from public.pausa_alumno where id = p_pausa_id;
  if not found then
    raise exception 'acortar_pausa_alumno: la pausa indicada no existe';
  end if;
  if v_pausa.estado <> 'activa' then
    raise exception 'acortar_pausa_alumno: la pausa está anulada';
  end if;
  if v_pausa.fecha_inicio > v_hoy or v_pausa.fecha_fin < v_hoy then
    raise exception 'acortar_pausa_alumno: solo se puede acortar una pausa que esté en curso hoy';
  end if;
  if p_nueva_fecha_fin < v_hoy then
    raise exception 'acortar_pausa_alumno: la nueva fecha de fin no puede ser anterior a hoy';
  end if;
  if p_nueva_fecha_fin >= v_pausa.fecha_fin then
    raise exception 'acortar_pausa_alumno: la nueva fecha de fin debe ser anterior a la fecha de fin actual';
  end if;

  update public.pausa_alumno set fecha_fin = p_nueva_fecha_fin where id = p_pausa_id
    returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.acortar_pausa_alumno(uuid, date) from public;
grant execute on function public.acortar_pausa_alumno(uuid, date) to authenticated;
