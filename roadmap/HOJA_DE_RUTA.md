# HOJA DE RUTA — GestorAcademia — Desarrollo automatizado con Claude Code

> DOCUMENTO INMUTABLE. Este archivo NO se modifica nunca. Es la referencia original para
> trazabilidad. El cuerpo (tareas T-XX) es inmutable y el protocolo solo lo cambia el dueño.
> Todo progreso, decisión, hallazgo, desviación o tarea nueva se registra en los documentos
> vivos de `roadmap/` (ver §0.4).
>
> Versión: 1.0 — 2026-08-25
> Proyecto: GestorAcademia — `<pendiente>` (URL de producción)
> Repo: `<pendiente>`
> Modo de operación: AUTONOMÍA TOTAL (ver §0.1).

---

## 0. PROTOCOLO DE EJECUCIÓN (leer en cada sesión)

1. Lee este documento y `roadmap/SEGUIMIENTO.md` (el hub). El estado y el orden de "siguiente tarea" son los de §1 de SEGUIMIENTO (fuente autoritativa).
2. **Antes de elegir tarea**, revisa el registro de hallazgos de `auditoriacontinua.md`: si hay algún hallazgo ABIERTO de severidad alta (seguridad, bug en producción, rotura de UX), atiéndelo como P-XX urgente (§0.3) antes de la cola.
3. Identifica la siguiente tarea pendiente y consulta su especificación **donde vive**: si es T-XX, en el cuerpo de este documento; si es R-XX, en `roadmap/ROADMAP_PRODUCTO.md`.
4. Ejecuta las tareas EN ORDEN. No saltes a una posterior si la anterior no está COMPLETADA o BLOQUEADA en §1.
5. Si una tarea está BLOQUEADA, pasa a la siguiente y deja constancia (motivo + acción exacta que necesita el dueño) en §3 de SEGUIMIENTO.
6. Al terminar, actualiza los registros como indica §0.4 y commitea junto con el código.
7. NUNCA modifiques este archivo (`HOJA_DE_RUTA.md`).

### 0.1 Modo de operación

**MODO ACTUAL: AUTONOMÍA TOTAL.**

**AUTONOMÍA TOTAL** (vigente antes de clientes reales — prima la agilidad):

- **Ramas: el agente vive en `develop`.** Trabaja directamente en `develop` y haz push ahí. El push a `develop` despliega el frontend compilado al hosting estático (proveedor concreto `<pendiente>`). Es intencionado y está permitido.
  - **`master` es del dueño.** El agente **nunca** hace push, merge ni rebase sobre `master`, ni abre un pull request hacia ella por iniciativa propia. `master` recibe merge solo cuando el dueño lo decide, que en la práctica será en T-25 (paso a producción). Si en algún momento te encuentras en `master`, vuelve a `develop` antes de tocar nada.

- **Base de datos: solo se usa `dev` hasta que el desarrollo esté terminado.** Decisión del dueño (2026-08-25). La persistencia es PostgreSQL en **Supabase**, con dos proyectos:
  - **`dev`** — existe. Sus credenciales están en `.env.local`, **en la máquina del dueño y en ningún otro sitio**.
  - **`prod`** — todavía no existe y no se toca. Se crea en T-25.

- **El agente NUNCA aplica DDL, en ningún entorno.** Decisión del dueño (2026-08-25), y el razonamiento importa para que no se relaje por comodidad: el token de la Management API **no está limitado a un proyecto** —permite DDL sobre cualquier proyecto de la cuenta, incluido crearlos y borrarlos—, Supabase no ofrece una credencial restringida que reduzca ese alcance, y un agente desatendido no es el sitio para algo así. El coste de la alternativa es pequeño y medible: **en todo el MVP hay cinco o seis migraciones**. La regla que ya regía para `prod` se aplica igual a `dev`, de forma uniforme.

- **Procedimiento de toda migración:**
  1. **El agente** escribe el script en `db/NNN_<nombre>.sql`, lo **commitea y lo empuja a `develop`**. Se aplicará exactamente ese fichero, sin variaciones sobre la marcha.
  2. **El agente** abre una fila en §3 de SEGUIMIENTO con el número de migración, el fichero, y qué debe ver el dueño al terminar. Marca la tarea `BLOQUEADA — pendiente aplicar migración NNN` y **pasa a la siguiente tarea que no dependa de ella**. El bloqueo no detiene el desarrollo: el código que consumirá ese esquema se escribe y se testea contra los dobles, y queda latente.
  3. **El dueño** hace `git pull` y ejecuta **`npm run migrate` en local**, donde vive `.env.local`. No se pega SQL a mano en el editor de Supabase: el runner es lo que aporta las guardas de contenido, la inmutabilidad por hash y el registro en `esquema_migracion`, y todo eso se pierde copiando y pegando.
  4. **El dueño** confirma en §3. A partir de ahí el agente puede verificar con `esquema_version()`, anotar la fila en `db/APLICADAS.md` y desbloquear.
  5. Una migración aplicada es **inmutable**: los arreglos van en una migración nueva, nunca editando la anterior. El runner lo impone rechazando un script cuyo hash haya cambiado.
  6. Nunca declares una migración aplicada sin haberlo comprobado. Si no tienes forma de comprobarlo, dilo y déjala pendiente.
  7. La columna `prod` de `db/APLICADAS.md` es la lista de propagación a producción, que se hace de una vez en T-25. Eso **no** genera filas en §3 por cada migración.

- **Credenciales que el agente puede y no puede tener.** No todas valen lo mismo y la diferencia es la que sostiene la regla anterior:
  - **Nunca**, en ningún entorno de agente: el **access token de la Management API**, la contraseña de la base de datos y la clave **`service_role`**. Viven solo en `.env.local` del dueño.
  - **Aceptable si en algún momento hace falta** (por ejemplo para el health check post-deploy): la **URL del proyecto** y la **clave anónima**, que son públicas por diseño —viajan en el paquete del navegador— y que sin políticas para `anon` no dan acceso a nada. Si se le dan, se le dan **solo esas dos**.

- Único requisito antes de cada push: la verificación local completa debe pasar:
  ```
  npm run typecheck   # tsc --noEmit (strict)
  npm run lint        # eslint . --max-warnings 0
  npm test            # node --test  (node:test nativo)
  npm run build       # tsc -b  (TS -> JS ES2022, ES modules, sin bundler)
  ```
  Es la red que sustituye a la revisión humana. Si algo falla, NO hagas push: arregla o revierte.

- Verificación post-deploy: tras cada push, ejecuta `npm run health -- <url>`. Debe comprobar (a) que el documento de entrada y el JS compilado responden `200`, y (b) que la RPC `esquema_version()` responde y devuelve la versión esperada. Si falla, revierte el commit y haz push del revert inmediatamente. Registra el incidente en §4 de SEGUIMIENTO.

- Decisiones autónomas: tómalas sin esperar aprobación, pero REGISTRA cada una en `roadmap/DECISIONES_TECNICAS.md`. El dueño no revisa el código: revisa ese registro.

> MODO PRODUCCIÓN (futuro, NO vigente): cuando el dueño lo indique (criterio de conmutación: **el primer centro real pasando lista con datos de alumnos reales**), el protocolo cambia a ramas + Pull Request + merge manual por el dueño. La regla de que `prod` no admite DDL automático rige desde el día 1 y no cambia nunca.

### 0.2 Reglas arquitectónicas innegociables (aplican en cualquier modo)

> Aquí viven las decisiones que son **norma permanente**, no solo historia. Cuando una decisión técnica deba regir para siempre ("usamos X, no reintroducir Y"), se promueve aquí desde `DECISIONES_TECNICAS.md`, porque esta sección se lee en cada sesión.

#### Roles

Tres roles desde el inicio. **Los identificadores en base de datos y en código son en inglés; las etiquetas de interfaz, en español.** No mezclar: nunca comparar contra la etiqueta traducida.

| Identificador | Etiqueta en UI | Qué puede hacer |
|---------------|----------------|-----------------|
| `administrator` | Administrador | Todo: gestiona el catálogo de centros de estudios, las fichas de alumno (incluidas sus personas de referencia y su avatar), los horarios y los usuarios. Accede a **todos** los registros de asistencia y puede modificar cualquiera, eligiendo slot y profesor. |
| `teacher` | Profesor | Pasa lista, ve su horario y sus alumnos por slot, añade alumnos extra, y **consulta y modifica únicamente SUS propios registros**. **No** gestiona fichas de alumno, ni personas de referencia, ni centros. |
| `student` | Alumno | **Ningún acceso a esta funcionalidad en el MVP.** El rol existe en el modelo desde el día 1 para no migrarlo después. Su única política en todo el sistema es leer **su propia fila de `perfil`** —son sus datos, y la aplicación necesita su nombre y su rol para decirle que todavía no tiene acceso—; ninguna otra tabla, ningún bucket. Si inicia sesión, ve esa pantalla y nada más. **Es también el rol por defecto de todo usuario nuevo**, para que el fallo por omisión sea cerrado. Qué podrá hacer en el futuro es decisión de producto, no del agente. |

#### Invariantes de datos

Se garantizan **en PostgreSQL, no en JavaScript** (el cliente es código que el usuario controla; la base de datos no):

- **Los registros de asistencia son editables.** Es un centro privado y quien se equivoca debe poder arreglarlo: la fila de `asistencia` se **actualiza** (`UPDATE`), sin cadenas de corrección ni resolución de estado efectivo. Decisión expresa del dueño el 2026-08-25, que sustituye al planteamiento append-only de los requisitos iniciales.
- **Pero no se borran.** No existe `DELETE` sobre `asistencia` en ninguna política ni en ninguna ruta, para ningún rol. Anular un registro es marcarlo `estado = 'anulada'` con su motivo; la fila permanece.
- **`registrado_en` es inmutable.** Es el instante en que la fila se creó, lo fija el servidor, y **ningún `UPDATE` puede modificarlo**: lo garantiza un trigger. Lo que se edita al ajustar una hora es `ocurrido_en`, el momento atribuido a la asistencia. En un registro tomado en vivo ambos coinciden; en uno añadido a posteriori no, y por eso `es_retroactivo` queda marcado. Un histórico que no distingue lo marcado en vivo de lo rellenado después no vale como registro de nada.
- **Toda escritura de asistencia pasa por una RPC `SECURITY DEFINER`**: el alta por `registrar_asistencia`, la modificación por `actualizar_asistencia`. Las RPC fijan ellas mismas `registrado_en`, `actualizado_en`, `profesor_id` y `actualizado_por` a partir de `now()` y `auth.uid()`. El cliente **no puede** enviar esos campos: si los envía, se ignoran. `INSERT` y `UPDATE` directos sobre la tabla están revocados.
- **Rastro de cambios.** Un trigger `AFTER UPDATE` escribe la fila anterior en `asistencia_historial` (quién, cuándo, valores previos). Es invisible para la aplicación —que sigue leyendo y escribiendo una sola fila— y es lo que permite responder "quién cambió qué". `asistencia_historial` **sí** es estrictamente append-only: sin `UPDATE` ni `DELETE` para nadie, y lectura solo para `administrator`.
- La **baja de alumno es lógica** (`activo = false`); no existe `DELETE` de alumnos en ninguna política ni en ninguna ruta. Igual para `centro_estudios` y para `perfil`.
- **Excepción deliberada: `persona_referencia` sí se borra de verdad.** No es un registro con valor probatorio, son datos de contacto de un tercero —normalmente el padre, la madre o el tutor de un menor— y el RGPD favorece que se puedan eliminar cuando esa persona deja de ser referencia del alumno. Un `DELETE` real por parte de `administrator` está permitido y es lo correcto aquí. Es la única tabla de la que se borran filas.
- Los **slots de horario son editables pero versionados por vigencia** (`vigente_desde` / `vigente_hasta`) y cada asistencia guarda un **snapshot inmutable** del slot. Cambiar un horario no altera nunca el histórico pasado.
- Jamás generar código, política ni migración que viole lo anterior, ni desactivar una restricción "temporalmente".

