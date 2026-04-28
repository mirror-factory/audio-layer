#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';

import {
  createDefaultSetupConfig,
  generateSetupManifest,
  syncStarterSystem,
  writeSetupConfig,
  type IntegrationKind,
  type PolicyProfile,
  type SetupMode,
  type StarterContext,
  type StarterSetupConfig,
} from './ai-starter-core.js';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

interface SetupArgs {
  yes: boolean;
  mode: SetupMode;
  projectName?: string;
  slug?: string;
  description?: string;
  appType?: StarterSetupConfig['project']['appType'];
  productType?: StarterSetupConfig['project']['productType'];
  provider?: StarterSetupConfig['ai']['provider'];
  defaultModel?: string;
  testModel?: string;
  evalModel?: string;
  profile?: PolicyProfile;
  design?: string;
  visualStyle?: string;
  interactionStyle?: string;
  density?: StarterSetupConfig['design']['density'];
  motionLevel?: StarterSetupConfig['design']['motionLevel'];
  brandColors?: string[];
  referenceSystems?: string[];
  accessibility?: string;
  integrations: string[];
  browserUse?: boolean;
  designDrift?: 'warn' | 'block';
  runtimes: Array<'claude-code' | 'codex'>;
  primaryRuntime?: 'claude-code' | 'codex';
}

export class SetupCancelled extends Error {
  constructor() {
    super('Setup cancelled before writing files.');
    this.name = 'SetupCancelled';
  }
}

export function isSetupCancelledError(error: unknown): error is SetupCancelled {
  return error instanceof SetupCancelled || (
    Boolean(error) &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'SetupCancelled'
  );
}

type Choice<T extends string> = {
  value: T;
  label: string;
  description: string;
};

const PRODUCT_TYPE_OPTIONS: Array<Choice<StarterSetupConfig['project']['productType']>> = [
  { value: 'chat-app', label: 'Chat app', description: 'User-facing conversational product or support assistant.' },
  { value: 'agent-workspace', label: 'Agent workspace', description: 'Human/AI workspace with tools, plans, artifacts, and review.' },
  { value: 'saas-dashboard', label: 'SaaS dashboard', description: 'Account, analytics, billing, admin, or operational SaaS.' },
  { value: 'creative-tool', label: 'Creative tool', description: 'Design, media, brand, document, or generation workspace.' },
  { value: 'internal-tool', label: 'Internal tool', description: 'Workflow software for a team or back-office process.' },
  { value: 'marketplace', label: 'Marketplace', description: 'Two-sided or multi-party commerce/product catalog.' },
  { value: 'custom', label: 'Custom', description: 'Something else; preserve the written description as source of truth.' },
  { value: 'unknown', label: 'Unknown', description: 'Decide later.' },
];

const PROVIDER_OPTIONS: Array<Choice<StarterSetupConfig['ai']['provider']>> = [
  { value: 'vercel-ai-gateway', label: 'Vercel AI Gateway', description: 'Recommended default; provider routing through Vercel.' },
  { value: 'anthropic', label: 'Anthropic direct', description: 'Bypass Gateway and call Anthropic directly.' },
  { value: 'openai', label: 'OpenAI direct', description: 'Bypass Gateway and call OpenAI directly.' },
  { value: 'google', label: 'Google direct', description: 'Bypass Gateway and call Google directly.' },
  { value: 'local', label: 'Local model', description: 'Use a local or private model backend.' },
  { value: 'custom', label: 'Custom provider', description: 'Bring your own provider adapter.' },
];

const DENSITY_OPTIONS: Array<Choice<StarterSetupConfig['design']['density']>> = [
  { value: 'medium', label: 'Medium', description: 'Balanced content density.' },
  { value: 'low', label: 'Low', description: 'More whitespace and calmer screens.' },
  { value: 'high', label: 'High', description: 'Dense command center or pro workspace.' },
  { value: 'custom', label: 'Custom', description: 'Document the custom density in the design summary.' },
];

const MOTION_OPTIONS: Array<Choice<StarterSetupConfig['design']['motionLevel']>> = [
  { value: 'subtle', label: 'Subtle', description: 'Useful transitions only.' },
  { value: 'none', label: 'None', description: 'Static by default; respect reduced motion.' },
  { value: 'expressive', label: 'Expressive', description: 'Visible motion moments for product personality.' },
  { value: 'high', label: 'High', description: 'Motion-first experience with strong choreography.' },
  { value: 'custom', label: 'Custom', description: 'Document the custom motion level in the design summary.' },
];

