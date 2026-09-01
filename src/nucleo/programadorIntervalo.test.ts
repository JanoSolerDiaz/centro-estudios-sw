import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProgramadorIntervaloDePrueba } from './programadorIntervalo.ts';

void test('cada() no llama a la tarea hasta que se dispara un tick', () => {
  const programador = crearProgramadorIntervaloDePrueba();
  let llamadas = 0;
  programador.cada(1000, () => {
    llamadas += 1;
  });
  assert.equal(llamadas, 0);
});

void test('disparar() ejecuta todas las tareas activas', () => {
  const programador = crearProgramadorIntervaloDePrueba();
  let llamadasA = 0;
  let llamadasB = 0;
  programador.cada(1000, () => {
    llamadasA += 1;
  });
  programador.cada(500, () => {
    llamadasB += 1;
  });

  programador.disparar();
  assert.equal(llamadasA, 1);
  assert.equal(llamadasB, 1);

  programador.disparar();
  assert.equal(llamadasA, 2);
  assert.equal(llamadasB, 2);
});

void test('la función de cancelación detiene esa tarea sin afectar a las demás', () => {
  const programador = crearProgramadorIntervaloDePrueba();
  let llamadasA = 0;
  let llamadasB = 0;
  const cancelarA = programador.cada(1000, () => {
    llamadasA += 1;
  });
  programador.cada(1000, () => {
    llamadasB += 1;
  });

  cancelarA();
  programador.disparar();

  assert.equal(llamadasA, 0);
  assert.equal(llamadasB, 1);
});