#### Datos personales — alcance y límites

El MVP trata datos personales de **menores de edad**, y desde el 2026-08-25 ese alcance incluye una **fotografía**. Reglas permanentes:

- **Lo que se guarda, y nada más:** del alumno, nombre, primer y segundo apellido, centro de estudios de referencia, teléfono y email propios (opcionales) y una fotografía (opcional). De cada persona de referencia, nombre, primer y segundo apellido, teléfono (obligatorio) y email (opcional).
- **Sigue prohibido sin decisión expresa del dueño:** notas y datos académicos evaluables, datos de salud, datos bancarios, y cualquier categoría especial del artículo 9 del RGPD.
- **La fotografía de un menor es el dato más sensible del sistema.** Por tanto: el bucket de avatares es **privado**, jamás público; el acceso es siempre por **URL firmada de vida corta**; en la base de datos se guarda la ruta del fichero, nunca una URL; la imagen se **re-codifica en el cliente antes de subirla**, lo que además elimina los metadatos EXIF (incluida la geolocalización que traen las fotos de móvil); y el avatar es **opcional y borrable** en todo momento. Un bucket público con fotos de menores es un incidente esperando a ocurrir: si alguna vez aparece uno, es un hallazgo de severidad alta.
- El avatar exige **consentimiento informado del tutor legal**, distinto del consentimiento general de tratamiento. El texto lo aporta el dueño (T-25); hasta entonces la interfaz debe advertir de que el consentimiento es responsabilidad del centro.

#### Seguridad y esquema

- **Operaciones de esquema prohibidas al agente, en cualquier entorno:** `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE` y `DELETE` masivo sobre tablas con datos; desactivar RLS (`DISABLE ROW LEVEL SECURITY`); eliminar una política sin sustituirla en la misma migración; cualquier `DELETE` sobre `asistencia`; y cualquier `UPDATE` o `DELETE` sobre `asistencia_historial`. **El runner de migraciones debe rechazar por sí mismo un script que contenga estos patrones** (T-07): el invariante no puede depender de la buena conducta del agente.
- **La seguridad vive en RLS.** No hay backend propio: la clave anónima viaja en el cliente, por lo que **toda** autorización se implementa como Row Level Security y funciones en la base de datos — incluidas las políticas del almacenamiento de avatares. Una tabla o un bucket nuevos sin políticas explícitas es un fallo de seguridad, no un pendiente. Ocultar un botón en la interfaz no es un control de acceso.
- **RLS no basta: los privilegios de tabla también hay que declararlos.** Supabase concede privilegios por defecto a `anon`, `authenticated` y `service_role` sobre toda tabla nueva del esquema `public`. **Añadir los permisos que quieres no quita los que ya venían.** Toda tabla nueva empieza por `revoke all ... from anon, authenticated, service_role` y luego concede **solo** lo que necesita. Y ojo con lo que RLS **no** filtra: `TRUNCATE` ignora las políticas por completo, así que un `authenticated` con `TRUNCATE` es un agujero aunque todas las políticas sean perfectas. Lo mismo aplica a `REFERENCES` y `TRIGGER`, que no le hacen falta a la aplicación. Origen de esta regla: se detectó en el arranque que `authenticated` tenía `TRUNCATE` sobre `perfil` (corregido en `db/000b_arreglo_permisos.sql`).
- Aislamiento: **sin multi-tenant** (una única academia). El aislamiento es **por rol y por pertenencia**, según la tabla de roles de arriba. (Evolución futura, no bloqueante: añadir `centro_id` y extender las políticas si se pasa a varias academias. Ojo con el nombre: eso es distinto de `centro_estudios`, que es el colegio reglado al que asiste el alumno.)
- Validación de entradas: en el cliente para dar buen mensaje al usuario, y **además** en la base de datos (`CHECK`, dominios, validación dentro de las RPC), porque la validación de cliente es solo cortesía.
- Logger centralizado — nunca dejar logging de desarrollo en código de producción. El logger no emite nunca datos personales de alumnos ni de personas de referencia, ni rutas de avatar, ni tokens, ni claves: solo identificadores.
- **Secretos.** No commitear jamás claves ni ficheros de entorno.
  - La **clave anónima** es pública por diseño y es la única que puede entrar en el paquete del cliente.
  - El **access token de la Management API**, la contraseña de la base de datos y la clave `service_role` viven solo en `.env.local` (ignorado por git) y en los secretos del CI. **Nunca** en el repositorio, en el paquete del cliente, en un log, en un documento ni en un mensaje de commit. Debe existir un test que inspeccione el resultado de `npm run build` y falle si aparece cualquiera de ellos (T-07).
  - No rotar ni modificar secretos existentes sin instrucción del dueño.
- PROHIBIDO degradar seguridad por agilidad: desactivar RLS, abrir una política o un bucket a `anon` o a `student` "para probar", mover una comprobación de la base de datos al cliente, usar la clave `service_role` desde el navegador, o eliminar controles existentes.

#### Stack y forma del código

