# MODELO DE DATOS — GestorAcademia

> Explicación en español, legible sin saber SQL, de lo que hay en la base de datos y por qué. Se
> mantiene al día en cada migración (§0.4 de `HOJA_DE_RUTA.md`). El SQL exacto vive en `db/NNN_*.sql`;
> este documento es el mapa, no la fuente de verdad — ante cualquier duda, el SQL manda.
>
> Estado actual (corregido 2026-09-01, sesión de T-21): `000`/`000b` (bootstrap manual del dueño) +
> `001_esquema_inicial` + `002_bloqueo_cuenta` + `003_politicas_rls` + `004_bucket_avatares` +
> `005_rpc_registrar_asistencia` + `006_arreglo_limite_tasa_ambiguo`, las seis **aplicadas y
> verificadas** en `dev` (`esquema_version()` = `6`, `npm run probar-rls` en verde: 67
> comprobaciones, 0 omitidas, 0 fallidas). `007_rpc_buscar_alumnos` (T-20) y
> `008_rpc_actualizar_asistencia` (T-21) están escritas y testeadas —estáticamente y con
> `db/pruebas_rls.sql`—, **pendientes de que el dueño las aplique en orden** (`007` antes que `008`)
> con `npm run migrate` (filas 9 y 10 de §3 de `roadmap/SEGUIMIENTO.md`; ver también
> `db/APLICADAS.md` § "Pendiente de aplicar"). La matriz completa rol × tabla × operación vive en
> `roadmap/DECISIONES_TECNICAS.md` (sección final, fuera del registro append-only).

## Diagrama de relaciones (texto)

```
centro_estudios ──< alumno >── persona_referencia
                       │
                       ├──< slot_horario >── perfil (profesor_id, rol='teacher')
                       │
                       └──< asistencia >── asistencia_historial
                              │      \
                              │       └── perfil (profesor_id, actualizado_por, rol='teacher')
                              └── slot_horario (opcional: slot_id, si origen='slot')

perfil ──< evento_error (registrado_por, opcional)
perfil ──< alumno (usuario_id, opcional — vínculo futuro con la cuenta del propio alumno)

esquema_migracion — ledger interno del runner, sin relación con las tablas de producto.
```

Lectura: `A ──< B` significa "una fila de A puede tener muchas filas de B" (una FK de B hacia A).
`A >── B` es la misma relación leída desde el otro lado.

## Tablas que ya existían (bootstrap manual, `000`/`000b`)

### `perfil`

Datos de "academia" de cada usuario. La identidad (email, contraseña) vive en `auth.users`, que
gestiona Supabase Auth; `perfil` es el complemento con lo que la aplicación necesita.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Mismo id que `auth.users`. Es también la clave primaria. |
| `nombre` | texto | sí | Nombre para mostrar. Lo rellena el trigger al crear el usuario, a partir de los metadatos o del email. |
| `rol` | texto | sí | `administrator` \| `teacher` \| `student`. Nace siempre en `student` (sin acceso), aunque luego el administrador lo cambie. |
| `activo` | booleano | sí | Un perfil inactivo no entra, aunque su contraseña sea correcta. |
| `intentos_fallidos` | entero | sí | Añadido por `002_bloqueo_cuenta` (P-01). Contraseñas incorrectas contadas por `registrar_intento_fallido()`. Por defecto `0`; solo vuelve a `0` cuando `admin_desbloquear_usuario()` levanta un bloqueo — no se resetea con un login correcto. |
| `bloqueado` | booleano | sí | Añadido por `002_bloqueo_cuenta` (P-01). `true` al llegar a 3 intentos fallidos. Por defecto `false`. Ver la sección de más abajo. |
| `creado_en` / `actualizado_en` | fecha y hora | sí | Los fija el servidor. |

Nunca se borra un perfil: se desactiva. Un trigger sobre `auth.users` crea la fila de `perfil`
automáticamente al crear cualquier usuario (desde el panel de Supabase o, en el futuro, desde una
pantalla de alta).

