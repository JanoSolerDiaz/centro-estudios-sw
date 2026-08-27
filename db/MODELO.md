# MODELO DE DATOS — GestorAcademia

> Explicación en español, legible sin saber SQL, de lo que hay en la base de datos y por qué. Se
> mantiene al día en cada migración (§0.4 de `HOJA_DE_RUTA.md`). El SQL exacto vive en `db/NNN_*.sql`;
> este documento es el mapa, no la fuente de verdad — ante cualquier duda, el SQL manda.
>
> Estado actual: `000`/`000b` (bootstrap manual del dueño) + `001_esquema_inicial` (T-07, escrito y
> testeado, **pendiente de que el dueño lo aplique** con `npm run migrate` — ver §3 de
> `roadmap/SEGUIMIENTO.md`). Ninguna tabla de este documento tiene todavía políticas de acceso por
> rol: eso es el contenido íntegro de T-10 (`002_politicas_rls`). Hasta que se aplique, cada tabla
> de abajo (salvo `perfil`) tiene la seguridad activada pero cerrada a cal y canto — nadie entra por
> la API, ni siquiera `administrator`.

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
escritura pasa por una RPC `SECURITY DEFINER` (`registrar_asistencia`/`actualizar_asistencia`,
T-18/T-21, todavía no escritas): el `INSERT` y el `UPDATE` directos sobre la tabla están revocados
para cualquier rol de la API, incluido `service_role`.

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
La lectura queda reservada a `administrator` (política todavía por escribir, T-10).

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
- **RLS activada en las siete tablas nuevas, sin excepción, desde el primer script.** Sin ninguna
  política todavía (T-10): el efecto es que hoy nadie llega a ninguna por la API, ni siquiera
  `administrator`. Es el mismo "cerrado por defecto" que ya rige en `perfil` desde el bootstrap.
- **`student` no tiene ninguna política nueva.** Su única política en todo el sistema sigue siendo
  la de leer su propia fila de `perfil`, ya existente desde el bootstrap.

## Qué falta (a propósito, para T-10 y siguientes)

- Las políticas RLS por rol de las siete tablas nuevas y del bucket de avatares: T-10
  (`002_politicas_rls`).
- Las RPC `registrar_asistencia` y `actualizar_asistencia`: T-18/T-21.
- La vista o los `GRANT` por columna que le ocultan `email_alumno`/`telefono_alumno` a un `teacher`:
  T-10, punto 4.
- El campo `relacion` en `persona_referencia` y si debe exigirse al menos una vía de contacto por
  alumno: preguntas abiertas para el dueño (§6 de `SEGUIMIENTO.md`), no se han añadido sin su
  decisión.
