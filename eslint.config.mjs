import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    "dist-electron/**",
    "playwright-report/**",
    "storybook-static/**",
    "test-results/**",
  ]),
  {
    files: [
      "app/auth/confirm/page.tsx",
      "app/dev-kit/status/page.tsx",
      "app/observability/page.tsx",
      "app/profile/page.tsx",
      "app/record/page.tsx",
      "components/live-recorder.tsx",
      "components/live-transcript-view.tsx",
      "components/theme-toggle.tsx",
      "components/ui/liquid-glass-button.tsx",
    ],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/api/dev-kit/**/*.ts", "app/dev-kit/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "app/dev-kit/cost/page.tsx",
      "lib/ai-call.ts",
      "lib/ai-dev-kit/telemetry-persistence.ts",
      "lib/ai/telemetry.ts",
      "lib/project.config.ts",
      "scripts/check-brand-compliance.mts",
      "scripts/check-budget.ts",
      "scripts/check-code-review.mts",
      "scripts/check-impl-doc-diff.mts",
      "scripts/generate-expect-from-manifest.ts",
      "scripts/generate-playwright-from-manifest.ts",
      "scripts/sync-dependencies.ts",
    ],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    files: ["electron/**/*.js", "scripts/check-docs-lookup-coverage.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["types/**/*.d.ts", "lib/ai/devtools.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
