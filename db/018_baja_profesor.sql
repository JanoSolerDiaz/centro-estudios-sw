-- =====================================================================
-- GestorAcademia — 018_baja_profesor.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-22 (baja programada de un profesor: excepción en bloque para varios
-- días, oleada v8 / F-13). Objetivo: la cuarta combinación de la matriz
-- de excepciones — R-06 (`013_excepcion_slot.sql`, un slot y un día),
-- R-12 (`014_calendario_cierres.sql`, todo el centro y un rango) y R-21
-- (`017_pausa_alumno.sql`, un alumno y un rango) —, esta vez TODOS los
-- slots de UN profesor durante un rango de días: declarar de una vez que
-- un profesor va a faltar una semana entera, en vez de crear la misma
-- excepción de R-06 slot a slot, día a día.
--
-- Tres piezas:
--   1. `baja_profesor` — tabla nueva, RLS y políticas en el mismo fichero
--      (mismo criterio que `013`/`014`/`017`: no existe ningún "próximo
--      lote de políticas" al que aplazarlas). Solo lectura de
--      `administrator` — a diferencia de `excepcion_slot`/`pausa_alumno`,
--      un `teacher` no necesita leer la baja EN SÍ: ve su EFECTO (las
--      filas de `excepcion_slot` que generó) en «Mi horario» (T-22) y en
--      pasar lista (T-19) exactamente igual que ya ve cualquier otra
--      excepción de R-06, sin ningún cambio en esas pantallas (requisito
--      7 de R-22). Sin GRANT de INSERT/UPDATE a `authenticated`: toda
--      escritura pasa por las tres RPC de la pieza 3.
--   2. `excepcion_slot` (`013`, ya empujada pero TODAVÍA NO APLICADA en
--      ningún entorno — R-06 sigue `BLOQUEADA` en §1 de SEGUIMIENTO.md
--      esperando esa migración) gana la columna `baja_profesor_id`,
--      añadida aquí por `ALTER TABLE` en vez de editar `013` directamente:
--      a diferencia del precedente de `013` editando `010`
--      (`registrar_ausencia`, misma migración, mismo commit), aquí la
--      columna nueva referencia una tabla (`baja_profesor`) que no existe
--      todavía cuando `013` se aplicaría — el orden numérico de aplicación
--      lo exige, con independencia de que ninguna de las dos esté aplicada
--      todavía. Es la vía normal de una migración incremental, no una
--      excepción a la regla de inmutabilidad.
--   3. `declarar_baja_profesor(...)` / `cancelar_baja_profesor(...)` /
--      `acortar_baja_profesor(...)` — únicas vías de escritura,
--      `administrator` únicamente (requisito 8). `declarar_baja_profesor`
--      es la orquestación del requisito 2: calcula qué combinaciones
--      (slot, fecha) del profesor caen en el rango — un slot solo cuenta
--      los días que coinciden con su propio día de la semana, y solo
--      mientras esté vigente ese día — y por cada una que NO tenga ya un
--      registro de asistencia ni una excepción activa (requisito 3) llama
--      A LA MISMA `declarar_excepcion_slot` de R-06 (`013`, sin tocarla,
--      sin ningún parámetro nuevo: "ninguna RPC nueva de escritura de
--      excepción", requisito 2 literal) y marca la fila resultante con
--      `baja_profesor_id` para poder agruparla (requisito 4). Devuelve una
--      fila por combinación evaluada (creada o excluida, con motivo), para
--      que la pantalla informe el resultado exacto — mismo espíritu que la
--      vista previa de la importación masiva (R-08), aplicado aquí también
--      a la confirmación: no hace falta una segunda RPC de solo lectura
--      porque esta ya es atómica y ya informa qué excluyó.
--      `cancelar_baja_profesor`/`acortar_baja_profesor` (requisito 5)
--      además desactivan en bloque, con una única sentencia `UPDATE`
--      directa (no una llamada a `desactivar_excepcion_slot` por fila),
--      las excepciones futuras que la baja generó: es seguro porque
--      `registrar_asistencia` nunca acepta una fecha futura (§0.2, "no
--      reescribir historia" — ver `DECISIONES_TECNICAS.md`), así que
--      ninguna de esas filas puede tener ya un registro de asistencia real
--      que `desactivar_excepcion_slot` protegería.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'perfil') then
    raise exception 'baja_profesor: falta la tabla perfil. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'slot_horario') then
    raise exception 'baja_profesor: falta la tabla slot_horario. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'baja_profesor: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'excepcion_slot') then
    raise exception 'baja_profesor: falta la tabla excepcion_slot. ¿Se aplicó 013_excepcion_slot.sql?';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'declarar_excepcion_slot'
  ) then
    raise exception 'baja_profesor: falta la función declarar_excepcion_slot(). ¿Se aplicó 013_excepcion_slot.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'tocar_actualizado_en') then
    raise exception 'baja_profesor: falta la función tocar_actualizado_en(). ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'baja_profesor: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'baja_profesor: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. baja_profesor — el rango declarado y el tratamiento por defecto de
