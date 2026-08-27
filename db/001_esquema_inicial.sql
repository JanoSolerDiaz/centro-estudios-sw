-- =====================================================================
-- GestorAcademia — 001_esquema_inicial.sql
--
-- Migración aplicada por el runner (`npm run migrate`), NUNCA a mano.
-- A diferencia de 000/000b (arranque manual, autocontenidos con su
-- propio `begin`/`commit` y su propio alta en el ledger), este fichero es
-- DDL PLANO: el runner (`herramientas/migrar.ts`) es quien lo envuelve en
-- una transacción y quien añade la fila de `esquema_migracion` en la misma
-- transacción, con el hash SHA-256 que él mismo calcula del contenido de
-- este fichero. Ver la decisión correspondiente en DECISIONES_TECNICAS.md.
--
-- No recrea `perfil`, `esquema_migracion`, `esquema_version()` ni las
-- funciones de rol: ya existen desde `000_bootstrap_perfil.sql` (arranque
-- manual del dueño). Este script solo las lee y las usa.
--
-- Añade: centro_estudios, alumno, persona_referencia, slot_horario,
-- asistencia (con inmutabilidad y rastro de cambios), asistencia_historial,
-- evento_error (T-05) y su RPC `registrar_evento_error`.
--
-- Deliberado: este script NO añade políticas RLS por rol (salvo la propia
-- ausencia, que ya es la política correcta para `student`). Cada tabla
-- nueva queda con `enable row level security` y CERO políticas, así que
-- nadie —ni siquiera `administrator`— puede leer o escribir todavía por la
-- API: es el mismo "cerrado por defecto" que ya rige en `perfil`. Las
-- políticas por rol son el contenido íntegro de T-10 (`002_politicas_rls`).
-- Antes de esa migración, esta funcionalidad no es alcanzable desde la
-- aplicación (que tampoco existe aún: T-11 en adelante).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Comprobación de partida
--
-- Si esto falla, algo no está en el estado que este script asume: el
-- runner debe abortar antes de continuar (lo hace por sí mismo comparando
-- con esquema_migracion, esto es una defensa adicional dentro del script).
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'perfil') then
    raise exception 'esquema_inicial: falta la tabla perfil. ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
  if not exists (select 1 from pg_proc where proname = 'es_administrator') then
    raise exception 'esquema_inicial: falta la función es_administrator(). ¿Se aplicó 000_bootstrap_perfil.sql?';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. centro_estudios — catálogo de centros reglados (colegios, institutos)
-- ---------------------------------------------------------------------

create table public.centro_estudios (
  id             uuid        primary key default gen_random_uuid(),
  nombre         text        not null,
  activo         boolean     not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint centro_estudios_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint centro_estudios_nombre_unico unique (nombre)
);

comment on table public.centro_estudios is
  'Colegios/institutos reglados a los que asiste un alumno. Baja lógica (activo), nunca DELETE.';
comment on column public.centro_estudios.nombre is
  'Único de forma exacta. La detección de duplicados acento-insensible (T-11) es responsabilidad de '
  'la aplicación, que ofrece el existente antes de intentar el alta, no una restricción de esquema.';

drop trigger if exists centro_estudios_tocar_actualizado_en on public.centro_estudios;
create trigger centro_estudios_tocar_actualizado_en
  before update on public.centro_estudios
  for each row execute function public.tocar_actualizado_en();

alter table public.centro_estudios enable row level security;
revoke all on public.centro_estudios from anon, authenticated, service_role;
grant select, insert, update, delete on public.centro_estudios to service_role;
-- Sin políticas todavía (T-10, 002_politicas_rls): nadie llega por la API hasta entonces.


-- ---------------------------------------------------------------------
-- 2. alumno
-- ---------------------------------------------------------------------

