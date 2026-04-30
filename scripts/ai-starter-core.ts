import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, extname, join, relative, resolve } from 'path';
import { execSync } from 'child_process';

export const STARTER_ROOT = '.ai-starter';
export const MANIFESTS_DIR = `${STARTER_ROOT}/manifests`;
export const PLANS_DIR = `${STARTER_ROOT}/plans`;
export const RUNS_DIR = `${STARTER_ROOT}/runs`;
export const REPORTS_DIR = `${STARTER_ROOT}/reports`;
export const PRODUCT_VALIDATION_DIR = `${STARTER_ROOT}/product-validation`;
export const PRODUCT_SPEC_DIR = `${STARTER_ROOT}/product-spec`;
export const MFDR_DIR = `${STARTER_ROOT}/mfdr`;
export const ALIGNMENT_DIR = `${STARTER_ROOT}/alignment`;
export const SETUP_CONFIG_FILE = `${STARTER_ROOT}/config.json`;
export const SETUP_MANIFEST_FILE = `${MANIFESTS_DIR}/setup.json`;
export const SESSION_FILE = `${STARTER_ROOT}/session.json`;
export const PROGRESS_FILE = `${STARTER_ROOT}/progress.json`;
export const STARTER_MANIFEST_FILE = `${MANIFESTS_DIR}/starter.json`;
export const DOCS_REGISTRY_FILE = `${MANIFESTS_DIR}/docs.json`;
export const HOOK_REGISTRY_FILE = `${MANIFESTS_DIR}/hooks.json`;
export const RUNTIME_MANIFEST_FILE = `${MANIFESTS_DIR}/runtimes.json`;
export const EVIDENCE_REGISTRY_FILE = `${MANIFESTS_DIR}/evidence.json`;
export const FEATURE_MANIFEST_FILE = `${MANIFESTS_DIR}/features.json`;
export const COMPANION_MANIFEST_FILE = `${MANIFESTS_DIR}/companions.json`;
export const MODULE_MANIFEST_FILE = `${MANIFESTS_DIR}/modules.json`;
export const ADAPTER_MANIFEST_FILE = `${MANIFESTS_DIR}/adapters.json`;
export const INTEGRATION_MANIFEST_FILE = `${MANIFESTS_DIR}/integrations.json`;
export const SUPERVISOR_MANIFEST_FILE = `${MANIFESTS_DIR}/supervisor.json`;
export const DESIGN_REGISTRY_FILE = `${MANIFESTS_DIR}/design.json`;
export const BROWSER_PROOF_MANIFEST_FILE = `${MANIFESTS_DIR}/browser-proof.json`;
export const PRODUCT_VALIDATION_MANIFEST_FILE = `${MANIFESTS_DIR}/product-validation.json`;
export const PRODUCT_SPEC_MANIFEST_FILE = `${MANIFESTS_DIR}/product-spec.json`;
export const MFDR_MANIFEST_FILE = `${MANIFESTS_DIR}/mfdr.json`;
export const ALIGNMENT_MANIFEST_FILE = `${MANIFESTS_DIR}/alignment.json`;
export const SCORECARD_FILE = `${RUNS_DIR}/latest-scorecard.json`;
export const LATEST_PLAN_FILE = `${PLANS_DIR}/latest.json`;
export const LATEST_REPORT_FILE = `${REPORTS_DIR}/latest.md`;
export const LATEST_ITERATION_FILE = `${RUNS_DIR}/latest-iteration.json`;
export const LATEST_PRODUCT_VALIDATION_JSON_FILE = `${PRODUCT_VALIDATION_DIR}/latest.json`;
export const LATEST_PRODUCT_VALIDATION_MD_FILE = `${PRODUCT_VALIDATION_DIR}/latest.md`;
export const LATEST_PRODUCT_SPEC_JSON_FILE = `${PRODUCT_SPEC_DIR}/latest.json`;
export const LATEST_PRODUCT_SPEC_MD_FILE = `${PRODUCT_SPEC_DIR}/latest.md`;
export const LATEST_MFDR_JSON_FILE = `${MFDR_DIR}/latest.json`;
export const LATEST_MFDR_MD_FILE = `${MFDR_DIR}/latest.md`;
export const LATEST_ALIGNMENT_JSON_FILE = `${ALIGNMENT_DIR}/latest.json`;
export const LATEST_ALIGNMENT_MD_FILE = `${ALIGNMENT_DIR}/latest.md`;
export const DEV_KIT_PRODUCT_SPEC_FILE = '.ai-dev-kit/spec.md';
export const TELEMETRY_LOG_FILE = `${RUNS_DIR}/telemetry.jsonl`;

export type PolicyProfile = 'strict' | 'balanced' | 'baseline';
export type SurfaceKind = 'component' | 'route' | 'api' | 'tool' | 'external-integration';
export type PlanClassification = 'bugfix' | 'feature' | 'refactor' | 'research' | 'polish' | 'migration';
export type DocsPriority = 'hot' | 'warm' | 'cold';
export type ModuleStatus = 'enabled' | 'planned' | 'missing';
export type AdapterStatus = 'configured' | 'available' | 'missing' | 'planned';
export type SetupStatus = 'configured' | 'needs-env' | 'needs-setup';
export type SetupMode = 'default' | 'interactive' | 'non-interactive' | 'detected';
export type IntegrationKind = AdapterManifestEntry['kind'] | 'custom-api';
export type AgentRuntimeId = 'claude-code' | 'codex';
export type RuntimeStatus = 'enabled' | 'configured' | 'missing' | 'disabled';
export type ProductValidationMode = 'recommended' | 'required' | 'bypassed';
export type ProductValidationStatus = 'not-run' | 'missing-inputs' | 'complete' | 'bypassed';
export type ProductSpecStatus = 'draft' | 'complete' | 'bypassed';
export type ProductSpecSource = 'interview' | 'agent-generated' | 'manual' | 'bypassed';
export type MfdrStatus = 'draft' | 'complete';

export interface StarterManifest {
  version: string;
  installedAt: string;
  updatedAt: string;
  policyProfile: PolicyProfile;
  projectType: string;
  packageManager: string;
  enabledModules: string[];
  generatedArtifacts: string[];
  commands: string[];
}

export interface EnvRequirement {
  id: string;
  label: string;
  required: boolean;
  anyOf: string[];
  reason: string;
}

export interface ProductValidationInput {
  customer: string;
  problem: string;
  currentWorkaround: string;
  proposedSolution: string;
  pricing: string;
  distribution: string;
  timing: string;
  constraints: string;
}

export interface ProductValidationConfig extends ProductValidationInput {
  mode: ProductValidationMode;
  bypassReason: string | null;
}

export interface ProductValidationArtifact {
  version: string;
  updatedAt: string;
  mode: ProductValidationMode;
  status: ProductValidationStatus;
  bypassReason: string | null;
  project: StarterSetupConfig['project'];
  ai: Pick<StarterSetupConfig['ai'], 'provider' | 'defaultModel' | 'testModel' | 'evalModel'>;
  inputs: ProductValidationInput;
  unanswered: Array<keyof ProductValidationInput>;
  verdict: 'build' | 'test-first' | 'narrow' | 'avoid' | 'bypassed';
  bestCustomer: string;
  mvpScope: string[];
  pricingRecommendation: string;
  gtmPlan: string[];
  technicalFeasibility: {
    buildComplexity: 'low' | 'medium' | 'high';
    dependencies: string[];
    dataAndApiRisks: string[];
    securityRisks: string[];
    reliabilityNeeds: string[];
    testingApproach: string[];
    mvpArchitecture: string[];
  };
  risks: string[];
  validationExperiment: {
    experiment: string;
    successThreshold: string;
  };
  nextStep: string;
}

export interface ProductSpecArtifact {
  version: string;
  updatedAt: string;
  status: ProductSpecStatus;
  source: ProductSpecSource;
  project: StarterSetupConfig['project'];
  canonicalPath: string;
  compatibilityPath: string;
  oneLiner: string;
  customer: string;
  painfulProblem: string;
  currentAlternatives: string;
  insight: string;
  productPromise: string;
  wedge: string;
  whyNow: string;
  mvpScope: string[];
  nonGoals: string[];
  successMetrics: string[];
  pricing: string;
  distribution: string;
  researchBasis: string[];
  validationPlan: string[];
  milestones: Array<{ id: string; name: string; due: string | null }>;
  openQuestions: string[];
  links: Array<{ label: string; path: string }>;
  nextStep: string;
}

export interface MfdrDecision {
  area: 'product' | 'architecture' | 'api' | 'tooling' | 'ui' | 'data' | 'verification' | 'operations';
  choice: string;
  why: string;
  alternatives?: string[];
  tradeoffs: string[];
  evidence: string[];
  verification: string[];
}

export interface MfdrArtifact {
  version: string;
  updatedAt: string;
  status: MfdrStatus;
  source: 'generated' | 'interview' | 'manual';
  title: string;
  project: StarterSetupConfig['project'];
  hypothesis: string;
  productThesis: string;
  researchBasis: string[];
  decisions: MfdrDecision[];
  apiAndServicePlan: Array<{
    id: string;
    label: string;
    kind: string;
    status: string;
    why: string;
    envVars: string[];
    costTracking: string;
    tests: string[];
  }>;
  toolPlan: string[];
  uiPlan: {
    designContract: string;
    designTokens: string;
    interactionModel: string;
    visualProof: string;
  };
  verificationPlan: {
    commands: string[];
    browserProof: string;
    expectRequired: boolean;
    storybookRequired: boolean;
    designDriftPolicy: string;
  };
  successMetrics: string[];
  risks: string[];
  openQuestions: string[];
  nextStep: string;
}

export interface AlignmentArtifact {
  version: string;
  updatedAt: string;
  status: 'ready' | 'attention-needed';
  project: StarterSetupConfig['project'];
  summary: string;
  anchors: Array<{
    id: string;
    label: string;
    path: string;
    status: string;
    reminder: string;
  }>;
  requiredReads: string[];
  recurringContext: string[];
  commands: string[];
  openGaps: string[];
}

export interface StarterSetupConfig {
  version: string;
  createdAt: string;
  updatedAt: string;
  mode: SetupMode;
  status: SetupStatus;
  project: {
    name: string;
    slug: string;
    description: string;
    appType: 'nextjs-ai-app' | 'existing-app' | 'reference-app' | 'library' | 'unknown';
    productType: 'chat-app' | 'agent-workspace' | 'saas-dashboard' | 'creative-tool' | 'internal-tool' | 'marketplace' | 'custom' | 'unknown';
  };
  policy: {
    profile: PolicyProfile;
    expectRequired: boolean;
    playwrightRequired: boolean;
    storybookRequired: boolean;
    designDrift: 'warn' | 'block';
    autopilotStop: boolean;
  };
  runtimes: {
    primary: AgentRuntimeId;
    enabled: Record<AgentRuntimeId, boolean>;
  };
  ai: {
    provider: 'vercel-ai-gateway' | 'anthropic' | 'openai' | 'google' | 'local' | 'custom';
    useVercelGateway: boolean;
    defaultModel: string;
    testModel: string;
    evalModel: string;
  };
  modules: {
    controlPlane: boolean;
    observability: boolean;
    research: boolean;
    designRegistry: boolean;
    browserProof: boolean;
    expect: boolean;
    browserUse: boolean;
    supervisor: boolean;
    costTracking: boolean;
  };
  design: {
    brandSummary: string;
    visualStyle: string;
    interactionStyle: string;
    density: 'low' | 'medium' | 'high' | 'custom';
    motionLevel: 'none' | 'subtle' | 'expressive' | 'high' | 'custom';
    brandColors: string[];
    referenceSystems: string[];
    accessibility: string;
    designInputSource: 'defaults' | 'interview' | 'existing-design' | 'wizard-roadmap';
  };
  productValidation: ProductValidationConfig;
  integrations: Array<{
    id: string;
    label: string;
    kind: IntegrationKind;
    enabled: boolean;
    envVars: string[];
    docsUrl: string | null;
    costTracking: 'ai-telemetry' | 'local-usage-event' | 'provider-dashboard' | 'manual-estimate' | 'not-tracked';
    monthlyBudgetUsd: number | null;
    notes: string[];
  }>;
  env: {
    examplePath: string;
    localPath: string;
    requirements: EnvRequirement[];
  };
  nextSteps: string[];
}

export interface SetupManifest {
  status: SetupStatus;
  updatedAt: string;
  configPath: string;
  envExamplePath: string;
  localEnvPath: string;
  project: StarterSetupConfig['project'];
  ai: Pick<StarterSetupConfig['ai'], 'provider' | 'defaultModel' | 'testModel' | 'evalModel'>;
  design: StarterSetupConfig['design'];
  productValidation: {
    mode: ProductValidationMode;
    status: ProductValidationStatus;
    unanswered: string[];
    bypassReason: string | null;
    artifactPath: string;
  };
  productSpec: {
    status: ProductSpecStatus;
    source: ProductSpecSource;
    artifactPath: string;
    compatibilityPath: string;
    openQuestions: string[];
  };
  requiredGroups: number;
  satisfiedGroups: number;
  missingGroups: Array<{
    id: string;
    label: string;
    anyOf: string[];
    reason: string;
  }>;
  configuredIntegrations: string[];
  enabledModules: string[];
  runtimes: StarterSetupConfig['runtimes'];
  policyProfile: PolicyProfile;
  setupCommand: string;
  notes: string[];
}

export interface RuntimeManifestEntry {
  id: AgentRuntimeId;
  label: string;
  status: RuntimeStatus;
  primary: boolean;
  trusted: boolean;
  configPath: string;
  hooksPath: string;
  hookCount: number;
  hooksObserved: number;
  lastEventAt: string | null;
  proof: {
    command: string;
    evidenceDir: string;
    reportPath: string;
    lastPass: boolean | null;
  };
  capabilities: string[];
  docs: Array<{ title: string; url: string }>;
  warnings: string[];
}

export interface ModuleManifestEntry {
  id: string;
  label: string;
  status: ModuleStatus;
  core: boolean;
  required: boolean;
  doctorChecks: string[];
  dashboardPanels: string[];
  verificationCommands: string[];
}

export interface AdapterManifestEntry {
  id: string;
  label: string;
  kind: 'ai-provider' | 'agent-runtime' | 'database' | 'browser-runtime' | 'supervisor' | 'observability' | 'project-management' | 'external-api' | 'email' | 'payments' | 'search' | 'storage';
  status: AdapterStatus;
  default: boolean;
  envVars: string[];
  notes: string[];
}

export interface IntegrationManifestEntry {
  id: string;
  label: string;
  kind: AdapterManifestEntry['kind'] | 'custom-api';
  status: AdapterStatus;
  default: boolean;
  envVars: string[];
  docsUrl: string | null;
  docsRegistryIds: string[];
  triggerPaths: string[];
  routes: string[];
  cost: {
    tracked: boolean;
    source: 'ai-telemetry' | 'provider-dashboard' | 'manual-estimate' | 'not-tracked';
    unit: string;
    estimatedUnitCostUsd: number | null;
    monthlyBudgetUsd: number | null;
    notes: string[];
  };
  tests: {
    unit: boolean;
    contract: boolean;
    e2e: boolean;
    eval: boolean;
    recommended: string[];
  };
  failureModes: string[];
  exampleCommands: string[];
}

export interface SupervisorManifest {
  backend: 'tmux' | 'process';
  status: 'available' | 'missing';
  sessions: Array<{
    name: string;
    role: 'app' | 'agent' | 'verify' | 'browser' | 'logs' | 'other';
    expected: boolean;
    observed: boolean;
    lastSeenAt: string | null;
  }>;
  updatedAt: string;
}

export interface DesignRegistry {
  version: string;
  updatedAt: string;
  editableFromDashboard: boolean;
  contract: {
    brandSummary: string;
    visualStyle: string;
    interactionStyle: string;
    density: StarterSetupConfig['design']['density'];
    motionLevel: StarterSetupConfig['design']['motionLevel'];
    brandColors: string[];
    referenceSystems: string[];
    accessibility: string;
    designInputSource: StarterSetupConfig['design']['designInputSource'];
    driftPolicy: StarterSetupConfig['policy']['designDrift'];
  };
  tokens: {
    colors: Record<string, string>;
    spacing: Record<string, string>;
    radii: Record<string, string>;
    motion: Record<string, string>;
  };
  assets: Array<{ id: string; label: string; path: string; usage: string }>;
}

export interface BrowserProofManifest {
  updatedAt: string;
  required: boolean;
  playwrightRequired: boolean;
  expectRequired: boolean;
  browserUseAdapter: 'available' | 'planned' | 'missing';
  replayPaths: string[];
  flowPaths: string[];
  screenshotPaths: string[];
  expectProbeCount: number;
  expectCommandCount: number;
  expectFailedCommandCount: number;
  expectBlockingFailedCommandCount: number;
  expectOpenOk: boolean;
  expectProofOk: boolean;
  expectScreenshotCount: number;
  expectVideoCount: number;
  lastReplayPath: string | null;
}

export interface DocsRegistryEntry {
  id: string;
  title: string;
  localPath: string;
  sourceUrl: string | null;
  priority: DocsPriority;
  tags: string[];
  triggerPaths: string[];
  lastCheckedAt: string | null;
}

export interface HookRegistryEntry {
  id: string;
  runtime?: AgentRuntimeId;
  event: string;
  matcher: string | null;
  command: string;
  classification: 'enforcer' | 'observer';
  blocks: boolean;
}

export interface EvidenceRegistryEntry {
  id: string;
  kind: 'json' | 'image' | 'video' | 'trace' | 'log' | 'report' | 'replay' | 'other';
  path: string;
  source: string;
  createdAt: string | null;
}

export interface SurfaceManifestEntry {
  id: string;
  kind: SurfaceKind;
  name: string;
  sourcePaths: string[];
  tests: string[];
  stories: string[];
  visualSpecs: string[];
  evals: string[];
  docs: string[];
  coverage: {
    hasUnit: boolean;
    hasStory: boolean;
    hasVisual: boolean;
    hasEval: boolean;
  };
}

export interface CompanionTask {
  id: string;
  path: string;
  kind: SurfaceKind;
  suggested: string[];
  satisfied: string[];
  missing: string[];
  status: 'pending' | 'satisfied';
  sourcePaths: string[];
  updatedAt: string;
  lastObservedAt: string | null;
}

export interface HookTelemetryEvent {
  id: string;
  timestamp: string;
  phase: string;
  hook: string;
  outcome: 'observed' | 'allowed' | 'blocked' | 'error';
  classification: 'enforcer' | 'observer';
  blocks: boolean;
  matcher: string | null;
  gate: string | null;
  tool: string | null;
  command: string;
  paths: string[];
  surfaceTypes: string[];
  planId: string | null;
  currentTask: string | null;
  reason: string | null;
  runtime?: AgentRuntimeId;
  details?: Record<string, unknown>;
}

export interface PlanArtifact {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  prompt: string;
  classification: PlanClassification;
  acceptanceCriteria: string[];
  requiredEvidence: string[];
  verificationCommands: string[];
  affectedSurfaces: string[];
  status: 'draft' | 'active' | 'done';
}

export interface SessionState {
  currentPlanId: string | null;
  currentTask: string;
  lastDecision: string | null;
  openGaps: string[];
  modifiedFiles: string[];
  updatedAt: string;
}

export interface ProgressState {
  currentPlanId: string | null;
  openTasks: string[];
  closedTasks: string[];
  filesInFlight: string[];
  evidenceStatus: string[];
  updatedAt: string;
}

export interface Scorecard {
  generatedAt: string;
  planId: string | null;
  score: number;
  blockers: string[];
  recommendations: string[];
  summary: {
    components: { total: number; withUnit: number; withStory: number; withVisual: number };
    routes: { total: number; withVisual: number };
    apis: { total: number; withUnit: number; withEval: number };
    tools: { total: number; withUnit: number; withEval: number };
    browserProof: {
      expectFlows: number;
      replays: number;
      screenshots: number;
      expectCommands: number;
      expectFailures: number;
      expectProofOk: boolean;
    };
    evidence: { total: number; screenshots: number; videos: number; traces: number; reports: number };
    companions: { total: number; pending: number; satisfied: number };
    hooks: { registered: number; observed: number; blocked: number };
  };
}

export interface IterationRun {
  id: string;
  createdAt: string;
  planId: string | null;
  scoreAtStart: number;
  blockerCount: number;
  plateauCount: number;
  status: 'ready' | 'blocked' | 'plateau';
  recommendedActions: string[];
}

export interface SyncResult {
  docs: number;
  hooks: number;
  evidence: number;
  features: number;
  companions: number;
}

export interface StarterContext {
  cwd: string;
  version?: string;
  projectType?: string;
  packageManager?: string;
  policyProfile?: PolicyProfile;
  runtimes?: AgentRuntimeId[];
}

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const SURFACE_CONTENT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsonl',
  '.jsx',
  '.md',
  '.mdx',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const textReadCache = new Map<string, string>();
