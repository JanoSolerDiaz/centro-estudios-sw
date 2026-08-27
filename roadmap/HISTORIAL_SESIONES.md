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

### Sesión 2026-08-27 (5)
**Tarea(s):** T-07 (cierre)
**Estado resultante:** COMPLETADA
**Commits a `develop`:** ver commit de esta sesión (T-07: COMPLETADA — 001 aplicada y verificada)
**Migraciones aplicadas:** `db/001_esquema_inicial.sql` en `dev`, aplicada por **el dueño** con
`npm run migrate` (§0.1: ningún agente aplica DDL). `esquema_version()` devuelve `1`. Hash
`93359e9a4e27`. Anotada en `db/APLICADAS.md`
**Propagación a prod pendiente:** sí — columna `prod` vacía de `db/APLICADAS.md`, se hace en T-25
**Archivos creados/modificados:** `db/APLICADAS.md`, `roadmap/SEGUIMIENTO.md`,
`roadmap/HISTORIAL_SESIONES.md`
**Verificaciones pre-push:** tipos ✅ · lint ✅ · tests ✅ (174) · build ✅
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
**Tareas autopropuestas (P-XX):** ninguna
**Próximo paso:** T-08 (cliente propio de la API de Supabase). Pendiente del dueño: fila 2 de §3
(`000b`), que no bloquea T-08 pero sí `npm run seed` y el modelo de privilegios de `perfil`.

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
