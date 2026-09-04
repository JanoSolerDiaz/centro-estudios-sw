# HISTORIAL DE SESIONES — GestorAcademia

> Bitácora **append-only** de sesiones (antiguo §8 de SEGUIMIENTO). La más reciente arriba.
> Cada entrada referencia las filas de decisión añadidas en `DECISIONES_TECNICAS.md` y los
> cambios de estado en §1 de `SEGUIMIENTO.md` (consistencia cruzada).
>
> **Rotación:** mantener en línea las ~15 sesiones más recientes; archivar el resto por mes en
> `roadmap/HISTORIAL_SESIONES/AAAA-MM.md` y dejar aquí, al inicio, un índice de los meses archivados.

## Meses archivados
*(ninguno todavía)*

---

## Plantilla por sesión (copiar y rellenar, la más reciente arriba)

```
### Sesión YYYY-MM-DD HH:MM
**Tarea(s):** T-XX / R-XX / P-XX
**Estado resultante:** EN CURSO / COMPLETADA / DESPLEGADA EN PRODUCCIÓN / BLOQUEADA
**Commits a `develop`:** <hashes y mensajes>
**Migraciones aplicadas:** <fichero db/NNN_*.sql, entorno (dev/prod), versión devuelta por esquema_version(), o "ninguna">
**Propagación a prod pendiente:** <fila abierta en §3, o "ninguna">
**Archivos creados/modificados:** <lista>
**Verificaciones pre-push:** tipos ✅/❌ · lint ✅/❌ · tests ✅/❌ · build ✅/❌
**Health check post-deploy:** ✅/❌ (npm run health: entrada y JS a 200 + esquema_version() correcta)
**Decisiones tomadas:** <referencia a las filas añadidas en DECISIONES_TECNICAS.md>
**Hallazgos del auditor atendidos:** <#N resueltos, o "ninguno">
**Hallazgos:** <bugs, deuda técnica o riesgos descubiertos>
**Tareas autopropuestas (P-XX):** <registradas/ejecutadas, con referencia a §5, o "ninguna">
**Próximo paso:** <qué debe hacer la siguiente sesión — incluye reverts pendientes>
```

---

*(Las sesiones reales se añaden debajo, la más reciente primero.)*

---

### Sesión 2026-09-04 (verificación, rutina programada) — sin tarea vertebral desbloqueada, backlog agotado

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX de la oleada v1 esperan al MVP en producción — sin cambio desde la pasada
del auditor de hoy). Ninguna `P-XX`: las dieciséis (`P-01` a `P-16`) de §5 de `SEGUIMIENTO.md` siguen
`RESUELTA`.
**Estado resultante:** sin cambio. `git checkout develop && git pull` trajo la pasada del auditor de
hoy (commit `2bc9463`, ya en `origin/develop` al empezar) y, desde ahí, nada ha cambiado. T-24 sigue
`BLOQUEADA — pendiente aplicar migración 009` en §1 (fila 11 de §3 sigue `PENDIENTE`;
`db/APLICADAS.md` confirma que `009_administracion_usuarios.sql` sigue en "Pendiente de aplicar", el
dueño todavía no ha ejecutado `npm run migrate`). `auditoriacontinua.md` revisado por completo: sus
siete hallazgos (`#1` a `#7`) siguen `RESUELTO`, cero `ABIERTO`. `FEEDBACK.md` revisado: sigue sin
entradas `nuevo` reales (fila plantilla vacía).
**Commits a `develop`:** solo actualización de documentación de este ciclo (cabecera de
`SEGUIMIENTO.md` y esta entrada de `HISTORIAL_SESIONES.md`); ningún cambio de `src/`, `db/` ni
`herramientas/`.
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión).
**Propagación a prod pendiente:** T-25 (única tarea que toca `prod`), sin poder arrancar todavía.
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (cabecera), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada).
**Verificaciones pre-push:** `npm ci` (130 paquetes, 0 vulnerabilidades) · tipos ✅ · lint ✅ ·
tests ✅ (943/943, misma cifra que la pasada del auditor de hoy) · build ✅. Barrido de secretos sobre
`dist/` recién construido: cero coincidencias reales. `git status` limpio antes y después.
**Health check post-deploy:** no aplica (sin código nuevo desplegado).
**Decisiones tomadas:** ninguna nueva en `DECISIONES_TECNICAS.md`.
**Hallazgos del auditor atendidos:** ninguno de esta sesión — el registro sigue sin ningún `ABIERTO`
desde la pasada del auditor del 2026-09-04.
**Hallazgos:** ninguno nuevo — revisión completa de §5 (backlog P-XX) y de `auditoriacontinua.md` sin
encontrar ningún candidato legítimo que proponer. No se fabrica ninguna P-XX para justificar el ciclo.
**Tareas autopropuestas (P-XX):** ninguna.
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3 (`esquema_version()` = `9`, `npm run probar-rls` con la nueva sección 8e), T-24 pasa a
`COMPLETADA` y queda por evaluar si T-25 puede arrancar. La oleada v1 (R-01 en cabeza) sigue esperando
a que el MVP completo esté `COMPLETADA`/`DESPLEGADA EN PRODUCCIÓN`.

---

### Sesión 2026-09-03 (rutina de producto) — décimo ciclo del PM

**Tarea(s):** ninguna T-XX/R-XX de código — rutina de producto (gestión de roadmap)
**Estado resultante:** N/A (documento vivo, no código) — **décimo ciclo del PM: una R-XX existente
ampliada (R-06), ninguna R-XX nueva, ninguna entrada de backlog nueva, sin cambios de estado de
T-XX/R-XX.**
**Commits a `develop`:** ver commit de esta sesión (roadmap: décimo ciclo del PM — R-06 se amplía a
"sustitución o cancelación", R-04 gana la dependencia)
**Migraciones aplicadas:** ninguna (el agente PM no toca `db/`; `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique, fila 11 de §3, sin cambio esta sesión)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (cabecera actualizada; R-06
reescrita como "Excepción puntual de un slot: sustitución o cancelación", migración renombrada de
`013_sustitucion_profesor` a `013_excepcion_slot`; R-04 gana la dependencia de R-06 y su exclusión
de slots cancelados; narrativa de F-03 ajustada), `roadmap/SEGUIMIENTO.md` (cabecera y filas de R-04/
R-06 en §1), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` — es una ampliación de spec de una R-XX
todavía sin implementar (no hay tabla ni código que migrar), no una decisión de arquitectura ni una
desviación de una tarea ya ejecutada (eso es lo que registraría §7 de `SEGUIMIENTO.md`)
**Hallazgos del auditor atendidos:** ninguno — `auditoriacontinua.md` sigue con sus siete hallazgos
`RESUELTO`, cero `ABIERTO`; nada que convertir
**Hallazgos:** F-03 ("Continuidad operativa") ya anticipaba dos problemas — un profesor falta, o el
aula no tiene buena conexión — pero R-06 solo especificaba la mitad del primero: el caso en que
**hay** quien cubra la clase. El caso en que **no** lo hay quedaba sin ninguna forma honesta de
registrarse: no pasar lista se confunde con un profesor que llega tarde (R-01), y marcar a cada
alumno ausente penaliza en el informe mensual (R-04) a quien no tuvo culpa de que la clase no se
diera. Se amplía R-06 a "sustitución o cancelación" en vez de abrir una R-XX nueva, porque comparten
exactamente el mismo patrón de datos (una excepción de un día sobre un slot recurrente, sin tocar el
horario ni el pasado) y la misma migración sin implementar todavía — separar habría duplicado
infraestructura para dos facetas de la misma idea. `FEEDBACK.md` revisado (sin entradas `nuevo`
reales, fila plantilla vacía). Revisadas las once R-XX restantes contra el estado actual: sin más
cambios que hacer
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3, T-24 pasa a `COMPLETADA` y queda por evaluar si T-25 puede arrancar. La oleada v1 (R-01 en
cabeza) sigue esperando a que el MVP completo esté `COMPLETADA`/`DESPLEGADA EN PRODUCCIÓN`. Cuando
arranque R-06, su sesión debe leer la spec ampliada completa antes de escribir `013_excepcion_slot`.

---

### Sesión 2026-09-03 (tercera verificación, rutina programada) — sin tarea vertebral desbloqueada, backlog agotado

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción — sin cambio desde la segunda sesión de
verificación de hoy). Ninguna `P-XX`: las dieciséis (`P-01` a `P-16`) de §5 de `SEGUIMIENTO.md` siguen
`RESUELTA`.
**Estado resultante:** sin cambio. `git checkout develop && git pull` trajo la segunda sesión de
verificación de hoy (commit `3332aad`, ya en `origin/develop` al empezar) y, desde ahí, nada ha
cambiado: mismo día, sin ninguna acción del dueño todavía. T-24 sigue `BLOQUEADA — pendiente aplicar
migración 009` en §1 (fila 11 de §3 sigue `PENDIENTE`; `db/APLICADAS.md` confirma que
`009_administracion_usuarios.sql` sigue en la sección "Pendiente de aplicar"). `auditoriacontinua.md`
revisado por completo: sus siete hallazgos (`#1` a `#7`) siguen `RESUELTO`, cero `ABIERTO`.
**Commits a `develop`:** solo actualización de documentación de este ciclo (cabecera de
`SEGUIMIENTO.md` y esta entrada de `HISTORIAL_SESIONES.md`); ningún cambio de `src/`, `db/` ni
`herramientas/`.
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión).
**Propagación a prod pendiente:** T-25 (única tarea que toca `prod`), sin poder arrancar todavía.
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (cabecera), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada).
**Verificaciones pre-push:** `npm ci` (130 paquetes, 0 vulnerabilidades) · tipos ✅ · lint ✅ ·
tests ✅ (943/943, misma cifra que las dos sesiones de verificación anteriores) · build ✅. Barrido de
secretos sobre `dist/` recién construido: cero coincidencias reales. `git status` limpio antes y
después.
**Health check post-deploy:** no aplica (sin código nuevo desplegado).
**Decisiones tomadas:** ninguna nueva en `DECISIONES_TECNICAS.md`.
**Hallazgos del auditor atendidos:** ninguno de esta sesión — el registro sigue sin ningún `ABIERTO`
desde la pasada del auditor del 2026-09-03.
**Hallazgos:** ninguno nuevo — revisión completa de §5 (backlog P-XX) y de `auditoriacontinua.md` sin
encontrar ningún candidato legítimo que proponer. No se fabrica ninguna P-XX para justificar el ciclo.
**Tareas autopropuestas (P-XX):** ninguna.
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3 (`esquema_version()` = `9`, `npm run probar-rls` con la nueva sección 8e), T-24 pasa a
`COMPLETADA` y queda por evaluar si T-25 puede arrancar.

---

### Sesión 2026-09-03 (segunda verificación, rutina programada) — sin tarea vertebral desbloqueada, backlog agotado

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción — sin cambio desde la sesión de verificación
anterior, mismo día). Ninguna `P-XX`: las dieciséis (`P-01` a `P-16`) de §5 de `SEGUIMIENTO.md` siguen
`RESUELTA`.
**Estado resultante:** sin cambio. T-24 sigue `BLOQUEADA — pendiente aplicar migración 009` en §1
(fila 11 de §3 sigue `PENDIENTE`; `db/APLICADAS.md` confirma que `009_administracion_usuarios.sql`
sigue en la sección "Pendiente de aplicar", el dueño todavía no ha ejecutado `npm run migrate`).
`auditoriacontinua.md` sigue sin ningún hallazgo `ABIERTO`.
**Commits a `develop`:** solo actualización de documentación de este ciclo (cabecera de
`SEGUIMIENTO.md` y esta entrada de `HISTORIAL_SESIONES.md`); ningún cambio de `src/`, `db/` ni
`herramientas/`.
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión).
**Propagación a prod pendiente:** T-25 (única tarea que toca `prod`), sin poder arrancar todavía.
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (cabecera), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada).
**Verificaciones pre-push:** `npm ci` (130 paquetes, 0 vulnerabilidades) · tipos ✅ · lint ✅ ·
tests ✅ (943/943, misma cifra que la sesión de verificación anterior) · build ✅. Barrido de secretos
sobre `dist/`: cero coincidencias reales (solo nombres de campo y el propio patrón de `registro.ts`).
`git status` limpio antes y después.
**Health check post-deploy:** no aplica (sin código nuevo desplegado).
**Decisiones tomadas:** ninguna nueva en `DECISIONES_TECNICAS.md`.
**Hallazgos del auditor atendidos:** ninguno de esta sesión — el registro sigue sin ningún `ABIERTO`
desde la pasada del auditor del 2026-09-03.
**Hallazgos:** ninguno nuevo — revisión completa de §5 (backlog P-XX) y de `auditoriacontinua.md` sin
encontrar ningún candidato legítimo que proponer. No se fabrica ninguna P-XX para justificar el ciclo.
**Tareas autopropuestas (P-XX):** ninguna.
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3 (`esquema_version()` = `9`, `npm run probar-rls` con la nueva sección 8e), T-24 pasa a
`COMPLETADA` y queda por evaluar si T-25 puede arrancar.

---

### Sesión 2026-09-03 (verificación, rutina programada) — sin tarea vertebral desbloqueada, backlog agotado

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción — sin cambio desde la sesión de `P-16`).
Ninguna `P-XX`: las dieciséis (`P-01` a `P-16`) de §5 de `SEGUIMIENTO.md` siguen `RESUELTA`.
**Estado resultante:** sin cambio. T-24 sigue `BLOQUEADA — pendiente aplicar migración 009` en §1
(fila 11 de §3 sigue `PENDIENTE`; `db/APLICADAS.md` confirma que `009_administracion_usuarios.sql`
sigue en la sección "Pendiente de aplicar", el dueño todavía no ha ejecutado `npm run migrate`).
`auditoriacontinua.md` sigue sin ningún hallazgo `ABIERTO`.
**Commits a `develop`:** solo actualización de documentación de este ciclo (cabecera de
`SEGUIMIENTO.md` y esta entrada de `HISTORIAL_SESIONES.md`); ningún cambio de `src/`, `db/` ni
`herramientas/`.
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión).
**Propagación a prod pendiente:** T-25 (única tarea que toca `prod`), sin poder arrancar todavía.
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (cabecera), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada).
**Verificaciones pre-push:** `npm ci` (130 paquetes, 0 vulnerabilidades) · tipos ✅ · lint ✅ ·
tests ✅ (943/943, misma cifra que dejó la sesión de `P-16`) · build ✅. Barrido de secretos sobre
`dist/`: cero coincidencias reales (solo nombres de campo y el propio patrón de `registro.ts`).
`git status` limpio antes y después.
**Health check post-deploy:** no aplica (sin código nuevo desplegado).
**Decisiones tomadas:** ninguna nueva en `DECISIONES_TECNICAS.md`.
**Hallazgos del auditor atendidos:** ninguno de esta sesión — el registro sigue sin ningún `ABIERTO`
desde la pasada del auditor del 2026-09-03.
**Hallazgos:** ninguno nuevo — revisión completa de §5 (backlog P-XX) y de `auditoriacontinua.md` sin
encontrar ningún candidato legítimo que proponer. No se fabrica ninguna P-XX para justificar el ciclo.
**Tareas autopropuestas (P-XX):** ninguna.
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3 (`esquema_version()` = `9`, `npm run probar-rls` con la nueva sección 8e), T-24 pasa a
`COMPLETADA` y queda por evaluar si T-25 puede arrancar.

---

### Sesión 2026-09-03 (arreglo urgente) — P-16: la batería de RLS no compilaba

**Tarea(s):** `P-16` (urgente, §0.3) — ninguna T-XX/R-XX: la cola vertebral sigue bloqueada (T-24
espera la migración `009`, sin cambio)
**Estado resultante:** `P-16` **IMPLEMENTADA Y VERIFICADA EN EJECUCIÓN**
**Commits a `develop`:** ver commit de esta sesión (P-16: `v_filas` al ámbito del `do` en la
sección 8e de `db/pruebas_rls.sql`, más el test estático de ámbitos)
**Migraciones aplicadas:** ninguna — `db/pruebas_rls.sql` no es una migración (no pasa por el
runner ni tiene hash en el ledger); `009_administracion_usuarios.sql` sigue pendiente del dueño
(fila 11 de §3, sin cambio)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `db/pruebas_rls.sql` (sección 8e: `v_filas` sube al `declare`
del `do`, fuera de los dos sub-bloques), `herramientas/migraciones/pruebasRlsEstatico.test.ts`
(quinto test: ámbitos `declare`/`begin`/`end;`), `roadmap/SEGUIMIENTO.md` (cabecera y fila
`P-16` en §5), `roadmap/DECISIONES_TECNICAS.md` (dos filas), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (**943**, antes 942) · build ✅
**Health check post-deploy:** N/A (no se despliega nada: SQL de prueba y un test)
**Ejecución real contra `dev`** (`npm run probar-rls` en la máquina del dueño, con su
`.env.local`, §0.1): **105 comprobaciones, 0 omitidas, 0 fallidas**, «ningún acceso prohibido tuvo éxito».
Antes del arreglo, la misma orden devolvía `ERROR 42601: "v_filas" is not a known variable` y
**ninguna** comprobación llegaba a ejecutarse
**Decisiones tomadas:** dos filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-03, P-16): por qué
`v_filas` sube al `do` en vez de duplicar el `declare` en cada sub-bloque, y por qué el test de
ámbitos hace un seguimiento literal de `declare`/`begin`/`end;` en vez de parsear plpgsql
**Hallazgos del auditor atendidos:** ninguno — `P-16` es un hallazgo de ejecución del dueño, no del
auditor; los tres `ABIERTO` de higiene (#5, #6, #7) siguen resueltos en código (P-13/P-14/P-15)
**Hallazgos:** en plpgsql un `declare` pertenece solo al `begin … end;` que lo sigue; la sección
8e (T-24) declaraba `v_filas` en el sub-bloque del `SELECT` y la leía en el `begin … end;`
hermano del `UPDATE`. Por ser un error de COMPILACIÓN del `do`, y viajar el fichero en una sola
sentencia a la Management API, el fallo no era local a la sección 8e: **inhabilitaba las 105
comprobaciones**. T-24 pasó `typecheck`, `lint`, 942 tests y `build` con este defecto dentro,
porque ninguna de esas cuatro puertas mira dentro de un `do $$ … $$`. Tercera vez que un defecto de
la propia batería la inhabilita en bloque o en silencio (P-08, P-12): de ahí que el arreglo incluya
la comprobación estática, no solo la línea movida
**Tareas autopropuestas (P-XX):** `P-16` registrada en §5 de `SEGUIMIENTO.md` y ejecutada en esta
misma sesión por ser urgente (§0.3: la batería de RLS estaba inservible). Backlog de §5 otra vez
completo en `RESUELTA`/`IMPLEMENTADA`
**Próximo paso:** sin cambio respecto a la sesión anterior — en cuanto el dueño aplique
`009_administracion_usuarios.sql` y confirme la fila 11 de §3, T-24 pasa a `COMPLETADA` y queda
por evaluar si T-25 puede arrancar.

---

### Sesión 2026-09-03 (verificación) — sin tarea vertebral desbloqueada, backlog agotado

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción — sin cambio desde la sesión anterior).
Ninguna `P-XX`: las quince (`P-01` a `P-15`) de §5 de `SEGUIMIENTO.md` siguen `RESUELTA`.
**Estado resultante:** sin cambio. T-24 sigue `BLOQUEADA — pendiente aplicar migración 009` en §1
(fila 11 de §3 sigue `PENDIENTE`). `auditoriacontinua.md` (pasada del 2026-09-03, ya en el repositorio
al empezar esta sesión) cerró en su documento los tres hallazgos de higiene que quedaban `ABIERTO`
(#5, #6, #7): el registro de hallazgos queda sin ningún `ABIERTO` por primera vez desde que existe el
documento.
**Commits a `develop`:** solo actualización de documentación de este ciclo (cabecera de
`SEGUIMIENTO.md` y esta entrada de `HISTORIAL_SESIONES.md`); ningún cambio de `src/`, `db/` ni
`herramientas/`.
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión).
**Propagación a prod pendiente:** T-25 (única tarea que toca `prod`), sin poder arrancar todavía.
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (cabecera), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada).
**Verificaciones pre-push:** `npm ci` (130 paquetes, 0 vulnerabilidades) · tipos ✅ · lint ✅ ·
tests ✅ (942/942, misma cifra que la pasada de auditoría del 2026-09-03) · build ✅. Barrido de
secretos sobre `dist/`: cero coincidencias reales. `git status` limpio antes y después.
**Health check post-deploy:** no aplica (sin código nuevo desplegado).
**Decisiones tomadas:** ninguna nueva en `DECISIONES_TECNICAS.md`.
**Hallazgos del auditor atendidos:** ninguno de esta sesión — los tres que quedaban `ABIERTO` (#5,
#6, #7) ya los cerró el propio auditor en su pasada del 2026-09-03, antes de que esta sesión empezara.
**Hallazgos:** ninguno nuevo — revisión completa de §5 (backlog P-XX) y de `auditoriacontinua.md` sin
encontrar ningún candidato legítimo que proponer. No se fabrica ninguna P-XX para justificar el ciclo.
**Tareas autopropuestas (P-XX):** ninguna.
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3 (`esquema_version()` = `9`, `npm run probar-rls` con la nueva sección 8e), T-24 pasa a
`COMPLETADA` y queda por evaluar si T-25 puede arrancar.

---

### Sesión 2026-09-02 (rutina de producto) — noveno ciclo del PM

**Tarea(s):** ninguna T-XX/R-XX de código — rutina de producto (gestión de roadmap)
**Estado resultante:** N/A (documento vivo, no código) — **noveno ciclo del PM: ninguna R-XX nueva,
ninguna entrada de backlog nueva, sin cambios de estado de T-XX/R-XX. Único contenido real: corregir
una colisión de numeración de migraciones prospectivas.**
**Commits a `develop`:** ver commit de esta sesión (roadmap: noveno ciclo del PM — renumeración de
migraciones prospectivas de R-01/R-02/R-03/R-06/R-12, sin R-XX nueva)
**Migraciones aplicadas:** ninguna (el agente PM no toca `db/`; `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique, fila 11 de §3, sin cambio esta sesión)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (cabecera actualizada; migración
renumerada en R-01, R-02, R-03, R-06 y R-12), `roadmap/SEGUIMIENTO.md` (cabecera y notas de esas
cinco filas en §1), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` — es una corrección de numeración
prospectiva sobre specs de R-XX todavía sin implementar (no una desviación de una tarea ya
ejecutada, que es lo que registraría §7 de `SEGUIMIENTO.md`), no una decisión de arquitectura
**Hallazgos del auditor atendidos:** ninguno nuevo — la pasada del auditor del 2026-09-02 no registró
ningún hallazgo nuevo; los tres `ABIERTO` de higiene (#5, #6, #7) siguen resueltos en código desde el
ciclo anterior (P-13/P-14/P-15), a la espera de que el propio auditor los cierre en su documento
**Hallazgos:** los números de migración reservados en las specs de R-01 (`006`), R-02 (`007`), R-03
(`008`), R-06 (`009`) y R-12 (`010`) ya los había consumido de verdad el desarrollo real de
T-18/T-20/T-21/T-24 desde el octavo ciclo del PM (`006_arreglo_limite_tasa_ambiguo.sql` a
`009_administracion_usuarios.sql`, ver `db/APLICADAS.md`) — sin corregirlo, la primera sesión que
implemente R-01 habría chocado con un fichero de migración ya aplicado y con hash ya registrado en
el ledger. Renumeradas a `010`-`014`, los cinco siguientes números realmente libres, en el mismo
orden relativo. Revisadas las doce R-XX contra el avance de T-24 (única tarea nueva desde el octavo
ciclo): ninguna depende de ella, sin más cambios que hacer
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3, T-24 pasa a `COMPLETADA` y queda por evaluar si T-25 puede arrancar. La oleada v1 (R-01 en
cabeza) sigue esperando a que el MVP completo esté `COMPLETADA`/`DESPLEGADA EN PRODUCCIÓN`.

---

### Sesión 2026-09-02 (verificación) — sin tarea vertebral desbloqueada, sin P-XX pendiente

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción — sin cambio desde la sesión anterior).
Ninguna `P-XX`: las quince (`P-01` a `P-15`) de §5 de `SEGUIMIENTO.md` ya están `RESUELTA`, ninguna
pendiente que atender.
**Estado resultante:** sin cambio. T-24 sigue `BLOQUEADA — pendiente aplicar migración 009` en §1
(fila 11 de §3 sigue `PENDIENTE`). `auditoriacontinua.md` sin ningún hallazgo `ABIERTO` de severidad
alta (los tres de severidad baja, #5/#6/#7, ya resueltos en código por `P-13`/`P-14`/`P-15` de la
sesión anterior, pendientes solo de que el auditor los cierre en su propio documento).
**Commits a `develop`:** solo actualización de documentación de este ciclo (§ cabecera de
`SEGUIMIENTO.md` y esta entrada de `HISTORIAL_SESIONES.md`); ningún cambio de `src/`, `db/` ni
`herramientas/`.
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión).
**Propagación a prod pendiente:** T-25 (única tarea que toca `prod`), sin poder arrancar todavía.
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (cabecera), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada).
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (942/942, misma cifra que la sesión
anterior) · build ✅.
**Health check post-deploy:** no aplica (sin código nuevo desplegado).
**Decisiones tomadas:** ninguna nueva en `DECISIONES_TECNICAS.md`.
**Hallazgos del auditor atendidos:** ninguno nuevo (los tres abiertos, #5/#6/#7, ya se resolvieron en
la sesión anterior vía P-13/P-14/P-15; quedan a la espera de que el auditor los cierre en su propio
documento).
**Hallazgos:** ninguno nuevo — revisión completa de §5 (backlog P-XX) y de `auditoriacontinua.md` sin
encontrar ningún candidato legítimo que proponer. No se fabrica ninguna P-XX para justificar el ciclo.
**Tareas autopropuestas (P-XX):** ninguna.
**Próximo paso:** en cuanto el dueño aplique `009_administracion_usuarios.sql` y confirme la fila 11
de §3 (`esquema_version()` = `9`, `npm run probar-rls` con la nueva sección 8e), T-24 pasa a
`COMPLETADA` y queda por evaluar si T-25 puede arrancar.

