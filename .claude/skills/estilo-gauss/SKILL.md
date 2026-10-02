---
name: estilo-gauss
description: Guía de estilo visual de GestorAcademia, sacada de la web de Gauss Centro de Estudios (gausscastellon.com) — paleta, tipografía Outfit + Karla, radios, sombras y recetas de componentes (botones, campos, tarjetas de pasar lista, tablas, navegación, avisos) adaptadas a una herramienta de trabajo accesible y a las restricciones del proyecto (sin CDN, CSP sin unsafe-inline, sin bundler). Úsala SIEMPRE que vayas a dar estilo, maquetar, retocar el aspecto o crear cualquier pantalla o componente de `src/ui/` en este repositorio, aunque nadie diga "estilo" o "Gauss": "que se vea mejor", "arregla cómo se ve la tarjeta", "pon bonito el histórico", "la foto tapa el nombre", "colores", "CSS", "diseño", "maquetación", "botón", "tabla", "pantalla nueva". También antes de añadir cualquier `element.style.*` o color a mano en el código de interfaz.
---

# Estilo Gauss para GestorAcademia

GestorAcademia es la herramienta interna de Gauss Centro de Estudios (Castellón). Su aspecto debe
reconocerse como de la misma casa que la web pública **gausscastellon.com**: fondo crema cálido,
tinta casi negra, azul Gauss como color de acción y foco, amarillo para la acción principal,
titulares en **Outfit** y texto en **Karla**, esquinas muy redondeadas y mucho aire.

Pero no es una landing: es una herramienta que un profesor usa de pie, con el móvil, en segundos,
y que un administrador usa con tablas largas. Por eso esta guía **adapta** la web, no la copia:
mismos colores, tipografías y forma, con tamaños más contenidos, densidad de herramienta y un
contraste que la web no siempre cumple (ver «Contraste» en `references/tokens.md`).

## Antes de empezar

1. Lee `references/tokens.md` (colores y su función, tipografía, espacios, radios, sombras).
2. Lee de `references/componentes.md` solo los componentes que vayas a tocar.
3. Comprueba si existe ya `estilos.css` en la raíz. Si no existe, créalo copiando
   `assets/estilos-base.css` de esta skill, y haz los tres pasos de «Montaje» de abajo.
   Si ya existe, **es la fuente de verdad**: amplíalo, no lo dupliques ni lo sustituyas.

## Reglas del proyecto que el estilo no puede saltarse

Vienen de `roadmap/HOJA_DE_RUTA.md` y del stack fijado; romperlas rompe la seguridad o el
funcionamiento sin red, no solo la estética.

- **Una sola hoja de estilos externa, `estilos.css`, servida desde el mismo origen.** T-25 exige
  una CSP estricta sin `unsafe-inline`: con ella, un `<style>` en `index.html` o un atributo
  `style="…"` en HTML dejan de aplicarse en producción. Nada de bloques `<style>` ni de estilos en
  atributos de HTML.
- **Clases, no `element.style`.** Asignar `elemento.style.x` desde TypeScript sí lo permite la
  CSP, pero reparte el diseño por cientos de líneas (hoy hay más de cien en `src/ui/`) y hace
  imposible cambiar la marca en un sitio. Usa clases (`crearElemento(doc, 'div', { atributos: {
  class: 'tarjeta' } })`). Reserva `style` solo para un valor que de verdad se calcula en tiempo
  de ejecución, y mejor como variable CSS: `el.style.setProperty('--progreso', '40%')`.
  Al tocar una pantalla, migra a clases los `style.*` que encuentres en ella.
- **Sin CDN ni Google Fonts.** La CSP solo permite `self` y Supabase, y cargar fuentes de Google
  manda a un tercero la IP de cada profesor y familia (RGPD). Outfit y Karla tienen licencia SIL
  OFL: se descargan una vez en `.woff2`, se guardan en `fuentes/` con su `OFL.txt` y se declaran
  con `@font-face` en `estilos.css`. Si los ficheros aún no están, la pila de reserva
  (`system-ui`) mantiene la aplicación usable; no la bloquees por eso.
