# PROYECTO — GestorAcademia

> Ancla de **contexto estable**: qué ES el producto, no cómo se ejecuta (eso es la hoja de ruta).
> Sirve de referencia común para el PM y el auditor. Cambia poco.

## Qué es GestorAcademia

Una aplicación web para que una academia o centro de estudios lleve el control diario de sus alumnos y de su asistencia real, con la fiabilidad de un registro con valor administrativo y la agilidad de pasar lista en tres toques desde un móvil, de pie, en clase.

## Propuesta de valor

Frente al papel y a la hoja de cálculo, que es la alternativa real:

- **La hora que queda registrada es la de verdad**, la del instante en que el profesor selecciona al alumno, no la del horario teórico.
- **La lista aparece sola.** El sistema sabe qué día y qué hora es, la cruza con los horarios habituales y propone a quién le toca. El profesor no busca.
- **La excepción cabe.** La clase extra, el alumno que hoy no tocaba o el que viene a recuperar se registran igual de rápido y quedan marcados como lo que son.
- **El error se arregla, y queda constancia.** El profesor corrige sus propios registros y el administrador cualquiera. No se borra nada: anular es marcarlo como anulado con su motivo, y cada cambio deja rastro de quién y cuándo. Eso es lo que hace que el registro sirva para justificar una hora ante una familia.
- **Cambiar el horario de un alumno no cambia su historia.** Lo que ocurrió, ocurrió con el horario que había entonces.

## Cliente objetivo

**ICP:** academias y centros de estudios de un solo centro (refuerzo escolar, clases particulares, preparación de exámenes), con horarios semanales recurrentes y entre uno y diez profesores.

**Segmentos prioritarios:** el profesor que pasa lista en clase varias veces al día (usuario de mayor frecuencia y peor atendido hoy); después, el responsable del centro, que necesita que la información exista y se pueda justificar.

## Dominio y cumplimiento

- Se tratan datos personales de **menores de edad**, con las obligaciones de RGPD y LOPDGDD. La respuesta del producto es la **minimización con una lista cerrada**: del alumno, nombre, primer y segundo apellido, centro de estudios de referencia, teléfono y email propios (opcionales) y una fotografía (opcional); de cada persona de referencia, nombre, primer y segundo apellido, teléfono (obligatorio) y email (opcional). No se gestionan notas ni datos académicos evaluables, ni datos de salud, ni datos bancarios, ni ninguna categoría especial del artículo 9.
- La **fotografía del alumno** es el dato más sensible del sistema. Almacenamiento privado, acceso solo por URL firmada de vida corta, re-codificación en el cliente antes de subir para eliminar los metadatos EXIF (incluida la geolocalización), y opcional y borrable en todo momento. Exige un **consentimiento de uso de imagen del tutor legal** distinto del consentimiento general de tratamiento.
- Los **registros de asistencia tienen valor administrativo** para la academia. De ahí que no se borren nunca, que cada modificación deje rastro de quién y cuándo, que sean trazables al profesor al que pertenecen, y que estén respaldados.
- El **derecho de supresión** se atiende por anonimización del alumno conservando el registro de asistencia, no destruyendo el histórico. El procedimiento se documenta en T-22.
- Sin integraciones de pago ni facturación en esta fase.

## Glosario del dominio

