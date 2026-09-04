# MIGRACIONES APLICADAS

> Qué migraciones están **realmente** aplicadas en cada proyecto de Supabase, y cuándo.
> Lo escribe el programador **después** de verificar con la RPC `esquema_version()`; nunca por
> suposición. Es el documento que el auditor contrasta contra los ficheros `db/NNN_*.sql`.
>
> **La columna `prod` vacía es la lista de propagación pendiente para T-25.** El proyecto de
> producción no existe hasta entonces, así que es normal y esperado que todas las filas la tengan
> vacía durante todo el desarrollo. No hace falta abrir nada en §3 de SEGUIMIENTO por ello.
>
> Recordatorio del protocolo (§0.1 de `HOJA_DE_RUTA.md`): en `dev` el agente aplica con
> `npm run migrate` y verifica con `esquema_version()`. En `prod` **nunca** aplica el agente: la
> propagación completa la hace el dueño una sola vez, en T-25, siguiendo esta tabla en orden. Una
> migración aplicada es **inmutable**: los arreglos van en una migración nueva, nunca editando la
> anterior.

| Nº | Fichero | Aplicada en `dev` | Aplicada en `prod` | Hash (SHA-256, primeros 12) | Notas |
|----|---------|-------------------|--------------------|------------------------------|-------|
| 000 | `000_bootstrap_perfil.sql` | 2026-08-25 | | | Arranque manual del dueño: ledger de migraciones, `esquema_version()`, tabla `perfil` con los tres roles y RLS, y trigger de creación de perfil en `auth.users`. **No la aplica el runner** |
| 000b | `000b_arreglo_permisos.sql` | **aplicada** (fecha exacta no registrada; verificada el 2026-08-27) | | | Corrección del bootstrap: `authenticated` había heredado `TRUNCATE` sobre `perfil` de los privilegios por defecto de Supabase (y `TRUNCATE` ignora RLS), y `service_role` se había quedado sin DML. Deja los privilegios explícitos y desactiva los privilegios por defecto del esquema. Sin versión propia en el ledger: es parte del arranque manual. **Verificación del 2026-08-27** (consulta de comprobación del propio fichero, ejecutada por el dueño en `dev`): `perfil` concede exactamente `authenticated` → INSERT/SELECT/UPDATE, `service_role` → DELETE/INSERT/SELECT/UPDATE, `postgres` → todos, `anon` → ninguna fila. Y `npm run migrate -- --verificar-privilegios` no encuentra ninguna violación en **ninguna** tabla de `public`. La fecha de aplicación no se anotó en su día: quedó pendiente en este documento hasta la verificación |
| 001 | `001_esquema_inicial.sql` | 2026-08-27 | | `93359e9a4e27` | Siete tablas nuevas (`centro_estudios`, `alumno`, `persona_referencia`, `slot_horario`, `asistencia`, `asistencia_historial`, `evento_error`), triggers de inmutabilidad y de rastro de `asistencia`, RPC `registrar_evento_error`, RLS habilitada sin políticas (las escribe T-10) y privilegios explícitos por tabla. Aplicada por el dueño con `npm run migrate` (tras arreglar la carga de `.env.local`, ver `DECISIONES_TECNICAS.md`). **Verificada:** `esquema_version()` devuelve `1` |
| 002 | `002_bloqueo_cuenta.sql` | 2026-08-31 | | `52cea674a482` | P-01: columnas `perfil.intentos_fallidos`/`perfil.bloqueado`, `rol_actual()` redefinida con `not bloqueado`, RPC `registrar_intento_fallido`/`admin_desbloquear_usuario`. Aplicada por el dueño con `npm run migrate` (fila 4 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-08-31**). **Verificada:** `esquema_version()` devuelve `3` (cubre esta migración y la `003` de la fila siguiente; el runner aplica en orden numérico y aborta al primer error) |
| 003 | `003_politicas_rls.sql` | 2026-08-31 | | `85a76098fb61` | T-10: políticas RLS de los tres roles en las ocho tablas de `public` más `storage.objects` (bucket `avatares`, adelantado a esta migración aunque el bucket lo cree T-14). Aplicada por el dueño con `npm run migrate` (fila 5 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-08-31**). **Verificada en ejecución, no solo en SQL estático:** `esquema_version()` devuelve `3`; `npm run probar-rls` contra `dev` — 51 comprobaciones, 3 omitidas (las del bucket de avatares, que no existía hasta la fila siguiente), 0 fallidas |
| 004 | `004_bucket_avatares.sql` | 2026-08-31 | | `5fc008390dee` | T-14: crea el bucket privado `avatares` (`allowed_mime_types = image/webp`, `file_size_limit` 2 MiB); sus políticas de `storage.objects` ya existían desde `003`. Aplicada por el dueño con `npm run migrate` (fila 6 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-08-31**). **Verificada:** `esquema_version()` devuelve `4`; `npm run probar-rls` confirma que la escritura del bucket queda bloqueada por política RLS sobre `storage.objects` (no por un GRANT); las dos comprobaciones de lectura siguen omitidas porque el bucket está vacío (nadie ha subido un avatar todavía — ver P-09) |
| 005 | `005_rpc_registrar_asistencia.sql` | 2026-09-01 | | `ad3b648eeeb0` | T-18: índice único parcial de duplicado alumno+slot+día, tabla `limite_tasa` + `aplicar_limite_tasa()` (primer uso real del contrato de T-06: 60 operaciones por profesor y minuto) y RPC `registrar_asistencia`, `SECURITY DEFINER`. Aplicada por el dueño con `npm run migrate` (fila 7 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-09-01**). **Verificada:** `esquema_version()` devuelve `5`. ⚠️ **Aplicada CON un bug conocido**, destapado en la misma sesión por `npm run probar-rls` (67 comprobaciones, 0 omitidas, 4 fallidas): `aplicar_limite_tasa()` lee la fila previa sin cualificar dentro de su `ON CONFLICT ... DO UPDATE` y PostgreSQL la rechaza con `column reference "ventana_inicio" is ambiguous`, lo que tumba las trece comprobaciones de la sección 7b. La migración queda **inmutable tal cual está**; el arreglo es la `006` de la fila siguiente. Es un error de análisis de la sentencia, así que el `INSERT` nunca llegó a ejecutarse: `limite_tasa` está vacía y no hay dato que limpiar |
| 006 | `006_arreglo_limite_tasa_ambiguo.sql` | 2026-09-01 | | `6de505c4b933` | Arreglo del bug con el que se aplicó la `005`: `aplicar_limite_tasa()` leía la fila previa sin cualificar dentro de su `ON CONFLICT ... DO UPDATE`, y PostgreSQL la rechazaba (`column reference "ventana_inicio" is ambiguous`) porque `limite_tasa` y `excluded` están las dos en ámbito. `create or replace` con la MISMA firma; no toca nada más. Aplicada por el dueño con `npm run migrate` (fila 8 de §3 de `SEGUIMIENTO.md`). **Verificada en el ledger** (`npm run migrate -- --estado` la lista con el hash de arriba) **y en ejecución**: `npm run probar-rls` da 67 comprobaciones, 0 omitidas, 0 fallidas, con las trece de la sección 7b (`registrar_asistencia`) pasando y cada rechazo trayendo su motivo propio. ⚠️ **Única migración en LF**; las demás están en CRLF. Los dos finales de línea son los que tiene su hash en el ledger, y `.gitattributes` los clava para que ningún checkout los reescriba (ver la nota del final) | 
| 007 | `007_rpc_buscar_alumnos.sql` | 2026-09-02 | | `792e0a398c55` | T-20: RPC `buscar_alumnos_activos(p_texto, p_limite)`, `SECURITY DEFINER`, tipo de retorno explícito que hace estructuralmente imposible devolver contacto, personas de referencia o avatar. Aplicada por el dueño con `npm run migrate` (fila 9 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-09-02**). **Verificada:** `npm run migrate -- --estado` la lista con el hash de arriba (el ledger llegó a `esquema_version()` = `8` porque el dueño aplicó `007` y `008` en la misma pasada); `npm run probar-rls` confirma la sección 8b entera en `[OK]` (cinco comprobaciones, incluidas "sin contacto ni personas de referencia" y "un `student` no puede llamarla") |
| 008 | `008_rpc_actualizar_asistencia.sql` | 2026-09-02 | | `d7e1a1f47001` | T-21: RPC `actualizar_asistencia(...)`, `SECURITY DEFINER`, única vía de modificación de un registro de asistencia ya existente (cambiar alumno, ajustar hora, cambiar el slot atribuido, anular con motivo, editar la nota); reutiliza `aplicar_limite_tasa()` de `005`. Aplicada por el dueño con `npm run migrate` (fila 10 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-09-02**). **Verificada:** `esquema_version()` = `8`; `npm run probar-rls` — 89 comprobaciones, 0 omitidas, 0 fallidas, sección 8c completa (edición propia/ajena, ventana de 7 días, anular exige motivo, dos modificaciones dejan dos filas de historial, cambio de alumno/slot con sus rechazos) y sección 5 ampliada con `UPDATE`/`DELETE` directo denegados |
| 009 | `009_administracion_usuarios.sql` | **aplicada** ≤ 2026-09-03 (fecha exacta no registrada; verificada el 2026-09-04) | | `0d996c48420d` | T-24: columna `perfil.actualizado_por` (la fija el trigger, nunca el cliente) y trigger `perfil_before_update`, que sustituye a `perfil_tocar_actualizado_en` del bootstrap y aborta un `UPDATE` que dejaría al sistema sin ningún `administrator` activo. Aplicada por el dueño con `npm run migrate` (fila 11 de §3 de `SEGUIMIENTO.md`, **RESUELTA 2026-09-04**). **Verificada el 2026-09-04 con `npm run migrate -- --estado`:** el ledger de `dev` trae la fila `009 009_administracion_usuarios` con hash `0d996c48420d06a528a34841eb10735bb678c8733870f986e3d3f8bf0e4bd882`, idéntico al SHA-256 del fichero en disco. **El instante exacto de aplicación no es recuperable**: `esquema_migracion` no lo guarda, y esta fila llega dos días tarde porque nadie la anotó en su momento. La prueba de que ya estaba aplicada el 2026-09-03 es la ejecución de `npm run probar-rls` de ese día (105 comprobaciones, 0 omitidas, 0 fallidas): las dos comprobaciones de la sección 8e sobre `perfil_before_update` exigen `%último administrator%` en `sqlerrm` y habrían fallado si el trigger no existiera. Ver la entrada del 2026-09-04 en `HISTORIAL_SESIONES.md` |

