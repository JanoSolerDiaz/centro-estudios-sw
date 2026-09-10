/**
 * Importación masiva de alumnos y horarios (R-08): dos bloques independientes, cada uno con el mismo
 * flujo en dos pasos que exige el requisito 2 — analizar el fichero y mostrar una vista previa
 * obligatoria (qué se va a crear y qué fila falla y por qué), y solo entonces, con un segundo toque
 * explícito, confirmar la escritura. Ningún fichero se conserva más allá de esta pantalla (requisito
 * 5): su texto vive en memoria mientras dura el análisis y se descarta al analizar el siguiente o al
 * salir de la pantalla, nunca se sube a ningún sitio como tal.
 *
 * Reservado a `administrator` (requisito 6), igual que T-12 (fichas) y T-15 (horarios): un `teacher`
 * ve solo "No tienes acceso a esta pantalla." y no se dispara ninguna petición de datos.
 *
 * El bloque de horarios resuelve cada email de profesor distinto UNA vez (`emailsProfesorUnicosDeCsvHorarios`,
 * `dominio/importacionHorarios.ts`) antes de analizar las filas — nunca una petición de red por fila,
 * ni siquiera cuando varias filas comparten el mismo profesor.
 *
 * **P-25:** el bloque de alumnos genera el `id` de cada fila `'nueva'` una única vez, al analizar el
 * fichero (`deps.generarId`, nunca en el click de confirmar), y lo guarda en el estado del bloque
 * (`idsPorFila`) para reutilizarlo tal cual en cualquier reintento del mismo lote — ver la cabecera de
 * `datos/importacionMasiva.ts` para el porqué.
 */

import type { Rol } from '../dominio/tipos.ts';
import { puedeImportarMasivamente } from '../dominio/permisosUi.ts';
import { analizarCsv } from '../nucleo/csv.ts';
import {
  analizarCsvAlumnos,
  CABECERA_ALUMNOS_CSV,
  type FilaAlumnoCsv,
  type AlumnoExistenteParaImportacion,
  type ResultadoAnalisisAlumnosCsv,
} from '../dominio/importacionAlumnos.ts';
import {
  analizarCsvHorarios,
  emailsProfesorUnicosDeCsvHorarios,
  CABECERA_HORARIOS_CSV,
  type DatosHorarioImportado,
  type FilaHorarioCsv,
  type AlumnoParaEmparejarHorario,
  type ProfesorResuelto,
  type ResultadoAnalisisHorariosCsv,
} from '../dominio/importacionHorarios.ts';
import type { CentroEstudios } from '../dominio/tipos.ts';
import type { LectorFichero } from './dom.ts';
import { crearElemento } from './dom.ts';
import { crearZonaMensaje, crearBoton } from './formularios.ts';
import { crearAlmacenEstado } from '../nucleo/almacenEstado.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';
import type { ResultadoImportacionHorarios, FilaAlumnoParaConfirmar } from '../datos/importacionMasiva.ts';

type AlumnoParaAnalisis = AlumnoExistenteParaImportacion & AlumnoParaEmparejarHorario;

export interface DependenciasPantallaImportacionMasiva {
  readonly rol: Rol;
  readonly leerFichero: LectorFichero;
  listarCentrosParaImportacion(): Promise<readonly CentroEstudios[]>;
  listarAlumnosParaImportacion(): Promise<readonly AlumnoParaAnalisis[]>;
  resolverProfesorPorEmail(email: string): Promise<ProfesorResuelto | null>;
  importarAlumnos(filas: readonly FilaAlumnoParaConfirmar[]): Promise<number>;
  importarHorarios(
    filas: readonly { readonly descripcion: string; readonly datos: DatosHorarioImportado }[],
  ): Promise<ResultadoImportacionHorarios>;
  /** Inyectable para tests deterministas; por defecto `crypto.randomUUID()` en el punto de
   * composición (`aplicacion.ts`), nunca aquí (mismo criterio que `avatarAlumno.ts`/`pantallaPasarLista.ts`).
   * Se llama una única vez por fila `'nueva'`, al analizar el fichero — nunca al confirmar, para que
   * un reintento tras un error de red reenvíe el mismo `id` (P-25, ver `datos/importacionMasiva.ts`). */
  generarId(): string;
}