--    todos los slots del profesor durante ese rango (requisito 1). Mismas
--    dos restricciones de coherencia tipo/sustituto/motivo que
--    `excepcion_slot` (`013`, sección 1) — deliberadamente sin repetir la
--    de "el sustituto no puede ser el titular", que en `excepcion_slot`
--    tampoco es un CHECK de tabla: es la RPC quien la exige (sección 3),
--    igual que allí.
-- ---------------------------------------------------------------------

create table public.baja_profesor (
  id                    uuid        primary key default gen_random_uuid(),
  profesor_id           uuid        not null references public.perfil (id),
  fecha_inicio          date        not null,
  fecha_fin             date        not null,
  tipo                  text        not null,
  profesor_sustituto_id uuid        references public.perfil (id),
  motivo                text,
  estado                text        not null default 'activa',
  motivo_anulacion      text,
  creado_por            uuid        references public.perfil (id),
  anulado_por           uuid        references public.perfil (id),
  anulado_en            timestamptz,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint baja_profesor_tipo_valido check (tipo in ('sustitucion', 'cancelacion')),
  constraint baja_profesor_estado_valido check (estado in ('activa', 'anulada')),
  constraint baja_profesor_rango_valido check (fecha_fin >= fecha_inicio),
  -- Mismas dos reglas exactas que excepcion_slot_sustitucion_coherente / excepcion_slot_cancelacion_motivo_obligatorio (013).
  constraint baja_profesor_sustitucion_coherente check (
    (tipo = 'sustitucion' and profesor_sustituto_id is not null)
    or
    (tipo = 'cancelacion' and profesor_sustituto_id is null)
  ),
  constraint baja_profesor_cancelacion_motivo_obligatorio check (
    tipo <> 'cancelacion' or (motivo is not null and btrim(motivo) <> '')
  ),
  -- Misma forma exacta que pausa_alumno_anulacion_coherente (017): anulada exige motivo y quién/cuándo, a la vez y solo entonces.
  constraint baja_profesor_anulacion_coherente check (
    (estado = 'anulada' and motivo_anulacion is not null and btrim(motivo_anulacion) <> '' and anulado_por is not null and anulado_en is not null)
    or
    (estado = 'activa' and motivo_anulacion is null and anulado_por is null and anulado_en is null)
  )
);

comment on table public.baja_profesor is
  'Baja programada de un profesor durante un rango de días (R-22): al declararla,'
  ' declarar_baja_profesor() genera una excepcion_slot (R-06, reutilizando declarar_excepcion_slot '
  'tal cual) por cada combinación (slot, fecha) del profesor que caiga en el rango y no tenga ya '
  'asistencia ni otra excepción activa ese día. Escritura exclusivamente por '
  'declarar_baja_profesor()/cancelar_baja_profesor()/acortar_baja_profesor() (SECURITY DEFINER, más '
  'abajo): sin GRANT de INSERT/UPDATE a authenticated. Baja lógica (estado), nunca DELETE.';
comment on column public.baja_profesor.fecha_inicio is 'Inclusive.';
comment on column public.baja_profesor.fecha_fin is 'Inclusive; puede coincidir con fecha_inicio (un solo día).';
comment on column public.baja_profesor.tipo is
  'Tratamiento POR DEFECTO de cada combinación (slot, fecha) que esta baja genera — un día concreto '
  'puede editarse después con un tratamiento distinto (requisito 6 de R-22) sin que eso cambie esta '
  'columna: la excepción de slot editada sigue apuntando a esta baja por baja_profesor_id.';

create index baja_profesor_profesor_id_idx on public.baja_profesor (profesor_id);
create index baja_profesor_activa_rango_idx
  on public.baja_profesor (profesor_id, fecha_inicio, fecha_fin)
  where estado = 'activa';

