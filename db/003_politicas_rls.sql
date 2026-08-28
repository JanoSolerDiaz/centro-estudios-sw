-- =====================================================================
-- GestorAcademia — 003_politicas_rls.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano. DDL
-- PLANO, igual que 001/002: el runner la envuelve en una transacción y
-- añade la fila de `esquema_migracion` con su propio hash.
--
-- T-10 (Autorización: políticas RLS de los tres roles). Numeración: la
-- hoja de ruta original la llamaba `002_politicas_rls`; P-01 se intercaló
-- antes como `002_bloqueo_cuenta`, así que esta pasa a `003` (§7 de
-- SEGUIMIENTO.md). Por la misma razón, la migración del bucket de
-- avatares que la spec original de T-14 llama `003_bucket_avatares` pasa a
-- `004_bucket_avatares` — anotado aquí para que esa sesión no lo descubra
-- a mitad.
--
-- Da políticas de acceso a las siete tablas de `001_esquema_inicial` (más
-- las columnas de contacto de `alumno`, tratadas aparte) y al futuro
-- bucket `avatares` de Storage (`storage.objects`), que T-14 todavía no ha
-- creado: una política sobre `storage.objects` no exige que exista ya
-- ninguna fila con `bucket_id = 'avatares'`, así que dejarla escrita desde
-- ahora evita que el bucket exista alguna vez sin RLS ya en vigor.
--
-- Cada política nueva que compara el rol usa `es_administrator()` o
-- `es_teacher()` (requisito 1 de T-10) — nunca repite `rol_actual() = ...`
-- a mano — para heredar automáticamente la condición "not bloqueado" que
-- `002_bloqueo_cuenta` ya incorporó dentro de `rol_actual()`. Ninguna
-- política nueva de este fichero menciona a `student`: su única política
-- en todo el sistema sigue siendo `perfil_leer_propio`, del bootstrap.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'alumno') then
    raise exception 'politicas_rls: falta la tabla alumno. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_teacher') then
    raise exception 'politicas_rls: falta la función es_teacher(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. centro_estudios — teacher lee los activos; administrator lee y
--    escribe todos. Sin DELETE para nadie (baja lógica, nunca borrado).
-- ---------------------------------------------------------------------

grant select, insert, update on public.centro_estudios to authenticated;

create policy centro_estudios_teacher_leer_activos on public.centro_estudios
  for select to authenticated
  using (public.es_teacher() and activo);

create policy centro_estudios_admin_leer_todos on public.centro_estudios
  for select to authenticated
  using (public.es_administrator());

create policy centro_estudios_admin_insertar on public.centro_estudios
  for insert to authenticated
  with check (public.es_administrator());

create policy centro_estudios_admin_actualizar on public.centro_estudios
  for update to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());


-- ---------------------------------------------------------------------
-- 2. alumno — el caso con más matices de esta migración (requisito 4 de
--    T-10): un teacher no debe poder leer email_alumno/telefono_alumno ni
--    siquiera con una consulta directa a PostgREST, y administrator debe
--    seguir viéndolas. Como `anon`/`authenticated`/`service_role` son los
--    ÚNICOS roles de Postgres que existen — administrator y teacher son
--    la misma fila de `authenticated`, distinguidos solo por la columna
--    `perfil.rol` — un GRANT de columna por sí solo no puede dar a
--    administrator más columnas que a teacher: ambos comparten el mismo
--    grantee. Tampoco basta una vista con `security_invoker` (la lectura
--    que sugiere el punto 4 de la spec): una vista de ese tipo hereda los
--    privilegios de columna de quien la invoca, que son los mismos para
--    los dos roles de aplicación, así que administrator seguiría sin
--    poder leer las columnas de contacto a través de ella. Solución
--    documentada también en DECISIONES_TECNICAS.md:
--      (a) la tabla base concede a `authenticated` SOLO las columnas de
--          identificación (nunca email_alumno/telefono_alumno) — así,
--          leerlas ahí falla con un error real de Postgres para
--          CUALQUIERA, no solo para teacher, que es justo lo que exige el
--          criterio de aceptación ("debe fallar");
--      (b) `alumno_ficha`, una vista SIN `security_invoker` (el valor por
--          defecto: se ejecuta con los privilegios del propietario, que
--          sí tiene todas las columnas), con su propio filtro
--          `where es_administrator()` escrito a mano — no delega en la
--          RLS de la tabla base, que un propietario con privilegios
--          plenos saltaría igualmente. Es el único camino para que
--          administrator lea las columnas de contacto por la API.
--    Los dos INSERT/UPDATE (solo administrator) siguen yendo contra la
--    tabla base, con todas las columnas: la RLS de escritura ya impide
--    que teacher toque una fila, columnas incluidas.
-- ---------------------------------------------------------------------

-- (a) Columnas de identificación, nunca de contacto. Válido para
-- cualquier fila visible por RLS (teacher: activos; administrator: todas,
-- vía la política de abajo, aunque en la práctica usará la vista de (b)).
grant select (
  id, nombre, primer_apellido, segundo_apellido, avatar_ruta, activo
) on public.alumno to authenticated;

grant insert, update on public.alumno to authenticated;

create policy alumno_teacher_leer_activos on public.alumno
  for select to authenticated
  using (public.es_teacher() and activo);

create policy alumno_admin_leer_todos on public.alumno
  for select to authenticated
  using (public.es_administrator());

create policy alumno_admin_insertar on public.alumno
  for insert to authenticated
  with check (public.es_administrator());

create policy alumno_admin_actualizar on public.alumno
  for update to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());

