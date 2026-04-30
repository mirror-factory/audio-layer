#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';
import {
  createDefaultSetupConfig,
  syncStarterSystem,
  writeMfdrArtifacts,
  type MfdrOverrides,
  type StarterContext,
} from './ai-starter-core.js';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

interface MfdrArgs {
  yes: boolean;
  complete: boolean;
  title?: string;
  hypothesis?: string;
  productThesis?: string;
  research?: string[];
  api?: string;
  tools?: string[];
  ui?: string;
  verification?: string[];
  risks?: string[];
  openQuestions?: string[];
  nextStep?: string;
}

function log(message: string): void {
  process.stdout.write(message + '\n');
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function parseArgs(argv: string[]): MfdrArgs {
  const args: MfdrArgs = { yes: false, complete: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const [key, inlineValue] = arg.split('=');
    const next = inlineValue ?? argv[index + 1];
    const consume = inlineValue === undefined && next && !next.startsWith('-');
    const value = consume ? next : inlineValue;
    switch (key) {
      case '--yes':
      case '-y':
        args.yes = true;
        break;
      case '--complete':
        args.complete = true;
        break;
      case '--title':
        args.title = value;
        if (consume) index += 1;
        break;
      case '--hypothesis':
        args.hypothesis = value;
        if (consume) index += 1;
        break;
      case '--product-thesis':
      case '--thesis':
        args.productThesis = value;
        if (consume) index += 1;
        break;
      case '--research':
        args.research = splitList(value);
        if (consume) index += 1;
        break;
      case '--api':
      case '--apis':
        args.api = value;
        if (consume) index += 1;
        break;
      case '--tools':
        args.tools = splitList(value);
        if (consume) index += 1;
        break;
      case '--ui':
        args.ui = value;
        if (consume) index += 1;
        break;
      case '--verification':
        args.verification = splitList(value);
        if (consume) index += 1;
        break;
      case '--risks':
        args.risks = splitList(value);
        if (consume) index += 1;
        break;
      case '--open-questions':
        args.openQuestions = splitList(value);
        if (consume) index += 1;
        break;
      case '--next-step':
        args.nextStep = value;
        if (consume) index += 1;
        break;
      default:
        break;
    }
  }
  return args;
}

async function ask(rl: ReturnType<typeof createInterface>, question: string, fallback: string): Promise<string> {
  const answer = (await rl.question(`${question} ${CYAN}[${fallback}]${NC} `)).trim();
  return answer || fallback;
}

async function interactiveOverrides(context: StarterContext): Promise<MfdrOverrides> {
  const config = createDefaultSetupConfig(context);
  const rl = createInterface({ input, output });
  try {
    log(`\n${CYAN}${BOLD}  AI Starter Kit — MFDR${NC}`);
    log('  This writes the technical decision/spec record for product, APIs, tools, UI, research, risks, and verification.\n');
    const title = await ask(rl, 'MFDR title?', `${config.project.name} MFDR`);
    const hypothesis = await ask(
      rl,
      'Hypothesis?',
      `If ${config.project.name} solves the validated pain with strict evidence, users will trust the agent-built result enough to continue.`,
    );
    const productThesis = await ask(rl, 'Product/feature thesis?', config.project.description);
    const research = await ask(rl, 'Research basis? comma-separated docs, competitors, APIs, or sources?', 'docs registry, product validation, existing repo patterns');
    const api = await ask(rl, 'API/service approach?', 'Register every external API with docs, env vars, cost tracking, failure modes, and contract tests.');
    const tools = await ask(rl, 'Tooling approach? comma-separated', 'plan, sync, score, browser:proof, gates, report');
    const ui = await ask(rl, 'UI/design approach?', config.design.brandSummary);
    const verification = await ask(rl, 'Verification commands? comma-separated', 'pnpm sync,pnpm typecheck,pnpm test,pnpm browser:proof,pnpm gates,pnpm score,pnpm report');
    const risks = await ask(rl, 'Main risks? comma-separated', 'stale decisions, missing Expect proof, untracked API cost');
    const openQuestions = await ask(rl, 'Open questions? comma-separated or none', 'none');
    const nextStep = await ask(rl, 'Next step?', 'Create the feature plan and implement the next verified slice.');
    const openQuestionList = splitList(openQuestions).filter(item => item.toLowerCase() !== 'none');
    return {
      source: 'interview',
      status: openQuestionList.length === 0 ? 'complete' : 'draft',
      title,
      hypothesis,
      productThesis,
      researchBasis: splitList(research),
      decisions: [
        {
          area: 'api',
          choice: api,
          why: 'The API/service approach is part of the durable MFDR decision record.',
          alternatives: ['direct provider SDK without a registry', 'manual cost tracking after launch', 'defer API integration until after prototype proof'],
          tradeoffs: ['More upfront specification', 'Better testing, cost, and failure-mode visibility'],
          evidence: ['.ai-starter/manifests/integrations.json'],
          verification: ['pnpm test', 'pnpm gates'],
        },
        {
          area: 'tooling',
          choice: splitList(tools).join(', '),
          why: 'The tool approach defines how the agent should build and prove work.',
          alternatives: ['prompt-only workflow', 'ad hoc scripts without manifests', 'single-agent work with no hook context'],
          tradeoffs: ['More commands per feature', 'Less silent drift'],
          evidence: ['AGENTS.md', '.ai-starter/manifests/starter.json'],
          verification: ['pnpm sync', 'pnpm score'],
        },
        {
          area: 'ui',
          choice: ui,
          why: 'The UI approach should match DESIGN.md/tokens and be verified visually.',
          alternatives: ['untracked visual edits', 'component screenshots without user-flow proof', 'generic starter UI without a design contract'],
          tradeoffs: ['Design constraints can block fast but inconsistent changes', 'Reusable visual language improves output quality'],
          evidence: ['DESIGN.md', '.ai-starter/manifests/design.json'],
          verification: ['pnpm design:check', 'pnpm browser:proof'],
        },
      ],
      toolPlan: splitList(tools),
      uiPlan: {
        designContract: ui,
        designTokens: 'Use DESIGN.md and .ai-starter/manifests/design.json as the token/design source.',
        interactionModel: config.design.interactionStyle,
        visualProof: 'Run Playwright/Expect proof and capture screenshots after user-visible UI changes.',
      },
      verificationPlan: {
        commands: splitList(verification),
        browserProof: 'Run against a live local dev server with AI_STARTER_BASE_URL or PLAYWRIGHT_BASE_URL.',
        expectRequired: config.policy.expectRequired,
        storybookRequired: config.policy.storybookRequired,
        designDriftPolicy: config.policy.designDrift,
      },
      risks: splitList(risks),
      openQuestions: openQuestionList,
      nextStep,
    };
  } finally {
    rl.close();
  }
}

function argsToOverrides(args: MfdrArgs): MfdrOverrides {
  const overrides: MfdrOverrides = {
    source: 'manual',
    status: args.complete ? 'complete' : undefined,
    title: args.title,
    hypothesis: args.hypothesis,
    productThesis: args.productThesis,
    researchBasis: args.research,
    toolPlan: args.tools,
    risks: args.risks,
    openQuestions: args.openQuestions,
    nextStep: args.nextStep,
  };
  if (args.ui || args.verification) {
    const config = createDefaultSetupConfig({ cwd: process.cwd() });
    overrides.uiPlan = args.ui
      ? {
          designContract: args.ui,
          designTokens: 'Use DESIGN.md and .ai-starter/manifests/design.json as the token/design source.',
          interactionModel: config.design.interactionStyle,
          visualProof: 'Run Playwright/Expect proof and capture screenshots after user-visible UI changes.',
        }
      : undefined;
    overrides.verificationPlan = args.verification
      ? {
          commands: args.verification,
          browserProof: 'Run against a live local dev server with AI_STARTER_BASE_URL or PLAYWRIGHT_BASE_URL.',
          expectRequired: config.policy.expectRequired,
          storybookRequired: config.policy.storybookRequired,
          designDriftPolicy: config.policy.designDrift,
        }
      : undefined;
  }
  if (args.api) {
    overrides.decisions = [
      {
        area: 'api',
        choice: args.api,
        why: 'Recorded from MFDR command arguments.',
        alternatives: ['unregistered API usage', 'manual-only provider tracking', 'defer external provider use'],
        tradeoffs: ['Explicit service decision', 'Requires matching docs/tests/cost tracking'],
        evidence: ['.ai-starter/manifests/integrations.json'],
        verification: ['pnpm test', 'pnpm gates'],
      },
    ];
  }
  return overrides;
}

export async function runMfdr(argv: string[], context: StarterContext): Promise<void> {
  const args = parseArgs(argv);
  const config = createDefaultSetupConfig(context);
  const overrides = !args.yes && process.stdin.isTTY
    ? await interactiveOverrides(context)
    : argsToOverrides(args);
  const artifact = writeMfdrArtifacts(context, config, overrides);
  syncStarterSystem(context);
  log(`\n${CYAN}${BOLD}  MFDR Saved${NC}\n`);
  log(`  ${GREEN}✓${NC} Status: ${artifact.status}`);
  log(`  ${GREEN}✓${NC} Memo: .ai-starter/mfdr/latest.md`);
  log(`  ${GREEN}✓${NC} Decisions: ${artifact.decisions.length}`);
  if (artifact.openQuestions.length > 0) {
    log(`  ${YELLOW}!${NC} Open questions: ${artifact.openQuestions.join('; ')}`);
  }
  log('');
}

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  runMfdr(process.argv.slice(2), {
    cwd: process.cwd(),
    version: readVersion(),
  }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
