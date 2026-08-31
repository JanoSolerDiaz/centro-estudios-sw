# SEGUIMIENTO — GestorAcademia — Hub / panel de control

> Hub del registro repartido (ver §0.4 de `HOJA_DE_RUTA.md`). Aquí viven el estado y lo
> transversal; el detalle vive en los documentos vivos de `roadmap/`.
> El dueño no revisa el código: revisa este documento.
>
> **Documentos hermanos:** las **decisiones técnicas** están en `DECISIONES_TECNICAS.md`
> (antiguo §2) y la **bitácora de sesiones** en `HISTORIAL_SESIONES.md` (antiguo §8). Las
> secciones no se renumeran para no romper referencias.

**Hoja de ruta de referencia:** `HOJA_DE_RUTA.md` v1.0 (2026-08-25)
**Modo de operación:** AUTONOMÍA TOTAL
**Última actualización:** 2026-08-28 (quinta sesión del día) — **T-13 (personas de referencia del
alumno) COMPLETADA, sin esperar a que el dueño confirme `002`/`003`.** Sin migración propia
(`Migración: No` en su spec): `persona_referencia` ya existe con todas sus columnas desde
`001_esquema_inicial`, y sus políticas RLS (solo `administrator`, incluido `DELETE`) ya existen desde
`003_politicas_rls.sql` (T-10).

**Los seis requisitos de la spec:** (1) 0..N personas de referencia por alumno, gestionadas desde la
propia ficha del alumno — sin pantalla independiente. `src/datos/personasReferencia.ts` añade
`crearPersonaReferencia`/`editarPersonaReferencia`/`eliminarPersonaReferencia`; la lectura no tiene
función propia, viaja embebida (ver requisito 5). (2) Obligatoriedad exacta:
`nombre`/`primer_apellido`/`telefono_referencia` obligatorios, `segundo_apellido`/`email_referencia`
opcionales — a diferencia de `alumno`, aquí el teléfono es obligatorio porque es la vía de contacto
real de un menor. (3) Añadir, editar y **eliminar** (borrado real, §0.2: única tabla del sistema sin
baja lógica); la interfaz pide confirmación explícita con el texto "Esta acción es definitiva y no se
puede deshacer." antes de borrar. (4) Solo `administrator`, lectura y escritura: la sección de
personas de referencia de `pantallaFichaAlumno.ts` solo se pinta si `puedeVerPersonasReferencia(rol)`
(nueva en `dominio/permisosUi.ts`, ya anotada por T-10); un `teacher` que llame a cualquiera de las
tres funciones de datos recibe `SinPermiso` del servidor, verificado también con un caso nuevo de
`teacher` intentando `INSERT` en `db/pruebas_rls.sql` (el `SELECT` ya existía desde T-10). (5) Se
traen embebidas al cargar la ficha, en la misma petición: `src/datos/alumnos.ts` amplía el `select`
de `obtenerAlumno`/`crearAlumno`/`editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno` (todas las
operaciones sobre un único alumno) con `personas_referencia:persona_referencia(*)` —
`listarAlumnos` (la lista paginada) se queda sin este embebido a propósito, ver
`DECISIONES_TECNICAS.md`. (6) Aviso de duplicado (mismo nombre completo y teléfono en el mismo
alumno) calculado en el cliente con `dominio/personaReferencia.ts`
(`buscarPersonaReferenciaDuplicada`), sin bloquear el alta — verificado con un test de que la
creación se llama igual aunque haya coincidencia. (7) Las dos preguntas abiertas (campo `relacion` y
si exigir al menos una vía de contacto) quedan anotadas en §6, sin responder: se permiten 0 personas
y ningún contacto, tal como pidió el dueño.

**Reutilización deliberada de T-12, no duplicación:** los `CHECK` de
`persona_referencia.email_referencia`/`telefono_referencia` son EXACTAMENTE los mismos regex que los
de `alumno.email_alumno`/`telefono_alumno`, así que `dominio/personaReferencia.ts` reexporta las
funciones de `dominio/alumno.ts` en vez de copiar los regex. A diferencia de `alumnos.ts` (que fuerza
`Prefer: return=minimal` porque `email_alumno`/`telefono_alumno` solo se conceden vía la vista
`alumno_ficha`), `personasReferencia.ts` sí puede pedir `Prefer: return=representation` por defecto:
`persona_referencia` concede todas sus columnas a `authenticated` en la tabla base, sin ninguna vista
de por medio. Detalle completo de ambas decisiones en `DECISIONES_TECNICAS.md`.

**21 tests nuevos (429 en total, antes 408): 7 de dominio (`personaReferencia.test.ts`), 9 de datos
(`personasReferencia.test.ts`), 5 de UI (`pantallaFichaAlumno.test.ts`, ampliado con la sección de
personas de referencia dentro de cada fila).** Detalle completo en la sesión de hoy en
`HISTORIAL_SESIONES.md` y las decisiones nuevas en `DECISIONES_TECNICAS.md`.

**Pendiente de sesiones anteriores, sin cambios hoy — dos migraciones en cola, en orden:**
`002_bloqueo_cuenta` (P-01, fila 4 de §3) y, después de esa, `003_politicas_rls` (T-10, fila 5 de §3).
El runner aplica en orden numérico: no tiene sentido intentar `003` sin `002` primero. Sigue sin
haber ningún `teacher` en `dev`, así que `npm run probar-rls` solo podrá ejercitar esa parte de la
matriz cuando exista uno (T-24, o uno de prueba creado a mano por el dueño).

**Aviso de proceso, vigente desde 2026-08-27:** una sesión no debe arrancar sin `git pull`, y el
registro debe empujarse en cuanto se escribe. Esta sesión empezó con `git pull` limpio sobre
`ef176ef` (T-12 + P-01 + T-10/T-11, ver §1), sin colisión.

**Siguiente tarea: T-14 (avatar del alumno, Supabase Storage).** Su spec está en el cuerpo de
`HOJA_DE_RUTA.md`; **lleva migración propia** (`004_bucket_avatares`, renumerada — ver §7 de
2026-08-28): crea el bucket privado en sí, ya que sus políticas de `storage.objects` se escribieron
en `003_politicas_rls.sql` (T-10). La siguiente sesión debe escribir esa migración, empujarla,
marcar T-14 BLOQUEADA en §1 con su fila en §3, y pasar a T-15 (slots de horario, `Migración: No`,
depende solo de T-12) mientras el dueño la aplica.

