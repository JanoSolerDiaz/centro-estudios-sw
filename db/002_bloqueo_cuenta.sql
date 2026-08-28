-- =====================================================================
-- GestorAcademia — 002_bloqueo_cuenta.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que 001: el runner envuelve esto en una transacción y
-- añade la fila de `esquema_migracion` con su propio hash. No repite
-- `begin`/`commit` ni el alta en el ledger.
--
-- P-01 (ampliación de T-09, acordada por el dueño el 2026-08-27, §5/§6#5 de
-- SEGUIMIENTO.md): bloqueo de una cuenta al tercer intento fallido de
-- contraseña, aplicado en la base de datos y hecho efectivo por RLS — un
-- usuario bloqueado no lee nada aunque su token de sesión sea válido. El
-- desbloqueo lo hace el administrator desde la aplicación; el bloqueo
-- alcanza también al administrator, cuya única vía de escape es el editor
-- SQL del panel (solo el dueño), documentada en DEVELOPERS.md.
--
-- Efecto colateral intencionado de esta migración: como `rol_actual()` pasa
-- a exigir `not bloqueado`, TODAS las políticas que ya usan
-- `es_administrator()`/`es_teacher()` (que es como T-10 debe escribir cada
-- una de las suyas, requisito 1 de su spec) heredan la condición de
-- "no bloqueado" automáticamente, sin tener que repetirla tabla por tabla.
-- Es la razón por la que esta migración va ANTES de T-10 y no después
-- (§7 de SEGUIMIENTO.md).
--
-- No recrea `perfil` ni ninguna de las funciones de rol: las redefine con
-- `create or replace function`, conservando `security definer` en las tres
-- (imprescindible: sin él, una política sobre `perfil` que las llame
-- dispara "infinite recursion detected in policy").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'perfil') then
    raise exception 'bloqueo_cuenta: falta la tabla perfil. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'bloqueo_cuenta: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Columnas nuevas en perfil
-- ---------------------------------------------------------------------

alter table public.perfil
  add column if not exists intentos_fallidos integer not null default 0,
  add column if not exists bloqueado         boolean not null default false;

alter table public.perfil
  drop constraint if exists perfil_intentos_fallidos_no_negativo;
alter table public.perfil
  add constraint perfil_intentos_fallidos_no_negativo check (intentos_fallidos >= 0);

comment on column public.perfil.intentos_fallidos is
  'Contraseñas incorrectas registradas por registrar_intento_fallido(). No es necesariamente '
  '"consecutivas": no se resetea al iniciar sesión con éxito (eso rompería el requisito de T-09 de '
  'que un student/rol desconocido dispare como máximo UNA llamada de datos al autenticar). Solo '
  'vuelve a 0 cuando admin_desbloquear_usuario() levanta el bloqueo.';
comment on column public.perfil.bloqueado is
  'true al alcanzar 3 intentos fallidos (P-01). Un perfil bloqueado sigue viendo su PROPIA fila '
  '(perfil_leer_propio no depende de rol_actual()), para que la aplicación pueda explicarle que está '
  'bloqueado, pero rol_actual() devuelve NULL para él: todas las políticas de T-10 que usan '
  'es_administrator()/es_teacher() lo tratan como si no tuviera ningún rol. El bloqueo alcanza '
  'también a administrator; su única vía de escape es el editor SQL del panel (solo el dueño), '
  'documentada en DEVELOPERS.md.';


-- ---------------------------------------------------------------------
-- 2. rol_actual() exige además "no bloqueado"
--
-- Único cambio respecto al bootstrap: añade "and not bloqueado" al WHERE.
-- es_administrator() y es_teacher() no se tocan: heredan el efecto porque
-- llaman a rol_actual(). security definer y stable se conservan tal cual.
-- ---------------------------------------------------------------------

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfil where id = auth.uid() and activo and not bloqueado;
$$;


-- ---------------------------------------------------------------------
-- 3. registrar_intento_fallido(p_email) — cuenta un login con contraseña
--    incorrecta y bloquea al llegar a 3.
--
-- Llamable por `anon`: quien falla el login todavía no tiene sesión. Por
-- eso mismo es la única función de este fichero que un cliente sin
-- autenticar puede invocar arbitrariamente — el dueño aceptó explícitamente
-- esta contrapartida (DECISIONES_TECNICAS.md, T-09, 2026-08-27): alguien
-- que conozca el email de un profesor puede dejarlo fuera, pero eso nunca
-- permite ENTRAR, solo CERRAR. Responde exactamente igual exista o no la
-- cuenta (requisito 9 de T-09: no revelar si un email tiene cuenta) — no
-- hay ninguna rama que se comunique con el llamante más allá de "terminó".
-- ---------------------------------------------------------------------

create or replace function public.registrar_intento_fallido(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_intentos integer;
begin
  select u.id into v_id
    from auth.users u
   where lower(u.email) = lower(p_email)
   limit 1;

  if v_id is null then
    return;
  end if;

  -- "and not bloqueado": una vez bloqueado, más intentos no siguen sumando
  -- (evita crecer sin límite mientras espera al administrador).
  update public.perfil
     set intentos_fallidos = intentos_fallidos + 1
   where id = v_id
     and not bloqueado
  returning intentos_fallidos into v_intentos;

  if v_intentos is not null and v_intentos >= 3 then
    update public.perfil set bloqueado = true where id = v_id;
  end if;
end;
$$;

revoke all on function public.registrar_intento_fallido(text) from public;
grant execute on function public.registrar_intento_fallido(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. admin_desbloquear_usuario(p_usuario_id) — el administrator levanta el
--    bloqueo. Nunca fija ni conoce una contraseña: eso es
--    solicitarRecuperacionContrasena() (POST /auth/v1/recover), que ya
--    existe desde T-09 y no necesita ninguna pieza nueva de base de datos.
-- ---------------------------------------------------------------------

create or replace function public.admin_desbloquear_usuario(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_administrator() then
    raise exception 'Solo un administrador puede desbloquear una cuenta.' using errcode = '42501';
  end if;

  update public.perfil
     set bloqueado         = false,
         intentos_fallidos = 0
   where id = p_usuario_id;
end;
$$;

revoke all on function public.admin_desbloquear_usuario(uuid) from public;
grant execute on function public.admin_desbloquear_usuario(uuid) to authenticated;
