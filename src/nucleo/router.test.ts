import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarRuta, hashDeRuta, crearRouter, type ObjetivoRouter, type Ruta } from './router.ts';

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

void test('analizarRuta: funciona igual sin el "#" inicial', () => {
  assert.deepEqual(analizarRuta('/centros'), { nombre: 'centros' });
});

void test('hashDeRuta es el inverso exacto de analizarRuta para cada forma de ruta', () => {
  const rutas: readonly Ruta[] = [
    { nombre: 'centros' },
    { nombre: 'alumnos' },
    { nombre: 'alumno-nuevo' },
    { nombre: 'alumno-detalle', alumnoId: 'abc-123' },
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
