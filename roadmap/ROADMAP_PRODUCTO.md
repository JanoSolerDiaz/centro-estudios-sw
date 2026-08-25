# ROADMAP DE PRODUCTO — GestorAcademia — Documento vivo

> Roadmap de producto VIVO, gestionado por el agente Product Manager. Aquí se especifican las
> mejoras (tareas R-XX), agrupadas en oleadas y fases. Es la **spec de las R-XX** (las T-XX
> tienen su spec en `HOJA_DE_RUTA.md`).
>
> Reglas: este documento **especifica**, no lleva estado — el estado de cada R-XX vive en §1 de
> `SEGUIMIENTO.md` (no duplicar). Las oleadas 100% desplegadas se mueven a
> `ROADMAP_HISTORICO.md` para mantener vivo solo lo pendiente/en curso.

**Última actualización:** 2026-08-25 — primer ciclo del PM: definida la oleada v1 (R-01 a R-07).

---

## Visión y misión

Que una academia lleve el control diario de sus alumnos y su asistencia real con la fiabilidad de un registro legal y la agilidad de pasar lista en tres toques.

Hoy ese control se hace en papel o en una hoja de cálculo: se apunta la hora teórica de la clase en lugar de la real, la lista hay que buscarla, el alumno de una clase extra no cabe en el formato, y una corrección se hace tachando. El resultado no sirve ni para justificar una hora ante una familia ni para saber qué pasó realmente. GestorAcademia sustituye eso por un registro que se crea en el instante en que el profesor mira al alumno, que nadie puede reescribir después, y que se puede consultar y exportar.

## Cliente objetivo y segmentos

**ICP:** academias y centros de estudios de un solo centro (refuerzo escolar, clases particulares, preparación de exámenes), con horarios semanales recurrentes y entre uno y diez profesores.

**Segmentos prioritarios:** el **profesor** (`teacher`) que pasa lista en clase con el móvil o la tablet varias veces al día, y que además revisa y arregla sus registros al salir — es el usuario de mayor frecuencia y el peor atendido por las alternativas actuales. En segundo lugar, el **administrador** (`administrator`), que necesita que la información exista, esté al día, se pueda corregir y se pueda justificar.

Hay un tercer rol, **alumno** (`student`), que existe en el modelo desde el día 1 pero **sin ningún acceso** en el MVP. Qué se le ofrece —y si se le ofrece— es una decisión de producto del dueño, no una laguna que el PM deba rellenar por iniciativa propia.

## Principios de producto (innegociables; extienden §0.2 de la hoja de ruta)

1. **Pasar lista en tres toques.** La pantalla del día a día se mide en segundos y en toques, no en funcionalidades. Cualquier mejora que añada un paso a ese flujo tiene que justificar por qué merece la pena.
2. **Quien se equivoca, lo arregla — y queda constancia.** El profesor corrige sus propios registros y el administrador cualquiera; es un centro privado y la fricción no aporta nada. Lo que no se hace es borrar: anular es marcar el registro como anulado con su motivo. Y cada modificación deja rastro de quién y cuándo, por debajo, sin molestar a nadie. Eso es lo que permite enseñar el dato a una familia y sostenerlo.
3. **La hora real, no la teórica — y lo apuntado después se dice.** Un registro vale por el instante en que ocurrió; el sistema no ofrece nunca la comodidad de "poner la hora del horario". Un registro añadido a posteriori es legítimo y necesario, pero se marca como tal: un histórico donde no se distingue lo marcado en vivo de lo rellenado luego no vale como registro de nada.
4. **Cero fricción con lo habitual, cero bloqueo con la excepción.** El horario recurrente se propone solo; y la clase extra, la sustitución o el alumno que no toca hoy siempre son posibles, y quedan marcados como lo que son.
5. **Solo los datos imprescindibles.** Se trabaja con datos de menores: nombre y contacto, nada más. Cada campo nuevo tiene que ganarse su sitio y su justificación.

---

## OLEADAS Y FASES

> El PM organiza las R-XX en oleadas (v1, v2…) y fases temáticas (F-XX), en un orden que
> entregue valor incremental y facilite la adopción. Vacío al arrancar: el PM lo rellena en su
> primer ciclo, alimentándose de los requisitos, del feedback (`FEEDBACK.md`, entradas `nuevo`)
> y de los hallazgos ABIERTO del auditor (`auditoriacontinua.md`).

### Oleada v1 — Cerrar el ciclo diario: ausencias, horas reales y continuidad en el aula

**Arranca cuando el MVP (T-00 a T-25) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN** — el estado real
de esa condición se sigue en §1 de `SEGUIMIENTO.md`, no aquí. Hasta entonces las R-XX de esta
oleada quedan especificadas y en cola, en el orden de §1, detrás de la T-XX pendiente.

