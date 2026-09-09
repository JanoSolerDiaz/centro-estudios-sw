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
**Última actualización:** 2026-09-09 (rutina programada de programador) — revisado primero el
registro de hallazgos de `auditoriacontinua.md` (protocolo §0.3): sin pasada nueva del auditor desde
la de esta mañana (commit `c91f4c0`), confirmado con `git log` (ningún commit de `auditoriacontinua.md`
desde `698b150`, el commit de R-15). De sus tres `ABIERTO` de severidad alta, **#8** sigue esperando al
dueño en la pregunta #16 de §6, sin novedad; **#12** y **#13** siguen `ABIERTO` en la tabla del auditor
pero ya resueltos de facto por **P-20**/**P-21** de tres sesiones atrás, pendientes solo de que el
auditor los confirme en su próxima pasada — no le corresponde a esta sesión adelantárselo. Sin ningún
hallazgo `ABIERTO` de severidad alta nuevo que atender como P-XX urgente, se revisó §1: con R-15 ya
`COMPLETADA` (sesión anterior), la siguiente tarea `PENDIENTE` que no depende de nada sin terminar era
**R-16** ("Exportación completa del centro", oleada v3/F-07, spec en `ROADMAP_PRODUCTO.md`,
`Migración: No`, depende de T-11/T-12/T-13/T-15/T-23, las cinco `COMPLETADA`).

**R-16 completada.** `dominio/exportacionCentro.ts` (nuevo, 13 tests): compone, sin ninguna tabla ni
RPC nueva (requisito propio de la spec, "Migración: No"), el catálogo completo de centros, TODOS los
alumnos —activos e inactivos, a diferencia del panel de R-11, que solo cuenta los activos: un volcado
de respaldo que omitiera a quien causó baja no sería un volcado completo (requisito 1: "todo lo que el
centro tiene guardado")— con sus personas de referencia embebidas, todos los slots de horario
(cualquier vigencia, con su versionado íntegro de T-15) y el histórico completo de asistencia de TODOS
los alumnos (T-23 sin ningún filtro, que ya de por sí incluye anuladas y retroactivas — mismo criterio
de integridad que R-10: "un volcado que oculta lo anulado no es un volcado completo"). Reutiliza sin
duplicar las mismas etiquetas y cálculos que ya usa `expedienteAlumno.ts` (R-10) para que un centro
completo cuente exactamente lo mismo que la suma de sus expedientes individuales. `tieneAvatar:
booleano` por alumno, nunca `avatar_ruta` ni una URL firmada (requisito 2, mismo criterio exacto que
R-10) — verificado también con un test que comprueba que el JSON descargado no contiene la cadena
`avatar_ruta` en ninguna forma. Nuevas `datos/alumnos.ts#listarTodosLosAlumnosParaExportacion` (ficha
completa CON `avatar_ruta`, a diferencia de `listarAlumnos`/P-02: aquí hace falta para resolver
`tieneAvatar`, que el dominio nunca vuelve a exponer — recorre `alumno_ficha` página a página con lotes
de 500, mismo patrón que `listarHistoricoAsistenciaCompleto` de T-23) y
`datos/personasReferencia.ts#listarPersonasReferenciaDeAlumnos` (en lote, agrupadas por `alumno_id` del
lado del cliente, nunca una petición por alumno). El botón «Exportar todo el centro» se añade como
CUARTO bloque de `ui/pantallaPanelCentro.ts` (R-11), no como pantalla ni ruta propia (la propia spec,
requisito 1, dice literalmente "desde el panel de administrator") — sin filtro de centro ni de rango,
a diferencia de los otros tres bloques: es un volcado de TODO, no una vista acotada. Sin una segunda
función en `permisosUi.ts`: el criterio de aceptación ("un `teacher` recibe `SinPermiso` al
intentarlo") se satisface por la misma inaccesibilidad estructural que ya protege el resto del panel
(`puedeVerPanelCentro`), mismo precedente que R-10/R-15. **23 tests nuevos en total** (1517 en total,
antes 1494): 13 de `dominio/exportacionCentro.ts`, 4 del bloque nuevo de `pantallaPanelCentro.test.ts`,
3 de `listarTodosLosAlumnosParaExportacion` y 3 de `listarPersonasReferenciaDeAlumnos`. Sin migración.
`db/APLICADAS.md` sin cambio. `FEEDBACK.md` sigue con su única fila plantilla vacía: nada que
convertir.

**Sesión anterior (2026-09-09, rutina programada de programador, "R-15 completada"):** revisado
primero el registro de hallazgos de `auditoriacontinua.md` (protocolo §0.3): sin pasada nueva del
auditor desde la de esta mañana (commit `c91f4c0`). De sus tres `ABIERTO` de severidad alta, **#8**
sigue esperando al dueño en la pregunta #16 de §6, sin novedad; **#12** y **#13** siguen `ABIERTO` en
la tabla del auditor pero ya resueltos de facto por **P-20**/**P-21** de dos sesiones atrás, pendientes
solo de que el auditor los confirme en su próxima pasada — no le corresponde a esta sesión
adelantárselo. Sin ningún hallazgo `ABIERTO` de severidad alta nuevo que atender como P-XX urgente, se
revisó §1: con R-11 ya `COMPLETADA` (sesión anterior), la siguiente tarea `PENDIENTE` que no depende de
nada sin terminar era **R-15** ("Informe de horas por profesor", oleada v3/F-07, spec en
`ROADMAP_PRODUCTO.md`, `Migración: No`, depende de R-03 —code-completa, bloqueada solo por
migración, mismo precedente ya aceptado para R-04/R-11/R-13— y de T-24, `COMPLETADA`).

**R-15 completada.** `dominio/informeHorasProfesor.ts` (nuevo, 13 tests): por cada profesor
`rol = 'teacher'` y `activo = true` (una fila SIEMPRE, incluso sin ninguna sesión, a diferencia de
los rankings de R-11 que omiten a quien no aporta nada — aquí el objetivo es la nómina), sesiones y
horas reales propias (`null`, nunca `0`, sin ninguna salida marcada, mismo criterio que R-04), horas
teóricas de sus slots vigentes en el rango (reutiliza sin tocarlos `esDiaCerrado` de R-12 y
`esDiaCanceladoParaSlot` de R-06, y el recorrido día a día de `diaSiguiente`, exportada de
`panelCentro.ts` para esto) y sesiones/horas reales de SUSTITUCIÓN (R-06) separadas de las propias
(requisito 2) — sin ninguna columna ni tabla nueva: comparar `asistencia.profesor_id` contra
`slot_horario.profesor_id` del MISMO `slot_id` ya distingue si la dio el titular o un sustituto,
decisión ya sentada por R-06 al mantener el mismo `slot_id` para los dos. Ni una anulada ni un día
cancelado infla nada (requisito 3), verificado también de forma defensiva sobre el propio registro
real, no solo sobre lo teórico. Pantalla propia `ui/pantallaInformeHorasProfesor.ts` (nueva, 10
tests), enrutada como `#/informe-horas`, exclusiva de `administrator` — no un bloque del panel de
R-11 (su filtro de "centro" es el colegio del ALUMNO, sin sentido para un informe del profesor, ver
`DECISIONES_TECNICAS.md`). CSV con metadatos de rango y fecha de generación (sin campo "Centro": no
hay ningún alumno del que resolverlo, a diferencia de R-04) vía `nucleo/csv.ts#documentoCsvConMetadatos`
(nueva: metadatos campo/valor + tabla, para cuando las dos partes no comparten número de columnas) y
ventana de impresión, las dos sobre las MISMAS filas que la tabla en pantalla. Nuevas
`datos/slotsHorario.ts#listarSlotsDeProfesores` (en lote, mismo patrón que `listarSlotsDeAlumnos` de
R-11) y `dominio/permisosUi.ts#puedeVerInformeHorasProfesor`. El criterio de aceptación de la spec
("un `teacher` recibe `SinPermiso` al intentar generarlo") se satisface por inaccesibilidad
estructural —la pantalla solo existe dentro del router de `administrator`— mismo precedente ya
aceptado por R-10 sin hallazgo de auditoría (`Migración: No` descarta forzar un `403` real con una
RPC nueva). **28 tests nuevos en total** (1494 en total, antes 1466): 13 de
`dominio/informeHorasProfesor.ts`, 10 de `ui/pantallaInformeHorasProfesor.ts`, 2 de
`listarSlotsDeProfesores`, 1 de `puedeVerInformeHorasProfesor`, 2 de `documentoCsvConMetadatos` (más
la ruta `#/informe-horas` en `router.test.ts`, ya contada dentro de los 10 de la pantalla). Sin
migración. `db/APLICADAS.md` sin cambio. `FEEDBACK.md` sigue con su única fila plantilla vacía: nada
que convertir.

