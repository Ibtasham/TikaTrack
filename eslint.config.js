import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**', '**/*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // eslint-plugin-react-hooks v7's `recommended` also switches on the
      // React-Compiler rule set (purity, immutability, refs, set-state-in-effect,
      // gating, …). This project is not compiled with React Compiler, and several
      // of those rules flag patterns that are deliberate here — a callback kept in
      // a ref so an interval always sees the latest closure, say. Keeping them on
      // as errors would mean either a wall of ignored output or a refactor with no
      // user-visible benefit, so the two rules that describe real bugs in *any*
      // React app are set explicitly instead of spreading the preset.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Code quality
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Context providers deliberately co-locate the context object, its
    // <Provider> component and the `useX` hook; the i18n module co-locates the
    // provider with the translation tables. Fast-refresh's "only export
    // components" rule does not apply to that established pattern.
    files: ['src/contexts/**/*.{ts,tsx}', 'src/i18n/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // The service worker template runs in a worker global scope (self, caches,
    // clients) and is turned into dist/sw.js by the build.
    files: ['sw.template.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.serviceworker, ...globals.es2022 },
    },
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.config.{ts,js}', 'scripts/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