drop trigger if exists baja_profesor_tocar_actualizado_en on public.baja_profesor;
create trigger baja_profesor_tocar_actualizado_en
  before update on public.baja_profesor
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 2. Privilegios y políticas RLS (requisito 8): exclusivamente
--    administrator, ni siquiera en lectura — un teacher ve el EFECTO de
--    la baja (sus excepciones de slot) por las políticas que
--    excepcion_slot ya tiene desde 013, nunca esta tabla. Sin ninguna
--    política para student (§0.2).
-- ---------------------------------------------------------------------

alter table public.baja_profesor enable row level security;
revoke all on public.baja_profesor from anon, authenticated, service_role;
grant select, insert, update, delete on public.baja_profesor to service_role;
grant select on public.baja_profesor to authenticated;

create policy baja_profesor_admin_leer_todas on public.baja_profesor
  for select to authenticated
  using (public.es_administrator());


-- ---------------------------------------------------------------------
-- 3. excepcion_slot (013, empujada pero todavía no aplicada) gana la
--    columna de agrupación (requisito 4). ALTER, no edición de 013: ver
--    la cabecera de este fichero. Cubierta por el mismo GRANT SELECT sin
--    lista de columnas que 013 ya concede a authenticated — no hace
--    falta volver a conceder nada.
-- ---------------------------------------------------------------------

alter table public.excepcion_slot
  add column baja_profesor_id uuid references public.baja_profesor (id);

comment on column public.excepcion_slot.baja_profesor_id is
  '¿Esta excepción la generó una baja programada de profesor (R-22)? null si se declaró suelta '
  '(R-06). Sigue apuntando a la misma baja aunque el día se edite después con un tratamiento '
  'distinto (requisito 6 de R-22) — es lo que permite listar y cancelar juntas las excepciones de '
  'una misma baja (requisito 4), con independencia de ediciones posteriores.';

create index excepcion_slot_baja_profesor_id_idx
  on public.excepcion_slot (baja_profesor_id)
  where baja_profesor_id is not null;


-- ---------------------------------------------------------------------
-- 4. declarar_baja_profesor(...) — requisitos 1, 2 y 3. Devuelve una fila
--    por cada combinación (slot, fecha) evaluada: creada (con su
--    excepcion_id) o excluida (con el motivo). Si el profesor no tiene
--    ningún slot que caiga en el rango, devuelve una única fila
--    "centinela" con solo baja_profesor_id informado, para que quien
--    llama sepa igualmente el id de la baja recién creada.
--
--    Los nombres de columna de RETURNS TABLE llevan el prefijo `out_`
--    a propósito: sin él coincidirían con columnas reales de
--    excepcion_slot/asistencia (slot_id, fecha) que este cuerpo consulta,
--    y con `plpgsql.variable_conflict` en su valor por defecto ('error')
--    cualquier referencia sin cualificar a esas columnas dentro de una
--    consulta lanzaría "column reference is ambiguous" en vez de
--    resolverse contra la tabla. Prefijar evita el conflicto en vez de
--    cualificar cada aparición (más frágil: bastaría una nueva consulta
--    sin alias para reintroducir el bug).
-- ---------------------------------------------------------------------

