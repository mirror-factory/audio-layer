#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';
import {
  createDefaultSetupConfig,
  generateProductValidationArtifact,
  syncStarterSystem,
  writeSetupConfig,
  type ProductValidationMode,
  type StarterContext,
  type StarterSetupConfig,
} from './ai-starter-core.js';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

interface ProductValidationArgs {
  yes: boolean;
  mode?: ProductValidationMode;
  customer?: string;
  problem?: string;
  workaround?: string;
  solution?: string;
  pricing?: string;
  distribution?: string;
  timing?: string;
  constraints?: string;
  bypassReason?: string;
}

function log(message: string): void {
  process.stdout.write(message + '\n');
}

function parseArgs(argv: string[]): ProductValidationArgs {
  const args: ProductValidationArgs = { yes: false };
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
      case '--mode':
        args.mode = value as ProductValidationMode;
        if (consume) index += 1;
        break;
      case '--skip':
      case '--bypass':
        args.mode = 'bypassed';
        args.bypassReason = args.bypassReason ?? 'Bypassed from product validation command.';
        break;
      case '--customer':
        args.customer = value;
        if (consume) index += 1;
        break;
      case '--problem':
        args.problem = value;
        if (consume) index += 1;
        break;
      case '--workaround':
        args.workaround = value;
        if (consume) index += 1;
        break;
      case '--solution':
        args.solution = value;
        if (consume) index += 1;
        break;
      case '--pricing':
        args.pricing = value;
        if (consume) index += 1;
        break;
      case '--distribution':
        args.distribution = value;
        if (consume) index += 1;
        break;
      case '--timing':
        args.timing = value;
        if (consume) index += 1;
        break;
      case '--constraints':
        args.constraints = value;
        if (consume) index += 1;
        break;
      case '--bypass-reason':
        args.bypassReason = value;
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

async function askMode(rl: ReturnType<typeof createInterface>, fallback: ProductValidationMode): Promise<ProductValidationMode> {
  while (true) {
    const answer = (await rl.question(`Validation mode: recommended, required, or bypassed? ${CYAN}[${fallback}]${NC} `)).trim();
    const mode = (answer || fallback).toLowerCase();
    if (mode === 'recommended' || mode === 'required' || mode === 'bypassed') return mode;
    log(`  ${YELLOW}!${NC} Use recommended, required, or bypassed.`);
  }
}

function applyValidationArgs(context: StarterContext, config: StarterSetupConfig, args: ProductValidationArgs): StarterSetupConfig {
  return createDefaultSetupConfig(context, {
    ...config,
    productValidation: {
      ...config.productValidation,
      mode: args.mode ?? config.productValidation.mode,
      customer: args.customer ?? config.productValidation.customer,
      problem: args.problem ?? config.productValidation.problem,
      currentWorkaround: args.workaround ?? config.productValidation.currentWorkaround,
      proposedSolution: args.solution ?? config.productValidation.proposedSolution,
      pricing: args.pricing ?? config.productValidation.pricing,
      distribution: args.distribution ?? config.productValidation.distribution,
      timing: args.timing ?? config.productValidation.timing,
      constraints: args.constraints ?? config.productValidation.constraints,
      bypassReason: args.bypassReason ?? config.productValidation.bypassReason,
    },
  });
}

async function interactiveConfig(context: StarterContext, config: StarterSetupConfig): Promise<StarterSetupConfig> {
  const rl = createInterface({ input, output });
  try {
    log(`\n${CYAN}${BOLD}  AI Starter Kit — Product Validation${NC}`);
    log('  This writes the product validation memo and refreshes the linked YC-style product spec. It does not block unless mode is required.\n');
    const mode = await askMode(rl, config.productValidation.mode);
    let bypassReason = config.productValidation.bypassReason ?? null;
    let customer = config.productValidation.customer;
    let problem = config.productValidation.problem;
    let workaround = config.productValidation.currentWorkaround;
    let solution = config.productValidation.proposedSolution || config.project.description;
    let pricing = config.productValidation.pricing;
    let distribution = config.productValidation.distribution;
    let timing = config.productValidation.timing;
    let constraints = config.productValidation.constraints;

    if (mode === 'bypassed') {
      bypassReason = await ask(rl, 'Why bypass validation?', bypassReason ?? 'Exploration/prototype; product risk accepted for this session.');
    } else {
      customer = await ask(rl, 'Customer: who has the pain most often and urgently?', customer || 'Narrow first customer segment');
      problem = await ask(rl, 'Problem: what painful job, cost, delay, or risk exists?', problem || config.project.description);
      workaround = await ask(rl, 'Current workaround: what do they use now?', workaround || 'Manual workflow or existing tools');
      solution = await ask(rl, 'Proposed solution: what does the product do?', solution || config.project.description);
      pricing = await ask(rl, 'Pricing: why would someone pay?', pricing || 'Paid pilot, usage-based tier, or team plan');
      distribution = await ask(rl, 'Distribution: where do first 100 users come from?', distribution || 'Direct outreach to the narrow segment');
      timing = await ask(rl, 'Timing: why now?', timing || 'AI automation and verification workflows are now practical');
      constraints = await ask(rl, 'Constraints: technical/security/legal/support limits?', constraints || 'Schemas, tests, docs, credentials, cost tracking, support burden');
    }

    return applyValidationArgs(context, config, {
      yes: false,
      mode,
      customer,
      problem,
      workaround,
      solution,
      pricing,
      distribution,
      timing,
      constraints,
      bypassReason: bypassReason ?? undefined,
    });
  } finally {
    rl.close();
  }
}

export async function runProductValidation(argv: string[], context: StarterContext): Promise<void> {
  const args = parseArgs(argv);
  let config = createDefaultSetupConfig(context);
  if (!args.yes && process.stdin.isTTY) {
    config = await interactiveConfig(context, config);
  } else {
    config = applyValidationArgs(context, config, args);
  }
  const written = writeSetupConfig(context, config);
  const artifact = generateProductValidationArtifact(written);
  syncStarterSystem(context);
  log(`\n${CYAN}${BOLD}  Product Validation Saved${NC}\n`);
  log(`  ${GREEN}✓${NC} Status: ${artifact.status}`);
  log(`  ${GREEN}✓${NC} Verdict: ${artifact.verdict}`);
  log(`  ${GREEN}✓${NC} Memo: .ai-starter/product-validation/latest.md`);
  log(`  ${GREEN}✓${NC} Product spec: .ai-starter/product-spec/latest.md`);
  log(`  ${GREEN}✓${NC} Alignment: .ai-starter/alignment/latest.md`);
  if (artifact.unanswered.length > 0) {
    log(`  ${YELLOW}!${NC} Missing: ${artifact.unanswered.join(', ')}`);
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
  runProductValidation(process.argv.slice(2), {
    cwd: process.cwd(),
    version: readVersion(),
  }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
