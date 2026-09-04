# Política de privacidad — BORRADOR (T-25, requisito 4)

> **Esto NO es un texto legal definitivo.** Ver la advertencia completa en
> [`AVISO_LEGAL.md`](./AVISO_LEGAL.md): es un borrador para que el dueño lo revise y apruebe.
> El contenido factual (qué datos, para qué, cuánto tiempo) refleja fielmente lo que el código
> hace hoy — verificado contra `db/MODELO.md`, `PROYECTO.md` §"Dominio y cumplimiento" y
> `roadmap/PRODUCCION_T25.md` §3 (inventario RGPD) —, pero la redacción legal (base jurídica
> exacta, plazos de conservación definitivos, cesionarios) la debe fijar el dueño.

## 1. Responsable del tratamiento

`<pendiente — mismos datos que el Aviso Legal §1>`.

## 2. Qué datos se tratan

**Del alumno** (menor de edad en la mayoría de los casos):
- Nombre, primer y segundo apellido (el segundo, opcional).
- Centro de estudios de referencia (el colegio o instituto reglado al que asiste).
- Teléfono y email propios (opcionales).
- Una fotografía (opcional).
- Registro de asistencia: fecha, hora real de llegada, profesor que la tomó, y su historial de
  modificaciones (quién cambió qué y cuándo).

**De sus personas de referencia** (padre, madre o tutor legal):
- Nombre, primer y segundo apellido (el segundo, opcional).
- Teléfono (obligatorio).
- Email (opcional).

**Del personal del centro** (profesorado y administración): nombre y rol de usuario de la
aplicación, y el registro de qué acción de asistencia realizó cada uno y cuándo.

No se trata ningún otro dato. En particular, **no se guardan** notas ni calificaciones
académicas, datos de salud, datos bancarios, ni ninguna categoría especial del artículo 9 del
RGPD. Añadir cualquiera de estos exige una decisión expresa del dueño (regla permanente,
`HOJA_DE_RUTA.md` §0.2).

## 3. Finalidad y base jurídica

| Finalidad | Base jurídica (a confirmar por el dueño) |
|---|---|
| Registrar la asistencia real del alumno a sus clases, con valor administrativo y probatorio ante la familia | `<pendiente — probablemente interés legítimo / ejecución de un contrato de servicios educativos con la familia>` |
| Contactar con la persona de referencia del alumno si es necesario | `<pendiente — interés legítimo>` |
| Mostrar la fotografía del alumno al profesorado para identificarlo al pasar lista | **Consentimiento específico** del tutor legal (ver [Consentimiento de imagen del menor](./CONSENTIMIENTO_IMAGEN_MENOR.md)) — distinto del resto de finalidades |
| Gestión de cuentas de usuario del personal del centro | `<pendiente — interés legítimo / relación laboral>` |

## 4. Quién accede a qué

Coincide exactamente con los roles de la aplicación (matriz completa y verificada en
`roadmap/PRODUCCION_T25.md` §2):

- **Administración del centro:** acceso completo a fichas de alumno, sus personas de referencia,
  su fotografía y todo el registro de asistencia.
- **Profesorado:** ve el nombre, apellidos y fotografía de sus propios alumnos (nunca su
  teléfono, email, ni las personas de referencia), y solo sus propios registros de asistencia.
- **Ningún otro perfil de usuario tiene acceso a estos datos hoy** (el rol "Alumno" existe en el
  sistema pero no tiene ninguna función activa en esta fase).
- El proveedor de infraestructura (Supabase, alojado en la Unión Europea — `<pendiente: confirmar
  región del proyecto de producción>`) actúa como encargado del tratamiento.

## 5. Conservación

`<pendiente — el dueño debe fijar el plazo>`. Propuesta de partida, a confirmar o corregir:
mientras el alumno esté activo en el centro, y durante `<N años, p. ej. los de prescripción de
responsabilidad civil/administrativa que aplique>` tras su baja, para poder justificar la
asistencia histórica ante la familia. Transcurrido ese plazo, procede la anonimización descrita
en §6, no el borrado del registro de asistencia (que perdería su valor administrativo si se
destruyera sin más).

## 6. Derechos de la persona interesada

Acceso, rectificación, oposición, limitación y **supresión**. La supresión de un alumno se
atiende por **anonimización** (procedimiento completo en `roadmap/PRODUCCION_T25.md` §3): se
elimina su fotografía y sus personas de referencia (borrado real), y sus datos identificativos se
sustituyen por un marcador de anonimización, conservando el registro de asistencia con valor
administrativo. Para ejercer cualquier derecho: `<pendiente — canal de contacto>`.

## 7. Seguridad

Descrita con detalle técnico en `roadmap/PRODUCCION_T25.md` (cabeceras, superficie de ataque,
cifrado en tránsito, control de acceso por rol). Resumen para la persona interesada: los datos
viajan siempre cifrados, cada perfil de usuario solo ve lo que su rol necesita, la fotografía es
privada y nunca tiene una dirección pública, y toda modificación del registro de asistencia deja
constancia de quién y cuándo.

---

**Pendiente para dar este documento por definitivo:** ver checklist de `AVISO_LEGAL.md`, más
fijar la base jurídica exacta de §3 y el plazo de conservación de §5.

Borrador generado: 2026-09-04 (sesión de T-25).