function log(message: string) {
  process.stdout.write(message + '\n');
}

function splitList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return [];
  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseRuntimeList(value: string): Array<'claude-code' | 'codex'> {
  const tokens = splitList(value).map(item => item.toLowerCase());
  if (tokens.includes('both')) return ['codex', 'claude-code'];
  const runtimes = tokens
    .map(item => (item === 'claude' ? 'claude-code' : item))
    .filter((item): item is 'claude-code' | 'codex' => item === 'claude-code' || item === 'codex');
  return Array.from(new Set(runtimes));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'app';
}

function parseArgs(argv: string[]): SetupArgs {
  const args: SetupArgs = {
    yes: false,
    mode: process.stdin.isTTY ? 'interactive' : 'non-interactive',
    integrations: [],
    runtimes: [],
  };
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
        args.mode = 'non-interactive';
        break;
      case '--project-name':
        args.projectName = value;
        if (consume) index += 1;
        break;
      case '--slug':
        args.slug = value;
        if (consume) index += 1;
        break;
      case '--description':
        args.description = value;
        if (consume) index += 1;
        break;
      case '--app-type':
        args.appType = value as SetupArgs['appType'];
        if (consume) index += 1;
        break;
      case '--product-type':
        args.productType = value as SetupArgs['productType'];
        if (consume) index += 1;
        break;
      case '--provider':
        args.provider = value as SetupArgs['provider'];
        if (consume) index += 1;
        break;
      case '--default-model':
        args.defaultModel = value;
        if (consume) index += 1;
        break;
      case '--test-model':
        args.testModel = value;
        if (consume) index += 1;
        break;
      case '--eval-model':
        args.evalModel = value;
        if (consume) index += 1;
        break;
      case '--profile':
        args.profile = value as PolicyProfile;
        if (consume) index += 1;
        break;
      case '--design':
        args.design = value;
        if (consume) index += 1;
        break;
      case '--visual-style':
        args.visualStyle = value;
        if (consume) index += 1;
        break;
      case '--interaction-style':
        args.interactionStyle = value;
        if (consume) index += 1;
        break;
      case '--density':
        args.density = value as SetupArgs['density'];
        if (consume) index += 1;
        break;
      case '--motion-level':
        args.motionLevel = value as SetupArgs['motionLevel'];
        if (consume) index += 1;
        break;
      case '--brand-colors':
        args.brandColors = value ? splitList(value) : [];
        if (consume) index += 1;
        break;
      case '--reference-systems':
        args.referenceSystems = value ? splitList(value) : [];
        if (consume) index += 1;
        break;
      case '--accessibility':
        args.accessibility = value;
        if (consume) index += 1;
        break;
      case '--integration':
        if (value) args.integrations.push(...value.split(',').map(item => item.trim()).filter(Boolean));
        if (consume) index += 1;
        break;
      case '--browser-use':
        args.browserUse = true;
        break;
      case '--design-drift':
        args.designDrift = value === 'block' ? 'block' : 'warn';
        if (consume) index += 1;
        break;
      case '--runtime':
      case '--runtimes':
        if (value) {
          args.runtimes.push(...parseRuntimeList(value));
        }
        if (consume) index += 1;
        break;
      case '--primary-runtime':
        args.primaryRuntime = value === 'claude' ? 'claude-code' : value as SetupArgs['primaryRuntime'];
        if (consume) index += 1;
        break;
      default:
        break;
    }
  }
  return args;
}

function safePackageName(cwd: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8')) as { name?: string };
    return pkg.name ?? basename(cwd);
  } catch {
    return basename(cwd);
  }
}

async function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
  fallback: string,
): Promise<string> {
  const answer = (await rl.question(`${question} ${CYAN}[${fallback}]${NC} `)).trim();
  return answer || fallback;
}

async function askChoice<T extends string>(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: Array<Choice<T>>,
  fallback: T,
): Promise<T> {
  log('');
  log(`  ${BOLD}${question}${NC}`);
  for (const [index, option] of options.entries()) {
    log(`    ${CYAN}${index + 1}.${NC} ${option.label} ${YELLOW}(${option.value})${NC} — ${option.description}`);
  }
  while (true) {
    const answer = (await rl.question(`  Choose ${CYAN}[${fallback}]${NC} `)).trim();
    const raw = answer || fallback;
    const byIndex = Number(raw);
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= options.length) {
      return options[byIndex - 1]!.value;
    }
    const normalized = raw.toLowerCase();
    const match = options.find(option =>
      option.value.toLowerCase() === normalized ||
      option.label.toLowerCase() === normalized,
    );
    if (match) return match.value;
    log(`  ${YELLOW}!${NC} Unknown choice "${raw}". Use a number or one of: ${options.map(option => option.value).join(', ')}`);
  }
}

