/**
 * Buscador de "alumno extra" (T-20): combobox accesible escrito a mano, sin librería —
 * `role="combobox"` con `aria-expanded`/`aria-controls`/`aria-activedescendant`, una lista
 * `role="listbox"` con opciones `role="option"`, navegación con flechas, selección con Enter,
 * cierre con Escape, y una región `aria-live` (`role="status"`, requisito 4 de T-20) que anuncia
 * tanto el estado ("Buscando…", "Sin resultados…") como el recuento de resultados.
 *
 * **Cancelación y rebote (requisito 2):** cada tecla nueva reprograma `deps.rebote` (250 ms
 * recomendados por la spec, decisión de quien monta el combobox) y aborta cualquier búsqueda en
 * curso — incluso cuando el texto cae por debajo del mínimo y no hay ninguna búsqueda nueva que
 * lanzar, `cancelarPeticionEnCurso()` sigue abortando la anterior con el mismo
 * `crearEjecutorUltimaPeticion` (T-06, `nucleo/controlPeticion.ts`): ejecuta una operación
 * trivial ya resuelta, que no hace red pero SÍ aborta lo que hubiera pendiente como efecto
 * colateral de "empezar una operación nueva". Una respuesta que llega abortada
 * (`esErrorDeCancelacion`) se ignora en silencio, nunca se pinta como error — sería ruido en cada
 * tecla que el usuario teclea rápido.
 *
 * **Nunca pide avatar** (requisito 3, decisión de diseño de la propia spec): los resultados solo
 * traen columnas de identificación y el nombre del centro; el avatar solo aparece más tarde, en la
 * card de la pantalla que llama, una vez que el alumno YA es parte de la sesión (T-20: "avatar
 * donde el conjunto es estable, texto donde el conjunto es transitorio").
 */

import { debeBuscar, resultadosParaMostrar, type ResultadoBusquedaAlumno } from '../dominio/busquedaAlumnoExtra.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { crearEjecutorUltimaPeticion, esErrorDeCancelacion } from '../nucleo/controlPeticion.ts';
import type { Rebote } from '../nucleo/rebote.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';
import { crearCampoTexto } from './formularios.ts';

/** Rebote recomendado por el requisito 2 de T-20 ("unos 250 ms"). Constante de referencia; quien
 * monta el combobox puede pasar otro valor si algún día hace falta, pero por defecto se usa este. */
export const MS_REBOTE_BUSQUEDA = 250;

export type EstadoBusquedaAlumnoExtra = 'sin_escribir' | 'buscando' | 'sin_resultados' | 'resultados' | 'error';

export interface DependenciasComboboxAlumnoExtra {
  /** Búsqueda en servidor (T-20, requisito 2): `datos/alumnos.ts#buscarAlumnosParaExtra` en la
   * composición real. Recibe la señal de cancelación de la búsqueda que reemplaza. */
  buscar(texto: string, señal: AbortSignal): Promise<readonly ResultadoBusquedaAlumno[]>;
  /** Se llama al confirmar un resultado (Enter o toque/clic). `nota` es `null` si el campo de
   * motivo estaba vacío (requisito 8: nota breve OPCIONAL). Después de llamar, el combobox se
   * limpia por su cuenta (texto y nota) — quien recibe la llamada no necesita limpiar nada aquí. */
  onSeleccionar(resultado: ResultadoBusquedaAlumno, nota: string | null): void;
  /** Inyectable para que los tests disparen el rebote a mano (`crearReboteDePrueba`), igual que
   * `ProgramadorIntervalo` en T-19. Fábrica NUEVA por combobox (`crearRebote()`), nunca compartida
   * entre dos instancias. */
  readonly rebote: Rebote;
}

interface EstadoCombobox {
  readonly estado: EstadoBusquedaAlumnoExtra;
  readonly resultados: readonly ResultadoBusquedaAlumno[];
  readonly indiceActivo: number | null;
  readonly mensajeError: string;
}

const ESTADO_INICIAL: EstadoCombobox = {
  estado: 'sin_escribir',
  resultados: [],
  indiceActivo: null,
  mensajeError: '',
};

