/**
 * Operaciones de datos del calendario de cierres del centro (R-12): listar, crear, editar,
 * desactivar y reactivar. Sin borrado — igual que el catálogo de centros de estudios (T-11), un
 * cierre solo se marca `activo = false`. La detección de solape (requisito 3 de R-12) vive en
 * `src/dominio/cierresCentro.ts`; este módulo solo la usa antes de escribir, siempre contra los
 * cierres ACTIVOS (uno desactivado por error ya no ocupa su periodo, así que un cierre nuevo o
 * reactivado puede cubrirlo de nuevo).
 *
 * Escritura reservada a `administrator` por RLS (`db/014_calendario_cierres.sql`): un `teacher` que
 * llame a `crearCierre`/`editarCierre`/`desactivarCierre`/`reactivarCierre` recibe `SinPermiso` del
 * servidor, no de este módulo — la comprobación de rol de la interfaz (`permisosUi.ts`) es solo
 * presentación.
 */

import type { ClientePostgrest } from './postgrest.ts';
import type { CierreCentro } from '../dominio/tipos.ts';
import { buscarCierreSolapado } from '../dominio/cierresCentro.ts';
import { ErrorDeValidacion, ErrorDelServidor } from './erroresDominio.ts';

export type FiltroEstadoCierre = 'activos' | 'inactivos' | 'todos';

export interface OpcionesListarCierres {
  readonly estado?: FiltroEstadoCierre;
}

export type ResultadoGuardarCierre =
  | { readonly tipo: 'guardado'; readonly cierre: CierreCentro }
  | { readonly tipo: 'solapado'; readonly existente: CierreCentro };

const TABLA = 'cierre_centro';

export async function listarCierres(
  cliente: ClientePostgrest,
  opciones: OpcionesListarCierres = {},
): Promise<readonly CierreCentro[]> {
  let consulta = cliente.desde<CierreCentro>(TABLA);
  if (opciones.estado === 'activos') {
    consulta = consulta.eq('activo', true);
  } else if (opciones.estado === 'inactivos') {
    consulta = consulta.eq('activo', false);
  }
  return consulta.order('fecha_inicio').seleccionar();
}

function primeraFilaOFalla(filas: readonly CierreCentro[]): CierreCentro {
  const [cierre] = filas;
  if (!cierre) {
    throw new ErrorDelServidor('El servidor no ha devuelto el cierre esperado.');
  }
  return cierre;
}

function motivoValidoOFalla(motivoEntrada: string): string {
  const motivo = motivoEntrada.trim();
  if (motivo.length === 0) {
    throw new ErrorDeValidacion('El motivo del cierre no puede estar vacío.');
  }
  return motivo;
}

function rangoValidoOFalla(fechaInicio: string, fechaFin: string): void {
  if (fechaInicio.length === 0 || fechaFin.length === 0) {
    throw new ErrorDeValidacion('Indica la fecha de inicio y la fecha de fin del cierre.');
  }
  if (fechaFin < fechaInicio) {
    throw new ErrorDeValidacion('La fecha de fin no puede ser anterior a la fecha de inicio.');
  }
}

async function comprobarSolape(
  cliente: ClientePostgrest,
  fechaInicio: string,
  fechaFin: string,
  idAExcluir?: string,
): Promise<CierreCentro | undefined> {
  const activos = await cliente.desde<CierreCentro>(TABLA).eq('activo', true).seleccionar();
  return buscarCierreSolapado({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }, activos, idAExcluir);
}

/** Crea un cierre nuevo, salvo que se pise en fecha con uno ya activo, en cuyo caso lo devuelve
 * como `solapado` en vez de intentar el alta (requisito 3 de R-12). */
export async function crearCierre(
  cliente: ClientePostgrest,
  fechaInicio: string,
  fechaFin: string,
  motivoEntrada: string,
): Promise<ResultadoGuardarCierre> {
  rangoValidoOFalla(fechaInicio, fechaFin);
  const motivo = motivoValidoOFalla(motivoEntrada);
  const solapado = await comprobarSolape(cliente, fechaInicio, fechaFin);
  if (solapado) {
    return { tipo: 'solapado', existente: solapado };
  }
  const filas = await cliente
    .desde<CierreCentro>(TABLA)
    .insertar({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo });
  return { tipo: 'guardado', cierre: primeraFilaOFalla(filas) };
}

/** Igual que `crearCierre`, pero editando `id`. El propio cierre que se edita se excluye de la
 * comprobación de solape (si no, un cierre siempre "se pisaría consigo mismo"). */
export async function editarCierre(
  cliente: ClientePostgrest,
  id: string,
  fechaInicio: string,
  fechaFin: string,
  motivoEntrada: string,
): Promise<ResultadoGuardarCierre> {
  rangoValidoOFalla(fechaInicio, fechaFin);
  const motivo = motivoValidoOFalla(motivoEntrada);
  const solapado = await comprobarSolape(cliente, fechaInicio, fechaFin, id);
  if (solapado) {
    return { tipo: 'solapado', existente: solapado };
  }
  const filas = await cliente
    .desde<CierreCentro>(TABLA)
    .eq('id', id)
    .actualizar({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo });
  return { tipo: 'guardado', cierre: primeraFilaOFalla(filas) };
}

export async function desactivarCierre(cliente: ClientePostgrest, id: string): Promise<CierreCentro> {
  const filas = await cliente.desde<CierreCentro>(TABLA).eq('id', id).actualizar({ activo: false });
  return primeraFilaOFalla(filas);
}

/** Reactiva un cierre previamente desactivado, salvo que su periodo se pise hoy con otro cierre ya
 * activo (pudo darse de alta mientras este estaba inactivo) — mismo criterio de solape que crear o
 * editar, para que la invariante "ningún par de cierres activos se pisa" se mantenga también por
 * esta vía. */
export async function reactivarCierre(cliente: ClientePostgrest, id: string): Promise<ResultadoGuardarCierre> {
  const [cierre] = await cliente.desde<CierreCentro>(TABLA).eq('id', id).seleccionar();
  if (!cierre) {
    throw new ErrorDelServidor('El servidor no ha devuelto el cierre esperado.');
  }
  const solapado = await comprobarSolape(cliente, cierre.fecha_inicio, cierre.fecha_fin, id);
  if (solapado) {
    return { tipo: 'solapado', existente: solapado };
  }
  const filas = await cliente.desde<CierreCentro>(TABLA).eq('id', id).actualizar({ activo: true });
  return { tipo: 'guardado', cierre: primeraFilaOFalla(filas) };
}
