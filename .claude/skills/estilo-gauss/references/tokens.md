# Tokens de diseño Gauss

Sacados de la web pública gausscastellon.com (copia del 2026-10-02). Están declarados como
variables CSS en `assets/estilos-base.css`; en el código usa siempre `var(--gauss-…)`, nunca el hex.

## Contenido

1. Color: superficies y tinta
2. Color: acción y estados
3. Contraste (qué combinaciones se pueden usar para texto)
4. Tipografía
5. Espacios y anchura
6. Radios
7. Sombras y bordes
8. Foco

## 1. Color: superficies y tinta

| Variable | Hex | Función | En la web |
|---|---|---|---|
| `--gauss-fondo` | `#F5F2EA` | Fondo de página de la aplicación | Final del degradado de la cabecera |
| `--gauss-fondo-hundido` | `#EFEBE0` | Zonas hundidas (marco de imagen, placeholder) | Fondo de foto y mapa |
| `--gauss-superficie-suave` | `#FDFCF9` | Cabecera de aplicación, paneles grandes | Fondo de `<main>` |
| `--gauss-superficie` | `#FFFFFF` | Tarjetas, tablas, formularios | Tarjetas |
| `--gauss-campo` | `#FCFBF7` | Fondo de `input`/`select`/`textarea` | Campos del formulario |
| `--gauss-linea` | `#E7E2D6` | Borde de tarjeta y separadores de lista | Borde de tarjetas, FAQ |
| `--gauss-linea-suave` | `#EDE9DF` | Separadores finos, líneas de tabla | Bordes de cabecera |
| `--gauss-borde-control` | `#948D7E` | Borde de campos y botones con borde | — (la web usa `#E2DCCE`, ver §3) |
| `--gauss-tinta` | `#1A1814` | Texto principal; fondo de bloques oscuros | Texto, barra superior, pie |
| `--gauss-tinta-fuerte` | `#33302A` | Texto de cuerpo destacado | Viñetas |
| `--gauss-texto` | `#403C34` | Enlaces de navegación | Menú |
| `--gauss-texto-secundario` | `#5C574C` | Párrafos, descripciones | Texto de tarjetas |
| `--gauss-texto-atenuado` | `#6A6459` | Etiquetas, ayudas, metadatos, fechas | Subtítulos |
| `--gauss-sobre-oscuro` | `rgba(255,255,255,0.78)` | Texto secundario sobre `--gauss-tinta` | Igual |

## 2. Color: acción y estados

| Variable | Hex | Función |
|---|---|---|
| `--gauss-azul` | `#2F5BEA` | Color interactivo: enlaces, foco, botón activo, borde de chip activo, etiqueta de sección |
| `--gauss-azul-oscuro` | `#23408F` | Texto sobre `--gauss-azul-suave`; hover de azul |
| `--gauss-azul-suave` | `#EAEFFF` | Fondo de chip/pestaña activa, estado informativo |
| `--gauss-amarillo` | `#FFC24B` | Fondo del botón primario (la acción principal de la vista) |
| `--gauss-amarillo-hover` | `#FFB620` | Hover del primario |
| `--gauss-sobre-amarillo` | `#2A1E00` | Texto sobre amarillo |
| `--gauss-ambar` | `#E8A419` | Decoración (icono, punto) |
| `--gauss-aviso-fondo` | `#FFF3DA` | Fondo de aviso / estado «extra», «pendiente de revisar» |
| `--gauss-aviso-texto` | `#8A5A00` | Texto sobre `--gauss-aviso-fondo` |
| `--gauss-verde` | `#1BAA5F` | **Solo decoración** (punto, icono, borde ancho). No llega a AA con texto |
| `--gauss-verde-solido` | `#14874B` | Fondo sólido con texto blanco; borde de «presente» |
| `--gauss-verde-fondo` | `#E4F6EA` | Fondo de estado correcto / «presente» |
| `--gauss-verde-texto` | `#0F6B3B` | Texto sobre `--gauss-verde-fondo` |
| `--gauss-rojo` | `#C0392B` | Error, acción destructiva (texto o fondo con blanco) |
| `--gauss-rojo-oscuro` | `#9B2C20` | Texto sobre `--gauss-rojo-fondo` |
| `--gauss-rojo-fondo` | `#FBEAE7` | Fondo de error / «ausente» |

`--gauss-rojo-fondo`, `--gauss-rojo-oscuro`, `--gauss-verde-solido`, `--gauss-verde-texto`,
`--gauss-aviso-texto` y `--gauss-borde-control` no están en la web: son variantes de su paleta para
que la herramienta cumpla AA. Mantienen el tono; no los sustituyas por los originales.

Correspondencia con los estados de asistencia (para que se reconozcan en todas las pantallas):
presente → verde · ausente → rojo · extra / retroactivo / pendiente de sincronizar → ámbar ·
anulado → tachado en `--gauss-texto-atenuado` · seleccionado/activo → azul.

## 3. Contraste

Ratios calculados (WCAG 2.1). AA exige 4,5 para texto normal, 3 para texto grande (≥ 24 px, o
≥ 18,66 px en negrita) y 3 para bordes de controles.

