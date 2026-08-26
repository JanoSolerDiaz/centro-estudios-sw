# DEVELOPERS — GestorAcademia

> Guía práctica para poner en marcha el proyecto en local. La visión de producto está en
> `PROYECTO.md`; el protocolo de desarrollo y el estado de las tareas, en `roadmap/`.

## Requisitos

- Node.js **22.22 o superior** (usa el stripping nativo de tipos de TypeScript; sin él, `npm test`
  no puede ejecutar los ficheros `.ts` directamente).
- Sin base de datos local: el proyecto habla con Supabase por API REST. El entorno de desarrollo
  (`dev`) ya existe; sus credenciales viven en `.env.local`, que **no está en el repositorio**.

## Arranque

```
npm install          # también instala el hook de pre-commit (script `prepare`, ver abajo)
npm run typecheck   # tsc --noEmit (strict), sobre todo src/, incluidos los tests
npm run lint        # eslint . — estricto y type-aware (typescript-eslint strictTypeChecked)
npm test            # node --test sobre src/**/*.test.ts, sin red y sin ninguna variable de entorno
npm run build        # tsc -b tsconfig.build.json -> dist/ (ES modules nativos, sin bundler; excluye los tests)
```

Para ver la página, sirve el directorio raíz con cualquier servidor estático (por ejemplo
`npx serve .` o `python3 -m http.server`) y abre `index.html`. El navegador carga
`dist/ui/main.js`, así que hace falta `npm run build` antes de abrirlo.

## Hook de pre-commit

`npm install` ejecuta el script `prepare`, que copia `herramientas/git-hooks/pre-commit` a
`.git/hooks/pre-commit` (nunca se toca `git config`: es una copia de fichero, no un cambio de
configuración compartida). El hook ejecuta la verificación completa
(`typecheck && lint && test && build`) antes de cada commit local. Si necesitas saltártelo una
vez de forma consciente, `git commit --no-verify`; si el hook no se instaló (por ejemplo, tras
clonar sin `npm install`), vuelve a generarlo con `npm run prepare`.

## Reglas de ESLint que defienden el stack por herramienta

Además de la configuración estricta *type-aware* de `typescript-eslint`, `eslint.config.js`
incluye reglas propias que hacen fallar el lint (no solo lo documentan) si `src/` contiene:

- un import de un paquete de terceros (cualquier especificador que no sea relativo o
  `node:...`), con `@supabase/supabase-js` vetado explícitamente;
- `innerHTML` (lectura o escritura);
- `console.*` fuera del logger centralizado (`src/nucleo/registro.ts`, T-02; es el único fichero
  con permiso para usarlo);
- `fetch` fuera de `src/datos/**` (la capa de acceso a Supabase, T-08);
- `process`, `Buffer`, `require`, `__dirname` y `__filename` en cualquier fichero de `src/`: son
  globales de Node que `@types/node` declara para todo el programa (hace falta para tipar
  `node:test`/`node:assert` en los tests) pero que no existen en el navegador; `tsc` no los
  detecta porque para él son válidos, así que la guarda vive en ESLint.

No se ha añadido Prettier ni ningún formateador como dependencia: la política de
`devDependencies` (§0.2 de `roadmap/HOJA_DE_RUTA.md`) la deja fuera de la lista permitida. El
formato consistente se apoya en `.editorconfig` (indentación, fin de línea, salto final) y en las
reglas de estilo de `typescript-eslint` (`stylisticTypeChecked`).

## Estructura

- `src/dominio/` — lógica de negocio pura, sin efectos ni acceso a red. **Reloj inyectable**:
  ninguna función de aquí lee la hora del sistema directamente (`new Date()`/`Date.now()`); reciben
  un `Reloj` (`src/nucleo/reloj.ts`) como parámetro. Se comprueba automáticamente con
  `src/dominio/disciplinaReloj.test.ts`, que recorre el filesystem y falla si aparece una lectura
  directa. Desde T-03: `slots.ts` (vigencia de un slot de horario y quién toca ahora) y
  `asistencia.ts` (no-retroactividad y quién puede editar un registro) — versión provisional con
  tipos propios, T-07/T-15/T-17/T-18/T-21 las amplían con los tipos oficiales del esquema real.
