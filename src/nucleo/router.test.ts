import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analizarRuta,
  hashDeRuta,
  crearRouter,
  analizarRutaProfesor,
  hashDeRutaProfesor,
  crearRouterProfesor,
  type ObjetivoRouter,
  type Ruta,
  type RutaProfesor,
} from './router.ts';

void test('analizarRuta: "#/centros" es la ruta de centros', () => {
  assert.deepEqual(analizarRuta('#/centros'), { nombre: 'centros' });
});

void test('analizarRuta: "#/alumnos" es el listado de alumnos', () => {
  assert.deepEqual(analizarRuta('#/alumnos'), { nombre: 'alumnos' });
});

void test('analizarRuta: "#/alumnos/nuevo" es el alta de un alumno nuevo', () => {
  assert.deepEqual(analizarRuta('#/alumnos/nuevo'), { nombre: 'alumno-nuevo' });
});

void test('analizarRuta: "#/alumnos/<id>" es la ficha de ese alumno', () => {
  assert.deepEqual(analizarRuta('#/alumnos/abc-123'), { nombre: 'alumno-detalle', alumnoId: 'abc-123' });
});

void test('analizarRuta: un id con caracteres especiales llega decodificado', () => {
  assert.deepEqual(analizarRuta('#/alumnos/uno%20dos'), { nombre: 'alumno-detalle', alumnoId: 'uno dos' });
});

void test('analizarRuta: cadena vacía cae en la ruta por defecto (listado de alumnos), nunca en blanco', () => {
  assert.deepEqual(analizarRuta(''), { nombre: 'alumnos' });
});

void test('analizarRuta: un hash sin reconocer (ni "centros" ni "alumnos") cae también en la ruta por defecto', () => {
  assert.deepEqual(analizarRuta('#/lo-que-sea'), { nombre: 'alumnos' });
});

void test('analizarRuta: "#/registros" es la pantalla de registros (T-21)', () => {
  assert.deepEqual(analizarRuta('#/registros'), { nombre: 'registros' });
});

void test('analizarRuta: "#/registros/<profesorId>" preselecciona ese profesor (R-20)', () => {
  assert.deepEqual(analizarRuta('#/registros/prof-1'), { nombre: 'registros', profesorId: 'prof-1' });
});

void test('analizarRuta: "#/registros/<profesorId>/<slotId>" preselecciona profesor y slot (R-20)', () => {
  assert.deepEqual(analizarRuta('#/registros/prof-1/slot-abc'), {
    nombre: 'registros',
    profesorId: 'prof-1',
    slotId: 'slot-abc',
  });
});

void test('analizarRuta: "#/registros/<profesorId>/<slotId>/<fecha>" preselecciona los tres (R-20, enlace desde Auditoría)', () => {
  assert.deepEqual(analizarRuta('#/registros/prof-1/slot-abc/2026-09-10'), {
    nombre: 'registros',
    profesorId: 'prof-1',
    slotId: 'slot-abc',
    fecha: '2026-09-10',
  });
});

void test('analizarRuta: "#/registros/<profesorId>" decodifica el id', () => {
  assert.deepEqual(analizarRuta('#/registros/uno%20dos'), { nombre: 'registros', profesorId: 'uno dos' });
});

void test('analizarRuta: "#/auditoria" es el registro de auditoría de cambios (R-20)', () => {
  assert.deepEqual(analizarRuta('#/auditoria'), { nombre: 'auditoria' });
});

void test('analizarRuta: "#/bajas-profesor" es la pantalla de bajas programadas de profesor (R-22)', () => {
  assert.deepEqual(analizarRuta('#/bajas-profesor'), { nombre: 'bajas-profesor' });
});

void test('analizarRuta: "#/bajas-profesor/<profesorId>" preselecciona el profesor (R-22, enlace desde usuarios)', () => {
  assert.deepEqual(analizarRuta('#/bajas-profesor/prof-1'), { nombre: 'bajas-profesor', profesorId: 'prof-1' });
});

void test('analizarRuta: "#/bajas-profesor/<profesorId>" decodifica el id', () => {
  assert.deepEqual(analizarRuta('#/bajas-profesor/uno%20dos'), { nombre: 'bajas-profesor', profesorId: 'uno dos' });
});

