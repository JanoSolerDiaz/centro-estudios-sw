# ROADMAP DE PRODUCTO — GestorAcademia — Documento vivo

> Roadmap de producto VIVO, gestionado por el agente Product Manager. Aquí se especifican las
> mejoras (tareas R-XX), agrupadas en oleadas y fases. Es la **spec de las R-XX** (las T-XX
> tienen su spec en `HOJA_DE_RUTA.md`).
>
> Reglas: este documento **especifica**, no lleva estado — el estado de cada R-XX vive en §1 de
> `SEGUIMIENTO.md` (no duplicar). Las oleadas 100% desplegadas se mueven a
> `ROADMAP_HISTORICO.md` para mantener vivo solo lo pendiente/en curso.

**Última actualización:** 2026-08-30 — sexto ciclo del PM. `FEEDBACK.md` sigue sin entradas `nuevo`
reales (fila plantilla vacía, sin cambios desde el ciclo anterior): nada que convertir.
`auditoriacontinua.md` registra su pasada del mismo día (2026-08-30), que confirma que **no ha
entrado código nuevo desde el ciclo anterior** (un único commit desde `86d8395`, y es del PM, no de
desarrollo: `git diff` contra `db/` y `src/` vacío) y reevalúa los tres hallazgos `ABIERTO` sin
cambio: #2 (severidad alta, cobertura de escritura de `db/pruebas_rls.sql`) sigue sin corregirse —
sigue siendo autorización/calidad de pruebas, no producto ni arquitectura, así que lo atiende el
programador como P-XX urgente en cuanto arranque su siguiente sesión (§0 de `HOJA_DE_RUTA.md`); #3 y
#4 (severidad baja) siguen `ABIERTO` en el código pero ya tienen su seguimiento correcto como P-02 y
P-03 en §5 de `SEGUIMIENTO.md` desde el ciclo anterior — no hay hallazgo nuevo que registrar ni
ningún cambio de severidad o estado que justifique tocar el backlog otra vez. Desde el ciclo anterior
(2026-08-29) el desarrollo sigue sin completar ninguna T-XX ni R-XX nueva (T-10 sigue bloqueada
pendiente de `002`/`003`; T-14 sigue siendo la siguiente en cola) y no ha surgido ningún hallazgo de
producto/arquitectura ni ninguna dependencia que faltara. **No se añade ninguna R-XX nueva en este
ciclo, por segunda vez consecutiva:** las oleadas v1 y v2 siguen cubriendo el hueco real detectado
entre el MVP y el objetivo de producto; sin desarrollo nuevo, sin feedback nuevo y sin hallazgo de
producto nuevo, no hay ninguna señal real que justifique ampliar el roadmap — inventar una R-XX en
estas condiciones sería generar trabajo por generarlo, exactamente lo que se prohíbe. Ninguna oleada
está 100% desplegada todavía (v1 ni siquiera ha arrancado: espera a que el MVP T-00–T-25 esté
COMPLETADA/DESPLEGADA EN PRODUCCIÓN, ver §1 de `SEGUIMIENTO.md`), así que no hay nada que mover a
`ROADMAP_HISTORICO.md` esta vez.

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
  sin datos se confunden, y no hay hora de salida ni duración real. R-01, R-02, R-03. Se añade R-12
  (calendario de cierres del centro): sin él, ninguna cuenta de "sesiones esperadas" aguas abajo
  (empezando por R-04) puede ser correcta en una semana de vacaciones.
- **F-02 — Informes y aviso a familias.** Con ausencias y horas ya registrables, cerrar el círculo
  hacia fuera: el informe que se enseña a una familia y el aviso cuando algo requiere que se
  enteren. R-04, R-05.
- **F-03 — Continuidad operativa.** Lo que mantiene el producto fiable cuando la realidad de un
  centro no es la ideal: un profesor falta, o el aula no tiene buena conexión. R-06, R-07.

> Quedan fuera de esta oleada, por depender de una decisión del dueño y anotadas en §6 de
> `SEGUIMIENTO.md`: el envío automático (no solo preparado) del aviso a la familia, y cualquier
> acceso del rol `student` o de una familia a su propio histórico.

### Oleada v2 — Arranque rápido, confianza legal y visión de centro

**Arranca cuando la oleada v1 (R-01 a R-07) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN** — el estado
real de esa condición se sigue en §1 de `SEGUIMIENTO.md`, no aquí. Hasta entonces las R-XX de esta
oleada quedan especificadas y en cola, detrás de la oleada v1, en el orden de §1.