---

> ## ⚑ PARA EL DUEÑO — empieza por aquí
> Lo único que el proyecto necesita de ti está en dos sitios de este documento:
> - **§3 Bloqueos** = tu lista de tareas. Ahora mismo son pocas: el repositorio, el primer usuario administrador, y al final el paso a producción con los textos legales. La funcionalidad asociada queda *latente* hasta que las resuelvas.
> - **§6 Preguntas abiertas** = tus decisiones de negocio. Mientras no respondas, el agente tira por lo conservador; ninguna bloquea el desarrollo.
>
> **Cómo funciona la base de datos** (§0.1 de la hoja de ruta): hay **dos entornos de Supabase**. El de **desarrollo ya existe** y sus credenciales están en `.env.local`, **en tu máquina y en ningún otro sitio**. El de **producción no existe todavía y no se toca**: se crea en T-25.
>
> **Ningún agente aplica migraciones, en ningún entorno** (decisión del 2026-08-25). El access token de la Management API permite DDL sobre toda tu cuenta de Supabase, así que no se le da a un proceso desatendido. El coste es contable: cinco o seis migraciones en todo el MVP. El flujo es: el agente escribe el `.sql`, lo empuja a `develop`, abre la fila en §3 y marca la tarea BLOQUEADA; **tú haces `git pull` y ejecutas `npm run migrate` en local** —no pegues SQL a mano, el runner es lo que te da las guardas, el hash y el ledger—; confirmas en §3 y el agente desbloquea. Que el agente no se pare mientras espera es posible porque toda la suite de tests corre contra dobles, sin red.
>
> **Dos cosas de las que conviene que estés al tanto:**
> - La lista de migraciones pendientes de llevar a producción es la columna `prod` vacía de `db/APLICADAS.md`. No tienes que hacer nada con ella hasta T-25.
> - Desde el 2026-08-25 la ficha del alumno incluye **una fotografía**. Es el dato más sensible del sistema: el almacenamiento es privado, se accede por URL firmada de vida corta, y la imagen se re-codifica antes de subirla para quitarle los metadatos EXIF (incluida la geolocalización). Necesitarás una **hoja de consentimiento de uso de imagen del menor**, distinta del consentimiento general de tratamiento — está en T-25 como acción tuya.
>
> Para control (no exige acción): `DECISIONES_TECNICAS.md` (qué decidió el agente y por qué — sustituye a leer código), `db/MODELO.md` (el modelo de datos explicado en español, sin SQL), `auditoriacontinua.md` (hallazgos abiertos), `db/APLICADAS.md` (qué hay aplicado en cada entorno), y aquí §7 (desviaciones) y §5 (P-XX; veta escribiendo `REVERTIR`).

---

## 1. ESTADO GLOBAL DE TAREAS  *(fuente autoritativa de estado y orden de "siguiente tarea")*

