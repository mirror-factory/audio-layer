import { execFile } from "child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import {
  getErrors,
  getLogs,
  getStats,
  type AILogRecord,
  type ErrorRecord,
} from "@/lib/ai/telemetry";
import {
  getIntegrationUsage,
  getIntegrationUsageStats,
  type IntegrationUsageEvent,
} from "@/lib/integration-usage";

function readJson<T>(relPath: string, fallback: T): T {
  try {
    const full = join(process.cwd(), relPath);
    if (!existsSync(full)) return fallback;
    return JSON.parse(readFileSync(full, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function readText(relPath: string, fallback = ""): string {
  try {
    const full = join(process.cwd(), relPath);
    if (!existsSync(full)) return fallback;
    return readFileSync(full, "utf-8");
  } catch {
    return fallback;
  }
}

function appendJsonLine(relPath: string, value: unknown) {
  const full = join(process.cwd(), relPath);
  mkdirSync(dirname(full), { recursive: true });
  appendFileSync(full, `${JSON.stringify(value)}\n`, "utf-8");
}

function writeJson(relPath: string, value: unknown) {
  const full = join(process.cwd(), relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIso(input?: string | null) {
  if (!input) return null;
  const value = new Date(input);
  return Number.isNaN(value.valueOf()) ? null : value;
}

function countLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

interface FeatureCoverage {
  hasUnit?: boolean;
  hasStory?: boolean;
  hasVisual?: boolean;
  hasEval?: boolean;
}

interface FeatureManifestEntry {
  id: string;
  kind: "component" | "route" | "tool" | string;
  name: string;
  sourcePaths?: string[];
  tests?: string[];
  stories?: string[];
  visualSpecs?: string[];
  evals?: string[];
  docs?: string[];
  coverage?: FeatureCoverage;
}

interface CompanionTask {
  id: string;
  path: string;
  kind?: string;
  suggested?: string[];
  satisfied?: string[];
  missing?: string[];
  status?: "pending" | "satisfied" | string;
}

interface DocsManifestEntry {
  id: string;
  title: string;
  localPath: string;
  sourceUrl?: string | null;
  priority?: string;
  tags?: string[];
  triggerPaths?: string[];
  lastCheckedAt?: string | null;
}

interface EvidenceManifestEntry {
  id: string;
  kind: string;
  path: string;
  source: string;
  createdAt?: string | null;
}

interface HookManifestEntry {
  id: string;
  runtime?: "claude-code" | "codex";
  event: string;
  matcher: string | null;
  command: string;
  classification: "enforcer" | "observer" | string;
  blocks: boolean;
}

interface HookRuntimeEvent {
  id?: string;
  timestamp: string;
  phase?: string;
  event?: string;
  hook?: string;
  outcome?: "observed" | "allowed" | "blocked" | "error" | string;
  classification?: string;
  tool?: string;
  command?: string;
  paths?: string[];
  reason?: string | null;
  runtime?: "claude-code" | "codex";
  details?: Record<string, unknown>;
}

interface AgentRuntimeEntry {
  id: "claude-code" | "codex";
  label: string;
  status: "enabled" | "configured" | "missing" | "disabled" | string;
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

export interface StarterManifestSummary {
  version: string;
  policyProfile: string;
  enabledModules: string[];
  commands: string[];
}

export interface CoverageSummary {
  total: number;
  withUnit: number;
  withStory: number;
  withVisual: number;
  withEval: number;
}

export interface ActivityDay {
  date: string;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
  aiCalls: number;
  hookEvents: number;
  starterArtifacts: number;
  errors: number;
}

export interface HookEventGroup {
  event: string;
  registered: number;
  blocking: number;
  observed: number;
}

export interface ModuleEntry {
  id: string;
  label: string;
  status: "enabled" | "planned" | "missing" | string;
  core?: boolean;
  required?: boolean;
  dashboardPanels?: string[];
  verificationCommands?: string[];
}

export interface AdapterEntry {
  id: string;
  label: string;
  kind: string;
  status: "configured" | "available" | "missing" | "planned" | string;
  default?: boolean;
  envVars?: string[];
  notes?: string[];
}

export interface IntegrationEntry {
  id: string;
  label: string;
  kind: string;
  status: "configured" | "available" | "missing" | "planned" | string;
  default: boolean;
  envVars: string[];
  docsUrl: string | null;
  docsRegistryIds: string[];
  triggerPaths: string[];
  routes: string[];
  cost: {
    tracked: boolean;
    source: "ai-telemetry" | "provider-dashboard" | "manual-estimate" | "not-tracked" | string;
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

export interface RunRecordSummary {
  id: string;
  path: string;
  kind: "scorecard" | "iteration" | "telemetry" | "other";
  status: string;
  score: number | null;
  createdAt: string | null;
  stopReason: string | null;
}

export interface VisualDiffFileSummary {
  path: string;
  status: "added" | "removed" | "changed" | "unchanged" | string;
  beforeBytes: number | null;
  afterBytes: number | null;
  byteDelta: number | null;
  pixelDiffRatio: number | null;
  reason: string;
  dimensions: string | null;
}

export interface VisualDiffSummary {
  generatedAt: string | null;
  compared: number;
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  maxPixelDiffRatio: number | null;
  files: VisualDiffFileSummary[];
}

export interface SupervisorState {
  backend: "tmux" | "process" | string;
  status: "available" | "missing" | string;
  sessions: Array<{
    name: string;
    role: string;
    expected: boolean;
    observed: boolean;
    lastSeenAt: string | null;
  }>;
  updatedAt: string;
}

export interface BrowserProofState {
  required: boolean;
  playwrightRequired: boolean;
  expectRequired: boolean;
  browserUseAdapter: string;
  replayPaths: string[];
  flowPaths: string[];
  screenshotPaths: string[];
}

export interface DesignRegistryState {
  version: string;
  editableFromDashboard: boolean;
  contract?: {
    brandSummary?: string;
    visualStyle?: string;
    interactionStyle?: string;
    density?: string;
    motionLevel?: string;
    brandColors?: string[];
    referenceSystems?: string[];
    accessibility?: string;
    designInputSource?: string;
    driftPolicy?: string;
  };
  tokens: {
    colors: Record<string, string>;
    spacing: Record<string, string>;
    radii: Record<string, string>;
    motion: Record<string, string>;
  };
  assets: Array<{ id: string; label: string; path: string; usage: string }>;
}

export interface ControlPlaneAction {
  id: string;
  label: string;
  kind: "registry" | "test" | "api" | "tool" | "design" | "export";
  description: string;
  command: string;
  enabled: boolean;
  disabledReason: string | null;
  risk: "safe" | "moderate";
}

export interface ControlPlaneActionRun {
  id: string;
  actionId: string;
  label: string;
  status: "success" | "failed" | "denied" | "missing";
  command: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number | null;
  output: string;
  error: string | null;
}

export interface EvidenceExportState {
  id: string | null;
  createdAt: string | null;
  archivePath: string | null;
  downloadPath: string;
  bytes: number;
  included: string[];
  warnings: string[];
}

export interface SetupState {
  status: "configured" | "needs-env" | "needs-setup" | string;
  configPath: string;
  envExamplePath: string;
  localEnvPath: string;
  project?: {
    name?: string;
    slug?: string;
    description?: string;
    appType?: string;
    productType?: string;
  };
  ai?: {
    provider?: string;
    defaultModel?: string;
    testModel?: string;
    evalModel?: string;
  };
  design?: {
    brandSummary?: string;
    visualStyle?: string;
    interactionStyle?: string;
    density?: string;
    motionLevel?: string;
    brandColors?: string[];
    referenceSystems?: string[];
    accessibility?: string;
    designInputSource?: string;
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
  policyProfile: string;
  setupCommand: string;
  notes: string[];
}

export interface StarterControlPlaneData {
  generatedAt: string;
  manifest: StarterManifestSummary | null;
  counts: {
    docs: number;
    hooks: number;
    evidence: number;
    features: number;
    companions: number;
    telemetryEvents: number;
  };
  coverage: {
    components: CoverageSummary;
    routes: CoverageSummary;
    apis: CoverageSummary;
    tools: CoverageSummary;
  };
  latestPlan: {
    id: string | null;
    title: string;
    classification: string;
    acceptanceCriteria: string[];
    requiredEvidence: string[];
    verificationCommands: string[];
    status: string;
  };
  latestScorecard: {
    score: number | null;
    blockers: string[];
    recommendations: string[];
  };
  session: {
    currentTask: string;
    lastDecision: string | null;
    openGaps: string[];
    modifiedFiles: string[];
    updatedAt: string | null;
  };
  progress: {
    openTasks: string[];
    closedTasks: string[];
    filesInFlight: string[];
    evidenceStatus: string[];
    updatedAt: string | null;
  };
  hooks: {
    registered: number;
    enforcers: number;
    observers: number;
    blocking: number;
    observedEvents: number;
    lastEventAt: string | null;
    groups: HookEventGroup[];
    entries: HookManifestEntry[];
  };
  runtimes: AgentRuntimeEntry[];
  runtime: {
    stats: Awaited<ReturnType<typeof getStats>>;
    recentCalls: AILogRecord[];
    recentErrors: ErrorRecord[];
    sessions: Array<{
      sessionId: string;
      chatId: string;
      userId: string;
      calls: number;
      cost: number;
      totalTokens: number;
      errors: number;
      lastSeen: string;
      tools: string[];
    }>;
    costModel: {
      aiRuntimeUsd: number;
      repoSurfaceCount: number;
      providerCount: number;
    };
    integrationUsage: {
      recent: IntegrationUsageEvent[];
      stats: ReturnType<typeof getIntegrationUsageStats>;
    };
  };
  registries: {
    docs: DocsManifestEntry[];
    features: FeatureManifestEntry[];
    evidence: EvidenceManifestEntry[];
    integrations: IntegrationEntry[];
    runs: RunRecordSummary[];
  };
  costCoverage: {
    trackedIntegrations: number;
    untrackedConfiguredIntegrations: number;
    providerDashboardIntegrations: number;
    manualEstimateIntegrations: number;
    notes: string[];
  };
  latestIteration: {
    status: string;
    stopReason: string | null;
    scoreAtStart: number | null;
    scoreAtEnd: number | null;
    evidenceAtStart: number | null;
    evidenceAtEnd: number | null;
    commands: Array<{ command: string; ok: boolean; skipped: boolean }>;
    visualComparison: {
      compared: number;
      added: number;
      removed: number;
      changed: number;
      unchanged: number;
      maxPixelDiffRatio: number | null;
    } | null;
  } | null;
  latestVisualDiff: VisualDiffSummary | null;
  activity: ActivityDay[];
  companions: CompanionTask[];
  modules: ModuleEntry[];
  setup: SetupState;
  adapters: AdapterEntry[];
  supervisor: SupervisorState;
  browserProof: BrowserProofState;
  design: DesignRegistryState;
  actions: {
    available: ControlPlaneAction[];
    recentRuns: ControlPlaneActionRun[];
  };
  evidenceExport: EvidenceExportState;
  latestReportPreview: string;
}

function summarizeCoverage(
  entries: FeatureManifestEntry[],
  kind: "component" | "route" | "api" | "tool",
): CoverageSummary {
  const filtered = entries.filter((entry) => entry.kind === kind);
  return {
    total: filtered.length,
    withUnit: filtered.filter((entry) => entry.coverage?.hasUnit).length,
    withStory: filtered.filter((entry) => entry.coverage?.hasStory).length,
    withVisual: filtered.filter((entry) => entry.coverage?.hasVisual).length,
    withEval: filtered.filter((entry) => entry.coverage?.hasEval).length,
  };
}

function summarizeSessions(logs: AILogRecord[], errors: ErrorRecord[]) {
  const bySession = new Map<
    string,
    {
      sessionId: string;
      chatId: string;
      userId: string;
      calls: number;
      cost: number;
      totalTokens: number;
      errors: number;
      lastSeen: string;
      tools: Set<string>;
    }
  >();

  for (const log of logs) {
    const key = `${log.sessionId}:${log.chatId}`;
    const existing = bySession.get(key) ?? {
      sessionId: log.sessionId,
      chatId: log.chatId,
      userId: log.userId,
      calls: 0,
      cost: 0,
      totalTokens: 0,
      errors: 0,
      lastSeen: log.timestamp,
      tools: new Set<string>(),
    };

    existing.calls += 1;
    existing.cost += log.cost;
    existing.totalTokens += log.totalTokens;
    if (log.error) existing.errors += 1;
    if (log.timestamp > existing.lastSeen) existing.lastSeen = log.timestamp;
    for (const tool of log.toolCalls) existing.tools.add(tool);
    bySession.set(key, existing);
  }

  for (const error of errors) {
    const key = `default:${error.chatId}`;
    const existing = bySession.get(key);
    if (!existing) continue;
    existing.errors += 1;
  }

  return Array.from(bySession.values())
    .map((session) => ({
      sessionId: session.sessionId,
      chatId: session.chatId,
      userId: session.userId,
      calls: session.calls,
      cost: session.cost,
      totalTokens: session.totalTokens,
      errors: session.errors,
      lastSeen: session.lastSeen,
      tools: Array.from(session.tools).sort(),
    }))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, 8);
}

function parseTelemetryEvents(raw: string): HookRuntimeEvent[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as HookRuntimeEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is HookRuntimeEvent => event !== null);
}

function buildActivity(
  recentCalls: AILogRecord[],
  recentErrors: ErrorRecord[],
  hookEvents: HookRuntimeEvent[],
  evidence: Array<{ createdAt?: string | null }>,
  latestPlan: { createdAt?: string; updatedAt?: string } | null,
  latestScorecard: { generatedAt?: string } | null,
  session: { updatedAt?: string } | null,
  progress: { updatedAt?: string } | null,
) {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const map = new Map<
    string,
    { aiCalls: number; hookEvents: number; starterArtifacts: number; errors: number }
  >();

  const increment = (
    date: string | null | undefined,
    bucket: "aiCalls" | "hookEvents" | "starterArtifacts" | "errors",
  ) => {
    const parsed = parseIso(date ?? null);
    if (!parsed) return;
    const key = formatDay(parsed);
    const current = map.get(key) ?? {
      aiCalls: 0,
      hookEvents: 0,
      starterArtifacts: 0,
      errors: 0,
    };
    current[bucket] += 1;
    map.set(key, current);
  };

  for (const log of recentCalls) increment(log.timestamp, "aiCalls");
  for (const error of recentErrors) increment(error.timestamp, "errors");
  for (const event of hookEvents) increment(event.timestamp, "hookEvents");
  for (const item of evidence) increment(item.createdAt, "starterArtifacts");
  increment(latestPlan?.createdAt, "starterArtifacts");
  increment(latestPlan?.updatedAt, "starterArtifacts");
  increment(latestScorecard?.generatedAt, "starterArtifacts");
  increment(session?.updatedAt, "starterArtifacts");
  increment(progress?.updatedAt, "starterArtifacts");

  const days: ActivityDay[] = [];
  for (let offset = 55; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - offset);
    const key = formatDay(day);
    const value = map.get(key) ?? {
      aiCalls: 0,
      hookEvents: 0,
      starterArtifacts: 0,
      errors: 0,
    };
    const total =
      value.aiCalls + value.hookEvents + value.starterArtifacts + value.errors;
    days.push({
      date: key,
      total,
      level: countLevel(total),
      aiCalls: value.aiCalls,
      hookEvents: value.hookEvents,
      starterArtifacts: value.starterArtifacts,
      errors: value.errors,
    });
  }

  return days;
}

function listRunRecords(): RunRecordSummary[] {
  const runsDir = join(process.cwd(), ".ai-starter", "runs");
  if (!existsSync(runsDir)) return [];

  return readdirSync(runsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const relPath = `.ai-starter/runs/${file}`;
      const fullPath = join(process.cwd(), relPath);
      const payload = readJson<Record<string, unknown>>(relPath, {});
      const kind: RunRecordSummary["kind"] = file.includes("scorecard")
        ? "scorecard"
        : file.includes("iteration") || file.includes("iterate")
          ? "iteration"
          : file.includes("telemetry")
            ? "telemetry"
            : "other";
      const stat = (() => {
        try {
          return statSync(fullPath);
        } catch {
          return null;
        }
      })();

      return {
        id:
          typeof payload.id === "string"
            ? payload.id
            : file.replace(/\.json$/, ""),
        path: relPath,
        kind,
        status:
          typeof payload.status === "string"
            ? payload.status
            : kind === "scorecard"
              ? "generated"
              : "recorded",
        score:
          typeof payload.score === "number"
            ? payload.score
            : typeof payload.scoreAtEnd === "number"
              ? payload.scoreAtEnd
              : typeof payload.scoreAtStart === "number"
                ? payload.scoreAtStart
                : null,
        createdAt:
          typeof payload.createdAt === "string"
            ? payload.createdAt
            : typeof payload.generatedAt === "string"
              ? payload.generatedAt
              : stat?.mtime.toISOString() ?? null,
        stopReason:
          typeof payload.stopReason === "string" ? payload.stopReason : null,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 30);
}

function summarizeCostCoverage(
  integrations: IntegrationEntry[],
  usageStats: ReturnType<typeof getIntegrationUsageStats>,
) {
  const usageTrackedIds = new Set(
    Object.entries(usageStats.byIntegration)
      .filter(([, stats]) => stats.calls > 0)
      .map(([integrationId]) => integrationId),
  );
  const configured = integrations.filter((entry) => entry.status === "configured");
  const untrackedConfigured = configured.filter(
    (entry) => !entry.cost.tracked && !usageTrackedIds.has(entry.id),
  );
  return {
    trackedIntegrations: integrations.filter(
      (entry) => entry.cost.tracked || usageTrackedIds.has(entry.id),
    ).length,
    untrackedConfiguredIntegrations: untrackedConfigured.length,
    providerDashboardIntegrations: integrations.filter(
      (entry) => entry.cost.source === "provider-dashboard",
    ).length,
    manualEstimateIntegrations: integrations.filter(
      (entry) => entry.cost.source === "manual-estimate",
    ).length,
    notes: [
      "AI Gateway model spend is tracked from local AI runtime telemetry.",
      "Direct paid APIs need explicit usage events before local cost can be trusted.",
      ...untrackedConfigured.map(
        (entry) => `${entry.label} is configured but does not yet emit local cost events.`,
      ),
    ],
  };
}

function mergeObservedUsageIntegrations(
  integrations: IntegrationEntry[],
  usageStats: ReturnType<typeof getIntegrationUsageStats>,
): IntegrationEntry[] {
  const byId = new Map(integrations.map((entry) => [entry.id, entry]));
  const merged = integrations.map((entry) => {
    const stats = usageStats.byIntegration[entry.id];
    if (!stats || entry.cost.tracked) return entry;
    return {
      ...entry,
      cost: {
        ...entry.cost,
        tracked: true,
        notes: [
          ...entry.cost.notes,
          "Local usage events have been observed, so this integration now contributes to dashboard cost totals.",
        ],
      },
    };
  });

  for (const [integrationId, stats] of Object.entries(usageStats.byIntegration)) {
    if (byId.has(integrationId)) continue;
    merged.push({
      id: integrationId,
      label: integrationId
        .split("-")
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(" "),
      kind: "external-api",
      status: "configured",
      default: false,
      envVars: [],
      docsUrl: null,
      docsRegistryIds: [],
      triggerPaths: ["app/api/**/route.ts", "lib/integrations/**", "lib/services/**"],
      routes: [],
      cost: {
        tracked: true,
        source: "manual-estimate",
        unit: stats.unit,
        estimatedUnitCostUsd: stats.quantity > 0 ? stats.costUsd / stats.quantity : null,
        monthlyBudgetUsd: null,
        notes: ["Discovered from local usage events before a formal integration manifest entry existed."],
      },
      tests: {
        unit: false,
        contract: false,
        e2e: false,
        eval: false,
        recommended: [
          `Add a manifest-backed integration entry and contract tests for ${integrationId}.`,
          "Keep emitting recordApiUsage()/trackedFetch() events from the API route.",
        ],
      },
      failureModes: ["unregistered provider", "untracked edge cases", "missing docs link"],
      exampleCommands: [`pnpm usage:record -- --integration=${integrationId} --quantity=1 --unit=${stats.unit}`],
    });
  }

  return merged.sort((a, b) => a.id.localeCompare(b.id));
}

const CONTROL_PLANE_ACTION_LOG = ".ai-starter/runs/control-plane-actions.jsonl";

const ACTION_SPECS: Array<{
  id: string;
  label: string;
  kind: ControlPlaneAction["kind"];
  description: string;
  script: string;
  args?: string[];
  risk: ControlPlaneAction["risk"];
  timeoutMs: number;
}> = [
  {
    id: "sync",
    label: "Sync registries",
    kind: "registry",
    description: "Regenerate starter manifests for docs, features, hooks, integrations, design, and evidence.",
    script: "sync",
    risk: "safe",
    timeoutMs: 60_000,
  },
  {
    id: "setup-defaults",
    label: "Refresh setup",
    kind: "registry",
    description: "Regenerate the setup config, env example, design contract, and setup manifest from current defaults.",
    script: "starter:setup",
    args: ["--", "--yes"],
    risk: "safe",
    timeoutMs: 60_000,
  },
  {
    id: "score",
    label: "Score repo",
    kind: "registry",
    description: "Generate the latest scorecard from manifests and evidence.",
    script: "score",
    risk: "safe",
    timeoutMs: 60_000,
  },
  {
    id: "gates",
    label: "Run gates",
    kind: "test",
    description: "Run the required and recommended starter gates and write an evidence summary.",
    script: "gates",
    risk: "moderate",
    timeoutMs: 240_000,
  },
  {
    id: "design-check",
    label: "Check design drift",
    kind: "design",
    description: "Scan app/components for values that bypass DESIGN.md and token registries.",
    script: "design:check",
    risk: "safe",
    timeoutMs: 60_000,
  },
  {
    id: "api-contract",
    label: "Control-plane API contract",
    kind: "api",
    description: "Run the Playwright request contract for /api/control-plane.",
    script: "test:e2e",
    args: ["--", "tests/e2e/api-control-plane.contract.test.ts"],
    risk: "moderate",
    timeoutMs: 180_000,
  },
  {
    id: "browser-proof",
    label: "Browser proof",
    kind: "test",
    description: "Exercise discovered routes with Playwright and Expect, writing screenshots, video, replay, and browser-proof evidence.",
    script: "browser:proof",
    risk: "moderate",
    timeoutMs: 300_000,
  },
  {
    id: "tool-rubrics",
    label: "Run tool rubrics",
    kind: "tool",
    description: "Run offline tool-quality rubric checks and write rubric evidence for registered AI tools.",
    script: "rubrics:run",
    risk: "safe",
    timeoutMs: 90_000,
  },
  {
    id: "record-weather-cost",
    label: "Record weather API cost",
    kind: "api",
    description: "Write a non-LLM usage event that proves direct API spend appears in the dashboard.",
    script: "usage:record",
    args: [
      "--",
      "--integration=weather-api",
      "--label=Weather API",
      "--route=/api/weather",
      "--operation=dashboard-action",
      "--quantity=1",
      "--unit=request",
      "--cost=0.002",
      "--url=https://api.weather.example/v1/current",
    ],
    risk: "safe",
    timeoutMs: 30_000,
  },
  {
    id: "export-evidence",
    label: "Export evidence",
    kind: "export",
    description: "Create a sanitized evidence bundle for handoff, debugging, or sharing with another agent.",
    script: "evidence:export",
    risk: "safe",
    timeoutMs: 60_000,
  },
];

function readPackageScripts(): Record<string, string> {
  return readJson<{ scripts?: Record<string, string> }>("package.json", {}).scripts ?? {};
}

function dashboardActionsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" &&
    process.env.VERCEL !== "1" &&
    process.env.AI_STARTER_DISABLE_DASHBOARD_ACTIONS !== "1";
}

function commandForAction(spec: (typeof ACTION_SPECS)[number]) {
  return ["pnpm", "run", spec.script, ...(spec.args ?? [])].join(" ");
}

export function getControlPlaneActions(): ControlPlaneAction[] {
  const scripts = readPackageScripts();
  const allowed = dashboardActionsAllowed();
  return ACTION_SPECS.map((spec) => {
    const hasScript = Boolean(scripts[spec.script]);
    const disabledReason = !allowed
      ? "Dashboard actions are dev-only. They are disabled in production or when AI_STARTER_DISABLE_DASHBOARD_ACTIONS=1."
      : !hasScript
        ? `Missing package.json script: ${spec.script}`
        : null;
    return {
      id: spec.id,
      label: spec.label,
      kind: spec.kind,
      description: spec.description,
      command: commandForAction(spec),
      enabled: !disabledReason,
      disabledReason,
      risk: spec.risk,
    };
  });
}

function execPnpmAction(spec: (typeof ACTION_SPECS)[number], context?: { baseUrl?: string | null }) {
  return new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
    execFile(
      "pnpm",
      ["run", spec.script, ...(spec.args ?? [])],
      {
        cwd: process.cwd(),
        timeout: spec.timeoutMs,
        maxBuffer: 1_500_000,
        env: {
          ...process.env,
          AI_STARTER_DASHBOARD_ACTION: spec.id,
          ...(context?.baseUrl ? {
            AI_STARTER_BASE_URL: context.baseUrl,
            PLAYWRIGHT_BASE_URL: context.baseUrl,
          } : {}),
        },
      },
      (error, stdout, stderr) => {
        const exitCode = typeof error?.code === "number" ? error.code : error ? 1 : 0;
        resolve({ exitCode, stdout, stderr });
      },
    );
  });
}

function recentActionRuns(limit = 12): ControlPlaneActionRun[] {
  return readText(CONTROL_PLANE_ACTION_LOG, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as ControlPlaneActionRun;
      } catch {
        return null;
      }
    })
    .filter((run): run is ControlPlaneActionRun => run !== null)
    .reverse()
    .slice(0, limit);
}

function latestEvidenceExport(): EvidenceExportState {
  const summary = readJson<Partial<EvidenceExportState>>(".ai-starter/exports/latest.json", {});
  return {
    id: summary.id ?? null,
    createdAt: summary.createdAt ?? null,
    archivePath: summary.archivePath ?? null,
    downloadPath: summary.downloadPath ?? "/api/control-plane/evidence-export",
    bytes: typeof summary.bytes === "number" ? summary.bytes : 0,
    included: Array.isArray(summary.included) ? summary.included : [],
    warnings: Array.isArray(summary.warnings) ? summary.warnings : [],
  };
}

function truncateOutput(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 12_000) return normalized;
  return `${normalized.slice(0, 4_000)}\n\n... output truncated ...\n\n${normalized.slice(-8_000)}`;
}

export async function runControlPlaneAction(
  actionId: string,
  context: { baseUrl?: string | null } = {},
): Promise<ControlPlaneActionRun> {
  const spec = ACTION_SPECS.find((item) => item.id === actionId);
  const startedAt = new Date().toISOString();

  if (!spec) {
    const run: ControlPlaneActionRun = {
      id: `cpa-${Date.now()}`,
      actionId,
      label: actionId,
      status: "missing",
      command: "unknown",
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      exitCode: null,
      output: "",
      error: `Unknown control-plane action: ${actionId}`,
    };
    appendJsonLine(CONTROL_PLANE_ACTION_LOG, run);
    writeJson(".ai-starter/runs/latest-control-plane-action.json", run);
    return run;
  }

  const action = getControlPlaneActions().find((item) => item.id === actionId);
  if (!action?.enabled) {
    const run: ControlPlaneActionRun = {
      id: `cpa-${Date.now()}`,
      actionId,
      label: spec.label,
      status: "denied",
      command: commandForAction(spec),
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      exitCode: null,
      output: "",
      error: action?.disabledReason ?? "Action disabled.",
    };
    appendJsonLine(CONTROL_PLANE_ACTION_LOG, run);
    writeJson(".ai-starter/runs/latest-control-plane-action.json", run);
    return run;
  }

  const startMs = Date.now();
  const result = await execPnpmAction(spec, context);
  const finishedAt = new Date().toISOString();
  const run: ControlPlaneActionRun = {
    id: `cpa-${startMs}`,
    actionId,
    label: spec.label,
    status: result.exitCode === 0 ? "success" : "failed",
    command: commandForAction(spec),
    startedAt,
    finishedAt,
    durationMs: Date.now() - startMs,
    exitCode: result.exitCode,
    output: truncateOutput(`${result.stdout}\n${result.stderr}`),
    error: result.exitCode === 0 ? null : `Command exited ${result.exitCode}`,
  };
  appendJsonLine(CONTROL_PLANE_ACTION_LOG, run);
  writeJson(".ai-starter/runs/latest-control-plane-action.json", run);
  return run;
}

export async function loadStarterControlPlaneData(): Promise<StarterControlPlaneData> {
  const manifest = readJson<StarterManifestSummary | null>(
    ".ai-starter/manifests/starter.json",
    null,
  );
  const docs = readJson<DocsManifestEntry[]>(".ai-starter/manifests/docs.json", []);
  const hooks = readJson<HookManifestEntry[]>(
    ".ai-starter/manifests/hooks.json",
    [],
  );
  const runtimes = readJson<AgentRuntimeEntry[]>(
    ".ai-starter/manifests/runtimes.json",
    [],
  );
  const evidence = readJson<EvidenceManifestEntry[]>(
    ".ai-starter/manifests/evidence.json",
    [],
  );
  const features = readJson<FeatureManifestEntry[]>(
    ".ai-starter/manifests/features.json",
    [],
  );
  const companions = readJson<{ tasks?: CompanionTask[] }>(
    ".ai-starter/manifests/companions.json",
    { tasks: [] },
  );
  const modules = readJson<ModuleEntry[]>(".ai-starter/manifests/modules.json", []);
  const setup = readJson<SetupState>(".ai-starter/manifests/setup.json", {
    status: "needs-setup",
    configPath: ".ai-starter/config.json",
    envExamplePath: ".env.example",
    localEnvPath: ".env.local",
    project: {
      name: "Unknown project",
      slug: "unknown-project",
      description: "Run setup to define the project.",
      appType: "unknown",
      productType: "unknown",
    },
    ai: {
      provider: "vercel-ai-gateway",
      defaultModel: "anthropic/claude-sonnet-4.6",
      testModel: "google/gemini-3.1-flash-lite",
      evalModel: "google/gemini-3.1-flash-lite",
    },
    design: {
      brandSummary: "Run setup to define the design contract.",
      visualStyle: "project-specific",
      interactionStyle: "Run setup to define interaction rules.",
      density: "medium",
      motionLevel: "subtle",
      brandColors: [],
      referenceSystems: [],
      accessibility: "WCAG AA contrast, keyboard reachability, visible focus, and reduced-motion support.",
      designInputSource: "defaults",
    },
    requiredGroups: 0,
    satisfiedGroups: 0,
    missingGroups: [],
    configuredIntegrations: [],
    enabledModules: [],
    policyProfile: "strict",
    setupCommand: "pnpm exec ai-starter-kit setup",
    notes: ["Run setup to create the first-run configuration and env contract."],
  });
  const adapters = readJson<AdapterEntry[]>(".ai-starter/manifests/adapters.json", []);
  const integrations = readJson<IntegrationEntry[]>(".ai-starter/manifests/integrations.json", []);
  const supervisor = readJson<SupervisorState>(".ai-starter/manifests/supervisor.json", {
    backend: "process",
    status: "missing",
    sessions: [],
    updatedAt: new Date(0).toISOString(),
  });
  const browserProof = readJson<BrowserProofState>(".ai-starter/manifests/browser-proof.json", {
    required: true,
    playwrightRequired: true,
    expectRequired: true,
    browserUseAdapter: "planned",
    replayPaths: [],
    flowPaths: [],
    screenshotPaths: [],
  });
  const design = readJson<DesignRegistryState>(".ai-starter/manifests/design.json", {
    version: "missing",
    editableFromDashboard: false,
    tokens: { colors: {}, spacing: {}, radii: {}, motion: {} },
    assets: [],
  });
  const hookTelemetry = parseTelemetryEvents(
    readText(".ai-starter/runs/telemetry.jsonl", ""),
  );
  const latestPlan = readJson<{
    id?: string | null;
    title?: string;
    classification?: string;
    acceptanceCriteria?: string[];
    requiredEvidence?: string[];
    verificationCommands?: string[];
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null>(".ai-starter/plans/latest.json", null);
  const latestScorecard = readJson<{
    generatedAt?: string;
    score?: number | null;
    blockers?: string[];
    recommendations?: string[];
  } | null>(".ai-starter/runs/latest-scorecard.json", null);
  const latestIteration = readJson<{
    status?: string;
    stopReason?: string | null;
    scoreAtStart?: number | null;
    scoreAtEnd?: number | null;
    evidenceAtStart?: number | null;
    evidenceAtEnd?: number | null;
    commands?: Array<{ command?: string; ok?: boolean; skipped?: boolean }>;
    visualComparison?: {
      compared?: number;
      added?: number;
      removed?: number;
      changed?: number;
      unchanged?: number;
      maxPixelDiffRatio?: number | null;
    };
  } | null>(".ai-starter/runs/latest-iteration.json", null);
  const latestVisualDiff = readJson<{
    generatedAt?: string | null;
    compared?: number;
    added?: number;
    removed?: number;
    changed?: number;
    unchanged?: number;
    maxPixelDiffRatio?: number | null;
    files?: Array<{
      path?: string;
      status?: string;
      before?: { bytes?: number | null; width?: number | null; height?: number | null } | null;
      after?: { bytes?: number | null; width?: number | null; height?: number | null } | null;
      byteDelta?: number | null;
      pixelDiffRatio?: number | null;
      reason?: string;
    }>;
  } | null>(".ai-starter/runs/latest-visual-diff.json", null);
  const session = readJson<{
    currentTask?: string;
    lastDecision?: string | null;
    openGaps?: string[];
    modifiedFiles?: string[];
    updatedAt?: string;
  } | null>(".ai-starter/session.json", null);
  const progress = readJson<{
    openTasks?: string[];
    closedTasks?: string[];
    filesInFlight?: string[];
    evidenceStatus?: string[];
    updatedAt?: string;
  } | null>(".ai-starter/progress.json", null);
  const latestReportPreview = readText(".ai-starter/reports/latest.md", "");

  const [allCalls, allErrors, stats] = await Promise.all([
    getLogs({ limit: 100 }),
    getErrors({ limit: 50 }),
    getStats(),
  ]);
  const recentCalls = allCalls.slice(0, 12);
  const recentErrors = allErrors.slice(0, 8);
  const sessions = summarizeSessions(allCalls, allErrors);
  const runs = listRunRecords();
  const integrationUsageEvents = getIntegrationUsage(50);
  const integrationUsageStats = getIntegrationUsageStats(integrationUsageEvents);
  const visibleIntegrations = mergeObservedUsageIntegrations(integrations, integrationUsageStats);
  const costCoverage = summarizeCostCoverage(visibleIntegrations, integrationUsageStats);

  const groupedHooks = Array.from(
    hooks.reduce((map, hook) => {
      const current = map.get(hook.event) ?? {
        event: hook.event,
        registered: 0,
        blocking: 0,
        observed: 0,
      };
      current.registered += 1;
      if (hook.blocks) current.blocking += 1;
      map.set(hook.event, current);
      return map;
    }, new Map<string, HookEventGroup>()),
  ).map(([, group]) => group);

  for (const event of hookTelemetry) {
    const normalized = event.phase
      ? event.phase
      : event.event === "post_tool_use" || event.event === "post_tool_use_failure"
        ? "PostToolUse"
        : event.event === "pre_tool_use"
          ? "PreToolUse"
          : event.event === "instructions_loaded"
            ? "InstructionsLoaded"
            : event.event;
    const existing = groupedHooks.find((group) => group.event === normalized);
    if (existing) {
      existing.observed += 1;
    }
  }

  const activity = buildActivity(
    allCalls,
    allErrors,
    hookTelemetry,
    evidence,
    latestPlan,
    latestScorecard,
    session,
    progress,
  );

  return {
    generatedAt: new Date().toISOString(),
    manifest,
    counts: {
      docs: docs.length,
      hooks: hooks.length,
      evidence: evidence.length,
      features: features.length,
      companions: (companions.tasks ?? []).length,
      telemetryEvents: hookTelemetry.length,
    },
    coverage: {
      components: summarizeCoverage(features, "component"),
      routes: summarizeCoverage(features, "route"),
      apis: summarizeCoverage(features, "api"),
      tools: summarizeCoverage(features, "tool"),
    },
    latestPlan: {
      id: latestPlan?.id ?? null,
      title: latestPlan?.title ?? "No active plan",
      classification: latestPlan?.classification ?? "none",
      acceptanceCriteria: latestPlan?.acceptanceCriteria ?? [],
      requiredEvidence: latestPlan?.requiredEvidence ?? [],
      verificationCommands: latestPlan?.verificationCommands ?? [],
      status: latestPlan?.status ?? "missing",
    },
    latestScorecard: {
      score: latestScorecard?.score ?? null,
      blockers: latestScorecard?.blockers ?? [],
      recommendations: latestScorecard?.recommendations ?? [],
    },
    session: {
      currentTask: session?.currentTask ?? "No active task yet",
      lastDecision: session?.lastDecision ?? null,
      openGaps: session?.openGaps ?? [],
      modifiedFiles: session?.modifiedFiles ?? [],
      updatedAt: session?.updatedAt ?? null,
    },
    progress: {
      openTasks: progress?.openTasks ?? [],
      closedTasks: progress?.closedTasks ?? [],
      filesInFlight: progress?.filesInFlight ?? [],
      evidenceStatus: progress?.evidenceStatus ?? [],
      updatedAt: progress?.updatedAt ?? null,
    },
    hooks: {
      registered: hooks.length,
      enforcers: hooks.filter((hook) => hook.classification === "enforcer").length,
      observers: hooks.filter((hook) => hook.classification !== "enforcer").length,
      blocking: hooks.filter((hook) => hook.blocks).length,
      observedEvents: hookTelemetry.length,
      lastEventAt:
        hookTelemetry.length > 0
          ? hookTelemetry[hookTelemetry.length - 1]?.timestamp ?? null
          : null,
      groups: groupedHooks.sort((a, b) => a.event.localeCompare(b.event)),
      entries: hooks,
    },
    runtimes,
    runtime: {
      stats,
      recentCalls,
      recentErrors,
      sessions,
      costModel: {
        aiRuntimeUsd: stats.totalCost,
        repoSurfaceCount: features.length,
        providerCount: Object.keys(stats.modelBreakdown).length,
      },
      integrationUsage: {
        recent: integrationUsageEvents,
        stats: integrationUsageStats,
      },
    },
    registries: {
      docs: docs.slice(0, 24),
      features: features.slice(0, 40),
      evidence: evidence
        .slice()
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 40),
      integrations: visibleIntegrations,
      runs,
    },
    costCoverage,
    latestIteration: latestIteration
      ? {
          status: latestIteration.status ?? "unknown",
          stopReason: latestIteration.stopReason ?? null,
          scoreAtStart: latestIteration.scoreAtStart ?? null,
          scoreAtEnd: latestIteration.scoreAtEnd ?? null,
          evidenceAtStart: latestIteration.evidenceAtStart ?? null,
          evidenceAtEnd: latestIteration.evidenceAtEnd ?? null,
          commands: (latestIteration.commands ?? []).map((command) => ({
            command: command.command ?? "unknown",
            ok: Boolean(command.ok),
            skipped: Boolean(command.skipped),
          })),
          visualComparison: latestIteration.visualComparison
            ? {
                compared: latestIteration.visualComparison.compared ?? 0,
                added: latestIteration.visualComparison.added ?? 0,
                removed: latestIteration.visualComparison.removed ?? 0,
                changed: latestIteration.visualComparison.changed ?? 0,
                unchanged: latestIteration.visualComparison.unchanged ?? 0,
                maxPixelDiffRatio:
                  latestIteration.visualComparison.maxPixelDiffRatio ?? null,
              }
            : null,
        }
      : null,
    latestVisualDiff: latestVisualDiff
      ? {
          generatedAt: latestVisualDiff.generatedAt ?? null,
          compared: latestVisualDiff.compared ?? 0,
          added: latestVisualDiff.added ?? 0,
          removed: latestVisualDiff.removed ?? 0,
          changed: latestVisualDiff.changed ?? 0,
          unchanged: latestVisualDiff.unchanged ?? 0,
          maxPixelDiffRatio: latestVisualDiff.maxPixelDiffRatio ?? null,
          files: (latestVisualDiff.files ?? []).slice(0, 24).map((file) => {
            const width = file.after?.width ?? file.before?.width ?? null;
            const height = file.after?.height ?? file.before?.height ?? null;

            return {
              path: file.path ?? "unknown",
              status: file.status ?? "unknown",
              beforeBytes: file.before?.bytes ?? null,
              afterBytes: file.after?.bytes ?? null,
              byteDelta: file.byteDelta ?? null,
              pixelDiffRatio: file.pixelDiffRatio ?? null,
              reason: file.reason ?? "unknown",
              dimensions:
                width !== null && height !== null ? `${width}x${height}` : null,
            };
          }),
        }
      : null,
    activity,
    companions: companions.tasks ?? [],
    modules,
    setup,
    adapters,
    supervisor,
    browserProof,
    design,
    actions: {
      available: getControlPlaneActions(),
      recentRuns: recentActionRuns(),
    },
    evidenceExport: latestEvidenceExport(),
    latestReportPreview,
  };
}
