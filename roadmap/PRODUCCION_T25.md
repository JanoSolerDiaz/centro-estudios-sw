# T-25 — Endurecimiento, privacidad y paso a producción

> Documento de trabajo de T-25 (`HOJA_DE_RUTA.md`, "Endurecimiento, privacidad y paso a
> producción"). Vive en `roadmap/` porque es el detalle de una sola tarea T-XX muy grande, igual
> que `db/MODELO.md` es el detalle del esquema — `SEGUIMIENTO.md` §1 y §3 son quienes indexan su
> estado, no repiten su contenido. Se actualiza en cada sesión que toque T-25, hasta que la tarea
> quede `COMPLETADA`/`DESPLEGADA EN PRODUCCIÓN`.
>
> **Estado a 2026-09-04:** los requisitos que no exigen credenciales de producción ni una decisión
> de negocio están escritos (1 parcial, 2, 3, 4 en borrador, 7, 8, 9). Los que sí las exigen (5, 6,
> y la aprobación final de 4) están descritos aquí como procedimiento a seguir, pero **no
> ejecutados** — es DDL contra un proyecto que no existe y una decisión que no le corresponde al
> agente (§0.1/§0.3 de `HOJA_DE_RUTA.md`). Ver el checklist final de este documento y las filas de
> `SEGUIMIENTO.md` §3.

---

## 1. Cabeceras de seguridad del hosting estático

**Escrito:** `_headers` (raíz del repositorio) con la política completa, formato Netlify/Cloudflare
Pages (ambos lo leen igual, sin configuración adicional, desde la raíz del sitio publicado):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://<PROJECT_REF_PROD>.supabase.co; connect-src 'self' https://<PROJECT_REF_PROD>.supabase.co; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Frame-Options: DENY
```

**Por qué esta CSP es posible sin `unsafe-inline` (el criterio de aceptación lo exige
explícitamente):** revisado `index.html` — carga `config.js` y `dist/ui/main.js` siempre con
`<script src="...">`, nunca con un bloque `<script>` inline ni un atributo `on*=`; no hay ninguna
hoja de estilo externa ni `<style>` inline (todo el estilo que existe hoy se aplica desde
TypeScript vía `element.style.*`, que el navegador no bloquea con CSP porque no es una carga de
recurso). `script-src 'self'` y `style-src 'self'` bastan sin ninguna excepción. Revisado también
que ningún formulario usa un `action` real (`grep` sobre `src/ui/*.ts`, cero coincidencias de
`<form` con `.action =`): todos los envíos son JS con `preventDefault()`, así que `form-action
'none'` no rompe nada. `frame-ancestors 'none'` porque la aplicación no está pensada para
incrustarse en ningún `<iframe>` ajeno. `img-src`/`connect-src` necesitan el dominio de Supabase
porque las fotos se sirven por URL firmada (`https://<ref>.supabase.co/storage/...`) y toda
lectura/escritura de datos pasa por su API REST — ningún otro origen externo aparece en el código
(no hay CDN, no hay fuentes de Google Fonts, no hay analítica de terceros).

**Por qué el requisito 1 NO puede darse por completo verificado todavía:** su propio criterio de
aceptación pide "un análisis de cabeceras **sobre el despliegue**" — necesita un sitio publicado
de verdad, y el proveedor de hosting sigue `<pendiente>` (§0.1 de `HOJA_DE_RUTA.md`, sin decidir
desde el inicio del proyecto). Elegir proveedor es una decisión de negocio/coste, no técnica, así
que queda en la pregunta abierta que este documento añade a `SEGUIMIENTO.md` §6. Mientras tanto:

- `_headers` está escrito para Netlify/Cloudflare Pages (gratis en el plan que este proyecto
  necesita, sin configuración de servidor).
- Si el dueño elige **Vercel**, el mismo contenido va en un `vercel.json` nuevo, sección
  `headers`, con la misma lista de cabeceras — se escribe en cuanto se decida el proveedor.
- **GitHub Pages queda descartado como opción**, incluido aquí para que la decisión no se tome sin
  este dato: no permite cabeceras HTTP propias, solo sirve los archivos tal cual — con él, el
  requisito 1 sería imposible de cumplir sin un proxy delante, que sería infraestructura nueva no
  contemplada por el stack fijado.
- `<PROJECT_REF_PROD>` es un marcador literal: se sustituye por el "project ref" real de Supabase
  (`SUPABASE_PROJECT_REF_PROD` de `.env.local`, mismo dato que usa `config.js`) en el momento del
  primer despliegue a producción, junto con la elección de proveedor.

---

## 2. Revisión de superficie de ataque del modelo cliente-directo

> Una fila por tabla, RPC y bucket (requisito 2). Sin backend propio, esta tabla ES el perímetro
> de seguridad de la aplicación entera. Contenido verificado contra el SQL real de cada migración
> aplicada (`db/000_bootstrap_perfil.sql` a `db/009_administracion_usuarios.sql`), no solo contra
> `db/MODELO.md` o `DECISIONES_TECNICAS.md` — se releyeron los `grant`/`revoke`/`create policy` de
> cada fichero para esta revisión, el 2026-09-04.

### Tablas

| Recurso | `anon` | `student` | `teacher` | `administrator` | Ruta de escritura |
|---|---|---|---|---|---|
| `perfil` | sin acceso (`revoke all ... from anon`, `000b`) | lee **solo su propia fila** (`perfil_leer_propio`); sin `UPDATE` de ningún campo salvo a través de la misma política de lectura, que no concede escritura | igual que `student`: solo su propia fila, solo lectura | lee y escribe **todas** las filas (`perfil_admin_leer_todos`/`perfil_admin_actualizar`); sin `DELETE` para nadie | `UPDATE` directo (columna `rol`/`nombre`/`activo`), pasa por el trigger `perfil_before_update` (T-24) que fija `actualizado_por`/`actualizado_en` y **rechaza** dejar el sistema sin ningún `administrator` activo |
| `esquema_migracion` | sin acceso | sin acceso | sin acceso | sin acceso — ni siquiera `administrator` tiene una política; solo se lee a través de `esquema_version()` | ninguna desde la aplicación (solo el runner de migraciones, con el access token, fuera del cliente) |
| `centro_estudios` | sin acceso | sin acceso (ninguna política) | lee solo `activo = true` | lee y escribe todos, sin `DELETE` | `INSERT`/`UPDATE` directo de `administrator`, sin RPC (no hay invariante que proteger) |
| `alumno` (columnas de identificación) | sin acceso | sin acceso | lee solo `activo = true` | lee y escribe todos, sin `DELETE` | `INSERT`/`UPDATE` directo de `administrator` |
| `alumno` (columnas de contacto: `email_alumno`/`telefono_alumno`) | sin acceso | sin acceso | **sin acceso, ni siquiera pidiéndolas por PostgREST directamente** — el `GRANT` de esas columnas a `authenticated` no existe; solo se alcanzan a través de la vista `alumno_ficha`, que exige `es_administrator()` | lee/escribe solo a través de `alumno_ficha` (nunca la tabla base, que no puede devolverlas en un `RETURNING`) | igual que arriba |
| `persona_referencia` | sin acceso | sin acceso | **sin ninguna operación** (ni `SELECT` ni escritura) | lee y escribe todos, **incluido `DELETE` real** (única tabla con borrado real, decisión de RGPD) | `INSERT`/`UPDATE`/`DELETE` directo de `administrator` |
| `slot_horario` | sin acceso | sin acceso | lee solo los suyos (`profesor_id = auth.uid()`) | lee y escribe todos, sin `DELETE` (los slots se cesan, no se borran) | `INSERT`/`UPDATE` directo de `administrator` |
| `asistencia` | sin acceso | sin acceso | lee solo las suyas (`profesor_id = auth.uid()`); **sin `INSERT`/`UPDATE` directo para nadie**, ni siquiera `administrator` | lee todas; sin `INSERT`/`UPDATE` directo | **Solo por RPC `SECURITY DEFINER`**: `registrar_asistencia` (alta) y `actualizar_asistencia` (modificación). `INSERT`/`UPDATE`/`DELETE` directos están revocados de la tabla para los dos roles — comprobado en `db/003_politicas_rls.sql` y ejercitado en vivo por la sección 5/8c de `db/pruebas_rls.sql` |
| `asistencia_historial` | sin acceso | sin acceso | sin acceso | **solo lectura** (sin `UPDATE`/`DELETE` para nadie, ni `administrator`) | únicamente el trigger `AFTER UPDATE` de `asistencia` escribe aquí; ningún camino de escritura desde la API |
| `evento_error` | sin acceso | sin acceso | sin acceso | solo lectura | únicamente la RPC de T-05 (`registrar_evento_error`, `SECURITY DEFINER`) inserta |
| `limite_tasa` | sin acceso | sin acceso | sin acceso directo — solo la alcanza `aplicar_limite_tasa()` (`SECURITY DEFINER`) | igual | ninguna desde la API |

### RPC (`SECURITY DEFINER`, todas revocadas de `public` y concedidas solo a `authenticated`)

| RPC | Quién puede llamarla (comprobado en el propio cuerpo, no solo en el `GRANT`) | Qué impide que se salte una regla |
|---|---|---|
| `esquema_version()` | `anon` y `authenticated` (de solo lectura, sin dato personal) | Ninguna: es información pública de versión del esquema, sin efecto secundario |
| `registrar_asistencia(...)` | rechaza explícitamente a `student` (`raise exception ... solo administrator o teacher`); un `teacher` no puede registrar en nombre de otro profesor (`p_profesor_id` distinto de `auth.uid()` exige `administrator`) | ventana de 7 días hacia atrás, rechazo de futuro, slot ajeno, alumno de baja, duplicado (`unique` de BD), límite de 60 operaciones/minuto por profesor (`aplicar_limite_tasa`) |
| `actualizar_asistencia(...)` | rechaza a `student`; un `teacher` solo modifica registros con su propio `profesor_id` y dentro de la ventana de edición de 7 días; `administrator` sin esa ventana | mismo trigger de inmutabilidad de `registrado_en`/`profesor_id`/`peticion_id` que protege el `INSERT`; anular exige motivo; cambiar de slot revalida pertenencia y vigencia |
| `buscar_alumnos_activos(...)` | rechaza a `student` (`es_teacher() or es_administrator()`); devuelve solo columnas de identificación (nunca contacto) | — |
| `aplicar_limite_tasa(...)` | sin `GRANT` a `authenticated` — solo la llaman las dos RPC de arriba desde dentro de su propia transacción | — |
| `rol_actual()` / `es_administrator()` / `es_teacher()` | `authenticated` (necesarias para que las políticas de RLS las evalúen sin recursión, `SECURITY DEFINER` por eso mismo, nunca por comodidad) | no exponen ningún dato de otra fila, solo la del propio `auth.uid()` |

### Bucket `avatares` (Storage, `storage.objects` con `bucket_id = 'avatares'`)

| | `anon` | `student` | `teacher` | `administrator` |
|---|---|---|---|---|
| Lectura | sin acceso | sin acceso | **solo del avatar de un alumno con `activo = true`** (política sobre `storage.objects` que revalida contra `alumno`, no solo contra el nombre del objeto) | todos los objetos |
| Escritura/actualización/borrado | sin acceso | sin acceso | sin acceso (bloqueado por política RLS, verificado en ejecución: "new row violates row-level security policy", no un `GRANT` que pudiera colarse) | todos |
| Configuración del propio bucket | — | — | — | `public = false` (privado); lista blanca de tipo MIME (`image/webp` únicamente, el cliente nunca sube el original del móvil); `file_size_limit` 2 MiB |

**Ningún camino encontrado, en ninguna tabla ni RPC ni en el bucket, que deje a `anon` o a
`student` leer o escribir algo fuera de `perfil_leer_propio`.** Ninguna tabla nueva conserva el
`GRANT`/`TRUNCATE`/`REFERENCES`/`TRIGGER` por defecto de Supabase — cada migración desde `001`
empieza con `revoke all ... from anon, authenticated, service_role` antes de conceder lo mínimo
(comprobado línea a línea en las nueve migraciones, no solo releído en `MODELO.md`). Un `teacher`
no alcanza contacto (`email_alumno`/`telefono_alumno`), personas de referencia ni el avatar de un
alumno de baja por ninguna vía directa a PostgREST, solo a través de lo que sus pantallas ya usan.

---

## 3. Inventario de datos personales, RGPD, y procedimiento de anonimización

### 3.1 Qué se guarda, y dónde (columna por columna, lista cerrada de §0.2)

| Dato | Tabla.columna | Obligatorio | Quién lo ve |
|---|---|---|---|
| Nombre del alumno | `alumno.nombre` | sí | administrator (todo), teacher (identificación) |
| Primer apellido del alumno | `alumno.primer_apellido` | sí | administrator, teacher |
| Segundo apellido del alumno | `alumno.segundo_apellido` | no (`NULL` admitido) | administrator, teacher |
| Centro de estudios de referencia | `alumno.centro_referencia_id` (FK a `centro_estudios`) | sí | administrator, teacher |
| Teléfono del alumno | `alumno.telefono_alumno` | no | **solo administrator** |
| Email del alumno | `alumno.email_alumno` | no | **solo administrator** |
| Fotografía del alumno | `alumno.avatar_ruta` (ruta en el bucket privado, nunca una URL) | no | administrator (todos); teacher (solo alumnos `activo = true` de sus propios slots) |
| Nombre y apellidos de cada persona de referencia | `persona_referencia.nombre/primer_apellido/segundo_apellido` | nombre y primer apellido sí, segundo no | **solo administrator** |
| Teléfono de la persona de referencia | `persona_referencia.telefono_referencia` | **sí, obligatorio** | solo administrator |
| Email de la persona de referencia | `persona_referencia.email_referencia` | no | solo administrator |
| Registro de asistencia (fecha/hora real, profesor, estado, motivo de anulación) | `asistencia.*` | — (es el propio registro) | administrator (todo); teacher (solo lo suyo) |
| Historial de cambios de un registro de asistencia | `asistencia_historial.*` | — | solo administrator |

No hay ningún otro campo personal en el esquema. Confirmado con una lectura de
`db/001_esquema_inicial.sql` completa (las siete tablas nuevas) más el bootstrap: cero columnas de
notas o calificaciones, cero dato de salud, cero dato bancario, cero categoría del artículo 9.

### 3.2 Retención propuesta

- **Mientras el alumno está activo**, todo el dato de arriba se conserva sin límite temporal —
  es el propósito del producto.
- **Al dar de baja a un alumno** (`activo = false`, ya soportado desde T-12): sus datos y su
  historial de asistencia se conservan igual, porque siguen teniendo valor administrativo
  (justificar horas pasadas ante la familia) y porque el borrado del registro de asistencia está
  prohibido por diseño (§0.2, "no se borran nunca").
- **Plazo de conservación tras la baja antes de anonimizar:** decisión de negocio pendiente del
  dueño — no hay ninguna norma sectorial concreta que el agente conozca que fije un plazo exacto
  para este tipo de registro. Propuesta de partida en `legal/POLITICA_PRIVACIDAD.md` §5 (a
  confirmar): el plazo de prescripción de responsabilidad civil/administrativa que el dueño
  considere aplicable. Hasta que el dueño lo confirme, no se ejecuta ninguna anonimización
  automática — el procedimiento de 3.3 es siempre una acción manual del `administrator`, nunca
  un proceso programado.

### 3.3 Procedimiento de anonimización (derecho de supresión)

**Objetivo:** atender una solicitud de supresión de un alumno sin destruir su registro de
asistencia (que perdería su valor administrativo) ni el de sus profesores.

**Importante — no hace falta ninguna migración ni RPC nueva.** Cada paso ya existe, escrito y
probado en tareas anteriores; esto es la secuencia correcta de usarlos, no código nuevo:

1. **Dar de baja al alumno** si no lo estaba ya (`darDeBajaAlumno`, T-12) — no borra nada, solo
   marca `activo = false`; deja de aparecer para cualquier `teacher`.
2. **Borrar sus personas de referencia**, una por una, desde su ficha (`eliminarPersonaReferencia`,
   T-13). Es la única tabla del sistema con `DELETE` real (decisión de RGPD, §0.2) — tras este
   paso no queda ningún dato de contacto de terceros vinculado al alumno.
3. **Quitar su avatar** si lo tenía (`eliminarAvatarAlumno`, T-14): borra las dos derivadas del
   bucket privado y pone a `NULL` la columna `avatar_ruta`. La fotografía es el dato más sensible
   del sistema (§0.2) y queda eliminada de verdad, no solo desvinculada.
4. **Sustituir sus datos identificativos por un marcador de anonimización**, con la misma
   operación de edición que ya usa cualquier ficha (`editarAlumno`, T-12): `nombre` = "Alumno",
   `primer_apellido` = "anonimizado", `segundo_apellido` = `NULL`, `telefono_alumno` = `NULL`,
   `email_alumno` = `NULL`. `centro_referencia_id` se mantiene (es un dato del centro reglado, no
   del alumno, y sin él la fila violaría su `NOT NULL`) — no identifica a la persona por sí solo.
   El `id` (UUID interno) permanece: es lo que mantiene unido el historial de asistencia a una
   ficha, pero no es un dato personal reidentificable por sí mismo sin acceso a la base de datos.
5. **El registro de asistencia y su historial no se toca.** Sigue existiendo con el mismo
   `alumno_id`, ahora apuntando a la ficha anonimizada — el requisito de "conservar el histórico
   de asistencia" queda cumplido porque nunca hubo que borrar ni una fila de `asistencia`.

**Qué falta para que este procedimiento sea un botón y no cinco pasos manuales:** nada urgente —
es una operación rara (una solicitud de supresión no es una acción diaria) y automatizarla sin
antes tener el plazo de retención confirmado por el dueño sería construir para una regla que
todavía no existe. Si el volumen de solicitudes lo justifica en el futuro, una pantalla o RPC
"Anonimizar alumno" que encadene los cuatro pasos es candidata a P-XX — anotado como nota de
evolución futura en `DEVELOPERS.md`, no como tarea pendiente de hoy.

**Quién lo ejecuta:** siempre `administrator` (todas las operaciones de los pasos 1-4 ya están
reservadas a ese rol por RLS); ninguna requiere `service_role` ni el access token.

---

## 4. Textos legales (borradores)

Ver `legal/` (nuevo directorio): `AVISO_LEGAL.md`, `POLITICA_PRIVACIDAD.md`,
`CONSENTIMIENTO_TRATAMIENTO.md`, `CONSENTIMIENTO_IMAGEN_MENOR.md`. Los cuatro están marcados como
borrador en su propia cabecera, con checklist de qué le falta al dueño para aprobarlos, tal como
exige el límite de §0.3 ("Redactar o publicar textos legales como definitivos... se dejan como
borrador marcado y se escala al dueño").

El aviso provisional que exige T-14 (requisito 8, "el consentimiento es responsabilidad del
centro") **no existía en la interfaz** — se comprobó en `src/ui/pantallaFichaAlumno.ts` que el
bloque de avatar no tenía ningún texto de consentimiento, a pesar de que la propia spec de T-14 lo
pedía y de que `HOJA_DE_RUTA.md` §0.2 lo exige como regla permanente ("hasta entonces la interfaz
debe advertir de que el consentimiento es responsabilidad del centro"). Corregido en esta misma
sesión de T-25 (que es quien "sustituye el aviso provisional de T-14" según su propio requisito 4,
así que el hueco se cierra aquí): `pantallaFichaAlumno.ts` ahora muestra ese aviso junto al
control de subida, con test dedicado
(`pantallaFichaAlumno.test.ts`, "muestra el aviso provisional de consentimiento del tutor legal").

---

## 5. Propagación del esquema a producción — **bloqueado, acción del dueño**

Requisito 5. No ejecutable por el agente bajo ninguna circunstancia (§0.1: el agente nunca aplica
DDL, y el access token de la Management API no vive en su entorno). Procedimiento exacto para
cuando el dueño lo haga:

1. Crear el proyecto de producción en Supabase (plan, región — recomendado UE por el RGPD,
   `<pendiente: confirmarlo con el dueño>`).
2. Rellenar `SUPABASE_PROJECT_REF_PROD`, `SUPABASE_URL_PROD`, `SUPABASE_ANON_KEY_PROD` y
   `SUPABASE_SERVICE_ROLE_KEY_PROD` en `.env.local` (nunca en el repositorio).
3. `npm run migrate -- --entorno=prod` con `PERMITIR_PROD=1`: aplica **en orden** las diez
   migraciones (`000` a `009`; `000`/`000b` incluidas, porque `prod` nace vacío) — el runner ya
   impone el orden numérico y aborta al primer error, así que un solo comando basta.
4. Verificar `esquema_version()` = `9` contra `prod`.
5. Ejecutar `npm run probar-rls` contra `prod` y **guardar su salida completa** como evidencia
   (criterio de aceptación de T-25) — debe dar "0 fallidas, ningún acceso prohibido tuvo éxito",
   igual que la última vez que se ejecutó contra `dev` (fila 11 de `SEGUIMIENTO.md` §3, ver
   también `db/APLICADAS.md`).
6. Crear el primer usuario `administrator` de producción (mismo procedimiento manual que en `dev`,
   documentado en `DEVELOPERS.md` §"Administración de usuarios").
7. Anotar la columna `prod` de `db/APLICADAS.md` con la fecha para las diez filas — de una sola
   vez, tal como indica §0.1.7.

## 6. Copias de seguridad — **bloqueado, acción del dueño**

Requisito 6. Supabase ofrece copias diarias automáticas en todos sus planes de pago; el punto de
restauración (PITR) exacto depende del plan que el dueño elija para `prod` — decisión de coste,
no técnica, fuera del alcance del agente (§0.3 prohíbe "dar de alta servicios externos de pago").
Lo que el dueño debe hacer y verificar, con instrucciones exactas para que quede comprobado y no
solo activado:

1. Confirmar en el panel de `prod` que las copias automáticas están activas y su frecuencia.
2. Documentar aquí (ampliando esta sección) la retención del proveedor y el procedimiento de
   restauración exacto (a qué proyecto, con qué credencial, cuánto tarda).
3. **Verificar la restauración de verdad al menos una vez**, no solo confiar en que existe: el
   propio criterio de aceptación de T-25 pide "una exportación de respaldo verificada".
4. Exportación periódica adicional del histórico de asistencia y de `asistencia_historial` bajo
   control del dueño (por ejemplo, con `pg_dump` contra `prod` desde su máquina, nunca desde el
   entorno del agente) — coherente con que esas dos tablas son las que sostienen el valor
   administrativo del producto.

## 7. Riesgo residual del panel de Supabase y del access token

Requisito 7 — salvaguarda organizativa, no técnica, y por tanto totalmente escribible ahora:

- **Quien tenga acceso al panel de Supabase de `prod`, o al access token de la Management API,
  puede leer y alterar cualquier dato y cualquier política por debajo de la aplicación** —
  incluidos `asistencia_historial` (append-only para la aplicación, pero no para quien entra
  directamente a la base de datos con privilegios de superusuario) y los avatares del bucket
  privado (que desde el panel se pueden descargar sin pasar por ninguna URL firmada). Ninguna RLS
  ni trigger de este proyecto protege contra alguien que entra por esa puerta: son controles para
  la aplicación, no para la infraestructura que la sostiene.
- **Recomendación al dueño:** limitar el número de personas con acceso al panel de `prod` y al
  access token al mínimo imprescindible (en la práctica, solo el dueño); si en el futuro alguien
  más necesita ese acceso, usar un usuario propio de Supabase por persona, nunca compartir una
  sesión; rotar el access token si alguna vez se sospecha que ha estado expuesto (nunca de forma
  rutinaria por el agente, §0.2 lo prohíbe).
- Esto es exactamente el mismo argumento que ya sostiene por qué el agente nunca tiene esas
  credenciales (§0.1): no es una limitación de este documento, es el motivo por el que existe la
  regla.

## 8. Revisión del español de la interfaz

Requisito 8. Repasado en esta sesión con una búsqueda dirigida sobre `src/ui/*.ts` (literales de
texto, mensajes de error, etiquetas de rol) buscando anglicismos, mayúsculas sueltas o mensajes
sin traducir: sin resultados nuevos — coincide con lo que las auditorías anteriores ya venían
confirmando pase tras pase (`auditoriacontinua.md`, "sin hallazgo" repetido en higiene de texto).
Comprobado además que ningún módulo de pantalla usa `.message` de un error crudo para mostrarlo al
usuario (`grep` sobre `src/ui/*.ts`): todo pasa por `mensajeAmigable`/los tipos de
`erroresDominio.ts`, que están en español por construcción. Único hallazgo real de esta revisión:
el aviso de consentimiento ausente del §4 de este documento — no es un problema de idioma, es un
requisito que faltaba por completo, ya corregido.

## 9. `DEVELOPERS.md` y `README.md`

`README.md` no existía — creado en esta sesión (arranque rápido, los dos entornos, enlaces a
`DEVELOPERS.md`/`PROYECTO.md`/este documento). `DEVELOPERS.md` gana una sección "Producción
(T-25)" que enlaza aquí y resume el estado. Detalle de ambos cambios en
`roadmap/HISTORIAL_SESIONES.md`, sesión de hoy.

---

## Checklist final — qué falta para que T-25 sea `COMPLETADA`

Del criterio de aceptación literal de `HOJA_DE_RUTA.md`:

- [x] Revisión de superficie de ataque con una fila por tabla, RPC y bucket (§2 de este documento).
- [x] Inventario de datos personales y procedimiento de anonimización escritos (§3).
- [x] Textos legales en borrador, marcados como tales (§4, `legal/`).
- [x] Riesgo residual del panel y del token dejado por escrito (§7).
- [x] Revisión del español de la interfaz (§8) — con un hallazgo real corregido en el camino.
- [x] `DEVELOPERS.md`/`README.md` al día (§9).
- [ ] **Cabeceras de seguridad verificadas sobre un despliegue real** (§1) — falta elegir
      proveedor de hosting (pregunta añadida a `SEGUIMIENTO.md` §6) y sustituir `<PROJECT_REF_PROD>`.
- [ ] **`db/APLICADAS.md` sin ninguna fila con la columna `prod` vacía** (§5) — el dueño crea el
      proyecto de producción y aplica las diez migraciones.
- [ ] **Salida de `db/pruebas_rls.sql` contra producción guardada como evidencia** (§5).
- [ ] **Exportación de respaldo verificada** (§6).
- [ ] **Textos legales aprobados como definitivos por el dueño** (§4) — hoy son borrador.

T-25 pasa a `BLOQUEADA` en `SEGUIMIENTO.md` §1 con estas cinco casillas como motivo exacto, no
`COMPLETADA`: el criterio de aceptación es literal y estas cinco no dependen de ninguna decisión
de código, solo del dueño.
