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
**Última actualización:** 2026-08-27 — **T-07, T-08 y T-09 COMPLETADAS.**

**T-07:** el dueño aplicó `001_esquema_inicial` en `dev` con `npm run migrate` y quedó verificado:
la RPC `esquema_version()` devuelve `1`. Fila anotada en `db/APLICADAS.md` (hash `93359e9a4e27`) y
fila 1 de §3 cerrada. Antes hubo que arreglar un bug del propio runner que impedía aplicarla: no
cargaba `.env.local`, así que decía "Falta SUPABASE_ACCESS_TOKEN" con un fichero correcto. Con la
migración aplicada queda además confirmado en la práctica el endpoint de la Management API, que
T-07 no pudo verificar contra documentación en vivo. Detalle en las sesiones (4) y (5) de
`HISTORIAL_SESIONES.md` y en dos filas de `DECISIONES_TECNICAS.md`.

**T-08:** cliente propio de la API de Supabase (PostgREST + Storage): `src/datos/` con
`erroresDominio.ts`, `codificadorValores.ts`, `configuracion.ts`, `peticionHttp.ts`, `postgrest.ts`
y `almacenamiento.ts` (firma de URLs en lote en una sola petición), `eventoError.ts` reescrito sobre
el cliente nuevo, `mensajesAbuso.ts` ampliado sin exponer nunca el `message` crudo de Postgres, y
`config.js`/`config.ejemplo.js` como mecanismo de inyección de configuración sin bundler. Detalle
completo en la sesión **(4b)** de `HISTORIAL_SESIONES.md` y en sus 12 filas de
`DECISIONES_TECNICAS.md`.

**T-09 (esta sesión):** autenticación y los tres roles. `src/datos/autenticacion.ts` (cliente propio
de GoTrue — login, logout, renovación por `refresh_token`, recuperación de contraseña completa —
endpoints sin poder verificarse contra documentación en vivo, mismo aviso ya dado para
Auth/Management API/Storage). `src/nucleo/almacenSesion.ts` (persistencia con la opción más
conservadora razonable: solo el `refresh_token` en `sessionStorage`, nunca el `access_token`, que
vive solo en memoria — riesgo de XSS documentado en `DECISIONES_TECNICAS.md`).
`src/nucleo/gestorSesion.ts` (orquestación: junta GoTrue + PostgREST para cargar el `perfil` propio;
un `perfil.activo = false` no entra aunque las credenciales sean correctas, revocando la sesión en
el servidor; renovación **proactiva** — `renovarAlAbrirPasarLista()`, el punto de enganche de T-19,
nunca espera a un `401`; una renovación fallida no cierra la sesión ni descarta el estado).
`src/nucleo/enlaceRecuperacion.ts` (parseo puro del enlace de recuperación del correo). Pantallas
nuevas en `src/ui/` (DOM nativo, objetivos táctiles ≥44px): `pantallaLogin.ts`,
`pantallaRecuperarContrasena.ts` (responde igual exista o no la cuenta),
`pantallaEstablecerContrasenaNueva.ts`, `pantallaSinAcceso.ts` (para `student` y cualquier rol
desconocido, que se trata igual — nunca como `teacher` —, sin ninguna llamada a datos extra), y
`aplicacion.ts` (el enrutador). `src/ui/main.ts` conecta ya `gestorSesion` real; el enviador de
`evento_error` ya adjunta el token de sesión cuando lo hay. `mensajesAbuso.ts` ampliado con
`CredencialesInvalidas`/`PerfilInactivo`. Verificado en Chromium headless: sin `config.js`, pantalla
de T-00; con un `config.js` de prueba, la pantalla de login real, sin errores de consola. 63 tests
nuevos sobre la base ya integrada de T-07/T-08 (297 en total). Detalle completo en la sesión (6) de
`HISTORIAL_SESIONES.md` y en 8 filas nuevas de `DECISIONES_TECNICAS.md`.

**Aviso de proceso:** T-07 y T-08 corrieron en paralelo en sesiones distintas y colisionaron en los
documentos de registro; la resolución de los merges `dd999ba`/`b7c09dd` perdió la entrada de
bitácora de T-08 y un párrafo de esta cabecera, ambos recuperados después (ver sesión (4b) de
`HISTORIAL_SESIONES.md`). Nada de código se perdió. Si se vuelven a lanzar dos sesiones a la vez,
numerar las entradas de `HISTORIAL_SESIONES.md` por tarea y no por ordinal.

**Pendiente del dueño:** `db/000b_arreglo_permisos.sql` sigue sin aplicar (fila 2 de §3) — el
runner lo ignora a propósito (su nombre no encaja con `NNN_nombre.sql`), así que ningún agente lo
aplicará nunca; mientras no se aplique, `authenticated` conserva `TRUNCATE` sobre `perfil` (ignora
RLS) y `service_role` no tiene DML, lo que hará fallar `npm run seed`. Y el bloqueo humano propio de
T-09 — crear el primer usuario `administrator` en `dev` — en la fila 3 de §3, nueva esta sesión; no
bloquea ninguna tarea posterior.