### `esquema_migracion` + `esquema_version()`

El "ledger" de migraciones aplicadas: qué número, con qué nombre, con qué hash de fichero y cuándo.
Nadie lo consulta directamente por la API (RLS activa sin ninguna política); la única forma de
leerlo es la función `esquema_version()`, que devuelve el número más alto aplicado (o `-1` si no
hay ninguno). El runner de migraciones (`npm run migrate`, T-07) es quien escribe aquí.

## Tablas nuevas de esta migración (`001_esquema_inicial`, T-07)

### `centro_estudios`

El catálogo de colegios e institutos a los que asisten los alumnos (no es la propia academia:
es el centro reglado de origen). Existe porque toda ficha de alumno necesita apuntar a uno.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria. |
| `nombre` | texto | sí, único | El nombre del centro. Único de forma exacta; detectar "San José" y "san jose" como el mismo centro es trabajo de la aplicación (T-11), no una restricción de la base de datos. |
| `activo` | booleano | sí | Baja lógica: nunca se borra un centro, se desactiva. Un centro inactivo no invalida a los alumnos que ya lo tenían como referencia. |
| `creado_en` / `actualizado_en` | fecha y hora | sí | Automáticos. |

### `alumno`

La ficha del alumno.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria. |
| `nombre` | texto | sí | Nombre de pila. |
| `primer_apellido` | texto | sí | — |
| `segundo_apellido` | texto | **no** | Un alumno con un solo apellido es normal, no un error. |
| `centro_referencia_id` | uuid | sí | A qué `centro_estudios` pertenece. |
| `avatar_ruta` | texto | no | **Ruta** del fichero en el bucket privado de Storage (T-14), nunca una URL. Se pide una URL firmada de vida corta cada vez que hay que mostrarla. |
| `email_alumno` / `telefono_alumno` | texto | no | Contacto propio del alumno, si lo tiene. Formato validado por `CHECK` cuando se informan. |
| `activo` | booleano | sí | Baja lógica. Un alumno de baja no aparece para pasar lista, pero su histórico de asistencia y de horarios queda intacto. |
| `alta_en` / `baja_en` / `motivo_baja` | fecha / fecha / texto | alta_en sí, el resto no | Cuándo entró y, si procede, cuándo y por qué se le dio de baja. |
| `usuario_id` | uuid | no | Vínculo futuro con la cuenta del propio alumno (fuera del MVP). Existe desde ahora para no tener que migrar la tabla cuando se necesite. |
| `creado_en` / `actualizado_en` | fecha y hora | sí | Automáticos. |

Nunca hay una operación de `DELETE` sobre `alumno`, en ninguna política ni en ninguna ruta.

### `persona_referencia`

Padres, madres o tutores de un alumno. **0 a N** por alumno.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria. |
| `alumno_id` | uuid | sí | A qué alumno pertenece. |
| `nombre` / `primer_apellido` | texto | sí | — |
| `segundo_apellido` | texto | no | — |
| `email_referencia` | texto | no | — |
| `telefono_referencia` | texto | **sí** | Es la vía de contacto real de un menor: a diferencia del teléfono del propio alumno, este es obligatorio. |
| `creado_en` / `actualizado_en` | fecha y hora | sí | Automáticos. |

**Es la única tabla de todo el sistema donde un `DELETE` real está permitido** (decisión de §0.2,
por el RGPD: son datos de un tercero, sin valor probatorio como un registro de asistencia). Solo
`administrator` la lee y la escribe; un `teacher` no la ve nunca, en ninguna pantalla ni por
consulta directa (se verifica en T-10 con `db/pruebas_rls.sql`).

### `slot_horario`

