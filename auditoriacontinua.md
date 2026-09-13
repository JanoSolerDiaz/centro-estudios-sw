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
| #5 | 2026-09-01 | Gobernanza documental | baja | RESUELTO (2026-09-02) | `db/MODELO.md:296` (sección T-14, avatar) sigue diciendo "falta únicamente el punto de montaje real en una pantalla (T-16)" — nota escrita en la sesión de T-14 (2026-08-31), antes de que T-16 existiera. T-16 ya está `COMPLETADA` (mismo día) y el bloque de avatar ya está montado de verdad: `src/ui/pantallaFichaAlumno.ts` monta `montarBloqueAvatar` (línea 524, cableado en la línea 1097). Mismo patrón exacto que el hallazgo #4 ya cerrado: una frase de estado que no se revisó al completar la tarea que dejaba pendiente, sin ningún impacto funcional ni de seguridad. **Resuelto:** **P-13** (2026-09-02) actualizó `db/MODELO.md:371-372`: ya no dice "falta únicamente el punto de montaje", dice que está montado de verdad en `pantallaFichaAlumno.ts` (`montarBloqueAvatar`) desde T-16. Verificado por este auditor con `git diff` de la línea y `grep -n "falta únicamente\|por escribir" db/MODELO.md`: cero coincidencias. | `db/MODELO.md:296→371-372`; `src/ui/pantallaFichaAlumno.ts:524,1097`; origen: auditoría #5 (2026-09-01); resuelto por P-13, `SEGUIMIENTO.md` §5 |
| #6 | 2026-09-01 | Gobernanza documental | baja | RESUELTO (2026-09-02) | Numeración cruzada de las preguntas abiertas #12/#13 de §6 de `SEGUIMIENTO.md` (T-18, retroactividad/duplicados): la tabla de §6 es internamente coherente (línea 496: `#12` = duplicado mismo alumno/slot/día; línea 497: `#13` = ventana retroactiva máxima), y así la etiqueta también `db/005_rpc_registrar_asistencia.sql:26` (duplicados = "pregunta abierta #12"). Pero la propia narrativa de la sesión de T-18 en `SEGUIMIENTO.md` las intercambia: la línea 37 llama "#12" a la ventana retroactiva (debería ser #13) y la línea 43 llama "#13" al duplicado (debería ser #12); `roadmap/DECISIONES_TECNICAS.md:147` repite el mismo intercambio ("pregunta abierta #12... para la primera", refiriéndose a la ventana retroactiva). Sin impacto funcional: el código usa en los dos casos el valor conservador por defecto (7 días / rechazar duplicado) documentado en la spec, no una lectura equivocada de la pregunta; es solo una referencia cruzada mal etiquetada para quien intente localizar la pregunta por su número desde la narrativa en vez de desde la tabla. **Resuelto:** **P-14** (2026-09-02) corrigió las dos menciones narrativas de `SEGUIMIENTO.md` (ventana retroactiva = #13, duplicado = #12) y la de `DECISIONES_TECNICAS.md:147`. Verificado por este auditor con `grep -n "pregunta abierta #1[23]"` sobre los dos ficheros: las tres menciones narrativas restantes ya coinciden con la tabla de §6. | `roadmap/SEGUIMIENTO.md:37,43` (narrativa, ya corregida) vs. `:496-497` (tabla, correcta); `roadmap/DECISIONES_TECNICAS.md:147` (ya corregida); `db/005_rpc_registrar_asistencia.sql:26` (correcto); origen: auditoría #5 (2026-09-01); resuelto por P-14, `SEGUIMIENTO.md` §5 |
| #7 | 2026-09-01 | Calidad de código (higiene) | baja | RESUELTO (2026-09-02) | `columnasVisiblesFichaAlumno` (`src/dominio/permisosUi.ts:56`) está definida y testeada (`permisosUi.test.ts:47-62`, dos casos: `teacher`/`student` ven solo columnas de identificación, `administrator` ve también las de contacto) pero ninguna pantalla la importa ni la usa (`grep -rn "columnasVisiblesFichaAlumno" src/` solo devuelve su propia definición y su test) — código muerto, no un control de acceso activo. No es una fuga: la protección real de las columnas de contacto vive en el `GRANT` de columna de `003_politicas_rls.sql` y en la vista `alumno_ficha`, ninguno de los dos depende de esta función. Conviene o bien conectarla a la pantalla de ficha (si la intención era filtrar columnas en el cliente también) o eliminarla, para no acumular una función que aparenta ser parte del control de acceso sin estar en el camino real. **Resuelto:** **P-15** (2026-09-02) la eliminó, junto con sus dos tests, en vez de conectarla: no existe ninguna pantalla de ficha para `teacher` en el roadmap ni puede existir dentro del alcance actual (§0.2 es permanente: "el `teacher`... no gestiona fichas ni ve datos de contacto ni personas de referencia"). Verificado por este auditor con `grep -rn "columnasVisiblesFichaAlumno" src/`: cero coincidencias, y `permisosUi.ts` sustituye su hueco por `puedeGestionarUsuarios` (T-24), con consumidor real en `pantallaUsuarios.ts:42`. | `src/dominio/permisosUi.ts:56` (eliminada); `src/dominio/permisosUi.test.ts:47-62` (eliminado); origen: auditoría #5 (2026-09-01); resuelto por P-15, `SEGUIMIENTO.md` §5 |
| #8 | 2026-09-05 | Alcance de datos personales / RGPD art. 9 | alta | ABIERTO | R-02 (`db/011_justificacion_ausencia.sql`, escrita y empujada el 2026-09-04, todavía sin aplicar) añade `asistencia.motivo_justificacion` con un `CHECK` a una lista cerrada que incluye `'enfermedad'` y `'cita_medica'`, más `nota_justificacion` (texto libre, sin ninguna restricción de contenido) — visible para `teacher`/`administrator` en «Registros», en el histórico y en la exportación CSV (requisito 4 de R-02, ya implementado). Tanto `'enfermedad'` como `'cita_medica'` son, por definición (art. 4.15 RGPD: información que revela el estado de salud), datos de la categoría especial del artículo 9, con independencia de que la lista sea corta y sin diagnóstico — y `nota_justificacion`, al ser texto libre sin restricción, permite a un profesor escribir voluntariamente detalle médico todavía más explícito de un menor. `HOJA_DE_RUTA.md` §0.2 (documento inmutable, "Datos personales — alcance y límites") dice literalmente: "Sigue prohibido sin decisión expresa del dueño: ... datos de salud ... y cualquier categoría especial del artículo 9 del RGPD"; la propia tabla de puntos de control de este documento clasifica esa violación como severidad alta. No hay ninguna decisión del dueño que autorice el campo: `DECISIONES_TECNICAS.md` solo registra para R-02 decisiones de mecanismo (dónde vive el `CHECK`, cómo se sustituye el trigger de historial), nunca la pregunta de categoría de dato; `SEGUIMIENTO.md` §6 no tiene ninguna entrada sobre ello; y la propia spec de R-02 (`roadmap/ROADMAP_PRODUCTO.md:190-215`, `Origen: roadmap` — la propuso el ciclo del PM, no el dueño) fija explícitamente "Bloqueo humano: ninguno". Es un contraste llamativo con el propio historial del proyecto: T-09 (bloqueo de cuenta) sí generó pregunta en §6 y fila en §7 antes de ampliar alcance sobre una base mucho menos sensible. Arrastra además dos documentos redactados el mismo día que quedaron desactualizados sin que nadie volviera sobre ellos tras el commit de R-02: `legal/POLITICA_PRIVACIDAD.md:32-34` afirma textualmente "no se guardan ... datos de salud, ... ni ninguna categoría especial del artículo 9 del RGPD", y `roadmap/PRODUCCION_T25.md` (inventario RGPD de T-25, commit `4499eaf`, anterior en la secuencia a R-01/R-02/R-03) afirma "cero dato de salud, cero categoría del artículo 9" verificado solo contra `001_esquema_inicial.sql` — cierto en el instante en que se escribió, falso hoy. La base jurídica que `POLITICA_PRIVACIDAD.md` §3 ofrece para el registro de asistencia ("interés legítimo") no serviría en ningún caso para un dato del artículo 9: ese exige consentimiento explícito u otra excepción del art. 9.2. Todavía no es una fuga en producción — `011` sigue sin aplicar en `dev` (`db/APLICADAS.md`, "Pendiente de aplicar") y no existe proyecto de producción — pero es exactamente la desviación entre lo decidido (§0.2) y lo ya escrito en `develop` que esta auditoría existe para atrapar antes de que llegue a producción, y debe bloquear tanto la aprobación final de los textos legales de T-25 como la aplicación de `011`/`012` en su forma actual hasta que el dueño decida: aceptar el campo como dato de salud (con base jurídica y medidas del artículo 9 explícitas, corrigiendo los cuatro documentos de `legal/` y el inventario de `PRODUCCION_T25.md`), reformularlo para no revelar salud (p. ej. una única categoría "justificada" sin desglose médico), o retirarlo. Verificado de forma independiente por dos vías: lectura directa de este auditor de `HOJA_DE_RUTA.md` §0.2, `db/011_justificacion_ausencia.sql`, `roadmap/ROADMAP_PRODUCTO.md:190-215` y `DECISIONES_TECNICAS.md`, y dos subagentes de investigación despachados por separado (uno centrado en T-25/`legal/`, otro en la coherencia roadmap-vs-código) que llegaron al mismo hallazgo sin verse el uno al otro. **Actualización (2026-09-06):** el duodécimo ciclo del PM (commit `f1215ca`, 2026-09-05) convirtió este hallazgo en la pregunta **#16** de §6 de `SEGUIMIENTO.md`, con las mismas tres opciones planteadas arriba, y condicionó la fila 14 de §3 (no aplicar `011`) y la fila 12 (no aprobar los textos legales de T-25) a que el dueño la responda. Verificado por este auditor leyendo la fila 16 completa: recoge las tres opciones sin recortar ni cambiar su sentido. Es la vía de resolución correcta para un hallazgo de esta clase, pero no una resolución de fondo — no hay todavía respuesta del dueño, `motivo_justificacion` sigue en el esquema tal cual y `011` sigue sin aplicar (`db/APLICADAS.md` sin cambio) —, así que **permanece ABIERTO**. **Confirmado sin cambio (2026-09-10):** la pregunta #16 de §6 de `SEGUIMIENTO.md` sigue con la columna "Respuesta" vacía (verificado por este auditor con lectura directa de la fila), la fila 14 de §3 sigue diciendo "NO aplicar todavía... antes de nada, responder la pregunta #16", y ninguna de las seis sesiones nuevas desde la pasada anterior ha tocado `011_justificacion_ausencia.sql` ni los textos de `legal/`. Sigue **ABIERTO**. **Confirmado sin cambio (2026-09-11):** la pregunta #16 de §6 sigue con la columna "Respuesta" vacía, la fila 14 de §3 mantiene literalmente la misma condición de bloqueo, `db/APLICADAS.md` no registra `011` como aplicada, y ninguno de los seis commits nuevos desde la pasada anterior (`9f0a377`, `29de11d`, `72772aa`, `ac7cafc`, `0120178`, `970381f`) toca `db/011_justificacion_ausencia.sql` ni ningún documento de `legal/`: todos son R-17, R-18, el cierre de los hallazgos #15/#17/#18/#19, dos ciclos programados sin trabajo accionable, y la apertura de R-19 (Oleada v5, sin relación con este hallazgo). Verificado de forma independiente por un subagente de investigación despachado por separado. Sigue **ABIERTO**. **Confirmado sin cambio (2026-09-12):** la fila 16 de §6 de `SEGUIMIENTO.md` sigue terminando en una columna "Respuesta" vacía (lectura directa de la fila completa), la fila 14 de §3 conserva literalmente la misma condición de bloqueo ("Antes de nada, responder la pregunta #16 de §6..."), `db/APLICADAS.md` no registra ningún cambio (`011` sigue "Pendiente de aplicar", `009` sigue siendo la última aplicada), y ninguno de los seis commits nuevos desde la pasada anterior (`970381f`, `0120178`, `c9f40ac`, `acff221`, `d7f4cf8`, `81e6afa`, `ca13186`, `62dd385` — ocho, no seis: R-19 completada, cuatro ciclos sin trabajo accionable y la apertura de R-20/Oleada v6) toca `db/011_justificacion_ausencia.sql` ni ningún documento de `legal/`. Sigue **ABIERTO**, sin ninguna vía para que cambiara sin una decisión del dueño. **Confirmado sin cambio (2026-09-13):** el único commit nuevo desde la pasada anterior (`bdd4508`, decimonoveno ciclo del PM) es bookkeeping de roadmap puro — `git diff e79de3c..HEAD` toca solo `ROADMAP_PRODUCTO.md`, `SEGUIMIENTO.md` y `HISTORIAL_SESIONES.md`, ninguno de los tres en `db/` ni en `legal/`. La fila 16 de §6 de `SEGUIMIENTO.md` sigue terminando en una columna "Respuesta" vacía (lectura directa de la fila completa), la fila 14 de §3 conserva literalmente la misma condición de bloqueo, y `db/APLICADAS.md` no registra ningún cambio (`011` sigue "Pendiente de aplicar", `009` sigue siendo la última aplicada). Sigue **ABIERTO**. | `db/011_justificacion_ausencia.sql`; `roadmap/ROADMAP_PRODUCTO.md:190-215`; `legal/POLITICA_PRIVACIDAD.md:32-34`; `legal/CONSENTIMIENTO_TRATAMIENTO.md`; `roadmap/PRODUCCION_T25.md` §3; origen: auditoría #8 (2026-09-05); escalado a pregunta #16 de §6 por el duodécimo ciclo del PM |
| #9 | 2026-09-05 | Gobernanza documental | baja | RESUELTO (2026-09-07) | `roadmap/SEGUIMIENTO.md` §7 ("Desviaciones respecto a la hoja de ruta original", "el resumen consolidado para comparar contra HOJA_DE_RUTA.md de un vistazo") no tiene fila para dos desviaciones reales de este lote, aunque ambas quedaron documentadas en otro sitio: (a) T-25 (commit `4499eaf`) descubrió que el requisito 8 de T-14 (aviso de consentimiento del tutor legal para el avatar) nunca había llegado a la interfaz pese a que T-14 lleva `COMPLETADA` desde el 2026-08-31 y ha sobrevivido a varias pasadas de este auditor sin que se notara — corregido en el mismo commit (`src/ui/pantallaFichaAlumno.ts`, nota de consentimiento con test) y documentado en `DECISIONES_TECNICAS.md`/`HISTORIAL_SESIONES.md`, pero sin fila en §7 pese a encajar en el mismo patrón que esa sección ya usa (p. ej. su fila de T-12 del 2026-08-28, "criterio de aceptación no cumplido literalmente"); (b) el propio hallazgo #8 de este documento tampoco tiene fila en §7 todavía. Sin impacto funcional ni de seguridad por sí solo — ambas desviaciones están recogidas en documentos de detalle, así que no se han perdido —, pero reduce el valor de §7 como resumen de un vistazo, que es exactamente para lo que existe. **Actualización (2026-09-06):** el duodécimo ciclo del PM (commit `f1215ca`, 2026-09-05) lo registró como **P-17** en el backlog de §5, `PENDIENTE`, para que una sesión de programador añada las dos filas — mismo criterio que P-03/P-13/P-14. **Resuelto:** la sesión de R-12 (commit `9f4d388`, 2026-09-07) ejecutó P-17 "en el camino" (mencionado en su propio mensaje de commit) y añadió las dos filas que faltaban. Verificado por este auditor con lectura directa de §7 (`roadmap/SEGUIMIENTO.md`, líneas 1809-1820): la fila `2026-09-04 | T-14 / T-25` (aviso de consentimiento del avatar) y la fila `2026-09-05 | R-02` (dato de salud de `motivo_justificacion`, el propio hallazgo #8) existen ya, con el mismo formato que las demás filas de la sección. §5 confirma **P-17 `RESUELTA`**. | `roadmap/SEGUIMIENTO.md` §7 (filas añadidas) y §5 (`P-17` `RESUELTA`); origen: auditoría #8 (2026-09-05); resuelto por la sesión de R-12, commit `9f4d388` |
| #10 | 2026-09-08 | Calidad de la batería de pruebas / privilegios de tabla | alta | RESUELTO (2026-09-08) | `db/pruebas_rls.sql`, sección 8 ("TRUNCATE por `authenticated` — debe fallar en TODAS las tablas del esquema `public`", líneas 1097-1128) itera un array literal de nueve tablas que **no incluye las dos tablas nuevas de este lote**: `cierre_centro` (`db/014_calendario_cierres.sql`, R-12) ni `excepcion_slot` (`db/013_excepcion_slot.sql`, R-06). Confirmado con lectura directa del array (línea 1104-1106: `'perfil', 'centro_estudios', 'alumno', 'persona_referencia', 'slot_horario', 'asistencia', 'asistencia_historial', 'evento_error', 'limite_tasa'`, sin ninguna de las dos nuevas) y con `grep` de `truncate` sobre el fichero completo: es la única sección que ejecuta `TRUNCATE`, y no se amplió. Contraste revelador: las otras dos barridos obligatorios de este mismo fichero **sí se ampliaron correctamente** para las dos tablas nuevas — sección 6 (`student`, línea 741-742: `..., 'cierre_centro', 'excepcion_slot'`) y sección 8f (`anon`, línea 1757-1758, misma ampliación) —, así que la omisión de la sección 8 no es que nadie tocara el fichero, es que se actualizaron dos de los tres barridos y el tercero no. Verificación de los `GRANT` reales de ambas migraciones (no solo de la batería): las dos son correctas hoy — `014_calendario_cierres.sql` hace `revoke all on public.cierre_centro from anon, authenticated, service_role` antes de conceder `select, insert, update` (nunca `delete` ni `truncate`) a `authenticated`; `013_excepcion_slot.sql` hace lo mismo y solo concede `select` a `authenticated` (toda escritura pasa por `declarar_excepcion_slot()`/`desactivar_excepcion_slot()`, `SECURITY DEFINER`) — así que **no hay ninguna fuga activa hoy**, y esto no es el mismo defecto que ya ocurrió una vez con `perfil` (`000b_arreglo_permisos.sql`). Lo que falla es la red que debería demostrarlo de forma automática y detectar una regresión futura: la propia tabla de puntos de control de este documento es explícita en que este privilegio "se reintroduce solo" (Supabase concede privilegios por defecto a `anon`/`authenticated` en cada tabla nueva del esquema `public`) y en que ya mordió una vez — el barrido de TRUNCATE es la única comprobación pensada para detectarlo sin que nadie tenga que acordarse, y hoy tiene un punto ciego exacto sobre las dos tablas más recientes del proyecto. Mismo patrón de fondo que el hallazgo histórico #2 (RESUELTO en 2026-09-01): una batería que en conjunto parece completa (dos de los tres barridos sí están al día) deja sin ejercitar precisamente el caso que el propio proyecto señala como el más peligroso de todos ("severidad alta" en la tabla de puntos de control permanentes). Como ninguna de las dos migraciones está aplicada todavía en `dev` (`db/APLICADAS.md`), no bloquea nada hoy — pero debe corregirse antes o junto con su aplicación, para que `npm run probar-rls` post-aplicación verifique de verdad las nueve tablas más las dos nuevas, once en total. **Resuelto:** la sesión de R-07 (commit `20bd734`, 2026-09-08) ejecutó **P-18** (urgente) "en el camino": el array de la sección 8 ganó `'cierre_centro', 'excepcion_slot'`, sin tocar ningún `GRANT` real. Verificado por este auditor con lectura directa de `db/pruebas_rls.sql:1104-1108`: el array ahora lista las once tablas, las mismas que los barridos de `student`/`anon`. | `db/pruebas_rls.sql` (sección 8, líneas 1104-1108, array ampliado); origen: auditoría 2026-09-08; resuelto por P-18, commit `20bd734` |
| #11 | 2026-09-08 | Gobernanza documental | baja | RESUELTO (2026-09-08) | `roadmap/SEGUIMIENTO.md` §7 vuelve a quedarse sin una fila para la desviación real más reciente del proyecto, exactamente el mismo patrón que ya causó el hallazgo #9 (arriba, `RESUELTO`): la sesión de R-05 (2026-09-07) implementó el requisito 4 de esa tarea (acceso de `teacher` a personas de referencia por el botón «avisar») en un alcance **menor** del que pedía literalmente la spec original, por contradecir §0.2 de `HOJA_DE_RUTA.md` ("el `teacher`... no ve datos de contacto ni personas de referencia") — se entregó solo para `administrator` y se abrió la pregunta **#17** de §6 para que el dueño decida. Es el mismo tipo exacto de desviación que la fila de R-02 (2026-09-05) ya registra en esa misma sección de §7 ("alcance de datos personales ampliado sin decisión expresa del dueño" / aquí, a la inversa, "alcance de rol pedido por la spec y no concedido sin decisión expresa del dueño"), y está correctamente documentada en otros dos sitios — `roadmap/DECISIONES_TECNICAS.md` (fila R-05, 2026-09-07, la más extensa de las nuevas entradas) y la pregunta #17 de §6 de `SEGUIMIENTO.md` —, así que no se ha perdido. Pero §7 (verificado por este auditor leyendo la sección completa, líneas 1809-1820) termina todavía en la fila de R-02 (2026-09-05) sin ninguna fila para R-05 (2026-09-07), pese a que la propia sección volvió a ganar dos filas nuevas correctas hace apenas un día de trabajo (P-17). Sin impacto funcional ni de seguridad: R-05 se entregó en el alcance conservador (sin acceso para `teacher`), que es el mismo comportamiento que tenía antes de que R-05 existiera. Pero es la segunda vez que el mismo tipo de hallazgo se repite en la misma sección, lo que sugiere que el paso "añadir la fila a §7 cuando se abre una pregunta de alcance en §6" no se ha incorporado todavía como parte del propio protocolo del ciclo de PM, solo se corrige cuando el auditor lo señala. **Resuelto:** la misma sesión de R-07 (commit `20bd734`, 2026-09-08) ejecutó **P-19** "en el camino": añadida la fila `2026-09-07 | R-05` en §7. Verificado por este auditor con lectura directa de `roadmap/SEGUIMIENTO.md:2132`: la fila existe, con el mismo formato que las demás, y además el ciclo del PM que abrió R-15/R-16 (commit `0313ec8`) también añadió, en el mismo gesto, la fila `2026-09-08 | R-08` (migración imprevista) — la lección de #9/#11 parece haber calado esta vez sin que el auditor tuviera que repetirlo una tercera vez. | `roadmap/SEGUIMIENTO.md:2132` (fila R-05 añadida) y `:2133` (fila R-08, del ciclo siguiente); origen: auditoría 2026-09-08 (mismo patrón que el hallazgo #9, ya `RESUELTO`); resuelto por P-19, commit `20bd734` |
| #12 | 2026-09-09 | Cola offline de asistencia (R-07) | alta | RESUELTO (2026-09-10) | La cola offline de `pasar lista` (`src/nucleo/colaAsistenciaOffline.ts`, integrada en `src/ui/pantallaPasarLista.ts`) encola cada toque SIN el instante en que ocurrió: en los tres puntos de encolado (`pantallaPasarLista.ts:979`, `:1040`, `:1215`) la entrada que se guarda nunca incluye `ocurridoEn`, así que cuando `vaciarColaOffline` (línea 802) reintenta la llamada al recuperar conexión, la RPC (`db/005_rpc_registrar_asistencia.sql:207-209`) usa `now()` **del momento del vaciado**, no del momento del toque, como `ocurrido_en`. Escenario concreto: un profesor marca presente a un alumno a las 10:05 sin wifi; la pestaña sigue abierta (requisito 4 de R-07, "sobrevive a un cierre de pestaña") y la conexión no vuelve hasta la tarde, o hasta el día siguiente si el profesor no ha cerrado el navegador — el registro queda fechado a la hora del vaciado, no a las 10:05, con `es_retroactivo = false` aunque en la práctica sea un registro añadido a posteriori. La consecuencia no es solo cosmética: `asistencia_uq_alumno_slot_dia_valida` (T-18) es una restricción de unicidad parcial sobre `(alumno, slot, ocurrido_en::date)` — si el vaciado cae al día siguiente, el toque de ayer puede chocar con un registro genuino de HOY para el mismo alumno/slot, la RPC devuelve `Conflicto`, y `reconciliarElementoOffline` (línea 778) ata la tarjeta al registro de HOY: el toque de ayer nunca llega a existir. Y si mientras tanto el slot dejó de estar vigente (`vigente_hasta` ya pasado), la RPC rechaza con "el slot no está vigente" — un error que no es `ErrorDeRed`, así que el elemento se **elimina de la cola sin reintento** (línea 825) y el registro de asistencia se pierde sin más. Contradice de raíz el propio objetivo de R-07 (que un corte de conexión nunca le cueste al profesor un registro) y roza el espíritu del punto de control "hora del servidor y retroactivos" (aunque ese punto vigila que el CLIENTE no fije `registrado_en`, no que la cola preserve el instante real del toque para `ocurrido_en` — laguna nueva, no una violación literal de ese punto). Verificado por un subagente de investigación despachado por separado, y confirmado por este auditor leyendo directamente `pantallaPasarLista.ts:979` (sin `ocurridoEn` en la entrada encolada) y `db/005_rpc_registrar_asistencia.sql:207-209` (`now()` fija `ocurrido_en` cuando no se informa). Dirección de arreglo evidente y de bajo riesgo: capturar `deps.reloj.ahora()` en el momento de encolar y pasarlo como `ocurridoEn` (parámetro ya soportado por la RPC; el servidor sigue fijando él mismo `registrado_en`/`profesor_id`, sin que esto reabra ningún hueco de "hora del cliente"). **Resuelto:** **P-20** (urgente, 2026-09-09, commit `091c784`) hizo exactamente eso: los tres puntos de encolado (`manejarToque`, `manejarAusente`, `registrarExtra`) capturan ahora `ocurridoEn: deps.reloj.ahora()` en el momento del toque, no del vaciado. Verificado por este auditor con lectura directa de `src/ui/pantallaPasarLista.ts:993` (`manejarToque`), `:1059` (`manejarAusente`) y `:1235` (`registrarExtra`): los tres capturan el reloj inline dentro del `catch` que encola tras el fallo de red del intento real; `vaciarColaOffline` (`:826-827`) reenvía `elemento.entrada` tal cual, sin recalcular `ocurridoEn`. Un subagente de investigación despachado por separado llegó a la misma conclusión leyendo el mismo código; este auditor lo confirmó de forma independiente antes de aceptarlo. | `src/ui/pantallaPasarLista.ts:975-989,1036-1041,1207-1216` (encolado sin `ocurridoEn`), `:802-833` (`vaciarColaOffline`), `:778` (`reconciliarElementoOffline`); `db/005_rpc_registrar_asistencia.sql:207-209`; origen: auditoría 2026-09-09; resuelto por P-20, commit `091c784` |
| #13 | 2026-09-09 | Cola offline de asistencia (R-07) | alta | RESUELTO (2026-09-10) | La cola offline (`crearAlmacenColaAsistenciaIndexedDB`, `src/nucleo/colaAsistenciaOffline.ts:58`) vive bajo un nombre de base de datos FIJO (`gestoracademia-cola-asistencia-offline`), sin ninguna partición por profesor ni por sesión — `src/ui/aplicacion.ts:437` la construye a partir de `window.indexedDB` sin mezclar `perfil.id`. En un dispositivo compartido (un tablet o PC de aula, plausible para "pasar lista" en un centro con varios profesores) esto tiene dos consecuencias reales, ambas por el mismo camino de código: si el profesor A encola toques sin red y cierra sesión antes de que la cola se vacíe, y el profesor B inicia sesión en el MISMO navegador antes de que vuelva la conexión, `restaurarColaOffline` (`pantallaPasarLista.ts:849`) repinta los elementos de A y `vaciarColaOffline` (`:802`) los reintenta usando el TOKEN de B. (a) Para un toque de `origen: 'manual'` (clase extra), `registrar_asistencia` (`db/005_rpc_registrar_asistencia.sql`) no tiene ningún slot contra el que comprobar pertenencia — fija `v_profesor_id := auth.uid()` (línea 198) sin más, así que el registro se crea con `profesor_id = B`: la asistencia que tomó A queda atribuida en el histórico a B, en silencio, sin ningún error visible. (b) Para un toque de `origen: 'slot'`, la RPC SÍ comprueba pertenencia (línea 245: `if v_slot.profesor_id <> v_profesor_id`) y rechaza la llamada de B — pero ese rechazo no es `ErrorDeRed`, así que el elemento se elimina de la cola sin reintento (`pantallaPasarLista.ts:825`) y `marcarErrorOffline` busca la tarjeta por `elemento.clave` en la pantalla de B, donde esa tarjeta no existe: el registro de A se destruye sin que nadie lo vea. El mismo tramo de código (líneas 821-830: cualquier error que no sea `ErrorDeRed` se trata como definitivo, se borra de la cola y se abandona) tiene además un tercer disparador, sin necesitar ningún dispositivo compartido: un vaciado de una cola grande que agote el propio límite de tasa de T-06 (60 operaciones por profesor y minuto) recibe un `ErrorLimiteAlcanzado` en mitad del barrido — no es `ErrorDeRed` — y borra en cascada el resto de los elementos pendientes del mismo barrido; lo mismo ocurre si el token de sesión caducó mientras el dispositivo estuvo offline (401). Ninguno de estos tres caminos viola una política RLS o un `GRANT` (el servidor sigue exigiendo la pertenencia correcta y sigue siendo quien fija `profesor_id`) — el defecto vive enteramente en el cliente, en cómo la cola offline decide qué reintentar y qué abandonar — pero el resultado neto, atribución de un registro al profesor equivocado o pérdida silenciosa de un registro válido, es exactamente la clase de rotura que este documento existe para atrapar antes de producción. Confirmado por un subagente de investigación despachado por separado y verificado por este auditor leyendo directamente `db/005_rpc_registrar_asistencia.sql:184-263` (sin comprobación de pertenencia para `origen = 'manual'`) y `colaAsistenciaOffline.ts:58`/`aplicacion.ts:437` (nombre de base de datos global, sin partición por usuario). **Resuelto:** **P-21** (urgente, 2026-09-09, commit `091c784`) particionó el nombre de la base de datos IndexedDB por `profesorId` (`crearAlmacenColaAsistenciaIndexedDB(fabrica, profesorId)`, `colaAsistenciaOffline.ts:107-108`, instanciada con `perfil.id` en `aplicacion.ts:487`, re-invocada en cada login) y cambió `vaciarColaOffline` para tratar `ErrorLimiteAlcanzado` y `NoAutenticado` igual que `ErrorDeRed` — detiene el barrido dejando el elemento y los siguientes en cola, en vez de descartarlos (`pantallaPasarLista.ts:831-833`, sin llamada a `eliminar` antes del `return`). Verificado por este auditor (y por un subagente despachado por separado, con el mismo resultado) leyendo directamente los tres puntos citados: la partición cierra el vector original (un token de sesión B ya no puede leer ni reenviar elementos encolados por A, porque cada profesor tiene su propia base de datos), y el cambio de manejo de errores evita el borrado en cascada ante un límite de tasa o una sesión caducada a mitad de vaciado. Queda, sin ser el mismo defecto, una nota menor para el equipo: la RPC sigue sin comprobar pertenencia alumno↔profesor para `origen = 'manual'` en sí misma (`005_rpc_registrar_asistencia.sql:262-264`, a diferencia de `origen = 'slot'` que sí la comprueba en la línea 245) — no es explotable por el vector que motivó este hallazgo, ya cerrado por la partición de IndexedDB, pero convendría valorarlo si `manual` gana algún día otro camino de entrada. | `src/nucleo/colaAsistenciaOffline.ts:58,107-108`; `src/ui/aplicacion.ts:437,487`; `src/ui/pantallaPasarLista.ts:802-833,849`; `db/005_rpc_registrar_asistencia.sql:184-263`; origen: auditoría 2026-09-09; resuelto por P-21, commit `091c784` |
| #14 | 2026-09-09 | Aplicación instalable (R-09) | media | RESUELTO (2026-09-10) | El aviso de "versión nueva disponible" recarga la página también en la instalación INICIAL del Service Worker, sin que exista ninguna actualización real de por medio. `sw.js:52-58` llama a `self.clients.claim()` en su manejador de `activate` incondicionalmente — comportamiento estándar de la plataforma, correcto para que la primera visita quede controlada sin esperar a una segunda carga — pero eso dispara un evento `controllerchange` en la página incluso quien la primera vez que un Service Worker toma el control (transición de "sin controlador" a "con controlador", no una sustitución de un controlador anterior). El manejador de ese evento en `src/nucleo/registroServiceWorker.ts:56-62` llama a `opciones.alRecargar()` la primera vez que se dispara, sin comprobar si YA había un controlador antes — a diferencia del manejador de `updatefound` (líneas 87-96), que sí distingue explícitamente ese caso ("la primera instalación de todas... no es una actualización, es el arranque", línea 85-86, comentario propio del fichero) comprobando `navegador.controller` antes de avisar. `src/ui/main.ts:151-153` conecta `alRecargar` a `window.location.reload()` sin condición. Escenario: cualquier persona que abra la aplicación por primera vez en un dispositivo nuevo sufre, uno o dos segundos después de cargar, una recarga completa de la página mientras probablemente todavía está escribiendo su email y contraseña en la pantalla de inicio de sesión — pierde lo escrito, sin ningún mensaje que explique por qué. Ocurre una única vez por navegador (las visitas siguientes ya tienen controlador, así que `controllerchange` no se dispararía de nuevo salvo una actualización real), pero es una regresión de UX real y verificable, no hipotética: el propio test que fija este comportamiento (`registroServiceWorker.test.ts`, caso "controllerchange llama a alRecargar, una sola vez aunque se dispare varias") dispara el evento sin fijar ningún `navegador.controller` previo y comprueba que `alRecargar` se llama igualmente — el test documenta el defecto como si fuera el comportamiento esperado, en vez de exigir el mismo guard que ya tiene `updatefound`. Arreglo evidente y de bajo riesgo: añadir `if (!navegador.controller) return;` al principio del manejador de `controllerchange`, igual que ya hace el de `updatefound`. Confirmado por un subagente de investigación despachado por separado; verificado por este auditor leyendo `registroServiceWorker.ts:56-62` y `93`, `sw.js:57`, `main.ts:151-153` y el test que fija el comportamiento actual. **Resuelto:** **P-23** (2026-09-09, commit `e8e37c5`) corrigió el manejador de `controllerchange`. La implementación no usa literalmente el guard `if (!navegador.controller) return;` sugerido por este auditor —ese guard no funcionaría: en el momento en que dispara `controllerchange`, `navegador.controller` YA es el nuevo valor no nulo—, sino un mecanismo equivalente y más correcto: captura `huboControllerAlRegistrar = Boolean(navegador.controller)` **antes** de registrar el Service Worker, y solo trata el evento como actualización real (llamando a `alRecargar`) si ya había controller previo. Verificado por este auditor con lectura directa de `src/nucleo/registroServiceWorker.ts:60-70`, y con los dos casos del test reescrito (`registroServiceWorker.test.ts:170-187`, sin controller previo nunca recarga; `:189-206`, con controller previo recarga una sola vez) — el test ahora EXIGE el comportamiento correcto, no lo tolera como el anterior. Un subagente de investigación despachado por separado llegó a la misma conclusión. | `src/nucleo/registroServiceWorker.ts:56-70` (guard corregido, mecanismo distinto al sugerido pero equivalente); `sw.js:57` (`clients.claim()`, correcto por sí solo); `src/ui/main.ts:151-153`; `src/nucleo/registroServiceWorker.test.ts:170-206` (test reescrito, ahora exige el comportamiento); origen: auditoría 2026-09-09; resuelto por P-23, commit `e8e37c5` |
| #15 | 2026-09-09 | Importación masiva (R-08) | media | RESUELTO (2026-09-10) | `importarAlumnosValidados` (`src/datos/importacionMasiva.ts:62-69`) no es idempotente ante un reintento: genera un `id` nuevo con `crypto.randomUUID()` en cada invocación (línea 66) y la tabla `alumno` no tiene ninguna restricción de unicidad del lado del servidor que pudiera detectar un lote repetido (la detección de duplicados de R-08, `alumnosSonDuplicados`, es solo de cliente, contra los alumnos ya cargados ANTES de confirmar). Escenario: un `administrator` confirma un lote de 48 alumnos nuevos; el `INSERT` en lote llega al servidor y se guarda, pero la respuesta se pierde por un corte de red antes de llegar al navegador — `pantallaImportacionMasiva.ts:161-163` muestra el error y vuelve a habilitar "Confirmar importación" sobre el MISMO `resultado` ya analizado (`:171-192`); un segundo clic reenvía el mismo lote con 48 `id` nuevos, duplicando los 48 alumnos. Es una tarea exclusiva de `administrator` (confirmado: RLS `alumno_admin_insertar` rechaza a cualquier otro rol independientemente de la comprobación de cliente) y el daño es recuperable a mano (dar de baja los duplicados), así que no alcanza severidad alta — pero es exactamente el mismo patrón de "reintento sin clave de idempotencia" que el resto del proyecto evita deliberadamente en todas partes con `peticionId` (T-18, R-07 incluido). Confirmado por un subagente de investigación despachado por separado; verificado por este auditor leyendo `importacionMasiva.ts:62-69` (UUID nuevo por llamada, sin ningún parámetro de idempotencia) y `db/003_politicas_rls.sql:121-123` (el `INSERT` de `alumno` no tiene ninguna restricción `unique` que pudiera rechazar la repetición). **Confirmado sin cambio (2026-09-10):** `importacionMasiva.ts:66` sigue generando `crypto.randomUUID()` en cada invocación, sin parámetro de idempotencia; registrado como **P-25** en el backlog de §5 (`PENDIENTE`, no urgente por no ser fuga ni fallo de autorización), sin sesión de programador que lo haya atendido todavía. Sigue **ABIERTO**. **Resuelto:** la misma sesión que registró el backlog lo implementó a continuación, en el mismo commit (`72772aa`, 2026-09-10, "columna vertebral agotada"): el `id` de cada fila ya no lo genera `importarAlumnosValidados` en cada invocación — lo fija una única vez `ui/pantallaImportacionMasiva.ts` al analizar el fichero (`deps.generarId`, inyectable, cableado a `crypto.randomUUID()` solo en `aplicacion.ts`) y lo reutiliza tal cual en cualquier reintento del mismo lote, indexado por `numeroFila` en el estado del bloque. Un reintento tras un corte de red reenvía ahora el MISMO `id`: si el primer intento ya escribió, el segundo choca con la clave primaria de `alumno` y PostgREST responde `409`/`Conflicto` en vez de duplicar la fila. Verificado por este auditor con lectura directa del diff de `72772aa`: `datos/importacionMasiva.ts` gana el tipo `FilaAlumnoParaConfirmar` (`{id, datos}`) y ya no genera ningún `id` internamente; 3 tests nuevos (2 en `datos/importacionMasiva.test.ts`, 1 en `ui/pantallaImportacionMasiva.test.ts` que fuerza un primer intento fallido y comprueba que el reintento envía el mismo `id`). Un subagente de investigación despachado por separado llegó a la misma conclusión leyendo el mismo código. | `src/datos/importacionMasiva.ts:62-71`; `src/ui/pantallaImportacionMasiva.ts`; origen: auditoría 2026-09-09; resuelto por P-25, commit `72772aa` |
| #16 | 2026-09-09 | Importación masiva (R-08) | baja | RESUELTO (2026-09-10) | El analizador de CSV propio (`src/nucleo/csv.ts`, requisito 6 de R-08: "parseo de CSV con código propio, sin librería de terceros") no neutraliza ninguna celda que empiece por `=`, `+`, `-` o `@` (inyección de fórmula CSV, la misma clase de riesgo que motiva que las hojas de cálculo avisen al abrir un CSV de origen desconocido): un campo `nombre`/`primer_apellido` importado con ese prefijo se valida solo contra "no vacío" y se guarda literal. El propio proyecto reexporta después esos mismos campos, sin escapar, en el CSV del histórico de asistencia (T-23) y en el expediente RGPD (R-10, `generarJsonExpediente`/impresión no está afectado por ser JSON, pero el CSV del histórico sí) — si ese CSV se reabre en una hoja de cálculo con las fórmulas activadas, una celda como `=HYPERLINK("http://...")` en un nombre de alumno mal escrito (a propósito o por error de quien preparó el CSV de origen) se ejecutaría como fórmula viva. El propio informe de errores de la importación (`valoresOriginales`) no se exporta a ningún fichero descargable hoy, así que ese camino en concreto no está expuesto. Severidad baja porque exige un CSV de origen ya comprometido (el propio `administrator` que lo prepara o alguien con acceso a esa hoja de cálculo antes de importar) y una hoja de cálculo con fórmulas activadas al reabrir la exportación — no es explotable por un `teacher` ni por ningún rol sin acceso de `administrator` ya de por sí completo. Arreglo estándar y barato: anteponer un apóstrofo (`'`) a cualquier celda que empiece por esos cuatro caracteres en `documentoCsv`/`filaCsv` (T-23), el único punto de exportación a CSV del proyecto. Confirmado por un subagente de investigación despachado por separado; verificado por este auditor leyendo `src/nucleo/csv.ts:21-26` (sin neutralización) y confirmando que `documentoCsv`/`filaCsv` (T-23) son el único punto de exportación a CSV del proyecto. **Resuelto:** **P-24** (2026-09-09, commit `e8e37c5`) añadió `neutralizarFormulaCsv` (`csv.ts:23,29-31`), que antepone un apóstrofo a cualquier valor que empiece por `=`, `+`, `-` o `@`, invocada desde `escaparCampo` (`:37`) — el único punto de escape que usa `filaCsv` (`:46-48`). Verificado por este auditor que la neutralización cubre también `documentoCsvConMetadatos` (R-15, `:62-74`, nueva desde el commit `698b150`), que delega en el mismo `filaCsv` sin duplicar lógica: los tres puntos de exportación a CSV del proyecto (histórico de asistencia, R-04, R-15) quedan cubiertos de una vez. 5 tests nuevos en `csv.test.ts:29-44` (prefijo `=`, `+`/`-`/`@`, un valor que solo contiene el prefijo en medio y no se toca, combinación con el escapado por comillas). Un subagente de investigación despachado por separado confirmó lo mismo. | `src/nucleo/csv.ts:21-31,37,46-48,62-74` (neutralización, `escaparCampo`, cubre `filaCsv`/`documentoCsv`/`documentoCsvConMetadatos`); `src/nucleo/csv.test.ts:29-44`; origen: auditoría 2026-09-09; resuelto por P-24, commit `e8e37c5` |
| #17 | 2026-09-09 | Aplicación instalable (R-09) | baja | RESUELTO (2026-09-10) | Dos defectos menores de `sw.js`, ninguno con impacto práctico hoy: (a) `RESPUESTA_SIN_RED_NI_CACHE` (líneas 40-44) es una única instancia de `Response` a nivel de módulo, y el cuerpo de una `Response` es de un solo uso — si el precache del cascarón mínimo falla parcialmente en el `install` (línea 48 lo tolera con `.catch(() => undefined)`, "best-effort" por diseño) y el navegador necesita este `fallback` más de una vez en la vida del propio worker, la segunda vez lanzaría al intentar leer un cuerpo ya consumido, sirviendo el error de red crudo del navegador en vez del mensaje en español pensado para ese caso; arreglo trivial, una función que construya una `Response` nueva en cada uso en vez de una constante compartida. (b) La comprobación de "mismo origen" del manejador de `fetch` (línea 94: `peticion.url.startsWith(self.location.origin)`) compara por prefijo de cadena en vez de comparar el origin real (`new URL(peticion.url).origin === self.location.origin`) — en teoría coincidiría también con un dominio que EMPIECE igual que el propio origen seguido de más caracteres (p. ej. `https://academia.example.com.attacker.net` si el origen fuera `https://academia.example.com`); sin impacto hoy porque la `Content-Security-Policy` de `_headers` ya limita `connect-src`/`img-src` a los orígenes esperados, así que el navegador nunca llegaría a intentar una petición así en primer lugar — pero es una comparación más frágil de lo necesario para la única guarda que decide qué intercepta este Service Worker. Ambos, confirmados por un subagente de investigación despachado por separado y verificados por este auditor leyendo `sw.js` completo. **Confirmado sin cambio (2026-09-10):** ambos defectos siguen presentes tal cual (`sw.js:40-44,94`), registrados como **P-26** en el backlog de §5 (`PENDIENTE`, no urgente, sin impacto práctico hoy). Sigue **ABIERTO**. **Resuelto:** la misma sesión, en el mismo commit (`72772aa`, 2026-09-10), implementó los dos arreglos exactos que el hallazgo señalaba: `RESPUESTA_SIN_RED_NI_CACHE` pasó de constante de módulo a `respuestaSinRedNiCache()`, una función que construye una `Response` nueva en cada uso; y la comprobación de mismo origen del manejador de `fetch` compara ahora `new URL(peticion.url).origin === self.location.origin` en vez de `startsWith`. Verificado por este auditor con lectura directa del diff de `72772aa` sobre `sw.js`: ambos cambios están exactamente donde se esperaban, con comentario propio citando el hallazgo #17 por su número. Un subagente de investigación despachado por separado confirmó lo mismo leyendo el `sw.js` actual. | `sw.js:40-52` (función, ya ninguna `Response` compartida); `sw.js:107` (comparación de origin real); origen: auditoría 2026-09-09; resuelto por P-26, commit `72772aa` |
| #18 | 2026-09-10 | Catálogo de centros (T-11) / superficie de columnas | alta | RESUELTO (2026-09-10) | `contarAlumnosActivosDeCentro` (`src/datos/centrosEstudios.ts:109-116`, T-11, en producción desde el 2026-09-01) consulta la tabla BASE `alumno` filtrando por `.eq('centro_referencia_id', centroId)` — pero `centro_referencia_id` es precisamente una de las columnas de contacto/gestión que `003_politicas_rls.sql:107-109` **nunca** concede a `authenticated` en el `GRANT` de columna de `alumno` (solo concede `id, nombre, primer_apellido, segundo_apellido, avatar_ruta, activo`; el resto, incluida `centro_referencia_id`, exige pasar por la vista `alumno_ficha`). Es exactamente el mismo defecto que **P-22** corrigió el 2026-09-09 en `datos/asistencia.ts#idsAlumnosDeCentro` (T-23) — un `GRANT` de columna que la RLS no sustituye: filtra columnas, no filas, y se aplica por igual a cualquier rol de Postgres, incluido `administrator`. Consecuencia: contra una base de datos real, la función respondería "permission denied for column centro_referencia_id" para **cualquier** rol, no un dato filtrado sino una llamada rota — el propio `db/pruebas_rls.sql:1413` ya documenta este mismo mensaje de error en un comentario para el caso gemelo de T-23. `contarAlumnosActivosDeCentro` es el aviso de "cuántos alumnos quedarían apuntando a un centro inactivo" antes de desactivarlo (requisito 3 de T-11), invocada solo desde la pantalla de gestión de centros, exclusiva de `administrator` (`aplicacion.ts:277`) — no es una fuga de dato a `teacher` ni una vulneración de RLS, es una función que hoy no puede haberse ejecutado nunca contra Postgres real sin fallar, indetectable por la suite de tests porque corre contra dobles de `fetch` que no imponen `GRANT` de columna. Mismo patrón de fondo que P-22: "un bug real desde que la función existe, sin detectar porque los tests corren contra dobles". Severidad alta por ser bug real de funcionalidad para `administrator` (no de seguridad ni de RGPD), mismo criterio que motivó tratar P-22 como urgente. Arreglo evidente y de bajo riesgo, mismo patrón que P-22: consultar `alumno_ficha` en vez de la tabla base `alumno`. Descubierto por un subagente de investigación despachado para verificar la resolución de P-22 (buscando si quedaba algún otro lugar del código con el mismo defecto), no buscado a propósito; verificado por este auditor con lectura directa de `centrosEstudios.ts:109-116` y del `GRANT` de columna de `003_politicas_rls.sql:107-109`. | `src/datos/centrosEstudios.ts:109-116`; `db/003_politicas_rls.sql:107-147` (`GRANT` de columna y vista `alumno_ficha`); precedente: P-22 (commit `cc7e65b`, mismo defecto en `datos/asistencia.ts`); origen: auditoría 2026-09-10. **Resuelto:** el mismo día que se abrió, la sesión de R-17 (commit `9f0a377`) atendió **P-27** como urgente, antes de la cola normal (§0.3): `contarAlumnosActivosDeCentro` consulta ahora `alumno_ficha` en vez de la tabla base `alumno`, mismo patrón que P-22, filtrando además por `activo = true` como ya hacía. Verificado por este auditor con lectura directa del diff de `9f0a377` sobre `src/datos/centrosEstudios.ts`: el cambio es exactamente `.desde('alumno')` → `.desde('alumno_ficha')`, con un comentario propio que cita P-27 y P-22 por su nombre; el test de `centrosEstudios.test.ts` exige ahora `/rest/v1/alumno_ficha`. Un subagente de investigación despachado por separado, encargado de recorrer TODAS las consultas de `src/datos/*.ts` contra la tabla base `alumno` en busca de recurrencias del mismo patrón, no encontró ninguna otra ocurrencia: cada función que necesita una columna restringida (`centro_referencia_id`, `email_alumno`, `telefono_alumno`) consulta ya `alumno_ficha`, con comentarios propios que citan P-22/P-27 por su nombre; resuelto por P-27, commit `9f0a377` |
| #19 | 2026-09-10 | Gobernanza documental | baja | RESUELTO (2026-09-10) | `roadmap/SEGUIMIENTO.md` §7 ganó dos filas el 2026-09-09 (líneas 2351-2352) para registrar que R-15 cumple sus criterios de aceptación de forma interpretada, no literal — entre ellas, que "un `teacher` recibe `SinPermiso` al intentarlo" se satisface por inaccesibilidad estructural (la pantalla vive detrás del router de `administrator`, sin ninguna llamada al servidor que devuelva un `403` real), mismo texto que ya usaba R-10 y que motivó explícitamente añadir la fila "para las dos, dado el patrón ya señalado por el auditor (hallazgos #9/#11)... esta sección debe ganar su fila sin que haga falta que lo señale una pasada de auditoría". Pero **R-16** (completada la misma tarde, commit `e901262`, después de R-15) resuelve su propio criterio idéntico ("un `teacher` recibe `SinPermiso` al intentarlo") exactamente por el mismo mecanismo de inaccesibilidad estructural — así lo reconoce la propia `DECISIONES_TECNICAS.md:297` ("Mismo razonamiento que R-15... sin una segunda comprobación de rol") — y no recibió su fila en §7. Es la reaparición exacta del patrón que las dos filas de R-15/R-10 se escribieron para dejar de repetir, dentro del mismo lote de trabajo y a las pocas horas: la lección parece haber calado para el caso que la motivó (R-15/R-10) pero no se generalizó todavía a "cualquier tarea que resuelva así este criterio", solo se corrige cuando el auditor lo señala. Sin impacto funcional ni de seguridad: R-16 es realmente exclusiva de `administrator`, impuesto por RLS (confirmado en la revisión de esta misma pasada), así que el comportamiento es correcto — es puramente un hueco de trazabilidad en el resumen de un vistazo que §7 existe para ofrecer. Verificado por un subagente de investigación despachado por separado y confirmado por este auditor releyendo directamente `SEGUIMIENTO.md:2340-2352` (última fila de §7 es la segunda de R-15, ninguna para R-16) y `DECISIONES_TECNICAS.md:297`. | `roadmap/SEGUIMIENTO.md` §7 (falta fila para R-16, compárese con las filas de R-15 en `:2351-2352`); `roadmap/DECISIONES_TECNICAS.md:297`; origen: auditoría 2026-09-10. **Resuelto:** el mismo commit que atendió P-25/P-26 (`72772aa`, 2026-09-10, "columna vertebral agotada") añadió también la fila que faltaba en §7 para R-16, con el mismo formato que las demás filas del patrón R-15/R-10 ("mismo criterio interpretado... reaparecido en la misma tarde sin ganar su fila en su momento"). Verificado por este auditor con lectura directa de `roadmap/SEGUIMIENTO.md` §7: la fila de R-16 existe ya, cita el hallazgo #19 por su número y dice explícitamente "esta fila cierra el hallazgo #19". Un subagente de investigación despachado por separado confirmó lo mismo | resuelto por commit `72772aa` |

