/**
 * Configuración de entorno del cliente (T-08, requisito 1): la URL del proyecto Supabase y la
 * clave anónima, las dos únicas credenciales admitidas en el paquete del navegador (§0.2 de
 * `HOJA_DE_RUTA.md`) — el access token de la Management API pertenece solo al runner de
 * migraciones (`herramientas/`) y nunca llega aquí.
 *
 * Sin bundler no hay `import.meta.env`: la convención elegida es que `index.html` cargue, ANTES de
 * `dist/ui/main.js`, un script plano `config.js` (no `.ts`, no pasa por `tsc`) que asigna
 * `window.__CONFIG__ = { SUPABASE_URL: '...', SUPABASE_ANON_KEY: '...' }`. Ese fichero se genera en
 * el despliegue a partir de las variables de entorno del hosting (proveedor todavía `<pendiente>`,
 * T-25) y NUNCA se commitea — mismo régimen que `.env.local`. `config.ejemplo.js`, commiteado, es
 * la plantilla sin valores, igual que `.env.ejemplo`. Ver `DECISIONES_TECNICAS.md` para la
 * justificación completa de este mecanismo.
 *
 * `leerConfiguracionEntorno` recibe el objeto ya leído (normalmente `window.__CONFIG__`) como
 * parámetro, nunca lee un global directamente — mismo patrón de inyección que
 * `instalarCapturaErrores` (T-05) con `window`, para poder testear sin `jsdom`.
 */

export interface ConfiguracionEntorno {
  readonly urlBase: string;
  readonly claveAnonima: string;
}

export class ErrorConfiguracionFaltante extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorConfiguracionFaltante';
  }
}

function comoTextoNoVacio(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor : undefined;
}

/** Valida y normaliza la configuración de entorno a partir de `origen` (normalmente
 * `window.__CONFIG__`, ausente si `config.js` no se ha desplegado). Falla con un mensaje claro en
 * español, en vez de dejar que el resto de la aplicación arranque con una URL o una clave vacías y
 * falle más tarde con un error de red críptico. */
export function leerConfiguracionEntorno(origen: unknown): ConfiguracionEntorno {
  if (typeof origen !== 'object' || origen === null) {
    throw new ErrorConfiguracionFaltante(
      'Falta la configuración de la aplicación (config.js). Copia config.ejemplo.js a config.js y ' +
        'rellena SUPABASE_URL y SUPABASE_ANON_KEY, o comprueba que el despliegue lo ha generado.',
    );
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = origen as Record<string, unknown>;
  const urlBase = comoTextoNoVacio(SUPABASE_URL);
  const claveAnonima = comoTextoNoVacio(SUPABASE_ANON_KEY);

  const faltantes = [
    urlBase === undefined ? 'SUPABASE_URL' : undefined,
    claveAnonima === undefined ? 'SUPABASE_ANON_KEY' : undefined,
  ].filter((nombre): nombre is string => nombre !== undefined);

  if (faltantes.length > 0 || urlBase === undefined || claveAnonima === undefined) {
    throw new ErrorConfiguracionFaltante(
      `Falta configuración de la aplicación: ${faltantes.join(', ')}. Revisa config.js (ver config.ejemplo.js).`,
    );
  }

  return { urlBase: urlBase.replace(/\/+$/, ''), claveAnonima };
}
