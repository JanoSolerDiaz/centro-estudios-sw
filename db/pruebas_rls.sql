-- =====================================================================
-- GestorAcademia — pruebas_rls.sql (T-10, requisito 5 de su spec)
--
-- Batería de aislamiento ejecutable contra un proyecto REAL (`dev`,
-- nunca `prod`), lanzable con `npm run probar-rls`. NO es parte de
-- `npm test`: exige una conexión real (misma necesidad de credenciales
-- que `npm run migrate`), así que la ejecuta el dueño, nunca un agente
-- (§0.1 de HOJA_DE_RUTA.md, mismo régimen que `--verificar-privilegios`).
--
-- Qué hace: suplanta a un `administrator`, a uno o dos `teacher` y a un
-- `student` reales de la base de datos (localizados por su rol en
-- `perfil`, nunca inventados: crear usuarios de `auth.users` a mano desde
-- SQL es frágil y no es tarea de este script) usando la misma técnica que
-- usa PostgREST en cada petición: fijar `request.jwt.claims` y cambiar de
-- rol de Postgres a `authenticated` (o dejarlo en el rol de conexión para
-- simular `anon`). Cada comprobación queda registrada en la tabla
-- temporal `_resultados_prueba_rls`, que es lo único que el script
-- devuelve al final — el runner (`herramientas/probarRls.ts`) imprime esa
-- tabla y termina con código de salida distinto de cero si hay algún
-- `ok = false`.
--
-- TODO el script vive dentro de una única transacción que termina en
-- `rollback`: no deja ningún dato de prueba en la base, ni siquiera los
-- casos "permitido" que sí llegan a escribir de verdad durante la prueba.
--
-- Si en este entorno no existe todavía ningún usuario con un rol
-- necesario para una comprobación (el propio SEGUIMIENTO.md avisa: "hoy
-- no hay ningún teacher" a fecha de esta migración), esa comprobación se
-- registra como OMITIDA, no como fallo: no hay manera honesta de probar
-- el aislamiento de un rol que todavía no existe en la base de datos.
--
-- AVISO DE INCERTIDUMBRE (mismo espíritu que clienteManagementApi.ts):
-- este script no se ha podido ejecutar en esta sesión contra un proyecto
-- real (el agente nunca tiene esa credencial, §0.1). Está escrito siguiendo
-- la técnica documentada de Supabase para probar RLS desde el editor SQL
-- (fijar `request.jwt.claims` + `set local role authenticated`), pero la
-- primera ejecución del dueño es la que lo valida de verdad. Si algo no
-- cuadra, es la primera sospechosa antes que las guardas de contenido o
-- las políticas mismas.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Infraestructura de la prueba: resultados, helpers de impersonación
-- ---------------------------------------------------------------------

create temporary table _resultados_prueba_rls (
  orden      serial primary key,
  celda      text    not null,
  esperado   text    not null,
  ok         boolean not null,
  detalle    text
) on commit drop;

-- `registrar` y `omitir` se llaman con el rol YA cambiado a `authenticated` (lo hace
-- `pg_temp.impersonar`), y una tabla temporal no concede nada a otros roles por defecto. Sin
-- estos grants, el primer registro bajo impersonación aborta el script entero: ocurre dentro
-- del manejador `exception when others`, donde ya no queda nada que lo capture, y la Management
-- API devuelve 400 sin una sola fila de resultados. El grant sobre la secuencia es necesario
-- porque `orden` es `serial`: sin `usage` el INSERT sigue fallando. `anon` va incluido para
-- cuando se use `pg_temp.impersonar_anon()`. No debilita nada de lo que se prueba: es andamiaje
-- de test, sobre una tabla temporal, dentro de una transacción que termina en `rollback`.
grant insert, select on _resultados_prueba_rls to authenticated, anon;
grant usage, select on sequence _resultados_prueba_rls_orden_seq to authenticated, anon;

create temporary table _fixture_usuarios (
  rol text primary key,
  id  uuid
) on commit drop;

insert into _fixture_usuarios (rol, id) values
  ('administrator', (select id from public.perfil where rol = 'administrator' and activo and not bloqueado limit 1)),
  ('teacher',       (select id from public.perfil where rol = 'teacher'       and activo and not bloqueado limit 1)),
  ('teacher2',      (select id from public.perfil where rol = 'teacher'       and activo and not bloqueado
                       offset 1 limit 1)),
  ('student',       (select id from public.perfil where rol = 'student'      and activo and not bloqueado limit 1));

-- Impersona al usuario `p_rol` de _fixture_usuarios como PostgREST lo haría en una petición real:
-- fija `request.jwt.claims` con su `sub` y cambia el rol de Postgres a `authenticated`. Si no hay
-- ningún usuario con ese rol en este entorno, deja la sesión sin impersonar (el llamante debe
-- comprobar `pg_temp.hay_fixture(p_rol)` antes de usar una comprobación que lo necesite).
create or replace function pg_temp.impersonar(p_rol text) returns boolean
language plpgsql as $$
declare
  v_id uuid;
begin
  select id into v_id from _fixture_usuarios where rol = p_rol;
  if v_id is null then
    return false;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  return true;
end;
$$;

create or replace function pg_temp.impersonar_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
end;
$$;

create or replace function pg_temp.dejar_de_impersonar() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  reset role;
end;
$$;

create or replace function pg_temp.hay_fixture(p_rol text) returns boolean
language sql stable as $$
  select exists (select 1 from _fixture_usuarios where rol = p_rol and id is not null);
$$;

create or replace function pg_temp.registrar(p_celda text, p_esperado text, p_ok boolean, p_detalle text default null)
returns void language plpgsql as $$
begin
  insert into _resultados_prueba_rls (celda, esperado, ok, detalle) values (p_celda, p_esperado, p_ok, p_detalle);
end;
$$;

create or replace function pg_temp.omitir(p_celda text, p_motivo text) returns void
language plpgsql as $$
begin
  insert into _resultados_prueba_rls (celda, esperado, ok, detalle) values (p_celda, 'OMITIDO', true, p_motivo);
end;
$$;

reset role;


-- ---------------------------------------------------------------------
-- 1. centro_estudios
-- ---------------------------------------------------------------------

do $$
declare
  v_id uuid;
begin
  if not pg_temp.hay_fixture('administrator') then
    perform pg_temp.omitir('centro_estudios / administrator INSERT', 'no hay administrator en este entorno');
  else
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.centro_estudios (nombre) values ('__prueba_rls__centro_admin')
        returning id into v_id;
      perform pg_temp.registrar('centro_estudios / administrator INSERT', 'permitido', v_id is not null);
    exception when others then
      perform pg_temp.registrar('centro_estudios / administrator INSERT', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('centro_estudios / teacher INSERT (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      insert into public.centro_estudios (nombre) values ('__prueba_rls__centro_teacher');
      perform pg_temp.registrar('centro_estudios / teacher INSERT (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar('centro_estudios / teacher INSERT (debe fallar)', 'prohibido', true, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2. alumno — incluye el barrido de columnas de contacto (requisito 4)
-- ---------------------------------------------------------------------

do $$
declare
  v_centro_id  uuid;
  v_alumno_id  uuid;
  v_email      text;
begin
  select id into v_centro_id from public.centro_estudios where nombre = '__prueba_rls__centro_admin';
  if v_centro_id is null then
    perform pg_temp.omitir('alumno / administrator INSERT', 'no se pudo crear el centro de prueba (ver sección 1)');
    perform pg_temp.omitir('alumno / teacher lee columnas de contacto (debe fallar)', 'depende del alumno de prueba, no creado');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.alumno (nombre, primer_apellido, centro_referencia_id, email_alumno)
        values ('Prueba', 'RLS', v_centro_id, 'prueba.rls@example.invalid')
        returning id into v_alumno_id;
      perform pg_temp.registrar('alumno / administrator INSERT', 'permitido', v_alumno_id is not null);
    exception when others then
      perform pg_temp.registrar('alumno / administrator INSERT', 'permitido', false, sqlerrm);
    end;
    -- administrator lee la ficha completa (incluida la columna de contacto) por la vista dedicada.
    begin
      select email_alumno into v_email from public.alumno_ficha where id = v_alumno_id;
      perform pg_temp.registrar(
        'alumno_ficha / administrator lee email_alumno', 'permitido', v_email = 'prueba.rls@example.invalid'
      );
    exception when others then
      perform pg_temp.registrar('alumno_ficha / administrator lee email_alumno', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('alumno / administrator INSERT', 'no hay administrator en este entorno');
  end if;

  if v_alumno_id is null then
    perform pg_temp.omitir('alumno / teacher INSERT (debe fallar)', 'no se creó el alumno de prueba');
    perform pg_temp.omitir('alumno / teacher lee columnas de contacto (debe fallar)', 'no se creó el alumno de prueba');
    return;
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('alumno / teacher INSERT (debe fallar)', 'no hay teacher en este entorno');
    perform pg_temp.omitir('alumno / teacher lee columnas de contacto (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      insert into public.alumno (nombre, primer_apellido, centro_referencia_id)
        values ('Intruso', 'RLS', v_centro_id);
      perform pg_temp.registrar('alumno / teacher INSERT (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar('alumno / teacher INSERT (debe fallar)', 'prohibido', true, sqlerrm);
    end;

    -- El teacher SÍ debe poder leer las columnas de identificación de un alumno activo.
    begin
      perform 1 from public.alumno where id = v_alumno_id;
      perform pg_temp.registrar('alumno / teacher lee columnas de identificación', 'permitido', found);
    exception when others then
      perform pg_temp.registrar('alumno / teacher lee columnas de identificación', 'permitido', false, sqlerrm);
    end;

    -- Pero NO las columnas de contacto, ni siquiera de un alumno que sí puede ver.
    begin
      execute 'select email_alumno from public.alumno where id = $1' using v_alumno_id;
      perform pg_temp.registrar('alumno / teacher lee email_alumno (debe fallar)', 'prohibido', false, 'la consulta no lanzó error');
    exception when others then
      perform pg_temp.registrar('alumno / teacher lee email_alumno (debe fallar)', 'prohibido', true, sqlerrm);
    end;

    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 3. persona_referencia — barrido obligatorio del teacher (requisito 5)
-- ---------------------------------------------------------------------

do $$
declare
  v_alumno_id uuid;
  v_pr_id     uuid;
begin
  select id into v_alumno_id from public.alumno where nombre = 'Prueba' and primer_apellido = 'RLS';
  if v_alumno_id is null then
    perform pg_temp.omitir('persona_referencia / administrator INSERT', 'no se creó el alumno de prueba (sección 2)');
    perform pg_temp.omitir('persona_referencia / teacher SELECT (debe fallar)', 'no se creó el alumno de prueba');
    perform pg_temp.omitir('persona_referencia / teacher INSERT (debe fallar)', 'no se creó el alumno de prueba');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.persona_referencia (alumno_id, nombre, primer_apellido, telefono_referencia)
        values (v_alumno_id, 'Tutor', 'Prueba', '600000000')
        returning id into v_pr_id;
      perform pg_temp.registrar('persona_referencia / administrator INSERT', 'permitido', v_pr_id is not null);
    exception when others then
      perform pg_temp.registrar('persona_referencia / administrator INSERT', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('persona_referencia / administrator INSERT', 'no hay administrator en este entorno');
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('persona_referencia / teacher SELECT (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    declare
      v_vistas integer;
    begin
      select count(*) into v_vistas from public.persona_referencia where alumno_id = v_alumno_id;
      -- Bajo RLS, "prohibido" en un SELECT se manifiesta como cero filas, no como un error: el
      -- teacher no tiene ningún GRANT de fila que le deje ver esta tabla en absoluto.
      perform pg_temp.registrar('persona_referencia / teacher SELECT (debe fallar)', 'prohibido', v_vistas = 0);
    exception when others then
      -- Si además no hubiera GRANT de tabla en absoluto, fallaría con un error real: también cuenta
      -- como "prohibido" cumplido.
      perform pg_temp.registrar('persona_referencia / teacher SELECT (debe fallar)', 'prohibido', true, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- Requisito 4 de T-13: "un teacher no ve estos datos en ninguna pantalla ni por consulta
  -- directa" cubre lectura Y escritura. A diferencia del SELECT, un INSERT que viola RLS siempre
  -- lanza un error (no hay forma de que Postgres inserte una fila "en silencio" y luego la oculte),
  -- así que aquí no hace falta comprobar el recuento de filas: basta con que la excepción salte.
  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('persona_referencia / teacher INSERT (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      insert into public.persona_referencia (alumno_id, nombre, primer_apellido, telefono_referencia)
        values (v_alumno_id, 'Intento', 'Teacher', '600000001');
      perform pg_temp.registrar(
        'persona_referencia / teacher INSERT (debe fallar)', 'prohibido', false,
        'el INSERT se ejecutó sin lanzar ningún error, y debería haberlo hecho'
      );
    exception when others then
      perform pg_temp.registrar('persona_referencia / teacher INSERT (debe fallar)', 'prohibido', true, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 4. slot_horario
-- ---------------------------------------------------------------------

do $$
declare
  v_alumno_id  uuid;
  v_teacher_id uuid;
  v_slot_id    uuid;
begin
  select id into v_alumno_id from public.alumno where nombre = 'Prueba' and primer_apellido = 'RLS';
  select id into v_teacher_id from _fixture_usuarios where rol = 'teacher';

  if v_alumno_id is null or v_teacher_id is null then
    perform pg_temp.omitir('slot_horario / administrator INSERT', 'falta el alumno o el teacher de prueba');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.slot_horario (alumno_id, profesor_id, dia_semana, hora_inicio, hora_fin, vigente_desde)
        values (v_alumno_id, v_teacher_id, 1, '16:00', '17:00', current_date)
        returning id into v_slot_id;
      perform pg_temp.registrar('slot_horario / administrator INSERT', 'permitido', v_slot_id is not null);
    exception when others then
      perform pg_temp.registrar('slot_horario / administrator INSERT', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('slot_horario / administrator INSERT', 'no hay administrator en este entorno');
  end if;

  if v_slot_id is null then
    perform pg_temp.omitir('slot_horario / teacher lee el suyo', 'no se creó el slot de prueba');
    perform pg_temp.omitir('slot_horario / teacher2 no lee el ajeno', 'no se creó el slot de prueba');
    return;
  end if;

  perform pg_temp.impersonar('teacher');
  declare
    v_visto boolean;
  begin
    select exists(select 1 from public.slot_horario where id = v_slot_id) into v_visto;
    perform pg_temp.registrar('slot_horario / teacher lee el suyo', 'permitido', v_visto);
  exception when others then
    perform pg_temp.registrar('slot_horario / teacher lee el suyo', 'permitido', false, sqlerrm);
  end;
  perform pg_temp.dejar_de_impersonar();

  if not pg_temp.hay_fixture('teacher2') then
    perform pg_temp.omitir('slot_horario / teacher2 no lee el ajeno (debe fallar)', 'no hay un segundo teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher2');
    declare
      v_visto2 boolean;
    begin
      select exists(select 1 from public.slot_horario where id = v_slot_id) into v_visto2;
      perform pg_temp.registrar('slot_horario / teacher2 no lee el ajeno (debe fallar)', 'prohibido', not v_visto2);
    exception when others then
      perform pg_temp.registrar('slot_horario / teacher2 no lee el ajeno (debe fallar)', 'prohibido', true, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 5. asistencia / asistencia_historial — nadie escribe directamente,
--    ni siquiera administrator (solo las RPC de T-18/T-21, inexistentes
--    todavía).
-- ---------------------------------------------------------------------

do $$
begin
  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.asistencia (alumno_id, profesor_id, ocurrido_en, origen, peticion_id)
        values (gen_random_uuid(), gen_random_uuid(), now(), 'manual', gen_random_uuid());
      perform pg_temp.registrar('asistencia / administrator INSERT directo (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar('asistencia / administrator INSERT directo (debe fallar)', 'prohibido', true, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('asistencia / administrator INSERT directo (debe fallar)', 'no hay administrator en este entorno');
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.asistencia_historial (
        asistencia_id, alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen, estado, peticion_id
      ) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), now(), false, 'manual', 'valida', gen_random_uuid());
      perform pg_temp.registrar('asistencia_historial / administrator INSERT directo (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar('asistencia_historial / administrator INSERT directo (debe fallar)', 'prohibido', true, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 6. Barrido obligatorio de student: debe fallar en TODAS las tablas y
--    en el bucket (requisito 5). Sin excepción salvo su propia fila de
--    perfil, que no forma parte de este script (ya cubierta desde T-09).
-- ---------------------------------------------------------------------

do $$
declare
  v_tabla   text;
  v_n       integer;
begin
  if not pg_temp.hay_fixture('student') then
    perform pg_temp.omitir('barrido student / todas las tablas', 'no hay student en este entorno');
    return;
  end if;

  perform pg_temp.impersonar('student');
  foreach v_tabla in array array[
    'centro_estudios', 'alumno', 'persona_referencia', 'slot_horario', 'asistencia', 'asistencia_historial', 'evento_error'
  ]
  loop
    begin
      execute format('select count(*) from public.%I', v_tabla) into v_n;
      perform pg_temp.registrar(format('student SELECT %s (debe fallar)', v_tabla), 'prohibido', v_n = 0);
    exception when others then
      perform pg_temp.registrar(format('student SELECT %s (debe fallar)', v_tabla), 'prohibido', true, sqlerrm);
    end;
  end loop;
  perform pg_temp.dejar_de_impersonar();
end $$;


-- ---------------------------------------------------------------------
-- 7. Bucket avatares (storage.objects) — el bucket lo crea T-14
--    (`004_bucket_avatares`), todavía no aplicada cuando se escribe este
--    script. Las políticas ya existen (003_politicas_rls); lo que no
--    puede probarse hasta entonces es el caso con datos reales. Se deja
--    la comprobación lista y se omite explícitamente si el bucket o los
--    ficheros de prueba no existen todavía — no se fabrica un resultado.
-- ---------------------------------------------------------------------

do $$
declare
  v_bucket_existe boolean;
  v_alumno_id     uuid;
  v_ruta_activo   text;
  v_ruta_inactivo text;
begin
  select exists(select 1 from storage.buckets where id = 'avatares') into v_bucket_existe;
  if not v_bucket_existe then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'el bucket "avatares" todavía no existe (T-14)');
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'el bucket "avatares" todavía no existe (T-14)');
    perform pg_temp.omitir('avatares / teacher escribe (debe fallar)', 'el bucket "avatares" todavía no existe (T-14)');
    return;
  end if;

  select id into v_alumno_id from public.alumno where nombre = 'Prueba' and primer_apellido = 'RLS';

  -- No se sube ningún fichero real desde este script (el procesado de imagen es de cliente, T-14):
  -- solo se comprueba si YA hay algún objeto bajo una ruta de alumno activo/inactivo real para
  -- ejercitar la política; si no lo hay, se omite en vez de fabricar un falso positivo.
  select name into v_ruta_activo
    from storage.objects
   where bucket_id = 'avatares'
     and exists (
       select 1 from public.alumno a
        where a.id::text = (storage.foldername(storage.objects.name))[2] and a.activo
     )
   limit 1;

  select name into v_ruta_inactivo
    from storage.objects
   where bucket_id = 'avatares'
     and exists (
       select 1 from public.alumno a
        where a.id::text = (storage.foldername(storage.objects.name))[2] and not a.activo
     )
   limit 1;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'no hay teacher en este entorno');
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'no hay teacher en este entorno');
    perform pg_temp.omitir('avatares / teacher escribe (debe fallar)', 'no hay teacher en este entorno');
    return;
  end if;

  perform pg_temp.impersonar('teacher');

  if v_ruta_activo is null then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'no hay ningún avatar de alumno activo todavía');
  else
    declare v_n integer;
    begin
      select count(*) into v_n from storage.objects where bucket_id = 'avatares' and name = v_ruta_activo;
      perform pg_temp.registrar('avatares / teacher lee alumno activo', 'permitido', v_n = 1);
    exception when others then
      perform pg_temp.registrar('avatares / teacher lee alumno activo', 'permitido', false, sqlerrm);
    end;
  end if;

  if v_ruta_inactivo is null then
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'no hay ningún avatar de alumno inactivo todavía');
  else
    declare v_n integer;
    begin
      select count(*) into v_n from storage.objects where bucket_id = 'avatares' and name = v_ruta_inactivo;
      perform pg_temp.registrar('avatares / teacher lee alumno inactivo (debe fallar)', 'prohibido', v_n = 0);
    exception when others then
      perform pg_temp.registrar('avatares / teacher lee alumno inactivo (debe fallar)', 'prohibido', true, sqlerrm);
    end;
  end if;

  begin
    insert into storage.objects (bucket_id, name) values ('avatares', 'alumno/00000000-0000-0000-0000-000000000000/prueba/avatar.webp');
    perform pg_temp.registrar('avatares / teacher escribe (debe fallar)', 'prohibido', false, 'se insertó sin error');
  exception when others then
    perform pg_temp.registrar('avatares / teacher escribe (debe fallar)', 'prohibido', true, sqlerrm);
  end;

  perform pg_temp.dejar_de_impersonar();
end $$;


-- ---------------------------------------------------------------------
-- 8. Resultado final — lo único que ve `herramientas/probarRls.ts`.
--    NUNCA se llega a un commit: los datos de prueba desaparecen aunque
--    todo haya salido bien.
-- ---------------------------------------------------------------------

select celda, esperado, ok, detalle from _resultados_prueba_rls order by orden;

rollback;
