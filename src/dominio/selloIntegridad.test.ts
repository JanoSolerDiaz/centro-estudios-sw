import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularHuellaSha256,
  jsonCanonico,
  sellarDocumento,
  verificarDocumentoSellado,
} from './selloIntegridad.ts';
import { construirDatosExportacionCentro } from './exportacionCentro.ts';

const DATOS = {
  generadoEnLegible: '29/09/2026 10:00',
  generadoPor: 'Admin',
  alumnos: [{ nombreCompleto: 'Ana Pérez', activo: true, personas: [{ telefono: '600', email: null }] }],
};

void test('calcularHuellaSha256: vector conocido de SHA-256("abc")', async () => {
  assert.equal(await calcularHuellaSha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

void test('jsonCanonico: ordena claves en cualquier nivel, sin espacios, respeta el orden de arrays', () => {
  assert.equal(jsonCanonico({ b: 1, a: { d: [3, 1], c: null } }), '{"a":{"c":null,"d":[3,1]},"b":1}');
  assert.equal(jsonCanonico({ a: undefined, b: 'x' }), '{"b":"x"}');
});

void test('sellar y verificar inmediatamente: coincide', async () => {
  const { json, huella } = await sellarDocumento(DATOS);
  const informe = await verificarDocumentoSellado(json, undefined);
  assert.equal(informe.resultado, 'coincide');
  assert.equal(informe.huellaCalculada, huella);
  assert.equal((JSON.parse(json) as { sello: { algoritmo: string } }).sello.algoritmo, 'SHA-256');
});

void test('cambiar un solo carácter de un dato invalida el sello', async () => {
  const { json } = await sellarDocumento(DATOS);
  const alterado = json.replace('Ana Pérez', 'Ana Pérer');
  assert.notEqual(alterado, json);
  assert.equal((await verificarDocumentoSellado(alterado, undefined)).resultado, 'no-coincide');
});

void test('cambiar la fecha de generación o el autor invalida el sello', async () => {
  const { json } = await sellarDocumento(DATOS);
  assert.equal((await verificarDocumentoSellado(json.replace('10:00', '10:01'), undefined)).resultado, 'no-coincide');
  assert.equal((await verificarDocumentoSellado(json.replace('"Admin"', '"Otro"'), undefined)).resultado, 'no-coincide');
});

void test('reformatear el JSON y reordenar claves sin tocar datos sigue dando coincide', async () => {
  const { json } = await sellarDocumento(DATOS);
  const objeto = JSON.parse(json) as Record<string, unknown>;
  const invertido = Object.fromEntries(Object.entries(objeto).reverse());
  assert.equal((await verificarDocumentoSellado(JSON.stringify(invertido), undefined)).resultado, 'coincide');
});

void test('huella pegada: la correcta (con espacios y mayúsculas) coincide; una distinta no coincide', async () => {
  const { json, huella } = await sellarDocumento(DATOS);
  assert.equal((await verificarDocumentoSellado(json, `  ${huella.toUpperCase()} \n`)).resultado, 'coincide');
  assert.equal((await verificarDocumentoSellado(json, 'a'.repeat(64))).resultado, 'no-coincide');
});

void test('huella pegada correcta no rescata un fichero alterado con sello recalculado por otro', async () => {
  const original = await sellarDocumento(DATOS);
  const falsificado = await sellarDocumento({ ...DATOS, generadoPor: 'Impostor' });
  assert.equal((await verificarDocumentoSellado(falsificado.json, undefined)).resultado, 'coincide');
  assert.equal((await verificarDocumentoSellado(falsificado.json, original.huella)).resultado, 'no-coincide');
});

void test('sin sello / formato no reconocido: nunca lanza', async () => {
  for (const texto of ['', 'no es json', '[]', '"x"', '{}', '{"sello":"x"}', '{"sello":{"algoritmo":"MD5","huella":"ab"}}', '{"sello":{"algoritmo":"SHA-256"}}', '{"sello":{"algoritmo":"SHA-256","huella":""}}']) {
    const informe = await verificarDocumentoSellado(texto, undefined);
    assert.equal(informe.resultado, 'sin-sello', texto);
    assert.equal(informe.huellaCalculada, null);
  }
});

void test('un fichero previo (exportación de R-16 sin sello) da sin-sello', async () => {
  const datos = construirDatosExportacionCentro({
    centros: [],
    alumnos: [],
    slots: [],
    historico: [],
    nombresProfesores: new Map(),
    generadoEnLegible: 'x',
    generadoPor: 'y',
  });
  assert.equal((await verificarDocumentoSellado(JSON.stringify(datos, null, 2), undefined)).resultado, 'sin-sello');
});

void test('el calculador inyectado se usa (sin tocar crypto) y recibe la forma canónica', async () => {
  const recibidos: string[] = [];
  const falso = (texto: string): Promise<string> => {
    recibidos.push(texto);
    return Promise.resolve('f'.repeat(64));
  };
  const { json } = await sellarDocumento({ b: 1, a: 2 }, falso);
  assert.deepEqual(recibidos, ['{"a":2,"b":1}']);
  assert.equal((await verificarDocumentoSellado(json, undefined, falso)).resultado, 'coincide');
});
