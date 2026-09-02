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

/** P-07(a): un veredicto sin fallos con casos omitidos es fácil de leer como "batería completa,
 * todo bien" cuando en realidad una parte no se llegó a ejercitar (falta un fixture, el bucket de
 * T-14 todavía no existe, etc.) — `huboFallo` ya excluye correctamente las omisiones de los
 * fallos, pero antes de esta función la CLI solo las mencionaba de pasada, dentro de la misma línea
 * de recuento que el resto. Devuelve un aviso aparte, pensado para imprimirse SIEMPRE que haya
 * alguna omisión (haya fallado algo más o no), o `null` si no hay ninguna que anunciar. */
export function avisoOmisiones(resumen: ResumenPruebasRls): string | null {
  if (resumen.omitidas === 0) {
    return null;
  }
  const evaluadas = resumen.total - resumen.omitidas;
  return (
    `${String(resumen.omitidas)} de ${String(resumen.total)} comprobación(es) se OMITIERON — solo se ejecutaron ` +
    `${String(evaluadas)}. Un veredicto sin fallos no cubre esas rutas: revisa el motivo de cada "OMITIDO" del ` +
    'detalle de arriba antes de dar la cobertura por buena.'
  );
}
