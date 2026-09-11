# ROADMAP DE PRODUCTO — GestorAcademia — Documento vivo

> Roadmap de producto VIVO, gestionado por el agente Product Manager. Aquí se especifican las
> mejoras (tareas R-XX), agrupadas en oleadas y fases. Es la **spec de las R-XX** (las T-XX
> tienen su spec en `HOJA_DE_RUTA.md`).
>
> Reglas: este documento **especifica**, no lleva estado — el estado de cada R-XX vive en §1 de
> `SEGUIMIENTO.md` (no duplicar). Las oleadas 100% desplegadas se mueven a
> `ROADMAP_HISTORICO.md` para mantener vivo solo lo pendiente/en curso.

**Última actualización:** 2026-09-11 — decimoctavo ciclo del PM. `FEEDBACK.md` sigue sin entradas
`nuevo` reales (fila plantilla vacía): nada que convertir. `auditoriacontinua.md` con una pasada
nueva desde el ciclo anterior (2026-09-11, commit `f09ad7f`): cierra los cuatro hallazgos que seguían
`ABIERTO` (**#15**, **#17**, **#18**, **#19**, ya resueltos por P-25/P-26/P-27 y por la fila de §7 de
R-16) y no abre ninguno nuevo. Sigue **ABIERTO** solo **#8** (dato de salud del artículo 9 del RGPD en
R-02), formalizado como pregunta **#16** de §6, esperando al dueño sin novedad — no requiere ninguna
acción nueva de este ciclo, igual que en el anterior.