-- (b) Vista de lectura completa, solo para administrator. Su propietario
-- es quien ejecuta esta migración (privilegios plenos sobre `alumno`), así
-- que ve todas las columnas sin depender de la RLS de la tabla base —
-- por eso el filtro de rol está escrito en la propia vista, no delegado.
create view public.alumno_ficha as
  select a.*
    from public.alumno a
   where public.es_administrator();

comment on view public.alumno_ficha is
  'Lectura completa de alumno (incluidas email_alumno/telefono_alumno), solo para administrator. '
  'El propio SELECT ya filtra por es_administrator(): a un teacher le devuelve cero filas, nunca un '
  'error, porque no es una tabla con GRANT restringido sino una vista que decide por sí misma qué '
  'enseña. El camino de teacher para leer alumnos sigue siendo la tabla base (columnas de '
  'identificación, filas activas). Nunca se escribe a través de esta vista: administrator inserta y '
  'actualiza contra la tabla base, donde sí tiene todas las columnas concedidas.';

grant select on public.alumno_ficha to authenticated;


-- ---------------------------------------------------------------------
-- 3. persona_referencia — solo administrator, lectura y escritura,
--    incluido DELETE (única tabla con borrado real, §0.2). Un teacher no
--    tiene ningún GRANT sobre esta tabla: no hace falta ninguna política
--    para que la ausencia de acceso sea un fallo real, no una fila vacía.
-- ---------------------------------------------------------------------

grant select, insert, update, delete on public.persona_referencia to authenticated;

create policy persona_referencia_admin_todo on public.persona_referencia
  for all to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());


-- ---------------------------------------------------------------------
-- 4. slot_horario — teacher lee los suyos; administrator lee y escribe
--    todos. Sin DELETE (el horario se versiona con vigente_hasta, nunca
--    se borra una fila, mismo criterio que el resto del esquema).
-- ---------------------------------------------------------------------

grant select, insert, update on public.slot_horario to authenticated;

create policy slot_horario_teacher_leer_propios on public.slot_horario
  for select to authenticated
  using (public.es_teacher() and profesor_id = auth.uid());

create policy slot_horario_admin_leer_todos on public.slot_horario
  for select to authenticated
  using (public.es_administrator());

create policy slot_horario_admin_insertar on public.slot_horario
  for insert to authenticated
  with check (public.es_administrator());

create policy slot_horario_admin_actualizar on public.slot_horario
  for update to authenticated
  using (public.es_administrator())
  with check (public.es_administrator());


-- ---------------------------------------------------------------------
-- 5. asistencia — solo lectura por RLS (el INSERT/UPDATE directo sigue
--    revocado desde 001: la única vía de escritura son las RPC
--    SECURITY DEFINER de T-18/T-21, que no necesitan estas políticas
--    porque corren con los privilegios de su propietario). Sin DELETE
--    para nadie, en ningún rol.
-- ---------------------------------------------------------------------

grant select on public.asistencia to authenticated;

create policy asistencia_teacher_leer_propias on public.asistencia
  for select to authenticated
  using (public.es_teacher() and profesor_id = auth.uid());

create policy asistencia_admin_leer_todas on public.asistencia
  for select to authenticated
  using (public.es_administrator());


-- ---------------------------------------------------------------------
-- 6. asistencia_historial — lectura solo administrator. Sin INSERT,
--    UPDATE ni DELETE para ningún rol de la API (estrictamente
--    append-only, solo el trigger de 001 escribe aquí).
-- ---------------------------------------------------------------------

grant select on public.asistencia_historial to authenticated;

create policy asistencia_historial_admin_leer on public.asistencia_historial
  for select to authenticated
  using (public.es_administrator());


-- ---------------------------------------------------------------------
-- 7. evento_error — lectura solo administrator. La escritura sigue siendo
--    exclusivamente la RPC registrar_evento_error (T-05), que no necesita
--    ninguna política nueva.
-- ---------------------------------------------------------------------

grant select on public.evento_error to authenticated;

create policy evento_error_admin_leer on public.evento_error
  for select to authenticated
  using (public.es_administrator());


-- ---------------------------------------------------------------------
-- 8. storage.objects — bucket avatares (privado, creado por T-14,
--    `004_bucket_avatares`). Las políticas se escriben desde ya para que
--    el bucket nunca exista sin RLS en vigor. La ruta es
--    `alumno/{alumno_id}/{uuid}/...` (T-14, requisito 2 de su spec);
--    `storage.foldername(name)` (función auxiliar que Supabase ya
--    instala en todo proyecto con Storage habilitado) devuelve los
--    segmentos de carpeta como array de texto, así que el segundo
--    elemento es el `alumno_id`.
-- ---------------------------------------------------------------------

create policy avatares_admin_leer on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and public.es_administrator());

create policy avatares_admin_escribir on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and public.es_administrator());

create policy avatares_admin_actualizar on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and public.es_administrator())
  with check (bucket_id = 'avatares' and public.es_administrator());

create policy avatares_admin_eliminar on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and public.es_administrator());

-- Ampliación deliberada (dueño, 2026-08-25): teacher SÍ lee el avatar,
-- pero solo de alumnos activos. Sin esta restricción, un profesor podría
-- pedir la foto de un alumno dado de baja sin ninguna necesidad real.
create policy avatares_teacher_leer_alumnos_activos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatares'
    and public.es_teacher()
    and exists (
      select 1
        from public.alumno a
       where a.id::text = (storage.foldername(name))[2]
         and a.activo
    )
  );


-- ---------------------------------------------------------------------
-- 9. Alta en el ledger — la añade el runner (ver cabecera). Nada que
--    hacer aquí dentro.
-- ---------------------------------------------------------------------