Por qué esta oleada y en este orden: v1 cierra el ciclo diario de una clase que ya está dada de
alta en el sistema. Pero la primera vez que una academia real prueba GestorAcademia, el obstáculo
no es pasar lista: es tener que teclear a mano cada alumno y cada horario que ya tenía en una hoja
de cálculo — y si ese primer día cuesta demasiado, no hay segundo día. R-08 y R-09 atacan
precisamente esa fricción de adopción: entrar los datos sin repetir trabajo, y abrir la aplicación
tan rápido como una app nativa del móvil. Con la academia ya operando, R-10 cierra una obligación
legal que hoy no tiene respuesta de un clic (RGPD, datos de menores), y R-11 da al administrador la
vista de conjunto que ninguna hoja de cálculo ofrece de verdad — el argumento real frente a la
alternativa actual. Nada de esto añade datos personales nuevos ni toca al rol `student`.

- **F-04 — Arranque rápido.** El primer día de una academia real, migrando desde papel o Excel, y
  el gesto diario de abrir la aplicación. R-08 (importación masiva), R-09 (aplicación instalable,
  arranque sin red).
- **F-05 — Confianza legal.** El expediente completo de un alumno, listo para una solicitud RGPD o
  para archivar. R-10.
- **F-06 — Visión de centro.** Lo que un administrador no puede ver hoy ni con una hoja de cálculo
  bien hecha: el estado del día y las tendencias del mes, de un vistazo. R-11.

> Sigue fuera de todo el roadmap, por depender de una decisión del dueño (§6 de `SEGUIMIENTO.md`):
> el envío automático de avisos, cualquier acceso del rol `student` o de una familia a su propio
> histórico, y el multi-centro.

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

### R-12 — Calendario de cierres del centro (festivos y vacaciones)
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`010_calendario_cierres`) · **Depende de:** T-15
**Origen:** roadmap

**Objetivo:** que un periodo en el que el centro no da clase (Navidad, Semana Santa, un puente,
cierre estival) quede declarado una sola vez, para que el resto del producto deje de asumir que
toda semana del calendario tiene clase. Sin esto, R-04 (informe mensual) contaría como "sesión
esperada y no venida" cualquier tramo de una semana en la que el centro estuvo cerrado, y el
informe que se enseña a una familia estaría mal por un dato que el propio centro conoce de
antemano.

**Requisitos:**
1. `administrator` declara un cierre: fecha de inicio, fecha de fin (inclusive; puede ser un solo
   día) y motivo breve en texto libre ("Navidad", "Semana Santa", "Puente de diciembre"...). Ningún
   dato de alumno ni tabla de datos personales.
2. Operaciones: listar (pasados y futuros), crear, editar y desactivar — sin borrado real, mismo
   patrón que el catálogo de centros de estudios (T-11): un cierre desactivado deja de contar en
   cálculos nuevos, pero no desaparece del registro.
3. Solape: dos cierres que se pisan en fecha se rechazan con aviso, para no duplicar el mismo
   periodo con motivos distintos.
4. Función de dominio `esDiaCerrado(fecha)` como **única** vía para consultar si una fecha cae
   dentro de un cierre vigente — mismo principio que `slotsVigentesEn` (T-15): una sola función,
   reutilizada por todo lo que necesite saberlo.
5. **R-04 excluye de "sesiones esperadas" cualquier día que `esDiaCerrado` marque como cerrado**,
   para cada slot vigente del alumno ese mes.
6. Un cierre no reescribe nada del histórico ya registrado: si un profesor pasó lista un día que
   después se declara cerrado por error de fecha, esa asistencia sigue existiendo tal cual,
   íntegra — el cierre solo afecta al cálculo de "esperadas" de un informe generado **después** de
   declararlo, nunca a una fila de `asistencia` ya escrita (mismo principio de no-retroactividad de
   §0.2 aplicado al cálculo, no al registro).
7. Reservado a `administrator`; `teacher` solo lectura (para saber, si le interesa, si su próxima
   sesión cae en un cierre).
8. Gestión sencilla desde el panel del administrador (T-16), con estados vacío, de carga y de
   error; sin integración con ningún calendario externo (fuera del alcance de esta tarea).

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un cierre que cubre una semana completa hace que el informe mensual
(R-04) de un alumno con slot recurrente esa semana no cuente esa semana como sesión esperada; un
cierre solapado con uno existente se rechaza; desactivar un cierre no afecta a un informe ya
generado (documento estático) pero sí a uno generado después; una asistencia registrada un día
luego declarado cerrado por error sigue íntegra en el histórico.

---

### R-04 — Informe mensual por alumno
**Oleada / Fase:** v1 / F-02 · **Migración:** No · **Depende de:** T-23, R-01, R-02, R-03, R-12
**Origen:** roadmap

