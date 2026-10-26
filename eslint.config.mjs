import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

const sharedGlobals = {
  ...globals.es2024,
  ...globals.node,
  ...globals.browser,
  __APP_VERSION__: 'readonly',
};

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'main-dist/**',
      'build/**',
      'data/**',
      'release/**',
      // Artefacts de revue (rapports, compilations et reproductions de Codex).
      'audit/**',
      '*.min.js',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      react,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: sharedGlobals,
    },
    rules: {
      'no-undef': 'warn',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-redeclare': 'warn',
      'no-const-assign': 'error',
      'valid-typeof': 'error',
      'no-empty-pattern': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    files: ['app/widgets/timeline/**/*.{js,jsx}'],
    rules: {
      'no-use-before-define': [
        'error',
        { functions: false, classes: true, variables: true },
      ],
    },
  },
];
