// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Ruta donde vivirá el logger centralizado (T-02). El fichero todavía no existe: hasta que
// T-02 lo cree, console.* está prohibido en todo `src/`. Cuando exista, esa sesión debe añadir
// aquí un override que desactive `no-console-fuera-de-logger` solo para esa ruta — ver la regla
// más abajo.
const RUTA_LOGGER = 'src/nucleo/registro.ts';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  eslint.configs.recommended,

  // Parsing de TypeScript (sin chequeo de tipos) para todo `.ts` del repo, incluido
  // `herramientas/` (fuera del `tsconfig.json` de `src/`, ver T-00). `src/**/*.ts` recibe además
  // el chequeo estricto con tipos en el bloque siguiente.
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
  },

  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // tsc (strict) ya cubre las referencias no declaradas con información de tipos completa;
      // no-undef de ESLint no conoce los tipos globales del DOM/lib y da falsos positivos.
      'no-undef': 'off',
    },
  },

  // --- Reglas que defienden el stack fijado (§0.2 de HOJA_DE_RUTA.md) por herramienta, no solo
  // por documento. Aplican a todo el código de aplicación en `src/`. ---
  {
    files: ['src/**/*.ts'],
    rules: {
      // Nombrado explícitamente, como exige T-01, aunque el patrón genérico de abajo ya lo
      // cubriría: el SDK de Supabase es una dependencia de runtime vetada (§0.2), se consume la
      // API REST con fetch nativo a través del cliente propio (T-08).
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Vetado por el stack fijado (§0.2): Supabase se consume por su API REST con fetch nativo, no por su SDK.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // Cualquier import cuyo especificador no sea relativo (./ o ../) ni un builtin de
          // Node (node:...) es un paquete de terceros: `dependencies` debe permanecer vacío.
          selector: "ImportDeclaration[source.value=/^(?!\\.{1,2}\\/|node:)/]",
          message:
            'Prohibido importar paquetes de terceros en src/: el stack fijado (§0.2) no admite dependencias de runtime.',
        },
        {
          selector: "ImportExpression[source.value=/^(?!\\.{1,2}\\/|node:)/]",
          message:
            'Prohibido importar paquetes de terceros en src/: el stack fijado (§0.2) no admite dependencias de runtime.',
        },
        {
          // Cubre tanto la lectura como la asignación: `el.innerHTML` y `el.innerHTML = ...`.
          selector: "MemberExpression[property.name='innerHTML']",
          message:
            'innerHTML está prohibido (riesgo XSS): usa manipulación de DOM nativa (textContent, createElement, etc.).',
        },
        {
          selector: "MemberExpression[object.name='console']",
          message: `Prohibido console.* fuera del logger centralizado (T-02): usa el logger de ${RUTA_LOGGER}.`,
        },
      ],
      // `fetch` es global (DOM/undici); no-restricted-imports no lo cubre. Solo la capa de
      // acceso a Supabase (src/datos/**, T-08) puede usarlo — ver el override más abajo.
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'fetch está prohibido fuera de los módulos de acceso autorizados (src/datos/**): el cliente propio de la API de Supabase (T-08) es la única puerta.',
        },
      ],
    },
  },

  // La capa de acceso a Supabase es la única autorizada a usar fetch (T-08: PostgREST, GoTrue,
  // Storage por fetch nativo).
  {
    files: ['src/datos/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
);
