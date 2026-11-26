// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Tests Jest : globales de Jest et de Node.
    files: ['__tests__/**', 'jest.setup.ts'],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
    rules: {
      // Les fabriques de jest.mock() ne peuvent pas utiliser les imports du fichier.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Le service worker s'exécute dans son propre contexte.
    files: ['public/sw.js'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
]);
