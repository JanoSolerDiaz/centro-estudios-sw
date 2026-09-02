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

-- Ids de los datos que la propia prueba crea. Las secciones se enlazan por id y NUNCA por una
-- clave natural: la 1b renombra el centro de prueba para ejercitar la política de UPDATE, así que
-- cualquier búsqueda posterior por su nombre original devuelve NULL y desactiva EN SILENCIO las
-- secciones 2, 3 y 4 — con la batería reportando igualmente 0 fallidas (P-08). Mismos grants que
-- la tabla de resultados, y por el mismo motivo: se escribe estando impersonado.
create temporary table _fixture_datos (
  clave text primary key,
  id    uuid
) on commit drop;

grant insert, select, update on _fixture_datos to authenticated, anon;

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

-- P-10: registrar un rechazo esperado EXIGIENDO su motivo. Un bloque `exception when others`
-- que apruebe con cualquier sqlerrm convierte un fallo de implementación en un falso verde: pasó
-- el 2026-09-01, cuando un bug de aplicar_limite_tasa() tumbó las trece comprobaciones de la
-- sección 7b y nueve cantaron [OK] porque "column reference is ambiguous" también es un error.
-- p_motivos_esperados es una lista de patrones ILIKE: basta que encaje uno. Para los rechazos de
-- autorización se pasan los dos mecanismos legítimos (política RLS o privilegio denegado): la
-- clase de error es lo que importa, cuál de los dos actúa no.
create or replace function pg_temp.registrar_prohibido(p_celda text, p_motivos_esperados text[], p_sqlerrm text)
returns void language plpgsql as $$
declare
  v_ok boolean := exists (select 1 from unnest(p_motivos_esperados) as m where p_sqlerrm ilike m);
begin
  insert into _resultados_prueba_rls (celda, esperado, ok, detalle) values (
    p_celda, 'prohibido', v_ok,
    case when v_ok then p_sqlerrm
         else 'ERROR INESPERADO — se esperaba ' || array_to_string(p_motivos_esperados, ' o ') ||
              ' y llego: ' || p_sqlerrm end
  );
end;
$$;

create or replace function pg_temp.omitir(p_celda text, p_motivo text) returns void
language plpgsql as $$
begin
  insert into _resultados_prueba_rls (celda, esperado, ok, detalle) values (p_celda, 'OMITIDO', true, p_motivo);
end;
$$;

create or replace function pg_temp.recordar_dato(p_clave text, p_id uuid) returns void
language plpgsql as $$
begin
  insert into _fixture_datos (clave, id) values (p_clave, p_id)
    on conflict (clave) do update set id = excluded.id;
end;
$$;

