/**
 * Asistente de primeros pasos para `administrator` (R-18): lista de comprobación de arranque de un
 * centro — un centro de estudios de referencia (T-11), un alumno activo (T-12), un slot de horario
 * vigente (T-15) y un profesor con cuenta activa además del propio administrador (T-24). Cada paso
 * se calcula en tiempo real contando filas ya existentes (requisito 2 de R-18: "sin campo, columna
 * ni tabla nueva"), nunca se marca a mano ni exige recargar la pantalla — basta con volver a
 * entrar en ella. Pantalla propia, exclusiva de `administrator`
 * (`puedeVerAsistentePrimerosPasos`, presentación, no control de acceso real — ver cabecera de
 * `permisosUi.ts`) — un `teacher` no llega a ella por ningún camino, mismo criterio ya aceptado para
 * R-10/R-15/R-16.
 *
 * Siempre accesible por su propia ruta (`#/primeros-pasos`, con un botón fijo en la barra de
 * navegación de `ui/aplicacion.ts`, requisito 1: "accesible en cualquier momento") y, además, la que
 * `ui/aplicacion.ts` abre automáticamente al entrar en la aplicación sin ningún hash en la URL
 * mientras quede algún paso pendiente (requisito 1: "mostrado por defecto"); en cuanto los cuatro
 * están completos deja de abrirse sola (requisito 4), pero el botón de la barra de navegación nunca
 * desaparece, así que sigue accesible bajo demanda.
 */

import type { Rol, CentroEstudios, SlotHorario } from '../dominio/tipos.ts';
import { puedeVerAsistentePrimerosPasos } from '../dominio/permisosUi.ts';
import {
  calcularPasosAsistentePrimerosPasos,
  asistentePrimerosPasosCompleto,
  type PasoAsistentePrimerosPasos,
} from '../dominio/asistentePrimerosPasos.ts';
import { slotsVigentesEn } from '../dominio/slotHorario.ts';
import type { AlumnoParaPanelCentro } from '../dominio/panelCentro.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';
import type { Reloj } from '../nucleo/reloj.ts';
import { crearElemento } from './dom.ts';
import { crearBoton, crearZonaMensaje } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaAsistentePrimerosPasos {
  readonly rol: Rol;
  readonly reloj: Reloj;
  listarCentrosActivos(): Promise<readonly CentroEstudios[]>;
  listarAlumnosActivos(): Promise<readonly AlumnoParaPanelCentro[]>;
  listarSlots(): Promise<readonly SlotHorario[]>;
  listarProfesoresActivos(): Promise<readonly ProfesorParaSelector[]>;
  /** (a) Alta manual de un centro de estudios (T-11). */
  irACentros(): void;
  /** (b) Alta manual de un alumno (T-12) — la spec (requisito 1b) también admite enlazar a la
   * importación masiva (R-08) "según convenga a la sesión que lo implemente"; esta pantalla enlaza
   * al alta manual por ser el camino directo de un único alumno, el mismo primer paso que un centro
   * recién creado necesita. */
  irAAlumnoNuevo(): void;
  /** (c) El horario de un alumno se asigna dentro de su ficha (T-15/T-16), no en una pantalla
   * propia: el enlace lleva al listado de alumnos, desde donde se abre la ficha de alguno. */
  irAAlumnos(): void;
  /** (d) Dar de alta el rol `teacher` de una cuenta ya existente (T-24). */
  irAUsuarios(): void;
}

function destinoDelPaso(id: PasoAsistentePrimerosPasos['id'], deps: DependenciasPantallaAsistentePrimerosPasos): () => void {
  switch (id) {
    case 'centro':
      return () => {
        deps.irACentros();
      };
    case 'alumno':
      return () => {
        deps.irAAlumnoNuevo();
      };
    case 'horario':
      return () => {
        deps.irAAlumnos();
      };
    case 'profesor':
      return () => {
        deps.irAUsuarios();
      };
  }
}

export function mostrarPantallaAsistentePrimerosPasos(contenedor: HTMLElement, deps: DependenciasPantallaAsistentePrimerosPasos): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeVerAsistentePrimerosPasos(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  let cargando = true;
  let errorCarga = '';
  let pasos: readonly PasoAsistentePrimerosPasos[] = [];

  const titulo = crearElemento(documento, 'h1', { texto: 'Primeros pasos' });
  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaContenido = documento.createElement('section');

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      const [centros, alumnos, slots, profesores] = await Promise.all([
        deps.listarCentrosActivos(),
        deps.listarAlumnosActivos(),
        deps.listarSlots(),
        deps.listarProfesoresActivos(),
      ]);
      pasos = calcularPasosAsistentePrimerosPasos({
        hayCentroDeReferencia: centros.length > 0,
        hayAlumnoActivo: alumnos.length > 0,
        haySlotVigente: slotsVigentesEn(slots, deps.reloj.ahora()).length > 0,
        hayProfesorActivo: profesores.length > 0,
      });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  function pintar(): void {
    zonaError.textContent = errorCarga;
    zonaContenido.textContent = '';

    if (cargando) {
      zonaContenido.append(crearElemento(documento, 'p', { texto: 'Cargando…' }));
      return;
    }
    if (errorCarga.length > 0) {
      return;
    }

    if (asistentePrimerosPasosCompleto(pasos)) {
      zonaContenido.append(
        crearElemento(documento, 'p', {
          texto: 'Tu centro ya tiene lo mínimo para funcionar. Puedes revisar estos pasos cuando quieras.',
        }),
      );
    }

    const lista = documento.createElement('ul');
    for (const paso of pasos) {
      const li = documento.createElement('li');
      li.append(crearElemento(documento, 'span', { texto: `${paso.completado ? 'Hecho' : 'Pendiente'}: ${paso.etiqueta}` }));
      if (!paso.completado) {
        const boton = crearBoton(documento, 'Ir', 'button');
        boton.addEventListener('click', destinoDelPaso(paso.id, deps));
        li.append(boton);
      }
      lista.append(li);
    }
    zonaContenido.append(lista);
  }

  contenedor.append(titulo, zonaError, zonaContenido);
  void cargar();
}
