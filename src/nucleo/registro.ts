/**
 * Logger centralizado (T-02). Único punto autorizado a usar `console.*` en `src/` — ver el
 * override de `eslint.config.js` para esta ruta. Toda entrada pasa por `depurarContexto` antes de
 * llegar al sumidero: el logger nunca debe emitir datos personales de alumnos ni de personas de
 * referencia, ni rutas de avatar, ni tokens, ni claves (§0.2 de HOJA_DE_RUTA.md). El texto de
 * `mensaje` no se depura: es una cadena fija escrita por quien programa, nunca datos de usuario.
 */

export type NivelLog = 'debug' | 'info' | 'warn' | 'error';
export type NivelLogOSilencio = NivelLog | 'silencioso';

const ORDEN_NIVELES: Readonly<Record<NivelLogOSilencio, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silencioso: 4,
};

export interface EntradaLog {
  readonly nivel: NivelLog;
  readonly instante: string;
  readonly mensaje: string;
  readonly contexto: Readonly<Record<string, unknown>> | undefined;
}

export type SumideroLog = (entrada: EntradaLog) => void;

// Campos cuyo NOMBRE basta para descartar el valor entero: datos personales del alumno o de sus
// personas de referencia (nombre, apellidos, email, teléfono), ruta de avatar, y cualquier cosa
// con pinta de secreto (token, contraseña, clave, cabecera de autorización).
const PATRON_CLAVE_SENSIBLE =
  /(nombre|apellido|email|correo|tel[eé]fono|phone|direcci[oó]n|avatar|foto|ruta|token|password|contrase|secret|clave|key|credencial|authorization|bearer|service[_-]?role)/i;

// Defensa adicional por FORMA del valor, independiente del nombre de la clave: un JWT
// (tres segmentos base64url separados por puntos) o una cadena opaca larga típica de un token o
// clave de API.
const PATRON_VALOR_JWT = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;
const PATRON_VALOR_OPACO_LARGO = /^[A-Za-z0-9_-]{32,}$/;

const MARCADOR_REDACTADO = '[REDACTADO]';
const PROFUNDIDAD_MAXIMA = 6;

function pareceSecreto(valor: string): boolean {
  return PATRON_VALOR_JWT.test(valor) || PATRON_VALOR_OPACO_LARGO.test(valor);
}

function depurarValor(valor: unknown, profundidad: number): unknown {
  if (profundidad > PROFUNDIDAD_MAXIMA) {
    return '[PROFUNDIDAD_MAXIMA]';
  }
  if (Array.isArray(valor)) {
    return valor.map((elemento) => depurarValor(elemento, profundidad + 1));
  }
  if (valor !== null && typeof valor === 'object') {
    const resultado: Record<string, unknown> = {};
    for (const [clave, valorDeClave] of Object.entries(valor as Record<string, unknown>)) {
      resultado[clave] = PATRON_CLAVE_SENSIBLE.test(clave)
        ? MARCADOR_REDACTADO
        : depurarValor(valorDeClave, profundidad + 1);
    }
    return resultado;
  }
  if (typeof valor === 'string' && pareceSecreto(valor)) {
    return MARCADOR_REDACTADO;
  }
  return valor;
}

/** Expuesta para poder testear la depuración de forma aislada, sin pasar por un logger. */
export function depurarContexto(contexto: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return depurarValor(contexto, 0) as Record<string, unknown>;
}

const ESCRITOR_POR_NIVEL: Readonly<Record<NivelLog, (...datos: unknown[]) => void>> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function sumideroConsola(entrada: EntradaLog): void {
  const escribir = ESCRITOR_POR_NIVEL[entrada.nivel];
  const linea = `[${entrada.instante}] ${entrada.nivel.toUpperCase()} ${entrada.mensaje}`;
  if (entrada.contexto) {
    escribir(linea, entrada.contexto);
  } else {
    escribir(linea);
  }
}

export interface Logger {
  debug(mensaje: string, contexto?: Record<string, unknown>): void;
  info(mensaje: string, contexto?: Record<string, unknown>): void;
  warn(mensaje: string, contexto?: Record<string, unknown>): void;
  error(mensaje: string, contexto?: Record<string, unknown>): void;
  /** Nivel mínimo que se emite; `'silencioso'` descarta cualquier entrada. Usar en tests. */
  configurarNivel(nivel: NivelLogOSilencio): void;
}

/**
 * Fábrica del logger: permite inyectar el sumidero (por defecto, la consola) y el nivel inicial,
 * para poder testear sin tocar la consola real y para silenciarlo en tests que no lo necesiten.
 */
export function crearLogger(
  sumidero: SumideroLog = sumideroConsola,
  nivelInicial: NivelLogOSilencio = 'info',
): Logger {
  let nivelActual: NivelLogOSilencio = nivelInicial;

  function registrar(nivel: NivelLog, mensaje: string, contexto?: Record<string, unknown>): void {
    if (ORDEN_NIVELES[nivel] < ORDEN_NIVELES[nivelActual]) {
      return;
    }
    sumidero({
      nivel,
      instante: new Date().toISOString(),
      mensaje,
      contexto: contexto ? depurarContexto(contexto) : undefined,
    });
  }

  return {
    debug: (mensaje, contexto) => {
      registrar('debug', mensaje, contexto);
    },
    info: (mensaje, contexto) => {
      registrar('info', mensaje, contexto);
    },
    warn: (mensaje, contexto) => {
      registrar('warn', mensaje, contexto);
    },
    error: (mensaje, contexto) => {
      registrar('error', mensaje, contexto);
    },
    configurarNivel: (nivel) => {
      nivelActual = nivel;
    },
  };
}

/** Instancia única para el resto de la aplicación. En tests, prefiere `crearLogger` con un
 * sumidero propio para poder inspeccionar las entradas sin pasar por la consola real. */
export const logger = crearLogger();