**Objetivo:** que `administrator` obtenga en un clic el resumen mensual que hoy tendría que
reconstruir a mano de una hoja de cálculo: cuántas clases tuvo un alumno, a cuántas vino, cuántas
ausencias justificadas e injustificadas, y las horas reales si están disponibles — el documento
que se enseña a una familia o se archiva.

**Requisitos:**
1. Desde la ficha de alumno o desde el histórico (T-23), generar el informe de un mes natural
   elegido: sesiones esperadas según el horario vigente cada semana de ese mes **y excluyendo los
   días marcados como cierre del centro (R-12, `esDiaCerrado`)**, entradas registradas, ausencias
   (justificadas/injustificadas), retroactivos, anuladas (visibles pero no contadas como
   asistencia), y horas reales acumuladas cuando R-03 tiene datos.
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

---

### R-08 — Importación masiva de alumnos y horarios
**Oleada / Fase:** v2 / F-04 · **Migración:** No · **Depende de:** T-12, T-15, T-16
**Origen:** roadmap

**Objetivo:** que una academia que hoy lleva su alumnado en una hoja de cálculo pueda empezar a
usar GestorAcademia sin volver a teclear cada alumno y cada horario a mano — el primer día es el
que decide si hay un segundo. Hoy la única vía de alta es la ficha una a una (T-12) y el horario
slot a slot (T-16), viable para el mantenimiento diario pero no para arrancar con 60 alumnos ya
existentes.

**Requisitos:**
1. Desde el panel de `administrator` (T-16), subir un fichero CSV de alumnos con las columnas de
   la ficha (T-12): nombre, primer apellido, segundo apellido opcional, centro de referencia,
   teléfono y email opcionales. El centro se resuelve con la misma comparación acento-insensible de
   T-11: si no existe, la fila queda en error con el motivo exacto, nunca crea un centro nuevo en
   silencio.
2. Vista previa obligatoria antes de confirmar: fila a fila, qué se va a crear y qué fila falla y
   por qué (falta un campo obligatorio, formato de teléfono o email inválido, centro no encontrado).
   Ninguna fila se escribe hasta que `administrator` confirma la importación completa.
3. Un segundo CSV, opcional y separado, importa horarios (T-15): alumno (por nombre y apellidos
   exactos de una fila ya importada o ya existente), profesor (por email de una cuenta que **ya
   existe** — la importación nunca crea usuarios ni cuentas, eso sigue siendo T-09, alta manual del
   administrador), día de la semana, hora de inicio, hora de fin y asignatura o grupo. Una fila que
   referencia un profesor inexistente queda en error, igual que en el punto 2.
4. Reintentar el mismo fichero tras corregir errores no duplica las filas ya importadas
   correctamente: se identifica con la misma comparación de duplicados de T-12 (nombre completo +
   centro).
5. El fichero de origen no se conserva más allá de la sesión de importación: no es un dato nuevo
   que guardar, es una entrada puntual que ya queda reflejada en las tablas de alumno y horario.
6. Reservado a `administrator`, igual que T-12 y T-15. Parseo de CSV con código propio (sin
   librería de terceros, coherente con el stack fijado).

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un CSV de 50 alumnos con 2 filas con error (un centro inexistente, un
teléfono con formato inválido) muestra la vista previa con esas 2 filas marcadas y permite
confirmar las 48 correctas sin esperar a corregirlas; reimportar el mismo fichero después de
corregirlas solo añade las 2 que faltaban, sin duplicar las 48 ya creadas; un CSV de horarios que
referencia un profesor sin cuenta en el sistema deja esa fila en error sin bloquear el resto.

---

### R-09 — Aplicación instalable y arranque sin red
**Oleada / Fase:** v2 / F-04 · **Migración:** No (solo cliente) · **Depende de:** T-19
**Origen:** roadmap

**Objetivo:** el profesor que pasa lista varias veces al día no debería tener que abrir un
navegador, teclear una URL y esperar a que cargue: tiene que ser un icono en su móvil que abre al
toque, tan rápido como cualquier app nativa, incluso si el aula no tiene cobertura en ese instante.
R-07 ya resuelve que un toque durante un corte de conexión no se pierda; esto resuelve que la
propia aplicación pueda **abrirse** sin conexión.

**Requisitos:**
1. `manifest.json` (nombre corto, iconos en los tamaños que exige la instalación, modo standalone,
   color de tema) para que el navegador ofrezca «añadir a pantalla de inicio» y el resultado se vea
   como una app, no como una pestaña.
