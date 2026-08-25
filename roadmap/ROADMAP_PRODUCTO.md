# ROADMAP DE PRODUCTO — GestorAcademia — Documento vivo

> Roadmap de producto VIVO, gestionado por el agente Product Manager. Aquí se especifican las
> mejoras (tareas R-XX), agrupadas en oleadas y fases. Es la **spec de las R-XX** (las T-XX
> tienen su spec en `HOJA_DE_RUTA.md`).
>
> Reglas: este documento **especifica**, no lleva estado — el estado de cada R-XX vive en §1 de
> `SEGUIMIENTO.md` (no duplicar). Las oleadas 100% desplegadas se mueven a
> `ROADMAP_HISTORICO.md` para mantener vivo solo lo pendiente/en curso.

**Última actualización:** 2026-08-25

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

### Oleada v1 — <título>
*(pendiente de definir por el PM)*

> Nota para el primer ciclo del PM: el MVP completo está especificado como T-00 a T-25 en
> `HOJA_DE_RUTA.md`. No lo repliques aquí como R-XX. Tu primera oleada empieza **donde acaba el
> MVP**: lo que el producto necesita después de que pasar lista funcione. Puntos de partida
> naturales, a validar contra el feedback real: ausencias y justificaciones (hoy solo se registran
> entradas), registro de salida y cómputo de horas, aviso al tutor, informe mensual por alumno,
> sustituciones entre profesores, el uso en aula sin cobertura, y —solo si el dueño lo decide— qué
> puede llegar a ver un `student`.

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
