/**
 * ESLint Flat Config — Enforcement rules for AI SDK projects
 *
 * Uses ESLint 9+ flat config format.
 * Enforces patterns from the Vercel AI Starter Kit:
 * - No @ts-nocheck in test files (Gap 2)
 * - No debug console.log in source (Gap 7)
 * - Storybook best practices
 *
 * Usage: Copy to your project root as `eslint.config.mjs`
 * Run: `pnpm lint` (via `next lint` or `eslint .`)
 */

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';

export default [
  // ── Base JavaScript rules ──────��────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript files ────────────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        React: 'readonly',
      },
    },
    rules: {
      // Prefer const over let
      'prefer-const': 'error',
      // Defer to @typescript-eslint/no-unused-vars; disable core rule to avoid duplicates
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // ── Source files (lib/, components/, app/) ─────��─────────────────────
  {
    files: ['lib/**/*.ts', 'lib/**/*.tsx', 'components/**/*.ts', 'components/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx'],
    // Also match src/ prefix
    ignores: ['**/*.test.*', '**/*.spec.*', 'lib/ai/ai-logger.ts', 'lib/ai/telemetry.ts'],
    rules: {
      // No debug console.log in source — use structured logger instead
      // console.error and console.warn are allowed (intentional)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },

  // ── Test files — STRICT enforcement ��────────────────────────────────
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      // CRITICAL: Ban @ts-nocheck in test files (Gap 2)
      // When interfaces change, tests with @ts-nocheck silently pass
      // with stale mocks, hiding real bugs until they hit the browser.
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-nocheck': true,
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      }],

      // Allow console in tests (useful for debugging)
      'no-console': 'off',
    },
  },

  // ── Next.js rules ──────────��────────────────────────────────────────
  {
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      // Next.js specific rules
      '@next/next/no-html-link-for-pages': 'error',
    },
  },

  // ── Ignore patterns ─────────────────────────────���───────────────────
  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'coverage/',
      'playwright-report/',
      '.test-results/',
      'docs/generated/',
      '*.config.js',
      '*.config.mjs',
    ],
  },
];
