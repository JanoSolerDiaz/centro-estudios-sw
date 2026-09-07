import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeAvisoAusencia, textoAvisoRegistrado, notaConAvisoAusencia } from './avisoAusencia.ts';

void test('mensajeAvisoAusencia: incluye el alumno, la fecha y la clase en asunto y cuerpo (R-05, requisito 1)', () => {
  const mensaje = mensajeAvisoAusencia({
    alumnoNombreCompleto: 'Ana Pérez López',
    fechaTexto: '04/09/2026 10:00',
    claseNombre: 'Matemáticas 3ºESO',
  });

  assert.match(mensaje.asunto, /Ana Pérez López/);
  assert.match(mensaje.cuerpo, /Ana Pérez López/);
  assert.match(mensaje.cuerpo, /04\/09\/2026 10:00/);
  assert.match(mensaje.cuerpo, /Matemáticas 3ºESO/);
});

void test('mensajeAvisoAusencia: sin clase (claseNombre null), usa una redacción genérica en vez de dejar un hueco', () => {
  const mensaje = mensajeAvisoAusencia({
    alumnoNombreCompleto: 'Ana Pérez López',
    fechaTexto: '04/09/2026 10:00',
    claseNombre: null,
  });

  assert.match(mensaje.cuerpo, /su clase/);
});

void test('textoAvisoRegistrado: etiqueta explícitamente que es una anotación manual, sin confirmación de entrega (requisito 3)', () => {
  const texto = textoAvisoRegistrado('María (administrador)', '04/09/2026 12:00');

  assert.match(texto, /anotación manual/);
  assert.match(texto, /sin confirmación de entrega/);
  assert.match(texto, /María \(administrador\)/);
  assert.match(texto, /04\/09\/2026 12:00/);
});

void test('notaConAvisoAusencia: sin nota previa, el resultado es solo la anotación', () => {
  const resultado = notaConAvisoAusencia(null, 'María', '04/09/2026 12:00');

  assert.equal(resultado, textoAvisoRegistrado('María', '04/09/2026 12:00'));
});

void test('notaConAvisoAusencia: con nota previa, la conserva y AÑADE la anotación (nunca la sustituye)', () => {
  const resultado = notaConAvisoAusencia('Llegó con 5 minutos de retraso ayer.', 'María', '04/09/2026 12:00');

  assert.match(resultado, /^Llegó con 5 minutos de retraso ayer\./);
  assert.match(resultado, /anotación manual/);
});

void test('notaConAvisoAusencia: una nota previa en blanco se trata como si no hubiera nota', () => {
  const resultado = notaConAvisoAusencia('   ', 'María', '04/09/2026 12:00');

  assert.equal(resultado, textoAvisoRegistrado('María', '04/09/2026 12:00'));
});