---

## Nota sobre los hashes y los finales de línea (2026-09-01)

El hash de esta tabla es el SHA-256 del fichero **tal cual está en el disco**, que es exactamente lo
que calcula el runner y lo que guarda en `esquema_migracion`. Los finales de línea entran en ese
hash: el mismo SQL en CRLF y en LF da dos hashes distintos.

Eso ya mordió una vez. Las filas 002, 003 y 004 llegaron a documentarse con el hash **LF** de sus
ficheros, mientras el ledger de `dev` guardaba el **CRLF** — la tabla llevaba tres valores que no
correspondían a nada. Se corrigieron el 2026-09-01 contra la salida real de
`npm run migrate -- --estado`, que es la única fuente de verdad de esta columna:

| Nº | Documentado antes (incorrecto) | Real en el ledger |
|----|--------------------------------|-------------------|
| 002 | `1c3f8c8aff62` | `52cea674a482` |
| 003 | `4e4c50a92dab` | `85a76098fb61` |
| 004 | `1065196e1662` | `5fc008390dee` |

Dos guardas para que no vuelva a pasar, ninguna de las cuales depende de que alguien se acuerde:

1. **`.gitattributes`** clava los finales de línea de cada `db/*.sql` a los que tiene su hash en el
   ledger. Sin él, un `git clone` en otra máquina (o con otro `core.autocrlf`) reescribiría los
   ficheros y `npm run migrate` abortaría con `ErrorHashCambiado` en migraciones que no han cambiado
   ni una letra, sin poder aplicar ninguna nueva.