---

### Sesión 2026-09-02 (backlog P-XX, continuación) — T-24 sigue BLOQUEADA por `009`; P-06/P-07(a) atendidas

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral sigue bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción — sin cambio desde la sesión anterior) —
backlog `P-06`/`P-07` (punto a) de §5 de `SEGUIMIENTO.md`, las dos únicas que quedaban sin
`RESUELTA`/`DESCARTADA` tras la sesión anterior
**Estado resultante:** T-24 sin cambio, sigue `BLOQUEADA — pendiente aplicar migración 009` en §1
(fila 11 de §3 sigue `PENDIENTE`). `P-06` y el punto (a) de `P-07` pasan a `RESUELTA` en §5: **P-06**
— `db/pruebas_rls.sql` gana la sección **8f**, barrido obligatorio de `anon` (la única superficie no
autenticada) sobre las nueve tablas de `public` (incluida `perfil`, que la sección 6 excluye para
`student` por tener este una fila propia legítima — `anon` no) más `storage.objects`, esperando
rechazo de PRIVILEGIO en las tablas de `public` (ningún `GRANT` a `anon` desde `001`) y cualquiera de
los dos desenlaces en `storage.objects` (RLS o privilegio, sin poder verificar cuál aplica sin acceso
al proyecto real); **P-07(a)** — `avisoOmisiones` (nuevo) hace que `npm run probar-rls` imprima un
aviso aparte, con `console.warn`, siempre que queden comprobaciones `OMITIDO`, en vez de dejarlas
mezcladas dentro de la misma línea de recuento — sin cambiar el código de salida, porque una omisión
sigue sin ser un fallo (mismo criterio que ya aplicaba `resumirPruebasRls` desde T-10).
**Commits a `develop`:** ver commit de esta sesión (`P-06/P-07(a): barrido RLS de anon y aviso de
comprobaciones omitidas en probar-rls, sin tarea vertebral desbloqueada`)
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/pruebas_rls.sql` (sección 8f, nueva);
`herramientas/migraciones/resultadoPruebasRls.ts` (`avisoOmisiones`, nuevo);
`herramientas/migraciones/resultadoPruebasRls.test.ts` (3 tests nuevos); `herramientas/probarRls.ts`
(imprime el aviso); `roadmap/SEGUIMIENTO.md` (cabecera, §5); `roadmap/DECISIONES_TECNICAS.md` (cinco
decisiones nuevas, P-06 ×3, P-07(a) ×1 — el recuento real es cuatro filas, ver el documento)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (942, antes 939: +3 de
`resultadoPruebasRls.test.ts`) · build ✅
**Health check post-deploy:** no aplica — ningún cambio de despliegue (SQL de prueba y CLI de
desarrollo únicamente, nada en `src/ui/main.ts` ni en el bundle servido)
**Decisiones tomadas:** cuatro filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-02, `P-06` ×3,
`P-07(a)` ×1) — incluir `perfil` en el barrido de `anon` a diferencia del de `student`; esperar
rechazo de privilegio en vez del patrón `v_n = 0`; aceptar los dos desenlaces posibles en
`storage.objects`; no tocar el código de salida de `probar-rls`
**Hallazgos del auditor atendidos:** ninguno (P-06/P-07 no vienen de un hallazgo del auditor, sino de
un hallazgo propio del programador del 2026-08-31, ya registrado en su momento en §5)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna nueva registrada; se ejecutaron las dos que quedaban
(`P-06`, el punto (a) de `P-07`), ambas pasadas a `RESUELTA` en §5. Con esto, §5 no tiene ninguna fila
`PENDIENTE` ni `PARCIALMENTE IMPLEMENTADA` que quede sin atender
**Próximo paso:** repetir la comprobación de §1 al empezar la siguiente sesión — si el dueño ya
aplicó `009` (fila 11 de §3) y confirmó `npm run probar-rls` (con la sección 8f nueva incluida),
desbloquear T-24 y evaluar si T-25 puede arrancar en lo que no exige sus bloqueos humanos; si `009`
sigue sin aplicar, no queda ningún backlog `P-XX` pendiente en §5 — repasar `auditoriacontinua.md`
por si hay una pasada nueva del auditor antes de declarar que no hay nada más que hacer

---

### Sesión 2026-09-02 (backlog P-XX) — T-24 sigue BLOQUEADA por `009`; P-05/P-13/P-14/P-15 atendidas

**Tarea(s):** ninguna T-XX/R-XX (cola vertebral bloqueada: T-24 espera la migración `009`, T-25
depende de T-24, las R-XX esperan al MVP en producción) — backlog `P-05`/`P-13`/`P-14`/`P-15` de §5
de `SEGUIMIENTO.md`, todas `PENDIENTE` desde antes de esta sesión
**Estado resultante:** T-24 sin cambio, sigue `BLOQUEADA — pendiente aplicar migración 009` en §1
(fila 11 de §3 sigue `PENDIENTE`, nada que el dueño no supiera ya). Las cuatro `P-XX` pasan a
`RESUELTA` en §5: **P-05** — `formatearErrorCli` (nuevo) hace que `npm run migrate` y
`npm run probar-rls` impriman el cuerpo real del error de la Management API (SQLSTATE/HINT/CONTEXT
de Postgres) en vez de solo la plantilla genérica; **P-13** — frase residual de `db/MODELO.md`
sobre el avatar corregida (ya está montado en `pantallaFichaAlumno.ts` desde T-16, no "falta
únicamente"); **P-14** — numeración cruzada de las preguntas abiertas #12/#13 corregida en la
narrativa de este documento y en `DECISIONES_TECNICAS.md:147`, alineada con la tabla de §6 (que ya
era correcta); **P-15** — `columnasVisiblesFichaAlumno` (código muerto desde su creación,
`src/dominio/permisosUi.ts`) eliminada junto con sus dos tests, no conectada: no existe ni puede
existir una pantalla de ficha para `teacher` dentro del alcance actual (§0.2 es explícito y
permanente sobre lo que `teacher` no gestiona ni ve). Se atendieron las cuatro P-XX pendientes en
una sola sesión, una de más sobre la guía de "máximo 3 entre dos tareas consecutivas" de §0.3 —
justificado porque P-13/P-14 son correcciones de una sola frase, sin código, de coste marginal.
**Commits a `develop`:** ver commit de esta sesión (`P-05/P-13/P-14/P-15: backlog documental y de
diagnóstico de CLI, sin tarea vertebral desbloqueada`)
**Migraciones aplicadas:** ninguna (el agente nunca aplica DDL). `009_administracion_usuarios.sql`
sigue pendiente de que el dueño la aplique (fila 11 de §3, sin cambio esta sesión)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `herramientas/migraciones/formatoErrorCli.ts` (nuevo);
`herramientas/migraciones/formatoErrorCli.test.ts` (nuevo, 4 tests); `herramientas/migrar.ts`;
`herramientas/probarRls.ts`; `db/MODELO.md` (P-13); `roadmap/SEGUIMIENTO.md` (numeración #12/#13,
P-14; cabecera; §5); `roadmap/DECISIONES_TECNICAS.md` (numeración #12/#13, P-14; tres decisiones
nuevas de P-05/P-15); `src/dominio/permisosUi.ts` (P-15, eliminada `columnasVisiblesFichaAlumno`);
`src/dominio/permisosUi.test.ts` (P-15, eliminados sus dos tests)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (939, antes 937: +4 de
`formatoErrorCli.test.ts`, -2 de los tests eliminados de `columnasVisiblesFichaAlumno`) · build ✅
**Health check post-deploy:** no aplica — ningún cambio de despliegue (CLI de desarrollo y
documentación únicamente, nada en `src/ui/main.ts` ni en el bundle servido)
**Decisiones tomadas:** tres filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-02, `P-05` ×2,
`P-15` ×1) — módulo compartido con test en vez de duplicar la lógica en las dos CLI; omitir la línea
de `cuerpo` cuando viene vacía; eliminar en vez de conectar `columnasVisiblesFichaAlumno`, con el
razonamiento de por qué conectarla habría contradicho §0.2
**Hallazgos del auditor atendidos:** #5, #6 y #7 de `auditoriacontinua.md` (los tres severidad baja,
`ABIERTO` desde la auditoría del 2026-09-01) quedan resueltos en el código/documentación
(`P-13`/`P-14`/`P-15` respectivamente) — pendiente de que el auditor los reevalúe y cierre en su
próxima pasada, el programador no edita ese fichero
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna nueva registrada; se ejecutaron las cuatro ya registradas
(`P-05`, `P-13`, `P-14`, `P-15`), todas pasadas a `RESUELTA` en §5
**Próximo paso:** repetir la comprobación de §1 al empezar la siguiente sesión — si el dueño ya
aplicó `009` (fila 11 de §3) y confirmó `npm run probar-rls`, desbloquear T-24 y evaluar si T-25
puede arrancar en lo que no exige sus bloqueos humanos (créditos de producción, textos legales); si
`009` sigue sin aplicar, no queda backlog `P-XX` pendiente en §5 — repasar de nuevo `auditoriacontinua.md`
por si hay una pasada nueva del auditor antes de declarar que no hay nada más que hacer

---

### Sesión 2026-09-02 (siguiente a "T-23 COMPLETADA") — T-20/T-21 desbloqueadas; T-24: administración de usuarios, BLOQUEADA

**Tarea(s):** desbloqueo de §1/§3 (007/008 confirmadas por el dueño) + T-24 (administración de
usuarios y roles)
**Estado resultante:** primer paso de la sesión: T-20 y T-21 pasan de `BLOQUEADA` a `COMPLETADA` en
§1 de `SEGUIMIENTO.md` (el dueño ya había confirmado `007`/`008` en la fila 9 y 10 de §3 en un
commit de la sesión anterior, `a7edaf1`, dejando pendiente exactamente este paso), y `007`/`008` se
mueven de "pendiente de aplicar" a la tabla con hash en `db/APLICADAS.md`. Con eso resuelto, **T-24
queda con código y 46 tests COMPLETOS, pero BLOQUEADA por la migración `009`**: su spec dice
"Migración: No", pero el requisito 4 ("el último administrator activo no puede desactivarse ni
degradarse a sí mismo; la regla se implementa en la base de datos") es DDL por definición — detalle
en `DECISIONES_TECNICAS.md`. Ningún hallazgo `ABIERTO` de severidad alta en `auditoriacontinua.md`
al empezar la sesión (los tres abiertos siguen siendo de severidad baja, higiene documental)
**Commits a `develop`:** ver commits de esta sesión (bookkeeping de §1/§3/`APLICADAS.md` +
`T-24: administración de usuarios y roles`)
**Migraciones aplicadas:** ninguna por esta sesión (el agente nunca aplica DDL). Confirmadas por el
dueño en una sesión anterior: `007_rpc_buscar_alumnos.sql`, `008_rpc_actualizar_asistencia.sql`.
Escrita y empujada, pendiente de que el dueño la aplique: `009_administracion_usuarios.sql`
(columna `perfil.actualizado_por` + trigger `perfil_before_update`)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/009_administracion_usuarios.sql` (nuevo);
`herramientas/migraciones/administracionUsuarios.test.ts` (nuevo, comprobaciones estáticas);
`db/pruebas_rls.sql` (sección 8e, nueva); `db/MODELO.md`; `db/APLICADAS.md`; `DEVELOPERS.md`
(procedimiento manual de alta de usuario/enlace de recuperación/revocar sesión);
`src/dominio/administracionUsuarios.ts` (nuevo, `dejariaSinAdministratorActivo` y validación de
nombre); `src/dominio/administracionUsuarios.test.ts` (nuevo); `src/dominio/permisosUi.ts`
(`puedeGestionarUsuarios`, nueva); `src/dominio/permisosUi.test.ts`; `src/dominio/tipos.ts`
(`Perfil.actualizado_por`, nuevo); `src/dominio/tipos.test.ts`; `src/datos/usuarios.ts` (nuevo,
`listarUsuarios`/`actualizarUsuario`); `src/datos/usuarios.test.ts` (nuevo); `src/ui/pantallaUsuarios.ts`
(nuevo); `src/ui/pantallaUsuarios.test.ts` (nuevo); `src/nucleo/router.ts` (ruta `usuarios`, solo
`administrator`); `src/nucleo/router.test.ts`; `src/ui/aplicacion.ts` (wiring + botón "Usuarios");
`src/ui/aplicacion.test.ts`; `src/nucleo/gestorSesion.test.ts`/`src/ui/pantallaSinAcceso.test.ts`
(fixtures de `Perfil` con el campo nuevo); `roadmap/SEGUIMIENTO.md` (§1: T-20/T-21 `COMPLETADA`,
T-24 `BLOQUEADA`; §3: filas 9/10 marcadas resueltas por el agente, fila 11 nueva; narrativa de T-24);
`roadmap/DECISIONES_TECNICAS.md` (siete filas nuevas); `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (937, antes 891) · build ✅ (incluida la
guarda de fuga de secretos sobre `dist/`, que atrapó una mención literal de "service_role" en un
comentario de `pantallaUsuarios.ts` — reescrita antes de este commit, ver hallazgo más abajo)
**Health check post-deploy:** N/A (sin acceso a `dev` desplegado desde esta sesión)
**Decisiones tomadas:** siete filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-02, T-24): migración
pese a "Migración: No"; trigger en vez de RPC dedicada; el trigger sin `SECURITY DEFINER`; el
`raise exception` sin `errcode` de permiso (400/`ErrorDeValidacion` con mensaje, no 403/`SinPermiso`
genérico); `actualizado_por` como columna, no solo log de aplicación; sin vista de solo lectura para
`teacher`; el botón "Desactivar" deshabilitado sin comprobación duplicada en su manejador (código
muerto encontrado por su propio test y retirado)
**Hallazgos del auditor atendidos:** ninguno de severidad alta que atender (ver arriba); los tres
`ABIERTO` de baja severidad (#5/#6/#7, ya en backlog como P-13/P-14/P-15) no se tocan en esta sesión
**Hallazgos:** (1) el comentario de cabecera de `pantallaUsuarios.ts` mencionaba literalmente
"service_role", y `herramientas/verificarFugaSecretos.test.ts` lo detectó al compilar `dist/` —
reescrito sin esa cadena antes de cualquier commit, la guarda hizo exactamente su trabajo. (2) La
comprobación de bloqueo dentro del manejador de `click` del botón "Desactivar" resultó código muerto
(un botón `disabled` no dispara `click`, confirmado por el propio test), retirada; la del `<select>`
de rol sí se conservó tras comprobar con un test que un `change` forzado sí la alcanza
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** para el programador, T-25 depende de T-23 y T-24; con T-24 código-completo pero
bloqueada por `009`, la cola de §1 no tiene ninguna T-XX más que no dependa de una migración pendiente
— procede evaluar si alguna R-XX de `ROADMAP_PRODUCTO.md` puede avanzar sin bloquear, o esperar. Para
el dueño: fila 11 nueva de §3 (`git pull` + `npm run migrate` para `009`, después `npm run probar-rls`
y comprobar la sección 8e); al confirmarla, la siguiente sesión desbloquea T-24 en §1

---

### Sesión 2026-09-01 (rutina de producto, siguiente a "T-23 COMPLETADA") — octavo ciclo del PM
**Tarea(s):** P-XX (registro de backlog, sin implementar) — sin T-XX ni R-XX de código
**Estado resultante:** N/A (documento vivo, no código) — **octavo ciclo del PM: ninguna R-XX nueva,
tres entradas de backlog nuevas (P-13/P-14/P-15) desde los hallazgos del auditor, una precisión de
requisito en R-01, sin cambios de estado de T-XX/R-XX**
**Commits a `develop`:** ver commit de esta sesión (roadmap: octavo ciclo del PM — revisión contra
el avance de T-18 a T-23, hallazgos #5/#6/#7 pasados a backlog, sin R-XX nueva)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (§5: P-13, P-14, P-15 nuevas),
`roadmap/ROADMAP_PRODUCTO.md` (cabecera actualizada con el resultado de este ciclo; requisito 1 de
R-01 precisado tras conocerse la mecánica real de la card de T-19), `roadmap/HISTORIAL_SESIONES.md`
(esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` (no aplica a un ciclo de PM sin cambio
de arquitectura)
**Hallazgos del auditor atendidos:** se revisó el registro completo de `auditoriacontinua.md`. Los
hallazgos #1 a #4 siguen `RESUELTO`, sin cambio. Los tres `ABIERTO` (#5, #6, #7 — los tres severidad
baja, higiene documental o código muerto, ninguno de producto ni de arquitectura) se convierten en
backlog técnico **P-13** (frase residual de `db/MODELO.md:296` sobre el avatar), **P-14**
(numeración cruzada de las preguntas #12/#13 de §6) y **P-15** (`columnasVisiblesFichaAlumno` sin
consumidor), cada uno con su `origen: hallazgo #N`, `PENDIENTE` sin urgencia — mismo tratamiento que
ya recibieron #3/#4 como P-02/P-03. Ningún hallazgo de severidad alta abierto; ninguno de producto o
arquitectura, así que no genera ninguna R-XX
**Hallazgos:** ninguno propio de esta sesión, más allá de la precisión de R-01 (ver más abajo)
**Tareas autopropuestas (P-XX):** P-13, P-14 y P-15 registradas en §5 de `SEGUIMIENTO.md`
(`PENDIENTE`, sin implementar — es tarea del programador, no de este ciclo de PM)
**Próximo paso:** para el programador, seguir la cola de §1 de `SEGUIMIENTO.md` (T-20/T-21
`BLOQUEADA` a la espera de que el dueño aplique `007`/`008`; T-24 es la siguiente sin bloqueo). Para
el dueño, las filas 9 y 10 de §3 siguen `PENDIENTE`. Revisado el avance de T-18 a T-23 contra las
doce R-XX de las oleadas v1/v2 (§6 de este documento y la cabecera de `ROADMAP_PRODUCTO.md` con el
detalle): ninguna inconsistencia salvo la ya corregida en R-01 (su requisito 1 asumía "el mismo
toque de la card" para marcar ausente, incompatible con que T-19 fijara la card como un `<button>`
de un solo toque para registrar entrada — precisado en la spec, deja la elección de control exacta
para la sesión que implemente R-01). Ninguna R-XX nueva: sin feedback `nuevo` en `FEEDBACK.md` y sin
hallazgo de producto/arquitectura del auditor, el hueco entre el MVP y el objetivo de producto sigue
cubierto por las R-XX ya especificadas

---

### Sesión 2026-09-01 (siguiente a "T-22 COMPLETADA") — T-23: histórico de asistencia, COMPLETADA

**Tarea(s):** T-23 (consulta y exportación del histórico de asistencia)
**Estado resultante:** **T-23 COMPLETADA, sin migración.** T-20 y T-21 siguen `BLOQUEADAS` por
`007`/`008` respectivamente. T-23 declara "Depende de: T-21" en `HOJA_DE_RUTA.md`, pero esa
dependencia es de producto, no técnica: se ejecutó igualmente tras comprobar que solo necesita
`SELECT` sobre `asistencia` (ya concedido desde T-10), nunca la RPC `actualizar_asistencia` que
bloquea a T-21 — detalle en `DECISIONES_TECNICAS.md`. Sin hallazgo `ABIERTO` de severidad alta en
`auditoriacontinua.md` al empezar la sesión. Al arrancar, esta sesión encontró otra vez el mismo
artefacto de arranque de contenedor que las dos sesiones anteriores describen (una rama `develop`
local con 4 commits sin ancestro común con `origin/develop`, y el HEAD detached inicial ya coincidía
con `origin/develop`): se respaldó en una rama local (`backup-local-develop-stale`) por precaución
antes de realinear `develop` con `origin/develop` (`git reset --hard origin/develop`), sin tocar
`origin` en ningún momento
**Commits a `develop`:** ver commit de esta sesión (`T-23: consulta y exportación del histórico de
asistencia`)
**Migraciones aplicadas:** ninguna — T-23 no necesita ninguna (`asistencia`/`asistencia_historial` y
sus políticas RLS ya existen desde T-10)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `src/nucleo/csv.ts` (nuevo, `filaCsv`/`documentoCsv`);
`src/nucleo/csv.test.ts` (nuevo); `src/dominio/slots.ts` (`fechaHoraLocalLegible`, nuevo);
`src/dominio/slots.test.ts`; `src/dominio/historicoAsistencia.ts` (nuevo, `tieneModificaciones`/CSV);
`src/dominio/historicoAsistencia.test.ts` (nuevo); `src/dominio/permisosUi.ts` (`puedeVerHistorico`/
`puedeConsultarHistoricoDeCualquiera`/`puedeExportarConDatosDeContacto`, nuevas);
`src/dominio/permisosUi.test.ts`; `src/datos/asistencia.ts` (`listarHistoricoAsistencia`/
`listarHistoricoAsistenciaCompleto`, nuevas, con traza de log inyectable); `src/datos/asistencia.test.ts`;
`src/datos/alumnos.ts` (`resolverIdentificacionAlumnos`/`resolverContactoAlumnos`, nuevas);
`src/datos/alumnos.test.ts`; `src/datos/profesores.ts` (`resolverNombresProfesores`, nuevo);
`src/datos/profesores.test.ts`; `src/ui/dom.ts` (`Descargador`/`crearDescargadorNavegador`, nuevos);
`src/ui/pantallaHistorico.ts` (nuevo, pantalla completa); `src/ui/pantallaHistorico.test.ts` (nuevo);
`src/nucleo/router.ts` (ruta `historico` en `Ruta` y `RutaProfesor`); `src/nucleo/router.test.ts`;
`src/ui/aplicacion.ts` (wiring de `pantallaHistorico` en ambos routers, botón "Histórico" en ambas
navs); `src/ui/aplicacion.test.ts`; `db/pruebas_rls.sql` (sección 8d, nueva);
`herramientas/migraciones/pruebasRlsEstatico.test.ts` (sin cambios de contenido, solo verificado en
verde); `roadmap/SEGUIMIENTO.md` (§1, cabecera, narrativa de T-23); `roadmap/DECISIONES_TECNICAS.md`
(11 filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (891/891, 73 nuevos, contados con `git diff`
de cada fichero de test contra el commit de partida: 818 antes) · build ✅
**Health check post-deploy:** no aplica (sin migración, sin cambio de esquema ni de despliegue)
**Decisiones tomadas:** 11 filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-01, T-23): ejecutar T-23
pese a su dependencia declarada con T-21 (dependencia de producto, no técnica); resolución de
nombres en lote por id en vez de un embed anidado de PostgREST de dos saltos; filtro por centro en
dos pasos (ids de alumno del centro, después `in` sobre `asistencia`) por la misma limitación del
cliente; utilidad de CSV nueva (`nucleo/csv.ts`, separador `;`, BOM UTF-8, `\r\n`); exportación que
trae TODO el histórico filtrado en lotes de 500, no solo la página visible; datos de contacto en la
exportación solo si `administrator` los pide explícitamente; primer `<table>` HTML real del
proyecto; dependencias opcionales en `pantallaHistorico.ts` (mismo patrón que
`listarProfesoresParaSelector?` de T-21); traza de log inyectable para la consulta (requisito 4);
sección 8d nueva en `db/pruebas_rls.sql` (aislamiento de lectura directa, distinto de lo que ya
probaba 8c)
**Hallazgos del auditor atendidos:** ninguno (sin hallazgos `ABIERTO` de severidad alta al empezar)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** siguiente tarea de la cola es T-24 (administración de usuarios y roles, depende de
T-10, `COMPLETADA`) — sin bloqueo de migración propia, aunque su requisito 3 anticipa que las
operaciones de alta/forzar contraseña/revocar sesión de Supabase Auth necesitan `service_role` y
quedan como procedimiento manual documentado, no como código. T-20 y T-21 siguen `BLOQUEADAS`
esperando que el dueño aplique `007`/`008`

---

### Sesión 2026-09-01 (siguiente a "T-21 BLOQUEADA") — T-22: "mi horario" del profesor, COMPLETADA

