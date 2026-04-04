import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

const sharedGlobals = {
  ...globals.es2024,
  ...globals.node,
  ...globals.browser,
};

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'main-dist/**',
      'build/**',
      'data/**',
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
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
