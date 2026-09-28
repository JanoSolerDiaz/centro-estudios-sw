/**
 * Combobox accesible sobre el catálogo de asignaturas/grupos (R-33, requisito 3): "mismo componente
 * y mismo patrón que «alumno extra»" (`comboboxAlumnoExtra.ts`, T-20) se interpreta aquí como MISMO
 * PATRÓN de accesibilidad (`role="combobox"`/`aria-expanded`/`aria-controls`/`aria-activedescendant`,
 * `listbox` con `option`, navegación con flechas, selección con Enter, cierre con Escape, región
 * `aria-live`), no el mismo fichero: el contrato real es distinto. `comboboxAlumnoExtra.ts` busca en
 * SERVIDOR sobre un conjunto potencialmente grande, con rebote y cancelación de petición (T-20,
 * requisito 2) — el catálogo de asignaturas es pequeño (decenas, no miles), se precarga entero al
 * abrir la pantalla y se filtra en el CLIENTE, sin ninguna petición por tecla; y necesita, además,
 * dar de alta una entrada nueva sobre la marcha (requisito 3 de R-33), una capacidad que el buscador
 * de alumnos nunca tuvo ni necesita. Forzar ese contrato ajeno (`buscar` asíncrono con `AbortSignal`,
 * `onSeleccionar` con nota opcional) a un catálogo local con alta habría sido más complejo que un
 * componente propio, no menos — decisión documentada en `DECISIONES_TECNICAS.md`.
 *
 * **El valor siempre se resuelve contra el catálogo** (`obtenerValor`): un texto que no coincide con
 * ninguna entrada existente NI se ha dado de alta con el botón «Crear…» se devuelve como
 * `sin_resolver`, para que quien monta el formulario NO lo envíe — es la garantía de que dos slots
 * del mismo grupo nunca acaban con dos textos distintos, el problema entero que resuelve R-33. Única
 * excepción: el valor con el que se abrió el formulario en modo edición (`establecerValor`, un slot
 * ya existente cuyo texto puede no estar en el catálogo — requisito 4, "los slots ya existentes
 * conservan su texto actual tal cual") se acepta sin cambios mientras no se toque, exactamente igual
 * que antes de existir el catálogo; en cuanto se edita, vuelve a exigir resolución.
 */

import type { Asignatura } from '../dominio/tipos.ts';
import { asignaturasQueCoinciden, nombresDeAsignaturaEquivalentes } from '../dominio/asignaturas.ts';
import type { ResultadoGuardarAsignatura } from '../datos/asignaturas.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';
import { crearCampoTexto } from './formularios.ts';

export type ValorComboboxAsignatura =
  | { readonly tipo: 'vacio' }
  | { readonly tipo: 'resuelto'; readonly nombre: string }
  | { readonly tipo: 'sin_resolver'; readonly textoEscrito: string };

export interface DependenciasComboboxAsignatura {
  /** Catálogo activo ya cargado por la pantalla que monta este combobox — sin fetch propio, a
   * diferencia de `comboboxAlumnoExtra.ts` (ver cabecera del módulo). */
  readonly catalogoInicial: readonly Asignatura[];
  /** Alta sobre la marcha (requisito 3 de R-33) de una entrada que todavía no existe en el
   * catálogo. */
  crearAsignatura(nombre: string): Promise<ResultadoGuardarAsignatura>;
  /** Etiqueta del campo de texto; por defecto "Asignatura o grupo (opcional)" (mismo texto que el
   * campo libre que sustituye). */
  readonly etiqueta?: string;
}

export interface ComboboxAsignatura {
  readonly contenedor: HTMLElement;
  /** El valor que se enviaría si el formulario se guardara ahora mismo — se lee en el momento del
   * envío, igual que `campoTexto.input.value` en el resto de campos de estas pantallas. */
  obtenerValor(): ValorComboboxAsignatura;
  /** Precarga el campo en modo edición (requisito 4: el texto de un slot ya existente, esté o no en
   * el catálogo). No dispara ninguna llamada de datos. */
  establecerValor(nombre: string | null): void;
  /** Sustituye el catálogo local (por ejemplo, cuando la pantalla que monta este combobox lo carga
   * de forma asíncrona DESPUÉS de construirlo — mismo caso que rellenar un `<select>` de profesores
   * tras resolver la promesa). Si la lista está abierta, vuelve a filtrar con el texto actual. */
  actualizarCatalogo(nuevo: readonly Asignatura[]): void;
}