**Siguiente tarea:** T-10 (autorización — políticas RLS de los tres roles), que depende de T-09 (ya
completa). Su migración `002_politicas_rls` se escribirá y testeará contra dobles igual que
T-07/T-08, y quedará BLOQUEADA a la espera de que el dueño la aplique.

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
| T-09 | Autenticación y los tres roles | COMPLETADA | 2026-08-27 | `student`/rol desconocido sin acceso, sin llamada de datos extra; login, logout, renovación proactiva, recuperación de contraseña completa; bloqueo humano aparte (crear el primer `administrator`) en fila #3 de §3 |
| T-10 | Autorización: políticas RLS de los tres roles | PENDIENTE | — | Migración `002_politicas_rls` |
| T-11 | Catálogo de centros de estudios | PENDIENTE | — | Prerequisito del alta de alumno |
| T-12 | Ficha de alumno: datos, centro y baja lógica | PENDIENTE | — | — |
| T-13 | Personas de referencia del alumno | PENDIENTE | — | 0..N, solo `administrator` |
| T-14 | Avatar del alumno (Supabase Storage) | PENDIENTE | — | Migración `003_bucket_avatares`. Bucket privado; límite de subidas por administrator y hora — contrato recomendado por T-06 en `DECISIONES_TECNICAS.md` |
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
| R-04 | Informe mensual por alumno | PENDIENTE | — | Oleada v1 / F-02 |
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
| 2 | Aplicar `db/000b_arreglo_permisos.sql` en `dev` | T-00 / arranque manual | **Primero comprueba si hace falta:** `npm run migrate -- --verificar-privilegios`. Si informa de que `authenticated` tiene `TRUNCATE` sobre `perfil`, el fichero no está aplicado. Es parte del arranque manual (igual que `000_bootstrap_perfil.sql`) y **el runner lo ignora a propósito**: su nombre no encaja con el patrón `NNN_nombre.sql`, así que ningún agente lo aplicará nunca. Aplícalo pegando `db/000b_arreglo_permisos.sql` en el editor SQL de Supabase del proyecto `dev`, igual que hiciste con `000`. Es idempotente. Por qué importa: `TRUNCATE` **ignora RLS** (las políticas de T-10 no protegerán de él) y además `service_role` se quedó sin DML sobre `perfil`, lo que hará fallar `npm run seed`. Cuando lo confirmes aquí, la siguiente sesión anota la fecha en `db/APLICADAS.md`. | pendiente |
| 3 | Crear el primer usuario `administrator` en `dev` (bloqueo humano de T-09) | T-09 | El código de T-09 ya está completo y no depende de este paso para seguir avanzando (T-10 en adelante se desarrolla igual, contra dobles), pero para que tú mismo puedas entrar a la aplicación hace falta un usuario con rol `administrator`. Pasos exactos, ya documentados al final de `db/000_bootstrap_perfil.sql` (que ya tienes aplicado): 1) en el panel de Supabase del proyecto `dev`, **Authentication → Users → Add user**, créate un usuario con tu email y una contraseña provisional (o usa la recuperación de contraseña de la propia app en cuanto haya `config.js` desplegado). 2) En el editor SQL, ejecuta `update public.perfil set rol = 'administrator' where id = (select id from auth.users where email = 'TU_EMAIL_AQUI');` — todo usuario nuevo nace `student` (sin acceso) por diseño. 3) Verifica con `select p.nombre, p.rol, p.activo, u.email from public.perfil p join auth.users u on u.id = p.id;`. No requiere ninguna migración ni `npm run migrate`. Confirma aquí cuando lo hayas hecho; no bloquea ninguna tarea posterior. | pendiente |

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
|    |             |                                                                   |        |                |

---

## 6. PREGUNTAS ABIERTAS PARA EL DUEÑO

> Decisiones de negocio que los agentes no pueden tomar. El dueño responde en la última columna.
> El agente las abre al llegar a la tarea correspondiente; ninguna bloquea el desarrollo, porque
> cada una tiene un valor por defecto conservador escrito en la spec de su tarea.
>
> Ya previstas en las specs, para que el dueño sepa qué le van a preguntar: campos adicionales de
> `centro_estudios` (T-11); campo `relacion` en las personas de referencia y si debe exigirse al
> menos una vía de contacto por alumno (T-13); zona horaria y ventana de tolerancia (T-17);
> política de registros duplicados (T-18); y la ventana de edición del profesor, 7 días por
> defecto (T-21).
>
> **Ya resuelta (2026-08-25):** el profesor **sí** ve el avatar de sus alumnos en pasar lista, en
> formato card. Eso amplió la lectura del bucket al rol `teacher`, acotada a alumnos activos.