2. **`herramientas/migraciones/hashesAplicadas.test.ts`** contrasta en cada `npm test` el hash
   documentado aquí contra el fichero en disco. No necesita credenciales ni red: si un checkout
   cambia un final de línea, la suite se pone roja antes de que nadie llegue a ejecutar el runner.

Lo que **no** cubren: que el valor de esta tabla corresponda al del ledger remoto. Eso solo lo dice
`npm run migrate -- --estado`, y es lo que hay que ejecutar al anotar una fila nueva.

---

## Pendiente de aplicar

> Migración escrita y empujada a `develop`, todavía **sin** fila en la tabla de arriba porque nadie
> la ha aplicado ni verificado (§0.1: el agente nunca aplica DDL). Se anota aquí, fuera de la tabla
> y sin hash, para que `herramientas/migraciones/hashesAplicadas.test.ts` reconozca el fichero sin
> que el agente tenga que fabricar un hash de una migración que no está aplicada. Se mueve a la
> tabla de arriba, con su hash real, en cuanto el dueño confirme (§3 de `SEGUIMIENTO.md`).

**`010_registro_ausencias.sql`** (R-01, "registro explícito de ausencias") — escrita y empujada a
`develop` el 2026-09-04, todavía sin aplicar. Añade `'ausente'` al `CHECK` de `asistencia.estado`,
sustituye el índice de duplicado `asistencia_uq_alumno_slot_dia_valida` (`005`, inmutable, no se
edita) por uno más amplio (`asistencia_uq_alumno_slot_dia_activa`, cubre también `'ausente'`) y añade
la RPC `registrar_ausencia(...)`, `SECURITY DEFINER`. Qué debe ver el dueño al terminar: `git pull` +
`npm run migrate` en local, comprobar que `esquema_version()` devuelve `10`, y ejecutar también
`npm run probar-rls` (nueva sección 8g de `db/pruebas_rls.sql`: alta de ausencia por `teacher`,
duplicado alumno+slot+día contra la nueva restricción, `student` sin acceso). Fila 13 de §3 de
`SEGUIMIENTO.md`. T-25 (BLOQUEADA, ver fila 12) queda inafectada: `010` es posterior y no forma parte
de las diez migraciones de su paso a producción.