async function askBoolean(
  rl: ReturnType<typeof createInterface>,
  question: string,
  fallback: boolean,
): Promise<boolean> {
  const label = fallback ? 'Y/n' : 'y/N';
  while (true) {
    const answer = (await rl.question(`${question} ${CYAN}[${label}]${NC} `)).trim().toLowerCase();
    if (!answer) return fallback;
    if (['y', 'yes'].includes(answer)) return true;
    if (['n', 'no'].includes(answer)) return false;
    log(`  ${YELLOW}!${NC} Answer yes or no.`);
  }
}

function parseEnvKeys(envText: string): Set<string> {
  const keys = new Set<string>();
  for (const rawLine of envText.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const key = line.split('=')[0]?.trim();
    if (key && /^[A-Z0-9_]+$/.test(key)) keys.add(key);
  }
  return keys;
}

function readLocalEnvKeys(cwd: string): Set<string> {
  const text = ['.env.local', '.env.development.local', '.env', '.env.development']
    .map(file => {
      const path = join(cwd, file);
      return existsSync(path) ? readFileSync(path, 'utf-8') : '';
    })
    .join('\n');
  return parseEnvKeys(text);
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(', ') : 'none';
}

function enabledRuntimeIds(config: StarterSetupConfig): Array<'claude-code' | 'codex'> {
  return Object.entries(config.runtimes.enabled)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id as 'claude-code' | 'codex');
}

function selectIntegrations(
  answer: string,
  integrations: StarterSetupConfig['integrations'],
): string[] {
  const choices = integrations.filter(integration => integration.id !== 'vercel-ai-gateway');
  const rawItems = splitList(answer);
  if (rawItems.length === 0) return [];
  if (rawItems.some(item => item.toLowerCase() === 'all')) return choices.map(choice => choice.id);

  const selected = new Set<string>();
  const unknown: string[] = [];
  for (const rawItem of rawItems) {
    const byIndex = Number(rawItem);
    const match = Number.isInteger(byIndex)
      ? choices[byIndex - 1]
      : choices.find(choice =>
          choice.id.toLowerCase() === rawItem.toLowerCase() ||
          choice.label.toLowerCase() === rawItem.toLowerCase(),
        );
    if (match) selected.add(match.id);
    else unknown.push(rawItem);
  }
  if (unknown.length > 0) {
    log(`  ${YELLOW}!${NC} Ignored unknown integration(s): ${unknown.join(', ')}`);
  }
  return Array.from(selected);
}

function validateModelChoice(provider: StarterSetupConfig['ai']['provider'], model: string): string[] {
  const warnings: string[] = [];
  const knownGatewayPrefixes = ['anthropic', 'openai', 'google', 'xai', 'meta', 'mistral', 'cohere', 'deepseek', 'groq'];
  if (provider === 'vercel-ai-gateway') {
    if (!model.includes('/')) {
      warnings.push('Vercel AI Gateway model IDs usually use provider/model format, for example anthropic/claude-sonnet-4-5.');
    } else {
      const prefix = model.split('/')[0] ?? '';
      if (!knownGatewayPrefixes.includes(prefix)) {
        warnings.push(`Gateway provider prefix "${prefix}" is not in the starter's static allowlist. Verify it in Vercel before relying on it.`);
      }
    }
  }
  if (provider !== 'vercel-ai-gateway' && provider !== 'custom' && provider !== 'local' && model.includes('/')) {
    warnings.push(`Direct ${provider} model IDs usually omit the provider prefix. Keep it only if your adapter expects that format.`);
  }
  if (/\b4\.6\b/.test(model)) {
    warnings.push('Model name contains "4.6"; this looks like a future or placeholder model. Verify availability before live testing.');
  }
  return warnings;
}