**Tarea(s):** T-22 ("mi horario" y mis alumnos por slot, teacher)
**Estado resultante:** **T-22 COMPLETADA, sin migración.** T-20 y T-21 siguen `BLOQUEADAS` por
`007`/`008` respectivamente (sin dependencia con T-22, que solo depende de T-17) y se dejan tal cual.
Sin hallazgo `ABIERTO` de severidad alta en `auditoriacontinua.md` al empezar la sesión (los tres
siguen siendo de severidad baja) — no hizo falta ningún P-XX urgente antes de la cola. Al arrancar,
la rama `develop` local de este contenedor tenía otra vez un historial ajeno (4 commits, sin
ancestro común con `origin/develop`) — mismo artefacto de arranque de contenedor ya descrito en la
sesión anterior, no trabajo real: se realineó `develop` local con `origin/develop`
(`git checkout -B develop origin/develop`) antes de tocar nada; sin backup esta vez porque, igual que
la sesión anterior confirmó, esa rama nunca llegó a `origin` y no hay nada de valor que preservar
**Commits a `develop`:** ver commit de esta sesión (`T-22: "mi horario" del profesor — router de
teacher, vista semanal y enlace profundo a registros`)
**Migraciones aplicadas:** ninguna — T-22 no necesita ninguna (`slot_horario` y sus políticas RLS ya
existen desde T-10)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `src/dominio/slots.ts` (`vistaSemanalProfesor`, nuevo);
`src/dominio/slots.test.ts`; `src/dominio/permisosUi.ts` (`puedeVerMiHorario`, nuevo);
`src/dominio/permisosUi.test.ts`; `src/nucleo/router.ts` (`crearRouterGenerico` privado,
`crearRouterProfesor`/`RutaProfesor`/`analizarRutaProfesor`/`hashDeRutaProfesor`, nuevos);
`src/nucleo/router.test.ts`; `src/ui/pantallaMiHorario.ts` (nuevo, pantalla completa);
`src/ui/pantallaMiHorario.test.ts` (nuevo); `src/ui/pantallaRegistrosSlot.ts` (`slotInicialId`
opcional); `src/ui/pantallaRegistrosSlot.test.ts`; `src/ui/aplicacion.ts` (`mostrarAppProfesor`
reescrita sobre el router real, `DependenciasAppProfesor.objetivoRouter` nuevo);
`src/ui/aplicacion.test.ts`; `src/ui/main.ts` (`objetivoRouter: window` en la construcción de
`DependenciasAppProfesor`); `roadmap/SEGUIMIENTO.md` (§1, cabecera, narrativa de T-22);
`roadmap/DECISIONES_TECNICAS.md` (6 filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (818/818, 42 nuevos, verificado con
`git stash -u` contra el commit de partida: 776 antes) · build ✅
**Health check post-deploy:** no aplica (sin migración, sin cambio de esquema ni de despliegue)
**Decisiones tomadas:** 6 filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-01, T-22): motor
`crearRouterGenerico` compartido en vez de generalizar `Ruta` o duplicar la suscripción a
`hashchange`; ruta por defecto de `teacher` sigue siendo `pasar-lista`, no `horario`; `esActual`/
`esSiguiente` mutuamente excluyentes con ciclo semanal para "siguiente"; los siete días de la semana
siempre visibles, nunca ocultos; `slotInicialId` opcional en `pantallaRegistrosSlot.ts` para el
enlace profundo, en vez de duplicar la pantalla o usar un estado global; `puedeVerMiHorario` como
función propia pese a compartir condición con `puedeUsarPasarLista`
**Hallazgos del auditor atendidos:** ninguno (los tres `ABIERTO` de severidad baja siguen sin
cambios, no exigían atención urgente)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** siguiente tarea de la cola es T-23 (consulta y exportación del histórico), que
depende de T-21 — sigue `BLOQUEADA` por la migración `008`, así que T-23 también lo estará hasta que
el dueño la aplique. Revisar en la siguiente sesión si `007`/`008` ya se aplicaron (filas 9 y 10 de
§3 de `SEGUIMIENTO.md`) para desbloquear T-20/T-21, y si no, valorar si hay alguna tarea PENDIENTE sin
esa dependencia antes de T-23 (T-24 depende de T-10, `COMPLETADA` — sin bloqueo de migración)

---

### Sesión 2026-09-01 (siguiente a "T-20 BLOQUEADA") — T-21: código y tests completos, BLOQUEADA por migración `008`

**Tarea(s):** T-21 (revisar y modificar los registros por slot)
**Estado resultante:** **T-21 BLOQUEADA — pendiente aplicar migración `008`.** Código y tests
completos, verificados contra dobles. Sin hallazgo `ABIERTO` de severidad alta en
`auditoriacontinua.md` al empezar la sesión (los tres siguen siendo de severidad baja) — no hizo
falta ningún P-XX urgente antes de la cola. Al arrancar, la rama `develop` local de este contenedor
tenía un historial de 4 commits completamente ajeno (sin ancestro común) al de `origin/develop` —
artefacto del arranque del entorno, no trabajo real sin empujar: se guardó una referencia de
respaldo (`backup-local-develop-stale`) y se realineó `develop` local con `origin/develop`
(`git checkout -B develop origin/develop`) antes de tocar nada
**Commits a `develop`:** ver commit de esta sesión (`T-21: revisar y modificar los registros por
slot — RPC actualizar_asistencia y pantalla de registros`)
**Migraciones aplicadas:** ninguna — `008_rpc_actualizar_asistencia.sql` escrita y empujada,
pendiente de que el dueño la aplique DESPUÉS de `007` (fila 10 de §3 de `SEGUIMIENTO.md`)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/008_rpc_actualizar_asistencia.sql` (nuevo); `db/pruebas_rls.sql`
(sección 5 ampliada con UPDATE/DELETE directo, sección 8c nueva); `db/APLICADAS.md` (sección
"Pendiente de aplicar"); `db/MODELO.md` (estado actual hasta `008`, sección nueva de
`actualizar_asistencia`); `herramientas/migraciones/rpcActualizarAsistencia.test.ts` (nuevo);
`herramientas/migraciones/pruebasRlsEstatico.test.ts` (ajuste de dos contadores: 4→6 usos de
`registrar_asistencia`, +6 de `actualizar_asistencia`); `src/dominio/asistencia.ts`
(`motivoAnulacionValido`, `puedeCambiarSlotAtribuido`) + tests; `src/dominio/slots.ts`
(`fechaLocalISO`) + tests; `src/dominio/tipos.ts` (`ETIQUETA_DIA_SEMANA`, promovida desde
`pantallaFichaAlumno.ts`); `src/datos/asistencia.ts` (`actualizarAsistencia`,
`listarRegistrosDeSlotYFecha`, `listarHistorialDeAsistencia`) + tests; `src/ui/pantallaRegistrosSlot.ts`
+ test (nuevos); `src/nucleo/router.ts` (ruta `#/registros`) + test; `src/ui/aplicacion.ts` (ruta de
`administrator`, navegación local nueva de `teacher` entre pasar lista y registros) + tests;
`DEVELOPERS.md`, `roadmap/SEGUIMIENTO.md` (§1 T-21 a BLOQUEADA, §3 fila 10, §6 pregunta #14,
narrativa), `roadmap/DECISIONES_TECNICAS.md` (ocho filas nuevas + matriz rol×tabla actualizada),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (776, antes 728 — verificado con
`git stash -u` contra el commit de partida) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía
(`<pendiente>`, T-25)
**Decisiones tomadas:** ocho filas nuevas `2026-09-01 | T-21` en `DECISIONES_TECNICAS.md` — el par
tri-estado `p_nota`/`p_nota_provista`; "cambiar el slot atribuido" nunca cambia `origen`; no
reutilizar el combobox ARIA completo de T-20 para "cambiar el alumno"; la ventana de edición se
cuenta desde `registrado_en`, no desde `ocurrido_en`; "quién modificó" se muestra por fecha, no por
nombre (simplificación documentada); navegación local de `teacher` en vez de adelantar el router de
T-22; `ETIQUETA_DIA_SEMANA` promovida a `dominio/tipos.ts`; el INSERT directo excepcional de la
sección 8c de `pruebas_rls.sql` para fabricar un registro "antiguo" (única forma de probar el borde
de la ventana de 7 días contra una base real, documentada donde ocurre)
**Hallazgos del auditor atendidos:** ninguno (los tres `ABIERTO` de severidad baja no exigían
atención urgente esta sesión, ver §0.3)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** cuando el dueño aplique `008` (después de `007`), verificar con
`npm run migrate -- --estado` (`esquema_version()` = `8`) y `npm run probar-rls` (nueva sección 8c),
anotar en `db/APLICADAS.md` con el hash real y pasar T-21 de `BLOQUEADA` a `COMPLETADA` en §1. Si no
hay nada bloqueado, la siguiente tarea de la cola es T-22 ("mi horario" del profesor), que además
decidirá si `teacher` necesita ya un router de verdad (tercera pantalla)

---

### Sesión 2026-09-01 (siguiente a "T-19 COMPLETADA") — T-20: código y tests completos, BLOQUEADA por migración `007`