---

## NARRATIVA POR AUDITORÍA

> Cada pasada: fecha, hallazgos y conclusiones. Append, la más reciente arriba. Prestar
> atención especial a la coherencia entre lo decidido (`DECISIONES_TECNICAS.md` y §0.2 de la
> hoja de ruta) y lo realmente implementado, y a las desviaciones (§7 de SEGUIMIENTO).

### Auditoría 2026-09-13

**Alcance real de esta pasada — un único commit desde la anterior (`e79de3c`, 2026-09-12): bookkeeping de roadmap puro, cero código, cero SQL.** `git log e79de3c..HEAD`: `bdd4508` (decimonoveno ciclo del PM — "sin R-XX nueva, R-20 sigue pendiente"). `git diff --stat e79de3c..HEAD`: 3 ficheros, +79/-52, los tres en `roadmap/` (`ROADMAP_PRODUCTO.md`, `SEGUIMIENTO.md`, `HISTORIAL_SESIONES.md`); ninguno en `src/`, `db/` ni `legal/`. Es la pasada más corta hasta ahora en volumen de cambio real que auditar — pero eso no exime de reverificar en ejecución, no solo por herencia de la pasada anterior.

**Verificación en ejecución, no solo lectura.** `git checkout develop && git pull origin develop`: fast-forward limpio. `npm ci` (130 paquetes, sin `node_modules` previo) y, con dependencias instaladas: `npm run typecheck`, `npm run lint` limpios, y `npm test` → **1586/1586, 0 fallos** — misma cifra exacta que viene repitiéndose desde `acff221` (R-19), confirmada ejecutando la suite de verdad, no aceptando la palabra del registro.