void test('analizarRuta: "#/historico" es la pantalla de histórico (T-23)', () => {
  assert.deepEqual(analizarRuta('#/historico'), { nombre: 'historico' });
});

void test('analizarRuta: "#/historico/<alumnoId>" preselecciona el alumno (R-04, enlace desde la ficha)', () => {
  assert.deepEqual(analizarRuta('#/historico/abc-123'), { nombre: 'historico', alumnoId: 'abc-123' });
});

void test('analizarRuta: "#/historico/<alumnoId>" decodifica el id', () => {
  assert.deepEqual(analizarRuta('#/historico/abc%20123'), { nombre: 'historico', alumnoId: 'abc 123' });
});

void test('analizarRuta: "#/usuarios" es la pantalla de administración de usuarios (T-24)', () => {
  assert.deepEqual(analizarRuta('#/usuarios'), { nombre: 'usuarios' });
});

void test('analizarRuta: "#/cierres" es la pantalla del calendario de cierres del centro (R-12)', () => {
  assert.deepEqual(analizarRuta('#/cierres'), { nombre: 'cierres' });
});

void test('analizarRuta: "#/importacion" es la pantalla de importación masiva (R-08)', () => {
  assert.deepEqual(analizarRuta('#/importacion'), { nombre: 'importacion' });
});

void test('analizarRuta: "#/panel" es el panel de centro (R-11)', () => {
  assert.deepEqual(analizarRuta('#/panel'), { nombre: 'panel' });
});

void test('analizarRuta: "#/informe-horas" es el informe de horas por profesor (R-15)', () => {
  assert.deepEqual(analizarRuta('#/informe-horas'), { nombre: 'informe-horas' });
});

void test('analizarRuta: "#/horario-centro" es la vista de horario del centro (R-25)', () => {
  assert.deepEqual(analizarRuta('#/horario-centro'), { nombre: 'horario-centro' });
});

void test('analizarRuta: "#/primeros-pasos" es el asistente de primeros pasos (R-18)', () => {
  assert.deepEqual(analizarRuta('#/primeros-pasos'), { nombre: 'primeros-pasos' });
});

void test('analizarRuta: funciona igual sin el "#" inicial', () => {
  assert.deepEqual(analizarRuta('/centros'), { nombre: 'centros' });
});

void test('hashDeRuta es el inverso exacto de analizarRuta para cada forma de ruta', () => {
  const rutas: readonly Ruta[] = [
    { nombre: 'centros' },
    { nombre: 'alumnos' },
    { nombre: 'alumno-nuevo' },
    { nombre: 'alumno-detalle', alumnoId: 'abc-123' },
    { nombre: 'registros' },
    { nombre: 'registros', profesorId: 'prof-1' },
    { nombre: 'registros', profesorId: 'prof-1', slotId: 'slot-abc' },
    { nombre: 'registros', profesorId: 'prof-1', slotId: 'slot-abc', fecha: '2026-09-10' },
    { nombre: 'historico' },
    { nombre: 'historico', alumnoId: 'abc-123' },
    { nombre: 'usuarios' },
    { nombre: 'cierres' },
    { nombre: 'importacion' },
    { nombre: 'panel' },
    { nombre: 'horario-centro' },
    { nombre: 'informe-horas' },
    { nombre: 'primeros-pasos' },
    { nombre: 'auditoria' },
    { nombre: 'bajas-profesor' },
    { nombre: 'bajas-profesor', profesorId: 'prof-1' },
  ];
  for (const ruta of rutas) {
    assert.deepEqual(analizarRuta(hashDeRuta(ruta)), ruta);
  }
});

/** Objetivo de mentira cuyo `location.hash` dispara `hashchange` al cambiar, igual que un navegador
 * real — necesario para que `router.navegar()` se pueda probar sin `jsdom`. */
