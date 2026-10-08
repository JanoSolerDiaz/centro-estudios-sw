# Componentes Gauss

Cada receta dice cuándo usar el componente, qué estructura y clases lleva (todas definidas en
`assets/estilos-base.css`) y qué hay que cuidar. Las clases van en español y en formato
`bloque`, `bloque__parte`, `bloque--variante`, igual que el resto de identificadores del proyecto.

## Contenido

1. Estructura de página: cabecera, navegación, título
2. Botones
3. Formularios
4. Chips e insignias
5. Tarjetas y bloques
6. Cifras (KPI)
7. Tablas (histórico, listados)
8. Avisos y estados (vacío, carga, error)
9. Pasar lista: rejilla y tarjeta de alumno
10. Combobox (buscador de alumno extra)
11. Confirmación de acciones destructivas
12. Pasos numerados y listas de preguntas

---

## 1. Estructura de página

```
body
└─ header.app-cabecera            ← barra blanca crema con borde inferior
   ├─ .app-cabecera__marca        ← logo (o «Gauss» en Outfit 800) + nombre de la app
   ├─ .app-cabecera__usuario      ← «Profesor Semilla · Profesor», texto atenuado
   └─ nav.app-nav                 ← botones de navegación en píldora
      └─ button.app-nav__boton    ← aria-current="page" en el activo
└─ main.pagina                    ← contenedor centrado, máx. 1100 px
   ├─ p.antetitulo                ← opcional: «Asistencia», azul, mayúsculas
   ├─ h1.pantalla-titulo
   └─ section.seccion …
```

- La pestaña activa se marca con `aria-current="page"` (no con una clase): así el estilo y la
  accesibilidad salen del mismo atributo. Activa = `--gauss-azul-suave` con texto
  `--gauss-azul-oscuro`; resto = texto `--gauss-texto`, fondo transparente.
- «Cerrar sesión» va al final de la navegación como `boton--texto`, separado del resto.
- En móvil la navegación hace `flex-wrap`; no se oculta tras un menú hamburguesa (son pocas
  entradas y el profesor tiene que ver «Pasar lista» siempre).
- El reloj y el estado de conexión de pasar lista van en una `.barra-estado` bajo el título, con
  un punto de color (`.punto--verde` conectado, `.punto--ambar` sin conexión) y texto.

## 2. Botones

| Clase | Aspecto | Cuándo |
|---|---|---|
| `boton boton--primario` | Amarillo, texto `--gauss-sobre-amarillo`, Outfit 700 | La acción que termina la tarea. **Una por vista** |
| `boton boton--secundario` | `--gauss-tinta` con texto blanco | Acciones importantes que no son la principal («Cómo llegar» en la web) |
| `boton boton--borde` | Blanco, borde `--gauss-borde-control` | Acciones normales («Actualizar», «Cancelar», «Exportar CSV») |
| `boton boton--texto` | Sin fondo, texto azul | Acciones menores, «Cerrar sesión», «Ver registros» |
| `boton boton--peligro` | Blanco, borde y texto `--gauss-rojo` | Anular, dar de baja (abre confirmación) |
| `boton boton--peligro-solido` | Fondo `--gauss-rojo`, texto blanco | Solo el «Confirmar anulación» final |
| `boton boton--exito` | Fondo `--gauss-verde-solido`, texto blanco | Confirmaciones positivas en bloque («Marcar el resto como presente») |
| `boton--bloque` | Ancho completo | Formularios estrechos y pie de tarjeta |
| `boton-icono` | Cuadrado de 44 px, icono centrado | Lápiz (editar), papelera (anular) en filas de tabla |

- Todos miden al menos 44 px de alto (y de ancho los de icono). `crearBoton` debe añadir la clase
  `boton` y dejar de poner `style.minHeight`: el mínimo pasa a la clase.
- Un `boton-icono` **siempre** lleva `aria-label` («Editar registro de Marta García») y `title`
  igual. El icono se dibuja con SVG (`createElementNS`), nunca con emoji ni `innerHTML`.
- Desactivado: `opacity: .5; cursor: not-allowed`, y el atributo `disabled` de verdad.
- Mientras envía: el texto cambia («Guardando…») y el botón queda `disabled`; no se añade spinner.

## 3. Formularios

```
form.formulario
├─ div.campo
│  ├─ label.campo__etiqueta[for]      ← mayúsculas pequeñas, atenuada
│  ├─ input | select | textarea        ← el estilo va por `.campo input` etc.
│  ├─ p.campo__ayuda                   ← opcional
│  └─ p.campo__error[role=alert]       ← solo con contenido cuando hay error
├─ div.fila-campos                     ← dos campos en una fila; uno por fila en móvil
└─ div.formulario__acciones            ← botones, primario el último
```

- Campos a 16 px, alto mínimo 44 px, radio 12 px, fondo `--gauss-campo`, borde 1,5 px
  `--gauss-borde-control`. Foco: borde azul, fondo blanco y anillo `:focus-visible`.
