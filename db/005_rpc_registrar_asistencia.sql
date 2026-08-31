-- =====================================================================
-- GestorAcademia — 005_rpc_registrar_asistencia.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que 001/002/003/004: el runner envuelve esto en una
-- transacción y añade la fila de `esquema_migracion` con su propio hash.
--
-- T-18 (alta de asistencia). Renumerada: la hoja de ruta y `db/MODELO.md`
-- la llamaban `004_rpc_registrar_asistencia`, pero `004` ya lo ocupa
-- `004_bucket_avatares.sql` (T-14) desde la renumeración en cadena
-- documentada en §7 de SEGUIMIENTO.md el 2026-08-28 — la hoja de ruta es
-- inmutable, así que la corrección se anota ahí, no aquí.
--
-- Dos piezas nuevas:
--   1. `limite_tasa` + `aplicar_limite_tasa()`: el mecanismo genérico y
--      reutilizable (T-06, contrato fijado en DECISIONES_TECNICAS.md) que
--      aplica el límite de 60 operaciones por profesor y minuto — la
--      primera RPC de escritura real a la que T-06 se conecta. T-21
--      reutilizará la misma función para `actualizar_asistencia`.
--   2. `registrar_asistencia(...)`: la única vía de alta de asistencia,
--      `SECURITY DEFINER`. Fija ella misma `registrado_en`/`profesor_id`/
--      `es_retroactivo`; el snapshot del slot se lee de la base de datos,
--      nunca del cliente.
--
-- Duplicados (requisito 4 de T-18, decisión por defecto documentada en
-- la pregunta abierta #12 de §6 de SEGUIMIENTO.md): un segundo registro
-- del MISMO alumno en el MISMO slot y día se rechaza. Se implementa como
-- una restricción `unique` parcial de verdad (`asistencia_uq_alumno_slot_dia_valida`),
-- no como una comprobación a mano dentro de la función: así protege
-- también contra dos llamadas concurrentes a la RPC (una comprobación
-- `select ... where not exists` tiene una carrera entre el SELECT y el
-- INSERT que una restricción de base de datos no tiene). Choca con el
-- error 23505 (unique_violation), que PostgREST traduce a 409 — la misma
-- traducción exacta que ya recibe un `peticion_id` repetido (la
-- restricción `asistencia_peticion_id_unico` de `001_esquema_inicial`),
-- así que el cliente distingue las dos formas de duplicado de la misma
-- manera: como `Conflicto`.
--
-- No recrea `asistencia` ni ninguna de sus columnas/triggers/políticas:
-- todos existen desde `001_esquema_inicial.sql`/`003_politicas_rls.sql`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'rpc_registrar_asistencia: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'rpc_registrar_asistencia: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Duplicado "mismo alumno, mismo slot, mismo día" (requisito 4)
--
-- Parcial: solo cuando origen = 'slot' (slot_id no nulo) y la fila sigue
-- 'valida' — anular un registro (estado = 'anulada') libera el hueco
-- para uno nuevo, y un origen 'manual' (clase extra) no tiene esta
-- restricción, tal como pide literalmente la spec ("mismo slot").
-- La zona horaria es la misma constante conservadora de T-17 (pregunta
-- abierta #11 de §6): si el dueño la cambia algún día, este índice
-- necesitará una migración propia para recalcularse con la zona nueva.
-- ---------------------------------------------------------------------

create unique index if not exists asistencia_uq_alumno_slot_dia_valida
  on public.asistencia (alumno_id, slot_id, ((ocurrido_en at time zone 'Europe/Madrid')::date))
  where estado = 'valida' and slot_id is not null;


-- ---------------------------------------------------------------------
-- 2. limite_tasa + aplicar_limite_tasa(clave, maximo, ventana_segundos)
--
-- Tabla de infraestructura, nunca expuesta por PostgREST: RLS habilitada
-- sin ninguna política, privilegios revocados a los tres roles de
-- aplicación (§0.2, "toda tabla nueva declara sus privilegios de forma
-- EXPLÍCITA") — solo la alcanza `aplicar_limite_tasa()`, `SECURITY
-- DEFINER`, que corre con los privilegios de su propietario.
-- ---------------------------------------------------------------------

create table public.limite_tasa (
  clave           text        primary key,
  ventana_inicio  timestamptz not null,
  contador        integer     not null default 0
);

comment on table public.limite_tasa is
  'Contador de operaciones por clave y ventana fija (T-06, contrato aplicado por primera vez en '
  'T-18: 60 operaciones por profesor y minuto para registrar_asistencia/actualizar_asistencia, ver '
  'DECISIONES_TECNICAS.md). Se accede exclusivamente a través de aplicar_limite_tasa(); sin GRANT a '
  'ningún rol de PostgREST.';

alter table public.limite_tasa enable row level security;
revoke all on public.limite_tasa from anon, authenticated, service_role;
-- Sin políticas, a propósito: nadie lee ni escribe esta tabla por la API directamente.

create or replace function public.aplicar_limite_tasa(
  p_clave            text,
  p_maximo           integer,
  p_ventana_segundos integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ahora timestamptz := now();
  v_fila  public.limite_tasa;
begin
  insert into public.limite_tasa (clave, ventana_inicio, contador)
  values (p_clave, v_ahora, 1)
  on conflict (clave) do update
    set contador = case
          when ventana_inicio + make_interval(secs => p_ventana_segundos) <= v_ahora then 1
          else contador + 1
        end,
        ventana_inicio = case
          when ventana_inicio + make_interval(secs => p_ventana_segundos) <= v_ahora then v_ahora
          else ventana_inicio
        end
  returning * into v_fila;

  if v_fila.contador > p_maximo then
    -- SQLSTATE 'PT429': convención de PostgREST para forzar un código de estado HTTP concreto
    -- (429, Too Many Requests) en vez del 400 genérico de un RAISE EXCEPTION sin errcode. AVISO
    -- DE INCERTIDUMBRE (mismo espíritu que clienteManagementApi.ts/pruebas_rls.sql): esta sesión
    -- no ha podido verificar este mapeo contra documentación en vivo de PostgREST (sin salida de
    -- red a hosts externos). Degradación segura si no se cumple: la operación se sigue
    -- rechazando (el límite se aplica igual), solo cambia a qué clase de error de dominio lo
    -- traduce el cliente (ErrorDelServidor/ErrorDeValidacion genérico en vez de
    -- ErrorLimiteAlcanzado) — ver src/datos/erroresDominio.ts.
    raise exception 'aplicar_limite_tasa: límite de % operaciones por % segundos alcanzado (%)',
      p_maximo, p_ventana_segundos, p_clave
      using errcode = 'PT429';
  end if;
end;
$$;

revoke all on function public.aplicar_limite_tasa(text, integer, integer) from public;
-- Sin GRANT a nadie: solo la llaman otras funciones SECURITY DEFINER (registrar_asistencia hoy,
-- actualizar_asistencia en T-21), nunca directamente desde la API.


-- ---------------------------------------------------------------------
-- 3. registrar_asistencia(...) — requisito 1 de T-18
-- ---------------------------------------------------------------------

create or replace function public.registrar_asistencia(
  p_alumno_id   uuid,
  p_origen      text,
  p_peticion_id uuid,
  p_slot_id     uuid default null,
  p_ocurrido_en timestamptz default null,
  p_nota        text default null,
  p_profesor_id uuid default null
)
returns public.asistencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol             text := public.rol_actual();
  v_profesor_id     uuid;
  v_registrado_en   timestamptz := now();
  v_ocurrido_en     timestamptz;
  v_es_retroactivo  boolean;
  v_alumno_activo   boolean;
  v_slot            public.slot_horario%rowtype;
  v_slot_dia_semana smallint;
  v_slot_hora_ini   time;
  v_slot_hora_fin   time;
  v_slot_asignatura text;
  v_fecha_local     date;
  v_fila            public.asistencia;
begin
  -- 1. Quién llama y en nombre de quién (requisito 2: solo administrator registra por otro).
  if p_profesor_id is not null then
    if v_rol <> 'administrator' then
      raise exception 'registrar_asistencia: solo un administrador puede registrar en nombre de otro profesor'
        using errcode = '42501';
    end if;
    if not exists (select 1 from public.perfil where id = p_profesor_id and rol = 'teacher' and activo) then
      raise exception 'registrar_asistencia: el profesor indicado no existe o no está activo';
    end if;
    v_profesor_id := p_profesor_id;
  else
    if v_rol not in ('administrator', 'teacher') then
      raise exception 'registrar_asistencia: solo administrator o teacher pueden registrar asistencia'
        using errcode = '42501';
    end if;
    v_profesor_id := auth.uid();
  end if;

  -- 2. Límite de abuso (T-06, contrato: 60 operaciones por profesor y minuto), contado sobre el
  --    profesor que REGISTRA (v_profesor_id), no sobre quien llama.
  perform public.aplicar_limite_tasa('asistencia:' || v_profesor_id::text, 60, 60);

  -- 3. Instante atribuido y marca de retroactividad. La fórmula de es_retroactivo es EXACTAMENTE
  --    la del CHECK asistencia_retroactivo_coherente (001_esquema_inicial.sql, ya aplicado e
  --    inmutable): esa restricción es la fuente de verdad, no una interpretación distinta aquí.
  if p_ocurrido_en is null then
    v_ocurrido_en := v_registrado_en;
  else
    if p_ocurrido_en > v_registrado_en then
      raise exception 'registrar_asistencia: ocurrido_en no puede estar en el futuro';
    end if;
    -- Ventana máxima hacia atrás (7 días): valor conservador de partida, pregunta abierta #12 de
    -- §6 de SEGUIMIENTO.md, igual que dominio/asistencia.ts VENTANA_RETROACTIVA_MAXIMA_DIAS.
    if v_registrado_en - p_ocurrido_en > interval '7 days' then
      raise exception 'registrar_asistencia: ocurrido_en supera la ventana permitida hacia atrás (7 días)';
    end if;
    v_ocurrido_en := p_ocurrido_en;
  end if;
  v_es_retroactivo := abs(extract(epoch from (v_ocurrido_en - v_registrado_en))) > 300;

  -- 4. Alumno existe y está activo.
  select activo into v_alumno_activo from public.alumno where id = p_alumno_id;
  if not found then
    raise exception 'registrar_asistencia: el alumno indicado no existe';
  end if;
  if not v_alumno_activo then
    raise exception 'registrar_asistencia: el alumno está dado de baja';
  end if;

  -- 5. Origen coherente y snapshot del slot — nunca del cliente, siempre leído aquí.
  if p_origen not in ('slot', 'manual') then
    raise exception 'registrar_asistencia: origen no válido (%), debe ser "slot" o "manual"', p_origen;
  end if;

  if p_origen = 'slot' then
    if p_slot_id is null then
      raise exception 'registrar_asistencia: origen "slot" exige slot_id';
    end if;
    select * into v_slot from public.slot_horario where id = p_slot_id;
    if not found then
      raise exception 'registrar_asistencia: el slot indicado no existe';
    end if;
    if v_slot.profesor_id <> v_profesor_id then
      raise exception 'registrar_asistencia: el slot pertenece a otro profesor';
    end if;
    if v_slot.alumno_id <> p_alumno_id then
      raise exception 'registrar_asistencia: el slot no corresponde a este alumno';
    end if;

    v_fecha_local := (v_ocurrido_en at time zone 'Europe/Madrid')::date;
    if v_slot.vigente_desde > v_fecha_local
       or (v_slot.vigente_hasta is not null and v_slot.vigente_hasta < v_fecha_local) then
      raise exception 'registrar_asistencia: el slot no está vigente en la fecha del registro';
    end if;

    v_slot_dia_semana := v_slot.dia_semana;
    v_slot_hora_ini   := v_slot.hora_inicio;
    v_slot_hora_fin   := v_slot.hora_fin;
    v_slot_asignatura := v_slot.asignatura_o_grupo;
  elsif p_slot_id is not null then
    raise exception 'registrar_asistencia: origen "manual" no admite slot_id';
  end if;

  -- 6. Inserción. Un peticion_id repetido choca con asistencia_peticion_id_unico; un segundo
  --    registro del mismo alumno/slot/día choca con asistencia_uq_alumno_slot_dia_valida (sección
  --    1 de este fichero) — las dos formas de duplicado llegan como 23505 → 409 → Conflicto.
  insert into public.asistencia (
    alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen,
    slot_id, slot_dia_semana, slot_hora_inicio, slot_hora_fin, slot_asignatura_o_grupo,
    nota, peticion_id
  )
  values (
    p_alumno_id, v_profesor_id, v_registrado_en, v_ocurrido_en, v_es_retroactivo, p_origen,
    p_slot_id, v_slot_dia_semana, v_slot_hora_ini, v_slot_hora_fin, v_slot_asignatura,
    p_nota, p_peticion_id
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.registrar_asistencia(uuid, text, uuid, uuid, timestamptz, text, uuid) from public;
grant execute on function public.registrar_asistencia(uuid, text, uuid, uuid, timestamptz, text, uuid) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que admin_desbloquear_usuario, 002): la
-- comprobación de rol de arriba (paso 1) es quien de verdad rechaza a `student` y a cualquier
-- rol desconocido, no la ausencia de GRANT — igual que ya hace admin_desbloquear_usuario con
-- es_administrator().