| ID | Tarea | Estado | Última sesión | Notas |
|----|-------|--------|---------------|-------|
| T-00 | Verificación inicial | COMPLETADA | 2026-08-26 | `package.json` (`dependencies` vacío), `tsconfig.json` strict, ESLint mínimo (T-01 lo sustituye por el estricto/type-aware), `index.html` + `src/ui/main.ts` verificado en Chromium headless |
| T-01 | Linting y formato | COMPLETADA | 2026-08-26 | ESLint estricto *type-aware* + 4 reglas de guarda del stack + hook de pre-commit; sin Prettier (ver DECISIONES_TECNICAS) |
| T-02 | Logger centralizado | COMPLETADA | 2026-08-26 | `src/nucleo/registro.ts`; único fichero con permiso ESLint para `console.*`; depuración de contexto (personales, avatar, tokens/claves) por nombre y por forma del valor |
| T-03 | Suite de tests mínima | COMPLETADA | 2026-08-26 | 41 tests; dominio (slots, asistencia) con reloj inyectado, datos (doble de `fetch`), UI (`jsdom`); guarda automática contra lectura directa del reloj en dominio |
| T-04 | CI | COMPLETADA | 2026-08-26 | `.github/workflows/ci.yml`: `npm ci` + typecheck/lint/test/build en cada push a `develop` y `master`, sin secretos; Node fijado en `.nvmrc` |
| T-05 | Monitorización de errores | COMPLETADA | 2026-08-27 | Captura global + informador con scrubbing (reusa `depurarContexto` de T-02) + cliente RPC contra doble de `fetch`; sin bloqueo — depende solo de T-02. El envío remoto real queda latente hasta T-07 (tabla) y T-08 (cliente real); contrato de `registrar_evento_error` fijado en DECISIONES_TECNICAS.md para que T-07 lo respete |
| T-06 | Límites de abuso y robustez | COMPLETADA | 2026-08-27 | `src/nucleo/limitadorTasa.ts`, `proteccionDobleToque.ts`, `temporizador.ts`, `reintento.ts`, `controlPeticion.ts`, `mensajesAbuso.ts` — piezas de cliente, latentes hasta que T-14/T-18/T-19/T-21 tengan un punto de llamada real; contrato recomendado de límite por operación fijado en `DECISIONES_TECNICAS.md` |
| T-07 | Modelo de datos, runner de migraciones y entornos | COMPLETADA | 2026-08-27 | `001_esquema_inicial` aplicada en `dev` por el dueño y verificada con `esquema_version()` = `1`; fila anotada en `db/APLICADAS.md`. Incluye SQL, runner (`npm run migrate` con guardas, hash e inmutabilidad, `--estado` y `--verificar-privilegios`), `MODELO.md`, tipos de dominio, test de fuga de secretos y semilla. El primer intento del dueño falló por un bug del runner (no cargaba `.env.local`), arreglado en la sesión 2026-08-27 (4) |
| T-08 | Cliente propio de la API de Supabase | COMPLETADA | 2026-08-27 | PostgREST (`postgrest.ts`) + Storage (`almacenamiento.ts`) sobre `fetch` nativo; `eventoError.ts` (T-05) ya lo usa. GoTrue (autenticación) es de T-09, no de esta tarea — su spec no lo incluye en el alcance de T-08 |
| T-09 | Autenticación y los tres roles | COMPLETADA | 2026-08-27 | `student`/rol desconocido sin acceso, sin llamada de datos extra; login, logout, renovación proactiva, recuperación de contraseña completa; bloqueo humano aparte (crear el primer `administrator`) en fila #3 de §3. Su ampliación (bloqueo de cuenta) es P-01, ver más abajo |
| T-10 | Autorización: políticas RLS de los tres roles | BLOQUEADA — pendiente aplicar migración `002` y después `003` | 2026-08-28 | Migración `003_politicas_rls` (renumerada de `002`: P-01 se intercaló antes, ver §7). Código y tests completos; matriz en `DECISIONES_TECNICAS.md` |
| T-11 | Catálogo de centros de estudios | COMPLETADA | 2026-08-28 | Sin migración: `centro_estudios` y su `unique(nombre)` exacto ya viven en `001_esquema_inicial`. Dominio (`src/dominio/centrosEstudios.ts`), datos (`src/datos/centrosEstudios.ts`) y pantalla standalone (`src/ui/pantallaCentros.ts`, sin enrutar hasta T-16) con 32 tests nuevos (365 en total, antes 333). Detalle en `HISTORIAL_SESIONES.md` de hoy |
| T-12 | Ficha de alumno: datos, centro y baja lógica | COMPLETADA | 2026-08-28 | Sin migración: `alumno` ya existe con todas sus columnas desde `001_esquema_inicial`. Dominio (`src/dominio/alumno.ts`), datos (`src/datos/alumnos.ts`, leyendo de la vista `alumno_ficha` de T-10) y pantalla standalone solo-administrator (`src/ui/pantallaFichaAlumno.ts`, sin enrutar hasta T-16) con 43 tests nuevos (408 en total, antes 365). Búsqueda no acento-insensible (pregunta abierta en §6, mismo motivo que T-11). Detalle en `HISTORIAL_SESIONES.md` de hoy |
| T-13 | Personas de referencia del alumno | COMPLETADA | 2026-08-28 | Sin migración: `persona_referencia` y sus políticas RLS (T-10) ya existen. Dominio (`src/dominio/personaReferencia.ts`), datos (`src/datos/personasReferencia.ts`) y gestión embebida en `src/ui/pantallaFichaAlumno.ts` (sin pantalla propia, por spec) con 21 tests nuevos (429 en total, antes 408). Detalle en `HISTORIAL_SESIONES.md` de hoy |
| T-14 | Avatar del alumno (Supabase Storage) | PENDIENTE | — | Migración `004_bucket_avatares` (renumerada de `003`: T-10 ocupó ese número, ver §7). Sus políticas de `storage.objects` ya existen desde `003_politicas_rls`; esta tarea solo crea el bucket. Bucket privado; límite de subidas por administrator y hora — contrato recomendado por T-06 en `DECISIONES_TECNICAS.md`. Debe completar los casos OMITIDOS del bucket en `db/pruebas_rls.sql` |
| T-15 | Slots de horario y no-retroactividad | PENDIENTE | — | — |
| T-16 | Interfaz de gestión del administrador | PENDIENTE | — | Centros, ficha completa y horarios |
| T-17 | Motor de propuesta "quién toca ahora" | PENDIENTE | — | — |
| T-18 | Alta de asistencia (RPC `registrar_asistencia`) | PENDIENTE | — | Migración `004_rpc_registrar_asistencia`; límite de operaciones por profesor y minuto — contrato recomendado por T-06 en `DECISIONES_TECNICAS.md` |
| T-19 | Pantalla de pasar lista | PENDIENTE | — | — |
| T-20 | Alumno extra: listado completo y selección manual | PENDIENTE | — | — |
| T-21 | Revisar y modificar los registros por slot | PENDIENTE | — | Migración `005_rpc_actualizar_asistencia`; límite de operaciones por profesor y minuto — contrato recomendado por T-06 en `DECISIONES_TECNICAS.md` |
| T-22 | "Mi horario" del profesor (teacher) | PENDIENTE | — | — |
| T-23 | Consulta y exportación del histórico | PENDIENTE | — | — |
| T-24 | Administración de usuarios y roles | PENDIENTE | — | — |
| T-25 | Endurecimiento, privacidad y paso a producción | PENDIENTE | — | La única tarea que toca `prod` |
| R-01 | Registro explícito de ausencias | PENDIENTE | — | Oleada v1 / F-01 · Migración `006_registro_ausencias` |
| R-02 | Justificación de una ausencia | PENDIENTE | — | Oleada v1 / F-01 · Migración `007_justificacion_ausencia` |
| R-03 | Registro de salida y cómputo de horas reales | PENDIENTE | — | Oleada v1 / F-01 · Migración `008_registro_salida` |
| R-12 | Calendario de cierres del centro (festivos y vacaciones) | PENDIENTE | — | Oleada v1 / F-01 · Migración `010_calendario_cierres` · añadida por el PM el 2026-08-28, dependencia nueva de R-04 |
| R-04 | Informe mensual por alumno | PENDIENTE | — | Oleada v1 / F-02 · depende también de R-12 (añadido 2026-08-28) |
| R-05 | Aviso de ausencia injustificada listo para enviar | PENDIENTE | — | Oleada v1 / F-02 · sin envío automático |
| R-06 | Sustitución puntual de profesor en un slot | PENDIENTE | — | Oleada v1 / F-03 · Migración `009_sustitucion_profesor` |
| R-07 | Pasar lista con conexión intermitente | PENDIENTE | — | Oleada v1 / F-03 · solo cliente |
| R-08 | Importación masiva de alumnos y horarios | PENDIENTE | — | Oleada v2 / F-04 |
| R-09 | Aplicación instalable y arranque sin red | PENDIENTE | — | Oleada v2 / F-04 · solo cliente |
| R-10 | Expediente completo del alumno (RGPD) | PENDIENTE | — | Oleada v2 / F-05 |
| R-11 | Panel de centro para el administrador | PENDIENTE | — | Oleada v2 / F-06 |

**Estados:** PENDIENTE · EN CURSO · COMPLETADA · DESPLEGADA EN PRODUCCIÓN · BLOQUEADA — <motivo> · DESCARTADA — <motivo>

