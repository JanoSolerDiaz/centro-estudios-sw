// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Ruta del logger centralizado (T-02). Es el único fichero de `src/` autorizado a usar
// `console.*` — ver el override al final de este fichero que desactiva esa parte de la regla
// solo para esta ruta.
const RUTA_LOGGER = 'src/nucleo/registro.ts';

// Selectores de `no-restricted-syntax` comunes a TODO `src/`, incluido el logger: el veto a
// paquetes de terceros y a `innerHTML` no tiene excepciones. Solo el veto a `console.*` se
// levanta para `RUTA_LOGGER` (ver el override al final).
const SELECTORES_RESTRINGIDOS_COMUNES = [
  {
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
    selector: "MemberExpression[property.name='innerHTML']",
    message:
      'innerHTML está prohibido (riesgo XSS): usa manipulación de DOM nativa (textContent, createElement, etc.).',
  },
];

// `@types/node` (necesario para tipar `node:test`/`node:assert` en los tests, T-02) declara estos
// globales ambientales de Node en TODO el programa TypeScript, incluido el código de navegador de
// `src/`, donde no existen en tiempo de ejecución. `no-restricted-globals` es lo único que lo
// impide por herramienta: `tsc` no avisa porque, para él, están declarados y son válidos.
const GLOBALES_NODE_PROHIBIDOS_EN_SRC = [
  {
    name: 'process',
    message: 'process es global de Node: no existe en el navegador (§0.2, sin bundler ni runtime de Node en el cliente).',
  },
  {
    name: 'Buffer',
    message: 'Buffer es global de Node: no existe en el navegador.',
  },
  {
    name: 'require',
    message: 'require es de CommonJS: el proyecto usa ES modules nativos (§0.2).',
  },
  {
    name: '__dirname',
    message: '__dirname es global de Node: no existe en el navegador.',
  },
  {
    name: '__filename',
    message: '__filename es global de Node: no existe en el navegador.',
  },
];

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
        ...SELECTORES_RESTRINGIDOS_COMUNES,
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
        ...GLOBALES_NODE_PROHIBIDOS_EN_SRC,
      ],
    },
  },

  // La capa de acceso a Supabase es la única autorizada a usar fetch (T-08: PostgREST, GoTrue,
  // Storage por fetch nativo), pero sigue siendo código de navegador: los globales de Node siguen
  // prohibidos aquí.
  {
    files: ['src/datos/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...GLOBALES_NODE_PROHIBIDOS_EN_SRC],
    },
  },

  // El logger centralizado (T-02) es el único fichero autorizado a usar `console.*`: es el
  // sumidero por defecto de toda entrada de log. El veto a paquetes de terceros y a `innerHTML`
  // se mantiene igual (SELECTORES_RESTRINGIDOS_COMUNES), solo se omite el selector de `console`.
  {
    files: [RUTA_LOGGER],
    rules: {
      'no-restricted-syntax': ['error', ...SELECTORES_RESTRINGIDOS_COMUNES],
    },
  },
);
