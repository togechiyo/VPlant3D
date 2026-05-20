import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'node_modules/',
      'local-assets/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
);