**Columna vertebral de código (v1 a v5) agotada por completo: confirmado por cuatro sesiones de
programador consecutivas** tras completarse R-19 (§1: 37 `COMPLETADA`, 8 `BLOQUEADA` solo por
migración sin aplicar o por la pregunta #16, **cero `PENDIENTE`/`EN CURSO`**). El MVP (T-00 a T-25)
sigue sin estar completo (T-25 pendiente del paso a producción) y ninguna oleada ha llegado a
desplegarse todavía, así que nada se mueve a `ROADMAP_HISTORICO.md` esta vez — pero, con la cola de
trabajo formalmente vacía otra vez, toca volver a mirar más allá de la última oleada, mismo gesto que
el noveno ciclo (definió v2 completa con v1 en curso), el decimoquinto (v3), el decimosexto (v4) y el
decimoséptimo (v5).

**Revisadas primero las mismas fuentes que agotaron los ciclos anteriores, sin ningún hueco nuevo que
extraer de ellas:** ninguna spec de R-01 a R-19 deja ya una ampliación futura autoseñalada sin
convertir (R-06→R-14 y R-15→R-19 ya se cerraron en ciclos anteriores; una relectura completa de las
diecinueve specs no encuentra una tercera). Tampoco hay ninguna pregunta de §6 cuya respuesta por
defecto sugiera trabajo nuevo más allá de lo ya especificado.

**Una R-XX nueva este ciclo, abriendo la Oleada v6: R-20 (registro de auditoría de cambios para el
administrador).** No sale de una spec que la autoseñale, sino de una capacidad que el propio producto
ya tiene construida desde T-07/T-18 sin exponerla nunca a nivel de centro: `asistencia_historial`
existe precisamente, dice la norma permanente de §0.2 de `HOJA_DE_RUTA.md`, para "responder quién
cambió qué" — y hoy esa respuesta solo se puede obtener registro a registro, abriendo «Registros»
(T-21) de un slot y una fecha concretos. Un centro con varios profesores no tiene ninguna forma de
comprobar de un vistazo que la disciplina del principio 2 ("quien se equivoca, lo arregla — y queda
constancia") se cumple, más allá de ir caso por caso; y es exactamente el argumento de fiabilidad
legal que distingue este producto de una hoja de cálculo, donde una celda editada no deja rastro de
quién ni cuándo. No es ninguna de las decisiones reservadas al dueño (no es precio, plan, cuenta de
pago, texto legal, comunicación a usuarios reales, operación destructiva ni DDL de producción): es una
vista nueva sobre un dato que ya existe, sin migración, sin dato personal nuevo y sin tocar al rol
`student`. **Revisado el resto del roadmap contra el estado actual y la visión de producto: sin ningún
otro hueco real que añadir este ciclo** — diecisiete ciclos consecutivos de PM ya habían traducido a
tareas concretas el hueco real entre el MVP y el objetivo de producto; inventar una segunda tarea sin
necesidad real detrás sería exactamente el vicio que este protocolo existe para evitar.

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
  (empezando por R-04) puede ser correcta en una semana de vacaciones. Se añade también R-13
  (aviso al profesor, en su propio horario, de una sesión que se le quedó sin pasar lista): sin
  él, un olvido puntual solo lo detecta el administrador, y solo si existe R-11 (oleada v2).
- **F-02 — Informes y aviso a familias.** Con ausencias y horas ya registrables, cerrar el círculo
  hacia fuera: el informe que se enseña a una familia y el aviso cuando algo requiere que se
  enteren. R-04, R-05.
- **F-03 — Continuidad operativa.** Lo que mantiene el producto fiable cuando la realidad de un
  centro no es la ideal: un profesor falta —con o sin quien lo cubra—, o el aula no tiene buena
  conexión. R-06, R-07. Se añade R-14 (aviso de clase cancelada a las familias): la propia spec de
  R-06 dejaba dicho que este era el paso natural siguiente, no una pieza nueva sin relación.

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

### Oleada v3 — Rendición de cuentas del centro: nómina y portabilidad total

**Arranca cuando la oleada v2 (R-08 a R-11) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN** — el estado
real de esa condición se sigue en §1 de `SEGUIMIENTO.md`, no aquí. Hasta entonces las R-XX de esta
oleada quedan especificadas y en cola, detrás de la oleada v2, en el orden de §1.

Por qué esta oleada y en este orden: v1 y v2 dejan resuelto el ciclo diario de una clase y la
adopción inicial de una academia, pero dejan sin explotar dos datos que el producto ya tiene
completos en cuanto R-03 y R-10 existen. El primero es interno al centro: la duración real de cada
clase (R-03) es exactamente lo que hace falta para pagar a un profesor por hora, y hoy nadie la suma
por profesor — solo por alumno (R-04). El segundo es externo, de confianza: R-10 ya prueba que un
alumno puede llevarse todo lo suyo; falta que el centro entero pueda llevarse todo lo suyo, el
argumento real frente al miedo de "si dejo mi Excel por esto, ¿me quedo atrapado?". Ninguna de las
dos amplía datos personales ni toca al rol `student`.

- **F-07 — Rendición de cuentas y portabilidad.** Lo que un centro necesita para pagar con datos
  reales y para no depender de nadie para llevarse los suyos. R-15 (informe de horas por profesor),
  R-16 (exportación completa del centro).

> Sigue fuera de todo el roadmap, por depender de una decisión del dueño (§6 de `SEGUIMIENTO.md`):
> el envío automático de avisos, cualquier acceso del rol `student` o de una familia a su propio
> histórico, y el multi-centro.

### Oleada v4 — Fricción cero en el día a día, primera impresión en la adopción

**Arranca cuando la oleada v3 (R-15 a R-16) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN** — el estado
real de esa condición se sigue en §1 de `SEGUIMIENTO.md`, no aquí. Hasta entonces las R-XX de esta
oleada quedan especificadas y en cola, detrás de la oleada v3, en el orden de §1.

Por qué esta oleada y en este orden: v1 a v3 dejan resuelto el ciclo diario de una clase, la
adopción de datos ya existentes y la rendición de cuentas del centro, pero quedan dos fricciones
reales que ninguna de las tres oleadas anteriores atacó todavía, una hacia dentro del uso diario y
otra hacia el primer contacto con el producto. La primera es del profesor, el usuario de mayor
frecuencia: R-01 ya permite marcar ausente a quien no vino, pero de uno en uno, así que cerrar una
clase con varios ausentes sigue costando tantos toques como alumnos faltaron — justo cuando el
profesor está de salida. La segunda es de la primera sesión de un administrador en un centro
recién creado: nada en la interfaz de hoy le dice en qué orden dar de alta un centro de referencia,
un alumno, un horario y un profesor, pese a que R-08/R-09 ya resolvieron el coste de teclear los
datos y el de abrir la aplicación. Ninguna de las dos añade datos personales nuevos ni toca al rol
`student`.

- **F-08 — Cierre de sesión sin fricción.** R-17.
- **F-09 — Primera impresión y adopción.** R-18.

> Sigue fuera de todo el roadmap, por depender de una decisión del dueño (§6 de `SEGUIMIENTO.md`):
> el envío automático de avisos, cualquier acceso del rol `student` o de una familia a su propio
> histórico, y el multi-centro.

### Oleada v5 — Autoservicio del profesor: sus propias horas, sin pedírselas a nadie

**Arranca cuando la oleada v4 (R-17 a R-18) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN** — el estado
real de esa condición se sigue en §1 de `SEGUIMIENTO.md`, no aquí. Hasta entonces la R-XX de esta
oleada queda especificada y en cola, detrás de la oleada v4, en el orden de §1.

Por qué esta oleada: v1 a v4 dejan resuelto el ciclo diario de una clase, la adopción inicial de una
academia, la rendición de cuentas del centro y la fricción de cierre de sesión y primer arranque, pero
todas miran los datos del profesor desde fuera — el administrador ve sus horas (R-15) y su aviso de
sesión sin pasar lista (R-13, que sí es del propio profesor pero solo dentro de su semana) —, nunca le
dan al profesor una cifra que hoy solo calcula el administrador para él. La propia spec de R-15 dejó
dicho, en su propio requisito 5, que esto era una ampliación de alcance futura y no algo que debiera
resolver de más: con la columna vertebral de código agotada (v1 a v4), toca abrirla. Nada de esto
añade datos personales nuevos ni toca al rol `student`.

- **F-10 — Transparencia de horas propias.** R-19.

> Sigue fuera de todo el roadmap, por depender de una decisión del dueño (§6 de `SEGUIMIENTO.md`):
> el envío automático de avisos, cualquier acceso del rol `student` o de una familia a su propio
> histórico, y el multi-centro.

### Oleada v6 — Confianza y trazabilidad de centro: quién cambió qué, de un vistazo

**Arranca cuando la oleada v5 (R-19) esté COMPLETADA/DESPLEGADA EN PRODUCCIÓN** — el estado real de
esa condición se sigue en §1 de `SEGUIMIENTO.md`, no aquí. Hasta entonces la R-XX de esta oleada
queda especificada y en cola, detrás de la oleada v5, en el orden de §1.

Por qué esta oleada: v1 a v5 dejan resuelto el ciclo diario de una clase, la adopción inicial, la
rendición de cuentas del centro, la fricción de cierre de sesión y arranque, y el autoservicio del
profesor sobre sus propias horas — pero todas construyen sobre un dato que el producto ya guarda
desde T-07/T-18 (`asistencia_historial`, quién corrigió cada registro y cuándo) sin exponerlo nunca
como una vista propia: hoy solo se comprueba registro a registro, dentro de «Registros» (T-21) de un
slot y una fecha concretos. Es precisamente el argumento de fiabilidad legal que distingue este
producto de una hoja de cálculo — donde una celda editada no deja ningún rastro de quién ni
cuándo —, y hoy esa constancia existe en la base de datos sin que nadie pueda verla agregada para
todo el centro. Nada de esto añade datos personales nuevos ni toca al rol `student`.

- **F-11 — Transparencia del registro de cambios.** R-20.

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
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`010_registro_ausencias`) · **Depende de:** T-21
**Origen:** roadmap

**Objetivo:** que "no hay fila" deje de ser la única forma de decir que un alumno faltó. Hoy el
histórico solo registra entradas: un alumno que faltó y un tramo en el que nadie llegó a pasar
lista se ven exactamente igual —un hueco—, y eso no sirve para justificar nada ante una familia.
Un profesor tiene que poder cerrar el tramo dejando constancia expresa de quién no vino.

**Requisitos:**
1. Al cerrar un slot en pasar lista, o desde «Registros» (T-21), el profesor puede marcar como
   ausente a cualquier alumno del slot que no tenga ya un registro de entrada ese día, sin abrir un
   formulario aparte. **Precisión tras T-19** (la card ya es un `<button>` cuyo único toque registra
   la entrada, sin ningún gesto libre para una segunda acción): el control para marcar ausente tiene
   que ser distinguible de ese toque simple — por ejemplo un control secundario visible en la propia
   card, o mantenerla pulsada — nunca el mismo gesto con doble significado. La elección exacta es una
   decisión de UI de la sesión que implemente R-01, no de esta especificación.
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
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`011_justificacion_ausencia`) · **Depende de:** R-01, T-13
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

