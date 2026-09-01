# AUDITORÍA CONTINUA — GestorAcademia

> Documento del agente Auditor (supervisor externo). Es el **único** archivo que el auditor
> modifica. Dos partes: un registro de hallazgos rastreable (arriba) y la narrativa por
> auditoría (debajo, la más reciente primero).
>
> Para que ningún hallazgo quede en saco roto: el **PM** convierte los hallazgos `ABIERTO` en
> tareas (R-XX o backlog) con `origen: auditoría #N`; los de **severidad alta** (seguridad,
> bug en producción, rotura de UX) los atiende el **programador** como P-XX urgente. En cada
> pasada, el auditor reevalúa los `ABIERTO` contra el código y los cierra o escala.

## Puntos de control permanentes de este proyecto

> Se revisan en CADA pasada. Son los que sostienen el valor del producto y los más fáciles de
> erosionar sin que nadie lo note. El detalle está en la RUTINA 3 de `roadmap/prompts-agentes.md`.

| Área | Qué se comprueba | Severidad si falla |
|------|------------------|--------------------|
| Escritura solo por RPC | `asistencia` sin políticas de `INSERT` ni de `UPDATE` directo y **sin ninguna de `DELETE`**; revocaciones presentes; se escribe solo por `registrar_asistencia` y `actualizar_asistencia`. **Los registros SÍ son editables por diseño**: lo que se audita es que la edición pase por la RPC autorizada, no que no exista | alta |
| Inmutabilidad de `registrado_en` | El trigger `BEFORE UPDATE` sigue abortando cambios en `registrado_en`, `profesor_id` y `peticion_id`, y fija `actualizado_en` / `actualizado_por` él mismo | alta |
| Rastro de cambios | El trigger `AFTER UPDATE` sigue escribiendo en `asistencia_historial`, y esa tabla sigue sin `UPDATE`, sin `DELETE` y con lectura solo para `administrator` | alta |
| Pertenencia en la edición | Un `teacher` solo modifica registros cuyo `profesor_id` es el suyo y dentro de la ventana configurada; comprobado en la RPC y en las políticas, no en el cliente | alta |
| Rol `student` cerrado | No ha aparecido ninguna política para `student` en ninguna tabla ni en el bucket de avatares | alta |
| Privilegios de tabla | Recorrer `information_schema.role_table_grants`: ninguna tabla concede a `anon` o `authenticated` nada fuera de lo necesario, y **en particular ningún `TRUNCATE`**, que ignora RLS por completo. Supabase los concede por defecto en cada tabla nueva, así que este fallo se reintroduce solo | alta |
| Bucket de avatares privado | Sin acceso anónimo ni de `student`; escritura solo `administrator`; la lectura del `teacher` sigue **acotada a alumnos activos** y no ampliada a todos (esa lectura es intencionada desde el 2026-08-25: lo que se audita es que siga acotada); la BD guarda rutas y no URLs; la visualización usa URL firmada de vida corta; el procesado en cliente sigue re-codificando (elimina EXIF); sustituir o quitar un avatar borra las derivadas anteriores. **Un bucket con fotos de menores accesible por URL permanente es el peor fallo posible de este proyecto** | alta |
| Datos de personas de referencia | Solo `administrator` los lee y escribe; ningún camino los expone a un `teacher` | alta |
| Superficie de columnas del `teacher` | Un `teacher` no puede leer `email_alumno` ni `telefono_alumno` consultando PostgREST directamente, no solo que la interfaz no los muestre. (`avatar_ruta` sí, en alumnos activos, por diseño) | alta |
| Avatar solo donde toca | La foto aparece únicamente en la ficha del alumno y en las cards de los alumnos del propio slot del profesor. Nunca en listados generales ni en el buscador de alumnos extra | media |
| Alcance de los datos personales | Ningún campo personal nuevo fuera de la lista cerrada de §0.2 (notas, salud, bancarios, categorías del artículo 9) | alta |
| RLS completa | Todas las tablas con RLS habilitada y políticas explícitas; coincide con la matriz rol × tabla × operación de `DECISIONES_TECNICAS.md` y con `db/pruebas_rls.sql`, incluido el barrido del `student` | alta |
| Hora del servidor y retroactivos | Ningún camino permite al cliente fijar `registrado_en` ni el autor; todo registro añadido a posteriori queda con `es_retroactivo` marcado | alta |
| No-retroactividad del horario | El histórico se lee del snapshot del slot, no recalculado del horario vigente | alta |
| Secretos | Access token, contraseña de BD y `service_role` ausentes del repo, del paquete construido, de los logs y de los documentos; el runner no apunta a `prod` sin salvaguarda | alta |
| Guardas del runner | Las guardas de contenido de `npm run migrate` siguen intactas | alta |
| Stack | `dependencies` vacío, sin frameworks ni SDK de Supabase, sin `fetch` de aplicación fuera de la capa de datos | media |
| Datos de menores | Solo nombre y contacto; ningún campo personal añadido sin decisión del dueño | alta |

---

## REGISTRO DE HALLAZGOS

> Severidad: alta / media / baja. Estado: ABIERTO / RESUELTO / ASUMIDO (riesgo aceptado por el dueño). Numeración nunca reutilizada.

| #ID | Fecha | Área | Severidad | Estado | Resumen | Tarea / origen |
|-----|-------|------|-----------|--------|---------|----------------|
| #1 | 2026-08-26 | Gobernanza documental | baja | RESUELTO (2026-08-28) | `HOJA_DE_RUTA.md` se declara en su cabecera "DOCUMENTO INMUTABLE" ("Este archivo NO se modifica nunca") pero fue editado 41 minutos después de crearse — commit `4c05189`, mismo día 2026-08-25, autoría del propio dueño —, cambiando tanto el protocolo de §0.1 (que el propio documento sí permite cambiar al dueño) como el cuerpo de la tarea T-07 (que el documento declara inmutable sin excepción explícita para nadie, ni siquiera el dueño). No hay riesgo de dato ni de seguridad: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento como referencia. **Resuelto:** el dueño respondió la pregunta #3 de §6 de `SEGUIMIENTO.md` el 2026-08-27 — la cabecera se mantiene literal, sin añadir ninguna excepción, y cada edición suya se documenta como excepción puntual en §7, que ya recoge así las dos ediciones del 2026-08-25. `git log -- roadmap/HOJA_DE_RUTA.md` confirma que no ha habido ninguna edición nueva desde entonces. | `roadmap/HOJA_DE_RUTA.md`, commit `4c05189`; cierre en `roadmap/SEGUIMIENTO.md` §6 pregunta #3 y §7 |
| #2 | 2026-08-29 | Autorización (RLS) / calidad de la batería de pruebas | alta | RESUELTO (2026-09-01) | `db/pruebas_rls.sql` (T-10, requisito 5 de su spec: "batería de aislamiento ejecutable") no contiene ni una sola sentencia `UPDATE`, `DELETE` ni `TRUNCATE` en sus 552 líneas — confirmado por `grep -i` sobre el fichero completo, cero coincidencias: solo ejercita `INSERT` y `SELECT`. Consecuencia concreta: ninguna política `UPDATE` (`slot_horario_admin_actualizar`, `centro_estudios_admin_actualizar`, `alumno_admin_actualizar`) tiene un caso que la ejercite, ni en su rama "debe fallar" (teacher) ni en la "debe funcionar" (administrator); y `persona_referencia_admin_todo` — la única política `for all` del esquema, y la que gobierna la única tabla con `DELETE` real — solo se prueba en su rama `INSERT`: nadie ha comprobado, ni en SQL estático ni en ejecución real, que bloquee un `UPDATE`/`DELETE` de un `teacher` ni que los permita a `administrator`. Tampoco se intenta nunca un `TRUNCATE` por `authenticated`, pese a ser el privilegio que el propio proyecto señala como el más peligroso (ya causó el incidente de `000b_arreglo_permisos.sql`). Lectura directa de `003_politicas_rls.sql` confirma que las políticas están escritas de forma correcta y simétrica (idéntica condición booleana en `USING` y `WITH CHECK`, válida por diseño para las cuatro operaciones a la vez), así que no hay indicio de vulnerabilidad activa hoy — pero la propia batería que debía demostrarlo, no lo demuestra, y hoy tampoco puede ejecutarse contra `dev` en ningún caso (sin `teacher` de prueba, con `002`/`003` todavía sin aplicar). Dado que este proyecto exige explícitamente no conformarse con "está verde" cuando la cobertura de la lógica crítica es superficial, se registra como severidad alta: debe cerrarse — añadiendo los casos que faltan de `UPDATE`/`DELETE` por tabla y un intento de `TRUNCATE` por `authenticated` — antes de dar T-10 por verificada en ejecución, no solo en SQL estático. **Resuelto:** **P-04** (urgente, 2026-08-31) añadió los casos de `UPDATE`/`DELETE` que faltaban para `centro_estudios`, `alumno`, `slot_horario` y `persona_referencia` (la política `for all`, ahora probada en sus cuatro operaciones), más una sección nueva de `TRUNCATE` por `authenticated` sobre las ocho tablas de `public`. En el camino salió una regresión real — **P-08**: la sección 1b de P-04 renombraba el fixture del que dependían las secciones 2/3/4, y esas devolvían en cascada sin ejecutar diez comprobaciones, en silencio, sin ninguna fila `FALLO`; se encontró **ejecutando la batería contra `dev` real, no leyéndola** (ni el auditor ni el propio agente que la escribió la habían visto leyendo el SQL), y se corrigió enlazando los fixtures por `id` (`_fixture_datos`) en vez de por nombre mutable. Verificado por este auditor de dos formas: (a) lectura del SQL actual (`db/pruebas_rls.sql`, secciones 3-4b, 823-1081) confirma casos reales positivos y negativos de `UPDATE`/`DELETE` para las cuatro tablas y una sección 8 dedicada a `TRUNCATE`; (b) `roadmap/SEGUIMIENTO.md` §3 fila 5 registra la ejecución real contra `dev` del 2026-08-31: **51 comprobaciones, 3 omitidas (bucket de avatares, entonces vacío — motivo legítimo), 0 fallidas**, incluyendo el aislamiento entre dos profesores, el bloqueo de `email_alumno`/`telefono_alumno` para `teacher`, y `TRUNCATE` denegado en las ocho tablas para `authenticated` y `teacher`. T-10 pasó de `BLOQUEADA` a `COMPLETADA` con esa verificación. Queda un residuo de baja severidad, ya autodetectado y correctamente registrado por el propio proyecto (no es hallazgo nuevo de este auditor): **P-06** (el barrido obligatorio de aislamiento no incluye al rol `anon`, la única superficie realmente no autenticada) y **P-07(a)** (el veredicto de `probar-rls` no distingue en su mensaje final una comprobación omitida de una realmente pasada — sí las cuenta y lista por separado, pero no "grita" cuando quedan casos sin ejercitar) siguen `PENDIENTE` en `SEGUIMIENTO.md` §5, sin urgencia, correctamente trazados. | `db/pruebas_rls.sql`; políticas afectadas en `db/003_politicas_rls.sql` (`persona_referencia_admin_todo`, `slot_horario_admin_actualizar`, `centro_estudios_admin_actualizar`, `alumno_admin_actualizar`); origen: auditoría #2; resuelto por P-04/P-08, `SEGUIMIENTO.md` §3 fila 5 |
| #3 | 2026-08-29 | Minimización de datos | baja | RESUELTO (2026-09-01) | `src/datos/alumnos.ts`: el `select` de `listarAlumnos` (constante `SELECT_CON_CENTRO`) incluye `avatar_ruta` en el payload de red del listado de administrator, aunque `pantallaFichaAlumno.ts` no lo pinta en ninguna fila de esa lista hoy. No es una fuga real — el único consumidor de esa función es la pantalla de `administrator`, que ya tiene acceso legítimo a esa columna, y RLS reduce a cero filas la misma consulta para cualquier otro rol — pero es superficie de más que conviene recortar cuando T-14/T-19 le den un uso real al avatar, para no arrastrar el hábito a un listado que algún día podría compartirse con `teacher`. **Resuelto:** **P-02** (2026-08-31, sesión de T-14) recortó `avatar_ruta` del listado: `listarAlumnos` usa ahora `SELECT_LISTADO` (columnas explícitas, sin `avatar_ruta`) en vez de `SELECT_CON_CENTRO`, y el tipo `AlumnoListado` (`Omit<AlumnoConCentro, 'avatar_ruta'>`) refleja el recorte también en el tipo, no solo en la cadena de consulta. Verificado por este auditor con `grep -n "avatar_ruta" src/datos/alumnos.ts`: la única mención que queda es el comentario que documenta el propio recorte (`alumnos.ts:67-71,89`). | `src/datos/alumnos.ts` (`SELECT_LISTADO`, `AlumnoListado`, `listarAlumnos`); origen: auditoría #2; resuelto por P-02, `SEGUIMIENTO.md` §5 |
| #4 | 2026-08-29 | Gobernanza documental | baja | RESUELTO (2026-09-01) | `db/MODELO.md` línea 194 sigue diciendo, en la sección de `evento_error`, que su lectura tiene "política todavía por escribir (T-10)" — nota que no se actualizó cuando T-10 escribió de verdad `evento_error_admin_leer` en `003_politicas_rls.sql`. El resto del propio documento (línea 221 en adelante, "Políticas RLS por rol") y la matriz de `DECISIONES_TECNICAS.md` sí están al día y son correctos; es una única frase residual, sin ningún impacto funcional ni de seguridad. **Resuelto:** **P-03** (2026-08-31) actualizó la línea: ahora nombra `evento_error_admin_leer` (`003_politicas_rls.sql`, T-10) en vez de "todavía por escribir". Verificado por este auditor con `grep -n "todavía por escribir\|por escribir" db/MODELO.md`: cero coincidencias. | `db/MODELO.md:194`; origen: auditoría #2; resuelto por P-03, `SEGUIMIENTO.md` §5 |
| #5 | 2026-09-01 | Gobernanza documental | baja | ABIERTO | `db/MODELO.md:296` (sección T-14, avatar) sigue diciendo "falta únicamente el punto de montaje real en una pantalla (T-16)" — nota escrita en la sesión de T-14 (2026-08-31), antes de que T-16 existiera. T-16 ya está `COMPLETADA` (mismo día) y el bloque de avatar ya está montado de verdad: `src/ui/pantallaFichaAlumno.ts` monta `montarBloqueAvatar` (línea 524, cableado en la línea 1097). Mismo patrón exacto que el hallazgo #4 ya cerrado: una frase de estado que no se revisó al completar la tarea que dejaba pendiente, sin ningún impacto funcional ni de seguridad. | `db/MODELO.md:296`; `src/ui/pantallaFichaAlumno.ts:524,1097`; origen: auditoría #5 (2026-09-01) |
| #6 | 2026-09-01 | Gobernanza documental | baja | ABIERTO | Numeración cruzada de las preguntas abiertas #12/#13 de §6 de `SEGUIMIENTO.md` (T-18, retroactividad/duplicados): la tabla de §6 es internamente coherente (línea 496: `#12` = duplicado mismo alumno/slot/día; línea 497: `#13` = ventana retroactiva máxima), y así la etiqueta también `db/005_rpc_registrar_asistencia.sql:26` (duplicados = "pregunta abierta #12"). Pero la propia narrativa de la sesión de T-18 en `SEGUIMIENTO.md` las intercambia: la línea 37 llama "#12" a la ventana retroactiva (debería ser #13) y la línea 43 llama "#13" al duplicado (debería ser #12); `roadmap/DECISIONES_TECNICAS.md:147` repite el mismo intercambio ("pregunta abierta #12... para la primera", refiriéndose a la ventana retroactiva). Sin impacto funcional: el código usa en los dos casos el valor conservador por defecto (7 días / rechazar duplicado) documentado en la spec, no una lectura equivocada de la pregunta; es solo una referencia cruzada mal etiquetada para quien intente localizar la pregunta por su número desde la narrativa en vez de desde la tabla. | `roadmap/SEGUIMIENTO.md:37,43` (narrativa) vs. `:496-497` (tabla, correcta); `roadmap/DECISIONES_TECNICAS.md:147`; `db/005_rpc_registrar_asistencia.sql:26` (correcto); origen: auditoría #5 (2026-09-01) |
| #7 | 2026-09-01 | Calidad de código (higiene) | baja | ABIERTO | `columnasVisiblesFichaAlumno` (`src/dominio/permisosUi.ts:56`) está definida y testeada (`permisosUi.test.ts:47-62`, dos casos: `teacher`/`student` ven solo columnas de identificación, `administrator` ve también las de contacto) pero ninguna pantalla la importa ni la usa (`grep -rn "columnasVisiblesFichaAlumno" src/` solo devuelve su propia definición y su test) — código muerto, no un control de acceso activo. No es una fuga: la protección real de las columnas de contacto vive en el `GRANT` de columna de `003_politicas_rls.sql` y en la vista `alumno_ficha`, ninguno de los dos depende de esta función. Conviene o bien conectarla a la pantalla de ficha (si la intención era filtrar columnas en el cliente también) o eliminarla, para no acumular una función que aparenta ser parte del control de acceso sin estar en el camino real. | `src/dominio/permisosUi.ts:56`; `src/dominio/permisosUi.test.ts:47-62`; origen: auditoría #5 (2026-09-01) |