function printEnvPreview(cwd: string, config: StarterSetupConfig): void {
  const envKeys = readLocalEnvKeys(cwd);
  log('');
  log(`  ${BOLD}Env status preview${NC}`);
  log(`  Local env keys found: ${CYAN}${formatList(Array.from(envKeys).sort())}${NC}`);
  if (config.env.requirements.length === 0) {
    log(`  ${GREEN}✓${NC} No required env groups for this setup.`);
    return;
  }
  for (const requirement of config.env.requirements) {
    const satisfied = requirement.anyOf.some(key => envKeys.has(key));
    log(`  ${satisfied ? GREEN + '✓' : YELLOW + '!'}${NC} ${requirement.label}: one of ${requirement.anyOf.join(' or ')}`);
  }
}

function printIntegrationOptions(config: StarterSetupConfig): void {
  const choices = config.integrations.filter(integration => integration.id !== 'vercel-ai-gateway');
  log('');
  log(`  ${BOLD}Available integrations${NC}`);
  for (const [index, integration] of choices.entries()) {
    log(
      `    ${CYAN}${index + 1}.${NC} ${integration.label} ${YELLOW}(${integration.id})${NC} — env ${formatList(integration.envVars)} · cost ${integration.costTracking}`,
    );
  }
  log(`    ${CYAN}all${NC} enable all listed integrations`);
  log(`    ${CYAN}none${NC} enable none`);
}

function printFinalSummary(config: StarterSetupConfig): void {
  const enabledIntegrations = config.integrations
    .filter(integration => integration.enabled)
    .map(integration => integration.id);
  log('');
  log(`${CYAN}${BOLD}  Setup summary before write${NC}`);
  log(`  Project:       ${config.project.name} (${config.project.slug})`);
  log(`  Product type:  ${config.project.productType}`);
  log(`  Description:   ${config.project.description}`);
  log(`  AI provider:   ${config.ai.provider}`);
  log(`  Default model: ${config.ai.defaultModel}`);
  log(`  Integrations:  ${formatList(enabledIntegrations)}`);
  log(`  Runtimes:      ${formatList(enabledRuntimeIds(config))} (primary ${config.runtimes.primary})`);
  log(`  Env groups:    ${config.env.requirements.length} required group(s)`);
  log(`  Policy:        ${config.policy.profile}, design drift ${config.policy.designDrift}`);
  log(`  Design:        ${config.design.visualStyle}; density ${config.design.density}; motion ${config.design.motionLevel}`);
  log(`  Colors:        ${formatList(config.design.brandColors)}`);
  log(`  References:    ${formatList(config.design.referenceSystems)}`);
  log('');
  log(`  Files to write/update:`);
  log(`    ${CYAN}.ai-starter/config.json${NC}`);
  log(`    ${CYAN}.ai-starter/manifests/setup.json${NC}`);
  log(`    ${CYAN}.env.example${NC} (placeholders only, no secrets)`);
  log(`    ${CYAN}DESIGN.md${NC} (starter-managed design contract section)`);
}

function applyArgsToConfig(config: StarterSetupConfig, args: SetupArgs): StarterSetupConfig {
  const selectedIntegrations = new Set(args.integrations.map(item => item.toLowerCase()));
  const provider = args.provider ?? config.ai.provider;
  const useGateway = provider === 'vercel-ai-gateway';
  const primaryRuntime = args.primaryRuntime ??
    (args.runtimes.length > 0
      ? args.runtimes.includes('codex')
        ? 'codex'
        : 'claude-code'
      : config.runtimes.primary);
  const hasDesignArgs = Boolean(
    args.design ||
    args.visualStyle ||
    args.interactionStyle ||
    args.density ||
    args.motionLevel ||
    args.brandColors ||
    args.referenceSystems ||
    args.accessibility,
  );
  return {
    ...config,
    mode: args.mode,
    project: {
      ...config.project,
      name: args.projectName ?? config.project.name,
      slug: args.slug ?? slugify(args.projectName ?? config.project.slug),
      description: args.description ?? config.project.description,
      appType: args.appType ?? config.project.appType,
      productType: args.productType ?? config.project.productType,
    },
    policy: {
      ...config.policy,
      profile: args.profile ?? config.policy.profile,
      designDrift: args.designDrift ?? config.policy.designDrift,
    },
    runtimes: {
      ...config.runtimes,
      primary: primaryRuntime,
      enabled: {
        ...config.runtimes.enabled,
        ...(args.runtimes.length > 0
          ? {
              'claude-code': args.runtimes.includes('claude-code'),
              codex: args.runtimes.includes('codex'),
            }
          : {}),
      },
    },
    ai: {
      ...config.ai,
      provider,
      useVercelGateway: useGateway,
      defaultModel: args.defaultModel ?? config.ai.defaultModel,
      testModel: args.testModel ?? config.ai.testModel,
      evalModel: args.evalModel ?? config.ai.evalModel,
    },
    modules: {
      ...config.modules,
      browserUse: args.browserUse ?? config.modules.browserUse,
    },
    design: {
      ...config.design,
      brandSummary: args.design ?? config.design.brandSummary,
      visualStyle: args.visualStyle ?? config.design.visualStyle,
      interactionStyle: args.interactionStyle ?? config.design.interactionStyle,
      density: args.density ?? config.design.density,
      motionLevel: args.motionLevel ?? config.design.motionLevel,
      brandColors: args.brandColors ?? config.design.brandColors,
      referenceSystems: args.referenceSystems ?? config.design.referenceSystems,
      accessibility: args.accessibility ?? config.design.accessibility,
      designInputSource: hasDesignArgs ? 'interview' : config.design.designInputSource,
    },
    integrations: config.integrations.map(integration => ({
      ...integration,
      enabled:
        integration.id === 'vercel-ai-gateway'
          ? useGateway
          : selectedIntegrations.has(integration.id) || integration.enabled,
      kind: integration.kind as IntegrationKind,
    })),
  };
}

