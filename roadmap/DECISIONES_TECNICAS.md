# DECISIONES TÉCNICAS — GestorAcademia

> Registro **append-only** de decisiones técnicas tomadas de forma autónoma (antiguo §2 de
> SEGUIMIENTO). Es la sección que **sustituye a la revisión de código**: el dueño audita aquí.
>
> Disciplina del programador:
> - **Consulta** este documento (en el área que vas a tocar) ANTES de cualquier decisión técnica
>   no trivial, para no contradecir decisiones previas.
> - **Añade** cada nueva decisión relevante al cerrar la sesión (no edites ni borres filas previas).
> - Si una decisión es **norma permanente** ("usamos X, no reintroducir Y"), promuévela además a
>   §0.2 de `HOJA_DE_RUTA.md`, que se lee en cada sesión.
>
> En este proyecto hay dos áreas donde la decisión debe quedar SIEMPRE registrada, por ser las que
> el auditor contrasta: (a) todo lo relativo al esquema, políticas RLS y RPC — incluida la matriz
> rol × tabla × operación de T-10; y (b) el alcance del cliente propio de PostgREST (qué
> subconjunto se implementa y qué obligaría a ampliarlo), para que no crezca sin control.
>
> Rotación: si crece mucho, archivar por trimestre en `roadmap/DECISIONES_TECNICAS/AAAA-Tn.md`
> con un índice al inicio.

| Fecha | Tarea | Decisión | Alternativas consideradas | Por qué |
|-------|-------|----------|---------------------------|---------|
| 2026-08-26 | T-00 | TypeScript fijado en la línea **5.9.x** (`^5.9.3`), no la 7.0.x que acaba de publicarse | TypeScript 7.0.2 (el compilador nativo reescrito) | `typescript-eslint` 8.68.0 declara como peer `typescript >=4.8.4 <6.1.0`: instalar 7.0.x rompe `npm install` en cuanto se añade ESLint (necesario para T-01, que exige lint type-aware). 5.9.3 es la última estable de la línea que sí soporta todo el ecosistema type-aware que va a hacer falta. Revisar en una sesión futura si el ecosistero (`typescript-eslint`) ya soporta la 7.x antes de plantear la subida. |
| 2026-08-26 | T-00 | El código fuente importa módulos hermanos con extensión `.ts` (p. ej. `import { x } from './y.ts'`), no `.js`. `tsconfig.json` activa `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` | (a) Importar con `.js` desde el origen, que es lo habitual, pero entonces `node --test` no puede ejecutar `src/**/*.test.ts` directamente (Node no reescribe `.js`→`.ts` al resolver, comprobado empíricamente: falla con `ERR_MODULE_NOT_FOUND`); (b) usar un bundler o `ts-node`/`tsx`, vetado por el stack fijado (§0.2, sin bundler, sin dependencias de runtime) | Node 22.22 hace *stripping* nativo de tipos por defecto (sin flag), así que puede ejecutar `.ts` directamente si los especificadores de import usan la extensión real del fichero en disco (`.ts`). `tsc` reescribe esas extensiones a `.js` en `dist/` al compilar, así que el navegador sigue cargando ES modules nativos válidos. Esto es lo que hace viable el requisito de T-03 de que `npm test` recorra `**/*.test.ts` sin paso de build ni `ts-node`. Documentado también en `DEVELOPERS.md`. |
| 2026-08-26 | T-00 | `tsconfig.json` único en la raíz, con `rootDir: "src"` — `herramientas/` queda **fuera** de su `include` por ahora (directorio vacío, solo `.gitkeep`) | Incluir ya `herramientas/**/*.ts` en el mismo `tsconfig.json` | `herramientas/` (el runner de migraciones) es código de Node puro, sin DOM, con su propio ciclo de vida (T-07); meterlo ya en el `include` habría forzado a decidir ahora mismo su libería/outDir sin tener código real que lo justifique. T-07 decide si lo añade a este mismo `tsconfig.json` (ampliando `include`) o si crea uno propio — queda anotado aquí para que esa sesión no lo pase por alto. |
| 2026-08-26 | T-00 | `eslint.config.js` mínimo (`@eslint/js` recomendado + `typescript-eslint` recomendado, sin reglas *type-aware* ni las reglas propias de guarda del stack) | No instalar ESLint todavía y dejar `npm run lint` fallando hasta T-01 | El protocolo exige la verificación pre-push completa (`typecheck && lint && test && build`) en cada push, incluido el de T-00. Sin un ESLint mínimo, `npm run lint` no existe como comando ejecutable. Esta configuración es deliberadamente mínima: T-01 la sustituye por la configuración estricta *type-aware* y añade las reglas que defienden el stack por herramienta (prohibir imports de terceros con `@supabase/supabase-js` nombrado explícitamente, prohibir `innerHTML`, prohibir `console.*` fuera del logger, prohibir `fetch` fuera de la capa de datos) y el hook de pre-commit — ninguno de esos requisitos de T-01 queda cubierto todavía. |
| 2026-08-26 | T-00 | Verificación de "la página abre en el navegador y ejecuta el módulo compilado" (criterio de aceptación de T-00) hecha con el Chromium headless preinstalado del entorno, lanzado por línea de comandos contra un servidor estático mínimo, sin añadirlo como dependencia del proyecto | Playwright/Puppeteer como `devDependency` | La lista de `devDependencies` de herramienta permitida (§0.2) es `typescript, eslint, @types/*, jsdom` — no incluye un driver de navegador. La comprobación fue manual, de esta sesión, no forma parte de la suite de tests (que en T-03 usará `jsdom`, sin red ni navegador real). |