create or replace function public.declarar_baja_profesor(
  p_profesor_id           uuid,
  p_fecha_inicio          date,
  p_fecha_fin             date,
  p_tipo                  text,
  p_profesor_sustituto_id uuid default null,
  p_motivo                text default null
)
returns table (
  out_baja_profesor_id uuid,
  out_slot_id          uuid,
  out_fecha            date,
  out_excepcion_id     uuid,
  out_excluido         boolean,
  out_motivo_exclusion text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol               text := public.rol_actual();
  v_baja              public.baja_profesor;
  v_fecha             date;
  v_dia_semana        smallint;
  v_slot              public.slot_horario%rowtype;
  v_existe_asistencia boolean;
  v_existe_excepcion  boolean;
  v_excepcion         public.excepcion_slot;
  v_alguna            boolean := false;
begin
  if v_rol <> 'administrator' then
    raise exception 'declarar_baja_profesor: solo un administrador puede declarar una baja'
      using errcode = '42501';
  end if;

  if p_tipo not in ('sustitucion', 'cancelacion') then
    raise exception 'declarar_baja_profesor: tipo no válido (%), debe ser "sustitucion" o "cancelacion"', p_tipo;
  end if;

  if not exists (select 1 from public.perfil where id = p_profesor_id and rol = 'teacher') then
    raise exception 'declarar_baja_profesor: el profesor indicado no existe';
  end if;

  if p_fecha_fin < p_fecha_inicio then
    raise exception 'declarar_baja_profesor: la fecha de fin no puede ser anterior a la fecha de inicio';
  end if;

  if p_tipo = 'sustitucion' then
    if p_profesor_sustituto_id is null then
      raise exception 'declarar_baja_profesor: una sustitución exige el profesor sustituto';
    end if;
    if p_profesor_sustituto_id = p_profesor_id then
      raise exception 'declarar_baja_profesor: el sustituto no puede ser el propio titular';
    end if;
    if not exists (select 1 from public.perfil where id = p_profesor_sustituto_id and rol = 'teacher' and activo) then
      raise exception 'declarar_baja_profesor: el profesor sustituto no existe o no está activo';
    end if;
    if p_motivo is not null then
      raise exception 'declarar_baja_profesor: una sustitución no admite motivo (ese campo es solo de la cancelación)';
    end if;
  else
    if p_profesor_sustituto_id is not null then
      raise exception 'declarar_baja_profesor: una cancelación no admite profesor sustituto';
    end if;
    if p_motivo is null or btrim(p_motivo) = '' then
      raise exception 'declarar_baja_profesor: una cancelación exige un motivo';
    end if;
  end if;

  insert into public.baja_profesor (profesor_id, fecha_inicio, fecha_fin, tipo, profesor_sustituto_id, motivo, creado_por)
    values (p_profesor_id, p_fecha_inicio, p_fecha_fin, p_tipo, p_profesor_sustituto_id, p_motivo, auth.uid())
  returning * into v_baja;

  for v_fecha in select generate_series(p_fecha_inicio, p_fecha_fin, interval '1 day')::date loop
    v_dia_semana := extract(isodow from v_fecha)::smallint;

    for v_slot in
      select s.* from public.slot_horario s
       where s.profesor_id = p_profesor_id
         and s.dia_semana = v_dia_semana
         and s.vigente_desde <= v_fecha
         and (s.vigente_hasta is null or s.vigente_hasta >= v_fecha)
    loop
      v_alguna := true;

      select exists(
        select 1 from public.asistencia a
         where a.slot_id = v_slot.id
           and (a.ocurrido_en at time zone 'Europe/Madrid')::date = v_fecha
      ) into v_existe_asistencia;

      if v_existe_asistencia then
        out_baja_profesor_id := v_baja.id;
        out_slot_id := v_slot.id;
        out_fecha := v_fecha;
        out_excepcion_id := null;
        out_excluido := true;
        out_motivo_exclusion := 'Ya hay registros de asistencia de este slot ese día.';
        return next;
        continue;
      end if;

      select exists(
        select 1 from public.excepcion_slot e
         where e.slot_id = v_slot.id and e.fecha = v_fecha and e.activo
      ) into v_existe_excepcion;

      if v_existe_excepcion then
        out_baja_profesor_id := v_baja.id;
        out_slot_id := v_slot.id;
        out_fecha := v_fecha;
        out_excepcion_id := null;
        out_excluido := true;
        out_motivo_exclusion := 'Ya hay una excepción declarada para este slot y esta fecha.';
        return next;
        continue;
      end if;

      -- Requisito 2, literal: "misma RPC" — ninguna lógica de creación se duplica aquí.
      select * into v_excepcion from public.declarar_excepcion_slot(
        p_slot_id => v_slot.id, p_fecha => v_fecha, p_tipo => p_tipo,
        p_profesor_sustituto_id => p_profesor_sustituto_id, p_motivo => p_motivo
      );
      update public.excepcion_slot set baja_profesor_id = v_baja.id where id = v_excepcion.id;

      out_baja_profesor_id := v_baja.id;
      out_slot_id := v_slot.id;
      out_fecha := v_fecha;
      out_excepcion_id := v_excepcion.id;
      out_excluido := false;
      out_motivo_exclusion := null;
      return next;
    end loop;
  end loop;

  if not v_alguna then
    out_baja_profesor_id := v_baja.id;
    out_slot_id := null;
    out_fecha := null;
    out_excepcion_id := null;
    out_excluido := null;
    out_motivo_exclusion := null;
    return next;
  end if;

  return;
end;
$$;

revoke all on function public.declarar_baja_profesor(uuid, date, date, text, uuid, text) from public;
grant execute on function public.declarar_baja_profesor(uuid, date, date, text, uuid, text) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que declarar_excepcion_slot/declarar_pausa_alumno):
-- la comprobación de rol del primer `if` es quien de verdad rechaza a `teacher`/`student`.


