#!/usr/bin/env tsx
/**
 * Free Expect-style test runner using local models via Ollama.
 *
 * Replicates the diff -> plan -> execute pattern using a local model
 * served by Ollama -- $0 per run.
 *
 * v1 only GENERATES the plan. It does NOT translate it into Playwright code.
 *
 * Usage:
 *   pnpm test:ai:local                       # diff-based plan
 *   pnpm test:ai:local -- --scenario "Test chat flow"
 *   pnpm test:ai:local -- --file path/to/file.tsx
 *
 * HOW TO CUSTOMIZE:
 * 1. Update the model import to use your model-router.ts
 * 2. Update SYSTEM_PROMPT for your app's domain
 * 3. Install Ollama and pull your preferred model
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// TODO: Replace with your model-router import once wired
// import { generateText } from 'ai';
// import { getChatModel } from '../lib/ai/model-router';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

type Args = { scenario?: string; file?: string; tool?: string; help?: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const next = argv[i + 1];
    if (a === '--scenario' && next) { args.scenario = next; i++; }
    else if (a === '--file' && next) { args.file = next; i++; }
    else if (a === '--tool' && next) { args.tool = next; i++; }
    else if (a === '--help' || a === '-h') { args.help = true; }
  }
  return args;
}

function printHelp() {
  console.log(`
${BOLD}Free AI Test Runner${RESET} ${DIM}(local Ollama)${RESET}

Usage:
  pnpm test:ai:local                       # diff-based plan
  pnpm test:ai:local -- --scenario "..."    # plan from scenario text
  pnpm test:ai:local -- --file path.tsx    # plan for a single file

Options:
  --scenario <text>   Describe what to test
  --file <path>       Use the diff of one file only
  --tool <name>       Generate a plan for a specific tool
  -h, --help          Show this help

Cost: $0 (local Ollama)
`);
}

function safeExec(cmd: string): string {
  try { return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; }
}

function getGitDiff(filePath?: string): string {
  const scope = filePath ? ` -- ${JSON.stringify(filePath)}` : '';
  const stat = safeExec(`git diff HEAD --stat${scope}`);
  const body = safeExec(`git diff HEAD${scope}`);
  if (!stat && !body) {
    const lastStat = safeExec(`git show HEAD --stat${scope}`);
    const lastBody = safeExec(`git show HEAD${scope}`);
    return `[no uncommitted changes -- showing HEAD commit]\n\n${lastStat}\n\n${lastBody.slice(0, 8000)}`;
  }
  return `${stat}\n\n${body.slice(0, 8000)}`;
}

async function checkOllama(): Promise<{ ok: boolean; models: string[]; error?: string }> {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const res = await fetch(`${baseURL}/api/tags`);
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return { ok: true, models: (data.models || []).map((m) => m.name) };
  } catch (err) {
    return { ok: false, models: [], error: (err as Error).message };
  }
}

// TODO: Replace this with actual AI generation once you wire up model-router
async function generatePlan(input: { diff?: string; scenario?: string; tool?: string; branch: string; sha: string }): Promise<{ text: string; ms: number }> {
  const start = Date.now();

  // Placeholder: When you wire up model-router, replace this with:
  // const model = getChatModel('smart');
  // const result = await generateText({ model, system: SYSTEM_PROMPT, prompt: buildUserPrompt(input), maxOutputTokens: 600 });
  // return { text: result.text?.trim() || '', ms: Date.now() - start };

  const text = [
    '1. Navigate to the app at http://localhost:3000',
    '2. Verify the page loads without console errors',
    '3. Check that the main content is visible',
    '4. (Placeholder -- wire up model-router for real AI plans)',
  ].join('\n');

  return { text, ms: Date.now() - start };
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return; }

  process.env.USE_LOCAL_MODELS = 'true';

  console.log(`\n${BOLD}${CYAN}Free AI Test Runner${RESET} ${DIM}(local Ollama)${RESET}`);
  console.log(`${DIM}  ─────────────────────────────────────────────${RESET}\n`);

  process.stdout.write(`${DIM}  checking Ollama...${RESET} `);
  const health = await checkOllama();
  if (!health.ok) {
    console.log(`${RED}x${RESET}`);
    console.log(`\n${RED}Ollama is not reachable: ${health.error}${RESET}`);
    console.log(`${DIM}  Start Ollama with: ${RESET}ollama serve\n`);
    process.exit(1);
  }
  console.log(`${GREEN}ok${RESET} ${DIM}${health.models.length} models${RESET}`);

  const branch = safeExec('git branch --show-current').trim() || 'unknown';
  const sha = safeExec('git rev-parse --short HEAD').trim() || 'unknown';
  let diff: string | undefined;
  let source: string;

  if (args.scenario) { source = `scenario: "${args.scenario}"`; }
  else if (args.tool) { source = `tool: ${args.tool}`; }
  else {
    diff = getGitDiff(args.file);
    source = args.file ? `diff of ${args.file}` : 'git diff HEAD';
    if (!diff.trim()) { console.log(`\n${YELLOW}  Empty diff -- pass --scenario instead.${RESET}\n`); process.exit(0); }
  }

  console.log(`${DIM}  source: ${RESET}${source}`);
  console.log(`${DIM}  branch: ${RESET}${branch} ${DIM}(${sha})${RESET}\n`);

  process.stdout.write(`${DIM}  generating plan...${RESET} `);
  const { text: plan, ms: planMs } = await generatePlan({ diff, scenario: args.scenario, tool: args.tool, branch, sha });
  if (!plan) { console.log(`${RED}empty plan${RESET}\n`); process.exit(1); }
  console.log(`${GREEN}ok${RESET} ${DIM}${planMs}ms${RESET}`);

  const outputDir = resolve(process.cwd(), '.evidence/ai-test-runs', timestampSlug());
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'plan.md'), `# AI Test Plan\n\n**Source:** ${source}\n**Branch:** ${branch} (${sha})\n\n---\n\n${plan}\n`);
  writeFileSync(join(outputDir, 'meta.json'), JSON.stringify({ timestamp: new Date().toISOString(), branch, sha, source, cost: '$0', durationMs: planMs, version: 'v1-plan-only' }, null, 2));
  if (diff) writeFileSync(join(outputDir, 'diff.txt'), diff);

  console.log(`\n${BOLD}Plan${RESET}`);
  for (const line of plan.split('\n')) console.log(`  ${line}`);
  console.log(`\n  ${GREEN}Done${RESET}  ${DIM}cost: $0   latency: ${planMs}ms${RESET}\n`);
}

main().catch((err) => { console.error(`\n${RED}fatal:${RESET}`, err); process.exit(1); });
void existsSync;
