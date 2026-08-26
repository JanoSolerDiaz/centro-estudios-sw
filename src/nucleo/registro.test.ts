import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLogger, depurarContexto, type EntradaLog } from './registro.ts';

function crearCaptura(): { entradas: EntradaLog[]; capturar: (entrada: EntradaLog) => void } {
  const entradas: EntradaLog[] = [];
  return {
    entradas,
    capturar: (entrada) => {
      entradas.push(entrada);
    },
  };
}

void test('depurarContexto descarta los datos personales del alumno y de sus personas de referencia', () => {
  const resultado = depurarContexto({
    nombre: 'María',
    primer_apellido: 'García',
    segundo_apellido: 'Pérez',
    email_alumno: 'maria@example.com',
    telefono_alumno: '600111222',
    email_referencia: 'padre@example.com',
    telefono_referencia: '600333444',
    alumno_id: 'a1b2c3',
  });

  assert.equal(resultado.nombre, '[REDACTADO]');
  assert.equal(resultado.primer_apellido, '[REDACTADO]');
  assert.equal(resultado.segundo_apellido, '[REDACTADO]');
  assert.equal(resultado.email_alumno, '[REDACTADO]');
  assert.equal(resultado.telefono_alumno, '[REDACTADO]');
  assert.equal(resultado.email_referencia, '[REDACTADO]');
  assert.equal(resultado.telefono_referencia, '[REDACTADO]');
  // Un identificador no es un dato personal: debe pasar intacto.
  assert.equal(resultado.alumno_id, 'a1b2c3');
});

void test('depurarContexto descarta la ruta del avatar', () => {
  const resultado = depurarContexto({
    avatar_ruta: 'alumnos/42/avatar-512.webp',
    alumno_id: '42',
  });

  assert.equal(resultado.avatar_ruta, '[REDACTADO]');
  assert.equal(resultado.alumno_id, '42');
});

void test('depurarContexto descarta cualquier campo con aspecto de token o de clave, por su nombre', () => {
  const resultado = depurarContexto({
    access_token: 'algo-que-no-deberia-salir',
    refresh_token: 'tampoco-esto',
    service_role: 'ni-esto',
    api_key: 'ni-esto-otro',
    password: 'tampoco',
    Authorization: 'Bearer algo',
    rol: 'teacher',
  });

  assert.equal(resultado.access_token, '[REDACTADO]');
  assert.equal(resultado.refresh_token, '[REDACTADO]');
  assert.equal(resultado.service_role, '[REDACTADO]');
  assert.equal(resultado.api_key, '[REDACTADO]');
  assert.equal(resultado.password, '[REDACTADO]');
  assert.equal(resultado.Authorization, '[REDACTADO]');
  assert.equal(resultado.rol, 'teacher');
});

void test('depurarContexto descarta un valor con forma de token aunque la clave sea genérica', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc19pc19ub3RfYV9yZWFsX3NpZ25hdHVyZQ';
  const resultado = depurarContexto({
    valor: jwt,
    codigoOpacoLargo: 'A'.repeat(40),
    codigoCorto: 'ok-123',
  });

  assert.equal(resultado.valor, '[REDACTADO]');
  assert.equal(resultado.codigoOpacoLargo, '[REDACTADO]');
  assert.equal(resultado.codigoCorto, 'ok-123');
});

void test('depurarContexto recorre objetos y arrays anidados', () => {
  const resultado = depurarContexto({
    alumno: { nombre: 'Ana', primer_apellido: 'Ruiz', alumno_id: '7' },
    personas_referencia: [{ nombre: 'Luis', telefono_referencia: '600555666' }],
  });

  const alumno = resultado.alumno as Record<string, unknown>;
  assert.equal(alumno.nombre, '[REDACTADO]');
  assert.equal(alumno.primer_apellido, '[REDACTADO]');
  assert.equal(alumno.alumno_id, '7');

  const personas = resultado.personas_referencia as Record<string, unknown>[];
  const primeraPersona = personas[0];
  assert.ok(primeraPersona);
  assert.equal(primeraPersona.nombre, '[REDACTADO]');
  assert.equal(primeraPersona.telefono_referencia, '[REDACTADO]');
});

void test('el logger aplica la depuración al contexto antes de llegar al sumidero', () => {
  const { entradas, capturar } = crearCaptura();
  const logger = crearLogger(capturar, 'debug');

  logger.info('alumno creado', { nombre: 'Ana', alumno_id: '7' });

  assert.equal(entradas.length, 1);
  const primeraEntrada = entradas[0];
  assert.ok(primeraEntrada);
  assert.equal(primeraEntrada.mensaje, 'alumno creado');
  const contextoDepurado = primeraEntrada.contexto;
  assert.ok(contextoDepurado);
  assert.equal(contextoDepurado.nombre, '[REDACTADO]');
  assert.equal(contextoDepurado.alumno_id, '7');
});

void test('el logger respeta el nivel mínimo configurado', () => {
  const { entradas, capturar } = crearCaptura();
  const logger = crearLogger(capturar, 'warn');

  logger.debug('no debería salir');
  logger.info('tampoco esto');
  logger.warn('esto sí');
  logger.error('y esto también');

  assert.equal(entradas.length, 2);
  assert.equal(entradas[0]?.mensaje, 'esto sí');
  assert.equal(entradas[1]?.mensaje, 'y esto también');
});

void test('configurarNivel("silencioso") descarta cualquier entrada, incluida error — para usar en tests', () => {
  const { entradas, capturar } = crearCaptura();
  const logger = crearLogger(capturar, 'debug');

  logger.configurarNivel('silencioso');
  logger.debug('no');
  logger.info('no');
  logger.warn('no');
  logger.error('no');

  assert.equal(entradas.length, 0);
});

void test('sin contexto, la entrada no lleva contexto ni intenta depurar nada', () => {
  const { entradas, capturar } = crearCaptura();
  const logger = crearLogger(capturar, 'debug');

  logger.info('sin datos adicionales');

  assert.equal(entradas[0]?.contexto, undefined);
});