**El hallazgo #8 (dato de salud del artículo 9 en `motivo_justificacion`, R-02) sigue `ABIERTO`, sin cambio de fondo — noveno ciclo consecutivo sin novedad.** La pregunta #16 de §6 de `SEGUIMIENTO.md` sigue con la columna "Respuesta" vacía, la fila 14 de §3 mantiene literalmente la misma condición de bloqueo, y `db/APLICADAS.md` no registra `011` como aplicada (`009` sigue siendo la última). El único commit de este lote es del PM, no del dueño, así que no había ninguna vía para que cambiara. Sigue siendo el único hallazgo `ABIERTO` de este documento; se actualiza su fila con esta confirmación, sin abrir una entrada nueva.

**Coherencia de la decisión del PM de este ciclo, verificada contra el código real, no solo contra su propia justificación escrita.** El decimonoveno ciclo (`bdd4508`) declara no abrir una Oleada v7 porque R-20 (Oleada v6) sigue `PENDIENTE` sin que ningún programador la haya tomado — confirmado: `src/dominio/panelCentro.ts`, `src/ui/pantallaPanelCentro.ts` y el resto del árbol no contienen ninguna vista de índice sobre `asistencia_historial` a nivel de centro (la única lectura de `asistencia_historial` en `src/` sigue siendo la de `pantallaRegistrosSlot.ts`, registro a registro, ya auditada). La spec de R-20 (`ROADMAP_PRODUCTO.md:959-994`) sigue sin migración, sin dato personal nuevo, restringida a `administrator`, y apoyada en una política de lectura (`asistencia_historial_admin_leer`) que ya existe desde T-10 — nada que objetar mientras siga sin una sola línea de código.

**Repaso de los dieciséis puntos de control permanentes contra el `db/` y el `src/` actuales, con lectura directa de este auditor (no heredada de la pasada anterior), sin ninguna excepción.** `asistencia` sigue con `grant select` únicamente a `authenticated` (`003_politicas_rls.sql:199`) y `revoke all` previo (`001_esquema_inicial.sql:322`) — sin política de `INSERT`/`UPDATE` directo ni de `DELETE`; el trigger `asistencia_before_update` (`001_esquema_inicial.sql:289-311`) sigue abortando cualquier cambio en `registrado_en`/`profesor_id`/`peticion_id` y fijando `actualizado_en`/`actualizado_por` él mismo; el trigger `asistencia_after_update` sigue copiando la fila anterior en `asistencia_historial` (`revoke all` a los tres roles, `grant select` solo a `service_role`, una única política de lectura para `administrator`); `actualizar_asistencia` (`008_rpc_actualizar_asistencia.sql:119-124`) sigue comprobando `profesor_id = auth.uid()` y la ventana de 7 días dentro de la propia RPC, no en el cliente; ninguna sentencia `create policy` de todo `db/` (incluidas las seis migraciones `010`-`016` todavía sin aplicar) menciona a `student`, salvo `perfil_leer_propio` del bootstrap; ningún `grant` de todo el directorio concede `TRUNCATE` a `anon` ni a `authenticated`; el bucket `avatares` sigue privado (`004_bucket_avatares.sql:21`), con lectura/escritura de `administrator` y lectura de `teacher` acotada a `alumno.activo` vía `storage.foldername(name)` (`003_politicas_rls.sql:247-278`); la vista `alumno_ficha` sigue siendo el único camino de lectura de `email_alumno`/`telefono_alumno`, y el `grant select` de columna sobre la tabla base (`003_politicas_rls.sql:107-109`) sigue limitado a identificación/`avatar_ruta`, así que ni siquiera `administrator` podría leer contacto con una consulta directa a la tabla — solo por la vista; `persona_referencia` sigue con política `for all` exclusiva de `administrator`, sin ningún camino de `teacher` hacia ella verificado en `pantallaRegistrosSlot.ts` (`puedeVerPersonasReferencia`); `listarAlumnos`/`AlumnoListado` sigue sin `avatar_ruta` (minimización P-02) y `buscar_alumnos_activos` sigue sin devolverlo (requisito 3 de T-20); el procesado de avatar sigue recodificando en `<canvas>` (elimina EXIF) y `subirAvatarAlumno`/`eliminarAvatarAlumno` siguen borrando las derivadas anteriores; la visualización sigue usando `urlFirmada`/`urlFirmadasEnLote` de vida corta, nunca una URL pública; el runner de migraciones conserva su doble salvaguarda de producción (`--entorno=prod` **y** `PERMITIR_PROD=1`, `herramientas/migraciones/entorno.ts:63-68`); `package.json` sigue sin clave `dependencies` (siete `devDependencies`, ningún SDK de Supabase ni framework); barrido de secretos sobre el repositorio completo sin ninguna coincidencia real (solo `.env.ejemplo` versionado, y las dos apariciones de `SUPABASE_ACCESS_TOKEN=` en `herramientas/cargarEnvLocal.test.ts` son fixtures de test con valores de mentira).

