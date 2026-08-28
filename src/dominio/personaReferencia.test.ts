import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarPersonaReferenciaDuplicada,
  normalizarTelefonoReferencia,
  emailReferenciaValido,
  telefonoReferenciaValido,
} from './personaReferencia.ts';
import type { PersonaReferencia } from './tipos.ts';

const JUAN: PersonaReferencia = {
  id: 'pr1',
  alumno_id: 'a1',
  nombre: 'Juan',
  primer_apellido: 'García',
  segundo_apellido: 'Pérez',
  email_referencia: null,
  telefono_referencia: '600000000',
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
};

void test('buscarPersonaReferenciaDuplicada encuentra el mismo nombre completo y teléfono', () => {
  const duplicado = buscarPersonaReferenciaDuplicada(
    { nombre: 'Juan', primer_apellido: 'García', segundo_apellido: 'Pérez', telefono_referencia: '600000000' },
    [JUAN],
  );
  assert.equal(duplicado, JUAN);
});

void test('buscarPersonaReferenciaDuplicada es acento-insensible y no distingue mayúsculas en el nombre', () => {
  const duplicado = buscarPersonaReferenciaDuplicada(
    { nombre: 'JUAN', primer_apellido: 'Garcia', segundo_apellido: 'perez', telefono_referencia: '600000000' },
    [JUAN],
  );
  assert.equal(duplicado, JUAN);
});

void test('buscarPersonaReferenciaDuplicada no encuentra nada si el teléfono es distinto', () => {
  const duplicado = buscarPersonaReferenciaDuplicada(
    { nombre: 'Juan', primer_apellido: 'García', segundo_apellido: 'Pérez', telefono_referencia: '699999999' },
    [JUAN],
  );
  assert.equal(duplicado, undefined);
});

void test('buscarPersonaReferenciaDuplicada no encuentra nada si el nombre completo es distinto', () => {
  const duplicado = buscarPersonaReferenciaDuplicada(
    { nombre: 'Juana', primer_apellido: 'García', segundo_apellido: 'Pérez', telefono_referencia: '600000000' },
    [JUAN],
  );
  assert.equal(duplicado, undefined);
});

void test('buscarPersonaReferenciaDuplicada trata segundo_apellido ausente y null como el mismo caso', () => {
  const SIN_SEGUNDO: PersonaReferencia = { ...JUAN, segundo_apellido: null };
  const duplicado = buscarPersonaReferenciaDuplicada(
    { nombre: 'Juan', primer_apellido: 'García', telefono_referencia: '600000000' },
    [SIN_SEGUNDO],
  );
  assert.equal(duplicado, SIN_SEGUNDO);
});

void test('buscarPersonaReferenciaDuplicada devuelve undefined sin personas existentes', () => {
  assert.equal(
    buscarPersonaReferenciaDuplicada(
      { nombre: 'Juan', primer_apellido: 'García', telefono_referencia: '600000000' },
      [],
    ),
    undefined,
  );
});

void test('las funciones reexportadas de alumno.ts siguen siendo las mismas reglas de formato', () => {
  assert.equal(normalizarTelefonoReferencia('666 12 34 56'), '666123456');
  assert.equal(telefonoReferenciaValido('666123456'), true);
  assert.equal(telefonoReferenciaValido('12345'), false);
  assert.equal(emailReferenciaValido('tutor@ejemplo.com'), true);
  assert.equal(emailReferenciaValido('no-es-un-email'), false);
});