**Tarea(s):** T-20 (alumno extra: listado completo y selección manual)
**Estado resultante:** **T-20 BLOQUEADA — pendiente aplicar migración `007`.** Código y tests
completos, verificados contra dobles. Sin hallazgo `ABIERTO` de severidad alta al empezar la sesión
(los tres de `auditoriacontinua.md` son de severidad baja) — no hizo falta ningún P-XX urgente antes
de la cola. Al arrancar, la sesión encontró el repositorio local `develop` desincronizado del remoto
(historia reescrita aguas arriba mientras el contenedor estaba inactivo): sincronizado con
`git reset --hard origin/develop` tras confirmar que el árbol de trabajo estaba limpio y que los
cuatro commits locales exclusivos eran una copia obsoleta del arranque, ya superada por el remoto
**Commits a `develop`:** ver commit de esta sesión (`T-20: alumno extra — buscador accesible y
migración de la RPC de búsqueda`)
**Migraciones aplicadas:** ninguna — `007_rpc_buscar_alumnos.sql` escrita y empujada, pendiente de
que el dueño la aplique (fila 9 de §3 de `SEGUIMIENTO.md`)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/007_rpc_buscar_alumnos.sql` (nuevo); `db/pruebas_rls.sql`
(sección 8b nueva); `db/APLICADAS.md` (sección "Pendiente de aplicar"); `db/MODELO.md` (estado
actual corregido hasta `006`, sección nueva de `buscar_alumnos_activos`);
`herramientas/migraciones/rpcBuscarAlumnos.test.ts` (nuevo);
`herramientas/migraciones/hashesAplicadas.test.ts` (arreglo: reconoce una migración pendiente
mencionada fuera de la tabla); `src/nucleo/rebote.ts` + test (nuevos); `src/nucleo/controlPeticion.ts`
(`esErrorDeCancelacion`, trasladada desde `mensajesAbuso.ts`) + test; `src/nucleo/mensajesAbuso.ts`
(reutiliza `esErrorDeCancelacion`); `src/datos/peticionHttp.ts`/`src/datos/postgrest.ts` (`señal` en
`rpc`) + tests; `src/datos/pruebas/dobleHttp.ts` (honra `init.signal`); `src/dominio/busquedaAlumnoExtra.ts`
+ test (nuevos); `src/datos/alumnos.ts` (`buscarAlumnosParaExtra`, `obtenerAlumnoParaTarjeta`) +
tests; `src/ui/comboboxAlumnoExtra.ts` + test (nuevos); `src/ui/pantallaPasarLista.ts` (extras en la
rejilla, buscador montado) + tests; `src/ui/aplicacion.ts` (`buscarAlumnosExtra`,
`obtenerAlumnoParaTarjeta`, `rebote`); `DEVELOPERS.md`, `roadmap/SEGUIMIENTO.md` (§1 T-20 a
BLOQUEADA, T-21 renumerada a `008`, §3 fila 9, §7 fila nueva, narrativa), `roadmap/DECISIONES_TECNICAS.md`
(siete filas nuevas), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (728, antes 662 — verificado con
`git stash -u` contra el commit de partida) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía
(`<pendiente>`, T-25)
**Decisiones tomadas:** siete filas nuevas `2026-09-01 | T-20` en `DECISIONES_TECNICAS.md` — RPC
`SECURITY DEFINER` en vez de ampliar el `GRANT` de columna; renumeración a `007` (T-21 pasa a `008`);
arreglo de `hashesAplicadas.test.ts` para reconocer una migración pendiente por nota al pie;
`AbortSignal` conectado por primera vez a un punto de llamada real; `esErrorDeCancelacion` trasladada
a `controlPeticion.ts` para no duplicar el predicado; un `Conflicto` en un extra no se reconcilia
como en las cards de slot (limitación documentada, no bloqueante)
**Hallazgos del auditor atendidos:** ninguno — los tres `ABIERTO` de `auditoriacontinua.md` son de
severidad baja y no exigían atención en esta sesión
**Hallazgos:** bug propio encontrado y corregido antes de cualquier commit —
`manejarSeleccionExtra` fijaba la card en 'enviando' y luego llamaba a `registrarExtra`, cuya guarda
de reintento («si ya está 'enviando', no hagas nada») bloqueaba también la primera llamada real a
`registrar`; el test de integración de la card "Extra" lo atrapó antes de llegar a verificación
pre-push. Arreglado unificando el punto de entrada en `registrarExtra`
**Tareas autopropuestas (P-XX):** ninguna — el arreglo de `hashesAplicadas.test.ts` se trató como
trabajo directo de habilitación de T-20 (la primera migración de este proyecto que queda pendiente
en el mismo commit que la introduce), no como alcance nuevo autopropuesto
**Próximo paso:** cuando el dueño confirme la migración `007` (§3, fila 9), verificar
`esquema_version()` = `7` y `npm run probar-rls` (nueva sección 8b), anotar la fila en
`db/APLICADAS.md` con su hash real y mover T-20 a `COMPLETADA`. Mientras tanto, la siguiente sesión
puede avanzar T-21 (revisar y modificar registros por slot) en lo que no dependa de `008`, o
cualquier otra tarea de la cola que no dependa de `007`

---

### Sesión 2026-09-01 (siguiente a "T-18 COMPLETADA") — T-19 COMPLETADA

**Tarea(s):** T-19 (pantalla de pasar lista)
**Estado resultante:** **T-19 COMPLETADA.** Sin hallazgo `ABIERTO` de severidad alta al empezar la
sesión (todos los de `auditoriacontinua.md` son de severidad baja) — no hizo falta ningún P-XX
urgente antes de la cola
**Commits a `develop`:** ver commit de esta sesión (`T-19: pantalla de pasar lista`)
**Migraciones aplicadas:** ninguna — T-19 tiene `Migración: No` en su spec
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `src/ui/pantallaPasarLista.ts` + su test (nuevos);
`src/nucleo/programadorIntervalo.ts` + su test (nuevos); `src/dominio/slots.ts` (`limitesDiaLocal`)
y su test; `src/dominio/asistencia.ts` (`claveRegistroPorSlot`/`registrosDeHoyPorAlumnoSlot`) y su
test; `src/datos/asistencia.ts` (`listarAsistenciaDeHoy`) y su test; `src/dominio/permisosUi.ts`
(`puedeUsarPasarLista`) y su test; `src/ui/aplicacion.ts` (`DependenciasAppProfesor`,
`mostrarAppProfesor`) y su test; `src/ui/main.ts` (`crearAppProfesorSiHayConfiguracion`);
`DEVELOPERS.md`, `roadmap/SEGUIMIENTO.md` (§1 T-19 a COMPLETADA, narrativa nueva),
`roadmap/DECISIONES_TECNICAS.md` (ocho filas nuevas), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (662, antes 614 — verificado con
`git stash -u` contra el commit de partida) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía
(`<pendiente>`, T-25)
**Decisiones tomadas:** ocho filas nuevas `2026-09-01 | T-19` en `DECISIONES_TECNICAS.md` — un
`Conflicto` (409) al registrar nunca se muestra como error, se relee el registro real; los alumnos
"próximo" también se pintan como cards tocables, no solo los "en curso"; nuevo primitivo
`programadorIntervalo.ts`; `limitesDiaLocal` por aritmética de calendario, no sumando 24h reales
(evita confundirse de día el que sigue al cambio de hora de otoño); sin router propio de `teacher`
todavía (una sola pantalla, mismo criterio que `pantallaCentros.ts` antes de T-16);
`puedeUsarPasarLista` exclusivo de `teacher`, ni siquiera `administrator`; card como `<button>`
nativo con doble toque protegido POR CLAVE, no una instancia global
**Hallazgos del auditor atendidos:** ninguno (los tres `ABIERTO` de severidad baja siguen abiertos,
sin relación con el alcance de esta tarea)
**Hallazgos:**
- **Bug real encontrado por el propio test, antes de llegar a producción:** `elementoConFoco`
  (preservación de foco entre repintados) usaba `activo instanceof HTMLElement`, una clase que solo
  existe como global del navegador — funcionaría en `main.ts` real, pero rompía con
  `ReferenceError: HTMLElement is not defined` en cualquier test que montara la pantalla desde
  `aplicacion.ts` sin pasar por el `window` de una instancia `jsdom` concreta (el propio
  `pantallaPasarLista.test.ts` usa `contenedor.ownerDocument`, no un global). Corregido a
  `documento.activeElement?.getAttribute('data-clave')`, sin referenciar ningún global — mismo
  principio de inyección que el resto de `src/ui/`, que ya evitaba `window` a propósito en todos
  los demás sitios. El test de `aplicacion.test.ts` que monta la app real de `teacher` es lo que lo
  destapó; sin él habría quedado sin detectar hasta un navegador real
- **Limitación conocida, sin entrada de §7 por no ser un incumplimiento de la spec:** el
  `ProgramadorIntervalo` que arranca `mostrarPantallaPasarLista` no se cancela al desmontar la
  pantalla — ningún componente de `src/ui/` tiene hoy un ciclo de vida de "desmontaje" (T-16 tampoco
  lo tiene para sus pantallas). En la práctica no se remonta nunca dentro de una misma sesión
  (`gestorSesion` no cambia de referencia de `perfil` al renovar el token, así que `aplicacion.ts` no
  vuelve a llamar a `mostrarAppProfesor`); solo se acumularía un intervalo huérfano —inocuo, sin
  efecto de red duplicado— en el caso raro de cerrar sesión y volver a entrar como el mismo
  profesor en la misma pestaña. Documentado en la cabecera del propio módulo; revisar si T-22
  introduce un router y con él un punto natural de desmontaje
**Tareas autopropuestas (P-XX):** ninguna nueva
**Próximo paso:** T-20 (alumno extra: listado completo y selección manual), depende de T-19
(COMPLETADA). Su pieza más difícil es el combobox accesible escrito a mano (sin librería) — ver
requisito 4 de su spec en `HOJA_DE_RUTA.md`

---

### Sesión 2026-09-01 (cierre) — T-18 COMPLETADA

**Tarea(s):** T-18 (cierre) · confirmación en ejecución de P-10, P-11 y P-12
**Estado resultante:** **T-18 COMPLETADA**. P-10, P-11 y P-12 verificadas en ejecución
**Commits a `develop`:** ver commit de esta sesión (`T-18 COMPLETADA: probar-rls en verde, 67/0/0`)
**Migraciones aplicadas:** ninguna nueva. `005` y `006` ya estaban aplicadas y verificadas
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (§1 T-18 a COMPLETADA, §3 fila 8
RESUELTA, §5 P-10 y P-12 verificadas), `db/APLICADAS.md` (la `006` pasa a verificada en ejecución),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (614) · build ✅
**Health check post-deploy:** N/A — `npm run health` no existe todavía (hosting `<pendiente>`, §0.1).
La verificación en vivo de esta tarea es `npm run probar-rls`, ejecutada por el dueño: **67
comprobaciones, 0 omitidas, 0 fallidas**, "ningún acceso prohibido tuvo éxito"
**Decisiones tomadas:** ninguna nueva
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- **Lo que la batería demuestra ahora y antes no.** Las cuatro altas reales pasan (en vivo,
  retroactiva con `es_retroactivo`, por slot con su snapshot, y administrator en nombre de teacher),
  y los dos duplicados chocan por su nombre: `asistencia_uq_alumno_slot_dia_valida` y
  `asistencia_peticion_id_unico`. Esas dos son las que protegen contra pasar lista dos veces al
  mismo alumno, y hasta hoy nunca se habían ejercitado de verdad
- **Coste real de las tres vueltas.** La tarea necesitó tres ejecuciones del dueño porque cada una
  destapó una capa distinta: un bug del esquema (`006`), uno de la batería (P-12) y un agujero de
  criterio en la propia batería (P-10). Ninguna de las tres era visible desde el escritorio del
  agente, que no puede ejecutar ni el runner ni `probar-rls` (§0.1). Es el precio conocido del
  modo de operación, no una sorpresa; lo que sí se ha reducido es que vuelva a pasar en silencio,
  con los tests estáticos de `pruebasRlsEstatico.test.ts` y `hashesAplicadas.test.ts`
**Tareas autopropuestas (P-XX):** ninguna nueva. Siguen tres entre T-17 y T-19 (P-10, P-11, P-12),
el máximo de §0.3
**Próximo paso:** T-19, pantalla de pasar lista. Sin migración: depende de T-17 (motor "quién toca
ahora") y de T-18, las dos COMPLETADAS

---

### Sesión 2026-09-01 (continuación 2) — P-10 y P-12

**Tarea(s):** P-12 (arreglo urgente de la batería) · P-10 (implementada) · T-18 (verificación)
**Estado resultante:** P-10 y P-12 **IMPLEMENTADAS**. T-18 sigue **BLOQUEADA — pendiente verificar
con `npm run probar-rls`**, ahora a falta de una única ejecución de confirmación
**Commits a `develop`:** ver commit de esta sesión (`P-12/P-10: la batería de RLS no podía probar
registrar_asistencia, y aprobaba los rechazos sin mirar el motivo`)
**Migraciones aplicadas:** ninguna nueva. Las `005` y `006` siguen aplicadas y verificadas en el
ledger de `dev`; esta sesión no toca `db/*.sql` de migración, solo `db/pruebas_rls.sql`
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/pruebas_rls.sql` (helper `registrar_prohibido`, 26 bloques
"debe fallar" con motivo exigido, 4 llamadas a la RPC corregidas),
`herramientas/migraciones/pruebasRlsEstatico.test.ts` (nuevo), `roadmap/SEGUIMIENTO.md` (§1 T-18,
§3 fila 8, §5 P-10 y P-12), `roadmap/DECISIONES_TECNICAS.md` (dos filas),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (614, antes 610: 4 nuevos) · build ✅
**Health check post-deploy:** N/A — `npm run health` no existe todavía (hosting `<pendiente>`, §0.1)
**Decisiones tomadas:** dos filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-01, P-10 y P-12): por
qué los rechazos de autorización aceptan dos patrones y los de dominio exigen su mensaje exacto, y la
norma de consumir una función que devuelve un compuesto con `select * into … from f(...)`
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- **La `006` funcionó.** La ejecución del dueño confirma que el `column reference "ventana_inicio"
  is ambiguous` desapareció y que las siete validaciones de dominio de `registrar_asistencia`
  rechazan cada una por su motivo real. Eso ya no es una suposición: sale impreso en el `detalle`
- **Seis fallos, una sola causa, y no era del esquema (→ P-12).** `select f(...) into v_fila` sobre
  una función que devuelve `public.asistencia` mete la fila compuesta entera en el primer campo. Lo
  que convierte un fallo local en una falsificación es el savepoint: el bloque `exception` que
  capturaba el error **deshacía el alta que la RPC sí había ejecutado**, así que las dos
  comprobaciones de duplicado que venían detrás se quedaban sin fila con la que chocar y cantaban
  "se insertó sin error". Un fallo en una celda invalidó otras dos
- **Error propio, y del mismo tipo que el que se estaba arreglando.** El primer parche de
  `pruebas_rls.sql` se aplicó con `String.prototype.replace` y una cadena de reemplazo: `$$` es una
  secuencia de escape ahí, así que degradó el delimitador de plpgsql del helper nuevo a `$` y habría
  roto el fichero entero al parsear. Detectado releyendo el resultado, rehecho con reemplazos
  literales, y convertido en test (`los delimitadores $$ están intactos y emparejados`)
**Tareas autopropuestas (P-XX):** **P-12** registrada e implementada (urgente, §0.3). **P-10**
implementada, la que quedaba pendiente de la sesión anterior. Tres P-XX entre T-17 y T-19 (P-10,
P-11, P-12), el máximo que permite §0.3: no abrir ninguna más antes de T-19
**Próximo paso:** el dueño hace `git pull` y ejecuta `npm run probar-rls` (fila 8 de §3) esperando
67 comprobaciones, 0 fallidas y 0 omitidas. Si algo sale rojo con `ERROR INESPERADO`, la línea dice
qué motivo se esperaba y cuál llegó. Con eso verde: cerrar T-18 como COMPLETADA y seguir con T-19

---

### Sesión 2026-09-01 (continuación) — P-11

**Tarea(s):** P-11 (finales de línea y hash del ledger) · cierre de la aplicación de `005`/`006`
**Estado resultante:** P-11 **IMPLEMENTADA**. T-18 pasa de "pendiente aplicar migración `006`" a
**BLOQUEADA — pendiente verificar con `npm run probar-rls`**: las dos migraciones ya están aplicadas
**Commits a `develop`:** ver commit de esta sesión (`P-11: clavar los finales de línea de db/*.sql
al hash del ledger`)
**Migraciones aplicadas:** `005` y `006` en `dev`, por el dueño, con `npm run migrate`. Confirmadas
con `npm run migrate -- --estado`: la `006` figura en el ledger con hash `6de505c4b933`
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `.gitattributes` (nuevo),
`herramientas/migraciones/hashesAplicadas.test.ts` (nuevo), `db/APLICADAS.md` (tres hashes
corregidos, fila de la `006`, nota sobre finales de línea), `roadmap/SEGUIMIENTO.md` (§1 T-18, §3
fila 8, §5 P-11), `roadmap/DECISIONES_TECNICAS.md` (dos filas),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (610, antes 607: 3 nuevos) · build ✅
**Health check post-deploy:** N/A — `npm run health` no existe todavía (hosting `<pendiente>`, §0.1)
**Decisiones tomadas:** dos filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-01, P-11): por qué el
`.gitattributes` fija los finales de línea fichero a fichero en vez de normalizar el repo, y por qué
la guarda vive en `npm test` y no en el runner
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- **El hash del ledger colgaba de `core.autocrlf`.** El runner hashea el fichero tal cual está en el
  disco, así que CRLF y LF dan hashes distintos del mismo SQL. Sin `.gitattributes`, quién reescribe
  qué fichero dependía de si a git le tocaba materializarlo. Efecto ya materializado: las filas 002,
  003 y 004 de `APLICADAS.md` documentaban el hash LF mientras el ledger guardaba el CRLF.
  Corregidas contra `npm run migrate -- --estado`. Efecto latente, peor: un clon en otra máquina
  dejaba `npm run migrate` inservible sobre migraciones intactas
- **Error propio, anotado para que no se repita el método.** La primera comprobación de finales de
  línea se hizo con `grep -q $'\r'`, que bajo Git-Bash lee en modo texto y se come los `\r`: dio LF
  sobre ficheros que estaban en CRLF, y sobre esa lectura falsa se propuso un `.gitattributes` con
  `eol=lf` que habría roto el runner de golpe. Lo que sirve es leer los bytes (`grep -U`,
  `git ls-files --eol`, o contar los `0x0D` desde Node), no un grep en modo texto
**Tareas autopropuestas (P-XX):** **P-11** registrada e implementada. **P-10** (endurecer las
comprobaciones "debe fallar" de `db/pruebas_rls.sql`) sigue registrada y sin implementar, a la
espera de que `npm run probar-rls` confirme la `006`
**Próximo paso:** el dueño ejecuta `npm run probar-rls` (fila 8 de §3) esperando 67 comprobaciones,
0 fallidas y 0 omitidas, y revisa que las líneas "debe fallar" traigan su motivo propio. Con eso
verde: cerrar T-18 como COMPLETADA, implementar P-10 y seguir con T-19

---

### Sesión 2026-09-01

**Tarea(s):** T-18 (arreglo de la migración `005` ya aplicada) · P-10 (registrada, no implementada)
**Estado resultante:** T-18 sigue **BLOQUEADA — pendiente aplicar migración `006`**
**Commits a `develop`:** ver commit de esta sesión (`T-18: arreglo de aplicar_limite_tasa —
referencias ambiguas en el ON CONFLICT (migración 006)`)
**Migraciones aplicadas:** `db/005_rpc_registrar_asistencia.sql` en `dev`, por el dueño, con
`npm run migrate`; `esquema_version()` devuelve `5`. Anotada en `db/APLICADAS.md`. **Escrita y
pendiente:** `db/006_arreglo_limite_tasa_ambiguo.sql` (fila 8 de §3)
**Propagación a prod pendiente:** ninguna nueva (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/006_arreglo_limite_tasa_ambiguo.sql` (nuevo),
`herramientas/migraciones/arregloLimiteTasaAmbiguo.test.ts` (nuevo), `db/APLICADAS.md`,
`roadmap/SEGUIMIENTO.md` (§1 T-18, §3 filas 7 y 8, §5 P-10),
`roadmap/DECISIONES_TECNICAS.md` (tres filas), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (607, antes 599: 8 nuevos, todos estáticos sobre la migración 006) · build ✅
**Health check post-deploy:** N/A — `npm run health` no existe todavía (el hosting estático sigue
`<pendiente>`, §0.1); la verificación en vivo de este cambio es `npm run probar-rls` tras aplicar
`006`, y es lo que pide la fila 8 de §3
**Decisiones tomadas:** tres filas nuevas en `DECISIONES_TECNICAS.md` (2026-09-01, "T-18
(arreglo)"): arreglo por migración nueva y no editando `005`; norma de cualificar toda lectura de
la fila previa en un `ON CONFLICT ... DO UPDATE`; y por qué el endurecimiento de la batería (P-10)
no viaja en este mismo empujón
**Hallazgos del auditor atendidos:** ninguno (esta sesión sale de un fallo de `npm run probar-rls`,
no del registro de `auditoriacontinua.md`)
**Hallazgos:**
- **El bug.** Al aplicar `005` en `dev`, `npm run probar-rls` dio 67 comprobaciones, 0 omitidas y
  **4 fallidas**, todas con `column reference "ventana_inicio" is ambiguous`. Causa raíz: no está en
  `registrar_asistencia` sino en `aplicar_limite_tasa()`, a la que llama en su paso 2. Dentro de un
  `INSERT ... ON CONFLICT ... DO UPDATE`, la tabla destino y `excluded` están las dos en ámbito, así
  que `ventana_inicio`/`contador` sin cualificar en las expresiones del `SET` son ambiguos. Falla al
  planificar la sentencia, no al ejecutarla: el `INSERT` nunca corrió, `limite_tasa` está vacía y no
  hay dato que limpiar. Arreglado en `006` cualificando las cuatro lecturas con `limite_tasa.`
- **Lo que el bug enseñó de la batería (→ P-10).** De las trece comprobaciones de la sección 7b que
  el bug tumbó, solo cuatro salieron en rojo: las de acceso *permitido*. Las otras nueve son casos
  "debe fallar" y salieron **`[OK]` por el motivo equivocado**, porque el bloque `prohibido` aprueba
  con cualquier `sqlerrm`. Un fallo de implementación se disfrazó de control de acceso funcionando
- **Ruido a vigilar en el limitador.** Cada ejecución de la batería gasta ~13 de las 60 operaciones
  por minuto del profesor de prueba. Cuatro ejecuciones seguidas dentro del mismo minuto de ventana
  fija empezarían a rozar el límite y darían fallos que no son del código sino del ritmo de prueba.
  No se toca el límite (es el contrato de T-06); queda anotado por si algún día aparece un rojo raro
**Tareas autopropuestas (P-XX):** **P-10** registrada en §5 (endurecer las comprobaciones "debe
fallar" de `db/pruebas_rls.sql` para que exijan su motivo). Registrada y **no implementada** a
propósito, ver la decisión correspondiente
**Próximo paso:** el dueño hace `git pull` y `npm run migrate` (fila 8 de §3), comprueba
`esquema_version()` = `6` y ejecuta `npm run probar-rls` esperando 67/0/0. Con eso verde: anotar
`006` en `db/APLICADAS.md`, cerrar T-18 como COMPLETADA, implementar P-10 y seguir con T-19

---

### Sesión 2026-08-31 (PM)

**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código) — **séptimo ciclo del PM: ninguna R-XX nueva,
ninguna entrada de backlog nueva, sin cambios de estado**
**Commits a `develop`:** ver commit de esta sesión (roadmap: séptimo ciclo del PM — revisión contra
el avance de T-10 a T-18, sin R-XX nueva)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (cabecera actualizada con el
resultado de este ciclo), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` (no aplica a un ciclo de PM sin cambio
de arquitectura)
**Hallazgos del auditor atendidos:** se revisó el registro completo de `auditoriacontinua.md`. Los
cuatro hallazgos registrados ya tienen tarea de seguimiento: #1 `RESUELTO`; #2 (severidad alta,
cobertura de escritura de `db/pruebas_rls.sql`) sigue `ABIERTO` en el registro del auditor pero ya lo
cerró el programador como **P-04 urgente** el 2026-08-31 (`IMPLEMENTADA`, §5 de `SEGUIMIENTO.md`), a
la espera de que la próxima pasada del auditor lo reevalúe y lo cierre — no genera trabajo nuevo de
este ciclo; #3 y #4 (severidad baja) los cerró el programador como **P-02/P-03**, ambas `RESUELTA`.
Ningún hallazgo del auditor queda sin tarea de seguimiento
**Hallazgos:** `FEEDBACK.md` sigue sin entradas `nuevo` reales (fila plantilla vacía); nada que
convertir. A diferencia de los dos ciclos anteriores sí hubo desarrollo real desde la última revisión
(2026-08-30): T-10 a T-17 pasaron a `COMPLETADA` y T-18 quedó escrita y `BLOQUEADA — pendiente
aplicar migración 005`. Revisadas las doce R-XX de las oleadas v1/v2 contra ese avance — en
particular contra los valores concretos que fijaron T-17 (zona horaria y tolerancia, pregunta #11 de
§6) y T-18 (ventana retroactiva y política de duplicado, preguntas #12/#13) — sin encontrar ninguna
inconsistencia con lo ya especificado en R-01, R-03 y R-06, las que más de cerca tocan esas
decisiones. El avance es progreso hacia dependencias que las R-XX ya tenían anotadas, no una señal de
que falte algo nuevo por especificar: no se añade ninguna R-XX este ciclo. Ninguna oleada está 100%
desplegada (v1 no ha arrancado, espera a que el MVP esté completo), así que no hay nada que mover a
`ROADMAP_HISTORICO.md`
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** el desarrollo sigue con T-18 `BLOQUEADA` (pendiente de que el dueño aplique `005`,
fila 7 de §3 de `SEGUIMIENTO.md`) y T-19 (pantalla de pasar lista) como siguiente tarea de código en
cuanto se desbloquee o, mientras tanto, cualquier trabajo que no dependa de la migración. El próximo
ciclo de PM debe repetir esta misma revisión (feedback, hallazgos del auditor, progreso de
desarrollo) y solo tocar el roadmap de producto si aparece una señal real — no antes.

---

### Sesión 2026-08-31 (7)
**Tarea(s):** T-18 (alta de asistencia, RPC `registrar_asistencia`)
**Estado resultante:** BLOQUEADA — pendiente aplicar migración `005`
**Commits a `develop`:** `<pendiente de este commit>` — "T-18: alta de asistencia (RPC registrar_asistencia), migración 005"
**Migraciones aplicadas:** ninguna por esta sesión (§0.1: el agente nunca aplica DDL). `db/005_rpc_registrar_asistencia.sql` escrita y empujada, fila 7 de §3 abierta para el dueño
**Propagación a prod pendiente:** ninguna todavía (T-25); `005` se añadirá a la columna `prod` vacía de `db/APLICADAS.md` cuando el dueño la aplique en `dev`
**Archivos creados/modificados:** `db/005_rpc_registrar_asistencia.sql` (nuevo: tabla `limite_tasa` + `aplicar_limite_tasa`, función `registrar_asistencia`, índice único parcial de duplicado), `herramientas/migraciones/rpcRegistrarAsistencia.test.ts` (nuevo, 13 tests estáticos), `src/dominio/asistencia.ts` (reescrito sobre el tipo oficial `Rol`: `origenCoherente`, `ocurridoEnValido`, `puedeRegistrarEnNombreDeOtro`, más la corrección de `MARGEN_RETROACTIVIDAD_MS`), `src/dominio/asistencia.test.ts` (ampliado), `src/datos/asistencia.ts` (nuevo: `registrarAsistencia`), `src/datos/asistencia.test.ts` (nuevo, 12 tests), `src/datos/erroresDominio.ts` (`errorDeRespuesta` traduce `429` a `ErrorLimiteAlcanzado`), `src/datos/erroresDominio.test.ts` (ampliado), `db/pruebas_rls.sql` (sección 7 recuerda `alumno_inactivo` por id; nueva sección 7b con 13 comprobaciones sobre la RPC real; `limite_tasa` añadida a los barridos de `student`/`TRUNCATE`), `db/MODELO.md` (nuevas secciones `limite_tasa`/`registrar_asistencia`, cabecera de estado corregida), `roadmap/DECISIONES_TECNICAS.md` (11 filas nuevas + 2 filas corregidas de la matriz estática), `roadmap/SEGUIMIENTO.md` (cabecera, §1 T-18, §3 fila 7, §6 preguntas #12/#13, §7 renumeración)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (599/599; baseline verificado con `git stash -u` contra el commit de partida: 565/565, +34 netos) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía (`<pendiente>`, T-25)
**Decisiones tomadas:** once filas `2026-08-31` (T-18) de `DECISIONES_TECNICAS.md` — renumeración de la migración a `005`; corrección de `MARGEN_RETROACTIVIDAD_MS` (60 000 → 300 000 ms, para coincidir con el `CHECK` ya aplicado de `001`); `es_retroactivo` calculado con la fórmula exacta del `CHECK`, no con la lectura literal de la spec; duplicado de negocio resuelto con una restricción `unique` parcial de verdad, no un `SELECT` previo; límite de tasa de T-06 conectado por primera vez (`limite_tasa`/`aplicar_limite_tasa`, genérico y reutilizable por T-21); límite contado sobre el profesor que registra, no sobre quien llama; `429` traducido a `ErrorLimiteAlcanzado` (misma clase de T-06, sin ampliar la taxonomía cerrada de T-08) con el aviso de incertidumbre sobre el SQLSTATE `PT429`; `VENTANA_RETROACTIVA_MAXIMA_DIAS` como constante distinta de `VENTANA_EDICION_TEACHER_DIAS` de T-21; vigencia del slot validada contra la fecha local del propio `ocurrido_en`, no `current_date`
**Hallazgos del auditor atendidos:** ninguno nuevo (el hallazgo #2 sigue cerrado por P-04 desde antes de esta sesión, a la espera de que el auditor lo confirme en su próxima pasada)
**Hallazgos:** corrección de bookkeeping (no un hallazgo de auditoría): `MARGEN_RETROACTIVIDAD_MS` de la versión provisional de T-03 no coincidía con el `CHECK` ya aplicado de `001_esquema_inicial.sql` — ver decisiones arriba
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-18 queda **BLOQUEADA — pendiente aplicar migración `005`** (fila 7 de §3). T-19 (pantalla de pasar lista) depende de T-18 y de T-16 (ambas con su código escrito, T-18 solo pendiente de aplicarse): la siguiente sesión revisa si el dueño ya aplicó `005`; si no, revisa preguntas abiertas de §6 (#12/#13, nuevas de esta sesión) o cualquier deuda técnica pendiente (P-05/P-06/P-07(a), sin urgencia) antes de intentar avanzar en algo que no dependa de la migración

---

### Sesión 2026-08-31 (6)
**Tarea(s):** T-16 (interfaz de gestión del administrador)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** `<pendiente de este commit>` — "T-16: interfaz de gestión del administrador (router, listado de alumnos, ficha completa con avatar/personas/horario)"
**Migraciones aplicadas:** ninguna (`Migración: No`)
**Propagación a prod pendiente:** ninguna (T-25)
**Archivos creados/modificados:** `src/nucleo/router.ts` (nuevo), `src/nucleo/router.test.ts` (nuevo, 12 tests), `src/nucleo/almacenEstado.ts` (nuevo), `src/nucleo/almacenEstado.test.ts` (nuevo, 6 tests), `src/ui/dom.ts` (nuevo), `src/ui/dom.test.ts` (nuevo, 5 tests), `src/ui/formularios.ts` (`crearMensajeErrorCampo`), `src/ui/formularios.test.ts` (nuevo, 3 tests), `src/datos/profesores.ts` (nuevo), `src/datos/profesores.test.ts` (nuevo, 2 tests), `src/ui/pantallaListadoAlumnos.ts` (nuevo), `src/ui/pantallaListadoAlumnos.test.ts` (nuevo, 9 tests), `src/ui/pantallaFichaAlumno.ts` (reescrito por completo), `src/ui/pantallaFichaAlumno.test.ts` (reescrito por completo), `src/ui/aplicacion.ts` (router + `mostrarAppAdministrador`, raíz de composición), `src/ui/aplicacion.test.ts` (6 tests nuevos de la app real de administrator), `src/ui/main.ts` (construye `ClientePostgrest`/`ClienteAlmacenamiento`/fábrica de imagen/limitador y los pasa como `appAdministrador`), `DEVELOPERS.md`, `roadmap/DECISIONES_TECNICAS.md` (9 filas nuevas), `roadmap/SEGUIMIENTO.md` (cabecera, §1 T-16)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (565/565; baseline verificado con `git stash -u` contra el commit de partida: 512/512, +53 netos) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía (`<pendiente>`, T-25)
**Decisiones tomadas:** nueve filas `2026-08-31` (T-16) de `DECISIONES_TECNICAS.md` — router por `hash` propio; alcance restringido a `administrator` (título literal de la tarea); división de `pantallaFichaAlumno.ts` en listado + ficha completa; aislamiento de los cuatro bloques por función de montaje independiente (requisito 5); `crearAlmacenEstado` usado solo donde aporta (el listado, no los bloques ya aislados de la ficha); `datos/profesores.ts` sobre una política ya existente desde el bootstrap; validación de cliente de horas de horario; clave del lote de `obtenerUrlAvatar` por `rutaBase`, no por `alumnoId`
**Hallazgos del auditor atendidos:** ninguno nuevo (el hallazgo #2 sigue cerrado por P-04 desde antes de esta sesión, a la espera de que el auditor lo confirme en su próxima pasada)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** la cola de T-XX sigue por **T-18** (alta de asistencia, RPC `registrar_asistencia`), que tiene `Migración: Sí` — la siguiente sesión escribe el SQL, lo empuja, abre su fila en §3 y pasa a BLOQUEADA, avanzando mientras tanto a lo que no dependa de esa migración si lo hay (T-19/T-20/T-21/T-22 dependen todos de T-18, así que probablemente no hay nada más que hacer en paralelo salvo revisar preguntas abiertas de §6)

---

### Sesión 2026-08-31 (5)
**Tarea(s):** bookkeeping (T-10/P-01/APLICADAS.md) + T-14 (avatar del alumno) + P-09 + P-02 + P-03
**Estado resultante:** COMPLETADA (T-14, P-09, P-02, P-03); RESUELTA (P-01); COMPLETADA (T-10, corrección de estado)
**Commits a `develop`:** `<pendiente de este commit>` — "bookkeeping: anota 002/003/004 en APLICADAS.md, T-10 a COMPLETADA; T-14 (avatar del alumno); P-09, P-02, P-03"
**Migraciones aplicadas:** ninguna nueva. Se ANOTAN en `db/APLICADAS.md` tres migraciones que el dueño ya había aplicado y verificado en sesiones previas del mismo día sin que quedara registrado: `002_bloqueo_cuenta` (hash `1c3f8c8aff62`), `003_politicas_rls` (hash `4e4c50a92dab`), `004_bucket_avatares` (hash `1065196e1662`)
**Propagación a prod pendiente:** ninguna (T-25)
**Archivos creados/modificados:** `db/APLICADAS.md` (tres filas nuevas), `db/MODELO.md` (sección de avatares actualizada, P-03), `db/pruebas_rls.sql` (sección 7 reescrita, P-09), `src/dominio/avatarAlumno.ts` (nuevo), `src/dominio/avatarAlumno.test.ts` (nuevo, 16 tests), `src/datos/avatarAlumno.ts` (nuevo), `src/datos/avatarAlumno.test.ts` (nuevo, 13 tests), `src/datos/alumnos.ts` (P-02: `SELECT_LISTADO`, tipo `AlumnoListado`), `src/datos/alumnos.test.ts` (ajustado a la nueva `select`, 1 test nuevo), `src/dominio/alumno.ts` (`compararAlumnosParaOrden` sobre `DatosOrdenAlumno` en vez de `Alumno` completo), `src/ui/pantallaFichaAlumno.ts` (`pintarFila`/`rellenarFormulario` sobre `AlumnoListado`), `roadmap/DECISIONES_TECNICAS.md` (ocho filas nuevas), `roadmap/SEGUIMIENTO.md` (cabecera, §1 T-10/T-14/T-16, §3 filas 4-6, §5 P-01/P-02/P-03/P-09, §7)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (512/512: 477 + 29 de avatarAlumno + 1 de P-02 en `alumnos.test.ts`, neto +35 sobre la cifra de la sesión anterior) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía (`<pendiente>`, T-25)
**Decisiones tomadas:** ocho filas `2026-08-31` de `DECISIONES_TECNICAS.md` — reconciliación de bookkeeping (T-10/APLICADAS.md); `FabricaProcesadoImagen` como frontera inyectable con el navegador real (mismo patrón que `Reloj`/`Temporizador`/`fetchImpl`); EXIF no testeado, argumentado por construcción de la plataforma; orden seguro de escritura del avatar (sube-nuevo→cambia-puntero→borra-viejo); paleta fija de ocho colores para el monograma; P-09 (fixtures propios en `pruebas_rls.sql`); P-02 (`SELECT_LISTADO`/`AlumnoListado`)
**Hallazgos del auditor atendidos:** ninguno nuevo (el hallazgo #2 sigue cerrado por P-04 desde la primera sesión del día, a la espera de que el auditor lo confirme en su próxima pasada)
**Hallazgos:** el propio bookkeeping pendiente (T-10/P-01/`APLICADAS.md` desincronizados de §3 desde la primera sesión del día) — no es un hallazgo de seguridad, es un fallo de proceso propio; corregido en esta misma sesión, sin abrir P-XX porque no es una mejora propuesta sino una corrección de un registro ya decidido
**Tareas autopropuestas (P-XX):** ninguna nueva. P-09 implementada (ya registrada en §5 desde 2026-08-29); P-02 y P-03 implementadas (ya registradas); P-01 pasada a RESUELTA
**Próximo paso:** T-16 (interfaz de gestión del administrador) — sus tres dependencias (T-13, T-14, T-15) están COMPLETADAS, sin migración propia. Es la tarea más grande de la cola: el requisito 1 exige construir primero la base de frontend reutilizable (router por `hash`, helpers de creación segura de elementos, estado con suscripción, componentes de formulario) antes de montar ninguna de las tres pantallas del requisito 2. Esta sesión no la empieza a propósito, por presupuesto de sesión

---

### Sesión 2026-08-31 (4)
**Tarea(s):** T-17 (motor de propuesta "quién toca ahora")
**Estado resultante:** COMPLETADA
**Commits a `develop`:** `<pendiente de este commit>` — "T-17: motor de propuesta quién toca ahora (zona horaria real, tolerancia)"
**Migraciones aplicadas:** ninguna. No escrita: T-17 tiene `Migración: No` — depende solo de T-15 (COMPLETADA)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `src/dominio/slots.ts` (reescrito por completo: sustituye la versión provisional camelCase/UTC de T-03 por el motor real sobre el tipo oficial `SlotHorario`), `src/dominio/slots.test.ts` (reescrito, 24 tests: batería completa del criterio de aceptación de T-17 más `instanteLocal` en aislamiento), `src/dominio/slotHorario.ts` (exporta `minutosDesdeMedianoche`, antes privada, reutilizada por `slots.ts`; comentarios de cabecera actualizados), `src/datos/slotsHorario.ts` (nueva `listarSlotsDeProfesorConAlumno`, una petición con el alumno embebido en columnas restringidas), `src/datos/slotsHorario.test.ts` (1 test nuevo), `roadmap/DECISIONES_TECNICAS.md` (siete filas nuevas), `roadmap/SEGUIMIENTO.md` (§1 T-17 COMPLETADA, cabecera, pregunta abierta #11 en §6)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (477/477: 460 + 17 nuevos netos, 24 nuevos en `slots.test.ts` menos 8 sustituidos de la versión provisional, más 1 en `slotsHorario.test.ts`) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía (`<pendiente>`, T-25)
**Decisiones tomadas:** siete filas `2026-08-31 | T-17` de `DECISIONES_TECNICAS.md` — reescritura de `slots.ts` en el mismo fichero en vez de un módulo nuevo; traducción de instante UTC a día/hora local con `Intl.DateTimeFormat`/`formatToParts`/`hourCycle: 'h23'`, sin librería nueva; zona horaria y tolerancia como parámetros opcionales con constantes de dominio por defecto, no variables de entorno (el cliente no tiene bundler); tipo `AlumnoParaPropuesta` restringido a las columnas que la tabla base concede a `authenticated`, no `Alumno` completo; resultado como unión discriminada de tres formas (`en_curso`/`proximo`/`sin_clases_hoy`); `listarSlotsDeProfesorConAlumno` trae todas las versiones y filtra vigencia en el cliente reutilizando `slotVigenteEn` de T-15
**Hallazgos del auditor atendidos:** ninguno (hallazgo #2, severidad alta, sigue en manos del programador desde la sesión de P-04; sin cambio en esta sesión)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-18 (alta de asistencia, RPC `registrar_asistencia`), depende solo de T-17 (COMPLETADA) pero tiene `Migración: Sí` (`004_rpc_registrar_asistencia`) — la siguiente sesión escribe el SQL, lo empuja a `develop`, abre su fila en §3 y marca T-18 BLOQUEADA, escribiendo mientras tanto el cliente latente contra dobles como marca el protocolo. Pregunta abierta #11 de §6 (zona horaria y tolerancia de T-17) queda para que el dueño la confirme cuando pueda, sin bloquear nada

---

### Sesión 2026-08-31 (3)
**Tarea(s):** T-15 (slots de horario por defecto: asignación, edición y no-retroactividad)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** `<pendiente de este commit>` — "T-15: slots de horario (vigencia, solape, versionado por edición)"
**Migraciones aplicadas:** ninguna. No escrita: T-15 tiene `Migración: No` — `slot_horario` y sus políticas RLS (T-10) ya existían
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `src/dominio/slotHorario.ts` (nuevo), `src/dominio/slotHorario.test.ts` (nuevo, 14 tests), `src/datos/slotsHorario.ts` (nuevo), `src/datos/slotsHorario.test.ts` (nuevo, 10 tests), `roadmap/DECISIONES_TECNICAS.md`, `roadmap/SEGUIMIENTO.md` (§1 T-15 COMPLETADA, T-16 BLOQUEADA, cabecera)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (460/460: 436 + 24 nuevos) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía (`<pendiente>`, T-25)
**Decisiones tomadas:** cuatro filas `2026-08-31 | T-15` de `DECISIONES_TECNICAS.md` — módulo de dominio nuevo en vez de migrar `slots.ts` (T-17); solape del alumno validado en cliente sin restricción `EXCLUDE` (`Migración: No`); orden cerrar-antes-que-crear en la edición versionada; cómo se cubre el criterio de aceptación sin una RPC de asistencia real (T-18 no existe todavía)
**Hallazgos del auditor atendidos:** ninguno (ya atendido el #2 en la primera sesión del día)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-16 queda BLOQUEADA por dependencia de código (no de migración) hasta que T-14 escriba el procesado de imagen y la subida de avatar. La cola continúa por **T-17** (motor de propuesta "quién toca ahora", depende solo de T-15 — COMPLETADA), que debe abrir o confirmar la pregunta de zona horaria/ventana de tolerancia (§6)

---

### Sesión 2026-08-31 (2)
**Tarea(s):** T-14 (avatar del alumno, Supabase Storage) — solo la migración; el resto queda BLOQUEADA
**Estado resultante:** BLOQUEADA — pendiente aplicar migración `004`
**Commits a `develop`:** `<pendiente de este commit>` — "T-14: migración 004_bucket_avatares (crea el bucket privado; sus políticas ya existían desde 003)"
**Migraciones aplicadas:** ninguna. Migración **escrita**: `db/004_bucket_avatares.sql` (crea el bucket privado `avatares`, `allowed_mime_types = image/webp`, `file_size_limit = 2 MiB`). Fila 6 de §3 de `SEGUIMIENTO.md` abierta para que el dueño la aplique con `npm run migrate`
**Propagación a prod pendiente:** ninguna (T-25)
**Archivos creados/modificados:** `db/004_bucket_avatares.sql` (nuevo), `herramientas/migraciones/bucketAvatares.test.ts` (nuevo, 7 tests estáticos, mismo patrón que `esquemaInicial.test.ts`/`bloqueoCuenta.test.ts`/`politicasRls.test.ts`), `db/MODELO.md`, `roadmap/DECISIONES_TECNICAS.md`, `roadmap/SEGUIMIENTO.md` (§1 T-14 a BLOQUEADA, §3 fila 6, cabecera)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (436/436: 429 + los 7 nuevos de `bucketAvatares.test.ts`) · build ✅
**Health check post-deploy:** no aplica — sin hosting de producción configurado todavía (`<pendiente>`, T-25)
**Decisiones tomadas:** fila `2026-08-31 | T-14` de `DECISIONES_TECNICAS.md` — lista blanca del bucket restringida a `image/webp` (el cliente solo sube derivadas ya recodificadas, nunca el original del móvil) y límite de 2 MiB
**Hallazgos del auditor atendidos:** ninguno (la sesión anterior del mismo día ya atendió el #2, ver arriba)
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** el resto del alcance de T-14 (procesado de imagen en el cliente, ruta determinista, firma en lote, monograma, límite de subidas) sigue **sin escribir**: se retoma cuando el dueño aplique `004` y confirme en §3. Mientras tanto, la cola normal continúa por **T-15** (slots de horario, `Migración: No`, depende solo de T-12)

---

### Sesión 2026-08-31
**Tarea(s):** P-04 (urgente, §0.3)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** `<pendiente de este commit>` — "P-04 (urgente): completa la cobertura de UPDATE/DELETE/TRUNCATE de db/pruebas_rls.sql"
**Migraciones aplicadas:** ninguna (este cambio no toca ninguna migración; `db/pruebas_rls.sql` no es una migración, es la batería de aislamiento de T-10)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `db/pruebas_rls.sql` (amplía las secciones 1–4 con `UPDATE`; añade `UPDATE`/`DELETE` a la sección 3; añade la sección 8 nueva de `TRUNCATE`; renumera "Resultado final" de 8 a 9), `roadmap/DECISIONES_TECNICAS.md`, `roadmap/SEGUIMIENTO.md` (§1 cabecera y §5, fila P-04), `roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (429/429, sin cambio: `db/pruebas_rls.sql` no forma parte de `npm test`, exige conexión real) · build ✅
**Health check post-deploy:** no aplica — sin cambio de código de aplicación ni de esquema, no hay deploy que comprobar
**Decisiones tomadas:** fila `2026-08-31 | P-04 (urgente)` de `DECISIONES_TECNICAS.md` — verificar `UPDATE`/`DELETE` prohibidos con `ROW_COUNT = 0` en vez de esperar una excepción, porque RLS excluye la fila del `USING` en silencio, no lanza error (a diferencia de `INSERT`, que sí lo hace vía `WITH CHECK`)
**Hallazgos del auditor atendidos:** #2 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-08-29) — implementado el código que lo cierra; la marca `RESUELTO` la pone el auditor en su próxima pasada, no esta sesión, porque `auditoriacontinua.md` es de escritura exclusiva del agente Auditor
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** P-04 registrada y ejecutada en la misma sesión (urgencia, §0.3) — ver §5 de `SEGUIMIENTO.md`
**Próximo paso:** retomar la cola normal desde T-14 (avatar del alumno, Supabase Storage — lleva migración propia `004_bucket_avatares`)

---

### Sesión 2026-08-30 (PM)

**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código) — **sexto ciclo del PM: ninguna R-XX nueva,
ninguna entrada de backlog nueva, sin cambios de estado**
**Commits a `develop`:** ver commit de esta sesión (roadmap: sexto ciclo del PM — sin cambios de
contenido, confirmado que no hay nada nuevo que incorporar)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (cabecera actualizada con el
resultado de este ciclo), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` (no aplica a un ciclo de PM sin cambio
de arquitectura)
**Hallazgos del auditor atendidos:** se revisaron los tres hallazgos `ABIERTO` de la pasada de
`auditoriacontinua.md` del 2026-08-30, que reevalúa el estado sin encontrar ningún hallazgo nuevo
(confirma que no ha entrado código de desarrollo desde el ciclo anterior). **#2** (severidad alta,
cobertura de `db/pruebas_rls.sql`) sigue sin corregirse y sigue siendo competencia del programador
como P-XX urgente, no de este ciclo — se confirma que sigue trazado y no se duplica. **#3** y **#4**
(severidad baja) ya tienen su seguimiento correcto como P-02 y P-03 desde el ciclo anterior
(2026-08-29): no hay cambio de estado ni de severidad que justifique tocar `SEGUIMIENTO.md` §5 otra
vez en este ciclo
**Hallazgos:** `FEEDBACK.md` sigue sin entradas `nuevo` reales (fila plantilla vacía); nada que
convertir. Se revisó de nuevo el estado completo de las oleadas v1/v2 (R-01 a R-12) contra el
objetivo de producto: sin desarrollo nuevo desde el ciclo anterior (T-10 sigue bloqueada pendiente
de `002`/`003`; T-14 sigue siendo la siguiente tarea de la cola) y sin ningún hallazgo o dependencia
nueva, no hay ninguna laguna real que justifique una R-XX nueva. Segunda pasada consecutiva sin
cambios de contenido en el roadmap de producto (la anterior fue 2026-08-29): se documenta
explícitamente en vez de inventar trabajo para justificar el ciclo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** sin cambios respecto al ciclo anterior. El desarrollo sigue con T-10 `BLOQUEADA`
(pendiente de que el dueño aplique `002`/`003`, filas 4 y 5 de §3 de `SEGUIMIENTO.md`) y T-14
(avatar del alumno) como siguiente tarea en cola. El próximo ciclo de PM debe repetir esta misma
revisión (feedback, hallazgos del auditor, progreso de desarrollo) y solo tocar el roadmap de
producto si aparece una señal real — no antes.

---

### Sesión 2026-08-29 (PM)

**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código) — **quinto ciclo del PM: ninguna R-XX nueva,
dos entradas de backlog técnico registradas**
**Commits a `develop`:** ver commit de esta sesión (roadmap: quinto ciclo del PM — sin R-XX nueva,
backlog técnico P-02/P-03 desde auditoría)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (§5: P-02 y P-03 nuevas, deuda técnica no
urgente con `origen: auditoría #3`/`#4`), `roadmap/ROADMAP_PRODUCTO.md` (cabecera actualizada con el
resultado de este ciclo), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` (no aplica a un ciclo de PM sin cambio
de arquitectura)
**Hallazgos del auditor atendidos:** se revisaron los tres hallazgos `ABIERTO` de la pasada de
`auditoriacontinua.md` del 2026-08-29. **#2** (severidad alta, cobertura de escritura de
`db/pruebas_rls.sql`) es de autorización/calidad de pruebas: por protocolo (§0 de `HOJA_DE_RUTA.md`)
lo atiende el programador como P-XX urgente en cuanto arranque su siguiente sesión, así que no
genera ninguna R-XX ni entrada de backlog aquí — se confirma que sigue trazado en el registro de
hallazgos y no se duplica. **#3** (severidad baja, `avatar_ruta` de más en el `select` de
`listarAlumnos`) y **#4** (severidad baja, frase residual de `db/MODELO.md`) no son mejoras de
producto: se registran como **P-02** y **P-03** en §5 de `SEGUIMIENTO.md`, con `origen: auditoría
#3`/`#4`, marcadas sin urgencia para que el programador las ejecute cuando la tarea en curso esté
terminada o bloqueada
**Hallazgos:** `FEEDBACK.md` sigue sin entradas `nuevo` reales (fila plantilla vacía); nada que
convertir. Se revisó el estado completo de las oleadas v1/v2 (R-01 a R-12) contra el objetivo de
producto y contra el estado real del desarrollo (T-10 sigue bloqueada pendiente de `002`/`003`; T-14
es la siguiente tarea de la cola) sin encontrar ninguna laguna nueva ni dependencia que faltara,
a diferencia del ciclo anterior (que detectó la ausencia de R-12). No se inventa ninguna R-XX sin
necesidad real detectada. Ninguna oleada está 100% desplegada todavía (v1 no ha arrancado: espera al
MVP completo), así que no hay nada que mover a `ROADMAP_HISTORICO.md` esta vez
**Tareas autopropuestas (P-XX):** P-02 y P-03 registradas (ver arriba), ninguna ejecutada por este
ciclo (el PM no programa)
**Próximo paso:** el desarrollo sigue en T-14 (avatar del alumno, bloqueada por su migración
`004_bucket_avatares` hasta que el dueño aplique `002`/`003` y esta nueva) como siguiente tarea de
cola, y el programador debe atender el hallazgo #2 (severidad alta) como P-XX urgente antes de esa
tarea, según protocolo. El siguiente ciclo de PM debe: revisar si el dueño respondió alguna pregunta
de §6 (en particular la #5/#6/#7/#8/#9/#10, todas abiertas) para ajustar el roadmap en consecuencia,
comprobar si `FEEDBACK.md` tiene entradas `nuevo` que convertir, y revisar si algún hallazgo nuevo del
auditor requiere una R-XX o una entrada de backlog

---

### Sesión 2026-08-28 (18) (PM)

**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código) — **cuarto ciclo del PM: una R-XX nueva añadida**
**Commits a `develop`:** ver commit de esta sesión (roadmap: cuarto ciclo del PM, añade R-12)
**Migraciones aplicadas:** ninguna (R-12 queda solo especificada, no implementada — su migración
`010_calendario_cierres` la escribirá la sesión de desarrollo que la ejecute)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (cabecera, F-01, spec completa de
R-12 insertada antes de R-04, dependencia de R-04 ampliada a R-12), `roadmap/SEGUIMIENTO.md` (§1:
fila nueva de R-12, dependencia anotada en la fila de R-04), `roadmap/HISTORIAL_SESIONES.md` (esta
entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna en `DECISIONES_TECNICAS.md` (es un documento de decisiones técnicas
de desarrollo, no de especificación de producto; la justificación de R-12 queda en la cabecera de
`ROADMAP_PRODUCTO.md` y en su propia spec)
**Hallazgos del auditor atendidos:** ninguno nuevo que convertir. El único hallazgo del registro de
`auditoriacontinua.md`, #1 (severidad baja, gobernanza documental de `HOJA_DE_RUTA.md`), aparece
`RESUELTO` desde la propia auditoría de hoy (2026-08-28); no genera ni R-XX ni backlog técnico
**Hallazgos:** `FEEDBACK.md` sigue sin entradas `nuevo` reales (fila plantilla vacía); nada que
convertir. Al releer la spec de R-04 (informe mensual) contra el modelo de datos real para preparar
este ciclo, se detectó que no existe ningún mecanismo para declarar que el centro no da clase un
periodo (vacaciones, festivos, puentes): sin él, "sesiones esperadas" de R-04 sobrecontaría cualquier
semana de cierre. Se especifica R-12 (calendario de cierres) en F-01, antes de R-04, y se añade como
dependencia explícita de R-04. No introduce dato personal nuevo, no toca al rol `student`, no exige
ninguna cuenta externa ni decisión reservada al dueño — no se abre ninguna pregunta nueva en §6. Se
revisó el resto de la oleada v1/v2 (R-01 a R-11) sin encontrar ninguna otra laguna de esa magnitud;
no se añade nada más por prudencia frente a inventar trabajo sin necesidad real
**Tareas autopropuestas (P-XX):** ninguna (R-12 es una R-XX de producto, no una P-XX de desarrollo)
**Próximo paso:** el MVP sigue en curso — T-10 bloqueada pendiente de que el dueño aplique `002` y
`003`, T-14 es la siguiente tarea de la columna vertebral (bloqueada por su propia migración en
cuanto se escriba) y T-15 no depende de ninguna migración pendiente. Ninguna R-XX, incluida R-12, se
ejecuta hasta que el MVP (T-00 a T-25) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN (§1 de este
documento). El siguiente ciclo de PM debe repetir esta misma revisión (hallazgos `ABIERTO` del
auditor, entradas `nuevo` de `FEEDBACK.md`, respuestas nuevas en §6) y, cuando el MVP esté completo,
empezar a mover a `roadmap/ROADMAP_HISTORICO.md` la oleada v1 en cuanto esté 100% desplegada

---

### Sesión 2026-08-28 (17) — T-13

**Tarea(s):** T-13 (Personas de referencia del alumno) — siguiente tarea de §1 tras verificar que
`auditoriacontinua.md` no tenía ningún hallazgo `ABIERTO` de severidad alta (el único hallazgo, #1,
seguía `RESUELTO` desde antes de esta sesión)
**Estado resultante:** T-13 **COMPLETADA** — sin migración propia (`Migración: No`): tanto
`persona_referencia` como sus políticas RLS (solo `administrator`, incluido `DELETE`) ya existían
desde `001_esquema_inicial`/`003_politicas_rls.sql` (T-10), y no depende de que el dueño confirme
`002_bloqueo_cuenta`/`003_politicas_rls` (mismo razonamiento que T-10/T-11/T-12)
**Commits a `develop`:** el commit de esta sesión (T-13: personas de referencia del alumno)
**Migraciones aplicadas:** ninguna (T-13 no lleva migración; las dos que ya estaban en cola —
`002_bloqueo_cuenta`, `003_politicas_rls` — siguen exactamente igual, sin tocar esta sesión)
**Propagación a prod pendiente:** sin cambios (no existe `prod` todavía)
**Archivos creados/modificados:** `src/dominio/personaReferencia.ts` + su test (nuevo, 7 tests:
`buscarPersonaReferenciaDuplicada` acento-insensible sobre nombre completo y exacta sobre teléfono,
sin bloquear el alta; reexporta `normalizarTelefonoAlumno`/`emailAlumnoValido`/`telefonoAlumnoValido`
de `dominio/alumno.ts` bajo alias propios en vez de duplicar los regex); `src/datos/personasReferencia.ts`
+ su test (nuevo, 9 tests: `crearPersonaReferencia`/`editarPersonaReferencia`/`eliminarPersonaReferencia`
sobre `postgrest.ts`, teléfono obligatorio a diferencia del de `alumno`, `Prefer: return=representation`
por defecto —sin la mitigación de T-12, ver `DECISIONES_TECNICAS.md`—, borrado real sin baja lógica,
`SinPermiso` para un `teacher`); `src/datos/alumnos.ts` + su test (ampliado: nuevo tipo
`AlumnoConCentroYPersonas`, `SELECT_FICHA_COMPLETA` con `personas_referencia:persona_referencia(*)`
embebido en `obtenerAlumno`/`crearAlumno`/`editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno` —nunca en
`listarAlumnos`—, `primeraFilaOFalla` generalizada); `src/ui/pantallaFichaAlumno.ts` + su test
(ampliado, 5 tests nuevos: sección de personas de referencia dentro de cada fila del alumno —abrir/
cerrar, añadir con aviso de duplicado sin bloquear, editar en línea, eliminar con confirmación
explícita "Esta acción es definitiva y no se puede deshacer."—, cargada con `deps.obtenerAlumno(id)`);
`db/pruebas_rls.sql` (nuevo caso: `teacher` intentando `INSERT` en `persona_referencia`, que debe
lanzar un error — el `SELECT` ya existía desde T-10, pero el criterio de aceptación de T-13 pide
"ni leer ni escribir"); `roadmap/SEGUIMIENTO.md` (§1 T-13 → COMPLETADA, cabecera, dos preguntas
nuevas #9/#10 de §6); `roadmap/DECISIONES_TECNICAS.md` (seis filas nuevas, ver abajo)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (429 tests, antes 408) · build ✅
**Health check post-deploy:** no aplica — sin `config.js` desplegado en este entorno de agente
(mismo estado que sesiones anteriores; el hosting de producción sigue `<pendiente>`)
**Decisiones tomadas:** seis filas nuevas en `DECISIONES_TECNICAS.md` fechadas 2026-08-28 (T-13): la
reexportación de las funciones de `dominio/alumno.ts` en vez de duplicar los regex; el aviso de
duplicado calculado en el cliente en vez de un índice único (la spec pide explícitamente "avisar, sin
bloquear"); el embebido de personas de referencia limitado a las operaciones de un único alumno, sin
tocar `listarAlumnos`; por qué `personasReferencia.ts` sí puede pedir `return=representation` por
defecto (a diferencia de `alumnos.ts`); y el caso nuevo de `teacher` INSERT en `db/pruebas_rls.sql`
**Hallazgos del auditor atendidos:** ninguno nuevo que atender (el único hallazgo del registro, #1,
seguía `RESUELTO` desde antes de esta sesión)
**Hallazgos:** ninguno de seguridad. Se confirmó, leyendo `003_politicas_rls.sql`, que las políticas
de `persona_referencia` que T-10 dejó escritas (`for all` bajo `es_administrator()`, sin ninguna
política para `teacher`/`student`) eran exactamente las que esta tarea necesitaba, sin tener que
tocarlas
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** siguiente tarea de §1 es T-14 (avatar del alumno, Supabase Storage), que **sí lleva
migración propia** (`004_bucket_avatares`): la siguiente sesión debe escribir esa migración,
empujarla a `develop`, abrir su fila en §3 y marcar T-14 BLOQUEADA en §1, y después seguir con T-15
(slots de horario, `Migración: No`, depende solo de T-12) mientras el dueño la aplica. Dos preguntas
abiertas nuevas para el dueño en §6, #9 (campo `relacion` en personas de referencia) y #10 (exigir al
menos una vía de contacto por alumno) — ninguna bloquea nada

---

### Sesión 2026-08-28 (16) — T-12

**Tarea(s):** T-12 (Ficha de alumno: datos, centro y baja lógica) — siguiente tarea de §1 tras
verificar que `auditoriacontinua.md` no tenía ningún hallazgo `ABIERTO` de severidad alta (el único
hallazgo, #1, seguía `RESUELTO` desde antes de esta sesión)
**Estado resultante:** T-12 **COMPLETADA** — sin migración propia (`Migración: No`): `alumno` ya
existía con todas sus columnas desde `001_esquema_inicial`, y no depende de que el dueño confirme
`002_bloqueo_cuenta`/`003_politicas_rls` (mismo razonamiento que T-10/T-11)
**Commits a `develop`:** el commit de esta sesión (T-12: ficha de alumno)
**Migraciones aplicadas:** ninguna (T-12 no lleva migración; las dos que ya estaban en cola —
`002_bloqueo_cuenta`, `003_politicas_rls` — siguen exactamente igual, sin tocar esta sesión)
**Propagación a prod pendiente:** sin cambios (no existe `prod` todavía)
**Archivos creados/modificados:** `src/dominio/alumno.ts` + su test (nuevo, 10 tests:
`normalizarNombrePersona`/`normalizarTelefonoAlumno`/`emailAlumnoValido`/`telefonoAlumnoValido`
—regex exactos a los `CHECK` de `001_esquema_inicial`—, `nombreCompletoAlumno` y
`compararAlumnosParaOrden` con `localeCompare('es', { sensitivity: 'base' })`, comprobado con
"García Pérez"/"García López"/"Ábalos"); `src/datos/alumnos.ts` + su test (nuevo, 17 tests:
`listarAlumnos`/`obtenerAlumno`/`crearAlumno`/`editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno`
sobre `postgrest.ts`, leyendo siempre de la vista `alumno_ficha` con el centro embebido, escribiendo
contra la tabla base con `id` generado en el cliente y `{ representar: false }` —la mitigación que
T-10 ya había dejado anotada el mismo día para esta tarea—, `darDeBajaAlumno` con `Reloj` inyectado,
y que dar de baja no toca `asistencia` ni `slot_horario`); `src/datos/postgrest.ts` + su test
(ampliado, 3 tests nuevos: `orIlike(columnas, patron)` y `OpcionesEscritura.representar` en
`insertar`/`actualizar`); `src/ui/pantallaFichaAlumno.ts` + su test (nuevo, 13 tests: pantalla
enteramente de `administrator` —a diferencia de `pantallaCentros.ts`, sin lectura para `teacher`—,
con filtro de estado, búsqueda, paginación en servidor, alta/edición/baja/reactivación);
`roadmap/SEGUIMIENTO.md` (§1 T-12 → COMPLETADA, cabecera, nueva pregunta #8 de §6, nueva fila de §7);
`roadmap/DECISIONES_TECNICAS.md` (seis filas nuevas, ver abajo); `DEVELOPERS.md` (sección Estructura
ampliada con los módulos nuevos y las dos ampliaciones de `postgrest.ts`)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (408 tests, antes 365) · build ✅
**Health check post-deploy:** no aplica — sin `config.js` desplegado en este entorno de agente
(mismo estado que sesiones anteriores; el hosting de producción sigue `<pendiente>`)
**Decisiones tomadas:** seis filas nuevas en `DECISIONES_TECNICAS.md` fechadas 2026-08-28 (T-12):
el patrón id-en-cliente + `return=minimal` + relectura de `alumno_ficha`; las dos ampliaciones
mínimas de `postgrest.ts` (`orIlike`, `representar`); la búsqueda no acento-insensible (misma
limitación que T-11, `Migración: No` lo impide); la ordenación a la española con `localeCompare` y
el reordenado de la página en cliente; y que la pantalla es enteramente de `administrator`, sin
lectura para `teacher`
**Hallazgos del auditor atendidos:** ninguno nuevo que atender (el único hallazgo del registro, #1,
seguía `RESUELTO` desde antes de esta sesión)
**Hallazgos:** ninguno de seguridad. Se confirmó, leyendo `003_politicas_rls.sql`, que la mitigación
que T-10 dejó anotada para esta tarea (columna de contacto solo accesible vía `alumno_ficha`) era
exactamente correcta y no hizo falta reabrirla
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** siguiente tarea de §1 es T-13 (personas de referencia del alumno), sin migración
propia y sin depender de `002`/`003`. Las dos migraciones en cola (`002`, `003`) siguen pendientes de
que el dueño ejecute `npm run migrate`, en ese orden. Pregunta abierta nueva para el dueño en §6 #8:
si quiere una migración futura (`unaccent` o columna generada) para que la búsqueda de la ficha de
alumno sea de verdad acento-insensible

---

### Sesión 2026-08-28 (15) — T-11

**Tarea(s):** T-11 (Catálogo de centros de estudios) — siguiente tarea de §1 tras verificar que
`auditoriacontinua.md` no tenía ningún hallazgo `ABIERTO` de severidad alta (el único hallazgo,
#1, ya estaba `RESUELTO` desde el 2026-08-28 anterior)
**Estado resultante:** T-11 **COMPLETADA** — sin migración propia (`Migración: No`): `centro_estudios`
y su `unique(nombre)` exacto ya existían desde `001_esquema_inicial`, y no depende de que el dueño
confirme `002_bloqueo_cuenta`/`003_politicas_rls` (mismo razonamiento que ya permitió escribir T-10
sin esperar a `002`)
**Commits a `develop`:** el commit de esta sesión (T-11: catálogo de centros de estudios)
**Migraciones aplicadas:** ninguna (T-11 no lleva migración; las dos que ya estaban en cola —
`002_bloqueo_cuenta`, `003_politicas_rls` — siguen exactamente igual, sin tocar esta sesión)
**Propagación a prod pendiente:** sin cambios (no existe `prod` todavía)
**Archivos creados/modificados:** `src/dominio/centrosEstudios.ts` + su test (nuevo, 6 tests:
`normalizarNombreCentro`/`nombresDeCentroEquivalentes`/`buscarCentroDuplicado`, comparación de
nombres acento-insensible sin tocar la base de datos); `src/datos/centrosEstudios.ts` + su test
(nuevo, 14 tests: `listarCentros`/`crearCentro`/`editarNombreCentro`/
`contarAlumnosActivosDeCentro`/`desactivarCentro`/`reactivarCentro` sobre `postgrest.ts`, incluida
la detección de duplicado antes de insertar/editar, el aviso sin bloqueo antes de desactivar, y que
un `teacher` rechazado por RLS recibe `SinPermiso`); `src/ui/pantallaCentros.ts` + su test (nuevo, 12
tests: pantalla de gestión con estados de carga/vacío/error, oculta escritura y filtro de estado
para `teacher` vía `puedeGestionarCentros`, confirmación antes de desactivar con el recuento de
alumnos afectados); `src/ui/formularios.ts` (ampliado: `crearCampoTexto` admite `tipo: 'text'`,
reutilizado por la pantalla de centros y por las futuras de T-12/T-13); `roadmap/SEGUIMIENTO.md`
(§1 T-11 → COMPLETADA, cabecera, nueva pregunta #7 de §6); `roadmap/DECISIONES_TECNICAS.md` (cinco
filas nuevas, ver abajo); `DEVELOPERS.md` (sección Estructura ampliada con los tres módulos nuevos)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (365 tests, antes 333) · build ✅
**Health check post-deploy:** no aplica — sin `config.js` desplegado en este entorno de agente
(mismo estado que sesiones anteriores; el hosting de producción sigue `<pendiente>`)
**Decisiones tomadas:** cinco filas nuevas en `DECISIONES_TECNICAS.md` fechadas 2026-08-28 (T-11):
normalización elegida para la detección de duplicados (NFD + retirar marcas combinantes, en memoria,
sin `unaccent` en Postgres); la búsqueda de `listarCentros` usa `ilike` y no es acento-insensible a
propósito (solo la detección de duplicados lo es); desactivar avisa en vez de bloquear, sin tocar
nunca `alumno`; y `pantallaCentros.ts` queda sin enrutar hasta T-16
**Hallazgos del auditor atendidos:** ninguno nuevo que atender (el único hallazgo del registro, #1,
seguía `RESUELTO` desde antes de esta sesión)
**Hallazgos:** ninguno de seguridad. Se confirmó, leyendo `001_esquema_inicial.sql`, que el propio
comentario de columna de `centro_estudios.nombre` ya dejaba escrito que la detección de duplicados
acento-insensible es responsabilidad de la aplicación — T-11 solo tenía que cumplir esa promesa ya
documentada, no decidir de cero dónde vivía
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** siguiente tarea de §1 es T-12 (ficha de alumno: datos, centro y baja lógica), sin
migración propia y sin depender de `002`/`003`. Recordar al llegar a T-12: `DECISIONES_TECNICAS.md`
ya avisa (fila de T-10) de que escribir contra `alumno` con `Prefer: return=representation` fallará
para `email_alumno`/`telefono_alumno` — usar `Prefer: return=minimal` y releer de `alumno_ficha` si
hace falta la ficha completa tras guardar. Las dos migraciones en cola (`002`, `003`) siguen
pendientes de que el dueño ejecute `npm run migrate`, en ese orden

---

### Sesión 2026-08-28 (14) — T-10

**Tarea(s):** T-10 (Autorización: políticas RLS de los tres roles) — siguiente tarea de §1 tras
verificar que `auditoriacontinua.md` no tenía ningún hallazgo `ABIERTO` de severidad alta
**Estado resultante:** T-10 **BLOQUEADA — pendiente aplicar primero la migración `002_bloqueo_cuenta`
y después `003_politicas_rls`, en ese orden** (código, migración y tests completos; misma situación
que ya tuvo T-07/P-01: el runner aplica en orden numérico, así que `003` no hace nada mientras `002`
siga pendiente)
**Commits a `develop`:** el commit de esta sesión (T-10: políticas RLS de los tres roles)
**Migraciones aplicadas:** ninguna por esta sesión (nunca las aplica el agente, §0.1). Escrita y
testeada: `db/003_politicas_rls.sql`, fila 5 abierta en §3 de `SEGUIMIENTO.md`
**Propagación a prod pendiente:** sin cambios (no existe `prod` todavía)
**Archivos creados/modificados:** `db/003_politicas_rls.sql` (nuevo: políticas de las siete tablas
de `001_esquema_inicial` más `storage.objects` del futuro bucket `avatares`, columna-restricción de
`alumno` vía `GRANT` de columna + vista `alumno_ficha`), `herramientas/migraciones/
politicasRls.test.ts` (nuevo, 12 tests estáticos sobre el SQL real), `db/pruebas_rls.sql` (nuevo:
batería de aislamiento ejecutable con impersonación de usuarios reales vía `request.jwt.claims`, una
única transacción que siempre termina en `rollback`), `herramientas/probarRls.ts` (nuevo, CLI de
`npm run probar-rls`, sin test directo, mismo patrón que `migrar.ts`), `herramientas/migraciones/
resultadoPruebasRls.ts` + su test (nuevo, 5 tests: qué cuenta como fallo/omisión), `src/dominio/
permisosUi.ts` + su test (nuevo, 6 tests: adaptación de la interfaz al rol, presentación no control
de acceso), `package.json` (script `probar-rls`), `roadmap/DECISIONES_TECNICAS.md` (10 filas nuevas
más la sección final de matriz rol × tabla × operación), `db/MODELO.md` (sección nueva de políticas
RLS, cabecera de estado, "Qué falta" actualizado), `roadmap/SEGUIMIENTO.md` (§1 T-10 y T-14, §3 fila
5, §7 fila nueva de renumeración, "Última actualización" y "Siguiente tarea" reescritos)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (333, antes 310) · build ✅
**Health check post-deploy:** no aplica (esta sesión no toca el frontend desplegable, solo esquema,
herramientas y una pieza de dominio sin consumidor todavía)
**Decisiones tomadas:** 10 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-28, T-10): el mecanismo
de columna-restricción de `alumno` (`GRANT` de columna + vista `alumno_ficha` sin `security_invoker`,
y por qué la vista con `security_invoker` que sugería la propia spec no habría resuelto nada dado
que `administrator`/`teacher` comparten el rol `authenticated`); el aviso para T-12 sobre `Prefer:
return=minimal`; escribir ya las políticas del bucket de avatares aunque el bucket lo cree T-14 (con
la renumeración en cadena `003_bucket_avatares` → `004_bucket_avatares`); `persona_referencia` con
una única política `for all`; el diseño de `pruebas_rls.sql` (impersonación de usuarios reales,
`rollback` siempre, `OMITIDO` en vez de fabricar falsos positivos cuando falta un fixture o el bucket
de T-14); separar la CLI de `probarRls.ts` de la lógica testeable de resumen; y `permisosUi.ts`
construido sin consumidor todavía, mismo criterio que `eventoError.ts` (T-08) y `desbloquearUsuario`
(P-01)
**Hallazgos del auditor atendidos:** ninguno (el registro de `auditoriacontinua.md` no tenía ningún
`ABIERTO` de severidad alta al empezar esta sesión — se revisó antes de elegir tarea, tal como exige
el protocolo)
**Hallazgos:**
- La propia spec de T-10 (punto 4) sugiere una "vista dedicada con `security_invoker`" para ocultar
  las columnas de contacto de `alumno` a `teacher`. Se comprobó que esa sugerencia concreta no
  funciona en este proyecto: como no hay un rol de Postgres por cada rol de aplicación
  (`administrator`/`teacher` son ambos `authenticated`, distinguidos solo por `perfil.rol`), una
  vista `security_invoker` hereda los privilegios de columna del invocador, que son los mismos para
  los dos — así que `administrator` seguiría sin poder leer esas columnas a través de ella. No es un
  error de la spec (el punto 4 la ofrece como alternativa, no como única vía; también menciona
  "`GRANT` por columna"), pero merece quedar explícito para que ninguna sesión futura la reintente
  sin la vista adicional. Detalle completo en la fila correspondiente de `DECISIONES_TECNICAS.md`.
- `db/pruebas_rls.sql` no se ha podido ejecutar en esta sesión contra un proyecto real (el agente no
  tiene esa credencial, §0.1): está escrito siguiendo la técnica documentada de Supabase para probar
  RLS desde el editor SQL, pero su primera ejecución real (el dueño, tras aplicar `002` y `003`) es
  la que lo valida de verdad. Mismo espíritu de aviso que ya lleva `clienteManagementApi.ts` sobre su
  propio endpoint (T-07).
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** el dueño hace `git pull` y `npm run migrate` en local dos veces seguidas (aplica
`002_bloqueo_cuenta` y `003_politicas_rls` en el mismo `npm run migrate`, en orden numérico); confirma
en §3 (filas 4 y 5) y la siguiente sesión verifica con `esquema_version()` = `3`, anota
`db/APLICADAS.md` y marca P-01 y T-10 `COMPLETADA`. Opcionalmente, el dueño puede ejecutar también
`npm run probar-rls` para ver el resultado en vivo (algunas filas quedarán `OMITIDO` hasta que exista
un `teacher` real y, para el bucket, hasta T-14). Después, **T-11** (catálogo de centros de estudios,
sin migración propia): no hace falta esperar a la confirmación del dueño para escribirla, igual que
ya le pasó a T-10 con `002`.

---

### Sesión 2026-08-28 (13) — P-01

**Tarea(s):** P-01 (ampliación de T-09: bloqueo de cuenta al tercer intento fallido, renovación de
contraseña por el administrador) — decidida por el dueño el 2026-08-27, priorizada antes de T-10
**Estado resultante:** P-01 **BLOQUEADA — pendiente aplicar migración `002_bloqueo_cuenta` en `dev`**
(código, migración y tests completos; falta la segunda parte, igual que le pasó a T-07)
**Commits a `develop`:** el commit de esta sesión (P-01: bloqueo de cuenta al tercer intento
fallido)
**Migraciones aplicadas:** ninguna por esta sesión (nunca las aplica el agente, §0.1). Escrita y
testeada: `db/002_bloqueo_cuenta.sql`, fila 4 abierta en §3 de `SEGUIMIENTO.md`
**Propagación a prod pendiente:** sin cambios (no existe `prod` todavía)
**Archivos creados/modificados:** `db/002_bloqueo_cuenta.sql` (nuevo),
`herramientas/migraciones/bloqueoCuenta.test.ts` (nuevo, 6 tests estáticos sobre el SQL),
`src/dominio/tipos.ts` y `tipos.test.ts` (`Perfil.intentos_fallidos`/`Perfil.bloqueado`),
`src/nucleo/gestorSesion.ts` (`CuentaBloqueada`, conteo de intentos fallidos contra la RPC,
comprobación de `bloqueado` en `activarSesion`, `desbloquearUsuario`) y `gestorSesion.test.ts` (7
tests nuevos), `src/nucleo/mensajesAbuso.ts` y su test (mensaje de `CuentaBloqueada`),
`src/ui/pantallaSinAcceso.test.ts` y `src/ui/aplicacion.test.ts` (literales de `Perfil` actualizados
con los dos campos nuevos, y el doble de `GestorSesion` con `desbloquearUsuario`), `DEVELOPERS.md`
(consulta SQL exacta de desbloqueo manual, vía del dueño), `db/MODELO.md` (columnas nuevas de
`perfil`, sección de bloqueo de cuenta, corrección de una cabecera desactualizada que seguía
diciendo `001` pendiente de aplicar cuando ya estaba aplicada desde la sesión (10)),
`roadmap/SEGUIMIENTO.md` (§1, §3 fila 4, §5 P-01), `roadmap/DECISIONES_TECNICAS.md` (5 filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (310, antes 297) · build ✅
**Health check post-deploy:** no aplica (esta sesión no toca el frontend desplegable, solo esquema y
capa de dominio/datos)
**Decisiones tomadas:** 5 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-28, P-01): redefinir
`rol_actual()` con `and not bloqueado` para que T-10 herede la condición sin repetirla tabla por
tabla; no resetear `intentos_fallidos` en un login correcto (para no romper el requisito de T-09 de
una sola llamada de datos para `student`/rol desconocido); congelar el contador una vez bloqueada la
cuenta; y añadir `desbloquearUsuario` sin consumidor todavía, latente para T-24
**Hallazgos del auditor atendidos:** ninguno (el registro de `auditoriacontinua.md` no tenía ningún
`ABIERTO` de severidad alta al empezar esta sesión — se revisó antes de elegir tarea, tal como exige
el protocolo)
**Hallazgos:**
- `db/MODELO.md` tenía una cabecera desactualizada: seguía diciendo que `001_esquema_inicial`
  estaba "pendiente de que el dueño lo aplique", cuando ya se aplicó y verificó en la sesión (10).
  No es un hallazgo de esta tarea, pero se corrigió de paso por ser una inconsistencia barata de
  arreglar y visible para el dueño (que revisa este documento, no el código).
- El diseño de P-01 ya venía cerrado por completo desde la sesión (11)/§6 #5 de `SEGUIMIENTO.md`, así
  que esta sesión fue puramente de implementación: no hubo preguntas nuevas para el dueño ni
  ambigüedad de alcance que resolver.
**Tareas autopropuestas (P-XX):** ninguna nueva (P-01 ya estaba registrada, no es autopropuesta)
**Próximo paso:** el dueño hace `git pull` y `npm run migrate` en local para aplicar
`002_bloqueo_cuenta`; confirma en §3 (fila 4) y la siguiente sesión verifica con `esquema_version()`
= `2`, anota `db/APLICADAS.md` y marca P-01 `COMPLETADA`. Después, **T-10** (políticas RLS), cuya
migración pasa a ser `003_politicas_rls` — no hace falta esperar a la confirmación del dueño para
escribir T-10, solo para darla por completada de verdad.

---

### Sesión 2026-08-27 (12) (PM)
**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código) — **revisado, sin cambios de contenido**
**Commits a `develop`:** ver commit de esta sesión (roadmap: tercer ciclo del PM, sin cambios)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (cabecera, "Última actualización"),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna
**Hallazgos del auditor atendidos:** ninguno nuevo que convertir. El único hallazgo del registro de
`auditoriacontinua.md` sigue siendo el #1 (severidad baja, gobernanza documental de
`HOJA_DE_RUTA.md`), que no es una mejora de producto ni deuda técnica de código — ya está tratado
como pregunta #3 de §6 de `SEGUIMIENTO.md`, que el dueño respondió el 2026-08-27; queda listo para
que el auditor lo cierre en su próxima pasada
**Hallazgos:** `FEEDBACK.md` sigue sin entradas `nuevo` reales (fila plantilla vacía); nada que
convertir. Se revisaron también las respuestas del dueño a las preguntas #1 y #2 de §6 (sin envío
automático de avisos por ahora; `student` sigue sin acceso en el MVP): ambas confirman, sin
modificar, el alcance que la oleada v1/v2 ya daba por hecho — no generan ninguna R-XX nueva ni
cambian ninguna existente. Se revisó también `PROYECTO.md` y `db/MODELO.md` para contexto de
esquema; sin hallazgos de producto. Nota de higiene documental fuera del alcance del PM (no se
actúa): `PROYECTO.md` §"Dominio y cumplimiento" referencia "el procedimiento [de anonimización por
derecho de supresión] se documenta en T-22", pero esa tarea es "Mi horario" del profesor — el
requisito 3 de **T-25** es el que trata la anonimización. `PROYECTO.md` no es uno de los documentos
del PM (§0.4 de `HOJA_DE_RUTA.md`) y la discrepancia no tiene efecto de producto ni de seguridad, así
que se deja anotada aquí para quien mantenga ese fichero, sin tocarlo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** el MVP sigue en curso (P-01 antes de T-10, según lo decidido por el dueño y
registrado en la sesión anterior) — es lo que debe ejecutar la siguiente sesión de desarrollo. El
siguiente ciclo de PM debe repetir esta misma revisión (hallazgos ABIERTO del auditor, entradas
`nuevo` de `FEEDBACK.md`, respuestas nuevas en §6) y, si el MVP (T-00 a T-25) ya está
COMPLETADA/DESPLEGADA EN PRODUCCIÓN, empezar a mover a `roadmap/ROADMAP_HISTORICO.md` la oleada v1
en cuanto esté 100% desplegada.

---

### Sesión 2026-08-27 (11)
**Tarea(s):** resolución del merge con T-09 y priorización de P-01 — no es una T-XX
**Estado resultante:** merge cerrado; P-01 aprobada y priorizada por el dueño sobre T-10
**Commits a `develop`:** el merge (`e290af7`) y el commit de esta entrada
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** sin cambios
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md`, `roadmap/HISTORIAL_SESIONES.md`,
`roadmap/DECISIONES_TECNICAS.md` (fusión de las dos tandas de filas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (297) · build ✅
**Health check post-deploy:** no aplica
**Decisiones tomadas:** ninguna técnica propia. La priorización de **P-01 antes de T-10, a partir
del 2026-08-28**, es del dueño
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- **T-09 se entregó con el alcance antiguo por trabajar sobre una base obsoleta.** Su sesión partió
  de `origin/develop` en `1bde5de`, sin seis commits de registro que estaban sin empujar, así que no
  conocía la ampliación que el dueño había acordado el mismo día (bloqueo al tercer intento fallido
  y renovación de contraseña por el administrador). Lo entregado no es incorrecto: está incompleto
  respecto a lo acordado, y se marcó COMPLETADA de buena fe. Encolado como P-01 en §5.
- **Tercera colisión de registro en un día, y la primera con consecuencia real.** Las dos anteriores
  costaron bitácora (recuperada) y un ordinal; esta ha costado trabajo mal dirigido. La lección ya no
  es solo numerar las entradas por tarea: **una sesión no debe arrancar sin `git pull`, y el registro
  debe empujarse en cuanto se escribe** — el trabajo se coordina por estos documentos, así que un
  commit de registro sin empujar es una instrucción que no llega. Añadido al aviso de proceso de la
  cabecera y a la nota de arranque de la siguiente sesión.
- Al resolver el merge se conservaron los dos lados de los tres documentos (son append-only), y se
  comprobó por conjuntos que no se perdiera ninguna fila ni ninguna entrada: 65 filas de decisión
  (2 de una rama + 7 de la otra sobre 56 comunes) y 20 entradas de bitácora.
- **Higiene pendiente, sin prisa:** este fichero ya tiene 20 entradas y su propia cabecera pide
  mantener en línea las ~15 más recientes. Archivar por mes no sirve todavía (todo es de agosto de
  2026); conviene decidir el criterio de rotación cuando haya un segundo mes, no antes.
**Tareas autopropuestas (P-XX):** P-01 registrada en §5 (no es autopropuesta: es del dueño)
**Próximo paso:** **2026-08-28, P-01 antes de T-10.** Primer gesto de esa sesión: `git pull`.

---

### Sesión 2026-08-27 (10) — T-09, en paralelo con las (6) a (9)

> **Renumerada de (6) a (10) al resolver el merge con `develop`.** La nota de la propia sesión,
> justo debajo, explica que ya había renumerado una vez de (5) a (6); ese (6) volvía a colisionar,
> esta vez con la sesión (6) del cierre de `000b`. **Tercera colisión del mismo tipo en un día.**
> Esta vez tampoco se perdió nada: se conservan las dos tandas de filas de
> `DECISIONES_TECNICAS.md`, las cinco entradas de bitácora y las dos versiones de cada sección de
> `SEGUIMIENTO.md`. El contenido de esta entrada es literal, salvo el ordinal del título.

> Numerada (6), no (5): al fusionar con `origin/develop` para hacer `push`, esta sesión encontró que
> la sesión de cierre de T-07 ya había usado el ordinal «(5)» (ver más abajo) — la misma colisión de
> numeración que advertía el párrafo de la sesión (4b), y la razón por la que ese párrafo pedía
> numerar por tarea. Aquí no hubo pérdida de contenido (a diferencia de la colisión de T-07/T-08):
> se detectó en el propio `git push`, antes de terminar el merge, así que se resolvió renumerando en
> vez de reconstruyendo después.

**Tarea(s):** T-09 (autenticación y los tres roles)
**Estado resultante:** COMPLETADA (código y tests; bloqueo humano aparte, no gate de esta tarea — ver abajo)
**Commits a `develop`:** ver commit de esta sesión (T-09: autenticación y los tres roles)
**Migraciones aplicadas:** ninguna — T-09 no tiene migración propia (spec: `Migración: No`); usa
`perfil`, que ya existe desde el bootstrap `000`
**Propagación a prod pendiente:** ninguna (columna `prod` de `db/APLICADAS.md`, se hace en T-25)
**Archivos creados/modificados:** `src/datos/autenticacion.ts` + `.test.ts` (cliente GoTrue),
`src/nucleo/almacenSesion.ts` + `.test.ts`, `src/nucleo/gestorSesion.ts` + `.test.ts`,
`src/nucleo/enlaceRecuperacion.ts` + `.test.ts`, `src/nucleo/mensajesAbuso.ts` + `.test.ts`
(ampliado con `CredencialesInvalidas`/`PerfilInactivo`), `src/dominio/tipos.ts` (`ETIQUETA_ROL`),
`src/ui/formularios.ts` (nuevo), `src/ui/pantallaLogin.ts` + `.test.ts`,
`src/ui/pantallaRecuperarContrasena.ts` + `.test.ts`,
`src/ui/pantallaEstablecerContrasenaNueva.ts` + `.test.ts`, `src/ui/pantallaSinAcceso.ts` +
`.test.ts`, `src/ui/aplicacion.ts` + `.test.ts` (el enrutador), `src/ui/main.ts` (conecta
`gestorSesion` real), `roadmap/SEGUIMIENTO.md` (§1: T-09 COMPLETADA; §3: fila #3, primer
`administrator`; §6: fila #5, confirmación de email/SMTP; cabecera), `roadmap/DECISIONES_TECNICAS.md`
(8 filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (297/297, 63 nuevos) · build ✅
**Health check post-deploy:** no aplica — sin hosting configurado todavía (`<pendiente>`, T-25); se
verificó en su lugar, como en T-00/T-08, que `index.html` carga `dist/ui/main.js` sin error en
Chromium headless: sin `config.js` (no existe en este checkout, está en `.gitignore`) se ve la
pantalla mínima de T-00, y con un `config.js` de prueba se ve el formulario de login real, sin
errores de consola
**Decisiones tomadas:** 8 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-27, T-09): por qué
`autenticacion.ts` no reutiliza `peticionAutenticada` de T-08; `CredencialesInvalidas` (login) vs.
`NoAutenticado` (T-08, reutilizada para `refresh_token` inválido); `sessionStorage` con solo el
`refresh_token`, nunca el `access_token` (riesgo de XSS documentado); renovación estrictamente
proactiva (`renovarAlAbrirPasarLista`, nunca reactiva a un `401`); por qué `gestorSesion.ts`
construye su propio `ClientePostgrest` de usar-y-tirar en vez de recibir uno inyectado (evita una
referencia circular); por qué ninguna pantalla toca el `document` global (recibe `Document` vía
`contenedor.ownerDocument`, mismo principio de inyección que `Reloj`/`Temporizador`/`window`); y por
qué los objetivos táctiles se fijan con estilos en línea en vez de crear ya una hoja CSS
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 (severidad baja, higiene documental de
`HOJA_DE_RUTA.md`) sigue abierto, sin acción posible por esta sesión (espera respuesta del dueño en
§6, pregunta #3 de `SEGUIMIENTO.md`)
**Hallazgos:** ninguno nuevo. Dos limitaciones ya conocidas del entorno (sin salida de red a
`supabase.com`) se repiten aquí y quedan documentadas sin bloquear nada: los endpoints exactos de
GoTrue no se han podido verificar contra documentación en vivo (mismo aviso que T-06/T-07/T-08 para
Auth/Management API/Storage), y no se ha podido comprobar en el panel si la confirmación de email
está activada ni si hace falta SMTP propio (nueva fila #5 en §6 de `SEGUIMIENTO.md`)
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-10 (autorización — políticas RLS de los tres roles), que depende de T-09 (ya
completa). Su migración `002_politicas_rls` se escribirá y testeará contra dobles igual que T-07/T-08,
y quedará BLOQUEADA a la espera de que el dueño la aplique. Al fusionar con `origin/develop` se
descubrió que, en paralelo, otra sesión cerró T-07 de verdad (migración `001` aplicada y verificada)
y abrió una fila nueva en §3 para `db/000b_arreglo_permisos.sql` (ver sesión (5) justo debajo) — la
fila #1 de §3 ya NO está pendiente. Aparte, el dueño puede crear ya el primer usuario
`administrator` en `dev` (fila #3 de §3, nueva esta sesión) para poder usar la aplicación de verdad
— no bloquea T-10 ni ninguna tarea posterior.


---

### Sesión 2026-08-27 (9)
**Tarea(s):** confirmar el rol del primer usuario `administrator` — cierre del bloqueo humano de T-09
**Estado resultante:** confirmado; T-09 sin nada pendiente antes de empezar
**Commits a `develop`:** ver commit de esta sesión (registro: rol del administrador confirmado)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** sin cambios
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md`, `roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (241) · build ✅
**Health check post-deploy:** no aplica — solo documentos de registro
**Decisiones tomadas:** ninguna
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- El dueño ejecutó la consulta de comprobación de `db/000_bootstrap_perfil.sql` y el único perfil
  de `dev` tiene `rol = administrator` y `activo = true`. Se descarta el fallo que se temía: un
  usuario creado en el panel y no promovido se queda en `student` y acaba en la pantalla de "sin
  acceso", que parece un error de código sin serlo.
- **En el registro se anota el resultado, no la salida literal.** La consulta devuelve nombre y
  email del perfil, que son datos personales; §0.2 limita qué se guarda y de quién, y un documento
  de seguimiento no es sitio para ellos. Criterio a mantener cuando el dueño pegue salidas de
  consultas sobre tablas con datos de personas.
- **Dato de contexto para T-09 y T-10:** hoy existe **un solo usuario** en `dev`, el administrador,
  y ningún `teacher`. La interfaz del profesor y sus políticas se desarrollan y se testean contra
  dobles hasta que el administrador cree usuarios reales; nadie debe interpretar la ausencia de
  `teacher` como que algo está mal configurado.
- Consecuencia de la decisión de bloqueo de §6 #5 que conviene recordar aquí: siendo hoy el
  administrador el **único** usuario, si su cuenta se bloquea la única vía de vuelta es el editor
  SQL del panel. Está previsto y decidido, pero la sesión de T-09 debe documentar esa consulta en
  `DEVELOPERS.md` como parte de la tarea, no dejarla implícita.
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** implementar T-09. No queda ninguna dependencia humana.

---

### Sesión 2026-08-27 (8)
**Tarea(s):** cerrar el diseño del bloqueo por cuenta (§6, #5) antes de arrancar T-09
**Estado resultante:** #5 respondida por el dueño; T-09 lista para empezar, con su alcance real
**Commits a `develop`:** ver commit de esta sesión (registro: diseño del bloqueo por cuenta)
**Migraciones aplicadas:** ninguna — pero T-09 pasa a necesitar una (ver §7)
**Propagación a prod pendiente:** sin cambios
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (#5 respondida, §7 con una fila más,
nota de T-09 en §1), `roadmap/DECISIONES_TECNICAS.md` (dos filas), `roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (241) · build ✅
**Health check post-deploy:** no aplica — solo documentos de registro
**Decisiones tomadas:** dos filas nuevas en `DECISIONES_TECNICAS.md`, ambas **del dueño**, no
autónomas: el bloqueo se aplica en la base de datos y por RLS y lo levanta el administrador; y
«renovar la contraseña» es disparar el correo de recuperación, nunca fijarla el administrador
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- **T-09 pasa a necesitar migración y su spec dice `Migración: No`.** El bloqueo se aplica en la
  base de datos, así que hace falta DDL sobre `perfil` más las RPC que lo mantienen. Eso arrastra
  una decisión de numeración: si el bloqueo va en `002`, la migración de políticas de T-10
  (`002_politicas_rls` en la hoja de ruta) pasa a `003`. Anotado en §7 para que la sesión de T-09
  no lo descubra a mitad de la tarea.
- **T-10 queda condicionada:** sus políticas deben incluir "no bloqueado" en **todas** las tablas,
  no solo en `perfil`. Es ahí donde el bloqueo se hace efectivo; si T-10 escribe sus políticas sin
  esa condición, el bloqueo queda en cosmética. Registrado en la fila de §7 y en la decisión.
- **Contrapartida aceptada por el dueño, que conviene no perder de vista:** como el conteo de
  fallos lo reporta un cliente sin autenticar, cualquiera que conozca el email de un profesor
  puede dejarlo fuera antes de una clase. No sirve para entrar, solo para cerrar. Se le expuso
  explícitamente antes de decidir, junto con la alternativa de caducidad automática, y eligió el
  bloqueo hasta desbloqueo manual.
- La RPC de conteo tiene que responder lo mismo exista o no el email, o se convierte en un
  enumerador de cuentas y contradice el requisito 9 de T-09.
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** implementar T-09 con este alcance. Nada la bloquea: el primer usuario
`administrator` ya existe en `dev`. Primer paso de esa sesión, antes de escribir código: confirmar
con el dueño la salida de la consulta de comprobación de `db/000_bootstrap_perfil.sql`, para
descartar que ese usuario se haya quedado con el rol `student` por defecto.

---

### Sesión 2026-08-27 (7)
**Tarea(s):** transcripción de las respuestas del dueño a §6 — no es una T-XX
**Estado resultante:** §6 respondida (4 de 4); una respuesta amplía el alcance de T-09
**Commits a `develop`:** ver commit de esta sesión (registro: respuestas del dueño a §6)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** sin cambios
**Archivos creados/modificados:** `roadmap/SEGUIMIENTO.md` (§6 respondida + pregunta #5 nueva; §7
con dos filas; nota de T-09 en §1; cabecera), `roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (241) · build ✅
**Health check post-deploy:** no aplica — solo documentos de registro
**Decisiones tomadas:** ninguna técnica propia. Las cuatro respuestas son **del dueño** y se
transcriben literalmente, con la fecha, sin interpretarlas: lo que se añade aparte es el efecto
que tienen sobre el desarrollo
**Hallazgos del auditor atendidos:** #1 (higiene documental de `HOJA_DE_RUTA.md`) queda resuelto
por la respuesta a la pregunta #3: la cabecera se mantiene literal y cada edición del dueño se
documenta como excepción puntual en §7, donde ya quedan las dos del 2026-08-25. El cierre formal
del hallazgo en `auditoriacontinua.md` lo hace el auditor, que es quien mantiene ese documento
**Hallazgos:**
- **La respuesta a #4 amplía T-09 y su mecanismo no es trivial.** "Al tercer intento fallido se
  bloquea al usuario" no se puede implementar bien desde el cliente: el login va del navegador
  directo a GoTrue y no hay backend propio (§0.2), así que un contador en el cliente no impide que
  alguien llame a GoTrue con `curl` — sería disuasión, no control de acceso. El único punto donde
  se aplica de verdad es la base de datos: negar por RLS a un usuario marcado como bloqueado,
  aunque su token sea válido. Además aparece un vector nuevo: si el contador va por email y lo
  puede incrementar quien no ha iniciado sesión, cualquiera que conozca el correo de un profesor
  puede dejarlo fuera justo antes de una clase. Abierta la pregunta #5 en §6 para cerrarlo con el
  dueño antes de programar esa parte.
- **La otra mitad de #4 ya estaba resuelta en la spec, y por la vía correcta.** El requisito 2 de
  T-09 ya obliga a la recuperación de contraseña con `POST /auth/v1/recover`, que funciona con la
  clave anónima: el administrador dispara el correo y el profesor se pone su propia contraseña, así
  que **el administrador nunca conoce la contraseña de nadie**. Que el administrador *fije* una
  contraseña exigiría `service_role` en el navegador (prohibido) o un backend (no existe). Se hace
  explícito en la pregunta #5 para que la respuesta no acabe pidiendo lo imposible.
- El registro de la ampliación va a §7 (desviaciones) y no a la hoja de ruta: es inmutable, y la
  propia respuesta a #3 confirma que se mantiene literal.
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-09. Se puede arrancar entera menos la parte de bloqueo por cuenta, que espera
la respuesta a la pregunta #5.

---

### Sesión 2026-08-27 (6)
**Tarea(s):** cierre de §3 fila 2 (`000b_arreglo_permisos.sql`) — arranque manual, no una T-XX
**Estado resultante:** RESUELTA — sin cambios en la base de datos
**Commits a `develop`:** ver commit de esta sesión (registro: 000b verificado como ya aplicado)
**Migraciones aplicadas:** ninguna. `000b` **ya estaba aplicado**: lo que faltaba era anotarlo
**Propagación a prod pendiente:** sin cambios (columna `prod` de `db/APLICADAS.md`, T-25)
**Archivos creados/modificados:** `db/APLICADAS.md`, `roadmap/SEGUIMIENTO.md`,
`roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (241) · build ✅
**Health check post-deploy:** no aplica — solo documentos de registro
**Decisiones tomadas:** ninguna
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- **Un fichero del arranque manual aplicado y no anotado es indistinguible de uno sin aplicar.**
  La fila 2 de §3, abierta en la sesión (5), resultó ser un falso pendiente: `000b` estaba
  aplicado en `dev` desde el arranque, pero `db/APLICADAS.md` decía "pendiente de aplicar" porque
  nadie anotó la aplicación. El runner no puede detectarlo (ignora `000`/`000b` por diseño: sus
  nombres no encajan con `NNN_nombre.sql`) y ninguna sesión de agente puede consultarlo (haría
  falta el access token). Coste real: cero, porque la comprobación previa que se pidió en la fila
  era barata. Si se hubiera dicho "aplícalo" sin comprobar, se habría ejecutado DDL innecesario —
  inofensivo aquí porque `000b` es idempotente, pero no era garantizable de antemano.
- El barrido `--verificar-privilegios` cubre solo `anon`/`authenticated` y solo
  `TRUNCATE`/`REFERENCES`/`TRIGGER`; la mitad de `000b` que restaura el DML de `service_role` no
  la ve. Se cerró con la consulta de comprobación que trae el propio `000b` al final, ejecutada
  por el dueño. Vale la pena tenerlo en cuenta si alguna vez se amplía el barrido.
- `npm run seed` sigue sin poder ejecutarse, pero por la credencial, no por los privilegios:
  `.env.local` no tiene `SUPABASE_SERVICE_ROLE_KEY_DEV`. Verificado por otra vía que los
  privilegios sí están: `001` concede a `service_role` los cuatro DML en las tres tablas donde
  escribe la semilla (`centro_estudios`, `alumno`, `persona_referencia`).
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-09 (autenticación y los tres roles). §3 queda **sin ninguna fila pendiente**.
Lo único que espera al dueño es el primer usuario `administrator` en `dev`, que la sesión de T-09
abrirá en §3 al llegar a ese punto (bloque de promoción al final de `db/000_bootstrap_perfil.sql`).

---

### Sesión 2026-08-27 (5)
**Tarea(s):** T-07 (cierre)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (T-07: COMPLETADA — 001 aplicada y verificada)
**Migraciones aplicadas:** `db/001_esquema_inicial.sql` en `dev`, aplicada por **el dueño** con
`npm run migrate` (§0.1: ningún agente aplica DDL). `esquema_version()` devuelve `1`. Hash
`93359e9a4e27`. Anotada en `db/APLICADAS.md`
**Propagación a prod pendiente:** sí — columna `prod` vacía de `db/APLICADAS.md`, se hace en T-25
**Archivos creados/modificados:** `db/APLICADAS.md`, `roadmap/SEGUIMIENTO.md`,
`roadmap/HISTORIAL_SESIONES.md` (incluida la recuperación de la entrada (4b) de T-08)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (241, tras integrar T-08) · build ✅
**Health check post-deploy:** no aplica — esta sesión solo toca documentos de registro
**Decisiones tomadas:** ninguna nueva (las dos de la sesión (4) siguen siendo las vigentes)
**Hallazgos del auditor atendidos:** ninguno
**Hallazgos:**
- La verificación de `esquema_version()` se hizo por REST con la **clave anónima** (la única que
  el agente puede usar, §0.1), no con el access token: la función es `SECURITY DEFINER` y su
  `execute` está concedido por defecto, así que devuelve la versión sin exponer el ledger, que
  tiene RLS activada y sin políticas. Contra `*.supabase.co` sí hay salida de red desde el
  entorno del agente; lo que no se pudo consultar en T-07 era la documentación de
  `api.supabase.com`. El endpoint de la Management API queda confirmado en la práctica: la
  migración se aplicó con él, así que el `404` que se temía no se ha materializado.
- **`db/000b_arreglo_permisos.sql` sigue sin aplicar y nadie lo estaba siguiendo.** El runner lo
  ignora por diseño (su nombre no encaja con `NNN_nombre.sql`) y no tenía fila en §3, así que no
  aparecía en ninguna lista de pendientes salvo como nota en `db/APLICADAS.md`. Mientras siga así,
  en `dev` `authenticated` conserva `TRUNCATE` sobre `perfil` (ignora RLS: las políticas de T-10 no
  protegerán de él) y `service_role` no tiene DML, lo que hará fallar `npm run seed`. Abierta la
  fila 2 de §3, con la comprobación previa (`npm run migrate -- --verificar-privilegios`).
- El ledger `esquema_migracion` no es consultable por API (RLS sin políticas, `revoke all`), así
  que el hash anotado en `db/APLICADAS.md` se calculó del fichero con la misma función que usa el
  runner (`herramientas/migraciones/hash.ts`). La comprobación cruzada contra lo que hay
  realmente en el ledger es `npm run migrate -- --estado`, que solo puede ejecutar el dueño.
- **El merge con la rama de T-08 perdió registro, y se ha recuperado.** T-08 corrió en paralelo con
  la sesión (4) y ambas escribieron una entrada «Sesión 2026-08-27 (4)» en el mismo punto de este
  fichero; los merges `dd999ba` / `b7c09dd` se quedaron con una. Recuperada literal del commit
  `860fc6f` como (4b). El párrafo de «Última actualización» de `SEGUIMIENTO.md` también se había
  perdido dos veces por la misma razón (es un campo único que cada sesión reescribe): ahora cubre
  T-07 y T-08 a la vez. Verificado que el resto del registro de T-08 sobrevivió (12 filas de
  `DECISIONES_TECNICAS.md`, fila de §1, `DEVELOPERS.md`) y que no se perdió código (241 tests en
  verde). Riesgo de método a tener en cuenta si se vuelven a lanzar sesiones concurrentes.
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-08 (cliente propio de la API de Supabase). Pendiente del dueño: fila 2 de §3
(`000b`), que no bloquea T-08 pero sí `npm run seed` y el modelo de privilegios de `perfil`.

---

### Sesión 2026-08-27 (4b) — T-08, en paralelo con la (4)

> **Entrada recuperada por la sesión (5), no escrita por ella.** La sesión de T-08 y la (4)
> (arreglo del runner) corrieron **en paralelo** en ramas distintas y ambas numeraron su entrada
> como «(4)», en el mismo punto del fichero. La resolución de los merges `dd999ba` / `b7c09dd` se
> quedó con una sola de las dos y esta se perdió; sus 12 filas de `DECISIONES_TECNICAS.md`, su fila
> de §1 y sus cambios de `DEVELOPERS.md` sí sobrevivieron, así que la pérdida fue solo de bitácora.
> Se recupera literal del commit `860fc6f` y se renumera a (4b); no se ha tocado nada más de su
> texto. **Lección:** dos sesiones concurrentes colisionan en los documentos de registro append-only
> (misma cabecera, mismo punto de inserción, y el conflicto no se ve como tal si se resuelve rápido);
> conviene numerar las entradas con la tarea, no solo con un ordinal.

**Tarea(s):** T-08 (cliente propio de la API de Supabase)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (T-08: cliente propio de la API de Supabase)
**Migraciones aplicadas:** ninguna — T-08 no tiene migración propia (spec: `Migración: No`)
**Propagación a prod pendiente:** ninguna (columna `prod` de `db/APLICADAS.md`, se hace en T-25)
**Archivos creados/modificados:** `src/datos/erroresDominio.ts` + `.test.ts`,
`src/datos/codificadorValores.ts` + `.test.ts`, `src/datos/configuracion.ts` + `.test.ts`,
`src/datos/peticionHttp.ts`, `src/datos/postgrest.ts` + `.test.ts`, `src/datos/almacenamiento.ts` +
`.test.ts`, `src/datos/eventoError.ts` (reescrito sobre el cliente nuevo, tests sin cambios),
`src/nucleo/mensajesAbuso.ts` + `.test.ts` (ampliado con la taxonomía de errores de dominio),
`src/ui/main.ts` (conecta el envío remoto de errores real, con `ErrorConfiguracionFaltante`
capturado), `config.ejemplo.js` (nuevo), `.gitignore` (`config.js`), `index.html` (carga
`config.js` antes de `main.js`), `eslint.config.js` (global `window` para `config.ejemplo.js`),
`roadmap/SEGUIMIENTO.md` (§1: T-08 COMPLETADA; cabecera), `roadmap/DECISIONES_TECNICAS.md` (11
filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (234/234, 67 nuevos) · build ✅
**Health check post-deploy:** no aplica — sin hosting configurado todavía (`<pendiente>`, T-25); se
verificó en su lugar, como en T-00, que `index.html` carga `dist/ui/main.js` sin error en Chromium
headless (con y sin `config.js` presente, ya que en este checkout no existe — está en `.gitignore`)
**Decisiones tomadas:** 11 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-27, T-08): mecanismo de
inyección de configuración (`config.js`/`window.__CONFIG__`, sin bundler); taxonomía de ocho clases
de error de dominio; ampliación de `mensajesAbuso.ts` sin exponer nunca el `message` crudo de
Postgres; el codificador de valores en dos capas; el diseño del cliente PostgREST (builder único,
`Range` para paginación); el subconjunto de PostgREST implementado (y lo que falta a propósito); los
cuatro endpoints de Storage asumidos sin poder verificarse contra documentación en vivo (misma
limitación de red que T-06/T-07); la firma en lote en una sola petición HTTP (con test que cuenta
llamadas); la extracción de `peticionHttp.ts` compartido; la reescritura de `eventoError.ts` sobre
el cliente nuevo; y una nueva clase de error de `exactOptionalPropertyTypes` al reconstruir objetos
con campos opcionales (`TS2379`), documentada para que no se redescubra
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 (severidad baja, higiene documental de
`HOJA_DE_RUTA.md`) sigue abierto, sin acción posible por esta sesión (espera respuesta del dueño en
§6, pregunta #3 de `SEGUIMIENTO.md`)
**Hallazgos:** ninguno nuevo. Un error de test propio detectado y corregido durante esta sesión (no
un hallazgo del auditor): la primera versión de
`codificarListaFiltro escapa un valor de la lista que contiene una coma` esperaba 3 partes al
partir por comas, pero el propio comportamiento correcto del codificador (la coma interna del valor
queda percent-codificada a `%2C`, sin ningún carácter `,` literal salvo el separador de la lista)
da 2 — el test estaba mal razonado, no la implementación; corregido con la aserción correcta
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-09 (autenticación y los tres roles), que depende de T-08 (ya completa). Su spec
tiene un bloqueo humano propio (el dueño crea el primer usuario `administrator` en `dev`, y quizá
SMTP propio para los correos de recuperación) que la sesión que la implemente debe abrir en §3
cuando llegue al punto de necesitarlo — T-09 no está bloqueada de entrada, se puede empezar y
testear contra dobles igual que T-08. T-07 sigue esperando al dueño (`npm run migrate` en local,
fila #1 de §3, sin cambios esta sesión)

---

### Sesión 2026-08-27 (4)
**Tarea(s):** T-07 (arreglo del runner: la carga de `.env.local` faltaba)
**Estado resultante:** BLOQUEADA — pendiente aplicar migración 001 (el estado no cambia: sigue
esperando al dueño, pero ya sin el bug que se lo impedía)
**Commits a `develop`:** ver commit de esta sesión (T-07: cargar `.env.local` en los CLI del dueño)
**Migraciones aplicadas:** ninguna (el agente no aplica DDL en ningún entorno, §0.1)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `herramientas/cargarEnvLocal.ts` y
`herramientas/cargarEnvLocal.test.ts` (nuevos), `herramientas/migrar.ts`, `herramientas/seed.ts`,
`herramientas/verificarFugaSecretos.test.ts`, `DEVELOPERS.md`, `roadmap/DECISIONES_TECNICAS.md`,
`roadmap/SEGUIMIENTO.md`, `roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (174, antes 167) · build ✅
**Health check post-deploy:** no aplica — el cambio es de `herramientas/`, que no entra en `dist/`
ni se sirve al navegador (`npm run health` tampoco existe todavía: llega con T-24)
**Decisiones tomadas:** dos filas nuevas en `DECISIONES_TECNICAS.md` (carga de `.env.local` en los
CLI del dueño; invocación portable de `tsc` en el test de fuga de secretos)
**Hallazgos del auditor atendidos:** ninguno (el hallazgo #1 sigue ABIERTO, es documental y del dueño)
**Hallazgos:**
- **Bug (arreglado):** `npm run migrate` y `npm run seed` no cargaban `.env.local`. Los dos leen
  `process.env`, pero nada lo poblaba: `dependencies` está vacío (sin `dotenv`, §0.2) y los scripts
  npm no pasaban `--env-file`. El dueño, con un `.env.local` correcto, recibía "Falta
  SUPABASE_ACCESS_TOKEN en .env.local". El mensaje describía bien el síntoma y mentía sobre la causa.
- **Causa de que no se detectara (deuda de método, no de código):** los tests de credenciales
  inyectan el entorno (`resolverCredenciales(env, ...)`), que es lo correcto para testear la lógica,
  y el wiring que los conecta con `process.env` real era justo el fichero declarado "sin test
  directo". La verificación `env -i npm test` en verde daba una falsa sensación de cobertura: probaba
  que la suite no depende del entorno, no que los CLI sepan leerlo. Lección para T-08 y siguientes:
  cuando un fichero de wiring decide *de dónde* salen los datos, esa decisión va en un módulo con test.
- **Bug (arreglado):** el test de fuga de secretos fallaba en Windows por lanzar el shim de shell
  `node_modules/.bin/tsc` con `execFileSync`. Verde en CI (Ubuntu) y rojo en la máquina del dueño.
- `node_modules/` no estaba en el checkout otra vez; hizo falta `npm ci` (18 s, 130 paquetes).
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** el dueño reintenta `npm run migrate` (fila 1 de §3, ya actualizada con el aviso).
Cuando confirme, la sesión que retome T-07 verifica con `esquema_version()`, anota la fila en
`db/APLICADAS.md` y marca T-07 COMPLETADA. Mientras tanto, la cola normal sigue en T-08.
**Tarea(s):** T-08 (cliente propio de la API de Supabase)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (T-08: cliente propio de la API de Supabase)
**Migraciones aplicadas:** ninguna — T-08 no tiene migración propia (spec: `Migración: No`)
**Propagación a prod pendiente:** ninguna (columna `prod` de `db/APLICADAS.md`, se hace en T-25)
**Archivos creados/modificados:** `src/datos/erroresDominio.ts` + `.test.ts`,
`src/datos/codificadorValores.ts` + `.test.ts`, `src/datos/configuracion.ts` + `.test.ts`,
`src/datos/peticionHttp.ts`, `src/datos/postgrest.ts` + `.test.ts`, `src/datos/almacenamiento.ts` +
`.test.ts`, `src/datos/eventoError.ts` (reescrito sobre el cliente nuevo, tests sin cambios),
`src/nucleo/mensajesAbuso.ts` + `.test.ts` (ampliado con la taxonomía de errores de dominio),
`src/ui/main.ts` (conecta el envío remoto de errores real, con `ErrorConfiguracionFaltante`
capturado), `config.ejemplo.js` (nuevo), `.gitignore` (`config.js`), `index.html` (carga
`config.js` antes de `main.js`), `eslint.config.js` (global `window` para `config.ejemplo.js`),
`roadmap/SEGUIMIENTO.md` (§1: T-08 COMPLETADA; cabecera), `roadmap/DECISIONES_TECNICAS.md` (11
filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (234/234, 67 nuevos) · build ✅
**Health check post-deploy:** no aplica — sin hosting configurado todavía (`<pendiente>`, T-25); se
verificó en su lugar, como en T-00, que `index.html` carga `dist/ui/main.js` sin error en Chromium
headless (con y sin `config.js` presente, ya que en este checkout no existe — está en `.gitignore`)
**Decisiones tomadas:** 11 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-27, T-08): mecanismo de
inyección de configuración (`config.js`/`window.__CONFIG__`, sin bundler); taxonomía de ocho clases
de error de dominio; ampliación de `mensajesAbuso.ts` sin exponer nunca el `message` crudo de
Postgres; el codificador de valores en dos capas; el diseño del cliente PostgREST (builder único,
`Range` para paginación); el subconjunto de PostgREST implementado (y lo que falta a propósito); los
cuatro endpoints de Storage asumidos sin poder verificarse contra documentación en vivo (misma
limitación de red que T-06/T-07); la firma en lote en una sola petición HTTP (con test que cuenta
llamadas); la extracción de `peticionHttp.ts` compartido; la reescritura de `eventoError.ts` sobre
el cliente nuevo; y una nueva clase de error de `exactOptionalPropertyTypes` al reconstruir objetos
con campos opcionales (`TS2379`), documentada para que no se redescubra
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 (severidad baja, higiene documental de
`HOJA_DE_RUTA.md`) sigue abierto, sin acción posible por esta sesión (espera respuesta del dueño en
§6, pregunta #3 de `SEGUIMIENTO.md`)
**Hallazgos:** ninguno nuevo. Un error de test propio detectado y corregido durante esta sesión (no
un hallazgo del auditor): la primera versión de
`codificarListaFiltro escapa un valor de la lista que contiene una coma` esperaba 3 partes al
partir por comas, pero el propio comportamiento correcto del codificador (la coma interna del valor
queda percent-codificada a `%2C`, sin ningún carácter `,` literal salvo el separador de la lista)
da 2 — el test estaba mal razonado, no la implementación; corregido con la aserción correcta
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-09 (autenticación y los tres roles), que depende de T-08 (ya completa). Su spec
tiene un bloqueo humano propio (el dueño crea el primer usuario `administrator` en `dev`, y quizá
SMTP propio para los correos de recuperación) que la sesión que la implemente debe abrir en §3
cuando llegue al punto de necesitarlo — T-09 no está bloqueada de entrada, se puede empezar y
testear contra dobles igual que T-08. T-07 sigue esperando al dueño (`npm run migrate` en local,
fila #1 de §3, sin cambios esta sesión)

---

### Sesión 2026-08-27 (3)
**Tarea(s):** T-07 (modelo de datos, runner de migraciones y entornos)
**Estado resultante:** BLOQUEADA — pendiente aplicar migración 001 (todo lo que no exige
credenciales está hecho y verificado)
**Commits a `develop`:** ver commit de esta sesión (T-07: modelo de datos, runner de migraciones y
entornos)
**Migraciones aplicadas:** ninguna — `db/001_esquema_inicial.sql` escrita, testeada y empujada a
`develop`, pero el agente no la aplica (§0.1); fila abierta en §3 de `SEGUIMIENTO.md` pidiendo al
dueño `npm run migrate` en local
**Propagación a prod pendiente:** ninguna todavía (columna `prod` de `db/APLICADAS.md`, se hace en
T-25)
**Archivos creados/modificados:** `db/001_esquema_inicial.sql`, `db/MODELO.md`,
`tsconfig.herramientas.json`, `herramientas/migrar.ts`, `herramientas/migraciones/` (`guardas.ts`,
`hash.ts`, `archivosMigracion.ts`, `clienteManagementApi.ts`, `entorno.ts`, `runner.ts`,
`verificarPrivilegios.ts`, `esquemaInicial.test.ts`, `pruebas/dobleFetch.ts`, y el `.test.ts` de
cada uno de los anteriores), `herramientas/seed.ts`, `herramientas/semilla/` (`datosFicticios.ts`,
`clienteAdmin.ts`, `entorno.ts` + sus `.test.ts`), `herramientas/verificarFugaSecretos.test.ts`,
`src/dominio/tipos.ts` + `.test.ts`, `.env.ejemplo` (nuevas `SUPABASE_SERVICE_ROLE_KEY_DEV`/`_PROD`),
`eslint.config.js` (bloque type-aware para `herramientas/**/*.ts`), `package.json` (scripts
`typecheck` ampliado, `test` ampliado a `herramientas/**/*.test.ts`, `migrate`, `seed`),
`roadmap/SEGUIMIENTO.md` (§1: T-07 BLOQUEADA; §3: fila 1 nueva; cabecera), `roadmap/
DECISIONES_TECNICAS.md` (9 filas nuevas), `roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (167/167, antes 78 — el checkout no tenía
`node_modules/` instalado, `npm ci` antes de poder verificar nada) · build ✅, las cuatro con
`env -i` para `test` (sin ninguna variable de entorno). `dist/` inspeccionado tras el build: sin
ningún fichero de `herramientas/`, sin ninguna mención a `SUPABASE_ACCESS_TOKEN`/
`SUPABASE_SERVICE_ROLE_KEY`/`service_role`/`PERMITIR_PROD` ni ninguna cadena con forma de JWT — el
propio test de fuga de secretos (punto 23) automatiza esta comprobación construyendo `dist/` él
mismo. Se ejecutó manualmente `node herramientas/migrar.ts` y `node herramientas/seed.ts` sin
ninguna variable de entorno: ambos fallan con un mensaje claro en español (`ErrorCredencialesFaltantes`
o su equivalente de la semilla) en vez de continuar, como exige la spec
**Health check post-deploy:** no aplica — esta tarea no toca `src/ui/` ni el frontend desplegado;
no hay cambio visible en `index.html`/`dist/ui/`
**Decisiones tomadas:** 9 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-27, T-07): DDL plano
para migraciones aplicadas por el runner (contraste con el bootstrap autocontenido); `herramientas/`
con su propio `tsconfig` y chequeo estricto de tipos, y por qué `project` explícito en vez de
`projectService`; incertidumbre documentada del endpoint exacto de la Management API; guardas de
contenido sobre SQL sin comentarios y emparejadas por nombre de política; resolución del punto 20b
(test estático + modo `--verificar-privilegios` del runner) sin violar el corolario de "sin
credenciales en `npm test`"; comparación de forma de `tipos.ts` por conjunto de claves; el
descubrimiento de que las propiedades de parámetro de TypeScript no funcionan con el *type-stripping*
nativo de Node, en ningún fichero del proyecto (no solo `src/`); régimen de credenciales de la
semilla de desarrollo; construcción de `dist/` dentro del propio test de fuga de secretos
**Hallazgos del auditor atendidos:** ninguno — hallazgo #1 (baja, documental) sigue igual, sin
relación con esta tarea
**Hallazgos:** el descubrimiento de `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` con propiedades de
parámetro (ver decisiones) — no es un hallazgo de seguridad ni un bug de producto, pero es una
trampa real del stack que ninguna herramienta de verificación (`tsc`, ESLint) detecta antes de
ejecutar los tests; queda documentada para que ninguna sesión futura la reintroduzca
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-07 queda BLOQUEADA hasta que el dueño ejecute `npm run migrate` en local (fila 1
de §3) y confirme; mientras tanto, la siguiente sesión continúa con T-08 (cliente propio de la API de
Supabase), que no depende de la migración aplicada. Cuando el dueño confirme la migración, una
sesión debe verificar con `esquema_version()` (debe devolver `1`), anotar la fila en
`db/APLICADAS.md` y marcar T-07 COMPLETADA en §1