El horario semanal recurrente: qué alumno tiene clase con qué profesor, qué día y a qué hora.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria. |
| `alumno_id` / `profesor_id` | uuid | sí | Quién y con quién. |
| `dia_semana` | número (1–7) | sí | 1 = lunes … 7 = domingo. |
| `hora_inicio` / `hora_fin` | hora | sí | `hora_fin` siempre después de `hora_inicio`. |
| `asignatura_o_grupo` | texto | no | Etiqueta libre. |
| `vigente_desde` / `vigente_hasta` | fecha / fecha | desde sí, hasta no | El horario es editable, pero **versionado**: cambiarlo no reescribe la versión anterior, la cierra (`vigente_hasta`) y abre una nueva. |
| `creado_en` / `actualizado_en` | fecha y hora | sí | Automáticos. |

Por qué versionado: cada asistencia guarda su propio **snapshot** del slot en el momento de
registrarse (ver más abajo). Si el horario de un alumno cambia el mes que viene, el histórico de
este mes no debe recalcularse con el horario nuevo — por eso el histórico nunca consulta
`slot_horario` para saber qué pasó, solo lee el snapshot que ya quedó guardado en `asistencia`.

### `asistencia`

El corazón del producto: cada vez que un profesor marca a un alumno como presente (o registra una
ausencia, ya anulada, etc.).

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria. |
| `alumno_id` / `profesor_id` | uuid | sí | Quién y quién lo registró. |
| `registrado_en` | fecha y hora | sí | El instante en que la fila se **creó**. Lo fija el servidor y es **inmutable**: ni la propia RPC de edición puede cambiarlo, lo impide un trigger. |
| `ocurrido_en` | fecha y hora | sí | El momento **atribuido** a la asistencia. Es lo que se edita al corregir una hora. En un registro tomado en vivo coincide con `registrado_en`; en uno añadido después, no. |
| `es_retroactivo` | booleano | sí | Verdadero si `ocurrido_en` y `registrado_en` difieren en más de 5 minutos. Lo comprueba un `CHECK`, no puede quedar inconsistente con las otras dos columnas. |
| `origen` | texto | sí | `slot` (venía de un horario) o `manual` (alumno "extra", añadido a mano). |
| `slot_id` + snapshot (`slot_dia_semana`, `slot_hora_inicio`, `slot_hora_fin`, `slot_asignatura_o_grupo`) | — | solo si `origen = 'slot'` | Copia congelada del slot en el momento de registrar, no una referencia viva. |
| `estado` | texto | sí | `valida` o `anulada`. Anular es un `UPDATE`, nunca un `DELETE`: la fila permanece, con su motivo. |
| `motivo_anulacion` | texto | obligatorio si `estado = 'anulada'` | — |
| `nota` | texto | no | Comentario libre del profesor. |
| `actualizado_en` / `actualizado_por` | fecha / uuid | no (hasta el primer `UPDATE`) | Los fija el propio trigger a partir de `now()`/`auth.uid()`, nunca el cliente. |
| `peticion_id` | uuid | sí, único | Clave de idempotencia que genera el cliente antes de llamar a la RPC: si la petición se duplica por un doble toque o un reintento, el segundo intento choca con la restricción `unique` en vez de crear una fila repetida. |

**Es editable (`UPDATE`) pero nunca se borra.** Decisión expresa del dueño (2026-08-25): quien se
equivoca al pasar lista debe poder arreglarlo, y anular es un estado, no una desaparición. Toda
escritura pasa por una RPC `SECURITY DEFINER` (`registrar_asistencia`, T-18; `actualizar_asistencia`,
T-21): el `INSERT` y el `UPDATE` directos sobre la tabla están revocados para cualquier rol de la
API, incluido `service_role`.

### `asistencia_historial`

Cada vez que se hace un `UPDATE` sobre una fila de `asistencia`, un trigger copia aquí la fila **tal
como estaba justo antes** del cambio, junto con quién lo hizo y cuándo. Tiene las mismas columnas
que `asistencia` (menos `peticion_id`... en realidad la conserva también, para poder rastrear qué
petición originó cada versión) más `asistencia_id` (a qué fila pertenece), `cambiado_en` y
`cambiado_por`.

