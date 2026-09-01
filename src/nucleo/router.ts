/**
 * Router por hash (T-16, requisito 1): sin bundler ni librería de enrutado (§0.2), resuelve qué
 * pantalla mostrar a partir de `location.hash` — `#/centros`, `#/alumnos`, `#/alumnos/nuevo`,
 * `#/alumnos/<id>`, `#/registros` (T-21), `#/historico` (T-23). `analizarRuta`/`hashDeRuta` son
 * puras y no tocan el DOM;
 * `crearRouter` recibe su `objetivo` por inyección (nunca lee `window` directamente), mismo patrón
 * que `instalarCapturaErrores` (T-05): así se testea con un objeto de mentira, sin `jsdom`.
 *
 * Enruta la aplicación de `administrator` (T-16). Desde T-22, `teacher` gana su propio router
 * (`crearRouterProfesor`/`RutaProfesor`, más abajo): las rutas de las dos aplicaciones no se
 * comparten porque nunca están montadas a la vez (`aplicacion.ts` monta una u otra según el rol),
 * así que un tipo de ruta único con casos de los dos roles solo añadiría confusión a cambio de
 * ningún ahorro real. Lo que sí se comparte es el mecanismo (suscribir a `hashchange`, navegar
 * escribiendo el hash): `crearRouterGenerico`, privado de este módulo, es el motor común y cada
 * `crearRouter*` solo le pasa su propio par `analizar`/`haciaHash`.
 */

/** Subconjunto de `Window` que este módulo necesita. */
export interface ObjetivoRouter {
  readonly location: { hash: string };
  addEventListener(tipo: 'hashchange', escucha: () => void): void;
  removeEventListener(tipo: 'hashchange', escucha: () => void): void;
}

export interface Router<TRuta> {
  obtenerRuta(): TRuta;
  navegar(ruta: TRuta): void;
  /** Devuelve una función para desuscribirse. */
  suscribir(escucha: (ruta: TRuta) => void): () => void;
}

function crearRouterGenerico<TRuta>(
  objetivo: ObjetivoRouter,
  analizar: (hash: string) => TRuta,
  haciaHash: (ruta: TRuta) => string,
): Router<TRuta> {
  const escuchas = new Set<(ruta: TRuta) => void>();

  function manejarCambio(): void {
    const ruta = analizar(objetivo.location.hash);
    for (const escucha of escuchas) {
      escucha(ruta);
    }
  }

  objetivo.addEventListener('hashchange', manejarCambio);

  return {
    obtenerRuta: () => analizar(objetivo.location.hash),
    navegar(ruta) {
      objetivo.location.hash = haciaHash(ruta);
    },
    suscribir(escucha) {
      escuchas.add(escucha);
      return () => {
        escuchas.delete(escucha);
      };
    },
  };
}

export type Ruta =
  | { readonly nombre: 'centros' }
  | { readonly nombre: 'alumnos' }
  | { readonly nombre: 'alumno-nuevo' }
  | { readonly nombre: 'alumno-detalle'; readonly alumnoId: string }
  | { readonly nombre: 'registros' }
  | { readonly nombre: 'historico' };

const RUTA_POR_DEFECTO: Ruta = { nombre: 'alumnos' };

/** Analiza el hash de la URL (con o sin `#` inicial) y devuelve la ruta que le corresponde.
 * Cualquier forma no reconocida —incluida la cadena vacía— cae en la ruta por defecto (listado de
 * alumnos), nunca en una pantalla en blanco (requisito 4 de T-16: "estados... explícitos"). */
