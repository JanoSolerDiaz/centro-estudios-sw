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
  Desde T-11: `centrosEstudios.ts` — `normalizarNombreCentro`/`buscarCentroDuplicado`, comparación de
  nombres acento-insensible y sin distinguir mayúsculas para detectar duplicados en el catálogo, sin
  tocar la base de datos (el `unique` de `centro_estudios.nombre` sigue siendo exacto a propósito).
- `src/datos/` — capa de acceso a Supabase (PostgREST, GoTrue, Storage) por `fetch` nativo. Es la
  única capa autorizada a usar `fetch` (T-08). `src/datos/pruebas/dobleHttp.ts` es el doble de
  `fetch` para tests (T-03): simula respuestas (incluidos `401`, `403`, `409`, cuerpo vacío) y
  fallos de red, sin tocar Supabase.
  - `configuracion.ts` (T-08) — `leerConfiguracionEntorno(origen)` valida `window.__CONFIG__`
    (URL del proyecto y clave anónima, inyectadas por `config.js`, ver más abajo) y lanza
    `ErrorConfiguracionFaltante` con un mensaje claro en español si falta algo. No lee `window`
    directamente: lo recibe como parámetro, igual que `instalarCapturaErrores` con `window`.
  - `erroresDominio.ts` (T-08) — las ocho clases de error de dominio (`NoAutenticado`,
    `SinPermiso`, `Conflicto`, `ErrorDeValidacion`, `ErrorDeRed`, `ErrorDelServidor`,
    `FicheroDemasiadoGrande`, `TipoDeFicheroNoPermitido`) y `errorDeRespuesta(respuesta)`, que
    traduce una `Response` HTTP no exitosa a una de ellas por código de estado. Sus mensajes por
    defecto **no** se muestran nunca directamente al usuario — esa traducción vive en
    `src/nucleo/mensajesAbuso.ts` (T-06), que los amplió.
  - `codificadorValores.ts` (T-08) — `codificarValorFiltro`/`codificarListaFiltro`: el único sitio
    permitido para convertir un valor de filtro en texto de URL de PostgREST (escapado sintáctico
    + `encodeURIComponent`). Nunca se construye un filtro por concatenación de texto sin pasar por
    aquí.
  - `peticionHttp.ts` (T-08) — `peticionAutenticada`, compartida por `postgrest.ts` y
    `almacenamiento.ts`: cabeceras de autenticación, traducción de fallo de red y de respuesta no
    exitosa. Cada cliente añade sus propias cabeceras/cuerpo por encima.
  - `postgrest.ts` (T-08) — `crearClientePostgrest(opciones)`: `cliente.desde<T>('tabla').eq(...)
    .seleccionar('columnas')` (o `.insertar`/`.actualizar`/`.eliminar`) y `cliente.rpc(nombre,
    parametros)`. Subconjunto documentado en la cabecera del propio fichero y en
    `DECISIONES_TECNICAS.md`.
  - `almacenamiento.ts` (T-08) — `crearClienteAlmacenamiento(opciones)`: `subir`, `eliminar`,
    `urlFirmada`, `urlFirmadasEnLote` (esta última en una única petición HTTP, nunca un bucle —
    T-19 lo necesita así). Endpoints de Storage asumidos, sin poder verificarse contra
    documentación en vivo en esta sesión (ver cabecera del fichero).
  - `eventoError.ts` (T-05, reescrito en T-08) — `crearEnviadorEventoError(config)` implementa el
    envío a la RPC `registrar_evento_error` sobre `crearClientePostgrest(...).rpc(...)`, ya no con
    su propio `fetch`. Conectado de verdad desde `src/ui/main.ts`, con el token de sesión si lo hay
    (T-09).
  - `autenticacion.ts` (T-09) — `crearClienteAutenticacion(opciones)`: cliente propio de GoTrue
    (`iniciarSesion`, `cerrarSesion`, `renovarSesion`, `solicitarRecuperacionContrasena`,
    `establecerContrasenaNueva`) sobre `/auth/v1/...`. No reutiliza `peticionHttp.ts` (necesita un
    `Bearer` distinto en cada llamada, no "la sesión actual"); comparte con él la misma traducción
    de errores (`erroresDominio.ts`). `CredencialesInvalidas` es una clase nueva de este módulo,
    fuera de las ocho de T-08 (login con contraseña incorrecta no es lo mismo que "sin sesión").
    Endpoints sin poder verificarse contra documentación en vivo en esta sesión, mismo aviso que
    T-06/T-07/T-08.
  - `centrosEstudios.ts` (T-11) — `listarCentros`/`crearCentro`/`editarNombreCentro`/
    `contarAlumnosActivosDeCentro`/`desactivarCentro`/`reactivarCentro` sobre `postgrest.ts`. El alta
    y la edición de nombre comprueban antes el duplicado acento-insensible
    (`src/dominio/centrosEstudios.ts`) y, si lo hay, devuelven `{ tipo: 'duplicado', existente }` en
    vez de intentar la escritura. Sin `DELETE`: la baja es siempre `activo = false`.

  ### Configuración del cliente (`config.js`)

  Sin bundler no hay `import.meta.env`: `index.html` carga un `config.js` **plano** (JavaScript,
  no pasa por `tsc`) ANTES de `dist/ui/main.js`, que asigna `window.__CONFIG__ = { SUPABASE_URL,
  SUPABASE_ANON_KEY }`. `config.js` está en `.gitignore` y NO se commitea (mismo régimen que
  `.env.local`); `config.ejemplo.js`, commiteado, es la plantilla sin valores. Para desarrollo
  local, copia `config.ejemplo.js` a `config.js` y rellena los dos valores del proyecto `dev`. Sin
  `config.js`, la aplicación arranca igual (verificado en Chromium headless): solo se pierde el
  envío remoto de errores no controlados.
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
  - `mensajesAbuso.ts` (T-06, ampliado en T-08 y T-09) — `mensajeAmigable(error)`: traduce
    `ErrorLimiteAlcanzado`, `AbortError`, las ocho clases de `src/datos/erroresDominio.ts` y, desde
    T-09, `CredencialesInvalidas`/`PerfilInactivo`, a un mensaje fijo en español que dice qué hacer.
    Nunca usa `error.message` para los errores de dominio: el de `Conflicto`/`ErrorDeValidacion`
    puede venir tal cual de Postgres (texto técnico, a veces en inglés); el de
    `CredencialesInvalidas` nunca revela si el email existe.
  - `almacenSesion.ts` (T-09) — `AlmacenSesion` (persistencia de sesión): solo el `refresh_token`,
    nunca el `access_token`. `crearAlmacenSesionWebStorage(storage)` recibe un `Storage` inyectado
    (normalmente `sessionStorage`, nunca `localStorage` — ver `DECISIONES_TECNICAS.md`, riesgo de
    XSS documentado); `crearAlmacenSesionEnMemoria()` para tests.
  - `gestorSesion.ts` (T-09) — `crearGestorSesion(opciones)`: junta `autenticacion.ts` (GoTrue) +
    `postgrest.ts` (para cargar el `perfil` propio) + `almacenSesion.ts`. `EstadoSesion` observable
    (`suscribir`/`obtenerEstado`) con tres valores: `restaurando`/`sin_sesion`/`autenticado`. Un
    `perfil.activo = false` nunca llega a `autenticado` (lanza `PerfilInactivo`, revoca en el
    servidor). `renovarAlAbrirPasarLista()` es el único punto de renovación — **siempre proactivo**,
    nunca reactivo a un `401` (lo llamará T-19 al montar la pantalla de pasar lista); una renovación
    fallida no cierra la sesión ni descarta el estado.
  - `enlaceRecuperacion.ts` (T-09) — `parsearParametrosRecuperacion(hash)`: función pura que
    reconoce el fragmento de URL que GoTrue añade al volver del enlace de recuperación del correo
    (`#access_token=...&type=recovery`).
