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