interface EstadoBloqueAlumnos {
  readonly cargando: boolean;
  readonly error: string;
  readonly resultado: ResultadoAnalisisAlumnosCsv | null;
  /** El `id` que se usará para dar de alta cada fila `'nueva'`, indexado por `numeroFila`. Se genera
   * una única vez, al analizar el fichero — nunca al confirmar — para que un reintento tras un error
   * de red reenvíe el MISMO `id` por fila (P-25, ver la cabecera de `datos/importacionMasiva.ts`). */
  readonly idsPorFila: ReadonlyMap<number, string>;
  readonly mensajeConfirmacion: string;
}

const ESTADO_INICIAL_ALUMNOS: EstadoBloqueAlumnos = {
  cargando: false,
  error: '',
  resultado: null,
  idsPorFila: new Map(),
  mensajeConfirmacion: '',
};

interface EstadoBloqueHorarios {
  readonly cargando: boolean;
  readonly error: string;
  readonly resultado: ResultadoAnalisisHorariosCsv | null;
  readonly mensajeConfirmacion: string;
  readonly erroresConfirmacion: readonly { readonly descripcion: string; readonly motivo: string }[];
}

const ESTADO_INICIAL_HORARIOS: EstadoBloqueHorarios = {
  cargando: false,
  error: '',
  resultado: null,
  mensajeConfirmacion: '',
  erroresConfirmacion: [],
};

function contarPorEstado<T extends { readonly estado: string }>(filas: readonly T[], estado: T['estado']): number {
  return filas.filter((f) => f.estado === estado).length;
}

function pintarFilaAlumno(documento: Document, fila: FilaAlumnoCsv): HTMLElement {
  if (fila.estado === 'nueva') {
    return crearElemento(documento, 'li', { texto: `Fila ${String(fila.numeroFila)}: ${fila.nombreCompleto} — se creará.` });
  }
  if (fila.estado === 'duplicada') {
    return crearElemento(documento, 'li', { texto: `Fila ${String(fila.numeroFila)}: ${fila.nombreCompleto} — ya existe, se omite.` });
  }
  return crearElemento(documento, 'li', { texto: `Fila ${String(fila.numeroFila)}: error — ${fila.motivo}` });
}

function pintarFilaHorario(documento: Document, fila: FilaHorarioCsv): HTMLElement {
  if (fila.estado === 'nueva') {
    return crearElemento(documento, 'li', { texto: `Fila ${String(fila.numeroFila)}: ${fila.descripcion} — se creará.` });
  }
  return crearElemento(documento, 'li', { texto: `Fila ${String(fila.numeroFila)}: error — ${fila.motivo}` });
}

