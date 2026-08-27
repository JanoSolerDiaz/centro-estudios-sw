/**
 * Orquestación del runner (T-07): decide qué migraciones faltan, comprueba la inmutabilidad de las
 * ya aplicadas, valida las guardas de contenido de las pendientes ANTES de aplicar ninguna, y aplica
 * cada una envuelta en una transacción que también deja constancia en `esquema_migracion` — todo en
 * una sola llamada a la Management API por migración, para que un fallo a mitad no deje ni el
 * esquema a medias ni la fila del ledger sin su DDL.
 */

import { validarContenidoMigracion, type ViolacionGuarda } from './guardas.ts';
import { calcularHash } from './hash.ts';
import type { ArchivoMigracion } from './archivosMigracion.ts';
import type { ClienteManagementApi } from './clienteManagementApi.ts';

export class ErrorGuardaContenido extends Error {
  readonly migracion: string;
  readonly violaciones: readonly ViolacionGuarda[];

  constructor(migracion: string, violaciones: readonly ViolacionGuarda[]) {
    super(
      `${migracion}: contiene ${String(violaciones.length)} patrón(es) prohibido(s) — ` +
        violaciones.map((v) => v.detalle).join('; '),
    );
    this.name = 'ErrorGuardaContenido';
    this.migracion = migracion;
    this.violaciones = violaciones;
  }
}

export class ErrorHashCambiado extends Error {
  readonly migracion: string;
  readonly hashAplicado: string;
  readonly hashActual: string;

  constructor(migracion: string, hashAplicado: string, hashActual: string) {
    super(
      `${migracion}: ya se aplicó con hash ${hashAplicado} y en disco tiene ${hashActual} — una ` +
        'migración aplicada es inmutable, el arreglo va en una migración nueva, nunca editando esta.',
    );
    this.name = 'ErrorHashCambiado';
    this.migracion = migracion;
    this.hashAplicado = hashAplicado;
    this.hashActual = hashActual;
  }
}

export interface FilaLedger {
  readonly numero: number;
  readonly nombre: string;
  readonly hash: string | null;
}

async function leerLedger(cliente: ClienteManagementApi, projectRef: string): Promise<FilaLedger[]> {
  const filas = await cliente.ejecutarSql(
    projectRef,
    'select numero, nombre, hash from public.esquema_migracion order by numero;',
  );
  return filas as FilaLedger[];
}

export interface PlanMigracion {
  readonly pendientes: readonly ArchivoMigracion[];
  readonly ledger: readonly FilaLedger[];
}

/** Compara las migraciones en disco con el ledger remoto: valida la inmutabilidad de hash de las ya
 * aplicadas (lanza si alguna cambió) y decide cuáles faltan por aplicar. No escribe nada. */
export function planificar(
  migraciones: readonly ArchivoMigracion[],
  ledger: readonly FilaLedger[],
): PlanMigracion {
  const aplicadasPorNumero = new Map(ledger.map((fila) => [fila.numero, fila]));
  const pendientes: ArchivoMigracion[] = [];
  for (const migracion of migraciones) {
    const aplicada = aplicadasPorNumero.get(migracion.numero);
    if (!aplicada) {
      pendientes.push(migracion);
      continue;
    }
    const hashActual = calcularHash(migracion.contenido);
    if (aplicada.hash !== null && aplicada.hash !== hashActual) {
      throw new ErrorHashCambiado(migracion.nombre, aplicada.hash, hashActual);
    }
  }
  return { pendientes, ledger };
}

function escaparLiteralSql(valor: string): string {
  return valor.replace(/'/g, "''");
}

/** Envuelve el DDL plano del fichero en una transacción que también deja constancia en el ledger. */
export function construirSqlTransaccional(migracion: ArchivoMigracion, hash: string): string {
  return [
    'begin;',
    migracion.contenido,
    `insert into public.esquema_migracion (numero, nombre, hash) values ` +
      `(${String(migracion.numero)}, '${escaparLiteralSql(migracion.nombre)}', '${escaparLiteralSql(hash)}');`,
    'commit;',
  ].join('\n');
}

/** Aplica una única migración ya validada (usada tanto por `aplicarPendientes` como directamente en
 * tests). Vuelve a pasar las guardas por si se llama de forma aislada. */
export async function aplicarMigracion(
  cliente: ClienteManagementApi,
  projectRef: string,
  migracion: ArchivoMigracion,
): Promise<void> {
  const violaciones = validarContenidoMigracion(migracion.contenido);
  if (violaciones.length > 0) {
    throw new ErrorGuardaContenido(migracion.nombre, violaciones);
  }
  const hash = calcularHash(migracion.contenido);
  await cliente.ejecutarSql(projectRef, construirSqlTransaccional(migracion, hash));
}

/** Lee el ledger, calcula el plan y aplica las pendientes en orden. Valida las guardas de TODAS las
 * pendientes antes de aplicar la primera: si una migración posterior está mal, esta ejecución no
 * deja aplicadas solo las anteriores. */
export async function aplicarPendientes(
  cliente: ClienteManagementApi,
  projectRef: string,
  migraciones: readonly ArchivoMigracion[],
  notificarAplicada: (migracion: ArchivoMigracion) => void = () => undefined,
): Promise<PlanMigracion> {
  const ledger = await leerLedger(cliente, projectRef);
  const plan = planificar(migraciones, ledger);

  for (const migracion of plan.pendientes) {
    const violaciones = validarContenidoMigracion(migracion.contenido);
    if (violaciones.length > 0) {
      throw new ErrorGuardaContenido(migracion.nombre, violaciones);
    }
  }

  for (const migracion of plan.pendientes) {
    await aplicarMigracion(cliente, projectRef, migracion);
    notificarAplicada(migracion);
  }

  return plan;
}

export async function obtenerEstado(
  cliente: ClienteManagementApi,
  projectRef: string,
): Promise<FilaLedger[]> {
  return leerLedger(cliente, projectRef);
}
