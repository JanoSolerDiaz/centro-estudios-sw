/**
 * Router por hash (T-16, requisito 1): sin bundler ni librería de enrutado (§0.2), resuelve qué
 * pantalla mostrar a partir de `location.hash` — `#/centros`, `#/alumnos`, `#/alumnos/nuevo`,
 * `#/alumnos/<id>`, `#/registros` (T-21). `analizarRuta`/`hashDeRuta` son puras y no tocan el DOM;
 * `crearRouter` recibe su `objetivo` por inyección (nunca lee `window` directamente), mismo patrón
 * que `instalarCapturaErrores` (T-05): así se testea con un objeto de mentira, sin `jsdom`.
 *
 * Solo enruta la parte de la aplicación de `administrator` (T-16 es "Interfaz de gestión DEL
 * ADMINISTRADOR", ver su título en `HOJA_DE_RUTA.md`); `teacher` tiene su propia navegación, más
 * simple, dentro de `aplicacion.ts#mostrarAppProfesor` (T-21, sin hash propio todavía — T-22
 * decidirá si le hace falta uno de verdad al llegar "mi horario").
 */

export type Ruta =
  | { readonly nombre: 'centros' }
  | { readonly nombre: 'alumnos' }
  | { readonly nombre: 'alumno-nuevo' }
  | { readonly nombre: 'alumno-detalle'; readonly alumnoId: string }
  | { readonly nombre: 'registros' };

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
  }
}

/** Subconjunto de `Window` que este módulo necesita. */
export interface ObjetivoRouter {
  readonly location: { hash: string };
  addEventListener(tipo: 'hashchange', escucha: () => void): void;
  removeEventListener(tipo: 'hashchange', escucha: () => void): void;
}

export interface Router {
  obtenerRuta(): Ruta;
  navegar(ruta: Ruta): void;
  /** Devuelve una función para desuscribirse. */
  suscribir(escucha: (ruta: Ruta) => void): () => void;
}

export function crearRouter(objetivo: ObjetivoRouter): Router {
  const escuchas = new Set<(ruta: Ruta) => void>();

  function manejarCambio(): void {
    const ruta = analizarRuta(objetivo.location.hash);
    for (const escucha of escuchas) {
      escucha(ruta);
    }
  }

  objetivo.addEventListener('hashchange', manejarCambio);

  return {
    obtenerRuta: () => analizarRuta(objetivo.location.hash),
    navegar(ruta) {
      objetivo.location.hash = hashDeRuta(ruta);
    },
    suscribir(escucha) {
      escuchas.add(escucha);
      return () => {
        escuchas.delete(escucha);
      };
    },
  };
}
