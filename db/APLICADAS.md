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