async function interactiveConfig(config: StarterSetupConfig, context: StarterContext): Promise<StarterSetupConfig> {
  const rl = createInterface({ input, output });
  try {
    log(`\n${CYAN}${BOLD}  AI Starter Kit — First-run Setup Interview${NC}`);
    log(`  This writes a repo contract. It does not write real secrets.\n`);
    printEnvPreview(context.cwd, createDefaultSetupConfig(context, config));

    const projectName = await ask(rl, 'Project name?', config.project.name);
    const productType = await askChoice(
      rl,
      'What kind of product is this?',
      PRODUCT_TYPE_OPTIONS,
      config.project.productType === 'unknown' ? 'creative-tool' : config.project.productType,
    );
    const description = await ask(rl, 'One-sentence product description?', config.project.description);
    const provider = await askChoice(
      rl,
      'AI provider?',
      PROVIDER_OPTIONS,
      config.ai.provider,
    );
    const runtimeAnswer = await ask(
      rl,
      'Agent runtimes? comma-separated: codex, claude-code, or both.',
      formatList(enabledRuntimeIds(config)),
    );
    const runtimes = parseRuntimeList(runtimeAnswer);
    const primaryRuntime = runtimes.includes('codex') ? 'codex' : 'claude-code';
    const defaultModel = await ask(rl, 'Default model?', config.ai.defaultModel);
    for (const warning of validateModelChoice(provider, defaultModel)) {
      log(`  ${YELLOW}! model${NC} ${warning}`);
    }

    printIntegrationOptions(config);
    const defaultIntegrations = config.integrations
      .filter(item => item.enabled && item.id !== 'vercel-ai-gateway')
      .map(item => item.id)
      .join(',') || 'none';
    const integrationsAnswer = await ask(
      rl,
      'Enabled integrations? Use numbers/names, comma-separated, all, or none.',
      defaultIntegrations,
    );
    const integrations = selectIntegrations(integrationsAnswer, config.integrations);

    log('');
    log(`${BOLD}  Design contract${NC}`);
    const design = await ask(rl, 'Brand/design summary?', config.design.brandSummary);
    const visualStyle = await ask(rl, 'Visual style?', config.design.visualStyle);
    const interactionStyle = await ask(rl, 'Interaction style?', config.design.interactionStyle);
    const density = await askChoice(rl, 'Information density?', DENSITY_OPTIONS, config.design.density);
    const motionLevel = await askChoice(rl, 'Motion level?', MOTION_OPTIONS, config.design.motionLevel);
    const brandColors = splitList(await ask(
      rl,
      'Brand colors? comma-separated names/hex/tokens, or none.',
      formatList(config.design.brandColors),
    ));
    const referenceSystems = splitList(await ask(
      rl,
      'Reference systems? comma-separated products/sites/assets, or none.',
      formatList(config.design.referenceSystems),
    ));
    const accessibility = await ask(rl, 'Accessibility rule?', config.design.accessibility);

    const profile = await askChoice(
      rl,
      'Policy profile?',
      [
        { value: 'strict', label: 'Strict', description: 'Default: plans, research, proof, gates, and stop pressure.' },
        { value: 'balanced', label: 'Balanced', description: 'Keeps proof visible but reduces blocking pressure.' },
        { value: 'baseline', label: 'Baseline', description: 'Minimal enforcement for early migration only.' },
      ],
      config.policy.profile,
    );
    const drift = await askChoice(
      rl,
      'Design drift policy?',
      [
        { value: 'warn', label: 'Warn', description: 'Report hardcoded drift without blocking gates.' },
        { value: 'block', label: 'Block', description: 'Fail gates when hardcoded drift is detected.' },
      ],
      config.policy.designDrift,
    );

    const nextConfig = createDefaultSetupConfig(context, applyArgsToConfig(config, {
      yes: false,
      mode: 'interactive',
      projectName,
      slug: slugify(projectName),
      description,
      productType,
      provider,
      runtimes,
      primaryRuntime,
      defaultModel,
      profile,
      design,
      visualStyle,
      interactionStyle,
      density,
      motionLevel,
      brandColors,
      referenceSystems,
      accessibility,
      designDrift: drift,
      integrations,
    }));

    printEnvPreview(context.cwd, nextConfig);
    printFinalSummary(nextConfig);
    const confirmed = await askBoolean(rl, 'Write this setup contract?', true);
    if (!confirmed) throw new SetupCancelled();
    return nextConfig;
  } finally {
    rl.close();
  }
}