function montarBloqueAlumnos(contenedor: HTMLElement, deps: DependenciasPantallaImportacionMasiva): void {
  const documento = contenedor.ownerDocument;
  const almacen = crearAlmacenEstado<EstadoBloqueAlumnos>(ESTADO_INICIAL_ALUMNOS);

  const titulo = crearElemento(documento, 'h2', { texto: 'Importar alumnos' });
  const ayuda = crearElemento(documento, 'p', {
    texto: `Cabecera exigida: ${CABECERA_ALUMNOS_CSV.join(';')}`,
  });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaConfirmacion = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('ul');
  const resumenEl = crearElemento(documento, 'p', {});

  const inputFichero = documento.createElement('input');
  inputFichero.type = 'file';
  inputFichero.accept = '.csv,text/csv';

  const botonConfirmar = crearBoton(documento, 'Confirmar importación', 'button');
  botonConfirmar.disabled = true;

  async function analizar(archivo: File): Promise<void> {
    almacen.actualizar({ cargando: true, error: '', resultado: null, idsPorFila: new Map(), mensajeConfirmacion: '' });
    try {
      const [texto, centros, alumnosExistentes] = await Promise.all([
        deps.leerFichero.leerTexto(archivo),
        deps.listarCentrosParaImportacion(),
        deps.listarAlumnosParaImportacion(),
      ]);
      const resultado = analizarCsvAlumnos(analizarCsv(texto), centros, alumnosExistentes);
      const idsPorFila = new Map(
        resultado.filas.filter((f) => f.estado === 'nueva').map((f) => [f.numeroFila, deps.generarId()] as const),
      );
      almacen.actualizar({ cargando: false, resultado, idsPorFila });
    } catch (error) {
      almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
    }
  }

  inputFichero.addEventListener('change', () => {
    const archivo = inputFichero.files?.[0];
    if (archivo) {
      void analizar(archivo);
    }
  });

  botonConfirmar.addEventListener('click', () => {
    const { resultado, idsPorFila } = almacen.obtener();
    if (!resultado) {
      return;
    }
    const nuevas: FilaAlumnoParaConfirmar[] = resultado.filas
      .filter((f) => f.estado === 'nueva')
      .map((f) => {
        const id = idsPorFila.get(f.numeroFila);
        if (!id) {
          throw new Error(`Falta el id generado para la fila ${String(f.numeroFila)}.`);
        }
        return { id, datos: f.datos };
      });
    almacen.actualizar({ cargando: true, error: '', mensajeConfirmacion: '' });
    deps
      .importarAlumnos(nuevas)
      .then((creados) => {
        almacen.actualizar({ cargando: false, resultado: null, mensajeConfirmacion: `Se han creado ${String(creados)} alumnos.` });
        inputFichero.value = '';
      })
      .catch((error: unknown) => {
        almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
      });
  });

  function pintar(estado: EstadoBloqueAlumnos): void {
    zonaError.textContent = estado.error;
    zonaConfirmacion.textContent = estado.mensajeConfirmacion;
    listaEl.textContent = '';
    resumenEl.textContent = '';
    botonConfirmar.disabled = true;

    if (estado.cargando) {
      resumenEl.textContent = 'Procesando…';
      return;
    }
    if (!estado.resultado) {
      return;
    }
    if (estado.resultado.errorCabecera) {
      zonaError.textContent = estado.resultado.errorCabecera;
      return;
    }
    const { filas } = estado.resultado;
    const nuevas = contarPorEstado(filas, 'nueva');
    const duplicadas = contarPorEstado(filas, 'duplicada');
    const errores = contarPorEstado(filas, 'error');
    resumenEl.textContent = `${String(nuevas)} nuevas, ${String(duplicadas)} duplicadas (se omiten), ${String(errores)} con error.`;
    for (const fila of filas) {
      listaEl.append(pintarFilaAlumno(documento, fila));
    }
    botonConfirmar.disabled = nuevas === 0;
  }

  almacen.suscribir(pintar);
  pintar(almacen.obtener());

  contenedor.append(titulo, ayuda, inputFichero, zonaError, zonaConfirmacion, resumenEl, listaEl, botonConfirmar);
}