Por qué esta oleada y en este orden: el MVP deja "pasar lista" resuelto para la entrada de un
alumno, pero el ciclo del día a día de una academia no termina ahí — falta poder decir que alguien
no vino (hoy un hueco y una ausencia real se ven igual), poder cerrar una clase con su duración
real, poder avisar a una familia sin salir de la aplicación, poder cubrir a un profesor que falta
un día, y sobre todo poder seguir pasando lista cuando el wifi del aula falla, que es la condición
real en la que vive la pantalla más usada del producto. Nada de esto añade datos personales nuevos
ni toca al rol `student`.

- **F-01 — Asistencia completa.** Hoy `asistencia` solo registra entradas: una ausencia y un hueco
  sin datos se confunden, y no hay hora de salida ni duración real. R-01, R-02, R-03.
- **F-02 — Informes y aviso a familias.** Con ausencias y horas ya registrables, cerrar el círculo
  hacia fuera: el informe que se enseña a una familia y el aviso cuando algo requiere que se
  enteren. R-04, R-05.
- **F-03 — Continuidad operativa.** Lo que mantiene el producto fiable cuando la realidad de un
  centro no es la ideal: un profesor falta, o el aula no tiene buena conexión. R-06, R-07.

> Quedan fuera de esta oleada, por depender de una decisión del dueño y anotadas en §6 de
> `SEGUIMIENTO.md`: el envío automático (no solo preparado) del aviso a la familia, y cualquier
> acceso del rol `student` o de una familia a su propio histórico.

---

## DETALLE DE TAREAS R-XX

> Formato de cada R-XX (mismo rigor que una T-XX). Numeración secuencial, nunca reutilizada.

```
### R-NN — <título>
**Oleada / Fase:** v_ / F-_ · **Migración:** Sí (`NNN_<nombre>`) | No · **Depende de:** <R-XX/T-XX o —>
**Origen:** roadmap | feedback #N | auditoría #N

**Objetivo:** <qué problema de producto resuelve y para quién>

**Requisitos:**
1. <paso concreto>

**Bloqueo humano (si lo hay):** <decisión o alta que solo puede hacer el dueño>

**Criterio de aceptación:** <condición objetiva y verificable>
```

*(El estado de cada R-XX se sigue en §1 de `SEGUIMIENTO.md`.)*

---

### R-01 — Registro explícito de ausencias
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`006_registro_ausencias`) · **Depende de:** T-21
**Origen:** roadmap

**Objetivo:** que "no hay fila" deje de ser la única forma de decir que un alumno faltó. Hoy el
histórico solo registra entradas: un alumno que faltó y un tramo en el que nadie llegó a pasar
lista se ven exactamente igual —un hueco—, y eso no sirve para justificar nada ante una familia.
Un profesor tiene que poder cerrar el tramo dejando constancia expresa de quién no vino.

**Requisitos:**
1. Al cerrar un slot en pasar lista, o desde «Registros» (T-21), el profesor puede marcar como
   ausente a cualquier alumno del slot que no tenga ya un registro de entrada ese día, con el mismo
   toque de la card, no un formulario aparte.
2. El registro de ausencia pasa por una RPC que fija autor e instante igual que
   `registrar_asistencia`, deja snapshot del slot, y queda editable/anulable con el mismo régimen
   que cualquier fila de `asistencia` (§0.2 de la hoja de ruta): no se borra nunca, solo se anula
   con motivo.
3. La card de un alumno ausente se distingue visualmente de una pendiente y de una registrada, en
   pasar lista y en «Registros».
4. Marcar ausente es una acción explícita del profesor; el sistema nunca infiere una ausencia por
   sí solo ni cierra un slot en silencio pasado su horario — un cierre automático agresivo genera
   falsos ausentes con una conexión mala, así que queda fuera del alcance de esta tarea.
5. El histórico y la exportación (T-23) distinguen ausencia de "sin dato" en las consultas por
   alumno.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un slot con tres alumnos donde uno se registra y dos se marcan
ausentes produce tres filas trazables; el histórico exportado muestra el estado de cada una;
anular una ausencia marcada por error, dentro de la ventana de edición, funciona igual que anular
una entrada, con motivo obligatorio.

---

### R-02 — Justificación de una ausencia
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`007_justificacion_ausencia`) · **Depende de:** R-01, T-13
**Origen:** roadmap

**Objetivo:** que una ausencia registrada se pueda marcar como justificada —motivo y quién la
justificó— sin reescribir la fila original, porque saber que un alumno faltó no es lo mismo que
saber si avisaron.

**Requisitos:**
1. Sobre una ausencia ya registrada, `administrator` o el propio profesor —dentro de su ventana de
   edición, igual que en T-21— puede añadir una justificación: motivo de una lista corta cerrada
   (enfermedad, cita médica, motivo familiar, otro) más un texto libre opcional.
