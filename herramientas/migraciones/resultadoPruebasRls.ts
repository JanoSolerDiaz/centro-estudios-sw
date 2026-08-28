/**
 * Interpreta las filas que devuelve `db/pruebas_rls.sql` (T-10, requisito 5) tras ejecutarse contra
 * un proyecto real: decide si `npm run probar-rls` debe terminar con código de salida distinto de
 * cero. Separado de `probarRls.ts` (la CLI, sin test directo, mismo patrón que `migrar.ts`) para que
 * la lógica de "qué cuenta como fallo" se pueda testear sin ninguna conexión.
 */

export interface FilaResultadoRls {
  readonly celda: string;
  readonly esperado: string;
  readonly ok: boolean;
  readonly detalle: string | null;
}

export interface ResumenPruebasRls {
  readonly total: number;
  readonly omitidas: number;
  readonly fallidas: readonly FilaResultadoRls[];
  readonly huboFallo: boolean;
}

/** `esperado` vale literalmente `'OMITIDO'` para las comprobaciones que este entorno no puede
 * ejercitar todavía (falta un fixture, el bucket de T-14 no existe aún, etc.) — se cuentan aparte,
 * nunca como fallo: omitir una comprobación no es lo mismo que haberla dejado en rojo. */
export function resumirPruebasRls(filas: readonly FilaResultadoRls[]): ResumenPruebasRls {
  const omitidas = filas.filter((fila) => fila.esperado === 'OMITIDO');
  const evaluadas = filas.filter((fila) => fila.esperado !== 'OMITIDO');
  const fallidas = evaluadas.filter((fila) => !fila.ok);
  return {
    total: filas.length,
    omitidas: omitidas.length,
    fallidas,
    huboFallo: fallidas.length > 0,
  };
}
