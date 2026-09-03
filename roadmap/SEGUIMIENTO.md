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
**Última actualización:** 2026-09-03 (sesión de verificación, rutina programada) — sin tarea
vertebral desbloqueada: `git checkout develop && git pull` trajo los 11 commits de la sesión de
arreglo urgente `P-16` (ya en `origin/develop` al empezar), y desde ahí, nada ha cambiado. Revisado
`auditoriacontinua.md`: cero hallazgos `ABIERTO` (sin cambio desde la pasada del auditor del
2026-09-03). Revisado `db/APLICADAS.md`: `009_administracion_usuarios.sql` sigue en la sección
"Pendiente de aplicar", el dueño todavía no ha ejecutado `npm run migrate`; T-24 sigue `BLOQUEADA` en
§1 y la fila 11 de §3 sigue `PENDIENTE`, sin cambio. T-25 sigue sin poder arrancar (depende de T-24) y
la oleada v1 (`R-01` a `R-12`) sigue esperando el MVP en producción. Revisado el backlog completo de
§5: las dieciséis `P-XX` (`P-01` a `P-16`) siguen `RESUELTA`, ninguna pendiente. Repetida la
verificación pre-push completa sin ningún commit de programador entre medias: `npm ci` (130 paquetes,
0 vulnerabilidades), `npm run typecheck`, `npm run lint` y `npm run build` en verde, y `npm test`:
**943 tests, 943 pass, 0 fail** — la misma cifra que dejó la sesión de `P-16`. Barrido de secretos
sobre `dist/` recién construido: cero coincidencias reales (solo nombres de campo y el propio patrón
de `registro.ts`). `git status` limpio antes y después. No se fabrica ninguna `P-XX` ni `R-XX` nueva
para justificar el ciclo: revisado el backlog de §5 y `auditoriacontinua.md` completos sin encontrar
ningún candidato legítimo.

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
| T-24 | Administración de usuarios y roles | BLOQUEADA — pendiente aplicar migración `009` | 2026-09-02 | Código y 46 tests completos, contra dobles. Migración `009_administracion_usuarios.sql` (columna `perfil.actualizado_por` + trigger `perfil_before_update`) pendiente de que el dueño la aplique — fila nueva de §3 |
| T-25 | Endurecimiento, privacidad y paso a producción | PENDIENTE | — | La única tarea que toca `prod` |
| R-01 | Registro explícito de ausencias | PENDIENTE | — | Oleada v1 / F-01 · Migración `010_registro_ausencias` (renumerada por el PM el 2026-09-02: `006` lo ocupó ya T-18) |
| R-02 | Justificación de una ausencia | PENDIENTE | — | Oleada v1 / F-01 · Migración `011_justificacion_ausencia` (renumerada por el PM el 2026-09-02: `007` lo ocupó ya T-20) |
| R-03 | Registro de salida y cómputo de horas reales | PENDIENTE | — | Oleada v1 / F-01 · Migración `012_registro_salida` (renumerada por el PM el 2026-09-02: `008` lo ocupó ya T-21) |
| R-12 | Calendario de cierres del centro (festivos y vacaciones) | PENDIENTE | — | Oleada v1 / F-01 · Migración `014_calendario_cierres` (renumerada por el PM el 2026-09-02: `010` colisionaba con la nueva numeración de R-06) · añadida por el PM el 2026-08-28, dependencia nueva de R-04 |
| R-04 | Informe mensual por alumno | PENDIENTE | — | Oleada v1 / F-02 · depende también de R-12 (añadido 2026-08-28) |
| R-05 | Aviso de ausencia injustificada listo para enviar | PENDIENTE | — | Oleada v1 / F-02 · sin envío automático |
| R-06 | Sustitución puntual de profesor en un slot | PENDIENTE | — | Oleada v1 / F-03 · Migración `013_sustitucion_profesor` (renumerada por el PM el 2026-09-02: `009` lo ocupó ya T-24) |
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
| 4 | Aplicar la migración `002_bloqueo_cuenta` en `dev` | P-01 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `2`~~ | **RESUELTA 2026-08-31** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `3`, número que cubre esta migración y la de la fila 5: el runner aplica en orden numérico y aborta al primer error, así que un `3` en el ledger implica que `002` entró antes que `003`. **Anotada en `db/APLICADAS.md` (hash `1c3f8c8aff62`) y P-01 sacada de `BLOQUEADA` en §5** — hecho el 2026-08-31, sesión de T-14 (3) |
| 5 | Aplicar la migración `003_politicas_rls` en `dev`, **después** de la fila 4 | T-10 | ~~`git pull` y `npm run migrate` en local (aplica en orden numérico: no hace nada si `002` sigue pendiente). Al terminar, comprobar que `esquema_version()` devuelve `3`. Opcional pero recomendado: ejecutar también `npm run probar-rls` y revisar que no haya ninguna fila `FALLO`~~ | **RESUELTA 2026-08-31 — migración aplicada Y políticas verificadas en ejecución, sin salvedades.** `esquema_version()` = `3`. `npm run probar-rls` contra `dev`: **51 comprobaciones, 3 omitidas, 0 fallidas**, y las tres omisiones son del bucket de avatares, que no existe hasta T-14 (fila 6). Queda probado contra la base real lo que hasta hoy solo estaba en SQL estático: que un `teacher` lee las columnas de identificación de un alumno pero **no** `email_alumno` (requisito 4 de T-12/T-13, punto de control permanente del auditor); que **un profesor no ve el slot de otro** (`slot_horario / teacher2 no lee el ajeno`), que es la aserción de aislamiento sobre la que se sostiene todo el modelo multi-profesor; que la política `for all` de `persona_referencia` bloquea al profesor en SELECT, INSERT, UPDATE y DELETE y permite las cuatro al administrador; que el `student` no lee ninguna de las siete tablas; que `TRUNCATE` está denegado en las ocho para ambos roles; y que `asistencia` rechaza el INSERT directo incluso al administrador. Llegar aquí exigió arreglar la batería **tres veces el mismo día**: el `grant` de `_resultados_prueba_rls` (sin él no arrancaba), **P-08** (una regresión que desactivaba diez comprobaciones en silencio) y **P-07(b)** (la semilla no creaba un segundo profesor, así que el aislamiento entre profesores no podía probarse nunca). Ninguno de los tres lo encontró nadie leyendo el código: los tres salieron de ejecutar. **T-10 pasada de `BLOQUEADA` a `COMPLETADA` en §1, y anotada en `db/APLICADAS.md` (hash `4e4c50a92dab`)** — hecho el 2026-08-31, sesión de T-14 (3): el motivo del bloqueo llevaba resuelto desde esta misma verificación, sin que ninguna sesión posterior lo hubiera anotado |
| 6 | Aplicar la migración `004_bucket_avatares` en `dev`, **después** de las filas 4 y 5 | T-14 | ~~`git pull` y `npm run migrate` en local (aplica en orden numérico: no hace nada si `002`/`003` siguen pendientes). Al terminar, comprobar que `esquema_version()` devuelve `4`~~ | **RESUELTA 2026-08-31** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `4`, y `npm run probar-rls` confirma que la protección de escritura del bucket funciona contra la base real: `avatares / teacher escribe (debe fallar)` queda bloqueado por una **política RLS** sobre `storage.objects` (*new row violates row-level security policy*), no por un GRANT. Las omisiones de la batería bajan de 3 a 2. **Las dos que quedan cambian de motivo, no desaparecen**: ya no es que falte el bucket, es que está vacío — nadie ha subido todavía ningún avatar, así que las dos comprobaciones de **lectura** (que un profesor vea el avatar de un alumno activo y **no** el de uno dado de baja) siguen sin ejercitarse, y no se desbloquean solas. Ver **P-09** (implementada 2026-08-31, sesión de T-14 (3): la sección 7 ya crea sus propios fixtures y no depende de un avatar real). **Anotada en `db/APLICADAS.md` (hash `1065196e1662`)** |
| 7 | Aplicar la migración `005_rpc_registrar_asistencia` en `dev`, **después** de las filas 4, 5 y 6 | T-18 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `5`, y ejecutar también `npm run probar-rls`~~ | **RESUELTA 2026-09-01** — aplicada por el dueño con `npm run migrate`. **Verificada:** `esquema_version()` devuelve `5`. El `npm run probar-rls` recomendado **hizo exactamente su trabajo**: 67 comprobaciones, 0 omitidas, **4 fallidas**, todas de la sección 7b nueva y todas con el mismo error — `column reference "ventana_inicio" is ambiguous`, un bug de `aplicar_limite_tasa()` dentro de esta misma migración. `005` queda aplicada e **inmutable**; el arreglo va en la migración `006` (fila 8) |
| 8 | Aplicar `006_arreglo_limite_tasa_ambiguo` y verificar T-18 con `npm run probar-rls` | T-18 | ~~`git pull`, `npm run migrate` y `npm run probar-rls`~~ | **RESUELTA 2026-09-01** — hizo falta más de una vuelta y cada una encontró algo. (1) `npm run migrate`: `005` y `006` aplicadas, confirmadas con `npm run migrate -- --estado`. (2) Primera `probar-rls`: el ambiguo resuelto, pero 6 fallos propios de la batería (P-12) y nueve rechazos que aprobaban sin mirar el motivo (P-10). (3) Segunda `probar-rls`, tras corregir ambos: **67 comprobaciones, 0 omitidas, 0 fallidas, "ningún acceso prohibido tuvo éxito"**. T-18 cerrada |
| 9 | Aplicar la migración `007_rpc_buscar_alumnos` en `dev`, **después** de las filas 4 a 8 | T-20 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `7`, y ejecutar también `npm run probar-rls` (nueva sección 8b: cinco comprobaciones de `buscar_alumnos_activos`)~~ | **RESUELTA 2026-09-02** — aplicada por el dueño con `npm run migrate`. **Verificada:** `npm run migrate -- --estado` lista `007` con hash `792e0a398c55`, y `esquema_version()` devuelve **`8`**, no `7`: el dueño aplicó `007` y `008` en la misma pasada, y como el runner va en orden numérico y aborta al primer error, un `8` en el ledger implica que `007` entró antes y sin fallo (mismo razonamiento que la fila 4 con el `3`). `npm run probar-rls`: la sección 8b entera en `[OK]` — las cinco comprobaciones de `buscar_alumnos_activos`, incluidas «la respuesta no trae contacto ni personas de referencia» y «un `student` no puede llamarla» |
| 10 | Aplicar la migración `008_rpc_actualizar_asistencia` en `dev`, **después** de la fila 9 (`007`) | T-21 | ~~`git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `8`, y ejecutar también `npm run probar-rls` (nueva sección 8c: `actualizar_asistencia` — edición propia/ajena, ventana de 7 días, anular sin motivo, cambiar alumno/slot; sección 5 ampliada con UPDATE/DELETE directo denegados)~~ | **RESUELTA 2026-09-02** — aplicada por el dueño con `npm run migrate`. **Verificada:** hash `d7e1a1f47001` en el ledger y `esquema_version()` = `8`. `npm run probar-rls` contra `dev`: **89 comprobaciones, 0 omitidas, 0 fallidas**, «ningún acceso prohibido tuvo éxito» — sección 8c completa (teacher edita lo suyo y no lo ajeno, ventana de 7 días que el `administrator` no tiene, anular exige motivo, la fila anulada sigue existiendo, dos modificaciones dejan dos filas de historial con los valores previos, cambio de alumno y de slot con sus tres rechazos) y sección 5 con el `UPDATE`/`DELETE` directo denegados. **La primera pasada dio 1 omitida** (`actualizar_asistencia / cambiar alumno`): no era la RPC sino un bug del propio fixture —leía `centro_referencia_id` de la tabla base, columna que el GRANT de `003` no concede a `authenticated` ni siquiera siendo `administrator`, y el `exception when others` se tragaba el «permission denied»—; arreglado en la sesión interactiva del dueño (commit `bee1602`, lee el centro por `alumno_ficha` y ahora el motivo real sale en el mensaje del OMITIDO) |
| 11 | Aplicar la migración `009_administracion_usuarios` en `dev`, **después** de la fila 10 (`008`) | T-24 | `git pull` y `npm run migrate` en local. Al terminar, comprobar que `esquema_version()` devuelve `9`, y ejecutar también `npm run probar-rls` (nueva sección 8e: aislamiento de `perfil` entre roles ajenos, y el trigger `perfil_before_update` rechazando desactivar/degradar al único `administrator` activo) | PENDIENTE |

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