-- ---------------------------------------------------------------------
-- 5. cancelar_baja_profesor(...) — requisito 5, primera mitad: solo sobre
--    una baja que todavía no ha empezado. Queda anulada, con motivo, y
--    desactiva en bloque TODAS las excepciones que generó (todas son
--    futuras por construcción: la baja no ha empezado, así que ningún
--    día del rango puede ser hoy ni el pasado).
-- ---------------------------------------------------------------------

create or replace function public.cancelar_baja_profesor(
  p_baja_id uuid,
  p_motivo  text
)
returns public.baja_profesor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol  text := public.rol_actual();
  v_baja public.baja_profesor%rowtype;
  v_hoy  date := (now() at time zone 'Europe/Madrid')::date;
  v_fila public.baja_profesor;
begin
  if v_rol <> 'administrator' then
    raise exception 'cancelar_baja_profesor: solo un administrador puede cancelar una baja'
      using errcode = '42501';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'cancelar_baja_profesor: cancelar una baja exige un motivo';
  end if;

  select * into v_baja from public.baja_profesor where id = p_baja_id;
  if not found then
    raise exception 'cancelar_baja_profesor: la baja indicada no existe';
  end if;
  if v_baja.estado <> 'activa' then
    raise exception 'cancelar_baja_profesor: la baja ya está anulada';
  end if;
  if v_baja.fecha_inicio <= v_hoy then
    raise exception 'cancelar_baja_profesor: la baja ya ha empezado; usa acortar_baja_profesor para adelantar su fin';
  end if;

  update public.baja_profesor
     set estado = 'anulada', motivo_anulacion = p_motivo, anulado_por = auth.uid(), anulado_en = now()
   where id = p_baja_id
  returning * into v_fila;

  update public.excepcion_slot set activo = false where baja_profesor_id = p_baja_id and activo;

  return v_fila;
end;
$$;

revoke all on function public.cancelar_baja_profesor(uuid, text) from public;
grant execute on function public.cancelar_baja_profesor(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. acortar_baja_profesor(...) — requisito 5, segunda mitad: solo sobre
--    una baja EN CURSO, adelantando fecha_fin a una fecha futura (nunca
--    pasada, nunca posterior a la fecha_fin actual). Desactiva solo las
--    excepciones de los días que quedan fuera del nuevo rango — todas
--    posteriores a `p_nueva_fecha_fin`, que nunca es anterior a hoy, así
--    que todas son futuras.
-- ---------------------------------------------------------------------

create or replace function public.acortar_baja_profesor(
  p_baja_id         uuid,
  p_nueva_fecha_fin date
)
returns public.baja_profesor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol  text := public.rol_actual();
  v_baja public.baja_profesor%rowtype;
  v_hoy  date := (now() at time zone 'Europe/Madrid')::date;
  v_fila public.baja_profesor;
begin
  if v_rol <> 'administrator' then
    raise exception 'acortar_baja_profesor: solo un administrador puede acortar una baja'
      using errcode = '42501';
  end if;

  select * into v_baja from public.baja_profesor where id = p_baja_id;
  if not found then
    raise exception 'acortar_baja_profesor: la baja indicada no existe';
  end if;
  if v_baja.estado <> 'activa' then
    raise exception 'acortar_baja_profesor: la baja está anulada';
  end if;
  if v_baja.fecha_inicio > v_hoy or v_baja.fecha_fin < v_hoy then
    raise exception 'acortar_baja_profesor: solo se puede acortar una baja que esté en curso hoy';
  end if;
  if p_nueva_fecha_fin < v_hoy then
    raise exception 'acortar_baja_profesor: la nueva fecha de fin no puede ser anterior a hoy';
  end if;
  if p_nueva_fecha_fin >= v_baja.fecha_fin then
    raise exception 'acortar_baja_profesor: la nueva fecha de fin debe ser anterior a la fecha de fin actual';
  end if;

  update public.baja_profesor set fecha_fin = p_nueva_fecha_fin where id = p_baja_id
    returning * into v_fila;

  update public.excepcion_slot
     set activo = false
   where baja_profesor_id = p_baja_id and activo and fecha > p_nueva_fecha_fin;

  return v_fila;
end;
$$;

revoke all on function public.acortar_baja_profesor(uuid, date) from public;
grant execute on function public.acortar_baja_profesor(uuid, date) to authenticated;
