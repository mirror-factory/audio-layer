import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/evals/**', 'tests/api/**', 'tests/e2e/**', 'tests/unit/code-review.test.ts'],
    // PROD-385 follow-up: vitest 4's default `forks` pool spawns a fresh Node
    // process per test file, which on this repo (70+ files) made `pnpm test`
    // take ~10 minutes wall and occasionally hit `Timeout starting forks runner`.
    // The `threads` pool reuses workers across files; same suite runs in ~2s.
    // Tests must avoid mutating shared globals across files (none do today).
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['lib/**/*.ts', 'app/**/*.ts'],
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