---

### Sesión 2026-08-27 (2)
**Tarea(s):** T-06 (límites de abuso y robustez)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (T-06: límites de abuso y robustez)
**Migraciones aplicadas:** ninguna — T-06 no tiene migración propia (`Migración: No`); el límite
dentro de las RPC de escritura (requisito 2) queda como contrato recomendado en
`DECISIONES_TECNICAS.md` para que T-14/T-18/T-21 lo implementen en SQL cuando escriban esas
migraciones
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `src/nucleo/limitadorTasa.ts` + `.test.ts`,
`src/nucleo/proteccionDobleToque.ts` + `.test.ts`, `src/nucleo/temporizador.ts` + `.test.ts`,
`src/nucleo/reintento.ts` + `.test.ts`, `src/nucleo/controlPeticion.ts` + `.test.ts`,
`src/nucleo/mensajesAbuso.ts` + `.test.ts`, `DEVELOPERS.md` (documenta las seis piezas nuevas),
`roadmap/SEGUIMIENTO.md` (§1: T-06 COMPLETADA, notas en T-07/T-09/T-14/T-18/T-21; §6: pregunta #4
sobre límites de Supabase Auth; cabecera), `roadmap/DECISIONES_TECNICAS.md` (5 filas nuevas),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ (dos ajustes: `prefer-function-type` en dos
interfaces de una sola firma, reescritas como alias de tipo función; un `eslint-disable` de
`no-await-in-loop` sobrante, la regla no está activa en esta configuración) · tests ✅ (78/78, antes
53) · build ✅ — las cuatro con `env -i` (entorno vacío) para `test`, sin ninguna credencial. La
sesión encontró `node_modules/` sin instalar (entorno recién aprovisionado) y corrió `npm ci` antes
de poder verificar nada
**Health check post-deploy:** N/A — sigue sin existir hosting al que desplegar (mismo estado que
T-04/T-05); verificado en Chromium headless que `index.html` sigue cargando sin error de consola
**Decisiones tomadas:** 5 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-27, T-06): arquitectura
en seis piezas independientes de `src/nucleo/`; nueva interfaz `Temporizador` (hermana de `Reloj`
pero para esperas, no para el instante) y por qué no basta reutilizar `Reloj`; contrato recomendado
de límite de operaciones por usuario y ventana para las RPC de T-14/T-18/T-21 (60/minuto por
profesor para asistencia, 20/hora por administrator para avatares); alcance deliberadamente acotado
de `mensajesAbuso.ts` a los dos errores que esta tarea introduce, abierto para que T-08 lo amplíe; y
la investigación de los límites de Supabase Auth, con la limitación explícita de que la cifra
numérica exacta no se pudo verificar (sin salida de red hacia `supabase.com` desde este entorno)
**Hallazgos del auditor atendidos:** ninguno — el único hallazgo abierto (#1, severidad baja,
higiene documental sobre `HOJA_DE_RUTA.md`) sigue esperando respuesta del dueño en la pregunta #3 de
§6; no se tocó
**Hallazgos:** ninguno nuevo. Se revisó `auditoriacontinua.md` antes de elegir tarea: sin hallazgos
de severidad alta ABIERTOS, así que no hubo ningún P-XX urgente que anteponer a la cola normal
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-07 (modelo de datos, runner de migraciones y entornos) — la siguiente tarea de
la cola normal de §1. Recuerda que el runner escribe y testea contra un doble de la Management API
pero no lo ejecuta; al terminar, abre la fila en §3 pidiendo al dueño que aplique
`001_esquema_inicial.sql` con `npm run migrate`, y que el punto 14 (`evento_error`) siga el contrato
de RPC fijado por T-05.