const MENSAJE_SIN_RESULTADOS =
  'No se han encontrado alumnos activos con ese nombre. Si el alumno existe, puede estar dado de baja: ' +
  'contacta con el administrador.';

let contadorIds = 0;

export function montarComboboxAlumnoExtra(contenedor: HTMLElement, deps: DependenciasComboboxAlumnoExtra): void {
  const documento = contenedor.ownerDocument;
  const idBase = `combobox-alumno-extra-${String((contadorIds += 1))}`;
  const idListbox = `${idBase}-listbox`;

  const almacen = crearAlmacenEstado<EstadoCombobox>(ESTADO_INICIAL);
  const ejecutar = crearEjecutorUltimaPeticion<readonly ResultadoBusquedaAlumno[] | null>();

  const campoBusqueda = crearCampoTexto(documento, `${idBase}-input`, 'Buscar alumno (clase extra)', 'text', 'off');
  campoBusqueda.input.required = false;
  campoBusqueda.input.setAttribute('role', 'combobox');
  campoBusqueda.input.setAttribute('aria-autocomplete', 'list');
  campoBusqueda.input.setAttribute('aria-haspopup', 'listbox');
  campoBusqueda.input.setAttribute('aria-controls', idListbox);
  campoBusqueda.input.setAttribute('aria-expanded', 'false');

  const campoNota = crearCampoTexto(documento, `${idBase}-nota`, 'Motivo (opcional)', 'text', 'off');
  campoNota.input.required = false;

  const zonaEstado = documento.createElement('p');
  zonaEstado.setAttribute('role', 'status');

  const listbox = documento.createElement('ul');
  listbox.id = idListbox;
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('aria-label', 'Resultados de la búsqueda de alumnos');
  listbox.style.listStyle = 'none';
  listbox.style.padding = '0';
  listbox.style.margin = '0';
  listbox.hidden = true;

  function cancelarPeticionEnCurso(): void {
    // "Empezar" una operación trivial ya resuelta aborta, como efecto colateral necesario de
    // crearEjecutorUltimaPeticion, cualquier búsqueda real que siguiera en curso — sin necesidad
    // de que este módulo lleve su propio AbortController por separado.
    void ejecutar(() => Promise.resolve(null));
  }

  function cerrarLista(estadoNuevo: EstadoBusquedaAlumnoExtra = 'sin_escribir'): void {
    almacen.actualizar({ estado: estadoNuevo, resultados: [], indiceActivo: null, mensajeError: '' });
  }

  function dispararBusqueda(texto: string): void {
    almacen.actualizar({ estado: 'buscando', indiceActivo: null });
    ejecutar((señal) => deps.buscar(texto, señal))
      .then((resultados) => {
        if (resultados === null) {
          return; // Superada por una operación más nueva (cancelarPeticionEnCurso) o por el no-op inicial.
        }
        almacen.actualizar({
          estado: resultados.length > 0 ? 'resultados' : 'sin_resultados',
          resultados,
          indiceActivo: null,
        });
      })
      .catch((error: unknown) => {
        if (esErrorDeCancelacion(error)) {
          return;
        }
        almacen.actualizar({ estado: 'error', resultados: [], indiceActivo: null, mensajeError: mensajeAmigable(error) });
      });
  }

  function manejarEntrada(): void {
    const texto = campoBusqueda.input.value;
    if (!debeBuscar(texto)) {
      deps.rebote.cancelar();
      cancelarPeticionEnCurso();
      cerrarLista('sin_escribir');
      return;
    }
    deps.rebote.aplazar(MS_REBOTE_BUSQUEDA, () => {
      dispararBusqueda(texto);
    });
  }

  function seleccionar(indice: number): void {
    const resultado = almacen.obtener().resultados[indice];
    if (!resultado) {
      return;
    }
    const nota = campoNota.input.value.trim();
    deps.onSeleccionar(resultado, nota.length > 0 ? nota : null);
    deps.rebote.cancelar();
    campoBusqueda.input.value = '';
    campoNota.input.value = '';
    cerrarLista('sin_escribir');
    campoBusqueda.input.focus();
  }

  function manejarTeclado(evento: KeyboardEvent): void {
    const estado = almacen.obtener();
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      if (estado.estado !== 'resultados' || estado.resultados.length === 0) {
        return;
      }
      const siguiente = estado.indiceActivo === null ? 0 : Math.min(estado.indiceActivo + 1, estado.resultados.length - 1);
      almacen.actualizar({ indiceActivo: siguiente });
      return;
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (estado.estado !== 'resultados' || estado.resultados.length === 0) {
        return;
      }
      const anterior = estado.indiceActivo === null ? estado.resultados.length - 1 : Math.max(estado.indiceActivo - 1, 0);
      almacen.actualizar({ indiceActivo: anterior });
      return;
    }
    if (evento.key === 'Enter') {
      if (estado.estado === 'resultados' && estado.indiceActivo !== null) {
        evento.preventDefault();
        seleccionar(estado.indiceActivo);
      }
      return;
    }
    if (evento.key === 'Escape') {
      if (estado.estado === 'sin_escribir') {
        return;
      }
      evento.preventDefault();
      deps.rebote.cancelar();
      cancelarPeticionEnCurso();
      cerrarLista('sin_escribir');
    }
  }

  function textoEstado(estado: EstadoCombobox): string {
    switch (estado.estado) {
      case 'sin_escribir':
        return '';
      case 'buscando':
        return 'Buscando…';
      case 'sin_resultados':
        return MENSAJE_SIN_RESULTADOS;
      case 'resultados':
        return `${String(estado.resultados.length)} resultado${estado.resultados.length === 1 ? '' : 's'} encontrado${estado.resultados.length === 1 ? '' : 's'}.`;
      case 'error':
        return estado.mensajeError;
    }
  }

  function pintar(estado: EstadoCombobox): void {
    zonaEstado.textContent = textoEstado(estado);
    campoBusqueda.input.setAttribute('aria-expanded', estado.estado === 'resultados' ? 'true' : 'false');
    if (estado.indiceActivo !== null && estado.estado === 'resultados') {
      campoBusqueda.input.setAttribute('aria-activedescendant', `${idListbox}-opt-${String(estado.indiceActivo)}`);
    } else {
      campoBusqueda.input.removeAttribute('aria-activedescendant');
    }

    listbox.hidden = estado.estado !== 'resultados';
    listbox.textContent = '';
    if (estado.estado !== 'resultados') {
      return;
    }
    const marcados = resultadosParaMostrar(estado.resultados);
    marcados.forEach(({ resultado, esHomonimo }, indice) => {
      const opcion = documento.createElement('li');
      opcion.id = `${idListbox}-opt-${String(indice)}`;
      opcion.setAttribute('role', 'option');
      opcion.setAttribute('aria-selected', indice === estado.indiceActivo ? 'true' : 'false');
      opcion.style.minHeight = '44px';
      opcion.style.display = 'flex';
      opcion.style.alignItems = 'center';
      opcion.style.padding = '8px';
      opcion.style.cursor = 'pointer';
      opcion.style.backgroundColor = indice === estado.indiceActivo ? '#E5E7EB' : 'transparent';
      const texto = esHomonimo
        ? `${nombreCompletoAlumno(resultado)} (${resultado.centro_nombre})`
        : nombreCompletoAlumno(resultado);
      opcion.append(documento.createTextNode(texto));
      opcion.addEventListener('mousedown', (evento) => {
        // `mousedown`, no `click`: evita el `blur` del campo de texto justo antes de leerlo.
        evento.preventDefault();
        seleccionar(indice);
      });
      listbox.append(opcion);
    });
  }

  campoBusqueda.input.addEventListener('input', manejarEntrada);
  campoBusqueda.input.addEventListener('keydown', manejarTeclado);

  almacen.suscribir(pintar);
  pintar(almacen.obtener());

  contenedor.append(campoBusqueda.contenedor, campoNota.contenedor, zonaEstado, listbox);
}