**Nota de auditoría (2026-09-05, hallazgo #8 de `auditoriacontinua.md`, severidad alta,
`ABIERTO`):** la lista cerrada del requisito 1 incluye `enfermedad` y `cita_medica` — dato de salud
a efectos del artículo 9 del RGPD por definición, con independencia de su granularidad, y sin que
conste ninguna decisión expresa del dueño que autorice tratar esa categoría (§0.2 de
`HOJA_DE_RUTA.md` la prohíbe sin ella). Pregunta abierta **#16** de §6 de `SEGUIMIENTO.md`, con tres
opciones: aceptar el campo como dato de salud (con base jurídica del art. 9.2 y corrigiendo los
cuatro documentos de `legal/` y el inventario de `PRODUCCION_T25.md`, que hoy afirman lo contrario),
reformularlo para no revelar categoría médica, o retirarlo. El código y los tests de este requisito
ya existen tal como se describe arriba — esta nota no los reescribe, solo advierte de que su
migración (`011`) no debe aplicarse hasta que el dueño responda.

**Bloqueo humano:** sí, desde el 2026-09-05 — pendiente la respuesta del dueño a la pregunta **#16**
de §6 (ver nota de auditoría arriba). Hasta entonces, no aplicar la migración `011` (fila 14 de §3).

**Criterio de aceptación:** una ausencia justificada se distingue de una injustificada en listado
e histórico; el CSV exporta el motivo; justificar fuera de la ventana del profesor es rechazado
para `teacher` y aceptado para `administrator`.

---

### R-03 — Registro de salida y cómputo de horas reales
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`012_registro_salida`) · **Depende de:** T-18, T-21
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
**Oleada / Fase:** v1 / F-01 · **Migración:** Sí (`014_calendario_cierres`) · **Depende de:** T-15
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

### R-13 — Aviso de sesiones sin pasar lista en «Mi horario»
**Oleada / Fase:** v1 / F-01 · **Migración:** No · **Depende de:** T-19, T-22, R-06, R-12
**Origen:** roadmap

**Objetivo:** cerrar el ciclo diario también para quien lo vive cada día. Hoy, si un profesor
olvida pasar lista de un slot —el aula sin cobertura, una salida con prisa, un imprevisto—, nada
en su propia aplicación se lo recuerda: el hueco solo se detecta si alguien lo busca a mano en
«Registros», o cuando exista R-11 (panel del administrador, oleada v2), que además no es su
pantalla. Sin este aviso, el propio producto reproduce en silencio el fallo que dice resolver: un
tramo sin dato que nadie nota hasta que hace falta.

**Requisitos:**
1. En «Mi horario» (T-22), cada slot propio de los últimos 7 días (misma ventana que
   `VENTANA_EDICION_TEACHER_DIAS`, T-21) cuya hora de fin ya pasó y que no tiene ningún registro de
   asistencia —ni entrada ni ausencia— para ninguno de sus alumnos, se marca visualmente como «sin
   pasar lista». Es una señal, no un bloqueo ni un formulario emergente: el profesor sigue viendo
   el resto de la pantalla con normalidad.
2. Un toque sobre el aviso enlaza directamente a «Registros» de ese slot y esa fecha (mismo enlace
   profundo que T-22 ya construyó para el propio día), para completar el registro retroactivo sin
   tener que localizarlo a mano.
