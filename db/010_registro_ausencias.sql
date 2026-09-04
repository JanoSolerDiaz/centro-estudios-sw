-- =====================================================================
-- GestorAcademia — 010_registro_ausencias.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-01 (registro explícito de ausencias, oleada v1 / F-01). Objetivo:
-- que "no hay fila" deje de ser la única forma de decir que un alumno
-- faltó — un profesor puede cerrar el tramo dejando constancia expresa
-- de quién no vino, con el mismo régimen de auditoría e inmutabilidad
-- que cualquier otra fila de `asistencia` (§0.2: editable, nunca se
-- borra, rastro completo en `asistencia_historial`).
--
-- Tres piezas, ninguna recrea `asistencia` ni sus columnas/triggers:
--   1. `estado` admite un tercer valor, `'ausente'`, junto a los dos ya
--      existentes (`'valida'`, `'anulada'`). Es DDL por definición: el
--      `CHECK asistencia_estado_valido` de `001_esquema_inicial.sql` (ya
--      aplicado e inmutable) solo permite los dos valores originales, y
--      ninguna comprobación de cliente puede sustituir a un `CHECK` de
--      base de datos (§0.2, "toda escritura de asistencia... la base de
--      datos no confía en el cliente").
--   2. El índice único parcial de duplicado `asistencia_uq_alumno_slot_dia_valida`
--      (`005_rpc_registrar_asistencia.sql`, inmutable) protegía solo
--      `estado = 'valida'`. Se sustituye por uno más amplio,
--      `asistencia_uq_alumno_slot_dia_activa`, que además cubre
--      `'ausente'`: un alumno solo puede tener UN registro "activo"
--      (presente o ausente) por slot y día — necesario para que marcar
--      ausente a alguien que ya se registró (o viceversa) choque con la
--      misma garantía de base de datos que ya protegía el duplicado de
--      presencia, en vez de una comprobación a mano con ventana de
--      carrera (mismo razonamiento que el comentario original de esa
--      sección en `005`). No se edita el fichero `005` — inmutable—:
--      se sustituye el índice aquí, mismo patrón que `006` sustituyó
--      `aplicar_limite_tasa()` sin tocar el fichero que la creó.
--   3. `registrar_ausencia(...)`, `SECURITY DEFINER`, RPC nueva y
--      separada de `registrar_asistencia` (no una sobrecarga ni un
--      parámetro `p_estado` añadido a la RPC existente): marcar una
--      ausencia es una intención distinta de registrar una entrada —
--      valores por defecto y validaciones distintos (siempre `origen =
--      'slot'`, nunca "extra"; sin duplicar sentido con `p_origen`) — y
--      mantiene intacta la firma ya probada de `registrar_asistencia`
--      (`herramientas/migraciones/rpcRegistrarAsistencia.test.ts`), en
--      vez de arriesgar una sobrecarga ambigua para PostgREST. Reutiliza
--      `aplicar_limite_tasa()` (T-06/T-18) con la MISMA clave que
--      `registrar_asistencia`/`actualizar_asistencia`
--      (`'asistencia:' || profesor_id`): es la misma cuota compartida
--      de escritura del profesor, no una tercera independiente.
--
-- Anular una ausencia (requisito del criterio de aceptación: "funciona
-- igual que anular una entrada, con motivo obligatorio") NO necesita
-- ningún cambio en `actualizar_asistencia`
-- (`008_rpc_actualizar_asistencia.sql`): esa función ya trata
-- `p_anular`/`p_motivo_anulacion` de forma genérica sobre CUALQUIER
-- `estado` de partida (nunca comprueba que sea `'valida'`), así que ya
-- cubre `'ausente' -> 'anulada'` sin tocarla.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'asistencia') then
    raise exception 'registro_ausencias: falta la tabla asistencia. ¿Se aplicó 001_esquema_inicial.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'registro_ausencias: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'aplicar_limite_tasa') then
    raise exception 'registro_ausencias: falta aplicar_limite_tasa(). ¿Se aplicó 005_rpc_registrar_asistencia.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. estado admite 'ausente'
-- ---------------------------------------------------------------------

alter table public.asistencia
  drop constraint asistencia_estado_valido,
  add constraint asistencia_estado_valido check (estado in ('valida', 'anulada', 'ausente'));


-- ---------------------------------------------------------------------
-- 2. Duplicado "mismo alumno, mismo slot, mismo día" — ahora también
--    cubre 'ausente', no solo 'valida'. Sustituye al índice de 005
--    (inmutable, no se edita ese fichero) por uno más amplio.
-- ---------------------------------------------------------------------

drop index if exists public.asistencia_uq_alumno_slot_dia_valida;

create unique index if not exists asistencia_uq_alumno_slot_dia_activa
  on public.asistencia (alumno_id, slot_id, ((ocurrido_en at time zone 'Europe/Madrid')::date))
  where estado in ('valida', 'ausente') and slot_id is not null;


