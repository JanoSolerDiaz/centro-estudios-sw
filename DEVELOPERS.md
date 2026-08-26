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
npm install
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint . (se configura en T-01)
npm test            # node --test sobre src/**/*.test.ts (se puebla desde T-03)
npm run build        # tsc -b -> dist/ (ES modules nativos, sin bundler)
```

Para ver la página, sirve el directorio raíz con cualquier servidor estático (por ejemplo
`npx serve .` o `python3 -m http.server`) y abre `index.html`. El navegador carga
`dist/ui/main.js`, así que hace falta `npm run build` antes de abrirlo.

## Estructura

- `src/dominio/` — lógica de negocio pura, sin efectos ni acceso a red. Reloj inyectable: ninguna
  función de aquí lee la hora del sistema directamente (ver T-03).
- `src/datos/` — capa de acceso a Supabase (PostgREST, GoTrue, Storage) por `fetch` nativo. Es la
  única capa autorizada a usar `fetch` (T-08).
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