---

## NARRATIVA POR AUDITORÍA

> Cada pasada: fecha, hallazgos y conclusiones. Append, la más reciente arriba. Prestar
> atención especial a la coherencia entre lo decidido (`DECISIONES_TECNICAS.md` y §0.2 de la
> hoja de ruta) y lo realmente implementado, y a las desviaciones (§7 de SEGUIMIENTO).

### Auditoría 2026-09-01

**Alcance real de esta pasada — el lote más grande auditado hasta hoy: 14 commits, T-10 verificada de
verdad en ejecución, y T-14 a T-18 completas.** `git log b0e4719..HEAD` (`b0e4719` es el commit de la
auditoría anterior, 2026-08-31) muestra 14 commits nuevos: **P-04** (cierra el hallazgo #2, cobertura
de escritura de `db/pruebas_rls.sql`), **T-14** (bucket de avatares, aplicado y verificado), **T-15**
(slots de horario), **P-08** (arregla una regresión real de P-04 que desactivaba diez comprobaciones
en cascada, en silencio), **T-17** (motor "quién toca ahora"), **T-10 verificada en ejecución** contra
`dev` real, **T-16** (interfaz de administrador) y **T-18** (RPC `registrar_asistencia`, código
completo pero **todavía sin aplicar** — migración `005`, fila 7 de §3 de `SEGUIMIENTO.md`,
`PENDIENTE`). Es la primera pasada en la que el proyecto tiene producto real de punta a punta para el
`administrator` (gestión de centros, alumnos, personas de referencia, avatares y horarios) y en la que
la matriz de autorización de T-10 deja de ser "SQL correcto sobre el papel" para pasar a ser "probado
de verdad contra la base de datos real, con los tres roles". `db/APLICADAS.md` confirma `000`-`004`
aplicadas y verificadas en `dev`; `005` (T-18) sigue sin aplicar, así que la RPC de alta de asistencia
es hoy código inerte, no una vía de escritura real todavía — coherente con lo que dicen el propio
commit del séptimo ciclo de PM (`e26553e`) y `SEGUIMIENTO.md` §1/§3, sin ninguna sobreestimación de
lo que hay realmente en producción.

**Metodología.** `git checkout develop && git pull` limpio (57 commits por delante del punto en el que
arrancó esta sesión, ninguno perdido: fast-forward). Verificación directa en vivo de los cuatro
comandos de §0.1 — `npm ci` (130 paquetes, 0 vulnerabilidades), `npm run typecheck`, `npm run lint`,
`npm run build`, los cuatro en verde — y `npm test`: **599 tests, 599 pass, 0 fail** (antes 429, +170
desde la pasada anterior, coherente con el volumen de T-14 a T-18). Confirmados contra la API de
GitHub Actions los 37 runs de CI en `develop`, **todos `completed`/`success`**, incluido el del commit
actual (`e26553e`, run `33428717204`). `git status` limpio antes y después. Barrido de secretos sobre
`dist/` recién construido (`grep -rniE` de `service_role`/`SUPABASE_ACCESS_TOKEN`/JWT/contraseñas):
cero coincidencias reales. Ningún `.env*`/`config.js` trackeado; `.gitignore` los cubre los tres.
`HOJA_DE_RUTA.md` sin ninguna edición desde la auditoría anterior (`git log b0e4719..HEAD --
roadmap/HOJA_DE_RUTA.md`, vacío).

Dado el volumen (14 commits, cinco tareas completas), se delegó la verificación en tres subagentes de
solo lectura, cada uno con instrucción explícita de citar fichero y línea, ejecutar/leer el código
real y no fabricar hallazgos: uno para el bucket de avatares (T-14, el punto de mayor riesgo de todo
el proyecto — fotos de menores), otro para la interfaz de administrador (T-16), los slots y el motor
"quién toca ahora" (T-15/T-17) y la superficie de columnas del `teacher`, y otro para la coherencia
documental de todo el lote (`DECISIONES_TECNICAS.md`, `SEGUIMIENTO.md` §6/§7, `HOJA_DE_RUTA.md` §0.2,
`db/MODELO.md`). El propio auditor leyó directamente y por completo `db/001_esquema_inicial.sql`,
`db/003_politicas_rls.sql`, `db/004_bucket_avatares.sql`, `db/005_rpc_registrar_asistencia.sql`,
`src/datos/asistencia.ts`, `src/dominio/asistencia.ts`, todos los `GRANT` de `db/*.sql`, la cobertura
real de `db/pruebas_rls.sql` (secciones 3, 4b, 7b y 8) y las filas relevantes de
`roadmap/SEGUIMIENTO.md` (§1, §3, §5, §6), sin depender por completo de los subagentes en las piezas
de mayor riesgo — y verificó por su cuenta cada hallazgo que reportaron antes de darlo por bueno.

**Punto de control: escritura solo por RPC, inmutabilidad de `registrado_en`, rastro de cambios —
sin hallazgo, verificado sobre el SQL real de `001_esquema_inicial.sql`.** `asistencia` sigue sin
ninguna política de `INSERT`/`UPDATE` para ningún rol de la API (ni siquiera `service_role` las tiene:
solo `SELECT`, líneas 322-323) — la única vía de escritura es la RPC `SECURITY DEFINER`
`registrar_asistencia`. El trigger `BEFORE UPDATE` (`asistencia_proteger_inmutables`, líneas 289-307)
sigue abortando cualquier cambio en `registrado_en`, `profesor_id` o `peticion_id`, y fija él mismo
`actualizado_en`/`actualizado_por`. El trigger `AFTER UPDATE` (`asistencia_copiar_a_historial`, líneas
372-397) sigue copiando la fila ANTERIOR a `asistencia_historial`, que sigue sin ningún `GRANT` de
`INSERT`/`UPDATE`/`DELETE` a ningún rol, ni siquiera `service_role` (líneas 365-370) — estrictamente
append-only, sin excepción. Sin `DELETE` para nadie sobre `asistencia`, en ningún rol.

