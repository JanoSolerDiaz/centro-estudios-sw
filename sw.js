/**
 * Service Worker de GestorAcademia (R-09, requisitos 2-4: aplicación instalable y arranque sin
 * red). JavaScript plano, sin `tsc` — vive en la raíz para que su ámbito (`scope`) por defecto
 * cubra todo el origen, y no puede compartir el `tsconfig.json` de `src/` (ese usa `lib: DOM`,
 * incompatible con los globales de un Service Worker — `self` como `ServiceWorkerGlobalScope`,
 * `caches`, `clients` — que exigirían `lib: WebWorker`). Mismo criterio que `config.ejemplo.js`
 * (T-08): JavaScript plano cargado tal cual, con su propio hueco en `eslint.config.js` para sus
 * globales, sin las restricciones de `src/**` (que son guardas de código de NAVEGADOR — este
 * fichero sí es navegador, pero un contexto distinto del de `window`).
 *
 * REGLA para quien toque esto en el futuro (requisito 3 de R-09): este es el ÚNICO Service Worker
 * del proyecto. Cualquier necesidad nueva de caché o de trabajo en segundo plano se añade AQUÍ,
 * nunca en un fichero paralelo — dos Service Workers registrados sobre el mismo origen compiten
 * por el mismo `CacheStorage` y son fuente de fallos difíciles de reproducir.
 *
 * Estrategia (requisito 2): sin bundler (§0.2), el grafo de módulos ES de `dist/` se sirve como
 * muchos ficheros `.js` sueltos, no uno solo — no hay forma de enumerarlos todos de antemano sin
 * un paso de build que los liste. En vez de precachear una lista completa, se precachea solo el
 * cascarón mínimo conocido (`CASCARON`, best-effort: un fichero que falte, p. ej. `config.js` en
 * un entorno sin desplegar, no aborta el resto) y toda petición GET del mismo origen que SÍ llega
 * a producirse se cachea en cuanto se resuelve por red — así, tras una primera visita con
 * conexión, todo lo que esa visita cargó queda disponible offline, que es exactamente el criterio
 * de aceptación de R-09 ("abrir la aplicación en modo avión TRAS UNA VISITA PREVIA").
 *
 * "Red primero, caché como red de seguridad" (no "caché primero"): cada petición intenta la red
 * ANTES que la caché, así que con conexión el usuario siempre ve el despliegue más reciente —
 * `develop` despliega varias veces al día (§0.1) y una app que sirviera JS cacheado con conexión
 * de sobra sería peor que no tener Service Worker. La caché solo entra cuando la red falla.
 *
 * Las peticiones a Supabase (otro origen: PostgREST/GoTrue/Storage) nunca se interceptan — pasan
 * directas a la red, sin caché, sin fallback: los datos (alumnos, slots, asistencia) siguen
 * exigiendo red o la cola de R-07, tal como pide el requisito 2 literalmente.
 */

const PREFIJO_CACHE = 'gestoracademia-cascaron-';
const NOMBRE_CACHE = `${PREFIJO_CACHE}v1`;

const CASCARON = ['./', './index.html', './manifest.json', './config.js', './iconos/icono-192.png', './iconos/icono-512.png', './iconos/icono-512-maskable.png', './iconos/icono-apple-touch.png'];

const RESPUESTA_SIN_RED_NI_CACHE = new Response(
  '<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>GestorAcademia</title></head>' +
    '<body><p>Sin conexión y sin ninguna versión guardada todavía. Conéctate una vez para poder abrir la aplicación sin red la próxima vez.</p></body></html>',
  { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } },
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE).then((cache) => Promise.all(CASCARON.map((url) => cache.add(url).catch(() => undefined)))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((nombre) => nombre.startsWith(PREFIJO_CACHE) && nombre !== NOMBRE_CACHE).map((nombre) => caches.delete(nombre))))
      .then(() => self.clients.claim()),
  );
});

// El cliente (`nucleo/registroServiceWorker.ts`) manda esto tras avisar de la versión nueva y que
// la persona confirme "actualizar": sin este mensaje, el Service Worker nuevo se queda "esperando"
// (estándar de la plataforma) hasta que se cierren todas las pestañas con el antiguo todavía activo.
self.addEventListener('message', (event) => {
  if (event.data && event.data.tipo === 'GESTORACADEMIA_OMITIR_ESPERA') {
    self.skipWaiting();
  }
});

async function responderRedPrimeroConCache(peticion) {
  const cache = await caches.open(NOMBRE_CACHE);
  try {
    const respuestaRed = await fetch(peticion);
    // Solo se cachean respuestas correctas: una 404/500 no debe sustituir una copia buena anterior.
    if (respuestaRed && respuestaRed.ok) {
      await cache.put(peticion, respuestaRed.clone());
    }
    return respuestaRed;
  } catch (error) {
    const enCache = await cache.match(peticion);
    if (enCache) {
      return enCache;
    }
    if (peticion.mode === 'navigate') {
      const indiceCacheado = await cache.match('./index.html');
      return indiceCacheado || RESPUESTA_SIN_RED_NI_CACHE;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const peticion = event.request;
  if (peticion.method !== 'GET' || !peticion.url.startsWith(self.location.origin)) {
    return; // Otro método, u otro origen (Supabase): sin intervención, siempre red directa.
  }
  event.respondWith(responderRedPrimeroConCache(peticion));
});