**`011_justificacion_ausencia.sql`** (R-02, "justificación de una ausencia") — escrita y empujada a
`develop` el 2026-09-04, todavía sin aplicar. Añade dos columnas a `asistencia`/`asistencia_historial`
(`motivo_justificacion`, lista corta cerrada con `CHECK`; `nota_justificacion`, texto libre), sustituye
el trigger de copia a historial (`asistencia_copiar_a_historial()`, `001`, inmutable, no se edita ese
fichero) para que incluya las dos columnas nuevas, y sustituye `actualizar_asistencia` (`008`,
inmutable) por una versión con tres parámetros nuevos (`p_justificar`, `p_motivo_justificacion`,
`p_nota_justificacion`) — `drop function` + `create function` con la firma completa, no una segunda
sobrecarga. Qué debe ver el dueño al terminar: `git pull` + `npm run migrate` en local, comprobar que
`esquema_version()` devuelve `11`, y ejecutar también `npm run probar-rls` (nueva sección 8h de
`db/pruebas_rls.sql`: justificar dentro de la ventana de edición del profesor, fuera de la ventana
rechazado para `teacher` y aceptado para `administrator`, motivo fuera de la lista cerrada rechazado,
justificar un registro que no está ausente rechazado). Fila 14 de §3 de `SEGUIMIENTO.md`. T-25
(BLOQUEADA, ver fila 12) queda inafectada: `011` es posterior y no forma parte de las diez migraciones
de su paso a producción.

*(`009_administracion_usuarios.sql` salió de aquí el 2026-09-04 al confirmarse aplicada; su fila está
en la tabla de arriba.)*

> **Lección del 2026-09-04, segunda vez que pasa lo mismo** (la primera, el 2026-08-31 con
> `002`/`003`/`004`: §3 las daba por `RESUELTA` y esta tabla solo tenía `001`). Una migración puede
> estar aplicada en `dev` sin que este documento lo sepa, porque quien la aplica es el dueño y
> quien escribe aquí es el agente. **Leer esta sección no es comprobar el estado del esquema.** Si
> una tarea lleva más de una sesión `BLOQUEADA` esperando una migración, la comprobación barata es
> pedir al dueño `npm run migrate -- --estado` (solo lectura, una línea) en vez de repetir la
> verificación pre-push y volver a esperar. Y si hay un `npm run probar-rls` reciente en verde con
> 0 omitidas, sus secciones dicen qué DDL existe ya en `dev`: es una fuente de estado que el
> agente sí puede leer sin ninguna credencial.
