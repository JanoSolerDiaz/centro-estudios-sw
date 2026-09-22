import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearNotificadorRecordatorioNavegador, type FabricaNotificacionNavegador, type RegistroParaNotificar } from './notificadorRecordatorio.ts';

function crearFabricaFalsa(
  permission: NotificationPermission,
  resultadoPeticion: NotificationPermission = permission,
): { fabrica: FabricaNotificacionNavegador; contadorPeticiones: { valor: number } } {
  const contadorPeticiones = { valor: 0 };
  const fabrica: FabricaNotificacionNavegador = {
    permission,
    requestPermission: () => {
      contadorPeticiones.valor += 1;
      return Promise.resolve(resultadoPeticion);
    },
  };
  return { fabrica, contadorPeticiones };
}

void test('permiso() delega tal cual en la fábrica de Notification', () => {
  const { fabrica } = crearFabricaFalsa('denied');
  const notificador = crearNotificadorRecordatorioNavegador(fabrica, Promise.resolve({ showNotification: () => Promise.resolve() }));

  assert.equal(notificador.permiso(), 'denied');
});

void test('pedirPermiso() delega en requestPermission() y devuelve su resultado', async () => {
  const { fabrica, contadorPeticiones } = crearFabricaFalsa('default', 'granted');
  const notificador = crearNotificadorRecordatorioNavegador(fabrica, Promise.resolve({ showNotification: () => Promise.resolve() }));

  const resultado = await notificador.pedirPermiso();

  assert.equal(resultado, 'granted');
  assert.equal(contadorPeticiones.valor, 1);
});

void test('mostrar() espera el registro y le pasa cuerpo/etiqueta/datos como body/tag/data', async () => {
  const { fabrica } = crearFabricaFalsa('granted');
  const llamadas: { titulo: string; opciones: NotificationOptions | undefined }[] = [];
  const registro: RegistroParaNotificar = {
    showNotification: (titulo, opciones) => {
      llamadas.push({ titulo, opciones });
      return Promise.resolve();
    },
  };
  const notificador = crearNotificadorRecordatorioNavegador(fabrica, Promise.resolve(registro));

  await notificador.mostrar('Clase en 5 minutos', {
    cuerpo: 'Miércoles 17:00 — Matemáticas',
    etiqueta: 'slot-1|2026-08-26',
    datos: { inicioUtcMs: 1_756_220_400_000 },
  });

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0]?.titulo, 'Clase en 5 minutos');
  assert.equal(llamadas[0].opciones?.body, 'Miércoles 17:00 — Matemáticas');
  assert.equal(llamadas[0].opciones.tag, 'slot-1|2026-08-26');
  assert.deepEqual(llamadas[0].opciones.data, { inicioUtcMs: 1_756_220_400_000 });
});

void test('mostrar() espera de verdad a que el registro esté listo antes de llamar a showNotification', async () => {
  const { fabrica } = crearFabricaFalsa('granted');
  let registroResuelto = false;
  const llamadas: string[] = [];
  const promesaRegistro = new Promise<RegistroParaNotificar>((resolver) => {
    setTimeout(() => {
      registroResuelto = true;
      resolver({
        showNotification: (titulo) => {
          llamadas.push(titulo);
          return Promise.resolve();
        },
      });
    }, 0);
  });
  const notificador = crearNotificadorRecordatorioNavegador(fabrica, promesaRegistro);

  const promesaMostrar = notificador.mostrar('Clase en 5 minutos', {
    cuerpo: 'x',
    etiqueta: 'y',
    datos: { inicioUtcMs: 0 },
  });

  assert.equal(llamadas.length, 0);
  await promesaMostrar;
  assert.ok(registroResuelto);
  assert.deepEqual(llamadas, ['Clase en 5 minutos']);
});
