/**
 * Datos ficticios de la semilla de desarrollo (T-07, punto 24 de HOJA_DE_RUTA.md): los tres roles,
 * varios centros, alumnos con y sin segundo apellido, y alumnos con 0, 1 y 3 personas de
 * referencia. Puros (sin red): la orquestación que los inserta de verdad vive en `herramientas/seed.ts`.
 */

export interface UsuarioSemilla {
  readonly email: string;
  readonly password: string;
  readonly nombre: string;
  readonly rol: 'administrator' | 'teacher' | 'student';
}

export const USUARIOS_SEMILLA: readonly UsuarioSemilla[] = [
  {
    email: 'admin.semilla@gestoracademia.test',
    password: 'Semilla-Admin-1!',
    nombre: 'Admin Semilla',
    rol: 'administrator',
  },
  {
    email: 'profesor.semilla@gestoracademia.test',
    password: 'Semilla-Profesor-1!',
    nombre: 'Profesor Semilla',
    rol: 'teacher',
  },
  {
    email: 'alumno.semilla@gestoracademia.test',
    password: 'Semilla-Alumno-1!',
    nombre: 'Alumno Semilla',
    rol: 'student',
  },
];

export interface CentroSemilla {
  readonly nombre: string;
}

// El primero es el marcador de idempotencia que usa `herramientas/seed.ts` para no duplicar datos
// si se ejecuta dos veces: si ya existe, la semilla se considera aplicada y no hace nada más.
export const CENTROS_SEMILLA: readonly CentroSemilla[] = [
  { nombre: 'IES Semilla Uno' },
  { nombre: 'IES Semilla Dos' },
  { nombre: 'Colegio Semilla Tres' },
];

export interface AlumnoSemilla {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly centro: string;
  readonly personasReferencia: 0 | 1 | 3;
}

export const ALUMNOS_SEMILLA: readonly AlumnoSemilla[] = [
  {
    nombre: 'Marta',
    primer_apellido: 'García',
    segundo_apellido: 'Pérez',
    centro: 'IES Semilla Uno',
    personasReferencia: 0,
  },
  {
    nombre: 'Diego',
    primer_apellido: 'López',
    segundo_apellido: null,
    centro: 'IES Semilla Uno',
    personasReferencia: 1,
  },
  {
    nombre: 'Sofía',
    primer_apellido: "O'Donnell",
    segundo_apellido: 'Ruiz',
    centro: 'IES Semilla Dos',
    personasReferencia: 3,
  },
];

export interface PersonaReferenciaSemilla {
  readonly nombre: string;
  readonly primer_apellido: string;
  readonly segundo_apellido: string | null;
  readonly telefono_referencia: string;
  readonly email_referencia: string | null;
}

/** Genera `cantidad` personas de referencia deterministas para un alumno, sin leer el reloj ni
 * ningún dato aleatorio: la semilla debe producir siempre el mismo resultado. */
export function generarPersonasReferencia(
  alumnoNombre: string,
  cantidad: 0 | 1 | 3,
): PersonaReferenciaSemilla[] {
  return Array.from({ length: cantidad }, (_valorNoUsado, indice) => ({
    nombre: `Tutor${String(indice + 1)}`,
    primer_apellido: `De${alumnoNombre}`,
    segundo_apellido: null,
    telefono_referencia: `60000000${String(indice)}`,
    email_referencia: null,
  }));
}