function crearObjetivoDePrueba(hashInicial: string): ObjetivoRouter {
  let hashActual = hashInicial;
  const escuchas = new Set<() => void>();
  return {
    location: {
      get hash() {
        return hashActual;
      },
      set hash(valor: string) {
        hashActual = valor;
        for (const escucha of escuchas) {
          escucha();
        }
      },
    },
    addEventListener: (_tipo, escucha) => {
      escuchas.add(escucha);
    },
    removeEventListener: (_tipo, escucha) => {
      escuchas.delete(escucha);
    },
  };
}

void test('obtenerRuta() refleja el hash actual del objetivo', () => {
  const objetivo = crearObjetivoDePrueba('#/centros');
  const router = crearRouter(objetivo);
  assert.deepEqual(router.obtenerRuta(), { nombre: 'centros' });
});

void test('navegar() cambia el hash del objetivo y notifica a los suscriptores', () => {
  const objetivo = crearObjetivoDePrueba('#/alumnos');
  const router = crearRouter(objetivo);
  const recibidas: Ruta[] = [];
  router.suscribir((ruta) => recibidas.push(ruta));

  router.navegar({ nombre: 'alumno-detalle', alumnoId: 'x1' });

  assert.equal(objetivo.location.hash, '#/alumnos/x1');
  assert.deepEqual(recibidas, [{ nombre: 'alumno-detalle', alumnoId: 'x1' }]);
});

void test('navegar() a registros con profesorId, slotId y fecha cambia el hash con los tres segmentos (R-20)', () => {
  const objetivo = crearObjetivoDePrueba('#/alumnos');
  const router = crearRouter(objetivo);
  const recibidas: Ruta[] = [];
  router.suscribir((ruta) => recibidas.push(ruta));

  router.navegar({ nombre: 'registros', profesorId: 'prof-1', slotId: 'slot-1', fecha: '2026-09-10' });

  assert.equal(objetivo.location.hash, '#/registros/prof-1/slot-1/2026-09-10');
  assert.deepEqual(recibidas, [{ nombre: 'registros', profesorId: 'prof-1', slotId: 'slot-1', fecha: '2026-09-10' }]);
});

void test('un cambio de hash externo (no por navegar()) también notifica a los suscriptores', () => {
  const objetivo = crearObjetivoDePrueba('#/alumnos');
  const router = crearRouter(objetivo);
  const recibidas: Ruta[] = [];
  router.suscribir((ruta) => recibidas.push(ruta));

  objetivo.location.hash = '#/centros';

  assert.deepEqual(recibidas, [{ nombre: 'centros' }]);
});

void test('la función devuelta por suscribir() desuscribe', () => {
  const objetivo = crearObjetivoDePrueba('#/alumnos');
  const router = crearRouter(objetivo);
  const recibidas: Ruta[] = [];
  const desuscribir = router.suscribir((ruta) => recibidas.push(ruta));

  desuscribir();
  objetivo.location.hash = '#/centros';

  assert.deepEqual(recibidas, []);
});

// --- Router de teacher (T-22): pasar lista, mi horario y registros[/slotId] --------------------

void test('analizarRutaProfesor: "#/pasar-lista" es pasar lista (T-19)', () => {
  assert.deepEqual(analizarRutaProfesor('#/pasar-lista'), { nombre: 'pasar-lista' });
});

void test('analizarRutaProfesor: "#/horario" es mi horario (T-22)', () => {
  assert.deepEqual(analizarRutaProfesor('#/horario'), { nombre: 'horario' });
});

void test('analizarRutaProfesor: "#/registros" sin slot es la pantalla de registros sin preselección', () => {
  assert.deepEqual(analizarRutaProfesor('#/registros'), { nombre: 'registros' });
});

void test('analizarRutaProfesor: "#/registros/<slotId>" preselecciona ese slot', () => {
  assert.deepEqual(analizarRutaProfesor('#/registros/slot-abc'), { nombre: 'registros', slotId: 'slot-abc' });
});

void test('analizarRutaProfesor: "#/historico" es la pantalla de histórico (T-23)', () => {
  assert.deepEqual(analizarRutaProfesor('#/historico'), { nombre: 'historico' });
});

void test('analizarRutaProfesor: "#/cierres" es la pantalla del calendario de cierres del centro (R-12)', () => {
  assert.deepEqual(analizarRutaProfesor('#/cierres'), { nombre: 'cierres' });
});