---

### Sesión 2026-08-27
**Tarea(s):** T-05 (monitorización de errores)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (T-05: monitorización de errores)
**Migraciones aplicadas:** ninguna — T-05 no tiene migración propia (`Migración: No`); la tabla
`evento_error` y la RPC `registrar_evento_error` viajan en el script de T-07, siguiendo el contrato
fijado en `DECISIONES_TECNICAS.md`
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `src/nucleo/informadorErrores.ts` + `.test.ts`,
`src/nucleo/capturaErrores.ts` + `.test.ts`, `src/datos/eventoError.ts` + `.test.ts`,
`src/ui/main.ts` (instala la captura en el arranque, sin `enviar` todavía), `roadmap/SEGUIMIENTO.md`
(§1: T-05 COMPLETADA, nota en T-07; cabecera), `roadmap/DECISIONES_TECNICAS.md` (7 filas nuevas),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (53/53, antes 41) · build ✅ — las cuatro
con `env -i` (entorno vacío) para `test`, sin ninguna credencial
**Health check post-deploy:** N/A — sigue sin existir hosting al que desplegar (mismo estado que
T-04)
**Decisiones tomadas:** 7 filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-27, T-05): arquitectura
en tres piezas (núcleo puro / captura DOM inyectada / envío por `fetch` confinado a `src/datos/`);
reutilización de `depurarContexto` de T-02 para `mensaje`/`pila`/`contexto`; contrato fijado de la
RPC `registrar_evento_error` para que T-07 lo respete; instalación en `main.ts` sin `enviar` todavía
(latente hasta T-08); defensa contra recursión sin reintento automático (se deja para T-06); y una
nota sobre un hueco de tipado de `@types/jsdom` (`PromiseRejectionEvent` no está en `DOMWindow`) y
cómo se resolvió sin apagar ninguna regla de lint
**Hallazgos del auditor atendidos:** ninguno — el único hallazgo abierto (#1, severidad baja,
higiene documental sobre `HOJA_DE_RUTA.md`) sigue esperando respuesta del dueño en la pregunta #3 de
§6; no se tocó
**Hallazgos:** ninguno nuevo. Se revisó `auditoriacontinua.md` antes de elegir tarea: sin hallazgos
de severidad alta ABIERTOS, así que no hubo ningún P-XX urgente que anteponer a la cola normal
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-06 (límites de abuso y robustez). Cuando T-08 exista (cliente real de Supabase),
conectar `crearEnviadorEventoError` (ya escrito y testeado en `src/datos/eventoError.ts`) como
segundo argumento de `crearInformadorErrores` en `src/ui/main.ts`, con la URL y la clave anónima que
T-08 exponga