3. Un slot excluido de "sesiones esperadas" por un cierre del centro vigente ese día (R-12,
   `esDiaCerrado`) o por una cancelación de ese slot ese día (R-06) nunca se marca: no hubo clase,
   no hay nada que registrar.
4. Un slot cuya fecha queda fuera de la ventana de edición del profesor no se marca: pasada esa
   ventana ya no puede corregirlo él mismo desde esta pantalla, y señalarlo sería ruido sin ninguna
   acción posible.
5. Ningún dato ni tabla nueva: se calcula en el cliente a partir de los slots vigentes (T-15) y de
   la asistencia ya consultada de esos días (T-23), igual que el resto de «Mi horario». Ninguna
   notificación push ni envío fuera de la aplicación —fuera de alcance, cero infraestructura
   nueva—: es una señal dentro de la propia pantalla que el profesor ya abre a diario.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un slot propio de hace 2 días sin ningún registro se marca «sin pasar
lista» y un toque lleva a «Registros» de ese slot y esa fecha; el mismo slot, si ese día estaba
cancelado (R-06) o caía en un cierre del centro (R-12), no se marca; un slot de hace 10 días (fuera
de la ventana de 7) tampoco se marca; un slot con al menos un registro —entrada o ausencia, de
cualquier alumno— no se marca, aunque falten otros alumnos suyos por pasar lista individualmente
(eso ya lo resuelve T-19).

---

### R-04 — Informe mensual por alumno
**Oleada / Fase:** v1 / F-02 · **Migración:** No · **Depende de:** T-23, R-01, R-02, R-03, R-06, R-12
**Origen:** roadmap

**Objetivo:** que `administrator` obtenga en un clic el resumen mensual que hoy tendría que
reconstruir a mano de una hoja de cálculo: cuántas clases tuvo un alumno, a cuántas vino, cuántas
ausencias justificadas e injustificadas, y las horas reales si están disponibles — el documento
que se enseña a una familia o se archiva.

**Requisitos:**
1. Desde la ficha de alumno o desde el histórico (T-23), generar el informe de un mes natural
   elegido: sesiones esperadas según el horario vigente cada semana de ese mes **excluyendo los
   días marcados como cierre del centro (R-12, `esDiaCerrado`) y los días en que el propio slot del
   alumno quedó cancelado (R-06)** — una clase cancelada por falta de profesor y sin sustituto no
   cuenta como sesión esperada de ningún alumno de ese slot, igual que no cuenta un día festivo —,
   entradas registradas, ausencias (justificadas/injustificadas), retroactivos, anuladas (visibles
   pero no contadas como asistencia), y horas reales acumuladas cuando R-03 tiene datos.
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

### R-06 — Excepción puntual de un slot: sustitución o cancelación
**Oleada / Fase:** v1 / F-03 · **Migración:** Sí (`013_excepcion_slot`) · **Depende de:** T-15, T-17, T-18
**Origen:** roadmap

**Objetivo:** un profesor falta un día. A veces otro cubre su clase — hoy eso obligaría a tocar el
horario recurrente (arrastrando el cambio hacia atrás y hacia delante) o a registrar la asistencia
desde una cuenta que no es la del profesor real, perdiendo la trazabilidad de quién dio la clase.
Otras veces no hay quien la cubra y la clase, sencillamente, no se da — y hoy eso no tiene ninguna
forma honesta de quedar dicho: no pasar lista se confunde con "el profesor aún no ha llegado"
(R-01), y marcar a cada alumno como ausente penaliza en el informe mensual (R-04) a quien no tuvo
ninguna culpa de que la clase no se diera. Ambos casos son la misma idea —una excepción de un solo
día sobre un slot recurrente, sin tocar el horario ni el pasado— y se resuelven con la misma tarea.

**Requisitos:**
1. Para un slot y una fecha concreta, `administrator` declara una excepción de uno de dos tipos:
   **sustitución** (otro profesor cubre la clase) o **cancelación** (no hay clase, con motivo breve
   en texto libre — "profesor de baja", "imprevisto", sin dato de alumno). Ninguna de las dos
   modifica el slot recurrente ni su vigencia (T-15): son excepciones de un solo día.
2. **Sustitución:** ese día, el motor de propuesta (T-17) presenta ese slot al profesor sustituto
   en lugar del titular, y el titular no lo ve. Los registros de asistencia creados ese día quedan
   atribuidos al profesor sustituto —autor real— y la fila conserva una marca de que fue una
   sustitución, visible en «Registros» y en el histórico, coherente con "la hora real, no la
   teórica" y con no ocultar quién hizo qué. El resto de días, sin cambios.
3. **Cancelación:** ese día, el slot no se ofrece a ningún profesor en pasar lista —ni al titular
   ni a nadie— y no se crea ninguna fila de asistencia para ningún alumno del slot: ni ausencias
   (R-01) ni entradas. No es que los alumnos faltaron: es que la clase no se dio, y el registro no
   debe decir lo contrario.
4. «Mi horario» (T-22) del profesor titular muestra ese día el slot marcado como «Cubierto por
   [sustituto]» o «Cancelada — <motivo>», nunca como «Sin clases este día» ni como el slot normal,
   para que no piense que tiene que pasar lista.
5. Ninguna de las dos excepciones puede declararse retroactivamente sobre un slot que ya tiene
   registros de asistencia ese día — sustituir o cancelar a posteriori alteraría quién aparece
   como autor, o borraría de hecho una clase que sí se dio: eso es reescribir historia (§0.2), y se
   rechaza con aviso.
