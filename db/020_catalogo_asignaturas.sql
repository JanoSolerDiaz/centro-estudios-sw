-- =====================================================================
-- GestorAcademia — 020_catalogo_asignaturas.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-33 (catálogo de asignaturas y grupos, oleada v16 / F-24). Objetivo:
-- `slot_horario.asignatura_o_grupo` es hoy texto completamente libre
-- (`db/MODELO.md:130`, "texto — etiqueta libre"), y esa misma columna es
-- la clave con la que `slotsDeLaMismaSesion` (T-15) decide qué slots son
-- "la misma sesión" — comparada por igualdad EXACTA. Un tecleo distinto
-- entre dos altas del mismo grupo ("Matemáticas 4ESO" / "matematicas 4
-- eso") rompe esa agrupación en silencio. Mismo patrón que T-11 resolvió
-- para el centro de estudios de referencia: un catálogo cerrado que
-- mantiene `administrator`, en vez de texto libre.
--
-- Tabla nueva, con sus propias políticas RLS en el mismo fichero (sin
-- precedente al que aplazarlas, igual que 014/017/018/019). Sin ninguna
-- columna nueva en `slot_horario` ni en `asistencia` (requisito 1 de
-- R-33): `asignatura_o_grupo` sigue siendo exactamente el mismo campo de
-- texto, sin cambiar su tipo, su nombre ni su significado — el catálogo
-- solo ofrece de dónde sacar ese texto de forma consistente. Sin ninguna
-- RPC: igual que `centro_estudios` (T-11) y `cierre_centro` (R-12), el
-- `INSERT`/`UPDATE` directo de `administrator` ya queda aislado por RLS,
-- sin necesidad de una función `SECURITY DEFINER`.
--
-- Baja lógica (activo), nunca DELETE — mismo patrón que el resto del
-- catálogo. Sin relación de clave foránea con `slot_horario`: desactivar
-- una asignatura no reescribe ni afecta a ningún slot existente
-- (requisito 4, "cambiar el horario no altera el histórico").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'tocar_actualizado_en') then
    raise exception 'catalogo_asignaturas: falta la función tocar_actualizado_en(). ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'catalogo_asignaturas: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'catalogo_asignaturas: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. asignatura — catálogo de asignaturas/grupos
-- ---------------------------------------------------------------------

create table public.asignatura (
  id             uuid        primary key default gen_random_uuid(),
  nombre         text        not null,
  activo         boolean     not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint asignatura_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint asignatura_nombre_unico unique (nombre)
);

comment on table public.asignatura is
  'Catálogo cerrado de asignaturas/grupos para slot_horario.asignatura_o_grupo (R-33). Baja '
  'lógica (activo), nunca DELETE. Sin relación de clave foránea con slot_horario: el campo de '
  'texto de cada slot sigue siendo independiente, solo se ofrece de aquí para escribirlo con '
  'un texto consistente.';
comment on column public.asignatura.nombre is
  'Único de forma exacta, mismo criterio que centro_estudios.nombre (T-11). La detección de '
  'duplicados acento-insensible es responsabilidad de la aplicación (src/dominio/asignaturas.ts), '
  'no una restricción de esquema.';

drop trigger if exists asignatura_tocar_actualizado_en on public.asignatura;
create trigger asignatura_tocar_actualizado_en
  before update on public.asignatura
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 2. Privilegios y políticas RLS — requisito 1 de R-33: administrator
--    gestiona (alta, edición, baja lógica); teacher solo lee las
--    activas; sin ninguna política de DELETE ni de student (§0.2).
-- ---------------------------------------------------------------------

alter table public.asignatura enable row level security;
revoke all on public.asignatura from anon, authenticated, service_role;
grant select, insert, update, delete on public.asignatura to service_role;
grant select, insert, update on public.asignatura to authenticated;

create policy asignatura_teacher_leer_activas on public.asignatura
  for select to authenticated
  using (public.es_teacher() and activo);

create policy asignatura_admin_leer_todas on public.asignatura
  for select to authenticated
  using (public.es_administrator());

create policy asignatura_admin_insertar on public.asignatura
  for insert to authenticated
  with check (public.es_administrator());

create policy asignatura_admin_actualizar on public.asignatura
  for update to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());