Es **estrictamente append-only**: sin `UPDATE` ni `DELETE` para nadie, en ningún rol — ni siquiera
`service_role`. La única fila que entra aquí la escribe el propio trigger, que corre con los
privilegios de su propietario y no necesita ningún permiso concedido explícitamente para hacerlo.

### `evento_error`

Errores no controlados del cliente (T-05): `window.onerror`, promesas rechazadas sin capturar,
fallos de la capa de acceso a Supabase. Ya llegan depurados desde el cliente (sin datos personales,
sin rutas de avatar, sin tokens) antes de guardarse.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria. |
| `origen` | texto | sí | `no_controlado` \| `promesa_rechazada` \| `capa_datos`. |
| `mensaje` | texto | sí | El mensaje del error, ya depurado. |
| `pila` | texto | no | La traza, si la hay. |
| `contexto` | jsonb | no | Datos adicionales, ya depurados. |
| `registrado_en` | fecha y hora | sí | Lo fija la RPC. |
| `registrado_por` | uuid | no | Puede ser `null`: un error puede ocurrir antes de que haya sesión (p. ej. en la pantalla de login). |

Se escribe únicamente a través de la RPC `registrar_evento_error(p_origen, p_mensaje, p_pila,
p_contexto)`, que fija ella misma `registrado_en` y `registrado_por` — el contrato que fijó T-05.
La lectura queda reservada a `administrator` (política `evento_error_admin_leer`, `003_politicas_rls.sql`, T-10).

### `limite_tasa`

Infraestructura, no dato de negocio: contador de operaciones por clave y ventana fija (T-06,
primera RPC real a la que se conecta — 60 operaciones por profesor y minuto, ver
`roadmap/DECISIONES_TECNICAS.md`). Nunca se lee ni se escribe por PostgREST: RLS habilitada sin
ninguna política y `revoke all` a `anon`/`authenticated`/`service_role`, igual que las tablas
anteriores. Solo la alcanza `aplicar_limite_tasa(clave, maximo, ventana_segundos)`, `SECURITY
DEFINER`, llamada desde dentro de `registrar_asistencia` (T-18) y de `actualizar_asistencia` (T-21),
con la MISMA clave (`'asistencia:' || profesor_id`, cupo compartido entre alta y edición del mismo
profesor) — nunca directamente desde la API.

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `clave` | texto | sí, clave primaria | `'asistencia:' \|\| profesor_id`, hoy la única forma en uso. |
| `ventana_inicio` | fecha y hora | sí | Inicio de la ventana fija actual (se reinicia sola al expirar). |
| `contador` | entero | sí | Operaciones contadas dentro de la ventana actual. |

## `registrar_asistencia` (`005_rpc_registrar_asistencia.sql`, T-18)

Única vía de alta de `asistencia` — el `INSERT` directo está revocado (ver arriba). `SECURITY
DEFINER`: fija ella misma `registrado_en` (`now()` del servidor) y `profesor_id` (`auth.uid()`, o
el profesor indicado por un `administrator`, nunca al revés); el snapshot del slot
(`slot_dia_semana`/`slot_hora_inicio`/`slot_hora_fin`/`slot_asignatura_o_grupo`) se lee de
`slot_horario` en el momento de registrar, nunca lo envía el cliente. `es_retroactivo` se calcula
con la misma fórmula exacta que el `CHECK asistencia_retroactivo_coherente` de `001_esquema_inicial`
(más de 300 segundos de diferencia entre `ocurrido_en` y `registrado_en`) — esa restricción, ya
aplicada e inmutable, es la fuente de verdad.

