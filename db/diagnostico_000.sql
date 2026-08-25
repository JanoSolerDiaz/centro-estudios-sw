-- =====================================================================
-- GestorAcademia — diagnóstico de 000_bootstrap_perfil
--
-- Ejecuta los bloques UNO A UNO en el editor SQL de Supabase y pega el
-- resultado de todos. No modifica nada: solo lee estado.
--
-- Cada bloque comprueba una frontera distinta del sistema, para saber
-- DÓNDE se rompe en lugar de adivinar.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOQUE 1 — ¿Se aplicó realmente el bootstrap?
-- Esperado: version = 0, y una fila con nombre '000_bootstrap_perfil'.
-- ---------------------------------------------------------------------
select public.esquema_version() as version;

select numero, nombre, aplicado_en from public.esquema_migracion order by numero;


-- ---------------------------------------------------------------------
-- BLOQUE 2 — ¿Existen los objetos, y con los atributos correctos?
-- Esperado: las 6 funciones, y es_security_definer = true en todas
-- MENOS en tocar_actualizado_en (que no lo necesita).
-- ---------------------------------------------------------------------
select p.proname                as funcion,
       p.prosecdef              as es_security_definer,
       r.rolname                as propietario,
       pg_get_function_identity_arguments(p.oid) as argumentos
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_roles     r on r.oid = p.proowner
 where n.nspname = 'public'
   and p.proname in ('crear_perfil_para_usuario_nuevo', 'rol_actual',
                     'es_administrator', 'es_teacher',
                     'esquema_version', 'tocar_actualizado_en')
 order by p.proname;


-- ---------------------------------------------------------------------
-- BLOQUE 3 — ¿Está el trigger puesto en auth.users y activo?
-- Esperado: una fila, on_auth_user_created, habilitado = 'O' (origen).
-- Si NO sale ninguna fila, el trigger no se creó y ese es el problema.
-- ---------------------------------------------------------------------
select t.tgname            as trigger_nombre,
       t.tgrelid::regclass as sobre_tabla,
       t.tgenabled         as habilitado,
       p.proname           as ejecuta_funcion
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
 where not t.tgisinternal
   and t.tgrelid = 'auth.users'::regclass;


-- ---------------------------------------------------------------------
-- BLOQUE 4 — ¿Cómo está la RLS de perfil?
-- Esperado: rls_activada = true, rls_forzada = FALSE.
-- Si rls_forzada fuera true, el trigger SECURITY DEFINER quedaría
-- bloqueado por las políticas y eso explicaría el fallo.
-- ---------------------------------------------------------------------
select c.relname            as tabla,
       c.relrowsecurity     as rls_activada,
       c.relforcerowsecurity as rls_forzada,
       r.rolname            as propietario
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_roles     r on r.oid = c.relowner
 where n.nspname = 'public'
   and c.relname in ('perfil', 'esquema_migracion');

select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'perfil'
 order by policyname;


-- ---------------------------------------------------------------------
-- BLOQUE 5 — LA PREGUNTA CLAVE: ¿hay usuarios sin perfil?
--
--   usuarios > 0 y perfiles = 0   -> el trigger NO está funcionando
--   usuarios = perfiles           -> el trigger SÍ funciona, el error
--                                    está en otro sitio
--   usuarios = 0                  -> no se ha creado ningún usuario
-- ---------------------------------------------------------------------
select (select count(*) from auth.users)    as usuarios,
       (select count(*) from public.perfil) as perfiles;

-- Detalle: qué usuarios existen y si tienen perfil (sin exponer nada
-- sensible más allá del email, que es tuyo).
select u.id,
       u.email,
       u.email_confirmed_at is not null as email_confirmado,
       p.id is not null                 as tiene_perfil,
       p.nombre,
       p.rol,
       p.activo
  from auth.users u
  left join public.perfil p on p.id = u.id
 order by u.created_at;


-- ---------------------------------------------------------------------
-- BLOQUE 6 — Restricciones de perfil, por si el fallo es de validación
-- (por ejemplo nombre NOT NULL cuando no hay email ni metadatos).
-- ---------------------------------------------------------------------
select column_name    as columna,
       data_type      as tipo,
       is_nullable    as admite_nulo,
       column_default as valor_por_defecto
  from information_schema.columns
 where table_schema = 'public' and table_name = 'perfil'
 order by ordinal_position;

select conname as restriccion, pg_get_constraintdef(oid) as definicion
  from pg_constraint
 where conrelid = 'public.perfil'::regclass
 order by conname;


-- ---------------------------------------------------------------------
-- BLOQUE 7 — Permisos de tabla concedidos
-- ---------------------------------------------------------------------
select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'perfil'
 order by grantee, privilege_type;
