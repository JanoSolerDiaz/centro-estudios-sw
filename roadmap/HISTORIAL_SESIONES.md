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
**Próximo paso:** T-05 (monitorización de errores). El workflow de CI no se puede verificar en verde
en GitHub Actions desde esta sesión (no hay forma de disparar ni leer un run remoto sin acceso a
Actions); queda verificado localmente con `env -i` reproduciendo exactamente los mismos comandos que
ejecuta el job, y su primer run real será el propio push de este commit a `develop`.

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
