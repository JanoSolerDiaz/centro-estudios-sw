/**
 * Prueba de humo en navegador real (P-39, hallazgo #25 de la auditoría): Chromium headless contra
 * `index.html` servido localmente con un doble de Supabase y la CSP de `_headers` aplicada.
 *
 * Existe porque la suite de `npm test` (jsdom + dobles de `fetch`) estuvo verde mientras la
 * aplicación no podía hablar con Supabase desde ningún navegador (P-36). Aquí se comprueba lo que
 * jsdom no puede: carga de módulos ES con su MIME, CSP sin violaciones, `fetch` real con CORS,
 * Service Worker, IndexedDB y `crypto.subtle`.
 *
 * Uso: `npm run build && npm run humo`. NO forma parte de `npm test` ni de CI: necesita Playwright
 * (nunca dependencia del proyecto: se localiza en `node_modules`, en `PLAYWRIGHT_MODULO` o en la
 * instalación global del entorno) y un Chromium. Sin red ni credenciales: Supabase es un doble
 * (`page.route`) y la clave anónima de `config.js` es de mentira.
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

interface Localizador {
  fill(valor: string): Promise<void>;
  click(): Promise<void>;
  innerText(): Promise<string>;
  waitFor(opciones?: { timeout?: number }): Promise<void>;
}
interface PeticionPw {
  method(): string;
  url(): string;
  postData(): string | null;
  headers(): Record<string, string>;
}
interface RutaPw {
  request(): PeticionPw;
  abort(codigo: string): Promise<void>;
  fulfill(r: { status: number; headers: Record<string, string>; body?: string }): Promise<void>;
}
interface PaginaPw {
  on(evento: string, manejador: (arg: never) => void): void;
  route(patron: string, manejador: (ruta: RutaPw) => Promise<void>): Promise<void>;
  goto(url: string): Promise<unknown>;
  reload(): Promise<unknown>;
  locator(selector: string): Localizador;
  getByText(texto: string, opciones?: { exact?: boolean }): Localizador;
  evaluate<T>(funcion: string): Promise<T>;
  clock: { setFixedTime(t: Date): Promise<void> };
  waitForTimeout(ms: number): Promise<void>;
  context(): { setOffline(v: boolean): Promise<void> };
  addInitScript(script: string): Promise<void>;
}
interface NavegadorPw {
  newPage(): Promise<PaginaPw>;
  close(): Promise<void>;
}
interface MensajeConsola {
  type(): string;
  text(): string;
}
interface Playwright {
  chromium: { launch(o: { executablePath?: string }): Promise<NavegadorPw> };
}

const raiz = resolve(import.meta.dirname, '..');
const HOST_DOBLE = 'doble.supabase.co';
const PERFIL_ID = '11111111-1111-1111-1111-111111111111';

function cargarPlaywright(): Playwright {
  const candidatos = [
    process.env.PLAYWRIGHT_MODULO,
    join(raiz, 'node_modules/'),
    '/opt/node-tools/node_modules/',
    '/opt/node22/lib/node_modules/',
  ].filter((c): c is string => typeof c === 'string' && c.length > 0);
  for (const base of candidatos) {
    try {
      return createRequire(base.endsWith('/') ? base : `${base}/`)('playwright') as Playwright;
    } catch {
      // siguiente candidato
    }
  }
  throw new Error('No se encuentra Playwright. Instálalo o indica su ruta en PLAYWRIGHT_MODULO.');
}

function rutaChromium(): string | undefined {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  const ruta = join(base, 'chromium-1194/chrome-linux/chrome');
  return existsSync(ruta) ? ruta : undefined;
}

/** CSP real de `_headers` (bloque `/*`), con el project ref de producción sustituido por el doble. */
function cabecerasDeHeaders(): Record<string, string> {
  const cabeceras: Record<string, string> = {};
  for (const linea of readFileSync(join(raiz, '_headers'), 'utf8').split('\n')) {
    if (linea.startsWith('/sw.js')) break;
    const m = /^\s+(Content-Security-Policy|X-Content-Type-Options|Referrer-Policy):\s*(.+)$/.exec(linea);
    if (m?.[1] && m[2]) cabeceras[m[1]] = m[2].replaceAll('<PROJECT_REF_PROD>.supabase.co', HOST_DOBLE);
  }
  if (!cabeceras['Content-Security-Policy']) throw new Error('`_headers` no trae Content-Security-Policy.');
  return cabeceras;
}

