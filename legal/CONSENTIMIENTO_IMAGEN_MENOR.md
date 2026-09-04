# Consentimiento específico de uso de la imagen del menor — BORRADOR (T-25, requisito 4)

> **Esto NO es un texto legal definitivo.** Ver la advertencia completa en
> [`AVISO_LEGAL.md`](./AVISO_LEGAL.md). Este documento sustituye, en cuanto el dueño lo apruebe,
> al aviso provisional que hoy muestra la propia interfaz junto al control de subida de foto
> (`src/ui/pantallaFichaAlumno.ts`, bloque de avatar, T-14 requisito 8): *"Aviso provisional (T-25
> sustituirá este texto por el definitivo del centro): subir la fotografía de un alumno menor de
> edad requiere el consentimiento informado de su tutor legal para el uso de su imagen, distinto
> del consentimiento general de tratamiento de datos. Obtener ese consentimiento es
> responsabilidad del centro, no de esta aplicación."* Ese aviso desaparecerá del código solo
> cuando el dueño confirme el texto definitivo — el agente no lo retira por su cuenta.

## Por qué es un documento aparte

El consentimiento de tratamiento general (contacto, asistencia) no cubre por sí solo el uso de
la imagen de un menor: el RGPD y la normativa de protección del menor tratan la imagen como un
consentimiento **específico**, revocable de forma independiente del resto. Por eso la fotografía
del alumno es, en todo el sistema, el único dato opcional y borrable en cualquier momento sin
afectar al resto de la ficha (`roadmap/PRODUCCION_T25.md` §3).

## Texto para la familia

`<Nombre del centro>` desea poder subir una fotografía de `<nombre del alumno>` a GestorAcademia,
con la única finalidad de que el profesorado pueda identificarlo con rapidez al pasar lista.

- La fotografía es **opcional**: el centro funciona igual sin ella.
- Se almacena en un espacio **privado**, nunca en una dirección pública ni indexable.
- Solo la ve el administrador del centro y los profesores de las clases activas del alumno —
  nunca queda visible en listados generales.
- Antes de subirla, el propio dispositivo elimina los metadatos de la foto (incluida la
  ubicación donde se tomó).
- La familia puede pedir su eliminación en cualquier momento, y el centro puede quitarla desde la
  ficha del alumno de forma inmediata.

☐ **Autorizo** el uso de la fotografía de mi hijo/a o tutelado/a para esta finalidad.
☐ **No autorizo** el uso de su fotografía. `<el alumno seguirá gestionándose con normalidad, sin
foto — no es una condición para recibir el servicio>`.

Nombre y firma del padre/madre/tutor legal: `______________________`
Fecha: `______________________`

---

**Pendiente para dar este documento por definitivo:** revisión por el dueño del texto exacto y de
si se recoge en papel o dentro de la propia aplicación en una futura iteración (no en el MVP).
Al aprobarlo, actualizar también el aviso provisional citado arriba en
`src/ui/pantallaFichaAlumno.ts` para que enlace o resuma este texto en vez del genérico actual, y
retirar la mención a "aviso provisional" de su código y de su test.

Borrador generado: 2026-09-04 (sesión de T-25).
