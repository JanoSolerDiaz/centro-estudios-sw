-- =====================================================================
-- GestorAcademia — 015_aviso_cancelacion_slot.sql
--
-- Migración escrita por el agente, NUNCA aplicada por él (§0.1): se
-- commitea y se empuja a `develop`; el dueño la aplica con
-- `npm run migrate` en local y confirma en §3 de SEGUIMIENTO.md.
--
-- R-14 (aviso de clase cancelada a las familias, oleada v1 / F-03).
-- Ampliación del mecanismo ya construido por R-05 (aviso de ausencia
-- injustificada) para una CANCELACIÓN de `excepcion_slot` (R-06,
-- `013_excepcion_slot.sql`) en vez de una ausencia individual —
-- requisito 7 de la propia spec de R-06, que dejó dicho que este hueco
-- era una ampliación, no una pieza nueva.
--
-- Dos piezas:
--   1. `excepcion_slot` (`013`, ya escrita pero AÚN NO aplicada — la
--      regla de inmutabilidad de §0.1 protege una migración ya
--      APLICADA, y `013` no lo está todavía) gana dos columnas nuevas:
--      `aviso_familias_quien`/`aviso_familias_en`. UNA sola anotación
--      por excepción, no una por alumno (requisito 3 de R-14) — a
--      diferencia de R-05, que no tenía columna propia y reutilizaba el
--      `nota` genérico de `asistencia` sumándose, aquí sí hay columnas
--      dedicadas: no hace falta ninguna lógica de "sumarse a lo que ya
--      hubiera", el servidor las fija directamente.
--   2. `registrar_aviso_cancelacion_slot(...)` — única vía de escritura
--      de las dos columnas, `administrator` únicamente (requisito 5:
--      "mismo alcance que R-05, hoy exclusivo de administrator"),
--      `SECURITY DEFINER`, mismo patrón que
--      `declarar_excepcion_slot`/`desactivar_excepcion_slot`: sin GRANT
--      de UPDATE directo a `authenticated` sobre `excepcion_slot`, la
--      comprobación de rol vive en la RPC, no en un GRANT ausente.
--
-- Como `013_excepcion_slot.sql` sigue sin aplicarse todavía en `dev`
-- (`db/APLICADAS.md`), el runner no llegará a esta migración mientras
-- aquella siga pendiente: aplica siempre en orden numérico dentro de la
-- misma invocación y aborta al primer error. En la práctica, `013` y
-- `015` se aplicarán juntas en el mismo `npm run migrate`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'excepcion_slot') then
    raise exception 'aviso_cancelacion_slot: falta la tabla excepcion_slot. ¿Se aplicó 013_excepcion_slot.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'rol_actual') then
    raise exception 'aviso_cancelacion_slot: falta la función rol_actual(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. excepcion_slot — dos columnas nuevas (requisito 3 de R-14).
-- ---------------------------------------------------------------------

alter table public.excepcion_slot add column if not exists aviso_familias_quien text;
alter table public.excepcion_slot add column if not exists aviso_familias_en timestamptz;

comment on column public.excepcion_slot.aviso_familias_quien is
  'Anotación manual, texto libre tecleado por quien avisó (nunca resuelto desde auth.uid(): puede '
  'no ser quien hizo la llamada, p. ej. la secretaria) — mismo criterio que asistencia.nota de R-05. '
  'Una sola anotación para la excepción COMPLETA, no una por alumno (requisito 3 de R-14). NULL '
  'mientras no se ha avisado todavía.';
comment on column public.excepcion_slot.aviso_familias_en is
  'Instante en que se registró el aviso (registrar_aviso_cancelacion_slot fija now(), nunca lo envía '
  'el cliente). NULL mientras no se ha avisado todavía; nunca uno de los dos sin el otro '
  '(excepcion_slot_aviso_quien_y_en_juntos).';

alter table public.excepcion_slot
  add constraint excepcion_slot_aviso_solo_cancelacion
  check (aviso_familias_en is null or tipo = 'cancelacion');

alter table public.excepcion_slot
  add constraint excepcion_slot_aviso_quien_y_en_juntos
  check ((aviso_familias_quien is null) = (aviso_familias_en is null));


-- ---------------------------------------------------------------------
-- 2. registrar_aviso_cancelacion_slot(...) — requisito 3 de R-14,
--    administrator únicamente (requisito 5). Comprueba que la excepción
--    exista, esté ACTIVA (una excepción desactivada ya no aplica: no
--    tiene sentido anotar un aviso sobre una cancelación que se
--    revirtió) y sea de tipo 'cancelacion' (requisito 4: "no aplica a
--    una sustitución"). Sobrescribe una anotación previa sin más — no
--    es un campo que se "sume" como el nota de R-05, es la anotación
--    vigente de la excepción, y volver a marcarla (p. ej. corrigiendo
--    quién avisó) es un caso legítimo, no un error a impedir.
-- ---------------------------------------------------------------------

create or replace function public.registrar_aviso_cancelacion_slot(
  p_excepcion_id uuid,
  p_quien        text
)
returns public.excepcion_slot
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol  text := public.rol_actual();
  v_exc  public.excepcion_slot%rowtype;
  v_fila public.excepcion_slot;
begin
  if v_rol <> 'administrator' then
    raise exception 'registrar_aviso_cancelacion_slot: solo un administrador puede anotar un aviso a las familias'
      using errcode = '42501';
  end if;

  if p_quien is null or btrim(p_quien) = '' then
    raise exception 'registrar_aviso_cancelacion_slot: falta quién ha avisado';
  end if;

  select * into v_exc from public.excepcion_slot where id = p_excepcion_id;
  if not found then
    raise exception 'registrar_aviso_cancelacion_slot: la excepción indicada no existe';
  end if;
  if not v_exc.activo then
    raise exception 'registrar_aviso_cancelacion_slot: la excepción ya no está activa; no se puede anotar un aviso sobre ella';
  end if;
  if v_exc.tipo <> 'cancelacion' then
    raise exception 'registrar_aviso_cancelacion_slot: solo una cancelación admite aviso a las familias, una sustitución no';
  end if;

  update public.excepcion_slot
     set aviso_familias_quien = btrim(p_quien),
         aviso_familias_en = now()
   where id = p_excepcion_id
  returning * into v_fila;

  return v_fila;
end;
$$;

revoke all on function public.registrar_aviso_cancelacion_slot(uuid, text) from public;
grant execute on function public.registrar_aviso_cancelacion_slot(uuid, text) to authenticated;
-- Granted a `authenticated` en general (mismo patrón que declarar_excepcion_slot): la comprobación de
-- rol del primer `if` es quien de verdad rechaza a `teacher`/`student`, no la ausencia de GRANT.
