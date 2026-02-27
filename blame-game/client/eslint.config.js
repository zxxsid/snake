import js from '@eslint/js';
import globals from 'globals';
export default [
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, wx: 'readonly' } },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] } },
  { files: ['libs/**/*.js', 'game.js'], languageOptions: { globals: { GameGlobal: 'readonly', canvas: 'readonly' } } },
];
