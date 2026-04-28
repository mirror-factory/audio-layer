/**
 * Drift Rules -- pattern-based detection of deprecated library usage.
 *
 * Each rule describes a known-deprecated pattern. Rules are grouped by
 * library so detect-drift.ts can map file paths -> libraries -> rules.
 *
 * HOW TO CUSTOMIZE:
 * 1. Add rules for your project's libraries and frameworks
 * 2. Update TRIGGER_MAP for your file structure
 * 3. Add new library rule arrays as needed
 *
 * Copied from vercel-ai-starter-kit. Customize for your project.
 */

export type DriftSeverity = 'error' | 'warning';

export interface DriftRule {
  id: string;
  library: string;
  severity: DriftSeverity;
  pattern: RegExp | string;
  filePattern: string;
  message: string;
  fix: string;
}

// -- AI SDK v5 -> v6 deprecation rules --

const AI_SDK_V6_RULES: DriftRule[] = [
  {
    id: 'ai-sdk-v6-parameters',
    library: 'ai-sdk-v6',
    severity: 'error',
    pattern: /\bparameters\s*:\s*z\./,
    filePattern: 'lib/ai/**',
    message: 'AI SDK v6 uses `inputSchema` not `parameters`',
    fix: 'Rename `parameters:` to `inputSchema:` in tool() definitions',
  },
  {
    id: 'ai-sdk-v6-to-data-stream',
    library: 'ai-sdk-v6',
    severity: 'error',
    pattern: /toDataStreamResponse\s*\(/,
    filePattern: 'app/api/**',
    message: 'AI SDK v6 uses `toUIMessageStreamResponse()` not `toDataStreamResponse()`',
    fix: 'Replace with `toUIMessageStreamResponse()`',
  },
  {
    id: 'ai-sdk-v6-max-steps',
    library: 'ai-sdk-v6',
    severity: 'error',
    pattern: /\bmaxSteps\s*:\s*\d+/,
    filePattern: 'app/api/**',
    message: 'AI SDK v6 uses `stopWhen: stepCountIs(n)` not `maxSteps: n`',
    fix: 'Replace with `stopWhen: stepCountIs(N)`',
  },
  {
    id: 'ai-sdk-v6-add-tool-result',
    library: 'ai-sdk-v6',
    severity: 'error',
    pattern: /\baddToolResult\s*\(/,
    filePattern: 'components/**',
    message: 'AI SDK v6 uses `addToolOutput()` not `addToolResult()`',
    fix: 'Rename to `addToolOutput({ tool, toolCallId, output })`',
  },
  {
    id: 'ai-sdk-v6-generate-object',
    library: 'ai-sdk-v6',
    severity: 'error',
    pattern: /\bgenerateObject\s*\(/,
    filePattern: 'lib/ai/**',
    message: '`generateObject()` is deprecated in v6',
    fix: 'Use `generateText({ output: Output.object({ schema }) })`',
  },
  {
    id: 'ai-sdk-v6-tool-invocations',
    library: 'ai-sdk-v6',
    severity: 'warning',
    pattern: /message\.toolInvocations\b/,
    filePattern: 'components/**',
    message: 'AI SDK v6 uses `message.parts[]` not `message.toolInvocations[]`',
    fix: 'Iterate `message.parts` and branch on `part.type`',
  },
  {
    id: 'ai-sdk-v6-append',
    library: 'ai-sdk-v6',
    severity: 'warning',
    pattern: /\bappend\s*\(\s*\{[^}]*role\s*:\s*['"]user['"]/,
    filePattern: 'components/**',
    message: 'AI SDK v6 uses `sendMessage({ text })` not `append()`',
    fix: 'Replace with `sendMessage({ text })`',
  },
  {
    id: 'ai-sdk-v6-convert-to-core',
    library: 'ai-sdk-v6',
    severity: 'warning',
    pattern: /\bconvertToCoreMessages\s*\(/,
    filePattern: 'app/api/**',
    message: 'v6 uses `await convertToModelMessages()` not `convertToCoreMessages()`',
    fix: 'Replace with `await convertToModelMessages(messages)`',
  },
];

// -- Next.js 15 rules --

const NEXT_15_RULES: DriftRule[] = [
  {
    id: 'next-15-sync-params',
    library: 'next-15',
    severity: 'error',
    pattern: /params\s*:\s*\{\s*\w+\s*:\s*string\s*\}/,
    filePattern: 'app/api/**',
    message: 'Next 15 route params are async: `params: Promise<{ id: string }>`',
    fix: 'Type params as `Promise<{...}>` and `await params`',
  },
  {
    id: 'next-15-cookies-sync',
    library: 'next-15',
    severity: 'warning',
    pattern: /\bcookies\(\)\.get\(/,
    filePattern: 'app/**',
    message: 'Next 15 `cookies()` is async',
    fix: 'Use `const store = await cookies(); store.get(...)`',
  },
];

// -- Playwright rules --

const PLAYWRIGHT_RULES: DriftRule[] = [
  {
    id: 'playwright-wait-for-timeout',
    library: 'playwright',
    severity: 'warning',
    pattern: /page\.waitForTimeout\s*\(/,
    filePattern: 'tests/e2e/**',
    message: 'Avoid `page.waitForTimeout()` (flaky)',
    fix: 'Use auto-waiting locators like `await expect(locator).toBeVisible()`',
  },
];

export const DRIFT_RULES: DriftRule[] = [
  ...AI_SDK_V6_RULES,
  ...NEXT_15_RULES,
  ...PLAYWRIGHT_RULES,
];

// -- File path -> library mapping --
// TODO: Update prefixes for your project structure

export const TRIGGER_MAP: Array<{ prefix: string; libraries: string[] }> = [
  { prefix: 'lib/ai/', libraries: ['ai-sdk-v6'] },
  { prefix: 'app/api/chat/', libraries: ['ai-sdk-v6', 'next-15'] },
  { prefix: 'app/api/', libraries: ['next-15'] },
  { prefix: 'app/', libraries: ['next-15'] },
  { prefix: 'components/', libraries: ['ai-sdk-v6'] },
  { prefix: 'tests/e2e/', libraries: ['playwright'] },
];

export function getLibrariesForFile(filePath: string): Set<string> {
  const libs = new Set<string>();
  for (const { prefix, libraries } of TRIGGER_MAP) {
    if (filePath.startsWith(prefix)) for (const lib of libraries) libs.add(lib);
  }
  return libs;
}

export function matchesGlob(filePath: string, glob: string): boolean {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '@@DOUBLESTAR@@').replace(/\*/g, '[^/]*').replace(/@@DOUBLESTAR@@/g, '.*');
  return new RegExp('^' + escaped + '$').test(filePath);
}