- Error: `aria-invalid="true"` en el campo → borde `--gauss-rojo` (lo pinta el propio CSS a partir
  del atributo que ya mantiene `crearMensajeErrorCampo`) y `.campo__error` en rojo.
- Selección múltiple entre pocas opciones (materias, días): chips con checkbox oculto
  (`label.chip` + `input[type=checkbox]` visualmente oculto con `.solo-lector`), como el
  formulario de la web; el estado activo sale de `:has(input:checked)`.
- `input[type=time]` y `[type=date]` llevan el mismo estilo que el resto; no se sustituyen por
  selectores propios.

## 4. Chips e insignias

- `span.chip`: píldora con borde, para filtros y opciones. Activo: `.chip--activo` o
  `:has(input:checked)` → borde azul, fondo `--gauss-azul-suave`, texto `--gauss-azul-oscuro`.
- `span.insignia` + variante para **estados**: `--presente`, `--ausente`, `--extra`, `--info`,
  `--neutra`, `--anulada`. Siempre con texto («Presente», «Extra», «Anulado»), nunca solo color.
- Sobre `--gauss-tinta`: `.chip--sobre-oscuro` (borde `rgba(255,255,255,.28)`, texto blanco).

## 5. Tarjetas y bloques

- `.tarjeta`: blanco, borde `--gauss-linea`, radio 20 px, interior fluido. Es el contenedor por
  defecto de cualquier bloque de contenido.
- `.tarjeta--elevada`: añade `--gauss-sombra-elevada`. Una por pantalla como mucho (login,
  formulario principal).
- `.tarjeta__cabecera` (título `h2`/`h3` + texto atenuado) y `.tarjeta__pie` (acciones).
- `.bloque-oscuro`: fondo `--gauss-tinta`, texto blanco, radio 24 px. Para lo más importante de
  la pantalla: la clase en curso en «Mi horario», el resumen del mes en el panel. Su texto
  secundario va en `--gauss-sobre-oscuro`; sus botones, `boton--primario` o `chip--sobre-oscuro`.
- `.tesela-icono`: cuadrado de 44 px, radio 14 px, fondo suave de color con una forma dentro
  (`.forma-punto`, `.forma-cuadrado`, `.forma-rombo`) — el sistema de iconos de la web. Sirve
  para encabezar tarjetas de panel sin usar imágenes.

## 6. Cifras (KPI)

```
div.cifras                 ← rejilla auto-fit minmax(150px, 1fr)
└─ div.cifra
   ├─ span.cifra__valor    ← «12», «94 %», «16:00–20:30» (Outfit 26/700, tabular-nums)
   └─ span.cifra__leyenda  ← «alumnos hoy» (13,5 px atenuado)
```

Para el panel del centro, «Mis horas» y el informe de horas. Sin iconos ni colores extra: la
cifra manda.

## 7. Tablas

```
div.tabla-contenedor              ← borde y radio; overflow-x: auto en móvil
└─ table.tabla
   ├─ caption.solo-lector         ← descripción para lector de pantalla
   ├─ thead th[scope=col]         ← etiqueta en mayúsculas pequeñas
   └─ tbody tr
      ├─ td … (td.tabla__num para números y horas: alineado a la derecha, tabular-nums)
      └─ td.tabla__acciones       ← boton-icono lápiz + boton-icono papelera
```

- `.tabla-contenedor` lleva `position: relative`: sin él, cualquier `.solo-lector` de la tabla
  (la cabecera «Acciones», el `caption`) se posiciona respecto a la página y la ensancha en
  móvil, con scroll horizontal en toda la pantalla.
- Filas separadas por `--gauss-linea-suave`; sin cebra. Hover de fila: `--gauss-superficie-suave`.
- Estados de fila: `tr.fila--anulada` (texto tachado y atenuado, se mantiene visible: un registro
  anulado no desaparece); el estado también va como `insignia` en su columna.
- Columnas vacías («Justificación», «Salida» sin dato): un guion largo «—» atenuado, no la celda
  en blanco.
- Paginación bajo la tabla en `.paginacion`: «Anterior» y «Siguiente» como `boton--borde`, y
  «Página 1 de 3» en medio.
- Filtros encima, en una `.barra-filtros` (flex-wrap) dentro de la misma tarjeta.

## 8. Avisos y estados

- `div.aviso` + `--error`, `--exito`, `--info`, `--atencion`: fondo suave, texto oscuro de su
  color, radio 14 px, borde izquierdo de 4 px del color sólido. Los de error van en una zona con
  `role="alert"` (`crearZonaMensaje`); los de confirmación, con `role="status"`.
- `.estado-vacio`: tarjeta con borde discontinuo, texto centrado atenuado y, si tiene sentido,
  una acción («No tienes ninguna clase más hoy.» + «Ver mi horario»).
- `.estado-cargando`: texto «Cargando…» atenuado; sin spinner animado (respeta
  `prefers-reduced-motion` por diseño).
- Los textos de error no cambian: siguen saliendo de `mensajeAmigable`. El estilo solo los viste.

## 9. Pasar lista