**Conclusión de esta pasada: sin hallazgos nuevos, y sin ningún hallazgo `RESUELTO` que reevaluar (los dieciocho ya cerrados no tienen código nuevo que pudiera reabrirlos).** El registro queda igual que en la pasada anterior: un único `ABIERTO` (#8, decisión de negocio pendiente del dueño, no defecto técnico) y dieciocho `RESUELTO`. Suite de tests, tipos y lint limpios en ejecución real (1586/1586); sin secretos en el repositorio; los dieciséis puntos de control permanentes, correctos sin excepción. Dado que esta pasada no encontró ninguna migración de código desde la anterior, la mayor parte de esta verificación fue releer el `db/` y el `src/` estáticos desde cero en vez de confiar en la narrativa previa — mismo resultado, verificado de forma independiente.

---

### Auditoría 2026-09-12

**Alcance real de esta pasada — ocho commits desde la anterior (`f09ad7f`, 2026-09-11): una tarea de producto completada, cuatro ciclos programados sin trabajo accionable y la apertura de una oleada nueva. Ninguna migración SQL nueva.** `git log f09ad7f..HEAD`: `970381f` (decimoséptimo ciclo del PM: abre R-19, Oleada v5), `0120178` y `c9f40ac` (rutina programada, sin trabajo accionable), `acff221` (**R-19 completada**: informe de horas propias para el profesor), `d7f4cf8`, `81e6afa` y `ca13186` (tres pasadas más sin trabajo accionable), `62dd385` (decimoctavo ciclo del PM: abre R-20, Oleada v6, todavía sin una sola línea de código). `git diff --stat f09ad7f..HEAD`: 13 ficheros, +963/-44 — solo `src/dominio/permisosUi.ts`, `src/nucleo/router.ts`, `src/ui/aplicacion.ts`, la pantalla nueva `src/ui/pantallaMisHorasProfesor.ts` (con su test) y documentación (`DEVELOPERS.md`, `DECISIONES_TECNICAS.md`, `HISTORIAL_SESIONES.md`, `ROADMAP_PRODUCTO.md`, `SEGUIMIENTO.md`). `db/` sin ningún cambio desde antes de la pasada anterior (último commit que toca `db/`: `2b3062f`, muy anterior).

**Verificación en ejecución, no solo lectura.** `git checkout develop && git pull origin develop`: fast-forward limpio, 23 commits (el checkout de esta sesión partía de un punto más antiguo que la pasada anterior). `npm ci` (130 paquetes) y, con dependencias instaladas: `npm run typecheck`, `npm run lint`, `npm run build` limpios los tres, y `npm test` → **1586/1586, 0 fallos** — coincide exactamente con la cifra que `SEGUIMIENTO.md` viene repitiendo desde `acff221`, confirmado ejecutando la suite de verdad en vez de aceptar la palabra del registro. Confirmado además contra la API de GitHub Actions: los nueve runs de CI de este lote (números 103 a 111 sobre 111 totales) están todos `completed`/`success`, incluido el del commit `HEAD` (`62dd385`).

**El hallazgo #8 (dato de salud del artículo 9 en `motivo_justificacion`, R-02) sigue `ABIERTO`, sin cambio de fondo.** La pregunta #16 de §6 de `SEGUIMIENTO.md` sigue con la columna "Respuesta" vacía (lectura directa de la fila completa), la fila 14 de §3 mantiene literalmente la misma condición de bloqueo, y `db/APLICADAS.md` no registra `011` como aplicada (`009` sigue siendo la última). Ninguno de los ocho commits de este lote la toca — es trabajo del PM/programador (R-19, cuatro pasadas sin trabajo, apertura de R-20), no del dueño, así que no había ninguna vía para que cambiara. Sigue siendo el único hallazgo `ABIERTO` de este documento; se actualiza su fila en el registro de hallazgos con esta confirmación, sin abrir una entrada nueva.

**Revisión específica de R-19 (código nuevo desde la pasada anterior), sin hallazgos.** `ui/pantallaMisHorasProfesor.ts` reutiliza `dominio/informeHorasProfesor.ts` (R-15, sin tocar) pasándole un array de un ÚNICO elemento —el propio profesor, fijado por `deps.profesorId`/`deps.profesorNombre`, nunca resuelto contra `listarProfesoresActivos` ni ningún listado del centro—, así que no hay ningún camino de código por el que la función reciba, ni siquiera calcule, la cifra de un compañero (comprobado con lectura directa del módulo, no solo de su documentación). Nueva `dominio/permisosUi.ts#puedeVerInformeHorasPropio`, exclusiva de `teacher`; además la pantalla solo se monta dentro de `mostrarAppProfesor` (`ui/aplicacion.ts`) y la ruta `#/mis-horas` solo existe en `crearRouterProfesor` (`nucleo/router.ts`), así que un `administrator` no llega a ella por ningún camino — mismo patrón de inaccesibilidad estructural ya aceptado sin hallazgo para R-15/R-10/R-16/R-18. Sin dato ni tabla nueva, sin migración. Los 11 tests nuevos de la pantalla (`pantallaMisHorasProfesor.test.ts`) no son triviales: comprueban cifras reales calculadas (`/55min/`, `/4h 0min/`), acceso denegado a `administrator` y a `student`, ausencia total de cualquier `<select>` de profesor en el DOM, coincidencia del CSV exportado con la tabla en pantalla, y recarga al cambiar de rango — cobertura real de la lógica crítica del requisito 2 ("sin ninguna cifra ajena"), no una suite verde de adorno.

**R-20 (Oleada v6, recién especificada, `PENDIENTE`, ninguna sesión la ha empezado) no presenta ninguna señal de contradicción con §0.2.** Su propia spec (`ROADMAP_PRODUCTO.md`) declara explícitamente: sin migración, sin dato personal nuevo, lectura sobre `asistencia_historial` ya poblada y ya reservada a `administrator` desde T-10 — nada que objetar sobre una tarea que todavía no tiene una sola línea de código; se revisará su implementación real en la próxima pasada.

**Repaso de los dieciséis puntos de control permanentes de este documento contra el `db/` actual (sin cambio desde `2b3062f`, muy anterior a la pasada previa), sin ninguna excepción.** Verificado por lectura directa de este auditor, no solo por herencia de la pasada anterior: `asistencia` sigue con `grant select` únicamente a `authenticated` (`003_politicas_rls.sql:199`), sin ninguna política de `INSERT`/`UPDATE` directo y sin ninguna de `DELETE` — toda escritura sigue pasando por `registrar_asistencia`/`actualizar_asistencia`; el trigger `asistencia_before_update` (`001_esquema_inicial.sql:294`) sigue abortando cualquier cambio en `registrado_en`; el trigger `asistencia_after_update` sigue copiando la fila anterior en `asistencia_historial`, con `revoke all` a `anon`/`authenticated`/`service_role` y una única política de lectura para `administrator`; ningún fichero de `db/` concede `TRUNCATE` a `anon` ni a `authenticated` (barrido completo de todas las sentencias `grant` del directorio); ninguna política menciona a `student` fuera de `perfil_leer_propio` del bootstrap; el bucket `avatares` sigue privado (`public = false`, `004_bucket_avatares.sql`), con las cuatro políticas de `storage.objects` intactas —lectura y escritura exclusivas de `administrator`, lectura de `teacher` acotada a `alumno.activo` vía `storage.foldername(name)`—; y el runner de migraciones conserva su doble salvaguarda de producción (`--entorno=prod` **y** `PERMITIR_PROD=1`, `herramientas/migraciones/entorno.ts`) y su comprobación explícita de `TRUNCATE`/`REFERENCES`/`TRIGGER` (`verificarPrivilegios`, cableada en `herramientas/migrar.ts`). `package.json` sigue sin clave `dependencies` (solo siete `devDependencies`, ningún SDK de Supabase ni framework). Barrido de secretos sobre el repositorio completo: sin ninguna coincidencia real de `service_role`, tokens de Management API ni claves privadas; solo `.env.ejemplo` está versionado.

**Conclusión de esta pasada: sin hallazgos nuevos.** El registro de hallazgos queda con un único elemento `ABIERTO` (#8, pendiente de una decisión de negocio del dueño, no de una corrección técnica) y dieciocho `RESUELTO`. R-19 se completó con el mismo rigor de aislamiento de rol y de datos que el resto del proyecto, con tests que prueban cifras reales. Suite de tests, tipos, lint y build limpios en ejecución real (1586/1586); CI verde en los nueve runs del lote; sin secretos en el repositorio; los dieciséis puntos de control permanentes, correctos sin excepción.

---

### Auditoría 2026-09-11

**Alcance real de esta pasada — seis commits desde la anterior (`8f775de`, 2026-09-10), cuatro de ellos correcciones sobre los cuatro hallazgos que quedaron abiertos en la pasada anterior, dos tareas de producto completadas, dos ciclos programados sin trabajo accionable y la apertura de una oleada nueva.** `git log 8f775de..HEAD`: `9f0a377` (R-17 completada + P-27 urgente, hallazgo #18), `29de11d` (R-18 completada), `72772aa` (P-25/P-26 + fila de §7 para R-16, hallazgos #15/#17/#19, "columna vertebral agotada"), `ac7cafc` y `0120178` (rutina programada, sin trabajo accionable), `970381f` (decimoséptimo ciclo del PM: abre R-19, Oleada v5). Sin ninguna migración SQL nueva — el lote entero es código de cliente y documentación.

**Verificación en ejecución, no solo lectura.** Con dependencias instaladas (`npm install`; el `node_modules` no venía en el checkout de esta sesión, un artefacto del entorno de la sesión, no del repositorio — confirmado repitiendo la suite tras instalar), `npm run typecheck`, `npm run lint`, `npm test` (**1572/1572**, 0 fallos) y `npm run build` pasan limpios. `.github/workflows/ci.yml` sigue ejecutando exactamente esas cuatro puertas en cada push a `develop` y a `master`, sin secretos.

**Los cuatro hallazgos que quedaron `ABIERTO` en la pasada anterior están los cuatro resueltos, los cuatro el mismo día en que se abrieron (2026-09-10), antes incluso de que esta pasada los revisara:**
- **#15** (importación masiva no idempotente): resuelto por **P-25** en el commit `72772aa` — el `id` de cada fila se fija una vez al analizar el fichero y se reutiliza en cualquier reintento, así que un reintento tras un corte de red choca con la clave primaria en vez de duplicar. Verificado con lectura directa del diff y de los 3 tests nuevos.
- **#17** (dos defectos menores de `sw.js`): resuelto por **P-26**, mismo commit — `Response` de un solo uso sustituida por una función, comparación de origin por prefijo sustituida por comparación real.
- **#18** (`contarAlumnosActivosDeCentro` contra la tabla base `alumno` en vez de `alumno_ficha`, mismo defecto que P-22): resuelto por **P-27**, commit `9f0a377`, atendido como urgente el mismo día que se abrió, dentro de la sesión de R-17. Un subagente despachado para recorrer *todas* las consultas de `src/datos/*.ts` contra la tabla base `alumno` no encontró ninguna otra recurrencia del patrón P-22/P-27: cada función que necesita una columna restringida ya consulta `alumno_ficha`.
- **#19** (falta fila de §7 para R-16, mismo patrón que los ya cerrados #9/#11): resuelto en el mismo commit `72772aa` — la fila existe, cita el hallazgo por su número y dice explícitamente que lo cierra.

Las cuatro resoluciones se han verificado por dos vías independientes en esta pasada (lectura directa de los diffs por este auditor, y un subagente de investigación despachado por separado que llegó a las mismas conclusiones sin ver el trabajo del otro), no solo aceptando la palabra de `SEGUIMIENTO.md`.

**El hallazgo #8 (dato de salud del artículo 9 en `motivo_justificacion`, R-02) sigue `ABIERTO`, sin cambio.** La pregunta #16 de §6 sigue sin respuesta del dueño, `011_justificacion_ausencia.sql` sigue sin aplicar, y ninguno de los seis commits de este lote la toca — es trabajo del PM/programador (R-17, R-18, cierres de hallazgos, apertura de R-19), no del dueño, así que no había ninguna vía para que cambiara. Sigue siendo el único hallazgo abierto de este documento.

**Revisión específica de R-17 y R-18 (código nuevo desde la pasada anterior), sin hallazgos.** R-17 ("marcar el resto como ausente" en bloque): `dominio/asistencia.ts#slotsDeLaMismaSesion` filtra explícitamente por `profesor_id` además de día/hora/asignatura al agrupar los slots de una misma sesión — un profesor no puede arrastrar a su bloque los slots de otro; la RPC (`registrar_ausencia`, `010`) tiene además su propia comprobación de pertenencia del lado del servidor, defensa en profundidad. R-18 (asistente de primeros pasos): no añade tabla, columna ni RPC — son lecturas ya cubiertas por políticas RLS existentes; el cierre a `teacher` es estructural (el código del asistente vive enteramente dentro de `mostrarAppAdministrador`, invocado solo si `perfil.rol === 'administrator'`; el shell de `teacher` no lo referencia en absoluto), y su criterio de aceptación real ("un `teacher` no ve este asistente") es una no-visibilidad literal, no la fórmula "recibe `SinPermiso`" de R-10/R-15/R-16 que exigía una fila interpretativa en §7 — no hay, por tanto, una tercera repetición del patrón de los hallazgos #9/#11.

**R-19 (Oleada v5, recién especificada, `PENDIENTE`, ninguna sesión la ha empezado) no presenta ninguna señal de contradicción con §0.2.** Su propia spec declara explícitamente: sin campo ni tabla nueva, sin migración, acotada en exclusiva a las horas propias del profesor que consulta (sin selector de otro profesor, sin ranking, sin ninguna cifra ajena — requisito 2), reutilizando el cálculo ya existente de R-15 sin duplicarlo. Nada que objetar sobre una tarea que todavía no tiene una sola línea de código: se revisará su implementación real en la próxima pasada.

**Repaso completo de los catorce puntos de control permanentes de este documento contra `db/001` a `db/016`, distinguiendo lo aplicado en `dev` (`001`-`009`, vivo) de lo escrito y aún sin aplicar (`010`-`016`, latente): los catorce verifican correctos, sin ninguna excepción.** En particular: `asistencia` sigue sin política de `INSERT`/`UPDATE` directo y sin ninguna de `DELETE`, toda escritura sigue pasando por las dos RPC; el trigger `BEFORE UPDATE` sigue abortando cambios en `registrado_en`/`profesor_id`/`peticion_id`; el trigger `AFTER UPDATE` sigue escribiendo en `asistencia_historial`, estrictamente append-only; `actualizar_asistencia` sigue comprobando pertenencia y ventana temporal en el servidor; ninguna política nueva para `student` fuera de su propia fila de `perfil`; ningún `GRANT` de `TRUNCATE`/`REFERENCES`/`TRIGGER` a `anon`/`authenticated` en ningún fichero, incluidas las migraciones `013`/`014` todavía sin aplicar; el bucket de avatares sigue privado, con lectura de `teacher` acotada a activos, ruta (nunca URL) en base de datos y URL firmada de 600 segundos; `persona_referencia` sigue exclusiva de `administrator`, con defensa tanto en la interfaz como en RLS; y no se encontró ninguna consulta nueva contra la tabla base `alumno` pidiendo columnas restringidas — el patrón P-22/P-27 no se ha repetido una tercera vez. Todas las tablas de `public` (`001`-`016`) tienen RLS habilitada, sin ninguna omitida. Detalle completo verificado por un subagente de investigación despachado específicamente para este repaso, con cita de fichero y línea para cada punto.

**Conclusión de esta pasada: sin hallazgos nuevos.** El registro de hallazgos queda con un único elemento `ABIERTO` (#8, pendiente de una decisión de negocio del dueño, no de una corrección técnica) y dieciocho `RESUELTO`. Los cuatro hallazgos que se abrieron o quedaron pendientes en la pasada anterior se cerraron el mismo día por el propio equipo, antes de que esta auditoría los revisara — la disciplina de "registrar el hallazgo, atenderlo con la misma sesión si es urgente o en la siguiente si es backlog" sigue funcionando sin que el auditor tenga que insistir. Suite de tests, tipos, lint y build limpios; CI correctamente configurada; sin secretos en el repositorio; infraestructura (CSP, cabeceras, separación dev/prod) coherente con T-25.

---

### Auditoría 2026-09-10

**Alcance real de esta pasada — seis commits desde la anterior (`c91f4c0`, 2026-09-09), predominantemente
correcciones sobre hallazgos ya abiertos, tres tareas de producto completadas y un ciclo de PM.** `git
log c91f4c0..HEAD`: `091c784` (P-20/P-21, corrige hallazgos #12/#13), `cc7e65b` (R-11 completada + P-22
urgente), `698b150` (R-15 completada), `e901262` (R-16 completada), `e8e37c5` (P-23/P-24, corrige
hallazgos #14/#16), `6b4264a` (decimosexto ciclo del PM: nuevas R-17/R-18, backlog P-25/P-26 para los
hallazgos #15/#17 restantes). `git diff --stat c91f4c0..HEAD`: 40 ficheros, +6139/-107, sin ninguna
migración SQL nueva — el lote entero es código de cliente y documentación.

**Metodología.** `git checkout develop && git pull origin develop` limpio (fast-forward, 9 commits).
`npm ci`: 130 paquetes, 0 vulnerabilidades, misma cifra que todas las pasadas anteriores; `package.json`
sigue sin clave `dependencies`. Verificación directa en vivo de los cuatro comandos de §0.1: `npm run
typecheck`, `npm run lint`, `npm run build`, los tres en verde, y `npm test`: **1522 tests, 1522 pass, 0
fail** (antes 1418; +104, coherente con el volumen de R-11/R-15/R-16 y los tests nuevos de P-20—P-24).
Confirmados contra la API de GitHub Actions los runs de los seis commits nuevos (números 92 a 97 sobre
**97** runs totales del histórico, antes 90), todos `completed`/`success`. `git status` limpio antes y
después. Barrido de secretos sobre el repositorio completo y sobre `dist/` recién construido
(`service_role`, `SUPABASE_ACCESS_TOKEN`, `sk-`, `eyJhbGci`, claves privadas): todas las coincidencias en
el repo son prosa explicativa, nombres de variable sin valor, o fixtures de test declaradamente falsos
(`registro.test.ts`, `informadorErrores.test.ts`); `dist/` no arrojó ninguna coincidencia. `git log
c91f4c0..HEAD -- roadmap/HOJA_DE_RUTA.md` vacío: el documento inmutable sigue sin ninguna edición nueva
(su último commit real sigue siendo `95f5b0d`, del 2026-09-01). `db/APLICADAS.md` sin cambio: `009` sigue
siendo la última migración aplicada en `dev`; `010` a `016` siguen en la sección "Pendiente de aplicar",
sin que ninguna sesión de este lote las haya tocado.

Dado que este lote no trae ninguna migración nueva, este auditor concentró la lectura directa en el
código de cliente que cambió (los tres puntos de encolado de la cola offline, el manejador de Service
Worker, el neutralizador de CSV) y despachó tres subagentes de investigación en paralelo: uno para
releer las 17 migraciones (`000` a `016`, incluidas las seis pendientes de aplicar) contra los quince
puntos de control permanentes de este documento; otro para verificar, código en mano y con escepticismo
deliberado, que las cuatro correcciones que los commits dicen haber hecho (P-20/P-21/P-23/P-24) resuelven
de verdad los hallazgos #12/#13/#14/#16, y que los hallazgos #15/#17 (backlog no urgente, P-25/P-26)
siguen intactos tal como debían; y un tercero centrado en la coherencia entre `HOJA_DE_RUTA.md`/
`DECISIONES_TECNICAS.md` y el código de R-11/R-15/R-16/R-17/R-18. Cada hallazgo de los tres subagentes
se verificó de forma independiente por este auditor leyendo el fichero y la línea citados antes de
aceptarlo — dos hallazgos nuevos surgieron así (`#18`, `#19`, abajo).

**Puntos de control permanentes — sin ninguna desviación en los quince, incluidas las seis migraciones
pendientes de aplicar.** Revisión completa de las 17 migraciones (`000` a `016`) contra escritura solo
por RPC, inmutabilidad de `registrado_en`, rastro de cambios en `asistencia_historial`, pertenencia en
la edición con ventana de 7 días, rol `student` cerrado (único grep positivo: `perfil_leer_propio`),
privilegios de tabla (`revoke all` explícito en las diez tablas nuevas, ningún `TRUNCATE` a `anon`/
`authenticated` en ninguna de las 17 migraciones), bucket de avatares (privado, lectura de `teacher`
acotada a activos, sin política `student`/`anon`), `persona_referencia` (solo `administrator`, con
`DELETE`), superficie de columnas del `teacher` (`GRANT` de columna sin `email_alumno`/`telefono_alumno`,
vista `alumno_ficha` sin `security_invoker` y con su propio filtro), RLS completa (incluidas `limite_tasa`,
`excepcion_slot`, `cierre_centro`) y los tres barridos obligatorios de `db/pruebas_rls.sql` (`student`,
`TRUNCATE`, `anon`) con las once tablas actuales — sin ningún punto ciego. Las seis migraciones sin
aplicar (`010` a `016`) se auditaron con el mismo rigor que las aplicadas: ninguna abre una tabla nueva
sin RLS ni políticas, ninguna concede escritura directa fuera de RPC `SECURITY DEFINER`, ninguna amplía
el alcance de `student`. Sin hallazgo nuevo en esta área.

**Hallazgos previos — cuatro confirmados RESUELTOS con evidencia de código, dos correctamente ABIERTOS.**
#12/#13 (cola offline, R-07): **P-20**/**P-21** cierran ambos de raíz — los tres puntos de encolado
capturan `ocurridoEn` con el reloj inyectado en el momento del toque (no del vaciado), la base de datos
IndexedDB se particiona por `profesorId`, y `vaciarColaOffline` ya no descarta la cola ante un límite de
tasa o una sesión caducada a mitad de barrido. #14 (Service Worker, R-09): **P-23** corrige el manejador
de `controllerchange` con un mecanismo distinto pero equivalente al sugerido (captura de estado ANTES de
registrar, en vez de comprobar `controller` DENTRO del manejador, que no habría funcionado), con un test
que ahora exige el comportamiento correcto en vez de tolerar el defecto. #16 (inyección de fórmula CSV):
**P-24** neutraliza los cuatro prefijos peligrosos en el único punto de escape del proyecto, verificado
que cubre también `documentoCsvConMetadatos`, la función nueva de R-15. #15 (idempotencia de la
importación masiva) y #17 (dos fragilidades menores de `sw.js`) siguen **ABIERTO** tal como correspondía:
registrados como **P-25**/**P-26** en el backlog de §5, `PENDIENTE`, sin que ninguna sesión los haya
atendido todavía — correcto, no son urgentes según el propio criterio del proyecto.

**Coherencia entre lo decidido y lo ejecutado — dos hallazgos nuevos, ninguno de seguridad ni de RGPD.**
Hallazgo **#18** (severidad alta): `contarAlumnosActivosDeCentro` (T-11, `src/datos/centrosEstudios.ts`,
sin tocar por este lote pero nunca detectado hasta ahora) consulta `centro_referencia_id` directamente
de la tabla base `alumno`, columna que el `GRANT` de columna de `003_politicas_rls.sql` nunca concede a
`authenticated` — exactamente el mismo defecto que **P-22** corrigió el día anterior en
`datos/asistencia.ts#idsAlumnosDeCentro` (T-23), sin que esa corrección se generalizara a revisar el
resto del código en busca del mismo patrón. Contra una base de datos real fallaría con "permission
denied" para cualquier rol, incluido `administrator` — no es una fuga de dato, es una función rota,
indetectable por la suite porque corre contra dobles de `fetch` sin `GRANT` de columna. Hallazgo **#19**
(severidad baja): `SEGUIMIENTO.md` §7 ganó dos filas el mismo día para R-15 explicando su criterio de
"`SinPermiso` por inaccesibilidad estructural" — pero R-16, completada horas después con el idéntico
razonamiento (confirmado en `DECISIONES_TECNICAS.md:297`), no recibió la suya: la lección de los
hallazgos #9/#11 (ya `RESUELTO`) caló para el caso que la motivó pero no se generalizó todavía. Ninguna
de las tres tareas completadas de este lote (R-11, R-15, R-16) amplía el alcance de datos personales,
el acceso de `student`, ni el de `teacher` — confirmado con lectura directa de las funciones de datos que
alimentan sus pantallas: solo columnas de identificación contra `alumno_ficha`/tablas ya autorizadas para
`administrator`, nunca avatar real, email ni persona de referencia. Hallazgo #8 (dato de salud, R-02)
sigue **ABIERTO**, sin novedad: la pregunta #16 de §6 sigue sin respuesta del dueño, `011` sigue sin
aplicar.

### Auditoría 2026-09-09

**Alcance real de esta pasada — el lote más grande auditado hasta hoy: seis commits, dos migraciones
nuevas sin aplicar y cuatro tareas de producto completadas, dos de ellas (R-07, R-09) infraestructura
nueva sin precedente directo en el proyecto (cola offline con IndexedDB, Service Worker).** `git log
97bd24f..HEAD` (`97bd24f` es el commit de la auditoría anterior, 2026-09-08) muestra seis commits:
`20bd734` (R-07 completada, cola offline + P-18/P-19 resueltas en el camino), `edd8159` (R-14
arrancada, migración `015` sin aplicar), `2b3062f` (R-08 arrancada, migración `016` sin aplicar),
`03e1dbb` (R-09 completada, aplicación instalable), `c83e4a0` (R-10 completada, expediente RGPD) y
`0313ec8` (decimoquinto ciclo del PM, nuevas R-15/R-16, Oleada v3, sin código todavía). `git diff
--stat 97bd24f..HEAD`: 69 ficheros, +6905/-115, con dos migraciones SQL nuevas completas
(`015_aviso_cancelacion_slot.sql`, `016_resolver_profesor_por_email.sql`), un Service Worker nuevo
(`sw.js`) y cuatro PNG generados sin dependencias, y cambios reales en `src/nucleo`, `src/datos`,
`src/dominio` y `src/ui`.

**Metodología.** `git checkout develop && git pull origin develop` limpio (fast-forward). `npm ci`:
130 paquetes, 0 vulnerabilidades — misma cifra que todas las pasadas anteriores; `package.json` sigue
sin clave `dependencies` (solo gana un script nuevo, `generar-iconos`). Verificación directa en vivo
de los cuatro comandos de §0.1: `npm run typecheck`, `npm run lint`, `npm run build`, los tres en
verde, y `npm test`: **1418 tests, 1418 pass, 0 fail** (antes 1265; +153, coherente con el volumen de
R-07/R-08/R-09/R-10). Confirmados contra la API de GitHub Actions los 15 runs más recientes de
`develop` (incluido el del commit actual, `0313ec8`, run `34267245590`), todos `completed`/`success`,
sobre **90** runs totales en el histórico del workflow (83 en la pasada anterior, +7 exactos por los
siete commits nuevos desde entonces, incluida la propia pasada del auditor del 2026-09-08). `git
status` limpio antes y después. Barrido de secretos sobre el repositorio completo y sobre `dist/`
recién construido (`service_role`, `SUPABASE_ACCESS_TOKEN`, `sk-`, `eyJhbGci`, claves privadas,
contraseñas en claro): todas las coincidencias son prosa explicativa de este mismo documento, de
`roadmap/`/`DEVELOPERS.md`/`db/`, nombres de variable de entorno sin valor relleno, o fixtures de test
declaradamente falsos; `.env.ejemplo`/`config.ejemplo.js` siguen con todas sus claves vacías, y `git
ls-files` no lista ningún `.env`/`config.js` real. `git log 97bd24f..HEAD -- roadmap/HOJA_DE_RUTA.md`
vacío: el documento inmutable sigue sin ninguna edición nueva.

Dado que el lote incluye dos piezas de infraestructura sin precedente directo (IndexedDB para la cola
offline, un Service Worker completo con su propia estrategia de caché) y dos migraciones SQL nuevas
(una RPC `SECURITY DEFINER` cada una), este auditor leyó personalmente y sin delegar las dos
migraciones completas (`db/015_aviso_cancelacion_slot.sql`, `db/016_resolver_profesor_por_email.sql`),
`sw.js` completo, `src/nucleo/colaAsistenciaOffline.ts`/`registroServiceWorker.ts` completos, la
sección de `pruebas_rls.sql` que amplía el barrido de `TRUNCATE` (hallazgo `#10`), el diff completo de
`roadmap/DECISIONES_TECNICAS.md`/`SEGUIMIENTO.md` (§1, §3, §6, §7) contra el código real, y despachó
dos subagentes de investigación en paralelo — uno centrado en la cola offline de R-07 y la
importación masiva de R-08, otro en el Service Worker y el manifiesto de R-09 — cuyos hallazgos
verificó él mismo leyendo el código citado antes de aceptarlos (confirmó con lectura directa la
ausencia de `ocurridoEn` en los tres puntos de encolado, la ausencia de comprobación de pertenencia
para `origen = 'manual'` en `005_rpc_registrar_asistencia.sql`, la falta de guard en el manejador de
`controllerchange`, y el `id` nuevo por invocación de `importarAlumnosValidados`).

**Puntos de control permanentes — sin hallazgo en trece de los quince; los otros dos (privilegios de
tabla, gobernanza documental §7) se confirman RESUELTOS.** Escritura solo por RPC / inmutabilidad /
rastro de cambios / pertenencia en la edición: `015_aviso_cancelacion_slot.sql` no concede ningún
`GRANT` de escritura directa sobre `excepcion_slot` — la única vía es
`registrar_aviso_cancelacion_slot()`, `SECURITY DEFINER`, con la comprobación de rol dentro (rechaza a
quien no sea `administrator`, una excepción inexistente/desactivada, y una `sustitucion`); dos `CHECK`
nuevos (`aviso_familias_en` solo si `tipo = 'cancelacion'`; los dos campos siempre juntos) refuerzan
la misma invariante en el esquema. Hora del servidor: la propia función fija `now()` ella misma para
`aviso_familias_en`, nunca el cliente. Rol `student` cerrado / RLS completa: `015` no crea ninguna
tabla (dos columnas sobre una tabla que ya tenía sus políticas desde `013`); `016` tampoco (una
función sin ningún `GRANT` de tabla nuevo). Privilegios de tabla: revisada la sección 8 de
`pruebas_rls.sql` línea a línea — el hallazgo `#10` de la pasada anterior está `RESUELTO` de verdad
(el array ya incluye las once tablas). Superficie de columnas del `teacher` / datos de personas de
referencia / alcance de datos personales: `resolver_profesor_por_email` devuelve como mucho `id` +
`nombre`, nunca el email en sí, y está reservada a `administrator` — no amplía ninguna superficie de
`teacher`; ninguna columna nueva de `tipos.ts` toca datos de contacto de alumno ni personas de
referencia (`aviso_familias_quien`/`aviso_familias_en` son metadatos de quién anotó un aviso, no un
dato de la persona avisada). Secretos / guardas del runner / stack: sin cambios de superficie, ver
metodología arriba; los dos ficheros nuevos de `herramientas/migraciones/` (`avisoCancelacionSlot.test.ts`,
`resolverProfesorPorEmail.test.ts`) siguen el mismo patrón de guardas estáticas contra el contenido de
la migración que ya usan `excepcionSlot.test.ts`/`calendarioCierres.test.ts`, verificados leyendo
ambos completos.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo nuevo; §7 se actualiza dos veces sin que
el auditor tenga que señalarlo.** Ninguna de las cuatro tareas completadas de este lote (R-07, R-09,
R-10, y R-08 arrancada) introduce un dato personal fuera de la lista cerrada de §0.2, ni amplía el
acceso de `student` ni de `teacher` más allá de lo ya decidido — R-08 en particular evitó
deliberadamente dos vías que sí habrían ampliado superficie (columna `perfil.email` sincronizada, o
exponer el email en el selector de profesores de T-16), documentado en `DECISIONES_TECNICAS.md` y
verificado por este auditor comparando esas dos alternativas descartadas contra el código real. La
migración imprevista de R-08 (`Migración: No` en la spec, pero el requisito 3 exige `016` de todas
formas — mismo patrón ya visto en T-09/T-20) SÍ generó su fila en §7 (`2026-09-08 | R-08`, línea 2133)
sin que el auditor tuviera que señalarlo — la lección de los hallazgos `#9`/`#11` (ambos ahora
`RESUELTO`) parece haber calado en el protocolo del ciclo de PM.

**Hallazgos nuevos — el patrón cambia de sitio: por primera vez, la sustancia está en el código en
sí, no en la documentación que lo acompaña.** Las nueve pasadas anteriores encontraron sobre todo
higiene documental (`#1`, `#4`-`#7`, `#9`, `#11`) y un hueco en una batería de pruebas (`#2`, `#10`);
esta pasada, por primera vez desde que este documento existe, los hallazgos nuevos son defectos reales
de comportamiento en código ya fusionado a `develop` y marcado `COMPLETADA`, concentrados en las dos
piezas de infraestructura sin precedente del lote. `#12`/`#13` (ambos alta, R-07): la cola offline
resuelve bien las dos preguntas de seguridad que este documento vigila explícitamente (nunca escribe
fuera de la RPC, nunca dispara conflicto duplicado gracias al mismo `peticionId`) pero falla en dos
aspectos que ningún punto de control permanente cubría todavía — el instante real del toque se pierde
al vaciar la cola (con una cascada real hacia la restricción de unicidad y la vigencia del slot), y la
cola no está aislada por sesión, así que un dispositivo compartido entre profesores puede atribuir un
registro al profesor equivocado o perderlo sin dejar rastro visible; el mismo tramo de código además
trata cualquier error que no sea de red como definitivo, así que el propio límite de tasa de T-06 o un
token caducado pueden borrar en cascada el resto de una cola grande. `#14` (media, R-09): el aviso de
versión nueva recarga la página también en la primerísima visita, por no aplicar al manejador de
`controllerchange` el mismo guard que ya tiene el de `updatefound` — confirmado además por un test que
fija ese comportamiento como si fuera el esperado. `#15` (media, R-08): la importación masiva de
alumnos no es idempotente ante un reintento tras una respuesta perdida. `#16`/`#17` (baja): inyección
de fórmula CSV sin neutralizar en la importación (R-08), y dos fragilidades menores de `sw.js` sin
impacto práctico hoy (una `Response` reutilizable de un solo uso, una comprobación de origen por
prefijo de cadena). Ninguno de los siete indica una vulneración de RLS, de un `GRANT`, ni una fuga de
dato personal fuera de alcance — el servidor sigue siendo, en los siete casos, quien decide
correctamente qué se permite — pero `#12`/`#13` sí son defectos de integridad de datos reales sobre la
función central del producto (pasar lista), en el escenario exacto (conexión intermitente, dispositivo
de aula) que R-07 fue construida para resolver, y merecen la misma urgencia que este documento ya ha
dado antes a un hallazgo de batería de pruebas (`#2`/`#10`): una `P-XX` urgente que capture el instante
del toque al encolar (arreglo acotado: pasar `deps.reloj.ahora()` como `ocurridoEn`, sin tocar la RPC)
y otra que decida cómo debe comportarse la cola ante un error no recuperable — como mínimo, dejar el
elemento en la cola marcado como "requiere atención humana" en vez de borrarlo en silencio, y
considerar si la cola debe descartarse (o advertir) al cambiar de sesión en el mismo navegador.

**Conclusión.** Primera pasada desde que este documento existe en la que los hallazgos nuevos son
defectos de código real, no de documentación o de cobertura de pruebas — y curiosamente en las dos
piezas de infraestructura que menos precedente tenían en el proyecto (nada en `develop` hasta ahora
hablaba con IndexedDB ni con un Service Worker). El propio código de R-10 (expediente RGPD) y de las
partes de R-07/R-08/R-09 no señaladas arriba está bien construido y sigue con disciplina los patrones
ya establecidos del proyecto (RPC `SECURITY DEFINER` con comprobación de rol dentro, inyección de
dependencias de navegador detrás de interfaces mínimas, red antes que caché). Los tres hallazgos
`ABIERTO` heredados (`#8`, RGPD/dato de salud, sigue esperando al dueño) y los dos recién cerrados
(`#10`/`#11`, confirmados `RESUELTO` de verdad, no solo formalizados) no cambian de fondo. Recomendación
para la siguiente sesión de PM: abrir dos `P-XX` urgentes para `#12`/`#13` (el arreglo del primero es
acotado y de bajo riesgo; el segundo exige una decisión de diseño menor sobre qué hacer con un
elemento no recuperable de la cola) antes de que R-07 se use con profesores reales, y una `P-XX` no
urgente para `#14`/`#15`/`#16`/`#17`. R-06/R-08/R-12/R-14 siguen `BLOQUEADA` esperando exclusivamente
al dueño (aplicar `013`-`016`, con `011` condicionada además a la pregunta #16); R-15/R-16 quedan con
spec escrita y sin código todavía.

### Auditoría 2026-09-08

**Alcance real de esta pasada — el lote con más sustancia de código desde T-25: seis commits, dos
migraciones nuevas todavía sin aplicar y cuatro tareas de producto completadas.** `git log
06fb8b0..HEAD` (`06fb8b0` es el commit de la auditoría anterior, 2026-09-07 por la mañana) muestra
seis commits: `9f4d388` (R-12 arrancada, migración `014` + P-17 resuelta en el camino), `bad0892`
(R-05 completada, alcance `administrator`), `b0313a7` (R-06 arrancada, migración `013` + edición de
la `010` todavía sin aplicar), `4ad761c` (R-13 completada), `9bd18d6` (R-04 completada) y `effaa12`
(decimocuarto ciclo del PM, nueva R-14 sin código todavía). `git diff --stat 06fb8b0..HEAD`: 58
ficheros, +7658/-148, con cambios reales en `db/` (dos migraciones nuevas completas, edición de una
tercera todavía no aplicada, +358 líneas en `pruebas_rls.sql`), `src/dominio`, `src/datos`, `src/ui`
y `herramientas/migraciones`.

**Metodología.** `git checkout develop && git pull origin develop` limpio (fast-forward). Instalación
completa desde cero (`node_modules/` no existía en este contenedor): `npm ci`, 130 paquetes, 0
vulnerabilidades — misma cifra que todas las pasadas anteriores. Verificación directa en vivo de los
cuatro comandos de §0.1: `npm run typecheck`, `npm run lint`, `npm run build`, los tres en verde, y
`npm test`: **1265 tests, 1265 pass, 0 fail** (antes 1056; +209, coherente con el volumen de
R-04/R-05/R-06/R-12/R-13). Confirmados contra la API de GitHub Actions los 15 runs más recientes de
`develop` (incluido el del commit actual, `effaa12`, run `34154300974`), todos `completed`/`success`,
sobre **83** runs totales en el histórico del workflow. `git status` limpio antes y después. Barrido
de secretos sobre el repositorio completo y sobre `dist/` recién construido (`service_role`,
`SUPABASE_ACCESS_TOKEN`, `sk-`, `eyJhbGci`, claves privadas, contraseñas en claro): todas las
coincidencias son prosa explicativa de este mismo documento y de `roadmap/`/`DEVELOPERS.md`, nombres
de variable de entorno sin valor relleno, o fixtures de test declaradamente falsos
(`informadorErrores.test.ts`, `registro.test.ts`); `.env.ejemplo` sigue con todas sus claves vacías, y
`git ls-files` solo lista ese fichero de ejemplo, ningún `.env` real. `package.json` sigue sin la
clave `dependencies` (ninguna dependencia de producción). `git log 06fb8b0..HEAD --
roadmap/HOJA_DE_RUTA.md` vacío: el documento inmutable sigue sin ninguna edición nueva.

Dado que el lote toca de lleno el esquema (dos tablas nuevas, una RPC inmutable sustituida por
segunda vez, una migración todavía sin aplicar editada directamente) y el reparto de qué rol ve qué
(R-04, R-05, R-13 tocan quién genera informes y quién avisa a una familia), este auditor leyó
personalmente y sin delegar los dos ficheros de migración completos
(`db/013_excepcion_slot.sql`, `db/014_calendario_cierres.sql`), el diff completo de
`db/010_registro_ausencias.sql`, las dos secciones nuevas de `db/pruebas_rls.sql` que los ejercitan
(8j/8k, líneas 2222-2572), y contrastó el diff completo de `roadmap/DECISIONES_TECNICAS.md` y de
`roadmap/SEGUIMIENTO.md` (§1, §3, §6, §7) contra el código real.

**Puntos de control permanentes — sin hallazgo en trece de los quince, dos con hallazgo nuevo
(detalle abajo).** Escritura solo por RPC / inmutabilidad / rastro de cambios / pertenencia en la
edición / hora del servidor y retroactivos: `013_excepcion_slot.sql` no concede `INSERT`/`UPDATE` a
`authenticated` en absoluto (solo `SELECT`; toda escritura pasa por `declarar_excepcion_slot()`/
`desactivar_excepcion_slot()`, `SECURITY DEFINER`, que comprueban en la MISMA transacción que el slot
no tenga ya ningún registro de asistencia ese día antes de escribir — cierra la ventana de carrera que
un CRUD directo con comprobación en el cliente dejaría abierta, decisión razonada explícitamente en
`DECISIONES_TECNICAS.md` contra el patrón, más laxo, de `cierre_centro`). `registrar_asistencia`
(`005`, ya aplicada e inmutable) se sustituye con `create or replace function`, misma firma exacta —
la única diferencia real es que ahora consulta `excepcion_slot` antes de decidir quién puede registrar
(cancelación bloquea a cualquiera, sustitución solo al sustituto nombrado, comprobado en ESE orden
para que el titular no se cuele por su propiedad legítima del slot antes de mirar la excepción,
decisión también razonada en `DECISIONES_TECNICAS.md`). `registrar_ausencia` (`010`, todavía sin
aplicar) recibe la misma lógica por edición directa del fichero, correctamente justificado (la regla
de inmutabilidad de §0.1 protege una migración APLICADA, y `010` no lo está: el propio runner solo
compara el hash contra lo que ya conste en el ledger). Rol `student` cerrado / RLS completa: las dos
tablas nuevas nacen con RLS habilitada y políticas explícitas en el mismo fichero (nunca "próximo lote
de políticas" — patrón correctamente distinto del de `001_esquema_inicial.sql`, razonado también en
`DECISIONES_TECNICAS.md`), sin ninguna política para `student`, confirmado además por las dos tablas
añadidas a los barridos obligatorios de `student` (sección 6) y `anon` (sección 8f) de
`pruebas_rls.sql`. Superficie de columnas del `teacher` / datos de personas de referencia / alcance de
datos personales: ninguna columna nueva de `tipos.ts` toca alumnos ni contacto (`CierreCentro` y
`ExcepcionSlot` son metadatos de horario/administración, sin ningún dato de persona); `persona_referencia`
no cambia de esquema ni de políticas en este lote (sigue exclusiva de `administrator`); el informe
mensual (R-04) no expone `motivo_justificacion` ni ningún dato de contacto, solo recuentos agregados, y
resuelve "Centro" únicamente para `administrator` vía `alumno_ficha` (nunca ampliando el `GRANT` de
`alumno` para `teacher`). No-retroactividad del horario: `sesionesEsperadasDelMes` (R-04) y
`sesionesSinPasarLista` (R-13) iteran cada versión vigente del horario por semana
(`vigente_desde`/`vigente_hasta`), nunca el horario actual, con test explícito de la transición.
Secretos / guardas del runner / stack: sin cambios de superficie, ver metodología arriba.

**Coherencia entre lo decidido y lo ejecutado — un caso ejemplar de autodetección correcta (R-05,
pregunta #17), sin hallazgo nuevo de fondo ahí.** La sesión de R-05 (2026-09-07) encontró, por sí
misma y sin que el auditor tuviera que señalarlo, que el requisito 4 de su propia spec ("el `teacher`
del alumno accede a sus personas de referencia por el botón «avisar»") contradecía literalmente §0.2
de `HOJA_DE_RUTA.md` ("el `teacher`... no ve datos de contacto ni personas de referencia") — exactamente
el mismo tipo de contradicción spec-vs-norma-permanente que este auditor encontró en R-02 (hallazgo
#8). La sesión resolvió bien: implementó R-05 en el alcance conservador (solo `administrator`, real y
funcional), sin ampliar ningún `GRANT` ni escribir ninguna política nueva, y abrió la pregunta **#17**
de §6 con tres opciones sin decidir por su cuenta cuál — mismo protocolo que ya demostró funcionar con
la pregunta #16. Verificado de forma independiente: `src/datos/personasReferencia.ts` no cambió de
superficie (comentario propio, línea 132-134, referencia la pregunta #17); `db/003_politicas_rls.sql`
no se tocó; `dominio/permisosUi.ts#puedeVerPersonasReferencia` sigue devolviendo `false` para
`teacher`. Es la prueba de que el propio proceso del proyecto (spec-vs-norma-permanente → pregunta a
§6, nunca una ampliación silenciosa) sostiene su disciplina incluso sin que el auditor intervenga.

**Dos hallazgos nuevos — el patrón repetido es más revelador que cada uno por separado.** `#10`
(alta, `db/pruebas_rls.sql`): la sección 8 (barrido de `TRUNCATE` por `authenticated`, el propio
punto de control que este documento marca como el que "se reintroduce solo") no se amplió con las
dos tablas nuevas de este lote, mientras que las secciones 6 (`student`) y 8f (`anon`) sí se
ampliaron correctamente — confirmado leyendo las tres listas de tablas línea a línea. Los `GRANT`
reales de ambas migraciones son correctos hoy (verificado aparte de la batería): no hay ninguna fuga
activa, pero la red automática que debería demostrarlo — y detectar una regresión futura sin que
nadie tenga que acordarse — tiene un punto ciego exacto sobre las dos tablas más recientes. `#11`
(baja, `roadmap/SEGUIMIENTO.md` §7): falta la fila de la desviación de R-05/pregunta #17, exactamente
el mismo patrón que el hallazgo #9 (arriba, `RESUELTO` hace apenas un día de trabajo, en la sesión de
R-12). Ninguno de los dos hallazgos indica mala fe ni descuido grosero — son, otra vez, el tipo de
punto ciego que aparece al mirar el mecanismo central de una tarea (la RPC, la política, la pregunta
de alcance) y no la actualización de la lista de comprobación que lo acompaña. Pero que el mismo tipo
de gobernanza documental (`#9`/`#11`, fila que falta en §7) y el mismo tipo de batería con un barrido
sin actualizar (`#2` histórico/`#10`, un barrido que se queda atrás mientras los otros se actualizan)
se repitan por segunda vez cada uno sugiere que ninguno de los dos se ha incorporado todavía como
paso explícito del propio protocolo (p. ej. una lista de comprobación al cerrar una tarea con tabla
nueva: "¿los TRES barridos obligatorios de `pruebas_rls.sql` incluyen la tabla nueva?", "¿se abrió una
pregunta de alcance en §6? añadir su fila en §7") — se corrige cuando el auditor lo señala, no antes.

**Conclusión.** Primera pasada con hallazgos nuevos desde el `#9` (2026-09-05), y la primera con un
hallazgo de severidad alta desde el `#8` (mismo día). El código de R-04/R-05/R-06/R-12/R-13 en sí —
RPC, triggers, políticas, snapshot histórico, reutilización disciplinada de `esDiaCerrado`/
`esDiaCanceladoParaSlot` entre las tres tareas que los necesitan— está bien construido, con tests que
prueban de verdad la lógica de negocio crítica (positivos y negativos, no solo el camino feliz;
verificado leyendo las secciones 8j/8k completas). El problema, en los dos hallazgos nuevos, no es de
mecanismo: es que la actualización de una lista de comprobación (la batería de RLS, el resumen de
desviaciones) no siempre acompaña a la actualización del mecanismo que describe. Los dos hallazgos
`ABIERTO` heredados (`#8`, RGPD/dato de salud; `#9`, ahora `RESUELTO`) no cambian: `#8` sigue esperando
la respuesta del dueño a la pregunta #16, `011` sigue sin aplicar. Recomendación para la siguiente
sesión de PM: convertir `#10` en una `P-XX` urgente (ampliar el array de la sección 8 de
`pruebas_rls.sql` con `cierre_centro`/`excepcion_slot`, corrección mecánica y de bajo riesgo, igual
que P-04 ya hizo una vez con el mismo tipo de brecha) y `#11` en una `P-XX` no urgente (añadir la fila
de R-05 a §7, mismo criterio que P-17). R-01/R-02/R-03/R-06/R-12 siguen `BLOQUEADA` esperando
exclusivamente al dueño (aplicar `010`-`014`, la `011` condicionada además a la pregunta #16); R-14
queda con spec escrita y sin código todavía.

### Auditoría 2026-09-07

**Alcance real de esta pasada — segundo lote consecutivo sin ningún cambio de código: un único
commit, puramente de proceso.** `git log 5a27918..HEAD` (`5a27918` es el commit de la auditoría
anterior, 2026-09-06) muestra un solo commit nuevo: `8408920` (decimotercer ciclo del PM), que
revisa las trece R-XX del backlog contra el estado actual, no añade ninguna R-XX nueva y confirma
que los hallazgos `#8`/`#9` seguían correctamente formalizados por el ciclo anterior. `git diff
--stat 5a27918..HEAD` confirma que solo tres ficheros cambiaron, los tres de `roadmap/`:
`ROADMAP_PRODUCTO.md`, `SEGUIMIENTO.md` e `HISTORIAL_SESIONES.md`. Ningún fichero de `db/`, `src/`
ni `herramientas/` se tocó — confirmado también con `git log 5a27918..HEAD -- db/ src/
herramientas/`, vacío.

**Metodología.** `git checkout develop && git pull origin develop` limpio (fast-forward desde el
commit ya conocido de la auditoría anterior). Verificación directa en vivo de los cuatro comandos
de §0.1: `npm ci` (130 paquetes, 0 vulnerabilidades), `npm run typecheck`, `npm run lint`, `npm run
build`, los cuatro en verde, y `npm test`: **1056 tests, 1056 pass, 0 fail** (misma cifra que las
dos pasadas anteriores: sin cambio de código, sin cambio de cobertura). Confirmados contra la API
de GitHub Actions los 15 runs más recientes de `develop` (incluido el del commit actual, `8408920`,
run `34053942679`), todos `completed`/`success`, sobre **76** runs totales en el histórico del
workflow (74 en la pasada anterior, +2 exactos por los dos commits nuevos desde entonces: la propia
pasada del auditor del 2026-09-06 y este ciclo de PM). `git status` limpio antes y después. Barrido
de secretos sobre el repositorio completo (`service_role`, `SUPABASE_ACCESS_TOKEN`, `sk-`,
`eyJhbGci`, claves privadas, contraseñas en claro): todas las coincidencias son o bien prosa
explicativa de este mismo documento y de `roadmap/`/`db/MODELO.md`, o bien nombres de variable/rol
(`service_role` como valor de comparación, no como secreto) en `herramientas/` y `src/`, o fixtures
de test declaradamente falsos; `.env.ejemplo` y `config.ejemplo.js` siguen con todas sus claves
vacías, sin ningún valor relleno, y ningún `.env*`/`config.js` real está trackeado (`git ls-files`
solo lista `.env.ejemplo`). `package.json` sigue sin `dependencies`. `git log 5a27918..HEAD --
roadmap/HOJA_DE_RUTA.md` vacío: el documento sigue sin ninguna edición nueva.

Dado que ningún fichero de `db/*.sql`, `src/` ni `herramientas/` cambió desde la pasada anterior —
que a su vez heredó sin cambios el esquema ya verificado línea a línea el 2026-09-05 (migraciones
`010`/`011`/`012` y las secciones nuevas de `pruebas_rls.sql`) —, ninguno de los puntos de control
permanentes de seguridad de este documento necesita releerse entero esta vez: nada en el esquema
real ni en el código ha cambiado desde que se verificaron con sustancia. Esta pasada se centra, de
nuevo, en la única superficie que sí puede moverse entre pasadas sin tocar código: la coherencia
entre los dos hallazgos `ABIERTO` y la respuesta que reciben.

**Reevaluación de los hallazgos `ABIERTO` — ninguno se cierra todavía, y es lo correcto; tampoco hay
ninguna regresión en su formalización.**

`#8` (RGPD/dato de salud en R-02, alta): sigue como pregunta **#16** de §6 de `SEGUIMIENTO.md`,
verificada de nuevo leyendo la fila completa (línea 1427) — las tres opciones (aceptar con base
jurídica del artículo 9.2, reformular sin desglose médico, o retirar el campo) siguen intactas, sin
recortar. `db/APLICADAS.md` no registra ningún cambio: `011` sigue sin aplicar, y la fila 14 de §3
de `SEGUIMIENTO.md` (línea 1354) sigue condicionando su aplicación a que el dueño responda primero.
No hay respuesta del dueño todavía en la columna de la pregunta #16. `motivo_justificacion` sigue en
el esquema del fichero de migración tal cual, sin reformular ni retirar. **`#8` permanece
`ABIERTO`.**

`#9` (higiene documental, faltan dos filas en §7, baja): sigue como **P-17**, `PENDIENTE`, en el
backlog de §5 (línea 1391), sin ejecutar. Comprobado de forma directa que las dos filas siguen sin
existir: §7 de `SEGUIMIENTO.md` (líneas 1431 en adelante) termina todavía en la fila de T-20
(2026-09-01), sin ninguna fila nueva para la corrección de T-14 dentro de T-25 ni para el hallazgo
`#8`. **`#9` permanece `ABIERTO`**, exactamente por el mismo motivo que la pasada anterior: el
hallazgo era que faltaban las filas, no que faltara registrarlo, y las filas todavía no se han
escrito.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo nuevo.** El único commit del lote
(`8408920`) es de nuevo exactamente lo que declara ser: un ciclo de PM que no toca código, que
revisa las trece R-XX del backlog contra el estado actual sin encontrar ninguna necesidad real de
ampliarlo (`roadmap/FEEDBACK.md` comprobado de nuevo: sigue con su única fila plantilla vacía, sin
ninguna entrada `nuevo`), y que no introduce ninguna contradicción nueva entre `DECISIONES_TECNICAS.md`
(sin cambios) y el código real (sin cambios). No hay ninguna desviación nueva de §7 que registrar
más allá de las dos que P-17 ya tiene pendientes.

**Conclusión.** Segunda pasada consecutiva de puro proceso, sin ninguna superficie de código nueva
que auditar: la oleada v1 (R-01/R-02/R-03) sigue completa en código y tests pero bloqueada
esperando al dueño, T-25 sigue sin poder cerrarse, y los dos hallazgos `ABIERTO` de las auditorías
anteriores permanecen exactamente donde estaban, correctamente formalizados y sin ninguna regresión
en su seguimiento. No se detecta ningún indicio de que el equipo (agentes PM/programador) esté
perdiendo de vista `#8` o `#9`, ni ninguna erosión de los puntos de control permanentes de este
documento — que, al no haber cambiado el esquema ni el código desde el 2026-09-05, siguen
sosteniéndose sobre esa última verificación con sustancia real, no sobre una suposición. La próxima
auditoría con sustancia real llega en cuanto el dueño responda la pregunta #16 (y, con ella, aplique
o reescriba `011`), en cuanto una sesión de programador ejecute P-17, o con la próxima sesión de
código sobre la oleada v1.

### Auditoría 2026-09-06

**Alcance real de esta pasada — el lote más pequeño auditado hasta hoy: un único commit, puramente
documental, sin ningún cambio de código.** `git log 1fe80a4..HEAD` (`1fe80a4` es el commit de la
auditoría anterior, 2026-09-05) muestra un solo commit nuevo: `f1215ca` (duodécimo ciclo del PM),
que convierte el hallazgo `#8` de la pasada anterior en la pregunta **#16** de §6 de
`SEGUIMIENTO.md` y el hallazgo `#9` en **P-17** del backlog de §5. `git diff --stat 1fe80a4..HEAD`
confirma que solo tres ficheros cambiaron, los tres de `roadmap/`: `ROADMAP_PRODUCTO.md`,
`SEGUIMIENTO.md` e `HISTORIAL_SESIONES.md`. Ningún fichero de `db/`, `src/` ni `herramientas/` se
tocó.

**Metodología.** `git checkout develop && git pull origin develop` limpio. Verificación directa en
vivo de los cuatro comandos de §0.1: `npm ci` (130 paquetes, 0 vulnerabilidades), `npm run
typecheck`, `npm run lint`, `npm run build`, los cuatro en verde, y `npm test`: **1056 tests, 1056
pass, 0 fail** (misma cifra que la pasada anterior: sin cambio de código, sin cambio de cobertura).
Confirmados contra la API de GitHub Actions los 15 runs más recientes de `develop` (incluido el del
commit actual, `f1215ca`, run `33986288953`), todos `completed`/`success`, sobre **74** runs totales
en el histórico del workflow (72 en la pasada anterior, +2 exactos por los dos commits nuevos desde
entonces: la propia pasada del auditor del 2026-09-05 y este ciclo de PM). `git status` limpio antes
y después. Barrido de secretos sobre el repositorio completo (`service_role`,
`SUPABASE_ACCESS_TOKEN`, `sk-`, `eyJhbGci`, contraseñas en claro): sin coincidencias reales, solo
fixtures de test declaradamente falsos (`informadorErrores.test.ts`, `registro.test.ts`,
`cargarEnvLocal.test.ts`) y prosa explicativa de este mismo documento; `.env.ejemplo` y
`config.ejemplo.js` siguen sin ningún valor relleno, y ningún `.env*`/`config.js` real está
trackeado. `package.json` sigue sin `dependencies`. `git log 1fe80a4..HEAD --
roadmap/HOJA_DE_RUTA.md` vacío: el documento sigue sin ninguna edición nueva.

Dado que ningún fichero de `db/*.sql`, `src/` ni `herramientas/` cambió desde la pasada anterior —
que sí leyó línea a línea, sin delegar, las tres migraciones nuevas (`010`/`011`/`012`) y las tres
secciones nuevas de `pruebas_rls.sql` que las ejercitan —, ninguno de los puntos de control
permanentes de seguridad de este documento (escritura solo por RPC, inmutabilidad de
`registrado_en`, rastro de cambios, pertenencia en la edición, rol `student` cerrado, privilegios de
tabla, bucket de avatares, superficie de columnas del `teacher`, alcance de datos personales, RLS
completa, hora del servidor y retroactivos, secretos, guardas del runner, stack) necesita releerse
entero esta vez: nada en el esquema real ni en el código ha cambiado desde que se verificaron con
sustancia. Esta pasada se centra en la única superficie que sí cambió: la coherencia entre los dos
hallazgos `ABIERTO` de la auditoría anterior y la respuesta que les dio el ciclo de PM.

**Reevaluación de los hallazgos `ABIERTO` — el ciclo de PM tradujo los dos correctamente; ninguno se
cierra todavía, y es lo correcto.**

`#8` (RGPD/datos de salud en R-02, alta): `f1215ca` lo convierte en la pregunta **#16** de §6 de
`SEGUIMIENTO.md`, con las mismas tres opciones que planteó la auditoría anterior (aceptar el campo
con base jurídica explícita del artículo 9.2, reformular la lista para no revelar categoría médica,
o retirarlo) — verificado leyendo la fila 16 completa: recoge las tres sin recortarlas ni cambiar su
sentido. Añade también la nota de auditoría a la spec de R-02 en `ROADMAP_PRODUCTO.md` (sustituye
"Bloqueo humano: ninguno" por "sí, desde el 2026-09-05... pendiente la respuesta del dueño a la
pregunta #16") y condiciona tanto la fila 14 de §3 (no aplicar `011` hasta resolverlo) como la fila
12 (no dar por aprobables los cuatro textos legales de T-25 mientras tanto). Es exactamente el
mecanismo que la cabecera de este documento reserva para un hallazgo de esta clase — el PM convierte
lo `ABIERTO` en pregunta al dueño — y no una resolución de fondo: `motivo_justificacion` sigue en el
esquema tal cual, `011` sigue sin aplicar (`db/APLICADAS.md`, sin cambio) y `legal/POLITICA_PRIVACIDAD.md`/
`roadmap/PRODUCCION_T25.md` siguen sin corregir — correctamente, porque corregirlos antes de que el
dueño elija entre las tres opciones sería prematuro (cada una exige un texto distinto). **`#8`
permanece `ABIERTO`**, ahora con vía de resolución formalizada.

`#9` (higiene documental, faltan dos filas en §7, baja): convertido en **P-17**, `PENDIENTE`, en el
backlog de §5 — verificado leyendo la fila completa. Comprobado también de forma directa que las dos
filas siguen sin existir: `roadmap/SEGUIMIENTO.md` §7 (líneas 1400 en adelante) termina todavía en
la fila de T-20 (2026-09-01) y no tiene ninguna fila ni para la corrección de T-14 dentro de T-25 ni
para el propio hallazgo `#8`. **`#9` permanece `ABIERTO`**: el hallazgo era que faltaban las filas,
no que faltara registrarlo en el backlog, y las filas todavía no se han escrito.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo nuevo.** El único commit del lote es
exactamente lo que declara ser: un ciclo de PM que no toca código, que no inventa una R-XX sin
justificación (el propio commit razona por qué: "ni el auditor ni FEEDBACK.md aportan ningún
hallazgo de producto/arquitectura que la justifique" — confirmado, `FEEDBACK.md` sigue con su única
fila plantilla vacía), y que traduce los dos hallazgos de la auditoría anterior sin alterar su
alcance ni su severidad. No hay ninguna decisión nueva de `DECISIONES_TECNICAS.md` que contrastar
(el fichero no cambió) ni ninguna desviación nueva de §7 que registrar más allá de las dos que P-17
ya tiene pendientes.

**Conclusión.** Pasada de vigilancia sobre un lote puramente de proceso: la única acción posible
entre una auditoría y la siguiente, cuando el hallazgo es "esto requiere que el dueño decida", es
abrir el canal correcto para que decida — y eso es lo que hizo este ciclo de PM, sin desviarse ni
recortar las opciones. Ambos hallazgos siguen `ABIERTO` con razón: `#8` porque la migración `011`
sigue sin aplicarse y el dueño todavía no ha respondido la pregunta #16; `#9` porque las dos filas de
§7 siguen sin escribirse (P-17 sigue `PENDIENTE`). El resto del proyecto (control de acceso, RLS,
RPC, bucket de avatares, secretos, guardas del runner, stack) no tiene ninguna superficie nueva que
revisar: nada cambió desde la pasada del 2026-09-05, que ya lo verificó con sustancia real. La
próxima auditoría con sustancia real llega en cuanto el dueño responda la pregunta #16 (y, con ella,
aplique o reescriba `011`), en cuanto una sesión de programador ejecute P-17, o con la próxima sesión
de código sobre la oleada v1.

### Auditoría 2026-09-05

**Alcance real de esta pasada — ocho commits, el lote con más sustancia de producto desde T-24: tres
tareas nuevas de la oleada v1 (R-01/R-02/R-03) con código y tests completos pero BLOQUEADAS por sus
migraciones, T-25 (endurecimiento y borradores de paso a producción) BLOQUEADA por decisiones del
dueño, un vuelco de estado real (T-24 pasa de BLOQUEADA a COMPLETADA al descubrirse que su migración
ya estaba aplicada) y un ciclo de PM que añade R-13.** `git log 2bc9463..HEAD` (`2bc9463` es el
commit de la auditoría anterior, 2026-09-04) muestra ocho commits: `460fcd4` (verificación sin
cambios), `2a21623` (T-24 → COMPLETADA), `7af3e17` (arreglo de una referencia cruzada en el
historial), `4499eaf` (T-25), `f885c39`/`d16626e`/`2f9453e` (R-01/R-02/R-03) y `ac2d2fa` (undécimo
ciclo del PM, añade R-13). Es también la primera pasada que encuentra un hallazgo `ABIERTO` desde el
2026-09-01: los siete hallazgos anteriores llevaban un mes seguido `RESUELTO`.

**Metodología.** `git checkout develop && git pull origin develop` limpio. Verificación directa en
vivo de los cuatro comandos de §0.1: `npm ci` (130 paquetes, 0 vulnerabilidades), `npm run
typecheck`, `npm run lint`, `npm run build`, los cuatro en verde, y `npm test`: **1056 tests, 1056
pass, 0 fail** (antes 943; +113, coherente con el volumen de R-01/R-02/R-03/T-25). Confirmados
contra la API de GitHub Actions los 15 runs más recientes de `develop` (incluido el del commit
actual, `ac2d2fa`, run `33909596235`), todos `completed`/`success`, sobre 72 runs totales en el
histórico del workflow. `git status` limpio antes y después. Barrido de secretos sobre `dist/` recién
construido y sobre el repositorio completo (`service_role`, `SUPABASE_ACCESS_TOKEN`, `sk-`,
`eyJhbGci`, contraseñas en claro): sin coincidencias reales, solo prosa explicativa y fixtures de
test declaradamente falsos. `package.json` sigue sin `dependencies`. `git log 2bc9463..HEAD --
roadmap/HOJA_DE_RUTA.md` vacío: el documento sigue sin ninguna edición nueva. `.github/workflows/ci.yml`
y `herramientas/migraciones/guardas.ts`/`runner.ts`/`verificarPrivilegios.ts` sin cambios: mismas
puertas, mismas guardas.

Dado que el lote toca de lleno la tabla `asistencia` (tres migraciones nuevas que la modifican) y
documentos de cara al dueño y a terceros (T-25: cabeceras HTTP, cuatro textos legales), este auditor
leyó personalmente, sin delegar, los tres ficheros de migración completos (`db/010_registro_ausencias.sql`,
`db/011_justificacion_ausencia.sql`, `db/012_registro_salida.sql`) y las tres secciones nuevas de
`db/pruebas_rls.sql` (8g/8h/8i, líneas 1783-2218) que las ejercitan, y despachó dos subagentes de
investigación en paralelo — uno centrado en `roadmap/PRODUCCION_T25.md` y los cuatro documentos de
`legal/`, otro en la coherencia entre lo decidido (`ROADMAP_PRODUCTO.md`, `DECISIONES_TECNICAS.md`,
§7 de `SEGUIMIENTO.md`, inmutabilidad de `HOJA_DE_RUTA.md`) y lo ejecutado — para poder contrastar
sus hallazgos entre sí sin que uno contaminara al otro.

**Punto de control: escritura solo por RPC, inmutabilidad, rastro de cambios, pertenencia en la
edición, hora del servidor y retroactivos — sin hallazgo, las tres migraciones nuevas los respetan
al milímetro.** `registrar_ausencia` (010) es una RPC `SECURITY DEFINER` separada, con la misma
comprobación de pertenencia que `registrar_asistencia` (el slot tiene que ser del profesor que llama),
el mismo límite de tasa compartido, y la misma fórmula de `es_retroactivo`; el índice de duplicado
(`asistencia_uq_alumno_slot_dia_activa`) sustituye correctamente al de `005` (inmutable) sin editarlo.
`actualizar_asistencia` (011, 012) se sustituye con `drop function` + `create function` de firma
completa —correcto: PL/pgSQL identifica una función por nombre y tipos, así que un `create or
replace` con parámetros nuevos habría creado una segunda sobrecarga ambigua en vez de sustituir la
firma— y conserva sin tocar el primer `if` de autorización (`administrator` siempre;
`teacher` solo lo suyo y dentro de la ventana de 7 días desde `registrado_en`), que es lo que hace
que "justificar" y "marcar/ajustar salida" fuera de ventana se rechacen para `teacher` y se acepten
para `administrator` sin ningún código nuevo. "Marcar salida" fija `clock_timestamp()`, nunca
`now()` ni un valor del cliente —decisión documentada también en `DECISIONES_TECNICAS.md` y necesaria
porque `now()` es constante dentro de una misma transacción, y tanto una llamada real como la propia
batería de pruebas (que corre en un único `begin…rollback`) la ejecutarían junto al `INSERT` de
entrada—; el trigger `asistencia_proteger_inmutables` (`001`, no tocado) sigue abortando cualquier
intento de mover `registrado_en`/`profesor_id`/`peticion_id` en las tres migraciones nuevas, y el
trigger de copia a `asistencia_historial` se sustituye (nunca la tabla) para que las columnas nuevas
viajen también al historial — mismo patrón que `009` ya validó una pasada atrás.

**Calidad real de los tests — sin hallazgo, cobertura sustancial, no decorativa.** Leídas enteras las
tres secciones nuevas de `pruebas_rls.sql`: cada una crea su propio slot de prueba (nunca reutiliza
`slot_prueba` de la sección 4, para no repetir la fragilidad que ya corrigió P-08) y prueba casos
positivos Y negativos reales, no solo el camino feliz — duplicado alumno/slot/día contra el nuevo
índice compartido `valida`/`ausente` (8g), motivo fuera de la lista cerrada, justificar un registro
que no está ausente, justificar fuera de la ventana del profesor aceptado solo para `administrator`
(8h), marcar salida dos veces, ajustar a una hora anterior o igual a la entrada, marcar y ajustar en
la misma llamada, ajustar una salida no marcada, marcar salida de una ausencia (8i) — fabricando con
un `INSERT` directo del rol de conexión (nunca `authenticated`) el registro "fuera de ventana" que
ninguna llamada real podría producir dentro de la vida de la transacción de prueba. Es exactamente el
tipo de batería que prueba la lógica de negocio crítica, no una que solo mantiene el semáforo verde.

**Coherencia entre lo decidido y lo ejecutado — un hallazgo real, severidad alta (`#8`), más uno de
higiene documental (`#9`).** El vuelco de T-24 (`2a21623`, BLOQUEADA → COMPLETADA) está bien
fundamentado, no es una afirmación sin respaldo: dos vías independientes lo sostienen —el hash del
ledger de `dev` (`npm run migrate -- --estado`) coincide con el SHA-256 del fichero en disco, y la
sección 8e de `pruebas_rls.sql`, ya en el repositorio desde el 2026-09-03, exige "%último
administrator%" en el trigger que solo existe si `009` está aplicada, y dio 105/0/0 ese mismo día— y
queda reflejado sin contradicción en los cuatro documentos que mencionan T-24. Sin hallazgo tampoco
en la spec de R-01/R-02/R-03 contra las cabeceras de sus migraciones (cada requisito de
`ROADMAP_PRODUCTO.md` tiene su reflejo literal en el fichero `db/01N_*.sql` correspondiente), en la
ampliación de R-13 (dependencias coherentes con el resto del backlog de la oleada v1) ni en el resto
de `DECISIONES_TECNICAS.md`/`HISTORIAL_SESIONES.md`.

El hallazgo real (`#8`, registrado arriba con todo el detalle) es que R-02 introduce
`asistencia.motivo_justificacion` con valores `'enfermedad'`/`'cita_medica'` — dato de salud a
efectos del artículo 9 del RGPD por definición, con independencia de su granularidad—, sin que
conste en ningún sitio una decisión expresa del dueño que lo autorice, pese a que §0.2 de
`HOJA_DE_RUTA.md` (documento inmutable) lo exige literalmente y la propia tabla de puntos de control
de este documento clasifica esa falta como severidad alta. La spec de R-02 (`Origen: roadmap`, la
propuso el ciclo del PM) fija "Bloqueo humano: ninguno" — el gate que sí se activó para T-09
(bloqueo de cuenta, una ampliación de alcance mucho menos sensible) no se activó aquí. Arrastra
además dos documentos de la misma tanda que quedaron desactualizados sin revisión posterior:
`legal/POLITICA_PRIVACIDAD.md` y el inventario RGPD de `roadmap/PRODUCCION_T25.md` (escrito en el
commit `4499eaf`, ANTES de R-01/R-02/R-03 en la secuencia) afirman los dos, todavía hoy, "cero dato
de salud, cero categoría del artículo 9" — cierto cuando se escribió, falso desde `d16626e`. No hay
ningún indicio de mala fe ni de descuido grosero: es el tipo exacto de punto ciego que un equipo
— aunque sea un agente disciplinado con un proceso de revisión propio ya maduro — puede no ver
por estar mirando el mecanismo (dónde vive el `CHECK`, qué firma tiene la RPC) y no la categoría del
dato que ese mecanismo transporta. Se verificó por triplicado antes de escribirse aquí: lectura
directa de este auditor y los dos subagentes despachados por separado llegaron al mismo hallazgo sin
verse el uno al otro. Todavía no es una fuga: `011` sigue sin aplicar en `dev`. Pero bloquea con
razón tanto la aprobación final de los textos legales de T-25 como la aplicación de `011`/`012` tal
como están hoy, y corresponde al dueño resolverlo — aceptar, reformular o retirar el campo —, no al
agente.

El hallazgo de higiene (`#9`, baja) es que §7 de `SEGUIMIENTO.md` no indexa ni la corrección real de
T-14 (requisito 8, aviso de consentimiento, encontrada y arreglada dentro de T-25) ni este mismo
hallazgo `#8` — ambos están documentados en otro sitio, así que no se han perdido, pero reducen el
valor de §7 como resumen de un vistazo.

**Conclusión.** Primera pasada en un mes con un hallazgo `ABIERTO`, y el primero desde el #2 (agosto)
con sustancia de seguridad/cumplimiento real en vez de higiene documental. El código de R-01/R-02/R-03
en sí —RPC, triggers, ventana de edición, reloj del servidor, batería de pruebas— está bien
construido y no repite ningún patrón de riesgo ya visto; el problema no es de mecanismo, es de
categoría de dato, y vive exactamente en el punto que este proyecto diseñó su propio §0.2 para
vigilar. Recomendación para la siguiente sesión de PM: convertir el hallazgo `#8` en pregunta de §6
dirigida al dueño (con las tres opciones planteadas arriba) antes de que `011`/`012` se apliquen o de
que los textos legales de T-25 se den por aprobables, y añadir las dos filas que faltan en §7. T-25
y la oleada v1 siguen, por lo demás, exactamente donde las documentan `SEGUIMIENTO.md` §1/§3: sin
ninguna migración de este lote aplicada todavía, a la espera del dueño.

### Auditoría 2026-09-04

**Alcance real de esta pasada — el lote más pequeño auditado hasta hoy: seis commits, un único
arreglo de código (`P-16`, ya urgente y ya resuelto antes de que esta pasada empezara) y cinco
commits sin ningún cambio de código.** `git log 3f7d251..HEAD` (`3f7d251` es el commit de la
auditoría anterior, 2026-09-03) muestra seis commits: `07f4e80` y `5adb6b0`/`3332aad`/`5d4d2b3` (tres
"sesiones de verificación" del mismo día, cada una repite la comprobación pre-push completa sin tocar
código ni documentación funcional, solo el hub `SEGUIMIENTO.md`/`HISTORIAL_SESIONES.md`), `863cd1b`
(**P-16**, el único cambio de código real de todo el lote) y `7a40dcb` (décimo ciclo del PM, amplía la
spec de R-06 sin tocar ningún fichero de `db/` ni de `src/`). Ninguna tarea T-XX ni R-XX avanzó: T-24
sigue exactamente donde la dejó la pasada anterior, `BLOQUEADA` por la migración `009`, sin ninguna
acción del dueño todavía (`db/APLICADAS.md` la sigue listando en "Pendiente de aplicar"); T-25 y la
oleada v1 siguen sin poder arrancar.

**Metodología.** `git checkout develop && git pull` limpio, sin nada por delante ni por detrás.
Verificación directa en vivo de los cuatro comandos de §0.1 — `npm ci` (130 paquetes, 0
vulnerabilidades), `npm run typecheck`, `npm run lint`, `npm run build`, los cuatro en verde — y
`npm test`: **943 tests, 943 pass, 0 fail** (misma cifra que documentan los seis commits de este
lote: sin cambio desde `P-16`). Confirmados contra la API de GitHub Actions los runs de CI en
`develop`: los 15 más recientes, incluido el del commit actual (`7a40dcb`, run `33794596203`), todos
`completed`/`success` — 63 runs en total en el histórico del workflow, sin ninguno en rojo.
`git status` limpio antes y después. Barrido de secretos sobre `dist/` recién construido (`grep -rniE`
de `service_role`/`SUPABASE_ACCESS_TOKEN`/JWT en base64/contraseñas en claro): cero coincidencias.
`package.json` sigue sin la clave `dependencies` (ni siquiera vacía): mismo `devDependencies` de
siempre, sin framework, sin SDK de Supabase. `git log 3f7d251..HEAD -- roadmap/HOJA_DE_RUTA.md`
vacío: sin ninguna edición del dueño en esta pasada, el documento sigue inmutable. `.github/workflows/ci.yml`
sin cambios: sigue ejecutando `npm ci` → `typecheck` → `lint` → `test` → `build` sin ningún paso
salteado ni condición que los desactive.

Dado que el único cambio de código del lote toca precisamente la herramienta que demuestra el
aislamiento entre roles — la tercera vez que un defecto de la propia batería de RLS la inhabilita en
silencio o en bloque, después de P-08 y P-12 —, el propio auditor leyó línea a línea, sin delegar en
subagentes: el diff completo de `863cd1b` sobre `db/pruebas_rls.sql` (las cuatro líneas movidas),
el fichero íntegro `herramientas/migraciones/pruebasRlsEstatico.test.ts` (los cinco tests, incluido el
seguimiento de ámbitos `declare`/`begin`/`end;` nuevo), el diff completo de `roadmap/SEGUIMIENTO.md` y
`DECISIONES_TECNICAS.md` contra la pasada anterior, y el diff completo de `roadmap/ROADMAP_PRODUCTO.md`
(la ampliación de R-06). Además, `db/APLICADAS.md`, `db/003_politicas_rls.sql` (`grep` dirigido a
`TRUNCATE`, `to anon` y `student`) y `db/009_administracion_usuarios.sql` se recontrastaron contra el
disco para confirmar que ningún fichero de `db/*.sql` distinto de `pruebas_rls.sql` cambió una sola
letra desde la pasada anterior — así que ningún punto de control permanente sobre el esquema real
(RLS, `GRANT`, triggers, bucket de avatares) necesita releerse entero esta vez: ya lo hizo, con
sustancia, la auditoría del 2026-09-03, y el diff de esta pasada no lo toca.

**Punto de control: calidad real de los tests, guardas del runner — `P-16` es exactamente el tipo de
arreglo que demuestra que la red de seguridad funciona, no que falló.** El defecto que corrige (`v_filas`
declarada en un sub-bloque de la sección 8e y leída en su hermano, un error de ámbito de plpgsql que
tumbaba las 105 comprobaciones de la batería entera, no solo la sección 8e) es un fallo de
COMPILACIÓN del bloque `do`, no de lógica: ninguna de las cuatro puertas de CI (`typecheck`, `lint`,
`test`, `build`) mira dentro de una cadena SQL, así que ninguna podía haberlo detectado, y de hecho no
lo detectaron — las tres sesiones de verificación de esa misma mañana pasaron las cuatro puertas en
verde con el fichero ya roto. Lo encontró la única vía que podía encontrarlo: la ejecución real de
`npm run probar-rls` contra `dev` por el dueño. El arreglo en sí es correcto y mínimo (sube `v_filas`
al `declare` del `do`, mismo patrón ya usado en la sección 4b, sin tocar ninguna lógica de
comprobación) y viene con una guarda nueva y bien dirigida: un quinto test estático en
`pruebasRlsEstatico.test.ts` que seguí línea a línea (líneas 96-159) — sigue los ámbitos
`declare`/`begin`/`end;` del fichero de forma deliberadamente literal (documentado así en su propio
comentario: "si el formato del fichero cambia, avisa con un FALSO POSITIVO, no con un falso negativo
silencioso", la asimetría correcta para una guarda que no puede permitirse fallar callada) y falla si
cualquier variable `v_…` se lee fuera del ámbito que la declara. Verificado por este auditor
revirtiendo mentalmente el fichero al estado roto contra la lógica del test: las seis referencias de
las líneas 1650/1651/1680/1681 (`v_filas` y `v_visto` en el segundo `begin…end;` de cada rama)
quedarían fuera de cualquier ámbito abierto, tal como el commit documenta haber comprobado. Es la
tercera guarda de este tipo que el proyecto añade sobre la misma herramienta (P-10: ningún `except
when others` aprueba a ciegas; P-12: la fila devuelta por una RPC se expande, no se mete entera en un
campo) — un patrón sano de "cada vez que la batería se rompe, la rotura queda imposible de repetir",
no un síntoma de fragilidad creciente: las tres roturas fueron errores de SQL dentro de un `do $$…$$`
que ninguna herramienta del ecosistema (TypeScript, ESLint, Node) puede analizar, así que cada una
necesitaba su propia guarda a medida, y las tres ya la tienen.

**Verificación en ejecución real, no solo documentada — 105 comprobaciones, 0 omitidas, 0
fallidas, la primera vez sin ninguna omisión.** `SEGUIMIENTO.md` registra que el dueño ejecutó
`npm run probar-rls` contra `dev` tras el arreglo y obtuvo el resultado de arriba, incluyendo por
primera vez las cuatro comprobaciones de la sección 8e (T-24, aislamiento de `perfil` entre roles
ajenos) que la sesión que las escribió nunca llegó a ver correr porque el fichero no compilaba
todavía. Este auditor no tiene credenciales de Supabase en este entorno (confirmado: ningún
`.env*` cargado, ninguna variable `SUPABASE_*`/`*_TOKEN` en el entorno del proceso) y no puede
reproducir esa ejecución — la acepta, como en pasadas anteriores, por ser una cifra específica y
contrastable con el propio SQL (105 es exactamente el recuento de bloques `pg_temp.registrar_prohibido`/
`pg_temp.registrar` del fichero, no una cifra redonda inventada) y por venir acompañada del detalle de
qué comprobaciones nuevas aparecieron y con qué motivo exacto (`filas_afectadas=0`), no de una
afirmación genérica. Sigue siendo, como en toda pasada anterior, el dueño quien ejecuta el runner —
nunca este auditor ni ningún agente — y el registro documental es la única fuente disponible para
verificarlo desde este entorno.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo.** La ampliación de R-06 (`7a40dcb`) es
un cambio de spec sobre una tarea sin implementar todavía (`Migración: Sí`, `013_excepcion_slot`,
pero sin ningún fichero `013_*` creado): no hay código ni migración que contrastar, y por tanto no genera fila
en §7 de `SEGUIMIENTO.md` (correcto, mismo criterio que las renumeraciones prospectivas de ciclos
anteriores) ni afecta a ningún punto de control de seguridad de este documento. La única dependencia
nueva que introduce (R-04 gana a R-06) es coherente con el propio razonamiento del ciclo y no choca
con ninguna decisión previa de `DECISIONES_TECNICAS.md`. Nada en las cinco sesiones de verificación
ni en el ciclo de PM contradice §0.2 ni ninguna fila de `DECISIONES_TECNICAS.md`.

**Reevaluación de hallazgos `ABIERTO` — no aplica, el registro sigue vacío.** Los siete hallazgos
históricos (`#1` a `#7`) siguen `RESUELTO`, sin ningún cambio de código que los reabra. No se abre
ningún hallazgo nuevo en esta pasada: el único cambio de código del lote (`P-16`) es una corrección ya
verificada en ejecución real antes de que esta auditoría empezara, con su propia guarda de regresión,
y el resto del lote es documentación de estado sin ningún cambio de comportamiento.

**Conclusión.** Pasada de vigilancia, no de descubrimiento: el lote más pequeño auditado hasta hoy,
sin ninguna superficie nueva de seguridad que revisar (ningún fichero de `db/*.sql` cambió salvo
`pruebas_rls.sql`, y ese cambio ya lo verificó en ejecución real quien lo escribió). Lo único que
merece quedar dicho con claridad es que la batería de RLS —la pieza que sostiene la confianza de este
proyecto en que sus políticas hacen lo que dicen— ha fallado en bloque tres veces (P-08, P-12, P-16) y
las tres veces el proyecto respondió con una guarda estática nueva en vez de solo arreglar la línea;
es la señal correcta de un equipo que trata los fallos de su propia red de seguridad como el hallazgo
más serio posible, no como ruido. T-24 sigue con su código y sus tests completos esperando solo a que
el dueño ejecute `npm run migrate`; no hay nada más que este proyecto pueda hacer para adelantar esa
espera. La próxima auditoría con sustancia real de seguridad llega en cuanto el dueño aplique `009`,
momento en el que T-24 pasará de "código listo" a "control de acceso de usuarios y roles verificado en
producción de datos real" — o con la primera implementación de una R-XX de la oleada v1.

### Auditoría 2026-09-03

**Alcance real de esta pasada — siete commits, una tarea nueva (T-24) BLOQUEADA por su propia
migración, y cierre en código de los tres hallazgos de higiene que quedaban abiertos.** `git log
a8d8754..HEAD` (`a8d8754` es el commit de la auditoría anterior, 2026-09-02) muestra siete commits
nuevos: `bee1602` (afinado de un mensaje de omisión en `db/pruebas_rls.sql`), `a7edaf1` (filas 9/10
de §3 de `SEGUIMIENTO.md` marcadas `RESUELTA`: `007`/`008` aplicadas y verificadas en `dev`),
`8d76645` (**T-24**, administración de usuarios y roles: código y tests completos, **BLOQUEADA por
la migración `009`**), `c5cff96` (**P-05/P-13/P-14/P-15**: diagnóstico de CLI y backlog documental —
cierra los hallazgos #5, #6 y #7 de este documento), `18fd2ba` (**P-06/P-07(a)**: barrido de RLS del
rol `anon`, y aviso explícito de comprobaciones omitidas en el veredicto de `probar-rls`), `3cbad9a`
(sesión de verificación sin tarea vertebral desbloqueada, backlog `P-XX` agotado) y `8f6064e`
(noveno ciclo del PM: renumeración prospectiva de los ficheros de migración que reservaban
R-01/R-02/R-03/R-06/R-12, de `006`-`010` a `010`-`014`, porque T-18/T-20/T-21/T-24 ya habían
consumido esos números de verdad). Ninguna R-XX ha entrado en desarrollo todavía: la oleada v1 sigue
sin arrancar, a la espera de que el MVP completo (T-00 a T-25) esté `COMPLETADA`/`DESPLEGADA EN
PRODUCCIÓN`.

**Metodología.** `git checkout develop && git pull origin develop` limpio, sin nada por delante ni
por detrás. Verificación directa en vivo de los cuatro comandos de §0.1 — `npm ci` (130 paquetes, 0
vulnerabilidades), `npm run typecheck`, `npm run lint`, `npm run build`, los cuatro en verde — y
`npm test`: **942 tests, 942 pass, 0 fail** (antes 891, +51 desde la pasada anterior, coherente con
el volumen de T-24). Confirmados contra la API de GitHub Actions los runs de CI en `develop`: los 30
más recientes, incluido el del commit actual (`8f6064e`), todos `completed`/`success`. `git status`
limpio antes y después. Barrido de secretos sobre `dist/` recién construido (`grep -rniE` de
`service_role`/`SUPABASE_ACCESS_TOKEN`/JWT/contraseñas en claro): cero coincidencias reales; ningún
`.env*`/`config.js` trackeado (`.gitignore` los cubre los tres). `git log a8d8754..HEAD --
roadmap/HOJA_DE_RUTA.md` vacío: sin ninguna edición del dueño en esta pasada, el documento sigue
inmutable. `package.json` sigue con `dependencies` vacío y el mismo `devDependencies` de siempre —
sin framework, sin SDK de Supabase, sin `fetch` de aplicación fuera de `src/datos/`.

Dado que el lote es pequeño y su pieza de mayor riesgo (T-24, gestión de roles) toca directamente el
control de acceso del sistema, el propio auditor leyó línea a línea, sin delegar en subagentes:
`db/009_administracion_usuarios.sql` completo, el diff íntegro de `db/pruebas_rls.sql` (secciones
8e y 8f, nuevas), `src/datos/usuarios.ts`, `src/dominio/administracionUsuarios.ts` y
`src/ui/pantallaUsuarios.ts` (los tramos de deshabilitado del botón/`<select>` de rol), el diff
completo de `roadmap/DECISIONES_TECNICAS.md`, `SEGUIMIENTO.md` y `ROADMAP_PRODUCTO.md` contra la
pasada anterior, y `db/000_bootstrap_perfil.sql` para confirmar el esquema y las políticas de
`perfil` sobre las que se apoya T-24.

**Punto de control: rol `student` cerrado y privilegios de tabla, con superficie nueva — el
barrido de `anon` que faltaba (P-06), sin hallazgo.** La sección 8f nueva de `db/pruebas_rls.sql`
(líneas 1735-1782, leída completa) ejercita `pg_temp.impersonar_anon()` —ya definida desde antes,
pero código muerto hasta ahora, tal como señalaba el propio P-06— contra las nueve tablas de
`public` más `storage.objects`, esperando `permission denied` (rechazo de PRIVILEGIO, no de RLS:
`anon` no tiene ningún `GRANT` de tabla en absoluto, a diferencia de `student`, que sí lo tiene y
por eso su barrido de la sección 6 espera `0` filas en vez de una excepción) y aceptando cualquiera
de los dos desenlaces solo para `storage.objects`, cuyo privilegio por defecto de Supabase no está
documentado en ningún fichero de este repositorio. La distinción entre los dos mecanismos de
rechazo está razonada explícitamente en `DECISIONES_TECNICAS.md` y coincide con lo que el propio
`003_politicas_rls.sql` hace (`revoke all ... from anon` en cada migración desde `001`). Queda,
correctamente, sin ejecutar todavía contra `dev` real: es SQL nuevo, a la espera de que el dueño
corra `npm run probar-rls` de nuevo.

**Punto de control nuevo de esta pasada: administración de usuarios y roles (T-24) — código y
tests completos, sin hallazgo, y correctamente BLOQUEADA hasta que se aplique `009`.** El requisito
más sensible de T-24 —que el último `administrator` activo no pueda desactivarse ni degradarse a sí
mismo— se implementa en la base de datos, no en el cliente: el trigger `perfil_before_update`
(`db/009_administracion_usuarios.sql`) sustituye al genérico `perfil_tocar_actualizado_en` del
bootstrap, sigue fijando `actualizado_en`/`actualizado_por` él mismo (nunca el cliente, mismo patrón
que `asistencia.actualizado_por` de T-07) y aborta cualquier `UPDATE` que deje al sistema sin ningún
otro `administrator` activo, comprobado con una subconsulta sobre `perfil` que excluye la propia fila
(`id <> old.id`). No necesita `SECURITY DEFINER` —razonado explícitamente en `DECISIONES_TECNICAS.md`
y verificado por este auditor: quien ejecuta el `UPDATE` ya tiene que ser `administrator` (única
política de `UPDATE` sobre `perfil`, `perfil_admin_actualizar`, del bootstrap) y ya puede leer todas
las filas de `perfil` (`perfil_admin_leer_todos`), así que el `SELECT` del trigger no pide ningún
privilegio que el llamante no tuviera ya. El rechazo usa `raise exception` sin `errcode 42501` a
propósito (PostgREST lo traduce a `400`, no a `403`), para que `erroresDominio.ts` conserve el
mensaje real del trigger en vez de sustituirlo por el genérico de `SinPermiso` — comprobado
directamente en `src/datos/usuarios.ts` y su comentario de cabecera. La sección 8e nueva de
`db/pruebas_rls.sql` (líneas 1613-1733, leída completa) prueba las dos caras: `teacher`/`student` no
leen ni modifican perfiles ajenos (consulta y `UPDATE` directos, sin RPC de por medio), y —dentro de
la misma transacción, dejando deliberadamente un único `administrator` activo para no depender de
cuántos haya hoy en el entorno real— ni desactivar ni degradar al último `administrator` tiene
éxito. Todo esto es código listo, no una vía de escritura real todavía: `db/APLICADAS.md` confirma
`009` **sin aplicar** en `dev` (sección "Pendiente de aplicar"), y T-24 figura correctamente
`BLOQUEADA` en `SEGUIMIENTO.md` §3 fila 11, no `COMPLETADA`.

**Punto de control: rol `student` cerrado, alcance de los datos personales — sin hallazgo en el
resto de T-24.** `perfil` (esquema confirmado en `db/000_bootstrap_perfil.sql:66-73`) solo tiene
`id`, `nombre`, `rol`, `activo`, `creado_en`, `actualizado_en` y ahora `actualizado_por` — ningún
dato de contacto ni de salud, y `pantallaUsuarios.ts` no ofrece ninguna vista a `teacher`/`student`,
ni siquiera de solo lectura (a diferencia de `pantallaCentros.ts`/`pantallaHistorico.ts`, donde
`teacher` sí ve una versión reducida): decisión razonada en `DECISIONES_TECNICAS.md` y coherente con
que §0.2 dice que `teacher` "no gestiona fichas ni ve datos de contacto ni personas de referencia".
`listarUsuarios`/`actualizarUsuario` (`src/datos/usuarios.ts`) consultan `perfil` directamente, sin
RPC —correcto: el `UPDATE` de `administrator` ya estaba concedido y aislado por RLS desde el
bootstrap, y no hace falta una capa nueva solo para colar la comprobación del requisito 4, que ya
resuelve el trigger sobre la MISMA vía de escritura (protege también un `UPDATE` directo, cosa que
una RPC nueva no habría hecho)—, y ni siquiera `teacher`/`student` verían datos ajenos si
manipularan el cliente para forzar la llamada: `perfil_leer_propio` los limita a su propia fila.

**Punto de control: privacidad del panel — el requisito que exige `service_role` sigue siendo
procedimiento manual, no una pantalla.** `DEVELOPERS.md` documenta las tres operaciones de T-24 que
sí exigirían la clave de administración de Supabase (alta de usuario, forzar contraseña, revocar
sesión) como procedimiento manual del dueño desde el panel, nunca automatizadas desde el cliente —
consistente con §0.2 ("esa clave nunca entra en el navegador") y con el mismo criterio ya aplicado al
desbloqueo de cuenta de T-09/P-01.

**Calidad real de los tests de T-24 — sustancial, no cosmética.** El test de `pantallaUsuarios.ts`
que comprueba el botón "Desactivar" del único `administrator` activo no se conforma con leer el
atributo `disabled`: fuerza un `.click()` sobre el botón deshabilitado y comprueba que la llamada al
servidor nunca se dispara (`assert.equal(llamadas, 0, 'un botón deshabilitado no dispara su evento
click, ni en jsdom ni en un navegador real')`), y otro test equivalente fuerza el evento `change`
del `<select>` de rol saltándose el atributo para comprobar la segunda barrera dentro del propio
manejador. `DECISIONES_TECNICAS.md` documenta con honestidad por qué el botón NO lleva esa segunda
barrera (un elemento `disabled` nunca dispara su evento, así que la comprobación quedaría muerta e
intestable — se retiró tras encontrarlo con un test real) mientras que el `<select>` sí la conserva
(un evento `change` sí puede llegar por una vía que `disabled` no bloquea con la misma garantía): es
exactamente el tipo de diferencia de tratamiento entre dos controles similares que merece quedar
razonada por escrito, y lo está.

**Cierre de los hallazgos #5, #6 y #7 — verificado en código, no por confianza en lo que dice
`SEGUIMIENTO.md`.** Los tres se marcan `RESUELTO` en el registro de arriba con evidencia directa:
`db/MODELO.md:371-372` ya no dice "falta únicamente el punto de montaje" (P-13); las dos menciones
narrativas de `SEGUIMIENTO.md` y la de `DECISIONES_TECNICAS.md:147` ya usan #12/#13 en el mismo
sentido que la tabla de §6 (P-14); y `columnasVisiblesFichaAlumno` ya no existe en
`src/dominio/permisosUi.ts` — `grep -rn` sobre `src/` no devuelve ningún resultado (P-15, eliminada
en vez de conectada, con razonamiento explícito de por qué conectarla habría sido construir fuera
del alcance permanente de §0.2). Ningún hallazgo `ABIERTO` queda en el registro tras esta pasada.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo.** La renumeración del noveno ciclo de
PM (`8f6064e`) es prospectiva sobre specs todavía sin implementar (R-01/R-02/R-03/R-06/R-12), no una
desviación de una tarea ya ejecutada, y así queda clasificada correctamente — no genera fila en §7 de
`SEGUIMIENTO.md`, reservado para renumeraciones reales durante la implementación (como sí les pasó a
T-18/T-20). El diff completo de `DECISIONES_TECNICAS.md` desde la pasada anterior (catorce filas
nuevas, T-24/P-05/P-06/P-07(a)/P-15) se contrastó contra el SQL/código real y coincide en todos los
casos, incluida la razón de por qué T-24 necesitó migración pese a declarar "Migración: No" en su
spec —mismo criterio ya aplicado antes por T-09/T-20/T-23, no una excepción nueva—. `SEGUIMIENTO.md`
§7 no registra ninguna desviación nueva de este lote más allá de la ya conocida renumeración de
ficheros de migración prospectivos, que corresponde a §1, no a §7.

**Conclusión.** Lote pequeño y disciplinado: una tarea nueva con su pieza más sensible —el
invariante que impide dejar el sistema sin ningún `administrator`— implementada donde debe (un
trigger en la base de datos, no una comprobación de cliente), razonada por escrito con el mismo rigor
que el resto del proyecto, y correctamente retenida como código listo hasta que el dueño aplique su
migración. El hueco de cobertura que señalaba el propio proyecto (P-06, el barrido de RLS nunca
ejercitaba `anon`) ya está cerrado en SQL, a la espera de su primera ejecución real. Los tres
hallazgos de higiene que quedaban abiertos desde hace dos pasadas (#5, #6, #7) se cierran los tres en
esta, con evidencia directa de código — el registro de hallazgos queda sin ningún `ABIERTO` por
primera vez desde que existe este documento. La próxima auditoría con sustancia real de seguridad
llega en cuanto el dueño aplique `009` y se ejecute `npm run probar-rls` (secciones 8e y 8f, con sus
casos ya escritos y revisados en SQL estático), momento en el que T-24 dejará de ser "código listo"
para pasar a ser "control de acceso de usuarios y roles verificado en ejecución real" — o con T-25
(propagación a producción), la primera vez que cualquier decisión de este documento se somete a un
entorno real fuera de `dev`.

### Auditoría 2026-09-02

**Alcance real de esta pasada — el segundo lote más grande auditado hasta hoy: 10 commits, T-18
cerrada de verdad (aplicada y verificada en ejecución) y T-19, T-22, T-23 completas; T-20 y T-21
con código y tests completos pero correctamente `BLOQUEADA` a la espera de que el dueño aplique
`007`/`008`.** `git log d89c479..HEAD` (`d89c479` es el commit de la auditoría anterior) muestra
diez commits nuevos: el arreglo de `aplicar_limite_tasa` (migración `006`), **P-11** (finales de
línea clavados al hash del ledger), **P-12/P-10** (la batería de RLS no podía consumir la fila
devuelta por `registrar_asistencia`, y aprobaba rechazos sin mirar el motivo), **T-18 COMPLETADA**
(`probar-rls` en verde, 67/0/0), **T-19** (pasar lista), **T-20** (alumno extra, RPC
`buscar_alumnos_activos`), **T-21** (revisar/modificar registros, RPC `actualizar_asistencia`),
**T-22** (mi horario del profesor), **T-23** (histórico y exportación CSV), y el octavo ciclo de
PM (hallazgos #5/#6/#7 pasados a backlog como P-13/P-14/P-15). Es la primera vez que el proyecto
tiene producto real de punta a punta también para `teacher`, no solo para `administrator`: pasar
lista, mi horario, revisión de registros e histórico ya tienen pantalla montada y enrutada.

**Metodología.** `git checkout develop && git pull` limpio, sin nada por delante ni por detrás.
Verificación directa en vivo de los cuatro comandos de §0.1 — `npm ci` (130 paquetes, 0
vulnerabilidades), `npm run typecheck`, `npm run lint`, `npm run build`, los cuatro en verde — y
`npm test`: **891 tests, 891 pass, 0 fail** (antes 599, +292 desde la pasada anterior, coherente
con el volumen de T-18 a T-23). Confirmados contra la API de GitHub Actions los 48 runs de CI en
`develop`, **todos `completed`/`success`**, incluido el del commit actual (`95f5b0d`). `git status`
limpio antes y después. Barrido de secretos sobre `dist/` recién construido (`grep -rniE` de
`service_role`/`SUPABASE_ACCESS_TOKEN`/JWT/contraseñas en claro): cero coincidencias reales; ningún
`.env*`/`config.js` trackeado. `git log d89c479..HEAD -- roadmap/HOJA_DE_RUTA.md` vacío: sin
ninguna edición del dueño en esta pasada. `package.json` sigue con `dependencies` vacío y el mismo
`devDependencies` de siempre — sin framework, sin SDK de Supabase.

Dado el volumen, se delegó la verificación en dos subagentes de solo lectura en paralelo, cada uno
con instrucción explícita de citar fichero y línea y no fabricar hallazgos: uno para las dos RPC
nuevas más sensibles (`buscar_alumnos_activos` de T-20, `actualizar_asistencia` de T-21 — la
primera vía real de EDICIÓN de un registro de asistencia ya existente) y las secciones nuevas de
`db/pruebas_rls.sql` que las ejercitan; otro para la superficie de exposición de avatar y datos
personales en las cinco pantallas nuevas de `teacher` (pasar lista, buscador de alumno extra, mi
horario, registros por slot, histórico con exportación CSV). El propio auditor leyó directamente
`db/APLICADAS.md`, `roadmap/SEGUIMIENTO.md` (§1, §3, §5, §6, §7 completas), el diff íntegro de
`roadmap/DECISIONES_TECNICAS.md` contra la pasada anterior, `herramientas/migraciones/
pruebasRlsEstatico.test.ts` completo, y la sección 8d de `db/pruebas_rls.sql` (aislamiento de
lectura de `asistencia` entre profesores) — sin depender por completo de los subagentes en las
piezas de mayor riesgo, y contrastó sus informes contra el código antes de darlos por buenos.

**Punto de control: escritura solo por RPC, ahora con EDICIÓN real — sin hallazgo, el más
importante de esta pasada.** `actualizar_asistencia` (`db/008_rpc_actualizar_asistencia.sql`) es la
primera vía de modificación de un registro ya existente, y reproduce exactamente el patrón de
seguridad de `registrar_asistencia`: `SECURITY DEFINER` (línea 92), `revoke all ... from public` +
`grant execute ... to authenticated` (líneas 225-226), comprobación de rol que rechaza `student`
ANTES de tocar ninguna fila (líneas 116-130), y ningún parámetro para `registrado_en`,
`profesor_id` ni `peticion_id` — no están en la firma de la función ni en el `SET` del `UPDATE`
(confirmado por el subagente con cita de línea y por el propio `rpcActualizarAsistencia.test.ts`).
El trigger `AFTER UPDATE` de `asistencia_historial` (`001_esquema_inicial.sql`) sigue aplicándose
sin ningún `disable trigger` ni `session_replication_role` de por medio, verificado también en
`db/pruebas_rls.sql:1337-1361` (dos ediciones reales producen dos filas de historial con los
valores previos correctos).

**Punto de control: pertenencia en la edición e inmutabilidad — sin hallazgo, ya no es solo
preparación de cliente, es SQL real.** `administrator` edita cualquier registro sin restricción
(`null` en la comprobación de propiedad, línea 117); `teacher` solo lo suyo
(`v_actual.profesor_id = auth.uid()`, líneas 118-122) y solo dentro de la ventana de 7 días,
contada desde `registrado_en` — nunca desde `ocurrido_en`, decisión documentada explícitamente en
`DECISIONES_TECNICAS.md` para no permitir editar indefinidamente un registro retroactivo antiguo.
`db/pruebas_rls.sql` sección 8c prueba los dos lados: `teacher2` rechazado sobre un registro ajeno
(líneas 1363-1375), fuera de ventana rechazado para `teacher` (líneas 1514-1536, con un `INSERT`
directo fuera de rol de aplicación para fabricar un registro "de hace 10 días" — el único de todo
el fichero, documentado como atajo de arnés de pruebas y no un camino real de la aplicación) y
`administrator` sin límite de ventana ni de propiedad (líneas 1377-1391, 1538-1550). `actualizado_en`/
`actualizado_por` los sigue fijando el propio trigger `BEFORE UPDATE`, no la RPC — la función lo
documenta así en su propio comentario.

**Punto de control: rol `student` cerrado, RLS completa, aislamiento entre profesores — sin
hallazgo, con una superficie nueva verificada: aislamiento de LECTURA directa de `asistencia`.**
La sección 8d nueva de `db/pruebas_rls.sql` (leída completa por este auditor, líneas 1568-1601)
no se limita a comprobar que `teacher2` no puede LLAMAR a `actualizar_asistencia` sobre un registro
ajeno (eso ya lo cubre 8c, y es el rechazo de la RPC): comprueba la política `SELECT`
(`asistencia_teacher_leer_propias`) en sí misma, con una consulta DIRECTA a la tabla — ni por `id`
(la fila no existe para `teacher2` según su RLS) ni filtrando explícitamente por el `profesor_id`
del otro profesor (para descartar que "no aparezca por casualidad" al no filtrar). Son dos
superficies de ataque distintas y las dos están cerradas.

**Punto de control: avatar solo donde toca — sin hallazgo, primera vez con consumidor real.** La
card de `pasar lista` (T-19) pinta el avatar con `obtenerUrlsAvataresMini` → URL firmada de 600
segundos de validez (nunca persistida), acotada a los alumnos de los slots del propio profesor
(`.eq('profesor_id', profesorId)`); el buscador de "alumno extra" (T-20) nunca lo muestra — ni el
tipo `ResultadoBusquedaAlumno` lo tiene, ni la RPC `buscar_alumnos_activos` lo devuelve (su propio
comentario de cabecera dice explícitamente "nunca `avatar_ruta`", verificado contra el `select` real
de la función, líneas 81-85 de `db/007_rpc_buscar_alumnos.sql`).

**Punto de control: superficie de columnas del teacher — sin hallazgo, protegida por `GRANT` real,
no solo por el cliente.** Ninguna de las funciones que las cinco pantallas nuevas de `teacher`
pueden disparar consulta la tabla base `alumno` pidiendo `email_alumno`/`telefono_alumno`: el
`GRANT` de columna de `003_politicas_rls.sql:107-109` sigue sin incluirlas para `authenticated`, y
la única función que sí las lee (`resolverContactoAlumnos`, nueva de T-23) lo hace contra
`alumno_ficha` — la vista que filtra con `es_administrator()` —, nunca contra la tabla base.

**Punto de control nuevo de esta pasada: exportación CSV con datos de contacto (T-23) — sin
hallazgo, doble barrera.** `puedeExportarConDatosDeContacto` es estrictamente `administrator`
(`permisosUi.ts:88-90`); en el cliente, la llamada a `resolverContactoAlumnos` exige el permiso Y
la casilla marcada explícitamente (ambos `false` por defecto), y para `teacher` la propia
dependencia ni siquiera se inyecta al montar la aplicación (`aplicacion.ts`, con comentario
explícito). Y si un `teacher` manipulara el cliente para forzar la llamada de todas formas, el
`GRANT`/vista del punto de control anterior seguiría devolviendo cero filas: no depende solo del
cliente, que es manipulable por definición.

**Punto de control: datos de personas de referencia y alcance de datos personales — sin hallazgo.**
Ninguna de las cinco pantallas nuevas (T-19 a T-23) toca `persona_referencia` en ningún punto —
sigue exclusiva de `administrator`. Los tipos nuevos (`Asistencia`/`AsistenciaHistorial`,
`tipos.ts:107-149`) solo añaden metadatos de asistencia (ids, timestamps, `origen`, `estado`,
`motivo_anulacion`, `nota` libre, `peticion_id`) — ningún campo de salud, bancario ni de categoría
especial del artículo 9, y `nota`/`motivo_anulacion` ya eran texto libre desde el diseño de T-18/T-21,
no una novedad de esta pasada.

**Calidad real de los tests de las dos RPC nuevas — documentada con honestidad, sin sobreventa.**
`herramientas/migraciones/rpcActualizarAsistencia.test.ts` y `rpcBuscarAlumnos.test.ts` son
puramente estáticos (analizan el texto del `.sql`, no ejecutan nada contra una base de datos real)
y lo dicen en su propia cabecera: no sustituyen al barrido en vivo que hará el dueño con
`npm run migrate` + `npm run probar-rls`, solo atrapan en el momento de escribir el SQL la misma
clase de descuido que ya causó el incidente de `000b_arreglo_permisos.sql`. `SEGUIMIENTO.md` refleja
el mismo estado sin adornarlo: T-20/T-21 figuran `BLOQUEADA — pendiente aplicar migración`, filas 9
y 10 de §3 `PENDIENTE`. Aparte, `herramientas/migraciones/pruebasRlsEstatico.test.ts` (nuevo, leído
completo por este auditor) es sustancial: impide que reaparezca el patrón perezoso
`'prohibido', true, sqlerrm` (la causa exacta de P-10) en cualquiera de los `pg_temp.registrar_prohibido`
del fichero, exige que la fila devuelta por `registrar_asistencia`/`actualizar_asistencia` se expanda
con `select * into ... from f(...)` (la causa exacta de P-12) y comprueba que los delimitadores `$$`
de plpgsql siguen emparejados — las tres formas concretas en que la batería ya se rompió una vez,
convertidas en guarda automática. Confirmado con `grep` sobre las secciones 8b/8c/8d que ningún caso
"debe fallar" usa el patrón perezoso: todos pasan por `registrar_prohibido` con su array de patrones
concretos.

**Coherencia entre lo decidido y lo ejecutado — sin hallazgo de fondo.** El diff completo de
`roadmap/DECISIONES_TECNICAS.md` contra la pasada anterior (54 filas nuevas) se contrastó contra el
SQL/código real en los puntos de mayor riesgo (patrón `SET` cualificado del upsert de límite de
tasa, tri-estado de la nota en `actualizar_asistencia`, ventana contada desde `registrado_en`,
resolución en lote de nombres sin embed anidado de PostgREST) y coincide en todos los casos.
`roadmap/SEGUIMIENTO.md` §7 registra correctamente las desviaciones reales del lote (T-20
necesitando migración pese a `Migración: No` en su spec original, la renumeración `007`/`008`, T-23
ejecutada pese a declarar dependencia de producto — no técnica — con la `BLOQUEADA` T-21, criterio
verificado por el auditor: T-23 solo necesita `SELECT`, ya concedido desde T-10, y ninguna de sus
consultas depende de la migración `008`). El octavo ciclo de PM (`95f5b0d`) hizo además una
comprobación cruzada real, no cosmética: al revisar T-19 contra R-01 (marcar ausente con "el mismo
toque de la card"), detectó que la card de T-19 ya es un `<button>` cuyo único toque registra la
entrada — sin gesto libre para una segunda acción — y dejó la precisión exacta en la spec de R-01
(`ROADMAP_PRODUCTO.md`) para que la sesión que la implemente no choque con ese diseño a mitad de
camino. Es exactamente el tipo de desajuste entre decisiones tomadas en momentos distintos que este
documento pide vigilar, y lo encontró el propio proceso del proyecto, no este auditor.

**Reevaluación de los hallazgos abiertos (#5, #6, #7) — sin cambio, correctamente en backlog.**
Los tres siguen presentes en el código, byte a byte igual que en la pasada anterior:
`db/MODELO.md:346` sigue diciendo "falta únicamente el punto de montaje real en una pantalla
(T-16)" pese a que T-16 está completa desde hace días; la narrativa de `SEGUIMIENTO.md` (líneas 432
y 438) sigue intercambiando los números #12/#13 frente a la tabla de §6, que es la correcta, y
`DECISIONES_TECNICAS.md:147` repite el mismo intercambio; `columnasVisiblesFichaAlumno`
(`permisosUi.ts:97`) sigue sin ningún consumidor real fuera de su propio test (`grep -rn` solo
devuelve su definición y `permisosUi.test.ts`). Ninguna sesión de programador los ha tocado
todavía — correcto, no se marcan `RESUELTO` por confianza en que el octavo ciclo de PM los
convirtiera en **P-13/P-14/P-15**: esa conversión es trazabilidad de backlog, no una corrección de
código, y las tres entradas de §5 de `SEGUIMIENTO.md` siguen `PENDIENTE` sin urgencia, consistente
con lo que el código muestra.

**Conclusión.** Segundo lote más grande auditado hasta hoy, y el primero con producto real también
para `teacher` (no solo `administrator`): sale limpio de fondo. La pieza de mayor riesgo posible —
la primera RPC que EDITA un registro de asistencia ya existente — reproduce con fidelidad el patrón
de seguridad ya validado de `registrar_asistencia`, con su pertenencia, su ventana y su
inmutabilidad probadas en SQL estático y en la batería en vivo (código listo, sin desplegar
todavía: `007`/`008` siguen `PENDIENTE` de que el dueño las aplique, filas 9-10 de §3). El avatar de
menores sigue exactamente donde debe estar y en ningún sitio más, con su primera pantalla de
consumo real (pasar lista) verificada punto por punto; la superficie de contacto del `teacher` sigue
cerrada por un `GRANT` de base de datos, no por disciplina de interfaz, incluso frente al riesgo
nuevo de la exportación CSV. Los tres hallazgos de higiene que quedaban abiertos (#5, #6, #7) siguen
sin corregir pero correctamente trazados como backlog sin urgencia — ninguno ha escalado ni se ha
duplicado. La próxima auditoría con sustancia real de seguridad llega en cuanto el dueño aplique
`007`/`008` y se ejecute `npm run probar-rls` (secciones 8b/8c/8d, con sus casos ya escritos y
revisados en SQL estático), momento en el que T-20/T-21 dejarán de ser "código listo" para pasar a
ser "vía de escritura y edición real" — o con T-24 (administración de usuarios y roles), la primera
tarea que toca directamente la gestión de altas y roles de la aplicación.

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
