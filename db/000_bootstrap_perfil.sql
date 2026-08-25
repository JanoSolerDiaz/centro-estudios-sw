-- =====================================================================
-- GestorAcademia — 000_bootstrap_perfil.sql
--
-- Arranque manual. Lo aplica el dueño en el editor SQL de Supabase
-- (proyecto de DESARROLLO), antes de que el agente empiece.
--
-- Crea:
--   · public.esquema_migracion  + esquema_version()  -> el ledger que usará
--     el runner de migraciones (T-07) y el health check.
--   · public.perfil             -> datos de academia del usuario, con los
--     tres roles y RLS completa.
--   · Trigger en auth.users     -> al crear un usuario en el panel, su fila
--     de perfil aparece sola.
--
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin romper nada.
--
-- IMPORTANTE: un usuario nuevo nace con rol 'student', que NO tiene acceso
-- a nada. Después de crear tu usuario, ejecuta el bloque del final de este
-- fichero para convertirte en 'administrator'. Si no lo haces, entrarás y
-- verás la pantalla de "sin acceso", y parecerá que algo está roto.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Registro de migraciones y su función de consulta
-- ---------------------------------------------------------------------

create table if not exists public.esquema_migracion (
  numero      integer     primary key,
  nombre      text        not null,
  hash        text,
  aplicado_en timestamptz not null default now()
);

comment on table public.esquema_migracion is
  'Qué migraciones se han aplicado en este proyecto. Lo mantiene el runner (npm run migrate).';

-- RLS activada y SIN políticas: nadie llega a esta tabla por la API.
-- Se consulta solo a través de esquema_version(), que es SECURITY DEFINER.
alter table public.esquema_migracion enable row level security;
revoke all on public.esquema_migracion from anon, authenticated;

-- Devuelve -1 si no hay ninguna migración aplicada, para poder distinguir
-- "base virgen" de "solo el bootstrap" (que es la versión 0).
create or replace function public.esquema_version()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(numero), -1) from public.esquema_migracion;
$$;

-- El health check consulta esto sin sesión, así que anon puede ejecutarla.
-- Solo expone un entero con la versión del esquema.
revoke all on function public.esquema_version() from public;
grant execute on function public.esquema_version() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. Tabla perfil
-- ---------------------------------------------------------------------

create table if not exists public.perfil (
  id             uuid        primary key references auth.users (id) on delete cascade,
  nombre         text        not null,
  rol            text        not null default 'student'
                             check (rol in ('administrator', 'teacher', 'student')),
  activo         boolean     not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table  public.perfil        is 'Datos de academia del usuario. La identidad la gestiona auth.users.';
comment on column public.perfil.rol    is 'administrator | teacher | student. Por defecto student, que no tiene acceso a nada.';
comment on column public.perfil.activo is 'Un perfil inactivo no puede entrar, aunque sus credenciales sean correctas.';

-- actualizado_en siempre lo pone el servidor, nunca el cliente.
create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists perfil_tocar_actualizado_en on public.perfil;
create trigger perfil_tocar_actualizado_en
  before update on public.perfil
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 3. Funciones de rol
--
-- OJO: tienen que ser SECURITY DEFINER. Si no lo fueran, la política de
-- lectura de perfil llamaría a una función que vuelve a consultar perfil,
-- lo que dispara la política otra vez -> "infinite recursion detected in
-- policy". Es el error más común montando RLS en Supabase.
-- ---------------------------------------------------------------------

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfil where id = auth.uid() and activo;
$$;

create or replace function public.es_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() = 'administrator', false);
$$;

create or replace function public.es_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() = 'teacher', false);
$$;

revoke all on function public.rol_actual()      from public;
revoke all on function public.es_administrator() from public;
revoke all on function public.es_teacher()       from public;
grant execute on function public.rol_actual()      to authenticated;
grant execute on function public.es_administrator() to authenticated;
grant execute on function public.es_teacher()       to authenticated;


-- ---------------------------------------------------------------------
-- 4. RLS de perfil
--
-- Cada usuario autenticado lee SU propia fila —incluido un student, porque
-- son sus propios datos y la aplicación necesita su nombre y su rol para
-- decirle que todavía no tiene acceso—. Nada más.
-- El administrator lee y gestiona todos. NO hay política de DELETE para
-- nadie: los perfiles se desactivan, no se borran.
-- ---------------------------------------------------------------------

alter table public.perfil enable row level security;

drop policy if exists perfil_leer_propio on public.perfil;
create policy perfil_leer_propio on public.perfil
  for select to authenticated
  using (id = auth.uid());

drop policy if exists perfil_admin_leer_todos on public.perfil;
create policy perfil_admin_leer_todos on public.perfil
  for select to authenticated
  using (public.es_administrator());

drop policy if exists perfil_admin_insertar on public.perfil;
create policy perfil_admin_insertar on public.perfil
  for insert to authenticated
  with check (public.es_administrator());

drop policy if exists perfil_admin_actualizar on public.perfil;
create policy perfil_admin_actualizar on public.perfil
  for update to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());

-- Permisos de tabla: la RLS decide las filas, esto decide las operaciones.
grant usage on schema public to authenticated;
grant select, insert, update on public.perfil to authenticated;
revoke delete on public.perfil from authenticated;
revoke all    on public.perfil from anon;


-- ---------------------------------------------------------------------
-- 5. Perfil automático al crear un usuario
--
-- Sin esto, un usuario creado desde el panel de Supabase existiría en
-- auth.users pero no tendría fila en perfil, y la aplicación no sabría
-- quién es. Nace como 'student' (sin acceso) a propósito: si algún día se
-- habilita el registro público, el fallo por defecto es cerrado.
-- ---------------------------------------------------------------------

create or replace function public.crear_perfil_para_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfil (id, nombre, rol)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_para_usuario_nuevo();


-- ---------------------------------------------------------------------
-- 6. Dejar constancia en el ledger
-- ---------------------------------------------------------------------

insert into public.esquema_migracion (numero, nombre)
values (0, '000_bootstrap_perfil')
on conflict (numero) do nothing;

commit;


-- =====================================================================
-- COMPROBACIÓN — ejecuta esto después y revisa que cuadra
-- =====================================================================
--
--   select public.esquema_version();          -- debe devolver 0
--   select id, nombre, rol, activo from public.perfil;
--
--
-- HAZTE ADMINISTRADOR — después de crear tu usuario en
-- Authentication > Users > Add user. Sustituye el email:
--
--   update public.perfil
--      set rol = 'administrator'
--    where id = (select id from auth.users where email = 'TU_EMAIL_AQUI');
--
--   -- y verifica:
--   select p.nombre, p.rol, p.activo, u.email
--     from public.perfil p join auth.users u on u.id = p.id;
--
-- =====================================================================