interface EstadoCombobox {
  readonly abierto: boolean;
  readonly opciones: readonly Asignatura[];
  readonly puedeCrear: boolean;
  readonly indiceActivo: number | null;
  readonly creando: boolean;
  readonly mensajeError: string;
}

const ESTADO_INICIAL: EstadoCombobox = {
  abierto: false,
  opciones: [],
  puedeCrear: false,
  indiceActivo: null,
  creando: false,
  mensajeError: '',
};

let contadorIds = 0;

export function montarComboboxAsignatura(documento: Document, deps: DependenciasComboboxAsignatura): ComboboxAsignatura {
  const idBase = `combobox-asignatura-${String((contadorIds += 1))}`;
  const idListbox = `${idBase}-listbox`;

  let catalogo: readonly Asignatura[] = deps.catalogoInicial;
  let valorInicial: string | null = null;

  const almacen = crearAlmacenEstado<EstadoCombobox>(ESTADO_INICIAL);

  const campo = crearCampoTexto(documento, `${idBase}-input`, deps.etiqueta ?? 'Asignatura o grupo (opcional)', 'text', 'off');
  campo.input.required = false;
  campo.input.setAttribute('role', 'combobox');
  campo.input.setAttribute('aria-autocomplete', 'list');
  campo.input.setAttribute('aria-haspopup', 'listbox');
  campo.input.setAttribute('aria-controls', idListbox);
  campo.input.setAttribute('aria-expanded', 'false');

  const zonaEstado = documento.createElement('p');
  zonaEstado.setAttribute('role', 'status');

  const listbox = documento.createElement('ul');
  listbox.id = idListbox;
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('aria-label', 'Asignaturas del catálogo');
  listbox.style.listStyle = 'none';
  listbox.style.padding = '0';
  listbox.style.margin = '0';
  listbox.hidden = true;

  const contenedor = documento.createElement('div');
  contenedor.append(campo.contenedor, zonaEstado, listbox);

  function totalOpciones(estado: EstadoCombobox): number {
    return estado.opciones.length + (estado.puedeCrear ? 1 : 0);
  }

  function recalcular(): void {
    const texto = campo.input.value;
    const opciones = asignaturasQueCoinciden(texto, catalogo);
    const textoTrim = texto.trim();
    const yaExiste = textoTrim.length > 0 && opciones.some((op) => nombresDeAsignaturaEquivalentes(op.nombre, textoTrim));
    almacen.actualizar({
      abierto: true,
      opciones,
      puedeCrear: textoTrim.length > 0 && !yaExiste,
      indiceActivo: null,
      mensajeError: '',
    });
  }

  function cerrar(): void {
    almacen.actualizar(() => ESTADO_INICIAL);
  }

  function seleccionarOpcion(opcion: Asignatura): void {
    campo.input.value = opcion.nombre;
    cerrar();
    campo.input.focus();
  }

  function crearDesdeTexto(): void {
    const textoTrim = campo.input.value.trim();
    if (textoTrim.length === 0) {
      return;
    }
    almacen.actualizar({ creando: true, mensajeError: '' });
    void deps
      .crearAsignatura(textoTrim)
      .then((resultado) => {
        const asignatura = resultado.tipo === 'guardado' ? resultado.asignatura : resultado.existente;
        catalogo = [...catalogo, asignatura].filter(
          (valor, indice, todos) => todos.findIndex((otro) => otro.id === valor.id) === indice,
        );
        campo.input.value = asignatura.nombre;
        cerrar();
        campo.input.focus();
      })
      .catch((error: unknown) => {
        almacen.actualizar({ creando: false, mensajeError: mensajeAmigable(error) });
      });
  }

  function activar(indice: number): void {
    const estado = almacen.obtener();
    if (indice < estado.opciones.length) {
      const opcion = estado.opciones[indice];
      if (opcion) {
        seleccionarOpcion(opcion);
      }
      return;
    }
    if (estado.puedeCrear) {
      crearDesdeTexto();
    }
  }

  function manejarTeclado(evento: KeyboardEvent): void {
    const estado = almacen.obtener();
    const total = totalOpciones(estado);
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      if (!estado.abierto) {
        recalcular();
        return;
      }
      if (total === 0) {
        return;
      }
      const siguiente = estado.indiceActivo === null ? 0 : Math.min(estado.indiceActivo + 1, total - 1);
      almacen.actualizar({ indiceActivo: siguiente });
      return;
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!estado.abierto || total === 0) {
        return;
      }
      const anterior = estado.indiceActivo === null ? total - 1 : Math.max(estado.indiceActivo - 1, 0);
      almacen.actualizar({ indiceActivo: anterior });
      return;
    }
    if (evento.key === 'Enter') {
      if (estado.abierto && estado.indiceActivo !== null) {
        evento.preventDefault();
        activar(estado.indiceActivo);
      }
      return;
    }
    if (evento.key === 'Escape') {
      if (!estado.abierto) {
        return;
      }
      evento.preventDefault();
      cerrar();
    }
  }

  function textoEstado(estado: EstadoCombobox): string {
    if (estado.creando) {
      return 'Creando…';
    }
    if (estado.mensajeError) {
      return estado.mensajeError;
    }
    if (!estado.abierto) {
      return '';
    }
    const partes: string[] = [];
    partes.push(
      `${String(estado.opciones.length)} coincidencia${estado.opciones.length === 1 ? '' : 's'} en el catálogo.`,
    );
    if (estado.puedeCrear) {
      partes.push('Puedes crear una entrada nueva con esta escritura.');
    }
    return partes.join(' ');
  }

  function pintar(estado: EstadoCombobox): void {
    zonaEstado.textContent = textoEstado(estado);
    campo.input.setAttribute('aria-expanded', estado.abierto ? 'true' : 'false');
    const total = totalOpciones(estado);
    if (estado.indiceActivo !== null && estado.indiceActivo < total) {
      campo.input.setAttribute('aria-activedescendant', `${idListbox}-opt-${String(estado.indiceActivo)}`);
    } else {
      campo.input.removeAttribute('aria-activedescendant');
    }

    listbox.hidden = !estado.abierto || total === 0;
    listbox.textContent = '';
    if (!estado.abierto) {
      return;
    }

    estado.opciones.forEach((opcion, indice) => {
      const item = documento.createElement('li');
      item.id = `${idListbox}-opt-${String(indice)}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', indice === estado.indiceActivo ? 'true' : 'false');
      item.style.minHeight = '44px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.padding = '8px';
      item.style.cursor = 'pointer';
      item.style.backgroundColor = indice === estado.indiceActivo ? '#E5E7EB' : 'transparent';
      item.append(documento.createTextNode(opcion.nombre));
      item.addEventListener('mousedown', (evento) => {
        evento.preventDefault();
        seleccionarOpcion(opcion);
      });
      listbox.append(item);
    });

    if (estado.puedeCrear) {
      const indice = estado.opciones.length;
      const item = documento.createElement('li');
      item.id = `${idListbox}-opt-${String(indice)}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', indice === estado.indiceActivo ? 'true' : 'false');
      item.style.minHeight = '44px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.padding = '8px';
      item.style.cursor = 'pointer';
      item.style.backgroundColor = indice === estado.indiceActivo ? '#E5E7EB' : 'transparent';
      item.append(documento.createTextNode(`Crear «${campo.input.value.trim()}» en el catálogo`));
      item.addEventListener('mousedown', (evento) => {
        evento.preventDefault();
        crearDesdeTexto();
      });
      listbox.append(item);
    }
  }

  campo.input.addEventListener('input', recalcular);
  campo.input.addEventListener('focus', recalcular);
  campo.input.addEventListener('keydown', manejarTeclado);

  almacen.suscribir(pintar);
  pintar(almacen.obtener());

  return {
    contenedor,
    obtenerValor(): ValorComboboxAsignatura {
      const textoActual = campo.input.value.trim();
      if (textoActual.length === 0) {
        return { tipo: 'vacio' };
      }
      if (valorInicial !== null && textoActual === valorInicial) {
        return { tipo: 'resuelto', nombre: valorInicial };
      }
      const coincidencia = catalogo.find((asignatura) => nombresDeAsignaturaEquivalentes(asignatura.nombre, textoActual));
      if (coincidencia) {
        return { tipo: 'resuelto', nombre: coincidencia.nombre };
      }
      return { tipo: 'sin_resolver', textoEscrito: textoActual };
    },
    establecerValor(nombre: string | null): void {
      valorInicial = nombre;
      campo.input.value = nombre ?? '';
    },
    actualizarCatalogo(nuevo: readonly Asignatura[]): void {
      catalogo = nuevo;
      if (almacen.obtener().abierto) {
        recalcular();
      }
    },
  };
}