6. La cancelación excluye ese día de "sesiones esperadas" para los alumnos de ese slot en el
   informe mensual (R-04), mismo principio que `esDiaCerrado` (R-12) pero a nivel de slot en vez de
   centro entero. La sustitución sigue contando como sesión esperada y dada: hubo clase, solo
   cambió quién la impartió.
7. Avisar a las familias de una clase cancelada queda fuera del alcance de esta tarea; si se
   quiere en el futuro, es una ampliación del mecanismo ya construido por R-05, no una pieza nueva.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** el día de la sustitución, el sustituto ve el slot en «Mi horario»
(T-22) y el titular no; los registros de ese día muestran al sustituto como profesor y una marca
de sustitución. El día de una cancelación, ningún profesor ve el slot en pasar lista, no se crea
ninguna fila de asistencia, y el informe mensual (R-04) de los alumnos de ese slot no cuenta ese
día como sesión esperada. Un intento de sustituir o cancelar un slot que ya tiene registros ese día
se rechaza. Al día siguiente el horario vuelve a la normalidad sin intervención.

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

### R-14 — Aviso de clase cancelada a las familias
**Oleada / Fase:** v1 / F-03 · **Migración:** Sí (columna(s) nuevas en `excepcion_slot` para dejar
constancia de quién avisó y cuándo) · **Depende de:** R-05, R-06
**Origen:** roadmap (autoseñalada por el requisito 7 de la propia spec de R-06)

**Objetivo:** cuando una clase se cancela por falta de profesor y sin sustituto (R-06), hoy ninguna
familia se entera por la aplicación — el centro tiene que acordarse de avisar por su cuenta, la misma
fricción que R-05 ya resolvió para una ausencia individual, pero sin resolver para una clase entera.
R-06 (requisito 7) ya dejó dicho que esto era una ampliación del mecanismo de R-05, no una pieza
nueva: con las dos ya con su código completo, este hueco autoseñalado deja de ser hipotético.

**Requisitos:**
1. Sobre una cancelación ya declarada (bloque "Excepción de este día" de «Registros», R-06, hoy
   exclusivo de `administrator`), un botón «Avisar a las familias» lista **todos** los alumnos del
   slot cancelado con sus personas de referencia (nombre, teléfono, email) — mismo componente que
   R-05 (`listarPersonasReferencia`), sin duplicarlo.
