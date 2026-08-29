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
| #2 | 2026-08-29 | Autorización (RLS) / calidad de la batería de pruebas | alta | ABIERTO | `db/pruebas_rls.sql` (T-10, requisito 5 de su spec: "batería de aislamiento ejecutable") no contiene ni una sola sentencia `UPDATE`, `DELETE` ni `TRUNCATE` en sus 552 líneas — confirmado por `grep -i` sobre el fichero completo, cero coincidencias: solo ejercita `INSERT` y `SELECT`. Consecuencia concreta: ninguna política `UPDATE` (`slot_horario_admin_actualizar`, `centro_estudios_admin_actualizar`, `alumno_admin_actualizar`) tiene un caso que la ejercite, ni en su rama "debe fallar" (teacher) ni en la "debe funcionar" (administrator); y `persona_referencia_admin_todo` — la única política `for all` del esquema, y la que gobierna la única tabla con `DELETE` real — solo se prueba en su rama `INSERT`: nadie ha comprobado, ni en SQL estático ni en ejecución real, que bloquee un `UPDATE`/`DELETE` de un `teacher` ni que los permita a `administrator`. Tampoco se intenta nunca un `TRUNCATE` por `authenticated`, pese a ser el privilegio que el propio proyecto señala como el más peligroso (ya causó el incidente de `000b_arreglo_permisos.sql`). Lectura directa de `003_politicas_rls.sql` confirma que las políticas están escritas de forma correcta y simétrica (idéntica condición booleana en `USING` y `WITH CHECK`, válida por diseño para las cuatro operaciones a la vez), así que no hay indicio de vulnerabilidad activa hoy — pero la propia batería que debía demostrarlo, no lo demuestra, y hoy tampoco puede ejecutarse contra `dev` en ningún caso (sin `teacher` de prueba, con `002`/`003` todavía sin aplicar). Dado que este proyecto exige explícitamente no conformarse con "está verde" cuando la cobertura de la lógica crítica es superficial, se registra como severidad alta: debe cerrarse — añadiendo los casos que faltan de `UPDATE`/`DELETE` por tabla y un intento de `TRUNCATE` por `authenticated` — antes de dar T-10 por verificada en ejecución, no solo en SQL estático. | `db/pruebas_rls.sql`; políticas afectadas en `db/003_politicas_rls.sql` (`persona_referencia_admin_todo`, `slot_horario_admin_actualizar`, `centro_estudios_admin_actualizar`, `alumno_admin_actualizar`); origen: auditoría #2 |
| #3 | 2026-08-29 | Minimización de datos | baja | ABIERTO | `src/datos/alumnos.ts`: el `select` de `listarAlumnos` (constante `SELECT_CON_CENTRO`) incluye `avatar_ruta` en el payload de red del listado de administrator, aunque `pantallaFichaAlumno.ts` no lo pinta en ninguna fila de esa lista hoy. No es una fuga real — el único consumidor de esa función es la pantalla de `administrator`, que ya tiene acceso legítimo a esa columna, y RLS reduce a cero filas la misma consulta para cualquier otro rol — pero es superficie de más que conviene recortar cuando T-14/T-19 le den un uso real al avatar, para no arrastrar el hábito a un listado que algún día podría compartirse con `teacher`. | `src/datos/alumnos.ts` (`SELECT_CON_CENTRO`, `listarAlumnos`); origen: auditoría #2 |
| #4 | 2026-08-29 | Gobernanza documental | baja | ABIERTO | `db/MODELO.md` línea 194 sigue diciendo, en la sección de `evento_error`, que su lectura tiene "política todavía por escribir (T-10)" — nota que no se actualizó cuando T-10 escribió de verdad `evento_error_admin_leer` en `003_politicas_rls.sql`. El resto del propio documento (línea 221 en adelante, "Políticas RLS por rol") y la matriz de `DECISIONES_TECNICAS.md` sí están al día y son correctos; es una única frase residual, sin ningún impacto funcional ni de seguridad. | `db/MODELO.md:194`; origen: auditoría #2 |

---

## NARRATIVA POR AUDITORÍA

> Cada pasada: fecha, hallazgos y conclusiones. Append, la más reciente arriba. Prestar
> atención especial a la coherencia entre lo decidido (`DECISIONES_TECNICAS.md` y §0.2 de la
> hoja de ruta) y lo realmente implementado, y a las desviaciones (§7 de SEGUIMIENTO).

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
