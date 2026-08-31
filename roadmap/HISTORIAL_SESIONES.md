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