2. Justificar dentro de la ventana de edición usa el mismo régimen de auditoría que cualquier
   modificación de asistencia (`asistencia_historial`, quién y cuándo). Si la ausencia queda fuera
   de la ventana del profesor, solo `administrator` puede justificarla; justificar no reabre la
   edición de hora ni de alumno, solo el campo de justificación.
3. La justificación no cambia el hecho registrado —el alumno faltó—, solo lo cualifica. No existe
   "des-ausentar": eso es anular con motivo (R-01).
4. Visible en «Registros», en el histórico y en la exportación CSV.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** una ausencia justificada se distingue de una injustificada en listado
e histórico; el CSV exporta el motivo; justificar fuera de la ventana del profesor es rechazado
para `teacher` y aceptado para `administrator`.

---

### R-03 — Registro de salida y cómputo de horas reales
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`008_registro_salida`) · **Depende de:** T-18, T-21
**Origen:** roadmap

**Objetivo:** la hora teórica del slot no es la hora real de la clase —a veces se alarga, a veces
se acorta—. Registrar también la salida permite calcular horas reales por alumno, que es lo que de
verdad hace falta para justificar una hora ante una familia o cuadrar lo dado con lo previsto.

**Requisitos:**
1. Una entrada ya registrada puede cerrarse con una hora de salida —un segundo toque sobre la card
   ya registrada («marcar salida»)— con la hora real del servidor, igual de inalterable por el
   cliente que la de entrada.
2. La salida es opcional: un registro sin salida sigue siendo válido y no bloquea nada aguas abajo.
3. El histórico y la exportación (T-23) muestran, cuando existe, la duración real (salida menos
   entrada) junto a la duración teórica del slot, sin recalcular nunca la teórica desde un horario
   posterior (no-retroactividad, §0.2).
4. Editable con el mismo régimen que la hora de entrada (T-21): ajustar la salida dentro de la
   ventana de edición queda trazado en `asistencia_historial`.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un registro con entrada y salida calcula la duración real
correctamente, incluido el cambio de hora estacional (misma zona horaria que T-17); el CSV incluye
ambas horas y ambas duraciones; cambiar el horario del slot después no altera la duración ya
calculada de un registro pasado.

---

### R-04 — Informe mensual por alumno
**Oleada / Fase:** v1 / F-02 · **Migración:** No · **Depende de:** T-23, R-01, R-02, R-03
**Origen:** roadmap

**Objetivo:** que `administrator` obtenga en un clic el resumen mensual que hoy tendría que
reconstruir a mano de una hoja de cálculo: cuántas clases tuvo un alumno, a cuántas vino, cuántas
ausencias justificadas e injustificadas, y las horas reales si están disponibles — el documento
que se enseña a una familia o se archiva.

**Requisitos:**
1. Desde la ficha de alumno o desde el histórico (T-23), generar el informe de un mes natural
   elegido: sesiones esperadas según el horario vigente cada semana de ese mes, entradas
   registradas, ausencias (justificadas/injustificadas), retroactivos, anuladas (visibles pero no
   contadas como asistencia), y horas reales acumuladas cuando R-03 tiene datos.
2. Exportable a PDF —generado en cliente sin librería de terceros, con impresión de HTML o
   `canvas` nativo— y a CSV, con cabecera de alumno, centro, mes y fecha de generación.
3. El cálculo de sesiones esperadas usa los slots vigentes de cada semana del mes (snapshot
   histórico), no el horario actual, coherente con la no-retroactividad de T-15.
4. Alcance: `administrator` sobre cualquier alumno; `teacher` solo sobre alumnos de sus propios
   slots ese mes (mismo alcance que T-23).

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** el informe de un alumno con horario cambiado a mitad de mes calcula
las sesiones esperadas de cada tramo con el slot vigente en esa fecha; el PDF y el CSV coinciden
en las cifras; un `teacher` no puede generar el informe de un alumno fuera de sus slots.

---

### R-05 — Aviso de ausencia injustificada listo para enviar
**Oleada / Fase:** v1 / F-02 · **Migración:** No · **Depende de:** R-01, R-02, T-13
**Origen:** roadmap

**Objetivo:** cuando un alumno falta sin justificar, alguien del centro tiene que avisar a la
familia — hoy eso significa buscar el teléfono a mano. El producto puede dejar el mensaje ya
redactado y el contacto ya a la vista, **sin enviarlo por sí mismo**: el envío automático de
SMS, email transaccional o WhatsApp exige dar de alta una cuenta de servicio externo, decisión
reservada al dueño (pregunta abierta en §6 de `SEGUIMIENTO.md`).

**Requisitos:**
1. Desde una ausencia injustificada, un botón «avisar» muestra las personas de referencia del
   alumno (nombre, teléfono, relación) y genera un mensaje prellenado con el nombre del alumno, la
   fecha y la clase.