- **Alumno** — persona inscrita en la academia. Su ficha lleva nombre y apellidos (el segundo puede faltar), el centro de estudios de referencia, contacto propio opcional y una fotografía opcional. Tiene estado activo o inactivo; nunca se borra.
- **Centro de estudios (de referencia)** — el colegio o instituto **reglado** al que asiste el alumno, elegido de un catálogo que mantiene el administrador. Es obligatorio en la ficha. No confundir con la academia, que es este centro y es única.
- **Persona de referencia** — padre, madre, tutor o contacto del alumno. Un alumno puede tener entre 0 y N, se gestionan desde su propia ficha y solo las ve el administrador. El teléfono es obligatorio; el email, no. Es lo único del sistema que se puede borrar de verdad.
- **Avatar** — la fotografía del alumno. Opcional, privada, servida por URL firmada de vida corta.
- **Slot (de horario)** — el tramo recurrente habitual de un alumno: día de la semana, hora de inicio y fin, y asignatura o grupo. Un alumno puede tener varios. Es editable, pero **versionado por vigencia**: al cambiarlo se cierra la versión anterior y se abre una nueva, para que el histórico no se altere.
- **Vigencia** — el intervalo (`vigente_desde`, `vigente_hasta`) durante el cual una versión de un slot está en efecto.
- **Snapshot** — copia congelada de los datos del slot que se guarda dentro de cada registro de asistencia, y que es lo que se muestra al consultar el histórico.
- **Asistencia (entrada)** — el registro de que un alumno estuvo presente, con el instante real en que se marcó. Editable por quien corresponde; nunca borrable.
- **Origen** — de dónde salió el registro: `slot` si el alumno se eligió de la lista propuesta por el horario, `manual` si se eligió del listado completo (clase extra o puntual).
- **`registrado_en`** — cuándo se creó la fila. Lo fija el servidor y es inmutable.
- **`ocurrido_en`** — el momento atribuido a la asistencia. Coincide con `registrado_en` en un registro tomado en vivo, y es lo que se edita al ajustar una hora.
- **Retroactivo** — registro añadido después del hecho, con `ocurrido_en` declarado y distinto de `registrado_en`. Se marca siempre como tal.
- **Anulada** — registro que no debió existir. Se marca con su motivo; la fila permanece.
- **Profesor** (`teacher`) — pasa lista, ve su horario y sus alumnos por slot, añade alumnos extra, y consulta y modifica **sus propios** registros por slot.
- **Administrador** (`administrator`) — gestiona alumnos, horarios y usuarios, y accede y modifica **cualquier** registro de asistencia eligiendo slot y profesor.
- **Rol `student`** — el rol de alumno como *usuario* de la aplicación (distinto de la ficha de **Alumno** de arriba, que es el dato). Existe en el modelo desde el día 1 y **sin ningún acceso** en el MVP.

## Arquitectura de alto nivel

**Stack:** VanillaJS + TypeScript, sin frameworks ni librerías de UI. Frontend en TypeScript compilado a JavaScript estándar (ES2022, ES modules nativos, sin bundler) con manipulación de DOM nativa. Sin dependencias de runtime.

**Persistencia:** PostgreSQL gestionado en **Supabase**, consumido por su **API REST autogenerada** (PostgREST) y por GoTrue para la autenticación, mediante `fetch` nativo a través de un cliente propio tipado. El SDK `@supabase/supabase-js` está vetado por ser una librería de runtime.

**Entornos:** dos proyectos de Supabase. En **`dev`** —que ya existe— el agente aplica el esquema de forma autónoma con `npm run migrate` (Management API). **`prod` no se crea hasta que el desarrollo esté terminado**, y su DDL lo aplica siempre una persona.

**Almacenamiento de ficheros:** bucket privado de Supabase Storage para los avatares, con sus propias políticas, accedido por URL firmada. Consumido por su API REST con `fetch`, como todo lo demás.

**Despliegue:** hosting estático del frontend compilado. No hay servidor de aplicación propio: la lógica que debe ser inviolable vive en la base de datos.

**Roles:** `administrator`, `teacher`, `student` (identificadores en inglés; etiquetas de interfaz en español).

**Aislamiento de datos:** una única academia (sin multi-tenant). Aislamiento por rol y por pertenencia, implementado como Row Level Security y funciones en PostgreSQL — no en el cliente, porque el cliente es código que el usuario controla. El rol `student` no tiene ninguna política en ninguna tabla.

**Invariantes de datos:** asistencia editable pero **solo por RPC** `SECURITY DEFINER` (el `INSERT` y el `UPDATE` directos están revocados) y **nunca borrable**; `registrado_en`, `profesor_id` y `peticion_id` inmutables por trigger; cada `UPDATE` deja copia de la fila anterior en `asistencia_historial`, que sí es estrictamente append-only; baja de alumno lógica; slots versionados por vigencia con snapshot inmutable en cada asistencia.

## Decisiones de producto estables

- **Una pantalla manda sobre las demás:** pasar lista. Todo lo que la haga más lenta necesita justificarse.
- **Se corrige, no se borra.** Quien se equivoca lo arregla —el profesor lo suyo, el administrador todo—, pero nada desaparece y cada cambio deja rastro. Es un centro privado: la fricción no aporta, la trazabilidad sí.
- **La hora real, nunca la teórica**, y lo apuntado a posteriori se marca como tal. El producto no ofrece la comodidad de "poner la hora del horario".
- **Privacidad por diseño:** el dato que no se guarda no hay que protegerlo. Cada campo nuevo se gana su sitio.
- **Español como idioma del producto**, con el vocabulario que usa una academia, no el de un ERP.
- **Evolución futura anotada, no construida:** funcionalidad para el rol `student`, multi-centro (`centro_id` y políticas extendidas) y uso offline en aula (caché de lectura y cola de reintentos en IndexedDB). No son alcance del MVP.
