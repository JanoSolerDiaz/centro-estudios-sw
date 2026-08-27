# DEVELOPERS — GestorAcademia

> Guía práctica para poner en marcha el proyecto en local. La visión de producto está en
> `PROYECTO.md`; el protocolo de desarrollo y el estado de las tareas, en `roadmap/`.

## Requisitos

- Node.js **22.22 o superior** (usa el stripping nativo de tipos de TypeScript; sin él, `npm test`
  no puede ejecutar los ficheros `.ts` directamente). La versión exacta usada en desarrollo y en CI
  está fijada en `.nvmrc` (`nvm use` si usas `nvm`).
- Sin base de datos local: el proyecto habla con Supabase por API REST. El entorno de desarrollo
  (`dev`) ya existe; sus credenciales viven en `.env.local`, que **no está en el repositorio**.
  `npm run migrate` y `npm run seed` cargan ese fichero por sí mismos
  (`herramientas/cargarEnvLocal.ts`): no hace falta exportar nada a mano ni instalar `dotenv`.

## Arranque

```
npm install          # también instala el hook de pre-commit (script `prepare`, ver abajo)
npm run typecheck   # tsc --noEmit (strict) sobre src/ + tsc --noEmit -p tsconfig.herramientas.json
npm run lint        # eslint . — estricto y type-aware (typescript-eslint strictTypeChecked) en ambos árboles
npm test            # node --test sobre src/**/*.test.ts y herramientas/**/*.test.ts, sin red y sin ninguna variable de entorno
npm run build        # tsc -b tsconfig.build.json -> dist/ (ES modules nativos, sin bundler; excluye los tests)
npm run migrate      # runner de migraciones (T-07) — solo el dueño, necesita SUPABASE_ACCESS_TOKEN
npm run seed         # semilla de desarrollo (T-07) — solo el dueño, necesita SUPABASE_SERVICE_ROLE_KEY_DEV
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
  fallos de red, sin tocar Supabase. `eventoError.ts` (T-05) implementa el envío a la RPC
  `registrar_evento_error` — escrito y testeado contra el doble, pero **latente**: nadie lo conecta
  todavía porque no hay ni tabla (T-07) ni cliente real con URL/clave anónima (T-08).
- `src/nucleo/` — infraestructura transversal usada por toda la aplicación:
  - `registro.ts` (T-02) — logger centralizado, único fichero con permiso ESLint para
    `console.*`: entradas estructuradas (nivel, instante, mensaje, contexto), nivel configurable, y
    depuración automática del `contexto` que descarta datos personales de alumnos y personas de
    referencia, rutas de avatar, y cualquier campo con aspecto de token o de clave (por nombre de
    campo o por forma del valor). El texto de `mensaje` no se depura: es una cadena fija escrita
    por quien programa, nunca debe llevar datos de usuario.
  - `reloj.ts` (T-03) — `Reloj` inyectable; `relojDelSistema` es la única implementación real
    (`new Date()`) y vive fuera de `src/dominio/` a propósito.
  - `informadorErrores.ts` (T-05) — `crearInformadorErrores(logger, enviar?)`: depura (reusa
    `depurarContexto`) y registra en local cualquier error capturado; con `enviar` (opcional,
    implementado en `src/datos/eventoError.ts`) intenta además persistirlo en `evento_error`, sin
    dejar nunca que un fallo de `enviar` provoque una segunda llamada (recursión) ni un rechazo sin
    capturar.
  - `capturaErrores.ts` (T-05) — `instalarCapturaErrores(objetivo, informador)` conecta los eventos
    globales `error`/`unhandledrejection` de un `objetivo` inyectado (nunca lee `window`
    directamente) con un `InformadorErrores`.
  - `limitadorTasa.ts` (T-06) — `crearLimitadorTasa({ maximo, ventanaMs, reloj })`: contador por
    clave y ventana fija, con `Reloj` inyectado; lanza `ErrorLimiteAlcanzado` (error identificable,
    con `reintentarEnMs`) al superar el máximo. Pieza de cliente para defensa en profundidad — el
    límite autoritativo vive en la futura RPC de PostgreSQL (T-14/T-18/T-21); ver el contrato
    recomendado en `DECISIONES_TECNICAS.md`.
  - `proteccionDobleToque.ts` (T-06) — `crearProtectorDobleToque(operacion)`: mientras una llamada
    esté en curso, cualquier llamada adicional recibe la misma promesa en vez de disparar una
    segunda ejecución (protección contra doble toque en escrituras no idempotentes).
  - `temporizador.ts` (T-06) — `Temporizador` inyectable, hermano de `Reloj` pero para esperas
    (`esperar(ms)`), no para el instante actual; `temporizadorReal` usa `setTimeout`,
    `crearTemporizadorDePrueba` no espera de verdad y registra los `ms` pedidos, para tests
    deterministas del retroceso exponencial.
  - `reintento.ts` (T-06) — `reintentarConRetroceso(operacion, opciones)`: retroceso exponencial
    acotado con `Temporizador` inyectado. Solo para operaciones idempotentes (lecturas, o
    escrituras protegidas por `peticion_id` único); nunca envolver aquí una escritura que no lo sea.
  - `controlPeticion.ts` (T-06) — `crearEjecutorUltimaPeticion()` (cancela la petición anterior en
    cuanto empieza una nueva) y `conTiempoDeEspera(operacion, ms)` (aborta si no resuelve a
    tiempo), sobre `AbortController`/`AbortSignal` nativos.
  - `mensajesAbuso.ts` (T-06) — `mensajeAmigable(error)`: traduce `ErrorLimiteAlcanzado` y
    `AbortError` a un mensaje en español que dice qué hacer, nunca el error técnico. T-08 lo amplía
    con el resto de la taxonomía de errores de dominio cuando exista.
- `src/ui/` — DOM nativo. `src/ui/main.ts` es el punto de entrada que carga `index.html`; delega en
  funciones puras sobre un `HTMLElement` ya obtenido (p. ej. `pantallaInicial.ts`) para que se
  puedan testear montando un contenedor con `jsdom` en vez de depender del `document` global. Desde
  T-05, también instala la captura global de errores no controlados (sin envío remoto todavía: la
  tabla `evento_error` nace en T-07 y el cliente real de Supabase en T-08).
- `db/` — scripts de migración SQL (`NNN_<nombre>.sql`) y `db/MODELO.md` con el modelo de datos en
  español, legible sin saber SQL. El agente los escribe pero **nunca los aplica**: los aplica el
  dueño con `npm run migrate` (T-07). A partir de `001`, los ficheros son DDL plano (sin
  `begin`/`commit` propios ni alta en el ledger): el runner los envuelve él mismo. Solo `000`/`000b`
  (bootstrap manual, aplicado a mano antes de que existiera el runner) se autocontienen.
- `herramientas/` — scripts de Node ejecutados directamente con `node herramientas/<script>.ts` (el
  *type-stripping* nativo de Node evita necesitar `ts-node`). Tiene su propio `tsconfig.herramientas.json`
  (Node puro, sin DOM) y su propio bloque de ESLint estricto *type-aware* en `eslint.config.js`
  (`parserOptions.project` explícito — `projectService` no vale aquí, ver `DECISIONES_TECNICAS.md`).
  No hereda las restricciones de stack de `src/` (`fetch`, `console`, `process` sí están permitidos):
  son guardas del código de navegador, y esto es tooling de Node.
  - `herramientas/migrar.ts` (`npm run migrate`, T-07) — CLI del runner de migraciones. Lee
    `db/NNN_*.sql`, valida las guardas de contenido, comprueba inmutabilidad por hash contra
    `esquema_migracion`, y aplica los pendientes contra la Management API envolviendo cada uno en
    una transacción con su alta en el ledger. `--estado` solo lee; `--verificar-privilegios` hace el
    barrido en vivo de `information_schema.role_table_grants` (punto 20b). Apuntar a `prod` exige
    `--entorno=prod` **y** `PERMITIR_PROD=1`. Toda la lógica real vive en `herramientas/migraciones/`
    (`guardas.ts`, `hash.ts`, `archivosMigracion.ts`, `clienteManagementApi.ts`, `entorno.ts`,
    `runner.ts`, `verificarPrivilegios.ts`), testeada contra un doble de `fetch`
    (`herramientas/migraciones/pruebas/dobleFetch.ts`) — `migrar.ts` en sí es solo wiring, sin test
    directo, igual que `src/ui/main.ts`. **El endpoint exacto de la Management API no se ha podido
    verificar contra documentación en vivo** (sin salida de red a `supabase.com` en esta sesión); si
    `npm run migrate` da un `404`, es el primer sospechoso.
  - `herramientas/seed.ts` (`npm run seed`, T-07) — semilla de desarrollo: crea los tres roles de
    usuario y datos ficticios de alumnos/centros/personas de referencia. Necesita
    `SUPABASE_SERVICE_ROLE_KEY_DEV` (mismo régimen que el access token: solo en `.env.local` del
    dueño, nunca en el entorno de un agente) porque hoy no hay ninguna política RLS (T-10) que deje
    escribir de otra forma. Idempotente por comprobación, no por upsert. Lógica en
    `herramientas/semilla/` (`datosFicticios.ts`, `clienteAdmin.ts`, `entorno.ts`).
  - `herramientas/cargarEnvLocal.ts` — carga `.env.local` en `process.env` para los dos CLI de
    arriba, con `process.loadEnvFile` (nativo de Node, sin dependencia). Existe porque faltaba: los
    dos leían `process.env` y nadie lo poblaba, así que `npm run migrate` daba "Falta
    SUPABASE_ACCESS_TOKEN" con un `.env.local` correcto. La ruta se resuelve desde `import.meta.url`
    y no desde el `cwd`, no pisa las variables que ya vengan del entorno (los secretos del CI ganan
    al fichero) y si el fichero no existe lo dice y sigue. Tests en `cargarEnvLocal.test.ts`.

## Suite de tests (T-03)

`npm test` ejecuta `node --test` (nativo, sin dependencia de runtime) sobre `src/**/*.test.ts` **y**
`herramientas/**/*.test.ts` (T-07 amplió el glob), sin red real y **sin ninguna variable de entorno
definida** — si un test necesita una credencial o tocar la red, está mal planteado: hay que
doblarlo. Tres niveles en `src/`, todos con al menos un test real:

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

## Integración continua (T-04)

`.github/workflows/ci.yml` ejecuta `npm ci` seguido de `typecheck`, `lint`, `test` y `build`, en
ese orden, en cada push a `develop` y a `master`. La versión de Node la fija `.nvmrc`
(`node-version-file` de `actions/setup-node`), la misma que se usa en desarrollo. El workflow no
declara ningún secreto: la verificación no necesita credenciales de Supabase porque toda la suite
de tests corre contra dobles (ver arriba), y si algún día un test las pidiera sería la señal de que
ese test está mal planteado y hay que doblarlo, no de que al workflow le falte un secreto.

## Sobre las importaciones `.ts`

El código fuente importa módulos hermanos con extensión `.ts` (p. ej.
`import { x } from './y.ts'`), no `.js`. Esto permite que `node --test` ejecute los ficheros
`.ts` de origen directamente, sin paso de build. `tsc` reescribe esas extensiones a `.js` al
compilar (`rewriteRelativeImportExtensions`), así que `dist/` queda con imports `.js` válidos
para que el navegador los cargue como ES modules nativos, sin bundler.

## Cuidado: las propiedades de parámetro de TypeScript no funcionan aquí

`constructor(readonly x: string)` (el azúcar sintáctico que declara y asigna un campo a la vez)
**no funciona en ningún fichero de este proyecto**, ni dentro ni fuera de `src/`. El *type-stripping*
nativo de Node no lo soporta y falla en **tiempo de ejecución** con
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript parameter property is not supported in strip-only mode`
— un error que **ni `tsc --noEmit` ni ESLint detectan**, solo aparece al ejecutar `npm test` de
verdad. Declara el campo aparte y asígnalo a mano en el cuerpo del constructor (ver
`src/nucleo/limitadorTasa.ts`, `ErrorLimiteAlcanzado`, o cualquiera de las clases de error de
`herramientas/migraciones/` y `herramientas/semilla/`).

## Stack fijado

VanillaJS + TypeScript, DOM nativo, sin frameworks ni SDK de Supabase (`@supabase/supabase-js`
está vetado), sin bundler. `dependencies` de `package.json` permanece vacío; ver §0.2 de
`roadmap/HOJA_DE_RUTA.md` para el detalle completo y el porqué.
