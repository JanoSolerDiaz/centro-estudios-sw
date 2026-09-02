-- =====================================================================
-- GestorAcademia — 009_administracion_usuarios.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que 001-008: el runner envuelve esto en una
-- transacción y añade la fila de `esquema_migracion` con su propio hash.
--
-- T-24 (administración de usuarios y roles). Su spec dice "Migración: No"
-- (§1 de SEGUIMIENTO.md la hereda de HOJA_DE_RUTA.md), pero el requisito 4
-- ("el último administrator activo no puede desactivarse ni degradarse a
-- sí mismo; la regla se implementa en la base de datos") es, literalmente,
-- DDL: no hay forma de cumplirlo solo desde el cliente sin dejar una
-- ventana de carrera entre dos administradores, y la propia spec exige
-- que viva en la base de datos, no en la interfaz — mismo precedente que
-- T-09/T-20/T-23, documentado en DECISIONES_TECNICAS.md ("comprobar la
-- dependencia real antes de dar la spec de 'Migración: No' por buena").
--
-- `perfil` (tabla, RLS, políticas, funciones de rol) YA EXISTE desde
-- `000_bootstrap_perfil.sql`: esta migración NO la recrea, solo la altera.
-- El requisito 1 (listado/edición de nombre/cambio de rol/desactivación)
-- y el requisito 2 (vínculo alumno.usuario_id) no necesitan nada nuevo:
-- el UPDATE de `administrator` sobre CUALQUIER fila de `perfil` ya está
-- concedido y aislado por RLS desde el bootstrap (`perfil_admin_actualizar`),
-- y `alumno.usuario_id` ya existe desde `001_esquema_inicial.sql`.
--
-- Dos piezas nuevas:
--   1. Columna `perfil.actualizado_por` (requisito 5, "autor e instante"),
--      mismo patrón exacto que `asistencia.actualizado_por` de
--      `001_esquema_inicial.sql`: la fija el propio trigger, nunca el
--      cliente.
--   2. Trigger `perfil_before_update`, que sustituye al genérico
--      `perfil_tocar_actualizado_en` del bootstrap (mismo criterio que
--      `asistencia_proteger_inmutables` sustituyó al genérico
--      `tocar_actualizado_en` para esa tabla en `001`): además de tocar
--      `actualizado_en`/`actualizado_por`, aborta un UPDATE que dejaría al
--      sistema sin ningún `administrator` activo (requisito 4).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'perfil') then
    raise exception 'administracion_usuarios: falta la tabla perfil. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'perfil_tocar_actualizado_en') then
    raise exception 'administracion_usuarios: falta el trigger perfil_tocar_actualizado_en. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. perfil.actualizado_por (requisito 5: autor de la última modificación)
-- ---------------------------------------------------------------------

alter table public.perfil add column if not exists actualizado_por uuid references public.perfil (id);

comment on column public.perfil.actualizado_por is
  'Quién hizo el último cambio sobre este perfil (normalmente el administrator que editó rol/activo/'
  'nombre). Lo fija el trigger perfil_before_update, nunca el cliente. NULL en filas nunca modificadas '
  'tras su creación.';


-- ---------------------------------------------------------------------
-- 2. Trigger perfil_before_update — sustituye a perfil_tocar_actualizado_en
--    (requisitos 4 y 5)
-- ---------------------------------------------------------------------

create or replace function public.perfil_proteger_ultimo_administrator()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();

  -- Requisito 4: si esta fila ERA un administrator activo y el UPDATE la deja sin serlo (cambia de
  -- rol o se desactiva), comprueba que queda OTRO administrator activo distinto de esta fila. No
  -- hace falta SECURITY DEFINER: quien ejecuta este UPDATE ya tiene que ser administrator (única
  -- política de UPDATE sobre perfil, perfil_admin_actualizar, del bootstrap), y un administrator ya
  -- puede leer todas las filas de perfil (perfil_admin_leer_todos) — el SELECT de abajo no necesita
  -- privilegios que el llamante no tuviera ya.
  if old.rol = 'administrator' and old.activo
     and (new.rol is distinct from 'administrator' or new.activo is distinct from true)
     and not exists (
       select 1 from public.perfil
        where rol = 'administrator' and activo and id <> old.id
     )
  then
    -- SIN errcode 42501 a propósito: no es un problema de PERMISOS (quien llama sí tiene permiso
    -- para editar perfiles), es una regla de negocio — PostgREST lo clasifica como 400 en vez de
    -- 403, y el cliente (src/datos/erroresDominio.ts) SÍ conserva el mensaje de un 400
    -- (ErrorDeValidacion), a diferencia de lo que hace con un 403 (SinPermiso, siempre genérico).
    raise exception 'perfil: no se puede desactivar ni degradar al último administrator activo del sistema';
  end if;

  return new;
end;
$$;

drop trigger if exists perfil_tocar_actualizado_en on public.perfil;
drop trigger if exists perfil_before_update on public.perfil;
create trigger perfil_before_update
  before update on public.perfil
  for each row execute function public.perfil_proteger_ultimo_administrator();
