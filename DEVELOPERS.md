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
  directa. `slots.ts` (motor "quién toca ahora": zona horaria real vía `Intl`, ventana de
  tolerancia, reescrito por completo en T-17 sobre el tipo oficial `SlotHorario`) y `asistencia.ts`
  (no-retroactividad, coherencia de origen/slot_id, ventana retroactiva máxima, quién puede
  registrar en nombre de otro y quién puede editar un registro — reescrito por completo en T-18
  sobre el tipo oficial `Rol`) nacieron en T-03 como versión provisional con tipos propios; ambas
  quedan ya sobre los tipos oficiales del esquema real (`src/dominio/tipos.ts`). Desde T-21,
  `asistencia.ts` añade `motivoAnulacionValido`/`puedeCambiarSlotAtribuido` (misma condición que
  valida la RPC `actualizar_asistencia`, para deshabilitar un botón antes de que el servidor tenga
  que rechazarlo); `puedeEditarAsistencia` (ventana de edición) ya existía desde T-03/T-18 y ahora la
  consume de verdad `actualizar_asistencia`. `slots.ts` añade `fechaLocalISO` (T-21, valor por
  defecto de un `<input type="date">`). `tipos.ts` gana `ETIQUETA_DIA_SEMANA` (T-21, promovida desde
  una constante local de `pantallaFichaAlumno.ts`, mismo criterio que `ETIQUETA_ROL`).
  Desde T-11: `centrosEstudios.ts` — `normalizarNombreCentro`/`buscarCentroDuplicado`, comparación de
  nombres acento-insensible y sin distinguir mayúsculas para detectar duplicados en el catálogo, sin
  tocar la base de datos (el `unique` de `centro_estudios.nombre` sigue siendo exacto a propósito).
  Desde T-12: `alumno.ts` — `normalizarNombrePersona`/`normalizarTelefonoAlumno` y los dos regex de
  validación (email, teléfono español), EXACTOS a los `CHECK` de `001_esquema_inicial` para que un
  valor válido en cliente lo sea también en la base de datos; `nombreCompletoAlumno` (única función
  que compone el nombre para mostrar) y `compararAlumnosParaOrden` (orden a la española con
  `localeCompare('es', { sensitivity: 'base' })`, no por puntos de código Unicode).
  Desde T-13: `personaReferencia.ts` — reexporta la normalización/validación de `alumno.ts` (mismos
  regex que los `CHECK` de `persona_referencia`, no duplicados) y añade
  `buscarPersonaReferenciaDuplicada` (mismo nombre completo, acento-insensible, y mismo teléfono, que
  otra persona de referencia ya existente del mismo alumno): es un aviso, no un bloqueo, calculado en
  el cliente contra las personas ya cargadas.
  Desde T-20: `busquedaAlumnoExtra.ts` — `debeBuscar(texto)` (umbral de dos caracteres, requisito 2)
  y `resultadosParaMostrar(resultados)`, que marca `esHomonimo` cuando dos resultados de la MISMA
  búsqueda comparten nombre completo — es lo único que decide si el combobox pinta el centro junto
  al nombre (requisito 3: "el centro cuando hay homónimos", no siempre).
  Desde T-23: `slots.ts` añade `fechaHoraLocalLegible` (`DD/MM/AAAA HH:MM`, para las dos horas del
  histórico, en pantalla y en el CSV). `historicoAsistencia.ts` (nuevo) — `tieneModificaciones`
  (`actualizado_en !== null`, sin consultar `asistencia_historial`) y
  `filaCsvHistorico`/`cabecerasCsvHistorico`/`generarCsvHistorico`, que leen ÚNICAMENTE el snapshot
  ya guardado en la fila de `asistencia` (nunca un `SlotHorario` vigente, para que un cambio de
  horario posterior no pueda colarse en un informe ya emitido). Sobre la utilidad genérica
  `nucleo/csv.ts` (`filaCsv`/`documentoCsv`: separador `;`, BOM UTF-8, `\r\n` — el separador correcto
  para una hoja de cálculo española, donde la coma es el separador decimal).
  Desde T-24: `administracionUsuarios.ts` (nuevo) — `normalizarNombreUsuario`/`nombreUsuarioValido`
  y `dejariaSinAdministratorActivo(usuarios, objetivo, cambio)`, que replica en el cliente la MISMA
  condición del trigger `perfil_before_update` (`db/009_administracion_usuarios.sql`) para
  deshabilitar el control antes de que el servidor tenga que rechazarlo — mismo patrón que
  `motivoAnulacionValido`/`puedeCambiarSlotAtribuido` de T-21. `permisosUi.ts` añade
  `puedeGestionarUsuarios` (exclusiva de `administrator`).
  Desde R-12: `cierresCentro.ts` (nuevo) — `buscarCierreSolapado`/`esDiaCerrado`, mismo principio que
  `slotsVigentesEn` de T-15: una sola función, reutilizada por todo lo que necesite saber si una
  fecha cae en un cierre activo. `permisosUi.ts` añade `puedeVerCierresCentro`/
  `puedeGestionarCierresCentro`.
  Desde R-06: `excepcionSlot.ts` (nuevo) — `fechaCoincideConDiaSemana` (una excepción solo tiene
  sentido sobre una ocurrencia real del slot), `motivoCancelacionValido`, `puedeDeclararExcepcion`/
  `excepcionDelDia` (mismo principio que `esDiaCerrado`), `esDiaCanceladoParaSlot` (criterio
  reutilizado sin cambios por R-13, ver abajo), `etiquetaExcepcion` («Cubierto por X»/«Cancelada —
  motivo») y `slotsEfectivosDelDia(profesorId, slotsPropios, excepcionesDeHoy)` — la pieza que
  conecta con el motor de propuesta de T-17 (`alumnosPropuestos`) SIN tocar esa función: excluye un
  slot propio cancelado/sustituido hoy, y añade uno ajeno donde el profesor es el sustituto
  nombrado, con `profesor_id` sobrescrito al suyo (una proyección de lectura, nunca se escribe de
  vuelta). `permisosUi.ts` añade `puedeGestionarExcepcionesSlot` (exclusiva de `administrator`).
  Desde R-13: `avisosPasarLista.ts` (nuevo) — `sesionesSinPasarLista(parametros)`: para cada uno de
  los últimos `VENTANA_EDICION_TEACHER_DIAS` días (T-21, reexportada de `asistencia.ts`) más hoy,
  cada slot propio vigente ese día cuya hora de fin ya pasó y sin ningún registro —de ningún
  estado— ese día, excluyendo los días cerrados (`esDiaCerrado`, R-12) y los cancelados para ese
  slot (`esDiaCanceladoParaSlot`, R-06) sin inventar un tercer criterio; una sustitución NO excluye
  (si nadie registró, el hueco sigue apareciendo — si el sustituto sí registró, queda enganchado al
  MISMO `slot_id`, así que la comprobación de "algún registro ese día" ya lo detecta sin caso
  especial). Ordenadas de la fecha más antigua a la más reciente y, dentro del mismo día, por hora
  de inicio y apellido del alumno.
  Desde R-04: `informeMensualAlumno.ts` (nuevo) — `sesionesEsperadasDelMes(parametros)`: para cada
  día del mes natural pedido, cada slot del alumno vigente ese día (snapshot histórico —
  `vigente_desde`/`vigente_hasta`, nunca el horario actual) cuyo día de la semana coincide
  (`fechaCoincideConDiaSemana`, R-06), salvo que el día esté cerrado (`esDiaCerrado`, R-12) o
  cancelado para ese slot (`esDiaCanceladoParaSlot`, R-06) — mismos dos criterios de exclusión que
  R-13, sin inventar un tercero. `resumenInformeMensual(sesiones, asistencias)` cruza el recuento de
  sesiones esperadas con TODO lo registrado ese mes para el alumno (entradas válidas, ausencias
  justificadas/sin justificar, anuladas —visibles, no cuentan—, retroactivos, minutos reales
  sumados solo de las entradas válidas con salida marcada, R-03). `filasInformeMensual`/
  `generarCsvInformeMensual` son la MISMA fuente de pares campo/valor para el CSV y para la tabla
  que pinta la pantalla en la ventana de impresión, así que los dos formatos coinciden siempre en
  las cifras (criterio de aceptación de R-04). `permisosUi.ts` añade `puedeGenerarInformeMensual`
  (`administrator` y `teacher`, mismo conjunto que `puedeVerHistorico` pero como capacidad propia).
  Desde R-08: `importacionAlumnos.ts` (nuevo) — `analizarCsvAlumnos(filasCrudas, centros, alumnosExistentes)`
  valida cada fila y decide `'nueva'`/`'duplicada'`/`'error'` con el motivo exacto; `alumnosSonDuplicados`
  compara nombre completo + centro, acento-insensible (mismo algoritmo NFD que `normalizarNombreCentro`
  de T-11, duplicado a propósito en vez de reexportado — ver `DECISIONES_TECNICAS.md`). `importacionHorarios.ts`
  (nuevo) — `analizarCsvHorarios` resuelve el alumno por nombre y apellidos EXACTOS (a propósito más
  estricto que el de alumnos) y el profesor contra un mapa YA resuelto por quien llama;
  `diaSemanaDesdeTexto` acepta el dígito 1-7 o el nombre del día en español; `emailsProfesorUnicosDeCsvHorarios`
  extrae los emails distintos de un fichero para resolverlos una sola vez, nunca por fila. Sobre
  `nucleo/csv.ts` ampliado con `analizarCsv`/`detectarSeparadorCsv` (parseo propio, comillas dobles
  estilo RFC 4180, separador `;`/`,` autodetectado). `permisosUi.ts` añade `puedeImportarMasivamente`
  (exclusiva de `administrator`).
  Desde R-10: `expedienteAlumno.ts` (nuevo) — `construirDatosExpedienteAlumno(parametros)` compone,
  a partir de la ficha ya cargada (T-12/T-13, con centro y personas de referencia embebidos) y el
  histórico ÍNTEGRO de asistencia (T-23, sin filtro de mes ni de estado — incluye anuladas y
  retroactivas), el documento único del expediente; reutiliza sin duplicar las etiquetas de
  `historicoAsistencia.ts` y las duraciones de `asistencia.ts`. `ordenarCronologico` reordena el
  histórico de más antiguo a más reciente (al contrario que la consulta de revisión de T-23) sin
  mutar el array de quien llama. `generarJsonExpediente` (JSON indentado) y `filasCabeceraExpediente`/
  `filaPersonaReferenciaExpediente`/`filaHistoricoExpediente` (única fuente de filas para el
  documento imprimible, mismo criterio que `filasInformeMensual` de R-04) completan el módulo. El
  avatar se informa como `tieneAvatar: booleano`, nunca la ruta ni una URL (§0.2). `permisosUi.ts`
  añade `puedeExportarExpedienteCompleto` (exclusiva de `administrator`).
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
  - `postgrest.ts` (T-08, ampliado en T-12 y T-20) — `crearClientePostgrest(opciones)`: `cliente
    .desde<T>('tabla').eq(...).seleccionar('columnas')` (o `.insertar`/`.actualizar`/`.eliminar`) y
    `cliente.rpc(nombre, parametros, señal?)`. Desde T-12: `orIlike(columnas, patron)` (un `ilike`
    sobre varias columnas a la vez, unidas con `or`) y `opciones.representar` en
    `insertar`/`actualizar` (`false` pide `Prefer: return=minimal` en vez del
    `return=representation` por defecto). Desde T-20: el tercer parámetro opcional `señal` de `rpc`
    se propaga hasta `fetch` (`peticionHttp.ts`) — solo `rpc` lo admite, ninguna otra operación lo
    necesita todavía. Subconjunto documentado en la cabecera del propio fichero y en
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
  - `profesores.ts` (T-16, ampliado en T-23 y R-08) — `listarProfesoresActivos`: los únicos datos de
    `perfil` que necesita el selector de profesor del bloque de horario de la ficha de alumno (`id`,
    `nombre`, `rol=teacher`, `activo=true`). Solo lectura; el alta de usuarios es T-24. Desde T-23:
    `resolverNombresProfesores(cliente, ids)` — resuelve en LOTE el nombre de cada id, sin filtrar
    por `rol`/`activo` (un profesor que ya no da clase sigue siendo el que registró históricamente
    esa fila); para un `teacher` (que solo tiene `perfil_leer_propio`) el mapa devuelto contiene como
    mucho su propia fila. Desde R-08: `resolverProfesorPorEmail(cliente, email)` — `perfil` no
    guarda el email (vive en `auth.users`), así que llama a la RPC `resolver_profesor_por_email`
    (`SECURITY DEFINER`, `db/016_resolver_profesor_por_email.sql`, exclusiva de `administrator`) en
    vez de filtrar una columna que no existe; `null` si no hay ninguna cuenta de `teacher` activa con
    ese email.
  - `centrosEstudios.ts` (T-11) — `listarCentros`/`crearCentro`/`editarNombreCentro`/
    `contarAlumnosActivosDeCentro`/`desactivarCentro`/`reactivarCentro` sobre `postgrest.ts`. El alta
    y la edición de nombre comprueban antes el duplicado acento-insensible
    (`src/dominio/centrosEstudios.ts`) y, si lo hay, devuelven `{ tipo: 'duplicado', existente }` en
    vez de intentar la escritura. Sin `DELETE`: la baja es siempre `activo = false`.
    `contarAlumnosActivosDeCentro` consulta la vista `alumno_ficha` (P-27, 2026-09-10), nunca la
    tabla base `alumno`: `centro_referencia_id` no está en el `GRANT` de columna de `authenticated`
    sobre la tabla base, mismo defecto exacto que P-22 corrigió antes en `idsAlumnosDeCentro`.
  - `cierresCentro.ts` (R-12, nuevo) — `listarCierres`/`crearCierre`/`editarCierre`/
    `desactivarCierre`/`reactivarCierre` sobre `postgrest.ts`, tabla `cierre_centro`
    (`db/014_calendario_cierres.sql`). El alta, la edición y la reactivación comprueban antes el
    solape de fechas contra los cierres ACTIVOS (`src/dominio/cierresCentro.ts`) y, si lo hay,
    devuelven `{ tipo: 'solapado', existente }` en vez de intentar la escritura — un cierre
    desactivado libera su periodo. Sin `DELETE`: la baja es siempre `activo = false`.
  - `excepcionesSlot.ts` (R-06, nuevo) — `declararExcepcionSlot`/`desactivarExcepcionSlot`, ambas
    EXCLUSIVAMENTE vía RPC (`declarar_excepcion_slot`/`desactivar_excepcion_slot`,
    `db/013_excepcion_slot.sql`), a diferencia de `cierresCentro.ts`: la tabla `excepcion_slot` no
    concede INSERT/UPDATE directo a `authenticated` (la comprobación "sin registros ese día" es
    atómica, en el servidor). `listarExcepcionesDeSlot` (activas de un slot, cualquier fecha, para
    «Registros») y `listarExcepcionesDelDiaParaProfesor` (activas de una fecha relevantes para el
    `teacher` que llama —titular o sustituto—, con el slot y el alumno embebidos en una única
    petición, para pasar lista y «Mi horario») son consultas directas: RLS ya resuelve el alcance.
    `listarExcepcionesDeProfesorEnRango` (R-13, nuevo) — activas cuya `fecha` cae en `[desde, hasta]`,
    sin el slot embebido (el aviso de "sesiones sin pasar lista" ya tiene los slots por su cuenta),
    para la ventana de aviso completa en vez de un único día. `registrarAvisoCancelacionSlot` (R-14,
    nuevo) — tercera RPC del mismo fichero (`registrar_aviso_cancelacion_slot`,
    `db/015_aviso_cancelacion_slot.sql`), anota quién avisó a las familias de una cancelación y
    cuándo, una sola vez para la excepción completa (no por alumno); mismo motivo de opacidad que las
    otras dos: sin GRANT de UPDATE directo, la RPC es la única vía.
  - `usuarios.ts` (T-24, nuevo) — `listarUsuarios`/`actualizarUsuario` sobre `perfil` directamente
    (sin RPC: el `UPDATE` de `administrator` sobre cualquier fila ya estaba concedido y aislado por
    RLS desde el bootstrap). `actualizarUsuario` combina nombre/rol/activo en una llamada parcial
    (un campo ausente no se toca); el rechazo del trigger `perfil_before_update` por dejar el
    sistema sin ningún `administrator` activo llega como `ErrorDeValidacion` con el mensaje del
    propio trigger (sin `errcode` de permiso a propósito, para no perder ese mensaje detrás de un
    `SinPermiso` genérico). Sin alta de usuario: eso es procedimiento manual, ver más abajo.
  - `alumnos.ts` (T-12, ampliado en T-13) — `listarAlumnos`/`obtenerAlumno`/`crearAlumno`/
    `editarAlumno`/`darDeBajaAlumno`/`reactivarAlumno` sobre `postgrest.ts`. Lee siempre de la vista
    `alumno_ficha` (T-10, no la tabla base) con el centro embebido
    (`*,centro:centro_estudios(id,nombre)`), y escribe contra la tabla base con
    `{ representar: false }` porque el `RETURNING` de un `INSERT`/`UPDATE` normal fallaría al
    intentar devolver `email_alumno`/`telefono_alumno` (esas columnas solo están concedidas a través
    de la vista, nunca en la tabla base — ver `DECISIONES_TECNICAS.md`); genera el `id` en el
    cliente antes de insertar para poder releer la ficha completa después. `darDeBajaAlumno` recibe
    un `Reloj` inyectado para `baja_en`, nunca lee la hora del sistema directamente. Sin `DELETE`: la
    baja es siempre `activo = false`. Desde T-13, todas las operaciones sobre un único alumno
    devuelven `AlumnoConCentroYPersonas` (embebe también `personas_referencia:persona_referencia(*)`
    en el mismo `select`); `listarAlumnos` sigue devolviendo `AlumnoConCentro` sin ese embebido.
  - `personasReferencia.ts` (T-13) — `crearPersonaReferencia`/`editarPersonaReferencia`/
    `eliminarPersonaReferencia` sobre `postgrest.ts`. Sin función de lectura propia hasta R-05: hasta
    entonces las personas de referencia solo viajaban embebidas en la ficha del alumno (`alumnos.ts`,
    arriba). `telefono_referencia` es obligatorio (a diferencia del teléfono del propio alumno);
    `eliminarPersonaReferencia` es borrado real, sin baja lógica — única tabla del sistema donde eso
    está permitido (§0.2). A diferencia de `alumnos.ts`, sí pide `Prefer: return=representation` (el
    valor por defecto): `persona_referencia` concede todas sus columnas a `authenticated` en la tabla
    base, sin ninguna vista de por medio que las reparta de otro modo por rol. Desde R-05:
    `listarPersonasReferencia(cliente, alumnoId)` — la primera lectura propia del módulo, solo estas
    columnas (sin el resto de la ficha del alumno, mismo criterio de minimización que P-02 de T-14),
    para el botón «avisar» de `pantallaRegistrosSlot.ts`; reservada a `administrator` por RLS, igual
    que el resto del módulo — un `teacher` recibe un array vacío, nunca un error (RLS filtra filas,
    no deniega la petición), pero la interfaz no la llama para ese rol (`puedeVerPersonasReferencia`,
    ver pregunta #17 de §6 de `SEGUIMIENTO.md`).
  - `asistencia.ts` (T-18) — `registrarAsistencia(deps, usuarioId, entrada)`: único punto de llamada
    a la RPC `registrar_asistencia` (`cliente.rpc(...)`, nunca un `INSERT` directo — revocado). No
    genera `peticionId`: es responsabilidad de quien llama (T-19, junto con `proteccionDobleToque`
    de T-06) generarlo una vez y reutilizarlo en un reintento genuino, o la idempotencia de la base
    de datos no protege nada. El límite de cliente de T-06 (opcional) se cuenta sobre el profesor
    que de verdad registra (`profesorId` si un `administrator` registra en nombre de otro; si no,
    `usuarioId`), nunca sobre quien llama. `entrada.origen = 'manual'`/`slotId: null`/`nota` es el
    camino de "alumno extra" (T-20): la misma RPC, sin ningún cambio. Desde T-21:
    `actualizarAsistencia(deps, profesorDuenoId, entrada)` — llama a `actualizar_asistencia`
    (`db/008_rpc_actualizar_asistencia.sql`, ampliada por `db/011_justificacion_ausencia.sql` R-02 y
    `db/012_registro_salida.sql` R-03), la única vía de modificación de un registro ya existente;
    `entrada.nota`/`entrada.notaProvista` es el único par tri-estado del módulo (sin
    `notaProvista: true`, `nota` se ignora, para poder vaciarla sin confundirlo con "no tocarla`").
    Desde R-02: `entrada.justificar` + `entrada.motivoJustificacion` (de
    `MotivoJustificacionAusencia`, lista corta cerrada) + `entrada.notaJustificacion` — justificar
    solo tiene efecto sobre un registro `estado === 'ausente'`, la RPC lo rechaza si no. Desde R-03:
    `entrada.marcarSalida` (cierra con la hora real del servidor, `clock_timestamp()` en la RPC —
    nunca un valor del cliente) y `entrada.ocurridoEnSalida` (ajusta una salida YA marcada, mismo
    régimen que `entrada.ocurridoEn` sobre la entrada), mutuamente excluyentes en la misma llamada; y
    `marcarSalidaAsistencia(deps, profesorDuenoId, asistenciaId)`, un atajo de un solo parámetro sobre
    `actualizarAsistencia` para pantallas (pasar lista) que solo necesitan esa acción, sin construir
    el resto de `ActualizarAsistenciaEntrada`. Desde R-05: "avisar a la familia" NO añade ninguna
    acción nueva a `actualizarAsistencia` — reutiliza `entrada.nota`/`entrada.notaProvista` ya
    existente (R-05 declara `Migración: No`, sin columna propia para "aviso enviado"); ver
    `dominio/avisoAusencia.ts#notaConAvisoAusencia`, que compone el nuevo valor de `nota` SUMANDO la
    anotación a lo que ya hubiera, nunca sustituyéndolo.
    `listarRegistrosDeSlotYFecha(cliente, slotId, fecha, zona?)` — registros de un slot en CUALQUIER
    fecha, cualquier estado (a diferencia de `listarAsistenciaDeHoy`, siempre "hoy" y solo válidos).
    Desde R-17: `listarRegistrosDeSlotsYFecha(cliente, slotIds, fecha, zona?)` — la misma consulta
    para VARIOS slots a la vez (`in.(...)`), una sola petición para "el resto de la sesión" en vez de
    una por alumno; sin petición si `slotIds` está vacío.
    `listarHistorialDeAsistencia(cliente, asistenciaId)` — lee `asistencia_historial`, solo tiene
    sentido para `administrator` (única política de lectura sobre esa tabla). Desde T-23:
    `listarHistoricoAsistencia(cliente, filtro, zona?, logger?)` — consulta transversal paginada por
    alumno/profesor/centro/rango de fechas (requisito 1 y 5 de T-23); el filtro por centro resuelve
    primero los ids de alumno de ese centro (`alumno.centro_referencia_id`, sin embed anidado — el
    cliente no soporta filtrar sobre un recurso embebido) y después acota `asistencia` con `.in(...)`.
    Deja traza mínima en el log (`logger.info`, solo ids y página, nunca un nombre — parámetro
    inyectable, por defecto la instancia real de T-02). `listarHistoricoAsistenciaCompleto(cliente,
    filtro, zona?)` recorre la anterior en lotes de 500 para traer TODO lo que cumple el filtro, para
    la exportación CSV (requisito 3), nunca solo la página que ve la pantalla.
  - `alumnos.ts`, ampliado en T-20 — `buscarAlumnosParaExtra(cliente, texto, señal?)`: llama a la
    RPC `buscar_alumnos_activos` (`db/007_rpc_buscar_alumnos.sql`, `SECURITY DEFINER`), nunca la
    tabla base ni la vista `alumno_ficha` — es la única vía por la que un `teacher` puede saber a
    qué centro pertenece un alumno (`centro_referencia_id` no está en su GRANT de columna). Devuelve
    `[]` sin llamar a red si el texto recortado está vacío. `obtenerAlumnoParaTarjeta(cliente, id)`:
    lee de la tabla base `alumno` las mismas columnas que ya trae embebidas
    `listarSlotsDeProfesorConAlumno` (incluida `avatar_ruta`, que el buscador nunca devuelve) —
    necesario para pintar la card del alumno recién añadido con su avatar (requisito 5 de T-20).
    Desde T-23: `resolverIdentificacionAlumnos(cliente, ids)` — resuelve en LOTE (nunca una petición
    por fila) el nombre de cada id de una página del histórico, contra la tabla base `alumno`; un id
    que la RLS de quien consulta no puede resolver simplemente falta en el mapa devuelto.
    `resolverContactoAlumnos(cliente, ids)` — email/teléfono en lote contra `alumno_ficha`, solo
    tiene sentido detrás de `puedeExportarConDatosDeContacto(rol)`.
    Desde R-04: `resolverCentroReferenciaIdDeAlumno(cliente, alumnoId)` — el `centro_referencia_id`
    de un alumno, para la cabecera del informe mensual; contra `alumno_ficha` (nunca la tabla base:
    esa columna no está en el GRANT de `authenticated` en ninguna forma). Devuelve `null` sin
    distinguir el motivo (alumno inexistente o quien pregunta no es `administrator`, único rol al
    que `alumno_ficha` devuelve fila) — un `teacher` simplemente no ve el campo "Centro" en su
    informe, nunca un error.
  - `importacionMasiva.ts` (R-08, nuevo) — `listarAlumnosParaImportacion(cliente)`: catálogo
    completo de alumnos (id + columnas de emparejamiento), una única petición sin paginar, para las
    dos funciones puras de `dominio/importacionAlumnos.ts`/`importacionHorarios.ts`.
    `importarAlumnosValidados(cliente, filas: FilaAlumnoParaConfirmar[])`: un ÚNICO `INSERT` con
    todas las filas nuevas, `Prefer: return=minimal`. **Desde P-25** (2026-09-10, hallazgo #15 de
    auditoría): el `id` de cada fila lo trae ya puesto quien llama — esta función NUNCA genera un
    `id` — porque `ui/pantallaImportacionMasiva.ts` lo fija una única vez al analizar el fichero
    (`deps.generarId`) y lo reutiliza en cualquier reintento del mismo lote; así, un reintento tras
    un alta que sí llegó a escribir choca con la clave primaria de `alumno` (`409`/`Conflicto`) en
    vez de duplicar la fila.
    `importarHorariosValidados(cliente, reloj, filas)`: una llamada a `crearSlot` (T-15) POR FILA,
    sin abortar en la primera que falle — un solape con un horario ya existente (incluida la
    reimportación del mismo fichero sin cambios) queda recogido en `errores`, con el motivo real de
    `crearSlot`, nunca el genérico de `mensajeAmigable`.

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
    límite autoritativo vive en la RPC de PostgreSQL: conectado desde T-14 (subida de avatar) y,
    desde T-18, también en `registrar_asistencia` (`limite_tasa`/`aplicar_limite_tasa`,
    `db/005_rpc_registrar_asistencia.sql`); `src/datos/erroresDominio.ts` traduce un `429` del
    servidor a esta misma clase. Ver el contrato recomendado en `DECISIONES_TECNICAS.md`.
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
  - `controlPeticion.ts` (T-06, ampliado en T-20) — `crearEjecutorUltimaPeticion()` (cancela la
    petición anterior en cuanto empieza una nueva) y `conTiempoDeEspera(operacion, ms)` (aborta si
    no resuelve a tiempo), sobre `AbortController`/`AbortSignal` nativos. `esErrorDeCancelacion(error)`
    (T-20): `true` para el `AbortError` estándar — compartida por `mensajesAbuso.ts` (que SÍ avisa al
    usuario de una cancelación) y por `comboboxAlumnoExtra.ts` (que la usa para lo contrario: ignorar
    en silencio una búsqueda superada por una tecla nueva).
  - `rebote.ts` (T-20) — `crearRebote()`: rebote/"debounce" cancelable, hermano de `Temporizador` y
    `ProgramadorIntervalo` pero con contrato propio (`aplazar(ms, tarea)` cancela cualquier tarea
    pendiente antes de programar la nueva; `cancelar()` la cancela sin programar otra). FÁBRICA, no
    una instancia compartida — cada combobox necesita la suya (`crearReboteDePrueba` para tests,
    con `disparar()` para ejecutar a mano la tarea pendiente).
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
    nunca reactivo a un `401`; conectado desde T-19, que lo llama una vez (mejor esfuerzo) al montar
    la pantalla de pasar lista; una renovación fallida no cierra la sesión ni descarta el estado.
  - `enlaceRecuperacion.ts` (T-09) — `parsearParametrosRecuperacion(hash)`: función pura que
    reconoce el fragmento de URL que GoTrue añade al volver del enlace de recuperación del correo
    (`#access_token=...&type=recovery`).
  - `router.ts` (T-16, ampliado en T-21, T-22, T-23, T-24, R-12, R-13, R-04, R-08, R-11 y R-19) — dos
    routers por `hash`, cada uno con su propio par `analizarX(hash)`/`hashDeX(ruta)` (puras) sobre un
    motor interno común (`crearRouterGenerico`, privado): `crearRouter(objetivo)` para
    `administrator` (`#/centros`, `#/alumnos`, `#/alumnos/nuevo`, `#/alumnos/<id>`, `#/registros`,
    `#/historico[/<alumnoId>]` — el segmento de `alumnoId`, opcional, añadido por R-04 para que la
    ficha de alumno enlace al informe mensual con el alumno ya preseleccionado —, `#/usuarios` desde
    T-24, `#/cierres` desde R-12, `#/importacion` desde R-08, `#/panel` desde R-11, `#/informe-horas`
    desde R-15, `#/primeros-pasos` desde R-18) y
    `crearRouterProfesor(objetivo)`
    para `teacher` (`#/pasar-lista`, `#/horario`, `#/registros[/<slotId>[/<fecha>]]` — el segmento de
    `slotId` es opcional, para el enlace profundo de "mi horario" a los registros de un slot
    concreto; el de `fecha` (`AAAA-MM-DD`), añadido por R-13, solo tiene sentido junto a `slotId` y
    enlaza además al DÍA concreto que el aviso de "sesiones sin pasar lista" señala —,
    `#/historico` y `#/cierres` desde R-12, en modo solo lectura, y `#/mis-horas` desde R-19).
    `objetivo` se inyecta en los dos
    (nunca leen `window` directamente), mismo patrón que `instalarCapturaErrores`. Las dos gramáticas
    de ruta son independientes a propósito: las dos apps nunca están montadas a la vez (ver
    `mostrarAppProfesor` más abajo).
  - `almacenEstado.ts` (T-16) — `crearAlmacenEstado(inicial)`: estado mínimo con suscripción
    (`obtener`/`actualizar`/`suscribir`), mismo contrato que `GestorSesion`. Genérico y sin DOM;
    usado por `pantallaListadoAlumnos.ts`.
  - `programadorIntervalo.ts` (T-19) — `ProgramadorIntervalo.cada(ms, tarea)`: hermano de
    `Temporizador` pero para tareas REPETIDAS, no una espera única; `programadorIntervaloReal` usa
    `setInterval`, `crearProgramadorIntervaloDePrueba` no espera de verdad y expone `disparar()`
    para ejecutar a mano los ticks programados. Lo usa `pantallaPasarLista.ts` para refrescar la
    hora visible y recalcular la propuesta sin volver a pedir datos al servidor en cada tick.
  - `detectorConexion.ts` (R-07) — `DetectorConexion` (`estaConectado()`/`alCambiar(escuchador)`)
    sobre los eventos `online`/`offline` nativos; `crearDetectorConexionNavegador(fuente)` recibe la
    forma MÍNIMA que necesita (`FuenteConexionNavegador`, no `Window` completo), así que SÍ tiene
    test propio con un objeto de mentira (a diferencia de `colaAsistenciaOffline.ts`, ver abajo): no
    hace falta `jsdom` para probarlo. `crearDetectorConexionDePrueba(inicial?)` para tests de quien
    lo consume, con `simularCambio(conectado)`.
  - `colaAsistenciaOffline.ts` (R-07) — `AlmacenColaAsistenciaOffline` (`listar`/`agregar`/`eliminar`
    de `ElementoColaAsistencia`, cada uno con el `peticionId` de T-18/R-01 como clave de idempotencia)
    para la cola de toques que no se pudieron enviar por falta de red. `crearAlmacenColaAsistenciaIndexedDB(fabrica, profesorId)`
    es la implementación real (IndexedDB, un único almacén de objetos por `peticionId`, base de datos
    partida por `profesorId` desde P-21/hallazgo #13 de auditoría 2026-09-09 — sin la partición, un
    dispositivo compartido entre varios profesores mezclaba sus colas) — `jsdom` no implementa
    IndexedDB, así que sigue el mismo criterio que `FabricaProcesadoImagen` (T-14) y
    `copiarAlPortapapelesDelNavegador` (R-05): sin test propio, aislada detrás de la interfaz. Cada
    elemento encolado lleva `ocurridoEn` con el instante REAL del toque (capturado por el reloj al
    encolar, P-20/hallazgo #12), no el del vaciado posterior.
    `crearAlmacenColaAsistenciaEnMemoria()` es el doble de test, y es también lo que demuestra "sobrevive
    a un cierre de pestaña" en `pantallaPasarLista.test.ts`: dos montajes sucesivos de la pantalla sobre
    la MISMA instancia de este almacén simulan el cierre y la reapertura real, porque lo que sobrevive
    en un navegador de verdad es el propio IndexedDB, no ninguna variable en memoria de la pantalla.
    Compuesto en `aplicacion.ts` solo si `documento.defaultView?.indexedDB` existe (nunca en los tests
    de `aplicacion.test.ts`, que corren sobre `jsdom`) — sin él, pasar lista sigue funcionando
    exactamente como antes de R-07 (ver `pantallaPasarLista.ts` más abajo).
  - `registroServiceWorker.ts` (R-09) — `registrarServiceWorker(navegador, opciones)`: orquesta el
    aviso de versión nueva sobre una interfaz mínima que envuelve `navigator.serviceWorker`/
    `ServiceWorkerRegistration` (mismo criterio que `ObjetivoRouter` con `window`). Detalle completo
    en la sección "Aplicación instalable y arranque sin red (R-09)" más abajo.
- `src/ui/` — DOM nativo. `src/ui/main.ts` es el punto de entrada que carga `index.html`; delega en
  funciones puras sobre un `HTMLElement` ya obtenido para que se puedan testear montando un
  contenedor con `jsdom`. Ninguna función de pantalla toca el `document` global directamente: reciben
  el `Document` como parámetro, normalmente `contenedor.ownerDocument` (T-09). Desde T-05 instala la
  captura global de errores no controlados; desde T-08 el envío remoto es real (lee
  `window.__CONFIG__`); desde T-09 conecta `gestorSesion` real (con `sessionStorage`) y enruta con
  `aplicacion.ts`; desde T-16 construye además `ClientePostgrest`/`ClienteAlmacenamiento` reales (con
  el token de sesión), la fábrica de procesado de imagen del navegador y el limitador de tasa de
  avatares, y los pasa como `appAdministrador` — la aplicación real de `administrator` solo se monta
  si esto existe, que en la práctica es siempre que haya `config.js` (mismo `if` que `gestorSesion`).
  Sin `config.js` (o si falta), sigue cayendo a la pantalla mínima de T-00, sin fallar el arranque.
  - `formularios.ts` (T-09, ampliado en T-16) — helpers de formulario accesible: `crearCampoTexto`,
    `crearZonaMensaje` (`role="alert"`/`"status"`, enfocable por programa), `crearBoton`, y desde
    T-16 `crearMensajeErrorCampo(documento, campo, idError)` (mensaje de error de UN campo concreto,
    enlazado por `aria-describedby`/`aria-invalid` — distinto de `crearZonaMensaje`, que es un único
    mensaje para todo el formulario). Objetivos táctiles ≥44px y 16px de fuente (evita el zoom de
    iOS) fijados aquí, en estilos en línea — el proyecto no tiene todavía ninguna hoja de estilos.
  - `dom.ts` (T-16, ampliado en T-23 y R-04) — `crearElemento(documento, etiqueta, opciones, hijos)`:
    helper de creación de elementos con texto/atributos/hijos en una llamada, siempre por
    `textContent`/`createElement` (nunca `innerHTML`). Complementa a `formularios.ts` para el resto
    del marcado de una pantalla (títulos, párrafos, contenedores). Desde T-23: `Descargador`/
    `crearDescargadorNavegador(documento)` — dispara la descarga de un fichero de texto (`Blob`/
    `URL.createObjectURL`/`<a download>`), inyectable igual que `FabricaProcesadoImagen` (T-14): la
    pantalla que lo usa se testea con un `Descargador` de mentira que solo registra la llamada.
    Desde R-04: `AbridorVentanaImpresion`/`crearAbridorVentanaImpresionNavegador(abrirVentana)` —
    abre una ventana en blanco (`window.open`, inyectado para no tocar el global directamente) para
    el "PDF" del informe mensual (sin librería: el navegador ofrece "Guardar como PDF" en su propio
    diálogo de impresión); quien la usa construye el contenido con `crearElemento` sobre el
    `document` de esa ventana nueva (nunca una cadena HTML cruda) y llama a `imprimir()`
    (`focus()` + `print()`). `undefined` si el navegador bloquea la ventana emergente — quien llama
    debe avisarlo. Mismo patrón de inyección que `Descargador`; la implementación real no tiene test
    propio. Desde R-08: `LectorFichero`/`crearLectorFicheroNavegador()` — `leerTexto(archivo: File)`
    sobre `File.prototype.text()`, mismo patrón inyectable, para leer el CSV subido en
    `pantallaImportacionMasiva.ts` sin depender de `FileReader` en los tests.
  - `portapapeles.ts` (R-05) — `copiarAlPortapapelesDelNavegador(texto)`: envoltura de una línea
    sobre `navigator.clipboard.writeText`, mismo motivo de aislamiento que `FabricaProcesadoImagen`
    (T-14) y `Descargador` (T-23): `jsdom` no implementa la Clipboard API, así que la pantalla que la
    usa (`pantallaRegistrosSlot.ts`) recibe la función inyectada (`deps.copiarAlPortapapeles`,
    opcional) y se testea contra un doble; la función real no tiene test propio, documentado igual
    que el procesado de imagen real de T-14.
  - `pantallaLogin.ts`, `pantallaRecuperarContrasena.ts`, `pantallaEstablecerContrasenaNueva.ts`,
    `pantallaSinAcceso.ts` (T-09) — una función `mostrarPantallaX(contenedor, deps)` por pantalla,
    con sus dependencias inyectadas (nunca llaman directamente a `gestorSesion.ts`). La de
    recuperación responde igual exista o no la cuenta; la de nueva contraseña valida localmente
    (coincidencia, longitud mínima) antes de gastar una petición; la de sin acceso no hace ninguna
    llamada a datos, solo pinta el `Perfil` que ya le pasan.
  - `aplicacion.ts` (T-09, reescrito en T-16, ampliado en T-19/T-22) — `iniciarAplicacion(contenedor,
    deps)`: el enrutador. Hash de recuperación → pantalla de nueva contraseña; si no, según
    `EstadoSesion` → login/recuperar, o según `perfil.rol`: `student`/rol desconocido →
    `pantallaSinAcceso`; `administrator` → la aplicación real de T-16 si `deps.appAdministrador`
    viene informado; `teacher` → la aplicación real de T-19/T-22 si `deps.appProfesor` viene
    informado. Los dos vienen siempre informados desde `main.ts` cuando hay `config.js`
    desplegado; ausentes (y por tanto marcador de posición de T-09) en cualquier test que no los
    ejercite — compatibilidad hacia atrás verificada con un test explícito para cada uno.
    `mostrarAppAdministrador`/`mostrarAppProfesor` son también la **raíz de composición**: conectan
    las funciones puras de `src/datos/**` con el `ClientePostgrest`/`ClienteAlmacenamiento` reales,
    para que cada pantalla siga recibiendo solo funciones ya resueltas, nunca un cliente HTTP.
    `mostrarAppAdministrador` monta un `crearRouter` propio (`pantallaCentros.ts`,
    `pantallaListadoAlumnos.ts`, `pantallaFichaAlumno.ts`, `pantallaRegistrosSlot.ts` desde T-21,
    `pantallaHistorico.ts` desde T-23). `mostrarAppProfesor` monta a su vez `crearRouterProfesor`
    (sustituye la navegación local de dos valores que T-21 dejó como paso intermedio): cuatro botones
    en la cabecera ("Pasar lista", "Mi horario", "Registros", "Histórico" desde T-23) alternan entre
    `pantallaPasarLista.ts`, `pantallaMiHorario.ts`, `pantallaRegistrosSlot.ts` y `pantallaHistorico.ts`
    sin perder la sesión ni la cabecera. "Mi horario" navega a los otros dos con `router.navegar(...)`:
    sin parámetros a pasar lista, y con `{ slotId }` a registros — de ahí que `DependenciasAppProfesor`
    necesite `objetivoRouter` (mismo campo que ya tenía `DependenciasAppAdministrador`). Ninguna de
    las dos interfaces de dependencias necesitó un campo nuevo para T-23: la pantalla de histórico
    reutiliza el mismo `postgrest` que ya recibían las dos.
  - `pantallaCentros.ts` (T-11) — `mostrarPantallaCentros(contenedor, deps)`: catálogo de centros de
    estudios (listar con filtro de estado y búsqueda, crear, editar el nombre, desactivar,
    reactivar). **Enrutada desde T-16** (`#/centros`, solo dentro de la aplicación de
    `administrator`: `teacher` sigue sin acceso a la aplicación real, ver `aplicacion.ts`). La
    escritura se oculta para un hipotético lector no-administrator con `puedeGestionarCentros`
    (`permisosUi.ts`) — presentación, no control de acceso: el servidor la rechaza igual por RLS. La
    baja pide confirmación mostrando cuántos alumnos activos apuntan al centro (sin impedirla: siguen
    siendo válidos después). El alta/edición de nombre nunca inserta un duplicado acento-insensible:
    ofrece el existente (`src/dominio/centrosEstudios.ts` + `src/datos/centrosEstudios.ts`).
  - `pantallaListadoAlumnos.ts` (T-16) — `mostrarPantallaListadoAlumnos(contenedor, deps)`: listado
    de alumnos con búsqueda y filtro por estado, paginado en servidor (`#/alumnos`). Sustituye a la
    lista con edición en línea que traía `pantallaFichaAlumno.ts` desde T-12: aquí solo se busca y se
    navega (`irAFicha`/`irANuevoAlumno`, resueltos por el router de `aplicacion.ts`) — la ficha
    completa vive en su propia pantalla. Enteramente de `administrator`, igual que su predecesora.
  - `pantallaFichaAlumno.ts` (T-12/T-13, **reescrita por completo en T-16**) —
    `mostrarPantallaFichaAlumno(contenedor, deps)`: la ficha de un alumno como **pantalla completa**
    (`#/alumnos/nuevo` o `#/alumnos/<id>`), con cinco bloques — datos y centro, avatar (T-14),
    personas de referencia (T-13), horario (T-15) y expediente completo (R-10) —, cada uno montado
    por su propia función `montarBloqueX(contenedorDelBloque, ...)` con su propio estado y su propio
    `pintar()` que solo toca el DOM de ESE bloque. Es la pieza central del requisito 5 de T-16 ("un
    fallo al subir el avatar no debe tirar la edición de los datos personales"): como ningún bloque
    repinta el de otro, un cambio de estado en uno nunca descarta un campo sin guardar en otro. En
    modo alta (`deps.alumnoId === null`) solo existe el bloque de datos; al crear con éxito,
    `deps.alCrearAlumno(id)` deja que el router navegue a la ficha ya en modo edición. El bloque de
    horario muestra la **fecha de efecto** de cada versión y una nota de que editar o cesar un
    horario no cambia el histórico (requisito 3 de T-16); usa `src/datos/profesores.ts` para el
    selector de profesor y valida en el cliente, con `crearMensajeErrorCampo`, que la hora de fin sea
    posterior a la de inicio antes de llamar al servidor. Enteramente de `administrator`. No hay
    pantalla independiente de personas de referencia ni de avatar, por spec. Desde R-04: en modo
    edición, botón "Ver histórico e informe mensual" (`deps.irAHistorico(alumnoId)`, ausente en modo
    alta) que navega a `#/historico/<alumnoId>` — la ficha no genera el informe ella misma, solo
    preselecciona el alumno en `pantallaHistorico.ts`, que es donde vive la funcionalidad. Desde
    R-10: bloque "Expediente completo (RGPD)" (`puedeExportarExpedienteCompleto`, `permisosUi.ts`),
    con dos botones bajo pedido (nunca se precarga al abrir la ficha) — "Descargar JSON" e "Imprimir
    / PDF" — sobre los MISMOS datos (`construirDatosExpedienteAlumno`, `dominio/expedienteAlumno.ts`),
    así que los dos formatos siempre coinciden; el histórico se trae íntegro
    (`deps.listarHistoricoCompletoDeAlumno`, sin filtro de fecha) y los nombres de profesor se
    resuelven en lote (`deps.resolverNombresProfesores`, mismo resolutor que `pantallaHistorico.ts`).
    Bloque aislado, mismo criterio que los otros cuatro.
  - `pantallaPasarLista.ts` (T-19) — `mostrarPantallaPasarLista(contenedor, deps)`: la pantalla que
    un profesor usa cada día, exclusiva de `teacher` (`puedeUsarPasarLista`, `permisosUi.ts`).
    `deps.cargarPropuesta()` (todos los slots del profesor) y `deps.cargarAsistenciaDeHoy(instante)`
    (sus registros ya válidos de hoy) se piden en paralelo una sola vez y se cachean en cierre —
    nunca releídos en cada tick. `deps.programador` (`programadorIntervalo.ts`) recalcula la
    propuesta pura (`alumnosPropuestos`) cada 20 s sobre esa caché y el instante fresco de
    `deps.reloj`, así la cabecera y la rejilla se refrescan solas al cambiar de tramo horario sin
    gastar ninguna petición; el botón "Actualizar" es el único refresco manual real. Cada card es
    un `<button>` nativo (objetivo táctil entero, teclado gratis sin ARIA), protegido por
    `crearProtectorDobleToque` POR CLAVE (alumno+slot) para que tocar dos cards a la vez no bloquee
    ninguna de las dos. Un `Conflicto` (409, mismo `peticionId` ya aplicado o duplicado de negocio —
    indistinguibles por diseño desde T-18) nunca se muestra como error: se relee
    `cargarAsistenciaDeHoy` y la card pasa a "registrado" con la fila real, que es como "el
    reintento no genera un segundo registro" se ve desde la interfaz. El avatar se pide en lote
    (`obtenerUrlsAvataresMini`, variante `mini` de T-14) solo para los alumnos con `avatar_ruta` que
    todavía no se hayan pedido; la card se pinta con el monograma primero siempre, y una imagen que
    falla al cargar lo deja tal cual, sin hueco roto. El foco se conserva entre repintados
    (`data-clave` en cada botón) para que un recálculo de fondo no lo tire al `<body>`.
    Desde T-20: monta `comboboxAlumnoExtra.ts` en una sección "Añadir alumno extra"; al seleccionar
    un resultado, `registrarExtra` es el punto de entrada ÚNICO tanto para el alta (crea la card en
    'enviando' la primera vez que se llama con esa clave) como para el reintento tras un error
    (clic en la card, mismo `peticionId`) — la clave de un extra es su propio `peticionId`, porque no
    tiene slot con el que formar la clave alumno+slot de las cards normales. Tras registrar, pide en
    best-effort `deps.obtenerAlumnoParaTarjeta` (el buscador nunca trae `avatar_ruta`) y reutiliza el
    mismo pipeline de `cargarAvataresPendientes` que las cards de slot. Un `Conflicto` en un extra NO
    se reconcilia como en una card de slot (no hay clave alumno+slot+día con la que releer): se trata
    como cualquier otro error, documentado como limitación conocida en `DECISIONES_TECNICAS.md`.
    Desde R-03: una card ya registrada gana un TERCER control hermano, "Marcar salida"
    (`deps.marcarSalida(asistenciaId)`, sobre `datos/asistencia.ts#marcarSalidaAsistencia`), ofrecido
    solo mientras `puedeMarcarSalida` — con su propio protector de doble toque y su propia
    reconciliación tras un error (releer `cargarAsistenciaDeHoy`, mismo criterio que un `Conflicto`:
    un "ya tiene salida" no distingue un segundo toque real de una respuesta perdida de uno que sí
    llegó a escribirse).
    Desde R-06: `deps.listarExcepcionesDeHoy?(fecha)` (opcional) trae las excepciones de HOY que
    afectan al profesor —titular de un slot cancelado/sustituido, o sustituto nombrado de uno
    ajeno—; `dominio/excepcionSlot.ts#slotsEfectivosDelDia` calcula, ANTES de `alumnosPropuestos`, la
    lista efectiva de slots (excluye el propio afectado, añade el ajeno con `profesor_id`
    sobrescrito), sin ningún cambio en `alumnosPropuestos` en sí.
    Desde R-07: `deps.colaOffline`/`deps.detectorConexion` (opcionales, LAS DOS juntas — sin ellas,
    esta pantalla funciona exactamente como antes de R-07). Un `ErrorDeRed` al registrar/marcar
    ausente/añadir un extra encola el intento en `colaOffline` (mismo `peticionId` que ya llevaba) y
    la card pasa a `'pendiente_offline'` — no clicable, ni error todavía. `vaciarColaOffline`
    reintenta la cola entera cuando `detectorConexion` notifica que volvió la conexión (y, de red de
    seguridad, en cada tick de `INTERVALO_TICK_MS`, protegida contra solapamiento con
    `crearProtectorDobleToque`): se detiene en el primer `ErrorDeRed` (probablemente seguimos sin
    conexión de verdad), reconcilia un `Conflicto` buscando la fila por `peticion_id` (nunca por la
    clave alumno+slot+día, que un "alumno extra" no tiene), y saca de la cola cualquier otro error
    mostrándolo como `'error'` normal. Al montar, `restaurarColaOffline` relee lo que `colaOffline` ya
    tuviera guardado —de una pestaña cerrada y reabierta— y repinta esas cards antes de intentar
    vaciar la cola si ya hay conexión. El indicador de conectividad y de cuántos registros quedan por
    enviar vive en la cabecera, junto a la hora.
    Desde R-17: botón "Marcar el resto como ausente" en la cabecera, ofrecido solo con el slot en
    curso (`propuesta.tipo === 'en_curso'`) y al menos una card `'pendiente'`. Un toque abre una
    confirmación que congela AHORA la lista de pendientes y los lista nominalmente; al confirmar,
    reutiliza `manejarAusente` TAL CUAL una vez por alumno (nunca una función de orquestación
    paralela) — cada card acaba en el mismo estado que si se hubiera tocado una a una, con la misma
    reconciliación de `Conflicto` y la misma cola offline de R-07 si está inyectada. Una card
    `'error'` (intento de PRESENCIA fallido) nunca entra en el cierre en bloque, para no convertir en
    silencio un "vino" en un "faltó" sin que el profesor lo decida para ese alumno en concreto.
  - `comboboxAlumnoExtra.ts` (T-20) — `montarComboboxAlumnoExtra(contenedor, deps)`: combobox
    accesible escrito a mano (`role="combobox"`/`"listbox"`/`"option"`, `aria-activedescendant`,
    flechas/Enter/Escape, región `role="status"` que hace de anuncio `aria-live`). Rebote de 250 ms
    (`deps.rebote`, `nucleo/rebote.ts`, una instancia NUEVA por combobox) antes de llamar a
    `deps.buscar(texto, señal)`; cada tecla nueva cancela lo anterior reutilizando
    `crearEjecutorUltimaPeticion()` (T-06) — incluso cuando el texto cae por debajo del umbral y no
    hay ninguna búsqueda nueva que lanzar, ejecuta una operación trivial ya resuelta solo para que
    el aborto de "empezar una nueva" surta efecto sin necesitar un `AbortController` propio. Una
    respuesta abortada (`esErrorDeCancelacion`) se ignora en silencio, nunca se pinta como error.
    Nunca pide avatar (requisito 3 de T-20): el tipo `ResultadoBusquedaAlumno` no lo tiene.
  - `pantallaMiHorario.ts` (T-22) — `mostrarPantallaMiHorario(contenedor, deps)`: vista semanal de
    solo lectura, exclusiva de `teacher` (`puedeVerMiHorario`, `permisosUi.ts`). `deps.cargarSlots()`
    trae todos los slots del profesor en una única petición y se cachea en cierre;
    `deps.programador` recalcula cada 20 s `vistaSemanalProfesor` (`dominio/slots.ts`) sobre esa
    caché y el instante fresco de `deps.reloj`, mismo patrón exacto que `pantallaPasarLista.ts`
    (incluida su misma limitación conocida del `cada(...)` sin cancelar). Los siete días de la
    semana aparecen siempre, con "Sin clases este día" en los vacíos; dentro de cada día, los slots
    se ordenan por apellido del alumno (`compararAlumnosParaOrden`). Un resumen superior ("Ahora: …"
    / "Siguiente: …" / "Sin horario asignado") y, por fila, la etiqueta "En curso"/"Siguiente" cuando
    aplica. Botón "Pasar lista" solo en el slot `esActual` (`deps.irAPasarLista()`, sin parámetros);
    botón "Ver registros" siempre (`deps.irARegistros(slotId)`), que el router de `teacher` traduce a
    `#/registros/<slotId>`.
    Desde R-06: `deps.listarExcepcionesDeHoy?(fecha)` (opcional) relabela la fila cuyo `dia_semana`
    coincide con HOY («Cubierto por [sustituto]»/«Cancelada — motivo», nunca "En curso"/"Siguiente" a
    la vez, sin ofrecer "Pasar lista") tanto en el resumen superior como en la lista por día —
    limitación conocida: solo la fila de HOY se relabela, un día futuro de la semana no se anticipa.
    Desde R-13: bloque "Sesiones sin pasar lista", calculado por
    `dominio/avisosPasarLista.ts#sesionesSinPasarLista` a partir de tres dependencias opcionales que
    van juntas o no aparecen (`deps.listarRegistrosRecientes`/`listarCierresActivos`/
    `listarExcepcionesRecientes`, pedidas UNA vez al cargar, sin refetch por tick, mismo criterio que
    `excepcionesHoyCache`): cada slot propio de los últimos `VENTANA_EDICION_TEACHER_DIAS` días cuya
    hora de fin ya pasó y sin ningún registro ese día (excluidos los días cerrados, R-12, y los
    cancelados para ese slot, R-06 — una sustitución NO excluye, ver el propio fichero de dominio).
    Un botón "Completar registro" por aviso llama a `deps.irARegistros(slotId, fecha)`, que el router
    de `teacher` traduce a `#/registros/<slotId>/<fecha>` (segmento de fecha nuevo de R-13).
  - `pantallaRegistrosSlot.ts` (T-21, ampliada en T-22) — `mostrarPantallaRegistrosSlot(contenedor,
    deps)`: consulta y modificación de los registros de UN slot en UN día, para `teacher` (solo lo
    suyo, sin selector de profesor) y `administrator` (elige profesor,
    `puedeEditarAsistenciaDeCualquiera`, `permisosUi.ts`) — la RLS de `003_politicas_rls.sql` ya
    bastaba para la consulta (`SELECT` sobre `asistencia`/`asistencia_historial` desde T-10); la
    migración `008` solo hacía falta para la modificación. Desde T-22, `deps.slotInicialId?`
    (opcional) preselecciona un slot y pide sus registros sin selección manual si coincide con uno
    ya cargado (el enlace profundo que usa "mi horario"); si no coincide con ninguno, se ignora en
    silencio. Desde R-13, `deps.fechaInicial?` (`AAAA-MM-DD`, opcional) preselecciona también el DÍA
    —solo tiene efecto junto a `slotInicialId`—, para que el aviso de "sesiones sin pasar lista"
    enlace al día concreto que quedó sin registrar, no a hoy; sin validar contra nada, un valor que
    no cuadre se ve como cualquier fecha elegida a mano. El selector de slot solo ofrece los vigentes en la fecha elegida
    (`slotVigenteEn`, `dominio/slotHorario.ts`, T-15). Cinco acciones por fila, cada una su propio
    mini-formulario: nota, hora, slot atribuido (solo si `puedeCambiarSlotAtribuido`), cambiar el
    alumno (reutiliza `buscar_alumnos_activos` de T-20, con una búsqueda simple, sin el combobox ARIA
    completo — no había requisito de accesibilidad equivalente que lo justificara) y anular (motivo
    obligatorio). Anular y cambiar el alumno piden confirmación explícita con el dato viejo y el
    nuevo a la vista, mismo patrón "confirmando.../Confirmar/Cancelar" que ya usa
    `pantallaFichaAlumno.ts` para dar de baja o cesar un slot. "Añadir un registro olvidado" es una
    acción de pantalla (no de fila): llama a `registrar_asistencia` (T-18) con `ocurrido_en`
    declarado. El historial completo de una fila (`asistencia_historial`) solo se ofrece desplegar
    para `administrator`, el único rol con política de lectura sobre esa tabla. "Quién registró/
    modificó" se muestra por fecha, no por nombre — simplificación deliberada, documentada en el
    propio fichero (`DECISIONES_TECNICAS.md`). Desde R-03: bloque "Marcar salida"/"Ajustar salida"
    por fila — un único botón (`puedeMarcarSalida`) mientras no hay salida marcada, con la hora real
    del servidor; un `<input type="time">` para corregirla después, nunca las dos ofertas a la vez —
    y la columna de detalle gana la hora de salida y la duración real junto a la teórica
    (`duracionRealMinutos`/`duracionTeoricaMinutos`, `dominio/asistencia.ts`). Desde R-05: bloque
    "Avisar a la familia" — solo sobre una ausencia sin justificar (`puedeAvisarAusencia`,
    `dominio/asistencia.ts`) Y solo si `puedeVerPersonasReferencia(deps.rol)` es `administrator`
    (`deps.obtenerPersonasReferencia` es opcional, sin wiring para `teacher` en `aplicacion.ts` — ver
    `DECISIONES_TECNICAS.md` y la pregunta #17 de `SEGUIMIENTO.md` §6 sobre por qué la spec original
    pedía también alcance de `teacher` y por qué se difiere). Al pulsar "Ver personas de referencia"
    (carga perezosa, mismo patrón que "Ver historial"), lista nombre/teléfono
    (`dominio/personaReferencia.ts#nombreCompletoPersonaReferencia`, reexporta
    `nombreCompletoAlumno`) y compone el mensaje (`dominio/avisoAusencia.ts#mensajeAvisoAusencia`):
    un enlace `mailto:` por persona con email, y un `<textarea readonly>` con el mismo texto
    (visible/copiable a mano incluso si `deps.copiarAlPortapapeles` falla o no está inyectada — así
    "funciona sin conexión", requisito 2). "Registrar aviso enviado" pide primero quién avisó (texto
    libre, deshabilitado hasta rellenarlo) y llama a `deps.actualizar` con la `nota` combinada
    (`notaConAvisoAusencia`, ver arriba) — nunca una confirmación de entrega verificada, etiquetado
    como tal en la propia interfaz y en el propio texto de la nota (requisito 3). Desde R-06: bloque
    "Excepción de este día", anclado al slot y la fecha ya elegidos — exclusivamente `administrator`
    (`puedeGestionarExcepcionesSlot`) Y solo si `deps.declararExcepcionSlot` está inyectada (sin
    wiring para `teacher`, mismo criterio que "Avisar a la familia"). Si el día elegido ya tiene una
    excepción activa, muestra su etiqueta y un botón "Desactivar" (deshabilitado si ya hay registros
    ese día); si no, ofrece declarar sustitución (selector de sustituto, reutiliza
    `listarProfesoresParaSelector`, excluye al propio titular) o cancelación (motivo obligatorio) —
    deshabilitado también si ya hay registros ese día (requisito 5, comprobado en el cliente ADEMÁS
    del rechazo autoritativo de la RPC). Desde R-14: dentro del mismo bloque "Excepción de este día",
    y solo sobre una CANCELACIÓN (nunca una sustitución), "Avisar a las familias" — mismas dos
    dependencias que "Avisar a la familia" de R-05 (`deps.obtenerPersonasReferencia`/
    `deps.copiarAlPortapapeles`, sin duplicarlas), reutiliza `dominio/avisoCancelacion.ts` (mensaje
    distinto, "se cancela la clase de..."). "Registrar aviso enviado" llama a
    `deps.registrarAvisoCancelacionSlot(excepcion.id, quien)` — UNA sola vez para la excepción
    completa (no por alumno, requisito 3): a diferencia de R-05, con columnas dedicadas
    (`excepcion_slot.aviso_familias_quien`/`aviso_familias_en`, R-14 declara `Migración: Sí`), sin
    necesidad de componer ningún texto que se sume a una nota previa. En cuanto la excepción ya tiene
    aviso registrado, el bloque muestra quién y cuándo en vez del formulario.
    Desde R-17: bloque "Marcar el resto como ausente", junto a "Marcar ausente"/"Añadir registro
    olvidado" — sobre `estado.cierreCandidatos`, la sesión del slot elegido
    (`dominio/asistencia.ts#slotsDeLaMismaSesion`: mismo profesor/día/horario/asignatura, vigente esa
    fecha) que todavía no tiene ningún registro, recalculada en cada `cargarRegistros()`. Una sola
    petición extra (`deps.listarRegistrosDelGrupo`) solo cuando hay compañeros de sesión además del
    slot elegido — con un único alumno en la sesión (el caso más común), no se llama. Al confirmar, el
    bucle vive en la propia pantalla: cada éxito se retira de `cierreCandidatos` en el sitio (mismo
    patrón local que `reemplazarRegistro`, sin volver a pedir nada al servidor) y, si es el propio
    slot elegido, además actualiza la tabla visible; cada fallo queda con su motivo y la confirmación
    se reabre solo sobre quien de verdad sigue pendiente.
  - `pantallaHistorico.ts` (T-23) — `mostrarPantallaHistorico(contenedor, deps)`: consulta
    transversal del histórico completo (no de un solo slot, a diferencia de
    `pantallaRegistrosSlot.ts`), para `administrator` (todo el centro) y `teacher` (solo lo suyo, por
    RLS — su propio id se aplica siempre como filtro sin que la interfaz se lo ofrezca cambiar).
    Primera pantalla del proyecto con un `<table>` HTML real (`<thead>`/`<th scope="col">`) en vez del
    patrón `div`/`span` de `pantallaListadoAlumnos.ts`. Filtro de alumno por búsqueda simple
    (reutiliza `buscar_alumnos_activos` de T-20, mismo patrón sin combobox ARIA completo que
    `pantallaRegistrosSlot.ts`); selectores de profesor y de centro solo si
    `puedeConsultarHistoricoDeCualquiera(rol)` (`permisosUi.ts`, exclusiva de `administrator`).
    Paginación real en servidor (`datos/asistencia.ts#listarHistoricoAsistencia`). Botón "Exportar
    CSV" (`dominio/historicoAsistencia.ts#generarCsvHistorico`, sobre la utilidad genérica
    `nucleo/csv.ts`) que trae TODO el histórico filtrado, no solo la página visible
    (`listarHistoricoAsistenciaCompleto`, en lotes de 500), con una casilla "incluir datos de
    contacto" (`puedeExportarConDatosDeContacto`, exclusiva de `administrator`) que añade email y
    teléfono del alumno solo si se marca explícitamente. La descarga se dispara con un `Descargador`
    inyectable (`ui/dom.ts#crearDescargadorNavegador`, `Blob`/`URL.createObjectURL`/`<a download>`),
    mismo patrón de inyección que `FabricaProcesadoImagen` (T-14). Los nombres de alumno/profesor de
    cada fila se resuelven en LOTE por id (`resolverIdentificacionAlumnos`/`resolverNombresProfesores`,
    nunca un embed anidado de PostgREST); un id que la RLS de quien consulta no puede resolver (p. ej.
    un alumno de baja para un `teacher`) se muestra con una etiqueta de repuesto explícita. La consulta
    deja traza mínima en el log (`logAuditoria.info`, solo ids y página, nunca un nombre). Desde R-03:
    la tabla gana las columnas "Salida" y "Duración" (real junto a la teórica cuando hay salida
    marcada, solo la teórica si aún no la hay), y el CSV gana "Hora de salida", "Duración real (min)"
    y "Duración teórica (min)". Desde R-04: bloque "Informe mensual" que reutiliza el MISMO filtro de
    alumno de esta pantalla (nunca un segundo buscador) más un `<input type="month">` — "Informe:
    descargar CSV" y "Informe: imprimir / PDF" (`AbridorVentanaImpresion`, `ui/dom.ts`), las dos
    generadas desde el mismo `DatosInformeMensual` (`dominio/informeMensualAlumno.ts`) para que
    coincidan siempre en las cifras. La ficha de alumno enlaza aquí con `#/historico/<alumnoId>`
    (segmento opcional nuevo de la ruta `historico` en `nucleo/router.ts`, solo en el router de
    `administrator`: `teacher` no tiene ficha) para preseleccionar el alumno sin tener que
    rebuscarlo (`alumnoIdInicial`, mismo criterio "se ignora en silencio si no cuadra con nada" que
    `slotInicialId` de T-22). El campo "Centro" de la cabecera solo aparece para `administrator`
    (`resolverCentroReferenciaIdParaInforme`, opcional, sin proveer para `teacher`).
  - `pantallaUsuarios.ts` (T-24, nuevo) — `mostrarPantallaUsuarios(contenedor, deps)`: listado con
    filtro por rol y estado y búsqueda por nombre, edición de nombre inline (mismo patrón que
    "Editar" de `pantallaCentros.ts`), un `<select>` de rol por fila y desactivación con
    confirmación explícita (mismo patrón "confirmando.../Confirmar/Cancelar" que
    `pantallaFichaAlumno.ts`/`pantallaCentros.ts`). Exclusiva de `administrator`
    (`puedeGestionarUsuarios`): un rol sin permiso no ve nada ni dispara ninguna llamada a datos.
    El `<select>` de rol y el botón "Desactivar" del ÚNICO `administrator` activo se deshabilitan
    (`dejariaSinAdministratorActivo`), con una segunda barrera dentro del propio manejador por si
    el evento llegara a dispararse por otra vía. Sin alta de usuario ni acciones que exijan la
    clave de administración de Supabase (requisito 3 de T-24): eso es procedimiento manual, ver
    `DEVELOPERS.md`.
  - `pantallaCierresCentro.ts` (R-12, nuevo) — `mostrarPantallaCierresCentro(contenedor, deps)`:
    calendario de cierres del centro (festivos, vacaciones). Listado con filtro por estado, alta,
    edición inline y desactivar/reactivar (mismo patrón que `pantallaCentros.ts`), sin confirmación
    explícita en la baja (a diferencia de centros/usuarios: no hay un recuento de "afectados" que
    mostrar). Un intento de alta/edición/reactivación que se pisa en fecha con un cierre ya activo
    se ofrece como aviso (`{ tipo: 'solapado', existente }`), sin llegar a escribir. Enrutada en las
    DOS aplicaciones (`#/cierres`): `administrator` con las cuatro operaciones de escritura
    (`puedeGestionarCierresCentro`); `teacher` en modo exclusivamente lectura, sin las cuatro
    operaciones opcionales de la interfaz de dependencias, viendo solo los cierres activos.
  - `pantallaImportacionMasiva.ts` (R-08, nuevo) — `mostrarPantallaImportacionMasiva(contenedor, deps)`:
    dos bloques independientes (alumnos/horarios), cada uno con el mismo flujo en dos pasos: elegir
    un fichero (`<input type="file">`, leído con `deps.leerFichero`) analiza y muestra una vista
    previa obligatoria (fila a fila, qué se creará/omitirá/fallará y por qué); confirmar exige un
    segundo toque explícito y solo entonces escribe. El bloque de horarios resuelve cada email de
    profesor distinto UNA vez (`emailsProfesorUnicosDeCsvHorarios`) antes de analizar las filas.
    Exclusiva de `administrator` (`puedeImportarMasivamente`). Enrutada como `#/importacion`.
  - `pantallaPanelCentro.ts` (R-11, nuevo) — `mostrarPantallaPanelCentro(contenedor, deps)`: tres
    bloques calculados sin ninguna tabla nueva, compuestos por `dominio/panelCentro.ts` sobre datos
    ya existentes de T-15/R-12/R-06/T-18/R-01. (a) sesiones de hoy y su estado (`pasada_lista`/
    `pendiente`/`sin_pasar_lista`) — SIEMPRE con `deps.reloj.ahora()`, nunca con el rango de fechas
    elegido: no tiene sentido preguntar "¿qué ha pasado hoy?" sobre un mes ya cerrado; (b) ranking de
    alumnos con más ausencias sin justificar; (c) ranking de profesores con menor proporción de
    sesiones registradas frente a las esperadas — por profesor titular del slot, no por slot
    individual (una sustitución de R-06 cuenta como registrada del titular, mismo `slot_id`). Los
    rankings muestran solo nombre y cifra, NUNCA avatar (requisito 2: listados transitorios, mismo
    criterio de diseño que el resto del proyecto). Filtro por centro de referencia y por rango de
    fechas (por defecto el mes natural en curso, `limitesDelMes` de R-04) — el filtro de fechas solo
    afecta a los rankings (b)/(c), nunca a las sesiones de hoy. El alcance de alumnos se resuelve UNA
    vez (`listarAlumnosActivosParaPanel`, nueva en `datos/alumnos.ts`, contra `alumno_ficha` — ver
    P-22 más abajo) y su resultado, un `Map` por id, es la única fuente de verdad de "quién está en
    alcance": los registros de asistencia que trae de vuelta `listarHistoricoAsistenciaCompleto` para
    ese centro (que no filtra por `activo`) se descartan si su alumno no está en ese mapa, antes de
    cruzarlos, para que las tres secciones cuenten exactamente los mismos alumnos. Exclusiva de
    `administrator` (`puedeVerPanelCentro`). Enrutada como `#/panel`.
  - `pantallaInformeHorasProfesor.ts` (R-15, nuevo) — `mostrarPantallaInformeHorasProfesor(contenedor, deps)`:
    para un rango de fechas (por defecto el mes en curso), una fila por cada profesor `activo`
    (SIEMPRE, incluso en ceros — a diferencia de los rankings de `pantallaPanelCentro.ts`, aquí el
    objetivo es la nómina) con sesiones/horas reales propias, horas teóricas de sus slots vigentes y
    sesiones/horas reales de SUSTITUCIÓN (R-06) separadas, compuesto por
    `dominio/informeHorasProfesor.ts` sobre datos ya existentes (T-15/R-03/R-06/R-12/T-18). Pantalla
    propia, no un bloque de `pantallaPanelCentro.ts`: su filtro de "centro" es el colegio del ALUMNO,
    sin sentido para un informe del profesor. Botones "Descargar CSV" (con metadatos de rango y fecha
    de generación, `nucleo/csv.ts#documentoCsvConMetadatos`) e "Imprimir / PDF", los dos sobre las
    MISMAS filas (`filasTablaInformeHorasProfesor`) que pinta la tabla en pantalla. Exclusiva de
    `administrator` (`puedeVerInformeHorasProfesor`) — además, solo se monta dentro del router de
    `administrator`, así que un `teacher` no llega a ella por ningún camino (sin RPC ni `403` real:
    `Migración: No` en la spec). Enrutada como `#/informe-horas`.
  - **R-16 (exportación completa del centro):** no es una pantalla propia — un CUARTO bloque dentro
    de `pantallaPanelCentro.ts` (botón «Exportar todo el centro», requisito 1 de la spec: "desde el
    panel de administrator"). Compuesto por `dominio/exportacionCentro.ts` (nuevo,
    `construirDatosExportacionCentro`/`generarJsonExportacionCentro`): catálogo completo de centros,
    TODOS los alumnos —activos e inactivos, a diferencia de los otros tres bloques del panel, que
    solo cuentan los activos— con sus personas de referencia embebidas, todos los slots de horario
    (cualquier vigencia, versionado íntegro) y el histórico completo de asistencia de todos los
    alumnos (incluidas anuladas y retroactivas). `tieneAvatar: booleano` por alumno, nunca
    `avatar_ruta` ni una URL firmada (mismo criterio exacto que el expediente de R-10). Nuevas
    `datos/alumnos.ts#listarTodosLosAlumnosParaExportacion` (ficha completa CON `avatar_ruta` —
    a diferencia de `listarAlumnos`/P-02: aquí hace falta para resolver `tieneAvatar`, que el dominio
    nunca vuelve a exponer — recorre `alumno_ficha` en lotes de 500) y
    `datos/personasReferencia.ts#listarPersonasReferenciaDeAlumnos` (en lote, agrupadas por
    `alumno_id` del lado del cliente). Sin una función nueva en `permisosUi.ts`: el criterio de
    aceptación ("un `teacher` recibe `SinPermiso`") se satisface por la misma inaccesibilidad
    estructural que ya protege el resto del panel (`puedeVerPanelCentro`). Sin migración
    (`Migración: No` en la spec).
  - `pantallaAsistentePrimerosPasos.ts` (R-18, nuevo) — `mostrarPantallaAsistentePrimerosPasos(contenedor, deps)`:
    lista de comprobación de arranque del centro, compuesta por `dominio/asistentePrimerosPasos.ts`
    (nuevo, puro) sobre cuatro booleanos ya resueltos por la pantalla — al menos un centro de
    referencia activo (T-11), un alumno activo (T-12), un slot de horario vigente (`listarTodosLosSlots`,
    nueva en `datos/slotsHorario.ts`, filtrada por `slotsVigentesEn` de `dominio/slotHorario.ts`) y un
    profesor activo (T-24) — cada uno calculado en tiempo real, nunca marcado a mano. Cada paso
    pendiente trae un botón "Ir" a la pantalla donde completarlo (centros, alta manual de alumno,
    listado de alumnos para el horario, usuarios para el profesor). Exclusiva de `administrator`
    (`puedeVerAsistentePrimerosPasos`). Enrutada como `#/primeros-pasos`, con un botón fijo en la
    barra de navegación (siempre accesible); además, `ui/aplicacion.ts` navega sola a esta pantalla al
    entrar en la aplicación SIN ningún hash en la URL mientras quede algún paso pendiente — la
    pantalla por defecto (`alumnos`) ya está pintada antes de decidirlo, así que nunca bloquea la
    interfaz, y una navegación explícita mientras tanto (el usuario pulsa un enlace antes de que la
    comprobación termine) nunca se interrumpe. Sin migración (`Migración: No` en la spec).
  - `pantallaMisHorasProfesor.ts` (R-19, nuevo) — `mostrarPantallaMisHorasProfesor(contenedor, deps)`:
    el mismo cálculo de R-15 (`dominio/informeHorasProfesor.ts`, sin tocar), acotado exclusivamente al
    propio profesor — `deps.profesorId`/`deps.profesorNombre` fijan un array de un único elemento,
    nunca resuelto contra un listado del centro, así que no hay ningún selector de otro profesor ni
    ninguna cifra ajena posible (requisito 2 de la spec). Misma fila SIEMPRE presente, en ceros si no
    hay ninguna sesión (mismo criterio que R-15), sin el mensaje de "ningún profesor en este rango" de
    aquella pantalla (aquí la fila propia nunca falta). Mismos botones "Descargar CSV"/"Imprimir / PDF"
    sobre la misma fuente de filas que la tabla. Exclusiva de `teacher` (`puedeVerInformeHorasPropio`,
    nueva en `permisosUi.ts`) — además, solo se monta dentro del router de `teacher`, así que un
    `administrator` no llega a ella por ningún camino (mismo criterio de inaccesibilidad estructural
    que R-15/R-10). Enrutada como `#/mis-horas`, con botón "Mis horas" en la barra de navegación de
    `teacher`. Sin migración (`Migración: No` en la spec).
- **P-22 (bug real descubierto al escribir R-11, no un hallazgo de auditoría):**
  `datos/asistencia.ts#idsAlumnosDeCentro` (T-23, filtro por centro del histórico) leía
  `centro_referencia_id` de la tabla BASE `alumno`, columna que `003_politicas_rls.sql` nunca
  concede a `authenticated` (ni siquiera a `administrator`, que comparte el mismo rol de Postgres que
  `teacher`) — un "permission denied for column centro_referencia_id" en cualquier entorno real, para
  cualquier rol. El propio `db/pruebas_rls.sql` ya documentaba este mismo error exacto en un
  comentario de la sección de T-21/R-04 (`resolverCentroReferenciaIdDeAlumno` ya lo evitaba yendo
  contra `alumno_ficha`), pero nadie había vuelto a revisar `idsAlumnosDeCentro` a la luz de ese
  hallazgo. Corregido: consulta ahora `alumno_ficha` (como el resto de resolutores de centro del
  proyecto) — sigue devolviendo 0 filas a `teacher`, que nunca ejercita este filtro desde la interfaz
  (`puedeConsultarHistoricoDeCualquiera`, exclusiva de `administrator`). Sin migración: no toca
  ninguna tabla ni política, solo qué relación consulta el cliente.
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
    `npm run migrate` da un `404`, es el primer sospechoso. Un fallo de SQL (`npm run migrate` o
    `npm run probar-rls`) imprime, además del mensaje genérico, el cuerpo real de la respuesta de la
    Management API (`formatearErrorCli`, `herramientas/migraciones/formatoErrorCli.ts`, P-05) — ahí
    viene el mensaje real de Postgres, con `SQLSTATE`/`HINT`/`CONTEXT` si los trae. `npm run
    probar-rls` (`herramientas/probarRls.ts`, T-10) ejecuta `db/pruebas_rls.sql` contra el proyecto
    de destino y resume el resultado con `resumirPruebasRls`/`avisoOmisiones`
    (`herramientas/migraciones/resultadoPruebasRls.ts`, P-07): si alguna comprobación sale `OMITIDO`
    (falta un fixture del entorno — un segundo profesor, un alumno de baja, el bucket de avatares
    vacío) imprime un aviso aparte, siempre, aunque el veredicto final sea verde — no cuenta como
    fallo, pero conviene leer el motivo de cada `[OMITIDO]` antes de dar la cobertura por buena.
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

## Administración de usuarios: qué se hace desde el panel y qué desde Supabase (T-24)

`administrator` gestiona nombre, rol (`administrator`/`teacher`/`student`) y desactivación de
cualquier usuario desde la pantalla "Usuarios" de la aplicación. Tres operaciones exigen
privilegios de administración de Supabase Auth que la clave anónima del cliente no tiene (§0.2:
esa clave nunca entra en el navegador), así que son **procedimiento manual del dueño desde el
panel de Supabase**, no una pantalla:

1. **Alta de un usuario nuevo.** Authentication → Users → Add user, con su email. El trigger
   `crear_perfil_para_usuario_nuevo` (`000_bootstrap_perfil.sql`) le crea la fila de `perfil`
   automáticamente con rol `student` (sin acceso) — después, desde la pantalla "Usuarios", el
   `administrator` le asigna el rol real (`administrator` o `teacher`).
2. **Forzar un cambio de contraseña.** No existe esa acción: la vía del proyecto es siempre que el
   propio usuario dispare el correo de recuperación (`solicitarRecuperacionContrasena`, T-09) desde
   la pantalla de login. Si necesita entrar sin acceso a su correo, el dueño puede enviarle un
   enlace de invitación o restablecimiento desde Authentication → Users → (usuario) → Send
   recovery/magic link.
3. **Revocar una sesión.** Authentication → Users → (usuario) → Revoke sessions. Útil ante la
   sospecha de que un dispositivo comprometido sigue con un `access_token`/`refresh_token` válido —
   la aplicación no ofrece esto porque ningún rol tiene visibilidad de las sesiones activas de otro
   usuario, ni falta le hace para el resto del alcance del MVP.

Igual que el desbloqueo de cuenta de más abajo, esto es a propósito: automatizarlo exigiría meter
la clave de administración de Supabase en algún sitio que el cliente pudiera alcanzar, y esa clave
tiene DDL sobre toda la cuenta del dueño (§0.1), no solo sobre `perfil`.

**El último `administrator` activo no puede desactivarse ni degradarse a sí mismo** (requisito 4 de
T-24): lo impide el trigger `perfil_before_update` de `db/009_administracion_usuarios.sql`, en la
base de datos, no la interfaz — si alguna vez hiciera falta saltárselo en una emergencia real (por
ejemplo, para retirar al único administrador sin ascender antes a nadie), la única vía es, de
nuevo, el editor SQL del panel de Supabase.

## Aplicación instalable y arranque sin red (R-09)

Sin migración, solo cliente. Cuatro piezas nuevas:

- **`manifest.json`** (raíz): nombre, `display: standalone`, `theme_color: #1D4ED8` (el mismo azul
  de acento que ya usa `pantallaPasarLista.ts`), y los tres iconos que exige la instalabilidad
  estándar (192/512 `any`, 512 `maskable`). `index.html` lo enlaza (`<link rel="manifest">`) junto
  con `<link rel="apple-touch-icon">` — iOS no lee `manifest.json` para el icono de instalación,
  necesita esa etiqueta aparte.
- **`iconos/`** (raíz, PNG committeados): generados por `herramientas/iconos/generarIconos.ts`
  (`npm run generar-iconos`), sin ninguna dependencia de imagen — el stack fijado (§0.2) cierra la
  lista de `devDependencies` de herramienta y no admite un paquete de rasterizado. La geometría
  (rectángulo redondeado + marca de verificación, sin texto) y el codificador PNG mínimo sobre
  `node:zlib` viven en `herramientas/iconos/generarPng.ts`, con test propio (CRC-32 contra un
  vector conocido, estructura de chunks, píxeles exactos tras descomprimir el `IDAT`). Reejecutar
  el generador el día que el dueño aporte un logo real y este generador se sustituya.
- **`sw.js`** (raíz, JavaScript plano — ver su cabecera para por qué no pasa por `tsc`): el único
  Service Worker del proyecto (cualquier necesidad futura se añade AQUÍ, nunca en un fichero
  paralelo). Estrategia "red primero, caché como red de seguridad": cada petición GET del mismo
  origen intenta la red antes que la caché (así que con conexión siempre se ve el despliegue más
  reciente — `develop` despliega varias veces al día) y solo cae a lo cacheado cuando la red falla.
  Sin bundler no hay forma de enumerar de antemano el grafo completo de módulos `.js` de `dist/`:
  en vez de precachear una lista completa, se precachea solo el cascarón mínimo conocido
  (`index.html`, `manifest.json`, iconos, `config.js`) y todo lo demás se cachea en cuanto una
  petición real lo resuelve por red — verificado con Playwright en esta sesión: tras una visita
  online, las ~90 peticiones del grafo de módulos quedan en caché, y una recarga con
  `context.setOffline(true)` sirve la aplicación completa (mismo título, mismo contenido) sin red.
  Las peticiones a Supabase (otro origen) nunca se interceptan: los datos siguen exigiendo red o la
  cola de R-07, sin cambio.
- **`src/nucleo/registroServiceWorker.ts`** + **`src/ui/avisoNuevaVersion.ts`**: el aviso de
  versión nueva (requisito 4). El primero envuelve `navigator.serviceWorker`/
  `ServiceWorkerRegistration` tras una interfaz mínima (mismo criterio que `ObjetivoRouter` con
  `window`) y decide CUÁNDO hay una versión nueva esperando; el segundo es el banner en sí
  (`#aviso-nueva-version` en `index.html`, fuera de `#app` a propósito, para sobrevivir a
  cualquier cambio de pantalla). `main.ts` los conecta: al pulsar "Actualizar ahora" se manda al
  Service Worker en espera el mensaje que le hace tomar el control (`self.skipWaiting()` dentro de
  `sw.js`), y `controllerchange` recarga la página. Sin test posible de `sw.js` en sí (`jsdom` no
  implementa Service Worker, mismo criterio que la cola de IndexedDB de R-07); la orquestación de
  `registroServiceWorker.ts` sí tiene 7 tests contra un `NavegadorServiceWorker` de mentira. **Límite
  de verificación documentado honestamente:** en esta sesión no fue posible reproducir en
  Chromium headless, dentro del tiempo de una única ejecución, que modificar `sw.js` y forzar
  `registration.update()`/recargar dispare de verdad el ciclo de instalación — probable
  limitación de temporización del propio headless, no algo achacable al código (el patrón
  `waiting`/`skipWaiting`/`controllerchange` es el estándar documentado de la plataforma). Quien
  lo despliegue de verdad puede confirmarlo editando `sw.js`, desplegando, y comprobando que el
  aviso aparece en una pestaña que ya tenía la aplicación abierta.

## Producción (T-25)

El detalle completo (cabeceras de seguridad, revisión de superficie de ataque tabla por tabla/RPC/
bucket, inventario RGPD y procedimiento de anonimización, riesgo residual del panel y del token,
y el checklist exacto de qué falta para el primer despliegue) vive en
`roadmap/PRODUCCION_T25.md`. Resumen para quien solo necesita el mapa:

- **Cabeceras de seguridad:** `_headers` en la raíz (formato Netlify/Cloudflare Pages) trae la
  `Content-Security-Policy` y el resto de cabeceras ya escritas, pendientes solo de sustituir
  `<PROJECT_REF_PROD>` por el proyecto real y de que el dueño elija proveedor de hosting
  (`<pendiente>` desde el inicio del proyecto, §0.1 de `HOJA_DE_RUTA.md`) — GitHub Pages queda
  descartado porque no admite cabeceras HTTP propias.
- **Textos legales:** borradores en `legal/` (aviso legal, política de privacidad, consentimiento
  de tratamiento, consentimiento de imagen del menor), cada uno marcado como tal con su propio
  checklist de aprobación. Ninguno es válido hasta que el dueño los revise y lo confirme.
- **Paso a producción:** el agente nunca lo ejecuta (§0.1). Cuando el dueño lo haga: crear el
  proyecto, `npm run migrate -- --entorno=prod` con `PERMITIR_PROD=1` (aplica las diez migraciones
  en orden con un solo comando), verificar `esquema_version()` = `9`, ejecutar
  `npm run probar-rls` contra `prod` y guardar su salida, crear el primer `administrator` de
  producción, y anotar la columna `prod` de `db/APLICADAS.md`.
- **Copias de seguridad:** activarlas y **verificar una restauración real**, no solo confiar en
  que Supabase las hace — el criterio de aceptación de T-25 lo exige explícitamente.

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