-- ---------------------------------------------------------------------
-- 3. registrar_ausencia(...) — requisito 2 de R-01
--
-- Mismas validaciones que registrar_asistencia (misma numeración de
-- pasos, a propósito, para que las dos RPC se lean en paralelo), con
-- origen forzado a 'slot': una ausencia siempre es de un alumno que
-- tenía un slot ese día, nunca de un "extra" (que por definición no
-- tocaba, así que no puede faltar a algo que no estaba previsto).
-- ---------------------------------------------------------------------

create or replace function public.registrar_ausencia(
  p_alumno_id   uuid,
  p_slot_id     uuid,
  p_peticion_id uuid,
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
  v_fecha_local     date;
  v_fila            public.asistencia;
begin
  -- 1. Quién llama y en nombre de quién (mismo criterio exacto que registrar_asistencia).
  if p_profesor_id is not null then
    if v_rol <> 'administrator' then
      raise exception 'registrar_ausencia: solo un administrador puede registrar en nombre de otro profesor'
        using errcode = '42501';
    end if;
    if not exists (select 1 from public.perfil where id = p_profesor_id and rol = 'teacher' and activo) then
      raise exception 'registrar_ausencia: el profesor indicado no existe o no está activo';
    end if;
    v_profesor_id := p_profesor_id;
  else
    if v_rol not in ('administrator', 'teacher') then
      raise exception 'registrar_ausencia: solo administrator o teacher pueden registrar una ausencia'
        using errcode = '42501';
    end if;
    v_profesor_id := auth.uid();
  end if;

  -- 2. Límite de abuso (T-06), MISMA clave que registrar_asistencia/actualizar_asistencia: cupo
  --    compartido de escritura del profesor, no uno independiente para las ausencias.
  perform public.aplicar_limite_tasa('asistencia:' || v_profesor_id::text, 60, 60);

  -- 3. Instante atribuido y marca de retroactividad — misma fórmula y ventana que registrar_asistencia.
  if p_ocurrido_en is null then
    v_ocurrido_en := v_registrado_en;
  else
    if p_ocurrido_en > v_registrado_en then
      raise exception 'registrar_ausencia: ocurrido_en no puede estar en el futuro';
    end if;
    if v_registrado_en - p_ocurrido_en > interval '7 days' then
      raise exception 'registrar_ausencia: ocurrido_en supera la ventana permitida hacia atrás (7 días)';
    end if;
    v_ocurrido_en := p_ocurrido_en;
  end if;
  v_es_retroactivo := abs(extract(epoch from (v_ocurrido_en - v_registrado_en))) > 300;

  -- 4. Alumno existe y está activo.
  select activo into v_alumno_activo from public.alumno where id = p_alumno_id;
  if not found then
    raise exception 'registrar_ausencia: el alumno indicado no existe';
  end if;
  if not v_alumno_activo then
    raise exception 'registrar_ausencia: el alumno está dado de baja';
  end if;

  -- 5. El slot existe, es del profesor que registra, es del alumno indicado y está vigente ese día
  --    — una ausencia siempre es de origen 'slot' (nunca 'manual': un alumno extra no "faltó" a
  --    algo que no tenía previsto).
  select * into v_slot from public.slot_horario where id = p_slot_id;
  if not found then
    raise exception 'registrar_ausencia: el slot indicado no existe';
  end if;
  if v_slot.profesor_id <> v_profesor_id then
    raise exception 'registrar_ausencia: el slot pertenece a otro profesor';
  end if;
  if v_slot.alumno_id <> p_alumno_id then
    raise exception 'registrar_ausencia: el slot no corresponde a este alumno';
  end if;

  v_fecha_local := (v_ocurrido_en at time zone 'Europe/Madrid')::date;
  if v_slot.vigente_desde > v_fecha_local
     or (v_slot.vigente_hasta is not null and v_slot.vigente_hasta < v_fecha_local) then
    raise exception 'registrar_ausencia: el slot no está vigente en la fecha del registro';
  end if;

  -- 6. Inserción con estado = 'ausente'. Un peticion_id repetido choca con
  --    asistencia_peticion_id_unico; un segundo registro (presente o ausente) del mismo
  --    alumno/slot/día choca con asistencia_uq_alumno_slot_dia_activa (sección 2 de este fichero).
  insert into public.asistencia (
    alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen,
    slot_id, slot_dia_semana, slot_hora_inicio, slot_hora_fin, slot_asignatura_o_grupo,
    estado, nota, peticion_id
  )
  values (
    p_alumno_id, v_profesor_id, v_registrado_en, v_ocurrido_en, v_es_retroactivo, 'slot',
    p_slot_id, v_slot.dia_semana, v_slot.hora_inicio, v_slot.hora_fin, v_slot.asignatura_o_grupo,
    'ausente', p_nota, p_peticion_id
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.registrar_ausencia(uuid, uuid, uuid, timestamptz, text, uuid) from public;
grant execute on function public.registrar_ausencia(uuid, uuid, uuid, timestamptz, text, uuid) to authenticated;
-- Granted a `authenticated` en general, mismo patrón que registrar_asistencia/actualizar_asistencia:
-- la comprobación de rol del paso 1 es quien de verdad rechaza a `student` y a cualquier rol
-- desconocido, no la ausencia de GRANT.