**Validaciones, en orden:** (1) quién llama y en nombre de quién — solo `administrator` puede pasar
`p_profesor_id` para registrar por otro; un `teacher` sin ese parámetro registra con su propia
identidad; cualquier otro rol (incluido `student`) se rechaza; (2) límite de abuso de T-06 (60/profesor/minuto,
vía `aplicar_limite_tasa`); (3) `ocurrido_en` no puede estar en el futuro ni superar 7 días hacia
atrás (`VENTANA_RETROACTIVA_MAXIMA_DIAS`, valor conservador de partida, pregunta abierta #12 de §6
de `SEGUIMIENTO.md`); (4) el alumno existe y está activo; (5) el `origen` es coherente con
`slot_id` (`slot` lo exige, `manual` lo prohíbe) y, si es `slot`, que pertenezca al profesor que
registra, al alumno indicado, y esté vigente en la fecha local (`Europe/Madrid`, misma constante de
T-17) del registro.

**Duplicados (requisito 4 de T-18, decisión por defecto — pregunta abierta #12 de §6):** un segundo
registro del MISMO alumno en el MISMO slot y día se rechaza, mediante una restricción `unique`
parcial de verdad (`asistencia_uq_alumno_slot_dia_valida`, sobre `(alumno_id, slot_id, fecha local)`
donde `estado = 'valida'` y `slot_id is not null`) — no una comprobación a mano, para que también
proteja contra dos llamadas concurrentes. Un `peticion_id` repetido choca por su parte con
`asistencia_peticion_id_unico` (ya existente desde `001_esquema_inicial`): la propia línea de la
tabla `asistencia` de arriba ya lo explica ("el segundo intento choca con la restricción `unique`
en vez de crear una fila repetida") — **no** hay una comprobación de idempotencia que devuelva en
silencio la fila ya creada; un reintento con el mismo `peticion_id` recibe un error de conflicto,
igual que el duplicado de negocio.

## `buscar_alumnos_activos` (`007_rpc_buscar_alumnos.sql`, T-20)

Búsqueda de "alumno extra" (clase puntual, cualquier alumno activo del centro aunque no esté en el
horario habitual del profesor). `SECURITY DEFINER` por un único motivo: un `teacher` no tiene GRANT
de columna sobre `alumno.centro_referencia_id` (ver "Políticas RLS por rol" más abajo), y el
requisito de mostrar el centro para desambiguar homónimos exige leerla para el `join` con
`centro_estudios`. El tipo de retorno explícito —`id, nombre, primer_apellido, segundo_apellido,
centro_nombre`— es lo que garantiza que nunca viaja contacto, personas de referencia ni
`avatar_ruta`: no es una promesa de la función, es que esas columnas no existen en su forma de
salida.

**Reglas:** rechaza a cualquiera que no sea `administrator` o `teacher` (incluido `student`, sin
excepción); con texto vacío o solo espacios devuelve cero filas sin tocar la tabla; busca por
subcadena (`ilike`, insensible a mayúsculas, NO acento-insensible — misma limitación que
`listarAlumnos` de T-12, ver `roadmap/DECISIONES_TECNICAS.md`) en `nombre`, `primer_apellido` o
`segundo_apellido`; solo alumnos `activo`; límite de resultados acotado en servidor entre 1 y 20
(por defecto 8), defensa en profundidad además del rebote y la cancelación de petición del cliente
(T-20, requisito 2). Sin conexión con `limite_tasa` de T-06: es una lectura, no una escritura que
mute datos, y el propio rebote del cliente ya acota la frecuencia real de peticiones.

## `actualizar_asistencia` (`008_rpc_actualizar_asistencia.sql`, T-21)

Única vía de modificación de una fila de `asistencia` ya existente — el `UPDATE` directo está
revocado (ver arriba). `SECURITY DEFINER`, cinco acciones combinables en una sola llamada:

- **Cambiar el alumno** (`p_alumno_id`): valida que exista y esté activo, igual que el alta.
- **Ajustar la hora** (`p_ocurrido_en`): mismas reglas que el alta (nunca en el futuro, nunca más de
  7 días atrás); `es_retroactivo` se recalcula SIEMPRE con la fórmula del `CHECK`, aunque
  `p_ocurrido_en` no cambie (el alumno o el slot sí podrían haber cambiado en la misma llamada).
- **Cambiar el slot atribuido** (`p_slot_id`): solo sobre un registro que YA es de origen `slot`
  (nunca convierte un `manual` en `slot` ni al revés); recalcula el snapshot desde el slot nuevo,
  con las mismas comprobaciones que el alta (pertenece al mismo profesor, al alumno resultante,
  vigente en la fecha del registro).
- **Anular** (`p_anular` + `p_motivo_anulacion`, obligatorio): `estado = 'anulada'`. Sin "desanular".
- **Editar la nota** (`p_nota` + `p_nota_provista`): el único par de parámetros "tri-estado" del
  proyecto — sin `p_nota_provista = true`, `p_nota` se ignora, así que enviar `p_nota = null` a
  secas nunca la vacía por descuido.

**Autorización, antes de tocar nada más:** `administrator` sobre cualquier registro, sin límite
temporal; `teacher` solo sobre `profesor_id = auth.uid()` y dentro de `VENTANA_EDICION_TEACHER_DIAS`
(7 días desde `registrado_en` — cuándo se CREÓ la fila, no desde `ocurrido_en`); `student`, nunca.
`registrado_en`/`profesor_id`/`peticion_id` no son parámetros de esta función: no hay forma de
pedir cambiarlos, y `asistencia_proteger_inmutables` (trigger de `001`) seguiría abortando si
alguien lo intentara desde otro sitio. `actualizado_en`/`actualizado_por` los fija ese MISMO trigger
(`BEFORE UPDATE`), no esta función; la copia en `asistencia_historial` la hace el trigger `AFTER
UPDATE` (`001`), con la fila tal como estaba justo antes de este `UPDATE`.

## Administración de usuarios (`009_administracion_usuarios.sql`, T-24)

Su spec dice "Migración: No", pero el requisito 4 ("el último `administrator` activo no puede
desactivarse ni degradarse a sí mismo; la regla se implementa en la base de datos") es DDL por
definición — mismo criterio que T-09/T-20/T-23 aplicaron antes: la dependencia real no siempre
coincide con la de la spec. El resto del alcance de T-24 (listado, edición de nombre, cambio de
rol, desactivación, vínculo `alumno.usuario_id`) no necesita nada nuevo: el `UPDATE` de
`administrator` sobre cualquier fila de `perfil` ya estaba concedido y aislado por RLS desde el
bootstrap (`perfil_admin_actualizar`), y `alumno.usuario_id` existe desde `001`.

- **`perfil.actualizado_por`** (columna nueva): quién hizo el último cambio sobre ese perfil, mismo
  patrón que `asistencia.actualizado_por` (`001`) — lo fija el trigger, nunca el cliente.
- **Trigger `perfil_before_update`** sustituye al genérico `perfil_tocar_actualizado_en` del
  bootstrap (mismo criterio que `asistencia_proteger_inmutables` sustituyó a `tocar_actualizado_en`
  para `asistencia` en `001`): sigue tocando `actualizado_en`/`actualizado_por`, y además aborta un
  `UPDATE` que dejaría al sistema sin ningún `administrator` activo — se dispara solo cuando la fila
  ANTES del cambio era un `administrator` activo, el cambio le quita esa condición (cambia de rol o
  se desactiva), y no queda **ninguna otra** fila con `rol = 'administrator' and activo` distinta de
  ella misma. No necesita `SECURITY DEFINER`: quien ejecuta el `UPDATE` ya tiene que ser
  `administrator` (única política de `UPDATE` sobre `perfil`), y un `administrator` ya puede leer
  todas las filas de `perfil` (`perfil_admin_leer_todos`) — el `SELECT` del trigger no pide ningún
  privilegio que el llamante no tuviera ya.
- **Requisito 3 de T-24** (alta de usuario, forzar contraseña, revocar sesión — todo lo que exige
  `service_role`) sigue sin automatizar, documentado como procedimiento manual en `DEVELOPERS.md`,
  tal como pide su propia spec.

## Bloqueo de cuenta (`002_bloqueo_cuenta.sql`, P-01)

Ampliación de T-09 acordada por el dueño el 2026-08-27 (§5/§6#5 de `SEGUIMIENTO.md`), aplicada
**antes** de T-10 a propósito: `rol_actual()` pasa a exigir `not bloqueado` además de `activo`, así
que toda política que use `es_administrator()`/`es_teacher()` (que es como T-10 debe escribir cada
una de las suyas) hereda la condición automáticamente, sin repetirla tabla por tabla.

- **`rol_actual()` redefinida** (`create or replace function`, conserva `security definer`): además
  de `activo`, ahora exige `not bloqueado`. Un perfil bloqueado sigue leyendo su **propia** fila
  (`perfil_leer_propio` no depende de `rol_actual()`), para que la aplicación pueda explicarle que
  está bloqueado — pero no tiene ningún rol reconocido en el resto del esquema.
- **`registrar_intento_fallido(p_email text)`** — `SECURITY DEFINER`, ejecutable por `anon` y
  `authenticated`: quien falla el login todavía no tiene sesión. Busca el email en `auth.users`,
  suma uno a `intentos_fallidos` y, al llegar a 3, pone `bloqueado = true`. Responde igual exista o
  no la cuenta (no hay ninguna señal de vuelta): la contrapartida aceptada por el dueño es que
  cualquiera que conozca el email de un profesor puede dejarlo fuera, pero eso nunca permite entrar,
  solo cerrar.
- **`admin_desbloquear_usuario(p_usuario_id uuid)`** — `SECURITY DEFINER`, solo `authenticated`;
  comprueba `es_administrator()` ella misma y lanza una excepción si quien llama no lo es. Pone
  `bloqueado = false` e `intentos_fallidos = 0`. El bloqueo alcanza también al `administrator`: su
  única vía de escape es el editor SQL del panel (solo el dueño), documentada en `DEVELOPERS.md`.
- **Renovar la contraseña de un usuario bloqueado** no necesita ninguna pieza nueva: es disparar
  `POST /auth/v1/recover` (ya implementado desde T-09, `solicitarRecuperacionContrasena`), nunca que
  el administrador fije una contraseña — eso exigiría `service_role` en el navegador.

## Políticas RLS por rol (`003_politicas_rls.sql`, T-10)

Cada una de las siete tablas nuevas de `001_esquema_inicial` gana sus políticas por rol; la matriz
completa está en `roadmap/DECISIONES_TECNICAS.md`. Dos piezas merecen explicación aparte porque no
son solo "una política por celda":

- **Columnas de contacto de `alumno` (`email_alumno`/`telefono_alumno`).** Un `teacher` no debe
  poder leerlas ni con una consulta directa. Como `administrator` y `teacher` son el mismo rol de
  Postgres (`authenticated`, distinguidos solo por `perfil.rol`), un `GRANT` de columna no puede
  dárselas a uno sin dárselas también al otro. La solución: la tabla base concede a `authenticated`
  solo las columnas de identificación (leer `email_alumno`/`telefono_alumno` ahí falla con un error
  real, para cualquiera); `administrator` lee la ficha completa a través de una vista aparte,
  `public.alumno_ficha` (`select * from alumno where es_administrator()`), que al no delegar en la
  RLS de la tabla base sí puede devolver todas las columnas. Detalle y alternativas descartadas en
  `DECISIONES_TECNICAS.md`. **Efecto práctico para T-12:** escribir siempre `alumno`
  (`INSERT`/`UPDATE`, con `Prefer: return=minimal`) y leer siempre `alumno_ficha` si la pantalla es
  de `administrator`; un `teacher` sigue leyendo `alumno` directamente, nunca la vista.
- **Bucket de avatares (`storage.objects`).** Las políticas ya existen desde esta migración, aunque
  el bucket lo crea T-14 (`004_bucket_avatares`, renumerada porque esta migración pasó de `002` a
  `003` — ver `db/APLICADAS.md`): una política sobre `bucket_id = 'avatares'` no exige que el bucket
  exista todavía, así que nunca hay una ventana en la que el bucket exista sin RLS en vigor.
  `004_bucket_avatares.sql` crea el bucket **privado** (`public = false`), con lista blanca de tipo
  MIME en la propia configuración del bucket — solo `image/webp`, porque el cliente sube únicamente
  las derivadas ya recodificadas, nunca el fichero original del móvil — y `file_size_limit` de 2 MiB.
  **Aplicada y verificada en `dev` el 2026-08-31** (`db/APLICADAS.md`, fila `004`). El resto del
  alcance de T-14 — procesado en el cliente (recorte, dos derivadas WebP, `alumno/{alumno_id}/{uuid}/`),
  subida con orden seguro (sube lo nuevo → cambia el puntero → borra lo viejo), firma en lote y
  monograma — está escrito en `src/dominio/avatarAlumno.ts` y `src/datos/avatarAlumno.ts`; falta
  únicamente el punto de montaje real en una pantalla (T-16).

`db/pruebas_rls.sql`, lanzable con `npm run probar-rls` (el dueño, nunca el agente: exige
`SUPABASE_ACCESS_TOKEN`), impersona usuarios reales de `perfil` para comprobar cada celda de la
matriz en vivo contra `dev`. Vive en una única transacción que termina siempre en `rollback`: no
deja datos de prueba en la base pase lo que pase.

## Invariantes que vive en PostgreSQL, no en el cliente

- **`registrado_en` de `asistencia` es inmutable.** Trigger `BEFORE UPDATE`
  (`asistencia_proteger_inmutables`): también protege `profesor_id` y `peticion_id`, y es quien fija
  `actualizado_en`/`actualizado_por` — nunca los envía el cliente, aunque los incluya en la
  petición, se ignoran.
- **Todo `UPDATE` de `asistencia` deja rastro.** Trigger `AFTER UPDATE`
  (`asistencia_copiar_a_historial`) escribe la fila anterior en `asistencia_historial`.
- **Ninguna tabla nueva hereda privilegios por defecto.** Cada una empieza con
  `revoke all ... from anon, authenticated, service_role` y concede explícitamente solo lo que
  necesita — nunca `TRUNCATE`, `REFERENCES` ni `TRIGGER` a `anon` o `authenticated`. Verificado por
  un test estático (`herramientas/migraciones/esquemaInicial.test.ts`) y, tras aplicar la migración,
  por un barrido en vivo de `information_schema.role_table_grants`
  (`npm run migrate -- --verificar-privilegios`).
- **RLS activada en las siete tablas nuevas, sin excepción, desde el primer script.** Cada una tiene
  ya sus políticas por rol desde `003_politicas_rls` (T-10, ver arriba y la matriz completa en
  `roadmap/DECISIONES_TECNICAS.md`); todas usan `es_administrator()`/`es_teacher()`, así que heredan
  automáticamente la condición "no bloqueado" de `rol_actual()` (P-01) sin repetirla.
- **`student` no tiene ninguna política nueva.** Su única política en todo el sistema sigue siendo
  la de leer su propia fila de `perfil`, ya existente desde el bootstrap.

## Qué falta (a propósito, para T-11 y siguientes)

- El campo `relacion` en `persona_referencia` y si debe exigirse al menos una vía de contacto por
  alumno: preguntas abiertas para el dueño (§6 de `SEGUIMIENTO.md`), no se han añadido sin su
  decisión.
