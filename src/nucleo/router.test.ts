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

void test('analizarRuta: "#/historico" es la pantalla de histórico (T-23)', () => {
  assert.deepEqual(analizarRuta('#/historico'), { nombre: 'historico' });
});

void test('analizarRuta: "#/usuarios" es la pantalla de administración de usuarios (T-24)', () => {
  assert.deepEqual(analizarRuta('#/usuarios'), { nombre: 'usuarios' });
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
    { nombre: 'historico' },
    { nombre: 'usuarios' },
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

void test('analizarRutaProfesor: un slotId con caracteres especiales llega decodificado', () => {
  assert.deepEqual(analizarRutaProfesor('#/registros/uno%20dos'), { nombre: 'registros', slotId: 'uno dos' });
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
    { nombre: 'historico' },
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

void test('crearRouterProfesor y crearRouter son independientes: cada uno interpreta el hash con su propia gramática', () => {
  const objetivoProfesor = crearObjetivoDePrueba('#/registros');
  const objetivoAdministrador = crearObjetivoDePrueba('#/registros');
  assert.deepEqual(crearRouterProfesor(objetivoProfesor).obtenerRuta(), { nombre: 'registros' });
  assert.deepEqual(crearRouter(objetivoAdministrador).obtenerRuta(), { nombre: 'registros' });
});