function montarBloqueHorarios(contenedor: HTMLElement, deps: DependenciasPantallaImportacionMasiva): void {
  const documento = contenedor.ownerDocument;
  const almacen = crearAlmacenEstado<EstadoBloqueHorarios>(ESTADO_INICIAL_HORARIOS);

  const titulo = crearElemento(documento, 'h2', { texto: 'Importar horarios' });
  const ayuda = crearElemento(documento, 'p', {
    texto: `Cabecera exigida: ${CABECERA_HORARIOS_CSV.join(';')}`,
  });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaConfirmacion = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('ul');
  const listaErroresConfirmacionEl = documento.createElement('ul');
  const resumenEl = crearElemento(documento, 'p', {});

  const inputFichero = documento.createElement('input');
  inputFichero.type = 'file';
  inputFichero.accept = '.csv,text/csv';

  const botonConfirmar = crearBoton(documento, 'Confirmar importación', 'button');
  botonConfirmar.disabled = true;

  async function analizar(archivo: File): Promise<void> {
    almacen.actualizar({ cargando: true, error: '', resultado: null, mensajeConfirmacion: '', erroresConfirmacion: [] });
    try {
      const [texto, alumnosExistentes] = await Promise.all([deps.leerFichero.leerTexto(archivo), deps.listarAlumnosParaImportacion()]);
      const filasCrudas = analizarCsv(texto);
      const emails = emailsProfesorUnicosDeCsvHorarios(filasCrudas);
      const resueltos = await Promise.all(emails.map((email) => deps.resolverProfesorPorEmail(email)));
      const profesoresPorEmail = new Map(emails.map((email, indice) => [email, resueltos[indice] ?? null]));
      const resultado = analizarCsvHorarios(filasCrudas, alumnosExistentes, profesoresPorEmail);
      almacen.actualizar({ cargando: false, resultado });
    } catch (error) {
      almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
    }
  }

  inputFichero.addEventListener('change', () => {
    const archivo = inputFichero.files?.[0];
    if (archivo) {
      void analizar(archivo);
    }
  });

  botonConfirmar.addEventListener('click', () => {
    const { resultado } = almacen.obtener();
    if (!resultado) {
      return;
    }
    const nuevas = resultado.filas
      .filter((f): f is Extract<FilaHorarioCsv, { estado: 'nueva' }> => f.estado === 'nueva')
      .map((f) => ({ descripcion: f.descripcion, datos: f.datos }));
    almacen.actualizar({ cargando: true, error: '', mensajeConfirmacion: '', erroresConfirmacion: [] });
    deps
      .importarHorarios(nuevas)
      .then((resultadoConfirmacion) => {
        almacen.actualizar({
          cargando: false,
          resultado: null,
          mensajeConfirmacion: `Se han creado ${String(resultadoConfirmacion.creados)} horarios.`,
          erroresConfirmacion: resultadoConfirmacion.errores,
        });
        inputFichero.value = '';
      })
      .catch((error: unknown) => {
        almacen.actualizar({ cargando: false, error: mensajeAmigable(error) });
      });
  });

  function pintar(estado: EstadoBloqueHorarios): void {
    zonaError.textContent = estado.error;
    zonaConfirmacion.textContent = estado.mensajeConfirmacion;
    listaEl.textContent = '';
    listaErroresConfirmacionEl.textContent = '';
    resumenEl.textContent = '';
    botonConfirmar.disabled = true;

    for (const errorFila of estado.erroresConfirmacion) {
      listaErroresConfirmacionEl.append(
        crearElemento(documento, 'li', { texto: `${errorFila.descripcion}: ${errorFila.motivo}` }),
      );
    }

    if (estado.cargando) {
      resumenEl.textContent = 'Procesando…';
      return;
    }
    if (!estado.resultado) {
      return;
    }
    if (estado.resultado.errorCabecera) {
      zonaError.textContent = estado.resultado.errorCabecera;
      return;
    }
    const { filas } = estado.resultado;
    const nuevas = contarPorEstado(filas, 'nueva');
    const errores = contarPorEstado(filas, 'error');
    resumenEl.textContent = `${String(nuevas)} nuevos, ${String(errores)} con error.`;
    for (const fila of filas) {
      listaEl.append(pintarFilaHorario(documento, fila));
    }
    botonConfirmar.disabled = nuevas === 0;
  }

  almacen.suscribir(pintar);
  pintar(almacen.obtener());

  contenedor.append(
    titulo,
    ayuda,
    inputFichero,
    zonaError,
    zonaConfirmacion,
    resumenEl,
    listaEl,
    botonConfirmar,
    listaErroresConfirmacionEl,
  );
}

export function mostrarPantallaImportacionMasiva(contenedor: HTMLElement, deps: DependenciasPantallaImportacionMasiva): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeImportarMasivamente(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const titulo = crearElemento(documento, 'h1', { texto: 'Importación masiva' });
  const bloqueAlumnos = documento.createElement('section');
  const bloqueHorarios = documento.createElement('section');

  montarBloqueAlumnos(bloqueAlumnos, deps);
  montarBloqueHorarios(bloqueHorarios, deps);

  contenedor.append(titulo, bloqueAlumnos, bloqueHorarios);
}