*(La spec de cada tarea: T-XX en el cuerpo de `HOJA_DE_RUTA.md`; R-XX en `ROADMAP_PRODUCTO.md`. Este §1 NO repite la spec, solo el estado.)*

---

## 3. BLOQUEOS — ACCIONES PENDIENTES DEL DUEÑO

> El código se despliega igualmente; estas acciones activan funcionalidad latente.
>
> **Cada migración SÍ genera una fila aquí**, porque el agente no aplica DDL en ningún entorno
> (§0.1). El agente escribe el `.sql`, lo empuja a `develop` y abre la fila; el dueño hace
> `git pull` y ejecuta **`npm run migrate` en local**; el dueño confirma y el agente desbloquea.
> Mientras espera, el agente sigue con la siguiente tarea que no dependa de esa migración.
>
> Lo que **no** genera filas aquí es la propagación a producción: esa es la columna `prod` vacía de
> `db/APLICADAS.md` y se hace de una vez en T-25. Esta tabla es solo para lo que el dueño debe hacer
> **ahora** para desbloquear algo.

| # | Acción | Tarea | Instrucciones exactas | Estado |
|---|--------|-------|-----------------------|--------|
| 1 | Aplicar la migración `001_esquema_inicial` en `dev` | T-07 | ~~`git pull` y `npm run migrate` en local~~ | **RESUELTA 2026-08-27** — aplicada por el dueño; verificada con `esquema_version()` = `1` y anotada en `db/APLICADAS.md`. El primer intento falló por un bug del runner (no cargaba `.env.local`), ya arreglado |
| 2 | Aplicar `db/000b_arreglo_permisos.sql` en `dev` | T-00 / arranque manual | ~~Comprobar con `npm run migrate -- --verificar-privilegios` y, si hacía falta, pegar el fichero en el editor SQL de `dev`~~ | **RESUELTA 2026-08-27 — no hacía falta aplicarlo: ya estaba aplicado.** El barrido no encontró ninguna violación, y la consulta de comprobación del propio fichero lo confirma en `perfil`: `authenticated` → INSERT/SELECT/UPDATE (sin `TRUNCATE`), `service_role` → DELETE/INSERT/SELECT/UPDATE, `anon` → ninguna fila. La fila existía porque `db/APLICADAS.md` lo daba por pendiente: la aplicación nunca se anotó. Ya está anotado y verificado |
| 3 | Crear el primer usuario `administrator` en `dev` (bloqueo humano de T-09) | T-09 | ~~Crear el usuario en Authentication → Users y promoverlo con el bloque del final de `db/000_bootstrap_perfil.sql`~~ | **RESUELTA 2026-08-27** — hecho y **verificado**: el dueño ejecutó la consulta de comprobación y el único perfil de `dev` tiene `rol = administrator` y `activo = true`, no el `student` por defecto. Se anota el resultado y no la salida literal: nombre y email son datos personales y no van a un documento de registro |
| 4 | Aplicar la migración `002_bloqueo_cuenta` en `dev` | P-01 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `2`~~ | **RESUELTA 2026-08-31** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `3`, número que cubre esta migración y la de la fila 5: el runner aplica en orden numérico y aborta al primer error, así que un `3` en el ledger implica que `002` entró antes que `003`. Queda que el programador anote la fila en `db/APLICADAS.md` con su hash y saque P-01 de `BLOQUEADA` en §1 |
| 5 | Aplicar la migración `003_politicas_rls` en `dev`, **después** de la fila 4 | T-10 | ~~`git pull` y `npm run migrate` en local (aplica en orden numérico: no hace nada si `002` sigue pendiente). Al terminar, comprobar que `esquema_version()` devuelve `3`. Opcional pero recomendado: ejecutar también `npm run probar-rls` y revisar que no haya ninguna fila `FALLO`~~ | **RESUELTA 2026-08-31 en cuanto a la APLICACIÓN de la migración. NO en cuanto a la verificación de las políticas.** `esquema_version()` = `3`, verificado por el dueño. **Aviso para quien lea esto más tarde: las políticas RLS de T-10 NO están probadas en ejecución.** `npm run probar-rls` ya corre —hizo falta un `grant` sobre la tabla temporal de resultados, aplicado el 2026-08-31, ver P-06—, pero su primera ejecución completa dio **16 comprobaciones, 10 omitidas, 0 fallidas**: sin `teacher` ni `student` en `dev` no se ejercitó ni una sola aserción de aislamiento entre roles, y las dos comprobaciones "prohibido" que sí corrieron pasaron por GRANT de tabla (`permission denied for table`), no por ninguna política. Antes de declarar T-10 verificada en ejecución hacen falta: `npm run seed`, relanzar `probar-rls`, y cerrar el hallazgo **#2** del auditor junto con **P-05** y **P-06** |

---

## 4. INCIDENTES DE DEPLOY

> Cada vez que un push rompa producción: qué pasó, qué commit lo causó, cómo se revirtió, qué se aprendió.

| Fecha | Commit causante | Síntoma | Resolución | Lección |
|-------|-----------------|---------|------------|---------|
| —     | Sin incidentes  | —       | —          | —       |

---

## 5. TAREAS AUTOPROPUESTAS (P-XX)

> Registrar aquí cada P-XX ANTES de implementarla (§0.3). El dueño veta con DESCARTAR o REVERTIR en la última columna.