- `src/datos/` — capa de acceso a Supabase (PostgREST, GoTrue, Storage) por `fetch` nativo. Es la
  única capa autorizada a usar `fetch` (T-08). `src/datos/pruebas/dobleHttp.ts` es el doble de
  `fetch` para tests (T-03): simula respuestas (incluidos `401`, `403`, `409`, cuerpo vacío) y
  fallos de red, sin tocar Supabase.
- `src/nucleo/` — infraestructura transversal usada por toda la aplicación:
  - `registro.ts` (T-02) — logger centralizado, único fichero con permiso ESLint para
    `console.*`: entradas estructuradas (nivel, instante, mensaje, contexto), nivel configurable, y
    depuración automática del `contexto` que descarta datos personales de alumnos y personas de
    referencia, rutas de avatar, y cualquier campo con aspecto de token o de clave (por nombre de
    campo o por forma del valor). El texto de `mensaje` no se depura: es una cadena fija escrita
    por quien programa, nunca debe llevar datos de usuario.
  - `reloj.ts` (T-03) — `Reloj` inyectable; `relojDelSistema` es la única implementación real
    (`new Date()`) y vive fuera de `src/dominio/` a propósito.
- `src/ui/` — DOM nativo. `src/ui/main.ts` es el punto de entrada que carga `index.html`; delega en
  funciones puras sobre un `HTMLElement` ya obtenido (p. ej. `pantallaInicial.ts`) para que se
  puedan testear montando un contenedor con `jsdom` en vez de depender del `document` global.
- `db/` — scripts de migración SQL (`NNN_<nombre>.sql`) y `db/MODELO.md` con el modelo de datos en
  español. El agente los escribe pero **nunca los aplica**: los aplica el dueño con
  `npm run migrate` (T-07).
- `herramientas/` — scripts de Node ejecutados directamente con `node herramientas/<script>.ts`
  (el stripping nativo de tipos evita necesitar `ts-node`), como el runner de migraciones.

## Suite de tests (T-03)

`npm test` ejecuta `node --test` (nativo, sin dependencia de runtime) sobre `src/**/*.test.ts`, sin
red real y **sin ninguna variable de entorno definida** — si un test necesita una credencial o
tocar la red, está mal planteado: hay que doblarlo. Tres niveles, todos con al menos un test real:

1. **Dominio** (`src/dominio/*.test.ts`) — lógica de negocio pura con el reloj inyectado
   (`crearRelojFijo`), sin ningún doble ni mock.
2. **Datos** (`src/datos/**/*.test.ts`) — contra `crearFetchSimulado`/`crearFetchSimuladoConErrorDeRed`
   de `src/datos/pruebas/dobleHttp.ts`, que imitan la firma de `fetch` para simular PostgREST,
   GoTrue y Storage (incluidos errores `401`/`403`/`409` y respuestas vacías) sin red real.
3. **UI** (`src/ui/*.test.ts`) — con `jsdom` (única `devDependency` de test permitida, §0.2): monta
   un contenedor real y afirma sobre sus nodos, sin navegador.

`jsdom` solo puede importarse dentro de ficheros `*.test.ts`: `eslint.config.js` tiene un override
específico para esa ruta que añade esa única excepción al veto general de paquetes de terceros en
`src/` — cualquier otro import de tercero en un test sigue fallando el lint igual que en el resto
del código.

## Sobre las importaciones `.ts`

El código fuente importa módulos hermanos con extensión `.ts` (p. ej.
`import { x } from './y.ts'`), no `.js`. Esto permite que `node --test` ejecute los ficheros
`.ts` de origen directamente, sin paso de build. `tsc` reescribe esas extensiones a `.js` al
compilar (`rewriteRelativeImportExtensions`), así que `dist/` queda con imports `.js` válidos
para que el navegador los cargue como ES modules nativos, sin bundler.

## Stack fijado

VanillaJS + TypeScript, DOM nativo, sin frameworks ni SDK de Supabase (`@supabase/supabase-js`
está vetado), sin bundler. `dependencies` de `package.json` permanece vacío; ver §0.2 de
`roadmap/HOJA_DE_RUTA.md` para el detalle completo y el porqué.
