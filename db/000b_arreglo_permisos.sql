-- =====================================================================
-- GestorAcademia — 000b_arreglo_permisos.sql
--
-- Corrección de 000_bootstrap_perfil.sql. Aplícalo en el editor SQL de
-- Supabase, después del bootstrap.
--
-- POR QUÉ EXISTE ESTE FICHERO
-- Supabase concede privilegios por defecto a anon, authenticated y
-- service_role sobre toda tabla nueva del esquema public. El bootstrap
-- revocó los de anon y AÑADIÓ los que necesita authenticated, pero no
-- QUITÓ los que ya venían de serie. Resultado detectado en el
-- diagnóstico: authenticated tenía TRUNCATE sobre perfil.
--
-- Eso importa porque TRUNCATE NO respeta RLS: ninguna política lo filtra.
-- Y contradice la regla de §0.2 de HOJA_DE_RUTA.md, que prohíbe TRUNCATE
-- en este proyecto.
--
-- El efecto inverso también estaba: service_role se quedó sin SELECT,
-- INSERT ni UPDATE, lo que rompe cualquier herramienta administrativa o
-- una restauración.
--
-- Es IDEMPOTENTE. No registra versión nueva en el ledger: es parte del
-- arranque manual, no una migración del runner. A partir de 001 sí rige
-- la regla estricta de inmutabilidad.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- perfil — partir de cero y conceder solo lo justo
-- ---------------------------------------------------------------------

revoke all on public.perfil from anon, authenticated, service_role;

-- La app: RLS decide QUÉ filas, esto decide QUÉ operaciones.
-- Sin DELETE (los perfiles se desactivan), sin TRUNCATE, sin TRIGGER,
-- sin REFERENCES.
grant select, insert, update on public.perfil to authenticated;

-- La clave de servicio nunca viaja al navegador. Es la vía de escape del
-- operador: herramientas administrativas, copias y restauraciones.
grant select, insert, update, delete on public.perfil to service_role;

-- anon no toca perfil ni para leer.
-- (ya revocado arriba; se deja explícito para que se lea la intención)


-- ---------------------------------------------------------------------
-- esquema_migracion — solo el runner y el operador
-- Nadie llega por la API: RLS activada y sin políticas. Se consulta a
-- través de esquema_version(), que es SECURITY DEFINER.
-- ---------------------------------------------------------------------

revoke all on public.esquema_migracion from anon, authenticated, service_role;
grant select, insert, update on public.esquema_migracion to service_role;


-- ---------------------------------------------------------------------
-- Privilegios por defecto: que el problema no vuelva con cada tabla
--
-- Esto es lo que evita repetir el descuido en las tablas de 001 en
-- adelante. Deja de conceder ALL automáticamente a los roles de la API
-- sobre lo que se cree a partir de ahora; cada tabla nueva tendrá que
-- declarar sus permisos de forma explícita, que es justo lo que queremos.
-- ---------------------------------------------------------------------

alter default privileges in schema public
  revoke all on tables from anon, authenticated;

commit;


-- =====================================================================
-- COMPROBACIÓN — ejecuta esto y revisa que cuadra
--
--   select grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'perfil'
--    order by grantee, privilege_type;
--
-- Esperado, y nada más que esto:
--   authenticated : INSERT, SELECT, UPDATE
--   postgres      : (todos — es el propietario)
--   service_role  : DELETE, INSERT, SELECT, UPDATE
--   anon          : (ninguna fila)
--
-- En particular: authenticated NO debe aparecer con TRUNCATE.
-- =====================================================================
