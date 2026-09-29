import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFuenteActividadNavegador, crearVigilanteInactividad, type FuenteActividad } from './vigilanteInactividad.ts';
import { crearProgramadorIntervaloDePrueba } from './programadorIntervalo.ts';
import type { Reloj } from './reloj.ts';

const MIN = 60 * 1000;

function crearEscenario(plazoMs: number, contarPendientes?: () => Promise<number>) {
  let ahoraMs = 1_000_000;
  const reloj: Reloj = { ahora: () => new Date(ahoraMs) };
  const programador = crearProgramadorIntervaloDePrueba();
  const actividad = new Set<() => void>();
  const primerPlano = new Set<() => void>();
  const fuente: FuenteActividad = {
    alActividad: (e) => {
      actividad.add(e);
      return () => actividad.delete(e);
    },
    alVolverAPrimerPlano: (e) => {
      primerPlano.add(e);
      return () => primerPlano.delete(e);
    },
  };
  const avisos: { segundos: number; pendientes: number }[] = [];
  let ocultados = 0;
  let caducados = 0;
  const vigilante = crearVigilanteInactividad({
    plazoMs,
    reloj,
    programador,
    fuente,
    ...(contarPendientes ? { contarPendientes } : {}),
    mostrarAviso: (segundos, pendientes) => avisos.push({ segundos, pendientes }),
    ocultarAviso: () => {
      ocultados += 1;
    },
    alCaducar: () => {
      caducados += 1;
    },
  });
  return {
    vigilante,
    avisos,
    avanzar(ms: number) {
      ahoraMs += ms;
    },
    tick: () => { programador.disparar(); },
    tocar: () => {
      [...actividad].forEach((e) => {
        e();
      });
    },
    volverAPrimerPlano: () => {
      [...primerPlano].forEach((e) => {
        e();
      });
    },
    ocultados: () => ocultados,
    caducados: () => caducados,
    oyentes: () => actividad.size + primerPlano.size,
  };
}

void test('teacher inactivo 59 min: aviso, sin cierre; al llegar a 60 min cierra una sola vez', () => {
  const e = crearEscenario(60 * MIN);
  e.avanzar(58 * MIN);
  e.tick();
  assert.equal(e.avisos.length, 0);
  e.avanzar(1 * MIN);
  e.tick();
  assert.deepEqual(e.avisos.at(-1), { segundos: 60, pendientes: 0 });
  assert.equal(e.caducados(), 0);
  e.avanzar(1 * MIN);
  e.tick();
  e.tick();
  assert.equal(e.caducados(), 1);
});

void test('«Seguir conectado» durante el aviso reinicia el contador y oculta el aviso', () => {
  const e = crearEscenario(20 * MIN);
  e.avanzar(19 * MIN + 30_000);
  e.tick();
  assert.equal(e.avisos.at(-1)?.segundos, 30);
  e.vigilante.continuar();
  assert.equal(e.ocultados(), 1);
  e.avanzar(18 * MIN);
  e.tick();
  assert.equal(e.caducados(), 0);
  assert.equal(e.avisos.length, 1, 'no hay aviso nuevo a 18 min del reinicio');
  e.avanzar(2 * MIN);
  e.tick();
  assert.equal(e.caducados(), 1);
});

void test('cualquier interacción durante el aviso también lo cancela', () => {
  const e = crearEscenario(20 * MIN);
  e.avanzar(19 * MIN + 10_000);
  e.tick();
  e.tocar();
  assert.equal(e.ocultados(), 1);
  e.avanzar(10 * MIN);
  e.tick();
  assert.equal(e.caducados(), 0);
});

void test('la actividad reinicia el plazo: toques cada 10 min nunca cierran a un administrator', () => {
  const e = crearEscenario(20 * MIN);
  for (let i = 0; i < 10; i += 1) {
    e.avanzar(10 * MIN);
    e.tick();
    e.tocar();
  }
  assert.equal(e.caducados(), 0);
});

void test('pestaña que vuelve a primer plano pasado el plazo cierra al instante, sin esperar al temporizador', () => {
  const e = crearEscenario(20 * MIN);
  e.avanzar(3 * 60 * MIN);
  e.volverAPrimerPlano();
  assert.equal(e.caducados(), 1);
});

void test('un toque tras el plazo (temporizador retrasado) cierra la sesión, no la rescata', () => {
  const e = crearEscenario(20 * MIN);
  e.avanzar(25 * MIN);
  e.tocar();
  assert.equal(e.caducados(), 1);
});

void test('tras caducar se dejan de escuchar los eventos y no se vuelve a cerrar', () => {
  const e = crearEscenario(20 * MIN);
  e.avanzar(21 * MIN);
  e.tick();
  assert.equal(e.oyentes(), 0);
  e.tocar();
  e.tick();
  assert.equal(e.caducados(), 1);
});

void test('detener cancela todo y oculta un aviso visible', () => {
  const e = crearEscenario(20 * MIN);
  e.avanzar(19 * MIN + 30_000);
  e.tick();
  e.vigilante.detener();
  assert.equal(e.ocultados(), 1);
  assert.equal(e.oyentes(), 0);
  e.avanzar(10 * MIN);
  e.tick();
  assert.equal(e.caducados(), 0);
});

void test('el aviso informa de los registros sin enviar de la cola (a partir del segundo tick)', async () => {
  const e = crearEscenario(60 * MIN, () => Promise.resolve(3));
  e.avanzar(59 * MIN + 30_000);
  e.tick();
  await new Promise((r) => setTimeout(r, 0));
  e.tick();
  assert.equal(e.avisos.at(-1)?.pendientes, 3);
});

void test('si contar pendientes falla, el aviso sigue saliendo con 0', async () => {
  const e = crearEscenario(20 * MIN, () => Promise.reject(new Error('indexeddb')));
  e.avanzar(19 * MIN + 30_000);
  e.tick();
  await new Promise((r) => setTimeout(r, 0));
  e.tick();
  assert.equal(e.avisos.at(-1)?.pendientes, 0);
});

void test('fuente real: los cuatro eventos de actividad llaman al oyente, y visibilitychange solo si está visible', () => {
  const oyentes = new Map<string, () => void>();
  let visibilidad: DocumentVisibilityState = 'hidden';
  const documento = {
    get visibilityState() {
      return visibilidad;
    },
    addEventListener: (tipo: string, e: () => void) => {
      oyentes.set(tipo, e);
    },
    removeEventListener: (tipo: string) => {
      oyentes.delete(tipo);
    },
  };
  const fuente = crearFuenteActividadNavegador(documento);
  let actividad = 0;
  let primerPlano = 0;
  const cancelar = fuente.alActividad(() => {
    actividad += 1;
  });
  fuente.alVolverAPrimerPlano(() => {
    primerPlano += 1;
  });
  for (const tipo of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
    oyentes.get(tipo)?.();
  }
  assert.equal(actividad, 4);
  oyentes.get('visibilitychange')?.();
  assert.equal(primerPlano, 0);
  visibilidad = 'visible';
  oyentes.get('visibilitychange')?.();
  assert.equal(primerPlano, 1);
  cancelar();
  assert.equal(oyentes.has('keydown'), false);
});
