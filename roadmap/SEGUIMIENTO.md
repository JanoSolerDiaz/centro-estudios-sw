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
**Última actualización:** 2026-08-27 — **el dueño ha respondido las cuatro preguntas de §6**, y
una de ellas amplía el alcance de T-09. Transcritas literalmente en §6 con la fecha; lo que
cambia para el desarrollo:

- **#1 (avisos a la familia):** no se implementa envío automático ahora, ni se da de alta ningún
  servicio externo. R-05 se entrega con `mailto:` / portapapeles, como estaba previsto.
- **#2 (`student`):** no se amplía. En el MVP `student` sigue cerrado; ninguna sesión debe
  proponer una política nueva para ese rol.
- **#4 (fuerza bruta): amplía T-09.** Se quiere bloqueo de la cuenta al **tercer** intento fallido
  y que el administrador pueda renovar la contraseña de un usuario. GoTrue no ofrece ninguna de
  las dos cosas (T-06 lo documentó: solo límite por IP, no configurable). Registrado en §7 como
  desviación de la hoja de ruta y en la fila de T-09. **El mecanismo está sin concretar y no es
  trivial:** el login va del navegador directo a GoTrue y no hay backend propio, así que un
  contador en el cliente es eludible con `curl`; lo único que se aplica de verdad es negar los
  datos por RLS a un usuario marcado como bloqueado. Y contar por email abre un vector que antes
  no existía: dejar fuera a un profesor sabiendo solo su correo. Abierta la **pregunta #5** para
  cerrar el diseño antes de programar esa parte; el resto de T-09 no depende de ella.
- **#3 (inmutabilidad de la hoja de ruta):** la cabecera se mantiene literal y **cada edición del
  dueño se documenta como excepción puntual** en §7. Las dos ediciones del 2026-08-25 quedan ya
  documentadas ahí; el hallazgo #1 de `auditoriacontinua.md` puede cerrarse en la próxima pasada.

**§3 sigue sin ninguna fila pendiente:** las dos acciones que esperaban al dueño (primer usuario
`administrator` en `dev` y `SUPABASE_SERVICE_ROLE_KEY_DEV` en `.env.local`) están hechas y
confirmadas por él el 2026-08-27. Queda una comprobación que ningún agente puede hacer (§0.1):
que ese usuario tenga `rol = 'administrator'` en `perfil` y no el `student` con el que nace todo
usuario nuevo — crear el usuario en el panel y promoverlo son dos pasos distintos.

