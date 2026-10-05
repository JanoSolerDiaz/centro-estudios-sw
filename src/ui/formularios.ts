/**
 * Helpers de construcción de formularios accesibles en DOM nativo (T-09), reutilizados por las
 * pantallas de autenticación (login, recuperación, nueva contraseña) y, desde T-11, por las
 * pantallas de gestión (`tipo: 'text'` en `crearCampoTexto`, para nombres y búsquedas): campo de
 * texto con `label` asociado por `for`/`id`, zona de mensaje anunciable por lectores de pantalla
 * (`role="alert"` o `role="status"`, con foco programático para que el usuario de teclado sepa
 * dónde mirar), botón, y (desde T-16) mensaje de error de un campo concreto.
 * Objetivos táctiles ≥ 44 px (§0.2, "se pasa lista desde un móvil o tablet, de pie") fijados aquí en
 * un solo sitio en vez de repetidos en cada pantalla.
 *
 * Ninguna función toca el `document` global: reciben el `Document` como parámetro (normalmente
 * `contenedor.ownerDocument`, resuelto por quien llama), mismo principio de inyección que
 * `Reloj`/`Temporizador`/`instalarCapturaErrores` — así una pantalla se testea montando un
 * contenedor con `jsdom` sin depender de ningún global de Node.
 */

/* R-37: el aspecto vive en `estilos.css` (clases `campo`, `boton`, `aviso`…), no en `element.style`.
 * Los mínimos de accesibilidad que antes se fijaban aquí —objetivo táctil de 44 px
 * (`--gauss-altura-tactil`) y campos a 16 px para que iOS no haga zoom— están ahora en esas clases;
 * los tests de `formularios.test.ts` comprueban que cada helper emite la clase que los lleva. */

export interface CampoTexto {
  readonly contenedor: HTMLDivElement;
  readonly input: HTMLInputElement;
}

export function crearCampoTexto(
  documento: Document,
  id: string,
  etiquetaTexto: string,
  tipo: 'email' | 'password' | 'text',
  autocomplete: AutoFill,
): CampoTexto {
  const contenedor = documento.createElement('div');
  contenedor.className = 'campo';

  const etiqueta = documento.createElement('label');
  etiqueta.className = 'campo__etiqueta';
  etiqueta.setAttribute('for', id);
  etiqueta.textContent = etiquetaTexto;

  const input = documento.createElement('input');
  input.id = id;
  input.type = tipo;
  input.required = true;
  input.autocomplete = autocomplete;

  contenedor.append(etiqueta, input);
  return { contenedor, input };
}

/** `role="alert"` para errores (interrumpe al lector de pantalla); `role="status"` para
 * confirmaciones (avisa sin interrumpir). `tabIndex = -1` la hace enfocable por programa aunque no
 * forme parte del orden de tabulación normal, para poder llevar el foco ahí tras un envío. */
export function crearZonaMensaje(documento: Document, rol: 'alert' | 'status'): HTMLParagraphElement {
  const zona = documento.createElement('p');
  zona.className = rol === 'alert' ? 'aviso aviso--error' : 'aviso';
  zona.setAttribute('role', rol);
  zona.tabIndex = -1;
  return zona;
}

/** Un botón `submit` es la acción que cierra el formulario (primario, amarillo); uno `button` es una
 * acción normal (con borde). Quien necesite otra jerarquía (peligro, texto…) sustituye `className`. */
export function crearBoton(documento: Document, texto: string, tipo: 'submit' | 'button' = 'submit'): HTMLButtonElement {
  const boton = documento.createElement('button');
  boton.className = tipo === 'submit' ? 'boton boton--primario' : 'boton boton--borde';
  boton.type = tipo;
  boton.textContent = texto;
  return boton;
}

/** Mensaje de error de UN campo concreto (T-16, requisito 1: "componentes propios de formulario con
 * validación y mensajes de error accesibles") — distinto de `crearZonaMensaje`, que es un único
 * mensaje para todo el formulario o pantalla. Enlaza el párrafo de error al campo por
 * `aria-describedby` y mantiene `aria-invalid` sincronizado, para que un lector de pantalla anuncie
 * el error al llegar al campo, no solo en el momento en que aparece. */
export interface MensajeErrorCampo {
  readonly elemento: HTMLParagraphElement;
  establecer(mensaje: string): void;
  limpiar(): void;
}

export function crearMensajeErrorCampo(
  documento: Document,
  campo: HTMLInputElement | HTMLSelectElement,
  idError: string,
): MensajeErrorCampo {
  const elemento = documento.createElement('p');
  elemento.id = idError;
  elemento.className = 'campo__error';
  elemento.setAttribute('role', 'alert');
  campo.setAttribute('aria-describedby', idError);
  campo.setAttribute('aria-invalid', 'false');

  return {
    elemento,
    establecer(mensaje) {
      elemento.textContent = mensaje;
      campo.setAttribute('aria-invalid', 'true');
    },
    limpiar() {
      elemento.textContent = '';
      campo.setAttribute('aria-invalid', 'false');
    },
  };
}

/** Envuelve una pantalla de entrada (login, recuperar y establecer contraseña, sin acceso) en el
 * panel centrado de Gauss: logo, y el contenido en una tarjeta elevada. Devuelve el panel, donde
 * quien llama añade título, formulario y avisos. */
export function montarPanelEntrada(contenedor: HTMLElement): HTMLElement {
  const documento = contenedor.ownerDocument;
  const marco = documento.createElement('div');
  marco.className = 'entrada';
  const panel = documento.createElement('div');
  panel.className = 'entrada__panel tarjeta tarjeta--elevada';
  const logo = documento.createElement('img');
  logo.className = 'entrada__marca';
  logo.src = './marca/gauss-logo.png';
  logo.alt = 'Gauss Centro de Estudios';
  panel.append(logo);
  marco.append(panel);
  contenedor.append(marco);
  return panel;
}