const normalizedTextReadCache = new Map<string, string>();
const DOCS_HOT_HINTS = [
  'START_HERE',
  'DESIGN',
  'DOCS_SYSTEM',
  'REGISTRY-SYSTEM',
  'VERIFICATION_MODEL',
  'HOOKS-SPEC',
  'PROJECT-CONFIG',
  'VERIFICATION-MATRIX',
  'ai-sdk-v6-patterns',
  'expect-browser-testing',
];
const DOCS_WARM_HINTS = ['guides/', 'reference/', 'docs/'];
const CORE_MODULES: ModuleManifestEntry[] = [
  {
    id: 'setup',
    label: 'Setup interview and env contract',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['.ai-starter/config.json', '.env.example', 'setup manifest', 'DESIGN.md setup contract'],
    dashboardPanels: ['control-plane', 'setup'],
    verificationCommands: ['pnpm run starter:setup -- --yes', 'pnpm run starter:doctor'],
  },
  {
    id: 'install',
    label: 'Install lifecycle',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['starter manifest', 'project scripts', 'doctor/repair/update'],
    dashboardPanels: ['control-plane'],
    verificationCommands: ['pnpm run starter:doctor'],
  },
  {
    id: 'hooks',
    label: 'Agent runtime hook enforcement',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['runtime hook config', 'hook registry', 'runtime telemetry log'],
    dashboardPanels: ['hooks', 'runtimes'],
    verificationCommands: ['pnpm test:hooks', 'pnpm test:codex-runtime', 'pnpm score'],
  },
  {
    id: 'browser-proof',
    label: 'Browser proof',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['Playwright config', 'Expect flows', 'browser evidence'],
    dashboardPanels: ['coverage', 'runs'],
    verificationCommands: ['pnpm test:e2e', 'pnpm test:ai'],
  },
  {
    id: 'supervisor',
    label: 'Local supervisor',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['tmux or process backend', 'supervisor manifest'],
    dashboardPanels: ['supervisor'],
    verificationCommands: ['pnpm supervisor:status'],
  },
  {
    id: 'design-registry',
    label: 'Design registry',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['design token registry', 'dashboard editable writeback'],
    dashboardPanels: ['design'],
    verificationCommands: ['pnpm sync'],
  },
  {
    id: 'product-spec',
    label: 'YC-style product spec',
    status: 'enabled',
    core: true,
    required: false,
    doctorChecks: ['product spec artifact', '.ai-dev-kit/spec.md compatibility copy', 'customer/problem/wedge/open questions'],
    dashboardPanels: ['control-plane', 'handoff'],
    verificationCommands: ['pnpm product:spec', 'pnpm sync', 'pnpm score'],
  },
  {
    id: 'product-validation',
    label: 'Product validation and spec fit',
    status: 'enabled',
    core: true,
    required: false,
    doctorChecks: ['product validation memo', 'customer/problem/workaround inputs', 'technical feasibility notes'],
    dashboardPanels: ['control-plane', 'handoff'],
    verificationCommands: ['pnpm product:validate', 'pnpm sync', 'pnpm score'],
  },
  {
    id: 'mfdr',
    label: 'MFDR technical decision record',
    status: 'enabled',
    core: true,
    required: false,
    doctorChecks: ['MFDR memo', 'API/tool/UI decisions', 'hypothesis and verification plan'],
    dashboardPanels: ['control-plane', 'handoff'],
    verificationCommands: ['pnpm mfdr', 'pnpm sync', 'pnpm score'],
  },
  {
    id: 'alignment',
    label: 'Agent alignment anchors',
    status: 'enabled',
    core: true,
    required: true,
    doctorChecks: ['alignment manifest', 'alignment markdown', 'AGENTS.md alignment references'],
    dashboardPanels: ['control-plane', 'handoff'],
    verificationCommands: ['pnpm sync', 'pnpm score', 'pnpm report'],
  },
  {
    id: 'browser-use-adapter',
    label: 'Browser Use adapter',
    status: 'planned',
    core: false,
    required: false,
    doctorChecks: ['MCP config', 'browser session health'],
    dashboardPanels: ['browser'],
    verificationCommands: [],
  },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'task';
}

function nowIso(): string {
  return new Date().toISOString();
}

