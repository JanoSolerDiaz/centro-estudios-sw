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
| 000b | `000b_arreglo_permisos.sql` | *(pendiente de aplicar)* | | | Corrección del bootstrap: `authenticated` había heredado `TRUNCATE` sobre `perfil` de los privilegios por defecto de Supabase (y `TRUNCATE` ignora RLS), y `service_role` se había quedado sin DML. Deja los privilegios explícitos y desactiva los privilegios por defecto del esquema. Sin versión propia en el ledger: es parte del arranque manual |
| 001 | `001_esquema_inicial.sql` | 2026-08-27 | | `93359e9a4e27` | Siete tablas nuevas (`centro_estudios`, `alumno`, `persona_referencia`, `slot_horario`, `asistencia`, `asistencia_historial`, `evento_error`), triggers de inmutabilidad y de rastro de `asistencia`, RPC `registrar_evento_error`, RLS habilitada sin políticas (las escribe T-10) y privilegios explícitos por tabla. Aplicada por el dueño con `npm run migrate` (tras arreglar la carga de `.env.local`, ver `DECISIONES_TECNICAS.md`). **Verificada:** `esquema_version()` devuelve `1` |
