#!/usr/bin/env node
/**
 * CLI de la semilla de desarrollo (T-07, `npm run seed`). Capa de wiring fina, sin test directo
 * (mismo patrón que `herramientas/migrar.ts` y `src/ui/main.ts`): los datos y el cliente que usa
 * están en `herramientas/semilla/*.ts`, testeados por separado.
 *
 * NO lo ejecuta el agente: necesita `SUPABASE_SERVICE_ROLE_KEY_DEV`, que solo vive en `.env.local`
 * del dueño. Idempotente por comprobación: si el primer centro de la semilla ya existe, asume que
 * ya se sembró y no hace nada más.
 */

import { crearClienteAdmin } from './semilla/clienteAdmin.ts';
import { ALUMNOS_SEMILLA, CENTROS_SEMILLA, USUARIOS_SEMILLA, generarPersonasReferencia } from './semilla/datosFicticios.ts';
import { resolverCredencialesSemilla } from './semilla/entorno.ts';

function entornoDesdeArgv(argv: readonly string[]): 'dev' | 'prod' {
  const arg = argv.find((valor) => valor.startsWith('--entorno='));
  const valor = arg?.slice('--entorno='.length);
  if (valor === 'prod') {
    return 'prod';
  }
  return 'dev';
}

async function main(): Promise<void> {
  const entorno = entornoDesdeArgv(process.argv.slice(2));
  const credenciales = resolverCredencialesSemilla(process.env, entorno);
  console.log(`seed: sembrando datos ficticios en ${credenciales.entorno} (${credenciales.url})`);

  const cliente = crearClienteAdmin(credenciales.url, credenciales.serviceRoleKey);

  const primerCentro = CENTROS_SEMILLA[0];
  if (!primerCentro) {
    throw new Error('seed: CENTROS_SEMILLA está vacío, no hay marcador de idempotencia que comprobar.');
  }
  const yaSembrado = await cliente.consultar('centro_estudios', `nombre=eq.${encodeURIComponent(primerCentro.nombre)}`);
  if (yaSembrado.length > 0) {
    console.log(`seed: "${primerCentro.nombre}" ya existe, la semilla parece aplicada. No se hace nada más.`);
    return;
  }

  for (const usuario of USUARIOS_SEMILLA) {
    const id = await cliente.crearUsuario(usuario.email, usuario.password, usuario.nombre);
    // El trigger del bootstrap crea el perfil como 'student'; lo subimos si hace falta.
    if (usuario.rol !== 'student') {
      await cliente.actualizarRolPerfil(id, usuario.rol);
    }
    console.log(`seed: usuario ${usuario.email} (${usuario.rol}) creado`);
  }

  const centrosInsertados = await cliente.insertar(
    'centro_estudios',
    CENTROS_SEMILLA.map((centro) => ({ nombre: centro.nombre })),
  );
  console.log(`seed: ${String(centrosInsertados.length)} centro(s) insertado(s)`);

  const idPorNombreCentro = new Map(
    centrosInsertados.map((fila) => [fila.nombre as string, fila.id as string]),
  );

  for (const alumno of ALUMNOS_SEMILLA) {
    const centroReferenciaId = idPorNombreCentro.get(alumno.centro);
    if (!centroReferenciaId) {
      throw new Error(`seed: no se encontró el id del centro "${alumno.centro}" tras insertarlo`);
    }
    const [alumnoInsertado] = await cliente.insertar('alumno', [
      {
        nombre: alumno.nombre,
        primer_apellido: alumno.primer_apellido,
        segundo_apellido: alumno.segundo_apellido,
        centro_referencia_id: centroReferenciaId,
      },
    ]);
    const alumnoId = alumnoInsertado?.id as string | undefined;
    if (!alumnoId) {
      throw new Error(`seed: no se pudo insertar el alumno "${alumno.nombre}"`);
    }
    console.log(`seed: alumno ${alumno.nombre} ${alumno.primer_apellido} insertado`);

    const personas = generarPersonasReferencia(alumno.nombre, alumno.personasReferencia);
    if (personas.length > 0) {
      await cliente.insertar(
        'persona_referencia',
        personas.map((persona) => ({ ...persona, alumno_id: alumnoId })),
      );
      console.log(`seed:   + ${String(personas.length)} persona(s) de referencia`);
    }
  }

  console.log('seed: completado.');
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`seed: ERROR — ${mensaje}`);
  process.exitCode = 1;
});