export function analizarRuta(hash: string): Ruta {
  const segmentos = hash
    .replace(/^#/, '')
    .split('/')
    .map((segmento) => segmento.trim())
    .filter((segmento) => segmento.length > 0);

  const [primero, segundo] = segmentos;

  if (primero === 'centros') {
    return { nombre: 'centros' };
  }
  if (primero === 'registros') {
    return { nombre: 'registros' };
  }
  if (primero === 'historico') {
    return { nombre: 'historico' };
  }
  if (primero === 'alumnos') {
    if (segundo === undefined) {
      return { nombre: 'alumnos' };
    }
    if (segundo === 'nuevo') {
      return { nombre: 'alumno-nuevo' };
    }
    return { nombre: 'alumno-detalle', alumnoId: decodeURIComponent(segundo) };
  }
  return RUTA_POR_DEFECTO;
}

/** Construye el `hash` (con `#`) que corresponde a `ruta` — inverso de `analizarRuta`, para que
 * quien navega no construya la cadena a mano en cada sitio. */
export function hashDeRuta(ruta: Ruta): string {
  switch (ruta.nombre) {
    case 'centros':
      return '#/centros';
    case 'alumnos':
      return '#/alumnos';
    case 'alumno-nuevo':
      return '#/alumnos/nuevo';
    case 'alumno-detalle':
      return `#/alumnos/${encodeURIComponent(ruta.alumnoId)}`;
    case 'registros':
      return '#/registros';
    case 'historico':
      return '#/historico';
  }
}

export function crearRouter(objetivo: ObjetivoRouter): Router<Ruta> {
  return crearRouterGenerico(objetivo, analizarRuta, hashDeRuta);
}

/**
 * Router de `teacher` (T-22, requisito 2: "desde cada slot, dos accesos directos"). Cuatro rutas:
 * `#/pasar-lista` (T-19), `#/horario` ("mi horario") y `#/registros[/<slotId>]` (T-21) — el
 * segmento de `slotId` es opcional y solo sirve para que "mi horario" pueda enlazar directo a los
 * registros de UN slot concreto sin obligar a la pantalla de registros a exponer nada nuevo a quien
 * navegue sin él (sigue arrancando con "elige un slot…", igual que hasta ahora)— y `#/historico`
 * (T-23, nueva).
 *
 * La ruta por defecto sigue siendo `pasar-lista`, no `horario`: T-19 ya estableció que es la
 * pantalla del día a día (registrar en segundos), y cambiar qué se ve nada más entrar sin que
 * ninguna spec lo pida sería una regresión de comportamiento, no una mejora.
 */
export type RutaProfesor =
  | { readonly nombre: 'pasar-lista' }
  | { readonly nombre: 'horario' }
  | { readonly nombre: 'registros'; readonly slotId?: string }
  | { readonly nombre: 'historico' };

const RUTA_PROFESOR_POR_DEFECTO: RutaProfesor = { nombre: 'pasar-lista' };

export function analizarRutaProfesor(hash: string): RutaProfesor {
  const segmentos = hash
    .replace(/^#/, '')
    .split('/')
    .map((segmento) => segmento.trim())
    .filter((segmento) => segmento.length > 0);

  const [primero, segundo] = segmentos;

  if (primero === 'horario') {
    return { nombre: 'horario' };
  }
  if (primero === 'registros') {
    return segundo === undefined ? { nombre: 'registros' } : { nombre: 'registros', slotId: decodeURIComponent(segundo) };
  }
  if (primero === 'historico') {
    return { nombre: 'historico' };
  }
  if (primero === 'pasar-lista') {
    return { nombre: 'pasar-lista' };
  }
  return RUTA_PROFESOR_POR_DEFECTO;
}

export function hashDeRutaProfesor(ruta: RutaProfesor): string {
  switch (ruta.nombre) {
    case 'pasar-lista':
      return '#/pasar-lista';
    case 'horario':
      return '#/horario';
    case 'registros':
      return ruta.slotId === undefined ? '#/registros' : `#/registros/${encodeURIComponent(ruta.slotId)}`;
    case 'historico':
      return '#/historico';
  }
}

export function crearRouterProfesor(objetivo: ObjetivoRouter): Router<RutaProfesor> {
  return crearRouterGenerico(objetivo, analizarRutaProfesor, hashDeRutaProfesor);
}
