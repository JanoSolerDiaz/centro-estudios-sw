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
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint . — estricto y type-aware (typescript-eslint strictTypeChecked)
npm test            # node --test sobre src/**/*.test.ts (se puebla desde T-03)
npm run build        # tsc -b -> dist/ (ES modules nativos, sin bundler)
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

- `src/dominio/` — lógica de negocio pura, sin efectos ni acceso a red. Reloj inyectable: ninguna
  función de aquí lee la hora del sistema directamente (ver T-03).
- `src/datos/` — capa de acceso a Supabase (PostgREST, GoTrue, Storage) por `fetch` nativo. Es la
  única capa autorizada a usar `fetch` (T-08).
- `src/nucleo/` — infraestructura transversal usada por toda la aplicación. Hoy solo el logger
  centralizado (`registro.ts`, T-02): entradas estructuradas (nivel, instante, mensaje, contexto),
  nivel configurable, y depuración automática del `contexto` que descarta datos personales de
  alumnos y personas de referencia, rutas de avatar, y cualquier campo con aspecto de token o de
  clave (por nombre de campo o por forma del valor). El texto de `mensaje` no se depura: es una
  cadena fija escrita por quien programa, nunca debe llevar datos de usuario.
- `src/ui/` — DOM nativo. `src/ui/main.ts` es el punto de entrada que carga `index.html`.
- `db/` — scripts de migración SQL (`NNN_<nombre>.sql`) y `db/MODELO.md` con el modelo de datos en
  español. El agente los escribe pero **nunca los aplica**: los aplica el dueño con
  `npm run migrate` (T-07).
- `herramientas/` — scripts de Node ejecutados directamente con `node herramientas/<script>.ts`
  (el stripping nativo de tipos evita necesitar `ts-node`), como el runner de migraciones.

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