export async function runSetup(argv: string[], context: StarterContext): Promise<StarterSetupConfig> {
  const cwd = context.cwd;
  const args = parseArgs(argv);
  let config = createDefaultSetupConfig(context, {
    mode: args.mode,
    project: args.projectName
      ? {
          name: args.projectName,
          slug: args.slug ?? slugify(args.projectName),
          description: args.description ?? 'AI product app managed by the AI Starter Kit.',
          appType: args.appType ?? 'nextjs-ai-app',
          productType: args.productType ?? 'unknown',
        }
      : undefined,
  });

  if (!args.yes && process.stdin.isTTY) {
    config = await interactiveConfig(config, context);
  } else {
    config = createDefaultSetupConfig(context, applyArgsToConfig(config, {
      ...args,
      projectName: args.projectName ?? config.project.name ?? safePackageName(cwd),
      slug: args.slug ?? config.project.slug,
    }));
  }

  const written = writeSetupConfig(context, config);
  const sync = syncStarterSystem(context);
  const manifest = generateSetupManifest(cwd, written);

  log(`\n${CYAN}${BOLD}  AI Starter Kit — Setup${NC}\n`);
  log(`  ${GREEN}✓${NC} Wrote .ai-starter/config.json`);
  log(`  ${GREEN}✓${NC} Wrote .ai-starter/manifests/setup.json`);
  log(`  ${GREEN}✓${NC} Updated ${written.env.examplePath} without secrets`);
  log(`  ${GREEN}✓${NC} Updated DESIGN.md setup contract`);
  log(`  ${GREEN}✓${NC} Synced manifests (${sync.docs} docs, ${sync.features} features, ${sync.companions} companions)`);
  const modelWarnings = validateModelChoice(written.ai.provider, written.ai.defaultModel);
  if (modelWarnings.length > 0) {
    log('');
    log(`  ${YELLOW}!${NC} Model validation warnings:`);
    for (const warning of modelWarnings) {
      log(`    ${YELLOW}!${NC} ${warning}`);
    }
  }
  log('');
  log(`  Status: ${manifest.status === 'configured' ? GREEN : YELLOW}${manifest.status}${NC}`);
  if (manifest.missingGroups.length > 0) {
    log(`  Missing env groups:`);
    for (const group of manifest.missingGroups) {
      log(`    ${YELLOW}!${NC} ${group.label}: one of ${group.anyOf.join(' or ')}`);
    }
    log('');
    log(`  Put secrets in ${CYAN}${written.env.localPath}${NC} or run ${CYAN}vercel env pull ${written.env.localPath} --yes${NC}.`);
  }
  log(`  Next: ${CYAN}pnpm run starter:doctor${NC} or ${CYAN}pnpm exec ai-starter-kit doctor${NC}\n`);
  return written;
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
  runSetup(process.argv.slice(2), {
    cwd: process.cwd(),
    version: readVersion(),
  }).catch(error => {
    if (isSetupCancelledError(error)) {
      log('\n  Setup cancelled. No files were written.\n');
      process.exit(0);
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