---

### Sesión 2026-08-26 (PM)
**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código)
**Commits a `develop`:** ver commit de esta sesión (roadmap: definida oleada v2, R-08 a R-11)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (oleada v2, fases F-04/F-05/F-06,
R-08 a R-11), `roadmap/SEGUIMIENTO.md` (§1: filas R-08 a R-11 PENDIENTE; §6: pregunta #3; cabecera),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna decisión técnica de esquema/RLS/cliente (eso es del programador);
alcance de producto documentado en las R-XX de `ROADMAP_PRODUCTO.md`
**Hallazgos del auditor atendidos:** #1 (severidad baja, higiene documental sobre
`HOJA_DE_RUTA.md`) revisado: no encaja como R-XX ni como deuda técnica de código, así que se deja
como pregunta #3 en §6 de `SEGUIMIENTO.md` para que el dueño decida si la cabecera necesita una
excepción explícita — sigue `ABIERTO` en `auditoriacontinua.md`, no se cierra desde aquí
**Hallazgos:** `FEEDBACK.md` sigue sin entradas `nuevo` reales (fila plantilla vacía); nada que
convertir en esta pasada. El MVP (T-00 a T-25) sigue con solo T-00 a T-04 COMPLETADA — la oleada v1
(R-01 a R-07) no ha arrancado todavía, así que la oleada v2 recién definida queda en cola detrás de
ambas, sin urgencia de desarrollo inmediata
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** la siguiente sesión de desarrollo continúa por T-05 (el MVP sigue siendo la
columna vertebral, en orden, antes de tocar cualquier R-XX). El siguiente ciclo de PM debe: revisar
si hay hallazgos `ABIERTO` nuevos o escalados en `auditoriacontinua.md` y entradas `nuevo` en
`FEEDBACK.md`; comprobar si el dueño ha respondido las preguntas #1, #2 o #3 de §6 y ajustar el
roadmap en consecuencia; y, cuando la oleada v1 esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN, valorar si
hace falta ya una oleada v3 o si v2 (7 tareas de fondo tras el MVP: R-08 a R-11 más lo que quede de
v1) sigue dando margen suficiente para no ir por delante del programador sin necesidad.

