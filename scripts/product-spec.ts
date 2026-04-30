#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';
import {
  createDefaultSetupConfig,
  generateProductSpecArtifact,
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

interface ProductSpecArgs {
  yes: boolean;
  mode?: ProductValidationMode;
  agentFill: boolean;
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

function parseArgs(argv: string[]): ProductSpecArgs {
  const args: ProductSpecArgs = { yes: false, agentFill: false };
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
      case '--agent-fill':
        args.agentFill = true;
        args.yes = true;
        break;
      case '--skip':
      case '--bypass':
        args.mode = 'bypassed';
        args.bypassReason = args.bypassReason ?? 'Bypassed from product spec command.';
        break;
      case '--mode':
        args.mode = value as ProductValidationMode;
        if (consume) index += 1;
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

function applyArgs(context: StarterContext, config: StarterSetupConfig, args: ProductSpecArgs): StarterSetupConfig {
  const fallbackSolution = config.productValidation.proposedSolution || config.project.description;
  return createDefaultSetupConfig(context, {
    ...config,
    productValidation: {
      ...config.productValidation,
      mode: args.mode ?? config.productValidation.mode,
      customer: args.customer ?? (args.agentFill ? config.productValidation.customer || 'Narrow first customer segment' : config.productValidation.customer),
      problem: args.problem ?? (args.agentFill ? config.productValidation.problem || config.project.description : config.productValidation.problem),
      currentWorkaround: args.workaround ?? (args.agentFill ? config.productValidation.currentWorkaround || 'Manual workflow or existing tools' : config.productValidation.currentWorkaround),
      proposedSolution: args.solution ?? (args.agentFill ? fallbackSolution : config.productValidation.proposedSolution),
      pricing: args.pricing ?? (args.agentFill ? config.productValidation.pricing || 'Paid pilot, usage-based tier, or team plan' : config.productValidation.pricing),
      distribution: args.distribution ?? (args.agentFill ? config.productValidation.distribution || 'Direct outreach to the narrow first customer segment' : config.productValidation.distribution),
      timing: args.timing ?? (args.agentFill ? config.productValidation.timing || 'AI workflows need durable context, proof, and cost visibility now' : config.productValidation.timing),
      constraints: args.constraints ?? (args.agentFill ? config.productValidation.constraints || 'Docs, env contract, cost tracking, browser proof, and strict evidence gates' : config.productValidation.constraints),
      bypassReason: args.bypassReason ?? config.productValidation.bypassReason,
    },
  });
}

async function interactiveConfig(context: StarterContext, config: StarterSetupConfig): Promise<StarterSetupConfig> {
  const rl = createInterface({ input, output });
  try {
    log(`\n${CYAN}${BOLD}  AI Starter Kit — YC-Style Product Spec${NC}`);
    log('  This writes .ai-starter/product-spec/latest.md and a starter-managed .ai-dev-kit/spec.md compatibility copy.\n');
    const modeAnswer = (await ask(rl, 'Spec mode? recommended, required, or bypassed.', config.productValidation.mode)).toLowerCase();
    const mode: ProductValidationMode = modeAnswer === 'required' || modeAnswer === 'bypassed' ? modeAnswer : 'recommended';
    let bypassReason = config.productValidation.bypassReason ?? undefined;
    let customer = config.productValidation.customer;
    let problem = config.productValidation.problem;
    let workaround = config.productValidation.currentWorkaround;
    let solution = config.productValidation.proposedSolution || config.project.description;
    let pricing = config.productValidation.pricing;
    let distribution = config.productValidation.distribution;
    let timing = config.productValidation.timing;
    let constraints = config.productValidation.constraints;

    if (mode === 'bypassed') {
      bypassReason = await ask(rl, 'Why bypass the product spec now?', bypassReason ?? 'Exploration/prototype; product risk accepted for this session.');
    } else {
      customer = await ask(rl, 'Customer: who has the pain most often and urgently?', customer || 'Narrow first customer segment');
      problem = await ask(rl, 'Problem: what painful job, cost, delay, or risk exists?', problem || config.project.description);
      workaround = await ask(rl, 'Current workaround: what do they use now?', workaround || 'Manual workflow or existing tools');
      solution = await ask(rl, 'Product promise: what does the product do?', solution);
      pricing = await ask(rl, 'Pricing: what payment or budget signal proves this matters?', pricing || 'Paid pilot, usage-based tier, or team plan');
      distribution = await ask(rl, 'Distribution: where do the first 100 users come from?', distribution || 'Direct outreach to the narrow segment');
      timing = await ask(rl, 'Why now?', timing || 'AI automation, browser proof, and durable context are now practical');
      constraints = await ask(rl, 'Constraints: technical/security/legal/support limits?', constraints || 'Docs, env, provider cost, browser proof, and security gates');
    }

    const nextConfig = applyArgs(context, config, {
      yes: false,
      agentFill: false,
      mode,
      customer,
      problem,
      workaround,
      solution,
      pricing,
      distribution,
      timing,
      constraints,
      bypassReason,
    });
    return createDefaultSetupConfig(context, { ...nextConfig, mode: 'interactive' });
  } finally {
    rl.close();
  }
}

export async function runProductSpec(argv: string[], context: StarterContext): Promise<void> {
  const args = parseArgs(argv);
  let config = createDefaultSetupConfig(context);
  if (!args.yes && process.stdin.isTTY) {
    config = await interactiveConfig(context, config);
  } else {
    config = applyArgs(context, config, args);
  }
  const written = writeSetupConfig(context, config);
  const artifact = generateProductSpecArtifact(written);
  syncStarterSystem(context);
  log(`\n${CYAN}${BOLD}  Product Spec Saved${NC}\n`);
  log(`  ${GREEN}✓${NC} Status: ${artifact.status}`);
  log(`  ${GREEN}✓${NC} Source: ${artifact.source}`);
  log(`  ${GREEN}✓${NC} Spec: .ai-starter/product-spec/latest.md`);
  log(`  ${GREEN}✓${NC} Compatibility: .ai-dev-kit/spec.md (only overwritten when starter-managed)`);
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
  runProductSpec(process.argv.slice(2), {
    cwd: process.cwd(),
    version: readVersion(),
  }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
