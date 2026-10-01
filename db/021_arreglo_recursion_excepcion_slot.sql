-- =====================================================================
-- GestorAcademia — 021_arreglo_recursion_excepcion_slot.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que el resto: el runner envuelve esto en una
-- transacción y añade la fila de `esquema_migracion` con su hash.
--
-- ARREGLO (P-33) de un bug de `013_excepcion_slot.sql`, que ya está
-- aplicada en `dev` (2026-10-01) y por tanto es inmutable: el arreglo va
-- aquí, nunca editando el fichero anterior (§0.1 de HOJA_DE_RUTA.md; el
-- runner lo impone por hash).
--
-- ---------------------------------------------------------------------
-- SÍNTOMA
--
-- `npm run probar-rls` contra `dev`, justo después de aplicar 010-020
-- (2026-10-01):
--
--     infinite recursion detected in policy for relation "slot_horario"
--
-- en el INSERT de slot del administrator (sección 4), en el barrido de
-- `student` sobre `slot_horario`, `excepcion_slot` y `pausa_alumno`
-- (sección 6), y en cascada: sin slot de prueba se omiten casi todas
-- las secciones 8g-8q. No es solo la batería: cualquier lectura de
-- `slot_horario` desde la aplicación —Mi horario, pasar lista, gestión
-- de horarios— falla igual, con cualquier rol.
--
-- CAUSA RAÍZ
--
-- `013` creó dos políticas que se consultan mutuamente:
--
--   excepcion_slot_teacher_leer_relacionadas  (on excepcion_slot)
--       ... exists (select 1 from public.slot_horario s ...)
--   slot_horario_teacher_leer_sustituciones   (on slot_horario)
--       ... exists (select 1 from public.excepcion_slot e ...)
--
-- PostgreSQL expande TODAS las políticas permisivas de una tabla al
-- planificar la consulta, antes de evaluar ninguna, así que detecta el
-- ciclo slot_horario -> excepcion_slot -> slot_horario y aborta. Le pasa
-- a cualquier rol: el `public.es_teacher() and ...` de las políticas no
-- lo evita, porque la recursión se detecta en el planificador, no al
-- evaluar la condición. `pausa_alumno` cae en el mismo ciclo porque su
-- política de teacher (`017`) lee `slot_horario`. El INSERT del
-- administrator también: `insert ... returning` exige pasar las
-- políticas de SELECT de la fila devuelta.
--
-- Es exactamente el error contra el que avisa `000_bootstrap_perfil.sql`
-- ("el error más común montando RLS en Supabase") y la misma solución:
-- una función SECURITY DEFINER, que lee la tabla con los privilegios de
-- su propietario y por tanto sin pasar por sus políticas.
--
-- ---------------------------------------------------------------------
-- QUÉ CAMBIA
--
-- 1. Función nueva `public.es_sustituto_activo_de_slot(uuid)`: dice si
--    el usuario autenticado (`auth.uid()`) es el sustituto nombrado de
--    una sustitución ACTIVA sobre ese slot. Misma condición exacta que
--    tenía el `exists` de la política de `013`. Solo devuelve un
--    booleano sobre el propio llamante: no expone ninguna fila de
--    `excepcion_slot` que no pudiera leer ya por su política.
-- 2. `slot_horario_teacher_leer_sustituciones` se borra y se recrea con
--    el MISMO nombre y la MISMA semántica, llamando a la función en vez
--    de consultar `excepcion_slot` directamente. Con eso el ciclo se
--    rompe por un solo punto.
--
-- Qué NO cambia: `excepcion_slot_teacher_leer_relacionadas` sigue
-- leyendo `slot_horario` (ese sentido del grafo es inocuo una vez roto
-- el otro); ninguna otra política, tabla ni RPC. Nadie gana ni pierde
-- acceso a nada respecto a lo que pretendía `013`.
--
-- Guarda permanente: `herramientas/migraciones/politicasSinCiclos.test.ts`
-- recorre todas las migraciones y falla si alguna política vuelve a
-- formar un ciclo entre tablas.
-- =====================================================================

create or replace function public.es_sustituto_activo_de_slot(p_slot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.excepcion_slot e
     where e.slot_id = p_slot_id
       and e.tipo = 'sustitucion'
       and e.activo
       and e.profesor_sustituto_id = auth.uid()
  );
$$;

revoke all on function public.es_sustituto_activo_de_slot(uuid) from public;
grant execute on function public.es_sustituto_activo_de_slot(uuid) to authenticated;

drop policy if exists slot_horario_teacher_leer_sustituciones on public.slot_horario;

create policy slot_horario_teacher_leer_sustituciones on public.slot_horario
  for select to authenticated
  using (
    public.es_teacher()
    and public.es_sustituto_activo_de_slot(slot_horario.id)
  );
