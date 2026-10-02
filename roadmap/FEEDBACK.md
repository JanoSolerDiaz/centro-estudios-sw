# FEEDBACK — GestorAcademia

> Bandeja de feedback / historias de usuario. Es **input prioritario del Product Manager**:
> las entradas en estado `nuevo` se evalúan en cada ciclo de producto.
>
> **Ciclo de vida de una entrada:** `nuevo` → `en_roadmap (#R-XX)` → `entregado` / `descartado`.
> El PM, al volcar una historia al roadmap, la marca `en_roadmap` con la R-XX vinculada; cuando
> esa R-XX se despliega, pasa a `entregado`. Sin estado de cierre, las entradas se reprocesan o
> se pierden.
>
> Cualquiera (dueño, profesores, responsable del centro) puede añadir entradas con estado `nuevo`.
> Lo más valioso aquí son las frases literales de un profesor después de una clase: qué le costó,
> qué no encontró, qué apuntó en un papel porque la aplicación no se lo dejaba hacer.
>
> No incluyas datos personales de alumnos en este documento: describe el caso, no la persona.

| Fecha | Origen | Historia de usuario / feedback | Estado | R-XX vinculada |
|-------|--------|--------------------------------|--------|----------------|
| 2026-10-01 | Dueño, prueba local (pantallazos de pasar lista y del histórico) | **Corregir un registro desde el propio Histórico.** Literal: «Si la pestaña de registros solo tiene sentido para cambiar, me parece un fallo de diseño. El propio histórico debería dejarte la opción de cambiar un registro, con el típico botón del lápiz, y también de anular algún registro, con un botón de basura, que cuando lo pulses tenga un mensaje de "¿estás seguro que quieres borrar?" (en un alert)». Contexto para el PM: (1) hoy el Histórico (T-23) es solo de consulta y exportación, y toda edición está en «Registros» (T-21), que exige elegir antes slot y fecha; (2) **un registro extra (origen `manual`, sin slot) no aparece en «Registros», así que hoy no se puede corregir en ninguna pantalla** — editar desde el Histórico, donde los extras sí aparecen, cierra también ese hueco; (3) «borrar» es **anular**: la fila nunca se elimina (DELETE revocado, rastro en `asistencia_historial`) y `actualizar_asistencia` exige un motivo, que un `confirm()` nativo no puede recoger — decidir cómo se pide el motivo junto a la confirmación; (4) la edición debe respetar los mismos límites que «Registros» (ventana de 7 días para `teacher`, sin límite para `administrator`, RLS por profesor); (5) el dueño cuestiona si «Registros» sigue teniendo sentido como pantalla aparte — decisión de producto abierta, no retirar nada sin preguntarle | nuevo | |
|       |        |                                | nuevo  |                |