create table public.alumno (
  id                    uuid        primary key default gen_random_uuid(),
  nombre                text        not null,
  primer_apellido       text        not null,
  segundo_apellido      text,
  centro_referencia_id  uuid        not null references public.centro_estudios (id),
  avatar_ruta           text,
  email_alumno          text,
  telefono_alumno       text,
  activo                boolean     not null default true,
  alta_en               timestamptz not null default now(),
  baja_en               timestamptz,
  motivo_baja           text,
  usuario_id            uuid        references public.perfil (id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint alumno_nombre_no_vacio           check (btrim(nombre) <> ''),
  constraint alumno_primer_apellido_no_vacio  check (btrim(primer_apellido) <> ''),
  constraint alumno_email_formato
    check (email_alumno is null or email_alumno ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint alumno_telefono_formato
    check (telefono_alumno is null or telefono_alumno ~ '^(\+34)?[6789]\d{8}$')
);

comment on table public.alumno is
  'Ficha del alumno. Baja lógica (activo/baja_en/motivo_baja), nunca DELETE — el histórico de '
  'asistencia y de slots pasados de un alumno dado de baja permanece íntegro.';
comment on column public.alumno.segundo_apellido is
  'Nullable a propósito: un alumno con un solo apellido es un caso normal, no un error de validación.';
comment on column public.alumno.avatar_ruta is
  'Ruta del fichero en el bucket privado de Storage (T-14), NUNCA una URL. La visualización pide '
  'siempre una URL firmada de vida corta en el momento de mostrarla.';
comment on column public.alumno.usuario_id is
  'Nullable: vínculo opcional con la cuenta del propio alumno, para cuando exista esa funcionalidad '
  '(fuera del MVP). Existe desde ahora para no tener que migrar la tabla cuando llegue.';

drop trigger if exists alumno_tocar_actualizado_en on public.alumno;
create trigger alumno_tocar_actualizado_en
  before update on public.alumno
  for each row execute function public.tocar_actualizado_en();

create index alumno_centro_referencia_id_idx on public.alumno (centro_referencia_id);
create index alumno_activo_idx on public.alumno (activo);
create index alumno_usuario_id_idx on public.alumno (usuario_id) where usuario_id is not null;

alter table public.alumno enable row level security;
revoke all on public.alumno from anon, authenticated, service_role;
grant select, insert, update, delete on public.alumno to service_role;
-- Sin políticas todavía (T-10). En T-10 además: el teacher solo ve columnas de identificación,
-- nunca email_alumno/telefono_alumno (requisito 4 de T-10, vista dedicada o GRANT por columna).


-- ---------------------------------------------------------------------
-- 3. persona_referencia — 0..N por alumno. Única tabla con DELETE real (§0.2).
-- ---------------------------------------------------------------------

create table public.persona_referencia (
  id                  uuid        primary key default gen_random_uuid(),
  alumno_id           uuid        not null references public.alumno (id) on delete cascade,
  nombre              text        not null,
  primer_apellido     text        not null,
  segundo_apellido    text,
  email_referencia    text,
  telefono_referencia text        not null,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  constraint persona_referencia_nombre_no_vacio          check (btrim(nombre) <> ''),
  constraint persona_referencia_primer_apellido_no_vacio check (btrim(primer_apellido) <> ''),
  constraint persona_referencia_telefono_no_vacio        check (btrim(telefono_referencia) <> ''),
  constraint persona_referencia_email_formato
    check (email_referencia is null or email_referencia ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint persona_referencia_telefono_formato
    check (telefono_referencia ~ '^(\+34)?[6789]\d{8}$')
);

comment on table public.persona_referencia is
  'Padres, madres o tutores del alumno. Datos de contacto de un tercero: es la única tabla del '
  'sistema con DELETE real permitido (§0.2, RGPD) — no tiene valor probatorio como un registro de '
  'asistencia. Solo administrator la lee y la escribe (T-10); un teacher no ve esta tabla nunca.';
comment on column public.persona_referencia.telefono_referencia is
  'Obligatorio: es la vía de contacto real de un menor. email_referencia es opcional.';

drop trigger if exists persona_referencia_tocar_actualizado_en on public.persona_referencia;
create trigger persona_referencia_tocar_actualizado_en
  before update on public.persona_referencia
  for each row execute function public.tocar_actualizado_en();

create index persona_referencia_alumno_id_idx on public.persona_referencia (alumno_id);

alter table public.persona_referencia enable row level security;
revoke all on public.persona_referencia from anon, authenticated, service_role;
grant select, insert, update, delete on public.persona_referencia to service_role;
-- Sin políticas todavía (T-10): solo administrator, ni siquiera teacher. Ver matriz en T-10.


-- ---------------------------------------------------------------------
-- 4. slot_horario — editable, versionado por vigencia
-- ---------------------------------------------------------------------

create table public.slot_horario (
  id                  uuid        primary key default gen_random_uuid(),
  alumno_id           uuid        not null references public.alumno (id),
  profesor_id         uuid        not null references public.perfil (id),
  dia_semana          smallint    not null,
  hora_inicio         time        not null,
  hora_fin            time        not null,
  asignatura_o_grupo  text,
  vigente_desde       date        not null,
  vigente_hasta       date,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  constraint slot_horario_dia_semana_rango check (dia_semana between 1 and 7),
  constraint slot_horario_hora_fin_tras_inicio check (hora_fin > hora_inicio),
  constraint slot_horario_vigencia_coherente
    check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);

comment on table public.slot_horario is
  'Horario recurrente semanal de un alumno con un profesor. Editable, pero versionado por vigencia '
  '(vigente_desde/vigente_hasta): cambiar un horario no reescribe el anterior, lo cierra y abre uno '
  'nuevo. Cada fila de asistencia guarda su propio snapshot inmutable, así que el histórico pasado '
  'nunca se recalcula del horario vigente hoy (T-17/T-18 implementan ese snapshot al escribir).';
comment on column public.slot_horario.dia_semana is '1 = lunes … 7 = domingo (ISO-8601).';

drop trigger if exists slot_horario_tocar_actualizado_en on public.slot_horario;
create trigger slot_horario_tocar_actualizado_en
  before update on public.slot_horario
  for each row execute function public.tocar_actualizado_en();

create index slot_horario_alumno_id_idx on public.slot_horario (alumno_id);
create index slot_horario_profesor_id_idx on public.slot_horario (profesor_id);
create index slot_horario_vigencia_idx on public.slot_horario (dia_semana, vigente_desde, vigente_hasta);

alter table public.slot_horario enable row level security;
revoke all on public.slot_horario from anon, authenticated, service_role;
grant select, insert, update, delete on public.slot_horario to service_role;
-- Sin políticas todavía (T-10): teacher lee los suyos, administrator lee y escribe todos.


-- ---------------------------------------------------------------------
-- 5. asistencia — editable (UPDATE), nunca DELETE, con inmutabilidad
--    parcial y rastro de cambios. El corazón de los invariantes de §0.2.
-- ---------------------------------------------------------------------

create table public.asistencia (
  id                      uuid        primary key default gen_random_uuid(),
  alumno_id               uuid        not null references public.alumno (id),
  profesor_id             uuid        not null references public.perfil (id),
  registrado_en           timestamptz not null default now(),
  ocurrido_en             timestamptz not null,
  es_retroactivo          boolean     not null default false,
  origen                  text        not null,
  slot_id                 uuid        references public.slot_horario (id),
  slot_dia_semana         smallint,
  slot_hora_inicio        time,
  slot_hora_fin           time,
  slot_asignatura_o_grupo text,
  estado                  text        not null default 'valida',
  motivo_anulacion        text,
  nota                    text,
  actualizado_en          timestamptz,
  actualizado_por         uuid        references public.perfil (id),
  peticion_id             uuid        not null,
  constraint asistencia_origen_valido check (origen in ('slot', 'manual')),
  constraint asistencia_estado_valido check (estado in ('valida', 'anulada')),
  constraint asistencia_peticion_id_unico unique (peticion_id),
  constraint asistencia_snapshot_slot_coherente check (
    (origen = 'slot'
      and slot_id is not null
      and slot_dia_semana is not null
      and slot_hora_inicio is not null
      and slot_hora_fin is not null)
    or
    (origen = 'manual' and slot_id is null)
  ),
  constraint asistencia_motivo_anulacion_obligatorio check (
    estado <> 'anulada' or motivo_anulacion is not null
  ),
  -- Margen de 5 minutos (300s): por debajo se considera "en vivo" aunque el reloj del cliente y el
  -- del servidor no coincidan al segundo exacto; por encima, es una entrada a posteriori.
  constraint asistencia_retroactivo_coherente check (
    es_retroactivo = (abs(extract(epoch from (ocurrido_en - registrado_en))) > 300)
  )
);

comment on table public.asistencia is
  'Registro de asistencia. Editable (UPDATE) por diseño (decisión del dueño 2026-08-25: "quien se '
  'equivoca debe poder arreglarlo"), pero NUNCA se borra: anular es estado=''anulada'' con motivo. '
  'Toda escritura pasa por RPC SECURITY DEFINER (registrar_asistencia/actualizar_asistencia, T-18/'
  'T-21): INSERT y UPDATE directos están revocados más abajo.';
comment on column public.asistencia.registrado_en is
  'Instante en que la fila se CREÓ. Lo fija el servidor (default now()) y es inmutable: el trigger '
  'de más abajo aborta cualquier intento de cambiarlo en un UPDATE.';
comment on column public.asistencia.ocurrido_en is
  'Momento atribuido a la asistencia. Editable (es lo que se ajusta al corregir una hora). En un '
  'registro tomado en vivo coincide con registrado_en; en uno añadido a posteriori, no.';
comment on column public.asistencia.peticion_id is
  'Clave de idempotencia que genera el cliente antes de la llamada a la RPC. Única: complementa a '
  'la protección de doble toque del cliente (T-06) con una barrera también en el servidor.';

drop trigger if exists asistencia_tocar_actualizado_en on public.asistencia;

-- Trigger BEFORE UPDATE: aborta si cambian los campos inmutables, y fija actualizado_en/actualizado_por
-- el servidor mismo (nunca el cliente, ni siquiera vía la RPC).
create or replace function public.asistencia_proteger_inmutables()
returns trigger
language plpgsql
as $$
begin
  if new.registrado_en is distinct from old.registrado_en then
    raise exception 'asistencia: registrado_en es inmutable, no se puede modificar en un UPDATE';
  end if;
  if new.profesor_id is distinct from old.profesor_id then
    raise exception 'asistencia: profesor_id es inmutable, no se puede modificar en un UPDATE';
  end if;
  if new.peticion_id is distinct from old.peticion_id then
    raise exception 'asistencia: peticion_id es inmutable, no se puede modificar en un UPDATE';
  end if;
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

create trigger asistencia_before_update
  before update on public.asistencia
  for each row execute function public.asistencia_proteger_inmutables();

-- Trigger AFTER UPDATE: copia la fila ANTERIOR en asistencia_historial. Se define después de crear
-- esa tabla (más abajo), como referencia hacia adelante dentro del mismo script.

create index asistencia_alumno_id_idx on public.asistencia (alumno_id);
create index asistencia_profesor_id_idx on public.asistencia (profesor_id);
create index asistencia_ocurrido_en_idx on public.asistencia (ocurrido_en);
create index asistencia_slot_id_idx on public.asistencia (slot_id) where slot_id is not null;

alter table public.asistencia enable row level security;
revoke all on public.asistencia from anon, authenticated, service_role;
grant select on public.asistencia to service_role;
-- INSERT/UPDATE ni siquiera a service_role: la única vía de escritura son las RPC SECURITY DEFINER
-- de T-18/T-21, que se ejecutan con los privilegios de su propietario, no con los de quien llama.
-- Sin DELETE para NADIE, en ningún rol: anular es un UPDATE de estado, nunca un borrado.
-- Sin políticas todavía (T-10): teacher lee las suyas, administrator lee todas.


-- ---------------------------------------------------------------------
-- 6. asistencia_historial — estrictamente append-only
-- ---------------------------------------------------------------------

create table public.asistencia_historial (
  id                      uuid        primary key default gen_random_uuid(),
  asistencia_id           uuid        not null references public.asistencia (id),
  cambiado_en             timestamptz not null default now(),
  cambiado_por            uuid        references public.perfil (id),
  alumno_id               uuid        not null,
  profesor_id             uuid        not null,
  registrado_en           timestamptz not null,
  ocurrido_en             timestamptz not null,
  es_retroactivo          boolean     not null,
  origen                  text        not null,
  slot_id                 uuid,
  slot_dia_semana         smallint,
  slot_hora_inicio        time,
  slot_hora_fin           time,
  slot_asignatura_o_grupo text,
  estado                  text        not null,
  motivo_anulacion        text,
  nota                    text,
  actualizado_en          timestamptz,
  actualizado_por         uuid,
  peticion_id             uuid        not null
);

comment on table public.asistencia_historial is
  'Copia de la fila de asistencia tal como estaba justo ANTES de cada UPDATE, escrita por trigger. '
  'Estrictamente append-only: sin UPDATE ni DELETE para nadie (revocado más abajo, sin excepción de '
  'service_role), lectura solo para administrator (T-10). Nunca se rellena a mano.';

create index asistencia_historial_asistencia_id_idx on public.asistencia_historial (asistencia_id);

alter table public.asistencia_historial enable row level security;
revoke all on public.asistencia_historial from anon, authenticated, service_role;
grant select on public.asistencia_historial to service_role;
-- Ni siquiera service_role recibe INSERT/UPDATE/DELETE: la única fila que entra aquí la escribe el
-- trigger de abajo, que corre como su propietario (postgres) y no necesita ningún GRANT explícito
-- para hacerlo. "Estrictamente append-only" incluye que nadie pueda rellenarla a mano por la API.

create or replace function public.asistencia_copiar_a_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.asistencia_historial (
    asistencia_id, cambiado_por,
    alumno_id, profesor_id, registrado_en, ocurrido_en, es_retroactivo, origen,
    slot_id, slot_dia_semana, slot_hora_inicio, slot_hora_fin, slot_asignatura_o_grupo,
    estado, motivo_anulacion, nota, actualizado_en, actualizado_por, peticion_id
  )
  values (
    old.id, auth.uid(),
    old.alumno_id, old.profesor_id, old.registrado_en, old.ocurrido_en, old.es_retroactivo, old.origen,
    old.slot_id, old.slot_dia_semana, old.slot_hora_inicio, old.slot_hora_fin, old.slot_asignatura_o_grupo,
    old.estado, old.motivo_anulacion, old.nota, old.actualizado_en, old.actualizado_por, old.peticion_id
  );
  return new;
end;
$$;

create trigger asistencia_after_update
  after update on public.asistencia
  for each row execute function public.asistencia_copiar_a_historial();


-- ---------------------------------------------------------------------
-- 7. evento_error (T-05) + su RPC de escritura
-- ---------------------------------------------------------------------

create table public.evento_error (
  id             uuid        primary key default gen_random_uuid(),
  origen         text        not null,
  mensaje        text        not null,
  pila           text,
  contexto       jsonb,
  registrado_en  timestamptz not null default now(),
  registrado_por uuid        references public.perfil (id),
  constraint evento_error_origen_valido
    check (origen in ('no_controlado', 'promesa_rechazada', 'capa_datos'))
);

comment on table public.evento_error is
  'Errores no controlados del cliente, ya depurados en el cliente (T-05, depurarContexto) antes de '
  'llegar aquí. registrado_por es nullable: un error puede ocurrir antes de que haya sesión (p. ej. '
  'en la pantalla de login). Lectura solo administrator (T-10); escritura únicamente por la RPC.';

create index evento_error_registrado_en_idx on public.evento_error (registrado_en);

alter table public.evento_error enable row level security;
revoke all on public.evento_error from anon, authenticated, service_role;
grant select on public.evento_error to service_role;
-- Sin política de lectura todavía (T-10: "lectura solo administrator"). La escritura nunca es
-- directa para ningún rol: solo por la RPC de abajo, que es SECURITY DEFINER.

-- Contrato fijado por T-05 en DECISIONES_TECNICAS.md: p_origen/p_mensaje/p_pila/p_contexto. La RPC
-- fija ella misma registrado_en (default now()) y registrado_por (auth.uid()); el cliente no puede
-- enviarlos. anon puede ejecutarla porque un error puede darse antes de autenticar.
create or replace function public.registrar_evento_error(
  p_origen   text,
  p_mensaje  text,
  p_pila     text default null,
  p_contexto jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.evento_error (origen, mensaje, pila, contexto, registrado_por)
  values (p_origen, p_mensaje, p_pila, p_contexto, auth.uid());
end;
$$;

revoke all on function public.registrar_evento_error(text, text, text, jsonb) from public;
grant execute on function public.registrar_evento_error(text, text, text, jsonb) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 8. Alta en el ledger
--
-- El runner añade esta fila envolviendo el script (ver cabecera): no está
-- aquí dentro para no tener que embeber el propio hash del fichero dentro
-- de sí mismo, que sería circular. Nada que hacer en este punto del script.
-- ---------------------------------------------------------------------