create or replace function pg_temp.dato(p_clave text) returns uuid
language sql stable as $$
  select id from _fixture_datos where clave = p_clave;
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
      perform pg_temp.recordar_dato('centro_admin', v_id);
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
      perform pg_temp.registrar_prohibido('centro_estudios / teacher INSERT (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1b. centro_estudios — UPDATE: la política centro_estudios_admin_actualizar
--     no tenía ningún caso que la ejercitara (hallazgo #2 de auditoriacontinua.md)
-- ---------------------------------------------------------------------

do $$
declare
  v_centro_id uuid;
  v_filas     integer;
begin
  v_centro_id := pg_temp.dato('centro_admin');
  if v_centro_id is null then
    perform pg_temp.omitir('centro_estudios / administrator UPDATE', 'no se creó el centro de prueba (sección 1)');
    perform pg_temp.omitir('centro_estudios / teacher UPDATE (debe fallar)', 'no se creó el centro de prueba (sección 1)');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      update public.centro_estudios set nombre = '__prueba_rls__centro_admin_editado' where id = v_centro_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('centro_estudios / administrator UPDATE', 'permitido', v_filas = 1);
    exception when others then
      perform pg_temp.registrar('centro_estudios / administrator UPDATE', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('centro_estudios / administrator UPDATE', 'no hay administrator en este entorno');
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('centro_estudios / teacher UPDATE (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      update public.centro_estudios set nombre = '__prueba_rls__centro_teacher_intento' where id = v_centro_id;
      get diagnostics v_filas = row_count;
      -- Bajo RLS, "prohibido" en un UPDATE se manifiesta como cero filas afectadas, no como un
      -- error: la política de administrator excluye la fila del USING antes de tocarla.
      perform pg_temp.registrar('centro_estudios / teacher UPDATE (debe fallar)', 'prohibido', v_filas = 0);
    exception when others then
      perform pg_temp.registrar_prohibido('centro_estudios / teacher UPDATE (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
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
  v_centro_id := pg_temp.dato('centro_admin');
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
      perform pg_temp.recordar_dato('alumno_prueba', v_alumno_id);
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
      perform pg_temp.registrar_prohibido('alumno / teacher INSERT (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
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
      perform pg_temp.registrar_prohibido('alumno / teacher lee email_alumno (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;

    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2b. alumno — UPDATE: la política alumno_admin_actualizar no tenía ningún
--     caso que la ejercitara (hallazgo #2 de auditoriacontinua.md)
-- ---------------------------------------------------------------------

do $$
declare
  v_alumno_id uuid;
  v_filas     integer;
begin
  v_alumno_id := pg_temp.dato('alumno_prueba');
  if v_alumno_id is null then
    perform pg_temp.omitir('alumno / administrator UPDATE', 'no se creó el alumno de prueba (sección 2)');
    perform pg_temp.omitir('alumno / teacher UPDATE (debe fallar)', 'no se creó el alumno de prueba (sección 2)');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      update public.alumno set segundo_apellido = 'Editado' where id = v_alumno_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('alumno / administrator UPDATE', 'permitido', v_filas = 1);
    exception when others then
      perform pg_temp.registrar('alumno / administrator UPDATE', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('alumno / administrator UPDATE', 'no hay administrator en este entorno');
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('alumno / teacher UPDATE (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      update public.alumno set segundo_apellido = 'Intruso' where id = v_alumno_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('alumno / teacher UPDATE (debe fallar)', 'prohibido', v_filas = 0);
    exception when others then
      perform pg_temp.registrar_prohibido('alumno / teacher UPDATE (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
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
  v_filas     integer;
begin
  v_alumno_id := pg_temp.dato('alumno_prueba');
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
      perform pg_temp.registrar_prohibido('persona_referencia / teacher SELECT (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
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
      perform pg_temp.registrar_prohibido('persona_referencia / teacher INSERT (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- UPDATE y DELETE: persona_referencia_admin_todo es la única política `for
  -- all` de todo el esquema y no tenía ningún caso, ni positivo ni negativo,
  -- que la ejercitara en esas dos operaciones (hallazgo #2 de
  -- auditoriacontinua.md). DELETE es además la única tabla del sistema con
  -- borrado real (§0.2), así que es la que más lo necesitaba.
  if v_pr_id is null then
    perform pg_temp.omitir('persona_referencia / administrator UPDATE', 'no se creó la persona de referencia de prueba');
    perform pg_temp.omitir('persona_referencia / teacher UPDATE (debe fallar)', 'no se creó la persona de referencia de prueba');
    perform pg_temp.omitir('persona_referencia / teacher DELETE (debe fallar)', 'no se creó la persona de referencia de prueba');
    perform pg_temp.omitir('persona_referencia / administrator DELETE', 'no se creó la persona de referencia de prueba');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      update public.persona_referencia set telefono_referencia = '600000099' where id = v_pr_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('persona_referencia / administrator UPDATE', 'permitido', v_filas = 1);
    exception when others then
      perform pg_temp.registrar('persona_referencia / administrator UPDATE', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('persona_referencia / administrator UPDATE', 'no hay administrator en este entorno');
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('persona_referencia / teacher UPDATE (debe fallar)', 'no hay teacher en este entorno');
    perform pg_temp.omitir('persona_referencia / teacher DELETE (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      update public.persona_referencia set telefono_referencia = '600000098' where id = v_pr_id;
      get diagnostics v_filas = row_count;
      -- Igual que en el SELECT de arriba: bajo RLS, "prohibido" en un UPDATE/DELETE de una
      -- política `for all` se manifiesta como cero filas afectadas, no como un error.
      perform pg_temp.registrar('persona_referencia / teacher UPDATE (debe fallar)', 'prohibido', v_filas = 0);
    exception when others then
      perform pg_temp.registrar_prohibido('persona_referencia / teacher UPDATE (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;

    begin
      delete from public.persona_referencia where id = v_pr_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('persona_referencia / teacher DELETE (debe fallar)', 'prohibido', v_filas = 0);
    exception when others then
      perform pg_temp.registrar_prohibido('persona_referencia / teacher DELETE (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- DELETE real por administrator: cierra el barrido de la única política `for all` del esquema.
  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      delete from public.persona_referencia where id = v_pr_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('persona_referencia / administrator DELETE', 'permitido', v_filas = 1);
    exception when others then
      perform pg_temp.registrar('persona_referencia / administrator DELETE', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('persona_referencia / administrator DELETE', 'no hay administrator en este entorno');
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
  v_alumno_id := pg_temp.dato('alumno_prueba');
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
      perform pg_temp.recordar_dato('slot_prueba', v_slot_id);
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
      perform pg_temp.registrar_prohibido('slot_horario / teacher2 no lee el ajeno (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 4b. slot_horario — UPDATE: la política slot_horario_admin_actualizar no
--     tenía ningún caso que la ejercitara (hallazgo #2 de auditoriacontinua.md)
-- ---------------------------------------------------------------------

do $$
declare
  v_slot_id uuid;
  v_filas   integer;
begin
  v_slot_id := pg_temp.dato('slot_prueba');
  if v_slot_id is null then
    perform pg_temp.omitir('slot_horario / administrator UPDATE', 'no se creó el slot de prueba (sección 4)');
    perform pg_temp.omitir('slot_horario / teacher UPDATE (debe fallar)', 'no se creó el slot de prueba (sección 4)');
    return;
  end if;

  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      update public.slot_horario set hora_fin = '18:00' where id = v_slot_id;
      get diagnostics v_filas = row_count;
      perform pg_temp.registrar('slot_horario / administrator UPDATE', 'permitido', v_filas = 1);
    exception when others then
      perform pg_temp.registrar('slot_horario / administrator UPDATE', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('slot_horario / administrator UPDATE', 'no hay administrator en este entorno');
  end if;

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('slot_horario / teacher UPDATE (debe fallar)', 'no hay teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher');
    begin
      update public.slot_horario set hora_fin = '19:00' where id = v_slot_id;
      get diagnostics v_filas = row_count;
      -- Un teacher SÍ tiene GRANT de UPDATE sobre esta tabla (compartido con administrator vía
      -- `authenticated`); lo que lo excluye es el USING de la política, no la falta de privilegio.
      perform pg_temp.registrar('slot_horario / teacher UPDATE (debe fallar)', 'prohibido', v_filas = 0);
    exception when others then
      perform pg_temp.registrar_prohibido('slot_horario / teacher UPDATE (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 5. asistencia / asistencia_historial — nadie escribe directamente, ni
--    siquiera administrator: la única vía de escritura son las RPC
--    SECURITY DEFINER registrar_asistencia (T-18) y actualizar_asistencia
--    (T-21, db/008_rpc_actualizar_asistencia.sql), probadas en las
--    secciones 7b y 8c más abajo. Aquí se prueba justo lo contrario: que
--    el camino directo (INSERT/UPDATE/DELETE sobre la tabla, sin pasar
--    por ninguna RPC) sigue cerrado incluso para administrator — el
--    caso explícito que pide el criterio de aceptación de T-21 ("UPDATE
--    directo, DELETE... rechazados").
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
      perform pg_temp.registrar_prohibido('asistencia / administrator INSERT directo (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
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
      perform pg_temp.registrar_prohibido('asistencia_historial / administrator INSERT directo (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- UPDATE/DELETE directo (T-21, criterio de aceptación): ni siquiera administrator, aunque exista
  -- una fila real que tocar (slot_prueba, si la sección 4/7b llegaron a crear un registro sobre
  -- ella) — igual de prohibido si no existe ninguna, porque revoke all corta ANTES de llegar a
  -- evaluar qué filas afectaría.
  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      update public.asistencia set nota = 'intento directo' where true;
      perform pg_temp.registrar('asistencia / administrator UPDATE directo (debe fallar)', 'prohibido', false, 'se actualizó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('asistencia / administrator UPDATE directo (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    begin
      delete from public.asistencia where true;
      perform pg_temp.registrar('asistencia / administrator DELETE (debe fallar)', 'prohibido', false, 'se borró sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('asistencia / administrator DELETE (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('asistencia / administrator UPDATE directo (debe fallar)', 'no hay administrator en este entorno');
    perform pg_temp.omitir('asistencia / administrator DELETE (debe fallar)', 'no hay administrator en este entorno');
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
    'centro_estudios', 'alumno', 'persona_referencia', 'slot_horario', 'asistencia', 'asistencia_historial',
    'evento_error', 'limite_tasa'
  ]
  loop
    begin
      execute format('select count(*) from public.%I', v_tabla) into v_n;
      perform pg_temp.registrar(format('student SELECT %s (debe fallar)', v_tabla), 'prohibido', v_n = 0);
    exception when others then
      perform pg_temp.registrar_prohibido(format('student SELECT %s (debe fallar)', v_tabla), array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
  end loop;
  perform pg_temp.dejar_de_impersonar();
end $$;


-- ---------------------------------------------------------------------
-- 7. Bucket avatares (storage.objects) — el bucket lo crea T-14
--    (`004_bucket_avatares`, ya aplicada). Las políticas ya existían desde
--    `003_politicas_rls`. Lo que se audita aquí es una POLÍTICA sobre la
--    FILA de `storage.objects`, no los bytes del fichero: en vez de
--    depender de que alguien haya subido ya un avatar real por la interfaz
--    (T-16, todavía sin escribir), la propia prueba crea sus dos fixtures
--    — un alumno activo (reutiliza el de la sección 2) y uno recién dado
--    de baja, propio de esta sección — e inserta una fila de
--    `storage.objects` bajo la ruta de cada uno, dentro de la misma
--    transacción que termina en `rollback` (P-09, hallazgo de cobertura:
--    "las dos lecturas no se ejercitarán nunca por sí solas").
-- ---------------------------------------------------------------------

do $$
declare
  v_bucket_existe   boolean;
  v_centro_id       uuid;
  v_alumno_activo   uuid;
  v_alumno_inactivo uuid;
  v_ruta_activo     text;
  v_ruta_inactivo   text;
begin
  select exists(select 1 from storage.buckets where id = 'avatares') into v_bucket_existe;
  if not v_bucket_existe then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'el bucket "avatares" todavía no existe (T-14)');
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'el bucket "avatares" todavía no existe (T-14)');
    perform pg_temp.omitir('avatares / teacher escribe (debe fallar)', 'el bucket "avatares" todavía no existe (T-14)');
    return;
  end if;

  v_centro_id := pg_temp.dato('centro_admin');
  v_alumno_activo := pg_temp.dato('alumno_prueba');

  if not pg_temp.hay_fixture('administrator') or v_centro_id is null or v_alumno_activo is null then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'no hay administrator o alumno de prueba (secciones 1/2) en este entorno');
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'no hay administrator o alumno de prueba (secciones 1/2) en este entorno');
    perform pg_temp.omitir('avatares / teacher escribe (debe fallar)', 'no hay administrator en este entorno');
    return;
  end if;

  -- Fixtures propios de esta sección (P-09): un segundo alumno YA dado de baja, y una fila de
  -- `storage.objects` bajo la ruta de cada uno de los dos alumnos. Ambos INSERT los hace el
  -- `administrator` (única política de escritura del bucket) — nunca se sube ningún fichero real.
  perform pg_temp.impersonar('administrator');

  begin
    insert into public.alumno (nombre, primer_apellido, centro_referencia_id, activo, baja_en)
      values ('PruebaBaja', 'RLS', v_centro_id, false, now())
      returning id into v_alumno_inactivo;
  exception when others then
    v_alumno_inactivo := null;
  end;

  -- Recordado por id (no solo por la variable local de este bloque) para que la sección 7b
  -- (T-18, registrar_asistencia) pueda reutilizar el mismo alumno dado de baja sin crear otro.
  perform pg_temp.recordar_dato('alumno_inactivo', v_alumno_inactivo);

  if v_alumno_inactivo is not null then
    v_ruta_activo := 'alumno/' || v_alumno_activo::text || '/prueba-rls/avatar-mini.webp';
    v_ruta_inactivo := 'alumno/' || v_alumno_inactivo::text || '/prueba-rls/avatar-mini.webp';
    begin
      insert into storage.objects (bucket_id, name) values ('avatares', v_ruta_activo);
      insert into storage.objects (bucket_id, name) values ('avatares', v_ruta_inactivo);
    exception when others then
      v_ruta_activo := null;
      v_ruta_inactivo := null;
    end;
  end if;

  perform pg_temp.dejar_de_impersonar();

  if not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'no hay teacher en este entorno');
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'no hay teacher en este entorno');
    perform pg_temp.omitir('avatares / teacher escribe (debe fallar)', 'no hay teacher en este entorno');
    return;
  end if;

  perform pg_temp.impersonar('teacher');

  if v_ruta_activo is null then
    perform pg_temp.omitir('avatares / teacher lee alumno activo', 'no se pudo crear el fixture del alumno dado de baja (ver más arriba)');
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
    perform pg_temp.omitir('avatares / teacher lee alumno inactivo (debe fallar)', 'no se pudo crear el fixture del alumno dado de baja (ver más arriba)');
  else
    declare v_n integer;
    begin
      select count(*) into v_n from storage.objects where bucket_id = 'avatares' and name = v_ruta_inactivo;
      perform pg_temp.registrar('avatares / teacher lee alumno inactivo (debe fallar)', 'prohibido', v_n = 0);
    exception when others then
      perform pg_temp.registrar_prohibido('avatares / teacher lee alumno inactivo (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
    end;
  end if;

  begin
    insert into storage.objects (bucket_id, name) values ('avatares', 'alumno/00000000-0000-0000-0000-000000000000/prueba/avatar.webp');
    perform pg_temp.registrar('avatares / teacher escribe (debe fallar)', 'prohibido', false, 'se insertó sin error');
  exception when others then
    perform pg_temp.registrar_prohibido('avatares / teacher escribe (debe fallar)', array['%row-level security%', '%permission denied%'], sqlerrm);
  end;

  perform pg_temp.dejar_de_impersonar();
end $$;


-- ---------------------------------------------------------------------
-- 7b. registrar_asistencia (T-18, db/005_rpc_registrar_asistencia.sql) —
--     la única vía de alta de asistencia. Reutiliza los fixtures ya
--     creados por las secciones 2 (alumno_prueba), 4 (slot_prueba, del
--     'teacher') y 7 (alumno_inactivo): ninguno se vuelve a crear aquí.
-- ---------------------------------------------------------------------

do $$
declare
  v_alumno_id       uuid := pg_temp.dato('alumno_prueba');
  v_alumno_inactivo uuid := pg_temp.dato('alumno_inactivo');
  v_slot_id         uuid := pg_temp.dato('slot_prueba');
  v_teacher_id      uuid;
  v_fila            public.asistencia%rowtype;
begin
  select id into v_teacher_id from _fixture_usuarios where rol = 'teacher';

  if v_alumno_id is null or not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('registrar_asistencia / teacher registra en vivo (manual)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / teacher registra por slot', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / duplicado mismo alumno+slot+día (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / mismo peticion_id repetido (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / alumno inactivo (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / slot de otro profesor (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / teacher no puede registrar en nombre de otro (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / administrator registra en nombre de teacher', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / ocurrido_en en el futuro (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / origen "slot" sin slot_id (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / registro retroactivo marca es_retroactivo', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / ventana retroactiva máxima excedida (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('registrar_asistencia / student no puede llamar (debe fallar)', 'falta el alumno o el teacher de prueba');
    return;
  end if;

  -- En vivo, origen manual.
  perform pg_temp.impersonar('teacher');
  begin
    select * into v_fila from public.registrar_asistencia(
      p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid()
    );
    perform pg_temp.registrar(
      'registrar_asistencia / teacher registra en vivo (manual)', 'permitido',
      v_fila.profesor_id = v_teacher_id and v_fila.es_retroactivo = false and v_fila.slot_id is null
    );
  exception when others then
    perform pg_temp.registrar('registrar_asistencia / teacher registra en vivo (manual)', 'permitido', false, sqlerrm);
  end;

  -- Registro retroactivo (2 horas atrás): debe marcar es_retroactivo, y seguir aceptándose.
  begin
    select * into v_fila from public.registrar_asistencia(
      p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid(),
      p_ocurrido_en => now() - interval '2 hours'
    );
    perform pg_temp.registrar(
      'registrar_asistencia / registro retroactivo marca es_retroactivo', 'permitido', v_fila.es_retroactivo = true
    );
  exception when others then
    perform pg_temp.registrar('registrar_asistencia / registro retroactivo marca es_retroactivo', 'permitido', false, sqlerrm);
  end;

  -- Ventana retroactiva máxima excedida (30 días): debe rechazarse.
  begin
    perform public.registrar_asistencia(
      p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid(),
      p_ocurrido_en => now() - interval '30 days'
    );
    perform pg_temp.registrar(
      'registrar_asistencia / ventana retroactiva máxima excedida (debe fallar)', 'prohibido', false, 'se insertó sin error'
    );
  exception when others then
    perform pg_temp.registrar_prohibido('registrar_asistencia / ventana retroactiva máxima excedida (debe fallar)', array['%supera la ventana permitida%'], sqlerrm);
  end;

  -- ocurrido_en en el futuro: debe rechazarse.
  begin
    perform public.registrar_asistencia(
      p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid(),
      p_ocurrido_en => now() + interval '1 hour'
    );
    perform pg_temp.registrar('registrar_asistencia / ocurrido_en en el futuro (debe fallar)', 'prohibido', false, 'se insertó sin error');
  exception when others then
    perform pg_temp.registrar_prohibido('registrar_asistencia / ocurrido_en en el futuro (debe fallar)', array['%no puede estar en el futuro%'], sqlerrm);
  end;

  -- origen "slot" sin slot_id: debe rechazarse.
  begin
    perform public.registrar_asistencia(p_alumno_id => v_alumno_id, p_origen => 'slot', p_peticion_id => gen_random_uuid());
    perform pg_temp.registrar('registrar_asistencia / origen "slot" sin slot_id (debe fallar)', 'prohibido', false, 'se insertó sin error');
  exception when others then
    perform pg_temp.registrar_prohibido('registrar_asistencia / origen "slot" sin slot_id (debe fallar)', array['%exige slot_id%'], sqlerrm);
  end;

  -- alumno inactivo: debe rechazarse.
  if v_alumno_inactivo is null then
    perform pg_temp.omitir('registrar_asistencia / alumno inactivo (debe fallar)', 'no se creó el alumno dado de baja (sección 7)');
  else
    begin
      perform public.registrar_asistencia(p_alumno_id => v_alumno_inactivo, p_origen => 'manual', p_peticion_id => gen_random_uuid());
      perform pg_temp.registrar('registrar_asistencia / alumno inactivo (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('registrar_asistencia / alumno inactivo (debe fallar)', array['%dado de baja%'], sqlerrm);
    end;
  end if;

  -- teacher intenta registrar en nombre de otro profesor: debe rechazarse (no depende de que exista teacher2).
  begin
    perform public.registrar_asistencia(
      p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid(), p_profesor_id => gen_random_uuid()
    );
    perform pg_temp.registrar('registrar_asistencia / teacher no puede registrar en nombre de otro (debe fallar)', 'prohibido', false, 'se insertó sin error');
  exception when others then
    perform pg_temp.registrar_prohibido('registrar_asistencia / teacher no puede registrar en nombre de otro (debe fallar)', array['%solo un administrador puede registrar en nombre de otro%'], sqlerrm);
  end;

  perform pg_temp.dejar_de_impersonar();

  -- Por slot: origen='slot', slot_prueba (del 'teacher'), mismo alumno del slot.
  if v_slot_id is null then
    perform pg_temp.omitir('registrar_asistencia / teacher registra por slot', 'no se creó el slot de prueba (sección 4)');
    perform pg_temp.omitir('registrar_asistencia / duplicado mismo alumno+slot+día (debe fallar)', 'no se creó el slot de prueba (sección 4)');
    perform pg_temp.omitir('registrar_asistencia / mismo peticion_id repetido (debe fallar)', 'no se creó el slot de prueba (sección 4)');
  else
    declare
      v_peticion_original uuid := gen_random_uuid();
    begin
      perform pg_temp.impersonar('teacher');
      begin
        select * into v_fila from public.registrar_asistencia(
          p_alumno_id => v_alumno_id, p_origen => 'slot', p_peticion_id => v_peticion_original, p_slot_id => v_slot_id
        );
        perform pg_temp.registrar(
          'registrar_asistencia / teacher registra por slot', 'permitido',
          v_fila.slot_id = v_slot_id and v_fila.slot_dia_semana = 1
        );
      exception when others then
        perform pg_temp.registrar('registrar_asistencia / teacher registra por slot', 'permitido', false, sqlerrm);
      end;

      -- Segundo registro del MISMO alumno en el MISMO slot el MISMO día, con un peticion_id
      -- distinto: choca con asistencia_uq_alumno_slot_dia_valida (requisito 4 de T-18).
      begin
        perform public.registrar_asistencia(
          p_alumno_id => v_alumno_id, p_origen => 'slot', p_peticion_id => gen_random_uuid(), p_slot_id => v_slot_id
        );
        perform pg_temp.registrar('registrar_asistencia / duplicado mismo alumno+slot+día (debe fallar)', 'prohibido', false, 'se insertó sin error');
      exception when others then
        perform pg_temp.registrar_prohibido('registrar_asistencia / duplicado mismo alumno+slot+día (debe fallar)', array['%asistencia_uq_alumno_slot_dia_valida%'], sqlerrm);
      end;

      -- Mismo peticion_id que el primer registro exitoso: choca con asistencia_peticion_id_unico.
      begin
        perform public.registrar_asistencia(
          p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => v_peticion_original
        );
        perform pg_temp.registrar('registrar_asistencia / mismo peticion_id repetido (debe fallar)', 'prohibido', false, 'se insertó sin error');
      exception when others then
        perform pg_temp.registrar_prohibido('registrar_asistencia / mismo peticion_id repetido (debe fallar)', array['%asistencia_peticion_id_unico%'], sqlerrm);
      end;

      perform pg_temp.dejar_de_impersonar();
    end;
  end if;

  -- slot de otro profesor: slot_prueba pertenece a 'teacher', no a 'teacher2'.
  if v_slot_id is null or not pg_temp.hay_fixture('teacher2') then
    perform pg_temp.omitir('registrar_asistencia / slot de otro profesor (debe fallar)', 'no hay slot de prueba o un segundo teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher2');
    begin
      perform public.registrar_asistencia(
        p_alumno_id => v_alumno_id, p_origen => 'slot', p_peticion_id => gen_random_uuid(), p_slot_id => v_slot_id
      );
      perform pg_temp.registrar('registrar_asistencia / slot de otro profesor (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('registrar_asistencia / slot de otro profesor (debe fallar)', array['%pertenece a otro profesor%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- administrator registra EN NOMBRE de 'teacher' (requisito 2 de T-18).
  if not pg_temp.hay_fixture('administrator') then
    perform pg_temp.omitir('registrar_asistencia / administrator registra en nombre de teacher', 'no hay administrator en este entorno');
  else
    perform pg_temp.impersonar('administrator');
    begin
      select * into v_fila from public.registrar_asistencia(
        p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid(), p_profesor_id => v_teacher_id
      );
      perform pg_temp.registrar(
        'registrar_asistencia / administrator registra en nombre de teacher', 'permitido', v_fila.profesor_id = v_teacher_id
      );
    exception when others then
      perform pg_temp.registrar('registrar_asistencia / administrator registra en nombre de teacher', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- student: sin acceso alguno (§0.2), tampoco a esta RPC.
  if not pg_temp.hay_fixture('student') then
    perform pg_temp.omitir('registrar_asistencia / student no puede llamar (debe fallar)', 'no hay student en este entorno');
  else
    perform pg_temp.impersonar('student');
    begin
      perform public.registrar_asistencia(p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid());
      perform pg_temp.registrar('registrar_asistencia / student no puede llamar (debe fallar)', 'prohibido', false, 'se insertó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('registrar_asistencia / student no puede llamar (debe fallar)', array['%solo administrator o teacher pueden registrar%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 8. TRUNCATE por authenticated — debe fallar en TODAS las tablas del
--    esquema, para CUALQUIER rol de aplicación (administrator incluido):
--    es un privilegio de tabla que RLS no filtra en absoluto (`TRUNCATE`
--    ignora las políticas por completo), así que lo que se comprueba es la
--    ausencia del GRANT, no una condición de `es_administrator()`. Ya
--    ocurrió una vez en el arranque (`perfil`, corregido en
--    `000b_arreglo_permisos.sql`): es el fallo más grave que puede tener
--    este proyecto (hallazgo #2 de auditoriacontinua.md, era el único caso
--    que esta batería no ejercitaba en absoluto).
-- ---------------------------------------------------------------------

do $$
declare
  v_tabla text;
  v_rol   text;
begin
  foreach v_tabla in array array[
    'perfil', 'centro_estudios', 'alumno', 'persona_referencia', 'slot_horario',
    'asistencia', 'asistencia_historial', 'evento_error', 'limite_tasa'
  ]
  loop
    foreach v_rol in array array['administrator', 'teacher']
    loop
      if not pg_temp.hay_fixture(v_rol) then
        perform pg_temp.omitir(
          format('%s TRUNCATE %s (debe fallar)', v_rol, v_tabla), format('no hay %s en este entorno', v_rol)
        );
        continue;
      end if;
      perform pg_temp.impersonar(v_rol);
      begin
        execute format('truncate public.%I', v_tabla);
        perform pg_temp.registrar(
          format('%s TRUNCATE %s (debe fallar)', v_rol, v_tabla), 'prohibido', false, 'se truncó sin error'
        );
      exception when others then
        perform pg_temp.registrar_prohibido(format('%s TRUNCATE %s (debe fallar)', v_rol, v_tabla), array['%row-level security%', '%permission denied%'], sqlerrm);
      end;
      perform pg_temp.dejar_de_impersonar();
    end loop;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 8b. buscar_alumnos_activos (T-20, db/007_rpc_buscar_alumnos.sql) —
--     reutiliza alumno_prueba (sección 2, activo, apellido "RLS") y
--     alumno_inactivo (sección 7, mismo apellido "RLS", dado de baja):
--     ninguno se vuelve a crear aquí. Buscar "RLS" debe encontrar el
--     primero y nunca el segundo.
-- ---------------------------------------------------------------------

do $$
declare
  v_alumno_activo   uuid := pg_temp.dato('alumno_prueba');
  v_alumno_inactivo uuid := pg_temp.dato('alumno_inactivo');
  v_filas           jsonb;
begin
  if v_alumno_activo is null or not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('buscar_alumnos_activos / teacher encuentra activo con centro', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('buscar_alumnos_activos / alumno inactivo no aparece', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('buscar_alumnos_activos / respuesta sin contacto ni personas de referencia', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('buscar_alumnos_activos / texto vacío no consulta nada (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('buscar_alumnos_activos / student no puede llamar (debe fallar)', 'falta el alumno o el teacher de prueba');
    return;
  end if;

  -- teacher encuentra al activo, con el nombre del centro para desambiguar homónimos.
  perform pg_temp.impersonar('teacher');
  begin
    select jsonb_agg(to_jsonb(t)) into v_filas
      from public.buscar_alumnos_activos('RLS', 8) as t;
    perform pg_temp.registrar(
      'buscar_alumnos_activos / teacher encuentra activo con centro', 'permitido',
      v_filas is not null
        and jsonb_path_exists(v_filas, '$[*] ? (@.id == $id)', jsonb_build_object('id', v_alumno_activo::text))
        and (v_filas -> 0 ? 'centro_nombre') and (v_filas -> 0 ->> 'centro_nombre') is not null,
      v_filas::text
    );
  exception when others then
    perform pg_temp.registrar('buscar_alumnos_activos / teacher encuentra activo con centro', 'permitido', false, sqlerrm);
  end;

  -- El alumno dado de baja (mismo apellido "RLS") nunca aparece, aunque el texto lo encontraría.
  begin
    select jsonb_agg(to_jsonb(t)) into v_filas
      from public.buscar_alumnos_activos('RLS', 8) as t;
    perform pg_temp.registrar(
      'buscar_alumnos_activos / alumno inactivo no aparece', 'permitido',
      v_alumno_inactivo is null
        or not jsonb_path_exists(v_filas, '$[*] ? (@.id == $id)', jsonb_build_object('id', v_alumno_inactivo::text)),
      v_filas::text
    );
  exception when others then
    perform pg_temp.registrar('buscar_alumnos_activos / alumno inactivo no aparece', 'permitido', false, sqlerrm);
  end;

  -- Requisito 3 de T-20: nunca contacto ni personas de referencia — el tipo de retorno de la
  -- función ya lo garantiza estructuralmente; esta comprobación lo deja trazado en ejecución.
  begin
    select jsonb_agg(to_jsonb(t)) into v_filas
      from public.buscar_alumnos_activos('RLS', 8) as t;
    perform pg_temp.registrar(
      'buscar_alumnos_activos / respuesta sin contacto ni personas de referencia', 'permitido',
      v_filas is not null
        and not (v_filas -> 0 ? 'email_alumno')
        and not (v_filas -> 0 ? 'telefono_alumno')
        and not (v_filas -> 0 ? 'avatar_ruta')
        and not (v_filas -> 0 ? 'personas_referencia'),
      v_filas::text
    );
  exception when others then
    perform pg_temp.registrar('buscar_alumnos_activos / respuesta sin contacto ni personas de referencia', 'permitido', false, sqlerrm);
  end;

  -- Texto vacío: cero filas, no un error ni "todos los alumnos".
  begin
    select jsonb_agg(to_jsonb(t)) into v_filas
      from public.buscar_alumnos_activos('   ', 8) as t;
    perform pg_temp.registrar(
      'buscar_alumnos_activos / texto vacío no consulta nada (debe fallar)', 'permitido', v_filas is null, v_filas::text
    );
  exception when others then
    perform pg_temp.registrar('buscar_alumnos_activos / texto vacío no consulta nada (debe fallar)', 'permitido', false, sqlerrm);
  end;

  perform pg_temp.dejar_de_impersonar();

  -- student no puede llamar a la función, sin excepción (§0.2).
  if not pg_temp.hay_fixture('student') then
    perform pg_temp.omitir('buscar_alumnos_activos / student no puede llamar (debe fallar)', 'no hay student en este entorno');
  else
    perform pg_temp.impersonar('student');
    begin
      perform public.buscar_alumnos_activos('RLS', 8);
      perform pg_temp.registrar('buscar_alumnos_activos / student no puede llamar (debe fallar)', 'prohibido', false, 'se consultó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('buscar_alumnos_activos / student no puede llamar (debe fallar)', array['%solo administrator o teacher pueden buscar%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 8c. actualizar_asistencia (T-21, db/008_rpc_actualizar_asistencia.sql)
--     — la única vía de modificación de un registro ya existente.
--     Reutiliza alumno_prueba (sección 2) y slot_prueba (sección 4, del
--     'teacher'); crea sus propios registros con registrar_asistencia
--     (T-18), nunca con un INSERT directo — con UNA única excepción,
--     señalada donde ocurre: fabricar un registro "antiguo" para probar
--     el borde de la ventana de edición de 7 días, algo que ningún
--     camino real de la aplicación puede producir en el tiempo de vida
--     de esta prueba (registrado_en es siempre `now()` en el momento de
--     registrar). Ese INSERT lo hace el rol de conexión sin impersonar
--     a nadie (mismo nivel de privilegio con el que esta sección 0
--     crea sus propias tablas temporales), nunca `authenticated`: no es
--     una vía que la aplicación real tenga abierta.
-- ---------------------------------------------------------------------

do $$
declare
  v_alumno_id        uuid := pg_temp.dato('alumno_prueba');
  v_slot_id          uuid := pg_temp.dato('slot_prueba');
  v_teacher_id       uuid;
  v_teacher2_id      uuid;
  v_fila             public.asistencia%rowtype;
  v_registro_a       uuid;
  v_registro_b       uuid;
  v_registro_slot    uuid;
  v_registro_viejo   uuid;
  v_alumno_b         uuid;
  v_slot_b_id        uuid;
  v_slot_ajeno_id    uuid;
  v_n_historial      integer;
  v_error_alumno_b   text;
begin
  select id into v_teacher_id from _fixture_usuarios where rol = 'teacher';
  select id into v_teacher2_id from _fixture_usuarios where rol = 'teacher2';

  if v_alumno_id is null or not pg_temp.hay_fixture('teacher') then
    perform pg_temp.omitir('actualizar_asistencia / teacher edita nota de lo suyo', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / anular sin motivo (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / anular con motivo', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / la fila anulada sigue existiendo', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / dos modificaciones dejan dos filas en el historial con los valores previos', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / teacher2 no puede editar lo ajeno (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / administrator edita lo de cualquiera', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / student no puede llamar (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / cambiar alumno', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / cambiar el slot atribuido', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / cambiar a un slot de otro profesor (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / cambiar el slot de un registro manual (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / fuera de la ventana de edición (debe fallar)', 'falta el alumno o el teacher de prueba');
    perform pg_temp.omitir('actualizar_asistencia / administrator sin límite de ventana', 'falta el alumno o el teacher de prueba');
    return;
  end if;

  -- Dos registros 'manual' propios del teacher: v_registro_a para la nota/anulación/historial,
  -- v_registro_b para "cambiar alumno" (independiente, para no interferir con el primero).
  perform pg_temp.impersonar('teacher');
  select * into v_fila from public.registrar_asistencia(p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid());
  v_registro_a := v_fila.id;
  select * into v_fila from public.registrar_asistencia(p_alumno_id => v_alumno_id, p_origen => 'manual', p_peticion_id => gen_random_uuid());
  v_registro_b := v_fila.id;
  perform pg_temp.dejar_de_impersonar();
  -- Recordado para la sección 8d (aislamiento de lectura de asistencia entre profesores, T-23), que
  -- se ejecuta en su propio bloque "do" y no comparte estas variables locales.
  perform pg_temp.recordar_dato('registro_b_teacher', v_registro_b);

  -- teacher edita la nota de su propio registro: permitido (primera modificación de v_registro_a).
  perform pg_temp.impersonar('teacher');
  begin
    select * into v_fila from public.actualizar_asistencia(
      p_asistencia_id => v_registro_a, p_nota => 'Llegó tarde', p_nota_provista => true
    );
    perform pg_temp.registrar('actualizar_asistencia / teacher edita nota de lo suyo', 'permitido', v_fila.nota = 'Llegó tarde');
  exception when others then
    perform pg_temp.registrar('actualizar_asistencia / teacher edita nota de lo suyo', 'permitido', false, sqlerrm);
  end;

  -- anular sin motivo: debe rechazarse.
  begin
    perform public.actualizar_asistencia(p_asistencia_id => v_registro_a, p_anular => true);
    perform pg_temp.registrar('actualizar_asistencia / anular sin motivo (debe fallar)', 'prohibido', false, 'se anuló sin error');
  exception when others then
    perform pg_temp.registrar_prohibido('actualizar_asistencia / anular sin motivo (debe fallar)', array['%anular exige un motivo%'], sqlerrm);
  end;

  -- anular con motivo: permitido (segunda modificación de v_registro_a).
  begin
    select * into v_fila from public.actualizar_asistencia(
      p_asistencia_id => v_registro_a, p_anular => true, p_motivo_anulacion => 'Registrado por error'
    );
    perform pg_temp.registrar(
      'actualizar_asistencia / anular con motivo', 'permitido',
      v_fila.estado = 'anulada' and v_fila.motivo_anulacion = 'Registrado por error'
    );
  exception when others then
    perform pg_temp.registrar('actualizar_asistencia / anular con motivo', 'permitido', false, sqlerrm);
  end;
  perform pg_temp.dejar_de_impersonar();

  -- La fila anulada NO se borra: sigue existiendo, con su estado (requisito 4 de T-21, "la fila
  -- permanece y se muestra tachada").
  perform pg_temp.registrar(
    'actualizar_asistencia / la fila anulada sigue existiendo', 'permitido',
    exists (select 1 from public.asistencia where id = v_registro_a and estado = 'anulada')
  );

  -- asistencia_historial (lectura solo administrator) debe tener exactamente dos filas para
  -- v_registro_a: la de ANTES de la nota (nota null) y la de ANTES de la anulación (nota ya puesta,
  -- estado todavía 'valida') — los valores previos correctos de cada modificación, en ese orden.
  if pg_temp.hay_fixture('administrator') then
    perform pg_temp.impersonar('administrator');
    begin
      select count(*) into v_n_historial from public.asistencia_historial where asistencia_id = v_registro_a;
      perform pg_temp.registrar(
        'actualizar_asistencia / dos modificaciones dejan dos filas en el historial con los valores previos',
        'permitido',
        v_n_historial = 2
          and exists (select 1 from public.asistencia_historial where asistencia_id = v_registro_a and nota is null)
          and exists (
            select 1 from public.asistencia_historial
            where asistencia_id = v_registro_a and nota = 'Llegó tarde' and estado = 'valida'
          ),
        format('%s filas de historial', v_n_historial)
      );
    exception when others then
      perform pg_temp.registrar('actualizar_asistencia / dos modificaciones dejan dos filas en el historial con los valores previos', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  else
    perform pg_temp.omitir('actualizar_asistencia / dos modificaciones dejan dos filas en el historial con los valores previos', 'no hay administrator en este entorno (asistencia_historial solo lo lee ese rol)');
  end if;

  -- teacher2 (otro profesor) intenta editar un registro que no es suyo: debe rechazarse.
  if v_teacher2_id is null then
    perform pg_temp.omitir('actualizar_asistencia / teacher2 no puede editar lo ajeno (debe fallar)', 'no hay un segundo teacher en este entorno');
  else
    perform pg_temp.impersonar('teacher2');
    begin
      perform public.actualizar_asistencia(p_asistencia_id => v_registro_b, p_nota => 'intento ajeno', p_nota_provista => true);
      perform pg_temp.registrar('actualizar_asistencia / teacher2 no puede editar lo ajeno (debe fallar)', 'prohibido', false, 'se modificó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('actualizar_asistencia / teacher2 no puede editar lo ajeno (debe fallar)', array['%no puedes modificar un registro de otro profesor%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- administrator SÍ puede editar el registro del teacher (sin límite de ventana ni de propiedad).
  if not pg_temp.hay_fixture('administrator') then
    perform pg_temp.omitir('actualizar_asistencia / administrator edita lo de cualquiera', 'no hay administrator en este entorno');
  else
    perform pg_temp.impersonar('administrator');
    begin
      select * into v_fila from public.actualizar_asistencia(
        p_asistencia_id => v_registro_b, p_nota => 'editado por administrator', p_nota_provista => true
      );
      perform pg_temp.registrar('actualizar_asistencia / administrator edita lo de cualquiera', 'permitido', v_fila.nota = 'editado por administrator');
    exception when others then
      perform pg_temp.registrar('actualizar_asistencia / administrator edita lo de cualquiera', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- student: sin acceso alguno (§0.2), tampoco a esta RPC.
  if not pg_temp.hay_fixture('student') then
    perform pg_temp.omitir('actualizar_asistencia / student no puede llamar (debe fallar)', 'no hay student en este entorno');
  else
    perform pg_temp.impersonar('student');
    begin
      perform public.actualizar_asistencia(p_asistencia_id => v_registro_b, p_nota => 'intento student', p_nota_provista => true);
      perform pg_temp.registrar('actualizar_asistencia / student no puede llamar (debe fallar)', 'prohibido', false, 'se modificó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('actualizar_asistencia / student no puede llamar (debe fallar)', array['%solo administrator o teacher pueden modificar%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- Cambiar el alumno (requisito 4, "se tocó al equivocado"): un segundo alumno activo de prueba,
  -- creado aquí mismo por administrator (mismo patrón que alumno_inactivo de la sección 7).
  -- El centro se lee por `alumno_ficha`, NUNCA por la tabla base: el GRANT por columna de la
  -- sección (a) de `003` concede a `authenticated` solo las columnas de identificación, y
  -- `centro_referencia_id` no está entre ellas — leerla de `public.alumno` aquí daba "permission
  -- denied" incluso siendo administrator (la RLS filtra filas, el GRANT filtra columnas y se
  -- aplica a los dos roles por igual). La vista sí la expone, y solo a administrator.
  perform pg_temp.impersonar('administrator');
  begin
    insert into public.alumno (nombre, primer_apellido, centro_referencia_id, activo)
      values ('PruebaCambioAlumno', 'RLS', (select centro_referencia_id from public.alumno_ficha where id = v_alumno_id), true)
      returning id into v_alumno_b;
  exception when others then
    v_alumno_b := null;
    v_error_alumno_b := sqlerrm;
  end;
  perform pg_temp.dejar_de_impersonar();

  if v_alumno_b is null then
    perform pg_temp.omitir('actualizar_asistencia / cambiar alumno', 'no se pudo crear el segundo alumno de prueba: ' || coalesce(v_error_alumno_b, 'sin error de SQL'));
  else
    perform pg_temp.impersonar('teacher');
    begin
      select * into v_fila from public.actualizar_asistencia(p_asistencia_id => v_registro_b, p_alumno_id => v_alumno_b);
      perform pg_temp.registrar('actualizar_asistencia / cambiar alumno', 'permitido', v_fila.alumno_id = v_alumno_b);
    exception when others then
      perform pg_temp.registrar('actualizar_asistencia / cambiar alumno', 'permitido', false, sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- Cambiar el slot atribuido (requisito 4): reutiliza el registro por slot que ya dejó la sección
  -- 7b (mismo alumno_prueba + slot_prueba, todavía 'valida' — no se crea ninguno nuevo para no
  -- chocar con asistencia_uq_alumno_slot_dia_valida). Un segundo slot del mismo profesor y alumno,
  -- en otro día, es el destino del cambio.
  select id into v_registro_slot from public.asistencia
    where alumno_id = v_alumno_id and slot_id = v_slot_id and estado = 'valida' limit 1;

  if v_slot_id is null or v_registro_slot is null then
    perform pg_temp.omitir('actualizar_asistencia / cambiar el slot atribuido', 'no hay un registro por slot todavía válido (sección 7b)');
    perform pg_temp.omitir('actualizar_asistencia / cambiar a un slot de otro profesor (debe fallar)', 'no hay un registro por slot todavía válido (sección 7b)');
  else
    perform pg_temp.impersonar('administrator');
    begin
      insert into public.slot_horario (alumno_id, profesor_id, dia_semana, hora_inicio, hora_fin, vigente_desde)
        values (v_alumno_id, v_teacher_id, 2, '16:00', '17:00', current_date)
        returning id into v_slot_b_id;
    exception when others then
      v_slot_b_id := null;
    end;
    perform pg_temp.dejar_de_impersonar();

    if v_slot_b_id is null then
      perform pg_temp.omitir('actualizar_asistencia / cambiar el slot atribuido', 'no se pudo crear el segundo slot de prueba');
    else
      perform pg_temp.impersonar('teacher');
      begin
        select * into v_fila from public.actualizar_asistencia(p_asistencia_id => v_registro_slot, p_slot_id => v_slot_b_id);
        perform pg_temp.registrar(
          'actualizar_asistencia / cambiar el slot atribuido', 'permitido',
          v_fila.slot_id = v_slot_b_id and v_fila.slot_dia_semana = 2
        );
      exception when others then
        perform pg_temp.registrar('actualizar_asistencia / cambiar el slot atribuido', 'permitido', false, sqlerrm);
      end;
      perform pg_temp.dejar_de_impersonar();
    end if;

    -- Slot de OTRO profesor (teacher2): debe rechazarse, tanto si teacher2 existe (caso real) como
    -- si no (se omite, no se puede fabricar el fixture).
    if v_teacher2_id is null then
      perform pg_temp.omitir('actualizar_asistencia / cambiar a un slot de otro profesor (debe fallar)', 'no hay un segundo teacher en este entorno');
    else
      perform pg_temp.impersonar('administrator');
      begin
        insert into public.slot_horario (alumno_id, profesor_id, dia_semana, hora_inicio, hora_fin, vigente_desde)
          values (v_alumno_id, v_teacher2_id, 3, '16:00', '17:00', current_date)
          returning id into v_slot_ajeno_id;
      exception when others then
        v_slot_ajeno_id := null;
      end;
      perform pg_temp.dejar_de_impersonar();

      if v_slot_ajeno_id is null then
        perform pg_temp.omitir('actualizar_asistencia / cambiar a un slot de otro profesor (debe fallar)', 'no se pudo crear el slot ajeno de prueba');
      else
        perform pg_temp.impersonar('teacher');
        begin
          perform public.actualizar_asistencia(p_asistencia_id => v_registro_slot, p_slot_id => v_slot_ajeno_id);
          perform pg_temp.registrar('actualizar_asistencia / cambiar a un slot de otro profesor (debe fallar)', 'prohibido', false, 'se cambió sin error');
        exception when others then
          perform pg_temp.registrar_prohibido('actualizar_asistencia / cambiar a un slot de otro profesor (debe fallar)', array['%el slot pertenece a otro profesor%'], sqlerrm);
        end;
        perform pg_temp.dejar_de_impersonar();
      end if;
    end if;
  end if;

  -- Cambiar el slot de un registro 'manual' (v_registro_b, origen manual): debe rechazarse — esta
  -- acción solo tiene sentido sobre un registro que ya es de origen 'slot'.
  if v_slot_id is null then
    perform pg_temp.omitir('actualizar_asistencia / cambiar el slot de un registro manual (debe fallar)', 'no hay slot de prueba (sección 4)');
  else
    perform pg_temp.impersonar('teacher');
    begin
      perform public.actualizar_asistencia(p_asistencia_id => v_registro_b, p_slot_id => v_slot_id);
      perform pg_temp.registrar('actualizar_asistencia / cambiar el slot de un registro manual (debe fallar)', 'prohibido', false, 'se cambió sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('actualizar_asistencia / cambiar el slot de un registro manual (debe fallar)', array['%solo se puede cambiar el slot de un registro de origen%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();
  end if;

  -- Ventana de edición de 7 días: un registro "antiguo" fabricado directamente (ver el aviso de la
  -- cabecera de esta sección) con registrado_en de hace 10 días — ningún camino real de la
  -- aplicación puede producir esto en el tiempo de vida de una prueba.
  begin
    insert into public.asistencia (alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen, peticion_id)
      values (v_alumno_id, v_teacher_id, now() - interval '10 days', now() - interval '10 days', false, 'manual', gen_random_uuid())
      returning id into v_registro_viejo;
  exception when others then
    v_registro_viejo := null;
  end;

  if v_registro_viejo is null then
    perform pg_temp.omitir('actualizar_asistencia / fuera de la ventana de edición (debe fallar)', 'no se pudo fabricar el registro antiguo de prueba');
    perform pg_temp.omitir('actualizar_asistencia / administrator sin límite de ventana', 'no se pudo fabricar el registro antiguo de prueba');
  else
    perform pg_temp.impersonar('teacher');
    begin
      perform public.actualizar_asistencia(p_asistencia_id => v_registro_viejo, p_nota => 'demasiado tarde', p_nota_provista => true);
      perform pg_temp.registrar('actualizar_asistencia / fuera de la ventana de edición (debe fallar)', 'prohibido', false, 'se modificó sin error');
    exception when others then
      perform pg_temp.registrar_prohibido('actualizar_asistencia / fuera de la ventana de edición (debe fallar)', array['%ventana de edición%'], sqlerrm);
    end;
    perform pg_temp.dejar_de_impersonar();

    if not pg_temp.hay_fixture('administrator') then
      perform pg_temp.omitir('actualizar_asistencia / administrator sin límite de ventana', 'no hay administrator en este entorno');
    else
      perform pg_temp.impersonar('administrator');
      begin
        select * into v_fila from public.actualizar_asistencia(
          p_asistencia_id => v_registro_viejo, p_nota => 'administrator sin límite', p_nota_provista => true
        );
        perform pg_temp.registrar('actualizar_asistencia / administrator sin límite de ventana', 'permitido', v_fila.nota = 'administrator sin límite');
      exception when others then
        perform pg_temp.registrar('actualizar_asistencia / administrator sin límite de ventana', 'permitido', false, sqlerrm);
      end;
      perform pg_temp.dejar_de_impersonar();
    end if;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 8d. asistencia — aislamiento de LECTURA general entre profesores (T-23,
--     criterio de aceptación: "caso... de que un teacher no lee registros
--     de otro"). Distinto de lo ya probado en 8c (que un teacher2 no puede
--     LLAMAR a actualizar_asistencia sobre un registro ajeno, rechazado
--     por la comprobación de propiedad de la propia RPC): aquí se
--     comprueba la política SELECT (asistencia_teacher_leer_propias) en
--     sí misma, con una consulta directa a la tabla, sin pasar por
--     ninguna RPC — exactamente el patrón de la sección 4b para
--     slot_horario, aplicado a asistencia.
-- ---------------------------------------------------------------------

do $$
declare
  v_teacher_id  uuid;
  v_registro_b  uuid := pg_temp.dato('registro_b_teacher');
  v_visto       boolean;
  v_total       integer;
begin
  select id into v_teacher_id from _fixture_usuarios where rol = 'teacher';

  if v_registro_b is null or v_teacher_id is null then
    perform pg_temp.omitir('asistencia / teacher2 no lee los registros ajenos (debe fallar)', 'falta el registro o el teacher de prueba (sección 8c)');
    return;
  end if;
  if not pg_temp.hay_fixture('teacher2') then
    perform pg_temp.omitir('asistencia / teacher2 no lee los registros ajenos (debe fallar)', 'no hay un segundo teacher en este entorno');
    return;
  end if;

  perform pg_temp.impersonar('teacher2');
  begin
    -- Ni por id (la fila entera no existe para teacher2 según su RLS)...
    select exists (select 1 from public.asistencia where id = v_registro_b) into v_visto;
    -- ...ni filtrando explícitamente por el profesor dueño: la política es la que corta, no que la
    -- fila "no aparezca por casualidad" al no filtrar por profesor_id.
    select count(*) into v_total from public.asistencia where profesor_id = v_teacher_id;
    perform pg_temp.registrar(
      'asistencia / teacher2 no lee los registros ajenos (debe fallar)', 'prohibido',
      not v_visto and v_total = 0,
      format('visto_por_id=%s, filas_por_profesor_id=%s', v_visto, v_total)
    );
  exception when others then
    perform pg_temp.registrar('asistencia / teacher2 no lee los registros ajenos (debe fallar)', 'prohibido', false, sqlerrm);
  end;
  perform pg_temp.dejar_de_impersonar();
end $$;


-- ---------------------------------------------------------------------
-- 9. Resultado final — lo único que ve `herramientas/probarRls.ts`.
--    NUNCA se llega a un commit: los datos de prueba desaparecen aunque
--    todo haya salido bien.
-- ---------------------------------------------------------------------

select celda, esperado, ok, detalle from _resultados_prueba_rls order by orden;

rollback;