void test('analizarRutaProfesor: "#/mis-horas" es el informe de horas propias (R-19)', () => {
  assert.deepEqual(analizarRutaProfesor('#/mis-horas'), { nombre: 'mis-horas' });
});

void test('analizarRutaProfesor: un slotId con caracteres especiales llega decodificado', () => {
  assert.deepEqual(analizarRutaProfesor('#/registros/uno%20dos'), { nombre: 'registros', slotId: 'uno dos' });
});

void test('analizarRutaProfesor: "#/registros/<slotId>/<fecha>" preselecciona slot Y fecha (R-13)', () => {
  assert.deepEqual(analizarRutaProfesor('#/registros/slot-abc/2026-09-07'), {
    nombre: 'registros',
    slotId: 'slot-abc',
    fecha: '2026-09-07',
  });
});

void test('analizarRutaProfesor: cadena vacía cae en pasar lista, no en mi horario ni en blanco', () => {
  assert.deepEqual(analizarRutaProfesor(''), { nombre: 'pasar-lista' });
});

void test('analizarRutaProfesor: un hash sin reconocer cae también en pasar lista', () => {
  assert.deepEqual(analizarRutaProfesor('#/lo-que-sea'), { nombre: 'pasar-lista' });
});

void test('hashDeRutaProfesor es el inverso exacto de analizarRutaProfesor para cada forma de ruta', () => {
  const rutas: readonly RutaProfesor[] = [
    { nombre: 'pasar-lista' },
    { nombre: 'horario' },
    { nombre: 'registros' },
    { nombre: 'registros', slotId: 'slot-abc' },
    { nombre: 'registros', slotId: 'slot-abc', fecha: '2026-09-07' },
    { nombre: 'historico' },
    { nombre: 'cierres' },
    { nombre: 'mis-horas' },
  ];
  for (const ruta of rutas) {
    assert.deepEqual(analizarRutaProfesor(hashDeRutaProfesor(ruta)), ruta);
  }
});

void test('crearRouterProfesor: obtenerRuta() refleja el hash actual del objetivo', () => {
  const objetivo = crearObjetivoDePrueba('#/horario');
  const router = crearRouterProfesor(objetivo);
  assert.deepEqual(router.obtenerRuta(), { nombre: 'horario' });
});

void test('crearRouterProfesor: navegar() a registros con slotId cambia el hash y notifica', () => {
  const objetivo = crearObjetivoDePrueba('#/pasar-lista');
  const router = crearRouterProfesor(objetivo);
  const recibidas: RutaProfesor[] = [];
  router.suscribir((ruta) => recibidas.push(ruta));

  router.navegar({ nombre: 'registros', slotId: 'slot-1' });

  assert.equal(objetivo.location.hash, '#/registros/slot-1');
  assert.deepEqual(recibidas, [{ nombre: 'registros', slotId: 'slot-1' }]);
});

void test('crearRouterProfesor: navegar() a registros con slotId y fecha cambia el hash con los dos segmentos (R-13)', () => {
  const objetivo = crearObjetivoDePrueba('#/pasar-lista');
  const router = crearRouterProfesor(objetivo);
  const recibidas: RutaProfesor[] = [];
  router.suscribir((ruta) => recibidas.push(ruta));

  router.navegar({ nombre: 'registros', slotId: 'slot-1', fecha: '2026-09-07' });

  assert.equal(objetivo.location.hash, '#/registros/slot-1/2026-09-07');
  assert.deepEqual(recibidas, [{ nombre: 'registros', slotId: 'slot-1', fecha: '2026-09-07' }]);
});

void test('crearRouterProfesor y crearRouter son independientes: cada uno interpreta el hash con su propia gramática', () => {
  const objetivoProfesor = crearObjetivoDePrueba('#/registros');
  const objetivoAdministrador = crearObjetivoDePrueba('#/registros');
  assert.deepEqual(crearRouterProfesor(objetivoProfesor).obtenerRuta(), { nombre: 'registros' });
  assert.deepEqual(crearRouter(objetivoAdministrador).obtenerRuta(), { nombre: 'registros' });
});