| Texto | Fondo | Ratio | Uso |
|---|---|---|---|
| `--gauss-tinta` | `--gauss-superficie-suave` | 17,3 | Texto principal |
| `--gauss-texto-secundario` | blanco | 7,2 | Párrafos |
| `--gauss-texto-atenuado` | blanco / campo / fondo | 5,9 / 5,7 / 5,2 | Etiquetas y ayudas |
| `--gauss-azul` | blanco | 5,5 | Enlaces, texto azul |
| blanco | `--gauss-azul` | 5,5 | Botón azul |
| `--gauss-azul-oscuro` | `--gauss-azul-suave` | 8,3 | Chip activo, info |
| `--gauss-sobre-amarillo` | `--gauss-amarillo` | 10,2 | Botón primario |
| blanco | `--gauss-tinta` | 17,7 | Bloques oscuros |
| blanco | `--gauss-verde-solido` | 4,6 | Botón/insignia verde |
| `--gauss-verde-texto` | `--gauss-verde-fondo` | 5,9 | Estado presente |
| `--gauss-rojo` | blanco | 5,4 | Error, destructivo |
| `--gauss-rojo-oscuro` | `--gauss-rojo-fondo` | 6,5 | Estado ausente |
| `--gauss-aviso-texto` | `--gauss-aviso-fondo` | 5,4 | Aviso, extra |
| `--gauss-borde-control` | `--gauss-campo` | 3,2 | Borde de campo (3:1) |

**No usar para texto:** `#8B8577` y `#9A9488` de la web (3,7 y 3,0: las etiquetas en mayúsculas de
12,5 px de la portada no llegan a AA; aquí van en `--gauss-texto-atenuado`); blanco sobre
`--gauss-verde` (3,0); `--gauss-azul` sobre `--gauss-tinta` (3,2: en bloques oscuros, solo para
titulares de ≥ 24 px; el antetítulo de un bloque oscuro va en `--gauss-amarillo`, 11,0); `--gauss-azul` sobre `#E9E7E1` (4,5 justo).
**No usar como único borde de un control:** `--gauss-linea` (1,3 contra el campo; la web lo usa en
sus inputs, pero un campo debe distinguirse de su fondo).

## 4. Tipografía

- Titulares, cifras, botones y navegación: `--gauss-fuente-titulos` = `'Outfit', system-ui, sans-serif`
  (pesos 600, 700, 800).
- Texto, campos, tablas: `--gauss-fuente-texto` = `'Karla', system-ui, sans-serif` (400, 500, 700).
- Cifras en tablas y horas: `font-variant-numeric: tabular-nums`.

Escala para la **aplicación** (más contenida que la portada):

| Uso | Tamaño | Peso | Otros |
|---|---|---|---|
| Título de pantalla (`h1`) | `clamp(26px, 3.4vw, 34px)` | 700 Outfit | `letter-spacing: -0.02em; line-height: 1.1` |
| Sección (`h2`) | `clamp(21px, 2.6vw, 25px)` | 700 Outfit | `-0.01em` |
| Subsección / título de tarjeta (`h3`) | 18-20 px | 600-700 Outfit | |
| Cifra destacada (KPI) | 26 px | 700 Outfit | Con su leyenda debajo a 13,5 px atenuada |
| Texto | 15-16 px | 400 Karla | `line-height: 1.6` |
| Texto secundario | 14-14,5 px | 400 Karla | `--gauss-texto-secundario` |
| Campo de formulario | 16 px | 400 Karla | Mínimo 16 px por iOS |
| Etiqueta de campo | 12,5 px | 700 Karla | `text-transform: uppercase; letter-spacing: 0.06em` |
| Antetítulo de sección | 12,5 px | 700 Karla | Mayúsculas, `letter-spacing: 0.16em`, `--gauss-azul` |
| Chip, insignia | 13-13,5 px | 600-700 Karla | |
| Botón | 15-16,5 px | 600-700 Outfit | |

## 5. Espacios y anchura

- Escala de separación (`gap`, márgenes): 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40 px
  (`--gauss-esp-1` … `--gauss-esp-10`).
- Margen lateral de página: `clamp(16px, 4vw, 40px)` (`--gauss-margen-pagina`).
- Separación vertical entre secciones: `clamp(24px, 4vw, 44px)`.
- Anchura máxima del contenido: 1100 px, centrado; formularios sueltos: 560 px.
- Interior de tarjeta: `clamp(16px, 2.6vw, 28px)`; de panel grande: `clamp(20px, 3vw, 30px)`.
- Rejillas de tarjetas: `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` (pasar
  lista usa `minmax(150px, 1fr)` para que quepan dos por fila en un móvil).

## 6. Radios

| Variable | Valor | Uso |
|---|---|---|
| `--gauss-radio-pildora` | 999px | Chips, insignias, navegación, avatar, puntos |
| `--gauss-radio-panel` | 24px | Bloque oscuro, panel principal, CTA grande |
| `--gauss-radio-tarjeta` | 20px | Tarjetas, tablas |
| `--gauss-radio-boton` | 14px | Botones de bloque e iconos en tesela |
| `--gauss-radio-campo` | 12px | Campos, botones pequeños |

## 7. Sombras y bordes

- `--gauss-sombra-elevada`: `0 16px 40px rgba(26,24,20,0.10)` — solo el panel principal de una
  pantalla (formulario de acceso, modal).
- `--gauss-sombra-flotante`: `0 6px 18px rgba(26,24,20,0.16)` — elementos que flotan sobre otros
  (lista del combobox, aviso de nueva versión, menú desplegable).
- Tarjetas normales: sin sombra, `1px solid var(--gauss-linea)`.
- Campos: `1.5px solid var(--gauss-borde-control)`.
- Paso numerado / acento: `border-top: 3px solid var(--gauss-azul)`.

## 8. Foco

La web solo cambia el borde del campo al enfocarlo; eso no basta con teclado. En la aplicación:

```css
:focus-visible { outline: 3px solid var(--gauss-azul); outline-offset: 2px; }
```

y además, en campos, `border-color: var(--gauss-azul); background: var(--gauss-superficie)` como en la web.
Sobre `--gauss-tinta`, el anillo de foco es blanco.