- **Funciona sin red (R-09).** `estilos.css` y los `.woff2` van en `CASCARON` de `sw.js`. Al
  cambiar el CSS de forma visible, sube la versión de `NOMBRE_CACHE` para que no se quede la
  vieja.
- **Accesibilidad (§0.2):** objetivos táctiles de al menos 44 px (`ALTURA_TACTIL_MINIMA`), campos a
  16 px para que iOS no haga zoom (`TAMANO_FUENTE_SIN_ZOOM_IOS`), foco visible con teclado,
  contraste AA, nada que dependa solo del color (un estado siempre lleva también texto o icono).
- **Sin `innerHTML`** (prohibido por lint). Los iconos simples se hacen con CSS (puntos, rombos,
  cuadrados redondeados, como en la web) o con SVG creado por `createElementNS`.

## Montaje (una sola vez)

1. `index.html`: `<link rel="stylesheet" href="./estilos.css">` en el `<head>`, antes de los scripts.
2. `sw.js`: añadir `'./estilos.css'` y cada `./fuentes/*.woff2` a `CASCARON`.
3. `eslint` no revisa CSS; no hace falta tocar `eslint.config.js`.

## Cómo dar estilo a una pantalla

1. **Identifica qué es cada bloque**: cabecera de aplicación, título de pantalla, formulario,
   tarjeta, tabla, aviso, estado vacío/carga/error. Cada uno tiene su receta en
   `references/componentes.md`; no inventes una variante si ya hay receta.
2. **Pon las clases** en el código de la pantalla (o, mejor, en el helper que la crea:
   `crearBoton`, `crearCampoTexto`, `crearZonaMensaje` en `src/ui/formularios.ts`), y quita los
   `style.*` equivalentes.
3. **Si falta algo en `estilos.css`, añádelo usando solo variables** (`var(--gauss-…)`). Un hex
   suelto en una regla nueva es casi siempre un error: o encaja en un token existente o hace falta
   un token nuevo en `references/tokens.md` con su función.
4. **Jerarquía de acciones**: como mucho **un** botón primario amarillo por vista (la acción que
   cierra la tarea: «Guardar», «Registrar»). El resto, secundario (oscuro o con borde) o de texto
   (enlace azul). Destructivo (anular, dar de baja) en rojo y siempre con confirmación.
5. **Comprueba** antes de dar la pantalla por terminada:
   - a 360 px de ancho, sin scroll horizontal (las tablas anchas van dentro de `.tabla-contenedor`);
   - recorriéndola solo con teclado: el foco se ve en todo momento;
   - cada estado (vacío, cargando, error, éxito) tiene su aspecto y su texto;
   - los colores de texto salen de la tabla de contraste de `references/tokens.md`;
   - los tests de jsdom siguen en verde. Si alguno comprobaba un `style.*` que has quitado,
     cámbialo para comprobar la clase o el comportamiento, nunca borres la comprobación sin más
     (sobre todo las de 44 px: pasan a comprobarse en la clase).

## Lo que da carácter Gauss (y lo que no)

Sí: crema cálido de fondo con tarjetas blancas y borde fino; titulares Outfit con interletrado
ligeramente negativo; etiquetas pequeñas en mayúsculas espaciadas; píldoras (radio 999 px) para
chips, estados y la navegación; puntos de color como viñetas; un bloque oscuro (`--gauss-tinta`)
para destacar lo más importante de una pantalla; azul para todo lo interactivo.

No: grises fríos o azules corporativos genéricos; sombras grandes en todo (la web solo eleva el
formulario principal y las fichas flotantes); degradados salvo el suave crema de la cabecera;
emojis como iconos; el verde WhatsApp como fondo de texto blanco (no llega a AA: usa
`--gauss-verde-solido`); los tamaños de titular de la portada (56 px) dentro de la aplicación.

## Marca

- Nombre: «Gauss Centro de Estudios»; la aplicación se llama «GestorAcademia».
- Logo: `marca/gauss-logo.png` (fondo claro) y `marca/gauss-logo-blanco.png` (sobre `--gauss-tinta`),
  42-52 px de alto. Si todavía no están en el repositorio, usa el nombre en Outfit 800 como
  logotipo de texto y pide los ficheros al dueño; no los dibujes ni los descargues de la web.
