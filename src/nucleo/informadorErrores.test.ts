import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { crearLogger, type EntradaLog } from './registro.ts';
import { crearInformadorErrores, type CargaEventoError } from './informadorErrores.ts';

function crearLoggerDePruebas(): { logger: ReturnType<typeof crearLogger>; entradas: EntradaLog[] } {
  const entradas: EntradaLog[] = [];
  const logger = crearLogger((entrada) => entradas.push(entrada));
  return { logger, entradas };
}

void test('informar depura nombre, teléfono, ruta de avatar y token del contexto antes de enviarlos', async () => {
  const { logger } = crearLoggerDePruebas();
  const cargasEnviadas: CargaEventoError[] = [];
  const enviar = (carga: CargaEventoError): Promise<void> => {
    cargasEnviadas.push(carga);
    return Promise.resolve();
  };
  const informador = crearInformadorErrores(logger, enviar);

  informador.informar('capa_datos', new Error('fallo al guardar'), {
    nombre: 'Ana',
    telefono: '600111222',
    avatar_ruta: 'avatares/1/512.jpg',
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    alumno_id: 'a1b2c3',
  });

  await new Promise((resolver) => setTimeout(resolver, 0));

  assert.equal(cargasEnviadas.length, 1);
  const carga = cargasEnviadas[0];
  assert.ok(carga);
  assert.equal(carga.nombre, '[REDACTADO]');
  assert.equal(carga.telefono, '[REDACTADO]');
  assert.equal(carga.avatar_ruta, '[REDACTADO]');
  assert.equal(carga.token, '[REDACTADO]');
  // Un identificador no personal (alumno_id) no debe depurarse por error.
  assert.equal(carga.alumno_id, 'a1b2c3');
  assert.equal(carga.origen, 'capa_datos');
  assert.equal(carga.mensaje, 'fallo al guardar');
});

void test('informar depura el propio mensaje si tiene forma de token, aunque no vaya bajo una clave sensible', async () => {
  const { logger } = crearLoggerDePruebas();
  const cargasEnviadas: CargaEventoError[] = [];
  const enviar = (carga: CargaEventoError): Promise<void> => {
    cargasEnviadas.push(carga);
    return Promise.resolve();
  };
  const informador = crearInformadorErrores(logger, enviar);

  informador.informar('no_controlado', new Error('nfC3s9ZpQwLk7hRt2VmXo1BdEaYgHsJuTiPqZxWvNlKr'));

  await new Promise((resolver) => setTimeout(resolver, 0));

  const carga = cargasEnviadas[0];
  assert.ok(carga);
  assert.equal(carga.mensaje, '[REDACTADO]');
});

void test('informar registra siempre en el logger local, incluso sin `enviar` configurado', () => {
  const { logger, entradas } = crearLoggerDePruebas();
  const informador = crearInformadorErrores(logger);

  informador.informar('no_controlado', new Error('boom'));

  assert.equal(entradas.length, 1);
  assert.equal(entradas[0]?.nivel, 'error');
});

void test('un fallo de `enviar` (promesa rechazada) no genera recursión ni un rechazo sin capturar', async () => {
  const { logger, entradas } = crearLoggerDePruebas();
  let llamadas = 0;
  const enviar = (): Promise<void> => {
    llamadas += 1;
    return Promise.reject(new Error('la red está caída'));
  };
  const informador = crearInformadorErrores(logger, enviar);

  let rechazoSinCapturar = false;
  const manejador = (): void => {
    rechazoSinCapturar = true;
  };
  process.on('unhandledRejection', manejador);
  try {
    informador.informar('no_controlado', new Error('boom'));
    await new Promise((resolver) => setTimeout(resolver, 10));
  } finally {
    process.off('unhandledRejection', manejador);
  }

  assert.equal(llamadas, 1, 'enviar debe llamarse exactamente una vez, no en bucle');
  assert.equal(rechazoSinCapturar, false, 'el fallo de enviar no debe escapar como rechazo sin capturar');
  // El log local del error original, más el aviso del fallo de envío: dos entradas, no un bucle.
  assert.equal(entradas.length, 2);
  assert.equal(entradas[1]?.nivel, 'warn');
});

void test('un fallo síncrono de `enviar` (lanza en vez de rechazar) tampoco genera recursión', () => {
  const { logger, entradas } = crearLoggerDePruebas();
  let llamadas = 0;
  const enviar = (): Promise<void> => {
    llamadas += 1;
    throw new Error('fallo síncrono');
  };
  const informador = crearInformadorErrores(logger, enviar);

  assert.doesNotThrow(() => {
    informador.informar('capa_datos', new Error('boom'));
  });

  assert.equal(llamadas, 1);
  assert.equal(entradas.length, 2);
  assert.equal(entradas[1]?.nivel, 'warn');
});
