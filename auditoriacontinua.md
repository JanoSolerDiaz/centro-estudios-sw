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
| #1 | 2026-08-26 | Gobernanza documental | baja | ABIERTO | `HOJA_DE_RUTA.md` se declara en su cabecera "DOCUMENTO INMUTABLE" ("Este archivo NO se modifica nunca") pero fue editado 41 minutos después de crearse — commit `4c05189`, mismo día 2026-08-25, autoría del propio dueño —, cambiando tanto el protocolo de §0.1 (que el propio documento sí permite cambiar al dueño) como el cuerpo de la tarea T-07 (que el documento declara inmutable sin excepción explícita para nadie, ni siquiera el dueño). No hay riesgo de dato ni de seguridad: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento como referencia. Es un aviso de higiene documental para que la excepción del dueño quede escrita si se pretende que exista, no una alerta operativa. | `roadmap/HOJA_DE_RUTA.md`, commit `4c05189` |

---

## NARRATIVA POR AUDITORÍA

> Cada pasada: fecha, hallazgos y conclusiones. Append, la más reciente arriba. Prestar
> atención especial a la coherencia entre lo decidido (`DECISIONES_TECNICAS.md` y §0.2 de la
> hoja de ruta) y lo realmente implementado, y a las desviaciones (§7 de SEGUIMIENTO).

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
