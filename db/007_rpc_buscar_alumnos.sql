-- =====================================================================
-- GestorAcademia — 007_rpc_buscar_alumnos.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que 001-006: el runner envuelve esto en una
-- transacción y añade la fila de `esquema_migracion` con su propio hash.
--
-- T-20 (alumno extra: listado completo y selección manual). Su spec
-- dice `Migración: No` en la hoja de ruta original, pero cumplir el
-- requisito 3 ("cada resultado muestra... el centro de estudios cuando
-- hay homónimos") exige que un `teacher` pueda saber a qué centro
-- pertenece un alumno, y esa columna (`alumno.centro_referencia_id`) NO
-- está en el GRANT de columna que `003_politicas_rls.sql` concede a
-- `authenticated` sobre la tabla base (solo
-- `id, nombre, primer_apellido, segundo_apellido, avatar_ruta, activo` —
-- ver el comentario de `permisosUi.columnasVisiblesFichaAlumno`, que ya
-- lo documentaba). Ampliar ese GRANT filtraría la columna en TODAS las
-- lecturas de `alumno` de un `teacher`, no solo en el buscador. Mismo
-- precedente que T-09 (§7 de SEGUIMIENTO.md, "T-09 pasa a necesitar
-- migración, y su spec dice Migración: No"): la hoja de ruta es
-- inmutable, así que la desviación se registra en `DECISIONES_TECNICAS.md`
-- y en §7 de SEGUIMIENTO.md, no editando la spec.
--
-- Solución elegida: una RPC de solo lectura, `SECURITY DEFINER`, con
-- return type explícito que NUNCA incluye contacto, personas de
-- referencia ni avatar (requisito 3 de T-20: "nunca contacto, nunca
-- personas de referencia, nunca avatar") — más estricta y más auditable
-- que ampliar un GRANT de columna, porque el propio tipo de retorno hace
-- estructuralmente imposible devolver de más.
--
-- Renumeración: la hoja de ruta original preveía la migración de T-21
-- (`005_rpc_actualizar_asistencia`) como `006_rpc_actualizar_asistencia.sql`
-- (proyección de §7 de SEGUIMIENTO.md, 2026-08-28), pero `006` ya lo
-- ocupó el arreglo `006_arreglo_limite_tasa_ambiguo.sql` (T-18, mismo
-- día que se aplicó `005`). Esta migración toma el número `007`, así que
-- la de T-21 pasa a ser `008_rpc_actualizar_asistencia.sql` cuando
-- llegue esa tarea — anotado también en SEGUIMIENTO.md §7 para que esa
-- sesión no lo descubra a mitad.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'alumno') then
    raise exception 'rpc_buscar_alumnos: falta la tabla alumno. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'rpc_buscar_alumnos: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. buscar_alumnos_activos(p_texto, p_limite) — requisitos 2 y 3 de T-20
--
-- Búsqueda por subcadena (`ilike`, insensible a mayúsculas) en nombre,
-- primer_apellido o segundo_apellido, solo entre alumnos activos. NO es
-- acento-insensible: misma limitación conocida, y por el mismo motivo,
-- que `listarAlumnos` (T-12) y el catálogo de centros (T-11) — sin la
-- extensión `unaccent` no hay forma de pedirlo sin una migración
-- adicional, y esta ya es la única que T-20 necesita. Documentado en
-- DECISIONES_TECNICAS.md, mismo seguimiento que la pregunta abierta #8
-- de §6 de SEGUIMIENTO.md (no se abre una pregunta nueva, es el mismo
-- "no" de siempre).
--
-- Sin límite de tasa de T-06: es una lectura, no una escritura, y el
-- propio requisito 2 de T-20 ya exige rebote (~250 ms) y cancelación en
-- el cliente — la combinación ya acota la frecuencia real de peticiones
-- sin necesitar el mecanismo pensado para operaciones que mutan datos.
-- ---------------------------------------------------------------------

create or replace function public.buscar_alumnos_activos(
  p_texto  text,
  p_limite integer default 8
)
returns table (
  id               uuid,
  nombre           text,
  primer_apellido  text,
  segundo_apellido text,
  centro_nombre    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patron text;
begin
  if not (public.es_teacher() or public.es_administrator()) then
    raise exception 'buscar_alumnos_activos: solo administrator o teacher pueden buscar alumnos'
      using errcode = '42501';
  end if;

  if p_texto is null or btrim(p_texto) = '' then
    return;
  end if;

  v_patron := '%' || btrim(p_texto) || '%';

  return query
    select a.id, a.nombre, a.primer_apellido, a.segundo_apellido, c.nombre as centro_nombre
      from public.alumno a
      join public.centro_estudios c on c.id = a.centro_referencia_id
     where a.activo
       and (
         a.nombre ilike v_patron
         or a.primer_apellido ilike v_patron
         or a.segundo_apellido ilike v_patron
       )
     order by a.primer_apellido, a.segundo_apellido nulls last, a.nombre
     limit least(greatest(coalesce(p_limite, 8), 1), 20);
end;
$$;

comment on function public.buscar_alumnos_activos(text, integer) is
  'Búsqueda de alumnos activos para "alumno extra" (T-20): solo columnas de identificación más el '
  'nombre del centro (para desambiguar homónimos), nunca contacto, nunca personas de referencia, '
  'nunca avatar_ruta. SECURITY DEFINER porque un teacher no tiene GRANT de columna sobre '
  'alumno.centro_referencia_id (003_politicas_rls.sql) — el join con centro_estudios necesita esa '
  'columna, y el tipo de retorno explícito es lo que garantiza que nunca se cuela nada más.';

revoke all on function public.buscar_alumnos_activos(text, integer) from public;
grant execute on function public.buscar_alumnos_activos(text, integer) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que registrar_asistencia, 005): la
-- comprobación de rol de arriba es quien de verdad rechaza a `student` y a cualquier rol
-- desconocido, no la ausencia de GRANT.
