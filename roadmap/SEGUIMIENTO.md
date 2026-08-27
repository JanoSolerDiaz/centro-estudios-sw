# SEGUIMIENTO — GestorAcademia — Hub / panel de control

> Hub del registro repartido (ver §0.4 de `HOJA_DE_RUTA.md`). Aquí viven el estado y lo
> transversal; el detalle vive en los documentos vivos de `roadmap/`.
> El dueño no revisa el código: revisa este documento.
>
> **Documentos hermanos:** las **decisiones técnicas** están en `DECISIONES_TECNICAS.md`
> (antiguo §2) y la **bitácora de sesiones** en `HISTORIAL_SESIONES.md` (antiguo §8). Las
> secciones no se renumeran para no romper referencias.

**Hoja de ruta de referencia:** `HOJA_DE_RUTA.md` v1.0 (2026-08-25)
**Modo de operación:** AUTONOMÍA TOTAL
**Última actualización:** 2026-08-27 — T-05 COMPLETADA: monitorización de errores. Sin hallazgos de
severidad alta ABIERTOS en `auditoriacontinua.md` (revisado antes de elegir tarea; el único hallazgo,
#1, sigue de severidad baja/documental), así que se siguió la cola normal de §1: T-05 es la siguiente
tarea PENDIENTE y depende solo de T-02 (COMPLETADA), no de T-07 pese a ir justo antes en el orden de
la hoja de ruta. Tres piezas nuevas: `src/nucleo/informadorErrores.ts` (depura `mensaje`/`pila`/
`contexto` reusando `depurarContexto` de T-02 y registra en el logger local; con un `enviar`
opcional, tolera su propio fallo sin recursión — verificado con un test que simula `enviar`
rechazando y otro lanzando síncronamente, ambos comprobando que no hay una segunda llamada ni un
`unhandledRejection` sin capturar); `src/nucleo/capturaErrores.ts` (conecta `error`/
`unhandledrejection` de un `objetivo` inyectado, testeado con `jsdom` real, no un doble a medida);
y `src/datos/eventoError.ts` (`crearEnviadorEventoError`, la RPC `registrar_evento_error` por
`fetch`, testeado contra `crearFetchSimulado` de T-03, incluida una petición real y un fallo de red).
`src/ui/main.ts` instala la captura ya en el arranque real de la aplicación, sin `enviar` (solo local
por ahora): verificado en Chromium headless (mismo método que T-00) que la página sigue cargando sin
ningún error de consola tras esta instalación. La persistencia remota en `evento_error` queda
**latente**, no bloqueada: T-05 no tiene migración propia (`Migración: No` en su spec), la tabla y
la RPC viajan en el script de T-07 — su contrato exacto (parámetros `p_origen`/`p_mensaje`/`p_pila`/
`p_contexto`, la RPC fija `registrado_en` y el autor) queda fijado en `DECISIONES_TECNICAS.md` para
que esa sesión futura solo tenga que hacerlo coincidir. 9 tests nuevos (53 en total, antes 41),
`env -i npm test` en verde sin ninguna variable de entorno. Verificación pre-push completa
(`typecheck && lint && test && build`) en verde; `dist/` inspeccionado a mano, sin ningún import de
`jsdom` filtrado y sin secretos. Detalle completo de cada decisión en `DECISIONES_TECNICAS.md`.
Siguiente tarea: T-06 (límites de abuso y robustez).

---

> ## ⚑ PARA EL DUEÑO — empieza por aquí
> Lo único que el proyecto necesita de ti está en dos sitios de este documento:
> - **§3 Bloqueos** = tu lista de tareas. Ahora mismo son pocas: el repositorio, el primer usuario administrador, y al final el paso a producción con los textos legales. La funcionalidad asociada queda *latente* hasta que las resuelvas.
> - **§6 Preguntas abiertas** = tus decisiones de negocio. Mientras no respondas, el agente tira por lo conservador; ninguna bloquea el desarrollo.
>
> **Cómo funciona la base de datos** (§0.1 de la hoja de ruta): hay **dos entornos de Supabase**. El de **desarrollo ya existe** y sus credenciales están en `.env.local`, **en tu máquina y en ningún otro sitio**. El de **producción no existe todavía y no se toca**: se crea en T-25.
>
> **Ningún agente aplica migraciones, en ningún entorno** (decisión del 2026-08-25). El access token de la Management API permite DDL sobre toda tu cuenta de Supabase, así que no se le da a un proceso desatendido. El coste es contable: cinco o seis migraciones en todo el MVP. El flujo es: el agente escribe el `.sql`, lo empuja a `develop`, abre la fila en §3 y marca la tarea BLOQUEADA; **tú haces `git pull` y ejecutas `npm run migrate` en local** —no pegues SQL a mano, el runner es lo que te da las guardas, el hash y el ledger—; confirmas en §3 y el agente desbloquea. Que el agente no se pare mientras espera es posible porque toda la suite de tests corre contra dobles, sin red.
>
> **Dos cosas de las que conviene que estés al tanto:**
> - La lista de migraciones pendientes de llevar a producción es la columna `prod` vacía de `db/APLICADAS.md`. No tienes que hacer nada con ella hasta T-25.
> - Desde el 2026-08-25 la ficha del alumno incluye **una fotografía**. Es el dato más sensible del sistema: el almacenamiento es privado, se accede por URL firmada de vida corta, y la imagen se re-codifica antes de subirla para quitarle los metadatos EXIF (incluida la geolocalización). Necesitarás una **hoja de consentimiento de uso de imagen del menor**, distinta del consentimiento general de tratamiento — está en T-25 como acción tuya.
>
> Para control (no exige acción): `DECISIONES_TECNICAS.md` (qué decidió el agente y por qué — sustituye a leer código), `db/MODELO.md` (el modelo de datos explicado en español, sin SQL), `auditoriacontinua.md` (hallazgos abiertos), `db/APLICADAS.md` (qué hay aplicado en cada entorno), y aquí §7 (desviaciones) y §5 (P-XX; veta escribiendo `REVERTIR`).

---

## 1. ESTADO GLOBAL DE TAREAS  *(fuente autoritativa de estado y orden de "siguiente tarea")*

| ID | Tarea | Estado | Última sesión | Notas |
|----|-------|--------|---------------|-------|
| T-00 | Verificación inicial | COMPLETADA | 2026-08-26 | `package.json` (`dependencies` vacío), `tsconfig.json` strict, ESLint mínimo (T-01 lo sustituye por el estricto/type-aware), `index.html` + `src/ui/main.ts` verificado en Chromium headless |
| T-01 | Linting y formato | COMPLETADA | 2026-08-26 | ESLint estricto *type-aware* + 4 reglas de guarda del stack + hook de pre-commit; sin Prettier (ver DECISIONES_TECNICAS) |
| T-02 | Logger centralizado | COMPLETADA | 2026-08-26 | `src/nucleo/registro.ts`; único fichero con permiso ESLint para `console.*`; depuración de contexto (personales, avatar, tokens/claves) por nombre y por forma del valor |
| T-03 | Suite de tests mínima | COMPLETADA | 2026-08-26 | 41 tests; dominio (slots, asistencia) con reloj inyectado, datos (doble de `fetch`), UI (`jsdom`); guarda automática contra lectura directa del reloj en dominio |
| T-04 | CI | COMPLETADA | 2026-08-26 | `.github/workflows/ci.yml`: `npm ci` + typecheck/lint/test/build en cada push a `develop` y `master`, sin secretos; Node fijado en `.nvmrc` |
| T-05 | Monitorización de errores | COMPLETADA | 2026-08-27 | Captura global + informador con scrubbing (reusa `depurarContexto` de T-02) + cliente RPC contra doble de `fetch`; sin bloqueo — depende solo de T-02. El envío remoto real queda latente hasta T-07 (tabla) y T-08 (cliente real); contrato de `registrar_evento_error` fijado en DECISIONES_TECNICAS.md para que T-07 lo respete |
| T-06 | Límites de abuso y robustez | PENDIENTE | — | — |
| T-07 | Modelo de datos, runner de migraciones y entornos | PENDIENTE | — | Migración `001_esquema_inicial`; punto 14 (`evento_error`) debe seguir el contrato de RPC fijado por T-05 en `DECISIONES_TECNICAS.md` (parámetros `p_origen`/`p_mensaje`/`p_pila`/`p_contexto`) |
| T-08 | Cliente propio de la API de Supabase | PENDIENTE | — | PostgREST + GoTrue + Storage |
| T-09 | Autenticación y los tres roles | PENDIENTE | — | `student` sin acceso desde el día 1 |
| T-10 | Autorización: políticas RLS de los tres roles | PENDIENTE | — | Migración `002_politicas_rls` |
| T-11 | Catálogo de centros de estudios | PENDIENTE | — | Prerequisito del alta de alumno |
| T-12 | Ficha de alumno: datos, centro y baja lógica | PENDIENTE | — | — |
| T-13 | Personas de referencia del alumno | PENDIENTE | — | 0..N, solo `administrator` |
| T-14 | Avatar del alumno (Supabase Storage) | PENDIENTE | — | Migración `003_bucket_avatares`. Bucket privado |
| T-15 | Slots de horario y no-retroactividad | PENDIENTE | — | — |
| T-16 | Interfaz de gestión del administrador | PENDIENTE | — | Centros, ficha completa y horarios |
| T-17 | Motor de propuesta "quién toca ahora" | PENDIENTE | — | — |
| T-18 | Alta de asistencia (RPC `registrar_asistencia`) | PENDIENTE | — | Migración `004_rpc_registrar_asistencia` |
| T-19 | Pantalla de pasar lista | PENDIENTE | — | — |
| T-20 | Alumno extra: listado completo y selección manual | PENDIENTE | — | — |
| T-21 | Revisar y modificar los registros por slot | PENDIENTE | — | Migración `005_rpc_actualizar_asistencia` |
| T-22 | "Mi horario" del profesor (teacher) | PENDIENTE | — | — |
| T-23 | Consulta y exportación del histórico | PENDIENTE | — | — |
| T-24 | Administración de usuarios y roles | PENDIENTE | — | — |
| T-25 | Endurecimiento, privacidad y paso a producción | PENDIENTE | — | La única tarea que toca `prod` |
| R-01 | Registro explícito de ausencias | PENDIENTE | — | Oleada v1 / F-01 · Migración `006_registro_ausencias` |
| R-02 | Justificación de una ausencia | PENDIENTE | — | Oleada v1 / F-01 · Migración `007_justificacion_ausencia` |
| R-03 | Registro de salida y cómputo de horas reales | PENDIENTE | — | Oleada v1 / F-01 · Migración `008_registro_salida` |
| R-04 | Informe mensual por alumno | PENDIENTE | — | Oleada v1 / F-02 |
| R-05 | Aviso de ausencia injustificada listo para enviar | PENDIENTE | — | Oleada v1 / F-02 · sin envío automático |
| R-06 | Sustitución puntual de profesor en un slot | PENDIENTE | — | Oleada v1 / F-03 · Migración `009_sustitucion_profesor` |
| R-07 | Pasar lista con conexión intermitente | PENDIENTE | — | Oleada v1 / F-03 · solo cliente |
| R-08 | Importación masiva de alumnos y horarios | PENDIENTE | — | Oleada v2 / F-04 |
| R-09 | Aplicación instalable y arranque sin red | PENDIENTE | — | Oleada v2 / F-04 · solo cliente |
| R-10 | Expediente completo del alumno (RGPD) | PENDIENTE | — | Oleada v2 / F-05 |
| R-11 | Panel de centro para el administrador | PENDIENTE | — | Oleada v2 / F-06 |

**Estados:** PENDIENTE · EN CURSO · COMPLETADA · DESPLEGADA EN PRODUCCIÓN · BLOQUEADA — <motivo> · DESCARTADA — <motivo>

*(La spec de cada tarea: T-XX en el cuerpo de `HOJA_DE_RUTA.md`; R-XX en `ROADMAP_PRODUCTO.md`. Este §1 NO repite la spec, solo el estado.)*

---

## 3. BLOQUEOS — ACCIONES PENDIENTES DEL DUEÑO

> El código se despliega igualmente; estas acciones activan funcionalidad latente.
>
> **Cada migración SÍ genera una fila aquí**, porque el agente no aplica DDL en ningún entorno
> (§0.1). El agente escribe el `.sql`, lo empuja a `develop` y abre la fila; el dueño hace
> `git pull` y ejecuta **`npm run migrate` en local**; el dueño confirma y el agente desbloquea.
> Mientras espera, el agente sigue con la siguiente tarea que no dependa de esa migración.
>
> Lo que **no** genera filas aquí es la propagación a producción: esa es la columna `prod` vacía de
> `db/APLICADAS.md` y se hace de una vez en T-25. Esta tabla es solo para lo que el dueño debe hacer
> **ahora** para desbloquear algo.

| # | Acción | Tarea | Instrucciones exactas | Estado |
|---|--------|-------|-----------------------|--------|
|   |        |       |                       |        |

---

## 4. INCIDENTES DE DEPLOY

> Cada vez que un push rompa producción: qué pasó, qué commit lo causó, cómo se revirtió, qué se aprendió.

| Fecha | Commit causante | Síntoma | Resolución | Lección |
|-------|-----------------|---------|------------|---------|
| —     | Sin incidentes  | —       | —          | —       |

---

## 5. TAREAS AUTOPROPUESTAS (P-XX)

> Registrar aquí cada P-XX ANTES de implementarla (§0.3). El dueño veta con DESCARTAR o REVERTIR en la última columna.

| ID | Descripción | Motivo / valor esperado (incl. `origen: auditoría #N` si aplica) | Estado | Veto del dueño |
|----|-------------|-------------------------------------------------------------------|--------|----------------|
|    |             |                                                                   |        |                |

---

## 6. PREGUNTAS ABIERTAS PARA EL DUEÑO

> Decisiones de negocio que los agentes no pueden tomar. El dueño responde en la última columna.
> El agente las abre al llegar a la tarea correspondiente; ninguna bloquea el desarrollo, porque
> cada una tiene un valor por defecto conservador escrito en la spec de su tarea.
>
> Ya previstas en las specs, para que el dueño sepa qué le van a preguntar: campos adicionales de
> `centro_estudios` (T-11); campo `relacion` en las personas de referencia y si debe exigirse al
> menos una vía de contacto por alumno (T-13); zona horaria y ventana de tolerancia (T-17);
> política de registros duplicados (T-18); y la ventana de edición del profesor, 7 días por
> defecto (T-21).
>
> **Ya resuelta (2026-08-25):** el profesor **sí** ve el avatar de sus alumnos en pasar lista, en
> formato card. Eso amplió la lectura del bucket al rol `teacher`, acotada a alumnos activos.

| # | Pregunta | Tarea | Respuesta |
|---|----------|-------|-----------|
| 1 | R-05 deja el aviso de ausencia listo para enviar a mano (`mailto:` o copiar al portapapeles), sin integración. ¿Se quiere en algún momento el envío automático por email transaccional, SMS o WhatsApp Business? Implica dar de alta una cuenta de servicio externo (posiblemente de pago) — decisión reservada al dueño, no autonomizable por una P-XX (§0.3). Mientras no haya respuesta, R-05 se entrega en su versión sin integración y no queda bloqueada por esto. | R-05 | |
| 2 | Con R-04 (informe mensual) y R-05 (aviso a la familia) ya en el roadmap, ¿tiene sentido en el futuro dar al rol `student` —o a una persona de referencia, sin necesidad de que sea el propio menor quien inicie sesión— una vista de solo lectura de su propio histórico de asistencia y ausencias justificadas? Es justo la ampliación de `student` que la hoja de ruta reserva expresamente al dueño (§0.2); no se propone ninguna R-XX para esto sin tu decisión. | — | |
| 3 | `auditoriacontinua.md` registra el hallazgo #1 (severidad baja, higiene documental): `HOJA_DE_RUTA.md` se autodeclara "DOCUMENTO INMUTABLE... no se modifica nunca" pero el propio dueño lo editó 41 minutos después de crearse, el mismo día, para ajustar el protocolo de §0.1 (que el documento sí permite cambiar al dueño) y el cuerpo de la tarea T-07 (que se declara inmutable sin excepción explícita para nadie). Sin riesgo de dato ni operativo: ocurrió antes de que ninguna sesión de desarrollo empezara a usar el documento. No encaja como mejora de producto (no es una R-XX) ni como deuda técnica de código (no hay nada que programar): es una pregunta de gobernanza documental que solo el dueño puede resolver, porque el PM tiene este documento en modo SOLO LECTURA. ¿Quieres que la cabecera de `HOJA_DE_RUTA.md` deje explícita una excepción para tus propias ediciones (p. ej. "inmutable salvo para el dueño"), o prefieres que la declaración se mantenga literal y que una futura edición tuya, si hace falta, se documente aquí mismo como excepción puntual? Mientras no haya respuesta, el hallazgo queda `ABIERTO` en `auditoriacontinua.md` sin bloquear nada — origen: auditoría #1. | — | |

---

## 7. DESVIACIONES RESPECTO A LA HOJA DE RUTA ORIGINAL

> Resumen consolidado para comparar contra `HOJA_DE_RUTA.md` de un vistazo.

| Fecha | Tarea | Desviación | Motivo |
|-------|-------|-----------|--------|
|       |       |           |        |