| # | Pregunta | Tarea | Respuesta |
|---|----------|-------|-----------|
| 1 | R-05 deja el aviso de ausencia listo para enviar a mano (`mailto:` o copiar al portapapeles), sin integración. ¿Se quiere en algún momento el envío automático por email transaccional, SMS o WhatsApp Business? Implica dar de alta una cuenta de servicio externo (posiblemente de pago) — decisión reservada al dueño, no autonomizable por una P-XX (§0.3). Mientras no haya respuesta, R-05 se entrega en su versión sin integración y no queda bloqueada por esto. | R-05 | |
| 2 | Con R-04 (informe mensual) y R-05 (aviso a la familia) ya en el roadmap, ¿tiene sentido en el futuro dar al rol `student` —o a una persona de referencia, sin necesidad de que sea el propio menor quien inicie sesión— una vista de solo lectura de su propio histórico de asistencia y ausencias justificadas? Es justo la ampliación de `student` que la hoja de ruta reserva expresamente al dueño (§0.2); no se propone ninguna R-XX para esto sin tu decisión. | — | |
| 4 | T-06 investigó los límites de intentos que Supabase Auth (GoTrue) aplica por defecto (requisito 1 de su spec). Confirmado por la documentación oficial y su código fuente: usa un algoritmo de *token bucket* por endpoint; los límites de envío de correo (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/user`) y de OTP/enlace mágico son configurables desde el panel (**Authentication → Rate Limits**) o por la Management API; los de `/auth/v1/verify`, `/auth/v1/token` (que es también el endpoint del inicio de sesión con contraseña) y los desafíos de MFA están limitados **por IP** y **no son configurables desde el panel**. GoTrue **no tiene** un bloqueo de cuenta tras N contraseñas incorrectas: la única defensa por defecto contra fuerza bruta al iniciar sesión es ese límite por IP, no un límite por email. Esta sesión no pudo confirmar la cifra numérica exacta vigente hoy (sin salida de red hacia `supabase.com` desde este entorno; detalle completo, con las dos fuentes consultadas, en `DECISIONES_TECNICAS.md`). Pide dos cosas al dueño: (a) revisar **Authentication → Rate Limits** en el panel del proyecto `dev` antes de T-25 (paso a producción) y ajustar lo que haga falta, y (b) decidir si además del límite por IP se quiere algún límite por cuenta — eso sería trabajo nuevo de T-09, no algo que Supabase ofrezca ya. No bloquea nada mientras tanto. | T-06 / T-09 / T-25 | |
| 5 | T-09 no ha podido comprobar en el panel del proyecto `dev` (sin salida de red a `supabase.com`, misma limitación que T-06/T-07/T-08) dos cosas de **Authentication** que afectan directamente a si el flujo de recuperación de contraseña que ya está programado funciona de verdad para un profesor real: (a) si la **confirmación de email** está activada — un usuario creado desde el panel podría quedar sin confirmar y no poder iniciar sesión, un fallo que parece un error de código y no lo es (requisito 3 de T-09); y (b) si hace falta configurar un **SMTP propio**, porque el servidor de correo por defecto de Supabase tiene un límite bajo en el plan gratuito y no es apto para uso real con varios profesores. Pide al dueño revisar **Authentication → Email Templates** / **Authentication → Providers** (confirmación de email) y **Authentication → SMTP Settings** antes de repartir el acceso a profesores reales. No bloquea nada mientras tanto: el código funciona igual, solo el correo de recuperación podría no llegar o el alta podría quedar a medias hasta que se revise. | T-09 | |
| 3 | `auditoriacontinua.md` registra el hallazgo #1 (severidad baja, higiene documental): `HOJA_DE_RUTA.md` se autodeclara "DOCUMENTO INMUTABLE... no se modifica nunca" pero el propio dueño lo editó 41 minutos después de crearse, el mismo día, para ajustar el protocolo de §0.1 (que el documento sí permite cambiar al dueño) y el cuerpo de la tarea T-07 (que se declara inmutable sin excepción explícita para nadie). Sin riesgo de dato ni operativo: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento. No encaja como mejora de producto (no es una R-XX) ni como deuda técnica de código (no hay nada que programar): es una pregunta de gobernanza documental que solo el dueño puede resolver, porque el PM tiene este documento en modo SOLO LECTURA. ¿Quieres que la cabecera de `HOJA_DE_RUTA.md` deje explícita una excepción para tus propias ediciones (p. ej. "inmutable salvo para el dueño"), o prefieres que la declaración se mantenga literal y que una futura edición tuya, si hace falta, se documente aquí mismo como excepción puntual? Mientras no haya respuesta, el hallazgo queda `ABIERTO` en `auditoriacontinua.md` sin bloquear nada — origen: auditoría #1. | — | |

---

## 7. DESVIACIONES RESPECTO A LA HOJA DE RUTA ORIGINAL

> Resumen consolidado para comparar contra `HOJA_DE_RUTA.md` de un vistazo.

| Fecha | Tarea | Desviación | Motivo |
|-------|-------|-----------|--------|
|       |       |           |        |
