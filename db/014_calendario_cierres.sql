-- =====================================================================
-- GestorAcademia — 014_calendario_cierres.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-12 (calendario de cierres del centro: festivos y vacaciones,
-- oleada v1 / F-01). Objetivo: declarar una sola vez un periodo en el
-- que el centro no da clase, para que R-04 (informe mensual) deje de
-- contar como "sesión esperada y no venida" cualquier tramo de una
-- semana en la que el propio centro estaba cerrado.
--
-- Tabla nueva, la primera desde 001_esquema_inicial.sql que no depende
-- de ninguna migración de políticas posterior: aquella dejó sus tablas
-- con RLS habilitada y CERO políticas, a la espera de la migración de
-- T-10 que las daría todas juntas — hoy esa migración ya está aplicada
-- y no existe un "próximo lote de políticas" al que aplazar las de una
-- tabla nueva, así que esta trae las suyas en el mismo fichero. Es
-- exactamente lo que exige §0.2: "toda tabla nueva nace con RLS
-- habilitada y políticas explícitas", nunca con una promesa de
-- política futura.
--
-- Sin ningún dato de alumno ni de persona de referencia: fecha de
-- inicio, fecha de fin y un motivo en texto libre, nada más. Baja
-- lógica (activo), nunca DELETE — mismo patrón que centro_estudios
-- (T-11). El solape de fechas (requisito 3 de R-12) se comprueba en la
-- aplicación (src/dominio/cierresCentro.ts#buscarCierreSolapado), no
-- con una restricción `EXCLUDE` de esquema: mismo criterio, y mismo
-- motivo, que el solape de horario de T-15 (ver
-- roadmap/DECISIONES_TECNICAS.md) — una restricción de exclusión sobre
-- rangos de fecha exigiría instalar la extensión `btree_gist`, y la
-- propia spec de R-12 se conforma con que la aplicación la rechace con
-- un mensaje claro antes de intentar el alta.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'tocar_actualizado_en') then
    raise exception 'calendario_cierres: falta la función tocar_actualizado_en(). ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'calendario_cierres: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'calendario_cierres: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. cierre_centro — periodos en los que el centro no da clase
-- ---------------------------------------------------------------------

create table public.cierre_centro (
  id             uuid        primary key default gen_random_uuid(),
  fecha_inicio   date        not null,
  fecha_fin      date        not null,
  motivo         text        not null,
  activo         boolean     not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint cierre_centro_motivo_no_vacio check (btrim(motivo) <> ''),
  constraint cierre_centro_rango_valido check (fecha_fin >= fecha_inicio)
);

comment on table public.cierre_centro is
  'Periodos declarados en los que el centro no da clase (festivos, vacaciones). Baja lógica '
  '(activo), nunca DELETE. El solape entre cierres activos lo comprueba la aplicación '
  '(src/dominio/cierresCentro.ts), no una restricción de esquema.';
comment on column public.cierre_centro.fecha_inicio is 'Inclusive.';
comment on column public.cierre_centro.fecha_fin is 'Inclusive; puede coincidir con fecha_inicio (un solo día).';
comment on column public.cierre_centro.activo is
  'Un cierre desactivado deja de contar en cálculos nuevos (esDiaCerrado), pero no desaparece del '
  'registro ni afecta a un informe ya generado antes de desactivarlo (no-retroactividad, §0.2).';

drop trigger if exists cierre_centro_tocar_actualizado_en on public.cierre_centro;
create trigger cierre_centro_tocar_actualizado_en
  before update on public.cierre_centro
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 2. Privilegios y políticas RLS — requisito 7 de R-12: administrator
--    gestiona (alta, edición, baja lógica); teacher solo lee los
--    cierres activos (para saber si su próxima sesión cae en uno); sin
--    ninguna política para student (§0.2, ninguna excepción).
-- ---------------------------------------------------------------------

alter table public.cierre_centro enable row level security;
revoke all on public.cierre_centro from anon, authenticated, service_role;
grant select, insert, update, delete on public.cierre_centro to service_role;
grant select, insert, update on public.cierre_centro to authenticated;

create policy cierre_centro_teacher_leer_activos on public.cierre_centro
  for select to authenticated
  using (public.es_teacher() and activo);

create policy cierre_centro_admin_leer_todos on public.cierre_centro
  for select to authenticated
  using (public.es_administrator());

create policy cierre_centro_admin_insertar on public.cierre_centro
  for insert to authenticated
  with check (public.es_administrator());

create policy cierre_centro_admin_actualizar on public.cierre_centro
  for update to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());
