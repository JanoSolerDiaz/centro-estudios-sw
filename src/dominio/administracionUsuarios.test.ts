import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nombreUsuarioValido,
  normalizarNombreUsuario,
  dejariaSinAdministratorActivo,
  type PerfilParaComprobacion,
} from './administracionUsuarios.ts';

void test('normalizarNombreUsuario recorta y colapsa espacios (reutiliza normalizarNombrePersona)', () => {
  assert.equal(normalizarNombreUsuario('  Ana   Admin  '), 'Ana Admin');
});

void test('nombreUsuarioValido rechaza vacío, acepta cualquier otra cosa', () => {
  assert.equal(nombreUsuarioValido(''), false);
  assert.equal(nombreUsuarioValido('Ana'), true);
});

function perfil(parcial: Partial<PerfilParaComprobacion>): PerfilParaComprobacion {
  return { id: 'id', rol: 'administrator', activo: true, ...parcial };
}

void test('dejariaSinAdministratorActivo: false si el objetivo no es administrator', () => {
  const teacher = perfil({ id: 't1', rol: 'teacher' });
  assert.equal(dejariaSinAdministratorActivo([teacher], teacher, { activo: false }), false);
});

void test('dejariaSinAdministratorActivo: false si el objetivo ya está inactivo (nada que proteger)', () => {
  const admin = perfil({ id: 'a1', activo: false });
  assert.equal(dejariaSinAdministratorActivo([admin], admin, { rol: 'teacher' }), false);
});

void test('dejariaSinAdministratorActivo: false si el cambio no le quita ni el rol ni el estado de administrator activo', () => {
  const admin = perfil({ id: 'a1' });
  // Cambiar solo el nombre (ningún campo de rol/activo tocado) no dispara nada.
  assert.equal(dejariaSinAdministratorActivo([admin], admin, {}), false);
  // Reafirmar explícitamente los mismos valores tampoco.
  assert.equal(dejariaSinAdministratorActivo([admin], admin, { rol: 'administrator', activo: true }), false);
});

void test('dejariaSinAdministratorActivo: true al desactivar al ÚNICO administrator activo', () => {
  const admin = perfil({ id: 'a1' });
  const teacher = perfil({ id: 't1', rol: 'teacher' });
  assert.equal(dejariaSinAdministratorActivo([admin, teacher], admin, { activo: false }), true);
});

void test('dejariaSinAdministratorActivo: true al degradar al ÚNICO administrator activo a teacher', () => {
  const admin = perfil({ id: 'a1' });
  assert.equal(dejariaSinAdministratorActivo([admin], admin, { rol: 'teacher' }), true);
});

void test('dejariaSinAdministratorActivo: false si queda OTRO administrator activo distinto', () => {
  const admin1 = perfil({ id: 'a1' });
  const admin2 = perfil({ id: 'a2' });
  assert.equal(dejariaSinAdministratorActivo([admin1, admin2], admin1, { activo: false }), false);
  assert.equal(dejariaSinAdministratorActivo([admin1, admin2], admin1, { rol: 'teacher' }), false);
});

void test('dejariaSinAdministratorActivo: un administrator YA inactivo en la lista no cuenta como "otro" activo', () => {
  const admin1 = perfil({ id: 'a1' });
  const admin2Inactivo = perfil({ id: 'a2', activo: false });
  assert.equal(dejariaSinAdministratorActivo([admin1, admin2Inactivo], admin1, { activo: false }), true);
});

void test('dejariaSinAdministratorActivo: no se cuenta a sí mismo como "otro" administrator', () => {
  const admin = perfil({ id: 'a1' });
  assert.equal(dejariaSinAdministratorActivo([admin], admin, { activo: false }), true);
});