- `src/ui/` — DOM nativo. `src/ui/main.ts` es el punto de entrada que carga `index.html`; delega en
  funciones puras sobre un `HTMLElement` ya obtenido para que se puedan testear montando un
  contenedor con `jsdom`. Ninguna función de pantalla toca el `document` global directamente: reciben
  el `Document` como parámetro, normalmente `contenedor.ownerDocument` (T-09). Desde T-05 instala la
  captura global de errores no controlados; desde T-08 el envío remoto es real (lee
  `window.__CONFIG__`); desde T-09 conecta `gestorSesion` real (con `sessionStorage`) y enruta con
  `aplicacion.ts`. Sin `config.js` (o si falta), sigue cayendo a la pantalla mínima de T-00, sin
  fallar el arranque.
  - `formularios.ts` (T-09) — helpers de formulario accesible compartidos por las pantallas de
    autenticación: `crearCampoTexto`, `crearZonaMensaje` (`role="alert"`/`"status"`, enfocable por
    programa), `crearBoton`. Objetivos táctiles ≥44px y 16px de fuente (evita el zoom de iOS) fijados
    aquí, en estilos en línea — el proyecto no tiene todavía ninguna hoja de estilos.
  - `pantallaLogin.ts`, `pantallaRecuperarContrasena.ts`, `pantallaEstablecerContrasenaNueva.ts`,
    `pantallaSinAcceso.ts` (T-09) — una función `mostrarPantallaX(contenedor, deps)` por pantalla,
    con sus dependencias inyectadas (nunca llaman directamente a `gestorSesion.ts`). La de
    recuperación responde igual exista o no la cuenta; la de nueva contraseña valida localmente
    (coincidencia, longitud mínima) antes de gastar una petición; la de sin acceso no hace ninguna
    llamada a datos, solo pinta el `Perfil` que ya le pasan.
  - `aplicacion.ts` (T-09) — `iniciarAplicacion(contenedor, { gestorSesion, hashUrl })`: el
    enrutador. Hash de recuperación → pantalla de nueva contraseña; si no, según `EstadoSesion` →
    login/recuperar, o según `perfil.rol` → un marcador de posición para `administrator`/`teacher`
    (su aplicación real nace en T-16/T-19) o `pantallaSinAcceso` para `student` y cualquier rol
    desconocido (nunca se trata como `teacher`).
  - `pantallaCentros.ts` (T-11) — `mostrarPantallaCentros(contenedor, deps)`: catálogo de centros de
    estudios (listar con filtro de estado y búsqueda, crear, editar el nombre, desactivar,
    reactivar). Standalone y testeada por su cuenta, todavía **sin enrutar** dentro de la aplicación
    real (`aplicacion.ts` sigue con el marcador de posición de T-09 hasta que T-16 construya el
    router y la monte). La escritura se oculta para `teacher` con `puedeGestionarCentros`
    (`permisosUi.ts`) — presentación, no control de acceso: el servidor la rechaza igual por RLS. La
    baja pide confirmación mostrando cuántos alumnos activos apuntan al centro (sin impedirla: siguen
    siendo válidos después). El alta/edición de nombre nunca inserta un duplicado acento-insensible:
    ofrece el existente (`src/dominio/centrosEstudios.ts` + `src/datos/centrosEstudios.ts`).
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