2. Service Worker que cachea el cascarón estático (HTML, JS compilado, iconos) para que abrir la
   aplicación sin red muestre al menos la pantalla de login o la última pantalla de pasar lista
   servida, nunca una pestaña en blanco o el error del navegador. Los datos (alumnos, slots,
   asistencia) siguen exigiendo red o la cola de R-07 cuando ya exista.
3. Si R-07 se despliega antes, este Service Worker es el mismo fichero ampliado, no uno nuevo en
   paralelo — dos Service Workers registrados sobre el mismo origen compiten por el mismo caché y
   son fuente de fallos difíciles de reproducir.
4. Actualización de versión: el push a `develop` despliega varias veces al día (§0.1); el Service
   Worker debe purgar la caché antigua y avisar de que hay una versión nueva lista, en vez de dejar
   a un profesor atrapado en una versión vieja sin que se entere.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** la aplicación se puede instalar desde el navegador (criterios estándar
de instalabilidad de un manifest válido); abrir la aplicación en modo avión tras una visita previa
muestra la pantalla de login o de pasar lista cacheada, no un error de red; tras un nuevo
despliegue, la siguiente apertura ofrece la versión nueva sin dejar una versión cacheada
indefinidamente.

---

### R-10 — Expediente completo del alumno (acceso y portabilidad RGPD)
**Oleada / Fase:** v2 / F-05 · **Migración:** No · **Depende de:** T-13, T-23
**Origen:** roadmap

**Objetivo:** una familia tiene derecho a pedir todo lo que el centro guarda de su hijo o hija —
derecho de acceso y portabilidad del RGPD—, y hoy responder a esa solicitud significa que
`administrator` reconstruya a mano la ficha, las personas de referencia y el histórico completo. El
informe mensual (R-04) está pensado para enseñar un resumen del mes a una familia; esto es
distinto: el expediente completo, sin resumir, para cuando hace falta poder decir «esto es
exactamente todo lo que tenemos».

**Requisitos:**
1. Desde la ficha del alumno, `administrator` genera una exportación completa (JSON legible y
   documento imprimible) con: todos los campos de la ficha (T-12), todas sus personas de referencia
   (T-13), y el histórico íntegro de asistencia (T-23) sin filtrar por mes — incluidas las filas
   anuladas con su motivo y las marcadas retroactivas, porque un derecho de acceso que oculta lo
   anulado no es un acceso completo.
2. La exportación incluye la fecha de generación y quién la generó, dentro del propio documento —no
   en una tabla nueva—, para que quede constancia de cuándo se atendió la solicitud.
3. Reservado a `administrator`, mismo alcance que T-13 (personas de referencia) y la ficha completa
   de T-12: un `teacher` no genera ni ve esta exportación.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** exportar el expediente de un alumno con historial mixto (registros
válidos, anulados con motivo, retroactivos, con y sin personas de referencia) produce un único
documento completo y coherente con lo almacenado; un `teacher` recibe `SinPermiso` al intentarlo.

---

### R-11 — Panel de centro para el administrador
**Oleada / Fase:** v2 / F-06 · **Migración:** No · **Depende de:** T-16, T-21, R-01
**Origen:** roadmap

**Objetivo:** hoy `administrator` solo puede ver el estado del centro alumno a alumno o slot a
slot; no hay ninguna vista que responda de un vistazo «¿qué ha pasado hoy?» o «¿quién falta más
este mes?» — la clase de pregunta que en papel o en una hoja de cálculo exige reconstruir todo a
mano, y que es el argumento real por el que un centro paga por gestionar esto en vez de seguir sin
ello.

**Requisitos:**
1. Panel con tres bloques, calculados sobre datos ya existentes, sin tabla nueva: (a) las sesiones
   de hoy y su estado — pasada lista, pendiente, o sin pasar lista con su horario ya vencido; (b)
   ranking de alumnos con más ausencias injustificadas (R-01, R-02) en el mes en curso; (c) ranking
   de slots o profesores con menor proporción de sesiones registradas frente a las esperadas.
2. Los rankings muestran solo nombre y cifra — **nunca avatar**: es un listado que cambia cada día,
   y la regla de diseño vigente reserva la fotografía a conjuntos estables (ficha, cards del propio
   slot del profesor), no a listados transitorios.
3. Filtro por rango de fechas y por centro de referencia del alumno (`centro_referencia_id`, el
   colegio del alumno — no confundir con multi-centro de la academia, que sigue fuera de alcance).
4. Reservado a `administrator`.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** con un mes de datos sintéticos que incluya ausencias, registros válidos
y slots con distinta tasa de asistencia, el panel calcula correctamente ambos rankings y el estado
de las sesiones de hoy; un `teacher` no accede a esta pantalla.