2. Mensaje prellenado por alumno con su nombre, la fecha y el motivo de la cancelación (reutiliza el
   patrón de `mensajeAvisoAusencia`, no la misma función literal: el texto es distinto, "se cancela
   la clase de..." en vez de "faltó a..."). Mismas dos acciones que R-05 sobre ese mensaje: `mailto:`
   si la persona de referencia tiene email, copiar al portapapeles siempre.
3. Marcar «aviso enviado» es una anotación manual, con quién y cuándo, del mismo profesor de guardia
   o `administrator` que declaró la cancelación — **una sola vez para la excepción completa**, no una
   por alumno: a diferencia de R-05 (una ausencia es de un alumno), una cancelación es un único
   evento que afecta a todo el slot por igual, así que no hay una fila de asistencia individual a la
   que enganchar la nota (R-06 requisito 3: una cancelación no crea ninguna fila de `asistencia`).
   Igual que R-05, se etiqueta en la interfaz como anotación no verificada, nunca como confirmación
   de entrega.
4. No aplica a una sustitución (R-06): hubo clase, solo cambió quién la dio, y no hay nada que avisar
   a ninguna familia.
5. Mismo alcance de acceso a personas de referencia que R-05 (hoy exclusivo de `administrator`,
   sujeto a la misma pregunta abierta **#17** de §6 sobre si `teacher` debería acceder también —
   R-14 no reabre esa pregunta, hereda la misma respuesta que tenga R-05 en cada momento).
6. Sin envío automático, igual que R-05: sigue pendiente de la misma decisión del dueño (pregunta
   **#1** de §6).

**Bloqueo humano:** ninguno — no da de alta ninguna cuenta ni integración externa.

**Criterio de aceptación:** al declarar una cancelación sobre un slot con tres alumnos, «Avisar a las
familias» muestra los tres con sus personas de referencia y un mensaje prellenado que nombra el
motivo de la cancelación; marcar «aviso enviado» registra quién y cuándo una sola vez para toda la
excepción, no una vez por alumno; el botón no aparece sobre una sustitución del mismo slot.

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

---

### R-15 — Informe de horas por profesor
**Oleada / Fase:** v3 / F-07 · **Migración:** No · **Depende de:** R-03, T-24
**Origen:** roadmap

**Objetivo:** que `administrator` sepa, para un rango de fechas, cuántas horas reales impartió cada
profesor — hoy esa cuenta solo existe reconstruida a mano sumando el informe mensual (R-04) de cada
alumno de cada profesor, exactamente el mismo trabajo manual en hoja de cálculo que el resto del
producto ya evita para el histórico de un alumno. La mayoría de academias de este perfil pagan a sus
profesores por hora dada: sin este informe, la fuente de la nómina sigue fuera del producto pese a
que el dato ya existe dentro de él desde R-03.

**Requisitos:**
1. Desde el panel de `administrator` (integrado en el panel de R-11 o en pantalla propia — decisión
   de la sesión que lo implemente, sin condicionar esta spec), elegir un rango de fechas (por defecto
   el mes en curso) y ver, por cada profesor con `perfil.rol = 'teacher'` y `activo = true` (T-24),
   el número de sesiones con al menos una entrada registrada, las horas reales acumuladas (suma de
   la duración real de R-03 cuando existe; `null`, nunca `0`, si ningún registro del profesor en ese
   rango tiene salida marcada) y las horas teóricas del conjunto de slots vigentes de ese profesor en
   el rango, para poder comparar lo previsto con lo realmente dado.
2. Las sesiones en las que el profesor actuó como sustituto de otro (R-06) se contabilizan aparte,
   nunca mezcladas con sus horas propias: a efectos de nómina una sustitución puede pagarse de forma
   distinta, y fundirlas en una sola cifra ocultaría cuánto de lo impartido fue su propio horario.
3. Ninguna sesión anulada (`asistencia.estado = 'anulada'`) ni ninguna cancelación de slot (R-06)
   cuenta como hora impartida — mismo criterio que R-04 aplicado esta vez al profesor, no al alumno.
4. Exportable a CSV, mismo patrón que R-04 (T-23): cabecera de centro, rango de fechas y fecha de
   generación, una fila por profesor.
5. Reservado a `administrator`; ningún profesor ve el informe de otro ni el suyo propio por esta vía
   (si en el futuro interesa que un `teacher` vea sus propias horas, es una ampliación de alcance
   nueva, no algo que esta tarea deba resolver de más).

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** con datos sintéticos de dos profesores en un mismo mes, uno de ellos con
sesiones propias y una sustitución de otro slot, el informe separa horas propias de horas de
sustitución para cada profesor, sin que ninguna sesión anulada o cancelada las infle; el CSV exportado
coincide con lo mostrado en pantalla; un `teacher` recibe `SinPermiso` al intentar generarlo.

---

### R-16 — Exportación completa del centro (copia de seguridad y portabilidad)
**Oleada / Fase:** v3 / F-07 · **Migración:** No · **Depende de:** T-11, T-12, T-13, T-15, T-23
**Origen:** roadmap

**Objetivo:** que `administrator` pueda obtener, en un clic, un volcado completo de todo lo que el
centro tiene guardado en el sistema — alumnos, personas de referencia, horarios e histórico de
asistencia — sin depender de pedirlo a nadie con acceso directo a la base de datos. R-10 ya resuelve
exactamente esto para UN alumno (acceso y portabilidad RGPD); esta tarea es el mismo derecho a nivel
de centro completo: la prueba de que los datos son del centro y no del proveedor, y de que hacer una
copia de seguridad propia o cambiar de herramienta el día de mañana nunca depende de un tercero.

**Requisitos:**
1. Desde el panel de `administrator`, un botón «Exportar todo el centro» genera un único documento
   JSON legible con: el catálogo de centros de referencia (T-11), todos los alumnos con su ficha
   completa y sus personas de referencia (T-12, T-13), todos los slots de horario —vigentes e
   históricos, con su versionado íntegro (T-15)— y el histórico completo de asistencia de todos los
   alumnos (T-23), incluidas las filas anuladas con su motivo y las marcadas retroactivas — mismo
   criterio de integridad que R-04 del expediente individual: un volcado que oculta lo anulado no es
   un volcado completo.
2. Nunca incluye la fotografía de ningún avatar —solo `tieneAvatar: booleano` por alumno, mismo
   criterio exacto que R-10— ni ninguna credencial de ningún usuario: es un volcado de los datos de
   negocio del centro, nunca de contenido binario sensible ni de secretos de autenticación.
3. Incluye, dentro del propio documento, la fecha de generación y quién la generó.
4. El volumen es el de todo el centro, no el de un alumno: la sesión que lo implemente decide cómo
   paginar o agrupar las peticiones al servidor para no disparar más peticiones de las necesarias ni
   agotar memoria del cliente con un centro grande — detalle de implementación fuera de esta spec.
5. Reservado a `administrator`.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** exportar un centro sintético con 50 alumnos, historial de asistencia
mixto (válido, anulado, retroactivo) y horarios con más de una versión por slot produce un único
documento JSON coherente con lo almacenado, sin ninguna fotografía ni credencial; un `teacher` recibe
`SinPermiso` al intentarlo.

---

### R-17 — Cierre de slot en un toque: marcar pendientes como ausentes en bloque
**Oleada / Fase:** v4 / F-08 · **Migración:** No · **Depende de:** R-01, T-19, T-21
**Origen:** roadmap

**Objetivo:** R-01 ya deja marcar ausente a un alumno sin registro ese día, pero de uno en uno. Un
slot con ocho alumnos donde faltaron cinco cuesta cinco toques para cerrarlo — justo el momento en
que el profesor está saliendo de clase con prisa, exactamente el escenario que este producto existe
para no penalizar. Una acción explícita que cierre el resto de un solo gesto, con la misma
trazabilidad de siempre, completa lo que R-01 dejó abierto sin contradecir su propia regla de que el
sistema nunca infiere una ausencia por sí solo: sigue siendo un toque explícito del profesor, solo
que aplicado de una vez a quien de verdad falta.

**Requisitos:**
1. En pasar lista (T-19), cuando el slot en curso tiene al menos un alumno sin ningún registro (ni
   entrada ni ausencia) ese día, aparece un control explícito y distinguible de las cards
   individuales — nunca activo por defecto, nunca disparado por un temporizador ni por cambiar de
   pantalla — del tipo «Marcar el resto como ausente».
2. Un toque sobre ese control abre una confirmación que **lista nominalmente** a los alumnos que se
   van a marcar (nunca solo una cifra): el profesor ve exactamente a quién antes de decidir. Solo al
   confirmar se ejecuta la acción.
3. Cada alumno pendiente se registra con la misma RPC de R-01 (`registrar_ausencia`), una llamada
   por alumno — no una operación atómica conjunta —, respetando el límite de tasa ya existente
   (T-06). Si alguna llamada falla (límite alcanzado, red), las que ya se completaron quedan (igual
   que si se hubieran marcado una a una) y la interfaz dice exactamente cuáles no se pudieron marcar,
   para reintentarlas sueltas.
4. Un alumno que ya tiene un registro de entrada o de ausencia ese día queda excluido de la
   confirmación desde el principio: la acción nunca sobrescribe ni duplica un registro existente.
5. Disponible también desde «Registros» (T-21) para el mismo slot y fecha, con el mismo
   comportamiento — mismo criterio que R-01, que ya se ofrece en los dos sitios.
6. Cada fila creada es indistinguible, en su naturaleza, de una ausencia marcada individualmente:
   mismo régimen de edición, anulación y rastro en `asistencia_historial` (§0.2). No crea ningún
   estado, columna ni tabla nueva.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un slot con ocho alumnos donde tres ya tienen entrada y uno ausencia
marcada muestra la confirmación con los cuatro restantes exactos, nombrados; confirmar produce cuatro
registros de ausencia trazables, uno por alumno, sin tocar los cuatro ya existentes; repetir la
acción sobre el mismo slot y fecha ya no ofrece a nadie, porque todos tienen registro; un fallo de
red al marcar uno de los cuatro deja completados a los otros tres y avisa cuál falló, sin perderlos.

---

### R-18 — Asistente de primeros pasos para el administrador
**Oleada / Fase:** v4 / F-09 · **Migración:** No · **Depende de:** T-11, T-12, T-15, T-24
**Origen:** roadmap

**Objetivo:** el primer administrador que entra a un centro recién creado se encuentra pantallas
vacías sin ninguna guía de qué hacer primero: un centro de referencia, un alumno, un horario y un
profesor viven en cuatro pantallas distintas, y hoy nada en la interfaz señala el orden ni el
progreso. R-08 (importación masiva) y R-09 (aplicación instalable) ya reducen el coste de teclear
datos y de abrir la aplicación, pero no dicen **qué falta hacer todavía** ni en qué orden. Una lista
de comprobación visible desde el primer inicio de sesión, con progreso real calculado sobre datos ya
existentes, es la primera impresión que decide si una academia sigue explorando el producto o lo
abandona.

**Requisitos:**
1. Bloque o pantalla visible para `administrator` — accesible en cualquier momento, y mostrado por
   defecto mientras queden pasos pendientes — con una lista de comprobación de arranque: (a) al
   menos un centro de estudios de referencia dado de alta (T-11); (b) al menos un alumno activo
   (T-12; el enlace puede llevar al alta manual o, si existe, a la importación masiva de R-08, según
   convenga a la sesión que lo implemente); (c) al menos un slot de horario vigente (T-15); (d) al
   menos un profesor con cuenta activa además del propio administrador (T-24).
2. Cada paso se calcula en tiempo real contando filas ya existentes — sin campo, columna ni tabla
   nueva — y se marca hecho en cuanto la condición se cumple, sin que el administrador tenga que
   marcarlo a mano ni recargar la pantalla.
3. Cada paso pendiente enlaza directamente a la pantalla donde completarlo, mismo patrón de enlace
   profundo que T-22/R-13 ya usan.
4. En cuanto los cuatro pasos están completos, el asistente deja de mostrarse por defecto (el
   centro ya está operativo), pero sigue accesible bajo demanda en cualquier momento — nunca
   desaparece de forma irrecuperable, y nunca bloquea el resto de la interfaz mientras algún paso
   sigue pendiente.
5. Ningún dato ni tabla nuevos; ninguna comunicación ni cuenta externa; el cálculo respeta el mismo
   alcance de `administrator` que las pantallas a las que enlaza. Un `teacher` no ve este asistente.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un centro recién creado (sin ningún centro de referencia, alumno, slot
ni segundo profesor) muestra los cuatro pasos pendientes con sus enlaces; dar de alta el primer
alumno marca el paso (b) como hecho sin ninguna acción manual adicional; con los cuatro pasos
completos, el asistente deja de aparecer por defecto pero sigue accesible; un `teacher` no ve este
asistente.

---

### R-19 — Informe de horas propias para el profesor
**Oleada / Fase:** v5 / F-10 · **Migración:** No · **Depende de:** R-15
**Origen:** roadmap (autoseñalada por el requisito 5 de la propia spec de R-15)

**Objetivo:** R-15 ya calcula, para cada profesor activo, sus sesiones y horas reales/teóricas — pero
solo `administrator` lo ve. Un profesor que quiere comprobar cuántas horas ha dado este mes antes de
que le paguen tiene que pedírselo al administrador y esperar: la misma fricción que R-15 ya evitó para
el centro completo (antes había que reconstruirla a mano sumando el informe mensual, R-04, de cada
alumno suyo), sin resolver todavía para sí mismo. La propia spec de R-15 (requisito 5) dejó dicho que
esto era "una ampliación de alcance nueva", no algo que debiera resolver de más.

**Requisitos:**
1. Un profesor autenticado puede consultar, en un bloque o pantalla propia (dentro de «Mi horario»,
   T-22, o en pantalla aparte — decisión de la sesión que lo implemente, sin condicionar esta spec),
   el mismo cálculo de R-15 —sesiones con al menos una entrada registrada, horas reales acumuladas
   (`null`, nunca `0`, si ninguna tiene salida marcada), horas teóricas de sus slots vigentes, y sus
   sesiones de sustitución (R-06) separadas de las propias— acotado exclusivamente a sí mismo.
2. Sin selector de otro profesor, sin ranking, sin ningún dato de un compañero: es una vista de "lo
   mío", no una versión reducida del panel de R-15. Un profesor no ve las cifras de otro por esta vía,
   ni siquiera agregadas.
3. Mismo rango de fechas por defecto (mes en curso, elegible) y mismo criterio de exclusión que R-15:
   ninguna sesión anulada (`asistencia.estado = 'anulada'`) ni ninguna cancelación de slot (R-06)
   cuenta como hora impartida.
4. Exportable a CSV con el mismo formato de metadatos que R-15 (`documentoCsvConMetadatos`), para que
   el profesor pueda guardárselo o imprimirlo sin depender de que se lo envíe el administrador.
5. Reutiliza el dominio de R-15 (`informeHorasProfesor.ts`) tal cual — la pieza nueva es la
   restricción de alcance al propio profesor y el punto de montaje en la interfaz de `teacher` —, sin
   duplicar ningún cálculo.
6. Ningún dato ni tabla nuevos; ninguna comunicación externa; `administrator` sigue accediendo a R-15
   (todos los profesores) sin ningún cambio.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** un profesor con sesiones propias y una sustitución ese mes ve sus horas
propias y de sustitución separadas, coincidentes con lo que R-15 calcularía para él desde el panel de
`administrator`; no ve ningún control para elegir otro profesor ni ninguna cifra ajena; el CSV
exportado coincide con lo mostrado en pantalla; `administrator` sigue viendo el informe completo de
R-15 sin cambios.

---

### R-20 — Registro de auditoría de cambios para el administrador
**Oleada / Fase:** v6 / F-11 · **Migración:** No · **Depende de:** T-21, T-23
**Origen:** roadmap (autoseñalado por la propia norma permanente de §0.2 de `HOJA_DE_RUTA.md`:
`asistencia_historial` existe explícitamente para "responder quién cambió qué")

**Objetivo:** `asistencia_historial` guarda ya, desde T-07/T-18, quién corrigió cada registro de
asistencia y cuándo, cada vez que un profesor o `administrator` edita o anula una entrada (T-21). Hoy
esa respuesta solo se obtiene registro a registro, abriendo «Registros» de un slot y una fecha
concretos: no existe ninguna vista que responda, para todo el centro, "¿qué se ha corregido esta
semana, y quién lo corrigió?". Un centro con varios profesores no tiene forma de comprobar de un
vistazo que la disciplina de "quien se equivoca, lo arregla — y queda constancia" (principio 2) se
cumple, más allá de ir caso por caso — exactamente el argumento de fiabilidad legal que distingue este
producto de una hoja de cálculo, donde una celda editada no deja ningún rastro de quién ni cuándo.

**Requisitos:**
1. Pantalla propia para `administrator`, o bloque nuevo dentro del panel de centro (R-11) — decisión
   de la sesión que lo implemente, sin condicionar esta spec — que lista, en orden cronológico inverso
   (más reciente primero), cada modificación o anulación de un registro de asistencia de todo el
   centro: instante del cambio (`cambiado_en`), quién lo hizo (`cambiado_por`), alumno afectado y
   profesor titular del registro.
2. Cada fila enlaza al registro completo en «Registros» (T-21), donde ya vive la comparación detallada
   de valores previos y posteriores de ESE registro concreto (T-21, "dos modificaciones dejan dos filas
   de historial con los valores previos") — esta pantalla no duplica esa comparación, es su índice a
   nivel de centro: dónde mirar, no qué cambió exactamente en cada campo.
3. Filtro por rango de fechas (por defecto los últimos 7 días) y por autor del cambio (`cambiado_por`),
   para poder comprobar, por ejemplo, cuántas correcciones ha hecho un profesor concreto en un periodo.
4. Paginado o límite razonable de filas por página, mismo criterio de rendimiento que el resto de
   listados del centro (T-12, T-23): sin descargar el historial completo de golpe en un centro con
   volumen alto de correcciones.
5. Ningún dato ni tabla nuevos: se lee de `asistencia_historial`, ya poblada desde T-18/T-21 y con
   lectura ya reservada a `administrator` (`asistencia_historial_admin_leer`, `003_politicas_rls.sql`,
   T-10) — sin ninguna migración ni cambio de política.
6. Reservado a `administrator`, mismo alcance que R-11/R-15/R-16: ningún `teacher` ve por esta vía el
   historial de cambios de otro, ni siquiera el suyo propio — ya lo ve, registro a registro, dentro de
   sus propios «Registros» (T-21); esta pantalla es una vista de centro completo, no una ampliación de
   lo que un `teacher` puede ver.

**Bloqueo humano:** ninguno.

**Criterio de aceptación:** con un registro editado dos veces y otro anulado por un profesor distinto,
la pantalla muestra las tres modificaciones en orden cronológico inverso, cada una con quién y cuándo,
y un enlace que lleva al registro completo en «Registros»; filtrar por uno de los dos profesores
autores muestra solo sus cambios; un `teacher` no accede a esta pantalla.