## Bloqueo de cuenta y desbloqueo manual (P-01)

Desde `002_bloqueo_cuenta.sql`, `perfil` bloquea a un usuario (`bloqueado = true`) al tercer intento
fallido de contraseña, y **eso alcanza también al `administrator`** — es la única forma de que el
bloqueo sea real y no un adorno: si el propio administrador pudiera saltárselo, cualquiera que
supiera su email podría dejar fuera a todos los demás sin que nadie pudiera arreglarlo desde la
aplicación. La vía normal de desbloqueo es la RPC `admin_desbloquear_usuario(p_usuario_id)`, que
solo funciona si quien la llama **ya** tiene rol `administrator` — es decir, no sirve si el único
administrador activo es precisamente quien está bloqueado.

Para ese caso (o para cualquier incidente en el que la aplicación no sea una vía posible), **la
única vía de escape es el editor SQL del panel de Supabase, y solo la tiene el dueño** — decisión
expresa del dueño el 2026-08-27 (§6 pregunta #5 de `SEGUIMIENTO.md`), misma lógica que ya rige para
el arranque manual de `db/000_bootstrap_perfil.sql`. La consulta exacta:

```sql
-- Desbloquea una cuenta directamente, sin pasar por la RPC (que exige ser ya administrator).
-- Sustituye el email por el de la cuenta bloqueada.
update public.perfil
   set bloqueado = false,
       intentos_fallidos = 0
 where id = (select id from auth.users where email = 'EMAIL_DE_LA_CUENTA_BLOQUEADA');

-- Verifica el resultado:
select p.nombre, p.rol, p.activo, p.bloqueado, p.intentos_fallidos, u.email
  from public.perfil p
  join auth.users u on u.id = p.id
 where u.email = 'EMAIL_DE_LA_CUENTA_BLOQUEADA';
```

Esto **nunca** requiere conocer ni fijar una contraseña: renovar la contraseña de un usuario
(bloqueado o no) sigue siendo disparar el correo de recuperación (`solicitarRecuperacionContrasena`,
T-09), nunca que el administrador —ni el dueño— fije una nueva.

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