function readJson<T>(cwd: string, relPath: string, fallback: T): T {
  try {
    const full = resolve(cwd, relPath);
    if (!existsSync(full)) return fallback;
    return JSON.parse(readFileSync(full, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(cwd: string, relPath: string, value: unknown): void {
  const full = resolve(cwd, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function writeText(cwd: string, relPath: string, value: string): void {
  const full = resolve(cwd, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, 'utf-8');
}

function writeTextIfMissing(cwd: string, relPath: string, value: string): boolean {
  const full = resolve(cwd, relPath);
  if (existsSync(full)) return false;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, 'utf-8');
  return true;
}

function safeStatMtime(fullPath: string): string | null {
  try {
    return statSync(fullPath).mtime.toISOString();
  } catch {
    return null;
  }
}

function collectFiles(cwd: string, relDir: string, predicate?: (relPath: string) => boolean): string[] {
  const start = resolve(cwd, relDir);
  if (!existsSync(start)) return [];
  const out: string[] = [];
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const rel = relative(cwd, full);
      if (!predicate || predicate(rel)) out.push(rel);
    }
  }
  return out.sort();
}

function tryRead(cwd: string, relPath: string): string {
  const full = resolve(cwd, relPath);
  const cached = textReadCache.get(full);
  if (cached !== undefined) return cached;

  try {
    const value = readFileSync(full, 'utf-8');
    textReadCache.set(full, value);
    return value;
  } catch {
    textReadCache.set(full, '');
    return '';
  }
}

function readPackageName(cwd: string): string {
  const pkg = readJson<{ name?: string }>(cwd, 'package.json', {});
  return pkg.name ?? basename(cwd);
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

function readConfiguredEnvKeys(cwd: string): Set<string> {
  return parseEnvKeys(['.env.local', '.env.development.local', '.env', '.env.development']
    .map(file => tryRead(cwd, file))
    .join('\n'));
}

function inferAppType(cwd: string): StarterSetupConfig['project']['appType'] {
  const pkg = readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(cwd, 'package.json', {});
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (readPackageName(cwd).includes('reference')) return 'reference-app';
  if (deps.next && deps.ai) return 'nextjs-ai-app';
  if (deps.next) return 'existing-app';
  if (existsSync(resolve(cwd, 'package.json'))) return 'library';
  return 'unknown';
}

function defaultProductValidationConfig(
  existing: ProductValidationConfig | undefined,
  project: StarterSetupConfig['project'],
): ProductValidationConfig {
  return {
    mode: existing?.mode ?? 'recommended',
    customer: existing?.customer ?? '',
    problem: existing?.problem ?? '',
    currentWorkaround: existing?.currentWorkaround ?? '',
    proposedSolution: existing?.proposedSolution ?? project.description,
    pricing: existing?.pricing ?? '',
    distribution: existing?.distribution ?? '',
    timing: existing?.timing ?? '',
    constraints: existing?.constraints ?? '',
    bypassReason: existing?.bypassReason ?? null,
  };
}

function integrationCatalog(): StarterSetupConfig['integrations'] {
  return [
    {
      id: 'vercel-ai-gateway',
      label: 'Vercel AI Gateway',
      kind: 'ai-provider',
      enabled: true,
      envVars: ['AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN'],
      docsUrl: 'https://vercel.com/ai-gateway',
      costTracking: 'ai-telemetry',
      monthlyBudgetUsd: null,
      notes: ['Default model-provider path. Local dev may use AI_GATEWAY_API_KEY or a pulled VERCEL_OIDC_TOKEN.'],
    },
    {
      id: 'supabase',
      label: 'Supabase',
      kind: 'database',
      enabled: false,
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      docsUrl: 'https://supabase.com/docs',
      costTracking: 'provider-dashboard',
      monthlyBudgetUsd: null,
      notes: ['Preferred database adapter, but starter dashboards must keep filesystem fallbacks.'],
    },
    {
      id: 'assemblyai',
      label: 'AssemblyAI transcription',
      kind: 'external-api',
      enabled: false,
      envVars: ['ASSEMBLYAI_API_KEY'],
      docsUrl: 'https://www.assemblyai.com/docs',
      costTracking: 'local-usage-event',
      monthlyBudgetUsd: null,
      notes: ['Direct paid APIs should emit recordApiUsage()/trackedFetch() events.'],
    },
    {
      id: 'stripe',
      label: 'Stripe payments',
      kind: 'payments',
      enabled: false,
      envVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
      docsUrl: 'https://docs.stripe.com',
      costTracking: 'provider-dashboard',
      monthlyBudgetUsd: null,
      notes: ['Operational cost and revenue accounting are separate; track API usage locally when useful.'],
    },
    {
      id: 'resend',
      label: 'Resend email',
      kind: 'email',
      enabled: false,
      envVars: ['RESEND_API_KEY'],
      docsUrl: 'https://resend.com/docs',
      costTracking: 'local-usage-event',
      monthlyBudgetUsd: null,
      notes: ['Email sends should record local usage events if they affect product cost.'],
    },
  ];
}

function setupEnvRequirements(config: StarterSetupConfig): EnvRequirement[] {
  const requirements: EnvRequirement[] = [];
  if (config.ai.useVercelGateway || config.ai.provider === 'vercel-ai-gateway') {
    requirements.push({
      id: 'ai-gateway-auth',
      label: 'Vercel AI Gateway authentication',
      required: true,
      anyOf: ['AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN'],
      reason: 'Required for local model calls through the Vercel AI Gateway.',
    });
  }
  if (config.ai.provider === 'anthropic') {
    requirements.push({
      id: 'anthropic-auth',
      label: 'Anthropic authentication',
      required: true,
      anyOf: ['ANTHROPIC_API_KEY'],
      reason: 'Required when bypassing the AI Gateway and calling Anthropic directly.',
    });
  }
  if (config.ai.provider === 'openai') {
    requirements.push({
      id: 'openai-auth',
      label: 'OpenAI authentication',
      required: true,
      anyOf: ['OPENAI_API_KEY'],
      reason: 'Required when bypassing the AI Gateway and calling OpenAI directly.',
    });
  }
  if (config.ai.provider === 'google') {
    requirements.push({
      id: 'google-auth',
      label: 'Google AI authentication',
      required: true,
      anyOf: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY'],
      reason: 'Required when bypassing the AI Gateway and calling Google directly.',
    });
  }

  const enabledIntegrations = config.integrations.filter(integration => integration.enabled);
  for (const integration of enabledIntegrations) {
    const envVars = integration.envVars.filter(name =>
      !['AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN'].includes(name),
    );
    for (const envVar of envVars) {
      requirements.push({
        id: `${integration.id}-${envVar.toLowerCase()}`,
        label: `${integration.label}: ${envVar}`,
        required: true,
        anyOf: [envVar],
        reason: `Required because ${integration.label} is enabled in starter setup.`,
      });
    }
  }

  return requirements;
}

function setupStatus(cwd: string, config: StarterSetupConfig): SetupStatus {
  const envKeys = readConfiguredEnvKeys(cwd);
  const missingRequired = config.env.requirements
    .filter(requirement => requirement.required)
    .filter(requirement => !requirement.anyOf.some(key => envKeys.has(key)));
  if (missingRequired.length > 0) return 'needs-env';
  return 'configured';
}

export function createDefaultSetupConfig(
  context: StarterContext,
  overrides: Partial<StarterSetupConfig> = {},
): StarterSetupConfig {
  const cwd = context.cwd;
  const existing = readJson<StarterSetupConfig | null>(cwd, SETUP_CONFIG_FILE, null);
  const projectName = overrides.project?.name ?? existing?.project.name ?? readPackageName(cwd);
  const integrations = (overrides.integrations ?? existing?.integrations ?? integrationCatalog())
    .map(integration => ({ ...integration }));
  const mode = overrides.mode ?? existing?.mode ?? 'detected';
  const contextRuntimeEnabled = context.runtimes
    ? {
        'claude-code': context.runtimes.includes('claude-code'),
        codex: context.runtimes.includes('codex'),
      }
    : null;
  const contextPrimaryRuntime: AgentRuntimeId | null = contextRuntimeEnabled
    ? contextRuntimeEnabled.codex
      ? 'codex'
      : 'claude-code'
    : null;
  const project: StarterSetupConfig['project'] = {
    name: projectName,
    slug: overrides.project?.slug ?? existing?.project.slug ?? slugify(projectName),
    description: overrides.project?.description ?? existing?.project.description ?? 'AI product app managed by the AI Starter Kit.',
    appType: overrides.project?.appType ?? existing?.project.appType ?? inferAppType(cwd),
    productType: overrides.project?.productType ?? existing?.project.productType ?? 'unknown',
  };
  const config: StarterSetupConfig = {
    version: context.version ?? existing?.version ?? '0.0.0',
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    mode,
    status: existing?.status ?? 'needs-setup',
    project,
    policy: {
      profile: overrides.policy?.profile ?? existing?.policy.profile ?? context.policyProfile ?? 'strict',
      expectRequired: overrides.policy?.expectRequired ?? existing?.policy.expectRequired ?? true,
      playwrightRequired: overrides.policy?.playwrightRequired ?? existing?.policy.playwrightRequired ?? true,
      storybookRequired: overrides.policy?.storybookRequired ?? existing?.policy.storybookRequired ?? true,
      designDrift: overrides.policy?.designDrift ?? existing?.policy.designDrift ?? 'warn',
      autopilotStop: overrides.policy?.autopilotStop ?? existing?.policy.autopilotStop ?? true,
    },
    runtimes: {
      primary: overrides.runtimes?.primary ?? contextPrimaryRuntime ?? existing?.runtimes?.primary ?? 'codex',
      enabled: {
        'claude-code': overrides.runtimes?.enabled?.['claude-code'] ?? contextRuntimeEnabled?.['claude-code'] ?? existing?.runtimes?.enabled?.['claude-code'] ?? true,
        codex: overrides.runtimes?.enabled?.codex ?? contextRuntimeEnabled?.codex ?? existing?.runtimes?.enabled?.codex ?? true,
      },
    },
    ai: {
      provider: overrides.ai?.provider ?? existing?.ai.provider ?? 'vercel-ai-gateway',
      useVercelGateway: overrides.ai?.useVercelGateway ?? existing?.ai.useVercelGateway ?? true,
      defaultModel: overrides.ai?.defaultModel ?? existing?.ai.defaultModel ?? 'anthropic/claude-sonnet-4.6',
      testModel: overrides.ai?.testModel ?? existing?.ai.testModel ?? 'google/gemini-3.1-flash-lite',
      evalModel: overrides.ai?.evalModel ?? existing?.ai.evalModel ?? 'google/gemini-3.1-flash-lite',
    },
    modules: {
      controlPlane: overrides.modules?.controlPlane ?? existing?.modules.controlPlane ?? true,
      observability: overrides.modules?.observability ?? existing?.modules.observability ?? true,
      research: overrides.modules?.research ?? existing?.modules.research ?? true,
      designRegistry: overrides.modules?.designRegistry ?? existing?.modules.designRegistry ?? true,
      browserProof: overrides.modules?.browserProof ?? existing?.modules.browserProof ?? true,
      expect: overrides.modules?.expect ?? existing?.modules.expect ?? true,
      browserUse: overrides.modules?.browserUse ?? existing?.modules.browserUse ?? false,
      supervisor: overrides.modules?.supervisor ?? existing?.modules.supervisor ?? true,
      costTracking: overrides.modules?.costTracking ?? existing?.modules.costTracking ?? true,
    },
    design: {
      brandSummary: overrides.design?.brandSummary ?? existing?.design.brandSummary ?? 'Project-specific design system defined during setup; preserve existing product visual language when present.',
      visualStyle: overrides.design?.visualStyle ?? existing?.design.visualStyle ?? 'project-specific',
      interactionStyle: overrides.design?.interactionStyle ?? existing?.design.interactionStyle ?? 'Clear task-first flows with visible feedback and recoverable states.',
      density: overrides.design?.density ?? existing?.design.density ?? 'medium',
      motionLevel: overrides.design?.motionLevel ?? existing?.design.motionLevel ?? 'subtle',
      brandColors: overrides.design?.brandColors ?? existing?.design.brandColors ?? [],
      referenceSystems: overrides.design?.referenceSystems ?? existing?.design.referenceSystems ?? [],
      accessibility: overrides.design?.accessibility ?? existing?.design.accessibility ?? 'WCAG AA contrast, keyboard reachability, visible focus, and reduced-motion support.',
      designInputSource: overrides.design?.designInputSource ?? existing?.design.designInputSource ?? 'defaults',
    },
    productValidation: defaultProductValidationConfig(
      overrides.productValidation ?? existing?.productValidation,
      project,
    ),
    integrations,
    env: {
      examplePath: overrides.env?.examplePath ?? existing?.env.examplePath ?? '.env.example',
      localPath: overrides.env?.localPath ?? existing?.env.localPath ?? '.env.local',
      requirements: [],
    },
    nextSteps: overrides.nextSteps ?? existing?.nextSteps ?? [
      'Put real secrets in .env.local or pull them with `vercel env pull .env.local --yes`.',
      'Run `pnpm run starter:doctor` to validate setup health without printing secret values.',
      'Run `pnpm plan -- "<first feature>"` before feature work.',
      'Open `/control-plane` after starting the dev server.',
    ],
  };
  config.env.requirements = setupEnvRequirements(config);
  config.status = setupStatus(cwd, config);
  return config;
}

const PRODUCT_VALIDATION_FIELDS: Array<keyof ProductValidationInput> = [
  'customer',
  'problem',
  'currentWorkaround',
  'proposedSolution',
  'pricing',
  'distribution',
  'timing',
  'constraints',
];

function isMissingValidationValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || ['unknown', 'tbd', 'todo', 'none', 'n/a'].includes(normalized);
}

function validationInputs(config: StarterSetupConfig): ProductValidationInput {
  const productValidation = config.productValidation ?? defaultProductValidationConfig(undefined, config.project);
  return {
    customer: productValidation.customer,
    problem: productValidation.problem,
    currentWorkaround: productValidation.currentWorkaround,
    proposedSolution: productValidation.proposedSolution || config.project.description,
    pricing: productValidation.pricing,
    distribution: productValidation.distribution,
    timing: productValidation.timing,
    constraints: productValidation.constraints,
  };
}

export function generateProductValidationArtifact(config: StarterSetupConfig): ProductValidationArtifact {
  const productValidation = config.productValidation ?? defaultProductValidationConfig(undefined, config.project);
  const inputs = validationInputs(config);
  const unanswered = PRODUCT_VALIDATION_FIELDS.filter(field => isMissingValidationValue(inputs[field]));
  const missingCritical = ['customer', 'problem', 'currentWorkaround'].some(field =>
    unanswered.includes(field as keyof ProductValidationInput),
  );
  const enabledIntegrations = config.integrations
    .filter(integration => integration.enabled)
    .map(integration => integration.label);
  const externalIntegrations = config.integrations
    .filter(integration => integration.enabled && integration.kind !== 'ai-provider')
    .map(integration => integration.label);
  const buildComplexity: ProductValidationArtifact['technicalFeasibility']['buildComplexity'] =
    externalIntegrations.length >= 3 || config.project.productType === 'marketplace'
      ? 'high'
      : externalIntegrations.length > 0 || config.modules.browserProof
      ? 'medium'
      : 'low';
  const status: ProductValidationStatus = productValidation.mode === 'bypassed'
    ? 'bypassed'
    : unanswered.length === 0
    ? 'complete'
    : unanswered.length === PRODUCT_VALIDATION_FIELDS.length
    ? 'not-run'
    : 'missing-inputs';
  const verdict: ProductValidationArtifact['verdict'] = status === 'bypassed'
    ? 'bypassed'
    : missingCritical
    ? 'test-first'
    : unanswered.length > 0
    ? 'narrow'
    : 'build';

  return {
    version: config.version,
    updatedAt: nowIso(),
    mode: productValidation.mode,
    status,
    bypassReason: productValidation.bypassReason,
    project: config.project,
    ai: {
      provider: config.ai.provider,
      defaultModel: config.ai.defaultModel,
      testModel: config.ai.testModel,
      evalModel: config.ai.evalModel,
    },
    inputs,
    unanswered,
    verdict,
    bestCustomer: inputs.customer || 'Unvalidated: define the narrow first customer before broad implementation.',
    mvpScope: [
      'One primary workflow that proves the painful job can be completed.',
      'One measurable activation moment and one retention reason.',
      'One priced offer or concierge/manual validation path before broad automation.',
      'Repo evidence: plan, tests, browser proof, docs, scorecard, and handoff report.',
    ],
    pricingRecommendation: inputs.pricing ||
      'Unvalidated. Use a paid pilot or narrow entry tier before building high-support automation.',
    gtmPlan: [
      inputs.distribution || 'Identify one reachable first-100-user channel before implementation expansion.',
      'Write the landing-page promise from the customer/problem/current-workaround answers.',
      'Run 5-10 direct customer conversations before treating the scope as validated.',
    ],
    technicalFeasibility: {
      buildComplexity,
      dependencies: enabledIntegrations.length > 0 ? enabledIntegrations : ['Local filesystem starter state'],
      dataAndApiRisks: [
        ...externalIntegrations.map(name => `${name} availability, rate limits, pricing, and failure modes must be tested.`),
        config.ai.useVercelGateway ? 'AI Gateway model availability and spend must be observed in telemetry.' : 'Direct model provider availability and spend must be observed.',
      ],
      securityRisks: [
        'Do not commit secrets; setup writes .env.example only.',
        'Validate inputs and tool schemas for every API/tool surface.',
        'Record failure modes for paid or user-data integrations.',
      ],
      reliabilityNeeds: [
        'Fallback shapes for dashboards/APIs when optional services are absent.',
        'Contract tests for APIs and external adapters.',
        'Browser proof for user-visible workflows.',
      ],
      testingApproach: [
        'Unit/contract coverage for deterministic APIs and adapters.',
        'Playwright/Expect proof for user journeys.',
        'Rubric/eval coverage for AI/tool behavior.',
        'Cost events for AI Gateway and direct paid APIs.',
      ],
      mvpArchitecture: [
        'Keep starter state in .ai-starter as source of truth.',
        'Add one feature plan before implementation.',
        'Use manifests to connect features, tests, docs, costs, and evidence.',
      ],
    },
    risks: [
      missingCritical ? 'The first customer/problem/workaround is not validated enough to justify broad build scope.' : 'The customer/problem/workaround chain is explicit but still needs real-world evidence.',
      unanswered.includes('pricing') ? 'Pricing is not validated; support and compute cost may exceed willingness to pay.' : 'Pricing assumptions still need payment or pilot evidence.',
      unanswered.includes('distribution') ? 'Distribution is not validated; the first 100 users may be hard to reach.' : 'Distribution must be measured with a real conversion event.',
      buildComplexity === 'high' ? 'Integration/support complexity is high; narrow the MVP before autonomy.' : 'Technical scope is manageable if verification remains strict.',
    ],
    validationExperiment: {
      experiment: 'Run a landing-page/demo or concierge workflow for the named customer segment before broad build-out.',
      successThreshold: 'At least 5 qualified conversations, 2 strong follow-ups, or 1 paid/LOI-style signal for the narrow MVP.',
    },
    nextStep: status === 'complete'
      ? 'Create the feature plan and implement only the MVP slice that proves willingness to pay.'
      : status === 'bypassed'
      ? 'Proceed only if the bypass reason is explicit and the active plan captures the product risk.'
      : 'Run `pnpm product:validate` or mark the validation as bypassed with a reason before large product work.',
  };
}

function productValidationMarkdown(artifact: ProductValidationArtifact): string {
  const lines: Array<string | null> = [
    '# Product Validation Memo',
    '',
    `Updated: ${artifact.updatedAt}`,
    `Status: ${artifact.status}`,
    `Mode: ${artifact.mode}`,
    artifact.bypassReason ? `Bypass reason: ${artifact.bypassReason}` : null,
    '',
    '## Verdict',
    artifact.verdict,
    '',
    '## Best Customer',
    artifact.bestCustomer,
    '',
    '## Problem',
    artifact.inputs.problem || 'Unanswered.',
    '',
    '## Product Shape',
    `Core promise: ${artifact.inputs.proposedSolution || artifact.project.description}`,
    `Activation moment: the first user-visible workflow proves "${artifact.inputs.problem || 'the target job'}" can be completed.`,
    `Retention loop: ${artifact.inputs.timing || 'Unanswered; define why this is recurring now.'}`,
    '',
    '## MVP',
    ...artifact.mvpScope.map(item => `- ${item}`),
    '',
    '## Pricing',
    artifact.pricingRecommendation,
    '',
    '## Go-To-Market',
    ...artifact.gtmPlan.map(item => `- ${item}`),
    '',
    '## Technical Plan',
    `Build complexity: ${artifact.technicalFeasibility.buildComplexity}`,
    `Dependencies: ${artifact.technicalFeasibility.dependencies.join(', ') || 'none'}`,
    '',
    'Testing approach:',
    ...artifact.technicalFeasibility.testingApproach.map(item => `- ${item}`),
    '',
    '## Risks',
    ...artifact.risks.map(item => `- ${item}`),
    '',
    '## Validation Experiment',
    artifact.validationExperiment.experiment,
    `Success threshold: ${artifact.validationExperiment.successThreshold}`,
    '',
    '## Next Step',
    artifact.nextStep,
    '',
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
}

export function writeProductValidationArtifacts(context: StarterContext, config: StarterSetupConfig): ProductValidationArtifact {
  const cwd = context.cwd;
  const artifact = generateProductValidationArtifact(config);
  writeJson(cwd, LATEST_PRODUCT_VALIDATION_JSON_FILE, artifact);
  writeFileSync(resolve(cwd, LATEST_PRODUCT_VALIDATION_MD_FILE), productValidationMarkdown(artifact), 'utf-8');
  writeJson(cwd, PRODUCT_VALIDATION_MANIFEST_FILE, artifact);
  return artifact;
}

function productSpecSource(config: StarterSetupConfig, validation: ProductValidationArtifact): ProductSpecSource {
  if (validation.status === 'bypassed') return 'bypassed';
  if (config.mode === 'interactive') return 'interview';
  return 'agent-generated';
}

function productSpecStatus(validation: ProductValidationArtifact): ProductSpecStatus {
  if (validation.status === 'bypassed') return 'bypassed';
  return validation.status === 'complete' ? 'complete' : 'draft';
}

function defaultProductSpecResearch(config: StarterSetupConfig): string[] {
  const configuredDocs = [
    'YC: launch quickly, talk to customers, and iterate from a real problem rather than a perfect plan.',
    'YC: product-market fit is demand pulling product from the team, not internal confidence.',
    'Starter docs: local docs registry, product validation memo, MFDR, DESIGN.md, and evidence manifests.',
  ];
  const references = config.design.referenceSystems.map(item => `Reference system: ${item}`);
  return [...configuredDocs, ...references];
}

export function generateProductSpecArtifact(config: StarterSetupConfig): ProductSpecArtifact {
  const validation = generateProductValidationArtifact(config);
  const unanswered = new Set(validation.unanswered);
  const openQuestions = [
    unanswered.has('customer') ? 'Who is the narrow first customer with urgent pain?' : '',
    unanswered.has('problem') ? 'What painful job, cost, delay, or risk is severe enough to justify switching?' : '',
    unanswered.has('currentWorkaround') ? 'What current workaround proves the problem already exists?' : '',
    unanswered.has('pricing') ? 'What concrete payment, pilot, or budget signal validates willingness to pay?' : '',
    unanswered.has('distribution') ? 'Which reachable channel creates the first 100 qualified users?' : '',
  ].filter(Boolean);

  const status = productSpecStatus(validation);
  const source = productSpecSource(config, validation);
  const oneLiner = validation.inputs.proposedSolution || config.project.description;
  const customer = validation.bestCustomer;
  const painfulProblem = validation.inputs.problem || 'Unanswered. Define the painful job before broad implementation.';
  const currentAlternatives = validation.inputs.currentWorkaround || 'Unanswered. Record the current workaround or competitor behavior.';
  const productPromise = validation.inputs.proposedSolution || config.project.description;
  const wedge = `Start with one workflow for ${customer} that proves "${painfulProblem}" can be solved with visible evidence.`;
  const whyNow = validation.inputs.timing || 'AI agents, browser proof, repo-level context, and usage telemetry make verified workflows practical now.';

  return {
    version: config.version,
    updatedAt: nowIso(),
    status,
    source,
    project: config.project,
    canonicalPath: LATEST_PRODUCT_SPEC_MD_FILE,
    compatibilityPath: DEV_KIT_PRODUCT_SPEC_FILE,
    oneLiner,
    customer,
    painfulProblem,
    currentAlternatives,
    insight: 'The product should be pulled by a specific painful customer workflow, not by broad feature ambition.',
    productPromise,
    wedge,
    whyNow,
    mvpScope: validation.mvpScope,
    nonGoals: [
      'Do not scale scope before the narrow customer/problem/workaround chain is explicit.',
      'Do not add paid providers without docs, env contract, cost tracking, and contract tests.',
      'Do not accept UI work that violates DESIGN.md, the design manifest, or visual proof requirements.',
    ],
    successMetrics: [
      validation.validationExperiment.successThreshold,
      config.project.productType === 'unknown'
        ? 'Product type is classified before significant implementation.'
        : `Primary product type remains ${config.project.productType}.`,
      'Scorecard has no blockers before handoff.',
      'The first user journey has browser proof and an evidence bundle.',
    ],
    pricing: validation.pricingRecommendation,
    distribution: validation.gtmPlan.join(' '),
    researchBasis: defaultProductSpecResearch(config),
    validationPlan: [
      validation.validationExperiment.experiment,
      `Success threshold: ${validation.validationExperiment.successThreshold}`,
      'Capture objections, current workaround details, and willingness-to-pay evidence in the product spec before widening scope.',
    ],
    milestones: [
      { id: 'm0', name: 'Spec approved or explicitly bypassed', due: null },
      { id: 'm1', name: 'Narrow MVP slice planned with evidence requirements', due: null },
      { id: 'm2', name: 'First user journey verified with browser proof', due: null },
      { id: 'm3', name: 'Pricing/distribution signal recorded', due: null },
    ],
    openQuestions,
    links: [
      { label: 'Product validation memo', path: LATEST_PRODUCT_VALIDATION_MD_FILE },
      { label: 'MFDR technical decision record', path: LATEST_MFDR_MD_FILE },
      { label: 'Design contract', path: 'DESIGN.md' },
      { label: 'Alignment file', path: LATEST_ALIGNMENT_MD_FILE },
      { label: 'Agent context', path: 'AGENTS.md' },
    ],
    nextStep: status === 'complete'
      ? 'Use this product spec to create the next feature plan and keep the MVP narrow.'
      : status === 'bypassed'
      ? 'Proceed only with the recorded bypass reason and revisit the spec before scaling scope.'
      : 'Run `pnpm product:spec` or `pnpm product:validate` to fill customer/problem/workaround/pricing/distribution gaps.',
  };
}

function productSpecMarkdown(artifact: ProductSpecArtifact): string {
  const frontmatter = [
    '---',
    'spec_id: product-spec',
    `project: ${artifact.project.name}`,
    `status: ${artifact.status}`,
    `source: ${artifact.source}`,
    `updated_at: ${artifact.updatedAt}`,
    'anchors:',
    `  product_validation: ${LATEST_PRODUCT_VALIDATION_MD_FILE}`,
    `  mfdr: ${LATEST_MFDR_MD_FILE}`,
    '  design: DESIGN.md',
    `  alignment: ${LATEST_ALIGNMENT_MD_FILE}`,
    '---',
  ].join('\n');

  const lines = [
    '<!-- AI_STARTER_PRODUCT_SPEC -->',
    frontmatter,
    '',
    `# ${artifact.project.name} Product Spec`,
    '',
    '## One-Liner',
    artifact.oneLiner,
    '',
    '## Customer',
    artifact.customer,
    '',
    '## Painful Problem',
    artifact.painfulProblem,
    '',
    '## Current Alternatives',
    artifact.currentAlternatives,
    '',
    '## Insight',
    artifact.insight,
    '',
    '## Product Promise',
    artifact.productPromise,
    '',
    '## Wedge',
    artifact.wedge,
    '',
    '## Why Now',
    artifact.whyNow,
    '',
    '## MVP Scope',
    ...artifact.mvpScope.map(item => `- ${item}`),
    '',
    '## Non-Goals',
    ...artifact.nonGoals.map(item => `- ${item}`),
    '',
    '## Success Metrics',
    ...artifact.successMetrics.map(item => `- ${item}`),
    '',
    '## Pricing',
    artifact.pricing,
    '',
    '## Distribution',
    artifact.distribution,
    '',
    '## Research Basis',
    ...artifact.researchBasis.map(item => `- ${item}`),
    '',
    '## Validation Plan',
    ...artifact.validationPlan.map(item => `- ${item}`),
    '',
    '## Milestones',
    ...artifact.milestones.map(item => `- ${item.id}: ${item.name}${item.due ? ` (${item.due})` : ''}`),
    '',
    '## Open Questions',
    ...(artifact.openQuestions.length > 0 ? artifact.openQuestions.map(item => `- ${item}`) : ['- None recorded.']),
    '',
    '## Linked Alignment Artifacts',
    ...artifact.links.map(item => `- [${item.label}](${item.path})`),
    '',
    '## Next Step',
    artifact.nextStep,
    '',
  ];
  return lines.join('\n');
}

function writeDevKitProductSpec(cwd: string, markdown: string): void {
  const fullPath = resolve(cwd, DEV_KIT_PRODUCT_SPEC_FILE);
  if (existsSync(fullPath)) {
    const existing = readFileSync(fullPath, 'utf-8');
    if (!existing.includes('<!-- AI_STARTER_PRODUCT_SPEC -->')) return;
  }
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, markdown, 'utf-8');
}

export function writeProductSpecArtifacts(context: StarterContext, config: StarterSetupConfig): ProductSpecArtifact {
  const cwd = context.cwd;
  const artifact = generateProductSpecArtifact(config);
  const markdown = productSpecMarkdown(artifact);
  writeJson(cwd, LATEST_PRODUCT_SPEC_JSON_FILE, artifact);
  writeText(cwd, LATEST_PRODUCT_SPEC_MD_FILE, markdown);
  writeJson(cwd, PRODUCT_SPEC_MANIFEST_FILE, artifact);
  writeDevKitProductSpec(cwd, markdown);
  return artifact;
}

export type MfdrOverrides = Partial<Pick<
  MfdrArtifact,
  'status' | 'title' | 'hypothesis' | 'productThesis' | 'researchBasis' | 'decisions' | 'toolPlan' |
  'uiPlan' | 'verificationPlan' | 'successMetrics' | 'risks' | 'openQuestions' | 'nextStep' | 'source'
>>;

function listOrFallback(values: string[], fallback: string): string[] {
  const normalized = values.map(value => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : [fallback];
}

export function generateMfdrArtifact(
  cwd: string,
  config: StarterSetupConfig = createDefaultSetupConfig({ cwd }),
  overrides: MfdrOverrides = {},
): MfdrArtifact {
  const existing = readJson<MfdrArtifact | null>(cwd, LATEST_MFDR_JSON_FILE, null);
  const productValidation = readJson<ProductValidationArtifact | null>(cwd, PRODUCT_VALIDATION_MANIFEST_FILE, null)
    ?? generateProductValidationArtifact(config);
  const integrations = generateIntegrationManifest(cwd);
  const docs = readJson<DocsRegistryEntry[]>(cwd, DOCS_REGISTRY_FILE, []);
  const features = readJson<SurfaceManifestEntry[]>(cwd, FEATURE_MANIFEST_FILE, []);
  const enabledIntegrations = integrations.filter(integration => integration.status === 'configured' || integration.default);
  const visibleSurfaces = features
    .filter(feature => ['api', 'tool', 'route', 'component', 'external-integration'].includes(feature.kind))
    .slice(0, 12)
    .map(feature => `${feature.kind}:${feature.name}`);

  const defaultDecisions: MfdrDecision[] = [
    {
      area: 'product',
      choice: productValidation.verdict === 'build' ? 'Proceed with a narrow MVP slice' : 'Validate or narrow before broad implementation',
      why: productValidation.bestCustomer,
      alternatives: ['Build broad feature set immediately', 'Stay in research only', 'Ship a concierge/manual prototype first'],
      tradeoffs: ['Faster build momentum', 'Less premature surface area', 'Requires explicit follow-up validation evidence'],
      evidence: [LATEST_PRODUCT_VALIDATION_MD_FILE],
      verification: ['pnpm product:validate', 'pnpm plan -- "<feature>"'],
    },
    {
      area: 'architecture',
      choice: '.ai-starter remains the source of truth for repo state',
      why: 'Plans, manifests, evidence, costs, docs, and scorecards survive chat compaction and runtime changes.',
      alternatives: ['Keep state only in chat transcripts', 'Use only CI artifacts', 'Use an external project tracker as the canonical source'],
      tradeoffs: ['More generated files', 'Better handoff and auditability'],
      evidence: [STARTER_MANIFEST_FILE, SETUP_MANIFEST_FILE],
      verification: ['pnpm sync', 'pnpm score'],
    },
    {
      area: 'api',
      choice: enabledIntegrations.length > 0
        ? `Track configured providers: ${enabledIntegrations.map(integration => integration.id).join(', ')}`
        : 'Register each external API before implementation',
      why: 'External APIs need docs, env requirements, cost events, failure modes, and contract tests.',
      alternatives: ['Call providers directly without local registry', 'Rely only on provider dashboards', 'Block all custom providers'],
      tradeoffs: ['More upfront specification', 'Fewer silent runtime/provider failures'],
      evidence: [INTEGRATION_MANIFEST_FILE],
      verification: ['pnpm usage:record -- --integration=<id> --cost=<usd>', 'pnpm test'],
    },
    {
      area: 'ui',
      choice: 'Use DESIGN.md and token registry as the UI contract',
      why: config.design.brandSummary,
      alternatives: ['Let each agent invent visual direction', 'Use only component library defaults', 'Require manual design review without local tokens'],
      tradeoffs: ['Design drift can block strict projects', 'Visual consistency improves across agent sessions'],
      evidence: ['DESIGN.md', DESIGN_REGISTRY_FILE],
      verification: ['pnpm design:check', 'pnpm browser:proof'],
    },
    {
      area: 'verification',
      choice: 'Require Playwright plus Expect browser-control proof for user-visible routes',
      why: 'Playwright gives deterministic browser checks; Expect records agent-style browser command evidence.',
      alternatives: ['Unit tests only', 'Manual screenshot inspection only', 'No browser proof for fast iterations'],
      tradeoffs: ['Needs a running local server', 'Catches more real user-experience failures'],
      evidence: [BROWSER_PROOF_MANIFEST_FILE, '.expect/replays/'],
      verification: ['pnpm browser:proof', 'pnpm gates'],
    },
  ];

  const defaultUiPlan = {
    designContract: config.design.brandSummary,
    designTokens: config.design.brandColors.length > 0
      ? `Use configured brand colors: ${config.design.brandColors.join(', ')}`
      : 'Use DESIGN.md tokens and generated design registry before hardcoding visual values.',
    interactionModel: config.design.interactionStyle,
    visualProof: 'Capture screenshots and Expect replays after visual route/component changes.',
  };

  const defaultVerificationPlan = {
    commands: [
      'pnpm sync',
      'pnpm typecheck',
      'pnpm test',
      'pnpm browser:proof',
      'pnpm gates',
      'pnpm score',
      'pnpm report',
    ],
    browserProof: 'Run against the local dev server with AI_STARTER_BASE_URL or PLAYWRIGHT_BASE_URL set.',
    expectRequired: config.policy.expectRequired,
    storybookRequired: config.policy.storybookRequired,
    designDriftPolicy: config.policy.designDrift,
  };

  const artifact: MfdrArtifact = {
    version: config.version,
    updatedAt: nowIso(),
    status: (overrides.status ?? existing?.status ?? 'draft') as MfdrStatus,
    source: overrides.source ?? existing?.source ?? 'generated',
    title: overrides.title ?? existing?.title ?? `${config.project.name} MFDR`,
    project: config.project,
    hypothesis: overrides.hypothesis ?? existing?.hypothesis ??
      `If ${productValidation.bestCustomer} get a starter-enforced workflow for ${productValidation.inputs.problem || config.project.description}, they will trust agent-built software faster because every surface has plans, docs, tests, browser evidence, and cost visibility.`,
    productThesis: overrides.productThesis ?? existing?.productThesis ??
      (productValidation.inputs.proposedSolution || config.project.description),
    researchBasis: overrides.researchBasis ?? existing?.researchBasis ?? listOrFallback(
      docs.slice(0, 8).map(doc => `${doc.id}: ${doc.localPath}`),
      'Research cache not populated yet; run `pnpm research:bootstrap` and refresh provider/library docs before risky API work.',
    ),
    decisions: overrides.decisions ?? existing?.decisions ?? defaultDecisions,
    apiAndServicePlan: enabledIntegrations.map(integration => ({
      id: integration.id,
      label: integration.label,
      kind: integration.kind,
      status: integration.status,
      why: integration.docsUrl
        ? `Use official docs and local registry entry before touching ${integration.label}.`
        : `Document ${integration.label} behavior, pricing, failure modes, and test contract locally.`,
      envVars: integration.envVars,
      costTracking: integration.cost.source,
      tests: integration.tests.recommended,
    })),
    toolPlan: overrides.toolPlan ?? existing?.toolPlan ?? listOrFallback(
      visibleSurfaces,
      'No feature surfaces detected yet; every new API/tool/component/page should add docs, tests, evidence, and manifest coverage.',
    ),
    uiPlan: overrides.uiPlan ?? existing?.uiPlan ?? defaultUiPlan,
    verificationPlan: overrides.verificationPlan ?? existing?.verificationPlan ?? defaultVerificationPlan,
    successMetrics: overrides.successMetrics ?? existing?.successMetrics ?? [
      'Product validation is complete or explicitly bypassed with a reason.',
      'Feature plan has acceptance criteria and required evidence.',
      'Scorecard has no blockers.',
      'Expect proof reports successful browser-control commands for user-visible routes.',
      'External APIs/services have cost events or an explicit provider-dashboard/manual tracking reason.',
    ],
    risks: overrides.risks ?? existing?.risks ?? [
      ...productValidation.risks.slice(0, 3),
      'MFDR can become stale if API/tool/UI decisions change without rerunning `pnpm mfdr`.',
      'Browser proof requires a live local server and installed Expect CLI.',
    ],
    openQuestions: overrides.openQuestions ?? existing?.openQuestions ?? [
      productValidation.status === 'complete' ? '' : 'Complete product validation or record why it is bypassed.',
      enabledIntegrations.length === 0 ? 'Which external APIs/services need first-class cost and contract tracking?' : '',
      visibleSurfaces.length === 0 ? 'Which first user journey should become the proof route?' : '',
    ].filter(Boolean),
    nextStep: overrides.nextStep ?? existing?.nextStep ??
      'Before broad implementation, run `pnpm mfdr`, then `pnpm plan -- "<first feature>"`, then implement only the next verified slice.',
  };
  artifact.status = artifact.openQuestions.length === 0 && artifact.source !== 'generated' ? 'complete' : artifact.status;
  return artifact;
}

function mfdrMarkdown(artifact: MfdrArtifact): string {
  const lines = [
    '# MFDR Technical Decision Record',
    '',
    `Updated: ${artifact.updatedAt}`,
    `Status: ${artifact.status}`,
    `Source: ${artifact.source}`,
    '',
    '## Hypothesis',
    artifact.hypothesis,
    '',
    '## Product Thesis',
    artifact.productThesis,
    '',
    '## Research Basis',
    ...artifact.researchBasis.map(item => `- ${item}`),
    '',
    '## Decisions',
    ...artifact.decisions.flatMap(decision => [
      `### ${decision.area}: ${decision.choice}`,
      '',
      `Why: ${decision.why}`,
      '',
      ...(decision.alternatives?.length ? [`Alternatives considered: ${decision.alternatives.join('; ')}`] : []),
      `Tradeoffs: ${decision.tradeoffs.join('; ') || 'none recorded'}`,
      `Evidence: ${decision.evidence.join(', ') || 'none recorded'}`,
      `Verification: ${decision.verification.join(', ') || 'none recorded'}`,
      '',
    ]),
    '## API And Service Plan',
    ...(artifact.apiAndServicePlan.length > 0
      ? artifact.apiAndServicePlan.map(item => `- ${item.label} (${item.id}): ${item.status}; cost=${item.costTracking}; env=${item.envVars.join(', ') || 'none'}`)
      : ['- No configured external services yet. Register APIs before adding production usage.']),
    '',
    '## Tool Plan',
    ...artifact.toolPlan.map(item => `- ${item}`),
    '',
    '## UI Plan',
    `- Design contract: ${artifact.uiPlan.designContract}`,
    `- Tokens: ${artifact.uiPlan.designTokens}`,
    `- Interaction model: ${artifact.uiPlan.interactionModel}`,
    `- Visual proof: ${artifact.uiPlan.visualProof}`,
    '',
    '## Verification Plan',
    ...artifact.verificationPlan.commands.map(command => `- ${command}`),
    `- Browser proof: ${artifact.verificationPlan.browserProof}`,
    `- Expect required: ${artifact.verificationPlan.expectRequired ? 'yes' : 'no'}`,
    `- Storybook required: ${artifact.verificationPlan.storybookRequired ? 'yes' : 'no'}`,
    `- Design drift policy: ${artifact.verificationPlan.designDriftPolicy}`,
    '',
    '## Success Metrics',
    ...artifact.successMetrics.map(item => `- ${item}`),
    '',
    '## Risks',
    ...artifact.risks.map(item => `- ${item}`),
    '',
    '## Open Questions',
    ...(artifact.openQuestions.length > 0 ? artifact.openQuestions.map(item => `- ${item}`) : ['- None recorded.']),
    '',
    '## Next Step',
    artifact.nextStep,
    '',
  ];
  return lines.join('\n');
}

export function writeMfdrArtifacts(
  context: StarterContext,
  config: StarterSetupConfig,
  overrides: MfdrOverrides = {},
): MfdrArtifact {
  const cwd = context.cwd;
  const artifact = generateMfdrArtifact(cwd, config, overrides);
  writeJson(cwd, LATEST_MFDR_JSON_FILE, artifact);
  writeFileSync(resolve(cwd, LATEST_MFDR_MD_FILE), mfdrMarkdown(artifact), 'utf-8');
  writeJson(cwd, MFDR_MANIFEST_FILE, artifact);
  return artifact;
}

export function generateAlignmentArtifact(cwd: string, config: StarterSetupConfig): AlignmentArtifact {
  const productSpec = readJson<ProductSpecArtifact | null>(cwd, PRODUCT_SPEC_MANIFEST_FILE, null)
    ?? generateProductSpecArtifact(config);
  const productValidation = readJson<ProductValidationArtifact | null>(cwd, PRODUCT_VALIDATION_MANIFEST_FILE, null)
    ?? generateProductValidationArtifact(config);
  const mfdr = readJson<MfdrArtifact | null>(cwd, MFDR_MANIFEST_FILE, null)
    ?? generateMfdrArtifact(cwd, config);
  const design = readJson<DesignRegistry | null>(cwd, DESIGN_REGISTRY_FILE, null)
    ?? generateDesignRegistry(cwd);
  const plan = readJson<PlanArtifact | null>(cwd, LATEST_PLAN_FILE, null);
  const scorecard = readJson<Scorecard | null>(cwd, SCORECARD_FILE, null);

  const anchors: AlignmentArtifact['anchors'] = [
    {
      id: 'product-spec',
      label: 'YC-style product spec',
      path: LATEST_PRODUCT_SPEC_MD_FILE,
      status: productSpec.status,
      reminder: 'Keeps customer, painful problem, wedge, MVP, metrics, pricing, and distribution in scope.',
    },
    {
      id: 'product-validation',
      label: 'Product validation memo',
      path: LATEST_PRODUCT_VALIDATION_MD_FILE,
      status: productValidation.status,
      reminder: 'Justifies whether the product or feature should be built before widening scope.',
    },
    {
      id: 'mfdr',
      label: 'MFDR technical decision record',
      path: LATEST_MFDR_MD_FILE,
      status: mfdr.status,
      reminder: 'Justifies architecture, APIs, tools, UI, costs, risks, alternatives, and verification choices.',
    },
    {
      id: 'design',
      label: 'Design contract',
      path: 'DESIGN.md',
      status: design.contract.designInputSource,
      reminder: 'Preserves product visual direction, interaction density, accessibility, tokens, and drift policy.',
    },
    {
      id: 'agent-context',
      label: 'Agent context',
      path: 'AGENTS.md',
      status: existsSync(resolve(cwd, 'AGENTS.md')) ? 'present' : 'missing',
      reminder: 'Portable compressed contract for Codex, Claude, and other coding agents.',
    },
  ];

  const openGaps = [
    productSpec.status === 'draft' ? 'Product spec is still draft; fill missing customer/problem/market fields or explicitly bypass.' : '',
    ['missing-inputs', 'not-run'].includes(productValidation.status)
      ? 'Product validation is incomplete; run `pnpm product:validate` or record a bypass reason.'
      : '',
    mfdr.status !== 'complete' ? 'MFDR is not complete; run `pnpm mfdr --complete` after research and decisions are explicit.' : '',
    !plan ? 'No active plan exists; run `pnpm plan -- "<task>"` before feature-sized implementation.' : '',
    scorecard && scorecard.blockers.length > 0 ? `Scorecard has ${scorecard.blockers.length} blocker(s).` : '',
  ].filter(Boolean);

  return {
    version: config.version,
    updatedAt: nowIso(),
    status: openGaps.length === 0 ? 'ready' : 'attention-needed',
    project: config.project,
    summary: `${config.project.name}: ${productSpec.oneLiner}`,
    anchors,
    requiredReads: anchors.map(anchor => anchor.path),
    recurringContext: [
      `Product: ${productSpec.customer} / ${productSpec.painfulProblem}`,
      `Wedge: ${productSpec.wedge}`,
      `Technical: ${mfdr.hypothesis}`,
      `Design: ${design.contract.brandSummary}`,
      plan ? `Active plan: ${plan.title}` : 'Active plan: missing',
      scorecard ? `Scorecard: ${scorecard.score}/100 with ${scorecard.blockers.length} blocker(s)` : 'Scorecard: not generated',
    ],
    commands: [
      'pnpm product:spec',
      'pnpm product:validate',
      'pnpm mfdr',
      'pnpm plan -- "<task>"',
      'pnpm sync',
      'pnpm score',
      'pnpm report',
    ],
    openGaps,
  };
}

function alignmentMarkdown(artifact: AlignmentArtifact): string {
  return [
    '# AI Starter Alignment',
    '',
    `Updated: ${artifact.updatedAt}`,
    `Status: ${artifact.status}`,
    '',
    '## Summary',
    artifact.summary,
    '',
    '## Anchors',
    ...artifact.anchors.map(anchor => `- ${anchor.label}: [${anchor.path}](${anchor.path}) (${anchor.status}) - ${anchor.reminder}`),
    '',
    '## Required Reads',
    ...artifact.requiredReads.map(path => `- ${path}`),
    '',
    '## Recurring Context',
    ...artifact.recurringContext.map(item => `- ${item}`),
    '',
    '## Commands',
    ...artifact.commands.map(command => `- \`${command}\``),
    '',
    '## Open Gaps',
    ...(artifact.openGaps.length > 0 ? artifact.openGaps.map(item => `- ${item}`) : ['- None recorded.']),
    '',
  ].join('\n');
}

export function writeAlignmentArtifacts(context: StarterContext, config: StarterSetupConfig): AlignmentArtifact {
  const cwd = context.cwd;
  const artifact = generateAlignmentArtifact(cwd, config);
  writeJson(cwd, LATEST_ALIGNMENT_JSON_FILE, artifact);
  writeText(cwd, LATEST_ALIGNMENT_MD_FILE, alignmentMarkdown(artifact));
  writeJson(cwd, ALIGNMENT_MANIFEST_FILE, artifact);
  return artifact;
}

export function writeSetupConfig(context: StarterContext, config: StarterSetupConfig): StarterSetupConfig {
  const cwd = context.cwd;
  ensureStarterDirectories(cwd);
  const normalized = {
    ...createDefaultSetupConfig(context, config),
    version: context.version ?? config.version,
    updatedAt: nowIso(),
  };
  normalized.env.requirements = setupEnvRequirements(normalized);
  normalized.status = setupStatus(cwd, normalized);
  writeJson(cwd, SETUP_CONFIG_FILE, normalized);
  writeEnvExampleFromSetup(cwd, normalized);
  upsertDesignContractFromSetup(cwd, normalized);
  writeProductValidationArtifacts(context, normalized);
  writeProductSpecArtifacts(context, normalized);
  writeMfdrArtifacts(context, normalized);
  writeAlignmentArtifacts(context, normalized);
  writeJson(cwd, SETUP_MANIFEST_FILE, generateSetupManifest(cwd, normalized));
  return normalized;
}

function envExampleLines(config: StarterSetupConfig): string[] {
  const vars = new Map<string, string>();
  vars.set('DEFAULT_MODEL', config.ai.defaultModel);
  vars.set('TEST_MODEL', config.ai.testModel);
  vars.set('EVAL_MODEL', config.ai.evalModel);
  for (const requirement of config.env.requirements) {
    for (const envVar of requirement.anyOf) {
      if (!vars.has(envVar)) vars.set(envVar, '');
    }
  }
  return [
    '# AI Starter Kit generated environment contract.',
    '# Do not put real secrets in this committed file.',
    '# Put secrets in .env.local or pull them with `vercel env pull .env.local --yes`.',
    '',
    ...Array.from(vars.entries()).map(([key, value]) => `${key}=${value}`),
    '',
  ];
}

export function writeEnvExampleFromSetup(cwd: string, config: StarterSetupConfig): void {
  const relPath = config.env.examplePath || '.env.example';
  const current = tryRead(cwd, relPath);
  const existingKeys = parseEnvKeys(current);
  const starterBlockStart = '# AI_STARTER_ENV_START';
  const starterBlockEnd = '# AI_STARTER_ENV_END';
  const block = [
    starterBlockStart,
    ...envExampleLines(config),
    starterBlockEnd,
    '',
  ].join('\n');
  const pattern = new RegExp(`${starterBlockStart}[\\s\\S]*?${starterBlockEnd}\\n?`);
  if (pattern.test(current)) {
    writeText(cwd, relPath, current.replace(pattern, block));
    return;
  }
  const missingLines = envExampleLines(config).filter(line => {
    const key = line.split('=')[0]?.trim();
    return !key || key.startsWith('#') || !/^[A-Z0-9_]+$/.test(key) || !existingKeys.has(key);
  });
  const next = current.trimEnd()
    ? `${current.trimEnd()}\n\n${starterBlockStart}\n${missingLines.join('\n')}${starterBlockEnd}\n`
    : block;
  writeText(cwd, relPath, next);
}

export function upsertDesignContractFromSetup(cwd: string, config: StarterSetupConfig): void {
  const start = '<!-- AI_STARTER_SETUP_DESIGN_START -->';
  const end = '<!-- AI_STARTER_SETUP_DESIGN_END -->';
  const current = tryRead(cwd, 'DESIGN.md');
  const content = [
    start,
    '',
    '## Starter Setup Design Contract',
    '',
    `- Brand summary: ${config.design.brandSummary}`,
    `- Visual style: ${config.design.visualStyle}`,
    `- Interaction style: ${config.design.interactionStyle}`,
    `- Density: ${config.design.density}`,
    `- Motion level: ${config.design.motionLevel}`,
    `- Brand colors: ${config.design.brandColors.length > 0 ? config.design.brandColors.join(', ') : 'not specified'}`,
    `- Reference systems: ${config.design.referenceSystems.length > 0 ? config.design.referenceSystems.join(', ') : 'not specified'}`,
    `- Accessibility: ${config.design.accessibility}`,
    `- Design input source: ${config.design.designInputSource}`,
    `- Drift policy: ${config.policy.designDrift}`,
    `- Expect browser proof required: ${config.policy.expectRequired ? 'yes' : 'no'}`,
    '',
    'Design changes should update this contract, `.ai-starter/config.json`, and `.ai-starter/manifests/design.json` together.',
    '',
    end,
    '',
  ].join('\n');
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}\\n?`);
  const next = pattern.test(current)
    ? current.replace(pattern, content)
    : `${current.trimEnd() || '# Design Contract'}\n\n${content}`;
  writeText(cwd, 'DESIGN.md', next);
}

export function generateSetupManifest(cwd: string, config?: StarterSetupConfig): SetupManifest {
  const setup = config ?? readJson<StarterSetupConfig | null>(cwd, SETUP_CONFIG_FILE, null);
  if (!setup) {
    return {
      status: 'needs-setup',
      updatedAt: nowIso(),
      configPath: SETUP_CONFIG_FILE,
      envExamplePath: '.env.example',
      localEnvPath: '.env.local',
      project: {
        name: 'Unknown project',
        slug: 'unknown-project',
        description: 'Run setup to define the project.',
        appType: 'unknown',
        productType: 'unknown',
      },
      ai: {
        provider: 'vercel-ai-gateway',
        defaultModel: 'anthropic/claude-sonnet-4.6',
        testModel: 'google/gemini-3.1-flash-lite',
        evalModel: 'google/gemini-3.1-flash-lite',
      },
      design: {
        brandSummary: 'Run setup to define the design contract.',
        visualStyle: 'project-specific',
        interactionStyle: 'Run setup to define interaction rules.',
        density: 'medium',
        motionLevel: 'subtle',
        brandColors: [],
        referenceSystems: [],
        accessibility: 'WCAG AA contrast, keyboard reachability, visible focus, and reduced-motion support.',
        designInputSource: 'defaults',
      },
      productValidation: {
        mode: 'recommended',
        status: 'not-run',
        unanswered: PRODUCT_VALIDATION_FIELDS,
        bypassReason: null,
        artifactPath: LATEST_PRODUCT_VALIDATION_MD_FILE,
      },
      productSpec: {
        status: 'draft',
        source: 'agent-generated',
        artifactPath: LATEST_PRODUCT_SPEC_MD_FILE,
        compatibilityPath: DEV_KIT_PRODUCT_SPEC_FILE,
        openQuestions: ['Run setup or `pnpm product:spec` to create the product spec.'],
      },
      requiredGroups: 0,
      satisfiedGroups: 0,
      missingGroups: [],
      configuredIntegrations: [],
      enabledModules: [],
      runtimes: {
        primary: 'codex',
        enabled: {
          'claude-code': true,
          codex: true,
        },
      },
      policyProfile: 'strict',
      setupCommand: 'pnpm exec ai-starter-kit setup',
      notes: ['Run setup to create the project configuration and env contract.'],
    };
  }
  const envKeys = readConfiguredEnvKeys(cwd);
  const required = setup.env.requirements.filter(requirement => requirement.required);
  const missingGroups = required
    .filter(requirement => !requirement.anyOf.some(key => envKeys.has(key)))
    .map(requirement => ({
      id: requirement.id,
      label: requirement.label,
      anyOf: requirement.anyOf,
      reason: requirement.reason,
    }));
  const enabledModules = Object.entries(setup.modules)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
  const productValidation = generateProductValidationArtifact(setup);
  const productSpec = generateProductSpecArtifact(setup);
  return {
    status: missingGroups.length > 0 ? 'needs-env' : 'configured',
    updatedAt: nowIso(),
    configPath: SETUP_CONFIG_FILE,
    envExamplePath: setup.env.examplePath,
    localEnvPath: setup.env.localPath,
    project: setup.project,
    ai: {
      provider: setup.ai.provider,
      defaultModel: setup.ai.defaultModel,
      testModel: setup.ai.testModel,
      evalModel: setup.ai.evalModel,
    },
    design: setup.design,
    productValidation: {
      mode: productValidation.mode,
      status: productValidation.status,
      unanswered: productValidation.unanswered,
      bypassReason: productValidation.bypassReason,
      artifactPath: LATEST_PRODUCT_VALIDATION_MD_FILE,
    },
    productSpec: {
      status: productSpec.status,
      source: productSpec.source,
      artifactPath: LATEST_PRODUCT_SPEC_MD_FILE,
      compatibilityPath: DEV_KIT_PRODUCT_SPEC_FILE,
      openQuestions: productSpec.openQuestions,
    },
    requiredGroups: required.length,
    satisfiedGroups: required.length - missingGroups.length,
    missingGroups,
    configuredIntegrations: setup.integrations.filter(integration => integration.enabled).map(integration => integration.id),
    enabledModules,
    runtimes: setup.runtimes,
    policyProfile: setup.policy.profile,
    setupCommand: 'pnpm exec ai-starter-kit setup',
    notes: missingGroups.length > 0
      ? ['Secrets are never stored by the starter. Add missing values to .env.local or pull from Vercel.']
      : ['Setup config and local env contract are satisfied.'],
  };
}

function extractToolNames(cwd: string): string[] {
  const candidates = [
    'lib/ai/tool-meta.ts',
    'src/lib/ai/tool-meta.ts',
    'lib/ai/tools/_metadata.ts',
  ];
  const file = candidates.find(candidate => existsSync(resolve(cwd, candidate)));
  if (!file) return [];
  const content = tryRead(cwd, file);
  const matches = [...content.matchAll(/(\w+)\s*:\s*\{[\s\S]*?description:/g)];
  return matches
    .map(match => match[1])
    .filter(name => !['export', 'const', 'default', 'import'].includes(name))
    .sort();
}

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function surfaceNeedles(entryName: string, sourcePath: string): string[] {
  const routeSurface = sourcePath
    .replace(/^app\/api\//, '')
    .replace(/^app\//, '')
    .replace(/\/(page|route)\.[^.]+$/, '')
    .replace(/\.[^.]+$/, '');
  const entryWithoutApiPrefix = entryName.replace(/^api[-_]/, '');
  return Array.from(new Set([
    normalizeKey(entryName),
    normalizeKey(entryWithoutApiPrefix),
    normalizeKey(slugify(entryName)),
    normalizeKey(slugify(entryWithoutApiPrefix)),
    normalizeKey(routeSurface),
    normalizeKey(slugify(routeSurface)),
    normalizeKey(sourcePath.replace(/\.[^.]+$/, '')),
    normalizeKey(slugify(sourcePath.replace(/\.[^.]+$/, ''))),
  ].filter(Boolean)));
}

function matchesSurfacePath(relPath: string, entryName: string, sourcePath: string): boolean {
  const normalizedPath = normalizeKey(relPath);
  return surfaceNeedles(entryName, sourcePath).some(needle => normalizedPath.includes(needle));
}

function matchesSurfaceDocument(cwd: string, relPath: string, entryName: string, sourcePath: string): boolean {
  if (matchesSurfacePath(relPath, entryName, sourcePath)) return true;
  if (!SURFACE_CONTENT_EXTENSIONS.has(extname(relPath).toLowerCase())) return false;
  const full = resolve(cwd, relPath);
  let normalizedContent = normalizedTextReadCache.get(full);
  if (normalizedContent === undefined) {
    normalizedContent = normalizeKey(tryRead(cwd, relPath));
    normalizedTextReadCache.set(full, normalizedContent);
  }
  return surfaceNeedles(entryName, sourcePath).some(needle => normalizedContent.includes(needle));
}

function matchesSurfaceArtifact(cwd: string, relPath: string, entryName: string, sourcePath: string): boolean {
  return matchesSurfacePath(relPath, entryName, sourcePath) ||
    matchesSurfaceDocument(cwd, relPath, entryName, sourcePath);
}

function inferDocsPriority(relPath: string): DocsPriority {
  if (DOCS_HOT_HINTS.some(hint => relPath.includes(hint))) return 'hot';
  if (DOCS_WARM_HINTS.some(hint => relPath.includes(hint))) return 'warm';
  return 'cold';
}

function inferTriggerPaths(relPath: string): string[] {
  if (relPath.includes('codex')) return ['.codex/hooks/', '.codex/hooks.json', '.codex/config.toml', 'AGENTS.md'];
  if (relPath.includes('hooks')) return ['.claude/hooks/', '.claude/settings.json', '.codex/hooks/', '.codex/hooks.json'];
  if (relPath.includes('ai-sdk')) return ['app/api/', 'lib/ai/', 'components/'];
  if (relPath.includes('Playwright') || relPath.includes('visual') || relPath.includes('expect')) {
    return ['tests/e2e/', 'app/', 'components/'];
  }
  if (relPath.includes('REGISTRY') || relPath.includes('tool')) return ['lib/ai/tool-meta.ts', 'lib/registry.ts'];
  return ['app/', 'components/', 'lib/'];
}

function inferEvidenceKind(relPath: string): EvidenceRegistryEntry['kind'] {
  const ext = extname(relPath).toLowerCase();
  if (relPath.startsWith('.expect/') || relPath.includes('/replays/')) return 'replay';
  if (ext === '.json') return 'json';
  if (ext === '.jsonl') return 'log';
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) return 'image';
  if (['.webm', '.mp4', '.mov'].includes(ext)) return 'video';
  if (ext === '.zip' && relPath.includes('trace')) return 'trace';
  if (['.log', '.txt'].includes(ext)) return 'log';
  if (['.md', '.html'].includes(ext)) return 'report';
  return 'other';
}

function readJsonLines<T>(cwd: string, relPath: string): T[] {
  const full = resolve(cwd, relPath);
  if (!existsSync(full)) return [];
  try {
    return readFileSync(full, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

function buildSurfaceEntry(cwd: string, kind: SurfaceKind, sourcePath: string, name: string): SurfaceManifestEntry {
  const matchesSurface = (relPath: string) => matchesSurfaceArtifact(cwd, relPath, name, sourcePath);
  const allTests = [
    ...collectFiles(cwd, 'tests', matchesSurface),
    ...collectFiles(cwd, 'components', rel => /\.test\.[tj]sx?$/.test(rel) && matchesSurface(rel)),
  ];
  const allDocs = collectFiles(cwd, 'docs', rel => matchesSurfaceDocument(cwd, rel, name, sourcePath));
  const tests = allTests.filter(rel => /\.test\.[tj]sx?$/.test(rel) || /\/unit\//.test(rel));
  const stories = collectFiles(cwd, 'components', rel => /\.stories\.[tj]sx?$/.test(rel) && matchesSurface(rel));
  const visualSpecs = allTests.filter(rel => /\.spec\.[tj]sx?$/.test(rel) || /visual/i.test(rel));
  const evals = collectFiles(cwd, 'evals', matchesSurface);
  return {
    id: `${kind}:${slugify(name)}`,
    kind,
    name,
    sourcePaths: [sourcePath],
    tests,
    stories,
    visualSpecs,
    evals,
    docs: allDocs,
    coverage: {
      hasUnit: tests.length > 0,
      hasStory: stories.length > 0,
      hasVisual: visualSpecs.length > 0,
      hasEval: evals.length > 0,
    },
  };
}

function featureKindForRoute(relPath: string): SurfaceKind {
  return relPath.startsWith('app/api/') ? 'api' : 'route';
}

function companionObligations(kind: SurfaceKind): string[] {
  switch (kind) {
    case 'component':
      return ['unit-test', 'storybook', 'visual-check'];
    case 'route':
      return ['playwright-smoke', 'expect-flow', 'screenshot', 'documentation'];
    case 'api':
      return ['integration-test', 'contract-check', 'documentation'];
    case 'tool':
      return ['unit-test', 'eval', 'rubric'];
    case 'external-integration':
      return ['integration-test', 'contract-check', 'failure-modes', 'documentation'];
    default:
      return [];
  }
}

function obligationSatisfied(
  cwd: string,
  entry: SurfaceManifestEntry,
  obligation: string,
  evidenceEntries: EvidenceRegistryEntry[],
): boolean {
  const primarySourcePath = entry.sourcePaths[0] ?? entry.name;
  const pathMatchesEntry = (relPath: string) => matchesSurfacePath(relPath, entry.name, primarySourcePath);
  const artifactMatchesEntry = (relPath: string) =>
    matchesSurfaceArtifact(cwd, relPath, entry.name, primarySourcePath);
  const evidenceMatchesEntry = (item: EvidenceRegistryEntry) => {
    if (pathMatchesEntry(item.path)) return true;
    if (['json', 'log', 'report', 'replay'].includes(item.kind)) {
      return artifactMatchesEntry(item.path);
    }
    return false;
  };

  const hasNamedEvidence = (kind: EvidenceRegistryEntry['kind']) =>
    evidenceEntries.some(item =>
      item.kind === kind && evidenceMatchesEntry(item),
    );

  switch (obligation) {
    case 'unit-test':
    case 'integration-test':
    case 'contract-check':
      return entry.tests.some(artifactMatchesEntry);
    case 'playwright-smoke':
      return [...entry.tests, ...entry.visualSpecs].some(artifactMatchesEntry);
    case 'storybook':
      return entry.coverage.hasStory;
    case 'visual-check':
      return entry.coverage.hasVisual || hasNamedEvidence('image');
    case 'screenshot':
      return hasNamedEvidence('image');
    case 'expect-flow':
      return collectFiles(cwd, 'tests/expect', artifactMatchesEntry).length > 0 ||
        evidenceEntries.some(item => item.kind === 'replay' && evidenceMatchesEntry(item));
    case 'documentation':
      return entry.docs.some(relPath => matchesSurfaceDocument(cwd, relPath, entry.name, primarySourcePath));
    case 'eval':
      return entry.coverage.hasEval;
    case 'rubric':
      return hasNamedEvidence('json');
    case 'failure-modes':
      return collectFiles(cwd, 'tests', rel => {
        const lower = `${rel}\n${tryRead(cwd, rel)}`.toLowerCase();
        return artifactMatchesEntry(rel) && (lower.includes('failure') || lower.includes('edge') || lower.includes('error'));
      }).length > 0;
    default:
      return false;
  }
}

function buildCompanionTask(
  cwd: string,
  entry: SurfaceManifestEntry,
  evidenceEntries: EvidenceRegistryEntry[],
  previous?: CompanionTask,
): CompanionTask {
  const suggested = companionObligations(entry.kind);
  const satisfied = suggested.filter(obligation =>
    obligationSatisfied(cwd, entry, obligation, evidenceEntries),
  );
  const missing = suggested.filter(obligation => !satisfied.includes(obligation));

  return {
    id: entry.id,
    path: entry.sourcePaths[0] ?? entry.id,
    kind: entry.kind,
    suggested,
    satisfied,
    missing,
    status: missing.length > 0 ? 'pending' : 'satisfied',
    sourcePaths: entry.sourcePaths,
    updatedAt: nowIso(),
    lastObservedAt: previous?.lastObservedAt ?? null,
  };
}

export function generateCompanionManifest(
  cwd: string,
  features: SurfaceManifestEntry[],
  evidenceEntries: EvidenceRegistryEntry[],
): CompanionTask[] {
  const existing = readJson<{ tasks?: CompanionTask[] }>(cwd, COMPANION_MANIFEST_FILE, { tasks: [] });
  const existingById = new Map((existing.tasks ?? []).map(task => [task.id, task]));
  const entries = features.map(entry =>
    buildCompanionTask(cwd, entry, evidenceEntries, existingById.get(entry.id)),
  );
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

function isPlaceholderTask(task: string | null | undefined): boolean {
  return !task || task === 'No active task yet' || task === '(no active task)';
}

function normalizeRuntimeState(cwd: string): void {
  const plan = readJson<PlanArtifact | null>(cwd, LATEST_PLAN_FILE, null);
  const scorecard = readJson<Scorecard | null>(cwd, SCORECARD_FILE, null);
  const session = readJson<SessionState>(cwd, SESSION_FILE, {
    currentPlanId: null,
    currentTask: 'No active task yet',
    lastDecision: null,
    openGaps: [],
    modifiedFiles: [],
    updatedAt: nowIso(),
  });
  const progress = readJson<ProgressState>(cwd, PROGRESS_FILE, {
    currentPlanId: null,
    openTasks: [],
    closedTasks: [],
    filesInFlight: [],
    evidenceStatus: [],
    updatedAt: nowIso(),
  });
  const companions = readJson<{ tasks?: CompanionTask[] }>(cwd, COMPANION_MANIFEST_FILE, { tasks: [] }).tasks ?? [];
  const pendingCompanions = companions.filter(task => task.status === 'pending');

  const activePlan = plan && plan.status !== 'done' ? plan : null;
  const activePlanId = activePlan?.id ?? progress.currentPlanId ?? session.currentPlanId ?? null;
  let sessionChanged = false;
  let progressChanged = false;

  if (activePlanId && session.currentPlanId !== activePlanId) {
    session.currentPlanId = activePlanId;
    sessionChanged = true;
  }

  if (activePlanId && progress.currentPlanId !== activePlanId) {
    progress.currentPlanId = activePlanId;
    progressChanged = true;
  }

  if (activePlan && isPlaceholderTask(session.currentTask)) {
    session.currentTask = activePlan.title;
    sessionChanged = true;
  }

  if (activePlan && progress.openTasks.length === 0) {
    progress.openTasks = activePlan.acceptanceCriteria.slice();
    progressChanged = true;
  }

  const blockerGaps = scorecard?.blockers?.slice(0, 3) ?? [];
  const taskGaps = progress.openTasks.slice(0, 3);
  const shouldRefreshOpenGaps =
    session.openGaps.length === 0 ||
    (session.openGaps.length === 1 && session.openGaps[0] === 'Run `pnpm sync` to generate starter manifests.');
  if (activePlan && shouldRefreshOpenGaps) {
    session.openGaps = blockerGaps.length > 0 ? blockerGaps : taskGaps;
    sessionChanged = true;
  }

  if (scorecard && blockerGaps.length === 0 && session.openGaps.some(gap =>
    gap.startsWith('No ') || gap.includes('Pending companion coverage'),
  )) {
    session.openGaps = taskGaps;
    sessionChanged = true;
  }

  if (scorecard && scorecard.blockers.length === 0 && pendingCompanions.length === 0 && progress.openTasks.length > 0) {
    const closed = new Set([...progress.closedTasks, ...progress.openTasks]);
    progress.closedTasks = Array.from(closed);
    progress.openTasks = [];
    progressChanged = true;
  }

  if (scorecard && scorecard.blockers.length === 0 && pendingCompanions.length === 0 && session.openGaps.length > 0) {
    session.openGaps = [];
    sessionChanged = true;
  }

  if (sessionChanged) {
    session.updatedAt = nowIso();
    writeJson(cwd, SESSION_FILE, session);
  }

  if (progressChanged) {
    progress.updatedAt = nowIso();
    writeJson(cwd, PROGRESS_FILE, progress);
  }
}

function findLatestFile(cwd: string, relDir: string, extension: string): string | null {
  const files = collectFiles(cwd, relDir, rel => rel.endsWith(extension));
  return files.length > 0 ? files[files.length - 1] : null;
}

export function ensureStarterDirectories(cwd: string): void {
  for (const relDir of [STARTER_ROOT, MANIFESTS_DIR, PLANS_DIR, RUNS_DIR, REPORTS_DIR, PRODUCT_VALIDATION_DIR, PRODUCT_SPEC_DIR, MFDR_DIR, ALIGNMENT_DIR, '.ai-dev-kit']) {
    mkdirSync(resolve(cwd, relDir), { recursive: true });
  }
}

export function generateModuleManifest(cwd: string): ModuleManifestEntry[] {
  const pkg = readJson<{ scripts?: Record<string, string>; devDependencies?: Record<string, string>; dependencies?: Record<string, string> }>(
    cwd,
    'package.json',
    {},
  );
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return CORE_MODULES.map(module => {
    if (module.id === 'browser-proof') {
      const hasPlaywright = Boolean(deps['@playwright/test']);
      const hasExpectScript = Boolean(pkg.scripts?.['test:ai'] || pkg.scripts?.['test:ai:local']);
      return {
        ...module,
        status: hasPlaywright && hasExpectScript ? 'enabled' : 'missing',
      };
    }
    if (module.id === 'browser-use-adapter') {
      const hasBrowserUse = Boolean(deps['browser-use'] || deps['@browser-use/sdk'] || deps['@browser-use/mcp']);
      return {
        ...module,
        status: hasBrowserUse ? 'enabled' : 'planned',
      };
    }
    return module;
  });
}

export function generateAdapterManifest(cwd: string): AdapterManifestEntry[] {
  const envText = ['.env.local', '.env'].map(file => tryRead(cwd, file)).join('\n');
  const pkg = readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(cwd, 'package.json', {});
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const hasGateway = Boolean(deps['@ai-sdk/gateway'] || envText.includes('AI_GATEWAY_API_KEY'));
  const hasSupabase = Boolean(deps['@supabase/supabase-js'] || envText.includes('SUPABASE_URL'));
  const hasAssemblyAi = Boolean(deps['assemblyai'] || envText.includes('ASSEMBLYAI_API_KEY'));
  const hasResend = Boolean(deps['resend'] || envText.includes('RESEND_API_KEY'));
  const hasStripe = Boolean(deps['stripe'] || envText.includes('STRIPE_SECRET_KEY'));
  const hasTmux = commandExists('tmux');
  const hasCodex = existsSync(resolve(cwd, '.codex/config.toml')) && existsSync(resolve(cwd, '.codex/hooks.json'));
  const hasClaudeCode = existsSync(resolve(cwd, '.claude/settings.json'));

  return [
    {
      id: 'codex',
      label: 'Codex',
      kind: 'agent-runtime',
      status: hasCodex ? 'configured' : 'available',
      default: true,
      envVars: [],
      notes: ['First-class OpenAI runtime adapter using AGENTS.md, .codex/config.toml, .codex/hooks.json, and codex exec proof.'],
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      kind: 'agent-runtime',
      status: hasClaudeCode ? 'configured' : 'available',
      default: true,
      envVars: [],
      notes: ['Claude runtime adapter using .claude/settings.json hooks and optional Claude Code skills.'],
    },
    {
      id: 'vercel-ai-gateway',
      label: 'Vercel AI Gateway',
      kind: 'ai-provider',
      status: hasGateway ? 'configured' : 'available',
      default: true,
      envVars: ['AI_GATEWAY_API_KEY'],
      notes: ['Default high-fidelity model/cost telemetry adapter.'],
    },
    {
      id: 'supabase',
      label: 'Supabase',
      kind: 'database',
      status: hasSupabase ? 'configured' : 'available',
      default: true,
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      notes: ['First-class adapter, but filesystem fallbacks must remain valid.'],
    },
    {
      id: 'tmux',
      label: 'tmux supervisor backend',
      kind: 'supervisor',
      status: hasTmux ? 'available' : 'missing',
      default: true,
      envVars: [],
      notes: ['Default local supervisor backend on macOS/Linux.'],
    },
    {
      id: 'browser-use',
      label: 'Browser Use',
      kind: 'browser-runtime',
      status: deps['browser-use'] || deps['@browser-use/mcp'] ? 'available' : 'planned',
      default: false,
      envVars: [],
      notes: ['Browser-control adapter for exploratory local sessions, not the primary QA/replay layer.'],
    },
    {
      id: 'assemblyai',
      label: 'AssemblyAI',
      kind: 'external-api',
      status: hasAssemblyAi ? 'configured' : 'available',
      default: false,
      envVars: ['ASSEMBLYAI_API_KEY'],
      notes: ['Direct external API adapter example for voice transcription outside the AI Gateway.'],
    },
    {
      id: 'resend',
      label: 'Resend',
      kind: 'email',
      status: hasResend ? 'configured' : 'available',
      default: false,
      envVars: ['RESEND_API_KEY'],
      notes: ['Email adapter; should be tracked separately from model runtime spend.'],
    },
    {
      id: 'stripe',
      label: 'Stripe',
      kind: 'payments',
      status: hasStripe ? 'configured' : 'available',
      default: false,
      envVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
      notes: ['Payment adapter; dashboard cost is operational visibility, not revenue accounting.'],
    },
  ];
}

function envConfigured(envText: string, vars: string[]): boolean {
  return vars.some(name => new RegExp(`(^|\\n)\\s*${name}\\s*=`, 'm').test(envText));
}

function hasAnyDependency(deps: Record<string, string>, names: string[]): boolean {
  return names.some(name => Boolean(deps[name]));
}

function integrationTestsFor(
  cwd: string,
  id: string,
  routes: string[],
): IntegrationManifestEntry['tests'] {
  const executableTest = (rel: string) =>
    /\.test\.[tj]sx?$/.test(rel) ||
    /\.spec\.[tj]sx?$/.test(rel) ||
    rel.startsWith('tests/contracts/') ||
    rel.startsWith('evals/');
  const artifacts = [
    ...collectFiles(cwd, 'tests', executableTest),
    ...collectFiles(cwd, 'app', rel => /\.spec\.[tj]sx?$|\.test\.[tj]sx?$/.test(rel)),
    ...collectFiles(cwd, 'lib', rel => /\.spec\.[tj]s$|\.test\.[tj]s$/.test(rel)),
    ...collectFiles(cwd, 'evals', rel => /\.[tj]sx?$|\.json$|\.md$/.test(rel)),
  ].map(relPath => {
    const text = `${relPath}\n${tryRead(cwd, relPath)}`;
    return {
      relPath,
      text,
      normalizedText: normalizeKey(text),
    };
  });

  const idNeedles = [
    id,
    slugify(id),
    id.replace(/^vercel-ai-/, 'ai-'),
    id.replace(/-routes$/, ''),
  ].map(normalizeKey).filter(Boolean);
  const routeNeedles = routes.flatMap(route => {
    const withoutFile = route
      .replace(/^app\/api\//, '')
      .replace(/\/route\.[^.]+$/, '')
      .replace(/\.[^.]+$/, '');
    return [
      route,
      withoutFile,
      slugify(withoutFile),
      `api-${withoutFile}`,
      slugify(`api-${withoutFile}`),
    ].map(normalizeKey);
  }).filter(Boolean);

  const matchingArtifacts = artifacts.filter(artifact => {
    const matchesRoute = routeNeedles.some(needle => artifact.normalizedText.includes(needle));
    const matchesId = idNeedles.some(needle => artifact.normalizedText.includes(needle));
    return matchesRoute || matchesId;
  });

  const hasUnit = matchingArtifacts.some(artifact =>
    /\.test\.[tj]sx?$/.test(artifact.relPath) ||
    /\/unit\//.test(artifact.relPath) ||
    /\b(describe|it|test)\s*\(/.test(artifact.text),
  );
  const hasContract = matchingArtifacts.some(artifact =>
    /contract|request\.(get|post|put|patch|delete)|response|status|json\(/i.test(artifact.text),
  );
  const hasE2e = matchingArtifacts.some(artifact =>
    artifact.relPath.startsWith('tests/e2e/') ||
    /@playwright\/test|playwright|request\.(get|post|put|patch|delete)/i.test(artifact.text),
  );
  const hasEval = matchingArtifacts.some(artifact =>
    artifact.relPath.startsWith('evals/') ||
    /(^|\/)rubrics?\//i.test(artifact.relPath) ||
    /\.eval\.[tj]sx?$/.test(artifact.relPath),
  );
  const recommended = [
    !hasUnit ? `Add a unit or integration test for ${id} request/response mapping.` : null,
    !hasContract ? `Add a contract test for ${id} error and timeout behavior.` : null,
    `Record dashboard evidence after a successful ${id} run.`,
  ].filter((item): item is string => Boolean(item));

  return {
    unit: hasUnit,
    contract: hasContract,
    e2e: hasE2e,
    eval: hasEval,
    recommended,
  };
}

function apiRoutesForIntegration(features: SurfaceManifestEntry[], keywords: string[]): string[] {
  const normalized = keywords.map(keyword => keyword.toLowerCase());
  return features
    .filter(feature => feature.kind === 'api')
    .filter(feature => {
      const haystack = [feature.name, ...feature.sourcePaths].join(' ').toLowerCase();
      return normalized.some(keyword => haystack.includes(keyword));
    })
    .flatMap(feature => feature.sourcePaths)
    .sort();
}

export function generateIntegrationManifest(cwd: string): IntegrationManifestEntry[] {
  const envText = ['.env.local', '.env'].map(file => tryRead(cwd, file)).join('\n');
  const pkg = readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(cwd, 'package.json', {});
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const docs = generateDocsRegistry(cwd);
  const features = generateFeatureManifest(cwd);
  const apiRoutes = features.filter(feature => feature.kind === 'api').flatMap(feature => feature.sourcePaths);
  const docsIdsFor = (keywords: string[]) =>
    docs
      .filter(doc => {
        const haystack = [doc.id, doc.title, doc.localPath, ...(doc.tags ?? [])].join(' ').toLowerCase();
        return keywords.some(keyword => haystack.includes(keyword));
      })
      .map(doc => doc.id)
      .slice(0, 5);

  const entries: Array<Omit<IntegrationManifestEntry, 'status' | 'tests' | 'routes'>> = [
    {
      id: 'vercel-ai-gateway',
      label: 'Vercel AI Gateway',
      kind: 'ai-provider',
      default: true,
      envVars: ['AI_GATEWAY_API_KEY'],
      docsUrl: 'https://vercel.com/ai-gateway',
      docsRegistryIds: docsIdsFor(['ai-sdk', 'gateway', 'model-provider']),
      triggerPaths: ['app/api/**/route.ts', 'lib/ai/**', 'lib/registry/**'],
      cost: {
        tracked: true,
        source: 'ai-telemetry',
        unit: 'model tokens',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Runtime calls are recorded by AI telemetry and summarized on /observability and /control-plane.'],
      },
      failureModes: ['missing gateway key', 'provider unavailable', 'rate limit', 'model route changed', 'stream abort'],
      exampleCommands: ['pnpm test:ai', 'pnpm browser:proof'],
    },
    {
      id: 'supabase',
      label: 'Supabase',
      kind: 'database',
      default: true,
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      docsUrl: 'https://supabase.com/docs',
      docsRegistryIds: docsIdsFor(['supabase', 'postgres', 'auth']),
      triggerPaths: ['lib/supabase/**', 'app/api/**/route.ts', 'supabase/**'],
      cost: {
        tracked: false,
        source: 'provider-dashboard',
        unit: 'project usage',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Provider spend is not available from local files unless a project-specific usage adapter is added.'],
      },
      failureModes: ['RLS denial', 'expired JWT', 'schema drift', 'connection limit', 'missing anon/service key'],
      exampleCommands: ['pnpm test', 'pnpm gates'],
    },
    {
      id: 'assemblyai',
      label: 'AssemblyAI transcription',
      kind: 'external-api',
      default: false,
      envVars: ['ASSEMBLYAI_API_KEY'],
      docsUrl: 'https://www.assemblyai.com/docs',
      docsRegistryIds: docsIdsFor(['assembly', 'voice', 'transcription']),
      triggerPaths: ['app/api/**/route.ts', 'lib/integrations/assemblyai.ts', 'lib/services/transcription.ts'],
      cost: {
        tracked: false,
        source: 'manual-estimate',
        unit: 'audio hour',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Direct APIs outside AI Gateway need explicit usage events to show true local cost.'],
      },
      failureModes: ['large upload timeout', 'unsupported audio format', 'webhook missed', 'provider quota', 'partial transcript'],
      exampleCommands: ['pnpm test', 'pnpm test:e2e'],
    },
    {
      id: 'resend',
      label: 'Resend email',
      kind: 'email',
      default: false,
      envVars: ['RESEND_API_KEY'],
      docsUrl: 'https://resend.com/docs',
      docsRegistryIds: docsIdsFor(['email', 'resend']),
      triggerPaths: ['app/api/**/route.ts', 'lib/email/**', 'lib/integrations/resend.ts'],
      cost: {
        tracked: false,
        source: 'provider-dashboard',
        unit: 'email sent',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Email sends should record local usage events if added to an app.'],
      },
      failureModes: ['domain not verified', 'suppression list', 'rate limit', 'template render error'],
      exampleCommands: ['pnpm test', 'pnpm gates'],
    },
    {
      id: 'stripe',
      label: 'Stripe payments',
      kind: 'payments',
      default: false,
      envVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
      docsUrl: 'https://docs.stripe.com',
      docsRegistryIds: docsIdsFor(['stripe', 'payments']),
      triggerPaths: ['app/api/**/route.ts', 'lib/payments/**', 'lib/integrations/stripe.ts'],
      cost: {
        tracked: false,
        source: 'provider-dashboard',
        unit: 'payment event',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Payments need separate revenue/fee reporting; starter cost telemetry only tracks operational events.'],
      },
      failureModes: ['webhook signature mismatch', 'idempotency miss', 'declined payment', 'tax/price drift'],
      exampleCommands: ['pnpm test', 'pnpm gates'],
    },
  ];

  const completed = entries.map(entry => {
    const depConfigured = hasAnyDependency(deps, [entry.id, `@${entry.id}/sdk`, 'assemblyai', 'resend', 'stripe']);
    const envIsConfigured = envConfigured(envText, entry.envVars);
    const routeKeywordMap: Record<string, string[]> = {
      'vercel-ai-gateway': ['chat', 'ai', 'gateway', 'model'],
      supabase: ['supabase', 'auth', 'database', 'postgres'],
      assemblyai: ['assemblyai', 'assembly', 'transcription', 'transcript', 'voice', 'audio'],
      resend: ['resend', 'email', 'mail'],
      stripe: ['stripe', 'checkout', 'payment', 'billing', 'webhook'],
    };
    const routeKeywords = routeKeywordMap[entry.id] ?? [entry.id];
    const routes = apiRoutesForIntegration(features, routeKeywords);
    const status: AdapterStatus = depConfigured || envIsConfigured || routes.length > 0
      ? 'configured'
      : entry.default
        ? 'available'
        : 'planned';
    return {
      ...entry,
      status,
      routes,
      tests: integrationTestsFor(cwd, entry.id, routes),
    };
  });

  if (apiRoutes.length > 0) {
    completed.push({
      id: 'custom-api-routes',
      label: 'Custom API routes',
      kind: 'custom-api',
      status: 'configured',
      default: false,
      envVars: [],
      docsUrl: null,
      docsRegistryIds: docsIdsFor(['api', 'contract']),
      triggerPaths: ['app/api/**/route.ts'],
      routes: apiRoutes.sort(),
      cost: {
        tracked: false,
        source: 'not-tracked',
        unit: 'route invocation',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Custom APIs must opt into local usage/cost events if they call paid external services.'],
      },
      tests: integrationTestsFor(cwd, 'custom-api-routes', apiRoutes),
      failureModes: ['unvalidated input', 'missing rate limit', 'provider timeout', 'untracked external spend'],
      exampleCommands: ['pnpm test', 'pnpm test:smoke', 'pnpm gates'],
    });
  }

  const knownIntegrationIds = new Set(completed.map(entry => entry.id));
  const externalIntegrations = features.filter(feature => feature.kind === 'external-integration');
  for (const feature of externalIntegrations) {
    const id = slugify(feature.name);
    if (!id || knownIntegrationIds.has(id)) continue;

    const routes = apiRoutesForIntegration(features, [feature.name, id]);
    completed.push({
      id,
      label: feature.name
        .split(/[-_]/)
        .map(part => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(' '),
      kind: 'external-api',
      status: 'configured',
      default: false,
      envVars: [`${id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`],
      docsUrl: null,
      docsRegistryIds: docsIdsFor([feature.name, id, 'api', 'integration']),
      triggerPaths: [...feature.sourcePaths, 'app/api/**/route.ts'],
      routes,
      cost: {
        tracked: false,
        source: 'manual-estimate',
        unit: 'request',
        estimatedUnitCostUsd: null,
        monthlyBudgetUsd: null,
        notes: ['Detected from lib/integrations, lib/providers, or lib/services. Add recordApiUsage()/trackedFetch() to make local cost automatic.'],
      },
      tests: integrationTestsFor(cwd, id, [...routes, ...feature.sourcePaths]),
      failureModes: ['provider timeout', 'invalid credentials', 'rate limit', 'malformed response', 'untracked cost'],
      exampleCommands: [`pnpm usage:record -- --integration=${id} --quantity=1 --unit=request --cost=0.01`],
    });
    knownIntegrationIds.add(id);
  }

  return completed.sort((a, b) => a.id.localeCompare(b.id));
}

function commandExists(command: string): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore', shell: '/bin/sh' });
    return true;
  } catch {
    return false;
  }
}

export function generateSupervisorManifest(): SupervisorManifest {
  const hasTmux = commandExists('tmux');
  const expected: SupervisorManifest['sessions'] = [
    { name: 'starter-dev', role: 'app', expected: true, observed: false, lastSeenAt: null },
    { name: 'starter-claude', role: 'agent', expected: false, observed: false, lastSeenAt: null },
    { name: 'starter-codex', role: 'agent', expected: false, observed: false, lastSeenAt: null },
    { name: 'starter-verify', role: 'verify', expected: false, observed: false, lastSeenAt: null },
    { name: 'starter-browser', role: 'browser', expected: false, observed: false, lastSeenAt: null },
  ];

  if (!hasTmux) {
    return {
      backend: 'process',
      status: 'missing',
      sessions: expected,
      updatedAt: nowIso(),
    };
  }

  let tmuxOutput = '';
  try {
    tmuxOutput = execSync('tmux ls', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    tmuxOutput = '';
  }

  const observedNames = new Set(
    tmuxOutput
      .split('\n')
      .map(line => line.split(':')[0]?.trim())
      .filter(Boolean),
  );

  return {
    backend: 'tmux',
    status: 'available',
    sessions: expected.map(session => ({
      ...session,
      observed: observedNames.has(session.name),
      lastSeenAt: observedNames.has(session.name) ? nowIso() : null,
    })),
    updatedAt: nowIso(),
  };
}

export function generateDesignRegistry(cwd: string): DesignRegistry {
  const existing = readJson<DesignRegistry | null>(cwd, DESIGN_REGISTRY_FILE, null);
  const setup = readJson<StarterSetupConfig | null>(cwd, SETUP_CONFIG_FILE, null);
  const fallbackContract: DesignRegistry['contract'] = {
    brandSummary: setup?.design?.brandSummary ?? 'Project-specific design system defined during setup; preserve existing product visual language when present.',
    visualStyle: setup?.design?.visualStyle ?? 'project-specific',
    interactionStyle: setup?.design?.interactionStyle ?? 'Clear task-first flows with visible feedback and recoverable states.',
    density: setup?.design?.density ?? 'medium',
    motionLevel: setup?.design?.motionLevel ?? 'subtle',
    brandColors: setup?.design?.brandColors ?? [],
    referenceSystems: setup?.design?.referenceSystems ?? [],
    accessibility: setup?.design?.accessibility ?? 'WCAG AA contrast, keyboard reachability, visible focus, and reduced-motion support.',
    designInputSource: setup?.design?.designInputSource ?? 'defaults',
    driftPolicy: setup?.policy?.designDrift ?? 'warn',
  };
  const fallback: DesignRegistry = {
    version: '1.0.0',
    updatedAt: nowIso(),
    editableFromDashboard: false,
    contract: fallbackContract,
    tokens: {
      colors: {
        paper: 'oklch(0.08 0.006 260)',
        panel: 'oklch(0.12 0.006 260)',
        panelRaised: 'oklch(0.16 0.006 260)',
        ink: 'oklch(0.97 0.004 260)',
        muted: 'oklch(0.72 0.006 260)',
        line: 'oklch(0.82 0.006 260 / 0.28)',
        success: 'oklch(0.86 0.02 145)',
        warning: 'oklch(0.84 0.03 88)',
        danger: 'oklch(0.78 0.04 25)',
      },
      spacing: {
        pixel: '4px',
        compact: '8px',
        field: '12px',
        panel: '16px',
        section: '32px',
        stage: '64px',
      },
      radii: {
        none: '0',
        chip: '2px',
        panel: '4px',
      },
      motion: {
        tick: '120ms steps(4, end)',
        scan: '420ms steps(8, end)',
        reveal: '680ms steps(10, end)',
      },
    },
    assets: [
      {
        id: 'design-md',
        label: 'Design contract',
        path: 'DESIGN.md',
        usage: 'Human and agent-readable design intent that explains the runtime design registry.',
      },
    ],
  };
  return existing
    ? {
        ...fallback,
        ...existing,
        contract: {
          ...fallbackContract,
          ...(existing.contract ?? {}),
        },
      }
    : fallback;
}

interface ExpectReplayCommand {
  command?: string;
  ok?: boolean;
  output?: string;
}

interface ExpectReplayProbe {
  commands?: ExpectReplayCommand[];
  copiedScreenshotPath?: string | null;
  copiedVideoPath?: string | null;
}

function analyzeExpectReplays(cwd: string, replayPaths: string[]) {
  const replayPathsForAnalysis = replayPaths.length > 0 ? [replayPaths.at(-1)!] : [];
  let expectProbeCount = 0;
  let expectCommandCount = 0;
  let expectFailedCommandCount = 0;
  let expectBlockingFailedCommandCount = 0;
  let expectOpenOk = false;
  let expectScreenshotCount = 0;
  let expectVideoCount = 0;

  for (const replayPath of replayPathsForAnalysis) {
    const replay = readJson<{
      expectCli?: {
        commands?: ExpectReplayCommand[];
        probes?: ExpectReplayProbe[];
        copiedScreenshotPath?: string | null;
        copiedVideoPath?: string | null;
      };
    } | null>(cwd, replayPath, null);
    const expectCli = replay?.expectCli;
    if (!expectCli) continue;
    const probes = Array.isArray(expectCli.probes) && expectCli.probes.length > 0
      ? expectCli.probes
      : [{ commands: expectCli.commands ?? [], copiedScreenshotPath: expectCli.copiedScreenshotPath, copiedVideoPath: expectCli.copiedVideoPath }];
    expectProbeCount += probes.length;
    if (expectCli.copiedScreenshotPath) expectScreenshotCount += 1;
    if (expectCli.copiedVideoPath) expectVideoCount += 1;

    for (const probe of probes) {
      if (probe.copiedScreenshotPath) expectScreenshotCount += 1;
      if (probe.copiedVideoPath) expectVideoCount += 1;
      for (const command of probe.commands ?? []) {
        const commandText = command.command ?? '';
        expectCommandCount += 1;
        if (commandText.includes('expect open') && command.ok === true) {
          expectOpenOk = true;
        }
        if (command.ok === false) {
          expectFailedCommandCount += 1;
          if (!commandText.includes('expect screenshot')) {
            expectBlockingFailedCommandCount += 1;
          }
        }
      }
    }
  }

  return {
    expectProbeCount,
    expectCommandCount,
    expectFailedCommandCount,
    expectBlockingFailedCommandCount,
    expectOpenOk,
    expectProofOk: replayPaths.length > 0 &&
      expectOpenOk &&
      expectCommandCount > 0 &&
      expectBlockingFailedCommandCount === 0,
    expectScreenshotCount,
    expectVideoCount,
  };
}

export function generateBrowserProofManifest(cwd: string, evidenceEntries: EvidenceRegistryEntry[]): BrowserProofManifest {
  const replayPaths = evidenceEntries
    .filter(entry => entry.kind === 'replay')
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.path.localeCompare(b.path))
    .map(entry => entry.path);
  const screenshotPaths = evidenceEntries
    .filter(entry => entry.kind === 'image')
    .map(entry => entry.path)
    .filter(path => path.startsWith('.evidence/screenshots/') || path.startsWith('.evidence/smoke/'));
  const flowPaths = collectFiles(cwd, 'tests/expect', rel => /\.(md|txt|json)$/i.test(rel));
  const modules = generateModuleManifest(cwd);
  const browserUse = modules.find(module => module.id === 'browser-use-adapter');
  const expectAnalysis = analyzeExpectReplays(cwd, replayPaths);
  return {
    updatedAt: nowIso(),
    required: true,
    playwrightRequired: true,
    expectRequired: true,
    browserUseAdapter: browserUse?.status === 'enabled' ? 'available' : 'planned',
    replayPaths,
    flowPaths,
    screenshotPaths,
    ...expectAnalysis,
    lastReplayPath: replayPaths.at(-1) ?? null,
  };
}

export function ensureStarterFiles(context: StarterContext): void {
  const cwd = context.cwd;
  ensureStarterDirectories(cwd);
  const starterManifest = readJson<StarterManifest | null>(cwd, STARTER_MANIFEST_FILE, null);
  const installedAt = starterManifest?.installedAt ?? nowIso();
  const defaultEnabledModules = [
    'setup',
    'install',
    'hooks',
    'research',
    'docs',
    'verification',
    'browser-proof',
    'expect',
    'supervisor',
    'design-registry',
    'control-plane',
    'product-spec',
    'product-validation',
    'mfdr',
    'alignment',
  ];
  const manifest: StarterManifest = {
    version: context.version ?? starterManifest?.version ?? '0.0.0',
    installedAt,
    updatedAt: nowIso(),
    policyProfile: context.policyProfile ?? starterManifest?.policyProfile ?? 'strict',
    projectType: context.projectType ?? starterManifest?.projectType ?? 'unknown',
    packageManager: context.packageManager ?? starterManifest?.packageManager ?? 'npm',
    enabledModules: Array.from(new Set([...(starterManifest?.enabledModules ?? []), ...defaultEnabledModules])),
    generatedArtifacts: [
      DOCS_REGISTRY_FILE,
      SETUP_MANIFEST_FILE,
      HOOK_REGISTRY_FILE,
      RUNTIME_MANIFEST_FILE,
      EVIDENCE_REGISTRY_FILE,
      FEATURE_MANIFEST_FILE,
      COMPANION_MANIFEST_FILE,
      MODULE_MANIFEST_FILE,
      ADAPTER_MANIFEST_FILE,
      INTEGRATION_MANIFEST_FILE,
      SUPERVISOR_MANIFEST_FILE,
      DESIGN_REGISTRY_FILE,
      BROWSER_PROOF_MANIFEST_FILE,
      PRODUCT_VALIDATION_MANIFEST_FILE,
      PRODUCT_SPEC_MANIFEST_FILE,
      MFDR_MANIFEST_FILE,
      ALIGNMENT_MANIFEST_FILE,
      LATEST_PRODUCT_VALIDATION_JSON_FILE,
      LATEST_PRODUCT_VALIDATION_MD_FILE,
      LATEST_PRODUCT_SPEC_JSON_FILE,
      LATEST_PRODUCT_SPEC_MD_FILE,
      DEV_KIT_PRODUCT_SPEC_FILE,
      LATEST_MFDR_JSON_FILE,
      LATEST_MFDR_MD_FILE,
      LATEST_ALIGNMENT_JSON_FILE,
      LATEST_ALIGNMENT_MD_FILE,
      SCORECARD_FILE,
      LATEST_PLAN_FILE,
      LATEST_REPORT_FILE,
      LATEST_ITERATION_FILE,
      TELEMETRY_LOG_FILE,
    ],
    commands: ['init', 'setup', 'update', 'doctor', 'repair', 'validate-product', 'product-spec', 'mfdr', 'plan', 'iterate', 'score', 'sync', 'report', 'companions', 'supervisor', 'product:validate', 'product:spec', 'design:check', 'evidence:export', 'test:hooks', 'test:codex-runtime'],
  };
  writeJson(cwd, STARTER_MANIFEST_FILE, manifest);
  const setupInput = readJson<StarterSetupConfig | null>(cwd, SETUP_CONFIG_FILE, null) ??
    createDefaultSetupConfig(context, { mode: 'detected' });
  const setup = writeSetupConfig(context, setupInput);
  writeJson(cwd, SETUP_MANIFEST_FILE, generateSetupManifest(cwd, setup));
  writeJson(cwd, MODULE_MANIFEST_FILE, generateModuleManifest(cwd));
  writeJson(cwd, ADAPTER_MANIFEST_FILE, generateAdapterManifest(cwd));
  writeJson(cwd, RUNTIME_MANIFEST_FILE, generateRuntimeManifest(cwd));
  writeJson(cwd, INTEGRATION_MANIFEST_FILE, generateIntegrationManifest(cwd));
  writeJson(cwd, SUPERVISOR_MANIFEST_FILE, generateSupervisorManifest());
  writeJson(cwd, DESIGN_REGISTRY_FILE, generateDesignRegistry(cwd));
  writeProductValidationArtifacts(context, setup);
  writeProductSpecArtifacts(context, setup);
  writeMfdrArtifacts(context, setup);
  writeAlignmentArtifacts(context, setup);

  const session = readJson<SessionState | null>(cwd, SESSION_FILE, null) ?? {
    currentPlanId: null,
    currentTask: 'No active task yet',
    lastDecision: null,
    openGaps: ['Run `pnpm sync` to generate starter manifests.'],
    modifiedFiles: [],
    updatedAt: nowIso(),
  };
  writeJson(cwd, SESSION_FILE, session);

  const progress = readJson<ProgressState | null>(cwd, PROGRESS_FILE, null) ?? {
    currentPlanId: null,
    openTasks: ['Bootstrap manifests', 'Create first plan', 'Run score'],
    closedTasks: [],
    filesInFlight: [],
    evidenceStatus: [],
    updatedAt: nowIso(),
  };
  writeJson(cwd, PROGRESS_FILE, progress);

  const companions = readJson<{ updatedAt: string; tasks: CompanionTask[] } | null>(
    cwd,
    COMPANION_MANIFEST_FILE,
    null,
  ) ?? {
    updatedAt: nowIso(),
    tasks: [],
  };
  writeJson(cwd, COMPANION_MANIFEST_FILE, companions);

  const telemetryFullPath = resolve(cwd, TELEMETRY_LOG_FILE);
  mkdirSync(dirname(telemetryFullPath), { recursive: true });
  if (!existsSync(telemetryFullPath)) {
    writeFileSync(telemetryFullPath, '', 'utf-8');
  }

  normalizeRuntimeState(cwd);
}

export function generateDocsRegistry(cwd: string): DocsRegistryEntry[] {
  const docFiles = collectFiles(cwd, '.', rel => {
    const ext = extname(rel).toLowerCase();
    if (!MARKDOWN_EXTENSIONS.has(ext)) return false;
    return rel.startsWith('docs/') ||
      rel.startsWith('guides/') ||
      rel.startsWith('reference/') ||
      rel.startsWith('hooks/') ||
      ['START_HERE.md', 'README.md', 'DESIGN.md', 'PRODUCT_PLAN_STATUS.md', 'DOCS_SYSTEM.md', 'REGISTRY-SYSTEM.md', 'VERIFICATION_MODEL.md', 'RUNTIME_DOGFOOD_TEST.md'].includes(rel);
  });

  const researchIndex = readJson<{ entries?: Array<{ id: string; docsUrl?: string; library?: string; lastFetched?: string | null }> }>(
    cwd,
    '.ai-starter/research/index.json',
    { entries: [] },
  );
  const urlsById = new Map((researchIndex.entries ?? []).map(entry => [entry.id, entry.docsUrl ?? null]));

  const generated = docFiles.map(relPath => ({
    id: slugify(relPath),
    title: basename(relPath, extname(relPath)),
    localPath: relPath,
    sourceUrl: urlsById.get(basename(relPath, extname(relPath))) ?? null,
    priority: inferDocsPriority(relPath),
    tags: relPath.split('/').filter(Boolean).slice(0, 3),
    triggerPaths: inferTriggerPaths(relPath),
    lastCheckedAt: safeStatMtime(resolve(cwd, relPath)),
  }));
  const officialCodexDocs: DocsRegistryEntry[] = [
    {
      id: 'openai-codex-hooks',
      title: 'OpenAI Codex hooks',
      localPath: 'docs/reference/openai-codex-runtime.md',
      sourceUrl: 'https://developers.openai.com/codex/hooks',
      priority: 'hot',
      tags: ['openai', 'codex', 'hooks'],
      triggerPaths: ['.codex/hooks.json', '.codex/config.toml', '.codex/hooks/'],
      lastCheckedAt: nowIso(),
    },
    {
      id: 'openai-codex-agents-md',
      title: 'OpenAI Codex AGENTS.md',
      localPath: 'docs/reference/openai-codex-runtime.md',
      sourceUrl: 'https://developers.openai.com/codex/guides/agents-md',
      priority: 'hot',
      tags: ['openai', 'codex', 'agents-md'],
      triggerPaths: ['AGENTS.md'],
      lastCheckedAt: nowIso(),
    },
    {
      id: 'openai-docs-mcp',
      title: 'OpenAI Docs MCP',
      localPath: 'docs/reference/openai-codex-runtime.md',
      sourceUrl: 'https://developers.openai.com/learn/docs-mcp',
      priority: 'hot',
      tags: ['openai', 'mcp', 'docs'],
      triggerPaths: ['.codex/config.toml', 'AGENTS.md'],
      lastCheckedAt: nowIso(),
    },
  ];
  const byId = new Map([...officialCodexDocs, ...generated].map(entry => [entry.id, entry]));
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function hookEntriesFromSettings(
  cwd: string,
  runtime: AgentRuntimeId,
  settingsPath: string,
): HookRegistryEntry[] {
  const settings = readJson<{ hooks?: Record<string, unknown[]> }>(cwd, settingsPath, { hooks: {} });
  const events = settings.hooks ?? {};
  const entries: HookRegistryEntry[] = [];
  for (const [event, configured] of Object.entries(events)) {
    if (!Array.isArray(configured)) continue;
    for (const raw of configured) {
      if (typeof raw === 'object' && raw && 'hooks' in raw) {
        const matcher = 'matcher' in raw ? String((raw as { matcher?: unknown }).matcher ?? '') : null;
        const hooks = ((raw as { hooks?: Array<{ command?: string }> }).hooks ?? []);
        for (const hook of hooks) {
          const command = hook.command ?? '';
          entries.push({
            id: `${runtime}:${event}:${matcher ?? 'none'}:${slugify(command)}`,
            runtime,
            event,
            matcher,
            command,
            classification: event === 'PreToolUse' || event === 'Stop' ? 'enforcer' : 'observer',
            blocks: event === 'PreToolUse' || event === 'Stop',
          });
        }
        continue;
      }
      if (typeof raw === 'object' && raw && 'command' in raw) {
        const command = String((raw as { command?: unknown }).command ?? '');
        entries.push({
          id: `${runtime}:${event}:${slugify(command)}`,
          runtime,
          event,
          matcher: null,
          command,
          classification: event === 'InstructionsLoaded' || event === 'SessionStart' ? 'observer' : 'enforcer',
          blocks: event === 'Stop',
        });
      }
    }
  }
  return entries;
}

export function generateHookRegistry(cwd: string): HookRegistryEntry[] {
  return [
    ...hookEntriesFromSettings(cwd, 'claude-code', '.claude/settings.json'),
    ...hookEntriesFromSettings(cwd, 'codex', '.codex/hooks.json'),
  ].sort((a, b) => a.id.localeCompare(b.id));
}

function telemetryRuntime(event: HookTelemetryEvent): AgentRuntimeId | null {
  if (event.runtime === 'codex' || event.runtime === 'claude-code') return event.runtime;
  const detailRuntime = event.details?.runtime;
  if (detailRuntime === 'codex' || detailRuntime === 'claude-code') return detailRuntime;
  if (event.hook?.includes('codex')) return 'codex';
  return event.hook ? 'claude-code' : null;
}

function readProofPass(cwd: string, relPath: string): boolean | null {
  const report = readJson<{ pass?: boolean } | null>(cwd, relPath, null);
  return typeof report?.pass === 'boolean' ? report.pass : null;
}

export function generateRuntimeManifest(cwd: string): RuntimeManifestEntry[] {
  const setup = createDefaultSetupConfig({ cwd });
  const hooks = generateHookRegistry(cwd);
  const telemetry = readJsonLines<HookTelemetryEvent>(cwd, TELEMETRY_LOG_FILE);
  const telemetryByRuntime = new Map<AgentRuntimeId, HookTelemetryEvent[]>();
  for (const event of telemetry) {
    const runtime = telemetryRuntime(event);
    if (!runtime) continue;
    telemetryByRuntime.set(runtime, [...(telemetryByRuntime.get(runtime) ?? []), event]);
  }

  type RuntimeManifestDefinition = Omit<
    RuntimeManifestEntry,
    'status' | 'primary' | 'trusted' | 'hookCount' | 'hooksObserved' | 'lastEventAt'
  >;

  const definitions: RuntimeManifestDefinition[] = [
    {
      id: 'codex',
      label: 'Codex',
      configPath: '.codex/config.toml',
      hooksPath: '.codex/hooks.json',
      proof: {
        command: 'pnpm test:codex-runtime',
        evidenceDir: '.evidence/codex-runtime',
        reportPath: '.evidence/codex-runtime/report.json',
        lastPass: readProofPass(cwd, '.evidence/codex-runtime/report.json'),
      },
      capabilities: [
        'AGENTS.md project instructions',
        'Project .codex/config.toml',
        'Project .codex/hooks.json',
        'codex exec --json runtime proof',
        'OpenAI Docs MCP',
      ],
      docs: [
        { title: 'Codex hooks', url: 'https://developers.openai.com/codex/hooks' },
        { title: 'Codex AGENTS.md', url: 'https://developers.openai.com/codex/guides/agents-md' },
        { title: 'OpenAI Docs MCP', url: 'https://developers.openai.com/learn/docs-mcp' },
      ],
      warnings: [],
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      configPath: '.claude/settings.json',
      hooksPath: '.claude/hooks',
      proof: {
        command: 'pnpm test:claude-runtime',
        evidenceDir: '.evidence/claude-runtime',
        reportPath: '.evidence/claude-runtime/report.json',
        lastPass: readProofPass(cwd, '.evidence/claude-runtime/report.json'),
      },
      capabilities: [
        'CLAUDE.md or AGENTS.md instructions',
        'Project .claude/settings.json hooks',
        'Claude hook event stream proof',
        'Claude skills',
      ],
      docs: [
        { title: 'Claude hook spec', url: 'hooks/HOOKS-SPEC.md' },
        { title: 'Runtime dogfood test', url: 'RUNTIME_DOGFOOD_TEST.md' },
      ],
      warnings: [],
    },
  ];

  const rows: RuntimeManifestEntry[] = definitions.map(row => {
    const enabled = setup.runtimes.enabled[row.id];
    const hookCount = hooks.filter(hook => hook.runtime === row.id).length;
    const observed = telemetryByRuntime.get(row.id) ?? [];
    const configExists = existsSync(resolve(cwd, row.configPath));
    const hooksExists = existsSync(resolve(cwd, row.hooksPath));
    const warnings = [...row.warnings];
    if (enabled && !configExists) warnings.push(`${row.configPath} is missing.`);
    if (enabled && !hooksExists) warnings.push(`${row.hooksPath} is missing.`);
    if (enabled && hookCount === 0) warnings.push('No hooks are registered for this runtime.');
    const status: RuntimeStatus = !enabled ? 'disabled' : configExists && hooksExists ? 'configured' : 'missing';
    return {
      ...row,
      status,
      primary: setup.runtimes.primary === row.id,
      trusted: configExists,
      hookCount,
      hooksObserved: observed.length,
      lastEventAt: observed.length > 0 ? observed[observed.length - 1]!.timestamp : null,
      warnings,
    };
  });

  return rows.sort((a, b) => Number(b.primary) - Number(a.primary) || a.id.localeCompare(b.id));
}

export function generateEvidenceRegistry(cwd: string): EvidenceRegistryEntry[] {
  const roots = ['.evidence', '.expect', '.ai-logs', STARTER_ROOT, 'playwright-report', 'test-results'];
  const entries: EvidenceRegistryEntry[] = [];
  for (const root of roots) {
    const files = collectFiles(cwd, root, rel => /\.(json|jsonl|log|txt|png|jpg|jpeg|gif|svg|webm|mp4|mov|zip|md|html)$/i.test(rel));
    for (const relPath of files) {
      entries.push({
        id: slugify(relPath),
        kind: inferEvidenceKind(relPath),
        path: relPath,
        source: relPath.startsWith(STARTER_ROOT) ? 'starter-system' : relPath.split('/')[0] ?? 'project',
        createdAt: safeStatMtime(resolve(cwd, relPath)),
      });
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export function generateFeatureManifest(cwd: string): SurfaceManifestEntry[] {
  const components = collectFiles(cwd, 'components', rel => /\.(tsx|jsx|ts|js)$/.test(rel) && !/\.stories\./.test(rel) && !/\.test\./.test(rel));
  const routes = collectFiles(cwd, 'app', rel => /\/(page|route)\.[tj]sx?$/.test(rel));
  const integrations = [
    ...collectFiles(cwd, 'lib/integrations', rel => /\.[tj]s$/.test(rel) && !/\.test\./.test(rel)),
    ...collectFiles(cwd, 'lib/providers', rel => /\.[tj]s$/.test(rel) && !/\.test\./.test(rel)),
    ...collectFiles(cwd, 'lib/services', rel => /\.[tj]s$/.test(rel) && !/\.test\./.test(rel)),
  ];
  const tools = extractToolNames(cwd);

  const entries: SurfaceManifestEntry[] = [];
  for (const relPath of components) {
    const name = basename(relPath).replace(/\.[^.]+$/, '');
    entries.push(buildSurfaceEntry(cwd, 'component', relPath, name));
  }
  for (const relPath of routes) {
    const name = relPath
      .replace(/^app\//, '')
      .replace(/\/(page|route)\.[^.]+$/, '')
      .replace(/\//g, '-')
      || 'root';
    entries.push(buildSurfaceEntry(cwd, featureKindForRoute(relPath), relPath, name));
  }
  for (const name of tools) {
    entries.push(buildSurfaceEntry(cwd, 'tool', `tool-meta:${name}`, name));
  }
  for (const relPath of integrations) {
    const name = basename(relPath).replace(/\.[^.]+$/, '');
    entries.push(buildSurfaceEntry(cwd, 'external-integration', relPath, name));
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export function syncStarterSystem(context: StarterContext): SyncResult {
  const cwd = context.cwd;
  ensureStarterFiles(context);

  const docs = generateDocsRegistry(cwd);
  const hooks = generateHookRegistry(cwd);
  const evidence = generateEvidenceRegistry(cwd);
  const features = generateFeatureManifest(cwd);
  const companions = generateCompanionManifest(cwd, features, evidence);
  const modules = generateModuleManifest(cwd);
  const adapters = generateAdapterManifest(cwd);
  const integrations = generateIntegrationManifest(cwd);
  const setupConfig = createDefaultSetupConfig(context);
  const setup = generateSetupManifest(cwd, setupConfig);
  const runtimes = generateRuntimeManifest(cwd);
  const supervisor = generateSupervisorManifest();
  const design = generateDesignRegistry(cwd);
  const browserProof = generateBrowserProofManifest(cwd, evidence);
  const productValidation = generateProductValidationArtifact(setupConfig);
  const productSpec = generateProductSpecArtifact(setupConfig);
  const mfdr = generateMfdrArtifact(cwd, setupConfig);
  const alignment = generateAlignmentArtifact(cwd, setupConfig);

  writeJson(cwd, DOCS_REGISTRY_FILE, docs);
  writeJson(cwd, SETUP_MANIFEST_FILE, setup);
  writeJson(cwd, HOOK_REGISTRY_FILE, hooks);
  writeJson(cwd, RUNTIME_MANIFEST_FILE, runtimes);
  writeJson(cwd, EVIDENCE_REGISTRY_FILE, evidence);
  writeJson(cwd, FEATURE_MANIFEST_FILE, features);
  writeJson(cwd, COMPANION_MANIFEST_FILE, {
    updatedAt: nowIso(),
    tasks: companions,
  });
  writeJson(cwd, MODULE_MANIFEST_FILE, modules);
  writeJson(cwd, ADAPTER_MANIFEST_FILE, adapters);
  writeJson(cwd, INTEGRATION_MANIFEST_FILE, integrations);
  writeJson(cwd, SUPERVISOR_MANIFEST_FILE, supervisor);
  writeJson(cwd, DESIGN_REGISTRY_FILE, design);
  writeJson(cwd, BROWSER_PROOF_MANIFEST_FILE, browserProof);
  writeJson(cwd, PRODUCT_VALIDATION_MANIFEST_FILE, productValidation);
  writeJson(cwd, PRODUCT_SPEC_MANIFEST_FILE, productSpec);
  writeJson(cwd, MFDR_MANIFEST_FILE, mfdr);
  writeJson(cwd, ALIGNMENT_MANIFEST_FILE, alignment);

  return {
    docs: docs.length,
    hooks: hooks.length,
    evidence: evidence.length,
    features: features.length,
    companions: companions.length,
  };
}

function classifyPlan(prompt: string): PlanClassification {
  const lower = prompt.toLowerCase();
  if (/\bfix|bug|broken|repair\b/.test(lower)) return 'bugfix';
  if (/\brefactor|cleanup|restructure\b/.test(lower)) return 'refactor';
  if (/\bmigrate|upgrade|convert\b/.test(lower)) return 'migration';
  if (/\bpolish|tweak|iterate|improve ui|visual\b/.test(lower)) return 'polish';
  if (/\bresearch|investigate|explore\b/.test(lower)) return 'research';
  return 'feature';
}

function defaultAcceptanceCriteria(kind: PlanClassification): string[] {
  switch (kind) {
    case 'bugfix':
      return [
        'The broken behavior is reproduced and described.',
        'A targeted verification proves the behavior now works.',
        'No required checks regress.',
      ];
    case 'refactor':
      return [
        'Behavior stays unchanged from the user perspective unless explicitly intended.',
        'Affected surfaces have updated tests or evidence.',
        'Generated manifests remain in sync.',
      ];
    case 'migration':
      return [
        'The old pattern is fully replaced in the affected scope.',
        'Typecheck and tests pass with the new API.',
        'Drift or deprecation checks report no blockers for the migrated surface.',
      ];
    case 'polish':
      return [
        'The target surface has before/after evidence.',
        'The updated surface improves the declared scorecard dimension.',
        'No regressions are introduced in required checks.',
      ];
    case 'research':
      return [
        'The question is answered with current local or vendor-backed evidence.',
        'Relevant docs are cached or referenced in the docs registry.',
        'A follow-up implementation path is explicit.',
      ];
    case 'feature':
    default:
      return [
        'The new behavior is described in a machine-readable plan.',
        'The affected surface has verification assets and updated manifests.',
        'Typecheck and required tests pass.',
      ];
  }
}

function defaultEvidence(kind: PlanClassification): string[] {
  switch (kind) {
    case 'polish':
      return ['screenshot', 'scorecard', 'playwright'];
    case 'research':
      return ['docs-registry', 'research-cache'];
    case 'bugfix':
      return ['typecheck', 'unit-test', 'smoke-test'];
    default:
      return ['typecheck', 'tests', 'manifests', 'report'];
  }
}

export function createPlan(context: StarterContext, prompt: string): PlanArtifact {
  const cwd = context.cwd;
  ensureStarterFiles(context);
  const classification = classifyPlan(prompt);
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(prompt).slice(0, 32)}`;
  const features = readJson<SurfaceManifestEntry[]>(cwd, FEATURE_MANIFEST_FILE, []);
  const affectedSurfaces = features.slice(0, 6).map(entry => entry.id);
  const plan: PlanArtifact = {
    id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    title: prompt.slice(0, 120),
    prompt,
    classification,
    acceptanceCriteria: defaultAcceptanceCriteria(classification),
    requiredEvidence: defaultEvidence(classification),
    verificationCommands: ['pnpm typecheck', 'pnpm test', 'pnpm score'],
    affectedSurfaces,
    status: 'active',
  };
  writeJson(cwd, LATEST_PLAN_FILE, plan);
  writeJson(cwd, `${PLANS_DIR}/${id}.json`, plan);

  const session = readJson<SessionState>(cwd, SESSION_FILE, {
    currentPlanId: null,
    currentTask: 'No active task yet',
    lastDecision: null,
    openGaps: [],
    modifiedFiles: [],
    updatedAt: nowIso(),
  });
  session.currentPlanId = plan.id;
  session.currentTask = plan.title;
  session.lastDecision = `Created ${classification} plan`;
  session.updatedAt = nowIso();
  writeJson(cwd, SESSION_FILE, session);

  const progress = readJson<ProgressState>(cwd, PROGRESS_FILE, {
    currentPlanId: null,
    openTasks: [],
    closedTasks: [],
    filesInFlight: [],
    evidenceStatus: [],
    updatedAt: nowIso(),
  });
  progress.currentPlanId = plan.id;
  progress.openTasks = plan.acceptanceCriteria.slice();
  progress.updatedAt = nowIso();
  writeJson(cwd, PROGRESS_FILE, progress);
  return plan;
}

export function generateScorecard(context: StarterContext): Scorecard {
  const cwd = context.cwd;
  ensureStarterFiles(context);
  const features = readJson<SurfaceManifestEntry[]>(cwd, FEATURE_MANIFEST_FILE, []);
  const evidence = readJson<EvidenceRegistryEntry[]>(cwd, EVIDENCE_REGISTRY_FILE, []);
  const hooks = readJson<HookRegistryEntry[]>(cwd, HOOK_REGISTRY_FILE, []);
  const telemetry = readJsonLines<HookTelemetryEvent>(cwd, TELEMETRY_LOG_FILE);
  const companions = readJson<{ tasks?: CompanionTask[] }>(cwd, COMPANION_MANIFEST_FILE, { tasks: [] }).tasks ?? [];
  const plan = readJson<PlanArtifact | null>(cwd, LATEST_PLAN_FILE, null);
  const setupConfig = createDefaultSetupConfig(context);
  const productValidation = readJson<ProductValidationArtifact | null>(cwd, PRODUCT_VALIDATION_MANIFEST_FILE, null)
    ?? generateProductValidationArtifact(setupConfig);
  const productSpec = readJson<ProductSpecArtifact | null>(cwd, PRODUCT_SPEC_MANIFEST_FILE, null)
    ?? generateProductSpecArtifact(setupConfig);
  const alignment = readJson<AlignmentArtifact | null>(cwd, ALIGNMENT_MANIFEST_FILE, null)
    ?? generateAlignmentArtifact(cwd, setupConfig);

  const components = features.filter(entry => entry.kind === 'component');
  const routes = features.filter(entry => entry.kind === 'route');
  const apis = features.filter(entry => entry.kind === 'api');
  const tools = features.filter(entry => entry.kind === 'tool');
  const browserProof = generateBrowserProofManifest(cwd, evidence);
  const pendingCompanions = companions.filter(task => task.status === 'pending');

  const blockers: string[] = [];
  if (!plan) blockers.push('No active plan artifact exists.');
  if (
    setupConfig.productValidation.mode === 'required' &&
    !['complete', 'bypassed'].includes(productValidation.status)
  ) {
    blockers.push('Product validation is required but incomplete. Run `pnpm product:validate` or bypass with an explicit reason.');
  }
  if (setupConfig.productValidation.mode === 'required' && productSpec.status === 'draft') {
    blockers.push('Product spec is required but still draft. Run `pnpm product:spec` or bypass validation with an explicit reason.');
  }
  if (components.length > 0 && !components.some(entry => entry.coverage.hasStory)) {
    blockers.push('No components currently have Storybook coverage.');
  }
  if (apis.length > 0 && !apis.some(entry => entry.coverage.hasUnit)) {
    blockers.push('No API routes currently have integration or contract coverage.');
  }
  if (tools.length > 0 && !tools.some(entry => entry.coverage.hasEval)) {
    blockers.push('No tools currently have eval coverage.');
  }
  if (!evidence.some(entry => entry.kind === 'image')) blockers.push('No screenshot evidence found.');
  if (routes.length > 0 && browserProof.flowPaths.length === 0) {
    blockers.push('No Expect browser flow coverage found for user-facing routes.');
  }
  if (routes.length > 0 && browserProof.replayPaths.length === 0) {
    blockers.push('No Expect replay evidence has been captured yet.');
  }
  if (routes.length > 0 && !browserProof.expectProofOk) {
    blockers.push('Expect replay evidence exists only if successful browser-control commands are recorded. Run `pnpm browser:proof` against a live dev server and inspect `.expect/replays/`.');
  }
  if (pendingCompanions.length > 0) {
    blockers.push(`Pending companion coverage for ${pendingCompanions.length} surface(s).`);
  }

  const componentScore = components.length === 0
    ? 1
    : (components.filter(entry => entry.coverage.hasUnit).length +
      components.filter(entry => entry.coverage.hasStory).length +
      components.filter(entry => entry.coverage.hasVisual).length) / (components.length * 3);
  const routeScore = routes.length === 0
    ? 1
    : routes.filter(entry => entry.coverage.hasVisual).length / routes.length;
  const apiScore = apis.length === 0
    ? 1
    : apis.filter(entry => entry.coverage.hasUnit).length / apis.length;
  const toolScore = tools.length === 0
    ? 1
    : (tools.filter(entry => entry.coverage.hasUnit).length + tools.filter(entry => entry.coverage.hasEval).length) / (tools.length * 2);
  const evidenceScore = Math.min(1, evidence.length / 10);
  const companionScore = companions.length === 0
    ? 1
    : companions.filter(task => task.status === 'satisfied').length / companions.length;
  const hookScore = hooks.length === 0 ? 0 : Math.min(1, telemetry.length / hooks.length);

  const score = Math.round(
    (
      (componentScore * 0.24) +
      (routeScore * 0.14) +
      (apiScore * 0.12) +
      (toolScore * 0.2) +
      (evidenceScore * 0.12) +
      (companionScore * 0.1) +
      (hookScore * 0.08)
    ) * 100,
  );

  const scorecard: Scorecard = {
    generatedAt: nowIso(),
    planId: plan?.id ?? null,
    score,
    blockers,
    recommendations: [
      !plan ? 'Create a plan with `pnpm plan -- "<task>"`.' : 'Refresh the active plan if scope changed.',
      !['complete', 'bypassed'].includes(productValidation.status)
        ? 'Run `pnpm product:validate` before large product/app work, or mark an explicit bypass reason.'
        : 'Product validation memo is present or explicitly bypassed.',
      productSpec.status === 'draft'
        ? 'Run `pnpm product:spec` to fill the YC-style product spec and update `.ai-dev-kit/spec.md` if starter-managed.'
        : 'Product spec is present or explicitly bypassed.',
      alignment.status === 'attention-needed'
        ? `Review ${LATEST_ALIGNMENT_MD_FILE}; first gap: ${alignment.openGaps[0] ?? 'none'}`
        : 'Alignment anchors are current.',
      components.some(entry => !entry.coverage.hasStory) ? 'Add Storybook stories for uncovered components.' : 'Story coverage looks healthy.',
      apis.some(entry => !entry.coverage.hasUnit) ? 'Add integration or contract coverage for uncovered API routes.' : 'API coverage looks healthy.',
      tools.some(entry => !entry.coverage.hasEval) ? 'Add eval or rubric coverage for uncovered tools.' : 'Tool eval coverage looks healthy.',
      !evidence.some(entry => entry.kind === 'trace' || entry.kind === 'video') ? 'Capture a trace or video run for UI work.' : 'Evidence includes traces/videos.',
      routes.length > 0 && !browserProof.expectProofOk
        ? `Expect proof is not yet verified (${browserProof.expectCommandCount} command(s), ${browserProof.expectBlockingFailedCommandCount} blocking failure(s)).`
        : 'Expect browser-control proof is verified or no user route exists.',
      telemetry.length === 0 ? 'Run a real agent runtime session to populate hook telemetry.' : 'Hook telemetry is being recorded.',
      pendingCompanions.length > 0 ? `Resolve pending companion tasks for ${pendingCompanions.slice(0, 3).map(task => task.path).join(', ')}${pendingCompanions.length > 3 ? ', ...' : ''}.` : 'Companion obligations are satisfied.',
    ].filter(Boolean),
    summary: {
      components: {
        total: components.length,
        withUnit: components.filter(entry => entry.coverage.hasUnit).length,
        withStory: components.filter(entry => entry.coverage.hasStory).length,
        withVisual: components.filter(entry => entry.coverage.hasVisual).length,
      },
      routes: {
        total: routes.length,
        withVisual: routes.filter(entry => entry.coverage.hasVisual).length,
      },
      apis: {
        total: apis.length,
        withUnit: apis.filter(entry => entry.coverage.hasUnit).length,
        withEval: apis.filter(entry => entry.coverage.hasEval).length,
      },
      tools: {
        total: tools.length,
        withUnit: tools.filter(entry => entry.coverage.hasUnit).length,
        withEval: tools.filter(entry => entry.coverage.hasEval).length,
      },
      browserProof: {
        expectFlows: browserProof.flowPaths.length,
        replays: browserProof.replayPaths.length,
        screenshots: browserProof.screenshotPaths.length,
        expectCommands: browserProof.expectCommandCount,
        expectFailures: browserProof.expectBlockingFailedCommandCount,
        expectProofOk: browserProof.expectProofOk,
      },
      evidence: {
        total: evidence.length,
        screenshots: evidence.filter(entry => entry.kind === 'image').length,
        videos: evidence.filter(entry => entry.kind === 'video').length,
        traces: evidence.filter(entry => entry.kind === 'trace').length,
        reports: evidence.filter(entry => entry.kind === 'report').length,
      },
      companions: {
        total: companions.length,
        pending: pendingCompanions.length,
        satisfied: companions.filter(task => task.status === 'satisfied').length,
      },
      hooks: {
        registered: hooks.length,
        observed: telemetry.length,
        blocked: telemetry.filter(event => event.outcome === 'blocked').length,
      },
    },
  };
  writeJson(cwd, SCORECARD_FILE, scorecard);
  writeJson(cwd, `${RUNS_DIR}/scorecard-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, scorecard);
  normalizeRuntimeState(cwd);
  return scorecard;
}

export function createIterationRun(context: StarterContext): IterationRun {
  const cwd = context.cwd;
  const scorecard = generateScorecard(context);
  const plan = readJson<PlanArtifact | null>(cwd, LATEST_PLAN_FILE, null);
  const previous = readJson<IterationRun | null>(cwd, LATEST_ITERATION_FILE, null);
  const plateauCount = previous && previous.scoreAtStart === scorecard.score ? previous.plateauCount + 1 : 0;
  const status: IterationRun['status'] = scorecard.blockers.length > 0 ? 'blocked' : plateauCount >= 2 ? 'plateau' : 'ready';
  const run: IterationRun = {
    id: `${new Date().toISOString().replace(/[:.]/g, '-')}-iterate`,
    createdAt: nowIso(),
    planId: plan?.id ?? null,
    scoreAtStart: scorecard.score,
    blockerCount: scorecard.blockers.length,
    plateauCount,
    status,
    recommendedActions: [
      ...scorecard.blockers.map(blocker => `Resolve blocker: ${blocker}`),
      ...scorecard.recommendations.slice(0, 3),
    ].slice(0, 5),
  };
  writeJson(cwd, LATEST_ITERATION_FILE, run);
  writeJson(cwd, `${RUNS_DIR}/${run.id}.json`, run);
  return run;
}

export function createReport(context: StarterContext): string {
  const cwd = context.cwd;
  const plan = readJson<PlanArtifact | null>(cwd, LATEST_PLAN_FILE, null);
  const progress = readJson<ProgressState>(cwd, PROGRESS_FILE, {
    currentPlanId: null,
    openTasks: [],
    closedTasks: [],
    filesInFlight: [],
    evidenceStatus: [],
    updatedAt: nowIso(),
  });
  const session = readJson<SessionState>(cwd, SESSION_FILE, {
    currentPlanId: null,
    currentTask: 'No active task yet',
    lastDecision: null,
    openGaps: [],
    modifiedFiles: [],
    updatedAt: nowIso(),
  });
  const scorecard = readJson<Scorecard | null>(cwd, SCORECARD_FILE, null);
  const productSpec = readJson<ProductSpecArtifact | null>(cwd, PRODUCT_SPEC_MANIFEST_FILE, null);
  const mfdr = readJson<MfdrArtifact | null>(cwd, MFDR_MANIFEST_FILE, null);
  const alignment = readJson<AlignmentArtifact | null>(cwd, ALIGNMENT_MANIFEST_FILE, null);
  const companions = readJson<{ tasks?: CompanionTask[] }>(cwd, COMPANION_MANIFEST_FILE, { tasks: [] }).tasks ?? [];
  const telemetry = readJsonLines<HookTelemetryEvent>(cwd, TELEMETRY_LOG_FILE);
  const pendingCompanions = companions.filter(task => task.status === 'pending');

  const lines = [
    '# Starter System Report',
    '',
    `Generated: ${nowIso()}`,
    '',
    '## Active Plan',
    '',
    plan
      ? `- ${plan.title} (${plan.classification})`
      : '- No plan has been created yet.',
    plan ? `- Plan ID: \`${plan.id}\`` : '',
    plan ? `- Evidence required: ${plan.requiredEvidence.join(', ')}` : '',
    '',
    '## Product Spec',
    '',
    productSpec
      ? `- ${productSpec.project.name} (${productSpec.status}, ${productSpec.source})`
      : '- No product spec has been generated yet.',
    productSpec ? `- Customer/problem: ${productSpec.customer} / ${productSpec.painfulProblem}` : '',
    productSpec ? `- Open questions: ${productSpec.openQuestions.length > 0 ? productSpec.openQuestions.join('; ') : 'none'}` : '',
    '',
    '## MFDR',
    '',
    mfdr
      ? `- ${mfdr.title} (${mfdr.status}, ${mfdr.decisions.length} decision(s))`
      : '- No MFDR has been generated yet.',
    mfdr ? `- Hypothesis: ${mfdr.hypothesis}` : '',
    mfdr ? `- Open questions: ${mfdr.openQuestions.length > 0 ? mfdr.openQuestions.join('; ') : 'none'}` : '',
    '',
    '## Alignment',
    '',
    alignment ? `- ${alignment.status}: ${alignment.summary}` : '- No alignment artifact has been generated yet.',
    alignment ? `- Required reads: ${alignment.requiredReads.join(', ')}` : '',
    alignment ? `- Open gaps: ${alignment.openGaps.length > 0 ? alignment.openGaps.join('; ') : 'none'}` : '',
    '',
    '## Session',
    '',
    `- Current task: ${session.currentTask}`,
    `- Last decision: ${session.lastDecision ?? 'none'}`,
    `- Open gaps: ${session.openGaps.length > 0 ? session.openGaps.join('; ') : 'none'}`,
    '',
    '## Progress',
    '',
    `- Open tasks: ${progress.openTasks.length > 0 ? progress.openTasks.join('; ') : 'none'}`,
    `- Closed tasks: ${progress.closedTasks.length > 0 ? progress.closedTasks.join('; ') : 'none'}`,
    '',
    '## Companion Coverage',
    '',
    `- Pending companion tasks: ${pendingCompanions.length}`,
    `- Pending surfaces: ${pendingCompanions.length > 0 ? pendingCompanions.slice(0, 5).map(task => `${task.path} [${task.missing.join(', ')}]`).join('; ') : 'none'}`,
    '',
    '## Hook Telemetry',
    '',
    `- Hook events recorded: ${telemetry.length}`,
    `- Blocked hook events: ${telemetry.filter(event => event.outcome === 'blocked').length}`,
    `- Last hook event: ${telemetry.length > 0 ? telemetry[telemetry.length - 1]!.timestamp : 'none'}`,
    '',
    '## Scorecard',
    '',
    scorecard ? `- Score: ${scorecard.score}/100` : '- No scorecard generated yet.',
    scorecard ? `- Blockers: ${scorecard.blockers.length > 0 ? scorecard.blockers.join('; ') : 'none'}` : '',
    scorecard ? `- Recommendations: ${scorecard.recommendations.slice(0, 3).join('; ')}` : '',
    '',
  ].filter(Boolean);

  const report = lines.join('\n');
  writeText(cwd, LATEST_REPORT_FILE, report + '\n');
  writeText(cwd, `${REPORTS_DIR}/report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`, report + '\n');
  return report;
}

export interface GenerateCompanionSkeletonsOptions {
  limit?: number;
  pendingOnly?: boolean;
  taskIds?: string[];
}

export function generateCompanionSkeletons(
  context: StarterContext,
  options: GenerateCompanionSkeletonsOptions = {},
): { created: string[]; skipped: string[]; considered: string[] } {
  const cwd = context.cwd;
  syncStarterSystem(context);
  const companions = readJson<{ tasks?: CompanionTask[] }>(cwd, COMPANION_MANIFEST_FILE, { tasks: [] }).tasks ?? [];
  const created: string[] = [];
  const skipped: string[] = [];
  const taskIdSet = new Set(options.taskIds ?? []);
  const candidates = companions
    .filter(task => !options.pendingOnly || task.status === 'pending')
    .filter(task => taskIdSet.size === 0 || taskIdSet.has(task.id))
    .slice(0, options.limit ?? companions.length);
  const considered = candidates.map(task => task.id);

  const write = (relPath: string, content: string) => {
    if (writeTextIfMissing(cwd, relPath, content.endsWith('\n') ? content : `${content}\n`)) {
      created.push(relPath);
    } else {
      skipped.push(relPath);
    }
  };

  for (const task of candidates) {
    const slug = slugify(task.path.replace(/\.[^.]+$/, ''));
    const name = slugify(task.path.split('/').pop() ?? task.id);
    if (task.kind === 'component') {
      const componentName = basename(task.path).replace(/\.[^.]+$/, '');
      write(
        `components/${componentName}.test.tsx`,
        `import { describe } from "vitest";

describe.todo("${componentName} component behavior");
`,
      );
      write(
        `components/${componentName}.stories.tsx`,
        `export default {
  title: "Components/${componentName}",
};

export const Default = {
  render: () => <div data-testid="${componentName}-story">Wire ${componentName} story state.</div>,
};
`,
      );
      write(
        `tests/e2e/${componentName}.visual.spec.ts`,
        `import { test } from "@playwright/test";

test.skip("${componentName} visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/${componentName}.png", fullPage: true });
});
`,
      );
    }

    if (task.kind === 'route') {
      write(
        `tests/e2e/${slug}.smoke.spec.ts`,
        `import { test, expect } from "@playwright/test";

test.skip("${task.path} route smoke proof", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
`,
      );
      write(
        `tests/expect/${slug}.md`,
        `# Expect flow: ${task.path}

Open the route represented by ${task.path}. Exercise the primary user-visible workflow, resize to mobile, check for console errors, and verify the page completes the feature described in the active plan.
`,
      );
      write(
        `docs/features/${slug}.md`,
        `# ${task.path}

## Purpose

Describe the user-facing behavior for this route.

## Verification

- Playwright smoke: tests/e2e/${slug}.smoke.spec.ts
- Expect flow: tests/expect/${slug}.md
`,
      );
    }

    if (task.kind === 'api' || task.kind === 'external-integration') {
      write(
        `tests/integration/${slug}.test.ts`,
        `import { describe } from "vitest";

describe.todo("${task.path} integration behavior");
`,
      );
      write(
        `tests/contracts/${slug}.contract.test.ts`,
        `import { describe } from "vitest";

describe.todo("${task.path} request and response contract");
`,
      );
      write(
        `tests/integration/${slug}.failure-modes.test.ts`,
        `import { describe } from "vitest";

describe.todo("${task.path} auth, timeout, rate-limit, malformed-response, and provider-outage handling");
`,
      );
      write(
        `docs/apis/${slug}.md`,
        `# ${task.path}

## Contract

Document inputs, outputs, auth, provider dependencies, and error behavior.

## Failure Modes

- bad input
- auth failure
- timeout
- quota or rate limit
- provider outage
- malformed response
`,
      );
    }

    if (task.kind === 'tool') {
      write(
        `tests/unit/${name}.test.ts`,
        `import { describe } from "vitest";

describe.todo("${task.path} tool behavior");
`,
      );
      write(
        `evals/${name}.json`,
        `{
  "id": "${name}",
  "description": "Tool eval scaffold for ${task.path}",
  "cases": []
}
`,
      );
      write(
        `.evidence/rubrics/${name}.json`,
        `{
  "id": "${name}",
  "score": null,
  "criteria": []
}
`,
      );
    }
  }

  syncStarterSystem(context);
  generateScorecard(context);
  return { created, skipped, considered };
}

export function tryRunProjectCommand(cwd: string, command: string): { ok: boolean; output: string } {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, output };
  } catch (error) {
    const typed = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${typed.stdout ?? ''}\n${typed.stderr ?? ''}`.trim() };
  }
}

export function formatSyncSummary(result: SyncResult): string {
  return `docs=${result.docs}, hooks=${result.hooks}, evidence=${result.evidence}, features=${result.features}, companions=${result.companions}`;
}

export function readStarterManifest(cwd: string): StarterManifest | null {
  return readJson<StarterManifest | null>(cwd, STARTER_MANIFEST_FILE, null);
}

export function readLatestScorecard(cwd: string): Scorecard | null {
  return readJson<Scorecard | null>(cwd, SCORECARD_FILE, null);
}

export function readLatestPlan(cwd: string): PlanArtifact | null {
  return readJson<PlanArtifact | null>(cwd, LATEST_PLAN_FILE, null);
}

export function listRecentReports(cwd: string): string[] {
  return collectFiles(cwd, REPORTS_DIR, rel => rel.endsWith('.md'));
}

export function syncAndScore(context: StarterContext): { sync: SyncResult; scorecard: Scorecard } {
  const sync = syncStarterSystem(context);
  const scorecard = generateScorecard(context);
  return { sync, scorecard };
}

export function summarizePlan(plan: PlanArtifact): string {
  return `${plan.classification.toUpperCase()}: ${plan.title}`;
}
