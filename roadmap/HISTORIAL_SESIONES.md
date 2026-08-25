# HISTORIAL DE SESIONES — GestorAcademia

> Bitácora **append-only** de sesiones (antiguo §8 de SEGUIMIENTO). La más reciente arriba.
> Cada entrada referencia las filas de decisión añadidas en `DECISIONES_TECNICAS.md` y los
> cambios de estado en §1 de `SEGUIMIENTO.md` (consistencia cruzada).
>
> **Rotación:** mantener en línea las ~15 sesiones más recientes; archivar el resto por mes en
> `roadmap/HISTORIAL_SESIONES/AAAA-MM.md` y dejar aquí, al inicio, un índice de los meses archivados.

## Meses archivados
*(ninguno todavía)*

---

## Plantilla por sesión (copiar y rellenar, la más reciente arriba)

```
### Sesión YYYY-MM-DD HH:MM
**Tarea(s):** T-XX / R-XX / P-XX
**Estado resultante:** EN CURSO / COMPLETADA / DESPLEGADA EN PRODUCCIÓN / BLOQUEADA
**Commits a main:** <hashes y mensajes>
**Migraciones aplicadas:** <fichero db/NNN_*.sql, entorno (dev/prod), versión devuelta por esquema_version(), o "ninguna">
**Propagación a prod pendiente:** <fila abierta en §3, o "ninguna">
**Archivos creados/modificados:** <lista>
**Verificaciones pre-push:** tipos ✅/❌ · lint ✅/❌ · tests ✅/❌ · build ✅/❌
**Health check post-deploy:** ✅/❌ (npm run health: entrada y JS a 200 + esquema_version() correcta)
**Decisiones tomadas:** <referencia a las filas añadidas en DECISIONES_TECNICAS.md>
**Hallazgos del auditor atendidos:** <#N resueltos, o "ninguno">
**Hallazgos:** <bugs, deuda técnica o riesgos descubiertos>
**Tareas autopropuestas (P-XX):** <registradas/ejecutadas, con referencia a §5, o "ninguna">
**Próximo paso:** <qué debe hacer la siguiente sesión — incluye reverts pendientes>
```

---

*(Las sesiones reales se añaden debajo, la más reciente primero.)*