**Punto de control: pertenencia en la edición — parcialmente auditable, sin hallazgo en lo que existe
hoy.** La RPC `registrar_asistencia` (`db/005_rpc_registrar_asistencia.sql:245-250`) comprueba que el
slot pertenece al profesor que registra (`v_slot.profesor_id <> v_profesor_id` → error) y al alumno
indicado, en el propio servidor, no en el cliente — verificado también en ejecución estática por
`db/pruebas_rls.sql:975-988` ("slot de otro profesor, debe fallar"). La función de dominio
`puedeEditarAsistencia` (`src/dominio/asistencia.ts:102-119`) ya implementa la regla completa de T-21
(administrator siempre, teacher solo lo suyo y solo dentro de la ventana) del lado del cliente, con
aviso explícito en su propio comentario de que "el cliente es código que el usuario controla" y de que
la RPC es la fuente de verdad — pero esa RPC (`actualizar_asistencia`, T-21) todavía no existe: T-21
sigue `PENDIENTE`. No hay hoy ninguna vía de edición real que auditar, solo la preparación del lado
del cliente, correctamente etiquetada como tal.

**Punto de control: rol `student` cerrado, privilegios de tabla, `TRUNCATE` — sin hallazgo, verificado
en SQL estático Y en ejecución real.** `grep -n "grant .* to anon\|grant .* to authenticated"` sobre
los seis ficheros `db/*.sql` no encuentra ningún `GRANT` a `student` (el rol no existe como grantee de
Postgres: se distingue por `perfil.rol`, y ninguna política nueva lo menciona) ni ningún `TRUNCATE` a
`anon`/`authenticated` en ninguna tabla. `db/pruebas_rls.sql` sección 8 (líneas 1037-1081) lo
comprueba también en ejecución: intenta `TRUNCATE` sobre las ocho tablas de `public` impersonando a
`administrator` y a `teacher`, esperando fallo en las dos. La ejecución real del 2026-08-31 contra
`dev` (`SEGUIMIENTO.md` §3 fila 5) lo confirma: **51 comprobaciones, 3 omitidas, 0 fallidas**,
incluido el barrido de `student` (sección 6) y el de `TRUNCATE` (sección 8).

**Punto de control: bucket de avatares privado — el de mayor riesgo del proyecto, sin hallazgo.**
Delegado en un subagente de solo lectura con instrucción explícita de verificar, con cita de línea,
cada uno de los siete puntos del checklist de este documento; el auditor contrastó personalmente el
SQL (`004_bucket_avatares.sql`: bucket privado, `image/webp` únicamente, 2 MiB; políticas de
`003_politicas_rls.sql`: `administrator` lee/escribe, `teacher` lee solo avatares de alumnos
`activo = true`, nada para `anon` ni `student`) contra el resultado del subagente sobre el cliente.
Resultado: **procesado en canvas que re-codifica siempre a WebP (nunca sube el fichero original,
elimina EXIF por construcción de la plataforma)**; sustituir o borrar un avatar borra las derivadas
anteriores en el orden seguro sube-nuevo→cambia-puntero→borra-viejo (`avatarAlumno.ts`, con test de
ese orden exacto); la base de datos guarda solo la ruta (`avatar_ruta`), nunca una URL; la
visualización siempre pide una URL firmada nueva de 10 minutos de validez, sin caché; el único lugar
de la interfaz que pinta un avatar es la ficha del alumno (`administrator`); ningún acceso de
`student`, en ningún fichero de este subsistema. Único matiz, no un fallo: la card del alumno en la
pantalla del profesor (T-19/T-20, "pasar lista"/"alumno extra") todavía no existe — la función que
decide si esa card debe mostrar avatar (`puedeVerAvatarEnCards`) ya está escrita y testeada, pero sin
consumidor todavía porque la pantalla que la usaría no está construida. Queda para la próxima pasada
con sustancia real de este punto de control, cuando T-19/T-20 aterricen. En ejecución contra `dev`
real, la escritura del bucket ya está probada (política RLS bloquea a `teacher`, no un `GRANT`); la
lectura sigue con dos comprobaciones omitidas por diseño honesto (P-09 preparó fixtures propios en la
transacción de prueba, pero nadie ha ejecutado `npm run probar-rls` desde que se aplicó `004`) — no es
un hallazgo, es la ejecución pendiente que el dueño debe correr para confirmarlo en vivo.

**T-15/T-17 (slots y "quién toca ahora") — sin hallazgo.** Zona horaria real vía `Intl` (no UTC
ingenuo), con los dos cambios de hora de 2026 (29 de marzo, 25 de octubre) cubiertos explícitamente en
los tests; editar un slot cierra la versión anterior (`vigente_hasta`) e inserta una nueva, nunca
reescribe una fila ya existente, así que el histórico de asistencia sigue leyendo del snapshot que
guardó en su momento (no-retroactividad, verificado también en la RPC de T-18: valida la vigencia del
slot contra la fecha LOCAL de `ocurrido_en`, no contra `current_date`). El solape del mismo alumno
bloquea; el del mismo profesor con otro alumno solo avisa — decisión documentada, no un descuido — sin
restricción `EXCLUDE` en base de datos (limitación conocida y documentada, no oculta: dos escrituras
concurrentes de `administrator` podrían colarse las dos, riesgo bajo dado que solo `administrator`
escribe horarios y no es una operación de alto volumen).

**T-16 (interfaz de administrador) y superficie de columnas del `teacher` — sin hallazgo.** Las tres
pantallas reales (listado de alumnos, ficha de alumno, personas de referencia embebidas) comprueban el
rol ANTES de disparar ninguna petición de datos, no solo ocultan un botón; la aplicación real
(`aplicacion.ts`) solo se monta para `administrator`, `teacher` sigue con el marcador de posición de
T-09. `db/003_politicas_rls.sql:107-109` sigue concediendo a `authenticated` solo columnas de
identificación de `alumno` (nunca `email_alumno`/`telefono_alumno`); esas dos columnas solo son
legibles a través de `alumno_ficha`, la vista con su propio filtro `es_administrator()` — y
`src/datos/alumnos.ts` solo las pide a través de esa vista, nunca contra la tabla base. Ninguna
consulta del cliente pide esas columnas contra la tabla base, ni siquiera especulativamente.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo de fondo, dos hallazgos menores de
higiene documental (#5, #6).** Las filas nuevas de `DECISIONES_TECNICAS.md` desde la pasada anterior
se contrastaron contra el SQL/código real en los puntos de mayor riesgo (ruta del bucket, mecanismo de
duplicado de T-18 con `unique` parcial de verdad en vez de `SELECT` con carrera, contrato del límite de
tasa contado sobre el profesor real, validación de vigencia contra la fecha local) y coinciden en
todos los casos. `SEGUIMIENTO.md` §7 registra correctamente las desviaciones reales del lote (la
renumeración en cadena de `004`→`005` de T-18, la corrección de bookkeeping de
`MARGEN_RETROACTIVIDAD_MS`, la limitación conocida de `EXCLUDE`, el criterio de aceptación de T-14 no
comprobado con píxeles reales); la propia regresión de P-08 vive en §5 (autopropuestas), no en §7
(desviaciones de hoja de ruta), clasificación razonable porque no es una desviación del plan sino un
bug que el propio proceso encontró y corrigió el mismo día. `HOJA_DE_RUTA.md` §0.2 sigue sin ninguna
violación: ningún campo personal nuevo fuera de la lista cerrada, ningún framework ni SDK de Supabase
en `dependencies` (sigue vacío), ninguna ampliación de `student`. Las preguntas abiertas #12/#13 de §6
(ventana retroactiva, duplicados de T-18) siguen genuinamente sin respuesta del dueño, y el código usa
en los dos casos el valor conservador documentado — sin ninguna decisión de negocio tomada por su
cuenta; lo único que se encontró fue el hallazgo #6 (numeración cruzada entre la narrativa y la tabla
de esas mismas preguntas, sin impacto funcional). El hallazgo #5 (nota residual en `db/MODELO.md:296`
sobre el punto de montaje del avatar, pendiente de T-16 cuando T-16 ya está completa) es el mismo
patrón exacto que el hallazgo #4 ya cerrado — una frase de estado que ninguna sesión revisó al cerrar
la tarea que dejaba pendiente.

**Cierre de los hallazgos #2, #3 y #4 — verificado en código, no por confianza en lo que dice
`SEGUIMIENTO.md`.** El hallazgo #2 (severidad alta) se cierra con evidencia doble: lectura directa de
`db/pruebas_rls.sql` (los casos de `UPDATE`/`DELETE`/`TRUNCATE` que faltaban ya están, con sus dos
ramas, positiva y negativa) y el resultado de la primera ejecución real contra `dev` (51
comprobaciones, 3 omitidas legítimas, 0 fallidas) registrado en `SEGUIMIENTO.md` §3 fila 5. Es el
hallazgo de mayor severidad que ha tenido este documento hasta hoy, y se cierra con la garantía más
fuerte posible: no "el SQL parece correcto", sino "se ejecutó contra la base de datos real con los
tres roles y no falló nada". El #3 (`avatar_ruta` fuera del listado) y el #4 (frase residual de
`evento_error` en `MODELO.md`) se confirman resueltos con `grep` directo sobre el código actual, cero
rastro de lo que señalaban.

**Puntos de control permanentes — repaso completo de este documento, primera vez con producto real
para cubrirlo casi entero.** Alcance de los datos personales (sin campo nuevo fuera de la lista
cerrada), rol `student` cerrado (sin política nueva en ningún fichero de este lote), RLS completa
(las nuevas tablas de este lote —`limite_tasa`— tienen RLS habilitada, sin políticas, sin `GRANT` a
ningún rol de la API: cerrada por ausencia, el patrón correcto), hora del servidor y retroactivos
(`registrado_en` lo fija `now()` del servidor dentro de la RPC, el cliente no puede enviarlo — no
existe como parámetro de la función —, y `es_retroactivo` se calcula siempre en el servidor con la
fórmula del `CHECK`), no-retroactividad del horario (snapshot leído del slot en el momento de
registrar, nunca recalculado), secretos y stack (sin novedad), avatar solo donde toca (sin novedad,
con el matiz de T-19/T-20 ya anotado arriba): todos verificados en esta pasada, sin hallazgo.

**Conclusión.** Este es el lote de trabajo más grande y de mayor riesgo auditado hasta ahora — cinco
tareas completas, la primera RPC de escritura real del sistema, el bucket de fotos de menores aplicado
y con su escritura probada en vivo — y sale limpio de fondo: el hallazgo de severidad alta que llevaba
abierto desde el 2026-08-29 se cierra con la garantía más fuerte posible (ejecución real contra `dev`,
no solo lectura de SQL), y el proceso del propio proyecto demostró su valor dos veces en el camino —
P-07/P-08 encontraron y corrigieron una regresión real de cobertura de tests que ni el auditor ni el
propio autor habían visto leyendo el código, solo ejecutándolo. Los tres hallazgos nuevos de esta
pasada (#5, #6, #7) son los tres de severidad baja, puramente de higiene (una nota de estado
desactualizada, una numeración de referencia cruzada, una función sin consumidor) y sin ningún efecto
funcional ni de seguridad. La única pieza de este lote que sigue latente es T-18: código y tests
completos, pero la migración `005` sigue sin aplicar en `dev` — hasta entonces, `registrar_asistencia`
no es una vía de escritura real todavía, solo SQL listo. La próxima auditoría con sustancia real llega
en cuanto el dueño aplique `005` y se ejecute `npm run probar-rls` (la sección 7b, con sus trece
comprobaciones sobre la RPC real, incluida la comprobación de que `student` no puede llamarla), o con
T-19/T-20 (pasar lista, alumno extra), que es cuando la card de avatar del profesor por fin tiene un
consumidor real que auditar.

### Auditoría 2026-08-31

