import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/data/**', 'src/hooks/**', 'src/i18n/**'],
      exclude: ['src/**/*.d.ts'],
      // Ratcheted up from 60/60/55/60 once the pure-core modules were covered,
      // and again to 90/90/82/90 with Vitest 4 (which instruments more branches
      // than v3 did, so the same code measures ~5 points lower): a threshold you
      // cannot fail is not a gate. Current: ~93/93/84/92.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 82,
        statements: 90,
      },
    },
  },
});