const MIME: Readonly<Record<string, string>> = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const CONFIG_FALSA = `window.__CONFIG__={SUPABASE_URL:'https://${HOST_DOBLE}',SUPABASE_ANON_KEY:'clave-anonima-de-mentira'};`;

const fallos: string[] = [];
function comprobar(condicion: boolean, descripcion: string): void {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} ${descripcion}`);
  if (!condicion) fallos.push(descripcion);
}

const alumno = (id: string, nombre: string) => ({
  id, nombre, primer_apellido: 'Gil', segundo_apellido: null, avatar_ruta: null, activo: true,
});
const slot = (id: string, alumnoId: string, nombre: string, hora: string) => ({
  id, alumno_id: alumnoId, profesor_id: PERFIL_ID, dia_semana: 2, hora_inicio: `${hora}:00:00`,
  hora_fin: '17:00:00', asignatura_o_grupo: 'Mates', vigente_desde: '2026-01-01', vigente_hasta: null,
  creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', alumno: alumno(alumnoId, nombre),
});
const SLOTS = [
  slot('22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333331', 'Ana', '16:00'),
  slot('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333332', 'Beto', '16:00'),
];
const PERFIL = {
  id: PERFIL_ID, nombre: 'Profe Prueba', rol: 'teacher', activo: true, intentos_fallidos: 0, bloqueado: false,
  creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z',
};

async function main(): Promise<void> {
  if (!existsSync(join(raiz, 'dist/ui/main.js'))) throw new Error('Falta dist/: ejecuta `npm run build` antes.');
  const cabecerasSeguridad = cabecerasDeHeaders();
  const servidor = createServer((q, r) => {
    const ruta = decodeURIComponent(new URL(q.url ?? '/', 'http://x').pathname);
    const relativa = ruta.endsWith('/') ? `${ruta}index.html` : ruta;
    for (const [k, v] of Object.entries(cabecerasSeguridad)) r.setHeader(k, v);
    if (relativa === '/config.js') {
      r.setHeader('content-type', 'text/javascript');
      r.end(CONFIG_FALSA);
      return;
    }
    const fichero = join(raiz, relativa);
    if (!fichero.startsWith(raiz) || !existsSync(fichero)) {
      r.statusCode = 404;
      r.end();
      return;
    }
    r.setHeader('content-type', MIME[extname(fichero)] ?? 'application/octet-stream');
    r.end(readFileSync(fichero));
  });
  await new Promise<void>((ok) => servidor.listen(0, ok));
  const puerto = (servidor.address() as { port: number }).port;
  const origen = `http://localhost:${String(puerto)}`;

  const ejecutable = rutaChromium();
  const navegador = await cargarPlaywright().chromium.launch(ejecutable ? { executablePath: ejecutable } : {});
  try {
    const pagina = await navegador.newPage();
    // Martes 2026-10-06, 16:00 en Madrid: dentro de los dos slots del doble.
    await pagina.clock.setFixedTime(new Date('2026-10-06T14:00:00Z'));

    const erroresConsola: string[] = [];
    const violacionesCsp: string[] = [];
    pagina.on('console', ((m: MensajeConsola) => {
      if (m.type() === 'error') erroresConsola.push(m.text());
    }));
    pagina.on('pageerror', ((e: Error) => erroresConsola.push(`pageerror: ${e.message}`)));
    await pagina.addInitScript(
      `window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));`,
    );

    // `page.route` responde antes de la red: `setOffline` por sí solo no hace fallar los `fetch`
    // interceptados, así que el corte de red se simula también abortándolos.
    let sinRed = false;
    const peticiones: { metodo: string; ruta: string; cuerpo: string | null; cabeceras: Record<string, string> }[] = [];
    await pagina.route(`https://${HOST_DOBLE}/**`, async (ruta) => {
      const rq = ruta.request();
      const url = new URL(rq.url());
      const h = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
        'content-type': 'application/json',
      };
      if (sinRed) return ruta.abort('internetdisconnected');
      if (rq.method() === 'OPTIONS') return ruta.fulfill({ status: 204, headers: h });
      peticiones.push({ metodo: rq.method(), ruta: url.pathname + url.search, cuerpo: rq.postData(), cabeceras: rq.headers() });
      const json = (cuerpo: unknown) => ruta.fulfill({ status: 200, headers: h, body: JSON.stringify(cuerpo) });
      if (url.pathname === '/auth/v1/token') {
        return json({ access_token: 'token-de-prueba', refresh_token: 'r', expires_in: 3600, user: { id: PERFIL_ID } });
      }
      if (url.pathname === '/rest/v1/perfil') return json([PERFIL]);
      if (url.pathname === '/rest/v1/slot_horario') return json(SLOTS);
      if (url.pathname === '/rest/v1/rpc/registrar_asistencia') {
        const cuerpo = JSON.parse(rq.postData() ?? '{}') as Record<string, string | null>;
        return json({
          id: '44444444-4444-4444-4444-444444444444', alumno_id: cuerpo.p_alumno_id, profesor_id: PERFIL_ID,
          registrado_en: '2026-10-06T14:00:00Z', ocurrido_en: '2026-10-06T14:00:00Z', ocurrido_en_salida: null,
          es_retroactivo: false, origen: cuerpo.p_origen, slot_id: cuerpo.p_slot_id, slot_dia_semana: 2,
          slot_hora_inicio: '16:00:00', slot_hora_fin: '17:00:00', slot_asignatura_o_grupo: 'Mates',
          estado: 'presente', motivo_anulacion: null, motivo_justificacion: null, nota_justificacion: null,
          nota: null, actualizado_en: null, actualizado_por: null, peticion_id: cuerpo.p_peticion_id,
        });
      }
      return json([]);
    });

    // 1. Carga de módulos ES y arranque.
    await pagina.goto(`${origen}/index.html`);
    await pagina.locator('#login-email').waitFor();
    comprobar(true, 'los módulos ES cargan y se pinta la pantalla de login');

    // 2. Login.
    await pagina.locator('#login-email').fill('profe@ejemplo.test');
    await pagina.locator('#login-contrasena').fill('contraseña-de-prueba');
    await pagina.getByText('Entrar', { exact: true }).click();
    await pagina.getByText('Sesión iniciada como Profe Prueba.').waitFor();
    comprobar(true, 'login contra GoTrue (doble) y carga del perfil: «Sesión iniciada como Profe Prueba.»');
    const rqLogin = peticiones.find((p) => p.ruta.startsWith('/auth/v1/token'));
    comprobar(rqLogin?.cabeceras.apikey === 'clave-anonima-de-mentira', 'la petición de login lleva la clave anónima (apikey)');

    // 3. Pasar lista a un alumno.
    await pagina.getByText('Ana Gil').waitFor();
    // P-40: jsdom no calcula la cascada; aquí se comprueba que los estilos genéricos por elemento no
    // pisan a los de componente (rejilla en `grid`, tarjeta presente con su fondo verde).
    const displayRejilla = await pagina.evaluate<string>(
      `getComputedStyle(document.querySelector('.rejilla-alumnos')).display`,
    );
    comprobar(displayRejilla === 'grid', `la rejilla de pasar lista es display:grid (${displayRejilla})`);
    // R-40: a ancho de escritorio la rejilla compacta tiene varias columnas y cada icono de la fila de
    // acciones mide al menos 44 px (jsdom no calcula layout).
    const columnas = await pagina.evaluate<number>(
      `getComputedStyle(document.querySelector('.rejilla-alumnos')).gridTemplateColumns.split(' ').length`,
    );
    comprobar(columnas >= 4, `la rejilla de pasar lista tiene varias columnas a ancho de escritorio (${String(columnas)})`);
    const medidasIconos = await pagina.evaluate<string>(
      `JSON.stringify([...document.querySelectorAll('.tarjeta-alumno__acciones .boton-icono')].map(b => { const r = b.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }))`,
    );
    const iconos = JSON.parse(medidasIconos) as number[];
    comprobar(iconos.length > 0 && iconos.every((m) => m >= 44), `cada icono de acción mide al menos 44 px (${medidasIconos})`);
    await pagina.getByText('Ana Gil').click();
    await pagina.waitForTimeout(500);
    const fondoPresente = await pagina.evaluate<string>(
      `(() => { const t = document.querySelector('.tarjeta-alumno-grupo:has(.tarjeta-alumno--presente)'); if (!t) return 'sin tarjeta: ' + [...document.querySelectorAll('.tarjeta-alumno')].map(x => x.className).join(' / '); return t ? getComputedStyle(t).backgroundColor + '|' + getComputedStyle(document.documentElement).getPropertyValue('--gauss-verde-fondo').trim() : 'sin tarjeta'; })()`,
    );
    comprobar(
      !fondoPresente.startsWith('sin tarjeta') && !/^rgba?\(255, 255, 255|^rgba\(0, 0, 0, 0\)/.test(fondoPresente),
      `la tarjeta presente (su marco, R-40) tiene fondo propio, no el blanco genérico (${fondoPresente})`,
    );
    const rpc = peticiones.find((p) => p.ruta === '/rest/v1/rpc/registrar_asistencia');
    comprobar(rpc !== undefined, 'pasar lista envía la RPC registrar_asistencia');
    comprobar(
      rpc?.cabeceras.authorization === 'Bearer token-de-prueba',
      'la RPC viaja con el token de sesión (Authorization: Bearer)',
    );
    comprobar(
      (rpc?.cuerpo ?? '').includes('33333333-3333-3333-3333-333333333331'),
      'la RPC lleva el alumno pulsado',
    );

    // 4. Service Worker.
    const swActivo = await pagina.evaluate<boolean>(
      `navigator.serviceWorker.ready.then(r => r.active !== null && r.scope.startsWith(location.origin))`,
    );
    comprobar(swActivo, 'el Service Worker se registra y se activa');

    // 5. Cola offline en IndexedDB: sin red, marcar a Beto no pierde el registro.
    sinRed = true;
    await pagina.context().setOffline(true);
    await pagina.getByText('Beto Gil').click();
    await pagina.waitForTimeout(800);
    const pendientes = await pagina.evaluate<number>(`(async () => {
      const dbs = (await indexedDB.databases()).filter(d => d.name?.startsWith('gestoracademia-cola-asistencia-offline'));
      let total = 0;
      for (const d of dbs) {
        const db = await new Promise((ok, ko) => { const r = indexedDB.open(d.name); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
        total += await new Promise((ok, ko) => { const r = db.transaction('elementos').objectStore('elementos').count(); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
        db.close();
      }
      return total;
    })()`);
    comprobar(pendientes === 1, `sin red, el registro queda en la cola de IndexedDB (pendientes: ${String(pendientes)})`);
    sinRed = false;
    await pagina.context().setOffline(false);

    // 6. crypto.subtle (sello de integridad, R-34): SHA-256 de "abc".
    const huella = await pagina.evaluate<string>(
      `import('/dist/dominio/selloIntegridad.js').then(m => m.calcularHuellaSha256('abc'))`,
    );
    comprobar(
      huella.replace(/^sha256[:-]/i, '') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      'crypto.subtle calcula la huella SHA-256 del sello (R-34)',
    );

    // 7. CSP y fuentes.
    const csp = await pagina.evaluate<string[]>(`window.__csp`);
    violacionesCsp.push(...csp);
    comprobar(violacionesCsp.length === 0, `sin violaciones de la CSP de _headers (${violacionesCsp.join('; ') || 'ninguna'})`);
    const fuentes = await pagina.evaluate<number>(
      `document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').length)`,
    );
    comprobar(fuentes > 0, `las fuentes autoalojadas cargan bajo la CSP (cargadas: ${String(fuentes)})`);

    // 8. Consola limpia. El corte de red de (5) provoca errores esperados de fetch; se ignoran.
    const inesperados = erroresConsola.filter((e) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e));
    comprobar(inesperados.length === 0, `sin errores de consola inesperados (${inesperados.join(' | ') || 'ninguno'})`);
  } finally {
    await navegador.close();
    servidor.close();
  }
  if (fallos.length > 0) {
    console.error(`\nPrueba de humo: ${String(fallos.length)} comprobación(es) fallida(s).`);
    process.exit(1);
  }
  console.log('\nPrueba de humo: todo en verde.');
}

await main();
