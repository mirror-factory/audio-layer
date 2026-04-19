import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/evals/**/*.eval.ts', 'evals/**/*.ts'],
    testTimeout: 120000, // 2 minute timeout for evals
    pool: 'forks', // Isolate eval runs
    reporters: ['verbose', 'json'],
    outputFile: '.test-results/eval-results.json',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