Estado del desarrollo: **T-00 a T-08 COMPLETADAS**, `001_esquema_inicial` aplicada y verificada en
`dev`, 241 tests en verde y CI en verde. Historia de las últimas sesiones —incluidas el arreglo
del runner y la recuperación de la bitácora de T-08 perdida en un merge— en
`HISTORIAL_SESIONES.md`, sesiones (4) a (7). **Siguiente tarea: T-09** (autenticación y los tres
roles), que ya no tiene bloqueo humano de entrada.

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
| T-09 | Autenticación y los tres roles | PENDIENTE | — | `student` sin acceso desde el día 1; revisar límites de intentos de Supabase Auth documentados por T-06 en `DECISIONES_TECNICAS.md` y en §6 **Su bloqueo humano ya está resuelto de antemano (2026-08-27, confirmado por el dueño): el primer usuario `administrator` existe en `dev`.** No hace falta abrir fila en §3 por ello. Queda una comprobación pendiente para la sesión que la implemente, porque el agente no puede hacerla (necesita el editor SQL o la clave `service_role`, y §0.1 se lo prohíbe): que ese usuario tenga `rol = 'administrator'` en `perfil` y no el `student` con el que nace todo usuario nuevo — el bloque de promoción del final de `db/000_bootstrap_perfil.sql` es un paso aparte de crear el usuario en el panel **Alcance ampliado el 2026-08-27 por el dueño (§7):** bloqueo de la cuenta tras tres contraseñas falladas y renovación de contraseña por el administrador. GoTrue no ofrece ninguna de las dos, y el mecanismo está pendiente de concretar (§6, pregunta #5) antes de arrancar esa parte; el resto de T-09 no depende de ello y se puede empezar |
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
| 2 | Aplicar `db/000b_arreglo_permisos.sql` en `dev` | T-00 / arranque manual | ~~Comprobar con `npm run migrate -- --verificar-privilegios` y, si hacía falta, pegar el fichero en el editor SQL de `dev`~~ | **RESUELTA 2026-08-27 — no hacía falta aplicarlo: ya estaba aplicado.** El barrido no encontró ninguna violación, y la consulta de comprobación del propio fichero lo confirma en `perfil`: `authenticated` → INSERT/SELECT/UPDATE (sin `TRUNCATE`), `service_role` → DELETE/INSERT/SELECT/UPDATE, `anon` → ninguna fila. La fila existía porque `db/APLICADAS.md` lo daba por pendiente: la aplicación nunca se anotó. Ya está anotado y verificado |

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
| 1 | R-05 deja el aviso de ausencia listo para enviar a mano (`mailto:` o copiar al portapapeles), sin integración. ¿Se quiere en algún momento el envío automático por email transaccional, SMS o WhatsApp Business? Implica dar de alta una cuenta de servicio externo (posiblemente de pago) — decisión reservada al dueño, no autonomizable por una P-XX (§0.3). Mientras no haya respuesta, R-05 se entrega en su versión sin integración y no queda bloqueada por esto. | R-05 | | **No hace falta implementarlo ahora.** No está decidido cómo se quieren mandar esos avisos, ni siquiera si se quieren mandar. Queda para un desarrollo futuro, cuando todo lo demás esté terminado. Efecto: R-05 se entrega en su versión sin integración (`mailto:` / portapapeles) y **no se da de alta ninguna cuenta de servicio externo**. — dueño, 2026-08-27 |
| 2 | Con R-04 (informe mensual) y R-05 (aviso a la familia) ya en el roadmap, ¿tiene sentido en el futuro dar al rol `student` —o a una persona de referencia, sin necesidad de que sea el propio menor quien inicie sesión— una vista de solo lectura de su propio histórico de asistencia y ausencias justificadas? Es justo la ampliación de `student` que la hoja de ruta reserva expresamente al dueño (§0.2); no se propone ninguna R-XX para esto sin tu decisión. | — | | **No.** Los estudiantes tendrán funcionalidades, pero también más adelante. Efecto: en el MVP `student` sigue sin acceso a nada salvo su propia fila de `perfil`; cualquier otra política para `student` sigue siendo un fallo (§0.2), y ninguna sesión debe proponerla. — dueño, 2026-08-27 |
| 4 | T-06 investigó los límites de intentos que Supabase Auth (GoTrue) aplica por defecto (requisito 1 de su spec). Confirmado por la documentación oficial y su código fuente: usa un algoritmo de *token bucket* por endpoint; los límites de envío de correo (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/user`) y de OTP/enlace mágico son configurables desde el panel (**Authentication → Rate Limits**) o por la Management API; los de `/auth/v1/verify`, `/auth/v1/token` (que es también el endpoint del inicio de sesión con contraseña) y los desafíos de MFA están limitados **por IP** y **no son configurables desde el panel**. GoTrue **no tiene** un bloqueo de cuenta tras N contraseñas incorrectas: la única defensa por defecto contra fuerza bruta al iniciar sesión es ese límite por IP, no un límite por email. Esta sesión no pudo confirmar la cifra numérica exacta vigente hoy (sin salida de red hacia `supabase.com` desde este entorno; detalle completo, con las dos fuentes consultadas, en `DECISIONES_TECNICAS.md`). Pide dos cosas al dueño: (a) revisar **Authentication → Rate Limits** en el panel del proyecto `dev` antes de T-25 (paso a producción) y ajustar lo que haga falta, y (b) decidir si además del límite por IP se quiere algún límite por cuenta — eso sería trabajo nuevo de T-09, no algo que Supabase ofrezca ya. No bloquea nada mientras tanto. | T-06 / T-09 / T-25 | | **(b) Sí, se quiere límite por cuenta: al tercer intento fallido de contraseña se bloquea al usuario, y el administrador debe poder renovar su contraseña.** Es trabajo nuevo dentro de T-09 y una ampliación de su spec — anotada en §7. GoTrue no ofrece nada de esto, así que el **mecanismo** hay que diseñarlo y tiene aristas reales (el conteo desde el cliente es eludible, y bloquear por email abre un vector para dejar fuera a un profesor sabiendo solo su correo): se concreta en la pregunta **#5**, abierta abajo. **(a)** revisar *Authentication → Rate Limits* en el panel de `dev` antes de T-25: sigue pendiente, no bloquea. — dueño, 2026-08-27 |
| 3 | `auditoriacontinua.md` registra el hallazgo #1 (severidad baja, higiene documental): `HOJA_DE_RUTA.md` se autodeclara "DOCUMENTO INMUTABLE... no se modifica nunca" pero el propio dueño lo editó 41 minutos después de crearse, el mismo día, para ajustar el protocolo de §0.1 (que el documento sí permite cambiar al dueño) y el cuerpo de la tarea T-07 (que se declara inmutable sin excepción explícita para nadie). Sin riesgo de dato ni operativo: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento. No encaja como mejora de producto (no es una R-XX) ni como deuda técnica de código (no hay nada que programar): es una pregunta de gobernanza documental que solo el dueño puede resolver, porque el PM tiene este documento en modo SOLO LECTURA. ¿Quieres que la cabecera de `HOJA_DE_RUTA.md` deje explícita una excepción para tus propias ediciones (p. ej. "inmutable salvo para el dueño"), o prefieres que la declaración se mantenga literal y que una futura edición tuya, si hace falta, se documente aquí mismo como excepción puntual? Mientras no haya respuesta, el hallazgo queda `ABIERTO` en `auditoriacontinua.md` sin bloquear nada — origen: auditoría #1. | — | | **Cada edición mía debe documentarse como excepción puntual.** Efecto: la cabecera de `HOJA_DE_RUTA.md` se mantiene **literal** ("DOCUMENTO INMUTABLE… no se modifica nunca"), sin añadirle ninguna excepción, y cada edición del dueño se registra como excepción puntual en §7 de este documento. Las dos ediciones ya ocurridas (protocolo de §0.1 y cuerpo de T-07, ambas del 2026-08-25) quedan documentadas ahí. El hallazgo #1 de `auditoriacontinua.md` puede cerrarse en la próxima pasada del auditor. — dueño, 2026-08-27 |
| 5 | **¿Cómo se implementa el bloqueo tras tres contraseñas falladas (respuesta a #4), y qué significa exactamente que "el administrador renueve la contraseña"?** El problema no es programarlo, es dónde se aplica: el inicio de sesión va del navegador directo a GoTrue, y **no hay backend propio** (§0.2), así que un contador en el cliente no impide que alguien llame a GoTrue por su cuenta con `curl` — sería disuasión, no un control de seguridad. Lo que sí se aplica de verdad es la base de datos: un usuario marcado como bloqueado no lee nada aunque su token sea válido, porque lo niegan las políticas de T-10. Y hay un riesgo nuevo que no existía: si el contador va por email y lo puede tocar quien no ha iniciado sesión, cualquiera que conozca el correo de un profesor puede dejarlo fuera antes de una clase. Sobre la renovación: la spec de T-09 (requisito 2) ya resuelve el caso por la vía en la que **el administrador nunca conoce la contraseña de nadie** — dispara el correo de recuperación, que funciona con la clave anónima, y el profesor se pone la suya; que el administrador **fije** una contraseña exigiría la clave `service_role` en el navegador, que está prohibida, o un backend, que hoy no existe. | T-09 | | **Tres decisiones, 2026-08-27:** (1) **Bloqueo en la base de datos y aplicado por RLS, hasta que lo levante el administrador.** Los fallos se cuentan en la base de datos; un usuario bloqueado no lee **nada** aunque su token sea válido, porque lo niegan las políticas. Es control real, no cosmético. El dueño acepta explícitamente la contrapartida: quien conozca el email de un profesor puede dejarlo fuera, y el desbloqueo es manual. (2) **Renovar la contraseña = disparar el correo de recuperación** (`POST /auth/v1/recover`, clave anónima): el administrador pulsa un botón y el profesor se pone la suya. **El administrador no conoce la contraseña de nadie, nunca**, y el stack no cambia. Queda descartado que el administrador fije una contraseña: exigiría `service_role` en el navegador o un backend. (3) **El bloqueo alcanza a todos los roles, administrador incluido**, y la vía de escape es el **editor SQL del panel, que solo tiene el dueño** — la misma lógica que el arranque manual. Hay que documentar la consulta exacta en `DEVELOPERS.md`. |

---

## 7. DESVIACIONES RESPECTO A LA HOJA DE RUTA ORIGINAL

> Resumen consolidado para comparar contra `HOJA_DE_RUTA.md` de un vistazo.

| Fecha | Tarea | Desviación | Motivo |
|-------|-------|-----------|--------|
| 2026-08-27 | T-09 | **Alcance ampliado por decisión del dueño:** se añade bloqueo de la cuenta tras **tres** contraseñas falladas y una vía para que el administrador renueve la contraseña de un usuario. La spec de T-09 en `HOJA_DE_RUTA.md` no lo pedía: su requisito 1 se limitaba al inicio de sesión contra GoTrue, y T-06 había documentado que GoTrue **no** tiene bloqueo por cuenta (solo un límite por IP, no configurable). El mecanismo está pendiente de concretar (§6, pregunta #5) | Respuesta del dueño a la pregunta #4 de §6, el 2026-08-27. La hoja de ruta es inmutable, así que la ampliación se registra aquí en vez de editar la tarea |
| 2026-08-27 | T-09 / T-10 | **T-09 pasa a necesitar migración, y su spec dice `Migración: No`.** El bloqueo acordado se aplica en la base de datos, así que hace falta DDL sobre `perfil` (marca de bloqueo y conteo de intentos) más las RPC que lo mantienen y lo levantan. Eso es un fichero `db/NNN_*.sql` nuevo, con su fila en §3 para que lo aplique el dueño, y obliga a decidir la numeración: si el bloqueo va en `002`, la migración de políticas RLS de T-10 (`002_politicas_rls` en la hoja de ruta) pasa a `003`. Además, las políticas de T-10 tendrán que incluir la condición de "no bloqueado" en **todas** las tablas, no solo en `perfil`: es ahí donde el bloqueo se hace efectivo | Consecuencia directa de la respuesta del dueño a #4 y de la decisión (1) de #5, el 2026-08-27. Se registra aquí para que la sesión de T-09 no lo descubra a mitad y para que T-10 no escriba sus políticas sin esa condición |
| 2026-08-25 | — | **Excepción puntual a la inmutabilidad de `HOJA_DE_RUTA.md`:** el dueño editó el documento 41 minutos después de crearlo, para ajustar el protocolo de §0.1 y el cuerpo de la tarea T-07, pese a que la cabecera se declara "DOCUMENTO INMUTABLE… no se modifica nunca" | Respuesta del dueño a la pregunta #3 de §6, el 2026-08-27: la cabecera se mantiene literal y **cada edición suya se documenta aquí como excepción puntual**, en vez de relajar la declaración. Origen: hallazgo #1 de `auditoriacontinua.md`, que queda resuelto |