**Alcance real de esta pasada — segundo cero consecutivo de código, un único commit y es de PM.**
`git log 51dd857..HEAD` (`51dd857` es el commit de la auditoría de ayer) muestra un solo commit
nuevo, `e211016` ("sexto ciclo del PM — sin cambios de contenido, confirmado que no hay nada nuevo
que incorporar"), y `git diff 51dd857 HEAD --stat` confirma que solo toca dos ficheros de
`roadmap/` (`HISTORIAL_SESIONES.md`, `ROADMAP_PRODUCTO.md`); ninguna línea de `db/` ni `src/` ha
cambiado. Además, `git diff 86d8395 HEAD -- db/pruebas_rls.sql db/003_politicas_rls.sql
src/datos/alumnos.ts db/MODELO.md` (contra la auditoría de hace dos pasadas, 2026-08-29) devuelve
cero líneas: estos cuatro ficheros, los que sostienen los hallazgos abiertos y los puntos de
control más sensibles, son byte a byte idénticos desde hace tres días. Ninguna sesión de
programador ha corrido desde la del ciclo T-13 (2026-08-28). Por eso esta auditoría vuelve a ser
breve y no delega en subagentes: no hay superficie nueva que dividir.

**Verificación directa, aunque el alcance sea pequeño.** `git checkout develop && git pull` limpio
(1 commit nuevo desde `51dd857`). `npm ci` (130 paquetes, 0 vulnerabilidades). Los cuatro comandos
de §0.1 en verde: `npm run typecheck`, `npm run lint`, `npm run build`, y `npm test` — **429 tests,
429 pass, 0 fail**, la misma cifra exacta que las dos pasadas anteriores, coherente con que no ha
entrado código nuevo. CI de GitHub Actions en `develop`: 24 runs totales, todos
`completed`/`success`, incluido el del commit actual (`e211016`, run `33329848604`). `git status`
limpio antes y después. Repetido el barrido de secretos sobre `dist/` recién construido con
`grep -rniE` de `service_role`/`SUPABASE_ACCESS_TOKEN`/contraseñas en claro/JWT: ninguna
coincidencia real, cero resultado. `grep -ni "truncate" db/*.sql` solo encuentra el comentario de
`000b_arreglo_permisos.sql` que documenta el incidente ya corregido, ninguna concesión nueva.
`grep -ni "student" db/*.sql` no encuentra ninguna política nueva para ese rol, solo las menciones
ya auditadas (el `check` de `perfil.rol`, `perfil_leer_propio`, comentarios y el barrido de
`db/pruebas_rls.sql`). `db/APLICADAS.md` sigue mostrando solo `001` aplicada en `dev`: T-10 sigue
`BLOQUEADA` sin que el dueño haya aplicado `002`/`003` todavía.

**Hallazgo #2 (severidad alta, cobertura de escritura de `db/pruebas_rls.sql`) — reevaluado, sigue
`ABIERTO`, sin cambio.** Confirmado que el fichero es byte a byte el mismo desde la auditoría del
2026-08-29 (ver diff de alcance arriba): la batería sigue sin ejercitar ningún
`UPDATE`/`DELETE`/`TRUNCATE`, y las políticas `UPDATE` de `centro_estudios`/`alumno`/`slot_horario`
y la `for all` de `persona_referencia` siguen sin un solo caso que las pruebe en ejecución. No se
marca `RESUELTO` porque no hay commit de programador que lo haya tocado. El sexto ciclo de PM
(`e211016`) trató este hallazgo correctamente: no generó ninguna R-XX ni entrada de backlog nueva
para él, y no duplicó el rastro ya existente en `SEGUIMIENTO.md` — lo dejó como está, a la espera
del programador.

**Hallazgos #3 y #4 (severidad baja) — reevaluados, siguen `ABIERTO` en el código, con el mismo
seguimiento ya trazado.** `avatar_ruta` sigue viajando en el `select` `*` de `SELECT_CON_CENTRO`
(`src/datos/alumnos.ts:83`, verificado con `grep -n "SELECT_CON_CENTRO\|avatar_ruta"`); la línea 194
de `db/MODELO.md` sigue sin actualizar. Ninguno de los dos tiene commit de programador desde que se
abrieron, así que se mantienen `ABIERTO`. Su seguimiento como P-02/P-03 en §5 de `SEGUIMIENTO.md`
sigue vigente sin necesidad de tocarlo de nuevo, porque nada ha cambiado en su estado.

**Coherencia del ciclo de PM — sin hallazgo.** Se leyó el diff completo de `e211016` contra
`ROADMAP_PRODUCTO.md` e `HISTORIAL_SESIONES.md`: ambos relatan exactamente el mismo hecho (ninguna
R-XX nueva, P-02/P-03 sin cambio de estado, `FEEDBACK.md` sin entradas `nuevo` — confirmado
leyendo el fichero directamente, sigue con solo la fila plantilla vacía), sin contradicción entre
ellos ni con este documento. `SEGUIMIENTO.md` y `DECISIONES_TECNICAS.md` no se han tocado
(confirmado con `git diff 51dd857 HEAD` sobre ambos, vacío) — correcto: un ciclo de PM sin cambio
de arquitectura ni de estado de tareas no genera decisiones técnicas ni movimiento en el registro
de tareas. `HOJA_DE_RUTA.md` sigue sin ninguna edición desde que el dueño cerró el hallazgo #1. Es
la segunda vez consecutiva que el ciclo de PM documenta explícitamente "sin cambios de contenido"
en vez de inventar una R-XX para justificar el ciclo — la disciplina correcta se mantiene, no se ha
erosionado con la repetición.

**Puntos de control permanentes — sin novedad respecto a la pasada de ayer**, porque ni el esquema
ni el código de aplicación han cambiado desde hace tres días: la reevaluación en vivo de esta pasada
(secretos, `TRUNCATE`, `student`, CI, suite completa) no encuentra ninguna diferencia con lo ya
validado en profundidad el 2026-08-29.

**Conclusión.** Nada que reportar más allá de confirmar que el estado sigue siendo el que se dejó
hace dos pasadas: cero código nuevo por tercera jornada consecutiva, los cuatro comandos de
verificación y la suite completa en verde con la misma cifra exacta de tests, CI verde, sin
secretos, sin `TRUNCATE` nuevo, sin política nueva para `student`. El hallazgo de severidad alta
(#2) sigue abierto porque nadie lo ha corregido todavía — no por descuido, sino porque no ha
corrido ninguna sesión de programador desde el ciclo de T-13 —, y los dos hallazgos menores (#3,
#4) siguen con su tarea de seguimiento (P-02, P-03) trazada y sin necesidad de reescritura. La
próxima auditoría con sustancia real llega en cuanto el programador cierre el hallazgo #2
(ampliando `db/pruebas_rls.sql` con los casos de `UPDATE`/`DELETE`/`TRUNCATE` que faltan) o el
dueño aplique `002`/`003` en `dev`, lo que ocurra primero — cualquiera de los dos es el momento de
volver a ejecutar `npm run probar-rls` y contrastar el resultado real contra lo que el SQL promete.

### Auditoría 2026-08-30

**Alcance real de esta pasada — un único commit desde la anterior, y es de PM, no de desarrollo.**
`git log 86d8395..HEAD` muestra un solo commit nuevo, `962ca37` ("quinto ciclo del PM — sin R-XX
nueva, backlog técnico P-02/P-03 desde auditoría"), y `git diff 86d8395 HEAD --stat` confirma que
solo toca tres ficheros de `roadmap/` (`HISTORIAL_SESIONES.md`, `ROADMAP_PRODUCTO.md`,
`SEGUIMIENTO.md`); `git diff 86d8395 HEAD -- db/ src/` no devuelve ninguna línea. Es decir: **ni una
sola línea de SQL ni de código de aplicación ha cambiado desde la auditoría de ayer.** No ha corrido
ninguna sesión de programador entre pasadas. Por eso esta auditoría es deliberadamente breve y no
delega en subagentes: no hay superficie nueva que dividir, y repetir la lectura línea a línea de
`003_politicas_rls.sql`/`db/pruebas_rls.sql` de ayer sobre un fichero bit a bit idéntico no añadiría
nada — se limita a (a) reverificar en vivo que el estado sigue siendo el que se dio por bueno ayer,
y (b) auditar la coherencia del propio ciclo de PM, que es el único contenido nuevo real.

**Verificación directa, aunque el alcance sea pequeño.** `git checkout develop && git pull` limpio
(1 commit nuevo desde `86d8395`). `npm ci` (130 paquetes, 0 vulnerabilidades). Los cuatro comandos de
§0.1 en verde: `npm run typecheck`, `npm run lint`, `npm run build`, y `npm test` — **429 tests, 429
pass, 0 fail**, la misma cifra exacta que ayer, coherente con que no ha entrado código nuevo. CI de
GitHub Actions en `develop`: 22 runs totales, todos `completed`/`success`, incluido el del commit
actual (`962ca37`, run `33269956084`). `git status` limpio antes y después. Repetido el barrido de
secretos sobre `dist/` recién construido con `grep` de `service_role`/`SUPABASE_ACCESS_TOKEN`/
`password`: solo coincidencias legítimas (nombres de campo de formulario, el propio patrón de
`depurarContexto` que busca esas palabras, cabeceras de GoTrue) — ningún secreto real. `grep -ni
"truncate" db/*.sql` solo encuentra el comentario de `000b_arreglo_permisos.sql` que documenta el
incidente ya corregido, ninguna concesión nueva. `grep -ni "student" db/*.sql` no encuentra ninguna
política nueva para ese rol, solo las menciones ya auditadas (el `check` de `perfil.rol`, la política
`perfil_leer_propio`, comentarios y el barrido de `db/pruebas_rls.sql`).

**Hallazgo #2 (severidad alta, cobertura de escritura de `db/pruebas_rls.sql`) — reevaluado, sigue
`ABIERTO`, sin cambio.** Confirmado con `git diff 86d8395 HEAD -- db/pruebas_rls.sql` (vacío) y con
`grep -ni "update\|delete\|truncate" db/pruebas_rls.sql` (0 coincidencias, igual que ayer) que el
fichero es bit a bit el mismo: la batería sigue sin ejercitar ningún `UPDATE`/`DELETE`/`TRUNCATE`, y
las políticas `UPDATE` de `centro_estudios`/`alumno`/`slot_horario` y la `for all` de
`persona_referencia` siguen sin un solo caso que las pruebe en ejecución. No se marca `RESUELTO`
porque no hay commit de programador que lo haya tocado — sería fabricar un cierre que el código no
respalda. El ciclo de PM de ayer (`962ca37`) trató este hallazgo correctamente: no generó ninguna
R-XX ni entrada de backlog para él, dejándolo trazado en este registro para que el programador lo
atienda como P-XX urgente por protocolo (§0.3 de `HOJA_DE_RUTA.md`) en cuanto arranque su siguiente
sesión — es la decisión correcta, no una omisión, y se confirma aquí que sigue siendo así.

**Hallazgos #3 y #4 (severidad baja) — reevaluados, siguen `ABIERTO` en el código, pero ahora con
seguimiento correcto en el backlog.** Ninguno de los dos se ha corregido todavía (`avatar_ruta` sigue
en `SELECT_CON_CENTRO` de `src/datos/alumnos.ts`; la línea 194 de `db/MODELO.md` sigue sin
actualizar), así que se mantienen `ABIERTO` aquí — no serían deuda técnica real si un documento
aparte los diera ya por cerrados sin que el código cambiara. Lo que sí es nuevo y correcto: el quinto
ciclo del PM (`962ca37`) los convirtió en **P-02** y **P-03** de §5 de `SEGUIMIENTO.md`, cada uno con
`origen: auditoría #N` citando el hallazgo exacto, marcados sin urgencia y a la espera de que el
programador los ejecute cuando la tarea en curso lo permita — el mecanismo de trazabilidad que exige
la cabecera de este documento funcionando como debe. Se añade la referencia cruzada en la columna
"Tarea / origen" del registro de arriba para que quede en un solo sitio.

**Coherencia del ciclo de PM — sin hallazgo.** Se leyó el diff completo de `962ca37` contra
`ROADMAP_PRODUCTO.md`, `SEGUIMIENTO.md` e `HISTORIAL_SESIONES.md`: los tres relatan exactamente el
mismo hecho (ninguna R-XX nueva, P-02/P-03 registradas, `FEEDBACK.md` sin entradas `nuevo`), sin
contradicción entre ellos ni con este documento. No se ha tocado `DECISIONES_TECNICAS.md` ni
`HOJA_DE_RUTA.md` (confirmado con `git diff 86d8395 HEAD` sobre ambos, vacío) — correcto, un ciclo de
PM sin cambio de arquitectura no genera decisiones técnicas, y la hoja de ruta sigue sin ninguna
edición desde que el dueño cerró el hallazgo #1. No inventar una R-XX nueva cuando no hay laguna real
detectada es exactamente la disciplina que este documento pide, y el ciclo lo dice explícitamente en
su propio texto en vez de generar trabajo por generarlo. §1 de `SEGUIMIENTO.md` sigue con T-10
`BLOQUEADA — pendiente aplicar 002/003` y `db/APLICADAS.md` sigue mostrando solo `001` aplicada en
`dev`: coherente, nadie ha aplicado nada desde ayer. §3 (bloqueos) mantiene sus filas 4 y 5
`PENDIENTE` sin cambio.

**Puntos de control permanentes — sin novedad respecto a la pasada de ayer**, porque ni el esquema ni
el código de aplicación han cambiado: la reevaluación en vivo de esta pasada (secretos, `TRUNCATE`,
`student`, CI, suite completa) no encuentra ninguna diferencia con lo ya validado en profundidad el
2026-08-29, y no se repite aquí la lectura línea a línea de `003_politicas_rls.sql` que aquella pasada
ya hizo sobre el mismo fichero.

**Conclusión.** Nada que reportar más allá de confirmar que el estado sigue siendo el que se dejó
ayer: cero código nuevo, los cuatro comandos de verificación y la suite completa en verde con la
misma cifra exacta de tests, CI verde, sin secretos, sin `TRUNCATE` nuevo, sin política nueva para
`student`. El único movimiento real de esta pasada es de gobernanza del propio backlog, y es
correcto: el hallazgo de severidad alta (#2) sigue abierto porque nadie lo ha corregido todavía —no
por descuido, sino porque no ha corrido ninguna sesión de programador—, y los dos hallazgos menores
(#3, #4) ya tienen su tarea de seguimiento (P-02, P-03) trazada en `SEGUIMIENTO.md` §5. La próxima
auditoría con sustancia real llega en cuanto el programador cierre el hallazgo #2 (ampliando
`db/pruebas_rls.sql` con los casos de `UPDATE`/`DELETE`/`TRUNCATE` que faltan) o el dueño aplique
`002`/`003` en `dev`, lo que ocurra primero — cualquiera de los dos es el momento de volver a ejecutar
`npm run probar-rls` y contrastar el resultado real contra lo que el SQL promete.

### Auditoría 2026-08-29

**Alcance real de esta pasada — el proyecto sale de la "fase de andamiaje" y toca por primera vez
producto real, aunque todavía sin RLS aplicada en la base de datos.** Desde la auditoría anterior
(2026-08-28, que cerró con T-10 `BLOQUEADA — pendiente aplicar 002/003`) el repositorio ha
completado seis commits: P-01 (bloqueo de cuenta), T-10 (políticas RLS de los tres roles, sigue
`BLOQUEADA` en `dev` porque el dueño todavía no ha aplicado `002_bloqueo_cuenta.sql` ni
`003_politicas_rls.sql`), T-11 (catálogo de centros), T-12 (ficha de alumno, datos/centro/baja
lógica) y T-13 (personas de referencia), más un cuarto ciclo de PM que añadió R-12 (calendario de
cierres) al roadmap de producto. Es la primera vez que existe código real de negocio sobre datos de
un alumno menor — hasta ahora solo existía el andamiaje (FASE A) y las piezas de infraestructura
(T-05 a T-09). Importante para interpretar el resto de esta pasada: `db/APLICADAS.md` confirma que
en `dev` solo está aplicado `001_esquema_inicial` (con las siete tablas nuevas en RLS habilitada y
**cero políticas**, es decir, cerradas por defecto); `002` y `003` siguen sin aplicar. Todo lo que
esta pasada audita de T-10/T-11/T-12/T-13 es código **listo y correcto sobre el papel, todavía
latente en la base de datos real** — no hay ninguna ventana de exposición real hoy, porque nadie
—ni siquiera `administrator`— puede tocar estas tablas por la API hasta que el dueño aplique las dos
migraciones pendientes (filas 4 y 5 de §3 de `SEGUIMIENTO.md`).

**Metodología.** `git checkout develop && git pull` limpio (6 commits nuevos desde `8bbc35d`).
Se delegó la verificación en cuatro subagentes independientes en paralelo, cada uno con instrucción
explícita de citar fichero y línea, ejecutar comandos reales en vez de solo leer código, y no
fabricar hallazgos para rellenar su informe: uno para la suite completa y el barrido de secretos/CI,
uno para P-01 + T-10 (SQL de bloqueo de cuenta y RLS, más `db/pruebas_rls.sql`), uno para T-11 + T-12
(catálogo de centros y ficha de alumno), y uno para T-13 + el cuarto ciclo de PM (personas de
referencia y R-12). Además, el propio auditor leyó directamente y por completo `db/001_esquema_inicial.sql`,
`db/002_bloqueo_cuenta.sql`, `db/003_politicas_rls.sql`, `db/pruebas_rls.sql`, la matriz rol × tabla ×
operación de `DECISIONES_TECNICAS.md`, `src/dominio/permisosUi.ts`, las guardas del runner de
migraciones y `.github/workflows/ci.yml`, para no depender por completo de los subagentes en las
piezas de mayor riesgo — y verificó por su cuenta, con `grep`, el hallazgo de severidad alta que
reportó uno de ellos (ver más abajo) antes de darlo por bueno.

**Verificación directa: los cuatro comandos de §0.1 en verde, con números exactos.** `npm ci` (130
paquetes, 0 vulnerabilidades), `npm run typecheck`, `npm run lint`, `npm run build`: los cuatro en
verde. `npm test`: **429 tests, 429 pass, 0 fail** (antes 297, +132 desde la pasada anterior, cifra
que coincide exactamente con las sumas que reclaman `SEGUIMIENTO.md`/`HISTORIAL_SESIONES.md` para
P-01+T-10+T-11+T-12+T-13). CI de GitHub Actions en `develop`: 20 runs, todos `success`, incluido el
del commit actual (`ac25439`). `git status` limpio antes y después de esta pasada.

**Secretos y stack — sin hallazgo, repetido el barrido sobre el estado nuevo.** Ningún access
token, contraseña ni clave `service_role` en claro en el repositorio, en `package-lock.json` ni en
`dist/`: solo el nombre del rol en SQL/documentación (legítimo), JWT de prueba en tests que no
decodifican a nada real, y contraseñas de semilla de desarrollo (`herramientas/semilla/`), no
credenciales reales. `package.json` sigue sin `dependencies` en absoluto; `devDependencies` es
exactamente la misma lista de siempre (ESLint + TypeScript + jsdom + tipos) — ningún framework, sin
`@supabase/supabase-js`. Las guardas de contenido del runner (`herramientas/migraciones/guardas.ts`)
y la salvaguarda de `prod` (`entorno.ts`) no se han tocado desde T-07: siguen intactas, verificado
por `git log` sobre esos ficheros.

**El esquema y las políticas RLS de esta pasada, punto por punto:**

- **`002_bloqueo_cuenta.sql` (P-01) y `gestorSesion.ts` — sin hallazgo.** El conteo de intentos
  fallidos ocurre en el servidor (`registrar_intento_fallido`, `SECURITY DEFINER`, llamable por
  `anon`); un login correcto nunca lo llama ni resetea el contador (evita la carrera con el
  requisito de T-09 de una sola llamada de datos al autenticar). `rol_actual()` exige `not bloqueado`
  además de `activo`, así que toda política de T-10 que use `es_administrator()`/`es_teacher()`
  hereda la condición sin repetirla. `CuentaBloqueada` solo se dispara **después** de que GoTrue ya
  validó la contraseña correcta, así que no abre ninguna vía nueva de enumeración de cuentas sobre
  la ya existente `CredencialesInvalidas`. `admin_desbloquear_usuario` comprueba `es_administrator()`
  ella misma (defensa en profundidad real, no solo RLS) y nunca fija ni conoce una contraseña — solo
  dispara el correo de recuperación, tal como decidió el dueño. El bloqueo alcanza también al
  `administrator`, con la vía de escape documentada en `DEVELOPERS.md` (editor SQL del panel, solo
  el dueño) — contrapartida aceptada explícitamente por el dueño el 2026-08-27.
- **`003_politicas_rls.sql` (T-10) — el SQL en sí, correcto y coherente con la matriz.** Las siete
  tablas de `001_esquema_inicial` reciben exactamente las políticas que documenta la matriz rol ×
  tabla × operación de `DECISIONES_TECNICAS.md`, verificada línea por línea contra el fichero real:
  ninguna política nueva menciona a `student`; la única en todo el sistema para ese rol sigue siendo
  `perfil_leer_propio` del bootstrap. La solución a "un `teacher` no debe leer
  `email_alumno`/`telefono_alumno` ni con una consulta directa" es sólida: la tabla base concede a
  `authenticated` solo columnas de identificación (leer las de contacto ahí falla con un error real
  para cualquiera, `administrator` incluido) y una vista aparte, `alumno_ficha`, con su propio filtro
  `es_administrator()` escrito a mano (no delega en la RLS de la tabla base, que un propietario con
  privilegios plenos saltaría), es el único camino para leerlas. `persona_referencia` sigue sin
  ninguna política ni GRANT para `teacher` — cierre por ausencia, no por regla explícita, que es
  exactamente el patrón correcto. El bucket `avatares` tiene sus cuatro políticas de `administrator`
  más la ampliación acotada del `teacher` (solo alumnos `activo = true`), sin ninguna política para
  `anon` ni `student`, escritas ya aunque T-14 no haya creado el bucket todavía.
- **Hallazgo de severidad alta — `db/pruebas_rls.sql` no ejercita ninguna operación de escritura
  salvo `INSERT`.** Ver #2 del registro de arriba. Verificado personalmente por el auditor con
  `grep -ni "update\|delete\|truncate" db/pruebas_rls.sql`: cero coincidencias en las 552 líneas del
  fichero. La política `for all` de `persona_referencia` (la única con `DELETE` real) y las tres
  políticas `UPDATE` de `centro_estudios`/`alumno`/`slot_horario` no tienen ningún caso, ni positivo
  ni negativo, que las ejercite; tampoco se intenta nunca un `TRUNCATE` por `authenticated`. La
  lectura directa de `003_politicas_rls.sql` no muestra ninguna asimetría en esas políticas (misma
  condición en `USING`/`WITH CHECK` para las cuatro operaciones), así que no hay indicio de que el
  SQL en sí esté mal — pero la batería que el requisito 5 de T-10 promete como "ejecutable" no prueba
  hoy ni un tercio de la matriz de escritura, y es exactamente el tipo de laguna que este proyecto
  pide tratar como severidad alta cuando la cobertura de la lógica crítica resulta superficial. El
  propio script es honesto al respecto (usa `pg_temp.omitir(...)` en vez de fingir cobertura, y
  documenta que ni siquiera se ha podido ejecutar contra `dev` todavía), lo cual mitiga que sea un
  intento de aparentar seguridad, pero no cierra el hallazgo: debe completarse antes de dar T-10 por
  verificada en ejecución.
- **`herramientas/migraciones/politicasRls.test.ts` — sustancial, no cosmético.** Parsea el
  contenido real de `003_politicas_rls.sql` (no un doble) y hace aserciones concretas: cada una de
  las siete tablas tiene al menos una política nueva, ninguna política menciona a `student` ni
  compara `rol_actual()` a mano, el `GRANT` de columnas de `alumno` para `authenticated` no incluye
  las de contacto, no existe un `GRANT SELECT` sin restricción de columnas que las exponga por la
  puerta de atrás, `alumno_ficha` filtra por `es_administrator()`, y ninguna política del bucket
  `avatares` concede nada a `anon`. Es la comprobación estática que sí existe hoy y compensa en parte
  — pero no sustituye — el hallazgo #2 de arriba, porque comprueba la forma del SQL, no su
  comportamiento en ejecución.
- **T-11/T-12 — sin hallazgo de seguridad; dos observaciones menores de higiene (#3 y #4 del
  registro).** `src/datos/alumnos.ts` lee siempre de `alumno_ficha` (nunca de la tabla base) para
  cualquier operación de lectura, y usa `Prefer: return=minimal` + relectura para evitar el
  `RETURNING` sobre columnas de contacto en la escritura — exactamente lo que documenta
  `DECISIONES_TECNICAS.md`. La baja lógica de alumno y de centro son `UPDATE`, nunca `DELETE`
  (verificado también por un test que confirma que el módulo no exporta ninguna función
  `eliminar*`/`borrar*`). `pantallaFichaAlumno.ts` es enteramente de `administrator`: un `teacher`
  que la monte ve un mensaje de acceso denegado sin disparar ninguna petición de datos. 77 tests
  (T-11+T-12) ejecutados en vivo, todos en verde, con casos de frontera reales (duplicados
  acento-insensibles, orden a la española, `SinPermiso` del servidor, ausencia de columnas de
  contacto). Única cosa a mejorar, sin ser un riesgo real: `avatar_ruta` viaja en el payload de
  `listarAlumnos` sin que la pantalla lo use todavía (#3), y una frase de `db/MODELO.md` quedó
  desactualizada al cerrar T-10 (#4).
- **T-13 — sin hallazgo.** Verificado explícitamente, en tres capas (tipos de dominio, capa de
  datos, esquema SQL real), que el campo `relacion` — sugerido en la pregunta #9 de §6 de
  `SEGUIMIENTO.md`, sin responder todavía por el dueño — **no** se ha colado en el código: sería una
  violación grave de §0.2 si lo hubiera hecho sin decisión del dueño, y no ha ocurrido. El borrado es
  un `DELETE` real (única tabla del sistema con esa propiedad), con confirmación explícita en la
  interfaz ("Esta acción es definitiva y no se puede deshacer."). El aviso de duplicado es solo eso,
  un aviso en cliente, sin bloquear el alta. 16 tests de dominio/datos más 5 de UI, todos en verde.
- **Cuarto ciclo de PM (R-12) — sin hallazgo.** La nueva entrada del roadmap de producto no
  introduce ningún dato personal, no amplía el rol `student`, no añade dependencias de runtime, y su
  dependencia cruzada con R-04 está anotada correctamente en los dos sentidos. Es una adición
  justificada (sin ella, R-04 contaría mal las semanas de vacaciones del centro), no una ampliación
  de alcance por iniciativa propia.

**Coherencia entre lo decidido y lo ejecutado.** Las 21 filas nuevas de `DECISIONES_TECNICAS.md`
desde la pasada anterior (P-01, T-10, T-11, T-12, T-13) se contrastaron contra el SQL y el código
reales, no solo contra su propio texto, y coinciden en todos los casos revisados. `SEGUIMIENTO.md`
§1 tiene P-01/T-11/T-12/T-13 `COMPLETADA` y T-10 `BLOQUEADA — pendiente aplicar 002/003`, consistente
con `db/APLICADAS.md`. §7 (desviaciones) recoge las cinco desviaciones reales encontradas en el
código de esta pasada (bloqueo de cuenta ampliando T-09, la renumeración en cadena de migraciones
—dos veces—, la excepción documental de `HOJA_DE_RUTA.md`, y la búsqueda no acento-insensible de
T-12): no se ha encontrado ninguna desviación real sin anotar ahí. §6 no tiene ninguna pregunta
pendiente resuelta unilateralmente en el código — en particular, la pregunta #9 sobre `relacion`
sigue sin respuesta y el campo sigue sin existir, tal como debe ser mientras tanto.

**Puntos de control permanentes de este documento — estado de esta pasada.** La mayoría siguen sin
poder auditarse en ejecución real porque `002`/`003` no están aplicadas en `dev` (escritura solo por
RPC, inmutabilidad de `registrado_en`, rastro de cambios, pertenencia en la edición, hora del
servidor: sus RPC de escritura son T-18/T-21, todavía `PENDIENTE`). Los que sí tienen algo real que
auditar hoy — rol `student` cerrado, privilegios de tabla, superficie de columnas del `teacher`,
alcance de los datos personales, RLS completa, bucket de avatares acotado a `administrator`/`teacher`
sobre activos — se han comprobado contra el SQL real y dan resultado correcto, con la salvedad del
hallazgo #2 (la batería que debe demostrarlo en ejecución tiene una laguna real, aunque el SQL en sí
esté bien).

**Conclusión.** El ciclo P-01/T-10/T-11/T-12/T-13 es sólido en el fondo: el diseño de la vista
`alumno_ficha`, el cierre por ausencia de `persona_referencia` y `student`, y el bloqueo de cuenta
aplicado en base de datos están bien pensados y bien escritos, y ninguno de los cuatro subagentes
independientes ni la lectura directa del auditor encontraron una sola discrepancia entre lo
documentado y lo implementado en el SQL o en el cliente. El único hallazgo de peso de esta pasada
(#2, severidad alta) no es que algo esté mal, sino que la prueba que debía demostrar que está bien —
`db/pruebas_rls.sql`— no cubre la mitad de las operaciones de la matriz de autorización, justo en el
ciclo que más lo necesita porque es el primero que toca datos reales de menores. Se recomienda
cerrarlo antes de que el dueño aplique `002`/`003` y ejecute `npm run probar-rls` por primera vez,
para que esa primera ejecución real sea también la primera cobertura completa. La próxima auditoría
con sustancia de seguridad de producto adicional llega con T-14 (bucket de avatares, que además debe
completar los casos hoy `OMITIDO` de `db/pruebas_rls.sql` por falta de bucket) y con la aplicación
real de `002`/`003` en `dev`, momento en el que corresponde volver a ejecutar `npm run probar-rls` y
confirmar en esta misma auditoría que el resultado en vivo coincide con lo que el SQL promete.

### Auditoría 2026-08-28

**Alcance real de esta pasada — avance sustancial desde la anterior, todavía sin RLS de producto.**
Desde la auditoría 2026-08-27 (que cerró con FASE A completa, T-00 a T-04) el repositorio ha
completado T-05 a T-09: monitorización de errores, límites de abuso y robustez, el modelo de datos
completo con su runner de migraciones (`001_esquema_inicial` aplicada y verificada en `dev`), el
cliente propio de PostgREST/Storage, y autenticación con los tres roles. `git log` confirma que no
hubo ninguna auditoría intermedia entre esa fecha y esta, así que esta pasada cubre las cinco tareas
de un tirón. **T-10 (políticas RLS de los tres roles) sigue `PENDIENTE`**, y con ella siguen sin
existir todavía la práctica totalidad de los puntos de control de seguridad de producto de este
documento (aislamiento de `asistencia`, bucket de avatares, superficie de columnas del `teacher`,
personas de referencia): nacen en T-10/T-14 y no se fabrica ningún hallazgo sobre funcionalidad que
no existe. Lo que sí existe — autenticación, cliente de datos, monitorización, límites de abuso y el
esquema con sus triggers e inmutabilidad — se ha auditado con el mismo rigor que el andamiaje de
FASE A en la pasada anterior, porque es exactamente donde vive hoy el riesgo real del proyecto.

**Metodología: verificación directa contra código y SQL reales, no contra lo que dicen los
documentos.** Se hizo `git checkout develop && git pull` (limpio, sin conflicto, 31 commits nuevos
desde la última pasada), `npm ci`, y se ejecutaron en vivo los cuatro comandos de verificación de
§0.1: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`. **Los cuatro en verde — 297
tests, 0 fallos.** Se confirmó además contra la API de GitHub Actions que los 13 runs de CI en
`develop`, incluido el del commit actual (`855f95c`), terminaron `completed`/`success` sin
excepción.

Para cubrir T-05 a T-09 con la misma profundidad que exige este proyecto sin agotar una sola pasada
secuencial, se delegó la lectura línea a línea en tres subagentes independientes, cada uno con
instrucción explícita de citar fichero y línea y de no inventar hallazgos para rellenar su informe:
uno para T-05 (monitorización de errores) y T-06 (límites de abuso); otro para T-07 (esquema SQL y
runner de migraciones); otro para T-08 (cliente PostgREST/Storage) y T-09 (autenticación y roles).
Los tres ejecutaron o confirmaron la suite de tests correspondiente en vivo, no solo leyeron el
código. Ninguno encontró una discrepancia de severidad alta o media entre lo que
`DECISIONES_TECNICAS.md`/la hoja de ruta prometen y lo que el código hace de verdad. Resumen de lo
verificado punto por punto:

- **Logger y scrubbing (T-02/T-05):** `depurarContexto` (`src/nucleo/registro.ts`) filtra de verdad
  por nombre de campo y por forma del valor (JWT, cadena opaca), recursivamente en objetos y arrays
  anidados, confirmado leyendo el código y ejecutando sus tests. `informadorErrores.ts` no deja
  ninguna promesa de `enviar` sin capturar y un fallo de envío nunca provoca una segunda llamada —
  verificado con los dos tests que fuerzan el fallo (rechazo asíncrono y excepción síncrona) y
  comprueban `llamadas === 1` sin `unhandledRejection`. `evento_error` tiene RLS habilitada sin
  política de lectura todavía, tal como documenta su propio comentario en el SQL — correcto para
  hoy, la política de `administrator` nace en T-10.
- **Límites de abuso (T-06):** el limitador de tasa usa el reloj inyectado, nunca `Date.now()`
  directo; la protección de doble toque deduplica una carrera real, no una llamada en bucle (el test
  controla a mano cuándo resuelve la operación subyacente); el retroceso exponencial usa el
  `Temporizador` inyectado, sin esperas reales, con la progresión exacta verificada
  (`[1000, 2000, 3000, 3000]`); `mensajesAbuso.ts` nunca expone `error.message` crudo de Postgres,
  con un test que inyecta un mensaje técnico real y comprueba su ausencia. Valoración honesta de la
  suite (no solo "está verde"): es sustancial, no tautológica — el único test relativamente trivial
  es el de `temporizador.ts`, razonable porque el módulo no tiene lógica de negocio propia.
- **Esquema y runner de migraciones (T-07), el bloque de mayor riesgo de esta pasada:** las siete
  guardas de contenido del runner (`DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`,
  `DISABLE ROW LEVEL SECURITY`, `DROP POLICY` sin su `CREATE POLICY`, `DELETE` sobre `asistencia`,
  `UPDATE`/`DELETE` sobre `asistencia_historial`) tienen cada una su test que la dispara de verdad,
  no solo código que "parece" tenerla. La inmutabilidad por hash aborta si el fichero ya aplicado
  cambió. La salvaguarda de `prod` exige `--entorno=prod` **y** `PERMITIR_PROD=1` con comparación
  estricta. Las siete tablas nuevas de `001_esquema_inicial.sql` tienen **todas**
  `enable row level security`, **todas** empiezan por `revoke all` antes de conceder nada, y **ninguna**
  concede `TRUNCATE`/`REFERENCES`/`TRIGGER` a `anon`/`authenticated` (el único `grant` a esos roles en
  todo el fichero es `execute` sobre la RPC `registrar_evento_error`, no un privilegio de tabla) — el
  fallo que ya ocurrió una vez en el bootstrap (`000b_arreglo_permisos.sql`) no se ha reintroducido.
  El trigger `BEFORE UPDATE` de `asistencia` aborta si se toca `registrado_en`, `profesor_id` o
  `peticion_id`, y fija `actualizado_en`/`actualizado_por` él mismo; el `AFTER UPDATE` escribe la fila
  anterior en `asistencia_historial`. Las revocaciones sobre `asistencia` y `asistencia_historial` son
  incluso más estrictas de lo exigido: ni `service_role` tiene `INSERT`/`UPDATE`/`DELETE` directo, solo
  `SELECT`. El test estático que parsea el SQL real y el test de fuga de secretos (que compila `dist/`
  de verdad dentro del propio test) pasan hoy contra el repositorio real. **Sin hallazgo.**
- **Cliente de datos y autenticación (T-08/T-09):** el codificador de valores de filtro escapa
  comillas, comas, `%` y paréntesis en dos capas antes de `encodeURIComponent`, con tests para cada
  caso. `urlFirmadasEnLote` hace una sola petición HTTP para N rutas, verificado contando llamadas al
  doble de `fetch` — nota de contexto, no hallazgo: `src/datos/almacenamiento.ts` ya existe porque el
  cliente de Storage era parte explícita del alcance de **T-08** (su requisito 3, no de T-14, que
  sigue tratando la creación del bucket, sus políticas y el procesado de imagen); no hay adelanto de
  alcance. `errorDeRespuesta` traduce correctamente cada código HTTP a su error de dominio; el
  `message` crudo de Postgres sobrevive en el objeto de error en memoria (para depuración/logs, ya
  depurado por `depurarContexto`), pero `mensajeAmigable` — el único punto que compone texto para la
  interfaz — nunca lo lee, confirmado por grep sobre `src/ui/**`. La sesión persiste solo el
  `refresh_token` en `sessionStorage`, nunca el `access_token`; la renovación es estrictamente
  proactiva (`renovarAlAbrirPasarLista`), sin ningún interceptor reactivo a un `401` en los clientes
  de datos. Un perfil `activo = false` no entra aunque las credenciales sean correctas. Un `student` o
  un rol desconocido llegan a la pantalla sin acceso con **una sola** llamada de datos (cargar su
  propio perfil) y nunca más — hay un test que lo dice literalmente. Login y recuperación de
  contraseña responden igual exista o no la cuenta, verificado en dos capas (cliente GoTrue y
  pantalla). Ningún test ni log contiene una contraseña o token en claro. **Confirmado como ausente,
  correctamente:** ningún rastro del bloqueo de cuenta al tercer intento fallido (P-01) — es la tarea
  que arranca hoy mismo, 2026-08-28, por decisión del dueño, y su ausencia hasta ahora es lo esperado,
  no una omisión.
- **Secretos:** repetido el barrido sobre el estado nuevo del repositorio (31 commits): ningún
  access token, contraseña ni clave `service_role` en claro en ningún fichero — solo el nombre del
  rol `service_role` en comentarios y documentación, uso legítimo. `.env.ejemplo` y
  `config.ejemplo.js` documentan las variables sin valores. `.gitignore` cubre `.env.local`, `.env` y
  `config.js`; ninguno de los tres está trackeado. `git status` limpio. **Sin hallazgo.**
- **Stack:** `package.json` no declara `dependencies` en absoluto (ni siquiera un objeto vacío) y
  `devDependencies` es exactamente la lista cerrada de §0.2 más las herramientas de ESLint que la
  acompañan (`@eslint/js`, `typescript-eslint`) — ningún framework, ningún SDK de Supabase. **Sin
  hallazgo.**

**Coherencia entre lo decidido y lo ejecutado:** `DECISIONES_TECNICAS.md` registra 30 filas nuevas
desde la pasada anterior (T-05 a T-09), todas con alternativas consideradas, y ninguna contradice
§0.2. Varias se contrastaron contra el código real y no solo contra su propio texto (el patrón de
`Reloj`/`Temporizador` inyectados, la separación de `almacenSesion.ts` en `sessionStorage`, la
ausencia de interceptor reactivo a `401`), y todas coincidieron. `SEGUIMIENTO.md` §1 tiene T-00 a
T-09 `COMPLETADA` y T-10 en adelante `PENDIENTE`, consistente con lo que hay en el repositorio.
§7 (desviaciones) registra correctamente las dos ampliaciones reales de alcance: la del bloqueo de
cuenta acordada por el dueño el 2026-08-27 (que arrastra la numeración de migraciones de T-10 y
exige la condición "no bloqueado" en sus políticas — anotado con claridad para que la sesión de T-10
no lo pase por alto) y la excepción documental de `HOJA_DE_RUTA.md`. §3 (bloqueos) tiene sus tres
filas resueltas y verificadas, no solo dadas por hechas: la migración `001` con `esquema_version()`
= `1`, `000b_arreglo_permisos.sql` confirmado con el barrido de privilegios en vivo, y el primer
`administrator` confirmado por el dueño. El ciclo de PM del 2026-08-27 (tercero) revisó el roadmap de
producto sin introducir ningún dato personal nuevo ni tocar al rol `student`, y correctamente no
generó ninguna R-XX nueva porque las respuestas del dueño a las preguntas #1 y #2 de §6 solo
confirmaban el alcance ya conservador que la oleada v1/v2 daba por hecho.

**Cierre del hallazgo #1 (higiene documental, severidad baja):** el dueño respondió la pregunta #3
de §6 el 2026-08-27 — la cabecera de `HOJA_DE_RUTA.md` se mantiene literal y cada edición suya se
documenta como excepción puntual en §7, que ya recoge así las dos ediciones del 2026-08-25.
`git log -- roadmap/HOJA_DE_RUTA.md` confirma que no ha habido ninguna edición nueva desde la pasada
anterior. Se marca **RESUELTO** en el registro de arriba.

**Ningún hallazgo nuevo esta pasada.** No por falta de búsqueda — se ejecutó la suite completa en
vivo, se leyó línea a línea el código de T-05 a T-09 y el SQL de `001_esquema_inicial.sql` con tres
subagentes independientes instruidos explícitamente para no fabricar hallazgos, se repitió el barrido
de secretos, se confirmaron los 13 runs de CI en GitHub y se contrastó cada decisión técnica relevante
contra el código real — sino porque el estado del repositorio coincide, punto por punto, con lo que
la documentación dice que hay.

**Conclusión:** T-00 a T-09 están completas y son sólidas. El runner de migraciones y el esquema
SQL de T-07 —el bloque de mayor riesgo de esta pasada, porque es el primer código que toca DDL real
sobre datos de menores— cumplen sus invariantes con margen (revocaciones más estrictas de lo exigido
en `asistencia`/`asistencia_historial`). La autenticación cierra correctamente el rol `student` y no
revela existencia de cuentas. No hay ningún hallazgo de seguridad pendiente de atender antes de
seguir. La próxima auditoría con sustancia real de seguridad de producto llega con **T-10** (políticas
RLS de los tres roles, previsiblemente ya con la ampliación de P-01 integrada) y **T-14** (bucket de
avatares), que es cuando nacen la mayoría de los puntos de control permanentes de este documento.

### Auditoría 2026-08-27

**Alcance real de esta pasada — ya hay código, pero todavía ninguno de producto.** Desde la
auditoría anterior (2026-08-26) el repositorio avanzó T-00 a T-04 (FASE A completa: andamiaje,
lint estricto, logger, suite de tests con reloj inyectable, CI) más un segundo ciclo de PM que
definió la oleada v2 (R-08 a R-11). T-05 en adelante siguen `PENDIENTE`. Esto significa que la
inmensa mayoría de los puntos de control permanentes de este proyecto (RLS de `asistencia`, RPC,
bucket de avatares, superficie de columnas del `teacher`, rol `student` en tablas de producto,
etc.) **siguen sin aplicar**, porque las tablas, políticas y RPC que auditarían nacen en T-07/T-10/
T-14 y no existen todavía. No se fabrica ningún hallazgo sobre esa funcionalidad inexistente. Lo
que sí existe — el andamiaje de calidad de FASE A — se ha auditado con rigor porque es exactamente
lo que sostiene la promesa de "autonomía total": la red de tests, lint y CI que sustituye a la
revisión humana en todo lo que viene después.

**Verificación directa, no solo lectura de documentos.** Se hizo `git checkout develop && git pull`
(limpio, sin conflicto), se instalaron las dependencias (`npm ci`, que además ejecutó el hook
`prepare` e instaló `.git/hooks/pre-commit` correctamente) y se ejecutaron los cuatro comandos de
verificación exigidos por §0.1: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.
Los cuatro terminan en verde, tal cual reclaman `SEGUIMIENTO.md` y `HISTORIAL_SESIONES.md` — **41
tests, 0 fallos**. Se confirmó además contra la API de GitHub Actions (herramienta MCP `github`)
que los tres runs de CI en `develop` (incluido el del commit actual, `ce4e0ea`) terminaron
`completed`/`success`.

**Las reglas de guarda del stack no son solo documentación — se comprobó que ESLint las hace
cumplir de verdad**, creando y borrando ficheros de prueba dentro de `src/`: un import de
`@supabase/supabase-js` falla (con el mensaje específico nombrado en T-01, más el genérico de
terceros y el de `console`, los tres a la vez), un `innerHTML` falla, un `fetch` fuera de
`src/datos/` falla, y ese mismo `fetch` **sí** pasa dentro de `src/datos/`. Un `grep` sobre todo
`src/` no encuentra ningún `console.*` fuera de `src/nucleo/registro.ts`, ningún `fetch` fuera de
`src/datos/`, ni ningún `innerHTML`. `dependencies` de `package.json` sigue vacío, verificado
directamente, no solo leído. **Sin hallazgo**: las cuatro reglas de T-01 funcionan por herramienta,
no por promesa.

**Secretos** — se repitió la búsqueda de la pasada anterior sobre el estado nuevo del repositorio:
ningún token, contraseña ni clave `service_role` aparece commiteado. `.gitignore` sigue cubriendo
`.env.local` y `.env`; `.env.ejemplo` documenta las variables sin valores, ahora con las nuevas
(`SUPABASE_*_DEV/PROD`, `PERMITIR_PROD`, `ZONA_HORARIA_CENTRO`) igual de vacías. `git status` está
limpio. **Sin hallazgo.**

**Calidad real de los tests (T-03) — la tarea que más pesa en autonomía total.** No se dio por
buena la suite por estar verde: se leyó el contenido de los 41 tests. No son triviales. Cubren
casos de frontera reales de la lógica que sí existe hoy: inclusión/exclusión exacta de
`horaInicio`/`horaFin` en `slotActivoEnInstante`, el límite exacto de la ventana de edición del
profesor en `puedeEditarAsistencia` (un milisegundo por encima y por debajo del margen), que un
`administrator` puede editar cualquier registro por antiguo que sea y que un `teacher` no puede
tocar el de otro aunque esté dentro de su ventana, y que el logger depura por nombre de campo, por
forma del valor (JWT, cadena opaca) y recursivamente en objetos y arrays anidados — con un test que
confirma explícitamente que un identificador (`alumno_id`) no se depura por error. La guarda
automática `disciplinaReloj.test.ts` (recorre por filesystem todo `.ts` de `src/dominio/` y falla
si aparece `new Date()`/`Date.now()` sin argumentos) es un mecanismo real, no un `# TODO`: se
comprobó que hoy no hay ningún fichero de dominio que lo dispare. Es una base pequeña pero honesta:
`slots.ts` y `asistencia.ts` están documentados en su propia cabecera como "provisionales e
ilustrativos" (tipos propios, no los oficiales de T-07; día/hora en UTC, no en la zona horaria del
centro), y `DECISIONES_TECNICAS.md` explica por qué y qué tarea los reemplaza — no es un intento de
hacer pasar un placeholder por trabajo terminado. **Sin hallazgo.**

**Guardas del runner de migraciones** — no aplica: T-07 (que escribe `herramientas/migrar.ts`)
sigue `PENDIENTE`. Nada que evaluar todavía.

**Coherencia entre lo decidido y lo ejecutado:** `DECISIONES_TECNICAS.md` registra 15 decisiones
nuevas desde la pasada anterior (T-00 a T-04), todas con alternativas consideradas y su porqué, y
ninguna contradice §0.2. Se contrastaron varias contra el código real, no solo contra su propio
texto: la decisión de separar `tsconfig.build.json` de `tsconfig.json` para que `jsdom` no se
filtre al `dist/` desplegable se confirmó leyendo ambos ficheros; la de las cuatro reglas de ESLint
por selector nativo (sin plugin nuevo) se confirmó ejecutándolas contra código de prueba; la de
`dependencies` vacío se confirmó leyendo `package.json`. `SEGUIMIENTO.md` §1 tiene T-00 a T-04
`COMPLETADA` y el resto `PENDIENTE`, consistente con lo que hay en el repositorio. §7 (desviaciones)
sigue vacío — correcto, no ha habido ninguna. §3 (bloqueos) sigue vacío — correcto, T-00 a T-04 no
tienen bloqueo humano y T-05 tampoco lo tiene por sí sola. El PM registró el segundo ciclo (oleada
v2, R-08 a R-11) sin tocar código ni estado de desarrollo, tal como declara su propia entrada en
`HISTORIAL_SESIONES.md`, y esa entrada además referencia correctamente el hallazgo #1 de este
documento (lo revisó, no lo cerró, lo convirtió en la pregunta #3 de §6) — es exactamente el
mecanismo de trazabilidad que exige el protocolo.

**Oleada v2 del roadmap (R-08 a R-11), revisada frase a frase contra las restricciones
innegociables:** no introduce ningún campo personal nuevo (R-08, la importación CSV, usa
literalmente las mismas columnas de la ficha de T-12); no amplía el rol `student` en ningún punto;
y R-11 (panel de centro) declara explícitamente "nunca avatar" en sus rankings — coherente con el
punto de control de este documento de que el avatar no debe aparecer en listados generales. Nada
que objetar.

**Reevaluación del hallazgo #1 (ABIERTO, higiene documental, severidad baja):** sigue exactamente
igual que en la pasada anterior. No ha habido ninguna nueva edición de `HOJA_DE_RUTA.md` (se
comprobó con `git log -- roadmap/HOJA_DE_RUTA.md`: el único commit que la toca sigue siendo el de
arranque). El ciclo de PM del 2026-08-26 lo revisó correctamente y lo convirtió en la pregunta #3 de
§6 de `SEGUIMIENTO.md`, en vez de intentar resolverlo por su cuenta (el propio documento declara al
PM en modo SOLO LECTURA sobre `HOJA_DE_RUTA.md`). Sigue sin respuesta del dueño. Se mantiene
`ABIERTO`, sin escalar: sigue sin riesgo de dato ni operativo asociado.

**Ningún hallazgo nuevo esta pasada.** No porque no se haya buscado — se ejecutó la suite completa,
se comprobaron las guardas de ESLint contra código adversarial creado para la ocasión, se leyó el
código fuente completo de `src/`, se repitió el barrido de secretos, y se contrastó CI contra la
API real de GitHub — sino porque el estado del repositorio coincide, punto por punto, con lo que
`DECISIONES_TECNICAS.md`, `SEGUIMIENTO.md` y `HISTORIAL_SESIONES.md` dicen que hay.

**Conclusión:** FASE A (T-00 a T-04) está completa y es sólida: la verificación pre-push
(`typecheck`, `lint`, `test`, `build`) pasa en local y en CI, las cuatro reglas que defienden el
stack por herramienta funcionan de verdad, el logger depura lo que promete, y la suite de 41 tests
—aunque su alcance de dominio es todavía deliberadamente pequeño y provisional— prueba casos de
frontera reales, no humo. No hay ningún hallazgo de seguridad que atender antes de seguir. La
próxima auditoría con sustancia real de seguridad llega con T-07 (modelo de datos, runner de
migraciones, RLS de `perfil`/`esquema_migracion` ampliado) y sobre todo T-10 (RLS de los tres roles)
y T-14 (bucket de avatares), que es cuando nacen los puntos de control que de verdad sostienen el
valor de este producto.

### Auditoría 2026-08-26

**Alcance real de esta pasada — el proyecto todavía no tiene código.** Todas las tareas T-00 a
T-25 y R-01 a R-07 están `PENDIENTE` en §1 de `SEGUIMIENTO.md`; no existe `package.json`, ni
`src/`, ni ningún `.ts`/`.js` en el repositorio. Lo único ejecutable es el arranque manual del
dueño en `db/` (`000_bootstrap_perfil.sql`, aplicado en `dev` el 2026-08-25, y
`000b_arreglo_permisos.sql`, todavía **pendiente de aplicar** según `db/APLICADAS.md`). Por
instrucción expresa de esta rutina, cuando no hay código la auditoría se limita a la coherencia de
la documentación y de los scripts SQL existentes: no se fabrican hallazgos de RLS, RPC, avatares,
retroactividad, etc. sobre funcionalidad que no existe todavía.

**Puntos de control permanentes — cuáles aplican hoy y con qué resultado:**
La inmensa mayoría de los puntos de control de la tabla de arriba se refieren a tablas, RPC y al
bucket de avatares que nacerán en T-07/T-10/T-14 y que hoy **no existen** (`asistencia`,
`asistencia_historial`, `alumno`, `persona_referencia`, `slot_horario`, bucket `avatares`): no
aplican todavía y no se marcan ni ABIERTO ni RESUELTO, porque no hay nada que auditar. Los puntos
que sí tienen algo real que revisar hoy, porque tocan lo único que existe (`perfil` y
`esquema_migracion`), se han comprobado contra el SQL aplicado y no solo contra la documentación:

- **RLS completa** — `perfil` y `esquema_migracion` tienen `ROW LEVEL SECURITY` activada. `perfil`
  tiene políticas explícitas para las cuatro operaciones que necesita (lectura propia, lectura y
  escritura de `administrator`, sin `DELETE` para nadie). `esquema_migracion` no tiene ninguna
  política a propósito — se consulta solo a través de `esquema_version()`, `SECURITY DEFINER` — lo
  cual es coherente con su propio comentario en el SQL. **Sin hallazgo.**
- **Rol `student` cerrado** — la única política que alcanza a `student` en todo el esquema actual
  es `perfil_leer_propio` (cualquier autenticado lee su propia fila), que es exactamente la única
  excepción que documentan `PROYECTO.md` y §0.2 de la hoja de ruta. No hay ninguna otra política
  para `student` en `perfil` ni en `esquema_migracion`. **Sin hallazgo.**
- **Privilegios de tabla** — `000_bootstrap_perfil.sql` concede a `authenticated` solo `SELECT`,
  `INSERT`, `UPDATE` sobre `perfil` y revoca `DELETE`, pero **no** revoca explícitamente lo que
  Supabase concede por defecto (el propio fallo que ya se documentó: `TRUNCATE` heredado). Ese
  arreglo vive en `000b_arreglo_permisos.sql`, que además añade
  `alter default privileges ... revoke all on tables from anon, authenticated`, cerrando el
  problema para toda tabla futura. El fichero está commiteado, es correcto y coherente con la
  regla de §0.2 — pero `db/APLICADAS.md` señala honestamente que **todavía no se ha aplicado en
  `dev`**. Es decir: mientras no se ejecute, es posible que la base de datos real siga teniendo
  `TRUNCATE` para `authenticated` sobre `perfil`. Esto ya está correctamente trazado como pendiente
  por el propio proyecto (no es un hallazgo del auditor, es un pendiente reconocido); se deja
  constancia aquí para que la próxima pasada confirme que, una vez aplicado, el estado real
  coincide con lo que dice el fichero.
- **Secretos** — se ha recorrido el repositorio buscando el access token, contraseñas o la clave
  `service_role`: no aparece ningún valor de secreto, solo el nombre del rol `service_role` en
  comentarios y documentación (uso legítimo). `.gitignore` cubre `.env.local` y `.env`;
  `.env.ejemplo` documenta las variables sin valores. **Sin hallazgo.**
- **Stack** — no existe `package.json`: `dependencies` no puede estar "vacío" porque el andamiaje
  de T-00 aún no se ha creado. No ha entrado ningún framework ni el SDK de Supabase porque no hay
  ningún fichero de código. Trivialmente coherente con la regla, sin nada que reprochar.
- **Calidad real de los tests, runner de migraciones y sus guardas** — no aplican: T-03 y T-07
  están `PENDIENTE`. Nada que evaluar todavía; se revisará con rigor en cuanto exista código,
  precisamente porque T-03 es la tarea que más pesa en el modo de autonomía total.

**Coherencia entre lo decidido y lo ejecutado:**
`DECISIONES_TECNICAS.md` está vacío (solo cabecera), lo cual es coherente: es un registro de
decisiones técnicas tomadas de forma autónoma por el programador durante el desarrollo, y ninguna
sesión de desarrollo ha corrido todavía. Las decisiones de producto ya tomadas por el dueño el
2026-08-25 (asistencia editable en vez de append-only, ampliación de la lectura del bucket de
avatares al `teacher` sobre alumnos activos, una cuenta por profesor) están recogidas de forma
consistente en `PROYECTO.md`, en §0.1/§0.2 de `HOJA_DE_RUTA.md` y en `SEGUIMIENTO.md` §6 — sin
contradicciones entre esos tres documentos. §7 de `SEGUIMIENTO.md` (desviaciones) está vacío, lo
cual es correcto porque no ha habido ninguna sesión de desarrollo que pudiera desviarse todavía.

`ROADMAP_PRODUCTO.md` (oleada v1, R-01 a R-07, definida por el PM el 2026-08-25) se ha revisado
frase a frase contra las restricciones no negociables que el propio prompt del PM se impone: no
introduce ningún dato personal nuevo, no amplía el acceso del rol `student`, no lleva el avatar
fuera de la ficha del alumno y las cards del slot del profesor, no introduce dependencias de
runtime, y escala a §6 (como pregunta, no como tarea) todo lo que dependería de una decisión
reservada al dueño (envío automático de avisos, acceso de `student` o de una persona de referencia
al histórico). Es coherente con lo pactado.

**Único hallazgo de esta pasada:** `HOJA_DE_RUTA.md` se autodeclara inmutable y fue editada por el
dueño 41 minutos después de crearse, el mismo día — antes de que empezara ningún desarrollo, y sin
riesgo de dato asociado —, ver #1 en el registro de arriba. Severidad baja, es un aviso de higiene
documental, no una alerta operativa.

**Conclusión:** el proyecto está en fase de arranque puro. La documentación es inusualmente
completa, internamente consistente entre sus distintos ficheros, y los dos scripts SQL aplicados o
pendientes de aplicar respetan al pie de la letra las reglas de §0.2 (RLS activada, sin política
para `student` salvo la excepción documentada, privilegios explícitos, sin secretos). No hay
código que auditar en cuanto a RLS de `asistencia`, bucket de avatares, RPC, retroactividad ni
superficie de columnas del `teacher`, porque nada de eso existe todavía: la próxima auditoría útil
en profundidad llega con T-07/T-10, cuando el esquema completo y sus políticas se apliquen.