- Commits atómicos por tarea con prefijo del ID (p. ej. `T-03: <descripción>`).
- Textos de UI y mensajes en español (es-ES). Identificadores de rol en inglés (ver tabla de roles).
- **Stack fijado, no negociable por el agente:** prohibido introducir frameworks o librerías de UI/runtime (React, Vue, Angular, Svelte, jQuery, Express, Fastify…). El código de aplicación es TypeScript compilado a JavaScript estándar con manipulación de DOM nativa. El tratamiento de imágenes se hace con las APIs del navegador (`createImageBitmap`, `canvas`, `toBlob`), no con una librería.
- **Supabase se consume por su API REST, no por su SDK.** `@supabase/supabase-js` es una librería de runtime y está **vetada**. Se habla con PostgREST (`/rest/v1/...`, `/rest/v1/rpc/...`), con GoTrue (`/auth/v1/...`) y con Storage (`/storage/v1/...`) mediante `fetch` nativo, a través de un cliente propio tipado y testeado. La Management API se usa igual, con `fetch`, y **solo** desde el runner de migraciones — nunca desde código de aplicación.
- Dependencias: `dependencies` de `package.json` debe permanecer **vacío**. Se permiten `devDependencies` de herramienta (typescript, eslint, @types/*, y jsdom exclusivamente para tests de DOM). Cualquier dependencia de runtime es decisión del dueño (§0.3).
- **Sin bundler:** `tsc` como única herramienta de build; el navegador carga ES modules nativos.
- **Accesibilidad y uso real en clase:** cada pantalla nueva usa HTML semántico, es navegable por teclado, tiene foco visible y objetivos táctiles ≥ 44 px. Se pasa lista desde un móvil o tablet, de pie, en unos segundos.

### 0.3 Tareas autopropuestas (P-XX) — régimen de autonomía

Claude Code puede proponer y ejecutar mejoras de alcance nuevo sin esperar aprobación:

**Procedimiento:**
1. Asigna un ID con prefijo `P-` (P-01, P-02...). La numeración nunca se reutiliza.
2. ANTES de implementarla, regístrala en §5 de SEGUIMIENTO (descripción, motivo/origen, valor esperado, alcance). Garantiza trazabilidad aunque la sesión se corte.
3. Impleméntala con el mismo rigor que una T-XX: criterios de aceptación por escrito, tests si toca lógica de negocio, verificación pre-push completa y health check post-deploy.
4. Refleja su estado en §1 de SEGUIMIENTO.

**Priorización:**
- Las T-XX/R-XX son la columna vertebral: por defecto, las P-XX se ejecutan cuando la tarea en curso está terminada o bloqueada.
- **Excepción (urgente):** bugs en producción, fallos de seguridad o roturas de UX —propios o procedentes de un hallazgo ABIERTO de severidad alta del auditor— se atienden de inmediato, con justificación en `DECISIONES_TECNICAS.md`.
- No acumular más de 3 P-XX entre dos tareas consecutivas de la columna vertebral.

**Límites (una P-XX NUNCA puede):**
- Fijar o cambiar precios, planes o cualquier aspecto de facturación.
- Dar de alta servicios externos de pago ni contratar infraestructura, **incluido crear el proyecto de producción de Supabase o cambiar su plan**.
- **Ejecutar DDL contra el proyecto de producción de Supabase**, ni ahora ni cuando exista (§0.1).
- Ejecutar ninguna de las operaciones de esquema prohibidas de §0.2, en ningún entorno.
- **Ampliar el alcance de los datos personales recogidos** más allá de lo enumerado en §0.2, ni añadir categorías nuevas de dato del alumno o de sus personas de referencia.
- **Hacer público el bucket de avatares**, ni servir un avatar por una URL que no caduque.
- **Ampliar lo que puede hacer el rol `student`.** Que el rol exista no autoriza a darle acceso.
- Redactar o publicar textos legales como definitivos (aviso legal, política de privacidad, consentimiento de tratamiento, consentimiento específico de uso de imagen del menor): se dejan como borrador marcado y se escala al dueño.
- Eliminar funcionalidad ni ejecutar operaciones destructivas. Aquí es **especialmente** aplicable a cualquier cosa que borre o purgue registros de asistencia, su historial, o avatares.
- Enviar comunicaciones a usuarios reales (profesores, alumnos o familias).
- Rotar ni modificar secretos y credenciales existentes, ni usar la clave `service_role` desde el cliente.
- Introducir un framework, un SDK o cualquier dependencia de runtime (stack fijado, §0.2).
- Convertir la aplicación en multi-academia.
- Contradecir las reglas de §0.2 ni los requisitos de una tarea pendiente.

**Veto:** el dueño puede marcar cualquier P-XX como DESCARTADA o pedir su revert en §5. Si está marcada para revert, revertirla es lo primero de la siguiente sesión.

### 0.4 Registro repartido — qué documento se toca y cuándo

El registro está repartido en varios documentos dentro de `roadmap/` (separa lo que crecía sin control). **Un dato vive en un solo sitio**; `SEGUIMIENTO.md` es el índice.

| Documento | Contiene | Acceso del programador |
|-----------|----------|------------------------|
| `SEGUIMIENTO.md` | Hub: estado (§1), bloqueos (§3), incidentes (§4), P-XX (§5), preguntas (§6), desviaciones (§7) | Lee siempre; escribe estado y transversales |
| `ROADMAP_PRODUCTO.md` | Visión + oleadas/fases + spec de las R-XX | Lee la spec de la R-XX en curso (lo gestiona el PM) |
| `DECISIONES_TECNICAS.md` | Decisiones técnicas (append-only) | **Consulta** antes de una decisión no trivial en el área que toca; **añade** las nuevas |
| `HISTORIAL_SESIONES.md` | Bitácora de sesiones (append-only) | Añade su sesión al terminar |
| `FEEDBACK.md` | Historias de usuario (lo gestiona el PM) | — |
| `auditoriacontinua.md` (raíz) | Hallazgos del auditor | **Lee** el registro de hallazgos al empezar |
| `db/APLICADAS.md` | Qué migraciones están aplicadas en `dev` y en `prod`. **La columna `prod` vacía es la lista de propagación pendiente para T-25** | Añade la fila tras verificar con `esquema_version()` |
| `db/MODELO.md` | El modelo de datos explicado en español, legible sin saber SQL | Lo mantiene al día en cada migración |

**Al terminar cada sesión (definición de hecho):**
1. Actualiza el **estado** de la tarea en §1 de SEGUIMIENTO (y «última actualización» de la cabecera).
2. Añade las **decisiones** relevantes a `DECISIONES_TECNICAS.md` (append-only). Si alguna es norma permanente, promuévela también a §0.2.
3. Añade la **sesión** a `HISTORIAL_SESIONES.md` (append-only, la más reciente arriba), **referenciando** las filas de decisión añadidas y los cambios de estado (consistencia cruzada).
4. Si aplicaste una migración, actualiza `db/APLICADAS.md` y `db/MODELO.md`.
5. Actualiza `DEVELOPERS.md` si la tarea cambió algo que un desarrollador deba saber.
6. Si abriste una pregunta de negocio, déjala en §6; si te desviaste del plan, regístralo en §7.

---

## FASE A — VERIFICACIÓN Y BASE DE CALIDAD

> Obligatoria y primero: monta la red de seguridad que sustituye a la revisión humana. No empezar producto sin ella.

### T-00 — Verificación inicial del estado
**Prioridad:** ALTA · **Migración:** No
Inicializa el repositorio y el andamiaje mínimo del stack fijado: `package.json` con `dependencies` **vacío**, `tsconfig.json` con `strict: true`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`, los cuatro scripts npm (`typecheck`, `lint`, `test`, `build`), `index.html` que carga el módulo compilado, `.gitignore` con `.env.local` **antes de que exista ningún secreto**, `.env.ejemplo` documentando las variables sin valores, y la estructura `src/dominio/`, `src/datos/`, `src/ui/`, `db/`, `herramientas/`. Confirma que compila y construye, y marca T-00 como COMPLETADA en §1 dejando constancia del estado de partida y de la versión de Node usada.
**Criterio de aceptación:** `npm run typecheck` y `npm run build` en verde; la página abre en el navegador y ejecuta el módulo compilado; `dependencies` vacío; `.gitignore` cubre `.env.local` y `git status` no muestra ningún fichero de entorno.

### T-01 — Linting y formato
**Prioridad:** ALTA · **Migración:** No
Configurar ESLint (typescript-eslint, configuración estricta y *type-aware*) más formateo consistente, con hook de pre-commit que ejecute la verificación completa. Incluir reglas que **defiendan el stack por herramienta y no solo por documento**: prohibir imports de paquetes de terceros en `src/` (con `@supabase/supabase-js` nombrado explícitamente), prohibir `innerHTML`, prohibir `console.*` fuera del logger, y prohibir `fetch` fuera de los módulos de acceso autorizados.
**Aceptación:** `npm run lint` con 0 errores y 0 warnings; hook de pre-commit funcional; un import de prueba de `@supabase/supabase-js`, un `innerHTML` y un `fetch` fuera de sitio hacen fallar el lint.

### T-02 — Logger centralizado
**Prioridad:** MEDIA · **Migración:** No · **Depende de:** T-01
Un único módulo de logging (entradas estructuradas: nivel, instante, contexto, mensaje) usado por toda la aplicación, con nivel configurable y silenciado en tests. Sustituir todo `console.*`. El logger **nunca** debe emitir datos personales de alumnos ni de personas de referencia, ni rutas de avatar, ni tokens, ni claves: solo identificadores.
**Aceptación:** 0 `console.*` fuera del logger (verificado por lint); test que comprueba que el logger descarta los campos personales, las rutas de avatar y cualquier campo con aspecto de token o de clave.

### T-03 — Suite de tests mínima  ← la tarea MÁS importante en modo autonomía total
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-01
Configurar `node:test` + `node:assert` (nativos) con `npm test` recorriendo `**/*.test.ts`. Tres niveles, ninguno con red real:
1. **Dominio (puro):** la lógica de negocio crítica, sin dependencias. Prioritario desde el día 1: resolución de "qué alumnos tocan ahora", vigencia de slots, no-retroactividad del histórico, y reglas de quién puede editar qué registro.
2. **Datos:** contra un doble del cliente HTTP que simula respuestas de PostgREST, GoTrue y Storage (incluidos errores, `401`, `403` de RLS, `409` y respuestas vacías), para que la capa de acceso se pruebe sin tocar Supabase.
3. **UI:** helpers propios sobre `jsdom` (única `devDependency` de test permitida) para montar un contenedor y afirmar sobre nodos reales.
Añadir un **reloj inyectable**: ninguna función de dominio puede leer la hora del sistema directamente.
**Aceptación:** suite en verde; los tres niveles tienen al menos un test real; existe un test que falla si alguna función de dominio lee la hora del sistema en lugar del reloj inyectado; `npm test` funciona sin ninguna variable de entorno definida.

### T-04 — Integración continua (CI)
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-01, T-03
Pipeline (GitHub Actions o equivalente) que ejecute `typecheck`, `lint`, `test` y `build` en cada push a `develop` **y a `master`**, fijando la versión de Node. El pipeline **no** debe necesitar credenciales de Supabase para la verificación: si alguna prueba las pide, es que está tocando la red y hay que doblarla. Los secretos del CI se limitan a lo que necesite el despliegue.
**Aceptación:** workflow en verde en el último commit de `develop`, con la verificación ejecutándose sin ningún secreto configurado; el mismo workflow declarado también para `master`, para que el merge del dueño no entre nunca a ciegas.
**Bloqueo humano:** ninguno — el repositorio ya existe, con `master` y `develop` enlazadas.

### T-05 — Monitorización de errores
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-02
Captura de errores no controlados en el cliente (`window.onerror`, `unhandledrejection` y los fallos de la capa de datos) canalizados al logger y enviados a una tabla `evento_error` **a través de una RPC** que fija ella misma el instante y el autor, con **scrubbing** previo: nunca salen datos personales, rutas de avatar, tokens ni cuerpos completos de peticiones. Lectura reservada a `administrator` por RLS. La escritura de errores debe tolerar su propio fallo sin provocar un bucle. Si el dueño prefiere además un servicio externo, queda como pregunta en §6; la aplicación debe funcionar sin él.
**Migración asociada:** la tabla y su RPC viajan en el script de esquema de T-07.
**Aceptación:** un error provocado queda registrado; test del scrubbing sobre una carga que contiene nombre, teléfono, ruta de avatar y un token; test de que un fallo al registrar el error no genera recursión.

### T-06 — Límites de abuso y robustez
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-03
Sin backend propio, los límites se aplican donde son eficaces:
1. Confirmar y documentar los límites de intentos de inicio de sesión que ofrece Supabase Auth, y anotar en §6 lo que requiera configuración en el panel.
2. Límite dentro de las RPC de escritura (`registrar_asistencia`, `actualizar_asistencia`): máximo de operaciones por usuario y minuto, devolviendo un error identificable. Límite de subidas de avatar por usuario y hora.
3. En cliente: protección contra doble toque, reintentos con retroceso exponencial acotado, cancelación de peticiones obsoletas y tiempos de espera. Nunca reintentar a ciegas una escritura no idempotente.
4. Mensajes al usuario en español que expliquen qué hacer, no el código de error.
**Aceptación:** test de que N+1 operaciones en la ventana devuelven el error de límite; test de que un doble toque produce exactamente un registro; test del retroceso exponencial con reloj inyectado.

---

## FASE B — PRODUCTO (derivada de los requisitos)

> Orden de valor incremental: modelo de datos y acceso (T-07 a T-10); el maestro de datos que el
> administrador necesita para que exista información (T-11 a T-16); la funcionalidad diaria que
> justifica el producto (T-17 a T-21, pasar lista y revisar lo registrado); y consulta, cierre y
> paso a producción (T-22 a T-25). Cada bloque deja algo demostrable.

### T-07 — Modelo de datos, runner de migraciones y entornos
**Prioridad:** ALTA · **Migración:** Sí (`001_esquema_inicial`) · **Depende de:** T-03

**Objetivo:** el cimiento del que cuelga todo el producto: el modelo de datos en PostgreSQL, la herramienta que lo aplica de forma trazable, y la separación entre `dev` (autónomo) y `prod` (que aún no existe).

**Requisitos:**

*Runner de migraciones (`herramientas/migrar.ts`, `npm run migrate`):*
1. Lee `db/NNN_*.sql` en orden, aplica los pendientes contra la Management API con `fetch` nativo y el access token de `.env.local`, y registra en `esquema_migracion` número, nombre, hash SHA-256, instante y entorno.
2. **Inmutabilidad:** si el hash de un script ya aplicado ha cambiado, aborta con un mensaje claro. Un arreglo va en una migración nueva.
3. **Entorno por defecto `dev`.** Apuntar a `prod` exige el flag `--entorno=prod` **y** `PERMITIR_PROD=1`. El runner imprime a qué proyecto va a escribir antes de ejecutar. **Quien ejecuta el runner es el dueño, en su máquina** (§0.1): el agente lo escribe y lo testea, pero no lo lanza, porque no tiene ni debe tener el access token. Si el runner no encuentra las credenciales, debe fallar con un mensaje claro en español que diga exactamente eso, no intentar continuar.
4. **Guardas técnicas de contenido:** rechaza cualquier script que contenga `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, `DISABLE ROW LEVEL SECURITY`, un `DROP POLICY` sin `CREATE POLICY` en el mismo fichero, un `DELETE` sobre `asistencia`, o un `UPDATE`/`DELETE` sobre `asistencia_historial`. Esta lista convierte los invariantes de §0.2 en algo que el agente no puede saltarse por descuido.
5. Cada script se aplica dentro de una transacción; si falla, no deja el esquema a medias.
6. `npm run migrate -- --estado` lista qué hay aplicado en cada entorno sin escribir nada.

*Modelo de datos — `db/001_esquema_inicial.sql`:*
7. `perfil`, `esquema_migracion`, `esquema_version()` y las funciones de rol (`rol_actual()`, `es_administrator()`, `es_teacher()`) **ya existen**: el dueño aplicó `db/000_bootstrap_perfil.sql` a mano antes de empezar. **No las recrees**: leelas, respétalas y compruébalas con `esquema_version()` (debe devolver `0` antes de aplicar `001`). Si `001` necesita tocar `perfil`, hazlo con `alter table`, nunca volviendo a crearla.
8. **`centro_estudios`** — catálogo de los centros reglados a los que asisten los alumnos (colegios, institutos). Campos: `nombre` (obligatorio, único), `activo`. Baja lógica, nunca `DELETE`. Cualquier campo adicional (localidad, tipo de centro, etc.) es pregunta para §6, no invención del agente.
9. **`alumno`** — `nombre` (obligatorio), `primer_apellido` (obligatorio), `segundo_apellido` (**nullable**), `centro_referencia_id` (obligatorio, FK a `centro_estudios`), `avatar_ruta` (**nullable**, ruta en Storage, nunca una URL), `email_alumno` (**nullable**), `telefono_alumno` (**nullable**), `activo`, `alta_en`, `baja_en`, `motivo_baja`, y `usuario_id` (**nullable**, FK a `perfil`) para poder vincular en el futuro a un alumno con su cuenta sin migrar la tabla.
10. **`persona_referencia`** — 0..N por alumno. Campos: `alumno_id` (FK), `nombre` (obligatorio), `primer_apellido` (obligatorio), `segundo_apellido` (**nullable**), `email_referencia` (**nullable**), `telefono_referencia` (**obligatorio**). Es la única tabla del sistema con `DELETE` real permitido (§0.2). Anotar en §6 dos preguntas: si se desea un campo `relacion` (padre / madre / tutor / otro), y si debe exigirse al menos una persona de referencia cuando el alumno no tiene ni email ni teléfono propios.
11. `slot_horario` — `alumno_id`, `profesor_id`, `dia_semana` (1–7), `hora_inicio`, `hora_fin`, `asignatura_o_grupo`, `vigente_desde`, `vigente_hasta` (nullable).
12. `asistencia` — `alumno_id`, `profesor_id`, `registrado_en timestamptz` (**inmutable**), `ocurrido_en timestamptz` (editable), `es_retroactivo boolean`, `origen` (`slot` | `manual`), `slot_id` (nullable), **snapshot** del slot, `estado` (`valida` | `anulada`), `motivo_anulacion`, `nota`, `actualizado_en`, `actualizado_por`, `peticion_id` único.
13. `asistencia_historial` — copia de la fila anterior en cada `UPDATE`, con quién y cuándo. Estrictamente append-only.
14. `evento_error` (T-05). El ledger y `esquema_version()` ya vienen del bootstrap (punto 7).

*Invariantes, dentro de la base de datos:*
15. `CHECK` de dominios (rol, origen, estado, `dia_semana` 1–7, `hora_fin > hora_inicio`), formato de email y teléfono, claves ajenas, unicidad de `peticion_id` y de `centro_estudios.nombre`.
16. `CHECK` de coherencia: `es_retroactivo` verdadero si y solo si `ocurrido_en` difiere de `registrado_en` más allá de un margen; `motivo_anulacion` obligatorio cuando `estado = 'anulada'`.
17. **Trigger `BEFORE UPDATE`** en `asistencia` que aborta si se intenta modificar `registrado_en`, `profesor_id` o `peticion_id`, y que fija `actualizado_en = now()` y `actualizado_por = auth.uid()`.
18. **Trigger `AFTER UPDATE`** en `asistencia` que escribe la fila anterior en `asistencia_historial`.
19. **`REVOKE INSERT, UPDATE, DELETE ON asistencia`** a los roles de la API. **`REVOKE UPDATE, DELETE ON asistencia_historial`** para todos.
20. **RLS habilitada en todas las tablas** desde el propio script, sin excepción. El rol `student` no recibe ninguna política, ni aquí ni en T-10.
20b. **Privilegios de tabla explícitos para cada tabla nueva:** `revoke all ... from anon, authenticated, service_role` y después conceder solo lo necesario. Nunca dar `TRUNCATE`, `REFERENCES` ni `TRIGGER` a los roles de la API. Es obligatorio incluir un test que recorra `information_schema.role_table_grants` y falle si alguna tabla del proyecto concede a `anon` o a `authenticated` algo fuera de la lista permitida — el descuido ya ocurrió una vez en el arranque y una regla escrita sin comprobación automática no impide que vuelva.

*Cierre:*
21. **`db/MODELO.md`** en español y legible sin saber SQL: cada tabla, cada campo con su tipo, su obligatoriedad y su porqué; las relaciones; la matriz de roles; y por qué cada invariante está donde está. Con diagrama de relaciones en texto. Se mantiene al día en cada migración posterior.
22. Tipos TypeScript del dominio escritos a mano en `src/dominio/tipos.ts` (no generados), y un test que los confronta con la forma que devuelve PostgREST según el doble de T-03.
23. **Test de fuga de secretos:** inspecciona el resultado de `npm run build` y falla si aparece el access token, la contraseña de base de datos o la clave `service_role`.
24. Semilla de desarrollo (`npm run seed`) con datos ficticios de los tres roles, varios centros de estudios, alumnos con y sin segundo apellido, y alumnos con 0, 1 y 3 personas de referencia. Con salvaguarda que impida ejecutarla contra `prod`.

**Bloqueo humano:** el dueño ejecuta `npm run migrate` **en local** para aplicar `001` a `dev` (§0.1), y revisa `db/MODELO.md`. La revisión del modelo es requisito para T-25 (paso a producción), no para seguir desarrollando.

**Criterio de aceptación, en dos partes.**

*Lo que el agente cierra por sí mismo, sin ninguna credencial:* `db/001_esquema_inicial.sql` y `db/MODELO.md` commiteados y coherentes entre sí; el runner escrito y **testeado contra un doble de la Management API**, incluyendo que rechaza un script por cada guarda de contenido (un test por guarda), que falla por hash si un script ya aplicado cambia, que se niega a apuntar a `prod` sin `PERMITIR_PROD=1`, y que ante credenciales ausentes falla con un mensaje claro en lugar de continuar; test de que ninguna tabla del script queda sin `enable row level security`; tests de la presencia del trigger de inmutabilidad, del trigger de historial y de las revocaciones; test de privilegios explícitos (punto 20b); test de fuga de secretos; y la fila abierta en §3 pidiendo la aplicación.

*Lo que requiere al dueño:* tras su `npm run migrate`, `esquema_version()` devuelve `1` y la fila queda anotada en `db/APLICADAS.md`. La tarea no está COMPLETADA hasta esa segunda parte, pero **no bloquea** a T-08 y siguientes, que se desarrollan y se testean contra los dobles.

### T-08 — Cliente propio de la API de Supabase
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-07

**Objetivo:** una única puerta entre la aplicación y Supabase, tipada y testeable, escrita con `fetch` nativo — sin el SDK.

**Requisitos:**
1. Configuración de entorno (URL del proyecto y clave anónima) inyectada en el build; **nunca** commiteada. Comprobación al arrancar, con mensaje claro en español si falta. El access token no aparece en esta capa: pertenece al runner de migraciones.
2. Cliente PostgREST propio: constructor de consultas mínimo y tipado (`select` con recursos embebidos —necesario para traer un alumno con su centro y sus personas de referencia en una sola petición—, filtros `eq`/`in`/`gte`/`lte`/`ilike`, `order`, `limit`, rango para paginación), `insert`, `update`, `delete` y llamada a RPC. Cabeceras correctas (`apikey`, `Authorization`, `Prefer`).
3. Cliente de **Storage** para los avatares (`/storage/v1/...`): subida, borrado, generación de URL firmada individual y **firma en lote de varias rutas en una sola petición** — esta última no es un extra, es lo que hace viable la pantalla de pasar lista con la conexión de un aula (T-19). Separado del de PostgREST pero con el mismo manejo de errores.
4. Traducción de errores a errores de dominio tipados: `NoAutenticado`, `SinPermiso`, `Conflicto`, `ErrorDeValidacion`, `ErrorDeRed`, `ErrorDelServidor`, `FicheroDemasiadoGrande`, `TipoDeFicheroNoPermitido`. Un `403` de RLS debe llegar a la interfaz como un mensaje comprensible.
5. Nunca construir filtros por concatenación de texto sin escapar: el codificador de valores es una función propia y testeada, con casos de comillas, comas, `%` y caracteres reservados de PostgREST.
6. Documentar en `DECISIONES_TECNICAS.md` qué subconjunto de PostgREST y de Storage se implementa, y qué señales obligarían a ampliarlo.

**Criterio de aceptación:** tests contra el doble HTTP que cubren consulta con filtros, recurso embebido, paginación, RPC, subida y borrado en Storage, URL firmada individual, **firma en lote de N rutas en una sola petición**, `401`, `403`, `409`, error de red y respuesta malformada, cada uno produciendo su error de dominio; test del codificador de valores; ninguna llamada a `fetch` de aplicación fuera de estos módulos (verificado por lint).

### T-09 — Autenticación y los tres roles
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-08

**Objetivo:** que cada usuario se identifique y que su rol determine qué aplicación ve — para que cada registro quede atribuido a una persona y para que `student` quede cerrado desde el primer día.

**Premisa de uso, decidida por el dueño el 2026-08-25:** **una cuenta por profesor, en su propio dispositivo.** No hay tablet compartida ni cuenta común de la academia, y no se construye nada para ese escenario. Es lo que sostiene todo lo demás: si varios profesores compartieran una cuenta, `profesor_id` dejaría de significar nada, no se podría responder quién registró o modificó un dato, y la regla de que un profesor solo edita sus propios registros se quedaría sin sentido. Si algún día se plantea el dispositivo compartido, es una decisión de producto del dueño y exige diseño nuevo (varias sesiones guardadas y un PIN por profesor), no un parche.

**Requisitos:**
1. Inicio de sesión por email y contraseña contra GoTrue, cierre de sesión y renovación con `refresh_token`, con el cliente propio.
2. **Recuperación de contraseña, y es un requisito, no un extra.** Sin ella el alta de un profesor acaba en el administrador dictándole una contraseña por teléfono, que es la peor práctica posible y además no escala. El endpoint `POST /auth/v1/recover` funciona con la **clave anónima**, sin `service_role`, así que se puede implementar entero desde el cliente: pantalla de «he olvidado mi contraseña», y pantalla de establecer contraseña nueva al volver desde el enlace del correo. El flujo de alta real pasa a ser: el administrador crea el usuario en el panel y el profesor **se pone él mismo su contraseña** por esta vía. El administrador nunca conoce la contraseña de nadie.
3. **Comprobar y documentar la configuración de correo del proyecto.** El envío de correos de recuperación depende del servidor SMTP de Supabase, que en el plan gratuito tiene un límite bajo y no es apto para uso real. Verificar si hace falta configurar un SMTP propio y, si lo hace, anotarlo en §3 como acción del dueño: la funcionalidad se despliega igual, pero el correo no sale. Comprobar también si la confirmación de email está activada, porque un usuario creado desde el panel puede quedar sin confirmar y no poder entrar — un fallo que parece un error de código y no lo es.
4. Almacenamiento de la sesión con la opción más conservadora posible y **documentada** (riesgo de XSS explícito, mitigado por la prohibición de `innerHTML` y por la CSP de T-25).
5. **Sesión larga y renovación anticipada, porque esto se usa en clase.** Que a un profesor le caduque la sesión con la lista a medias y el aula esperando es un fallo de producto, no un detalle técnico. Por tanto: renovar el token de forma proactiva **al abrir la pantalla de pasar lista** y con margen amplio antes de la caducidad, nunca esperar al `401`; configurar una vida larga del `refresh_token` en el proyecto; y si la renovación falla por red, decirlo con claridad sin descartar lo que el profesor ya tenía en pantalla.
6. Estado de sesión observable por la interfaz: sin sesión se muestra el login; al caducar sin poder renovar se avisa y **no se pierde** ningún registro pendiente sin decirlo.
7. Carga del `perfil` tras autenticar. Un usuario con `activo = false` no entra, aunque sus credenciales sean correctas. La tabla y su RLS ya existen desde el bootstrap `000`.
8. **Enrutado por rol:** `administrator` y `teacher` acceden a su aplicación; `student` ve una pantalla que le explica en español que su perfil todavía no tiene acceso, sin filtrar ninguna otra información y **sin ninguna llamada a datos** más allá de su propio perfil. Un rol desconocido se trata como `student`, nunca como `teacher`. Recordar que `student` es el rol **por defecto** de todo usuario nuevo, así que esta pantalla es la que verá un profesor recién creado a quien nadie le ha cambiado el rol todavía: su mensaje debe orientarle a hablar con el administrador, no parecer un error.
9. Pantalla de login en DOM nativo, en español, accesible y usable en móvil, con enlace visible a la recuperación de contraseña. Mensajes de error que no revelen si el email existe — y eso incluye la pantalla de recuperación, que debe responder lo mismo exista o no la cuenta.

**Bloqueo humano:** el dueño crea el primer usuario `administrator` en el proyecto `dev` y le asigna el rol (el bootstrap `000` los crea como `student`). Si hace falta SMTP propio para los correos de recuperación, también.

**Criterio de aceptación:** tests que cubren credenciales correctas, contraseña errónea, perfil inactivo, token caducado con renovación exitosa, renovación fallida y ausencia de sesión; test del flujo completo de recuperación de contraseña y de que responde igual con un email inexistente; test de que la renovación proactiva se dispara al abrir pasar lista y no espera un `401`; test de que un perfil `student` y uno con rol desconocido llegan a la pantalla sin acceso y no disparan ninguna consulta de datos; ningún test ni log contiene una contraseña ni un token en claro.

### T-10 — Autorización: políticas RLS de los tres roles
**Prioridad:** ALTA · **Migración:** Sí (`002_politicas_rls`) · **Depende de:** T-09

**Objetivo:** que cada rol pueda hacer exactamente lo que le corresponde y nada más, con las reglas donde no se pueden esquivar.

**Requisitos:**
1. Las funciones auxiliares (`rol_actual()`, `es_administrator()`, `es_teacher()`) **ya existen** desde el bootstrap `000`, y son `SECURITY DEFINER` por una razón: si no lo fueran, una política sobre `perfil` que las llame volvería a disparar la política y PostgreSQL aborta con *infinite recursion detected in policy*. **No las redefinas sin ese modificador.** Úsalas en todas las políticas nuevas; una sola definición, nunca repetir la lógica de rol dentro de una política.
2. Políticas por tabla y operación, explícitas y comentadas:
   - `centro_estudios`: `teacher` lee los activos (los ve en la ficha del alumno); `administrator` lee y escribe. Sin `DELETE`.
   - `alumno`: `teacher` lee los activos, **y solo los campos que necesita** para identificarlos (ver punto 4); `administrator` lee y escribe todo. Sin `DELETE`.
   - `persona_referencia`: **solo `administrator`**, lectura y escritura, incluido `DELETE`. Un `teacher` **no** ve los datos de los padres o tutores: no los necesita para pasar lista, y es el dato más sensible junto con el avatar.
   - `slot_horario`: `teacher` lee los suyos; `administrator` lee y escribe todos.
   - `asistencia`: `teacher` lee **las suyas**; `administrator` lee **todas**. Sin `INSERT` ni `UPDATE` directo (solo RPC). **Sin `DELETE` para nadie.**
   - `asistencia_historial`: lectura solo `administrator`. Sin `INSERT`, `UPDATE` ni `DELETE`.
   - `perfil`: **ya resuelto en el bootstrap `000`** — cada usuario autenticado lee su propia fila y `administrator` lee y gestiona todas, sin `DELETE` para nadie. Revísalo, no lo recrees.
   - `evento_error`: escritura por RPC; lectura solo `administrator`.
   - **`student`: ninguna política en ninguna tabla, con una única excepción deliberada** — lee su propia fila de `perfil`, porque son sus propios datos y la aplicación necesita su nombre y su rol para decirle que todavía no tiene acceso. No expone nada de nadie más. Cualquier otra política para `student` es un fallo.
3. **Políticas del bucket de avatares** (`storage.objects`): el bucket es **privado**. Escritura solo `administrator`. Lectura para `administrator` y **también para `teacher`, restringida a avatares de alumnos activos** — la política extrae el `alumno_id` de la ruta y lo une con `alumno.activo`. Ningún acceso para `anon` ni para `student`. Esta lectura del `teacher` es una ampliación deliberada, decidida por el dueño el 2026-08-25 para que la pantalla de pasar lista muestre las caras de sus alumnos; queda acotada a activos porque un profesor no tiene por qué recuperar la foto de alguien dado de baja.
4. Decidir e implementar cómo se restringe el conjunto de columnas que ve un `teacher` de un alumno (vista dedicada con `security_invoker`, o `GRANT` por columna). Documentar la elección en `DECISIONES_TECNICAS.md`. Un `teacher` no debe poder leer `email_alumno` ni `telefono_alumno` mediante una consulta directa a PostgREST. **`avatar_ruta` sí es legible para el `teacher`** en los alumnos activos, porque la necesita para pedir la URL firmada; no expone nada que la política del bucket no permita ya.
5. **Batería de pruebas de aislamiento ejecutable** `db/pruebas_rls.sql`, lanzable con `npm run probar-rls`: suplantando a un `administrator`, a dos `teacher` distintos y a un `student`, comprueba que cada acceso permitido funciona y **cada acceso prohibido falla**. Obligatorios: el barrido completo del `student` (debe fallar en todas las tablas y en el bucket), el intento de un `teacher` de leer `persona_referencia` (debe fallar), de leer las columnas de contacto de un alumno (debe fallar), de leer el avatar de un alumno **activo** (debe funcionar), de leer el de un alumno **inactivo** (debe fallar) y de escribir en el bucket (debe fallar).
6. En el cliente, la interfaz se adapta al rol, con un comentario explícito de que eso es presentación y **no** control de acceso.
7. Documentar en `DECISIONES_TECNICAS.md` la matriz completa rol × tabla × operación, con los tres roles y el bucket.

**Criterio de aceptación:** la matriz está escrita y cada celda tiene su política o su ausencia justificada; `db/pruebas_rls.sql` cubre al menos un caso permitido y uno prohibido por celda de escritura, más los tres barridos obligatorios del punto 5; `npm run probar-rls` contra `dev` no muestra ningún acceso prohibido que haya tenido éxito.

### T-11 — Catálogo de centros de estudios
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-10

**Objetivo:** el maestro de centros reglados (colegios, institutos) al que apunta la ficha de cada alumno. Va antes de la ficha porque `centro_referencia_id` es obligatorio: sin catálogo no se puede dar de alta a nadie.

**Requisitos:**
1. Operaciones de dominio: listar (con filtro por estado y búsqueda), crear, editar el nombre, desactivar y reactivar. Sin borrado.
2. Nombre único, con comparación acento-insensible y sin distinguir mayúsculas, para que no acaben tres variantes del mismo colegio. Al intentar crear un duplicado, ofrecer el existente en lugar de dar un error seco.
3. Un centro con alumnos asociados no puede desactivarse sin avisar de cuántos alumnos quedarían apuntando a un centro inactivo, y esos alumnos siguen siendo válidos y consultables.
4. Escritura reservada a `administrator`; `teacher` solo lectura de activos.
5. Pantalla de gestión sencilla, en español, con estados vacío, de carga y de error.

**Criterio de aceptación:** tests de alta, edición, desactivación y reactivación; test de que el duplicado acento-insensible se detecta (`San José` vs `san jose`); test de que desactivar un centro no invalida a sus alumnos; test de que un `teacher` recibe `SinPermiso` al intentar escribir.

### T-12 — Ficha de alumno: datos, centro y baja lógica
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-11

**Objetivo:** el alta y mantenimiento del alumno con todos sus datos, sin perder nunca información por un borrado.

**Requisitos:**
1. Operaciones: listar (filtro por estado, búsqueda por nombre o apellidos, paginado en servidor), obtener con su centro embebido, crear, editar, **dar de baja** y **reactivar**. No existe ninguna operación de borrado.
2. **Obligatoriedad exacta:** `nombre`, `primer_apellido` y `centro_referencia_id` son obligatorios. `segundo_apellido`, `email_alumno` y `telefono_alumno` son opcionales. Respetar esto literalmente: un alumno con un solo apellido es un caso normal, no un error de validación.
3. Validación y normalización en funciones puras del dominio: email y teléfono en formato español **cuando se informan**, nombres normalizados sin destruir mayúsculas intencionadas (`de la Fuente`, `O'Donnell`).
4. **Nombre completo y ordenación a la española:** una función única del dominio compone el nombre para mostrar, y la ordenación es por `primer_apellido`, `segundo_apellido`, `nombre` — no por el nombre de pila. La búsqueda encuentra por cualquiera de las tres partes, acento-insensible.
5. La baja registra instante y motivo opcional y **no** afecta a ninguna asistencia pasada ni a ningún slot histórico. Un alumno inactivo no aparece en las listas de pasar lista, pero sí en el histórico y en el listado filtrado por inactivos.
6. Escritura reservada a `administrator`.

**Criterio de aceptación:** test de alta con y sin segundo apellido; test de que falta de `centro_referencia_id` es rechazada; test de que email y teléfono vacíos son válidos; test de la ordenación con `García Pérez`, `García López` y `Ábalos`; test de que tras dar de baja a un alumno con asistencias previas esas asistencias siguen íntegras; test de que no existe ninguna ruta capaz de borrar un alumno.

### T-13 — Personas de referencia del alumno
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-12

**Objetivo:** que la ficha del alumno incluya a sus padres, tutores o personas de contacto — que en la práctica son la vía real de comunicación de un menor.

**Requisitos:**
1. Un alumno tiene **0..N** personas de referencia, gestionadas **desde su propia ficha** (no hay pantalla independiente de personas de referencia).
2. **Obligatoriedad exacta:** `nombre`, `primer_apellido` y `telefono_referencia` son obligatorios. `segundo_apellido` y `email_referencia` son opcionales.
3. Operaciones: añadir, editar y **eliminar** (borrado real, §0.2). El borrado pide confirmación explícita e indica que es definitivo.
4. **Solo `administrator`**, tanto lectura como escritura. Un `teacher` no ve estos datos en ninguna pantalla ni por consulta directa (garantizado en T-10, verificado en `db/pruebas_rls.sql`).
5. Se traen embebidas al cargar la ficha, en la misma petición, para que editar un alumno no sean tres viajes.
6. Duplicados: avisar si se añade una persona con el mismo nombre completo y teléfono que otra ya existente del mismo alumno, sin bloquear.
7. Anotar en §6 las dos preguntas abiertas: si se quiere un campo `relacion` (padre / madre / tutor / otro), y si debe exigirse al menos una persona de referencia cuando el alumno no tiene email ni teléfono propios. Mientras no haya respuesta, se permite 0 personas y sin contacto, tal como pidió el dueño.

**Criterio de aceptación:** tests de añadir, editar y eliminar; test de que falta el teléfono es rechazada y que falta el email no lo es; test de un alumno con 0 y con 3 personas de referencia; test de que la ficha se carga en una sola petición con las personas embebidas; caso en `db/pruebas_rls.sql` de que un `teacher` no puede leer ni escribir esta tabla.

### T-14 — Avatar del alumno (Supabase Storage)
**Prioridad:** MEDIA · **Migración:** Sí (`003_bucket_avatares`) · **Depende de:** T-12

**Objetivo:** poder poner cara al alumno en la ficha y, sobre todo, en la lista de pasar lista, que es donde ayuda de verdad a un profesor nuevo. Es el dato más sensible del sistema y se trata como tal.

**Requisitos:**
1. Bucket **privado** `avatares` creado por migración, con sus políticas de `storage.objects`: **escritura solo `administrator`**; **lectura para `administrator` y para `teacher`, y en el caso del `teacher` restringida a avatares de alumnos activos** (la política une la ruta con `alumno.activo`). Nada para `anon` ni para `student`. Límite de tamaño y lista blanca de tipos MIME en la configuración del propio bucket, no solo en el cliente.
2. Ruta determinista `alumno/{alumno_id}/{uuid}/`, con **dos derivadas** dentro: `avatar.webp` (512 px, para la ficha) y `avatar-mini.webp` (96 px, para cards y listados). En `alumno.avatar_ruta` se guarda **la ruta base**, nunca una URL; los dos ficheros se derivan de ella por convención documentada en `db/MODELO.md`.
3. **Procesado en el cliente antes de subir**, con APIs del navegador (`createImageBitmap`, `canvas`, `toBlob`): recorte al cuadrado, generación de **las dos** derivadas y re-codificación a WebP con calidad razonable. El re-codificado **elimina los metadatos EXIF**, incluida la geolocalización que traen las fotos de móvil — es un requisito de privacidad, no un efecto secundario. Generar la mini no cuesta nada porque el procesado ya está hecho, y es lo que hace viable la pantalla de pasar lista con datos móviles.
4. Validación previa de tipo y tamaño con mensaje claro en español; rechazo de ficheros que no sean imagen sin intentar procesarlos.
5. Visualización mediante **URL firmada de vida corta**, generada bajo demanda y no persistida. **Firma en lote:** una sola petición al endpoint de firma con todas las rutas necesarias para una pantalla, nunca una petición por avatar. Caché en memoria durante la sesión, con renovación al caducar.
6. Sustitución y **borrado**: cambiar el avatar elimina **las dos derivadas** anteriores; borrarlo deja `avatar_ruta` a `NULL` y elimina los ficheros. No se acumulan huérfanos.
7. **Sustituto cuando no hay avatar:** un monograma con las iniciales del alumno, generado en el DOM (sin imagen, sin fichero, sin petición), con color derivado de forma estable del identificador del alumno. Es el caso mayoritario al principio y no puede verse como un hueco roto.
8. Aviso en la interfaz, junto al control de subida, de que la imagen de un menor requiere **consentimiento del tutor legal** y que obtenerlo es responsabilidad del centro. El texto definitivo lo aporta el dueño (T-25); hasta entonces, aviso provisional marcado como tal.

**Criterio de aceptación:** test de que el bucket se crea privado y de que sus políticas no incluyen `anon` ni `student`; tests del procesado (una imagen de 4000 px produce una derivada de 512 px y otra de 96 px, ambas WebP y sin EXIF); test de que un fichero no-imagen y uno demasiado grande son rechazados con su error de dominio; test de que sustituir el avatar borra las dos derivadas anteriores; test de que la firma de N avatares se resuelve en **una** petición; test de que la URL de visualización es firmada y no se persiste; test del monograma para un alumno sin avatar; casos en `db/pruebas_rls.sql` de que un `teacher` **sí** puede leer el avatar de un alumno activo, **no** puede leer el de uno inactivo, y **no** puede escribir en el bucket.

### T-15 — Slots de horario por defecto: asignación, edición y no-retroactividad
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-12

**Objetivo:** modelar el horario habitual recurrente de cada alumno (día de la semana + hora de inicio y fin + asignatura o grupo, uno o varios por alumno) de forma que se pueda cambiar sin reescribir la historia.

**Requisitos:**
1. Operaciones: listar los slots de un alumno, crear, **modificar** y **cesar**. Escritura reservada a `administrator`.
2. **Edición como versionado:** modificar un slot cierra la versión vigente (`vigente_hasta`) y crea una nueva desde la fecha de efecto. La versión anterior se conserva para que las asistencias que la referencian sigan resolviéndose.
3. Asignación de profesor al slot (o al grupo): base de la propuesta automática de T-17 y de la pertenencia de los registros.
4. Solapes: para el mismo alumno, dos slots vigentes que se pisan en día y hora se rechazan; para el mismo profesor, se avisa sin bloquear (puede tener varios alumnos a la vez, que es el caso normal en una academia).
5. Función de dominio `slotsVigentesEn(fecha)` como **única** vía para consultar horarios en un instante dado.

**Criterio de aceptación:** test que crea un slot, registra una asistencia, cambia el horario del alumno y verifica que el histórico devuelve los datos originales del slot y no los nuevos; test de rechazo de solape para un mismo alumno; test de que dos alumnos pueden compartir profesor y tramo.

### T-16 — Interfaz de gestión del administrador
**Prioridad:** MEDIA · **Migración:** No · **Depende de:** T-13, T-14, T-15

**Objetivo:** que el administrador pueda operar sin abrir el panel de Supabase, con una interfaz propia en DOM nativo.

**Requisitos:**
1. Base de frontend reutilizable, escrita a mano y testeada: router por `hash`, helpers de creación de elementos con escapado seguro (`textContent` y `createElement`; `innerHTML` prohibido por lint), gestión de estado mínima con suscripción, renderizado incremental, y componentes propios de formulario con validación y mensajes de error accesibles.
2. Pantallas: catálogo de centros de estudios; listado de alumnos con búsqueda y filtro por estado; y **la ficha de alumno como pantalla completa**, con sus tres bloques — datos personales y centro, personas de referencia (añadir, editar, eliminar en línea), y avatar (subir, sustituir, quitar).
3. Edición del horario del alumno con la **fecha de efecto visible** y una nota de que el histórico no cambiará.
4. Todo en español, accesible y usable en pantalla pequeña. Estados vacío, de carga y de error explícitos en cada bloque, y comportamiento honesto ante un `403` de RLS.
5. La ficha debe poder guardarse por bloques sin perder cambios de los otros: un fallo al subir el avatar no debe tirar la edición de los datos personales.

**Criterio de aceptación:** tests de DOM (jsdom + doble de la capa de datos) que cubren alta y edición de centro, alta y edición de alumno, añadir/editar/eliminar persona de referencia, subir y quitar avatar, y edición de slot; test de que un nombre con `<script>` se renderiza como texto; test de que un `403` muestra un mensaje comprensible y no rompe la pantalla; test de que un fallo en un bloque no descarta los cambios de otro.

### T-17 — Motor de propuesta: qué alumnos "tocan" ahora
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-15

**Objetivo:** el corazón del producto — dado un profesor y el instante actual, proponer la lista de alumnos de su clase sin que tenga que buscar nada.

**Requisitos:**
1. Función **pura** `alumnosPropuestos({ profesorId, instante, tolerancia })`: deriva día de la semana y hora local del centro desde el instante, cruza con `slotsVigentesEn`, filtra por profesor y por alumno activo, y devuelve los alumnos con el slot que los justifica.
2. Ventana de tolerancia configurable (por defecto unos minutos antes del inicio y hasta el final del slot).
3. Si no hay ningún slot en curso, devolver el más próximo del día indicándolo explícitamente, en lugar de una lista vacía sin explicación.
4. Zona horaria del centro explícita y única (`Europe/Madrid` por defecto, configurable): horas de slot como hora local, instantes como `timestamptz`. Cambios de hora estacionales tratados y testeados.
5. La consulta se resuelve en **una** petición a PostgREST (slots vigentes del profesor con su alumno embebido) para que la pantalla abra rápido con la conexión de un aula.

**Criterio de aceptación:** batería de tests con instantes fijos, mediante el reloj inyectable, que cubre: dentro del slot, borde de inicio, borde de fin, dentro de la tolerancia, fuera de horario, día sin clase, alumno dado de baja, slot cesado, dos slots consecutivos, dos slots simultáneos y cambio de hora estacional. Ninguna toca la red.

### T-18 — Alta de asistencia (RPC `registrar_asistencia`)
**Prioridad:** ALTA · **Migración:** Sí (`004_rpc_registrar_asistencia`) · **Depende de:** T-17

**Objetivo:** registrar la entrada de un alumno con el instante exacto de la selección y toda la trazabilidad necesaria — de forma que el cliente no pueda falsear ni la hora ni el autor.

**Requisitos:**
1. Función `registrar_asistencia(p_alumno_id, p_slot_id, p_origen, p_ocurrido_en, p_nota, p_peticion_id)`, `SECURITY DEFINER`, que:
   - fija `registrado_en = now()` y `profesor_id = auth.uid()` **ella misma**; lo que envíe el cliente para esos campos se ignora;
   - si `p_ocurrido_en` es nulo (caso normal, registro en vivo), pone `ocurrido_en = registrado_en` y `es_retroactivo = false`;
   - si `p_ocurrido_en` viene informado (registro a posteriori, T-21), lo usa, marca `es_retroactivo = true`, y valida que no está en el futuro ni más allá de la ventana permitida hacia atrás;
   - valida que el alumno existe y está activo, y que el `origen` es coherente (`slot` exige un `slot_id` vigente y del profesor que llama; `manual` exige `slot_id` nulo);
   - construye el **snapshot** del slot leyéndolo de la base de datos, nunca del cliente;
   - aplica el límite de abuso de T-06 y la idempotencia por `peticion_id`;
   - devuelve el registro creado, incluidas las horas guardadas.
2. Un `administrator` puede llamarla en nombre de otro profesor (parámetro opcional, autorizado solo para ese rol); un `teacher` solo crea registros propios; `student` no puede llamarla.
3. `INSERT` directo sobre `asistencia` revocado: la RPC es la única vía, verificado en `db/pruebas_rls.sql`.
4. Duplicados: un segundo registro del mismo alumno en el mismo slot y día se rechaza con un error identificable. La decisión de rechazar se anota en §6 para que el dueño la confirme.

**Criterio de aceptación:** un caso de `db/pruebas_rls.sql` intenta el `INSERT` directo y falla; tests contra el doble que cubren registro en vivo, registro retroactivo marcado, alumno inactivo, slot de otro profesor, `origen` incoherente, `ocurrido_en` en el futuro (rechazado), doble envío con el mismo `peticion_id` (un solo registro), hora de creación enviada por el cliente (ignorada), y un `teacher` intentando registrar en nombre de otro (rechazado).

### T-19 — Pantalla de pasar lista
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-18, T-16

**Objetivo:** la pantalla que un profesor usa cada día: entra, ve a quién le toca y registra entradas en segundos. Es la pantalla más importante del producto y la que manda sobre las demás.

**Requisitos:**
1. Cabecera con el slot en curso (asignatura o grupo y tramo horario) y la hora actual visible.
2. **Los alumnos del slot se presentan como cards, con su avatar.** Cada card lleva: la imagen (derivada mini de 96 px de T-14) o el **monograma con iniciales** cuando el alumno no tiene foto —que será el caso mayoritario al principio y debe verse deliberado, no roto—; el nombre y el primer apellido en grande; y el segundo apellido en secundario. Rejilla adaptable: dos columnas en móvil en vertical, más en tablet. Orden por apellidos.
3. **La card entera es el objetivo táctil.** Un solo toque registra la entrada: la card pasa a estado "registrado" con una marca visible y **la hora real devuelta por el servidor**, nunca la del dispositivo ni la teórica del slot. Debe distinguirse de un vistazo, sin leer, quién está registrado y quién no.
4. **Rendimiento en aula:** las URL firmadas de todos los avatares del slot se piden **en una sola petición** (firma en lote, T-14). Las imágenes se cargan de forma diferida y la card se pinta **antes** de que llegue la imagen, con el monograma como estado inicial: la pantalla nunca espera a las fotos para ser usable. Una foto que falla deja el monograma, no un hueco.
5. Sin recargas: la propuesta se refresca al cambiar de tramo horario y hay refresco manual explícito. Al abrir, ya se ve quién está registrado hoy en ese slot.
6. Comportamiento honesto ante fallo o falta de conexión: no se finge un registro que no llegó. La card vuelve a pendiente, se explica qué pasó y se ofrece reintentar con el mismo `peticion_id`.
7. Contraste alto y legible a un brazo de distancia. Además de tocar, la rejilla debe ser navegable por teclado con foco visible, porque el mismo profesor puede usarla desde un portátil.
8. Consciente de dónde se usa: esta pantalla muestra caras de menores en un dispositivo que, en un aula, ve más gente que el profesor. Solo aparecen los alumnos de **su** slot, nunca un listado general con fotos.

**Criterio de aceptación:** test de DOM del flujo completo (carga de propuesta, toque en la card, registro, estado registrado con la hora del servidor); test de que la card se pinta con monograma antes de que resuelvan las imágenes; test de que un alumno sin avatar muestra monograma y no dispara ninguna petición de imagen; test de que N avatares se firman en una sola petición; test de que una imagen que falla deja el monograma; test del caso de error de registro, que verifica que la card vuelve a pendiente y aparece el mensaje; test de que el reintento no genera un segundo registro; test de navegación y activación por teclado.

### T-20 — Alumno extra: listado completo y selección manual
**Prioridad:** ALTA · **Migración:** No · **Depende de:** T-19

**Objetivo:** cubrir la clase extra o puntual — que el profesor pueda registrar a cualquier alumno activo del centro aunque no esté en su horario habitual, sin salir de la pantalla de pasar lista.

**Decisión de diseño del control (tomada, no abierta):** un **buscador con autocompletado**, no un desplegable. Un `<select>` con cientos de alumnos es inmanejable y en móvil es hostil para este caso. Y **sin avatar en los resultados**, por tres razones que se refuerzan: los resultados cambian con cada tecla, así que firmar y descargar imágenes por pulsación gasta red y batería para nada; la desambiguación que hace falta aquí es textual (nombre completo y centro de estudios cuando hay homónimos), no visual; y navegar un buscador con caras equivale a pasear por las fotos de menores de otras clases en una pantalla que en un aula ve más gente que el profesor. La regla que queda es: **avatar donde el conjunto es estable, texto donde el conjunto es transitorio.**

**Requisitos:**
1. Control de búsqueda accesible en la propia pantalla de pasar lista, sin navegar fuera y sin perder el estado de la lista del slot.
2. **Búsqueda en servidor** desde el segundo carácter, con rebote (unos 250 ms), cancelación de la petición anterior al seguir escribiendo, y paginación o límite de resultados. Busca por nombre, primer apellido y segundo apellido, acento-insensible y sin distinguir mayúsculas. Rendimiento aceptable con cientos de alumnos.
3. Cada resultado muestra **solo lo imprescindible para identificar**: nombre y apellidos, y el centro de estudios cuando hay homónimos. Nunca contacto, nunca personas de referencia, nunca avatar.
4. **Combobox accesible escrito a mano** — es la pieza de accesibilidad más difícil del proyecto y no hay librería que la resuelva. Requisitos concretos: `role="combobox"` con `aria-expanded` y `aria-controls`; lista con `role="listbox"` y opciones con `role="option"`; opción activa señalada con `aria-activedescendant`; navegación con flechas arriba y abajo, selección con Enter, cierre con Escape; anuncio del número de resultados por región `aria-live`; foco visible en todo momento; y objetivos táctiles de 44 px como mínimo en cada opción.
5. Seleccionar un alumno registra su entrada con `origen = manual` y la hora real, por la misma RPC de T-18. El alumno **pasa entonces a ser una card más** en la lista de la sesión, con su avatar y marcado visiblemente como extra: ahí ya forma parte de un conjunto estable y la foto sí aporta.
6. Estados explícitos del buscador: sin escribir todavía, buscando, sin resultados, y error de red. Ninguno puede ser un hueco vacío sin explicación.
7. Un alumno inactivo **no** aparece en los resultados. Si el profesor lo busca por su nombre y no lo encuentra, un mensaje le explica que puede estar dado de baja y que lo gestione el administrador — mejor eso que una lista vacía que parece un fallo.
8. El registro manual admite una nota breve opcional (motivo de la clase extra) y se distingue visualmente aquí y en el histórico.

**Criterio de aceptación:** test que registra un alumno sin ningún slot con ese profesor y verifica `origen = manual`, `slot_id` nulo y hora real del servidor; test de que un alumno inactivo no aparece en los resultados y de que se muestra el mensaje explicativo cuando no hay ninguno; test de que los resultados **no** contienen campos de contacto ni rutas de avatar y de que no se dispara ninguna petición de imagen al buscar; test del rebote y de la cancelación de la petición anterior; tests de teclado del combobox (flechas, Enter, Escape) y de los atributos ARIA; test de que el alumno recién añadido aparece como card con su avatar y marcado como extra; caso en `db/pruebas_rls.sql` que confirma que la respuesta a un `teacher` no incluye campos de contacto ni de personas de referencia.

### T-21 — Revisar y modificar los registros por slot
**Prioridad:** ALTA · **Migración:** Sí (`005_rpc_actualizar_asistencia`) · **Depende de:** T-18, T-19

**Objetivo:** cerrar el ciclo del día a día. Un profesor sale de clase, abre sus registros de ese slot y arregla lo que esté mal: registró a quien no vino, tocó al alumno equivocado, apuntó una hora que no era, u olvidó a alguien. El administrador hace lo mismo sobre cualquier profesor. Es **una sola pantalla** con dos alcances, no dos pantallas.

**Requisitos:**

*Consulta:*
1. Pantalla «Registros» con selector de **slot** y **fecha**. Muestra los registros de ese slot y día: alumno, hora atribuida (`ocurrido_en`), origen, estado, si es retroactivo, y quién lo registró y quién lo modificó por última vez.
2. **Alcance por rol, garantizado por RLS y no por la interfaz:**
   - `teacher` — solo sus propios slots y registros. No existe selector de profesor: no hay nada que elegir.
   - `administrator` — selector de **profesor** además de slot y fecha, y acceso a cualquier registro del centro.
3. Acceso directo desde «Mi horario» (T-22) y desde pasar lista al terminar un tramo, que es cuando se va a usar de verdad.

*Modificación:*
4. Acciones, presentadas como edición normal (un lápiz, no un formulario de "corrección"):
   - **Cambiar el alumno** — se tocó al equivocado.
   - **Ajustar la hora** (`ocurrido_en`).
   - **Cambiar el slot atribuido** — el snapshot se recalcula desde el slot nuevo.
   - **Anular** — `estado = 'anulada'` con motivo obligatorio. La fila permanece y se muestra tachada.
   - **Editar la nota.**
   - **Añadir un registro olvidado** — llama a `registrar_asistencia` con `ocurrido_en` declarado, y queda marcado como retroactivo (T-18).
5. Todo pasa por la RPC `actualizar_asistencia(p_asistencia_id, ...campos...)`, `SECURITY DEFINER`, que:
   - comprueba la autorización en servidor: un `teacher` solo sobre registros cuyo `profesor_id` es el suyo; un `administrator` sobre cualquiera; `student` nunca;
   - **rechaza** cualquier intento de modificar `registrado_en`, `profesor_id` o `peticion_id`;
   - fija `actualizado_en = now()` y `actualizado_por = auth.uid()` ella misma;
   - valida las mismas reglas de dominio que el alta;
   - exige `motivo_anulacion` cuando se anula;
   - aplica el límite de abuso de T-06.
6. **Ventana de edición:** por defecto un `teacher` puede modificar sus registros de los últimos **7 días naturales**, y un `administrator` sin límite. El número va en configuración, no incrustado en el código. Se anota en §6 para que el dueño lo confirme.
7. Cada modificación deja rastro en `asistencia_historial` por trigger. La pantalla muestra «modificado por X el …» y permite desplegar el historial de esa fila; el historial completo es lectura de `administrator`.
8. Confirmación explícita antes de anular o de cambiar de alumno, con el dato viejo y el nuevo a la vista.

**Criterio de aceptación:** tests contra el doble que cubren cada acción; test de que un `teacher` recibe `SinPermiso` al modificar un registro de otro profesor y al salirse de la ventana de 7 días; test de que un `administrator` sí puede en ambos casos; test de que modificar `registrado_en` es rechazado; test de que anular sin motivo es rechazado y que la fila anulada sigue apareciendo; test de que tras dos modificaciones `asistencia_historial` tiene dos filas con los valores previos correctos; casos en `db/pruebas_rls.sql` para el `UPDATE` directo, el `DELETE` y el acceso del `student` (los tres rechazados).

### T-22 — "Mi horario" y mis alumnos por slot (teacher)
**Prioridad:** MEDIA · **Migración:** No · **Depende de:** T-17

**Objetivo:** que el profesor vea su semana y quién le corresponde en cada tramo, requisito explícito de su rol.

**Requisitos:**
1. Vista semanal de los slots vigentes del profesor, con asignatura o grupo, tramo horario y alumnos asignados.
2. Desde cada slot, dos accesos directos: pasar lista si el tramo está en curso, y **revisar los registros de ese slot** (T-21) en cualquier momento.
3. Solo lectura del horario: el profesor no lo edita (eso es de `administrator`, T-15). El aislamiento lo garantiza RLS.
4. Indicador visible del slot actual y del siguiente.

**Criterio de aceptación:** test de que la vista solo muestra slots del profesor autenticado; caso en `db/pruebas_rls.sql` de que un `teacher` no puede leer los slots de otro; test de la vista semanal con dos slots el mismo día y con dos alumnos simultáneos.

### T-23 — Consulta y exportación del histórico
**Prioridad:** MEDIA · **Migración:** No · **Depende de:** T-21

**Objetivo:** que el registro sirva para lo que existe — poder responder "¿cuándo vino este alumno, quién lo registró y se ha modificado?" con datos fieles. Complementa a T-21: aquella es la revisión operativa de un slot; esta es la consulta transversal.

**Requisitos:**
1. Consultas por alumno, por profesor, por centro de estudios de referencia y por rango de fechas, mostrando: alumno, profesor, hora atribuida y hora de creación, origen, si es retroactivo, estado, y si tiene modificaciones.
2. Los cambios de horario posteriores no alteran ni un dato de una fila histórica, porque se lee del snapshot. Se comprueba, no se supone.
3. Exportación a CSV, con cabeceras en español y separador y codificación correctos para abrirse sin destrozos en una hoja de cálculo española. Incluye las dos horas y las marcas de retroactivo y anulada: un informe que las esconda miente por omisión. **No incluye** datos de contacto ni de personas de referencia salvo que el `administrator` lo pida explícitamente.
4. Alcance: `administrator` en todo el centro; `teacher` solo su propio histórico (por RLS). Las consultas de datos personales dejan traza mínima en el log.
5. Paginación real: el histórico crece sin límite.

**Criterio de aceptación:** test que compara el histórico exportado antes y después de cambiar el horario de un alumno y verifica que es idéntico; caso en `db/pruebas_rls.sql` de que un `teacher` no lee registros de otro; test del CSV con nombres que contienen comas, comillas y tildes, y con una fila anulada y otra retroactiva.

### T-24 — Administración de usuarios y roles
**Prioridad:** BAJA · **Migración:** No · **Depende de:** T-10

**Objetivo:** dejar el rol `administrator` realmente operativo, con los tres roles desde el principio.

**Requisitos:**
1. Listado de usuarios con su rol y estado, edición de nombre y **cambio de rol entre los tres**, y **desactivación** (`activo = false`, nunca borrado) sobre `perfil`.
2. Vinculación opcional de un perfil `student` con su ficha de `alumno` (campo `usuario_id` de T-07). Se deja **preparado y sin uso**: ninguna funcionalidad de alumno se construye aquí.
3. Las operaciones que exigen privilegios de administración de Supabase Auth (crear usuario, forzar cambio de contraseña, revocar sesiones) **no** se pueden hacer desde el cliente sin la clave `service_role`, prohibida en el navegador. Documentar el procedimiento manual en el panel y dejarlo en §3 como acción del dueño; anotar en §6 si se desea automatizarlo más adelante, señalando que implicaría revisar el alcance del stack.
4. El último `administrator` activo no puede desactivarse ni degradarse a sí mismo; la regla se implementa en la base de datos.
5. Toda acción sobre usuarios queda registrada con autor e instante.

**Criterio de aceptación:** tests de cambio de rol entre los tres valores, desactivación y caso "último administrador"; caso en `db/pruebas_rls.sql` de que un `teacher` y un `student` reciben error al leer o modificar perfiles ajenos; procedimiento manual documentado en `DEVELOPERS.md`.

### T-25 — Endurecimiento, privacidad y paso a producción
**Prioridad:** ALTA · **Migración:** No (propaga las existentes) · **Depende de:** T-23, T-24

**Objetivo:** dejar el MVP defendible y llevarlo a producción por primera vez. Es la única tarea que toca `prod`, y no la ejecuta el agente solo.

**Requisitos:**
1. Cabeceras de seguridad en el hosting estático: `Content-Security-Policy` estricta —posible y exigible porque no hay CDN ni librerías: solo `self` y el dominio de Supabase, sin `unsafe-inline`—, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options`.
2. **Revisión de superficie de ataque del modelo cliente-directo:** una fila por tabla, por RPC y por bucket, comprobando que nada queda accesible a `anon` ni a `student`, que un `teacher` no alcanza contacto, personas de referencia ni avatares, y que no existe ninguna ruta de escritura fuera de las RPC previstas. Es la contrapartida de no tener backend y debe quedar escrita.
3. **Inventario de datos personales y RGPD:** qué campos se guardan, dónde aparecen, retención propuesta, y el procedimiento de **anonimización** de un alumno que conserve su histórico de asistencia — incluyendo el borrado de su avatar y de sus personas de referencia, que sí se eliminan de verdad. Atender una supresión sin destruir el registro administrativo.
4. **Textos legales**, aportados o validados por el dueño: aviso legal, política de privacidad, consentimiento de tratamiento, e **hoja de consentimiento específica para el uso de la imagen del menor**. El agente deja borradores marcados como tales y sustituye el aviso provisional de T-14.
5. **Propagación del esquema a `prod`**, la primera y única vez: el dueño crea el proyecto, aporta sus credenciales, y aplica **en orden** todas las migraciones cuya columna `prod` esté vacía en `db/APLICADAS.md`. Después: verificar `esquema_version()`, ejecutar `db/pruebas_rls.sql` **contra producción** y guardar su salida como evidencia, y crear el primer `administrator`. El agente prepara, guía y verifica; **no ejecuta**.
6. **Copias de seguridad:** documentar y verificar el respaldo de producción y su restauración, incluida una exportación periódica del histórico y de su historial bajo control del dueño. Configurar el plan es acción del dueño.
7. **Riesgo residual del panel y del token:** dejar escrito que quien tiene acceso al panel de Supabase o al access token puede alterar datos y esquema por debajo de la aplicación, incluido `asistencia_historial` y los avatares; recomendar limitar quién tiene ese acceso y rotar el token. Es una salvaguarda organizativa, no técnica.
8. Revisión completa del español de la interfaz y de todos los mensajes de error, incluidas las etiquetas de los tres roles.
9. `DEVELOPERS.md` y `README.md` al día: arranque, los dos entornos, el runner de migraciones, el respaldo, y las notas de evolución futura (funcionalidad para el rol `student`; multi-academia con `centro_id`; caché de lectura y cola offline en IndexedDB; servicio propio si algún día hace falta lógica de servidor).

**Bloqueo humano:** crear el proyecto de producción y aportar sus credenciales; aplicar las migraciones en producción; aportar los textos legales definitivos, incluido el consentimiento de imagen; configurar cabeceras y plan de respaldo.

**Criterio de aceptación:** un análisis de cabeceras sobre el despliegue no arroja ausencias de la lista del punto 1 y la CSP no contiene `unsafe-inline`; la revisión del punto 2 está escrita con una fila por tabla, RPC y bucket; el inventario y el procedimiento de anonimización están escritos; `db/APLICADAS.md` no tiene ninguna fila con la columna `prod` vacía; la salida de `db/pruebas_rls.sql` contra producción está guardada y no muestra ningún acceso prohibido con éxito; existe una exportación de respaldo verificada.

---

## ESTRUCTURA DE UNA TAREA (formato de toda T-XX)

```
### T-NN — <título>
**Prioridad:** ALTA | MEDIA | BAJA · **Migración:** Sí (`NNN_<nombre>`) | No · **Depende de:** <T-XX o —>

**Objetivo:** <qué problema resuelve y por qué importa>

**Requisitos:**
1. <paso concreto>

**Bloqueo humano (si lo hay):** <qué hace el dueño; el código se despliega igual, la funcionalidad queda latente>

**Criterio de aceptación:** <condición objetiva y verificable de "hecho">
```

---

## RESUMEN DE DEPENDENCIAS Y BLOQUEOS HUMANOS

> Las credenciales de `dev` ya están en `.env.local`, así que el agente puede recorrer casi todo
> el backlog sin pedir nada. Los bloqueos reales se concentran al principio (repositorio, primer
> administrador) y al final (T-25: producción y textos legales).

| Tarea | Depende de | Bloqueo humano (no impide desplegar el código) |
|-------|-----------|------------------------------------------------|
| T-00  | —         | Alta del repositorio (`REPO` pendiente)        |
| T-01  | —         | —                                              |
| T-02  | T-01      | —                                              |
| T-03  | T-01      | —                                              |
| T-04  | T-01, T-03| Repositorio con CI habilitado                  |
| T-05  | T-02      | Servicio externo de monitorización, solo si el dueño lo elige |
| T-06  | T-03      | Configurar en el panel los límites de intentos de Supabase Auth |
| T-07  | T-03      | — (revisión de `db/MODELO.md` en §6, no bloqueante) |
| T-08  | T-07      | Hosting estático                               |
| T-09  | T-08      | **Crear el primer usuario `administrator` en `dev`** |
| T-10  | T-09      | —                                              |
| T-11  | T-10      | — (campos adicionales de `centro_estudios`, §6) |
| T-12  | T-11      | —                                              |
| T-13  | T-12      | — (campo `relacion` y contacto mínimo obligatorio, §6) |
| T-14  | T-12      | —                                              |
| T-15  | T-12      | —                                              |
| T-16  | T-13, T-14, T-15 | —                                       |
| T-17  | T-15      | Confirmar zona horaria y ventana de tolerancia (§6) |
| T-18  | T-17      | Confirmar política de duplicados (§6)          |
| T-19  | T-18, T-16| —                                              |
| T-20  | T-19      | —                                              |
| T-21  | T-18, T-19| Confirmar la ventana de edición del profesor (§6, por defecto 7 días) |
| T-22  | T-17      | —                                              |
| T-23  | T-21      | —                                              |
| T-24  | T-10      | Alta de usuarios en el panel (no automatizable sin `service_role`) |
| T-25  | T-23, T-24| **Crear el proyecto de producción y aplicar las migraciones; textos legales, incluido el consentimiento de imagen del menor; cabeceras y plan de respaldo** |

### Migraciones previstas

| Nº | Nombre | Tarea |
|----|--------|-------|
| 001 | `esquema_inicial` | T-07 |
| 002 | `politicas_rls` | T-10 |
| 003 | `bucket_avatares` | T-14 |
| 004 | `rpc_registrar_asistencia` | T-18 |
| 005 | `rpc_actualizar_asistencia` | T-21 |

---

*Fin de la hoja de ruta original v1.0 — no modificar este archivo.*