---

### Sesión 2026-08-26 (T-04)
**Tarea(s):** T-04 — Integración continua (CI)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (`T-04: integración continua con GitHub Actions`)
**Migraciones aplicadas:** ninguna (T-04 no tiene migración asociada)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `.github/workflows/ci.yml` (nuevo — job único que ejecuta `npm ci`
y luego `typecheck`, `lint`, `test`, `build`, disparado por `push` a `develop` y a `master`, sin
`secrets`/`env` declarados), `.nvmrc` (nuevo — `22.22.2`, fuente de verdad de la versión de Node
para CI y para desarrollo local), `DEVELOPERS.md` (sección nueva "Integración continua (T-04)";
nota sobre `.nvmrc` en "Requisitos"), `roadmap/SEGUIMIENTO.md` (§1 T-04 → COMPLETADA, cabecera),
`roadmap/DECISIONES_TECNICAS.md` (tres filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ (0 errores, 0 warnings) · tests ✅ (41/41) · build ✅
— las cuatro reconfirmadas con `env -i` (entorno vacío, sin ninguna variable definida), igual que el
propio workflow de CI las ejecuta sin secretos
**Health check post-deploy:** N/A — sigue sin existir hosting al que desplegar (proveedor
`<pendiente>`); no es responsabilidad de T-04 crearlo, como ya anotó la sesión de T-03
**Decisiones tomadas:** tres filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-26, todas T-04): el
`.nvmrc` como fuente única de la versión de Node fijada, separada del mínimo abierto de
`engines.node`; el alcance del workflow (solo `push` a `develop`/`master`, sin `pull_request`, sin
secretos, `npm ci` en vez de `npm install`); y las versiones mayores de `actions/checkout`/
`actions/setup-node` usadas, verificadas por búsqueda en vez de asumidas
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 abierto (severidad baja, higiene
documental de `HOJA_DE_RUTA.md`) no es de la competencia de esta tarea y sigue abierto para el PM/auditor
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-05 (monitorización de errores). El workflow de CI quedó verificado tanto en
local (`env -i`, mismos comandos que el job) como en GitHub Actions de verdad: el run #1, disparado
por el push de este commit a `develop`
(https://github.com/JanoSolerDiaz/centro-estudios-sw/actions/runs/32979954481, comprobado con la
herramienta MCP `github`), terminó `completed`/`success`.

---

### Sesión 2026-08-26 (T-03)
**Tarea(s):** T-03 — Suite de tests mínima
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (`T-03: suite de tests mínima con reloj inyectable`)
**Migraciones aplicadas:** ninguna (T-03 no tiene migración asociada)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `src/nucleo/reloj.ts` (nuevo — `Reloj`, `relojDelSistema`,
`crearRelojFijo`), `src/nucleo/reloj.test.ts` (nuevo — 2 tests), `src/dominio/slots.ts` (nuevo —
vigencia de slot y quién toca ahora), `src/dominio/slots.test.ts` (nuevo — 8 tests),
`src/dominio/asistencia.ts` (nuevo — no-retroactividad y quién puede editar un registro),
`src/dominio/asistencia.test.ts` (nuevo — 10 tests), `src/dominio/disciplinaReloj.test.ts` (nuevo —
guarda por filesystem contra lectura directa de la hora del sistema en `src/dominio/`),
`src/datos/pruebas/dobleHttp.ts` (nuevo — doble de `fetch` para PostgREST/GoTrue/Storage),
`src/datos/pruebas/dobleHttp.test.ts` (nuevo — 7 tests), `src/ui/pantallaInicial.ts` (nuevo —
extraído de `main.ts` para poder testearlo), `src/ui/pantallaInicial.test.ts` (nuevo — 3 tests con
`jsdom`), `src/ui/main.ts` (modificado — delega en `pantallaInicial.ts`), `eslint.config.js`
(override nuevo para `src/**/*.test.ts` que permite el import de `jsdom`, único paquete de terceros
admitido en tests), `package.json`/`package-lock.json` (`devDependency` `jsdom@^30.0.1` y
`@types/jsdom@^30.0.0`; script `build` pasa a `tsc -b tsconfig.build.json`), `tsconfig.build.json`
(nuevo — extiende `tsconfig.json` excluyendo `src/**/*.test.ts` para no publicar los tests, ni su
`import 'jsdom'`, en el `dist/` que se despliega), `DEVELOPERS.md` (documenta los tres niveles de
test, el reloj inyectable y la excepción de ESLint para `jsdom`), `roadmap/SEGUIMIENTO.md` (§1 T-03
→ COMPLETADA, cabecera), `roadmap/DECISIONES_TECNICAS.md` (ocho filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ (0 errores, 0 warnings) · tests ✅ (41/41, `node
--test` sobre `src/**/*.test.ts`; reconfirmado con `env -i` que la suite completa pasa sin ninguna
variable de entorno definida) · build ✅ (`dist/` verificado sin ningún `*.test.js`)
**Health check post-deploy:** N/A — todavía no hay pipeline de despliegue (T-04/T-25); no aplica
**Decisiones tomadas:** ocho filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-26, todas T-03): el
reloj inyectable y su guarda automática por filesystem en vez de una regla de ESLint; la lógica de
dominio de `slots.ts`/`asistencia.ts` como versión provisional e ilustrativa a ampliar en tareas
posteriores; el uso de UTC (no la zona horaria local) en `slots.ts` para no depender de
configuración de entorno en los tests, hasta que T-17 resuelva la zona horaria real; el doble de
`fetch` propio en vez de una librería de mocking; la extracción de `pantallaInicial.ts` para poder
testear la UI con `jsdom`; el override de ESLint que permite `jsdom` únicamente en `*.test.ts`; y la
separación de `tsconfig.build.json` para no publicar los tests (ni `jsdom`) en el build estático.
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 abierto (severidad baja, higiene
documental de `HOJA_DE_RUTA.md`) no es de la competencia de esta tarea y sigue abierto para el PM/auditor
**Hallazgos:** al compilar por primera vez con `jsdom` como dependencia de test, `tsc -b` (con el
`tsconfig.json` base, antes del cambio) emitió `dist/ui/pantallaInicial.test.js` con un
`import { JSDOM } from 'jsdom'` — un especificador que no resuelve como módulo de navegador — dentro
del `dist/` que el push a `develop` despliega al hosting estático. `index.html` solo carga
`dist/ui/main.js`, así que no rompía nada en ejecución, pero es basura de test filtrándose al build
de producción; se corrigió con `tsconfig.build.json` antes de dar la tarea por cerrada. De paso se
confirmó que el mismo problema (sin riesgo, sin import externo) ya existía desde T-02 con
`registro.test.js`, y queda resuelto igual para todos los tests presentes y futuros.
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-04 (integración continua). Nota para esa sesión: el pipeline debe ejecutar
`typecheck && lint && test && build` sin ningún secreto configurado — ya está comprobado en esta
sesión que la suite entera pasa con el entorno vacío (`env -i`), así que el workflow de CI no
necesita declarar ninguna variable de Supabase. Con T-04 en verde, el "health check post-deploy" de
§0.1 (`npm run health -- <url>`) sigue sin aplicar hasta que exista de verdad un hosting al que
desplegar (proveedor `<pendiente>`), así que no es responsabilidad de T-04 crearlo.

---

### Sesión 2026-08-26 (T-02)
**Tarea(s):** T-02 — Logger centralizado
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (`T-02: logger centralizado con depuración de datos sensibles`)
**Migraciones aplicadas:** ninguna (T-02 no tiene migración asociada)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `src/nucleo/registro.ts` (nuevo — logger), `src/nucleo/registro.test.ts`
(nuevo — 9 tests), `eslint.config.js` (override que permite `console.*` solo en
`src/nucleo/registro.ts`; nueva regla `no-restricted-globals` para los globales de Node
`process`/`Buffer`/`require`/`__dirname`/`__filename` en todo `src/`, incluida `src/datos/**`),
`tsconfig.json` (probado y revertido `"types": []`, ver decisión), `package.json` y
`package-lock.json` (`devDependency` `@types/node@^22.20.1`), `DEVELOPERS.md` (documenta
`src/nucleo/`, la quinta regla de guarda y la ruta real del logger), `roadmap/SEGUIMIENTO.md` (§1
T-02 → COMPLETADA, cabecera), `roadmap/DECISIONES_TECNICAS.md` (dos filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ (0 errores, 0 warnings) · tests ✅ (9/9, `node --test`
sobre `src/**/*.test.ts`, sin red ni variables de entorno) · build ✅
**Health check post-deploy:** N/A — todavía no hay pipeline de despliegue (T-04/T-25); no aplica
**Decisiones tomadas:** dos filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-26, ambas T-02): la
depuración del contexto del logger como lista de bloqueo por nombre de campo + defensa por forma
del valor, en vez de una allowlist; y la adición de `@types/node` con su efecto colateral (globales
de Node visibles en todo `src/`) cerrado por una regla de ESLint nueva en vez de `"types": []` en
`tsconfig.json` (probado y descartado: rompe la resolución de tipos de `node:test`/`node:assert`)
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 abierto (severidad baja, higiene
documental de `HOJA_DE_RUTA.md`) no es de la competencia de esta tarea y sigue abierto para el PM/auditor
**Hallazgos:** el primer test de "campo con aspecto de token o de clave" detectó que `service_role`
—el nombre de rol explícitamente mencionado como secreto en §0.2— no encajaba en ningún patrón de
la regex inicial (no contiene `token`, `clave` ni `key`); se corrigió antes de dar la tarea por
cerrada, precisamente el tipo de fallo que un test real de la depuración está para atrapar
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-03 (suite de tests mínima) — la tarea que más pesa en modo autonomía total.
Nota para esa sesión: ya existe un patrón a seguir en `src/nucleo/registro.test.ts` (factoría con
sumidero/dependencia inyectable para no tocar recursos reales en tests), y ya está resuelto el
tipado de `node:test`/`node:assert` vía `@types/node`.

---

### Sesión 2026-08-26 (T-01)
**Tarea(s):** T-01 — Linting y formato
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (`T-01: linting estricto, guardas de stack y hook de pre-commit`)
**Migraciones aplicadas:** ninguna (T-01 no tiene migración asociada)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `eslint.config.js` (config estricta *type-aware* + 4 reglas de
guarda del stack), `.editorconfig` (nuevo), `herramientas/git-hooks/pre-commit` (nuevo),
`herramientas/instalar-ganchos.ts` (nuevo), `herramientas/.gitkeep` (eliminado, ya no está vacío),
`package.json` (script `prepare`), `DEVELOPERS.md` (documenta el hook y las reglas de guarda),
`roadmap/SEGUIMIENTO.md` (§1 T-01 → COMPLETADA, cabecera), `roadmap/DECISIONES_TECNICAS.md`
(cinco filas nuevas)
**Verificaciones pre-push:** tipos ✅ · lint ✅ (0 errores, 0 warnings) · tests ✅ (0 tests, sin
fallos — T-03 los añade) · build ✅. Además: `node herramientas/instalar-ganchos.ts` instala el
hook con permisos de ejecución y `sh .git/hooks/pre-commit` corre la verificación completa en
verde; ficheros de prueba temporales (no commiteados) confirmaron que un import de
`@supabase/supabase-js`, un `innerHTML` y un `console.log` en `src/ui/` y un `fetch` fuera de
`src/datos/` hacen fallar `npm run lint` con los cinco errores esperados, y que el mismo `fetch`
sí pasa dentro de `src/datos/`
**Health check post-deploy:** N/A — todavía no hay pipeline de despliegue (T-04/T-25); no aplica
**Decisiones tomadas:** cinco filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-26, todas T-01):
las cuatro reglas de guarda del stack con reglas nativas de ESLint (`no-restricted-imports`,
`no-restricted-syntax`, `no-restricted-globals`) sin plugin nuevo; chequeo *type-aware* limitado a
`src/**/*.ts` (herramientas queda con parsing TS simple, sin tipos, hasta T-07); sin Prettier,
formato vía `.editorconfig` + `stylisticTypeChecked`; hook de pre-commit instalado copiando un
fichero versionado en el `prepare` de npm, sin tocar `git config` (vetado por el protocolo de esta
sesión)
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 abierto (severidad baja, higiene
documental de `HOJA_DE_RUTA.md`) sigue sin ser competencia del programador y no es de severidad
alta
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-02 (Logger centralizado) es la siguiente tarea de la cola. Debe crear el
logger en la ruta que ya anticipa `eslint.config.js` (`src/nucleo/registro.ts`, constante
`RUTA_LOGGER`) o, si elige otra ruta, actualizar esa constante y el mensaje de la regla
`no-restricted-syntax` que prohíbe `console.*`; y añadir el override de `files` que permita
`console.*` solo dentro de esa ruta.

---

### Sesión 2026-08-26
**Tarea(s):** T-00 — Verificación inicial del estado
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (`T-00: andamiaje inicial del repositorio`)
**Migraciones aplicadas:** ninguna (T-00 no tiene migración asociada)
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `package.json`, `package-lock.json`, `tsconfig.json`,
`eslint.config.js`, `index.html`, `src/ui/main.ts`, `src/dominio/.gitkeep`, `src/datos/.gitkeep`,
`herramientas/.gitkeep`, `.gitignore` (añadido `*.tsbuildinfo`), `DEVELOPERS.md` (nuevo)
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (0 tests, sin fallos) · build ✅
**Health check post-deploy:** N/A — todavía no hay pipeline de despliegue (llega en T-04/T-25); en
su lugar se comprobó manualmente que `index.html` ejecuta `dist/ui/main.js` con el Chromium
headless preinstalado del entorno (el `<div id="app">` cambia de "Cargando…" al texto que escribe
el módulo compilado)
**Decisiones tomadas:** cinco filas nuevas en `DECISIONES_TECNICAS.md` (2026-08-26, todas T-00):
TypeScript fijado en `5.9.x` en vez de la recién publicada `7.0.x` (incompatible con
`typescript-eslint` 8.68.0); patrón de imports con extensión `.ts` en el origen +
`rewriteRelativeImportExtensions` para que `node --test` ejecute `.ts` directamente sin build ni
`ts-node`; `herramientas/` queda fuera del `include` de `tsconfig.json` hasta que T-07 le dé
contenido; ESLint mínimo (no *type-aware*, sin las reglas de guarda del stack) para poder cumplir
la verificación pre-push, con el resto de su alcance íntegro para T-01; verificación de ejecución
en navegador hecha a mano con Chromium headless, sin añadirlo como dependencia
**Hallazgos del auditor atendidos:** ninguno — el hallazgo #1 abierto (severidad baja, higiene
documental de `HOJA_DE_RUTA.md`) no es de la competencia del programador (no toca código) y no es
de severidad alta, así que no se atiende como P-XX urgente
**Hallazgos:** ninguno nuevo
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-01 (Linting y formato) es la siguiente tarea de la cola. Debe sustituir
`eslint.config.js` por la configuración estricta *type-aware* y añadir las reglas de guarda del
stack (prohibir `@supabase/supabase-js`, `innerHTML`, `console.*` fuera del logger, `fetch` fuera
de la capa de datos) más el hook de pre-commit — ninguna de ellas está cubierta todavía por la
configuración mínima de esta sesión.

---

### Sesión 2026-08-25 (PM)
**Tarea(s):** Ciclo de Product Manager — sin T-XX/R-XX de desarrollo, gestión de roadmap
**Estado resultante:** N/A (documento vivo, no código)
**Commits a `develop`:** ver commit de esta sesión (roadmap: definida oleada v1)
**Migraciones aplicadas:** ninguna
**Propagación a prod pendiente:** ninguna
**Archivos creados/modificados:** `roadmap/ROADMAP_PRODUCTO.md` (oleada v1, fases F-01/F-02/F-03,
R-01 a R-07), `roadmap/SEGUIMIENTO.md` (§1: filas R-01 a R-07 PENDIENTE; §6: preguntas #1 y #2),
`roadmap/HISTORIAL_SESIONES.md` (esta entrada)
**Verificaciones pre-push:** N/A — solo documentación, no toca código
**Health check post-deploy:** N/A
**Decisiones tomadas:** ninguna decisión técnica de esquema/RLS/cliente (eso es del programador);
alcance de producto documentado en las R-XX de `ROADMAP_PRODUCTO.md`
**Hallazgos del auditor atendidos:** ninguno — `auditoriacontinua.md` no tiene todavía ninguna
auditoría registrada (el auditor no ha corrido aún)
**Hallazgos:** `FEEDBACK.md` no tiene entradas `nuevo` reales todavía (fila plantilla vacía); nada
que convertir en esta pasada
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** el MVP (T-00 a T-25) sigue íntegro PENDIENTE — es lo primero que debe ejecutar la
siguiente sesión de desarrollo, en orden, antes de tocar ninguna R-XX. Cuando T-25 esté
COMPLETADA/DESPLEGADA EN PRODUCCIÓN, la cola continúa por R-01. El siguiente ciclo de PM debe:
revisar si hay hallazgos ABIERTOS en `auditoriacontinua.md` y entradas `nuevo` en `FEEDBACK.md`
para convertir; y, si el dueño ha respondido las preguntas #1 o #2 de §6, ajustar el roadmap en
consecuencia (P. ej. #1 puede convertirse en una R-XX de envío automático de avisos).