```
div.rejilla-alumnos                       ← auto-fill minmax(140px, 1fr), gap 8 px (6-7 columnas en escritorio)
└─ div.tarjeta-alumno-grupo [role=group]  ← EL MARCO: borde, fondo y color de estado van aquí
   ├─ button.tarjeta-alumno (+ variante)  ← zona de tocar: registra la asistencia con un toque
   │  ├─ span.avatar                      ← círculo de 56 px; dentro, iniciales O imagen
   │  │  ├─ span.avatar__iniciales
   │  │  └─ img.avatar__imagen            ← si hay foto: tapa las iniciales DENTRO del círculo
   │  ├─ span.insignia (Extra…)           ← opcional
   │  ├─ span.tarjeta-alumno__nombre
   │  └─ span.tarjeta-alumno__estado      ← «Registrado a las 17:42»
   ├─ div.tarjeta-alumno__acciones        ← fila de iconos, HERMANA de la zona de tocar
   │  └─ button.boton-icono--ausente | --salida | --editar | --anular   (44 × 44 px)
   └─ div.tarjeta-alumno__anular          ← solo con «Anular» abierto: motivo + confirmar + cancelar
```

- Variantes de la zona de tocar: `--pendiente`, `--presente`, `--ausente`, `--enviando` (opacidad
  .7), `--error`, `--sin-conexion`, `--extra`. **El color de estado lo pinta el marco**
  (`.tarjeta-alumno-grupo:has(.tarjeta-alumno--presente)`…): `--presente` fondo `--gauss-verde-fondo` y
  borde `--gauss-verde-solido`; `--ausente` fondo `--gauss-rojo-fondo` y borde `--gauss-rojo`;
  `--error` borde rojo discontinuo; `--extra` borde ámbar discontinuo; `--sin-conexion` fondo
  `--gauss-aviso-fondo`. La zona de tocar es transparente y sin borde. El estado se dice también en
  `tarjeta-alumno__estado`, nunca solo con el color.
- **El avatar**: `.avatar` es `position: relative` con `overflow: hidden` y tamaño fijo (56 px); la
  imagen va `position: absolute; inset: 0; object-fit: cover` **dentro** del círculo. Así la foto
  sustituye a las iniciales sin tapar el nombre (fallo visto en local el 2026-10-01, cuando la foto
  quedaba superpuesta a nombre e iniciales). Si la imagen falla al cargar, se quita y quedan
  las iniciales.
- Nombre en Outfit 600 a 15 px, dos líneas como mucho (`-webkit-line-clamp: 2`); estado a 12.5 px.
- **Iconos** (`.boton-icono`, R-40): cuadrados de 44 px (`--gauss-altura-tactil`), glifo de carácter
  en un `span aria-hidden` y el nombre en `aria-label` + `title` («Marcar salida a …», «Editar las
  horas de …», «Anular el registro de …», «Marcar ausente a …»). Reloj = salida, lápiz = editar
  horas, papelera = anular (texto en `--gauss-rojo-oscuro`), ✕ = ausente. Un icono solo se pinta si
  la acción es posible en ese estado; el deshabilitado se ve atenuado **y con borde discontinuo**,
  no solo por el color. Sin librería de iconos ni imágenes externas.
- Los iconos van **fuera** del `button` de la zona de tocar (un botón no puede contener otro).
- Contraste alto «a un brazo de distancia»: no bajes el tamaño del nombre ni uses texto atenuado
  sobre los fondos de estado.

## 10. Combobox

- `.combobox` envuelve el campo (receta de formulario) y `ul.combobox__lista` (`role=listbox`),
  que flota bajo el campo: blanco, radio 14 px, `--gauss-sombra-flotante`, máx. 320 px de alto con
  scroll.
- `li.combobox__opcion` (`role=option`): 44 px de alto mínimo, nombre en 15 px y centro en 13 px
  atenuado. La opción activa (`aria-selected="true"`) se pinta con `--gauss-azul-suave`; el estilo
  sale del atributo que ya mantiene `comboboxAlumnoExtra.ts`.
- La región `role=status` del combobox se ve como texto atenuado bajo el campo.

## 11. Confirmación de acciones destructivas

En línea, no en un modal: un `.confirmacion` (aviso rojo suave) que aparece en el sitio de la
acción con la pregunta, el dato afectado a la vista, el campo de motivo si la acción lo exige, y
dos botones: «Cancelar» (`boton--borde`) y «Confirmar anulación» (`boton--peligro-solido`). Es el
patrón que ya usan «Registros» y la ficha del alumno (requisito 8 de T-21). Si el producto decide
usar el diálogo nativo `confirm()` para alguna acción, ese diálogo no se estiliza; el motivo
obligatorio sigue necesitando un campo en la página.

## 12. Pasos y preguntas

- `.paso`: borde superior azul de 3 px, número «01» en Outfit 700 azul, título 18-20 px y texto
  secundario. Para asistentes de varios pasos («Primeros pasos», importación masiva).
- `.lista-preguntas > .pregunta`: separadas por `--gauss-linea`, título Outfit 600 18 px,
  respuesta en texto secundario. Para ayudas y explicaciones dentro de la aplicación.
