-- =====================================================================
-- GestorAcademia — 019_aviso_ausencia_profesor.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-29 (el profesor avisa de que falta un día, sin salir de la
-- aplicación, oleada v13 / F-20). Objetivo: hoy el único camino para que
-- un profesor avise de que no podrá dar una clase es fuera de la
-- aplicación (teléfono, WhatsApp), sin dejar ningún rastro ni ninguna
-- cola de "profesores que ya han avisado, pendientes de resolver". Esta
-- tarea NO sustituye a R-06 (`excepcion_slot`): el administrador sigue
-- siendo quien declara la sustitución o cancelación real, con todas sus
-- reglas de negocio; esto es solo el paso previo de comunicación,
-- puramente informativo (requisito 4, "un aviso no crea, modifica ni
-- cancela ningún slot_horario ni excepcion_slot por sí mismo").
--
-- Dos piezas:
--   1. `aviso_ausencia_profesor` — tabla nueva, RLS y políticas en el
--      mismo fichero (mismo criterio que `013_excepcion_slot.sql`/
--      `017_pausa_alumno.sql`: no existe ningún "próximo lote de
--      políticas" al que aplazarlas). Sin GRANT de INSERT/UPDATE a
--      `authenticated`: toda escritura pasa por las dos RPC de la pieza
--      2, `SECURITY DEFINER` — ni `profesor_id` ni `registrado_en` los
--      fija nunca el cliente (mismo patrón que el resto de RPC del
--      proyecto).
--   2. `avisar_ausencia_profesor(...)` (alta, `teacher` únicamente,
--      sobre su propio slot) / `marcar_aviso_ausencia_atendido(...)`
--      (`administrator` únicamente) — únicas vías de escritura.
--
-- Sobre "slot o slots afectados" (requisito 1): `slot_horario` es por
-- alumno (T-15), así que "una sesión" con varios alumnos son varias filas
-- que comparten profesor/día/hora/asignatura — exactamente el criterio de
-- `slotsDeLaMismaSesion` (T-15/R-17). El profesor pulsa "Avisar" desde
-- CUALQUIER fila de esa sesión en «Mi horario» (una fila por alumno, igual
-- que "Ver registros"/"Pasar lista" ya son por fila); la RPC recibe ese
-- `slot_id` representativo y denormaliza de él `hora_inicio`/`hora_fin`/
-- `asignatura_o_grupo` (mismo patrón de denormalización que ya usa
-- `asistencia.slot_dia_semana`/`slot_hora_inicio`/etc. desde
-- `001_esquema_inicial.sql`) — así una única fila de esta tabla representa
-- LA SESIÓN completa, no un alumno concreto, y el requisito 5 ("no puede
-- avisar dos veces de la misma sesión mientras la primera siga
-- pendiente") se aplica sobre esa clave de sesión (profesor+fecha+hora),
-- nunca sobre `slot_id`: si el profesor pulsa "Avisar" desde la fila de
-- otro alumno de la MISMA sesión, la RPC lo reconoce como la misma sesión
-- ya avisada y lo rechaza, en vez de crear un segundo aviso fragmentado.
-- Decisión razonada en `DECISIONES_TECNICAS.md` (R-29): se descarta una
-- columna `uuid[]`/tabla puente por VARIOS alumnos — no hace falta,
-- porque el aviso es puramente informativo (requisito 4) y el
-- administrador no necesita la lista programática de alumnos afectados
-- para actuar, solo QUIÉN, QUÉ SESIÓN y CUÁNDO; si de verdad hace falta
-- declarar la sustitución/cancelación real por alumno, eso ya lo resuelve
-- R-06 con su propio `slot_id` exacto.
--
-- El motivo (requisito 1) es SIEMPRE texto libre opcional, nunca una
-- lista cerrada — mismo criterio que `pausa_alumno.motivo` (R-21),
-- lección del hallazgo #8/pregunta #16 de §6 sobre R-02.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'slot_horario') then
    raise exception 'aviso_ausencia_profesor: falta la tabla slot_horario. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'perfil') then
    raise exception 'aviso_ausencia_profesor: falta la tabla perfil. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'tocar_actualizado_en') then
    raise exception 'aviso_ausencia_profesor: falta la función tocar_actualizado_en(). ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'aviso_ausencia_profesor: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'aviso_ausencia_profesor: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'aviso_ausencia_profesor: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. aviso_ausencia_profesor — un aviso de que el profesor titular no
--    podrá dar UNA sesión concreta (requisito 1). `fecha_sesion` es la
--    fecha CONCRETA de la ocurrencia (no un día de la semana genérico),
--    comprobada por la RPC contra el día de la semana del slot, igual que
--    `excepcion_slot.fecha` (R-06). `hora_inicio`/`hora_fin`/
--    `asignatura_o_grupo` denormalizados del slot en el momento del alta
--    (nunca del cliente): identifican la SESIÓN (no el alumno) y son la
--    clave de "misma sesión" del requisito 5.
-- ---------------------------------------------------------------------

create table public.aviso_ausencia_profesor (
  id                  uuid        primary key default gen_random_uuid(),
  profesor_id         uuid        not null references public.perfil (id),
  slot_id             uuid        not null references public.slot_horario (id),
  fecha_sesion        date        not null,
  hora_inicio         time        not null,
  hora_fin            time        not null,
  asignatura_o_grupo  text,
  motivo              text,
  estado              text        not null default 'pendiente',
  atendido_por        uuid        references public.perfil (id),
  atendido_en         timestamptz,
  registrado_en       timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  constraint aviso_ausencia_profesor_estado_valido check (estado in ('pendiente', 'atendido')),
  -- Requisito 1: motivo SIEMPRE opcional y libre (mismo criterio que pausa_alumno.motivo, R-21); si
  -- se da, no puede ser solo espacios.
  constraint aviso_ausencia_profesor_motivo_no_vacio check (motivo is null or btrim(motivo) <> ''),
  -- 'atendido' exige quién y cuándo, a la vez y solo entonces (nunca a medias) — mismo patrón que
  -- pausa_alumno_anulacion_coherente.
  constraint aviso_ausencia_profesor_atencion_coherente check (
    (estado = 'atendido' and atendido_por is not null and atendido_en is not null)
    or
    (estado = 'pendiente' and atendido_por is null and atendido_en is null)
  )
);

comment on table public.aviso_ausencia_profesor is
  'Aviso (R-29) de que un profesor no podrá dar una sesión concreta futura — puramente '
  'informativo: no crea, modifica ni cancela ningún slot_horario ni excepcion_slot por sí mismo '
  '(requisito 4); la sustitución/cancelación real la sigue declarando el administrador con R-06. '
  'Una fila representa LA SESIÓN (posiblemente varios alumnos, un slot_horario por alumno, T-15), '
  'no un alumno concreto: hora_inicio/hora_fin/asignatura_o_grupo denormalizados del slot '
  'identifican esa sesión. Escritura exclusivamente por avisar_ausencia_profesor()/'
  'marcar_aviso_ausencia_atendido() (SECURITY DEFINER, más abajo): sin GRANT de INSERT/UPDATE a '
  'authenticated. Baja lógica (estado), nunca DELETE.';
comment on column public.aviso_ausencia_profesor.slot_id is
  'Slot REPRESENTATIVO desde el que el profesor pulsó "Avisar" en Mi horario (una fila por alumno, '
  'igual que "Ver registros"): identifica la sesión junto con fecha_sesion/hora_inicio/hora_fin, '
  'no acota el aviso a ESE alumno en concreto.';
comment on column public.aviso_ausencia_profesor.fecha_sesion is
  'Fecha CONCRETA de la sesión que falta (no un día de la semana genérico). Debe coincidir con el '
  'dia_semana de slot_id, comprobado por la RPC al avisar, no por un CHECK de esta tabla.';
comment on column public.aviso_ausencia_profesor.motivo is
  'SIEMPRE texto libre opcional, nunca una lista cerrada ni ninguna opción que categorice salud '
  '(mismo criterio que pausa_alumno.motivo, R-21, lección del hallazgo #8/pregunta #16 de §6 sobre '
  'R-02).';
comment on column public.aviso_ausencia_profesor.estado is
  '''pendiente'' hasta que un administrator lo marca ''atendido'' (marcar_aviso_ausencia_atendido) '
  '— sin más acción asociada: cubre igual el caso de que ya se resolvió por teléfono antes de que '
  'existiera esta pantalla.';

create index aviso_ausencia_profesor_profesor_id_idx on public.aviso_ausencia_profesor (profesor_id);
-- Acelera el bloque de avisos pendientes del panel de centro (requisito 3) y, junto con el resto de
-- columnas, resuelve el requisito 5 ("misma sesión") sin escanear toda la tabla.
create index aviso_ausencia_profesor_pendientes_idx
  on public.aviso_ausencia_profesor (fecha_sesion)
  where estado = 'pendiente';

-- Requisito 5: nunca dos avisos PENDIENTES de la misma sesión (mismo profesor, misma fecha, mismo
-- tramo horario) — sí puede avisar de nuevo si el anterior ya quedó 'atendido'. `coalesce` sobre
-- asignatura_o_grupo (nullable) para que dos sesiones sin asignatura en el mismo tramo también
-- choquen entre sí, no solo las que la tienen.
create unique index aviso_ausencia_profesor_uq_sesion_pendiente
  on public.aviso_ausencia_profesor (profesor_id, fecha_sesion, hora_inicio, hora_fin, coalesce(asignatura_o_grupo, ''))
  where estado = 'pendiente';

drop trigger if exists aviso_ausencia_profesor_tocar_actualizado_en on public.aviso_ausencia_profesor;
create trigger aviso_ausencia_profesor_tocar_actualizado_en
  before update on public.aviso_ausencia_profesor
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 2. Privilegios y políticas RLS (requisito 1: "teacher inserta y lee
--    solo sus propios avisos; administrator lee todos y marca cualquiera
--    como atendido; student sin ningún acceso"). Sin INSERT/UPDATE para
--    authenticated: las dos RPC de la sección 3 corren como su
--    propietario (SECURITY DEFINER) y no necesitan grant.
-- ---------------------------------------------------------------------

alter table public.aviso_ausencia_profesor enable row level security;
revoke all on public.aviso_ausencia_profesor from anon, authenticated, service_role;
grant select, insert, update, delete on public.aviso_ausencia_profesor to service_role;
grant select on public.aviso_ausencia_profesor to authenticated;

create policy aviso_ausencia_profesor_admin_leer_todo on public.aviso_ausencia_profesor
  for select to authenticated
  using (public.es_administrator());

create policy aviso_ausencia_profesor_teacher_leer_propios on public.aviso_ausencia_profesor
  for select to authenticated
  using (public.es_teacher() and profesor_id = auth.uid());


-- ---------------------------------------------------------------------
-- 3. avisar_ausencia_profesor(...) — requisito 2, teacher únicamente,
--    sobre su propio slot. Requisito 2 (pantalla): "sobre una sesión
--    futura propia (nunca sobre una de hoy ya en curso ni sobre una
--    pasada)" — se impone aquí, en el servidor, no solo en el cliente.
-- ---------------------------------------------------------------------

create or replace function public.avisar_ausencia_profesor(
  p_slot_id      uuid,
  p_fecha_sesion date,
  p_motivo       text default null
)
returns public.aviso_ausencia_profesor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol                    text := public.rol_actual();
  v_slot                   public.slot_horario%rowtype;
  v_dia_semana_fecha       smallint;
  v_ahora                  timestamptz := now();
  v_hoy                    date := (v_ahora at time zone 'Europe/Madrid')::date;
  v_instante_inicio_sesion timestamptz;
  v_fila                   public.aviso_ausencia_profesor;
begin
  if v_rol <> 'teacher' then
    raise exception 'avisar_ausencia_profesor: solo un profesor puede avisar de su propia ausencia'
      using errcode = '42501';
  end if;

  select * into v_slot from public.slot_horario where id = p_slot_id;
  if not found then
    raise exception 'avisar_ausencia_profesor: el slot indicado no existe';
  end if;
  if v_slot.profesor_id <> auth.uid() then
    raise exception 'avisar_ausencia_profesor: el slot no te pertenece'
      using errcode = '42501';
  end if;

  if p_motivo is not null and btrim(p_motivo) = '' then
    raise exception 'avisar_ausencia_profesor: el motivo no puede ser solo espacios en blanco';
  end if;

  -- La fecha debe caer en el mismo día de la semana que el slot (mismo criterio que
  -- declarar_excepcion_slot, R-06), y el slot debe estar vigente ese día.
  v_dia_semana_fecha := extract(isodow from p_fecha_sesion);
  if v_dia_semana_fecha <> v_slot.dia_semana then
    raise exception 'avisar_ausencia_profesor: la fecha indicada no cae en el día de la semana del slot (%)', v_slot.dia_semana;
  end if;
  if v_slot.vigente_desde > p_fecha_sesion or (v_slot.vigente_hasta is not null and v_slot.vigente_hasta < p_fecha_sesion) then
    raise exception 'avisar_ausencia_profesor: el slot no está vigente en la fecha indicada';
  end if;

  -- Requisito 2 (pantalla): nunca sobre una sesión pasada ni sobre una de hoy ya en curso.
  if p_fecha_sesion < v_hoy then
    raise exception 'avisar_ausencia_profesor: no se puede avisar de una sesión que ya ha pasado';
  end if;
  if p_fecha_sesion = v_hoy then
    v_instante_inicio_sesion := (p_fecha_sesion + v_slot.hora_inicio) at time zone 'Europe/Madrid';
    if v_ahora >= v_instante_inicio_sesion then
      raise exception 'avisar_ausencia_profesor: no se puede avisar de una sesión de hoy que ya está en curso o ya ha pasado';
    end if;
  end if;

  insert into public.aviso_ausencia_profesor (
    profesor_id, slot_id, fecha_sesion, hora_inicio, hora_fin, asignatura_o_grupo, motivo
  )
  values (
    auth.uid(), p_slot_id, p_fecha_sesion, v_slot.hora_inicio, v_slot.hora_fin, v_slot.asignatura_o_grupo, p_motivo
  )
  returning * into v_fila;

  return v_fila;
exception
  when unique_violation then
    raise exception 'avisar_ausencia_profesor: ya avisaste de esta sesión y sigue pendiente'
      using errcode = '23505';
end;
$$;

revoke all on function public.avisar_ausencia_profesor(uuid, date, text) from public;
grant execute on function public.avisar_ausencia_profesor(uuid, date, text) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que declarar_excepcion_slot/declarar_pausa_alumno):
-- la comprobación de rol del primer `if` es quien de verdad rechaza a `administrator`/`student`, no
-- la ausencia de GRANT.


-- ---------------------------------------------------------------------
-- 4. marcar_aviso_ausencia_atendido(...) — requisito 3, administrator
--    únicamente. Sin más acción asociada (cubre igual el caso de que ya
--    se resolvió por teléfono).
-- ---------------------------------------------------------------------

create or replace function public.marcar_aviso_ausencia_atendido(p_aviso_id uuid)
returns public.aviso_ausencia_profesor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol  text := public.rol_actual();
  v_aviso public.aviso_ausencia_profesor%rowtype;
  v_fila public.aviso_ausencia_profesor;
begin
  if v_rol <> 'administrator' then
    raise exception 'marcar_aviso_ausencia_atendido: solo un administrador puede marcar un aviso como atendido'
      using errcode = '42501';
  end if;

  select * into v_aviso from public.aviso_ausencia_profesor where id = p_aviso_id;
  if not found then
    raise exception 'marcar_aviso_ausencia_atendido: el aviso indicado no existe';
  end if;
  if v_aviso.estado <> 'pendiente' then
    raise exception 'marcar_aviso_ausencia_atendido: el aviso ya está atendido';
  end if;

  update public.aviso_ausencia_profesor
     set estado = 'atendido', atendido_por = auth.uid(), atendido_en = now()
   where id = p_aviso_id
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.marcar_aviso_ausencia_atendido(uuid) from public;
grant execute on function public.marcar_aviso_ausencia_atendido(uuid) to authenticated;
