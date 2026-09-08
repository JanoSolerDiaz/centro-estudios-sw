-- =====================================================================
-- GestorAcademia — 016_resolver_profesor_por_email.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que las anteriores: el runner envuelve esto en una
-- transacción y añade la fila de `esquema_migracion` con su propio hash.
--
-- R-08 (importación masiva de alumnos y horarios). Su spec dice
-- "Migración: No", pero el requisito 3 ("horario... profesor (por email
-- de una cuenta que ya existe)") no se puede cumplir sin ella:
-- `perfil` no guarda el email (vive en `auth.users`, ver `db/MODELO.md`,
-- sección `perfil`) y ninguna columna ni vista concede hoy a
-- `authenticated` la posibilidad de resolver un perfil por email — mismo
-- patrón que ya detectó T-24 antes de esta tarea
-- (`009_administracion_usuarios.sql`, "comprobar la dependencia real
-- antes de dar la spec de 'Migración: No' por buena",
-- DECISIONES_TECNICAS.md).
--
-- Una única función nueva, `SECURITY DEFINER` (imprescindible:
-- `authenticated` no tiene, ni debe tener, acceso a `auth.users`),
-- exclusiva de `administrator` — mismo patrón exacto que
-- `registrar_intento_fallido()` (`002_bloqueo_cuenta.sql`) para leer
-- `auth.users.email` de forma segura, pero con la comprobación de rol
-- invertida: aquella la llama `anon` sin sesión, esta solo tiene sentido
-- para quien ya gestiona horarios. No expone ningún listado ni búsqueda
-- parcial: un único email exacto entra, como mucho una fila sale
-- (id + nombre), y solo si esa cuenta es HOY un `teacher` activo — la
-- importación nunca crea usuarios ni cambia roles (requisito 3: "la
-- importación nunca crea usuarios ni cuentas").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'perfil') then
    raise exception 'resolver_profesor_por_email: falta la tabla perfil. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'resolver_profesor_por_email: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. resolver_profesor_por_email(p_email) — devuelve como mucho una fila
--    (id, nombre) del profesor activo cuya cuenta tiene ese email, o
--    ninguna si no existe, no es teacher, o está inactivo.
-- ---------------------------------------------------------------------

create or replace function public.resolver_profesor_por_email(p_email text)
returns table(id uuid, nombre text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_administrator() then
    raise exception 'Solo un administrador puede resolver un profesor por email.' using errcode = '42501';
  end if;

  return query
    select p.id, p.nombre
      from public.perfil p
      join auth.users u on u.id = p.id
     where lower(u.email) = lower(btrim(p_email))
       and p.rol = 'teacher'
       and p.activo
     limit 1;
end;
$$;

revoke all on function public.resolver_profesor_por_email(text) from public;
grant execute on function public.resolver_profesor_por_email(text) to authenticated;
