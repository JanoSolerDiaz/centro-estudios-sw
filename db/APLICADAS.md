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
|    |         |                   |                    |                              |       |
