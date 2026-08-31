-- =====================================================================
-- GestorAcademia — 004_bucket_avatares.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano. DDL
-- PLANO, igual que 001/002/003: el runner la envuelve en una transacción y
-- añade la fila de `esquema_migracion` con su propio hash.
--
-- T-14 (Avatar del alumno, Supabase Storage). Numeración: la spec original
-- de T-14 la llama `003_bucket_avatares`; P-01 y T-10 ya ocupaban `002` y
-- `003`, así que pasa a `004` — anotado en `003_politicas_rls.sql`,
-- `db/MODELO.md` y §7 de SEGUIMIENTO.md desde el 2026-08-28 para que esta
-- sesión no lo descubriera a mitad.
--
-- Solo crea el bucket en sí. Las CUATRO políticas de `storage.objects`
-- (lectura y escritura de `administrator`, lectura de `teacher` acotada a
-- alumnos activos) ya existen desde `003_politicas_rls.sql` (T-10,
-- requisito 1 de su spec): una política sobre `bucket_id = 'avatares'` es
-- válida sin que el bucket exista todavía, así que el bucket nunca llega a
-- existir sin RLS en vigor.
--
-- Privado (`public = false`, requisito 1 de T-14): sin esto, cualquiera con
-- la URL directa del objeto vería la foto de un menor sin pasar por RLS ni
-- por una URL firmada — es justo el incidente que §0.2 señala como "el peor
-- fallo posible de este proyecto". `file_size_limit` y `allowed_mime_types`
-- son la lista blanca en la configuración del propio bucket (requisito 1):
-- el cliente solo sube las dos derivadas ya procesadas
-- (`avatar.webp`/`avatar-mini.webp`, requisito 2 de T-14), nunca el fichero
-- original del móvil, así que `image/webp` es el único tipo MIME real que
-- este bucket necesita aceptar. 2 MiB es margen amplio sobre una imagen de
-- 512×512 en WebP con calidad razonable (unas pocas decenas de KiB en la
-- práctica): protege contra un cliente modificado que intente subir algo
-- mucho más grande, sin ser tan ajustado que un caso legítimo falle.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatares_admin_leer') then
    raise exception 'bucket_avatares: faltan las políticas del bucket avatares. ¿Se aplicó 003_politicas_rls.sql?';
  end if;
  if exists (select 1 from storage.buckets where id = 'avatares') then
    raise exception 'bucket_avatares: el bucket "avatares" ya existe. Esta migración no debería reaplicarse.';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Bucket "avatares" — privado, con límite de tamaño y lista blanca de
--    tipo MIME en la propia configuración del bucket.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 2097152, array['image/webp']);


-- ---------------------------------------------------------------------
-- 2. Alta en el ledger — la añade el runner (ver cabecera). Nada que
--    hacer aquí dentro.
-- ---------------------------------------------------------------------