| ID | Descripción | Motivo / valor esperado (incl. `origen: auditoría #N` si aplica) | Estado | Veto del dueño |
|----|-------------|-------------------------------------------------------------------|--------|----------------|
| P-01 | **Ampliación de T-09: bloqueo de la cuenta al tercer intento fallido y renovación de contraseña por el administrador.** Implementada: `db/002_bloqueo_cuenta.sql` (columnas `perfil.intentos_fallidos`/`perfil.bloqueado`, `rol_actual()` redefinida con `not bloqueado`, RPC `registrar_intento_fallido`/`admin_desbloquear_usuario`), `gestorSesion.ts` (`CuentaBloqueada`, conteo de fallos, `desbloquearUsuario`), 13 tests nuevos, `DEVELOPERS.md` con la consulta de desbloqueo manual del dueño. La renovación de contraseña no necesitó código nuevo: ya era `solicitarRecuperacionContrasena` desde T-09 | **No es una autopropuesta del agente: es una decisión del dueño** del 2026-08-27 (respuestas #4 y #5 de §6), registrada como desviación en §7. Se encola aquí porque la hoja de ruta es inmutable y no admite una T-XX nueva | **BLOQUEADA — pendiente aplicar migración `002_bloqueo_cuenta` en `dev`** (fila 4 de §3) | **Aprobada y priorizada por el dueño el 2026-08-27: se atacó ANTES de T-10.** No hay veto |
| P-02 | **Backlog técnico (deuda de calidad, no urgente): recortar `avatar_ruta` del `select` de `listarAlumnos`.** `src/datos/alumnos.ts` (constante `SELECT_CON_CENTRO`) trae hoy `avatar_ruta` en el payload de la lista paginada de `administrator`, aunque `pantallaFichaAlumno.ts` no pinta el avatar en ninguna fila de esa lista. No es una fuga real (RLS ya reduce a cero filas para cualquier otro rol y el único consumidor ya tiene acceso legítimo a la columna), pero es superficie de más que conviene recortar antes de que T-14/T-19 le den un uso real al avatar, para no arrastrar el hábito a un listado que algún día podría compartirse con `teacher` — coherente con la regla de diseño "avatar donde el conjunto es estable, texto donde el conjunto es transitorio" | origen: auditoría #3 (severidad baja, minimización de datos) | **PENDIENTE — deuda técnica, sin urgencia.** Cambio de una línea (quitar la columna del `select` cuando ya no la use nada), a ejecutar por el programador cuando la tarea en curso esté terminada o bloqueada, o de una vez al llegar a T-14 | — |
| P-03 | **Backlog técnico (deuda de calidad, no urgente): actualizar una frase residual de `db/MODELO.md`.** La línea 194, en la sección de `evento_error`, sigue diciendo que su política de lectura está "todavía por escribir (T-10)", pese a que T-10 ya escribió `evento_error_admin_leer` en `003_politicas_rls.sql` y el resto del propio documento (desde la línea 221) sí está al día. Sin impacto funcional ni de seguridad: es higiene documental | origen: auditoría #4 (severidad baja, gobernanza documental) | **PENDIENTE — deuda técnica, sin urgencia.** Corrección de una frase, a ejecutar por el programador cuando la tarea en curso esté terminada o bloqueada | — |
| P-04 | **Backlog técnico (calidad de diagnóstico, no urgente): los CLI descartan el cuerpo del error de la Management API.** `ErrorManagementApi` guarda la respuesta completa en su campo `cuerpo` (`herramientas/migraciones/clienteManagementApi.ts:24`), que es donde Postgres devuelve el mensaje real, el `SQLSTATE`, el `HINT` y el `CONTEXT`. Pero el `catch` final de `herramientas/probarRls.ts:60` y el de `herramientas/migrar.ts:76` imprimen solo `error.message`, que es la plantilla genérica del cliente. Resultado: cualquier fallo de SQL llega como una única línea sin información accionable. El arreglo es imprimir `cuerpo` cuando el error es un `ErrorManagementApi`, en los dos CLI, con su test | **Coste de diagnóstico real, medido**: el 2026-08-31 el dueño ejecutó `npm run probar-rls` tras aplicar `002`/`003` y recibió solo «Management API respondió 400 al ejecutar SQL», sin causa. Hubo que reproducir la llamada por fuera (editor SQL de `dev`) para obtener el mensaje de Postgres que identificaba el fallo en dos minutos. Mientras esto no se arregle, cada fallo de `migrate` o de `probar-rls` cuesta ese rodeo | **PENDIENTE — deuda técnica, sin urgencia.** Pocas líneas en dos ficheros de wiring, a ejecutar por el programador cuando la tarea en curso esté terminada o bloqueada | — |
| P-05 | **Backlog técnico (hueco de cobertura, no urgente): la batería de RLS no barre nunca el rol `anon`.** `pg_temp.impersonar_anon()` está definida en `db/pruebas_rls.sql:98` y **no se invoca desde ningún sitio**: es código muerto. La sección 6 hace el barrido obligatorio del `student` sobre las siete tablas, pero no existe el equivalente para `anon` — que es precisamente el rol con el que viaja la clave anónima en el paquete del navegador, y por tanto el único que un atacante tiene sin autenticarse. El arreglo es replicar el bucle de la sección 6 usando `impersonar_anon()`, y añadir `storage.objects` a la lista de tablas barridas | **Es el rol de la superficie de ataque no autenticada.** Las políticas de `003_politicas_rls.sql` no conceden nada a `anon` y `--verificar-privilegios` no encuentra violaciones, así que no hay indicio de fallo hoy: lo que falta es la prueba en ejecución que lo demuestre. Encaja con el hallazgo **#2** del auditor (2026-08-29, severidad alta, misma batería, huecos de `UPDATE`/`DELETE`/`TRUNCATE`): conviene cerrarlos en la misma pasada | **PENDIENTE — deuda técnica, sin urgencia.** A ejecutar por el programador junto con el hallazgo #2, antes de dar T-10 por verificada en ejecución | — |
| P-06 | **Backlog técnico (fiabilidad del veredicto y cobertura de la semilla): la batería de RLS canta verde con la mayoría de los casos sin ejecutar.** Dos piezas, del mismo síntoma. (a) `pg_temp.omitir` inserta sus filas con **`ok = true`** (`db/pruebas_rls.sql:129`), así que `resumirPruebasRls` las cuenta como no fallidas: `huboFallo` es `false` (`herramientas/migraciones/resultadoPruebasRls.ts:33`), el CLI imprime «ningún acceso prohibido tuvo éxito» y sale con código 0 aunque no se haya ejercitado ni una sola aserción de aislamiento. El arreglo es que el veredicto pondere las omisiones: negarse a dar el visto bueno —o al menos gritarlo— cuando quedan casos sin ejecutar. (b) `USUARIOS_SEMILLA` (`herramientas/semilla/datosFicticios.ts:14`) crea **un solo `teacher`**, así que el caso `slot_horario / teacher2 no lee el ajeno` no puede ejecutarse nunca, ni ahora ni después de sembrar: hace falta un segundo profesor en la semilla | **Evidencia medida, ejecución del 2026-08-31** (primera vez que la batería llegó a correr entera, tras el grant de `_resultados_prueba_rls`): **16 comprobaciones, 10 omitidas, 0 fallidas** — y aun así veredicto verde y salida 0. De las 6 que sí corrieron, 4 son el camino feliz del `administrator` y las 2 restantes (`asistencia` / `asistencia_historial`) pasaron por **GRANT de tabla** (`permission denied for table`), no por ninguna política. Cero casos de `teacher`, cero de `student`, cero de `teacher2`. Un veredicto verde en estas condiciones es peor que un fallo: invita a dar T-10 por verificada cuando no lo está. El punto (b) cubre además la que probablemente sea la aserción más importante del producto: que un profesor no vea los datos de otro | **PENDIENTE — deuda técnica, sin urgencia, pero es puerta de T-10.** Cerrar en la misma pasada que el hallazgo **#2** del auditor y que **P-05**: los tres son la misma batería, y ninguno de los tres debería quedar abierto cuando se declare T-10 verificada en ejecución | — |

---

## 6. PREGUNTAS ABIERTAS PARA EL DUEÑO

> Decisiones de negocio que los agentes no pueden tomar. El dueño responde en la última columna.
> El agente las abre al llegar a la tarea correspondiente; ninguna bloquea el desarrollo, porque
> cada una tiene un valor por defecto conservador escrito en la spec de su tarea.
>
> Ya previstas en las specs, para que el dueño sepa qué le van a preguntar: campo `relacion` en las
> personas de referencia y si debe exigirse al menos una vía de contacto por alumno (T-13); zona
> horaria y ventana de tolerancia (T-17); política de registros duplicados (T-18); y la ventana de
> edición del profesor, 7 días por defecto (T-21). La de campos adicionales de `centro_estudios`
> (T-11) ya está abierta como pregunta #7.
>
> **Ya resuelta (2026-08-25):** el profesor **sí** ve el avatar de sus alumnos en pasar lista, en
> formato card. Eso amplió la lectura del bucket al rol `teacher`, acotada a alumnos activos.

| # | Pregunta | Tarea | Respuesta |
|---|----------|-------|-----------|
| 1 | R-05 deja el aviso de ausencia listo para enviar a mano (`mailto:` o copiar al portapapeles), sin integración. ¿Se quiere en algún momento el envío automático por email transaccional, SMS o WhatsApp Business? Implica dar de alta una cuenta de servicio externo (posiblemente de pago) — decisión reservada al dueño, no autonomizable por una P-XX (§0.3). Mientras no haya respuesta, R-05 se entrega en su versión sin integración y no queda bloqueada por esto. | R-05 | | **No hace falta implementarlo ahora.** No está decidido cómo se quieren mandar esos avisos, ni siquiera si se quieren mandar. Queda para un desarrollo futuro, cuando todo lo demás esté terminado. Efecto: R-05 se entrega en su versión sin integración (`mailto:` / portapapeles) y **no se da de alta ninguna cuenta de servicio externo**. — dueño, 2026-08-27 |
| 2 | Con R-04 (informe mensual) y R-05 (aviso a la familia) ya en el roadmap, ¿tiene sentido en el futuro dar al rol `student` —o a una persona de referencia, sin necesidad de que sea el propio menor quien inicie sesión— una vista de solo lectura de su propio histórico de asistencia y ausencias justificadas? Es justo la ampliación de `student` que la hoja de ruta reserva expresamente al dueño (§0.2); no se propone ninguna R-XX para esto sin tu decisión. | — | | **No.** Los estudiantes tendrán funcionalidades, pero también más adelante. Efecto: en el MVP `student` sigue sin acceso a nada salvo su propia fila de `perfil`; cualquier otra política para `student` sigue siendo un fallo (§0.2), y ninguna sesión debe proponerla. — dueño, 2026-08-27 |
| 4 | T-06 investigó los límites de intentos que Supabase Auth (GoTrue) aplica por defecto (requisito 1 de su spec). Confirmado por la documentación oficial y su código fuente: usa un algoritmo de *token bucket* por endpoint; los límites de envío de correo (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/user`) y de OTP/enlace mágico son configurables desde el panel (**Authentication → Rate Limits**) o por la Management API; los de `/auth/v1/verify`, `/auth/v1/token` (que es también el endpoint del inicio de sesión con contraseña) y los desafíos de MFA están limitados **por IP** y **no son configurables desde el panel**. GoTrue **no tiene** un bloqueo de cuenta tras N contraseñas incorrectas: la única defensa por defecto contra fuerza bruta al iniciar sesión es ese límite por IP, no un límite por email. Esta sesión no pudo confirmar la cifra numérica exacta vigente hoy (sin salida de red hacia `supabase.com` desde este entorno; detalle completo, con las dos fuentes consultadas, en `DECISIONES_TECNICAS.md`). Pide dos cosas al dueño: (a) revisar **Authentication → Rate Limits** en el panel del proyecto `dev` antes de T-25 (paso a producción) y ajustar lo que haga falta, y (b) decidir si además del límite por IP se quiere algún límite por cuenta — eso sería trabajo nuevo de T-09, no algo que Supabase ofrezca ya. No bloquea nada mientras tanto. | T-06 / T-09 / T-25 | | **(b) Sí, se quiere límite por cuenta: al tercer intento fallido de contraseña se bloquea al usuario, y el administrador debe poder renovar su contraseña.** Es trabajo nuevo dentro de T-09 y una ampliación de su spec — anotada en §7. GoTrue no ofrece nada de esto, así que el **mecanismo** hay que diseñarlo y tiene aristas reales (el conteo desde el cliente es eludible, y bloquear por email abre un vector para dejar fuera a un profesor sabiendo solo su correo): se concreta en la pregunta **#5**, abierta abajo. **(a)** revisar *Authentication → Rate Limits* en el panel de `dev` antes de T-25: sigue pendiente, no bloquea. — dueño, 2026-08-27 |
| 3 | `auditoriacontinua.md` registra el hallazgo #1 (severidad baja, higiene documental): `HOJA_DE_RUTA.md` se autodeclara "DOCUMENTO INMUTABLE... no se modifica nunca" pero el propio dueño lo editó 41 minutos después de crearse, el mismo día, para ajustar el protocolo de §0.1 (que el documento sí permite cambiar al dueño) y el cuerpo de la tarea T-07 (que se declara inmutable sin excepción explícita para nadie). Sin riesgo de dato ni operativo: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento. No encaja como mejora de producto (no es una R-XX) ni como deuda técnica de código (no hay nada que programar): es una pregunta de gobernanza documental que solo el dueño puede resolver, porque el PM tiene este documento en modo SOLO LECTURA. ¿Quieres que la cabecera de `HOJA_DE_RUTA.md` deje explícita una excepción para tus propias ediciones (p. ej. "inmutable salvo para el dueño"), o prefieres que la declaración se mantenga literal y que una futura edición tuya, si hace falta, se documente aquí mismo como excepción puntual? Mientras no haya respuesta, el hallazgo queda `ABIERTO` en `auditoriacontinua.md` sin bloquear nada — origen: auditoría #1. | — | | **Cada edición mía debe documentarse como excepción puntual.** Efecto: la cabecera de `HOJA_DE_RUTA.md` se mantiene **literal** ("DOCUMENTO INMUTABLE… no se modifica nunca"), sin añadirle ninguna excepción, y cada edición del dueño se registra como excepción puntual en §7 de este documento. Las dos ediciones ya ocurridas (protocolo de §0.1 y cuerpo de T-07, ambas del 2026-08-25) quedan documentadas ahí. El hallazgo #1 de `auditoriacontinua.md` puede cerrarse en la próxima pasada del auditor. — dueño, 2026-08-27 |
| 5 | **¿Cómo se implementa el bloqueo tras tres contraseñas falladas (respuesta a #4), y qué significa exactamente que "el administrador renueve la contraseña"?** El problema no es programarlo, es dónde se aplica: el inicio de sesión va del navegador directo a GoTrue, y **no hay backend propio** (§0.2), así que un contador en el cliente no impide que alguien llame a GoTrue por su cuenta con `curl` — sería disuasión, no un control de seguridad. Lo que sí se aplica de verdad es la base de datos: un usuario marcado como bloqueado no lee nada aunque su token sea válido, porque lo niegan las políticas de T-10. Y hay un riesgo nuevo que no existía: si el contador va por email y lo puede tocar quien no ha iniciado sesión, cualquiera que conozca el correo de un profesor puede dejarlo fuera antes de una clase. Sobre la renovación: la spec de T-09 (requisito 2) ya resuelve el caso por la vía en la que **el administrador nunca conoce la contraseña de nadie** — dispara el correo de recuperación, que funciona con la clave anónima, y el profesor se pone la suya; que el administrador **fije** una contraseña exigiría la clave `service_role` en el navegador, que está prohibida, o un backend, que hoy no existe. | T-09 | | **Tres decisiones, 2026-08-27:** (1) **Bloqueo en la base de datos y aplicado por RLS, hasta que lo levante el administrador.** Los fallos se cuentan en la base de datos; un usuario bloqueado no lee **nada** aunque su token sea válido, porque lo niegan las políticas. Es control real, no cosmético. El dueño acepta explícitamente la contrapartida: quien conozca el email de un profesor puede dejarlo fuera, y el desbloqueo es manual. (2) **Renovar la contraseña = disparar el correo de recuperación** (`POST /auth/v1/recover`, clave anónima): el administrador pulsa un botón y el profesor se pone la suya. **El administrador no conoce la contraseña de nadie, nunca**, y el stack no cambia. Queda descartado que el administrador fije una contraseña: exigiría `service_role` en el navegador o un backend. (3) **El bloqueo alcanza a todos los roles, administrador incluido**, y la vía de escape es el **editor SQL del panel, que solo tiene el dueño** — la misma lógica que el arranque manual. Hay que documentar la consulta exacta en `DEVELOPERS.md`. |
| 6 | *(numerada #5 por la sesión de T-09; renumerada a #6 al resolver el merge, porque el #5 ya estaba usado por la pregunta del bloqueo)* T-09 no ha podido comprobar en el panel del proyecto `dev` (sin salida de red a `supabase.com`, misma limitación que T-06/T-07/T-08) dos cosas de **Authentication** que afectan directamente a si el flujo de recuperación de contraseña que ya está programado funciona de verdad para un profesor real: (a) si la **confirmación de email** está activada — un usuario creado desde el panel podría quedar sin confirmar y no poder iniciar sesión, un fallo que parece un error de código y no lo es (requisito 3 de T-09); y (b) si hace falta configurar un **SMTP propio**, porque el servidor de correo por defecto de Supabase tiene un límite bajo en el plan gratuito y no es apto para uso real con varios profesores. Pide al dueño revisar **Authentication → Email Templates** / **Authentication → Providers** (confirmación de email) y **Authentication → SMTP Settings** antes de repartir el acceso a profesores reales. No bloquea nada mientras tanto: el código funciona igual, solo el correo de recuperación podría no llegar o el alta podría quedar a medias hasta que se revise. | T-09 | |
| 7 | El catálogo de centros de estudios (T-11) hoy solo guarda `nombre` y `activo`, tal como pedía literalmente su spec. ¿Interesa en algún momento guardar algún dato adicional del centro reglado — dirección, teléfono o persona de contacto del centro (no del alumno) — para, por ejemplo, poder llamar al colegio? No es un dato personal de un menor ni de una persona de referencia (sería del centro como institución), pero sigue siendo una decisión de producto, no algo que el agente deba añadir "porque sería útil" (§0.2 lo prohíbe expresamente sin decisión tuya). Mientras no haya respuesta, el catálogo se queda con los dos campos de la spec y esto no bloquea nada. | T-11 | |
| 8 | El requisito 4 de T-12 pide literalmente que la búsqueda de la ficha de alumno por nombre/apellidos sea **acento-insensible**. Hoy no lo es: usa `ilike` de PostgREST (ampliado a tres columnas con un `or`), exactamente la misma limitación — y por el mismo motivo — que la búsqueda del catálogo de centros en T-11 (pregunta ya cerrada allí sin necesitar respuesta porque la spec de T-11 no lo exigía; aquí sí lo exige literalmente, aunque el criterio de aceptación enumerado de T-12 no incluye ningún caso de prueba que lo ejerza). Hacerlo de verdad exigiría instalar la extensión `unaccent` de Postgres o añadir una columna generada e indexada con el nombre sin acentos — ambas cosas son DDL, y T-12 tiene `Migración: No`. ¿Quieres que se abra una migración futura (`unaccent` o columna generada) solo para esto, o basta con la búsqueda literal actual? Mientras no haya respuesta, la búsqueda se queda como está (literal, sin acentos) y esto no bloquea nada. | T-12 | |
| 9 | Requisito 7 de T-13: ¿interesa añadir un campo `relacion` a `persona_referencia` (padre / madre / tutor / otro), para poder mostrarlo en la ficha y, más adelante, en el aviso de ausencia (R-05, "Sr./Sra. [apellido], tutor de...")? Es una columna nueva, DDL, y T-13 tiene `Migración: No` — no se puede añadir sin una migración futura. Mientras no haya respuesta, `persona_referencia` se queda con las columnas exactas de su spec (sin `relacion`) y esto no bloquea nada. | T-13 | |
| 10 | Requisito 7 de T-13: ¿debe exigirse que un alumno tenga **al menos una vía de contacto** — su propio email o teléfono, o al menos una persona de referencia con teléfono — antes de poder guardarlo, o se permite un alumno sin ningún contacto en absoluto (caso hoy permitido: `email_alumno`/`telefono_alumno` opcionales en T-12, y 0 personas de referencia válido en T-13)? Es una regla de negocio nueva que tocaría tanto `alumnos.ts` como `personasReferencia.ts`, no algo que el agente deba imponer sin decisión del dueño. Mientras no haya respuesta, se permiten 0 vías de contacto (tal como pidió el dueño explícitamente para T-13) y esto no bloquea nada. | T-12 / T-13 | |

---

## 7. DESVIACIONES RESPECTO A LA HOJA DE RUTA ORIGINAL

> Resumen consolidado para comparar contra `HOJA_DE_RUTA.md` de un vistazo.

| Fecha | Tarea | Desviación | Motivo |
|-------|-------|-----------|--------|
| 2026-08-27 | T-09 | **Alcance ampliado por decisión del dueño:** se añade bloqueo de la cuenta tras **tres** contraseñas falladas y una vía para que el administrador renueve la contraseña de un usuario. La spec de T-09 en `HOJA_DE_RUTA.md` no lo pedía: su requisito 1 se limitaba al inicio de sesión contra GoTrue, y T-06 había documentado que GoTrue **no** tiene bloqueo por cuenta (solo un límite por IP, no configurable). El mecanismo está pendiente de concretar (§6, pregunta #5) | Respuesta del dueño a la pregunta #4 de §6, el 2026-08-27. La hoja de ruta es inmutable, así que la ampliación se registra aquí en vez de editar la tarea |
| 2026-08-27 | T-09 / T-10 | **T-09 pasa a necesitar migración, y su spec dice `Migración: No`.** El bloqueo acordado se aplica en la base de datos, así que hace falta DDL sobre `perfil` (marca de bloqueo y conteo de intentos) más las RPC que lo mantienen y lo levantan. Eso es un fichero `db/NNN_*.sql` nuevo, con su fila en §3 para que lo aplique el dueño, y obliga a decidir la numeración: si el bloqueo va en `002`, la migración de políticas RLS de T-10 (`002_politicas_rls` en la hoja de ruta) pasa a `003`. Además, las políticas de T-10 tendrán que incluir la condición de "no bloqueado" en **todas** las tablas, no solo en `perfil`: es ahí donde el bloqueo se hace efectivo | Consecuencia directa de la respuesta del dueño a #4 y de la decisión (1) de #5, el 2026-08-27. Se registra aquí para que la sesión de T-09 no lo descubra a mitad y para que T-10 no escriba sus políticas sin esa condición |
| 2026-08-25 | — | **Excepción puntual a la inmutabilidad de `HOJA_DE_RUTA.md`:** el dueño editó el documento 41 minutos después de crearlo, para ajustar el protocolo de §0.1 y el cuerpo de la tarea T-07, pese a que la cabecera se declara "DOCUMENTO INMUTABLE… no se modifica nunca" | Respuesta del dueño a la pregunta #3 de §6, el 2026-08-27: la cabecera se mantiene literal y **cada edición suya se documenta aquí como excepción puntual**, en vez de relajar la declaración. Origen: hallazgo #1 de `auditoriacontinua.md`, que queda resuelto |
| 2026-08-28 | T-10 / T-14 | **Renumeración en cadena de las migraciones posteriores a T-10, por segunda vez el mismo día.** La hoja de ruta original llamaba `003_bucket_avatares` a la migración de T-14 (ya corregida una vez de `002` a `003` por la intercalación de P-01, ver la fila anterior de este mismo §7 del 2026-08-27). Como la migración de T-10 (`002_politicas_rls` en el original) ocupa ahora el número `003`, la de T-14 se recorre una posición más y pasa a `004_bucket_avatares`. T-10 además escribe ya, en su propia migración `003`, las políticas RLS del bucket `avatares` sobre `storage.objects` (válidas aunque el bucket todavía no exista) — T-14 solo tendrá que crear el bucket en sí | Consecuencia directa de la numeración de P-01 (fila anterior) al llegar a la migración de T-10. Anotado aquí, en `db/003_politicas_rls.sql`, en `db/MODELO.md` y en la fila de T-14 de §1 para que esa sesión no lo descubra a mitad |
| 2026-08-28 | T-12 | **Requisito 4 no cumplido literalmente: la búsqueda no es acento-insensible.** La spec pide "la búsqueda encuentra por cualquiera de las tres partes, acento-insensible"; la implementación usa `ilike` (ampliado a tres columnas con `or`), que no lo es. Instalar `unaccent` o añadir una columna generada e indexada es DDL, y T-12 tiene `Migración: No` — no hay forma de cumplirlo sin una migración. El criterio de aceptación enumerado de T-12 no incluye ningún caso de prueba sobre esto (a diferencia del criterio 2 de T-11, que sí prueba el duplicado acento-insensible) | Limitación técnica real, no una omisión: documentada en `DECISIONES_TECNICAS.md` y abierta como pregunta #8 de §6 para que el dueño decida si merece una migración futura |