2. Acciones disponibles sobre ese mensaje: abrir el cliente de correo del propio dispositivo
   (`mailto:` con asunto y cuerpo prellenados) cuando la persona de referencia tiene email, y
   copiar el texto al portapapeles —para pegarlo en una llamada, SMS o WhatsApp manual— siempre.
3. Marcar la ausencia como «aviso enviado» —con quién y cuándo— es una anotación manual del propio
   profesor o `administrator`, no un estado verificado por el sistema, y se etiqueta como tal en la
   interfaz para no sugerir una confirmación de entrega que no existe.
4. Solo `administrator` y el `teacher` del alumno acceden a las personas de referencia por esta
   vía (mismo alcance que T-13); ningún dato de contacto se expone en pantallas de conjunto abierto
   (buscador de T-20 u otros listados).

**Bloqueo humano:** ninguno — no da de alta ninguna cuenta ni integración externa.

**Criterio de aceptación:** el botón «avisar» no aparece si la ausencia está justificada; el
`mailto:` incluye alumno, fecha y clase; copiar al portapapeles funciona sin conexión; un
`teacher` no ve personas de referencia de un alumno fuera de sus slots.

---

### R-06 — Sustitución puntual de profesor en un slot
**Oleada / Fase:** v1 / F-03 · **Migración:** Sí (`009_sustitucion_profesor`) · **Depende de:** T-15, T-17, T-18
**Origen:** roadmap

**Objetivo:** un profesor falta un día y otro cubre su clase — hoy eso obligaría a tocar el
horario recurrente (arrastrando el cambio hacia atrás y hacia delante) o a registrar la asistencia
desde una cuenta que no es la del profesor real, perdiendo la trazabilidad de quién dio la clase.
Hace falta cubrir un slot un día concreto sin alterar el horario.

**Requisitos:**
1. `administrator` asigna una sustitución: slot, fecha concreta y profesor sustituto. No modifica
   el slot recurrente ni su vigencia (T-15): es una excepción de un solo día.
2. Ese día, el motor de propuesta (T-17) presenta ese slot al profesor sustituto en lugar del
   titular, y el titular no lo ve ese día. El resto de días, sin cambios.
3. Los registros de asistencia creados ese día quedan atribuidos al profesor sustituto —autor
   real— y la fila conserva una marca de que fue una sustitución, visible en «Registros» y en el
   histórico, coherente con "la hora real, no la teórica" y con no ocultar quién hizo qué.
4. Una sustitución no puede crearse retroactivamente para alterar quién aparece como autor de un
   registro ya existente — eso sería reescribir historia (§0.2).

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** el día de la sustitución, el sustituto ve el slot en «Mi horario»
(T-22) y el titular no; los registros de ese día muestran al sustituto como profesor y una marca
de sustitución; al día siguiente el horario vuelve a la normalidad sin intervención.

---

### R-07 — Pasar lista con conexión intermitente
**Oleada / Fase:** v1 / F-03 · **Migración:** No (solo cliente) · **Depende de:** T-18, T-19
**Origen:** roadmap

**Objetivo:** el sitio real donde se pasa lista es un aula, con el wifi que tenga esa aula — que a
menudo es malo o inexistente. T-19 ya deja claro que un fallo de red no debe fingir un registro,
pero hoy eso significa que el profesor tiene que reintentar a mano y puede perder el toque si la
aplicación se cierra antes de reintentar. Hace falta que un toque durante un corte de conexión no
se pierda.

**Requisitos:**
1. Un toque de registro que no puede completarse por falta de red se guarda en una cola local del
   dispositivo (IndexedDB, ya anotada como evolución futura en T-25 punto 9) con el mismo
   `peticion_id` que usaría la llamada directa, y la card queda en un estado visible «pendiente de
   enviar» — nunca «registrado» hasta confirmación real del servidor.
2. La cola reintenta sola al recuperar conexión, respetando el mismo `peticion_id` (idempotencia de
   T-18): un reintento nunca duplica.
3. Indicador de estado de conexión y de cuántos registros quedan por enviar, visible en la pantalla
   de pasar lista sin interrumpir el flujo de toques.
4. Si el dispositivo se cierra o recarga con la cola pendiente, al reabrir la sigue teniendo y
   sigue reintentando: sobrevive a un cierre de pestaña.
5. Cero dependencias nuevas: Service Worker e IndexedDB son API del navegador, no librerías
   (compatible con §0.2 de la hoja de ruta).

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** test que simula un fallo de red en el toque, cierra y reabre la
pestaña, y verifica que el registro pendiente sigue en cola y se envía al recuperar conexión sin
duplicar; test de que la card nunca pasa a «registrado» sin confirmación del servidor.
