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
