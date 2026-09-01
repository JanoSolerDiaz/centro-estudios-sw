-- =====================================================================
-- GestorAcademia — 006_arreglo_limite_tasa_ambiguo.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- DDL PLANO, igual que 001/002/003/004/005: el runner envuelve esto en
-- una transacción y añade la fila de `esquema_migracion` con su hash.
--
-- ARREGLO de un bug de `005_rpc_registrar_asistencia.sql`, que ya está
-- aplicada en `dev` (esquema_version() = 5, 2026-09-01) y por tanto es
-- inmutable: el arreglo va aquí, nunca editando el fichero anterior
-- (§0.1 de HOJA_DE_RUTA.md; el runner lo impone por hash).
--
-- ---------------------------------------------------------------------
-- SÍNTOMA
--
-- `npm run probar-rls` contra `dev`, justo después de aplicar `005`:
-- las TRECE comprobaciones de la sección 7b (`registrar_asistencia`)
-- que llegan a ejecutar la RPC de verdad fallan con
--
--     column reference "ventana_inicio" is ambiguous
--
-- Cuatro salieron como [FALLO] (las de acceso *permitido*: registrar en
-- vivo, retroactivo, por slot, y administrator en nombre de teacher) y
-- las otras salieron [OK] **por el motivo equivocado**: son casos "debe
-- fallar" y la batería solo mira que haya error, no cuál. Las dos
-- únicas que sí fallaron por su motivo real son las que rechazan al
-- llamante en el paso 1, antes de llegar al limitador.
--
-- CAUSA RAÍZ
--
-- No está en `registrar_asistencia`, sino en `aplicar_limite_tasa()`,
-- a la que aquélla llama en su paso 2. Dentro de un
-- `INSERT ... ON CONFLICT ... DO UPDATE`, PostgreSQL pone en ámbito DOS
-- relaciones a la vez: la tabla destino (`limite_tasa`) y la
-- pseudo-relación `excluded` con la fila propuesta. Las dos tienen
-- columnas `ventana_inicio` y `contador`, así que una referencia SIN
-- CUALIFICAR en las EXPRESIONES del `SET` es ambigua y el planificador
-- la rechaza. Ese es exactamente el motivo por el que el modismo
-- canónico del upsert se escribe `set contador = tabla.contador + 1`.
--
-- Es un error de análisis de la sentencia, no de ejecución: salta al
-- preparar el plan, así que el INSERT nunca llegó a correr y
-- `limite_tasa` está vacía. No hay dato que limpiar ni contador que
-- reiniciar.
--
-- La parte IZQUIERDA del `SET` (`set contador = ...`) no se toca: ahí
-- el nombre siempre es la columna destino, y cualificarla sería un
-- error de sintaxis.
--
-- ---------------------------------------------------------------------
-- QUÉ CAMBIA
--
-- Solo el cuerpo de `public.aplicar_limite_tasa(text, integer, integer)`,
-- por `create or replace` con la MISMA firma: mismos parámetros, mismo
-- `returns void`, mismo `security definer`, mismo `search_path`, mismo
-- `errcode = 'PT429'`. La semántica pretendida por `005` se conserva
-- intacta —ventana fija que se reinicia al expirar, contador que se
-- incrementa dentro de ella—; lo único que cambia es que las cuatro
-- lecturas de la fila existente van ahora cualificadas con
-- `limite_tasa.`, que es justo la fila que `005` quería leer.
--
-- `create or replace` conserva propietario y privilegios de la función,
-- así que el `revoke all ... from public` de `005` sigue vigente; se
-- repite abajo de todas formas, porque §0.2 pide que cada objeto
-- declare sus privilegios de forma EXPLÍCITA y porque así este fichero
-- se lee solo.
--
-- No se toca `registrar_asistencia`, ni la tabla `limite_tasa`, ni el
-- índice `asistencia_uq_alumno_slot_dia_valida`, ni ninguna política:
-- todo eso quedó correcto en `005`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'limite_tasa') then
    raise exception 'arreglo_limite_tasa_ambiguo: falta la tabla limite_tasa. ¿Se aplicó 005_rpc_registrar_asistencia.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'aplicar_limite_tasa') then
    raise exception 'arreglo_limite_tasa_ambiguo: falta la función aplicar_limite_tasa(). ¿Se aplicó 005_rpc_registrar_asistencia.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. aplicar_limite_tasa con las referencias cualificadas
-- ---------------------------------------------------------------------

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
  -- `limite_tasa.` es la fila que YA existe (la que provocó el conflicto), evaluada antes de la
  -- actualización: las dos expresiones del SET ven el mismo valor previo, que es lo que hace que
  -- la ventana y el contador se reinicien juntos o se incrementen juntos, nunca a medias.
  insert into public.limite_tasa (clave, ventana_inicio, contador)
  values (p_clave, v_ahora, 1)
  on conflict (clave) do update
    set contador = case
          when limite_tasa.ventana_inicio + make_interval(secs => p_ventana_segundos) <= v_ahora then 1
          else limite_tasa.contador + 1
        end,
        ventana_inicio = case
          when limite_tasa.ventana_inicio + make_interval(secs => p_ventana_segundos) <= v_ahora then v_ahora
          else limite_tasa.ventana_inicio
        end
  returning * into v_fila;

  if v_fila.contador > p_maximo then
    -- SQLSTATE 'PT429': convención de PostgREST para forzar un código de estado HTTP concreto
    -- (429, Too Many Requests) en vez del 400 genérico de un RAISE EXCEPTION sin errcode. Se
    -- mantiene tal cual de `005`, incluido su aviso de incertidumbre: esta sesión sigue sin poder
    -- verificar el mapeo contra documentación en vivo de PostgREST. Degradación segura si no se
    -- cumple: la operación se sigue rechazando (el límite se aplica igual), solo cambia a qué
    -- clase de error de dominio lo traduce el cliente — ver src/datos/erroresDominio.ts.
    raise exception 'aplicar_limite_tasa: límite de % operaciones por % segundos alcanzado (%)',
      p_maximo, p_ventana_segundos, p_clave
      using errcode = 'PT429';
  end if;
end;
$$;

revoke all on function public.aplicar_limite_tasa(text, integer, integer) from public;
-- Sin GRANT a nadie, igual que en `005`: solo la llaman otras funciones SECURITY DEFINER
-- (registrar_asistencia hoy, actualizar_asistencia en T-21), nunca directamente desde la API.