**Sesión anterior (2026-09-09, rutina programada de programador, "R-11 completada; P-22 urgente:
bug propio en el filtro de centro del histórico"):** revisado primero el registro de hallazgos de
`auditoriacontinua.md` (protocolo §0.3): sin pasada nueva del auditor desde la de esta misma mañana
(commit `c91f4c0`). De sus tres `ABIERTO` de severidad alta, **#8** sigue esperando al dueño en la
pregunta #16 de §6, sin novedad; **#12** y **#13** ya quedaron resueltos de facto por
**P-20**/**P-21** de la sesión anterior (pendientes solo de que el auditor los confirme en su próxima
pasada — no le corresponde a esta sesión adelantárselo). Sin ningún hallazgo `ABIERTO` de severidad
alta nuevo que atender como P-XX urgente, se retomó la cola normal de §1: **R-11** ("Panel de centro
para el administrador", oleada v2/F-06), que la sesión anterior había dejado como siguiente
tarea pendiente.

Al escribir R-11 (que necesita, por primera vez en el proyecto, resolver "todos los alumnos activos
de un centro" para cruzarlos con su horario) salió a la luz un bug real ya en producción potencial,
no un hallazgo de auditoría: `datos/asistencia.ts#idsAlumnosDeCentro` (T-23, filtro por centro del
histórico, `COMPLETADA` desde 2026-09-01) leía `centro_referencia_id` de la tabla BASE `alumno`,
columna que `003_politicas_rls.sql` **nunca** concede a `authenticated` en ninguna forma — un
"permission denied for column centro_referencia_id" contra cualquier entorno real, para
`administrator` igual que para `teacher` (comparten el mismo rol de Postgres). El propio
`db/pruebas_rls.sql` ya documentaba este error exacto en un comentario de la sesión de T-21/R-04
(`resolverCentroReferenciaIdDeAlumno` ya lo evitaba yendo contra `alumno_ficha`), pero nadie había
vuelto a revisar `idsAlumnosDeCentro` a esa luz. Registrado y corregido como **P-22** urgente (§0.3,
detalle en §5) antes de continuar con R-11: ahora consulta `alumno_ficha`, mismo patrón que el resto
de resolutores de centro del proyecto — sin migración, solo cambia qué relación consulta el cliente;
el filtro por centro del histórico solo lo ejercita `administrator` desde la interfaz, así que el
arreglo no cambia el comportamiento visible de nadie, solo lo hace funcionar de verdad.

**R-11 completada.** `dominio/panelCentro.ts` (nuevo, 23 tests) compone tres bloques sin tabla nueva
(requisito 1), reutilizando sin tocarlos los criterios de exclusión ya fijados por R-12
(`esDiaCerrado`) y R-06 (`esDiaCanceladoParaSlot`): (a) sesiones de hoy y su estado
(`pasada_lista`/`pendiente`/`sin_pasar_lista`), siempre con `reloj.ahora()`, nunca con el rango de
fechas elegido (no tiene sentido preguntar "¿qué ha pasado hoy?" sobre un mes ya cerrado); (b)
ranking de alumnos con más ausencias sin justificar en el rango elegido; (c) ranking de PROFESORES
(decisión de esta sesión, no de slots — ver `DECISIONES_TECNICAS.md`) con menor proporción de
sesiones registradas frente a las esperadas, sin invadir el alcance futuro de R-15 (horas por
profesor). Los rankings muestran solo nombre y cifra, nunca avatar (requisito 2). Nuevas
`datos/alumnos.ts#listarAlumnosActivosParaPanel` (contra `alumno_ficha`, mismo motivo que P-22) y
`datos/slotsHorario.ts#listarSlotsDeAlumnos` (en lote, nunca una petición por alumno); nueva
`puedeVerPanelCentro` en `permisosUi.ts`. Pantalla `ui/pantallaPanelCentro.ts` (nueva, 12 tests),
enrutada como `#/panel` en el router de `administrator` (`nucleo/router.ts`), exclusiva de
`administrator`. Filtro por centro y por rango de fechas (por defecto el mes natural en curso,
reutiliza `limitesDelMes` de R-04) para los dos rankings. Sin migración (requisito propio de la
spec, "Migración: No"). **42 tests nuevos en total** (1466 en total, antes 1424): 23 de
`dominio/panelCentro.ts`, 12 de `ui/pantallaPanelCentro.ts`, 3 de `listarAlumnosActivosParaPanel`, 2
de `listarSlotsDeAlumnos`, 1 de `puedeVerPanelCentro` y 1 de la ruta `#/panel`. `db/APLICADAS.md` sin
cambio. `FEEDBACK.md` sigue con su única fila plantilla vacía: nada que convertir.

**Sesión anterior (2026-09-09, rutina programada de programador, "P-20/P-21 urgentes, R-11
identificada como siguiente tarea"):** revisado primero el registro de hallazgos de
`auditoriacontinua.md` (protocolo §0.3, paso previo a elegir tarea): la pasada del auditor del mismo
día (2026-09-09, commit `c91f4c0`) trae **tres** hallazgos `ABIERTO` de severidad alta — **#8** (dato
de salud en `R-02`, sigue esperando al dueño en la pregunta #16 de §6, sin novedad, no es atendible
por el programador), **#12** y **#13** (los dos nuevos, cola offline de `R-07`,
`src/nucleo/colaAsistenciaOffline.ts`/`src/ui/pantallaPasarLista.ts`) — así que, antes de tocar la
cola normal de §1, esta sesión atendió **#12** y **#13** como **P-20** y **P-21** urgentes (§0.3), ver
detalle completo en §5. Resumen: **P-20** hace que el elemento encolado guarde el instante REAL del
toque (`ocurridoEn: deps.reloj.ahora()`), no el del vaciado posterior, en los tres puntos de encolado
(`manejarToque`, `manejarAusente`, `registrarExtra`) — sin este dato, un vaciado tardío fechaba el
registro a la hora de la reconexión, con `es_retroactivo = false` aunque fuera en la práctica un alta
a posteriori. **P-21** parte la base de datos de IndexedDB por profesor
(`crearAlmacenColaAsistenciaIndexedDB(fabrica, profesorId)`, `perfil.id` en `aplicacion.ts`) — en un
dispositivo compartido, sin esta partición la cola de quien cerró sesión sin conexión quedaba visible
y se reenviaba con el token de quien iniciara sesión después —, y hace que `vaciarColaOffline` trate
`ErrorLimiteAlcanzado`/`NoAutenticado` igual que `ErrorDeRed` (detiene el barrido dejando el elemento
y los siguientes en cola, en vez de descartarlos como error definitivo): antes, un límite de tasa o un
token caducado a mitad de un vaciado grande borraba en cascada el resto de la cola sin reintento. Los
dos hallazgos originaron **6 tests nuevos** en `pantallaPasarLista.test.ts` (1424 en total, antes
1418); ninguna migración de por medio (cambios enteramente de cliente). `db/APLICADAS.md` sin
cambio. `FEEDBACK.md` sigue con su única fila plantilla vacía: nada que convertir.

Con las dos urgentes resueltas, revisado §1: de la oleada v1, solo queda **R-11** de la oleada v2 sin
ningún código escrito (`PENDIENTE`); el resto de v1 y v2 está `COMPLETADA` o `BLOQUEADA` solo por una
migración sin aplicar. **R-11** ("Panel de centro para el administrador", oleada v2/F-06) es la
siguiente tarea de la columna vertebral — spec en `ROADMAP_PRODUCTO.md` —, pero por el volumen de
trabajo urgente de esta sesión (dos hallazgos de severidad alta con su batería de tests) queda para la
siguiente sesión de programador, sin ningún bloqueo nuevo que se lo impida.

**Sesión anterior (2026-09-08, rutina programada de producto, "decimoquinto ciclo del PM — dos
R-XX nuevas, R-15 y R-16, abriendo la Oleada v3"):** revisado primero el registro de hallazgos de
`auditoriacontinua.md` (protocolo, paso previo a cualquier cambio de roadmap): sin ninguna pasada
nueva desde `97bd24f` (2026-09-08 por la mañana). De los tres `ABIERTO` de su tabla, **#8** (RGPD/dato
de salud en R-02) sigue esperando al dueño en la pregunta #16 de §6, sin novedad; **#10** y **#11**
(calidad de la batería de pruebas y gobernanza documental) ya están `RESUELTOS` de facto por **P-18**
y **P-19** (ejecutadas 2026-09-08), pendientes solo de que el auditor los confirme en su próxima
pasada — ninguno de los tres pide una R-XX ni una entrada de backlog nueva este ciclo. `FEEDBACK.md`
sigue con su única fila plantilla vacía: nada que convertir.

Revisado §1 completo contra la visión de producto: de la oleada v1, solo queda **R-11** de la oleada
v2 sin ningún código escrito (`PENDIENTE`); el resto de v1 y v2 está `COMPLETADA` o `BLOQUEADA` solo
por una migración sin aplicar (detalle sesión a sesión más abajo). Con v2 a una sola tarea de estar
completa en código, este ciclo mira más allá y abre la **Oleada v3** en `ROADMAP_PRODUCTO.md`, con
dos R-XX nuevas: **R-15** ("Informe de horas por profesor", F-07) — R-03 ya captura la duración real
de cada clase pero nadie puede sumarla por profesor, y la mayoría de academias de este perfil pagan
por hora dada, así que ese dato sigue reconstruyéndose a mano para nómina pese a existir ya dentro
del producto — y **R-16** ("Exportación completa del centro", F-07) — R-10 ya prueba la portabilidad
RGPD de un alumno, pero no existe el mismo derecho a nivel de centro completo, el argumento real de
confianza frente al miedo a quedarse atrapado en la herramienta. Ninguna de las dos añade datos
personales, toca al rol `student`, necesita migración, ni depende de una decisión reservada al dueño.
Filas nuevas en §1 (ambas `PENDIENTE`, detrás de R-11 en el orden de "siguiente tarea"). Sin ningún
otro cambio al roadmap este ciclo — inventar una tarea sin necesidad real sería el vicio que este
protocolo existe para evitar. Nada que mover a `ROADMAP_HISTORICO.md`: ninguna oleada está desplegada
en producción todavía (T-25 sigue bloqueada, fila 12 de §3). Sin ninguna pregunta nueva en §6 (ni
R-15 ni R-16 reabren ninguna existente ni crean una nueva).

**Sesión anterior (2026-09-08, rutina programada, "R-10 completada, decimotercera tarea de la
oleada v2"):** revisado primero el registro de hallazgos de `auditoriacontinua.md` (protocolo, paso
previo a elegir tarea): sin ninguna pasada nueva del auditor desde `97bd24f` (hallazgo #10 ya
`RESUELTO` por `P-18` en la sesión anterior), así que el estado del único hallazgo `ABIERTO` (`#8`,
RGPD/dato de salud en R-02, esperando al dueño en la pregunta #16 de §6) sigue siendo el mismo — nada
nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en orden: **R-01, R-02, R-03,
R-06, R-12, R-14** seguían `BLOQUEADA` solo por migración sin aplicar (sin cambio en ninguna fila de
§3), y la siguiente `PENDIENTE` que no depende de nada sin terminar era **R-10** ("Expediente completo
del alumno (acceso y portabilidad RGPD)", spec en `ROADMAP_PRODUCTO.md`, oleada v2/F-05, `Migración:
No`, depende de T-13 y T-23, ambas `COMPLETADA`).

Implementada completa, sin bloqueo: módulo nuevo `dominio/expedienteAlumno.ts` (lógica pura, sin red
ni DOM) que compone el expediente a partir de la ficha ya cargada (T-12/T-13, con centro y personas de
referencia embebidos) y el histórico ÍNTEGRO de asistencia (T-23, sin ningún filtro de mes ni de
estado — incluye anuladas y retroactivas, requisito 1 literal: "un derecho de acceso que oculta lo
anulado no es un acceso completo"), reutilizando sin duplicar las etiquetas de `historicoAsistencia.ts`
(T-23) y las duraciones de `asistencia.ts`, para que el expediente cuente EXACTAMENTE lo mismo que ya
cuenta el histórico en pantalla — nunca una tercera traducción de los mismos datos que pudiera
divergir. 19 tests nuevos del dominio (altas/bajas, con/sin personas de referencia, reordenación
cronológica del histórico sin mutar el array de entrada, anuladas/retroactivas/justificadas incluidas,
JSON indentado que reproduce los mismos datos al parsear). Bloque quinto nuevo en
`pantallaFichaAlumno.ts` ("Expediente completo (RGPD)"), con dos botones — "Descargar JSON" (JSON
legible, indentado) e "Imprimir / PDF" (ventana de impresión, mismo mecanismo `AbridorVentanaImpresion`
que ya usa el informe mensual de R-04) — sobre los MISMOS datos (`construirDatosExpedienteAlumno`,
única fuente), así que los dos formatos siempre coinciden. Reservado a `administrator`
(`puedeExportarExpedienteCompleto`, nueva en `permisosUi.ts`, mismo criterio que
`puedeVerPersonasReferencia`): un `teacher` ni siquiera llega a esta pantalla, bloqueada entera desde
T-12 (`puedeGestionarFichaAlumno`). 4 tests nuevos de interfaz: descarga de JSON con el contenido
verificado (nombre completo, personas de referencia, histórico con el profesor ya resuelto en lote,
quién genera), impresión con el nombre del alumno en el título de la ventana, aislamiento de un fallo
de red al traer el histórico en su propia zona de mensaje (el bloque de datos no se ve afectado,
requisito 5 de T-16), y el recuento de cinco cabeceras `<h3>` (antes cuatro). **1418 tests en total
(antes 1376).**

**Decisión de diseño de esta sesión, documentada en `DECISIONES_TECNICAS.md`:** el avatar del alumno
se informa en el expediente como `tieneAvatar: booleano`, nunca como la ruta interna ni una URL
(firmada o no) — coherente con §0.2 ("nunca sirvas un avatar por una URL que no caduque, guarda en la
base de datos la ruta base del fichero, nunca una URL"): un documento que se archiva y puede
compartirse con una familia no debe llevar ni siquiera la ruta interna del fichero de Storage. El
histórico se reordena de más antiguo a más reciente (al contrario que la consulta de revisión de T-23,
`listarHistoricoAsistenciaCompleto`, que es del más reciente al más antiguo) porque un expediente que
se archiva es una narrativa cronológica, no una bandeja de revisión — la reordenación vive en el
dominio (`ordenarCronologico`, sin mutar el array de quien llama), no en la pantalla.

Verificación pre-push completa en verde: `npm run typecheck`, `npm run lint`, `npm test` (1418/1418,
incluido el test de fuga de secretos que compila `dist/` de verdad) y `npm run build`.

**Sesión anterior (2026-09-08, "R-09 completada, duodécima tarea de la oleada v2"):** revisado primero
el registro de hallazgos de `auditoriacontinua.md` (protocolo, paso previo a elegir tarea): sin ninguna
pasada nueva del auditor desde `97bd24f`, así que el estado del único hallazgo `ABIERTO` (`#8`,
RGPD/dato de salud en R-02, esperando al dueño en la pregunta #16 de §6) seguía siendo el mismo — nada
nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en orden: **R-01, R-02, R-03,
R-06, R-12, R-14** seguían `BLOQUEADA` solo por migración sin aplicar (sin cambio en ninguna fila de
§3), y la siguiente `PENDIENTE` que no depende de nada sin terminar era **R-09** ("Aplicación
instalable y arranque sin red", spec en `ROADMAP_PRODUCTO.md`, oleada v2,
`Migración: No`, depende solo de T-19 `COMPLETADA`). Implementada completa, sin bloqueo: `manifest.json`
(nombre, `display: standalone`, `theme_color: #1D4ED8` — el mismo azul de acento que ya usa
`pantallaPasarLista.ts` — e iconos 192/512 `any` + 512 `maskable`); `iconos/*.png` generados sin
ninguna dependencia de imagen (`herramientas/iconos/generarPng.ts`, PNG mínimo a mano sobre
`node:zlib`, con test de CRC-32/estructura de chunks/píxeles exactos, y `herramientas/iconos/
generarIconos.ts`, `npm run generar-iconos`, ejecutado en esta sesión); `sw.js` (raíz, JavaScript
plano, único Service Worker del proyecto — requisito 3), estrategia "red primero, caché de
seguridad" sobre un cascarón mínimo precacheado más todo lo que una visita real resuelve por red
(nunca las peticiones a otro origen, o sea Supabase: los datos siguen exigiendo red o la cola de
R-07); `src/nucleo/registroServiceWorker.ts` (orquestación del aviso de versión nueva, requisito 4,
7 tests contra un `NavegadorServiceWorker` de mentira) + `src/ui/avisoNuevaVersion.ts` (el banner,
4 tests), conectados en `main.ts`; `index.html` con el `<link rel="manifest">`/`apple-touch-icon`/
`theme-color` y el contenedor del aviso; `_headers` con `Cache-Control: no-cache` para `/sw.js`
(para que un CDN no retrase la detección de versión nueva). **20 tests nuevos (1396 en total, antes
1376).** Verificado además con Playwright (Chromium headless, servido con `http-server` local, sin
tocar ningún fichero de test del proyecto): tras una visita online, las ~90 peticiones del grafo de
módulos de `dist/` quedan cacheadas solas, y una recarga con red cortada (`context.setOffline(true)`)
sirve la aplicación completa — mismo título, mismo contenido — sin ningún error de red, que es
literalmente el criterio de aceptación de R-09 ("tras una visita previa"). **Límite de verificación
documentado sin rodeos** (detalle en `DEVELOPERS.md`, sección de R-09): no fue posible, dentro de
esta sesión, reproducir en Chromium headless que editar `sw.js` y forzar `registration.update()`/una
recarga dispare el ciclo de instalación de una versión nueva — probable límite de temporización del
propio headless, no un defecto de código (el patrón `waiting`/`skipWaiting`/`controllerchange` es el
estándar documentado de la plataforma, y su orquestación sí está probada con dobles). Verificación
pre-push completa en verde: `npm run typecheck`, `npm run lint`, `npm test` (1396/1396) y
`npm run build`.

**Sesión anterior (2026-09-08, "R-08 arrancada, undécima tarea de la oleada v1/v2"):** revisado
primero el registro de hallazgos de `auditoriacontinua.md` (protocolo, paso previo a elegir tarea):
sin ninguna pasada nueva del auditor desde `97bd24f` (2026-09-08 por la mañana, la misma ya conocida
y atendida por sesiones anteriores con P-18/P-19), así que el estado del único hallazgo `ABIERTO`
(`#8`, RGPD/dato de salud en R-02, esperando al dueño en la pregunta #16 de §6) seguía siendo el
mismo — nada nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en orden: **R-06**
y **R-14** seguían `BLOQUEADA` solo por migración sin aplicar (filas 17 y 18 de §3, sin cambio), y la
siguiente `PENDIENTE` que no depende de nada sin terminar era **R-08**,
"Importación masiva de alumnos y horarios" (spec en `ROADMAP_PRODUCTO.md`, primera de la oleada v2),
que depende de T-12, T-15 y T-16 (las tres `COMPLETADA`) — no depende de ninguna R-XX bloqueada, así
que no hace falta esperarlas. Su spec declara `Migración: No`, pero el requisito 3 ("horario...
profesor por email de una cuenta que ya existe") resultó depender de una comprobación real de
esquema al escribir el código: `perfil` no guarda el email (vive en `auth.users`) y ninguna vista ni
columna lo concede a `authenticated` — mismo patrón que T-24 ya dejó anotado antes de esta tarea
("comprobar la dependencia real antes de dar la spec de 'Migración: No' por buena"). Sigue el
procedimiento de §0.1: migración nueva `db/016_resolver_profesor_por_email.sql` escrita y empujada,
fila 19 nueva de §3, R-08 pasa a `BLOQUEADA` — pero todo el código y los tests que consumen ese
esquema (la resolución de profesor por email) se escriben igual, contra dobles; el resto del alcance
de la tarea (alumnos, horarios sin ese único campo) no depende de la migración y queda completo.

**Decisión de diseño de esta sesión, documentada en `DECISIONES_TECNICAS.md`:** `016` añade una única
función, `resolver_profesor_por_email(p_email)` (`SECURITY DEFINER`, exclusiva de `administrator`,
mismo patrón que `registrar_intento_fallido()` de `002` para leer `auth.users.email` de forma
segura), sin tocar ninguna tabla ni columna — devuelve como mucho una fila (id + nombre) si esa cuenta
es HOY un `teacher` activo, ninguna en cualquier otro caso, sin distinguir el motivo. El resto de R-08
es enteramente de cliente, contra dobles: parseo de CSV propio sin librería
(`nucleo/csv.ts#analizarCsv`, comillas dobles estilo RFC 4180, separador `;`/`,` autodetectado por
recuento en la cabecera — un CSV de importación puede venir de cualquier hoja de cálculo, no solo de
la exportación propia del proyecto). Módulo nuevo `dominio/importacionAlumnos.ts`: valida cada fila
(nombre/apellidos, centro resuelto por nombre con la misma comparación acento-insensible de T-11
`buscarCentroDuplicado`, teléfono/email opcionales con los mismos validadores de T-12) y detecta
duplicados (requisito 4: "nombre completo + centro", nueva `alumnosSonDuplicados`, acento-insensible)
tanto contra alumnos YA existentes como entre dos filas del MISMO fichero — necesario porque `alumno`
no tiene ninguna restricción de unicidad natural en el esquema que lo impida por sí sola. Módulo nuevo
`dominio/importacionHorarios.ts`: valida día (dígito 1-7 o nombre en español, acento-insensible),
horas (`HH:MM`, fin posterior a inicio) y asignatura; resuelve el alumno por nombre y apellidos
EXACTOS (a propósito más estricto que la comparación de alumnos: confundir a un alumno con otro al
asignarle un horario es más grave que un alta duplicada evitable a mano) contra el mismo catálogo
completo, y el profesor contra un mapa YA resuelto por quien llama (`emailsProfesorUnicosDeCsvHorarios`
evita una petición de red por fila que comparta profesor). **Sin comprobación de duplicado de cliente
propia para horarios** (a diferencia de alumnos): `slot_horario` ya rechaza en el servidor un alta que
se solape en día y hora con un slot vigente del MISMO alumno (requisito 4 de T-15, invariante ya
existente) — reimportar el mismo fichero de horarios sin corregir nada simplemente falla fila a fila
al confirmar con ese mismo motivo, sin necesitar lógica nueva que pudiera divergir de la ya probada.
`datos/importacionMasiva.ts`: alta de alumnos en un ÚNICO `INSERT` con todas las filas nuevas (sin
restricción cruzada que lo impida, evita 50 peticiones para un alta de 50), alta de horarios con una
llamada a `crearSlot` (T-15) POR FILA sin abortar en la primera que falle (criterio de aceptación:
"un profesor sin cuenta... deja esa fila en error sin bloquear el resto", aplicado también a un fallo
de solape que solo puede detectarse al escribir). Pantalla nueva `pantallaImportacionMasiva.ts`, dos
bloques independientes (alumnos/horarios) con el mismo flujo en dos pasos que exige el requisito 2:
analizar y mostrar vista previa obligatoria, confirmar solo con un segundo toque explícito. `ui/dom.ts`
gana `LectorFichero`/`crearLectorFicheroNavegador` (mismo patrón inyectable que `Descargador`/
`AbridorVentanaImpresion`, sobre `File.prototype.text()`). Enrutada en `aplicacion.ts` como
`#/importacion`, exclusiva de `administrator` (`puedeImportarMasivamente`, nueva en `permisosUi.ts`).
Nueva sección de `db/pruebas_rls.sql` (administrator resuelve un teacher activo por email, un email
sin cuenta o de un administrator no devuelve fila sin error, teacher/student rechazados) — sin ningún
cambio en los barridos obligatorios de las secciones 6/8f/8: esta migración no crea ninguna tabla.
Nuevo fichero estático `herramientas/migraciones/resolverProfesorPorEmail.test.ts` (mismo patrón que
`avisoCancelacionSlot.test.ts`). **69 tests nuevos (1376 en total, antes 1307):** 16 de
`dominio/importacionAlumnos.test.ts`, 14 de `dominio/importacionHorarios.test.ts`, 6 de
`datos/importacionMasiva.test.ts`, 9 de `ui/pantallaImportacionMasiva.test.ts`, 6 estáticos de la
migración, 2 de `datos/profesores.test.ts` (`resolverProfesorPorEmail`), 1 de `permisosUi.test.ts`
(`puedeImportarMasivamente`), 14 de `nucleo/csv.test.ts` (`detectarSeparadorCsv`/`analizarCsv`) y 1 de
`nucleo/router.test.ts` (la ruta `importacion`, ida y vuelta). Verificación pre-push completa en
verde: `npm run typecheck`, `npm run lint`, `npm test` (1376/1376) y `npm run build`. **Nota de
entorno:** `node_modules/` no existía al empezar esta sesión (contenedor nuevo); `npm ci` (130
paquetes, 0 vulnerabilidades) fue el primer paso antes de poder ejecutar nada.

**Sesión anterior (2026-09-08, "R-14 arrancada, décima tarea de la oleada
v1"):** revisado primero el registro de hallazgos de `auditoriacontinua.md` (protocolo, paso previo a
elegir tarea): sin ninguna pasada nueva del auditor desde `97bd24f` (2026-09-08 por la mañana, la
misma ya conocida y atendida por la sesión anterior con P-18/P-19), así que el estado del único
hallazgo `ABIERTO` (`#8`, RGPD/dato de salud en R-02, esperando al dueño en la pregunta #16 de §6)
sigue siendo el mismo — nada nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en
orden: **R-06** seguía `BLOQUEADA` solo por la migración `013` sin aplicar (fila 17 de §3, sin
cambio), y la siguiente `PENDIENTE` que no depende de nada sin terminar era **R-14**, "Aviso de clase
cancelada a las familias" (spec en `ROADMAP_PRODUCTO.md`), que depende de **R-05** (`COMPLETADA`) y
**R-06** (código y tests completos, solo bloqueada por una migración sin aplicar — mismo precedente
que R-13/R-04 ya usaron con R-06/R-12, no bloquea escribir R-14 contra los mismos dobles). Su spec
declara `Migración: Sí` (columnas nuevas en `excepcion_slot` para dejar constancia de quién avisó y
cuándo), así que sigue el procedimiento de §0.1: migración nueva `db/015_aviso_cancelacion_slot.sql`
escrita y empujada, fila 18 nueva de §3, R-14 pasa a `BLOQUEADA` — pero todo el código y los tests que
consumen ese esquema se escriben igual, contra dobles.

**Decisión de diseño de esta sesión, documentada en `DECISIONES_TECNICAS.md`:** a diferencia de R-05
(sin columna propia, reutiliza `asistencia.nota` genérico sumándose, porque su spec declaraba
`Migración: No`), R-14 SÍ declara migración, así que `excepcion_slot` gana dos columnas DEDICADAS
(`aviso_familias_quien`/`aviso_familias_en`) en vez de forzar la anotación dentro de `motivo` — con
dos `CHECK` nuevos que expresan en el propio esquema las dos invariantes del requisito 3 (solo sobre
una cancelación; los dos campos siempre juntos, nunca uno sin el otro). Única vía de escritura:
`registrar_aviso_cancelacion_slot(...)` (`SECURITY DEFINER`, `administrator` únicamente, mismo patrón
exacto que `declarar_excepcion_slot()`/`desactivar_excepcion_slot()` de `013` — sin GRANT de UPDATE
directo a `authenticated` sobre `excepcion_slot`, la comprobación de rol vive en la RPC), que rechaza
un `quien` vacío, una excepción inexistente o desactivada, y una excepción de tipo `sustitucion`
(requisito 4: "no aplica a una sustitución"). Módulo nuevo `dominio/avisoCancelacion.ts`: reutiliza la
FORMA `MensajeAvisoAusencia` (asunto/cuerpo) de `dominio/avisoAusencia.ts` sin reexportarla como
propia — `mensajeAvisoCancelacion` compone un texto distinto ("se cancela la clase de...", no "no ha
asistido"), y `textoAvisoCancelacionRegistrado` es solo de PRESENTACIÓN (a diferencia de
`notaConAvisoAusencia` de R-05, aquí no hay nada que componer para guardar: el servidor fija los dos
campos directamente). La interfaz añade el bloque «Avisar a las familias» DENTRO del bloque ya
existente "Excepción de este día" de R-06 (`pantallaRegistrosSlot.ts`), solo cuando la excepción
activa es de tipo `cancelacion` (requisito 4) y solo si `puedeVerPersonasReferencia(rol)`
(`administrator` hoy, requisito 5: misma pregunta #17 de §6 pendiente que R-05) — reutiliza
`deps.obtenerPersonasReferencia`/`deps.copiarAlPortapapeles`, las MISMAS dos dependencias opcionales
de R-05, sin duplicar el componente (requisito 1: "mismo componente... sin duplicarlo"); quien monta
esta pantalla para `teacher` no necesita omitir nada nuevo, ya omite esas dos. "Registrar aviso
enviado" es una anotación única para la excepción COMPLETA, nunca una por alumno (requisito 3) —
llama a la nueva `deps.registrarAvisoCancelacionSlot?(excepcion.id, quien)` y recarga; en cuanto la
excepción ya tiene aviso registrado, el bloque muestra quién y cuándo en vez del formulario. Nueva
sección **8l** en `db/pruebas_rls.sql` (administrator anota el aviso sobre una cancelación propia,
teacher/student rechazados, quien vacío rechazado, una sustitución rechazada por no admitir aviso),
con sus propios slots de prueba (nunca los de la sección 8k, ya mutados por ella) — sin ningún cambio
en los barridos obligatorios de las secciones 6/8f: `excepcion_slot` ya estaba en las dos desde `013`,
y esta migración no crea ninguna tabla. Nuevo fichero estático
`herramientas/migraciones/avisoCancelacionSlot.test.ts` (mismo patrón que `excepcionSlot.test.ts`).
**21 tests nuevos (1307 en total, antes 1286):** 4 de `dominio/avisoCancelacion.test.ts`, 9 estáticos
de la migración, 2 de `datos/excepcionesSlot.test.ts` (`registrarAvisoCancelacionSlot`) y 6 de
`ui/pantallaRegistrosSlot.test.ts` (no se ofrece sobre una sustitución; no se ofrece sin la
dependencia; se ofrece sobre una cancelación; lista personas y compone el mensaje con el motivo;
registrar aviso llama a la RPC con el id de la excepción y recarga mostrando quién/cuándo; deshabilitado
hasta escribir quién avisó). Verificación pre-push completa en verde: `npm run typecheck`, `npm run
lint`, `npm test` (1307/1307) y `npm run build`. **Nota de entorno:** `node_modules/` no existía al
empezar esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el primer paso
antes de poder ejecutar nada.

**Sesión anterior (2026-09-08, "R-07 completada, novena tarea de la oleada
v1; P-18 urgente en el camino"):** revisado primero el registro de hallazgos de `auditoriacontinua.md`
(protocolo, paso previo a elegir tarea): a diferencia de las sesiones anteriores, esta vez SÍ hay una
pasada nueva del auditor desde la última sesión (commit `97bd24f`, 2026-09-08 por la mañana, tres
hallazgos nuevos: `#10` alta, `#11` baja) que ninguna sesión de programador había atendido todavía.
`#10` (alta: la sección 8 de `db/pruebas_rls.sql`, el barrido de `TRUNCATE` por `authenticated`, no se
amplió con `cierre_centro`/`excepcion_slot` — las dos tablas nuevas de R-12/R-06 — aunque los otros dos
barridos obligatorios del mismo fichero, secciones 6 y 8f, SÍ se ampliaron) se atendió de inmediato
como **P-18 urgente** (§0.3, antes de la cola normal): añadidas las dos tablas al array de la sección
8, sin tocar ningún `GRANT` real (el auditor ya verificó que las dos migraciones conceden los
privilegios correctos hoy — el hueco era solo de cobertura de la prueba, no del esquema). `#11` (baja,
mismo patrón que el hallazgo #9 ya `RESUELTO`: falta una fila en §7 para la desviación de R-05,
2026-09-07) se resolvió en el mismo gesto, como **P-19** — trivial y de bajo riesgo, mismo criterio que
usaron P-03/P-13/P-14/P-17 con hallazgos de la misma clase documental. Con eso hecho, se revisó §1 en
orden: **R-06** seguía `BLOQUEADA` solo por la migración `013` sin aplicar (fila 17 de §3, sin cambio),
y la siguiente `PENDIENTE` que no depende de nada sin terminar era **R-07**, "Pasar lista con conexión
intermitente" (spec en `ROADMAP_PRODUCTO.md`), que depende de T-18 y T-19 (ambas `COMPLETADA`) — no de
R-06/R-14, así que no hace falta esperarlas. Su spec declara `Migración: No`, así que no hay ninguna
pieza de esquema que escribir ni ninguna fila nueva de §3 — R-07 queda `COMPLETADA` de verdad, sin
ningún bloqueo propio, en cuanto termina esta sesión. `FEEDBACK.md` sigue con su única fila plantilla
vacía: sin ninguna entrada `nuevo` que convertir, y elegir tarea no pasa por ahí en una sesión de
programador (eso es del ciclo de PM).

**Decisión de diseño de esta sesión, documentada en `DECISIONES_TECNICAS.md`:** los cuatro requisitos
de R-07 (cola en IndexedDB con el mismo `peticionId`, reintento automático al recuperar conexión sin
duplicar, indicador de conectividad y de pendientes, supervivencia a un cierre de pestaña) se resolvieron
con DOS piezas nuevas en `nucleo/`, ambas OPCIONALES en `DependenciasPantallaPasarLista` — sin ellas,
`pantallaPasarLista.ts` funciona exactamente igual que antes de R-07, mismo criterio que
`listarExcepcionesDeHoy` de R-06, y es lo que mantiene verdes sin tocar ni una línea los 52 tests
existentes de esa pantalla. `nucleo/detectorConexion.ts#DetectorConexion` envuelve los eventos
`online`/`offline` nativos sobre una interfaz mínima (`FuenteConexionNavegador`, no `Window` completo,
mismo criterio que `AlmacenSesion`) — SÍ tiene test propio, sin necesitar `jsdom`. `nucleo/colaAsistenciaOffline.ts#AlmacenColaAsistenciaOffline`
persiste cada intento fallido por red con su `peticionId`; la implementación real
(`crearAlmacenColaAsistenciaIndexedDB`) usa IndexedDB puro (requisito 5: API del navegador, sin
librería) pero `jsdom` no la implementa, así que sigue el mismo criterio ya usado por
`FabricaProcesadoImagen` (T-14) y `copiarAlPortapapelesDelNavegador` (R-05): aislada detrás de la
interfaz, sin test propio — lo que se testea es la orquestación de `pantallaPasarLista.ts` contra
`crearAlmacenColaAsistenciaEnMemoria` (el doble). **La demostración del requisito 4** ("sobrevive a un
cierre de pestaña") no necesita simular un cierre real de nada: dos montajes sucesivos de
`mostrarPantallaPasarLista` sobre la MISMA instancia del almacén (en vez de sobre un `contenedor`
reciclado) bastan, porque lo que sobrevive en un navegador real es el propio IndexedDB, nunca ninguna
variable en memoria de la función de la pantalla — el test nuevo hace exactamente eso y confirma que
la segunda "apertura" reenvía el toque pendiente con el MISMO `peticionId`, sin duplicar. Un
`ErrorDeRed` al registrar/marcar ausente/añadir un extra encola el intento (nueva fase de card,
`'pendiente_offline'`: no clicable, ni error todavía) en vez de mostrarse como error; `vaciarColaOffline`
reintenta la cola completa al recibir el evento de reconexión (y, como red de seguridad, en cada tick
de 20 s) protegida contra solapamiento reutilizando `crearProtectorDobleToque` (mismo mecanismo que la
protección de doble toque de T-06, otra intención) — se detiene en el primer `ErrorDeRed` del barrido
(probablemente seguimos sin conexión de verdad pese al evento), reconcilia un `Conflicto` buscando la
fila por `peticion_id` (nunca por la clave alumno+slot+día, que un "alumno extra" no tiene — la misma
limitación que ya documentaba R-01 para el `Conflicto` en vivo de un extra, aquí sí resoluble porque
`listarAsistenciaDeHoy` trae `peticion_id` en cada fila), y saca de la cola cualquier otro error
mostrándolo como `'error'` normal, porque reintentarlo a ciegas no lo arreglaría. Compuesto en
`aplicacion.ts` solo si `documento.defaultView?.indexedDB` existe (nunca en `jsdom`, incluidos los
tests de `aplicacion.test.ts` — que sin este guard fallaban con un rechazo sin capturar al intentar
`indexedDB.open` sobre `undefined`, arreglado con el mismo guard y, además, con `try/catch` defensivo
en `restaurarColaOffline`/`vaciarColaOffline` por si IndexedDB existe pero falla en tiempo de ejecución,
p. ej. un modo privado especialmente restrictivo — mismo criterio de "mejor esfuerzo" que ya usa
`renovarSesion`). **21 tests nuevos (1286 en total, antes 1265 — el número ya incluye P-18, que no
sumó ningún test propio: es una batería SQL, no TypeScript; sin ninguna migración esta sesión,
`Migración: No`):** 5 de `nucleo/detectorConexion.test.ts`, 7 de
`nucleo/colaAsistenciaOffline.test.ts` (solo el doble en memoria, ver arriba) y 9 de
`ui/pantallaPasarLista.test.ts` (encolar y no mostrar error; reenvío automático con el mismo
`peticionId`; supervivencia a un cierre de pestaña simulado sobre el mismo almacén; el indicador de la
cabecera; sin las dos dependencias, comportamiento idéntico a antes de R-07; un segundo fallo de red no
pierde el elemento; un `Conflicto` al reenviar reconcilia; el mismo camino para "marcar ausente" y para
un "alumno extra"). Verificación pre-push completa en verde: `npm run typecheck`, `npm run lint`, `npm
test` (1286/1286) y `npm run build`. **Nota de entorno:** `node_modules/` no existía al empezar esta
sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el primer paso antes de poder
ejecutar nada.

**Sesión anterior (2026-09-07, "decimocuarto ciclo del PM — nueva R-14, autoseñalada por el requisito 7
de R-06"):** revisado primero el registro de hallazgos de `auditoriacontinua.md`: en ese momento
seguía sin ninguna pasada nueva desde `06fb8b0` (2026-09-07 por la mañana), así que el estado de los
dos `ABIERTO` (`#8`, pregunta #16 de §6, esperando al dueño; `#9`, `RESUELTO` de facto por P-17 —
ejecutada por la sesión de R-12, sin que el auditor lo hubiera vuelto a comprobar todavía) seguía
siendo el mismo, y ninguno aportaba nada nuevo que traducir como R-XX o backlog ese ciclo. `FEEDBACK.md`
seguía con su única fila plantilla vacía, sin ninguna entrada `nuevo` que convertir. Revisadas las trece
R-XX existentes contra el estado real de §1 (mucho código nuevo desde el decimotercer ciclo: R-06 y
R-12 arrancadas, R-05/R-13/R-04 `COMPLETADA`, detalle sesión a sesión más abajo) y contra la visión de
producto: **una R-XX nueva, R-14** ("Aviso de clase cancelada a las familias", Oleada v1 / F-03, spec
completa en `ROADMAP_PRODUCTO.md`, fila nueva en §1) — no la propone el auditor ni `FEEDBACK.md`, la
propone la propia spec de R-06 (requisito 7, escrita desde que R-06 se especificó): "avisar a las
familias de una clase cancelada... es una ampliación del mecanismo ya construido por R-05, no una pieza
nueva". Con R-05 y R-06 ya con su código completo (ambas solo pendientes de migración o ya
`COMPLETADA`), ese hueco autoseñalado deja de ser hipotético: hoy, si una clase se cancela, ninguna
familia se entera por la aplicación. Depende de R-05 y R-06 (ninguna bloquea escribirla contra dobles,
mismo precedente que el resto de la oleada); sin ningún otro cambio al roadmap ese ciclo — inventar una
tarea sin necesidad real sería el vicio que este protocolo existe para evitar. Nada que mover a
`ROADMAP_HISTORICO.md`: ninguna oleada está desplegada en producción todavía (T-25 sigue bloqueada,
fila 12 de §3). Sin ninguna decisión reservada al dueño que añadir a §6 (R-14 no reabre ninguna
pregunta existente: hereda la misma respuesta que tenga R-05 en cada momento sobre el alcance de
`teacher`, pregunta #17).

**Sesión anterior (2026-09-07, "R-04 completada, octava tarea de la
oleada v1"):** R-01, R-02, R-03, R-12 y R-06 seguían `BLOQUEADA` en §1 esperando exclusivamente al
dueño (filas 13, 14, 15, 16 y 17 de §3, sin cambio: aplicar `010`, `011`, `012`, `014` y `013`, la 14
condicionada además a la pregunta #16 de §6), así que esta sesión revisó primero el registro de
hallazgos de `auditoriacontinua.md` (protocolo, paso previo a elegir tarea): sigue sin ninguna pasada
nueva del auditor desde `06fb8b0` (2026-09-07 por la mañana, la misma ya conocida por la sesión
anterior), así que el estado de los dos `ABIERTO` (`#8`, pregunta #16 de §6, esperando al dueño; `#9`,
`RESUELTO` por P-17, sin que el auditor lo haya vuelto a comprobar todavía) sigue siendo el mismo —
nada nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en orden: la siguiente
`PENDIENTE` era **R-04** ("Informe mensual por alumno"), que depende de T-23 (`COMPLETADA`) y de
R-01, R-02, R-03, R-06 y R-12 — las cinco `BLOQUEADA` solo por una migración sin aplicar, con código y
tests completos cada una, mismo precedente que ya usaron R-03, R-05 y R-13 con sus propias
dependencias: no bloquea escribir R-04 contra los mismos dobles. Su spec declara `Migración: No`, así
que no hay ninguna pieza de esquema que escribir ni ninguna fila nueva de §3 — R-04 queda
`COMPLETADA` de verdad, sin ningún bloqueo propio, en cuanto termina esta sesión.

**Decisión de diseño de esta sesión, documentada en `DECISIONES_TECNICAS.md`:** R-04 tampoco inventa
ningún criterio nuevo de "sesión esperada" — reutiliza, sin tocarlas, `esDiaCerrado` (R-12) y
`esDiaCanceladoParaSlot` (R-06), la segunda ya documentada literalmente como "pensada para el informe
mensual de R-04" desde que R-06 la escribió. Módulo nuevo `dominio/informeMensualAlumno.ts`:
`sesionesEsperadasDelMes` recorre cada día del mes natural pedido y, para cada slot del alumno
vigente ESE día (snapshot histórico por `vigente_desde`/`vigente_hasta`, nunca el horario actual —
requisito 3, con test explícito de un horario cambiado a mitad de mes), cuenta la sesión salvo cierre
o cancelación; `resumenInformeMensual` cruza ese recuento con TODO lo registrado ese mes para el
alumno (`listarHistoricoAsistenciaCompleto`, T-23, reutilizada sin cambios): entradas válidas,
ausencias justificadas/sin justificar, anuladas (contadas aparte, nunca como asistencia), retroactivos
y minutos reales sumados solo de las entradas con salida marcada (R-03) — `null`, no `0`, si ninguna
la tiene. `filasInformeMensual`/`generarCsvInformeMensual` son la ÚNICA fuente de los pares
campo/valor, reutilizada tanto por el CSV como por la tabla que la pantalla pinta en la ventana de
impresión, para que los dos formatos coincidan siempre en las cifras (criterio de aceptación literal
de R-04). El campo "Centro" de la cabecera resultó más difícil de lo esperado: `centro_referencia_id`
no está concedido a `authenticated` en ninguna forma (ni a `administrator` sobre la tabla base, ya
documentado desde T-21) y solo `alumno_ficha` (exclusiva de `administrator`) lo expone — nueva
`datos/alumnos.ts#resolverCentroReferenciaIdDeAlumno`, opcional en `pantallaHistorico.ts` y sin cablear
para `teacher`, cuyo informe simplemente no lleva esa fila, nunca un error. Requisito 1 ("desde la
ficha de alumno o desde el histórico") se resolvió integrando el informe DENTRO de
`pantallaHistorico.ts` (ya accesible a los dos roles desde T-23, con su propio filtro de alumno
reutilizado tal cual, sin duplicar un segundo buscador) en vez de una pantalla nueva; la ficha de
alumno (solo `administrator`) gana un botón "Ver histórico e informe mensual" que navega a
`#/historico/<alumnoId>` — segmento opcional nuevo de la ruta `historico`, exclusivo del router de
`administrator` (mismo criterio que el segmento `fecha` de R-13: `teacher` no tiene ficha, así que su
router no gana ningún enlace equivalente) — con `alumnoIdInicial` en la pantalla (mismo criterio de
"se ignora en silencio si no cuadra con nada" que `slotInicialId` desde T-22). Requisito 2 ("PDF...
con impresión de HTML o `canvas` nativo, sin librería") se resolvió con una ventana de impresión
nueva (`ui/dom.ts#AbridorVentanaImpresion`/`crearAbridorVentanaImpresionNavegador`, mismo patrón de
inyección que `Descargador` de T-23) sobre la que la pantalla construye la tabla con `crearElemento`
—nunca una cadena HTML cruda, ni siquiera fuera del documento principal— y llama a `imprimir()`
(`focus()` + `print()`); el navegador ofrece "Guardar como PDF" en su propio diálogo, sin que el
proyecto tenga que generar el PDF él mismo. **Limitación aceptada, mismo precedente que R-13:** el
informe consulta de verdad `cierre_centro` (R-12, migración `014`) y `excepcion_slot` (R-06, `013`),
así que un informe real fallará con un error de servidor mientras esas dos sigan sin aplicar en
`dev` — no bloquea esta tarea, exactamente igual que R-13 ya aceptó para «Mi horario». **44 tests
nuevos (1265 en total, antes 1221):** 28 de `dominio/informeMensualAlumno.test.ts` (la mayoría de la
sesión: cálculo de sesiones esperadas con solape de versiones de horario, exclusión por cierre/
cancelación, sustitución que NO excluye, resumen agregado con sus siete campos, CSV y filas de
presentación), 2 de `datos/alumnos.test.ts` (`resolverCentroReferenciaIdDeAlumno`, con fila y sin
ella), 1 de `dominio/permisosUi.test.ts` (`puedeGenerarInformeMensual`), 4 de `ui/dom.test.ts`
(`crearAbridorVentanaImpresionNavegador`: argumentos de apertura, título, `imprimir()`, ventana
bloqueada), 2 de `nucleo/router.test.ts` (el segmento de `alumnoId`, ida y vuelta), 5 de
`ui/pantallaHistorico.test.ts` (sin alumno ni mes, CSV con las cifras correctas, imprimir, teacher sin
centro, un fallo de red no rompe la pantalla) y 2 de `ui/pantallaFichaAlumno.test.ts` (el botón
navega, no se ofrece en modo alta). Verificación pre-push completa en verde: `npm run typecheck`,
`npm run lint`, `npm test` (1265/1265) y `npm run build`. **Nota de entorno:** `node_modules/` no
existía al empezar esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el
primer paso antes de poder ejecutar nada. Sin migración esta sesión (`Migración: No`): sin fila nueva
de §3, sin cambio en `db/APLICADAS.md`.

**Sesión anterior (2026-09-07, "R-13 completada, séptima tarea de la
oleada v1"):** R-01, R-02, R-03, R-12 y R-06 seguían `BLOQUEADA` en §1 esperando exclusivamente al
dueño (filas 13, 14, 15, 16 y 17 de §3, sin cambio: aplicar `010`, `011`, `012`, `014` y `013`, la 14
condicionada además a la pregunta #16 de §6), así que esta sesión revisó primero el registro de
hallazgos de `auditoriacontinua.md` (protocolo, paso previo a elegir tarea): sigue sin ninguna pasada
nueva del auditor desde `06fb8b0` (2026-09-07 por la mañana, la misma ya conocida por la sesión
anterior), así que el estado de los dos `ABIERTO` (`#8`, pregunta #16 de §6, esperando al dueño; `#9`,
`RESUELTO` por P-17, sin que el auditor lo haya vuelto a comprobar todavía) sigue siendo el mismo —
nada nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en orden: las dos siguientes
`PENDIENTE` eran **R-13** ("Aviso de sesiones sin pasar lista en «Mi horario»") y **R-04** ("Informe
mensual por alumno"), ambas dependientes de **R-06** y **R-12** — pero, a diferencia de la sesión
anterior (cuando R-06 seguía `PENDIENTE` sin ningún código escrito), la sesión anterior completó el
código y los tests de R-06, que ahora está `BLOQUEADA` **solo** por la migración `013` sin aplicar,
exactamente la misma situación que R-12 (`014`) — mismo precedente que R-03 ya usó con R-01/R-02 y que
R-05 volvió a usar más tarde: una dependencia con código completo, bloqueada solo por una migración
sin aplicar, no bloquea escribir la tarea siguiente contra los mismos dobles. Esta sesión tomó **R-13**
(la primera de las dos en el orden de §1), que además depende de T-19 y T-22 (ambas `COMPLETADA`). Su
spec declara `Migración: No`, así que no hay ninguna pieza de esquema que escribir ni ninguna fila
nueva de §3 — R-13 queda `COMPLETADA` de verdad, sin ningún bloqueo, en cuanto termina esta sesión.

**Decisión de diseño de esa sesión, documentada en `DECISIONES_TECNICAS.md`:** R-13 no inventa
ningún criterio nuevo de "sesión esperada" — reutiliza sin tocarlas `esDiaCerrado` (R-12) y
`esDiaCanceladoParaSlot` (R-06), las dos ya documentadas en su propio fichero como pensadas también
para este aviso. Módulo nuevo `dominio/avisosPasarLista.ts#sesionesSinPasarLista`: para cada uno de
los últimos `VENTANA_EDICION_TEACHER_DIAS` días (T-21, el valor que el propio requisito 1 cita
literalmente) más hoy, cada slot propio vigente ese día cuya hora de fin ya pasó y sin ningún
registro —de ningún estado, para no confundir "sin pasar lista" con "sin entrada válida"— se marca,
salvo que el día esté cerrado o cancelado para ese slot. Una sustitución (R-06) NO excluye a
propósito: si nadie —ni el titular ni el sustituto— registró ese día, el hueco real sigue sin cubrir
y el aviso debe seguir apareciendo; si el sustituto sí registró, el registro queda enganchado al
MISMO `slot_id` (decisión ya tomada por R-06), así que la comprobación de "algún registro ese día" ya
lo detecta sin necesitar ningún caso especial — ninguna integración nueva con
`slotsEfectivosDelDia`. En «Mi horario» (`pantallaMiHorario.ts`), un bloque nuevo "Sesiones sin pasar
lista" calculado a partir de TRES dependencias opcionales que van juntas o no aparecen
(`listarRegistrosRecientes`/`listarCierresActivos`/`listarExcepcionesRecientes`, pedidas una única
vez al cargar, sin refetch por tick — mismo criterio de caché que `excepcionesHoyCache` de R-06); sin
las tres a la vez, «Mi horario» funciona exactamente como antes de R-13. Requisito 2 ("un toque
enlaza a Registros de ese slot Y esa fecha") obligó a tocar el router de `teacher`: la ruta
`registros` gana un tercer segmento opcional `fecha` (`#/registros/<slotId>/<fecha>`, solo con
sentido junto a `slotId`) y `pantallaRegistrosSlot.ts` gana `deps.fechaInicial?` (mismo criterio de
"se ignora en silencio si no cuadra con nada" que ya usa `slotInicialId` desde T-22) — sin tocar la
gramática del router de `administrator`, que no tiene ningún enlace equivalente. **25 tests nuevos
(1221 en total, antes 1196):** `dominio/avisosPasarLista.test.ts` nuevo con 15 casos — la mayoría de
la sesión —, más 2 de `router.test.ts` (el segmento de fecha, ida y vuelta), 2 de
`pantallaRegistrosSlot.test.ts` (`fechaInicial`, con y sin `slotInicialId`), 5 de
`pantallaMiHorario.test.ts` (el bloque completo: sin las tres dependencias, marcado, con registro,
cancelado, cerrado) y 1 de `datos/excepcionesSlot.test.ts` para la nueva
`listarExcepcionesDeProfesorEnRango`. Verificación pre-push completa en verde: `npm run
typecheck`, `npm run lint`, `npm test` (1221/1221) y `npm run build`. **Nota de entorno:**
`node_modules/` no existía al empezar esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0
vulnerabilidades) fue el primer paso antes de poder ejecutar nada. Sin migración esta sesión
(`Migración: No`): sin fila nueva de §3, sin cambio en `db/APLICADAS.md`.

**Sesión anterior (2026-09-07, "R-06 arrancada, sexta tarea de la oleada
v1"):** R-01, R-02, R-03 y R-12 seguían `BLOQUEADA` en §1 esperando exclusivamente al dueño (filas 13,
14, 15 y 16 de §3, sin cambio: aplicar `010`, `011`, `012` y `014`, la 14 condicionada además a la
pregunta #16 de §6), así que esta sesión revisó primero el registro de hallazgos de
`auditoriacontinua.md` (protocolo, paso previo a elegir tarea): sigue sin ninguna pasada nueva del
auditor desde `06fb8b0` (2026-09-07 por la mañana, la misma ya conocida por la sesión anterior), así
que el estado de los dos `ABIERTO` (`#8`, pregunta #16 de §6, esperando al dueño; `#9`, `RESUELTO`
por P-17) sigue siendo el mismo — nada nuevo que atender como P-XX urgente. Con eso confirmado, se
revisó §1 en orden: R-13 y R-04 seguían dependiendo de R-06, que a su vez seguía `PENDIENTE` sin
ningún código escrito — así que esta sesión tomó **R-06**, "Excepción puntual de un slot: sustitución
o cancelación" (spec en `roadmap/ROADMAP_PRODUCTO.md`), que depende de T-15, T-17 y T-18 (las tres
`COMPLETADA`) — no depende de R-01/R-02/R-03/R-12, así que no hace falta esperarlas. Su requisito 1
exige DDL por definición (tabla nueva `excepcion_slot`), así que sigue el procedimiento de §0.1:
migración nueva `db/013_excepcion_slot.sql` escrita y empujada, fila 17 nueva de §3, R-06 pasa a
`BLOQUEADA` — pero todo el código y los tests que consumen ese esquema se escriben igual, contra
dobles.

**Decisión de diseño más importante de la sesión, documentada en `DECISIONES_TECNICAS.md`:**
`excepcion_slot`, a diferencia de `cierre_centro`/`centro_estudios`, NO concede INSERT/UPDATE directo
a `authenticated`: toda escritura pasa por `declarar_excepcion_slot()`/`desactivar_excepcion_slot()`
(`SECURITY DEFINER`), que comprueban de forma ATÓMICA, en la misma transacción, que el slot no tenga
ya ningún registro de asistencia esa fecha (requisito 5: "ninguna de las dos excepciones puede
declararse retroactivamente sobre un slot que ya tiene registros ese día") — esa invariante es de la
misma clase dura que la inmutabilidad de `asistencia` (§0.2, "no reescribir historia"), a diferencia
del solape blando de `cierre_centro`, que sí acepta un read-then-write en el cliente. `registrar_asistencia`
(`005`, ya aplicada e inmutable) se sustituye en la migración nueva con `create or replace function`
—MISMA firma exacta, sin ningún parámetro nuevo, mismo patrón que `006` sustituyó
`aplicar_limite_tasa()`— para que una cancelación bloquee a CUALQUIERA (incluido el propio titular) y
una sustitución permita al profesor sustituto registrar en el slot ajeno, con el titular excluido ese
día. `registrar_ausencia` (`010`, todavía sin aplicar) gana la MISMA comprobación, pero **editada
directamente** en `db/010_registro_ausencias.sql`, no sustituida en la migración nueva: única
excepción a "una migración se sustituye, nunca se edita" en toda esta sesión, razonada en detalle en
`DECISIONES_TECNICAS.md` — la regla de §0.1 protege una migración ya APLICADA, y `010` no lo está
todavía. `slot_horario` (`003`, inmutable) gana una política RLS ADICIONAL
(`slot_horario_teacher_leer_sustituciones`, sin tocar `slot_horario_teacher_leer_propios`) para que el
profesor sustituto pueda leer el slot ajeno que cubre, mismo patrón que
`avatares_teacher_leer_alumnos_activos` de `003_politicas_rls.sql`.

**Integración con T-17/T-19/T-22, sin tocar sus funciones puras ya probadas:**
`dominio/excepcionSlot.ts#slotsEfectivosDelDia` construye, para pasar lista (T-19), la lista efectiva
de slots de un profesor un día concreto — un slot propio con excepción activa se excluye por
completo, uno ajeno donde el profesor es el sustituto nombrado se añade con `profesor_id`
sobrescrito al suyo (razonado en detalle en `DECISIONES_TECNICAS.md`: es una proyección de lectura,
nunca se escribe de vuelta) — para que `alumnosPropuestos` (T-17) lo trate como propio ese día sin
ningún cambio en esa función. «Mi horario» (T-22, `pantallaMiHorario.ts`) usa en cambio
`excepcionDelDia`/`etiquetaExcepcion` para relabelar la fila de HOY («Cubierto por [sustituto]»/
«Cancelada — motivo», sin "Pasar lista" ni "En curso"), tanto en la lista por día como en el resumen
"Ahora" — limitación conocida y documentada: solo la fila de hoy se relabela, una excepción declarada
para un día futuro de la semana no se anticipa en la vista recurrente (§0.2 no lo exige, y ampliarlo
habría necesitado aritmética de calendario nueva sin necesidad real). «Registros»
(`pantallaRegistrosSlot.ts`) gana el bloque nuevo "Excepción de este día" —exclusivamente
`administrator` (`puedeGestionarExcepcionesSlot`, nueva en `permisosUi.ts`), anclado al slot y la
fecha ya elegidos en esa misma pantalla—: declara sustitución (selector de sustituto, reutiliza
`listarProfesoresParaSelector`, excluye al propio titular) o cancelación (motivo obligatorio),
desactiva la ya declarada, y deshabilita ambas acciones en el cliente (además del rechazo autoritativo
del servidor) si el día elegido ya tiene registros. Nueva sección **8k** en `db/pruebas_rls.sql`
(administrator declara sustitución/cancelación, teacher/student rechazados, fecha que no coincide con
el día de la semana rechazada, cancelación sin motivo rechazada, retroactiva sobre un slot con
registros rechazada, cancelación bloquea `registrar_asistencia`/`registrar_ausencia` a cualquiera, el
titular no registra el día que le sustituyen, el sustituto SÍ registra y SÍ lee el slot ajeno,
desactivar rechazada con registros y permitida sin ellos) — con sus propios slots de prueba (nunca
`slot_prueba` de la sección 4), fechas de excepción calculadas como "hoy en Europe/Madrid" (nunca un
desplazamiento futuro fijo: `registrar_asistencia`/`registrar_ausencia` rechazan un `ocurrido_en`
futuro) — más `excepcion_slot` añadida a los dos barridos obligatorios ya existentes (sección 6,
`student`; sección 8f, `anon`). Nuevo fichero estático `herramientas/migraciones/excepcionSlot.test.ts`
(mismo patrón que `calendarioCierres.test.ts`); `rpcRegistrarAusencia.test.ts` ampliado con las
comprobaciones de la edición de `010`; `pruebasRlsEstatico.test.ts` actualizado (el recuento
hardcodeado de `select * into v_fila from public.registrar_asistencia(` sube de 9 a 10, por el único
uso real nuevo del sustituto en la sección 8k). **65 tests nuevos (1196 en total, antes 1131):**
19 de dominio (`excepcionSlot.test.ts`, incluido `slotsEfectivosDelDia`), 6 de datos
(`excepcionesSlot.test.ts`, RPC y lecturas), 1 de permisos (`puedeGestionarExcepcionesSlot`), 4 de
pasar lista (`pantallaPasarLista.test.ts`, bloque "R-06"), 4 de «Mi horario»
(`pantallaMiHorario.test.ts`, bloque "R-06"), 8 de «Registros» (`pantallaRegistrosSlot.test.ts`,
bloque "R-06"), 20 estáticos de la migración (`excepcionSlot.test.ts` de `herramientas/migraciones/`)
y 3 nuevos en `rpcRegistrarAusencia.test.ts` (las comprobaciones de la edición de `010`). Verificación
pre-push completa en verde: `npm run typecheck`, `npm run lint`, `npm test` (1196/1196) y `npm run
build`. **Nota de entorno:** `node_modules/` no existía al empezar esta sesión (contenedor nuevo);
`npm ci` (130 paquetes, 0 vulnerabilidades) fue el primer paso antes de poder ejecutar nada.

**Sesión anterior (2026-09-07, "R-05 completada, quinta tarea de la oleada
v1"):** R-01, R-02, R-03 y R-12 seguían `BLOQUEADA` en §1 esperando exclusivamente al dueño (filas 13,
14, 15 y 16 de §3, sin cambio: aplicar `010`, `011`, `012` y `014`, la 14 condicionada además a la
pregunta #16 de §6), así que esta sesión revisó primero el registro de hallazgos de
`auditoriacontinua.md` (protocolo, paso previo a elegir tarea): sigue sin ninguna pasada nueva del
auditor desde `06fb8b0` (2026-09-07 por la mañana), así que el estado de los dos `ABIERTO` es el
mismo ya conocido — `#8` (RGPD/dato de salud en R-02) formalizado como pregunta **#16** de §6,
esperando al dueño; `#9` (higiene documental) ya `RESUELTO` por **P-17** en la sesión anterior, el
mismo día — nada nuevo que atender como P-XX urgente. Con eso confirmado, se revisó §1 en orden: las
dos siguientes `PENDIENTE`, **R-13** ("Aviso de sesiones sin pasar lista en «Mi horario»") y **R-04**
("Informe mensual por alumno"), dependen ambas de **R-06** ("Excepción puntual de un slot"), que
sigue `PENDIENTE` sin ningún código escrito todavía — a diferencia de R-01/R-02/R-03/R-12 (código
completo, solo bloqueadas por una migración sin aplicar), R-06 no tiene nada que reutilizar contra
dobles, así que R-13 y R-04 dependen de verdad de una tarea que no ha ni empezado, y se saltan (mismo
criterio que sesiones anteriores usaron con R-01/R-02 mientras sus migraciones seguían sin aplicar,
pero al revés: aquí el bloqueo es de código, no de migración). La siguiente `PENDIENTE` que no
depende de nada sin empezar era **R-05**, "Aviso de ausencia injustificada listo para enviar" (spec
en `roadmap/ROADMAP_PRODUCTO.md`), que depende de R-01, R-02 (código completo desde hace semanas,
solo migraciones `010`/`011` sin aplicar — no bloquea escribir contra dobles, mismo precedente que
R-03 usó con R-01/R-02) y T-13 (`COMPLETADA`). Su spec declara `Migración: No`, así que no hay ninguna
pieza de esquema que escribir ni ninguna fila nueva de §3.
**Hallazgo propio de esta sesión, registrado como pregunta #17 de §6 (no una P-XX ni un hallazgo de
auditoría, sino el mismo tipo de contradicción que el auditor ya encontró en R-02/#8):** el requisito
4 y el criterio de aceptación de R-05 piden literalmente que el `teacher` del alumno acceda a sus
personas de referencia por el botón «avisar» ("mismo alcance que T-13", que en realidad es
`administrator`-only desde su origen) — contradice §0.2 de `HOJA_DE_RUTA.md` (norma permanente: "el
`teacher`... no ve datos de contacto ni personas de referencia") y el propio comentario de
`dominio/permisosUi.ts#puedeVerPersonasReferencia` desde T-13 ("ni siquiera en modo lectura").
Concederlo de verdad exigiría además una política RLS nueva que la propia spec no puede traer
(`Migración: No`). Se implementa R-05 **solo para `administrator`** (funcional y completo), se abre la
pregunta #17 con tres opciones (ampliar §0.2 con una excepción estrecha, corregir la spec de R-05 para
que deje de pedir alcance de `teacher`, o alguna acotación intermedia) y R-05 se marca `COMPLETADA` en
§1 sin esperar respuesta — mismo criterio conservador que el resto de preguntas abiertas del proyecto:
el valor por defecto (sin acceso para `teacher`) es el más seguro y no bloquea nada. **Segunda
decisión de diseño:** el "relación/parentesco" que el requisito 1 de R-05 pedía mostrar junto a
nombre/teléfono no existe en `persona_referencia` — es exactamente el hueco ya abierto como pregunta
#9 de §6 desde T-13, sin resolver; se muestra solo nombre y teléfono, sin bloquear nada (mismo
criterio que esa pregunta ya establecía). **Tercera decisión, la más delicada:** R-05 declara
`Migración: No`, así que la anotación manual «aviso enviado» (requisito 3, "con quién y cuándo") no
tiene columna propia — reutiliza el campo `nota` genérico ya editable por `actualizar_asistencia`
(T-21), pero **sumándose** al valor previo, nunca sustituyéndolo (`dominio/avisoAusencia.ts#notaConAvisoAusencia`):
reemplazarlo sin más habría perdido en silencio cualquier nota anterior sin relación con el aviso, o
habría borrado el aviso en la siguiente edición de la nota por otro motivo. "Quién avisó" es siempre
texto libre tecleado por quien marca el aviso (nunca resuelto desde `actualizado_por`/`auth.uid()`,
mismo criterio de "no resolver nombres ajenos" que ya documentaba `pantallaRegistrosSlot.ts` desde
T-21) — permite además que quien registra el aviso no sea quien hizo la llamada (p. ej. la
secretaria). Dominio (`dominio/avisoAusencia.ts`, módulo nuevo: `mensajeAvisoAusencia`,
`textoAvisoRegistrado`, `notaConAvisoAusencia`; `dominio/asistencia.ts#puedeAvisarAusencia`, ausente Y
sin justificar; `dominio/personaReferencia.ts` reexporta `nombreCompletoAlumno` como
`nombreCompletoPersonaReferencia`, misma forma exacta de nombre/apellidos). Datos
(`datos/personasReferencia.ts#listarPersonasReferencia`, la PRIMERA función de lectura propia del
módulo — hasta ahora las personas de referencia solo viajaban embebidas en la ficha completa del
alumno —, minimizada a solo estas columnas, mismo criterio que P-02 de T-14). UI nueva
(`ui/portapapeles.ts#copiarAlPortapapelesDelNavegador`, envoltura de una línea sobre
`navigator.clipboard.writeText`, aislada del mismo modo que `FabricaProcesadoImagen` de T-14 porque
`jsdom` no implementa la Clipboard API — sin test propio, documentado igual). En
`pantallaRegistrosSlot.ts`, bloque nuevo "Avisar a la familia" junto a "Justificar" — ofrecido solo si
`puedeAvisarAusencia(registro)` Y `puedeVerPersonasReferencia(deps.rol)` (hoy, `administrator`) Y la
dependencia `obtenerPersonasReferencia` está inyectada (opcional en la interfaz, sin wiring para
`teacher` en `aplicacion.ts`, mismo patrón que `listarProfesoresParaSelector`): botón "Ver personas de
referencia" (carga perezosa, mismo patrón que "Ver historial"), lista nombre/teléfono con un enlace
`mailto:` por persona con email, un `<textarea readonly>` con el mensaje completo (visible y copiable
a mano incluso si el copiado automático falla o no está inyectado — así "funciona sin conexión",
requisito 2) y un botón "Copiar mensaje" (solo si `copiarAlPortapapeles` está inyectada). "Registrar
aviso enviado" pide primero quién avisó (deshabilitado hasta rellenarlo) y llama a `deps.actualizar`
con la nota combinada, nunca como confirmación de entrega verificada (etiquetado así en la propia
interfaz y en el propio texto de la nota). **23 tests nuevos (1131 en total, antes 1108):** 6 de
`dominio/avisoAusencia.test.ts` (mensaje con/sin clase, anotación con la etiqueta de "no verificado",
combinar nota con/sin valor previo, nota en blanco tratada como ausente), 2 de
`dominio/asistencia.test.ts` (`puedeAvisarAusencia`: solo ausente sin justificar, nunca sobre
válida/anulada), 1 de `dominio/personaReferencia.test.ts` (el reexport de nombre completo), 2 de
`datos/personasReferencia.test.ts` (`listarPersonasReferencia` filtra por alumno y ordena; un
`teacher`, 0 filas por RLS, nunca un error) y 12 de `ui/pantallaRegistrosSlot.test.ts` (no se ofrece a
`teacher`, no se ofrece sin la dependencia inyectada, no se ofrece justificada/válida/anulada, se
ofrece sobre una ausencia sin justificar, sin ninguna persona lo dice explícitamente, un error de
carga no rompe la pantalla, lista nombre/teléfono con `mailto:` solo si hay email, copiar confirma,
copiar fallido invita a copiar a mano, "registrar aviso" deshabilitado hasta escribir quién, y la nota
combinada conserva lo anterior). Verificación pre-push completa en verde: `npm run typecheck`, `npm
run lint`, `npm test` (1131/1131) y `npm run build`. **Nota de entorno:** `node_modules/` no existía
al empezar esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el primer
paso antes de poder ejecutar nada. Sin migración esta sesión (`Migración: No`): sin fila nueva de §3,
sin cambio en `db/APLICADAS.md`.

**Sesión anterior (2026-09-07, "R-12 arrancada, cuarta tarea de la oleada
v1; P-17 resuelta en el camino"):** R-01, R-02 y R-03 seguían `BLOQUEADA` en §1 esperando
exclusivamente al dueño (filas 13, 14 y 15 de §3, sin cambio: aplicar `010`, `011` y `012`, la 14
condicionada además a la pregunta #16 de §6), así que esta sesión revisó primero el registro de
hallazgos de `auditoriacontinua.md` (protocolo, paso previo a elegir tarea): el único `ABIERTO` de
severidad alta es `#8` (RGPD/dato de salud en R-02), pero ya está correctamente formalizado como
pregunta **#16** de §6 desde el duodécimo ciclo del PM y no es un hallazgo que un programador pueda
"atender" con código — exige una decisión del dueño, no una P-XX urgente; el otro `ABIERTO`, `#9`
(severidad baja, higiene documental), ya tenía su vía de resolución trazada como **P-17**,
`PENDIENTE` en el backlog de §5. Como P-17 es una corrección trivial y de bajo riesgo (añadir dos
filas ya redactadas en otro sitio a §7), se resolvió antes de la tarea vertebral: §7 gana las dos
filas que faltaban (la corrección de T-14 dentro de T-25, y el propio hallazgo #8), y P-17 pasa a
`RESUELTA` en §5. Con eso hecho, la siguiente tarea PENDIENTE de §1 era **R-12**, "Calendario de
cierres del centro (festivos y vacaciones)" (spec en `roadmap/ROADMAP_PRODUCTO.md`), que depende
solo de T-15 (`COMPLETADA`) — no de R-01/R-02/R-03, así que no hace falta esperarlas. Su requisito 1
exige DDL por definición (tabla nueva), así que sigue el procedimiento de §0.1: migración nueva
`db/014_calendario_cierres.sql` escrita y empujada, fila 16 nueva de §3, R-12 pasa a `BLOQUEADA` —
pero todo el código y los tests que consumen ese esquema se escriben igual, contra dobles.
**Decisión de diseño clave, documentada en `DECISIONES_TECNICAS.md`:** `cierre_centro` es la primera
tabla nueva desde `001_esquema_inicial.sql` que trae sus propias políticas RLS en el MISMO fichero,
en vez de dejarla "con RLS habilitada y cero políticas" a la espera de una migración de políticas
posterior (el patrón de `001`, que sí aplazaba a T-10) — hoy no existe ningún "próximo lote de
políticas" al que aplazar nada, y §0.2 exige explícitamente que toda tabla nueva nazca con políticas
explícitas. Tres piezas en la migración: (1) tabla `cierre_centro` (`fecha_inicio`/`fecha_fin` date,
ambos inclusive; `motivo` texto libre; `activo` boolean, baja lógica, nunca DELETE — mismo patrón
que `centro_estudios`); (2) privilegios explícitos (`revoke all` seguido de `grant` solo lo
necesario, nunca TRUNCATE/REFERENCES/TRIGGER a `anon`/`authenticated`) y cuatro políticas:
`administrator` lee/inserta/actualiza sin restricción, `teacher` **solo lee los cierres activos**
(mismo patrón que `centro_estudios_teacher_leer_activos`, T-11) — un cierre desactivado por error no
debe seguir apareciendo en la pantalla de solo lectura de un profesor —, sin ninguna política para
`student`; (3) sin ninguna restricción `EXCLUDE` de solape en el esquema (exigiría `btree_gist`,
misma decisión que el solape de horario de T-15): el solape (requisito 3) se comprueba en la
aplicación. **Segunda decisión clave:** la comprobación de solape (`src/datos/cierresCentro.ts`)
filtra siempre a los cierres **activos** — un cierre desactivado libera su periodo, para que uno
nuevo o el mismo reactivado puedan volver a cubrirlo, coherente con que "activo" signifique "cuenta
en cálculos nuevos"; `reactivarCierre` aplica la misma comprobación que crear/editar, no solo esas
dos, para que la invariante se sostenga también por esa vía. Dominio
(`dominio/cierresCentro.ts#buscarCierreSolapado`/`esDiaCerrado`, dos funciones nuevas — la segunda es
la única vía prevista para que R-04 excluya un día cerrado de "sesiones esperadas", mismo principio
que `slotsVigentesEn` de T-15), datos (`datos/cierresCentro.ts`, CRUD completo mirando el patrón de
`datos/centrosEstudios.ts`), permisos de presentación (`permisosUi.ts#puedeVerCierresCentro`/
`puedeGestionarCierresCentro`). UI: pantalla nueva `pantallaCierresCentro.ts` (listar con filtro de
estado, crear, editar, desactivar, reactivar — solo si `puedeGestionarCierresCentro`; un `teacher`
ve solo el listado de activos, sin ninguna acción), enrutada en los DOS routers (`administrator` vía
`Ruta`/`crearRouter`, `teacher` vía `RutaProfesor`/`crearRouterProfesor`, ambos con la ruta nueva
`#/cierres` y un enlace "Cierres" en su navegación) porque el requisito 7 da acceso de lectura a los
dos roles. Nueva sección **8j** en `db/pruebas_rls.sql` (alta y edición por `administrator`,
rechazadas para `teacher`, el `teacher` lee un cierre activo pero no uno inactivo) más
`cierre_centro` añadida a los dos barridos obligatorios ya existentes (sección 6, `student`; sección
8f, `anon`) — nunca una sección nueva y aislada para esos dos roles, que ya tienen su barrido
genérico. Nuevo fichero estático `herramientas/migraciones/calendarioCierres.test.ts` (mismo patrón
que `administracionUsuarios.test.ts`). **52 tests nuevos (1108 en total, antes 1056):** 12 estáticos
de la migración, 10 de dominio (`buscarCierreSolapado` con sus bordes de rango inclusive,
`esDiaCerrado` con cierre activo/inactivo), 14 de datos (CRUD completo, solape, teacher rechazado por
RLS), 12 de la pantalla (carga/error/vacío, alta/edición/solape, desactivar/reactivar, teacher de
solo lectura), 2 de `permisosUi.test.ts` y 2 de `router.test.ts` (la ruta nueva en los dos routers).
Verificación pre-push completa en verde: `npm run typecheck`, `npm run lint`, `npm test`
(1108/1108) y `npm run build`. **Nota de entorno:** `node_modules/` no existía al empezar esta
sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el primer paso antes de
poder ejecutar nada. **Nota de migración, documentada en la fila 16 de §3:** `014` no depende
conceptualmente de `010`/`011`/`012`, pero el runner aplica siempre en orden numérico dentro de la
misma invocación, así que en la práctica queda detrás de ellas mientras `011` siga bloqueada por la
pregunta #16.

**Sesión anterior (2026-09-06, "decimotercer ciclo del PM, rutina de producto"):** **sin R-XX
nueva: la pasada de ese día de `auditoriacontinua.md` confirmó que los hallazgos `#8` y `#9` seguían
`ABIERTO` pero ya correctamente formalizados por el ciclo anterior (pregunta #16 de §6 y P-17 de §5)
y no aportó ningún hallazgo nuevo; `FEEDBACK.md` seguía sin entradas `nuevo` reales.**
Ciclo de producto puro, sin tocar código: `git checkout develop && git pull` trajo la pasada del
auditor de ese día (commit `5a27918`, ya en `origin/develop` al empezar), y desde ahí se revisó el
estado completo. `git log 1fe80a4..5a27918` muestra un único commit nuevo desde la pasada anterior
del auditor: la propia pasada de ese día, puramente narrativa — cero cambios en `db/`, `src/` ni
`herramientas/`, confirmado también por la propia narrativa del auditor. `auditoriacontinua.md`
revisado entero: `#8` (RGPD/dato de salud en R-02, severidad alta) y `#9` (higiene documental,
faltan dos filas en §7, severidad baja) seguían `ABIERTO`, y el propio auditor confirmó que la
traducción del duodécimo ciclo del PM fue la correcta —pregunta **#16** de §6 recoge las tres
opciones sin recortarlas ni cambiar su sentido; **P-17** seguía `PENDIENTE` en el backlog de §5— y
que permanecer `ABIERTO` era lo que correspondía mientras el dueño no respondiera la pregunta #16 y
P-17 no se ejecutara: no había nada nuevo que convertir en ninguno de los dos esa vez. `FEEDBACK.md`
revisado: seguía sin entradas `nuevo` reales (fila plantilla vacía) — nada que convertir. Backlog de
§5 revisado completo: las diecisiete `P-XX` (`P-01` a `P-17`) seguían en su estado ya conocido, sin
cambio. R-01, R-02 y R-03 seguían `BLOQUEADA` en §1 esperando al dueño (filas 13, 14 y 15 de §3:
aplicar `010`, `011` y `012`, en ese orden — la 14 seguía condicionada a la pregunta #16) — el MVP
(T-00 a T-25) tampoco había cambiado de estado (fila 12 de §3, sin cambio), así que la oleada v1
seguía sin poder darse por arrancada de verdad, y nada se movió a `ROADMAP_HISTORICO.md` esa vez.
Revisadas las trece R-XX del backlog vivo contra el estado actual y contra la visión de producto
(oleadas v1 y v2 ya cubren, en orden, asistencia completa, informes y aviso a familias, continuidad
operativa, arranque rápido, confianza legal y visión de centro): sin más cambios y **sin ninguna
R-XX nueva ese ciclo** — doce ciclos consecutivos de PM ya habían traducido a tareas concretas todo
el hueco real entre el MVP y el objetivo de producto, y ni el auditor ni `FEEDBACK.md` aportaron ese
día ningún hallazgo de producto o arquitectura que justificara ampliar ese backlog; inventar una
tarea sin una necesidad real detrás sería exactamente el vicio que este protocolo existe para
evitar. Repetida la verificación pre-push completa sin ningún commit de programador entre medias
(esa sesión no tocó `src/`, `db/` ni `herramientas/`): `npm ci` (130 paquetes, 0 vulnerabilidades),
`npm run typecheck`, `npm run lint`, `npm test` (1056/1056, misma cifra que la pasada del auditor de
ese día) y `npm run build` en verde. `git status` limpio antes y después de los cambios de
documentación.

**Sesión anterior (2026-09-05, "duodécimo ciclo del PM — hallazgo #8 de auditoría convertido en
pregunta #16"):** Ciclo de producto puro, sin tocar código: `git checkout develop && git pull` trajo
la pasada del auditor de hoy (commit `1fe80a4`, ya en `origin/develop` al empezar), y desde ahí se
revisó el estado completo. `auditoriacontinua.md` revisado entero, con atención especial al registro
de hallazgos: por primera vez desde el 2026-08-29 hay dos `ABIERTO` (`#8` y `#9`), los siete
anteriores (`#1` a `#7`) siguen `RESUELTO`. **`#8` (severidad alta):** R-02 (migración `011`, escrita
y empujada, sin aplicar) añade `motivo_justificacion` con valores `enfermedad`/`cita_medica` —dato de
salud del artículo 9 del RGPD por definición— sin ninguna decisión expresa del dueño que lo
autorice, pese a que §0.2 de `HOJA_DE_RUTA.md` lo exige. No es un hallazgo de producto/arquitectura
(la R-XX ya existe y su mecanismo está bien construido, según la propia auditoría) ni deuda técnica
de código: es una decisión reservada al dueño, así que se convierte en la pregunta **#16** de §6
(tres opciones: aceptar con base jurídica del art. 9.2, reformular sin desglose médico, o retirar el
campo), con nota de auditoría añadida al bloqueo humano de R-02 en `ROADMAP_PRODUCTO.md` y la fila
14 de §3 actualizada para que **no se aplique `011`** hasta que el dueño responda — tampoco deben
darse por aprobables los cuatro textos legales de T-25 mientras tanto. **`#9` (severidad baja,
gobernanza documental):** faltan dos filas en §7 (la corrección de T-14 dentro de T-25, y el propio
hallazgo #8); se registra como **P-17**, `PENDIENTE`, en el backlog de §5, para que una sesión de
programador las añada — mismo criterio que P-03/P-13/P-14 con hallazgos de la misma clase, el PM no
la resuelve directamente. `FEEDBACK.md` revisado: sigue sin entradas `nuevo` reales (fila plantilla
vacía) — nada que convertir. Backlog de §5 revisado completo: las dieciséis `P-XX` anteriores
(`P-01` a `P-16`) siguen en su estado ya cerrado, sin cambio; `P-17` es la única fila nueva, todavía
`PENDIENTE`. R-01, R-02 y R-03 siguen `BLOQUEADA` en §1 esperando al dueño (filas 13, 14 y 15 de
§3: aplicar `010`, `011` y `012`, en ese orden — la 14 ahora con la condición adicional de la
pregunta #16) — el MVP (T-00 a T-25) tampoco ha cambiado de estado, así que la oleada v1 sigue sin
poder darse por arrancada de verdad, y nada se mueve a `ROADMAP_HISTORICO.md` esta vez. Revisadas
las trece R-XX restantes contra el estado actual: sin más cambios, y sin ninguna R-XX nueva —ni el
auditor ni `FEEDBACK.md` aportan ningún hallazgo de producto/arquitectura que la justifique este
ciclo. Repetida la verificación pre-push completa sin ningún commit de programador entre medias
(esta sesión no toca `src/`, `db/` ni `herramientas/`): `npm ci`, `npm run typecheck`, `npm run
lint`, `npm test` y `npm run build` en verde. `git status` limpio antes y después de los cambios de
documentación.

**Sesión anterior (2026-09-04, "R-03 arrancada, tercera tarea de la oleada v1"):** R-01 y R-02 siguen `BLOQUEADA` en §1 esperando exclusivamente al dueño (filas
13 y 14 de §3, sin cambio: aplicar las migraciones `010` y `011`), así que esta sesión tomó la
siguiente tarea PENDIENTE de §1: R-03, "Registro de salida y cómputo de horas reales" (spec en
`roadmap/ROADMAP_PRODUCTO.md`), que depende de T-18/T-21 (ambas `COMPLETADA`) — no depende de R-01 ni
R-02 conceptualmente, así que se escribe contra los mismos dobles sin esperar a que las dos anteriores
se apliquen de verdad. Su requisito 1 exige DDL por definición (una columna nueva con `CHECK` de
coherencia y dos acciones nuevas de una RPC), así que sigue el procedimiento de §0.1: migración nueva
`db/012_registro_salida.sql` escrita y empujada, fila 15 nueva de §3, R-03 pasa a `BLOQUEADA`.
**Decisión de diseño clave, documentada en `DECISIONES_TECNICAS.md`:** igual que R-02, "marcar/ajustar
salida" no es una RPC nueva — encaja como séptima y octava acción combinable de `actualizar_asistencia`
(T-21), porque opera sobre un registro YA EXISTENTE, a diferencia de R-01 (`registrar_ausencia`, una
intención de CREACIÓN distinta). Migración `012`: (1) columna `asistencia.ocurrido_en_salida`
(`timestamptz` nullable, `CHECK`: nula o estrictamente posterior a `ocurrido_en`), deliberadamente SIN
ningún `CHECK` que la ate a `estado = 'valida'` — mismo motivo exacto que R-02 con
`motivo_justificacion`: anular DESPUÉS un registro que ya tiene salida violaría el `CHECK` en el mismo
`UPDATE` que lo anula; (2) misma columna en `asistencia_historial` + trigger
`asistencia_copiar_a_historial()` sustituido una vez más (mismo patrón que `009`/`011`); (3)
`actualizar_asistencia` gana la séptima y octava acción: `p_marcar_salida` (cierra con la hora real
del SERVIDOR) y `p_ocurrido_en_salida` (ajusta una salida YA marcada a un valor explícito), mutuamente
excluyentes en la misma llamada. **Decisión de reloj, la pieza más delicada de esta sesión:** marcar
salida usa `clock_timestamp()`, NUNCA `now()` — `now()` es constante durante toda una transacción, y
tanto una llamada real como, sobre todo, `db/pruebas_rls.sql` (que corre el fichero ENTERO en un único
`begin...rollback`) harían que la salida coincidiera exactamente con la entrada, violando la propia
comprobación "la salida es posterior a la entrada" por un artefacto de Postgres, no un error de
lógica. Autorización sin ningún código nuevo: la ventana de edición del profesor y el privilegio
ilimitado de `administrator` ya gobiernan toda la función desde su primer `if`. Dominio
(`dominio/asistencia.ts#puedeMarcarSalida`/`ocurridoEnSalidaValido`/`duracionRealMinutos`/
`duracionTeoricaMinutos`, cuatro funciones nuevas), `dominio/historicoAsistencia.ts` añade tres
columnas al CSV ("Hora de salida", "Duración real (min)", "Duración teórica (min)"). Datos
(`datos/asistencia.ts#ActualizarAsistenciaEntrada` gana `marcarSalida`/`ocurridoEnSalida`, más
`marcarSalidaAsistencia`, un atajo de un solo parámetro sobre `actualizarAsistencia` para pantallas que
solo necesitan esa acción). UI: en pasar lista (`pantallaPasarLista.ts`), un TERCER control hermano
"Marcar salida" en la card ya registrada (requisito 1: "un segundo toque sobre la card ya
registrada"), ofrecido solo mientras `puedeMarcarSalida`, con su propio protector de doble toque y su
propia reconciliación tras un error (releer `cargarAsistenciaDeHoy`, mismo criterio que un `Conflicto`
de R-01: un "ya tiene salida" no distingue un segundo toque real de una respuesta perdida de un primer
toque que sí llegó a escribirse); en «Registros» (`pantallaRegistrosSlot.ts`), un bloque "Marcar
salida"/"Ajustar salida" —un único botón mientras no hay salida, un `<input type="time">` para
corregirla después, nunca las dos ofertas a la vez— y la columna de detalle gana la salida y la
duración real junto a la teórica. `pantallaHistorico.ts` gana las columnas "Salida" y "Duración".
Nueva sección **8i** en `db/pruebas_rls.sql` (marcar salida dentro de la ventana del profesor, ajustar
una salida ya marcada, marcar dos veces rechazado, ajustar a una hora anterior o igual a la entrada
rechazado, marcar y ajustar combinados rechazado, ajustar una salida no marcada rechazado, marcar
salida de una ausencia rechazado, fuera de la ventana rechazado para `teacher` y aceptado para
`administrator`) — con sus propios slots de prueba, nunca reutiliza `slot_prueba` de la sección 4.
Nuevo fichero estático `herramientas/migraciones/registroSalida.test.ts` (mismo patrón que el de
`010`/`011`); `pruebasRlsEstatico.test.ts` actualizado (los recuentos hardcodeados de `select * into
v_fila from public.registrar_asistencia/actualizar_asistencia(` suben en 2 y 3 respectivamente, por
los usos reales nuevos de la sección 8i). **55 tests nuevos (1056 en total, antes 1001):** 15
estáticos de la migración (`registroSalida.test.ts`), 11 de dominio (`puedeMarcarSalida`,
`ocurridoEnSalidaValido` con sus seis bordes, `duracionRealMinutos`, `duracionTeoricaMinutos`), 6 de
`datos/asistencia.test.ts` (marcar salida, ajustar salida, ninguno de los dos, `marcarSalidaAsistencia`
con su límite de cliente y su error de "ya tiene salida"), 4 de `historicoAsistencia.test.ts` (con
salida, sin salida, teórica desde el slot, manual sin teórica), 4 de `pantallaHistorico.test.ts`
(cabecera con las columnas nuevas, con salida, sin salida, manual vacío), 6 de
`pantallaRegistrosSlot.test.ts` (se ofrece/no se ofrece marcar, llama con `marcarSalida`, ajuste
ofrecido con el valor prellenado, llama con el instante elegido, muestra la duración) y 9 de
`pantallaPasarLista.test.ts` (tercer control ofrecido/no ofrecido en sus tres exclusiones, flujo
completo, en curso, doble toque, error reactivado, reconciliación sin error tras una respuesta
perdida). El resto de la diferencia son ajustes de tests ya existentes que no suman fila nueva al
recuento (mismo criterio de sesiones anteriores): todo literal `Asistencia`/`AsistenciaHistorial` de
los tests gana la columna nueva, y `historicoAsistencia.test.ts`/`pantallaHistorico.test.ts` actualizan
los índices y recuentos de columna del CSV/tabla (doce columnas fijas del CSV pasan a quince; la tabla
en pantalla gana "Salida" y "Duración"). Verificación pre-push completa en verde: `npm run typecheck`,
`npm run lint`, `npm test` (1056/1056) y `npm run build`. **Nota de entorno:** `node_modules/` no
existía al empezar esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el
primer paso antes de poder ejecutar nada.

**Sesión anterior (2026-09-04, "R-02 arrancada, segunda tarea de la oleada v1"):** R-01 sigue `BLOQUEADA` en §1 esperando exclusivamente al dueño (fila
13 de §3, sin cambio: aplicar la migración `010`), y T-25 sigue `BLOQUEADA` igual (fila 12, sin
cambio), así que esta sesión tomó la siguiente tarea PENDIENTE de §1: R-02, "Justificación de una
ausencia" (spec en `roadmap/ROADMAP_PRODUCTO.md`), que depende de R-01 solo conceptualmente (necesita
el estado `'ausente'` que introdujo su migración) — como el código de R-01 ya existe contra dobles,
R-02 se escribe igual contra esos mismos dobles, sin esperar a que `010` se aplique de verdad. Su
requisito 1 exige DDL por definición (dos columnas nuevas con `CHECK` de lista corta cerrada), así que
sigue el procedimiento de §0.1: migración nueva `db/011_justificacion_ausencia.sql` escrita y
empujada, fila 14 nueva de §3, R-02 pasa a `BLOQUEADA`. **Decisión de diseño clave, documentada en
`DECISIONES_TECNICAS.md`:** a diferencia de R-01 (`registrar_ausencia`, RPC nueva porque era una
intención de CREACIÓN distinta de `registrar_asistencia`), justificar es una acción sobre un registro
YA EXISTENTE — encaja en la propia arquitectura de `actualizar_asistencia` (T-21), diseñada desde el
principio como "varias acciones combinables". Como PL/pgSQL identifica una función por nombre + tipos
de parámetro, la migración no usa `create or replace function` (crearía una segunda sobrecarga): hace
`drop function` con la firma exacta de `008` seguido de `create function` con la firma completa (los
ocho parámetros de `008` más `p_justificar`/`p_motivo_justificacion`/`p_nota_justificacion`), sin
tocar el fichero `008`. Tres piezas en la migración: (1) columnas `asistencia.motivo_justificacion`
(`CHECK` de lista cerrada: `enfermedad`/`cita_medica`/`motivo_familiar`/`otro`) y
`asistencia.nota_justificacion` (texto libre), deliberadamente SIN ningún `CHECK` que las ate a
`estado = 'ausente'` — si lo tuvieran, anular DESPUÉS una ausencia ya justificada (que
`actualizar_asistencia` ya permite sin cambios) violaría el `CHECK` en el mismo `UPDATE` que la
anula; la regla "solo se justifica una ausencia" vive en la RPC, que la evalúa una vez, no como
invariante permanente de la fila; (2) mismas columnas en `asistencia_historial` (append-only) más el
trigger `asistencia_copiar_a_historial()` (`001`, inmutable) sustituido —mismo criterio que `009`
sustituyó `perfil_tocar_actualizado_en`— para que seguir copiando la fila completa incluya también
estas dos; (3) `actualizar_asistencia` gana la sexta acción combinable. **Autorización sin ningún
código nuevo:** la ventana de edición del profesor (7 días) y el privilegio ilimitado de
`administrator` ya gobiernan TODA la función desde su primer `if`, antes de mirar qué parámetro se
usa — por eso "justificar fuera de la ventana del profesor se rechaza para `teacher` y se acepta para
`administrator`" (criterio de aceptación de R-02) sale gratis de la estructura ya existente. Dominio
(`dominio/tipos.ts#MotivoJustificacionAusencia`, tipo nuevo; `dominio/asistencia.ts#motivoJustificacionValido`/
`puedeJustificarAusencia`/`MOTIVOS_JUSTIFICACION_AUSENCIA`), `dominio/historicoAsistencia.ts` añade
`etiquetaMotivoJustificacion` y dos columnas nuevas al CSV ("Justificación", "Nota de justificación").
Datos (`datos/asistencia.ts#ActualizarAsistenciaEntrada` gana `justificar`/`motivoJustificacion`/
`notaJustificacion`). UI: en «Registros» (`pantallaRegistrosSlot.ts`), un bloque "Justificar" —solo
ofrecido si `puedeJustificarAusencia`— con un `<select>` de la lista cerrada y una nota opcional, sin
confirmación explícita (a diferencia de anular: la spec no la exige, y es el mismo tipo de acción de
un único campo que "editar la nota"); el listado distingue "(ausente, justificada)" de "(ausente)" a
secas, y el detalle de la fila muestra el motivo y la nota. `pantallaHistorico.ts` gana la columna
"Justificación" (etiqueta del motivo, o "Sin justificar" para una ausencia sin justificar, vacío para
cualquier otro estado). Nueva sección **8h** en `db/pruebas_rls.sql` (justificar dentro de la ventana
del profesor, motivo fuera de la lista cerrada rechazado, justificar un registro que no está ausente
rechazado, fuera de la ventana rechazado para `teacher` y aceptado para `administrator`) — con su
propio slot de prueba, nunca reutiliza `slot_prueba` de la sección 4 (misma fragilidad que P-08 ya
corrigió). Nuevo fichero estático `herramientas/migraciones/justificacionAusencia.test.ts` (mismo
patrón que el de `008`/`010`); `pruebasRlsEstatico.test.ts` actualizado (los recuentos hardcodeados de
`select * into v_fila from public.registrar_asistencia/actualizar_asistencia(` suben en 1 y 2
respectivamente, por los usos reales nuevos de la sección 8h). **27 tests nuevos (1001 en total, antes
974):** 12 estáticos de la migración (`justificacionAusencia.test.ts`), 4 de dominio
(`motivoJustificacionValido` con sus tres bordes, `puedeJustificarAusencia`), 3 de
`historicoAsistencia.test.ts` (`etiquetaMotivoJustificacion`, fila justificada, fila sin justificar),
2 de `datos/asistencia.test.ts` (payload con justificar, payload sin justificar), 4 de
`pantallaRegistrosSlot.test.ts` (no se ofrece sobre un registro no ausente, botón deshabilitado hasta
elegir motivo, llama a actualizar con los tres parámetros, se muestra "justificada" en el listado) y 2
de `pantallaHistorico.test.ts` (columna con la etiqueta, columna "Sin justificar"). El resto de la
diferencia son ajustes de tests ya existentes que no suman fila nueva al recuento (mismo criterio de
sesiones anteriores): todo literal `Asistencia`/`AsistenciaHistorial` de los tests gana las dos
columnas nuevas, y `historicoAsistencia.test.ts` actualiza los índices y recuentos de columna del CSV
(diez columnas fijas pasan a doce). Verificación pre-push completa en verde: `npm run typecheck`,
`npm run lint`, `npm test` (1001/1001) y `npm run build`. **Nota de entorno:** `node_modules/` no
existía al empezar esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el
primer paso antes de poder ejecutar nada.

**Sesión anterior (2026-09-04, "R-01 arrancada, la primera tarea de la oleada v1"):** T-25 sigue
`BLOQUEADA` en §1 esperando exclusivamente al dueño (fila
12 de §3, sin cambio: crear el proyecto de producción, aplicar las diez migraciones, verificar
`probar-rls` contra `prod`, respaldo verificado y aprobación de los textos legales — nada de eso lo
puede hacer el agente), así que esta sesión tomó la siguiente tarea pendiente de §1: R-01, "Registro
explícito de ausencias", primera de la oleada v1 (spec en `roadmap/ROADMAP_PRODUCTO.md`). Su
requisito 2 exige DDL por definición (una RPC nueva y un `CHECK` de `estado` que solo el esquema
puede ampliar), así que sigue el procedimiento de §0.1: migración nueva
`db/010_registro_ausencias.sql` escrita y empujada, fila 13 nueva de §3, R-01 pasa a `BLOQUEADA` —
pero **todo el código y los tests que consumen ese esquema se escriben igual, contra dobles**, en vez
de esperar. Tres piezas en la migración: (1) `estado` admite `'ausente'` junto a `'valida'`/`'anulada'`;
(2) el índice de duplicado de `005` (`asistencia_uq_alumno_slot_dia_valida`, inmutable, no se edita)
se sustituye por `asistencia_uq_alumno_slot_dia_activa`, que cubre `'valida'` Y `'ausente'` a la vez
— un alumno solo puede tener UN registro activo (presente o ausente) por slot y día; (3) RPC nueva
`registrar_ausencia(...)`, `SECURITY DEFINER`, separada de `registrar_asistencia` (nunca un parámetro
`p_estado` añadido a esa función: son dos intenciones distintas, y esto deja intacto su contrato ya
probado), siempre `origen = 'slot'` (una ausencia es "no vino a lo que tocaba"; un alumno "extra" no
tocaba nada). Anular una ausencia no necesitó ningún cambio en `actualizar_asistencia`
(`008`): ya trata `p_anular`/`p_motivo_anulacion` de forma genérica sobre cualquier `estado` de
partida. Dominio (`dominio/tipos.ts#EstadoAsistencia` con el tercer valor;
`dominio/asistencia.ts#registrosDeHoyPorAlumnoSlot` indexa ahora también `'ausente'`), datos
(`datos/asistencia.ts#registrarAusencia`, nueva; `listarAsistenciaDeHoy` trae ahora `valida` E
`ausente`), UI: en pasar lista (`pantallaPasarLista.ts`) cada card gana un `<button>` HERMANO "Marcar
ausente" (nunca anidado dentro del principal — un `<button>` no admite contenido interactivo válido
dentro), con su propio `peticionId` de idempotencia y su propio protector de doble toque; en
«Registros» (`pantallaRegistrosSlot.ts`), junto a "Añadir registro olvidado", un "Marcar ausente" con
confirmación explícita (mismo patrón que anular, sin motivo porque R-01 no lo exige). Histórico y CSV
(`historicoAsistencia.ts`) distinguen ya `'ausente'` de `'valida'`/`'anulada'` en su columna Estado, y
el listado de «Registros» muestra "(ausente)" junto al nombre, sin el tachado de una anulación. Nueva
sección **8g** en `db/pruebas_rls.sql` (alta de ausencia por `teacher`, duplicado contra el nuevo
índice tanto si ya había presencia como si ya había ausencia, slot de otro profesor, `student` sin
acceso, anular exige motivo) — con su propio slot de prueba, nunca reutiliza `slot_prueba` de la
sección 4 (que a esta altura del fichero puede estar libre u ocupado según qué secciones anteriores
hayan corrido con éxito: la misma fragilidad de clave mutable que ya corrigió **P-08**). Nuevo fichero
estático `herramientas/migraciones/rpcRegistrarAusencia.test.ts` (mismo patrón que el de `005`/`008`).
**30 tests nuevos (974 en total, antes 944):** 11 estáticos de la migración
(`rpcRegistrarAusencia.test.ts`), 1 de dominio (`registrosDeHoyPorAlumnoSlot` indexa también
`'ausente'`), 5 de datos (`registrarAusencia`: cuerpo de la RPC, retroactivo, en nombre de otro,
conflicto, limitador compartido), 8 de pasar lista (control secundario distinguible, flujo completo,
idempotencia propia, doble toque, ya marcado al abrir, conflicto reconciliado al estado real, error) y
5 de «Registros» (distinción visual sin tachado, confirmación explícita, alta, cancelar, error). El
resto de la diferencia son ajustes de tests ya existentes que no suman fila nueva al recuento (mismo
criterio de sesiones anteriores): `listarAsistenciaDeHoy` ahora espera `in.(valida,ausente)` en vez de
`eq.valida`, y `etiquetaEstadoAsistencia`/`historicoAsistencia.test.ts` amplían un test ya existente
con el caso `'ausente'`. Verificación pre-push completa en verde: `npm run typecheck`, `npm run lint`,
`npm test` (974/974) y `npm run build`. **Nota de entorno:** `node_modules/` no existía al empezar
esta sesión (contenedor nuevo); `npm ci` (130 paquetes, 0 vulnerabilidades) fue el primer paso antes
de poder ejecutar nada.

**Sesión anterior (2026-09-04, "T-25 arrancada"):** **T-25 arrancada: todo lo que no exige
una decisión o una credencial del dueño está escrito; pasa a `BLOQUEADA` en §1, no `COMPLETADA`,
porque su propio criterio de aceptación es literal y cinco de sus puntos dependen de él.** T-24
seguía `COMPLETADA` desde la sesión anterior y sin ningún hallazgo `ABIERTO` de severidad alta en
`auditoriacontinua.md`, así que esta sesión tomó la siguiente tarea pendiente de §1: T-25,
"Endurecimiento, privacidad y paso a producción", la última del MVP. Nuevo documento
`roadmap/PRODUCCION_T25.md` con el detalle completo de los nueve requisitos de su spec: (1)
cabeceras de seguridad — fichero `_headers` (formato Netlify/Cloudflare Pages) con una CSP sin
`unsafe-inline` verificada contra el código real (`index.html` no carga ningún script ni estilo
inline, ningún `<form>` tiene `action` real), pero sin poder comprobarse "sobre el despliegue"
porque el proveedor de hosting sigue `<pendiente>` desde el inicio del proyecto — nueva pregunta
**#15** en §6; (2) revisión de superficie de ataque, una fila por tabla/RPC/bucket, releída línea a
línea contra las nueve migraciones aplicadas, no solo contra `MODELO.md`; (3) inventario RGPD y
**procedimiento de anonimización** del alumno (baja lógica + borrar sus personas de referencia +
borrar su avatar + sustituir sus datos identificativos por un marcador, sin tocar su historial de
asistencia) — no hizo falta código nuevo, las cuatro operaciones ya existen desde T-12/T-13/T-14,
solo faltaba escribir la secuencia correcta; (4) cuatro textos legales en borrador, nuevos
(`legal/AVISO_LEGAL.md`, `POLITICA_PRIVACIDAD.md`, `CONSENTIMIENTO_TRATAMIENTO.md`,
`CONSENTIMIENTO_IMAGEN_MENOR.md`), cada uno marcado como tal con su checklist de aprobación,
respetando el límite de §0.3 de no darlos por definitivos; (7) riesgo residual del panel/token,
escrito; (8) revisión de español sin hallazgos nuevos de idioma; (9) `DEVELOPERS.md` ampliado y
**`README.md` creado** (no existía). **Hallazgo real encontrado en el camino, corregido en el
mismo commit:** T-14 (`COMPLETADA` desde 2026-08-31) nunca llevó a la interfaz el aviso de
consentimiento de su propio requisito 8 —`HOJA_DE_RUTA.md` §0.2 lo exige como norma permanente
("hasta entonces la interfaz debe advertir de que el consentimiento es responsabilidad del
centro")—, comprobado leyendo `pantallaFichaAlumno.ts` sin encontrar ningún texto al respecto en
el bloque de avatar. Como el propio requisito 4 de T-25 dice literalmente que "sustituye el aviso
provisional de T-14", el hueco se cierra aquí: nuevo párrafo junto al control de subida, marcado
como provisional, con test dedicado (944 tests, antes 943). Los cinco puntos que sí exigen
DDL/infraestructura/decisión del dueño (crear el proyecto de `prod`, aplicar las diez migraciones,
verificar `probar-rls` contra `prod`, respaldo verificado, y la aprobación final de los textos
legales) quedan como **fila 12, nueva, de §3**, con el procedimiento exacto en
`PRODUCCION_T25.md` §5-§6 — el agente no los ejecuta bajo ninguna circunstancia (§0.1). Verificación
pre-push completa en verde: `npm run typecheck`, `npm run lint`, `npm test` (944/944) y
`npm run build`.

**Sesión anterior (2026-09-04, "T-24 completada de verdad, la migración ya estaba aplicada"):**
sesión interactiva a petición del dueño — **T-24 pasa a
`COMPLETADA`: la migración `009` ya estaba aplicada en `dev` y el bloqueo llevaba dos días siendo
falso.** El dueño preguntó si el proyecto se podía probar; al repasar el estado, la respuesta era que
no del todo porque T-24 seguía `BLOQUEADA` esperando que él ejecutase `npm run migrate`. Lo ejecutó y
contestó **"no había ninguna migración pendiente"**. No era que el runner no viera el fichero:
`009_administracion_usuarios.sql` encaja con el patrón `NNN_nombre.sql` de
`herramientas/migraciones/archivosMigracion.ts` y su número es > 0, así que `planificar()` solo la
deja fuera de `pendientes` si el ledger ya tiene la fila 9 — y si el hash difiriera, habría abortado
con `ErrorHashCambiado` en lugar de callar. Confirmado con `npm run migrate -- --estado`: el ledger de
`dev` lista `009 009_administracion_usuarios` con hash `0d996c48…4bd882`, **idéntico** al SHA-256 del
fichero en disco (comprobado en local). Fila 11 de §3 a `RESUELTA`, fila `009` movida a la tabla de
`db/APLICADAS.md` con su hash, T-24 a `COMPLETADA` en §1. **La segunda prueba, independiente, llevaba
dentro del repositorio desde el 2026-09-03:** la sección 8e de `db/pruebas_rls.sql` comprueba el
trigger `perfil_before_update` que introduce `009` exigiendo `%último administrator%` en `sqlerrm`, y
la ejecución de `npm run probar-rls` de ese día dio 105 comprobaciones, **0 omitidas, 0 fallidas** —
sin el trigger, esos dos `UPDATE` habrían pasado sin error y la batería habría cantado dos fallos.
**Causa del desfase (misma clase de fallo que el 2026-08-31 con `002`/`003`/`004`):** las tres
sesiones de verificación del 02, 03 y 04 comprobaron el estado del esquema leyendo
`db/APLICADAS.md` —un documento que solo actualiza el agente después de que el dueño confirme en §3—
en vez de leer el único dato de `dev` que tenían delante, los 105/0/0 de la batería. El agente no
puede consultar el ledger (§0.1: nunca tiene el access token), pero sí podía leer ese resultado, y
podía pedir al dueño una orden de solo lectura. Lección anotada en `db/APLICADAS.md` y en
`DECISIONES_TECNICAS.md`. **Ninguna fila de §3 queda pendiente: la siguiente sesión del programador
arranca con T-25, la última del MVP.** Esta sesión no toca código: solo registro. Verificación
completa ejecutada igualmente antes del push (el gancho de pre-commit la impone): `npm run typecheck`,
`npm run lint`, `npm test` y `npm run build`.

**Sesión anterior (2026-09-04, "verificación, rutina programada"):** sin tarea vertebral
desbloqueada: `git checkout develop && git pull` trajo la pasada del auditor de hoy (commit `2bc9463`,
ya en `origin/develop` al empezar) y, desde ahí, nada ha cambiado — T-24 sigue `BLOQUEADA — pendiente
aplicar migración 009` en §1 (fila 11 de §3 sigue `PENDIENTE`; `db/APLICADAS.md` confirma que
`009_administracion_usuarios.sql` sigue en "Pendiente de aplicar", el dueño todavía no ha ejecutado
`npm run migrate`), T-25 sigue sin poder arrancar (depende de T-24) y la oleada v1 (`R-01` a `R-12`)
sigue esperando el MVP en producción. `auditoriacontinua.md` revisado por completo: sus siete
hallazgos (`#1` a `#7`) siguen `RESUELTO`, cero `ABIERTO` — nada que atender como `P-XX` urgente.
`FEEDBACK.md` revisado: sigue sin entradas `nuevo` reales (fila plantilla vacía). Backlog de §5
revisado completo: las dieciséis `P-XX` (`P-01` a `P-16`) siguen `RESUELTA`, ninguna pendiente — no se
fabrica ninguna `P-XX`/`R-XX` nueva para justificar el ciclo. Repetida la verificación pre-push
completa sin ningún commit de programador entre medias: `npm ci` (130 paquetes, 0 vulnerabilidades),
`npm run typecheck`, `npm run lint` y `npm run build` en verde, y `npm test`: **943 tests, 943 pass, 0
fail** — la misma cifra que la pasada del auditor de hoy. Barrido de secretos sobre `dist/` recién
construido: cero coincidencias reales. `git status` limpio antes y después.

**Sesión anterior (2026-09-03, "décimo ciclo del PM, rutina de producto"):** sin tarea vertebral
desbloqueada ni `P-XX` nueva; `git checkout develop && git pull` trajo la tercera sesión de
verificación de hoy (commit `5d4d2b3`, ya en `origin/develop` al empezar). Revisado `auditoriacontinua.md`:
sus siete hallazgos siguen `RESUELTO`, cero `ABIERTO` — nada que convertir. Revisado `FEEDBACK.md`:
sigue sin entradas `nuevo` reales (fila plantilla vacía) — nada que convertir. **Único contenido real
del ciclo: R-06 se amplía** de "sustitución puntual de profesor" a "excepción puntual de un slot:
sustitución o cancelación" — releyendo F-03 con ojos de producto en vez de solo repasar estado, el
caso de "el profesor falta y NO hay quien lo cubra" quedaba sin ninguna forma honesta de registrarse
(no pasar lista se confunde con un retraso, R-01; marcar a cada alumno ausente penaliza en R-04 a
quien no tuvo culpa). Mismo número de R-XX, misma migración renombrada (`013_excepcion_slot`, nada
aplicado todavía, no genera fila en §7): detalle completo en `ROADMAP_PRODUCTO.md`. R-04 gana la
dependencia de R-06 (excluir de "sesiones esperadas" un slot cancelado, igual que ya hace con
`esDiaCerrado` de R-12). Revisadas las once R-XX restantes: sin más cambios. T-24 sigue `BLOQUEADA`
en §1 (pendiente aplicar `009`, fila 11 de §3, sin cambio) y la oleada v1 sigue esperando el MVP en
producción. No se toca código en este ciclo: sin verificación pre-push, sin build, sin tests — es
una sesión de producto, no de desarrollo.

**Sesión anterior (2026-09-03, "tercera sesión de verificación"):** sin tarea vertebral desbloqueada:
`git checkout develop && git pull` trajo la segunda sesión de verificación de hoy (commit `3332aad`,
ya en `origin/develop` al empezar), y desde ahí, nada había cambiado — mismo día, sin ninguna acción
del dueño todavía. Revisado `auditoriacontinua.md`: sus siete hallazgos (`#1` a `#7`) seguían
`RESUELTO`, cero `ABIERTO`, sin cambio. Revisado `db/APLICADAS.md`: `009_administracion_usuarios.sql`
seguía en la sección "Pendiente de aplicar", el dueño todavía no había ejecutado `npm run migrate`;
T-24 seguía `BLOQUEADA` en §1 y la fila 11 de §3 seguía `PENDIENTE`, sin cambio. T-25 seguía sin
poder arrancar (depende de T-24) y la oleada v1 (`R-01` a `R-12`) seguía esperando el MVP en
producción. Revisado el backlog completo de §5: las dieciséis `P-XX` (`P-01` a `P-16`) seguían
`RESUELTA`, ninguna pendiente. Repetida la verificación pre-push completa sin ningún commit de
programador entre medias: `npm ci` (130 paquetes, 0 vulnerabilidades), `npm run typecheck`, `npm run
lint` y `npm run build` en verde, y `npm test`: **943 tests, 943 pass, 0 fail** — la misma cifra que
las dos sesiones de verificación anteriores de ese día y que la sesión de `P-16`. Barrido de
secretos sobre `dist/` recién construido: cero coincidencias reales (solo nombres de campo y el
propio patrón de `registro.ts`). `git status` limpio antes y después. No se fabricó ninguna `P-XX`
ni `R-XX` nueva para justificar el ciclo: revisado el backlog de §5 y `auditoriacontinua.md`
completos sin encontrar ningún candidato legítimo.

**Sesión anterior (2026-09-03, "segunda sesión de verificación"):** sin tarea vertebral desbloqueada:
`git checkout develop && git pull` trajo la sesión de verificación anterior (commit `5adb6b0`, ya en
`origin/develop` al empezar), y desde ahí, nada había cambiado — mismo día, sin ninguna acción del
dueño todavía. `auditoriacontinua.md`: cero hallazgos `ABIERTO`, sin cambio. `db/APLICADAS.md`:
`009_administracion_usuarios.sql` seguía en la sección "Pendiente de aplicar"; T-24 seguía `BLOQUEADA`
en §1 y la fila 11 de §3 seguía `PENDIENTE`, sin cambio. Repetida la verificación pre-push completa
sin ningún commit de programador entre medias: `npm ci` (130 paquetes, 0 vulnerabilidades),
`typecheck`/`lint`/`build` en verde, y `npm test`: **943 tests, 943 pass, 0 fail** — la misma cifra
que la sesión de verificación anterior y que la sesión de `P-16`. Barrido de secretos sobre `dist/`
recién construido: cero coincidencias reales. `git status` limpio antes y después.

**Sesión anterior (2026-09-03, "arreglo urgente — `P-16`"):** el dueño ejecutó
`npm run probar-rls` y la batería **entera** murió antes de la primera comprobación:
`ERROR 42601: "v_filas" is not a known variable` en la línea 1650 de `db/pruebas_rls.sql`. Causa
raíz: en plpgsql un `declare` pertenece SOLO al `begin … end;` que lo sigue, y la sección 8e
(añadida por T-24, commit `8d76645`) declaraba `v_filas` en el primer sub-bloque —el del
`SELECT`— y la leía en el segundo, un `begin … end;` **hermano** que ya no la ve. Como es un
error de COMPILACIÓN del `do` y el fichero viaja en una sola sentencia a la Management API, no
tumbaba una comprobación: tumbaba las 105. **Arreglado** subiendo `v_filas` al `declare` del
propio `do` (un solo sitio para las dos ramas, `teacher` y `student`, mismo patrón que la
sección 4b) y **blindado** con un quinto test estático en
`herramientas/migraciones/pruebasRlsEstatico.test.ts`: sigue los ámbitos `declare`/`begin`/`end;`
del fichero y falla si alguna variable `v_…` se lee desde un bloque que no la declara ni está
dentro del que lo hace — comprobado que sobre el fichero roto señala las seis referencias de las
líneas 1650/1651/1680/1681. Verificación completa en verde (`typecheck`, `lint`, 943 tests
—antes 942—, `build`) y, esta vez sí, **ejecución real de `npm run probar-rls` contra `dev`:
105 comprobaciones, 0 omitidas, 0 fallidas**, que es la primera vez que la batería corre entera sin
una sola omisión. Detalle en §5 (`P-16`) y en `DECISIONES_TECNICAS.md`. Nótese que la sesión de
verificación de esta misma mañana, justo debajo, dio `typecheck`/`lint`/`build` y 942 tests en
verde **con este defecto ya dentro del repositorio**: ninguna de las cuatro puertas mira dentro de
la batería de RLS, y de ahí que `P-16` añada la comprobación estática y no solo mueva la línea.

**Sesión previa a esa (2026-09-03, "verificación"):** sin tarea vertebral desbloqueada:
T-24 sigue `BLOQUEADA — pendiente aplicar migración 009` (fila 11 de §3, sin cambio, sin acción del
dueño todavía), T-25 sigue sin poder arrancar y la oleada v1 sigue esperando a que el MVP T-00 a T-25
esté `COMPLETADA`/`DESPLEGADA EN PRODUCCIÓN`. `git checkout develop && git pull` trajo 9 commits
nuevos desde el punto de partida de esta sesión (la pasada del auditor del 2026-09-03, que cerró en su
documento los tres hallazgos de higiene que quedaban `ABIERTO` — #5, #6, #7 — dejando el registro de
`auditoriacontinua.md` **sin ningún hallazgo `ABIERTO`** por primera vez desde que existe el
documento, y el noveno ciclo del PM). Sin ningún hallazgo de severidad alta que atender como `P-XX`
urgente y sin ninguna `P-XX` pendiente en §5 (las quince, `P-01` a `P-15`, siguen `RESUELTA`), esta
sesión repitió la verificación pre-push completa sin ningún commit de programador entre medias: `npm
ci` (130 paquetes, 0 vulnerabilidades), `npm run typecheck`, `npm run lint` y `npm run build` en
verde, y `npm test`: **942 tests, 942 pass, 0 fail**, la misma cifra exacta que la pasada de auditoría
del 2026-09-03. Barrido de secretos sobre `dist/` recién construido: cero coincidencias reales.
`git status` limpio antes y después. No se fabrica ninguna R-XX ni P-XX nueva para justificar el
ciclo: revisado el backlog de §5 y `auditoriacontinua.md` completos sin encontrar ningún candidato
legítimo.

**Dos sesiones antes (2026-09-02, "noveno ciclo del PM"):** sin tarea vertebral desbloqueada ni `P-XX`/
`R-XX` nueva; único cambio real, una corrección de numeración prospectiva en `ROADMAP_PRODUCTO.md`
(los números de migración que reservaban las specs de R-01/R-02/R-03/R-06/R-12, `006` a `010`, ya los
había consumido de verdad el desarrollo de T-18/T-20/T-21/T-24; renumerados a `010`-`014`).

**Tres sesiones antes (2026-09-02, "verificación"):** sin tarea vertebral desbloqueada, sin `P-XX`
pendiente — comprobado el estado de partida (T-24 `BLOQUEADA` por `009`, backlog de §5 agotado) y
repetida la verificación pre-push completa sin ningún commit de programador entre medias: `npm ci`
limpio, `typecheck`/`lint`/`build` en verde y `npm test`: **942 tests, 942 pass, 0 fail**, la misma
cifra exacta que la sesión de `P-06`/`P-07(a)`. `git status` limpio antes y después.

**T-24 — Administración de usuarios y roles — código y tests COMPLETOS, BLOQUEADA por la migración
`009`.** Deja al rol `administrator` realmente operativo sobre los otros dos: listado con filtro por
rol/estado/búsqueda, edición de nombre, cambio de rol entre los tres valores y desactivación —nunca
borrado (§0.2)— sobre `perfil`, que ya existe desde el bootstrap y esta sesión NO recrea.

**Por qué "Migración: No" de la spec no bastaba:** los requisitos 1 y 2 (listado/edición, vínculo
`alumno.usuario_id`) no necesitaban nada nuevo — el `UPDATE` de `administrator` sobre cualquier fila
de `perfil` ya estaba concedido y aislado por RLS desde `000_bootstrap_perfil.sql`
(`perfil_admin_actualizar`), y `alumno.usuario_id` existe desde `001`. Pero el requisito 4 ("el
último `administrator` activo no puede desactivarse ni degradarse a sí mismo; la regla se implementa
en la base de datos") es DDL por definición: no hay forma de cumplirlo solo desde el cliente sin
dejar una ventana de carrera entre dos administradores, y la propia frase de la spec exige que viva
en la base de datos. Mismo criterio de "comprobar la dependencia real antes de dar la spec de
'Migración: No' por buena" que T-09 (columna de `alumno` sin `GRANT`), T-20 (RPC de búsqueda) y T-23
(en su caso, al revés: confirmó que SÍ podía prescindir de la migración) ya aplicaron.

**Migración `009_administracion_usuarios.sql`:** dos piezas, ninguna recrea `perfil` ni sus políticas
existentes. (1) Columna `perfil.actualizado_por`, mismo patrón que `asistencia.actualizado_por`
(`001`): la fija el trigger, nunca el cliente — es la pieza que de verdad satisface el requisito 5
("toda acción queda registrada con autor e instante") con un registro DURADERO en la base de datos,
en vez de solo un log de aplicación como hizo T-23 para sus consultas de lectura. (2) Trigger
`perfil_before_update`, que sustituye al genérico `perfil_tocar_actualizado_en` del bootstrap (mismo
criterio que `asistencia_proteger_inmutables` sustituyó a `tocar_actualizado_en` para `asistencia` en
`001`): sigue tocando `actualizado_en`/`actualizado_por`, y además aborta un `UPDATE` que dejaría al
sistema sin ningún `administrator` activo — se dispara cuando la fila ANTES del cambio era un
`administrator` activo, el cambio le quita esa condición, y no queda ninguna OTRA fila que sea
`administrator` activo. No necesita `SECURITY DEFINER`: quien ejecuta el `UPDATE` ya tiene que ser
`administrator` (única política de `UPDATE` sobre `perfil`), y un `administrator` ya puede leer todas
las filas de `perfil` (`perfil_admin_leer_todos`) — el `SELECT` del trigger no pide ningún privilegio
que el llamante no tuviera ya. **Decisión de clasificación de error, documentada en
`DECISIONES_TECNICAS.md`:** el `raise exception` de este trigger NO lleva `errcode = '42501'` (el que
sí llevan los rechazos de autorización de `actualizar_asistencia`, T-21) a propósito — no es un
problema de permisos, es una regla de negocio, y PostgREST clasifica el primero como `400`
(`ErrorDeValidacion`, con el mensaje del propio Postgres) y el segundo como `403` (`SinPermiso`,
siempre genérico en `erroresDominio.ts`); perder el mensaje real detrás de un "no tienes permiso" que
además sería engañoso (el `administrator` SÍ tiene permiso la mayoría de las veces) habría sido peor.

**Dominio (`src/dominio/administracionUsuarios.ts`, nuevo):** `normalizarNombreUsuario` reexporta
`normalizarNombrePersona` de `alumno.ts` (mismo criterio de reutilización que ya aplicó
`personaReferencia.ts`); `nombreUsuarioValido` (no vacío, sin más restricciones: aquí no hay un
`CHECK` de formato que replicar). `dejariaSinAdministratorActivo(usuarios, objetivo, cambio)` replica
en el cliente la MISMA condición del trigger, para poder deshabilitar el control de la interfaz antes
de que el servidor tenga que rechazarlo — mismo patrón exacto que `motivoAnulacionValido`/
`puedeCambiarSlotAtribuido` de T-21 frente a `actualizar_asistencia`; nunca una segunda fuente de
verdad, el trigger sigue siendo quien de verdad protege el invariante. `permisosUi.ts` añade
`puedeGestionarUsuarios` (exclusiva de `administrator`, mismo criterio que el resto de funciones ya
separadas pese a compartir condición con otras).

**Datos (`src/datos/usuarios.ts`, nuevo):** `listarUsuarios` (filtro por rol/estado/búsqueda,
`ilike` sobre nombre, mismo patrón que `listarCentros` de T-11) y `actualizarUsuario` (combina
nombre/rol/activo en una sola llamada parcial — un campo ausente en `cambios` no se toca, mismo
criterio que el resto de ediciones parciales del proyecto) directamente sobre `perfil`, sin RPC
propia: el `UPDATE` ya estaba concedido y aislado por RLS. El rechazo del trigger llega y se propaga
tal cual como `ErrorDeValidacion` por el mecanismo genérico de `erroresDominio.ts#errorDeRespuesta`,
sin ningún caso especial en este módulo.

**UI (`src/ui/pantallaUsuarios.ts`, nueva):** listado con filtro por rol/estado y búsqueda, edición
de nombre inline (mismo patrón "Editar" de `pantallaCentros.ts`), un `<select>` de rol por fila
(etiquetas en español vía `ETIQUETA_ROL`) y desactivación con confirmación explícita (mismo patrón
"confirmando.../Confirmar/Cancelar" que `pantallaFichaAlumno.ts`/`pantallaCentros.ts`). Exclusiva de
`administrator` (`puedeGestionarUsuarios`): un rol sin permiso no ve nada de la pantalla ni dispara
ninguna llamada a datos, a diferencia de `pantallaCentros.ts`/`pantallaHistorico.ts`, donde `teacher`
sí tenía una vista parcial — aquí no hay ninguna, ni siquiera de solo lectura. El `<select>` de rol y
el botón "Desactivar" del ÚNICO `administrator` activo se deshabilitan
(`dejariaSinAdministratorActivo` contra la lista ya cargada); el botón deshabilitado basta por sí
solo (un botón `disabled` no dispara su evento `click`, ni en `jsdom` ni en un navegador real, así
que la comprobación dentro de su manejador habría sido código muerto e intestable, y se quitó tras
encontrarlo en el primer test que lo intentaba). El `<select>` SÍ conserva su comprobación interna
además del `disabled` —"segunda barrera", con su propio test que fuerza el evento `change` saltándose
el atributo— porque una guarda razonable es que un `change` disparado por una vía que hoy no se
anticipa siga sin poder colarse. Sin alta de usuario ni ninguna acción que exija la clave de
administración de Supabase (requisito 3): procedimiento manual documentado en `DEVELOPERS.md`
(alta, envío de enlace de recuperación/invitación, revocar sesión), con el mismo razonamiento que ya
regía el desbloqueo de cuenta de emergencia de P-01.

**Wiring (`src/nucleo/router.ts`, `src/ui/aplicacion.ts`):** nueva ruta `#/usuarios`, solo en el
router de `administrator` (`Ruta`) — `teacher` no gana esta ruta en `RutaProfesor`, no tiene ningún
acceso a esta funcionalidad. Nuevo botón "Usuarios" en la barra de navegación de `administrator`.

**`Perfil` (`src/dominio/tipos.ts`) gana `actualizado_por: string | null`**, columna nueva de la
migración; `dominio/tipos.test.ts` (forma esperada de PostgREST) y los cinco ficheros con un literal
`Perfil` completo (`gestorSesion.test.ts`, `aplicacion.test.ts`, `pantallaSinAcceso.test.ts`) se
actualizan para incluirla.

**`db/pruebas_rls.sql` añade la sección 8e, nueva:** aislamiento de `teacher`/`student` sobre
perfiles ajenos —ni por `SELECT` ni por `UPDATE` directo, sin RPC de por medio, mismo patrón que la
8b/8d para otras tablas— y el trigger `perfil_before_update` en sí mismo, forzando dentro de la misma
transacción que el fixture `administrator` quede como el ÚNICO activo (desactivando cualquier otro
que ya exista en `dev`, sin depender de cuántos haya hoy) antes de comprobar que ni desactivarse ni
degradarse a sí mismo tienen éxito.

**46 tests nuevos (937 en total, antes 891, contados por `git diff` de cada fichero de test contra el
commit de partida):** 8 estáticos de la migración
(`herramientas/migraciones/administracionUsuarios.test.ts`, mismo patrón que
`rpcActualizarAsistencia.test.ts`), 10 de `dominio/administracionUsuarios.test.ts` (nuevo,
`dejariaSinAdministratorActivo` con todos sus bordes: sin cambio, ya inactivo, único activo,
desactivar/degradar, otro administrator activo, uno inactivo que no cuenta, no contarse a sí mismo),
10 de `datos/usuarios.test.ts` (nuevo), 16 de `pantallaUsuarios.test.ts` (nuevo: acceso, listado,
edición de nombre, cambio de rol, desactivar con confirmación, reactivar, las dos barreras del último
administrator, filtros, búsqueda, error sin perder la fila), 1 de `router.test.ts` (`#/usuarios`) y 1
de `aplicacion.test.ts` (navegación). `permisosUi.test.ts`/`tipos.test.ts` se ampliaron sin sumar
filas propias al recuento (mismo criterio que sesiones anteriores: extienden un test ya existente).

---

**T-23 — Consulta y exportación del histórico de asistencia — COMPLETADA, sin migración.** Cierre
del ciclo de auditoría del registro: `administrator` consulta todo el centro por alumno, profesor,
centro de estudios y rango de fechas; `teacher` solo lo suyo (por RLS, ya existente desde T-10).

**Dominio (`src/dominio/historicoAsistencia.ts`, nuevo):** `tieneModificaciones` (`actualizado_en
!== null`, sin consultar `asistencia_historial`); `filaCsvHistorico`/`cabecerasCsvHistorico`/
`generarCsvHistorico` componen las columnas del CSV (requisito 3) a partir ÚNICAMENTE del snapshot
ya guardado en la fila de `asistencia` — nunca leen un `SlotHorario` vigente, así que un cambio de
horario posterior no puede colarse en un informe ya emitido (requisito 2, con test dedicado que lo
demuestra). Datos de contacto (email/teléfono) solo aparecen si `incluirContacto` viene explícito
Y la fila los trae — ninguna de las dos condiciones por separado basta (requisito 3: "salvo que el
administrator lo pida explícitamente"). Nueva utilidad genérica `nucleo/csv.ts` (`filaCsv`/
`documentoCsv`): separador `;`, BOM UTF-8, `\r\n` — el separador correcto para una hoja de cálculo
española, donde la coma es el separador decimal (detalle y alternativas en `DECISIONES_TECNICAS.md`).
`dominio/slots.ts` añade `fechaHoraLocalLegible` (`DD/MM/AAAA HH:MM`) para las dos horas del CSV y de
la tabla en pantalla.

**`permisosUi.ts` añade tres funciones:** `puedeVerHistorico` (`administrator` o `teacher`, nunca
`student`), `puedeConsultarHistoricoDeCualquiera` y `puedeExportarConDatosDeContacto` (exclusivas de
`administrator`, misma condición que `puedeEditarAsistenciaDeCualquiera` pero como funciones propias
— mismo criterio ya establecido con `puedeGestionarFichaAlumno`/`puedeGestionarHorarios`).

**Datos (`src/datos/asistencia.ts`):** `listarHistoricoAsistencia` (paginada en servidor, requisito
5) filtra por alumno/profesor/rango de fechas directamente y por centro en DOS pasos (resuelve los
ids de alumno de ese centro contra la tabla `alumno`, después `.in('alumno_id', ids)` sobre
`asistencia`) — el cliente de PostgREST no soporta filtrar sobre un recurso embebido, detalle en
`DECISIONES_TECNICAS.md`. `listarHistoricoAsistenciaCompleto` recorre esa misma consulta en lotes de
500 para la exportación (requisito 3: el CSV trae TODO lo que cumple el filtro, no solo la página
visible). Traza mínima del requisito 4 ("las consultas de datos personales dejan traza mínima en el
log"): `logAuditoria.info('Consulta de histórico de asistencia', { alumno_id, profesor_id,
centro_id, pagina })` — solo ids, nunca un nombre; `Logger` inyectable (por defecto la instancia
real de T-02), mismo criterio que `Reloj`/`ProgramadorIntervalo`. `datos/alumnos.ts` añade
`resolverIdentificacionAlumnos` (lote por id, tabla base `alumno`) y `resolverContactoAlumnos` (lote
por id, `alumno_ficha`, solo tiene sentido detrás de `puedeExportarConDatosDeContacto`);
`datos/profesores.ts` añade `resolverNombresProfesores` (lote por id, sin filtrar por `rol`/`activo`:
un profesor que ya no da clase sigue siendo el que registró históricamente esa fila).

**UI (`src/ui/pantallaHistorico.ts`, nueva):** primera pantalla del proyecto con un `<table>` HTML
real (`<thead>`/`<th scope="col">`) en vez del patrón `div`/`span` de `pantallaListadoAlumnos.ts` —
es la primera pantalla genuinamente tabular (ocho columnas por fila). Filtro de alumno por búsqueda
simple (reutiliza `buscarAlumnosParaExtra` de T-20, mismo patrón sin combobox ARIA completo que ya
usa "cambiar el alumno" de `pantallaRegistrosSlot.ts`); selectores de profesor y de centro solo si
`puedeConsultarHistoricoDeCualquiera` — un `teacher` nunca los ve, su propio id se aplica siempre
como filtro sin que la interfaz se lo ofrezca cambiar (RLS ya lo garantiza; defensa en profundidad).
Paginador igual que `pantallaListadoAlumnos.ts`. Botón "Exportar CSV" con casilla "incluir datos de
contacto" (solo si `puedeExportarConDatosDeContacto`) que dispara la descarga vía `Descargador`
nuevo (`ui/dom.ts#crearDescargadorNavegador`, `Blob`/`URL.createObjectURL`/`<a download>`), inyectable
igual que `FabricaProcesadoImagen` de T-14 — se testea con un `Descargador` de mentira que solo
registra la llamada. Un id de alumno o de profesor que no resuelve (RLS lo oculta, p. ej. un alumno
de baja para un `teacher`) se muestra con una etiqueta de repuesto explícita, nunca en blanco.

**Wiring (`src/nucleo/router.ts`, `src/ui/aplicacion.ts`):** nueva ruta `#/historico` en los dos
routers (`Ruta` de `administrator`, `RutaProfesor` de `teacher`), con su botón "Histórico" en ambas
barras de navegación. `main.ts` no necesita ningún cambio: reutiliza el mismo `postgrest` que ya
recibían `DependenciasAppAdministrador`/`DependenciasAppProfesor`.

**`db/pruebas_rls.sql` añade la sección 8d, nueva:** `asistencia / teacher2 no lee los registros
ajenos`, consulta DIRECTA a la tabla (sin RPC de por medio) que comprueba la política
`asistencia_teacher_leer_propias` en sí misma — ni por id ni filtrando por `profesor_id` ajeno. Es
el caso explícito que pide el criterio de aceptación de T-23 ("un teacher no lee registros de otro"),
distinto de lo que ya probaba la sección 8c (T-21: que la RPC `actualizar_asistencia` rechaza por su
propia comprobación de propiedad, no la política `SELECT` de la tabla). Reutiliza el registro que la
sección 8c ya crea (`pg_temp.recordar_dato`/`pg_temp.dato`, cruzando fixtures entre bloques `do $$`
independientes) en vez de fabricar uno nuevo.

**73 tests nuevos (891 en total, antes 818, contados por `git diff` de cada fichero de test contra
el commit de partida):** 8 de `nucleo/csv.ts` (escapado, BOM, CRLF), 4 de `fechaHoraLocalLegible`
(`dominio/slots.test.ts`), 17 de `dominio/historicoAsistencia.ts` (incluida la no-retroactividad del
requisito 2 y el CSV con comas/comillas/tildes/fila anulada/fila retroactiva del criterio de
aceptación), 2 de `permisosUi.test.ts`, 10 de `datos/asistencia.test.ts` (`listarHistoricoAsistencia`/
`listarHistoricoAsistenciaCompleto`/traza de log), 5 de `resolverIdentificacionAlumnos`/
`resolverContactoAlumnos` (`datos/alumnos.test.ts`), 3 de `resolverNombresProfesores`
(`datos/profesores.test.ts`), 2 de la ruta `historico` en `router.test.ts`, 20 de
`pantallaHistorico.test.ts` (nuevo) y 2 de navegación en `aplicacion.test.ts`.

---

**T-22 — "Mi horario" y mis alumnos por slot (teacher) — COMPLETADA, sin migración.** Cierra la
lista de pantallas de `teacher`: `slot_horario` y sus políticas RLS (T-10, "lee solo los suyos") ya
existían, así que no hacía falta tocar el esquema, y el criterio de aceptación que pide "un `teacher`
no puede leer los slots de otro" ya estaba cubierto en `db/pruebas_rls.sql` sección 4 desde T-10 (no
se ha añadido ningún caso nuevo: ya demostraba exactamente eso).

**Dominio (`src/dominio/slots.ts`), `vistaSemanalProfesor`, nueva:** dado un profesor, un instante y
sus slots (mismo contrato que `alumnosPropuestos` de T-17), devuelve todos los vigentes marcados con
`esActual`/`esSiguiente` (requisito 4) — mutuamente excluyentes, y el "siguiente" se calcula en un
ciclo semanal de `7*24*60` minutos que da la vuelta a la semana que viene si todo lo vigente ya pasó
esta semana (a diferencia de `alumnosPropuestos`, que solo mira "lo que resta de hoy", correcto para
pasar lista pero no para una vista pensada para verse cualquier día). Detalle de la decisión y las
alternativas descartadas en `DECISIONES_TECNICAS.md`. 12 tests nuevos en `slots.test.ts`, incluidos
dos alumnos simultáneos con los dos `esActual`, un empate de "siguiente" entre dos slots con la misma
hora de inicio, y el caso de vuelta a la semana que viene.

**`src/dominio/permisosUi.ts` añade `puedeVerMiHorario`**, misma condición exacta que
`puedeUsarPasarLista` pero como función propia (mismo criterio que `puedeGestionarFichaAlumno`/
`puedeGestionarHorarios`, ya separadas pese a compartir condición) — 1 test nuevo.

**`src/nucleo/router.ts` gana el primer router real de `teacher`** (`crearRouterProfesor`/
`RutaProfesor`: `pasar-lista` | `horario` | `registros[/slotId]`), sustituyendo la navegación local
de dos valores que T-21 dejó como paso intermedio a propósito (su propia entrada de
`DECISIONES_TECNICAS.md` ya decía "T-22 decidirá si hace falta un router real"). Comparte con
`crearRouter` de `administrator` un motor interno común nuevo, `crearRouterGenerico<TRuta>` (privado
del módulo), en vez de duplicar la suscripción a `hashchange` o fundir los dos vocabularios de ruta
en un tipo único — detalle en `DECISIONES_TECNICAS.md`. La ruta por defecto sigue siendo
`pasar-lista`, no `horario`: cambiar la pantalla de aterrizaje sin que la spec lo pidiera habría sido
una regresión de comportamiento. 11 tests nuevos en `router.test.ts`.

**UI (`src/ui/pantallaMiHorario.ts`, nueva):** vista de solo lectura, los siete días de la semana
SIEMPRE visibles (con "Sin clases este día" en los vacíos, nunca ocultos — requisito 1, mismo
criterio de "nunca una lista vacía sin explicación" que T-17), ordenados dentro de cada día por
apellido del alumno (`compararAlumnosParaOrden`). Un resumen superior ("Ahora: …" / "Siguiente: …" /
"Sin horario asignado") y, por fila, la etiqueta "En curso"/"Siguiente" cuando aplica (requisito 4).
Refresco periódico cada 20 s vía `ProgramadorIntervalo` (mismo patrón exacto que T-19, incluida su
misma limitación conocida de no cancelar el intervalo al cambiar de vista) que recalcula
`vistaSemanalProfesor` sobre la caché de slots y el instante fresco del reloj, sin ninguna petición de
red. Botón "Pasar lista" (requisito 2) solo en el slot `esActual`, que navega sin parámetros (pasar
lista ya muestra lo que toque); botón "Ver registros" siempre, que navega a `#/registros/<slotId>`.
13 tests nuevos en `pantallaMiHorario.test.ts`.

**`src/ui/pantallaRegistrosSlot.ts` gana `deps.slotInicialId?` (opcional):** si coincide con un slot
ya cargado, la pantalla lo preselecciona y pide sus registros sin que el usuario elija nada; si no
coincide con ninguno (p. ej. el horario cambió entre que se generó el enlace y se abrió), se ignora en
silencio y arranca como siempre. Es lo que "mi horario" usa para el enlace profundo del requisito 2.
2 tests nuevos.

**Wiring (`src/ui/aplicacion.ts`, `src/ui/main.ts`):** `mostrarAppProfesor` reescrita sobre
`crearRouterProfesor` en vez del estado local de T-21; nuevo botón "Mi horario" en la barra de
navegación de `teacher`, junto a "Pasar lista" y "Registros". `DependenciasAppProfesor` gana
`objetivoRouter` (mismo campo que ya tenía `DependenciasAppAdministrador` desde T-16); `main.ts` lo
rellena con `window`, igual que la app de administrator. 3 tests nuevos en `aplicacion.test.ts`
(navegar a "mi horario", el enlace profundo a los registros de un slot concreto, y que "Pasar lista"
solo se ofrece cuando el slot está en curso).

**42 tests nuevos (818 en total, antes 776, verificado con `git stash -u` contra el commit de
partida):** 12 de `dominio/slots.ts` (`vistaSemanalProfesor`), 1 de `permisosUi.ts`
(`puedeVerMiHorario`), 11 de `nucleo/router.ts` (`crearRouterProfesor`/`RutaProfesor`), 13 de
`pantallaMiHorario.test.ts` (nuevo), 2 de `pantallaRegistrosSlot.ts` (`slotInicialId`) y 3 de
`aplicacion.test.ts`.

---

**T-21 — Revisar y modificar los registros por slot — código y tests COMPLETOS, BLOQUEADA por la
migración `008`.** Cierra el ciclo del día a día: una sola pantalla (`pantallaRegistrosSlot.ts`,
nueva) con selector de slot y fecha —de profesor también, solo para `administrator`
(`puedeEditarAsistenciaDeCualquiera`, ya existía en `permisosUi.ts` desde T-19)— que consulta los
registros de ese slot y día y permite corregirlos. La consulta (requisitos 1-3) **no necesitaba
migración**: `asistencia`/`asistencia_historial` ya tenían `SELECT` concedido a `authenticated` con
sus políticas de aislamiento desde `003_politicas_rls.sql` (T-10) — la migración `008` es solo para
la RPC de modificación.

**Migración `008_rpc_actualizar_asistencia.sql`:** RPC `actualizar_asistencia(p_asistencia_id,
p_alumno_id, p_slot_id, p_ocurrido_en, p_anular, p_motivo_anulacion, p_nota, p_nota_provista)`,
`SECURITY DEFINER`, única vía de modificación de un registro ya existente (el `UPDATE` directo sigue
revocado desde `001`). Autorización en servidor (requisito 5): `administrator` sobre cualquiera, sin
límite temporal; `teacher` solo sobre `profesor_id = auth.uid()` y dentro de `VENTANA_EDICION_TEACHER_DIAS`
(7 días desde `registrado_en`, no desde `ocurrido_en` — mismo criterio que `puedeEditarAsistencia`,
ya escrita en `dominio/asistencia.ts` desde T-03/T-18); `student`, nunca. Reutiliza
`aplicar_limite_tasa()` de `005` con la MISMA clave que `registrar_asistencia`
(`'asistencia:' || profesor_id`, cupo compartido, decisión ya documentada el 2026-08-31). Cinco
acciones combinables en una sola llamada: cambiar el alumno (valida activo), ajustar la hora (mismas
reglas de ventana que el alta), cambiar el slot atribuido (solo sobre un registro de origen `slot`,
recalcula el snapshot desde el slot nuevo), anular (motivo obligatorio, sin "desanular") y editar la
nota (único par tri-estado del proyecto: `p_nota_provista` explícito, para poder vaciar la nota sin
confundirlo con "no tocarla"). `registrado_en`/`profesor_id`/`peticion_id` no son parámetros: no hay
forma de pedir cambiarlos, y el trigger `asistencia_proteger_inmutables` (001) seguiría abortando
igual si alguien lo intentara desde otro sitio.

**`db/pruebas_rls.sql` amplía la sección 5 (UPDATE/DELETE directo denegados, incluso a
administrator) y añade la sección 8c, nueva:** reutiliza `alumno_prueba`/`slot_prueba` (secciones 2
y 4); crea sus propios registros con `registrar_asistencia` (nunca INSERT directo), con una única
excepción documentada donde ocurre: un registro "antiguo" (10 días) fabricado con un INSERT directo
del rol de conexión, sin impersonar a nadie, porque `registrado_en` es siempre `now()` en cualquier
vía real de la aplicación y no hay otra forma de probar el borde de la ventana de 7 días contra una
base de datos real. Comprobaciones: nota editada por el propio teacher; anular sin motivo rechazado;
anular con motivo y la fila sigue existiendo; dos modificaciones dejan dos filas en el historial con
los valores previos correctos; teacher2 no puede editar lo ajeno; administrator edita lo de
cualquiera; student sin acceso; cambiar alumno; cambiar el slot atribuido (y a un slot de otro
profesor, rechazado); cambiar el slot de un registro manual, rechazado; fuera de la ventana de
edición, rechazado; administrator sin límite de ventana.

**Dominio (`src/dominio/asistencia.ts`):** dos funciones nuevas, `motivoAnulacionValido` y
`puedeCambiarSlotAtribuido`, misma condición exacta que valida la RPC, para que la interfaz
deshabilite un botón antes de que el servidor tenga que rechazarlo. `puedeEditarAsistencia` ya
existía desde T-03/T-18 (provisional entonces, real ahora que T-21 la consume de verdad).

**Datos (`src/datos/asistencia.ts`):** `actualizarAsistencia` (llama a la RPC),
`listarRegistrosDeSlotYFecha` (consulta por slot y CUALQUIER fecha, cualquier estado — a diferencia
de `listarAsistenciaDeHoy` de T-19, que siempre es "hoy" y solo válidos) y
`listarHistorialDeAsistencia` (lectura de `asistencia_historial`, solo tiene sentido para
`administrator`, único rol con política de lectura sobre esa tabla).

**`src/dominio/slots.ts` añade `fechaLocalISO`** (fecha de calendario `AAAA-MM-DD` en la zona
horaria del centro, para el valor por defecto de `<input type="date">`). **`ETIQUETA_DIA_SEMANA` se
promueve de `pantallaFichaAlumno.ts` a `dominio/tipos.ts`** (mismo patrón que `ETIQUETA_ROL`) para
que `pantallaRegistrosSlot.ts` la reutilice sin duplicarla.

**UI (`src/ui/pantallaRegistrosSlot.ts`, nueva):** selector de profesor (solo `administrator`), slot
(solo los vigentes en la fecha elegida, `slotVigenteEn` de T-15) y fecha; lista de registros con un
botón "Editar" por fila que despliega las cinco acciones; "Cambiar el alumno" reutiliza
`buscar_alumnos_activos` de T-20 (`buscarAlumnosParaExtra`) con una búsqueda simple (sin el
combobox ARIA completo de T-20: aquí no hay requisito de accesibilidad equivalente, así que no se
duplica esa pieza); anular y cambiar el alumno exigen confirmación explícita con el dato viejo y el
nuevo a la vista (requisito 8), mismo patrón "confirmando.../Confirmar/Cancelar" que
`pantallaFichaAlumno.ts` ya usa para dar de baja o cesar un slot. "Añadir un registro olvidado" es
una acción de pantalla (no de fila): llama a `registrar_asistencia` (T-18) con `ocurrido_en`
declarado, para el alumno del slot elegido. El historial completo (requisito 7) solo se ofrece
desplegar si `puedeEditarAsistenciaDeCualquiera(rol)`.

**Simplificación deliberada, documentada en el propio fichero:** "quién registró" y "quién
modificó" se muestran por FECHA, no por nombre de usuario — todas las filas de la pantalla comparten
el mismo profesor (el dueño del slot elegido, inmutable), así que "quién registró" ya es el contexto
visible; resolver el nombre de quien MODIFICÓ por última vez (que sí podría ser otra persona)
exigiría una lectura de `perfil` que un `teacher` no puede hacer para un id que no es el suyo.

**Wiring (`src/nucleo/router.ts`, `src/ui/aplicacion.ts`):** nueva ruta `#/registros` en el router
de `administrator` (con su botón "Registros" en la barra de navegación). `teacher` no tiene router
propio todavía (T-22 decidirá si hace falta uno de verdad): `mostrarAppProfesor` gana una navegación
local mínima (`crearAlmacenEstado` sobre `'pasar-lista' | 'registros'`, dos botones) para alternar
entre pasar lista y esta pantalla nueva — es la primera vez que la aplicación de `teacher` necesita
alternar entre dos pantallas, así que esta sesión decide "nav local, no hash" en vez de adelantar el
router de T-22 sin que lo pida ninguna spec todavía (documentado en `DECISIONES_TECNICAS.md`).

**48 tests nuevos (776 en total, antes 728, verificado con `git stash -u` contra el commit de
partida):** 4 de `dominio/asistencia.ts` (`motivoAnulacionValido`, `puedeCambiarSlotAtribuido`, casos
límite incluidos), 4 de `fechaLocalISO` (`dominio/slots.test.ts`), 11 de `actualizarAsistencia` +
`listarRegistrosDeSlotYFecha` + `listarHistorialDeAsistencia` (`datos/asistencia.test.ts`), 15 de
`pantallaRegistrosSlot.test.ts` (nuevo: acceso, selector de profesor/slot/fecha, las cinco acciones
de edición, confirmación explícita de anular y de cambiar alumno, error sin perder el panel abierto,
historial solo `administrator`, añadir registro olvidado), 1 de `router.test.ts` (`#/registros`) y 2
de `aplicacion.test.ts` (navegación de `administrator` y de `teacher`) — 37 en total. Más 11
estáticos nuevos de la migración (`herramientas/migraciones/rpcActualizarAsistencia.test.ts`, mismo
patrón que `rpcRegistrarAsistencia.test.ts`), que completan los 48: sin fila propia en el recuento
de `git stash -u` porque no existían antes de esta sesión, igual que el resto. El ajuste de dos
contadores en `herramientas/migraciones/pruebasRlsEstatico.test.ts` (P-10/P-12: de 4 a 6 usos de
`select * into v_fila from public.registrar_asistencia(...)` por los dos nuevos registros de partida
de la sección 8c, más 6 nuevos de `actualizar_asistencia(...)`, todos correctamente expandidos) no
añade ningún test: solo actualiza el valor esperado de dos aserciones ya existentes.

**T-20 — Alumno extra: listado completo y selección manual — código y tests COMPLETOS, BLOQUEADA
por la migración `007`.** Spec: `Migración: No`, pero cumplir el requisito 3 ("el centro de estudios
cuando hay homónimos") exige que un `teacher` sepa a qué centro pertenece un alumno, columna
(`centro_referencia_id`) que su `GRANT` de columna sobre `alumno` no incluye — mismo precedente que
T-09 (necesitó migración pese a `Migración: No` en su spec, §7). Migración
`db/007_rpc_buscar_alumnos.sql`: RPC `buscar_alumnos_activos(p_texto, p_limite)`, `SECURITY
DEFINER`, tipo de retorno explícito (`id, nombre, primer_apellido, segundo_apellido, centro_nombre`)
que hace estructuralmente imposible devolver contacto, personas de referencia o avatar (requisito 3)
— preferida a ampliar el `GRANT` de columna, que habría filtrado `centro_referencia_id` en TODAS las
lecturas de `alumno` de cualquier `teacher`, no solo en el buscador (detalle en
`DECISIONES_TECNICAS.md`). Numeración: toma `007` porque `006` ya lo ocupaba el arreglo de T-18
(`006_arreglo_limite_tasa_ambiguo.sql`) — la migración de T-21 (`005_rpc_actualizar_asistencia` en
la hoja de ruta original, proyectada como `006` en §7 el 2026-08-28) pasa a ser
`008_rpc_actualizar_asistencia.sql` cuando le llegue el turno.

**Combobox accesible escrito a mano (`src/ui/comboboxAlumnoExtra.ts`, nuevo), la pieza de
accesibilidad más difícil del proyecto hasta hoy:** `role="combobox"`/`"listbox"`/`"option"`,
`aria-expanded`/`aria-controls`/`aria-activedescendant`, flechas arriba/abajo, Enter para
seleccionar, Escape para cerrar, y una región `role="status"` que sirve a la vez de anuncio
`aria-live` del recuento y de los cuatro estados explícitos del requisito 6 (sin escribir, buscando,
sin resultados, error). Rebote de 250 ms con el primitivo nuevo `src/nucleo/rebote.ts`
(`crearRebote()`, FÁBRICA — nunca una instancia compartida, mismo criterio que
`crearProtectorDobleToque`) antes de llamar a `datos/alumnos.ts#buscarAlumnosParaExtra`. Cancelación
real de la petición en curso (requisito 2) conectando por primera vez a un punto de llamada real el
`crearEjecutorUltimaPeticion` de T-06 (hasta hoy escrito y testeado en aislamiento, sin ningún
consumidor) — incluso cuando el texto cae por debajo del umbral de dos caracteres y no hay ninguna
búsqueda nueva que lanzar, se ejecuta una operación trivial ya resuelta solo para que el aborto de
"empezar una nueva" surta efecto. Para que esto funcionara de verdad hubo que conectar por primera
vez `AbortSignal` a la capa de red: `peticionHttp.ts`/`postgrest.ts` (`rpc(nombre, parametros,
señal?)`, tercer parámetro nuevo) y el doble de `fetch` (`dobleHttp.ts`, rechaza con `AbortError` si
la señal ya está abortada al llamar). Una respuesta que llega abortada se ignora en silencio, nunca
se pinta como error — para eso, `esErrorDeCancelacion` (antes privada de `mensajesAbuso.ts`) se
traslada a `nucleo/controlPeticion.ts` y se exporta, para que las dos consumidoras (una que avisa al
usuario, otra que ignora) compartan el mismo predicado sin duplicarlo.

**Homónimos (requisito 3) y nunca avatar en el buscador:** `dominio/busquedaAlumnoExtra.ts`
(`debeBuscar`, umbral de dos caracteres; `resultadosParaMostrar`, marca `esHomonimo` cuando dos
resultados de la MISMA búsqueda comparten nombre completo, para pintar el centro solo cuando hace
falta). El buscador nunca pide avatar por diseño explícito de la propia spec — el tipo
`ResultadoBusquedaAlumno` no tiene `avatar_ruta`, así que no hay forma de pedirlo por descuido.

**El alumno seleccionado se registra de inmediato (requisito 5) por la misma RPC de T-18/T-19**
(`registrar_asistencia`, `origen: 'manual'`, `slot_id: null`, con la nota opcional del requisito 8),
y aparece como una card más en la MISMA rejilla de `pantallaPasarLista.ts`, marcada visualmente
"Extra" — nunca una sección aparte. `registrarExtra` es el punto de entrada ÚNICO tanto para el alta
(crea la card en 'enviando' la primera vez que se llama con esa clave) como para el reintento tras
un error (clic en la card, mismo `peticionId` — nunca uno nuevo, o la idempotencia del servidor no
protege nada); la clave de un extra es su propio `peticionId`, porque no tiene slot con el que
formar la clave alumno+slot de las cards normales. Tras registrar, pide en best-effort
`datos/alumnos.ts#obtenerAlumnoParaTarjeta` (columnas de identificación de la tabla base, incluida
`avatar_ruta`, que el buscador nunca trae) y reutiliza el mismo pipeline de avatares en lote de
T-19. **Desviación documentada en `DECISIONES_TECNICAS.md`:** un `Conflicto` en un extra NO se
reconcilia releyendo el registro real como hace `manejarToque` con las cards de slot — un registro
`manual` no tiene la clave alumno+slot+día con la que `registrosDeHoyPorAlumnoSlot` indexa; se trata
como cualquier otro error, con el mismo `peticionId` listo para reintentar.

**Bug propio encontrado y corregido durante la propia sesión (antes de cualquier commit):**
`manejarSeleccionExtra` fijaba la card en fase 'enviando' y LUEGO llamaba a `registrarExtra`, cuya
guarda de entrada («si ya está 'enviando', no hagas nada») estaba pensada para el reintento y
bloqueaba también la primera llamada — la card se quedaba en "Registrando…" para siempre sin llegar
a llamar nunca a `registrar`. Encontrado por el propio test de integración («aparece como card
marcada Extra»), no leyendo el código. Arreglado unificando el punto de entrada: `registrarExtra`
decide por sí sola, mirando si ya existe una entrada para esa clave, si está creando o reintentando.

**`db/pruebas_rls.sql` amplía con la sección 8b, nueva:** reutiliza `alumno_prueba` (activo) y
`alumno_inactivo` (dado de baja), ambos con apellido "RLS" ya creados por las secciones 2 y 7 — sin
crear ningún fixture nuevo. Cinco comprobaciones: `teacher` encuentra al activo con el nombre del
centro; el alumno dado de baja (mismo apellido, encontraría por texto) nunca aparece; la respuesta no
trae `email_alumno`/`telefono_alumno`/`avatar_ruta`/`personas_referencia` (estructuralmente
garantizado por el tipo de retorno, comprobado aquí en ejecución); texto vacío no consulta nada; y
`student` no puede llamar a la función, sin excepción.

**66 tests nuevos (728 en total, antes 662, verificado con `git stash -u` contra el commit de
partida):** 8 de `nucleo/rebote.ts` (rebote real y de prueba, cancelación, dos instancias
independientes), 2 de `esErrorDeCancelacion` (`controlPeticion.test.ts`), 3 de la propagación de
`señal` en `postgrest.ts#rpc`, 9 de `dominio/busquedaAlumnoExtra.ts` (umbral, homónimos, orden), 10
de `datos/alumnos.ts` (`buscarAlumnosParaExtra` y `obtenerAlumnoParaTarjeta`: cuerpo exacto de la
RPC, texto vacío no llama a red, cancelación, traducción de error), 23 de
`comboboxAlumnoExtra.test.ts` (ARIA, rebote, los cuatro estados, homónimos, teclado, ratón,
cancelación real con `AbortSignal`, dos instancias independientes) y 11 de integración en
`pantallaPasarLista.test.ts` (monta el buscador, registra con `origen: manual`/`nota`, la card
"Extra" con avatar, reintento con el mismo `peticionId`, alumno inactivo no aparece). Más 9 tests
estáticos de la migración (`herramientas/migraciones/rpcBuscarAlumnos.test.ts`, mismo patrón que
`rpcRegistrarAsistencia.test.ts`) y el arreglo de `hashesAplicadas.test.ts` (documentado abajo).

**Arreglo de `herramientas/migraciones/hashesAplicadas.test.ts` (P-XX no abierta, arreglo directo:
sin él, `npm test` quedaba roto por una migración pendiente legítima, no por ningún descuido):** su
tercera prueba exigía una fila de tabla CON HASH para cada fichero `db/NNN_*.sql` en disco, algo que
ninguna migración anterior había necesitado —005/006 se escribieron y aplicaron el mismo día, antes
de que existiera este test—. Corregido para reconocer también una migración pendiente mencionada en
CUALQUIER parte del texto de `db/APLICADAS.md` (la nueva sección "Pendiente de aplicar", sin hash),
tal como su propio mensaje de error ya pedía. Detalle en `DECISIONES_TECNICAS.md`.

---

**T-19 — Pantalla de pasar lista — COMPLETADA.** La pantalla más importante del producto: un
`teacher` entra, ve a quién le toca y registra entradas en segundos. `puedeUsarPasarLista`
(`permisosUi.ts`) la reserva exclusivamente a `teacher` — ni siquiera `administrator`, que no tiene
horario propio de slots (decisión documentada en `DECISIONES_TECNICAS.md`: su forma de tocar
asistencia es la revisión de T-21, con slot y profesor elegidos a mano). `aplicacion.ts` gana
`DependenciasAppProfesor`/`mostrarAppProfesor`, montada por primera vez desde `main.ts` cuando hay
`config.js`, con la misma compatibilidad hacia atrás verificada por test que ya tenía
`appAdministrador` (sin ella, `teacher` sigue viendo el marcador de posición de T-09). Sin router
propio todavía — una única pantalla no tiene nada que enrutar, mismo criterio que `pantallaCentros.ts`
antes de T-16; lo introducirá T-22 ("mi horario").

**Arquitectura de `pantallaPasarLista.ts`:** `listarSlotsDeProfesorConAlumno` (T-17) y la función
nueva `listarAsistenciaDeHoy` (`datos/asistencia.ts`) se piden en paralelo, una vez, y se cachean en
cierre — nunca releídas en cada tick. Nuevo primitivo `nucleo/programadorIntervalo.ts`
(`ProgramadorIntervalo.cada(ms, tarea)`, hermano de `Temporizador` de T-06) dispara cada 20 s un
recálculo puro (`alumnosPropuestos` sobre la caché y el instante fresco de `Reloj`) para que la
cabecera y la rejilla se refresquen solas al cambiar de tramo horario (requisito 5) sin gastar red;
el botón "Actualizar" es el único refresco manual real. `dominio/slots.ts` añade `limitesDiaLocal`
(límites UTC del día natural del centro) para acotar esa consulta a "hoy" — con aritmética de
calendario, no sumando 24h reales, para no confundirse de día justo el que sigue a un cambio de
hora de otoño (encontrado y corregido con test de regresión propio durante esta misma sesión).
`dominio/asistencia.ts` añade `claveRegistroPorSlot`/`registrosDeHoyPorAlumnoSlot` para cruzar la
propuesta con lo que el servidor ya tiene registrado hoy.

**Cada card es un `<button>` nativo** (objetivo táctil entero, teclado y foco visible gratis, sin
`role`/`tabindex` a mano), ordenadas por apellidos (`compararAlumnosParaOrden`, ya de T-12),
protegidas por `crearProtectorDobleToque` POR CLAVE (alumno+slot, no una instancia global: tocar dos
alumnos casi a la vez registra los dos). El avatar se pide en lote (`obtenerUrlsAvataresMini`,
variante `mini` de T-14) solo para quienes tengan `avatar_ruta` y no se hayan pedido ya; la card se
pinta siempre con el monograma primero, y una imagen que falla al cargar lo deja tal cual, sin
hueco roto. Un `Conflicto` (409) al registrar NUNCA se muestra como error: se relee
`cargarAsistenciaDeHoy` y la card pasa a "registrado" con la fila real — así se ve desde la interfaz
que "el reintento no genera un segundo registro" (requisito 6), sin que el cliente necesite
distinguir un `peticion_id` repetido de un duplicado de negocio (T-18 ya estableció que son, y deben
seguir siendo, indistinguibles). Cualquier OTRO error deja la card en pendiente con el mismo
`peticionId` (nunca uno nuevo) y su mensaje, lista para reintentar. El foco se conserva entre
repintados (`data-clave` en cada botón) para que un recálculo de fondo no lo tire al `<body>`, y una
petición "enviando" nunca desaparece de la rejilla aunque el tramo horario cambie mientras se
espera la respuesta.

**48 tests nuevos (662 en total, antes 614, verificado con `git stash -u` contra el commit de
partida):** 26 de la pantalla (`pantallaPasarLista.test.ts`, nuevo: acceso, estados de cabecera
—en curso/próximo/sin clases hoy—, orden por apellidos, ya registrado al abrir, flujo completo con
la hora real del servidor, doble toque, error con reintento del mismo `peticionId`, Conflicto
resuelto sin mostrarse como error, monograma antes que la imagen, lote único de avatares, imagen
rota, teclado, refresco manual y automático, y que una petición en curso sobrevive a un tick), 7 de
`limitesDiaLocal` (`slots.test.ts`, incluidos los dos cambios de hora estacionales), 5 de
`registrosDeHoyPorAlumnoSlot`/`claveRegistroPorSlot` (`asistencia.test.ts` de dominio), 3 de
`listarAsistenciaDeHoy` (`asistencia.test.ts` de datos), 3 de `programadorIntervalo.test.ts` (nuevo),
1 de `puedeUsarPasarLista` (`permisosUi.test.ts`) y 4 de la nueva app de `teacher` en
`aplicacion.test.ts` (monta pasar lista, pide solo sus propios slots/asistencia, nunca se monta para
`administrator`, compatibilidad sin `appProfesor`). Un bug real encontrado por el propio test
(`elementoConFoco` usaba `instanceof HTMLElement`, un global que no existe fuera de un navegador o
de `jsdom` global — corregido a `getAttribute('data-clave')`, sin depender de ningún global).

---

**Por qué T-18 y no otra cosa (sesión anterior):** siguiente tarea de la cola tras T-16/T-17 (ambas `COMPLETADA`); su
única dependencia, T-17 (motor "quién toca ahora"), está `COMPLETADA` desde la sesión anterior del
mismo día. `Migración: Sí` en su spec (llamada `004_rpc_registrar_asistencia` en la hoja de ruta
original) — siguiendo el protocolo de §0.1: el SQL se escribe, se empuja y se abre su fila en §3;
esta sesión no espera a que el dueño la aplique porque toda la suite corre contra dobles, sin red.

**Migración `005_rpc_registrar_asistencia.sql` (renumerada — ver más abajo):** dos piezas. (1)
`limite_tasa` + `aplicar_limite_tasa(clave, maximo, ventana_segundos)`: el mecanismo genérico de
T-06 (60 operaciones por profesor y minuto, contrato del 2026-08-27) conectado por primera vez a
una RPC real; tabla de infraestructura, RLS habilitada sin políticas, sin GRANT a ningún rol —
T-21 reutilizará la misma función para `actualizar_asistencia`. (2) `registrar_asistencia(...)`,
`SECURITY DEFINER`: fija ella misma `registrado_en` (`now()`) y `profesor_id` (`auth.uid()`, o el
profesor indicado por un `administrator` vía `p_profesor_id` — requisito 2, único caso en que se
acepta ese parámetro); el snapshot del slot (`slot_dia_semana`/`slot_hora_inicio`/`slot_hora_fin`/
`slot_asignatura_o_grupo`) se lee de `slot_horario` en el momento de registrar, nunca del cliente;
`es_retroactivo` se calcula con la fórmula EXACTA del `CHECK asistencia_retroactivo_coherente` de
`001_esquema_inicial` (300 segundos), no con una interpretación distinta de la spec (ver
`DECISIONES_TECNICAS.md`: ese `CHECK`, ya aplicado, es la fuente de verdad). Valida, en orden: quién
llama y en nombre de quién; el límite de abuso; que `ocurrido_en` no esté en el futuro ni supere 7
días hacia atrás (`VENTANA_RETROACTIVA_MAXIMA_DIAS`, conservador, pregunta abierta nueva #13 de §6);
que el alumno exista y esté activo; que el `origen` sea coherente con `slot_id` y, si es `slot`,
que pertenezca al profesor que registra, al alumno indicado, y esté vigente en la fecha LOCAL
(`Europe/Madrid`, misma constante de T-17) del propio registro, no en la de hoy — para que un
registro retroactivo se valide contra la vigencia del día en que de verdad ocurrió.

**Duplicados (requisito 4, decisión por defecto — pregunta abierta nueva #12 de §6):** un segundo
registro del MISMO alumno en el MISMO slot y día se rechaza mediante una restricción `unique`
PARCIAL de verdad (`asistencia_uq_alumno_slot_dia_valida`), no una comprobación a mano dentro de la
función — así protege también contra dos llamadas concurrentes, sin la carrera que tendría un
`select ... where not exists` antes del `INSERT`. Un `peticion_id` repetido choca por su parte con
la restricción `asistencia_peticion_id_unico` ya existente desde `001_esquema_inicial` (tal como ya
preveía `db/MODELO.md` desde T-07): **no** hay idempotencia silenciosa que devuelva la fila ya
creada, un reintento con el mismo `peticion_id` recibe un error de conflicto igual que el duplicado
de negocio — las dos formas de duplicado llegan al cliente como `Conflicto` (409), indistinguibles
entre sí, y no hace falta que lo sean.

**Corrección de bookkeeping encontrada al reescribir `src/dominio/asistencia.ts`** (T-03 lo dejó
como versión provisional, a sustituir "cuando T-18/T-21 escriban la real", tal como su propio
comentario preveía): la constante `MARGEN_RETROACTIVIDAD_MS` valía `60_000` (1 minuto) pero el
`CHECK` ya aplicado exige 300 segundos — corregida a `300_000`. No rompía ningún test previo
(nada la usaba todavía fuera de sus propios tests, que la referenciaban simbólicamente, nunca por
su valor literal), pero habría producido un `es_retroactivo` de cliente que nunca coincidiera con
el que la base de datos fija de verdad. Añade también, en el mismo módulo: `origenCoherente`,
`ocurridoEnValido` y `puedeRegistrarEnNombreDeOtro` — la versión de dominio, pura y con tests
exhaustivos, de las mismas reglas que la RPC aplica en SQL.

**`src/datos/asistencia.ts` (nuevo):** `registrarAsistencia`, el único punto de llamada a la RPC.
No genera `peticionId` por su cuenta (a diferencia de `avatarAlumno.ts` con su `uuid` de subida):
es responsabilidad de quien llama (la pantalla de pasar lista, T-19, junto con
`proteccionDobleToque` de T-06) generarlo una vez y REUTILIZARLO en un reintento genuino, o la
protección de idempotencia de la base de datos no protege nada. El límite de cliente de T-06 se
cuenta sobre el profesor que de verdad registra (`profesorId` si un `administrator` registra en
nombre de otro, si no `usuarioId`), nunca sobre quien llama, mismo criterio que la RPC.

**`src/datos/erroresDominio.ts` amplía `errorDeRespuesta`** para traducir un `429` (límite de tasa
del servidor) a `ErrorLimiteAlcanzado` — la MISMA clase que T-06 ya usa para el límite de cliente,
reutilizada en vez de añadir una novena clase a la taxonomía cerrada de ocho de T-08. El SQLSTATE
`PT429` usado en la RPC para forzar ese código HTTP no se ha podido verificar contra documentación
en vivo en esta sesión (sin salida de red a hosts externos, mismo aviso que T-07/T-08 con sus
propios endpoints); degradación segura si no se cumple: la operación se sigue rechazando igual (el
límite se aplica dentro de la RPC, antes del `INSERT`), solo cambiaría a qué clase de error de
dominio lo traduce el cliente.

**34 tests nuevos (599 en total, antes 565, verificado con `git stash -u` contra el commit de
partida):** 10 de dominio (`asistencia.test.ts`, reescrito: `origenCoherente`, `ocurridoEnValido`
—futuro rechazado, límite exacto de la ventana, ventana configurable—, `puedeRegistrarEnNombreDeOtro`,
más la corrección de `MARGEN_RETROACTIVIDAD_MS`), 12 de datos (`asistencia.test.ts` nuevo: cuerpo
exacto de la RPC en vivo/retroactivo/por slot/en nombre de otro, que nunca viaja `registrado_en`
como parámetro, traducción de cada error del servidor a su clase tipada, y el límite de cliente
contado sobre el profesor correcto), 1 de `erroresDominio.test.ts` (429 → `ErrorLimiteAlcanzado`) y
11 estáticos nuevos en `herramientas/migraciones/rpcRegistrarAsistencia.test.ts` (mismo patrón que
`bucketAvatares.test.ts`: privilegios explícitos de `limite_tasa`, `SECURITY DEFINER` de las dos
funciones, `GRANT EXECUTE` de `registrar_asistencia` exactamente a `authenticated`, ningún parámetro
`p_registrado_en`, fórmula de `es_retroactivo` con 300 segundos, existencia del índice de
duplicado). **`db/pruebas_rls.sql` amplía su sección 7 (recuerda `alumno_inactivo` por id, para
reutilizarlo) y añade la sección 7b, nueva:** 13 comprobaciones que ejercitan la RPC de verdad
—reutilizando los fixtures ya existentes de `alumno_prueba`/`slot_prueba`/`alumno_inactivo`, sin
crear ninguno nuevo— cubriendo el criterio de aceptación completo de T-18: en vivo, retroactivo,
ventana retroactiva excedida, futuro, origen incoherente, alumno inactivo, slot de otro profesor,
duplicado mismo alumno+slot+día, mismo `peticion_id` repetido, `teacher` registrando en nombre de
otro, `administrator` registrando en nombre de `teacher`, y `student` sin acceso. `limite_tasa` se
añade también al barrido obligatorio de `student` (sección 6) y al de `TRUNCATE` (sección 8).

**Migración renumerada: `005_rpc_registrar_asistencia.sql`, no `004` como decía la hoja de ruta
original.** `004` ya lo ocupa `004_bucket_avatares.sql` (T-14), consecuencia de la renumeración en
cadena que arrastró P-01 el 2026-08-28. La hoja de ruta es inmutable (§0.1): la corrección queda
aquí, en `DECISIONES_TECNICAS.md` y en la cabecera del propio fichero SQL, no editándola. Efecto en
cadena para cuando llegue T-21: su migración (`005_rpc_actualizar_asistencia` en la hoja de ruta
original) pasará a ser `006_rpc_actualizar_asistencia.sql`.

**T-18 pasa a BLOQUEADA — pendiente aplicar migración `005`** (fila nueva de §3). El código que
consumirá `registrar_asistencia` (la pantalla de pasar lista, T-19) se escribe y se testea igual,
contra dobles, y queda latente hasta que exista la RPC real en `dev` — la siguiente sesión sigue
con lo que no dependa de esta migración si lo hay, o retoma T-19 en cuanto el dueño confirme `005`.

---

**Requisito 1 (base de frontend reutilizable):** cuatro piezas nuevas, ninguna con librería de
terceros (§0.2). `src/nucleo/router.ts` — `analizarRuta`/`hashDeRuta` (puras) + `crearRouter(objetivo)`
sobre un `hash` (`#/centros`, `#/alumnos`, `#/alumnos/nuevo`, `#/alumnos/<id>`), inyectado igual que
`instalarCapturaErrores` (T-05). `src/ui/dom.ts` — `crearElemento`, helper de creación de elementos con
escapado seguro (siempre `textContent`, nunca `innerHTML`). `src/nucleo/almacenEstado.ts` —
`crearAlmacenEstado`, estado mínimo con suscripción, mismo contrato que `GestorSesion`. `formularios.ts`
amplía con `crearMensajeErrorCampo` (mensaje de error de un campo, `aria-describedby`/`aria-invalid`).

**Requisito 2 (las tres pantallas):** `pantallaCentros.ts` (T-11) por fin se enruta, sin cambios de
código propios. `pantallaFichaAlumno.ts` de T-12/T-13 se **divide en dos**: `pantallaListadoAlumnos.ts`
(nueva: búsqueda, filtro por estado, paginado, navega — sin edición en línea) y una
`pantallaFichaAlumno.ts` **reescrita por completo** como pantalla de un único alumno a pantalla
completa, con sus cuatro bloques — datos y centro, avatar (T-14), personas de referencia (T-13) y
horario (T-15) —, cada uno montado por su propia función `montarBloqueX(...)` con su propio estado y su
propio `pintar()` (nunca un `pintar()` de pantalla entera). Modo alta (sin id) solo pinta el bloque de
datos; al crear con éxito navega a la ficha ya en modo edición.

**Requisito 3 (horario con fecha de efecto):** el bloque de horario lista todas las versiones del
slot con su `vigente_desde`/`vigente_hasta`, una nota fija de que editar o cesar no cambia el
histórico, y formularios de alta/edición(versionado)/cese con un campo "Fecha de efecto" explícito.
Nuevo módulo `src/datos/profesores.ts` (`listarProfesoresActivos`, sobre `perfil_admin_leer_todos`,
ya aplicada desde el bootstrap — sin migración) para el selector de profesor.

**Requisito 4 (accesible, estados explícitos, honesto ante 403):** cada bloque tiene su propio
"Cargando…"/mensaje vacío/`zonaError` (`role="alert"`, con `mensajeAmigable`); un `SinPermiso` al
cargar la ficha se traduce y no rompe la pantalla (test explícito). Objetivos táctiles y campos con
`label` ya venían de `formularios.ts` (T-09); el bloque de horario valida en el cliente
(`crearMensajeErrorCampo`) que la hora de fin sea posterior a la de inicio antes de llamar al servidor.

**Requisito 5 (bloques independientes):** es la razón de fondo de la arquitectura de "una función de
montaje por bloque" del requisito 2 — al no compartir ningún `pintar()`, un fallo en un bloque nunca
repinta (ni por tanto descarta) los campos sin guardar de otro. Verificado con un test explícito: un
fallo al subir el avatar no descarta un cambio sin guardar en el nombre del bloque de datos.

**Decisión de alcance, documentada en `DECISIONES_TECNICAS.md`:** la aplicación real que construye el
router **solo se monta para `administrator`** — el propio título de T-16 es "Interfaz de gestión del
administrador", y las tres pantallas son ya, por `permisosUi.ts`, contenido exclusivo suyo.
`teacher` sigue viendo el marcador de posición de T-09 hasta T-19/T-22, sin cambio.

`src/ui/aplicacion.ts` pasa a ser también la raíz de composición: `DependenciasAppAdministrador`
(nueva, opcional) lleva el `ClientePostgrest`/`ClienteAlmacenamiento` reales, la fábrica de procesado
de imagen y el limitador de tasa de avatares (contrato de T-06: 20/administrator/hora); `main.ts` los
construye siempre que hay `config.js` (mismo `if` que `gestorSesion`) y los pasa como
`appAdministrador`. Sin él (o en cualquier test que no lo pase), `administrator` sigue viendo el
marcador de posición de T-09 — compatibilidad hacia atrás verificada con un test explícito.

**53 tests nuevos (565 en total, antes 512, verificado con `git stash -u` contra el commit de
partida):** cubren, entre otros, el criterio de aceptación
completo de T-16 (alta/edición de alumno, añadir/editar/eliminar persona de referencia, subir/quitar
avatar, alta/edición/cese de slot, escapado de un nombre con `<script>`, un `403` que no rompe la
pantalla, y el aislamiento entre bloques).

---

**Sesión previa del mismo día (quinta) — T-14 (avatar del alumno) COMPLETADA**, más una corrección
de bookkeeping pendiente desde la primera sesión del día. Antes de elegir tarea,
esta sesión encontró que §3 ya daba las migraciones `002`/`003`/`004` por **RESUELTA** (aplicadas y
verificadas por el dueño) pero `db/APLICADAS.md` solo tenía la fila `001`, y §1 seguía marcando
T-10/T-14 como `BLOQUEADA` por un motivo ya resuelto — ninguna de las sesiones de T-15/T-17 lo había
anotado. Corregido primero (tres filas nuevas en `APLICADAS.md` con su hash SHA-256, **T-10 pasa a
`COMPLETADA`**, P-01 a `RESUELTA`), detalle en `DECISIONES_TECNICAS.md`.

Con eso resuelto, T-14 (siguiente tarea con dependencias satisfechas: T-12 completada, migración `004`
ya aplicada) escribe el resto de su alcance, que solo tenía escrita la migración desde la sesión (2) de
esta misma fecha. `src/dominio/avatarAlumno.ts` (nuevo): ruta base determinista
`alumno/{alumno_id}/{uuid}/` con un `uuid` nuevo en cada subida (requisito 2), geometría del recorte
centrado al cuadrado (`calcularRectanguloRecorte`, pura), validación de tipo MIME de origen y tamaño
(requisito 4), monograma — iniciales de nombre y primer apellido más un color de una paleta fija de
ocho tonos oscuros, indexado por hash estable del `id` del alumno (requisito 7). `src/datos/avatarAlumno.ts`
(nuevo): el procesado real de imagen (`createImageBitmap`/`canvas`/`toBlob`, requisito 3) se aísla
detrás de la interfaz inyectable `FabricaProcesadoImagen` — `jsdom` no rasteriza imágenes de verdad, y
añadir el paquete nativo `canvas` solo para un test no habría probado nada sobre un navegador real, así
que se testea la orquestación (qué tamaños se piden, en qué orden, qué tipo MIME) contra una fábrica de
mentira, igual que `postgrest.ts`/`almacenamiento.ts` no testean el `fetch` real. `subirAvatarAlumno`
sigue el orden seguro **sube las dos derivadas nuevas → cambia el puntero `alumno.avatar_ruta` → borra
las derivadas antiguas** (requisito 6: un fallo a mitad nunca deja al alumno sin avatar), con el límite
de tasa de T-06 conectado por primera vez a un punto de llamada real. `eliminarAvatarAlumno` y
`urlsAvataresEnLote` (firma en lote, requisito 5, una sola petición para N alumnos) completan el
alcance. **Desviación documentada en §7:** la eliminación de metadatos EXIF no tiene test propio — es
una garantía de la propia plataforma (repintar sobre un `canvas` nuevo nunca copia EXIF), no algo que
este código deba verificar. 29 tests nuevos (16 dominio, 13 datos).

**P-09 implementada en la misma sesión** (cerraba el hueco: "T-14 no debería declararse verificada en
ejecución con estas dos comprobaciones omitidas"): la sección 7 de `db/pruebas_rls.sql` ya no depende
de que exista un avatar real subido por la interfaz — crea sus propios fixtures (un segundo alumno
recién dado de baja, y una fila de `storage.objects` bajo la ruta de cada uno de los dos) dentro de la
misma transacción de prueba, impersonando `administrator` para el `INSERT`.

**P-02 implementada en el punto que la propia entrada de backlog señalaba como natural ("al llegar a
T-14"):** `listarAlumnos` deja de pedir `avatar_ruta` (`SELECT_LISTADO`, columnas explícitas; nuevo
tipo `AlumnoListado`) — la lista paginada nunca lo pinta, solo la ficha abierta de un alumno. **P-03
implementada** (una frase residual de `db/MODELO.md` sobre `evento_error`, ya corregida).

**T-16 (interfaz de gestión del administrador) queda DESBLOQUEADA**: sus tres dependencias (T-13,
T-14, T-15) están completas. Es la siguiente tarea de la cola y también la más grande pendiente —
requiere construir primero la base de frontend reutilizable entera (router por `hash`, helpers de
creación segura de elementos, estado con suscripción, componentes de formulario) antes de montar
ninguna pantalla — así que esta sesión no la empieza y la deja para la siguiente, en vez de arrancarla
sin presupuesto de sesión para completarla con el mismo rigor que el resto del proyecto.

---

**Sesión previa del mismo día (cuarta) — T-17 (motor de propuesta "quién toca ahora") COMPLETADA.** Sin migración propia (`Migración: No`), depende solo de T-15
(COMPLETADA). `src/dominio/slots.ts` reescrito por completo: sustituye la versión provisional de
T-03 (tipos locales `camelCase`, día/hora en UTC) por la real, sobre el tipo oficial `SlotHorario`
de `dominio/tipos.ts` y con zona horaria de verdad. `instanteLocal(instante, zonaHoraria)` traduce
un instante UTC al día ISO y la hora local con `Intl.DateTimeFormat` (`hourCycle: 'h23'`, sin
librería nueva: el `tz database` ya vive en el runtime) — resuelve los cambios de hora estacionales
de `Europe/Madrid` correctamente porque `Intl` calcula el desplazamiento real de esa zona para ese
instante exacto, sin ningún cálculo manual de offset. `slotActivoEnInstante` reutiliza
`slotVigenteEn` de T-15 (vigencia por fecha) y añade día de la semana + ventana de tolerancia antes
del inicio (`hora_inicio` inclusiva incluso sin tolerancia, `hora_fin` exclusiva, mismo criterio que
el resto del dominio). `alumnosPropuestos({ profesorId, instante, slots, tolerancia?, zonaHoraria? })`
devuelve un resultado explícito de tres formas — nunca una lista vacía sin explicación (requisito 3
de T-17): `en_curso` (uno o más slots tocan ahora, incluida la tolerancia), `proximo` (nada toca
ahora pero queda al menos un slot vigente más tarde el mismo día — agrupa los que comparten la hora
de inicio más cercana, con `minutosHastaInicio`), o `sin_clases_hoy`. `src/datos/slotsHorario.ts`
añade `listarSlotsDeProfesorConAlumno`: una única petición a PostgREST (requisito 5) con el alumno
embebido en columnas explícitas (`id,nombre,primer_apellido,segundo_apellido,avatar_ruta,activo` —
nunca `email_alumno`/`telefono_alumno`/`centro_referencia_id`, que ni `teacher` ni `administrator`
tienen concedidas en la tabla base para un embebido con `*`, ver `003_politicas_rls.sql`). 33 tests
nuevos netos (477 en total, antes 460): 24 de dominio (`slots.test.ts`, reescrito con la batería
completa del criterio de aceptación — dentro del slot, borde de inicio, borde de fin, dentro de la
tolerancia, fuera de horario, día sin clase, alumno dado de baja, slot cesado, dos slots
consecutivos, dos slots simultáneos, cambio de hora de primavera y de otoño de 2026, más
`instanteLocal` en aislamiento) y 1 de datos (`slotsHorario.test.ts`, la petición única y la lista
de columnas del embebido). **Pregunta abierta nueva #11 en §6** (zona horaria y ventana de
tolerancia, prevista desde que se abrió esta tarea): valores conservadores por defecto mientras el
dueño no responda — `Europe/Madrid` y 10 minutos antes del inicio —, ambos parametrizables sin tocar
el código si cambian. **T-16 sigue BLOQUEADA** (sin cambio, ver su fila en §1); la cola sigue por
**T-18** (alta de asistencia, RPC `registrar_asistencia`, depende solo de T-17), que tiene
`Migración: Sí` — la siguiente sesión escribe el SQL, lo empuja, abre su fila en §3 y pasa a
BLOQUEADA, avanzando mientras tanto a lo que no dependa de esa migración si lo hay.

**Sesión previa del mismo día — T-15 (slots de horario) COMPLETADA.** Sin migración propia
(`Migración: No`): `slot_horario` y sus políticas RLS (T-10) ya existen. `src/dominio/slotHorario.ts`
(vigencia en una fecha dada, solape de horario, cálculo de la fecha de cierre al versionar) y
`src/datos/slotsHorario.ts` (listar/crear/modificar/cesar, escritura solo `administrator` por RLS)
con 24 tests nuevos (460 en total, antes 436). El solape del mismo alumno bloquea el alta/edición; el
del mismo profesor con un alumno distinto solo avisa (`avisoSolapeProfesor`, sin bloquear — un
profesor puede tener varios alumnos a la vez). La edición versiona: cierra la versión vigente el día
antes de la fecha de efecto y crea una nueva, sin tocar la anterior.

**Sesión previa del mismo día — T-14 (avatar del alumno), solo la migración.** `db/004_bucket_avatares.sql`
escrita y empujada: crea el bucket privado `avatares` (`allowed_mime_types = image/webp`,
`file_size_limit` 2 MiB); sus políticas ya existían desde `003_politicas_rls.sql` (T-10). T-14 pasa
a **BLOQUEADA — pendiente aplicar migración `004`** (fila 6 de §3). El resto del alcance de T-14
(procesado de imagen en el cliente, ruta determinista, firma en lote, monograma) sigue sin escribir.
7 tests estáticos nuevos en `herramientas/migraciones/bucketAvatares.test.ts`.

**Sesión previa del mismo día — P-04 (urgente, §0.3) IMPLEMENTADA: cierra el hallazgo #2 de
`auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-08-29).** `db/pruebas_rls.sql` no
ejercitaba ningún `UPDATE`/`DELETE`/`TRUNCATE`; ahora añade los `UPDATE` que faltaban para
`centro_estudios`/`alumno`/`slot_horario`, `UPDATE`+`DELETE` para `persona_referencia` (única política
`for all` del esquema), y un barrido de `TRUNCATE` por `administrator`/`teacher` sobre las ocho tablas
de `public`. Atendida antes de la cola normal, según manda el protocolo para hallazgos `ABIERTO` de
severidad alta. Detalle en `DECISIONES_TECNICAS.md` y en §5 de este documento (P-04). El auditor
cerrará el hallazgo #2 en su próxima pasada (no lo toca el programador).

**Sesión previa — 2026-08-28 (quinta sesión del día):** **T-13 (personas de referencia del
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
`b0e4719` (auditoría del día, ver `auditoriacontinua.md`), sin colisión.

**T-14 pasó a BLOQUEADA el 2026-08-31:** `004_bucket_avatares.sql` ya está escrita y empujada (fila 6
de §3), con sus comprobaciones estáticas propias (`herramientas/migraciones/bucketAvatares.test.ts`,
7 tests). Solo crea el bucket privado en sí; sus políticas de `storage.objects` ya existían desde
`003_politicas_rls.sql` (T-10). El resto del alcance de T-14 (procesado de imagen en el cliente, ruta
determinista, firma en lote, monograma) queda latente hasta que el dueño aplique `004` — no se ha
escrito todavía.

**T-15 se completó el mismo día, sin esperar a `004`** (`Migración: No`, depende solo de T-12,
COMPLETADA): ver detalle en la cabecera de arriba. **T-16 pasa a BLOQUEADA** por dependencia de
código (no de migración: sin fila en §3) porque su requisito 2 exige el bloque de avatar de la ficha,
que T-14 todavía no ha escrito.

**Siguiente tarea: T-16 (interfaz de gestión del administrador).** Su spec está en el cuerpo de
`HOJA_DE_RUTA.md`; sus tres dependencias (T-13, T-14, T-15) están COMPLETADAS desde el 2026-08-31.
Sin migración propia. Es la tarea más grande de la cola: el requisito 1 exige construir primero la
base de frontend reutilizable (router por `hash`, helpers de creación segura de elementos con
escapado, estado con suscripción, componentes de formulario) antes de montar ninguna de las tres
pantallas del requisito 2.

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
| T-10 | Autorización: políticas RLS de los tres roles | COMPLETADA | 2026-08-31 | Migración `003_politicas_rls` (renumerada de `002`: P-01 se intercaló antes, ver §7) aplicada y **verificada en ejecución** contra `dev` (fila 5 de §3, `npm run probar-rls`: 51 comprobaciones, 3 omitidas —bucket de avatares, entonces vacío—, 0 fallidas). Código y tests completos; matriz en `DECISIONES_TECNICAS.md`. Estado corregido de `BLOQUEADA` a `COMPLETADA` en esta sesión: el motivo del bloqueo llevaba ya resuelto desde la primera sesión del 2026-08-31, sin que ninguna sesión posterior lo hubiera anotado aquí (bookkeeping, ver `DECISIONES_TECNICAS.md`) |
| T-11 | Catálogo de centros de estudios | COMPLETADA | 2026-08-28 | Sin migración: `centro_estudios` y su `unique(nombre)` exacto ya viven en `001_esquema_inicial`. Dominio (`src/dominio/centrosEstudios.ts`), datos (`src/datos/centrosEstudios.ts`) y pantalla standalone (`src/ui/pantallaCentros.ts`, sin enrutar hasta T-16) con 32 tests nuevos (365 en total, antes 333). Detalle en `HISTORIAL_SESIONES.md` de hoy |
| T-12 | Ficha de alumno: datos, centro y baja lógica | COMPLETADA | 2026-08-28 | Sin migración: `alumno` ya existe con todas sus columnas desde `001_esquema_inicial`. Dominio (`src/dominio/alumno.ts`), datos (`src/datos/alumnos.ts`, leyendo de la vista `alumno_ficha` de T-10) y pantalla standalone solo-administrator (`src/ui/pantallaFichaAlumno.ts`, sin enrutar hasta T-16) con 43 tests nuevos (408 en total, antes 365). Búsqueda no acento-insensible (pregunta abierta en §6, mismo motivo que T-11). Detalle en `HISTORIAL_SESIONES.md` de hoy |
| T-13 | Personas de referencia del alumno | COMPLETADA | 2026-08-28 | Sin migración: `persona_referencia` y sus políticas RLS (T-10) ya existen. Dominio (`src/dominio/personaReferencia.ts`), datos (`src/datos/personasReferencia.ts`) y gestión embebida en `src/ui/pantallaFichaAlumno.ts` (sin pantalla propia, por spec) con 21 tests nuevos (429 en total, antes 408). Detalle en `HISTORIAL_SESIONES.md` de hoy |
| T-14 | Avatar del alumno (Supabase Storage) | COMPLETADA | 2026-08-31 | Migración `004_bucket_avatares` **aplicada y verificada** en `dev` (fila 6 de §3). Resto del alcance escrito esta sesión: `src/dominio/avatarAlumno.ts` (ruta determinista, geometría del recorte, validación de tipo/tamaño, monograma) y `src/datos/avatarAlumno.ts` (`procesarAvatar` sobre una fábrica de procesado de imagen inyectable, `subirAvatarAlumno` con el orden seguro sube-nuevo→cambia-puntero→borra-viejo, `eliminarAvatarAlumno`, `urlsAvataresEnLote`, límite de tasa de T-06 conectado). 29 tests nuevos (16 dominio + 13 datos). **Desviación documentada en §7:** el procesado real de imagen (`createImageBitmap`/`canvas`) no se testea con píxeles reales — se aísla detrás de `FabricaProcesadoImagen` y se testea la orquestación con una fábrica de mentira; la eliminación de EXIF se argumenta por construcción de la plataforma, no se comprueba con un test. **P-09 implementada en la misma sesión:** `db/pruebas_rls.sql` sección 7 ya no depende de que exista un avatar real subido por la interfaz — crea sus propios fixtures (un alumno dado de baja y dos filas de `storage.objects`) dentro de la transacción de prueba. Sin pantalla propia — la construye T-16, que queda desbloqueada |
| T-15 | Slots de horario por defecto: asignación, edición y no-retroactividad | COMPLETADA | 2026-08-31 | Sin migración: `slot_horario` y sus políticas RLS (T-10) ya existen. Dominio (`src/dominio/slotHorario.ts`: vigencia, solape, versionado) y datos (`src/datos/slotsHorario.ts`: listar/crear/modificar/cesar) con 24 tests nuevos (460 en total, antes 436). El solape del mismo alumno bloquea; el del mismo profesor con otro alumno solo avisa (`avisoSolapeProfesor`). Sin restricción `EXCLUDE` en base de datos (`Migración: No`, limitación conocida en `DECISIONES_TECNICAS.md`). Sin pantalla propia — la construye T-16 |
| T-16 | Interfaz de gestión del administrador | COMPLETADA | 2026-08-31 | Sin migración: sus tres dependencias (T-13, T-14, T-15) ya estaban completas. Base de frontend reutilizable nueva (`nucleo/router.ts`, `ui/dom.ts`, `nucleo/almacenEstado.ts`, `formularios.crearMensajeErrorCampo`). `pantallaCentros.ts` (T-11) por fin enrutada; `pantallaFichaAlumno.ts` de T-12/T-13 dividida en `pantallaListadoAlumnos.ts` (nueva) + una `pantallaFichaAlumno.ts` reescrita como pantalla completa de cuatro bloques aislados (datos, avatar, personas de referencia, horario), cada uno con su propio montaje y `pintar()`. Nuevo `datos/profesores.ts` para el selector de horario. La aplicación real solo se monta para `administrator` (decisión documentada); `teacher` sigue con el marcador de posición de T-09. 53 tests nuevos (565 en total, antes 512) |
| T-17 | Motor de propuesta "quién toca ahora" | COMPLETADA | 2026-08-31 | Sin migración: depende solo de T-15 (COMPLETADA). `dominio/slots.ts` reescrito (sustituye la versión provisional de T-03) con zona horaria real (`Intl`, `Europe/Madrid` por defecto) y ventana de tolerancia; `datos/slotsHorario.ts` añade `listarSlotsDeProfesorConAlumno` (una petición, alumno embebido en columnas restringidas). 33 tests nuevos netos (477 en total, antes 460). Pregunta abierta #11 en §6 (valores por defecto de zona horaria y tolerancia, sin bloquear) |
| T-18 | Alta de asistencia (RPC `registrar_asistencia`) | COMPLETADA | 2026-09-01 | Migraciones `005` y `006` aplicadas en `dev` y **verificadas en ejecución**: `npm run probar-rls` da **67 comprobaciones, 0 omitidas, 0 fallidas**, con las cuatro altas reales pasando y los nueve rechazos trayendo cada uno su motivo propio (ventana de 7 días, futuro, `slot` sin id, alumno de baja, en nombre de otro, slot ajeno, `student`, y los dos duplicados chocando con `asistencia_uq_alumno_slot_dia_valida` y `asistencia_peticion_id_unico`). El camino hasta aquí dejó tres P-XX, todas implementadas y confirmadas: **P-10** (los rechazos exigen su motivo), **P-11** (finales de línea clavados al hash del ledger) y **P-12** (la batería no podía consumir la fila que devuelve la RPC). Límite de 60 operaciones por profesor y minuto conectado por primera vez (`limite_tasa`/`aplicar_limite_tasa`) |
| T-19 | Pantalla de pasar lista | COMPLETADA | 2026-09-01 | Sin migración: depende solo de T-17/T-18 (ambas completadas). `puedeUsarPasarLista` exclusivo de `teacher`. Nuevo `nucleo/programadorIntervalo.ts` (refresco sin red), `dominio/slots.ts` añade `limitesDiaLocal`. Cards como `<button>` nativo con doble toque por clave; `Conflicto` se resuelve releyendo el registro real, nunca como error. Sin router propio de `teacher` todavía (una sola pantalla). 48 tests nuevos (662 en total, antes 614) |
| T-20 | Alumno extra: listado completo y selección manual | COMPLETADA | 2026-09-02 | Código y 66 tests completos desde 2026-09-01, contra dobles. Migración `007_rpc_buscar_alumnos.sql` aplicada y **verificada en ejecución** por el dueño (fila 9 de §3, `npm run probar-rls`: sección 8b en `[OK]`, cinco comprobaciones) — desbloqueada en esta sesión |
| T-21 | Revisar y modificar los registros por slot | COMPLETADA | 2026-09-02 | Código y tests completos desde 2026-09-01, contra dobles. Migración `008_rpc_actualizar_asistencia.sql` aplicada y **verificada en ejecución** por el dueño (fila 10 de §3, `npm run probar-rls`: 89 comprobaciones, 0 omitidas, 0 fallidas) — desbloqueada en esta sesión |
| T-22 | "Mi horario" del profesor (teacher) | COMPLETADA | 2026-09-01 | Sin migración: depende solo de T-17 (`COMPLETADA`). `dominio/slots.ts#vistaSemanalProfesor` (nuevo), primer router real de `teacher` (`crearRouterProfesor`, `nucleo/router.ts`, sustituye la navegación local de T-21), pantalla `pantallaMiHorario.ts` (nueva) y `slotInicialId` opcional en `pantallaRegistrosSlot.ts` para el enlace profundo del requisito 2. 42 tests nuevos (818 en total, antes 776) |
| T-23 | Consulta y exportación del histórico | COMPLETADA | 2026-09-01 | Sin migración: `SELECT` sobre `asistencia` ya concedido desde T-10. `dominio/historicoAsistencia.ts` (CSV), `nucleo/csv.ts` (utilidad genérica), `datos/asistencia.ts#listarHistoricoAsistencia`/`listarHistoricoAsistenciaCompleto`, `ui/pantallaHistorico.ts` (nueva, primer `<table>` real del proyecto). `db/pruebas_rls.sql` sección 8d nueva (aislamiento de lectura). 73 tests nuevos (891 en total, antes 818) |
| T-24 | Administración de usuarios y roles | COMPLETADA | 2026-09-04 | Código y 46 tests completos, contra dobles. Migración `009_administracion_usuarios.sql` (columna `perfil.actualizado_por` + trigger `perfil_before_update`) **aplicada y verificada** en `dev` (fila 11 de §3, **RESUELTA 2026-09-04**): el ledger trae `009` con hash idéntico al SHA-256 del fichero en disco, y la sección 8e de `npm run probar-rls` pasó ya el 2026-09-03. Estuvo marcada `BLOQUEADA` dos días de más — ver la entrada del 2026-09-04 en `HISTORIAL_SESIONES.md` |
| T-25 | Endurecimiento, privacidad y paso a producción | BLOQUEADA — pendiente crear el proyecto de producción, aplicar las diez migraciones, verificar `db/pruebas_rls.sql` contra `prod`, respaldo verificado y aprobación de los textos legales (fila 12 de §3) | 2026-09-04 | Requisitos 2, 3, 7, 8 y 9 completos; 1 y 4 escritos pero pendientes de un dato/decisión del dueño (proveedor de hosting, aprobación legal); 5 y 6 son DDL/infraestructura que el agente nunca ejecuta (§0.1). Detalle completo, checklist exacto y por qué en `roadmap/PRODUCCION_T25.md`. En el camino, corregido un hueco real de T-14 (requisito 8, aviso de consentimiento del avatar ausente de la interfaz) |
| R-01 | Registro explícito de ausencias | BLOQUEADA — pendiente aplicar migración `010` (fila 13 de §3) | 2026-09-04 | Oleada v1 / F-01 · Código y tests completos, contra dobles. Migración `010_registro_ausencias.sql` (renumerada por el PM el 2026-09-02: `006` lo ocupó ya T-18) escrita y empujada, todavía sin aplicar |
| R-02 | Justificación de una ausencia | BLOQUEADA — pendiente aplicar migración `011` (fila 14 de §3) **y pendiente decisión del dueño** (pregunta #16 de §6, hallazgo #8 de auditoría, severidad alta) | 2026-09-05 | Oleada v1 / F-01 · Código y tests completos, contra dobles. Migración `011_justificacion_ausencia.sql` (renumerada por el PM el 2026-09-02: `007` lo ocupó ya T-20) escrita y empujada, todavía sin aplicar — **no aplicar hasta resolver la pregunta #16**: `motivo_justificacion` incluye valores de dato de salud (artículo 9 RGPD) sin autorización expresa del dueño |
| R-03 | Registro de salida y cómputo de horas reales | BLOQUEADA — pendiente aplicar migración `012` (fila 15 de §3) | 2026-09-04 | Oleada v1 / F-01 · Código y tests completos, contra dobles. Migración `012_registro_salida.sql` (renumerada por el PM el 2026-09-02: `008` lo ocupó ya T-21) escrita y empujada, todavía sin aplicar |
| R-12 | Calendario de cierres del centro (festivos y vacaciones) | BLOQUEADA — pendiente aplicar migración `014` (fila 16 de §3) | 2026-09-07 | Oleada v1 / F-01 · Código y tests completos, contra dobles. Migración `014_calendario_cierres.sql` (renumerada por el PM el 2026-09-02: `010` colisionaba con la nueva numeración de R-06) escrita y empujada, todavía sin aplicar — dependencia nueva de R-04 |
| R-13 | Aviso de sesiones sin pasar lista en «Mi horario» | COMPLETADA | 2026-09-07 | Oleada v1 / F-01 · Sin migración (solo cliente) · código y tests completos, contra dobles — R-06/R-12 code-complete, bloqueadas solo por migración, no bloquean escribir esto (mismo precedente que R-05 con R-01/R-02) |
| R-04 | Informe mensual por alumno | COMPLETADA | 2026-09-07 | Oleada v1 / F-02 · Código y tests completos, contra dobles. Reutiliza `esDiaCerrado` (R-12) y `esDiaCanceladoParaSlot` (R-06): igual que R-13, un informe real fallará con un error de servidor mientras `013`/`014` sigan sin aplicar — no bloquea, mismo precedente |
| R-05 | Aviso de ausencia injustificada listo para enviar | COMPLETADA | 2026-09-07 | Oleada v1 / F-02 · sin envío automático · alcance de `administrator` completo; el alcance de `teacher` que pedía la spec original queda pendiente de la pregunta #17 de §6 (no bloquea, valor conservador: sin acceso) |
| R-06 | Excepción puntual de un slot: sustitución o cancelación | BLOQUEADA — pendiente aplicar migración `013` (fila 17 de §3) | 2026-09-07 | Oleada v1 / F-03 · Código y tests completos, contra dobles. Migración `013_excepcion_slot.sql` escrita y empujada, todavía sin aplicar — desbloquea código-wise a R-13 y R-04 (sus otras dependencias, T-19/T-22/R-12, ya completas o bloqueadas solo por migración) |
| R-07 | Pasar lista con conexión intermitente | COMPLETADA | 2026-09-09 | Oleada v1 / F-03 · solo cliente · código y tests completos. `nucleo/colaAsistenciaOffline.ts` (IndexedDB real, sin test propio — jsdom no la implementa) + `nucleo/detectorConexion.ts` (con test propio); las dos opcionales en `pantallaPasarLista.ts`, sin ellas funciona igual que antes de R-07. **P-20/P-21** (2026-09-09, hallazgos #12/#13 de auditoría): el elemento encolado guarda ahora `ocurridoEn` con el instante real del toque, la base de IndexedDB se parte por `perfil.id`, y `vaciarColaOffline` trata `ErrorLimiteAlcanzado`/`NoAutenticado` como `ErrorDeRed` (detiene el barrido en vez de descartar el elemento) |
| R-14 | Aviso de clase cancelada a las familias | BLOQUEADA — pendiente aplicar migración `015` (fila 18 de §3) | 2026-09-08 | Oleada v1 / F-03 · Código y tests completos, contra dobles. Migración `015_aviso_cancelacion_slot.sql` escrita y empujada, todavía sin aplicar — amplía `excepcion_slot` (R-06, `013`, también sin aplicar) con dos columnas nuevas y su RPC de escritura |
| R-08 | Importación masiva de alumnos y horarios | BLOQUEADA — pendiente aplicar migración `016` (fila 19 de §3) | 2026-09-08 | Oleada v2 / F-04 · Código y tests completos, contra dobles. Su spec declara `Migración: No`, pero el requisito 3 (profesor por email) exige `db/016_resolver_profesor_por_email.sql`, escrita y empujada, todavía sin aplicar — el resto del alcance (alumnos, resto de horarios) no depende de la migración |
| R-09 | Aplicación instalable y arranque sin red | COMPLETADA | 2026-09-08 | Oleada v2 / F-04 · solo cliente · `manifest.json` + iconos generados sin dependencias (`herramientas/iconos/`) + `sw.js` (único Service Worker, "red primero, caché de seguridad") + aviso de versión nueva (`nucleo/registroServiceWorker.ts`/`ui/avisoNuevaVersion.ts`). Verificado con Playwright headless: offline tras una visita previa funciona; el disparo real de "versión nueva" en el propio navegador no se pudo reproducir en esta sesión (detalle en `DEVELOPERS.md`), la orquestación sí tiene 7 tests con dobles |
| R-10 | Expediente completo del alumno (RGPD) | COMPLETADA | 2026-09-08 | Oleada v2 / F-05 · Sin migración: depende solo de T-13/T-23, ambas `COMPLETADA`. `dominio/expedienteAlumno.ts` (nuevo, 19 tests) compone ficha + personas de referencia + histórico ÍNTEGRO (incluye anuladas/retroactivas) en un único documento; bloque quinto en `pantallaFichaAlumno.ts` con descarga de JSON legible e impresión (mismo mecanismo que el informe mensual de R-04), reservado a `administrator` (`puedeExportarExpedienteCompleto`, nueva en `permisosUi.ts`). 23 tests nuevos en total (1418 en total, antes 1376) |
| R-11 | Panel de centro para el administrador | COMPLETADA | 2026-09-09 | Oleada v2 / F-06 · Sin migración: depende solo de T-16, T-21 (ambas `COMPLETADA`) y R-01 (código-completa, bloqueada solo por migración — mismo precedente que R-04/R-13). `dominio/panelCentro.ts` (nuevo, 23 tests): sesiones de hoy y su estado, ranking de ausencias sin justificar, ranking de profesores por proporción de sesiones registradas. Nuevas `datos/alumnos.ts#listarAlumnosActivosParaPanel`/`datos/slotsHorario.ts#listarSlotsDeAlumnos` y pantalla `ui/pantallaPanelCentro.ts` (`#/panel`, 12 tests). 42 tests nuevos en total (1466 en total, antes 1424). En el camino, corregido un bug real preexistente de T-23 (P-22: `idsAlumnosDeCentro` leía una columna sin `GRANT`, ver §5) |
| R-15 | Informe de horas por profesor | COMPLETADA | 2026-09-09 | Oleada v3 / F-07 · Sin migración: depende de R-03 (código-completa, bloqueada solo por migración — mismo precedente que R-04/R-11/R-13) y T-24 (`COMPLETADA`). `dominio/informeHorasProfesor.ts` (nuevo, 13 tests): por cada profesor activo, sesiones/horas reales propias, horas teóricas y sesiones/horas reales de sustitución (R-06), separadas sin ninguna columna nueva. Pantalla propia `ui/pantallaInformeHorasProfesor.ts` (`#/informe-horas`, 10 tests), exclusiva de `administrator`. CSV con metadatos (`nucleo/csv.ts#documentoCsvConMetadatos`, nueva) y ventana de impresión, mismas cifras que la tabla. Nuevas `datos/slotsHorario.ts#listarSlotsDeProfesores` y `dominio/permisosUi.ts#puedeVerInformeHorasProfesor`. 28 tests nuevos en total (1494 en total, antes 1466) |
| R-16 | Exportación completa del centro (copia de seguridad y portabilidad) | COMPLETADA | 2026-09-09 | Oleada v3 / F-07 · Sin migración: depende de T-11/T-12/T-13/T-15/T-23, las cinco `COMPLETADA`. `dominio/exportacionCentro.ts` (nuevo, 13 tests): catálogo de centros, TODOS los alumnos (activos e inactivos) con personas de referencia, todos los slots (cualquier vigencia) e histórico completo de asistencia. Botón «Exportar todo el centro» como cuarto bloque de `ui/pantallaPanelCentro.ts` (R-11), no una pantalla propia. 23 tests nuevos en total (1517 en total, antes 1494) |

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
| 4 | Aplicar la migración `002_bloqueo_cuenta` en `dev` | P-01 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `2`~~ | **RESUELTA 2026-08-31** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `3`, número que cubre esta migración y la de la fila 5: el runner aplica en orden numérico y aborta al primer error, así que un `3` en el ledger implica que `002` entró antes que `003`. **Anotada en `db/APLICADAS.md` (hash `1c3f8c8aff62`) y P-01 sacada de `BLOQUEADA` en §5** — hecho el 2026-08-31, sesión de T-14 (3) |
| 5 | Aplicar la migración `003_politicas_rls` en `dev`, **después** de la fila 4 | T-10 | ~~`git pull` y `npm run migrate` en local (aplica en orden numérico: no hace nada si `002` sigue pendiente). Al terminar, comprobar que `esquema_version()` devuelve `3`. Opcional pero recomendado: ejecutar también `npm run probar-rls` y revisar que no haya ninguna fila `FALLO`~~ | **RESUELTA 2026-08-31 — migración aplicada Y políticas verificadas en ejecución, sin salvedades.** `esquema_version()` = `3`. `npm run probar-rls` contra `dev`: **51 comprobaciones, 3 omitidas, 0 fallidas**, y las tres omisiones son del bucket de avatares, que no existe hasta T-14 (fila 6). Queda probado contra la base real lo que hasta hoy solo estaba en SQL estático: que un `teacher` lee las columnas de identificación de un alumno pero **no** `email_alumno` (requisito 4 de T-12/T-13, punto de control permanente del auditor); que **un profesor no ve el slot de otro** (`slot_horario / teacher2 no lee el ajeno`), que es la aserción de aislamiento sobre la que se sostiene todo el modelo multi-profesor; que la política `for all` de `persona_referencia` bloquea al profesor en SELECT, INSERT, UPDATE y DELETE y permite las cuatro al administrador; que el `student` no lee ninguna de las siete tablas; que `TRUNCATE` está denegado en las ocho para ambos roles; y que `asistencia` rechaza el INSERT directo incluso al administrador. Llegar aquí exigió arreglar la batería **tres veces el mismo día**: el `grant` de `_resultados_prueba_rls` (sin él no arrancaba), **P-08** (una regresión que desactivaba diez comprobaciones en silencio) y **P-07(b)** (la semilla no creaba un segundo profesor, así que el aislamiento entre profesores no podía probarse nunca). Ninguno de los tres lo encontró nadie leyendo el código: los tres salieron de ejecutar. **T-10 pasada de `BLOQUEADA` a `COMPLETADA` en §1, y anotada en `db/APLICADAS.md` (hash `4e4c50a92dab`)** — hecho el 2026-08-31, sesión de T-14 (3): el motivo del bloqueo llevaba resuelto desde esta misma verificación, sin que ninguna sesión posterior lo hubiera anotado |
| 6 | Aplicar la migración `004_bucket_avatares` en `dev`, **después** de las filas 4 y 5 | T-14 | ~~`git pull` y `npm run migrate` en local (aplica en orden numérico: no hace nada si `002`/`003` siguen pendientes). Al terminar, comprobar que `esquema_version()` devuelve `4`~~ | **RESUELTA 2026-08-31** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `4`, y `npm run probar-rls` confirma que la protección de escritura del bucket funciona contra la base real: `avatares / teacher escribe (debe fallar)` queda bloqueado por una **política RLS** sobre `storage.objects` (*new row violates row-level security policy*), no por un GRANT. Las omisiones de la batería bajan de 3 a 2. **Las dos que quedan cambian de motivo, no desaparecen**: ya no es que falte el bucket, es que está vacío — nadie ha subido todavía ningún avatar, así que las dos comprobaciones de **lectura** (que un profesor vea el avatar de un alumno activo y **no** el de uno dado de baja) siguen sin ejercitarse, y no se desbloquean solas. Ver **P-09** (implementada 2026-08-31, sesión de T-14 (3): la sección 7 ya crea sus propios fixtures y no depende de un avatar real). **Anotada en `db/APLICADAS.md` (hash `1065196e1662`)** |
| 7 | Aplicar la migración `005_rpc_registrar_asistencia` en `dev`, **después** de las filas 4, 5 y 6 | T-18 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `5`, y ejecutar también `npm run probar-rls`~~ | **RESUELTA 2026-09-01** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `5`. El `npm run probar-rls` recomendado **hizo exactamente su trabajo**: 67 comprobaciones, 0 omitidas, **4 fallidas**, todas de la sección 7b nueva y todas con el mismo error — `column reference "ventana_inicio" is ambiguous`, un bug de `aplicar_limite_tasa()` dentro de esta misma migración. `005` queda aplicada e **inmutable**; el arreglo va en la migración `006` (fila 8) |
| 8 | Aplicar `006_arreglo_limite_tasa_ambiguo` y verificar T-18 con `npm run probar-rls` | T-18 | ~~`git pull`, `npm run migrate` y `npm run probar-rls`~~ | **RESUELTA 2026-09-01** — hizo falta más de una vuelta y cada una encontró algo. (1) `npm run migrate`: `005` y `006` aplicadas, confirmadas con `npm run migrate -- --estado`. (2) Primera `probar-rls`: el ambiguo resuelto, pero 6 fallos propios de la batería (P-12) y nueve rechazos que aprobaban sin mirar el motivo (P-10). (3) Segunda `probar-rls`, tras corregir ambos: **67 comprobaciones, 0 omitidas, 0 fallidas, "ningún acceso prohibido tuvo éxito"**. T-18 cerrada |
| 9 | Aplicar la migración `007_rpc_buscar_alumnos` en `dev`, **después** de las filas 4 a 8 | T-20 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `7`, y ejecutar también `npm run probar-rls` (nueva sección 8b: cinco comprobaciones de `buscar_alumnos_activos`)~~ | **RESUELTA 2026-09-02** — aplicada por el dueño con `npm run migrate`. **Verificada:** `npm run migrate -- --estado` lista `007` con hash `792e0a398c55`, y `esquema_version()` devuelve **`8`**, no `7`: el dueño aplicó `007` y `008` en la misma pasada, y como el runner va en orden numérico y aborta al primer error, un `8` en el ledger implica que `007` entró antes y sin fallo (mismo razonamiento que la fila 4 con el `3`). `npm run probar-rls`: la sección 8b entera en `[OK]` — las cinco comprobaciones de `buscar_alumnos_activos`, incluidas «la respuesta no trae contacto ni personas de referencia» y «un `student` no puede llamarla» |
| 10 | Aplicar la migración `008_rpc_actualizar_asistencia` en `dev`, **después** de la fila 9 (`007`) | T-21 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `8`, y ejecutar también `npm run probar-rls` (nueva sección 8c: `actualizar_asistencia` — edición propia/ajena, ventana de 7 días, anular sin motivo, cambiar alumno/slot; sección 5 ampliada con UPDATE/DELETE directo denegados)~~ | **RESUELTA 2026-09-02** — aplicada por el dueño con `npm run migrate`. **Verificada:** hash `d7e1a1f47001` en el ledger y `esquema_version()` = `8`. `npm run probar-rls` contra `dev`: **89 comprobaciones, 0 omitidas, 0 fallidas**, «ningún acceso prohibido tuvo éxito» — sección 8c completa (teacher edita lo suyo y no lo ajeno, ventana de 7 días que el `administrator` no tiene, anular exige motivo, la fila anulada sigue existiendo, dos modificaciones dejan dos filas de historial con los valores previos, cambio de alumno y de slot con sus tres rechazos) y sección 5 con el `UPDATE`/`DELETE` directo denegados. **La primera pasada dio 1 omitida** (`actualizar_asistencia / cambiar alumno`): no era la RPC sino un bug del propio fixture —leía `centro_referencia_id` de la tabla base, columna que el GRANT de `003` no concede a `authenticated` ni siquiera siendo `administrator`, y el `exception when others` se tragaba el «permission denied»—; arreglado en la sesión interactiva del dueño (commit `bee1602`, lee el centro por `alumno_ficha` y ahora el motivo real sale en el mensaje del OMITIDO) |
| 11 | Aplicar la migración `009_administracion_usuarios` en `dev`, **después** de la fila 10 (`008`) | T-24 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `9`, y ejecutar también `npm run probar-rls` (nueva sección 8e: aislamiento de `perfil` entre roles ajenos, y el trigger `perfil_before_update` rechazando desactivar/degradar al único `administrator` activo)~~ | **RESUELTA 2026-09-04** — aplicada por el dueño con `npm run migrate`, **en algún momento del 2026-09-03 o antes**, sin que se anotara aquí. Confirmado el 2026-09-04 por dos vías independientes: (1) `npm run migrate` no encuentra ninguna migración pendiente y `npm run migrate -- --estado` lista la fila `009 009_administracion_usuarios` con hash `0d996c48420d06a528a34841eb10735bb678c8733870f986e3d3f8bf0e4bd882`, **idéntico** al SHA-256 del fichero en disco (si difiriera, `planificar()` habría abortado con `ErrorHashCambiado` en vez de callar); (2) la ejecución de `npm run probar-rls` del 2026-09-03 dio 105 comprobaciones, 0 omitidas, 0 fallidas, y las dos comprobaciones de la sección 8e sobre `perfil_before_update` exigen `%último administrator%` en `sqlerrm` — sin el trigger, los dos `UPDATE` habrían pasado sin error y la batería habría cantado dos fallos. **La fecha exacta no se registró y no es recuperable desde el ledger** (`esquema_migracion` no guarda instante de aplicación); se anota como `<= 2026-09-03`. T-24 pasa a `COMPLETADA` |
| 12 | Ejecutar el paso a producción de T-25: crear el proyecto de producción, aportar sus credenciales, elegir proveedor de hosting (pregunta #15 de §6), aplicar las diez migraciones (`000` a `009`) con `npm run migrate -- --entorno=prod` y `PERMITIR_PROD=1`, ejecutar `npm run probar-rls` contra `prod` y guardar su salida, crear el primer `administrator` de producción, configurar y **verificar** una restauración de respaldo real, y aprobar o corregir los cuatro textos legales de `legal/` (**no aprobarlos todavía**: `POLITICA_PRIVACIDAD.md` y el inventario de `PRODUCCION_T25.md` afirman "cero dato de salud", falso desde R-02 — resolver antes la pregunta #16 de §6, hallazgo #8 de auditoría) | T-25 | Procedimiento exacto, paso a paso, en `roadmap/PRODUCCION_T25.md` §5-§6. No es una migración suelta (no genera una fila por cada una de las diez, §0.1.7): es la propagación completa, de una sola vez | PENDIENTE |
| 13 | Aplicar la migración `010_registro_ausencias` en `dev`, **después** de la fila 11 (`009`) | R-01 | `git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `10`, y ejecutar también `npm run probar-rls` (nueva sección 8g: alta de ausencia por `teacher`, duplicado alumno+slot+día contra `asistencia_uq_alumno_slot_dia_activa` con presencia Y con ausencia ya existente, `student` sin acceso a `registrar_ausencia`, anular una ausencia con motivo) | PENDIENTE |
| 14 | Aplicar la migración `011_justificacion_ausencia` en `dev`, **después** de la fila 13 (`010`) — **NO aplicar todavía** | R-02 | **Antes de nada, responder la pregunta #16 de §6** (hallazgo #8 de auditoría, severidad alta, `ABIERTO`: `motivo_justificacion` incluye valores de dato de salud del artículo 9 del RGPD —`enfermedad`, `cita_medica`— sin decisión expresa del dueño que los autorice). Solo si la respuesta es "aceptar tal cual" (opción a de la pregunta #16), seguir con: `git pull` y `npm run migrate` en local; comprobar que `esquema_version()` devuelve `11`; ejecutar también `npm run probar-rls` (nueva sección 8h: justificar dentro de la ventana de edición del profesor, motivo fuera de la lista cerrada rechazado, justificar un registro que no está ausente rechazado, fuera de la ventana rechazado para `teacher` y aceptado para `administrator`). Si la respuesta es reformular o retirar el campo (opciones b/c), esta migración necesita reescribirse antes de aplicarse — no ejecutar `npm run migrate` sobre el fichero actual en ese caso | PENDIENTE — bloqueada también por la pregunta #16 de §6, no solo por el paso de aplicar |
| 15 | Aplicar la migración `012_registro_salida` en `dev`, **después** de la fila 14 (`011`) | R-03 | `git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `12`, y ejecutar también `npm run probar-rls` (nueva sección 8i: marcar salida dentro de la ventana del profesor, ajustar una salida ya marcada, marcar dos veces rechazado, ajustar a una hora anterior o igual a la entrada rechazado, marcar y ajustar combinados en la misma llamada rechazado, ajustar una salida no marcada rechazado, marcar salida de una ausencia rechazado, fuera de la ventana rechazado para `teacher` y aceptado para `administrator`) | PENDIENTE |
| 16 | Aplicar la migración `014_calendario_cierres` en `dev` | R-12 | `014` no depende conceptualmente de `010`/`011`/`012` (tabla nueva, sin relación con `asistencia`), pero el runner aplica SIEMPRE en orden numérico dentro de la misma invocación: no llegará a `014` mientras `010`/`011`/`012` sigan pendientes, y la fila 14 de esta misma tabla pide explícitamente **no aplicar `011` todavía** (pregunta #16 de §6 sin responder). Así que, en la práctica, esta fila queda detrás de la 14 aunque no exista ninguna dependencia real entre ambas migraciones — si el dueño quiere `014` sin esperar a que se resuelva la pregunta #16, tocaría aplicarla a mano en el editor SQL de `dev` fuera del runner, o renumerarla por delante de `011`/`012` (ninguna de las dos aplicada todavía, así que renumerar no rompe nada ya aplicado). Vía normal: `git pull` y `npm run migrate` en local (una vez resueltas las filas 13-15). Al terminar, comprobar que `esquema_version()` devuelve `14`, y ejecutar también `npm run probar-rls` (nueva sección 8j: alta y edición de un cierre por `administrator`, rechazadas para `teacher`, el `teacher` lee un cierre activo pero no uno inactivo; más `cierre_centro` añadida a los barridos obligatorios de `student`, sección 6, y `anon`, sección 8f) | PENDIENTE |
| 17 | Aplicar la migración `013_excepcion_slot` en `dev` (y, en el mismo `npm run migrate`, `010_registro_ausencias`, editada en este mismo commit — ver `db/APLICADAS.md`) | R-06 | `013` no depende conceptualmente de `011`/`012` (tabla nueva sobre `slot_horario`, no sobre las columnas que añaden esas dos), pero SÍ depende de `010` (edita `registrar_ausencia`, que `010` crea) y el runner aplica siempre en orden numérico: en la práctica queda detrás de las tres, igual que la fila 16 con `014`. `git pull` y `npm run migrate` en local (una vez resueltas las filas 13-15). Al terminar, comprobar que `esquema_version()` devuelve `13` (o más, si `011`/`012` ya se resolvieron), y ejecutar también `npm run probar-rls` (nueva sección 8k: administrator declara sustitución/cancelación, teacher/student rechazados, fecha que no coincide con el día de la semana rechazada, cancelación sin motivo rechazada, retroactiva sobre un slot con registros rechazada, cancelación bloquea registrar_asistencia/registrar_ausencia a cualquiera, el titular no registra el día que le sustituyen, el sustituto SÍ registra y SÍ lee el slot ajeno, desactivar rechazada con registros y permitida sin ellos; más `excepcion_slot` añadida a los barridos obligatorios de `student`, sección 6, y `anon`, sección 8f) | PENDIENTE |
| 18 | Aplicar la migración `015_aviso_cancelacion_slot` en `dev`, **junto con** la fila 17 (`013`) | R-14 | `015` amplía `excepcion_slot`, que crea `013`: el runner no llegará a `015` mientras `013` siga pendiente, así que en la práctica ambas se aplican en la misma pasada de `npm run migrate` (orden numérico). No crea ninguna tabla nueva: solo dos columnas (`aviso_familias_quien`/`aviso_familias_en`) y una RPC (`registrar_aviso_cancelacion_slot`), así que no hay ningún barrido nuevo que añadir a las secciones 6/8f de `db/pruebas_rls.sql` (esas son por TABLA, y `excepcion_slot` ya está en las dos desde `013`). `git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `15` (o más, si `011`/`012` ya se resolvieron), y ejecutar también `npm run probar-rls` (nueva sección 8l: administrator anota el aviso sobre una cancelación propia, teacher/student rechazados, quien vacío rechazado, y una sustitución rechazada por no admitir aviso) | PENDIENTE |
| 19 | Aplicar la migración `016_resolver_profesor_por_email` en `dev` | R-08 | `016` no depende conceptualmente de ninguna migración anterior (no toca ninguna tabla, solo añade una función nueva que lee `auth.users`), pero el runner aplica siempre en orden numérico dentro de la misma invocación: quedará detrás de las filas 13-18 mientras sigan pendientes. `git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `16` (o más, si `011`/`012`/`013`/`014`/`015` ya se resolvieron), y ejecutar también `npm run probar-rls` (nueva sección: administrator resuelve el email de un teacher activo, un email sin cuenta o de un administrator no devuelve ninguna fila sin error, teacher/student rechazados) | PENDIENTE |

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
| P-01 | **Ampliación de T-09: bloqueo de la cuenta al tercer intento fallido y renovación de contraseña por el administrador.** Implementada: `db/002_bloqueo_cuenta.sql` (columnas `perfil.intentos_fallidos`/`perfil.bloqueado`, `rol_actual()` redefinida con `not bloqueado`, RPC `registrar_intento_fallido`/`admin_desbloquear_usuario`), `gestorSesion.ts` (`CuentaBloqueada`, conteo de fallos, `desbloquearUsuario`), 13 tests nuevos, `DEVELOPERS.md` con la consulta de desbloqueo manual del dueño. La renovación de contraseña no necesitó código nuevo: ya era `solicitarRecuperacionContrasena` desde T-09 | **No es una autopropuesta del agente: es una decisión del dueño** del 2026-08-27 (respuestas #4 y #5 de §6), registrada como desviación en §7. Se encola aquí porque la hoja de ruta es inmutable y no admite una T-XX nueva | **RESUELTA 2026-08-31** — migración `002_bloqueo_cuenta` aplicada y verificada (fila 4 de §3), anotada en `db/APLICADAS.md` | **Aprobada y priorizada por el dueño el 2026-08-27: se atacó ANTES de T-10.** No hay veto |
| P-02 | **Backlog técnico (deuda de calidad, no urgente): recortar `avatar_ruta` del `select` de `listarAlumnos`.** `src/datos/alumnos.ts` (constante `SELECT_CON_CENTRO`) trae hoy `avatar_ruta` en el payload de la lista paginada de `administrator`, aunque `pantallaFichaAlumno.ts` no pinta el avatar en ninguna fila de esa lista. No es una fuga real (RLS ya reduce a cero filas para cualquier otro rol y el único consumidor ya tiene acceso legítimo a la columna), pero es superficie de más que conviene recortar antes de que T-14/T-19 le den un uso real al avatar, para no arrastrar el hábito a un listado que algún día podría compartirse con `teacher` — coherente con la regla de diseño "avatar donde el conjunto es estable, texto donde el conjunto es transitorio" | origen: auditoría #3 (severidad baja, minimización de datos) | **RESUELTA 2026-08-31**, al llegar a T-14 tal como preveía esta misma fila: `listarAlumnos` ya no pide `avatar_ruta` (`SELECT_LISTADO`, columnas explícitas en vez de `*`); nuevo tipo `AlumnoListado` para que el recorte quede reflejado también en el tipo, no solo en el `select` | — |
| P-03 | **Backlog técnico (deuda de calidad, no urgente): actualizar una frase residual de `db/MODELO.md`.** La línea 194, en la sección de `evento_error`, sigue diciendo que su política de lectura está "todavía por escribir (T-10)", pese a que T-10 ya escribió `evento_error_admin_leer` en `003_politicas_rls.sql` y el resto del propio documento (desde la línea 221) sí está al día. Sin impacto funcional ni de seguridad: es higiene documental | origen: auditoría #4 (severidad baja, gobernanza documental) | **RESUELTA 2026-08-31**: la línea ya dice `evento_error_admin_leer` (`003_politicas_rls.sql`, T-10) en vez de "todavía por escribir" | — |
| P-04 | **Urgente (§0.3): completar la cobertura de escritura de `db/pruebas_rls.sql`.** Añadidos los casos que faltaban: `UPDATE` (administrator permitido / teacher prohibido) para `centro_estudios`, `alumno` y `slot_horario`; `UPDATE` y `DELETE` (administrator permitido / teacher prohibido) para `persona_referencia` (la única política `for all` del esquema, y la única tabla con borrado real); y una sección nueva que intenta `TRUNCATE` sobre las ocho tablas de `public` impersonando a `administrator` y a `teacher`, siempre esperando fallo — el privilegio que RLS no filtra en absoluto y que ya causó el incidente de `000b_arreglo_permisos.sql`. Los casos `UPDATE`/`DELETE` prohibidos se verifican con `ROW_COUNT = 0` (RLS los excluye en silencio, no lanza excepción), a diferencia de `INSERT` que sí lanza error — documentado en `DECISIONES_TECNICAS.md`. El fichero sigue sin poder ejecutarse en esta sesión contra `dev` real (sin `SUPABASE_ACCESS_TOKEN`, §0.1): queda listo para que la primera ejecución real de `npm run probar-rls` del dueño (tras aplicar `002`/`003`) lo valide con la cobertura completa | origen: hallazgo #2 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-08-29) | **IMPLEMENTADA 2026-08-31**, atendida antes de la cola normal por ser hallazgo de severidad alta (§0.3). Pendiente de que el auditor la reevalúe y cierre el hallazgo #2 en su próxima pasada (el programador no edita `auditoriacontinua.md`) | — |
| P-05 | **Backlog técnico (calidad de diagnóstico, no urgente): los CLI descartan el cuerpo del error de la Management API.** `ErrorManagementApi` guarda la respuesta completa en su campo `cuerpo` (`herramientas/migraciones/clienteManagementApi.ts:24`), que es donde Postgres devuelve el mensaje real, el `SQLSTATE`, el `HINT` y el `CONTEXT`. Pero el `catch` final de `herramientas/probarRls.ts:60` y el de `herramientas/migrar.ts:76` imprimen solo `error.message`, que es la plantilla genérica del cliente. Resultado: cualquier fallo de SQL llega como una única línea sin información accionable. El arreglo es imprimir `cuerpo` cuando el error es un `ErrorManagementApi`, en los dos CLI, con su test | **Coste de diagnóstico real, medido**: el 2026-08-31 el dueño ejecutó `npm run probar-rls` tras aplicar `002`/`003` y recibió solo «Management API respondió 400 al ejecutar SQL», sin causa. Hubo que reproducir la llamada por fuera (editor SQL de `dev`) para obtener el mensaje de Postgres que identificaba el fallo en dos minutos. Mientras esto no se arregle, cada fallo de `migrate` o de `probar-rls` cuesta ese rodeo | **RESUELTA 2026-09-02** — `formatearErrorCli` (nuevo, `herramientas/migraciones/formatoErrorCli.ts`, 4 tests) añade `error.cuerpo` a la salida cuando el error es un `ErrorManagementApi` y no está vacío; `migrar.ts`/`probarRls.ts` lo usan en su `catch` final en vez de `error.message` a pelo. Detalle en `DECISIONES_TECNICAS.md` | — |
| P-06 | **Backlog técnico (hueco de cobertura, no urgente): la batería de RLS no barre nunca el rol `anon`.** `pg_temp.impersonar_anon()` está definida en `db/pruebas_rls.sql:98` y **no se invoca desde ningún sitio**: es código muerto. La sección 6 hace el barrido obligatorio del `student` sobre las siete tablas, pero no existe el equivalente para `anon` — que es precisamente el rol con el que viaja la clave anónima en el paquete del navegador, y por tanto el único que un atacante tiene sin autenticarse. El arreglo es replicar el bucle de la sección 6 usando `impersonar_anon()`, y añadir `storage.objects` a la lista de tablas barridas | **Es el rol de la superficie de ataque no autenticada.** Las políticas de `003_politicas_rls.sql` no conceden nada a `anon` y `--verificar-privilegios` no encuentra violaciones, así que no hay indicio de fallo hoy: lo que falta es la prueba en ejecución que lo demuestre. Es lo que quedó fuera de **P-04**, que el 2026-08-31 atendió el hallazgo **#2** del auditor añadiendo los casos de `UPDATE`/`DELETE`/`TRUNCATE` a esta misma batería pero no tocó la superficie no autenticada | **RESUELTA 2026-09-02** — `db/pruebas_rls.sql` gana la sección **8f**: barrido de `anon` sobre las nueve tablas de `public` (incluida `perfil`, que la sección 6 de `student` excluye por su propia fila legítima — `anon` no tiene ninguna) más `storage.objects`, mismo patrón de bucle que la sección 6 pero esperando rechazo de PRIVILEGIO (`permission denied`) en vez de RLS, salvo en `storage.objects`, donde se acepta cualquiera de los dos desenlaces por si conserva el GRANT por defecto de Supabase. Pendiente de que la primera ejecución del dueño con `npm run probar-rls` lo confirme en vivo, igual que el resto del fichero | — |
| P-07 | **Backlog técnico (fiabilidad del veredicto y cobertura de la semilla): la batería de RLS canta verde con la mayoría de los casos sin ejecutar.** Dos piezas, del mismo síntoma. (a) `pg_temp.omitir` inserta sus filas con **`ok = true`** (`db/pruebas_rls.sql:129`), así que `resumirPruebasRls` las cuenta como no fallidas: `huboFallo` es `false` (`herramientas/migraciones/resultadoPruebasRls.ts:33`), el CLI imprime «ningún acceso prohibido tuvo éxito» y sale con código 0 aunque no se haya ejercitado ni una sola aserción de aislamiento. El arreglo es que el veredicto pondere las omisiones: negarse a dar el visto bueno —o al menos gritarlo— cuando quedan casos sin ejecutar. (b) `USUARIOS_SEMILLA` (`herramientas/semilla/datosFicticios.ts:14`) crea **un solo `teacher`**, así que el caso `slot_horario / teacher2 no lee el ajeno` no puede ejecutarse nunca, ni ahora ni después de sembrar: hace falta un segundo profesor en la semilla | **Evidencia medida, ejecución del 2026-08-31** (primera vez que la batería llegó a correr entera, tras el grant de `_resultados_prueba_rls`): **16 comprobaciones, 10 omitidas, 0 fallidas** — y aun así veredicto verde y salida 0. (Medición anterior a **P-04**, que ese mismo día amplió la batería: un run nuevo dará números mayores, pero el defecto del veredicto es el mismo.) De las 6 que sí corrieron, 4 son el camino feliz del `administrator` y las 2 restantes (`asistencia` / `asistencia_historial`) pasaron por **GRANT de tabla** (`permission denied for table`), no por ninguna política. Cero casos de `teacher`, cero de `student`, cero de `teacher2`. Un veredicto verde en estas condiciones es peor que un fallo: invita a dar T-10 por verificada cuando no lo está. El punto (b) cubre además la que probablemente sea la aserción más importante del producto: que un profesor no vea los datos de otro | **RESUELTA 2026-09-02 — el punto (a), que era el que seguía abierto, ya está implementado** (el punto (b) ya estaba hecho desde el 2026-08-31, ver abajo). `avisoOmisiones` (nuevo, `herramientas/migraciones/resultadoPruebasRls.ts`, 3 tests) devuelve un aviso propio, aparte del resumen de recuento, siempre que `resumen.omitidas > 0` — nombra cuántas de cuántas se ejecutaron de verdad y remite al detalle `[OMITIDO]` de cada fila. `herramientas/probarRls.ts` lo imprime con `console.warn` justo después de la línea de recuento, tanto si el veredicto final es verde como si no: ya no puede quedar oculto dentro de una única línea de texto. No cambia el código de salida — una omisión legítima (el bucket sin avatares reales, un entorno sin segundo profesor) sigue sin ser un fallo, que es justo lo que ya garantizaba `resumirPruebasRls` desde T-10 — solo deja de ser silenciosa. **Punto (b), 2026-08-31:** `USUARIOS_SEMILLA` ya trae un segundo profesor, y la siembra de usuarios se sacó de detrás del marcador de idempotencia a `herramientas/semilla/usuarios.ts` (con sus tests) — antes, añadir un usuario a la lista no servía de nada, porque la siguiente ejecución veía el centro marcador y se iba sin crearlo. Verificado el 2026-08-31: tras `npm run seed`, `slot_horario / teacher2 no lee el ajeno` pasa de `OMITIDO` a `OK` y las omisiones de la batería bajan a 3, solo las del bucket de T-14. El hallazgo **#2** ya lo atendió **P-04**, a la espera de que el auditor lo cierre | — |
| P-08 | **Urgente (§0.3): regresión en `db/pruebas_rls.sql` — la sección 1b renombraba el fixture del que dependían las secciones 2, 3 y 4.** Para ejercitar `centro_estudios_admin_actualizar`, la sección 1b que añadió **P-04** hace `update public.centro_estudios set nombre = '__prueba_rls__centro_admin_editado'`. Las secciones 2, 3 y 4 seguían buscando ese centro **por su nombre original**, no lo encontraban y hacían `return`: diez comprobaciones desactivadas en cascada, en silencio y sin una sola fila `FALLO`. La causa de fondo era que la batería enlazaba sus secciones por una **clave natural mutable** mientras que los usuarios ya se pasaban por id en `_fixture_usuarios`. **Arreglado enlazando también los datos por id:** tabla temporal `_fixture_datos` (con los mismos grants que la de resultados, porque se escribe estando impersonado), helpers `pg_temp.recordar_dato`/`pg_temp.dato`, y sustituidas las siete búsquedas por clave natural — dos del centro, cuatro del alumno y una del slot. **Documentado pero NO arreglado**, para quien retome esto: el `return` temprano de la sección 4 registra **una sola** omisión antes de salir, así que `slot_horario / teacher lee el suyo` y `slot_horario / teacher2 no lee el ajeno` no aparecen en la salida ni siquiera como `OMITIDO` — desaparecen del recuento, que es peor que omitirse | **Encontrada ejecutando la batería contra `dev` real, no leyendo el código** (el auditor y el propio agente que escribió 1b la habían leído sin verla). Ejecución del 2026-08-31: **42 comprobaciones, 13 omitidas, 0 fallidas** y veredicto verde — de esas 13, **diez eran la cascada** y solo tres legítimas (el bucket de T-14). Consecuencia: no llegó a ejecutarse nada de `alumno`, `persona_referencia` ni `slot_horario`, ni el aislamiento entre dos profesores, ni —la más grave— la comprobación de que un `teacher` no puede leer `email_alumno` ni `telefono_alumno` por PostgREST, que es el requisito 4 de T-12/T-13 y punto de control permanente del auditor. Es la demostración práctica de **P-07**: un verde con un tercio de la batería inhabilitado invita a dar T-10 por verificada | **IMPLEMENTADA Y VERIFICADA 2026-08-31** por el dueño en local, atendida al momento por bloquear la verificación de T-10 (§0.3). Confirmada con `npm run probar-rls` contra `dev`: **51 comprobaciones, 4 omitidas, 0 fallidas** — las diez omisiones en cascada desaparecieron y la sección 4 llegó entera, así que el `return` temprano documentado arriba no se disparó en este run (sigue latente). *Corrección: el criterio de cierre escrito aquí decía «bajar de 13 a 3» y estaba mal por uno — las omisiones legítimas son **cuatro**: las tres del bucket de T-14 más `slot_horario / teacher2 no lee el ajeno`, que esperaba un segundo profesor en la semilla y es **P-07**. Sembrado ese profesor ese mismo día, la cuenta final quedó en **3**.* | — |
| P-09 | **Backlog técnico (hueco de cobertura en la aserción más sensible del producto): la batería no puede probar quién ve el avatar de un alumno, y por sí sola no podrá nunca.** La sección 7 de `db/pruebas_rls.sql` **no sube ningún objeto**: mira si YA existe alguno bajo la ruta de un alumno activo o inactivo y, si no lo encuentra, omite — decisión honesta, no fabrica un falso positivo. Con el bucket recién creado y vacío (`004_bucket_avatares`, 2026-08-31), las dos lecturas quedan omitidas: `avatares / teacher lee alumno activo` y `avatares / teacher lee alumno inactivo (debe fallar)`. Seguirán así hasta que alguien suba avatares a mano por la interfaz de T-14, que todavía no está programada. **Arreglo propuesto:** que la batería cree sus propios fixtures. Lo que se audita es una **política**, y una política actúa sobre la fila de `storage.objects`, no sobre los bytes del fichero: basta insertar dos filas —una bajo un alumno activo y otra bajo uno dado de baja— dentro de la transacción que ya termina en `rollback`. Requiere además un alumno inactivo, que la semilla hoy no crea | **La lectura es donde vive el riesgo de este bucket.** Lo que sí quedó probado el 2026-08-31 es la **escritura** (`teacher escribe` bloqueado por política RLS sobre `storage.objects`). Lo que falta es que un profesor no conserve acceso a la fotografía de un alumno que ya no está activo — y los puntos de control permanentes de este documento califican un avatar de menor accesible por quien no debe como **el peor fallo posible del proyecto**. El bucket es privado y las políticas están escritas en `003_politicas_rls`, así que no hay indicio de fallo hoy: lo que falta es la prueba en ejecución, que es exactamente el argumento con el que el auditor abrió el hallazgo **#2** | **IMPLEMENTADA 2026-08-31**, en la misma sesión que completó T-14: la sección 7 crea ahora sus propios fixtures (un alumno recién dado de baja y dos filas de `storage.objects`) dentro de la transacción de prueba, sin depender de un avatar real subido por la interfaz. Pendiente de que la primera ejecución del dueño con `npm run probar-rls` lo confirme en vivo, igual que el resto del fichero | — |
| P-10 | **Backlog técnico (fiabilidad del veredicto, hermano de P-07): las comprobaciones "debe fallar" de la batería aprobaban con CUALQUIER error, no con el suyo.** Cada bloque `prohibido` de `db/pruebas_rls.sql` registraba `ok = true` desde su `exception when others`, sin mirar `sqlerrm`. El 2026-09-01 salió a la luz de la peor forma posible: el bug de `aplicar_limite_tasa` (arreglado en `006`) tumbaba las **trece** comprobaciones de la sección 7b y solo cuatro salieron en rojo —las de acceso *permitido*—; las otras nueve cantaron **`[OK]` por el motivo equivocado**, porque `column reference is ambiguous` también es un error. **Implementado:** `pg_temp.registrar_prohibido(celda, array[…patrones ILIKE…], sqlerrm)` sustituye al patrón perezoso en los **26** bloques del fichero; un error que no encaje pasa a `FALLO` con el `sqlerrm` real precedido de `ERROR INESPERADO`. Los rechazos de autorización aceptan los dos mecanismos legítimos (`%row-level security%` o `%permission denied%`); los de dominio de la 7b exigen su mensaje concreto, tomado de la ejecución real | El valor de una batería de seguridad está en que un verde signifique lo que dice. Un fallo de **implementación** de una RPC se disfrazaba de control de acceso funcionando: justo el escenario que esta batería existe para descartar. Origen: hallazgo propio del 2026-09-01 | **IMPLEMENTADA Y VERIFICADA EN EJECUCIÓN 2026-09-01**: los 26 bloques pasan exigiendo su motivo, ninguno cae en `ERROR INESPERADO`. Cubierta además por `herramientas/migraciones/pruebasRlsEstatico.test.ts`, que impide que el patrón perezoso vuelva a colarse | — |
| P-11 | **Urgente (§0.3): los finales de línea podían invalidar el hash de cualquier migración ya aplicada, y de hecho ya habían corrompido tres filas de `db/APLICADAS.md`.** El runner guarda en `esquema_migracion` el SHA-256 del fichero **tal cual está en el disco**, y los finales de línea entran en ese hash: el mismo SQL en CRLF y en LF da dos hashes distintos. Con `core.autocrlf=true` y sin `.gitattributes`, quién reescribe qué fichero y cuándo dependía de si a git le tocaba materializarlo en un checkout. Efecto ya materializado: las filas 002, 003 y 004 de `APLICADAS.md` documentaban el hash **LF** mientras el ledger de `dev` guardaba el **CRLF** — tres valores que no correspondían a nada. Efecto latente, peor: un `git clone` en otra máquina (o con otro `core.autocrlf`) reescribiría los `.sql` y `npm run migrate` abortaría con `ErrorHashCambiado` sobre migraciones que no han cambiado ni una letra, **sin poder aplicar ninguna nueva**. **Implementado:** (a) `.gitattributes` clava cada `db/*.sql` a los finales de línea con los que está su hash en el ledger —CRLF las 001-005, LF la 006, que es la única que se escribió y se aplicó así—; (b) los tres hashes de `APLICADAS.md` corregidos contra la salida real de `npm run migrate -- --estado`; (c) `herramientas/migraciones/hashesAplicadas.test.ts` (3 casos) contrasta en cada `npm test` el hash documentado contra el fichero en disco, sin credenciales ni red | La inmutabilidad por hash es la garantía que sostiene todo el protocolo de migraciones de §0.1, y estaba colgando de un detalle de configuración de git que nadie había declarado. No es teórico: ya había producido documentación incorrecta. Origen: hallazgo propio del 2026-09-01, al verificar los finales de línea mientras se preparaba la migración `006`. La verificación contra el ledger la hizo el dueño con `npm run migrate -- --estado`, único sitio donde vive la verdad de esa columna | **IMPLEMENTADA 2026-09-01.** Verificada: `git add --renormalize db/` no produce ningún cambio (el disco ya coincide con lo que daría un checkout limpio bajo las nuevas reglas) y los 3 tests nuevos pasan contra los seis ficheros reales | — |
| P-12 | **Urgente (§0.3): las cuatro comprobaciones "permitido" de `registrar_asistencia` no podían pasar nunca, y su fallo falsificaba además otras dos.** `db/pruebas_rls.sql` llamaba a la RPC con `select public.registrar_asistencia(...) into v_fila`. La función devuelve `public.asistencia`, es decir **una sola columna de tipo compuesto**; `INTO` sobre un `%rowtype` reparte las COLUMNAS del resultado entre los campos de la variable, así que intentaba meter la fila entera en `v_fila.id`, un `uuid`: `invalid input syntax for type uuid`, con la tupla completa en el mensaje. Y el daño no acababa ahí: en plpgsql un bloque con `exception` es un savepoint, así que al saltar el error se **deshacía el alta que la RPC sí había hecho**, y las dos comprobaciones siguientes (duplicado alumno+slot+día y `peticion_id` repetido) se quedaban sin fila con la que chocar y reportaban "se insertó sin error". Seis fallos, una sola causa. **Implementado:** `select * into v_fila from public.registrar_asistencia(...)` en los cuatro sitios, que es la forma que expande el compuesto en columnas | La RPC estaba bien desde que se aplicó la `006`: lo que fallaba era la única herramienta capaz de demostrarlo, y lo hacía de una manera que además invalidaba en silencio las dos aserciones de duplicado, las que protegen contra pasar lista dos veces al mismo alumno. Origen: hallazgo propio del 2026-09-01, al leer la segunda ejecución de `npm run probar-rls` | **IMPLEMENTADA Y VERIFICADA EN EJECUCIÓN 2026-09-01**: las cuatro altas pasan, y las dos comprobaciones de duplicado ya chocan de verdad — `asistencia_uq_alumno_slot_dia_valida` y `asistencia_peticion_id_unico` aparecen por su nombre en el detalle. Cubierta por `pruebasRlsEstatico.test.ts` | — |
| P-13 | **Backlog técnico (higiene documental, no urgente): actualizar una frase residual de `db/MODELO.md` sobre el avatar.** La línea 296 (sección T-14) sigue diciendo "falta únicamente el punto de montaje real en una pantalla (T-16)", escrita antes de que T-16 existiera. T-16 ya está `COMPLETADA` y el bloque de avatar ya está montado de verdad en `src/ui/pantallaFichaAlumno.ts` (`montarBloqueAvatar`, línea 524, cableado en la 1097). Mismo patrón exacto que el hallazgo #4, ya cerrado por P-03 | origen: hallazgo #5 de `auditoriacontinua.md` (severidad baja, gobernanza documental) | **RESUELTA 2026-09-02** — `db/MODELO.md:371-372` ya no dice "falta únicamente el punto de montaje"; dice que está montado de verdad en `pantallaFichaAlumno.ts` (`montarBloqueAvatar`), desde T-16 | — |
| P-14 | **Backlog técnico (higiene documental, no urgente): corregir la numeración cruzada de las preguntas abiertas #12/#13 de §6 de este documento.** La tabla de §6 es correcta (`#12` = duplicado mismo alumno/slot/día; `#13` = ventana retroactiva máxima), pero la narrativa de la sesión de T-18 más arriba en este mismo fichero intercambia los dos números, y `DECISIONES_TECNICAS.md:147` repite el mismo intercambio. Sin impacto funcional (el código usa en los dos casos el valor conservador correcto): es solo una referencia cruzada mal etiquetada para quien busque la pregunta por su número desde la narrativa en vez de desde la tabla | origen: hallazgo #6 de `auditoriacontinua.md` (severidad baja, gobernanza documental) | **RESUELTA 2026-09-02** — corregidas las dos menciones narrativas de este documento (línea 539: ventana retroactiva = #13; línea 545: duplicado = #12) y la de `DECISIONES_TECNICAS.md:147`, ya alineadas con la tabla de §6 | — |
| P-15 | **Backlog técnico (código muerto, no urgente): `columnasVisiblesFichaAlumno` no la usa ninguna pantalla.** `src/dominio/permisosUi.ts:56` la define y la testea (`permisosUi.test.ts:47-62`), pero `grep -rn "columnasVisiblesFichaAlumno" src/` solo devuelve su propia definición y su test — no hay ningún consumidor real. No es una fuga (la protección real de las columnas de contacto vive en el `GRANT` de columna de `003_politicas_rls.sql` y en la vista `alumno_ficha`, ninguno de los dos depende de esta función), pero acumula una función que aparenta ser parte del control de acceso sin estar en el camino real. El programador debe decidir, al atenderla, entre conectarla a la pantalla de ficha (si la intención original era filtrar columnas también en el cliente) o eliminarla | origen: hallazgo #7 de `auditoriacontinua.md` (severidad baja, calidad de código) | **RESUELTA 2026-09-02 — eliminada, no conectada.** No existe ninguna pantalla de ficha para `teacher` en el roadmap ni puede existir dentro del alcance actual (§0.2: `teacher` "no gestiona fichas ni ve datos de contacto ni personas de referencia", regla permanente); el escenario que la función preveía está prohibido, no solo pendiente. La protección real de las columnas de contacto sigue viviendo en el `GRANT` de columna de `003_politicas_rls.sql` y en la vista `alumno_ficha`. Detalle en `DECISIONES_TECNICAS.md` | — |
| P-16 | **Urgente (§0.3): un `declare` mal colocado en la sección 8e tumbaba la batería de RLS COMPLETA, no una comprobación.** `db/pruebas_rls.sql` declaraba `v_filas` (y `v_visto`) en el `declare` del primer sub-bloque de cada rama de la sección 8e —el que hace el `SELECT` del perfil ajeno— y leía `v_filas` en el SEGUNDO `begin … end;`, que es **hermano** del primero, no hijo: en plpgsql un `declare` pertenece solo al bloque que lo sigue, así que ahí la variable no existe. Y como el error es de COMPILACIÓN del `do` (`42601: "v_filas" is not a known variable`) y el fichero se envía a la Management API en una sola sentencia, no fallaba la sección 8e: no llegaba a ejecutarse **ninguna** comprobación del fichero. **Arreglado** subiendo `v_filas` al `declare` del propio `do`, que es donde ya vivía `v_admin_id` y sirve a las dos ramas (`teacher` y `student`) — mismo patrón que la sección 4b, en vez de repetir un `declare` por sub-bloque. **Blindado** con un quinto test en `herramientas/migraciones/pruebasRlsEstatico.test.ts`, que sigue los ámbitos `declare`/`begin`/`end;` del fichero y falla si una variable `v_…` se lee desde un bloque que no la declara ni está dentro del que lo hace | **El fallo lo encontró la ejecución real, no la lectura**: T-24 escribió la sección 8e el 2026-09-02 y pasó `typecheck`, `lint`, 942 tests y `build` — ninguna de esas cuatro puertas mira dentro de un `do $$ … $$`, y los cuatro tests estáticos que ya existían (P-10/P-12) cubrían otras tres formas de romper este fichero, no los ámbitos. Es además la tercera vez que un defecto de la propia batería la inhabilita en silencio o en bloque (P-08 la cascada de fixtures, P-12 la fila compuesta): la herramienta que demuestra el aislamiento de datos vuelve a ser la pieza menos protegida del proyecto, y por eso el arreglo incluye la comprobación estática y no solo la línea movida. Origen: ejecución del dueño del 2026-09-03 | **IMPLEMENTADA Y VERIFICADA EN EJECUCIÓN 2026-09-03** — `npm run probar-rls` contra `dev`: **105 comprobaciones, 0 omitidas, 0 fallidas**, «ningún acceso prohibido tuvo éxito». Es la primera ejecución de la batería sin una sola omisión (las 3 legítimas del bucket de T-14 las cerró P-09 con sus propios fixtures). Las cuatro comprobaciones de la sección 8e que T-24 nunca llegó a ver correr aparecen ahora en verde por su motivo: `perfil / teacher no puede modificar perfiles ajenos` y su gemela de `student` con `filas_afectadas=0`. Criterio de cierre del blindaje, comprobado antes de commitear: con el fichero revertido al estado roto, el test nuevo falla nombrando las seis referencias fuera de ámbito (líneas 1650/1651/1680/1681); con el arreglo, pasa | — |
| P-17 | **Backlog técnico (higiene documental, no urgente): faltan dos filas en §7 de este documento.** `roadmap/SEGUIMIENTO.md` §7 ("Desviaciones respecto a la hoja de ruta original") no recoge (a) la corrección real de T-14 hecha dentro de T-25 (requisito 8, aviso de consentimiento del avatar, ausente de la interfaz pese a que T-14 llevaba `COMPLETADA` desde el 2026-08-31, corregida en el commit `4499eaf`) ni (b) el hallazgo #8 de `auditoriacontinua.md` (categoría de dato de salud en R-02). Ambas desviaciones ya están documentadas en otro sitio (`DECISIONES_TECNICAS.md`/`HISTORIAL_SESIONES.md` la primera; el propio `auditoriacontinua.md` y la pregunta #16 de §6 la segunda), así que no se han perdido, pero §7 deja de servir como resumen de un vistazo, que es su propósito. Al atenderla: añadir una fila por cada desviación, con el mismo formato que las ya existentes | origen: hallazgo #9 de `auditoriacontinua.md` (severidad baja, gobernanza documental) | **RESUELTA 2026-09-07** — añadidas las dos filas de §7 (T-14/T-25, 2026-09-04; R-02, 2026-09-05), con el mismo formato que las ya existentes | — |
| P-18 | **Urgente (§0.3): la sección 8 de `db/pruebas_rls.sql` (barrido de `TRUNCATE` por `authenticated`) no incluía las dos tablas nuevas del lote anterior, `cierre_centro` (R-12) y `excepcion_slot` (R-06).** El array literal de tablas de la sección 8 (`'perfil', 'centro_estudios', 'alumno', 'persona_referencia', 'slot_horario', 'asistencia', 'asistencia_historial', 'evento_error', 'limite_tasa'`) se quedó igual que antes de R-06/R-12, mientras que los otros dos barridos obligatorios del mismo fichero (sección 6, `student`; sección 8f, `anon`) sí se ampliaron correctamente con las dos tablas nuevas. `TRUNCATE` es el privilegio que RLS no filtra en absoluto — el que ya causó el incidente de `000b_arreglo_permisos.sql` — y es la única comprobación de este proyecto pensada para detectar automáticamente que Supabase reintroduce el `GRANT` por defecto en cada tabla nueva, así que dejar sin ejercitar precisamente las dos tablas más recientes anulaba el propósito del barrido para ellas. **Implementado:** añadidas `'cierre_centro', 'excepcion_slot'` al array de la sección 8 | origen: hallazgo #10 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-09-08, "calidad de la batería de pruebas / privilegios de tabla") — verificado por el auditor que los `GRANT` reales de `013_excepcion_slot.sql`/`014_calendario_cierres.sql` son correctos hoy (ninguna fuga activa), y que el hueco era solo de cobertura de la prueba, no del esquema | **IMPLEMENTADA 2026-09-08**, atendida antes de la cola normal por ser hallazgo de severidad alta (§0.3). Verificación pre-push completa en verde (`npm run typecheck`, `npm run lint`, `npm test` 1265/1265, `npm run build`); ninguna de las dos migraciones está aplicada todavía en `dev` (`db/APLICADAS.md`, sin cambio), así que la primera ejecución real de `npm run probar-rls` tras aplicar `013`/`014` es quien confirmará las once tablas en vivo. Pendiente de que el auditor reevalúe y cierre el hallazgo #10 en su próxima pasada | — |
| P-19 | **Backlog técnico (higiene documental, no urgente): falta una fila en §7 de este documento para la desviación de R-05 (2026-09-07).** Mismo patrón exacto que P-17 (hallazgo #9, ya `RESUELTA`): §7 se quedó en la fila de R-02 (2026-09-05) sin ninguna fila para R-05, pese a que esa sesión abrió la pregunta #17 de §6 por el mismo tipo de contradicción con §0.2 (aquí, a la inversa: alcance de rol pedido por la spec y no concedido sin decisión del dueño). Sin impacto funcional — la desviación real ya está documentada en `DECISIONES_TECNICAS.md` y en la pregunta #17 de §6 —, pero reduce el valor de §7 como resumen de un vistazo | origen: hallazgo #11 de `auditoriacontinua.md` (severidad baja, gobernanza documental, "mismo patrón que el hallazgo #9, ya RESUELTO") | **RESUELTA 2026-09-08** — añadida la fila de §7 (R-05, 2026-09-07), con el mismo formato que las ya existentes | — |
| P-20 | **Urgente (§0.3): la cola offline de R-07 encolaba cada toque SIN el instante en que ocurrió, así que un vaciado tardío lo fechaba a la hora de la reconexión, no a la del toque real.** Los tres puntos de encolado de `pantallaPasarLista.ts` (`manejarToque`, `manejarAusente`, `registrarExtra`) construían la `entrada` sin `ocurridoEn`; `vaciarColaOffline` la reenvía tal cual, así que la RPC (`registrar_asistencia`/`registrar_ausencia`) usaba `now()` del momento del vaciado como `ocurrido_en`, con `es_retroactivo = false` aunque en la práctica fuera un alta a posteriori — y si el vaciado caía al día siguiente, podía chocar con la restricción de unicidad `(alumno, slot, ocurrido_en::date)` contra un registro genuino de HOY, perdiendo el toque de ayer. **Implementado:** los tres puntos de encolado añaden `ocurridoEn: deps.reloj.ahora()` a la entrada, capturado en el momento del toque (no del vaciado) — parámetro ya soportado por `RegistrarAsistenciaEntrada`/`RegistrarAusenciaEntrada` y por la RPC (T-18), sin ningún cambio de esquema | origen: hallazgo #12 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-09-09, "cola offline de asistencia") — el propio hallazgo señalaba esta misma dirección de arreglo como "evidente y de bajo riesgo" | **IMPLEMENTADA 2026-09-09**, atendida antes de la cola normal por ser hallazgo de severidad alta (§0.3). 3 tests nuevos en `pantallaPasarLista.test.ts` (uno por punto de encolado), con un reloj mutable que avanza DESPUÉS de encolar para demostrar que lo guardado no cambia con el vaciado. Verificación pre-push completa en verde (`npm run typecheck`, `npm run lint`, `npm test` 1424/1424, `npm run build`). Pendiente de que el auditor reevalúe y cierre el hallazgo #12 en su próxima pasada | — |
| P-21 | **Urgente (§0.3): la cola offline de R-07 vivía bajo un nombre de base de datos de IndexedDB FIJO, sin partición por profesor, y descartaba de la cola cualquier error que no fuera `ErrorDeRed` — incluidos un límite de tasa o una sesión caducada a mitad de un vaciado, que no son culpa del elemento.** En un dispositivo compartido (un tablet de aula con varios profesores), sin partición la cola de quien cerraba sesión sin conexión quedaba visible y se reenviaba con el token de quien iniciara sesión después: un alta `manual` (sin slot que comprobar pertenencia en la RPC) se atribuía en silencio al profesor equivocado; una de `slot` la RPC la rechazaba por pertenencia, pero ese rechazo no es `ErrorDeRed`, así que el elemento se eliminaba de la cola sin reintento y el registro se perdía. El mismo tramo de código tenía un tercer disparador sin necesitar ningún dispositivo compartido: un vaciado de una cola grande que agotara el límite de tasa de T-06 (`ErrorLimiteAlcanzado`) o una sesión caducada mientras el dispositivo estuvo offline (`NoAutenticado`) tampoco son `ErrorDeRed`, así que borraban en cascada el resto de los elementos pendientes del mismo barrido. **Implementado:** (a) `crearAlmacenColaAsistenciaIndexedDB(fabrica, profesorId)` parte el nombre de la base de datos por `perfil.id` (`aplicacion.ts`, único punto de composición); (b) `vaciarColaOffline` trata `ErrorLimiteAlcanzado` y `NoAutenticado` igual que `ErrorDeRed` — detiene el barrido dejando el elemento actual y los siguientes en cola para el próximo intento, en vez de descartarlos como error definitivo | origen: hallazgo #13 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-09-09, "cola offline de asistencia") | **IMPLEMENTADA 2026-09-09**, atendida antes de la cola normal por ser hallazgo de severidad alta (§0.3). La partición por `profesorId` no tiene test propio (mismo criterio ya aceptado para toda la implementación real de IndexedDB, `DECISIONES_TECNICAS.md` R-07: `jsdom` no la implementa, y `fake-indexeddb` no está en la lista cerrada de `devDependencies`); el trato de `ErrorLimiteAlcanzado`/`NoAutenticado` sí tiene 3 tests nuevos contra el almacén en memoria, incluido uno que demuestra que un elemento SIGUIENTE de la cola tampoco llega a intentarse. Verificación pre-push completa en verde (`npm run typecheck`, `npm run lint`, `npm test` 1424/1424, `npm run build`). Pendiente de que el auditor reevalúe y cierre el hallazgo #13 en su próxima pasada | — |
| P-22 | **Urgente (§0.3): `datos/asistencia.ts#idsAlumnosDeCentro` (T-23, filtro por centro del histórico, `COMPLETADA` desde 2026-09-01) leía `centro_referencia_id` de la tabla BASE `alumno`, columna que `003_politicas_rls.sql` nunca concede a `authenticated` en ninguna forma — "permission denied for column centro_referencia_id" en cualquier entorno real, para `administrator` igual que para `teacher` (comparten el mismo rol de Postgres; la RLS filtra filas, el `GRANT` de columna filtra columnas y se aplica a los dos por igual).** El propio `db/pruebas_rls.sql` (sección de T-21/R-04) ya documentaba este mismo error exacto en un comentario, y `datos/alumnos.ts#resolverCentroReferenciaIdDeAlumno` (R-04) ya lo evitaba yendo contra `alumno_ficha` en vez de la tabla base — pero nadie había vuelto a revisar `idsAlumnosDeCentro`, escrita antes de que ese hallazgo existiera, a la luz de él. **Implementado:** `idsAlumnosDeCentro` consulta ahora `alumno_ficha` (mismo patrón que el resto de resolutores de centro del proyecto) — sigue devolviendo 0 filas a `teacher`, que nunca ejercita este filtro desde la interfaz (`puedeConsultarHistoricoDeCualquiera`, exclusiva de `administrator`, `pantallaHistorico.ts`) | **Hallazgo propio, no de auditoría**, al escribir R-11 (que necesitaba resolver "alumnos activos de un centro" por primera vez desde fuera de `datos/asistencia.ts`) y releer con ese motivo el módulo existente. Es un bug que llevaba `COMPLETADA` desde T-23 (2026-09-01) sin que ninguna ejecución real lo hubiera ejercitado — la suite de tests corre contra dobles de `fetch`, nunca contra Postgres real, así que no podía detectarlo; tampoco lo cubre `db/pruebas_rls.sql`, que prueba SQL/RLS directamente, no las consultas concretas del cliente TypeScript. Consecuencia real: el filtro por centro del histórico de T-23 nunca ha funcionado contra una base de datos real, para ningún rol | **IMPLEMENTADA Y VERIFICADA 2026-09-09** — test de `asistencia.test.ts` actualizado para exigir `/rest/v1/alumno_ficha` (nunca `/rest/v1/alumno`) en la primera petición del filtro por centro. Verificación pre-push completa en verde (`npm run typecheck`, `npm run lint`, `npm test` 1466/1466, `npm run build`). Sin migración: no toca ninguna tabla ni política, solo qué relación consulta el cliente | — |

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
| 1 | R-05 deja el aviso de ausencia listo para enviar a mano (`mailto:` o copiar al portapapeles), sin integración. ¿Se quiere en algún momento el envío automático por email transaccional, SMS o WhatsApp Business? Implica dar de alta una cuenta de servicio externo (posiblemente de pago) — decisión reservada al dueño, no autonomizable por una P-XX (§0.3). Mientras no haya respuesta, R-05 se entrega en su versión sin integración y no queda bloqueada por esto. | R-05 | **No hace falta implementarlo ahora.** No está decidido cómo se quieren mandar esos avisos, ni siquiera si se quieren mandar. Queda para un desarrollo futuro, cuando todo lo demás esté terminado. Efecto: R-05 se entrega en su versión sin integración (`mailto:` / portapapeles) y **no se da de alta ninguna cuenta de servicio externo**. — dueño, 2026-08-27 |
| 2 | Con R-04 (informe mensual) y R-05 (aviso a la familia) ya en el roadmap, ¿tiene sentido en el futuro dar al rol `student` —o a una persona de referencia, sin necesidad de que sea el propio menor quien inicie sesión— una vista de solo lectura de su propio histórico de asistencia y ausencias justificadas? Es justo la ampliación de `student` que la hoja de ruta reserva expresamente al dueño (§0.2); no se propone ninguna R-XX para esto sin tu decisión. | — | **No.** Los estudiantes tendrán funcionalidades, pero también más adelante. Efecto: en el MVP `student` sigue sin acceso a nada salvo su propia fila de `perfil`; cualquier otra política para `student` sigue siendo un fallo (§0.2), y ninguna sesión debe proponerla. — dueño, 2026-08-27 |
| 4 | T-06 investigó los límites de intentos que Supabase Auth (GoTrue) aplica por defecto (requisito 1 de su spec). Confirmado por la documentación oficial y su código fuente: usa un algoritmo de *token bucket* por endpoint; los límites de envío de correo (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/user`) y de OTP/enlace mágico son configurables desde el panel (**Authentication → Rate Limits**) o por la Management API; los de `/auth/v1/verify`, `/auth/v1/token` (que es también el endpoint del inicio de sesión con contraseña) y los desafíos de MFA están limitados **por IP** y **no son configurables desde el panel**. GoTrue **no tiene** un bloqueo de cuenta tras N contraseñas incorrectas: la única defensa por defecto contra fuerza bruta al iniciar sesión es ese límite por IP, no un límite por email. Esta sesión no pudo confirmar la cifra numérica exacta vigente hoy (sin salida de red hacia `supabase.com` desde este entorno; detalle completo, con las dos fuentes consultadas, en `DECISIONES_TECNICAS.md`). Pide dos cosas al dueño: (a) revisar **Authentication → Rate Limits** en el panel del proyecto `dev` antes de T-25 (paso a producción) y ajustar lo que haga falta, y (b) decidir si además del límite por IP se quiere algún límite por cuenta — eso sería trabajo nuevo de T-09, no algo que Supabase ofrezca ya. No bloquea nada mientras tanto. | T-06 / T-09 / T-25 | **(b) Sí, se quiere límite por cuenta: al tercer intento fallido de contraseña se bloquea al usuario, y el administrador debe poder renovar su contraseña.** Es trabajo nuevo dentro de T-09 y una ampliación de su spec — anotada en §7. GoTrue no ofrece nada de esto, así que el **mecanismo** hay que diseñarlo y tiene aristas reales (el conteo desde el cliente es eludible, y bloquear por email abre un vector para dejar fuera a un profesor sabiendo solo su correo): se concreta en la pregunta **#5**, abierta abajo. **(a)** revisar *Authentication → Rate Limits* en el panel de `dev` antes de T-25: sigue pendiente, no bloquea. — dueño, 2026-08-27 |
| 3 | `auditoriacontinua.md` registra el hallazgo #1 (severidad baja, higiene documental): `HOJA_DE_RUTA.md` se autodeclara "DOCUMENTO INMUTABLE... no se modifica nunca" pero el propio dueño lo editó 41 minutos después de crearse, el mismo día, para ajustar el protocolo de §0.1 (que el documento sí permite cambiar al dueño) y el cuerpo de la tarea T-07 (que se declara inmutable sin excepción explícita para nadie). Sin riesgo de dato ni operativo: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento. No encaja como mejora de producto (no es una R-XX) ni como deuda técnica de código (no hay nada que programar): es una pregunta de gobernanza documental que solo el dueño puede resolver, porque el PM tiene este documento en modo SOLO LECTURA. ¿Quieres que la cabecera de `HOJA_DE_RUTA.md` deje explícita una excepción para tus propias ediciones (p. ej. "inmutable salvo para el dueño"), o prefieres que la declaración se mantenga literal y que una futura edición tuya, si hace falta, se documente aquí mismo como excepción puntual? Mientras no haya respuesta, el hallazgo queda `ABIERTO` en `auditoriacontinua.md` sin bloquear nada — origen: auditoría #1. | — | **Cada edición mía debe documentarse como excepción puntual.** Efecto: la cabecera de `HOJA_DE_RUTA.md` se mantiene **literal** ("DOCUMENTO INMUTABLE… no se modifica nunca"), sin añadirle ninguna excepción, y cada edición del dueño se registra como excepción puntual en §7 de este documento. Las dos ediciones ya ocurridas (protocolo de §0.1 y cuerpo de T-07, ambas del 2026-08-25) quedan documentadas ahí. El hallazgo #1 de `auditoriacontinua.md` puede cerrarse en la próxima pasada del auditor. — dueño, 2026-08-27 |
| 5 | **¿Cómo se implementa el bloqueo tras tres contraseñas falladas (respuesta a #4), y qué significa exactamente que "el administrador renueve la contraseña"?** El problema no es programarlo, es dónde se aplica: el inicio de sesión va del navegador directo a GoTrue, y **no hay backend propio** (§0.2), así que un contador en el cliente no impide que alguien llame a GoTrue por su cuenta con `curl` — sería disuasión, no un control de seguridad. Lo que sí se aplica de verdad es la base de datos: un usuario marcado como bloqueado no lee nada aunque su token sea válido, porque lo niegan las políticas de T-10. Y hay un riesgo nuevo que no existía: si el contador va por email y lo puede tocar quien no ha iniciado sesión, cualquiera que conozca el correo de un profesor puede dejarlo fuera antes de una clase. Sobre la renovación: la spec de T-09 (requisito 2) ya resuelve el caso por la vía en la que **el administrador nunca conoce la contraseña de nadie** — dispara el correo de recuperación, que funciona con la clave anónima, y el profesor se pone la suya; que el administrador **fije** una contraseña exigiría la clave `service_role` en el navegador, que está prohibida, o un backend, que hoy no existe. | T-09 | **Tres decisiones, 2026-08-27:** (1) **Bloqueo en la base de datos y aplicado por RLS, hasta que lo levante el administrador.** Los fallos se cuentan en la base de datos; un usuario bloqueado no lee **nada** aunque su token sea válido, porque lo niegan las políticas. Es control real, no cosmético. El dueño acepta explícitamente la contrapartida: quien conozca el email de un profesor puede dejarlo fuera, y el desbloqueo es manual. (2) **Renovar la contraseña = disparar el correo de recuperación** (`POST /auth/v1/recover`, clave anónima): el administrador pulsa un botón y el profesor se pone la suya. **El administrador no conoce la contraseña de nadie, nunca**, y el stack no cambia. Queda descartado que el administrador fije una contraseña: exigiría `service_role` en el navegador o un backend. (3) **El bloqueo alcanza a todos los roles, administrador incluido**, y la vía de escape es el **editor SQL del panel, que solo tiene el dueño** — la misma lógica que el arranque manual. Hay que documentar la consulta exacta en `DEVELOPERS.md`. |
| 6 | *(numerada #5 por la sesión de T-09; renumerada a #6 al resolver el merge, porque el #5 ya estaba usado por la pregunta del bloqueo)* T-09 no ha podido comprobar en el panel del proyecto `dev` (sin salida de red a `supabase.com`, misma limitación que T-06/T-07/T-08) dos cosas de **Authentication** que afectan directamente a si el flujo de recuperación de contraseña que ya está programado funciona de verdad para un profesor real: (a) si la **confirmación de email** está activada — un usuario creado desde el panel podría quedar sin confirmar y no poder iniciar sesión, un fallo que parece un error de código y no lo es (requisito 3 de T-09); y (b) si hace falta configurar un **SMTP propio**, porque el servidor de correo por defecto de Supabase tiene un límite bajo en el plan gratuito y no es apto para uso real con varios profesores. Pide al dueño revisar **Authentication → Email Templates** / **Authentication → Providers** (confirmación de email) y **Authentication → SMTP Settings** antes de repartir el acceso a profesores reales. No bloquea nada mientras tanto: el código funciona igual, solo el correo de recuperación podría no llegar o el alta podría quedar a medias hasta que se revise. | T-09 | **(a) Crear siempre el usuario ya confirmado. (b) Sí, SMTP propio antes de dar acceso a profesores reales.** Decisión del dueño del 2026-08-31. **(a)** La confirmación de email no encaja en este producto: la aplicación **no tiene ningún flujo de alta** —`src/datos/autenticacion.ts` solo usa login, logout, renovación de token, `/auth/v1/recover` y `PUT /auth/v1/user`—, así que a un profesor lo da de alta siempre alguien que ya sabe quién es; no se está verificando la identidad de un desconocido. *Efecto:* toda alta se hace con el usuario **ya confirmado** — desde el panel, marcando la casilla de auto-confirmación; y **T-24**, cuando programe el alta de usuarios desde la aplicación, debe enviar `email_confirm: true` a `/auth/v1/admin/users`, exactamente como ya hace la semilla en `herramientas/semilla/clienteAdmin.ts:68`. Un usuario sin confirmar no puede iniciar sesión, y el síntoma —"tecleo bien la contraseña y no entra"— es indistinguible de un fallo de código: por eso no se deja al criterio de quien cree la cuenta. **(b)** El único correo que este producto envía es el de recuperación de contraseña (`/auth/v1/recover`, T-09). El servidor de cortesía de Supabase tiene un límite bajo por hora y reputación de envío mediocre: con varios profesores reales, los correos se pierden o caen en spam. Lo agrava —por diseño correcto, que no se toca— que la pantalla de recuperación muestre **el mismo mensaje exista o no la cuenta** (T-09, para no revelar quién está registrado): nunca va a distinguir "no llegó el correo" de ninguna otra cosa. *Efecto:* configurar el SMTP es **configuración del panel, no código** —no genera ninguna tarea de repositorio—, pero es **requisito previo a dar acceso a cualquier profesor real**, y el alta de la cuenta con el proveedor de correo es acción reservada al dueño (§0.3). Queda como condición previa de **T-24** y del paso a producción de **T-25**. |
| 7 | El catálogo de centros de estudios (T-11) hoy solo guarda `nombre` y `activo`, tal como pedía literalmente su spec. ¿Interesa en algún momento guardar algún dato adicional del centro reglado — dirección, teléfono o persona de contacto del centro (no del alumno) — para, por ejemplo, poder llamar al colegio? No es un dato personal de un menor ni de una persona de referencia (sería del centro como institución), pero sigue siendo una decisión de producto, no algo que el agente deba añadir "porque sería útil" (§0.2 lo prohíbe expresamente sin decisión tuya). Mientras no haya respuesta, el catálogo se queda con los dos campos de la spec y esto no bloquea nada. | T-11 | |
| 8 | El requisito 4 de T-12 pide literalmente que la búsqueda de la ficha de alumno por nombre/apellidos sea **acento-insensible**. Hoy no lo es: usa `ilike` de PostgREST (ampliado a tres columnas con un `or`), exactamente la misma limitación — y por el mismo motivo — que la búsqueda del catálogo de centros en T-11 (pregunta ya cerrada allí sin necesitar respuesta porque la spec de T-11 no lo exigía; aquí sí lo exige literalmente, aunque el criterio de aceptación enumerado de T-12 no incluye ningún caso de prueba que lo ejerza). Hacerlo de verdad exigiría instalar la extensión `unaccent` de Postgres o añadir una columna generada e indexada con el nombre sin acentos — ambas cosas son DDL, y T-12 tiene `Migración: No`. ¿Quieres que se abra una migración futura (`unaccent` o columna generada) solo para esto, o basta con la búsqueda literal actual? Mientras no haya respuesta, la búsqueda se queda como está (literal, sin acentos) y esto no bloquea nada. | T-12 | |
| 9 | Requisito 7 de T-13: ¿interesa añadir un campo `relacion` a `persona_referencia` (padre / madre / tutor / otro), para poder mostrarlo en la ficha y, más adelante, en el aviso de ausencia (R-05, "Sr./Sra. [apellido], tutor de...")? Es una columna nueva, DDL, y T-13 tiene `Migración: No` — no se puede añadir sin una migración futura. Mientras no haya respuesta, `persona_referencia` se queda con las columnas exactas de su spec (sin `relacion`) y esto no bloquea nada. | T-13 | |
| 10 | Requisito 7 de T-13: ¿debe exigirse que un alumno tenga **al menos una vía de contacto** — su propio email o teléfono, o al menos una persona de referencia con teléfono — antes de poder guardarlo, o se permite un alumno sin ningún contacto en absoluto (caso hoy permitido: `email_alumno`/`telefono_alumno` opcionales en T-12, y 0 personas de referencia válido en T-13)? Es una regla de negocio nueva que tocaría tanto `alumnos.ts` como `personasReferencia.ts`, no algo que el agente deba imponer sin decisión del dueño. Mientras no haya respuesta, se permiten 0 vías de contacto (tal como pidió el dueño explícitamente para T-13) y esto no bloquea nada. | T-12 / T-13 | |
| 11 | Requisitos 2 y 4 de T-17: la zona horaria del centro y la ventana de tolerancia antes del inicio de un slot son configurables, pero el cliente no tiene bundler ni acceso a variables de entorno (§0.2: solo `config.js` expone `SUPABASE_URL`/`SUPABASE_ANON_KEY`) — así que hoy son constantes de dominio, no lectura de `ZONA_HORARIA_CENTRO` de `.env.ejemplo`. Valores elegidos, conservadores: `Europe/Madrid` (única zona horaria de todos los centros del sistema; si algún día hay centros en otro huso, dejaría de ser una constante única) y 10 minutos de tolerancia antes de `hora_inicio` (ni tan corto que un profesor puntual se quede sin propuesta, ni tan largo que aparezca la clase siguiente mientras dura la anterior). Ambas funciones (`instanteLocal`, `alumnosPropuestos`) ya las reciben como parámetro opcional, así que cambiar el valor es una constante, no una migración ni una reescritura. ¿Confirma el dueño estos dos valores, o prefiere otros? Mientras no haya respuesta, se usan los conservadores y esto no bloquea nada. | T-17 | |
| 12 | Requisito 4 de T-18: un segundo registro del mismo alumno en el mismo slot y día se rechaza con un error identificable — implementado ya así, con una restricción `unique` parcial de verdad (`asistencia_uq_alumno_slot_dia_valida`, `db/005_rpc_registrar_asistencia.sql`), acotada a `estado = 'valida'` (anular un registro libera el hueco) y solo para `origen = 'slot'` (una clase extra manual no tiene esta restricción). ¿Confirma el dueño que "rechazar" es el comportamiento deseado, o preferiría en algún caso permitir un segundo registro del mismo alumno el mismo día (p. ej. si el profesor quiere anotar dos tramos separados de la misma clase)? Mientras no haya respuesta, se rechaza (comportamiento literal de la spec) y esto no bloquea nada — revertirlo, si hiciera falta, sería una migración nueva que sustituya el índice por uno menos estricto, nunca editar `005`. | T-18 | |
| 13 | Requisito 1 de T-18 ("valida que [`ocurrido_en`] no está en el futuro ni más allá de la ventana permitida hacia atrás"): la ventana elegida es de 7 días (`VENTANA_RETROACTIVA_MAXIMA_DIAS`, `src/dominio/asistencia.ts`), el mismo valor conservador que `VENTANA_EDICION_TEACHER_DIAS` de T-21 pero una constante DISTINTA (son dos preguntas de negocio distintas que hoy solo coinciden en cifra por casualidad, ver `DECISIONES_TECNICAS.md`). ¿Confirma el dueño 7 días para poder REGISTRAR una asistencia olvidada, o prefiere otro plazo? Es una constante en dos sitios (la RPC y el dominio de cliente, hoy sincronizadas a mano — cambiarla exige tocar los dos), no una migración de esquema. Mientras no haya respuesta, se usa el valor conservador y esto no bloquea nada. | T-18 | |
| 14 | Requisito 6 de T-21: la ventana en la que un `teacher` puede modificar sus propios registros de asistencia es de 7 días desde `registrado_en` (`VENTANA_EDICION_TEACHER_DIAS`, `src/dominio/asistencia.ts`, ya escrita desde T-03/T-18 con este mismo valor de partida; la RPC `actualizar_asistencia` de `db/008_rpc_actualizar_asistencia.sql` aplica la misma cifra del lado del servidor). `administrator` no tiene límite en ningún caso. ¿Confirma el dueño 7 días, o prefiere otro plazo? Constante en dos sitios (RPC y dominio de cliente, sincronizadas a mano), no una migración de esquema — cambiarla exige tocar los dos y, si el runner ya aplicó `008`, escribir una migración nueva para la RPC (`008` queda inmutable en cuanto se aplique). Mientras no haya respuesta, se usa el valor conservador y esto no bloquea nada. | T-21 | |
| 15 | T-25 (requisito 1, cabeceras de seguridad) necesita saber el proveedor de hosting estático para escribir la sintaxis exacta de configuración — hoy sigue `<pendiente>` desde el arranque del proyecto (§0.1 de `HOJA_DE_RUTA.md`). Se ha dejado escrito y listo para Netlify/Cloudflare Pages (fichero `_headers` en la raíz, ya commiteado, ambos lo leen igual sin configuración adicional) porque son gratuitos para este volumen de tráfico y no exigen nada más; si el dueño prefiere Vercel, el mismo contenido se traslada a un `vercel.json` en cuanto se confirme (trabajo menor). **GitHub Pages queda descartado como opción viable**: no admite cabeceras HTTP propias, y sin ellas el requisito 1 de T-25 sería imposible de cumplir sin añadir un proxy — infraestructura nueva fuera del stack fijado. Dar de alta el proveedor elegido es, además, del tipo de acción que una P-XX nunca puede tomar por su cuenta (§0.3: "dar de alta servicios externos... ni contratar infraestructura"). Relacionado: la región del proyecto de producción de Supabase (recomendada en la Unión Europea por el RGPD, ver `roadmap/PRODUCCION_T25.md` §3.1) es la misma familia de decisión. Mientras no haya respuesta, T-25 queda con este único punto sin poder cerrarse del todo (fila 12 de §3) y el resto de la tarea sigue completo. | T-25 | |
| 16 | **Hallazgo #8 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-09-05):** R-02 (migración `011_justificacion_ausencia.sql`, escrita y empujada, todavía sin aplicar) añade `asistencia.motivo_justificacion` con un `CHECK` de lista cerrada que incluye `enfermedad` y `cita_medica` — dato de salud a efectos del artículo 9 del RGPD por definición (art. 4.15), con independencia de que la lista sea corta y sin diagnóstico; y `nota_justificacion`, texto libre sin ninguna restricción, permite además que un profesor añada voluntariamente detalle médico todavía más explícito de un menor. §0.2 de `HOJA_DE_RUTA.md` (documento inmutable) prohíbe "cualquier categoría especial del artículo 9 del RGPD" sin decisión expresa del dueño, y no consta ninguna: la spec de R-02 (`Origen: roadmap`, la propuso el ciclo del PM) fijó "Bloqueo humano: ninguno" sin que se activara el mismo tipo de pregunta que sí se abrió para T-09 (bloqueo de cuenta, una ampliación de alcance mucho menos sensible). Arrastra además dos documentos que hoy siguen afirmando "cero dato de salud, cero categoría del artículo 9": `legal/POLITICA_PRIVACIDAD.md:32-34` y el inventario RGPD de `roadmap/PRODUCCION_T25.md` §3 — ciertos cuando se escribieron (antes de R-02), falsos desde el commit `d16626e`. Tres opciones, ninguna que el PM pueda decidir por su cuenta: **(a)** aceptar el campo como dato de salud, con base jurídica explícita del artículo 9.2 (probablemente consentimiento explícito, distinta del "interés legítimo" que hoy cubre el resto de asistencia) y medidas específicas, corrigiendo los cuatro documentos de `legal/` y el inventario de `PRODUCCION_T25.md`; **(b)** reformular la lista para no revelar categoría médica — por ejemplo una única opción `justificada` sin desglose de motivo, dejando cualquier detalle solo en el texto libre que el propio profesor decide si escribe; **(c)** retirar `motivo_justificacion` de la lista cerrada (dejando solo `nota_justificacion` libre, o retirando también esta). Mientras no haya respuesta, **la migración `011` no debe aplicarse** (fila 14 de §3, actualizada con esta condición) y los cuatro textos legales de T-25 no deben darse por aprobables — el resto de R-02 (RPC, triggers, ventana de edición, tests) no tiene ningún otro defecto según la auditoría del 2026-09-05. | R-02 / T-25 | |
| 17 | **R-05 (requisito 4 y su criterio de aceptación) pide literalmente que el `teacher` del alumno acceda a sus personas de referencia por el botón «avisar»** ("mismo alcance que T-13", y "un `teacher` no ve personas de referencia de un alumno fuera de sus slots" — que da a entender que sí las ve DENTRO de sus slots). Esto contradice §0.2 de `HOJA_DE_RUTA.md` (norma permanente): "el `teacher`... no gestiona fichas ni ve datos de contacto ni personas de referencia", sin ninguna excepción para una vía estrecha; y `dominio/permisosUi.ts#puedeVerPersonasReferencia` ya lo documentaba desde T-13 ("ni siquiera en modo lectura"). Además, concederlo de verdad exigiría una política RLS nueva sobre `persona_referencia` (acotada a alumnos con un slot del `teacher`), y R-05 declara `Migración: No` — ni siquiera sería ejecutable dentro de esta tarea tal como está escrita. Tres opciones: **(a)** ampliar §0.2 con una excepción explícita y estrecha ("el `teacher` SÍ ve nombre/teléfono de personas de referencia de sus propios alumnos, solo desde «avisar»", con la migración RLS correspondiente); **(b)** dejar R-05 como quedó implementada esta sesión — solo `administrator` — y corregir el requisito 4 y el criterio de aceptación de `ROADMAP_PRODUCTO.md` para que dejen de pedir alcance de `teacher`; **(c)** alguna otra acotación (p. ej. solo el teléfono, sin nombre completo ni email). Mientras no haya respuesta, R-05 se entrega en su alcance de `administrator` (real y funcional) y esto no bloquea nada — el botón «avisar» simplemente no aparece para `teacher`. | R-05 | |

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
| 2026-08-31 | T-14 | **Criterio de aceptación no cumplido literalmente: "una imagen de 4000 px produce una derivada de 512 px y otra de 96 px, ambas WebP y sin EXIF" no se comprueba con píxeles reales ni con un fichero WebP real.** `jsdom` no implementa `createImageBitmap` ni un `<canvas>` que rasterice de verdad, y añadir el paquete nativo `canvas` de npm solo para este test habría sido una dependencia pesada para verificar algo que ni siquiera sería el mismo decodificador que un navegador real. Se testea en su lugar: la geometría del recorte (pura, con test completo), la orquestación (qué tamaños se piden, en qué orden, con qué tipo MIME) contra una fábrica de procesado de imagen de mentira, y se documenta la eliminación de EXIF como garantía de la propia plataforma (repintar sobre un `canvas` nuevo nunca copia metadatos del origen) | Documentado en `DECISIONES_TECNICAS.md`. Mismo criterio que T-08/`postgrest.ts` (no se testea el `fetch` real, solo el doble): la implementación real (`crearFabricaProcesadoImagenNavegador`) solo la ejercita un navegador real, cuando T-16 la monte en una pantalla |
| 2026-08-31 | T-18 | **Renumeración de la migración de T-18: `005_rpc_registrar_asistencia.sql`, no `004_rpc_registrar_asistencia` como decía la hoja de ruta original.** `004` ya lo ocupa `004_bucket_avatares.sql` (T-14), consecuencia de la renumeración en cadena de la fila anterior de este mismo §7 (2026-08-28). Efecto en cadena: la migración de T-21 (`005_rpc_actualizar_asistencia` en el original) pasará a ser `006_rpc_actualizar_asistencia.sql` | Consecuencia directa de la renumeración ya arrastrada por T-10/T-14. Anotado aquí, en `DECISIONES_TECNICAS.md`, en la cabecera del propio `005_rpc_registrar_asistencia.sql` y en la fila de T-18 de §1, para que la sesión de T-21 no lo descubra a mitad |
| 2026-09-01 | T-20 | **T-20 pasa a necesitar migración, y su spec dice `Migración: No`; además, `007` (no `006`) es el número que le toca, dejando la de T-21 en `008`.** El requisito 3 ("el centro cuando hay homónimos") exige que un `teacher` sepa a qué centro pertenece un alumno, columna que su `GRANT` sobre `alumno` no incluye — no hay forma de cumplirlo sin DDL. Y la proyección de la fila anterior de este mismo §7 (`006_rpc_actualizar_asistencia` para T-21) ya había quedado obsoleta ANTES de esta sesión: `006` lo ocupó el arreglo de T-18 (`006_arreglo_limite_tasa_ambiguo.sql`, mismo día). T-20 toma el `007` que quedaba libre; T-21 pasa a `008_rpc_actualizar_asistencia.sql` | Mismo precedente que T-09 (fila de 2026-08-27 de este §7): la hoja de ruta es inmutable, así que la ampliación/renumeración se registra aquí, en `DECISIONES_TECNICAS.md`, en la cabecera de `007_rpc_buscar_alumnos.sql` y en las filas de T-20/T-21 de §1, para que la sesión de T-21 no lo descubra a mitad |
| 2026-09-04 | T-14 / T-25 | **Criterio de aceptación no cumplido literalmente durante casi un mes: el requisito 8 de T-14 (aviso de consentimiento del tutor legal para el avatar) nunca llegó a la interfaz.** `HOJA_DE_RUTA.md` §0.2 lo exige como norma permanente ("hasta entonces la interfaz debe advertir de que el consentimiento es responsabilidad del centro"), pero T-14 (`COMPLETADA` desde 2026-08-31) no incluyó ningún texto al respecto en `pantallaFichaAlumno.ts`, y sobrevivió a varias pasadas de auditoría sin que se notara. Descubierto al escribir T-25 (requisito 4, textos legales), cuya propia spec dice que sustituye "el aviso provisional de T-14" — contradicción que solo se hizo visible al leer el código real del bloque de avatar y no encontrar ningún aviso | Corregido en el mismo commit que T-25 (2026-09-04): nuevo párrafo junto al control de subida de avatar, marcado como provisional, con test dedicado. Origen: hallazgo #9 de `auditoriacontinua.md` (severidad baja, la propia ausencia de esta fila), registrado como P-17 en §5 |
| 2026-09-05 | R-02 | **Alcance de datos personales ampliado sin decisión expresa del dueño: `motivo_justificacion` de R-02 incluye valores de dato de salud (artículo 9 RGPD).** `db/011_justificacion_ausencia.sql` (escrita y empujada, todavía sin aplicar) añade un `CHECK` de lista cerrada que incluye `enfermedad` y `cita_medica` — información que revela el estado de salud por definición (art. 4.15 RGPD), pese a que `HOJA_DE_RUTA.md` §0.2 prohíbe expresamente "cualquier categoría especial del artículo 9 del RGPD" sin decisión del dueño; la spec de R-02 fijó "Bloqueo humano: ninguno" sin que se activara ninguna pregunta al respecto | Hallazgo #8 de `auditoriacontinua.md` (severidad alta, `ABIERTO` desde 2026-09-05), escalado por el duodécimo ciclo del PM a la pregunta #16 de §6; la migración `011` no debe aplicarse hasta que el dueño responda (fila 14 de §3). Registrado también como P-17 en §5 |
| 2026-09-07 | R-05 | **Alcance de rol pedido por la spec y no concedido sin decisión expresa del dueño (a la inversa del patrón de la fila anterior): el requisito 4 de R-05 pedía que el `teacher` accediera a las personas de referencia del alumno por el botón «avisar», "mismo alcance que T-13".** Concederlo habría contradicho §0.2 de `HOJA_DE_RUTA.md` ("el `teacher`... no ve datos de contacto ni personas de referencia") y habría exigido además una política RLS nueva que la propia spec no podía traer (`Migración: No`) | R-05 se entregó solo para `administrator` (funcional y completo); se abrió la pregunta #17 de §6 con tres opciones para el dueño, sin bloquear la tarea (valor por defecto conservador: sin acceso para `teacher`). Origen: hallazgo #11 de `auditoriacontinua.md` (severidad baja, la propia ausencia de esta fila — mismo patrón que el hallazgo #9 ya resuelto), registrado como P-19 en §5 |
| 2026-09-08 | R-08 | **R-08 pasa a necesitar migración, y su spec dice `Migración: No`** (mismo patrón que T-09 y T-20, filas de 2026-08-27 y 2026-09-01 de este §7). El requisito 3 ("horario... profesor por email de una cuenta que ya existe") exige resolver un email contra `auth.users`, dato que `perfil` no guarda y que ninguna vista ni columna concede a `authenticated` — no hay forma de cumplirlo sin una RPC `SECURITY DEFINER` nueva | Descubierto al escribir el código, no al leer la spec: `db/016_resolver_profesor_por_email.sql` (fila 19 de §3), sin tocar ninguna tabla ni columna. Documentado también en `DECISIONES_TECNICAS.md` y en la cabecera de la propia migración, para que ninguna sesión futura repita la comprobación |
| 2026-09-09 | R-15 | **Requisito 4 no cumplido literalmente: el CSV no incluye ningún campo "Centro" en su cabecera de metadatos**, pese a que la spec dice literalmente "cabecera de centro, rango de fechas y fecha de generación" (mismo texto que el requisito de R-04, del que se copió). R-15 no tiene ningún alumno concreto del que resolver un `centro_referencia_id` — es un informe sobre el conjunto de profesores de la academia, no sobre un alumno — así que no existe ningún valor único y correcto que poner ahí | Interpretado como una frase de la spec no adaptada al nuevo sujeto del informe (copiada de R-04 sin ajustar), no como un requisito literal a cumplir a cualquier precio. Documentado en `DECISIONES_TECNICAS.md`; sin pregunta a §6 porque no hay ninguna decisión de negocio pendiente, solo un dato que no existe para este informe |
| 2026-09-09 | R-15 | **Criterio de aceptación interpretado, no cumplido con un mecanismo literal: "un `teacher` recibe `SinPermiso` al intentar generarlo" se satisface por inaccesibilidad estructural (la pantalla solo existe dentro del router de `administrator`), sin ninguna llamada al servidor que devuelva un `403` real.** Mismo texto exacto que ya usó R-10 (`ROADMAP_PRODUCTO.md:684`), resuelto de la misma forma sin que quedara fila en este §7 — se añade ahora para las dos, dado el patrón ya señalado por el auditor (hallazgos #9/#11, `RESUELTO`) de que esta sección debe ganar su fila sin que haga falta que lo señale una pasada de auditoría | `Migración: No` en ambas specs descarta forzar un `403` real con una RPC `SECURITY DEFINER` nueva (que exigiría migración); la pantalla completa vive detrás del router de `administrator`, del que un `teacher` no puede formar parte, así que la pregunta de qué le devolvería el servidor no llega a plantearse. Documentado en `DECISIONES_TECNICAS.md` |
