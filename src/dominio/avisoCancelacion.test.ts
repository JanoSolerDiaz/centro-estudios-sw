import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeAvisoCancelacion, textoAvisoCancelacionRegistrado } from './avisoCancelacion.ts';

void test('mensajeAvisoCancelacion: incluye el alumno, la clase, la fecha y el motivo en asunto y cuerpo (R-14, requisito 2)', () => {
  const mensaje = mensajeAvisoCancelacion({
    alumnoNombreCompleto: 'Ana Pérez López',
    fechaTexto: '04/09/2026',
    claseNombre: 'Matemáticas 3ºESO',
    motivo: 'Profesor de baja',
  });

  assert.match(mensaje.asunto, /Ana Pérez López/);
  assert.match(mensaje.cuerpo, /Ana Pérez López/);
  assert.match(mensaje.cuerpo, /Matemáticas 3ºESO/);
  assert.match(mensaje.cuerpo, /04\/09\/2026/);
  assert.match(mensaje.cuerpo, /Profesor de baja/);
});

void test('mensajeAvisoCancelacion: sin clase (claseNombre null), usa una redacción genérica en vez de dejar un hueco', () => {
  const mensaje = mensajeAvisoCancelacion({
    alumnoNombreCompleto: 'Ana Pérez López',
    fechaTexto: '04/09/2026',
    claseNombre: null,
    motivo: 'Imprevisto',
  });

  assert.match(mensaje.cuerpo, /su clase/);
});

void test('mensajeAvisoCancelacion: redacción distinta de mensajeAvisoAusencia (cancelación, no ausencia)', () => {
  const mensaje = mensajeAvisoCancelacion({
    alumnoNombreCompleto: 'Ana Pérez López',
    fechaTexto: '04/09/2026',
    claseNombre: null,
    motivo: 'Imprevisto',
  });

  assert.match(mensaje.cuerpo, /se cancela la clase/);
  assert.doesNotMatch(mensaje.cuerpo, /no ha asistido/);
});

void test('textoAvisoCancelacionRegistrado: etiqueta explícitamente que es una anotación manual, sin confirmación de entrega (requisito 3)', () => {
  const texto = textoAvisoCancelacionRegistrado('María (administradora)', '04/09/2026 12:00');

  assert.match(texto, /anotación manual/);
  assert.match(texto, /sin confirmación de entrega/);
  assert.match(texto, /María \(administradora\)/);
  assert.match(texto, /04\/09\/2026 12:00/);
  assert.match(texto, /clase cancelada/);
});
