"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AIDebugPanel } from "@/components/ai-debug-panel";
import type {
  ControlPlaneActionRun,
  CoverageSummary,
  StarterControlPlaneData,
} from "@/lib/starter-control-plane";

type ControlPlaneTab =
  | "overview"
  | "actions"
  | "runtimes"
  | "system"
  | "costs"
  | "proof"
  | "registries"
  | "handoff";

function formatMoney(value: number) {
  if (value <= 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "n/a";
  return `${(value * 100).toFixed(value < 0.01 && value > 0 ? 2 : 1)}%`;
}

function formatBytes(value: number | null) {
  if (value === null) return "--";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}MB`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}KB`;
  return `${value}B`;
}

function formatAgo(input: string | null) {
  if (!input) return "not yet";
  const delta = Date.now() - new Date(input).valueOf();
  if (Number.isNaN(delta)) return "unknown";
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function PixelMark() {
  return (
    <div
      aria-hidden="true"
      className="grid h-12 w-12 grid-cols-4 grid-rows-4 border-2 border-neutral-100 bg-neutral-950 p-1 shadow-[4px_4px_0_0_rgba(245,245,245,0.28)]"
    >
      {Array.from({ length: 16 }, (_, index) => {
        const active = [0, 1, 4, 6, 9, 11, 14, 15].includes(index);
        return (
          <span
            key={index}
            className={active ? "bg-neutral-100" : "bg-neutral-800"}
          />
        );
      })}
    </div>
  );
}

function PixelSignal() {
  return (
    <div
      aria-hidden="true"
      className="mt-6 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(32,minmax(0,1fr))]"
    >
      {Array.from({ length: 32 }, (_, index) => (
        <span
          key={index}
          className={`h-3 border border-neutral-800 ${
            index % 5 === 0 || index % 11 === 0
              ? "animate-pulse bg-neutral-100"
              : "bg-neutral-900"
          }`}
          style={{ animationDelay: `${index * 55}ms` }}
        />
      ))}
    </div>
  );
}

function PixelStyles() {
  return (
    <style jsx global>{`
      .starter-pixel {
        font-variant-numeric: tabular-nums;
      }

      .starter-pixel [class*="rounded"] {
        border-radius: 0 !important;
      }

      .starter-pixel [class*="text-cyan"],
      .starter-pixel [class*="text-emerald"],
      .starter-pixel [class*="text-fuchsia"],
      .starter-pixel [class*="text-amber"],
      .starter-pixel [class*="text-orange"],
      .starter-pixel [class*="text-rose"],
      .starter-pixel [class*="text-red"] {
        color: rgb(245 245 245 / 0.92) !important;
      }

      .starter-pixel [class*="bg-cyan"],
      .starter-pixel [class*="bg-emerald"],
      .starter-pixel [class*="bg-fuchsia"],
      .starter-pixel [class*="bg-amber"],
      .starter-pixel [class*="bg-orange"],
      .starter-pixel [class*="bg-rose"],
      .starter-pixel [class*="bg-red"],
      .starter-pixel [class*="bg-[#0d1721"],
      .starter-pixel [class*="bg-[#09121c"],
      .starter-pixel [class*="bg-[#06111a"] {
        background-color: rgb(10 10 10 / 0.92) !important;
      }

      .starter-pixel [class*="border-cyan"],
      .starter-pixel [class*="border-emerald"],
      .starter-pixel [class*="border-fuchsia"],
      .starter-pixel [class*="border-amber"],
      .starter-pixel [class*="border-orange"],
      .starter-pixel [class*="border-rose"],
      .starter-pixel [class*="border-red"],
      .starter-pixel [class*="border-white"] {
        border-color: rgb(245 245 245 / 0.24) !important;
      }

      .starter-pixel code,
      .starter-pixel pre,
      .starter-pixel table,
      .starter-pixel th {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", "Courier New", monospace;
      }

      @media (prefers-reduced-motion: reduce) {
        .starter-pixel *,
        .starter-pixel *::before,
        .starter-pixel *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 border-2 border-neutral-100 bg-neutral-950 p-5 shadow-[8px_8px_0_0_rgba(245,245,245,0.16)]">
      <div className="max-w-3xl">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-neutral-50">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 max-w-[72ch] text-sm leading-6 text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="mt-6 min-w-0">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  const accentClass = accent.includes("neutral") ? accent : "text-neutral-50";

  return (
    <div className="border-2 border-neutral-800 bg-neutral-950 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-100 hover:shadow-[5px_5px_0_0_rgba(245,245,245,0.18)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>
      <p className={`mt-3 font-mono text-3xl font-semibold ${accentClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{hint}</p>
    </div>
  );
}

function CoverageCard({
  title,
  summary,
}: {
  title: string;
  summary: CoverageSummary;
}) {
  const safeTotal = Math.max(summary.total, 1);
  return (
    <div className="border-2 border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-neutral-50">
          {title}
        </p>
        <span className="w-fit border border-neutral-100 bg-neutral-100 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-950">
          {summary.total} surfaces
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {[
          ["Unit", summary.withUnit],
          ["Story", summary.withStory],
          ["Visual", summary.withVisual],
          ["Eval", summary.withEval],
        ].map(([label, value]) => (
          <div key={label as string}>
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-neutral-500">
              <span>{label as string}</span>
              <span>
                {value as number}/{summary.total}
              </span>
            </div>
            <div className="mt-2 h-3 border border-neutral-800 bg-neutral-900">
              <div
                className="h-full bg-neutral-100"
                style={{
                  width:
                    (value as number) === 0
                      ? "0%"
                      : `${Math.max(
                          8,
                          ((value as number) / safeTotal) * 100,
                        )}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes =
    status === "enabled" || status === "configured" || status === "available"
      ? "border-neutral-100 bg-neutral-100 text-neutral-950"
      : status === "planned"
        ? "border-neutral-500 bg-neutral-900 text-neutral-200"
        : "border-neutral-700 bg-neutral-950 text-neutral-500";

  return (
    <span
      className={`border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${classes}`}
    >
      {status}
    </span>
  );
}

function diffTone(pixelDiffRatio: number | null) {
  if (pixelDiffRatio === null) return "bg-neutral-700";
  if (pixelDiffRatio <= 0.0001) return "bg-neutral-500";
  if (pixelDiffRatio <= 0.001) return "bg-neutral-200";
  return "bg-neutral-50";
}

function VisualDiffDrilldown({
  diff,
}: {
  diff: StarterControlPlaneData["latestVisualDiff"];
}) {
  if (!diff) {
    return (
      <div className="border-2 border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-500">
        Run <code>pnpm iterate</code> after browser proof exists to populate screenshot comparison.
      </div>
    );
  }

  const changedFiles = diff.files.filter((file) => file.status !== "unchanged");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric
          label="Compared"
          value={String(diff.compared)}
          hint="Screenshots matched before and after the iterate run."
          accent="text-neutral-50"
        />
        <Metric
          label="Changed"
          value={String(diff.changed)}
          hint="Files with byte or pixel-hash movement."
          accent="text-neutral-50"
        />
        <Metric
          label="Added/Removed"
          value={`${diff.added}/${diff.removed}`}
          hint="Evidence created or missing across the proof loop."
          accent="text-neutral-50"
        />
        <Metric
          label="Max Delta"
          value={formatPercent(diff.maxPixelDiffRatio)}
          hint="Largest decoded pixel movement among comparable PNGs."
          accent="text-neutral-50"
        />
      </div>
      <div className="border-2 border-neutral-800 bg-neutral-950 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-neutral-50">
              Screenshot diff ledger
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Generated {formatAgo(diff.generatedAt)}
            </p>
          </div>
          <span className="border border-neutral-700 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
            {changedFiles.length} actionable
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {(changedFiles.length > 0 ? changedFiles : diff.files)
            .slice(0, 12)
            .map((file) => (
              <div
                key={`${file.path}-${file.status}`}
                className="grid gap-3 border border-neutral-800 bg-neutral-900/70 p-3 text-sm md:grid-cols-[1fr_0.36fr_0.32fr_0.32fr]"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-neutral-50">
                    {file.path}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                    {file.status} · {file.reason}
                    {file.dimensions ? ` · ${file.dimensions}` : ""}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                    pixel delta
                  </p>
                  <div className="mt-2 h-3 border border-neutral-700 bg-neutral-950">
                    <div
                      className={`h-full ${diffTone(file.pixelDiffRatio)}`}
                      style={{
                        width:
                          file.pixelDiffRatio === null
                            ? "8%"
                            : `${Math.max(
                                6,
                                Math.min(file.pixelDiffRatio * 120_000, 100),
                              )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-xs text-neutral-300">
                    {formatPercent(file.pixelDiffRatio)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                    bytes
                  </p>
                  <p className="mt-2 font-mono text-xs text-neutral-300">
                    {formatBytes(file.beforeBytes)} → {formatBytes(file.afterBytes)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                    delta
                  </p>
                  <p className="mt-2 font-mono text-xs text-neutral-300">
                    {file.byteDelta === null
                      ? "--"
                      : `${file.byteDelta >= 0 ? "+" : ""}${formatBytes(
                          file.byteDelta,
                        )}`}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function ControlPlanePage() {
  const [data, setData] = useState<StarterControlPlaneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ControlPlaneActionRun | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ControlPlaneTab>("overview");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/control-plane", { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load: ${response.status}`);
      const payload = (await response.json()) as { data: StarterControlPlaneData };
      setData(payload.data);
      setError(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load control-plane data.",
      );
    }
  }, []);

  const runAction = useCallback(
    async (actionId: string) => {
      setRunningAction(actionId);
      setActionResult(null);
      try {
        const response = await fetch("/api/control-plane", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ actionId }),
        });
        const payload = (await response.json()) as {
          data?: StarterControlPlaneData;
          result?: ControlPlaneActionRun;
          error?: string;
        };
        if (payload.data) setData(payload.data);
        if (payload.result) setActionResult(payload.result);
        if (!response.ok && !payload.result) {
          throw new Error(payload.error ?? `Action failed: ${response.status}`);
        }
        setError(null);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Control-plane action failed.",
        );
      } finally {
        setRunningAction(null);
        void refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (!data) {
    return (
      <main className="starter-pixel min-h-dvh bg-neutral-950 bg-[linear-gradient(rgba(245,245,245,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(245,245,245,0.045)_1px,transparent_1px)] bg-[size:24px_24px] px-6 py-8 text-neutral-100">
        <PixelStyles />
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="border-2 border-neutral-100 bg-neutral-950 p-6 shadow-[8px_8px_0_0_rgba(245,245,245,0.18)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-neutral-400">
              Local Control Plane
            </p>
            <h1 className="mt-3 font-mono text-4xl font-semibold tracking-tight text-neutral-50">
              Loading starter and runtime state...
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
              Pulling live state from <code>/api/control-plane</code>.
            </p>
            {error ? (
              <p className="mt-4 text-sm text-neutral-200">{error}</p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const recentModelIds = Object.keys(data.runtime.stats.modelBreakdown);
  const pendingCompanions = data.companions.filter(
    (task) => task.status === "pending",
  );
  const activityWeeks = Array.from(
    { length: Math.ceil(data.activity.length / 7) },
    (_, index) => data.activity.slice(index * 7, index * 7 + 7),
  );
  const qualityStages = [
    {
      index: "01",
      label: "Install",
      status: data.manifest ? "ready" : "blocked",
      statusLabel: data.manifest ? "Installed" : "Missing",
      check: "Starter files, hooks, package scripts, manifests, and dashboard routes exist.",
      evidence: `${data.counts.docs} docs · ${data.hooks.registered} hooks`,
      command: "pnpm run starter:doctor",
    },
    {
      index: "02",
      label: "Product Spec",
      status: ["complete", "bypassed"].includes(data.productSpec.status)
        ? "ready"
        : "warn",
      statusLabel: data.productSpec.status,
      check: "The narrow customer, painful problem, current workaround, wedge, MVP, pricing, distribution, and research basis are explicit.",
      evidence: `${data.productSpec.customer} · ${data.productSpec.painfulProblem}`,
      command: "pnpm product:spec",
    },
    {
      index: "03",
      label: "Validation",
      status: ["complete", "bypassed"].includes(data.productValidation.status)
        ? "ready"
        : data.productValidation.mode === "required"
          ? "blocked"
          : "warn",
      statusLabel: data.productValidation.status,
      check: "Customer, problem, workaround, MVP, pricing, GTM, and technical feasibility are justified before broad product work.",
      evidence: data.productValidation.bestCustomer,
      command: "pnpm product:validate",
    },
    {
      index: "04",
      label: "Plan",
      status: data.latestPlan.id ? "ready" : "warn",
      statusLabel: data.latestPlan.id ? data.latestPlan.status : "Needed",
      check: "The request is converted into acceptance criteria, affected surfaces, and required evidence.",
      evidence: data.latestPlan.title,
      command: 'pnpm plan -- "..."',
    },
    {
      index: "05",
      label: "Research",
      status: data.registries.docs.length > 0 ? "ready" : "warn",
      statusLabel: `${data.registries.docs.length} docs`,
      check: "Fast-moving dependencies and provider APIs are backed by local research entries.",
      evidence: "Docs registry + .claude/research",
      command: "pnpm research:refresh --all",
    },
    {
      index: "06",
      label: "Build",
      status: pendingCompanions.length === 0 ? "ready" : "warn",
      statusLabel: pendingCompanions.length === 0 ? "Covered" : `${pendingCompanions.length} gaps`,
      check: "New pages, components, APIs, and tools are mapped to companion tests, docs, stories, specs, or evals.",
      evidence: `${data.coverage.components.total} components · ${data.coverage.routes.total} routes · ${data.coverage.apis.total} APIs`,
      command: "pnpm companions",
    },
    {
      index: "07",
      label: "Visual Proof",
      status: data.browserProof.expectProofOk ? "ready" : "warn",
      statusLabel: data.browserProof.expectProofOk ? "Expect ok" : "Needs Expect",
      check: "User-visible routes are opened in a browser and captured with Playwright/Expect evidence.",
      evidence: `${data.browserProof.flowPaths.length} flows · ${data.browserProof.replayPaths.length} replays · ${data.browserProof.expectCommandCount ?? 0} commands`,
      command: "Dashboard: Browser proof",
    },
    {
      index: "08",
      label: "Gates",
      status: data.latestScorecard.blockers.length === 0 ? "ready" : "blocked",
      statusLabel: data.latestScorecard.blockers.length === 0 ? "Clear" : `${data.latestScorecard.blockers.length} blockers`,
      check: "Typecheck, tests, Storybook, drift, hooks, research, and required evidence are checked before handoff.",
      evidence: `Score ${data.latestScorecard.score ?? "--"}/100`,
      command: "Dashboard: Gates",
    },
    {
      index: "09",
      label: "Alignment",
      status: data.alignment.status === "ready" ? "ready" : "warn",
      statusLabel: data.alignment.status,
      check: "The compressed alignment file links product spec, validation, MFDR, DESIGN.md, AGENTS.md, plan, and scorecard.",
      evidence: `${data.alignment.anchors.length} anchors · ${data.alignment.openGaps.length} gaps`,
      command: "pnpm sync",
    },
    {
      index: "10",
      label: "Review Export",
      status: data.evidenceExport.archivePath ? "ready" : "warn",
      statusLabel: data.evidenceExport.archivePath ? "Exported" : "Not yet",
      check: "A sanitized bundle is created so another agent or human can audit what happened.",
      evidence: data.evidenceExport.archivePath
        ? `${formatBytes(data.evidenceExport.bytes)} · ${formatAgo(data.evidenceExport.createdAt)}`
        : "No bundle yet",
      command: "Dashboard: Export evidence",
    },
  ];
  const tabItems: Array<{
    id: ControlPlaneTab;
    label: string;
    short: string;
    metric: string;
    description: string;
  }> = [
    {
      id: "overview",
      label: "Overview",
      short: data.setup.status,
      metric: `${data.latestScorecard.score ?? "--"}/100`,
      description: "Setup state and the review path.",
    },
    {
      id: "actions",
      label: "Actions",
      short: `${data.actions.available.length} tools`,
      metric: `${data.actions.recentRuns.length} runs`,
      description: "Run allowlisted checks and exports.",
    },
      {
      id: "runtimes",
      label: "Runtimes",
      short: `${data.runtimes.filter((runtime) => runtime.status === "configured").length}/${data.runtimes.length} ready`,
      metric: `${data.runtimes.reduce((sum, runtime) => sum + runtime.hooksObserved, 0)} events`,
      description: "Codex, Claude, hook trust, and runtime proof.",
    },
    {
      id: "system",
      label: "System",
      short: `${data.modules.length} modules`,
      metric: `${data.hooks.registered} hooks`,
      description: "Installed modules, adapters, hooks, and coverage.",
    },
    {
      id: "costs",
      label: "Costs",
      short: formatMoney(data.runtime.integrationUsage.stats.totalCostUsd),
      metric: `${data.registries.integrations.length} APIs`,
      description: "Providers, API spend, and runtime calls.",
    },
    {
      id: "proof",
      label: "Proof",
      short: data.browserProof.expectProofOk ? "Expect ok" : "Needs proof",
      metric: `${data.browserProof.expectCommandCount ?? 0} cmds`,
      description: "Browser, visual, design, and activity evidence.",
    },
    {
      id: "registries",
      label: "Registries",
      short: `${data.registries.features.length} features`,
      metric: `${data.registries.evidence.length} evidence`,
      description: "Runs, docs, features, and evidence drilldowns.",
    },
    {
      id: "handoff",
      label: "Handoff",
      short: `${pendingCompanions.length} gaps`,
      metric: `${data.session.openGaps.length} open`,
      description: "Plan, blockers, session, and report state.",
    },
  ];

  return (
    <>
      <main className="starter-pixel min-h-dvh bg-neutral-950 bg-[linear-gradient(rgba(245,245,245,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(245,245,245,0.045)_1px,transparent_1px)] bg-[size:24px_24px] px-4 py-6 text-neutral-100 sm:px-6 sm:py-8">
        <PixelStyles />
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="relative overflow-hidden border-2 border-neutral-100 bg-neutral-950 p-5 shadow-[10px_10px_0_0_rgba(245,245,245,0.18)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#f5f5f5_0_12px,transparent_12px_24px)]" />
          <div className="flex flex-wrap items-start gap-4">
            <PixelMark />
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-neutral-400">
                Local Control Plane
              </p>
              <h1 className="mt-3 max-w-4xl font-mono text-4xl font-semibold tracking-[-0.05em] text-neutral-50 md:text-6xl">
                Repo truth rendered as pixels.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                A black-box flight recorder for the starter kit: installed
                modules, Claude hooks, evidence, browser screenshots, cost
                records, scorecards, and handoff state. No hidden magic, no
                founder memory.
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refresh()}
                className="border-2 border-neutral-100 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-neutral-100 transition duration-150 hover:-translate-y-0.5 hover:bg-neutral-100 hover:text-neutral-950"
              >
                Refresh
              </button>
              <Link
                href="/"
                className="border-2 border-neutral-700 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300 transition duration-150 hover:border-neutral-100 hover:text-neutral-50"
              >
                Home
              </Link>
              <Link
                href="/observability"
                className="border-2 border-neutral-700 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300 transition duration-150 hover:border-neutral-100 hover:text-neutral-50"
              >
                Runtime Logs
              </Link>
              <Link
                href="/ai-starter"
                className="border-2 border-neutral-100 bg-neutral-100 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-neutral-950 transition duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(245,245,245,0.24)]"
              >
                Starter Hub
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.14em] text-neutral-400">
            <span className="border border-neutral-700 bg-neutral-900 px-3 py-1.5">
              policy: {data.manifest?.policyProfile ?? "none"}
            </span>
            <span className="border border-neutral-700 bg-neutral-900 px-3 py-1.5">
              setup: {data.setup.status}
            </span>
            <span className="border border-neutral-700 bg-neutral-900 px-3 py-1.5">
              generated {formatAgo(data.generatedAt)}
            </span>
            <span className="border border-neutral-700 bg-neutral-900 px-3 py-1.5">
              last runtime activity {formatAgo(data.hooks.lastEventAt)}
            </span>
            {error ? (
              <span className="border border-neutral-100 bg-neutral-100 px-3 py-1.5 text-neutral-950">
                refresh issue: {error}
              </span>
            ) : null}
          </div>
          <PixelSignal />
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric
            label="Score"
            value={
              data.latestScorecard.score === null
                ? "--"
                : `${data.latestScorecard.score}/100`
            }
            hint="Current repo-readiness score from the starter gate model."
            accent="text-white"
          />
          <Metric
            label="AI Calls"
            value={formatCount(data.runtime.stats.totalCalls)}
            hint="Successful or failed model calls observed by the reference app."
            accent="text-cyan-300"
          />
          <Metric
            label="AI Cost"
            value={formatMoney(data.runtime.costModel.aiRuntimeUsd)}
            hint="Direct runtime spend seen by local AI telemetry."
            accent="text-amber-300"
          />
          <Metric
            label="API Cost"
            value={formatMoney(data.runtime.integrationUsage.stats.totalCostUsd)}
            hint="Direct non-model API spend recorded by local integration usage events."
            accent="text-orange-300"
          />
          <Metric
            label="Hooks"
            value={`${data.hooks.registered}`}
            hint={`${data.hooks.enforcers} enforcers, ${data.hooks.observers} observers, ${data.hooks.observedEvents} runtime events captured.`}
            accent="text-emerald-300"
          />
          <Metric
            label="Backlog"
            value={String(
              data.latestScorecard.blockers.length +
                data.companions.filter((task) => task.status === "pending").length,
            )}
            hint="Blockers plus still-pending companion obligations."
            accent="text-fuchsia-300"
          />
        </div>

        <nav
          aria-label="Control plane sections"
          className="sticky top-0 z-20 border-2 border-neutral-100 bg-neutral-950/95 p-2 shadow-[8px_8px_0_0_rgba(245,245,245,0.16)] backdrop-blur"
        >
          <div role="tablist" className="grid gap-2 md:grid-cols-2 xl:grid-cols-8">
            {tabItems.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`control-plane-tab-button-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`control-plane-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group min-h-24 border-2 p-3 text-left transition duration-150 ${
                    selected
                      ? "border-neutral-100 bg-neutral-100 text-neutral-950 shadow-[4px_4px_0_0_rgba(245,245,245,0.22)]"
                      : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:-translate-y-0.5 hover:border-neutral-100 hover:text-neutral-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm font-semibold uppercase tracking-[0.16em]">
                      {tab.label}
                    </span>
                    <span
                      className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                        selected
                          ? "border-neutral-950 text-neutral-950"
                          : "border-neutral-700 text-neutral-500 group-hover:border-neutral-100 group-hover:text-neutral-200"
                      }`}
                    >
                      {tab.short}
                    </span>
                  </div>
                  <p
                    className={`mt-3 font-mono text-xs uppercase tracking-[0.14em] ${
                      selected ? "text-neutral-700" : "text-neutral-500"
                    }`}
                  >
                    {tab.metric}
                  </p>
                  <p
                    className={`mt-2 text-xs leading-5 ${
                      selected ? "text-neutral-800" : "text-neutral-500"
                    }`}
                  >
                    {tab.description}
                  </p>
                </button>
              );
            })}
          </div>
        </nav>

        <section
          id="control-plane-tab-overview"
          aria-labelledby="control-plane-tab-button-overview"
          role="tabpanel"
          hidden={activeTab !== "overview"}
          className="space-y-8"
        >
        <Panel
          title="First-run setup"
          subtitle="The install interview output: project profile, provider choices, env contract, enabled modules, integrations, and design policy. Secrets are never displayed here."
        >
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                    Setup status
                  </p>
                  <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.08em] text-neutral-100">
                    {data.setup.status}
                  </p>
                </div>
                <StatusPill status={data.setup.status} />
              </div>
              <div className="mt-5 grid gap-3 font-mono text-xs uppercase tracking-[0.14em] text-neutral-400">
                <span className="border border-neutral-800 bg-neutral-900 px-3 py-2">
                  env groups {data.setup.satisfiedGroups}/{data.setup.requiredGroups}
                </span>
                <span className="border border-neutral-800 bg-neutral-900 px-3 py-2">
                  policy {data.setup.policyProfile}
                </span>
                <span className="border border-neutral-800 bg-neutral-900 px-3 py-2">
                  config {data.setup.configPath}
                </span>
              </div>
              <code className="mt-4 block border border-neutral-800 bg-neutral-900 px-3 py-3 text-xs text-neutral-300">
                {data.setup.setupCommand}
              </code>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                  Configured integrations
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.setup.configuredIntegrations.length > 0 ? (
                    data.setup.configuredIntegrations.map((integration) => (
                      <span
                        key={integration}
                        className="border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-300"
                      >
                        {integration}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">
                      No integrations selected yet.
                    </span>
                  )}
                </div>
              </div>
              <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                  Missing env groups
                </p>
                <div className="mt-4 space-y-2">
                  {data.setup.missingGroups.length > 0 ? (
                    data.setup.missingGroups.slice(0, 6).map((group) => (
                      <div
                        key={group.id}
                        className="border border-neutral-800 bg-neutral-900 px-3 py-2"
                      >
                        <p className="font-mono text-xs text-neutral-200">
                          {group.label}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-neutral-500">
                          one of {group.anyOf.join(" or ")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">
                      Required env groups are satisfied.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                Project shape
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                {data.setup.project?.name ?? "Unknown project"}
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
                {data.setup.project?.productType ?? "unknown"} · {data.setup.project?.appType ?? "unknown"}
              </p>
              <p className="mt-3 text-xs leading-5 text-neutral-500">
                {data.setup.project?.description ?? "Run setup to define the product."}
              </p>
            </div>
            <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                AI model contract
              </p>
              <p className="mt-3 font-mono text-sm text-neutral-300">
                {data.setup.ai?.provider ?? "unknown"}
              </p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-neutral-500">
                default {data.setup.ai?.defaultModel ?? "not configured"}
              </p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-neutral-500">
                test {data.setup.ai?.testModel ?? "not configured"}
              </p>
            </div>
            <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                Design intake
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                {data.setup.design?.visualStyle ?? "project-specific"}
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
                density {data.setup.design?.density ?? "medium"} · motion{" "}
                {data.setup.design?.motionLevel ?? "subtle"}
              </p>
              <p className="mt-3 text-xs leading-5 text-neutral-500">
                {data.setup.design?.brandSummary ?? "Run setup to define the design contract."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Quality & review flow"
          subtitle="The exact path from request to handoff: each stage has a check, evidence source, and command or dashboard action. A reviewer should read this left to right before trusting the work."
        >
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden border-2 border-neutral-800 bg-neutral-950">
              <div className="grid gap-px bg-neutral-800 md:grid-cols-7">
                {qualityStages.map((stage) => {
                  const isReady = stage.status === "ready";
                  const isBlocked = stage.status === "blocked";
                  return (
                    <div
                      key={stage.index}
                      className={`min-h-48 bg-neutral-950 p-4 ${
                        isReady
                          ? "shadow-[inset_0_4px_0_0_rgba(245,245,245,0.9)]"
                          : isBlocked
                            ? "shadow-[inset_0_4px_0_0_rgba(245,245,245,0.35)]"
                            : "shadow-[inset_0_4px_0_0_rgba(245,245,245,0.18)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                          {stage.index}
                        </span>
                        <span
                          className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                            isReady
                              ? "border-neutral-100 text-neutral-100"
                              : isBlocked
                                ? "border-neutral-500 text-neutral-300"
                                : "border-neutral-800 text-neutral-500"
                          }`}
                        >
                          {stage.statusLabel}
                        </span>
                      </div>
                      <h3 className="mt-4 font-mono text-sm font-semibold uppercase tracking-[0.14em] text-neutral-50">
                        {stage.label}
                      </h3>
                      <p className="mt-3 text-xs leading-5 text-neutral-400">
                        {stage.check}
                      </p>
                      <p className="mt-4 border border-neutral-800 bg-neutral-900 px-2 py-2 font-mono text-[11px] leading-5 text-neutral-300">
                        {stage.evidence}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t-2 border-neutral-800 bg-neutral-900 p-4">
                <div className="grid gap-2 md:grid-cols-7">
                  {qualityStages.map((stage) => (
                    <code
                      key={stage.index}
                      className="truncate border border-neutral-800 bg-neutral-950 px-2 py-2 text-[10px] text-neutral-400"
                    >
                      {stage.command}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-2 border-neutral-800 bg-neutral-950 p-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-50">
                Reviewer operating rule
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
                <p>
                  Trust the work only when the plan, research, companion
                  coverage, browser proof, gates, scorecard, and export bundle
                  agree with each other.
                </p>
                <p>
                  If a stage is not ready, the next action is not discussion. It
                  is the command or dashboard action shown under that stage.
                </p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border border-neutral-800 bg-neutral-900 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Human review asks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Does the evidence prove user behavior, or only prove files
                    exist?
                  </p>
                </div>
                <div className="border border-neutral-800 bg-neutral-900 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Agent review asks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    What is the smallest next verified change, and what will
                    stop the loop?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Panel>
        </section>

        <section
          id="control-plane-tab-actions"
          aria-labelledby="control-plane-tab-button-actions"
          role="tabpanel"
          hidden={activeTab !== "actions"}
          className="space-y-8"
        >
        <Panel
          title="Dashboard actions"
          subtitle="Dev-only action runner for safe, allowlisted repo operations. The UI cannot run arbitrary shell; it can only invoke these packaged scripts and records every run."
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.actions.available.map((action) => {
                const isRunning = runningAction === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!action.enabled || runningAction !== null}
                    onClick={() => void runAction(action.id)}
                    className={`border-2 p-4 text-left transition duration-150 ${
                      action.enabled
                        ? "border-neutral-700 bg-neutral-950 hover:-translate-y-0.5 hover:border-neutral-100 hover:shadow-[5px_5px_0_0_rgba(245,245,245,0.16)]"
                        : "cursor-not-allowed border-neutral-900 bg-neutral-950 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-neutral-50">
                        {isRunning ? "Running..." : action.label}
                      </p>
                      <span className="border border-neutral-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                        {action.kind}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                      {action.description}
                    </p>
                    <code className="mt-3 block truncate border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-[11px] text-neutral-300">
                      {action.command}
                    </code>
                    {!action.enabled ? (
                      <p className="mt-2 text-xs leading-5 text-neutral-500">
                        {action.disabledReason}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="border-2 border-neutral-800 bg-neutral-950 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-neutral-50">
                  Action console
                </p>
                <span className="border border-neutral-700 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                  {data.actions.recentRuns.length} recent
                </span>
              </div>
              {actionResult ? (
                <div className="mt-4 border border-neutral-800 bg-neutral-900 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-neutral-100">
                      {actionResult.label} · {actionResult.status}
                    </p>
                    <span className="font-mono text-xs text-neutral-500">
                      {Math.round(actionResult.durationMs / 1000)}s
                    </span>
                  </div>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap border border-neutral-800 bg-neutral-950 p-3 text-xs leading-5 text-neutral-300">
                    {actionResult.output || actionResult.error || "No output."}
                  </pre>
                  {actionResult.actionId === "export-evidence" &&
                  actionResult.status === "success" ? (
                    <a
                      href="/api/control-plane/evidence-export"
                      className="mt-3 inline-flex border-2 border-neutral-100 bg-neutral-100 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-neutral-950 transition duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(245,245,245,0.22)]"
                    >
                      Download bundle
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-neutral-500">
                  Run an action to see exact stdout/stderr here. Results are also
                  written to <code>.ai-starter/runs/control-plane-actions.jsonl</code>.
                </p>
              )}
              {data.evidenceExport.archivePath ? (
                <div className="mt-4 border border-neutral-800 bg-neutral-900/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-neutral-100">
                      Latest evidence export
                    </p>
                    <span className="font-mono text-xs text-neutral-500">
                      {formatBytes(data.evidenceExport.bytes)}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-mono text-xs text-neutral-500">
                    {data.evidenceExport.archivePath}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={data.evidenceExport.downloadPath}
                      className="border border-neutral-100 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-neutral-100 transition duration-150 hover:bg-neutral-100 hover:text-neutral-950"
                    >
                      Download latest
                    </a>
                    <span className="border border-neutral-800 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
                      {formatAgo(data.evidenceExport.createdAt)}
                    </span>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                {data.actions.recentRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="grid gap-2 border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm md:grid-cols-[0.6fr_0.35fr_1fr]"
                  >
                    <span className="truncate font-mono text-xs text-neutral-100">
                      {run.label}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      {run.status}
                    </span>
                    <code className="truncate text-xs text-neutral-500">
                      {run.command}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
        </section>

        <section
          id="control-plane-tab-runtimes"
          aria-labelledby="control-plane-tab-button-runtimes"
          role="tabpanel"
          hidden={activeTab !== "runtimes"}
          className="space-y-8"
        >
          <Panel
            title="Agent runtime adapters"
            subtitle="Codex and Claude are separate runtime adapters. They share the same starter manifests, telemetry, scorecards, and evidence chain, but each has its own hook config and proof command."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {data.runtimes.length > 0 ? (
                data.runtimes.map((runtime) => (
                  <div
                    key={runtime.id}
                    className="border-2 border-neutral-800 bg-neutral-950 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-lg font-semibold uppercase tracking-[0.16em] text-neutral-50">
                          {runtime.label}
                        </p>
                        <p className="mt-2 text-sm text-neutral-400">
                          {runtime.primary ? "Primary runtime" : "Secondary runtime"} ·{" "}
                          {runtime.trusted ? "project config present" : "needs trust/config"}
                        </p>
                      </div>
                      <span className="border border-neutral-100 bg-neutral-100 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-950">
                        {runtime.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Metric
                        label="Hooks"
                        value={`${runtime.hookCount}`}
                        hint="Registered lifecycle handlers."
                        accent="text-neutral-50"
                      />
                      <Metric
                        label="Observed"
                        value={`${runtime.hooksObserved}`}
                        hint={`Last ${formatAgo(runtime.lastEventAt)}`}
                        accent="text-neutral-50"
                      />
                      <Metric
                        label="Proof"
                        value={runtime.proof.lastPass === null ? "n/a" : runtime.proof.lastPass ? "pass" : "fail"}
                        hint={runtime.proof.command}
                        accent="text-neutral-50"
                      />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="border border-neutral-800 bg-neutral-900/70 p-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                          Config
                        </p>
                        <code className="mt-2 block break-all text-xs text-neutral-300">
                          {runtime.configPath}
                        </code>
                        <code className="mt-1 block break-all text-xs text-neutral-500">
                          {runtime.hooksPath}
                        </code>
                      </div>
                      <div className="border border-neutral-800 bg-neutral-900/70 p-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                          Evidence
                        </p>
                        <code className="mt-2 block break-all text-xs text-neutral-300">
                          {runtime.proof.reportPath}
                        </code>
                        <code className="mt-1 block break-all text-xs text-neutral-500">
                          {runtime.proof.evidenceDir}
                        </code>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                        Capabilities
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {runtime.capabilities.map((capability) => (
                          <span
                            key={capability}
                            className="border border-neutral-800 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-300"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                    {runtime.warnings.length > 0 ? (
                      <div className="mt-4 border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-300">
                        {runtime.warnings.slice(0, 3).join(" · ")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="border border-neutral-800 bg-neutral-900/70 p-4 text-sm text-neutral-400">
                  No runtime manifest yet. Run <code>pnpm sync</code>.
                </div>
              )}
            </div>
          </Panel>
        </section>

        <section
          id="control-plane-tab-system"
          aria-labelledby="control-plane-tab-button-system"
          role="tabpanel"
          hidden={activeTab !== "system"}
          className="space-y-8"
        >
        <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel
            title="Repo OS modules"
            subtitle="The installed platform sectors: what is enabled, what is required, and which commands prove each layer still works."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {data.modules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {module.label}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {module.core ? "core" : "adapter"}
                        {module.required ? " · required" : " · optional"}
                      </p>
                    </div>
                    <StatusPill status={module.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(module.verificationCommands ?? []).length > 0 ? (
                      module.verificationCommands?.map((command) => (
                        <code
                          key={command}
                          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                        >
                          {command}
                        </code>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        No command required yet.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Adapters and supervisor"
            subtitle="Provider modules stay swappable, but the dashboard shows which adapters are actually configured and which tmux sessions are visible."
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {data.adapters.map((adapter) => (
                  <div
                    key={adapter.id}
                    className="rounded-[22px] border border-white/8 bg-[#0d1721]/90 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {adapter.label}
                      </p>
                      <StatusPill status={adapter.status} />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {adapter.kind}
                      {adapter.default ? " · default" : ""}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {adapter.notes?.[0] ?? "Adapter registered."}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#09121c] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    Supervisor: {data.supervisor.backend}
                  </p>
                  <StatusPill status={data.supervisor.status} />
                </div>
                <div className="mt-4 grid gap-2">
                  {data.supervisor.sessions.map((session) => (
                    <div
                      key={session.name}
                      className="flex items-center justify-between rounded-2xl bg-[#0d1721] px-3 py-2 text-sm"
                    >
                      <span className="text-slate-300">
                        {session.name} · {session.role}
                      </span>
                      <span
                        className={
                          session.observed ? "text-emerald-300" : "text-slate-500"
                        }
                      >
                        {session.observed ? "observed" : "missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
        </section>

        <section
          id="control-plane-tab-costs"
          aria-labelledby="control-plane-tab-button-costs"
          role="tabpanel"
          hidden={activeTab !== "costs"}
          className="space-y-8"
        >
        <Panel
          title="Integration and cost registry"
          subtitle="Every provider or custom API should answer four questions: is it configured, where are the docs, how is cost tracked, and what tests prove the edge cases?"
        >
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Metric
                label="Tracked"
                value={String(data.costCoverage.trackedIntegrations)}
                hint="Integrations with local cost telemetry or explicit usage records."
                accent="text-emerald-300"
              />
              <Metric
                label="Untracked"
                value={String(data.costCoverage.untrackedConfiguredIntegrations)}
                hint="Configured integrations that still rely on provider dashboards or estimates."
                accent="text-amber-300"
              />
              <Metric
                label="Provider"
                value={String(data.costCoverage.providerDashboardIntegrations)}
                hint="Cost source is currently the external provider dashboard."
                accent="text-cyan-300"
              />
              <Metric
                label="Manual"
                value={String(data.costCoverage.manualEstimateIntegrations)}
                hint="Cost source is a manual estimate until the app emits usage events."
                accent="text-fuchsia-300"
              />
              <Metric
                label="Usage Events"
                value={formatCount(data.runtime.integrationUsage.stats.totalEvents)}
                hint="Local JSONL records emitted by APIs, scripts, or tools."
                accent="text-orange-300"
              />
              <Metric
                label="Usage Cost"
                value={formatMoney(data.runtime.integrationUsage.stats.totalCostUsd)}
                hint="Known non-model API spend from local usage records."
                accent="text-rose-300"
              />
            </div>
            <div className="grid gap-3">
              {data.registries.integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {integration.label}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {integration.kind} · cost: {integration.cost.source}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill status={integration.status} />
                      <StatusPill
                        status={integration.cost.tracked ? "configured" : "planned"}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-[#09121c] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        Env
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {integration.envVars.length > 0
                          ? integration.envVars.join(", ")
                          : "none"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#09121c] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        Tests
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        unit {integration.tests.unit ? "yes" : "no"} · contract{" "}
                        {integration.tests.contract ? "yes" : "no"} · e2e{" "}
                        {integration.tests.e2e ? "yes" : "no"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#09121c] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        Routes
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {integration.routes.length > 0
                          ? integration.routes.slice(0, 3).join(", ")
                          : "none detected"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#09121c] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        Usage
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {data.runtime.integrationUsage.stats.byIntegration[
                          integration.id
                        ]
                          ? `${
                              data.runtime.integrationUsage.stats.byIntegration[
                                integration.id
                              ]?.calls ?? 0
                            } events · ${formatMoney(
                              data.runtime.integrationUsage.stats.byIntegration[
                                integration.id
                              ]?.costUsd ?? 0,
                            )}`
                          : "no local events"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {integration.exampleCommands.map((command) => (
                      <code
                        key={command}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                      >
                        {command}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ul className="mt-5 grid gap-2 text-sm leading-6 text-slate-400 md:grid-cols-2">
            {data.costCoverage.notes.map((note) => (
              <li key={note} className="rounded-2xl bg-[#09121c] px-4 py-3">
                {note}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-[#09121c] p-4">
            <p className="text-sm font-semibold text-white">
              Recent integration usage
            </p>
            <div className="mt-4 space-y-2">
              {data.runtime.integrationUsage.recent.length > 0 ? (
                data.runtime.integrationUsage.recent.slice(0, 8).map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-2 rounded-2xl bg-[#0d1721] px-3 py-3 text-sm md:grid-cols-[0.75fr_0.75fr_0.45fr_0.45fr]"
                  >
                    <span className="truncate text-white">
                      {event.label}
                    </span>
                    <span className="truncate text-slate-400">
                      {event.operation ?? event.route ?? event.integrationId}
                    </span>
                    <span className="text-slate-300">
                      {event.quantity} {event.unit}
                    </span>
                    <span className="text-orange-200">
                      {formatMoney(event.costUsd)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Run <code>pnpm usage:record -- --integration=assemblyai --cost=0.01</code>{" "}
                  or call <code>recordIntegrationUsage()</code> from an API route.
                </p>
              )}
            </div>
          </div>
        </Panel>
        </section>

        <section
          id="control-plane-tab-proof"
          aria-labelledby="control-plane-tab-button-proof"
          role="tabpanel"
          hidden={activeTab !== "proof"}
          className="space-y-8"
        >
        <Panel
          title="Browser proof and design system"
          subtitle="Expect is treated as required browser-control tooling. Playwright produces deterministic screenshots; Expect provides replayable browser command evidence."
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Expect proof"
                value={data.browserProof.expectProofOk ? "OK" : "Missing"}
                hint={`${data.browserProof.expectCommandCount ?? 0} command(s), ${data.browserProof.expectBlockingFailedCommandCount ?? 0} blocking failure(s).`}
                accent="text-cyan-300"
              />
              <Metric
                label="Replays"
                value={String(data.browserProof.replayPaths.length)}
                hint={`Last replay: ${data.browserProof.lastReplayPath ?? "none"}.`}
                accent="text-emerald-300"
              />
              <Metric
                label="Screenshots"
                value={String(data.browserProof.screenshotPaths.length)}
                hint={`${data.browserProof.expectScreenshotCount ?? 0} copied from Expect; Playwright screenshots also count here.`}
                accent="text-amber-300"
              />
            </div>
            <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Token registry
                </p>
                <StatusPill
                  status={data.design.editableFromDashboard ? "enabled" : "missing"}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(data.design.tokens.colors).map(([name, value]) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/8 bg-[#09121c] p-3"
                  >
                    <div
                      className="h-10 rounded-xl border border-white/10"
                      style={{ background: value }}
                    />
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {name}
                    </p>
                    <code className="mt-1 block text-xs text-slate-300">
                      {value}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Visual diff control"
          subtitle="The iterate loop now compares before/after screenshot evidence. This is the inspection layer before any future autonomous screenshot-driven UI rewrite is allowed."
        >
          <VisualDiffDrilldown diff={data.latestVisualDiff} />
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="Activity map"
            subtitle="A GitHub-style activity strip for the last 56 days. Bright cells mean the repo or runtime produced proof: AI calls, starter artifacts, or hook events."
          >
            <div className="overflow-x-auto">
              <div className="flex min-w-[720px] gap-2">
                {activityWeeks.map((week, index) => (
                  <div key={`week-${index}`} className="grid gap-2">
                    {week.map((day) => {
                      const levelClasses = [
                        "bg-neutral-950",
                        "bg-neutral-800",
                        "bg-neutral-600",
                        "bg-neutral-300",
                        "bg-neutral-50",
                      ];

                      return (
                        <div
                          key={day.date}
                          title={`${day.date} · ${day.total} events · ${day.aiCalls} AI · ${day.hookEvents} hooks · ${day.starterArtifacts} starter · ${day.errors} errors`}
                          className={`h-5 w-5 rounded-[6px] border border-white/6 ${levelClasses[day.level]}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>0 none</span>
              <span>1 light</span>
              <span>2 active</span>
              <span>3 busy</span>
              <span>4 heavy</span>
            </div>
          </Panel>

          <Panel
            title="Runtime health"
            subtitle="What the live app has actually done since the server booted."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Error rate
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {data.runtime.stats.totalCalls === 0
                    ? "--"
                    : `${(
                        (data.runtime.stats.totalErrors /
                          Math.max(data.runtime.stats.totalCalls, 1)) *
                        100
                      ).toFixed(1)}%`}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {data.runtime.stats.totalErrors} logged runtime errors.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Avg TTFT
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {data.runtime.stats.avgTTFT > 0
                    ? `${Math.round(data.runtime.stats.avgTTFT)}ms`
                    : "--"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Time-to-first-token across local runtime calls.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Models observed
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentModelIds.length > 0 ? (
                  recentModelIds.map((modelId) => (
                    <span
                      key={modelId}
                      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200"
                    >
                      {modelId}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    Send a few chat messages to populate runtime data.
                  </span>
                )}
              </div>
            </div>
          </Panel>
        </div>
        </section>

        <section
          id="control-plane-tab-registries"
          aria-labelledby="control-plane-tab-button-registries"
          role="tabpanel"
          hidden={activeTab !== "registries"}
          className="space-y-8"
        >
        <Panel
          title="Registry drilldowns and run history"
          subtitle="This is the central-station view: docs, features, evidence, integrations, and iterate/score runs all come from registry files on disk."
        >
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
              <p className="text-sm font-semibold text-white">Recent runs</p>
              <div className="mt-4 space-y-2">
                {data.registries.runs.length > 0 ? (
                  data.registries.runs.slice(0, 8).map((run) => (
                    <div
                      key={run.path}
                      className="grid gap-2 rounded-2xl bg-[#09121c] px-3 py-3 text-sm md:grid-cols-[0.85fr_0.5fr_0.5fr_1fr]"
                    >
                      <code className="truncate text-xs text-cyan-200">
                        {run.id}
                      </code>
                      <span className="text-slate-300">{run.kind}</span>
                      <span className="text-slate-300">
                        {run.score === null ? "--" : `${run.score}/100`}
                      </span>
                      <span className="truncate text-slate-500">
                        {run.stopReason ?? run.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Run <code>pnpm score</code> or <code>pnpm iterate</code> to populate run history.
                  </p>
                )}
              </div>
              {data.latestIteration ? (
                <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-cyan-100">
                      Latest iterate: {data.latestIteration.status}
                    </p>
                    <span className="text-xs text-cyan-200">
                      {data.latestIteration.scoreAtStart ?? "--"} →{" "}
                      {data.latestIteration.scoreAtEnd ?? "--"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-cyan-100/75">
                    {data.latestIteration.stopReason ?? "No stop reason recorded."}
                  </p>
                  {data.latestIteration.visualComparison ? (
                    <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-[#06111a]/70 p-3 text-xs text-cyan-100/80 sm:grid-cols-3">
                      <span>
                        Visual diff{" "}
                        <strong className="font-semibold text-white">
                          {data.latestIteration.visualComparison.changed}
                        </strong>
                        /{data.latestIteration.visualComparison.compared} changed
                      </span>
                      <span>
                        Added/removed{" "}
                        <strong className="font-semibold text-white">
                          {data.latestIteration.visualComparison.added}
                        </strong>
                        /
                        <strong className="font-semibold text-white">
                          {data.latestIteration.visualComparison.removed}
                        </strong>
                      </span>
                      <span>
                        Max pixel delta{" "}
                        <strong className="font-semibold text-white">
                          {formatPercent(
                            data.latestIteration.visualComparison
                              .maxPixelDiffRatio,
                          )}
                        </strong>
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.latestIteration.commands.map((command) => (
                      <code
                        key={command.command}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          command.ok
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                            : "border-red-400/20 bg-red-400/10 text-red-100"
                        }`}
                      >
                        {command.skipped ? "skipped: " : ""}
                        {command.command}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
                <p className="text-sm font-semibold text-white">Feature registry</p>
                <div className="mt-4 space-y-2">
                  {data.registries.features.slice(0, 10).map((feature) => (
                    <div
                      key={feature.id}
                      className="rounded-2xl bg-[#09121c] px-3 py-3 text-sm"
                    >
                      <p className="truncate text-white">{feature.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {feature.kind} · unit {feature.coverage?.hasUnit ? "yes" : "no"} · story{" "}
                        {feature.coverage?.hasStory ? "yes" : "no"} · visual{" "}
                        {feature.coverage?.hasVisual ? "yes" : "no"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
                <p className="text-sm font-semibold text-white">Fresh evidence</p>
                <div className="mt-4 space-y-2">
                  {data.registries.evidence.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[#09121c] px-3 py-3 text-sm"
                    >
                      <p className="truncate text-white">{item.path}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {item.kind} · {item.source} · {formatAgo(item.createdAt ?? null)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4 md:col-span-2">
                <p className="text-sm font-semibold text-white">Docs registry</p>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {data.registries.docs.slice(0, 8).map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-2xl bg-[#09121c] px-3 py-3 text-sm"
                    >
                      <p className="truncate text-white">{doc.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {doc.localPath}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Panel>
        </section>

        <div
          hidden={activeTab !== "system"}
          className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"
        >
          <Panel
            title="Hooks and enforcement"
            subtitle="Registered hooks come from the starter manifest. Observed events only count when hook telemetry was actually written."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
                <p className="text-sm font-semibold text-white">Hook mix</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Enforcers</span>
                    <span>{data.hooks.enforcers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Observers</span>
                    <span>{data.hooks.observers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Blocking hooks</span>
                    <span>{data.hooks.blocking}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Observed runtime events</span>
                    <span>{data.hooks.observedEvents}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-4">
                <p className="text-sm font-semibold text-white">By lifecycle event</p>
                <div className="mt-4 space-y-3">
                  {data.hooks.groups.map((group) => (
                    <div
                      key={group.event}
                      className="rounded-2xl bg-[#09121c] px-3 py-3 text-sm text-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span>{group.event}</span>
                        <span className="text-xs text-slate-500">
                          {group.observed}/{group.registered} seen
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {group.blocking} blocking hooks on this event.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Coverage contract"
            subtitle="The starter’s proof model is still thin here, and the page makes that obvious instead of pretending otherwise."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CoverageCard title="Components" summary={data.coverage.components} />
              <CoverageCard title="Routes" summary={data.coverage.routes} />
              <CoverageCard title="APIs" summary={data.coverage.apis} />
              <CoverageCard title="Tools" summary={data.coverage.tools} />
            </div>
          </Panel>
        </div>

        <section
          id="control-plane-tab-handoff"
          aria-labelledby="control-plane-tab-button-handoff"
          role="tabpanel"
          hidden={activeTab !== "handoff"}
          className="space-y-8"
        >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel
            title="Plan, blockers, and companion work"
            subtitle="This is the work contract the repo thinks it is under right now."
          >
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                <p className="text-sm font-semibold text-white">Product spec</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {data.productSpec.customer}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {data.productSpec.status} · {data.productSpec.source}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {data.productSpec.painfulProblem}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Wedge: {data.productSpec.wedge}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {data.productSpec.nextStep}
                </p>
                {data.productSpec.openQuestions.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {data.productSpec.openQuestions.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                <p className="text-sm font-semibold text-white">Product validation</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {data.productValidation.verdict}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {data.productValidation.status} · {data.productValidation.mode}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {data.productValidation.bestCustomer}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {data.productValidation.nextStep}
                </p>
                {data.productValidation.unanswered.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {data.productValidation.unanswered.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
	              </div>
	              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
	                <p className="text-sm font-semibold text-white">MFDR technical spec</p>
	                <p className="mt-3 text-xl font-semibold text-white">
	                  {data.mfdr.title}
	                </p>
	                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
	                  {data.mfdr.status} · {data.mfdr.source} · {data.mfdr.decisions} decisions
	                </p>
	                <p className="mt-4 text-sm leading-6 text-slate-300">
	                  {data.mfdr.hypothesis}
	                </p>
	                <p className="mt-3 text-xs text-slate-500">
	                  {data.mfdr.nextStep}
	                </p>
	                {data.mfdr.openQuestions.length > 0 ? (
	                  <div className="mt-5 flex flex-wrap gap-2">
	                    {data.mfdr.openQuestions.map((item) => (
	                      <span
	                        key={item}
	                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200"
	                      >
	                        {item}
	                      </span>
	                    ))}
	                  </div>
	                ) : null}
	              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                <p className="text-sm font-semibold text-white">Alignment anchors</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {data.alignment.status}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {data.alignment.anchors.length} anchors · {data.alignment.openGaps.length} gaps
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {data.alignment.summary}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {data.alignment.nextStep}
                </p>
                {data.alignment.requiredReads.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {data.alignment.requiredReads.slice(0, 6).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
	              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
	                <p className="text-sm font-semibold text-white">Active plan</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {data.latestPlan.title}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {data.latestPlan.classification}
                  {data.latestPlan.id ? ` · ${data.latestPlan.id}` : ""}
                  {` · ${data.latestPlan.status}`}
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  {(data.latestPlan.acceptanceCriteria.length > 0
                    ? data.latestPlan.acceptanceCriteria
                    : ["No plan artifact found."]).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {data.latestPlan.requiredEvidence.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                  <p className="text-sm font-semibold text-white">Score blockers</p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {data.latestScorecard.blockers.length > 0 ? (
                      data.latestScorecard.blockers.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    ) : (
                      <li>No blockers recorded.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                  <p className="text-sm font-semibold text-white">
                    Pending companion work
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {pendingCompanions.length > 0 ? (
                      pendingCompanions.slice(0, 5).map((task) => (
                        <li key={task.id}>
                          <span className="font-medium text-white">{task.path}</span>
                          {task.missing?.length ? (
                            <span className="text-slate-400">
                              {" "}
                              → {task.missing.join(", ")}
                            </span>
                          ) : null}
                        </li>
                      ))
                    ) : (
                      <li>No pending companion tasks.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Session and handoff"
            subtitle="The portability layer. Another person or another Claude session should be able to reconstruct current state from these files."
          >
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Current task</p>
                  <span className="text-xs text-slate-500">
                    updated {formatAgo(data.session.updatedAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {data.session.currentTask}
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Last decision
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {data.session.lastDecision ?? "No decision recorded."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                  <p className="text-sm font-semibold text-white">Open gaps</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                    {data.session.openGaps.length > 0 ? (
                      data.session.openGaps.map((gap) => <li key={gap}>{gap}</li>)
                    ) : (
                      <li>No open gaps recorded.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                  <p className="text-sm font-semibold text-white">Files in flight</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                    {data.progress.filesInFlight.length > 0 ? (
                      data.progress.filesInFlight.map((file) => (
                        <li key={file}>{file}</li>
                      ))
                    ) : (
                      <li>No files in flight recorded.</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#0d1721]/90 p-5">
                <p className="text-sm font-semibold text-white">
                  Handoff report preview
                </p>
                <pre className="mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-[20px] bg-[#09121c] p-4 text-xs leading-6 text-slate-400">
                  {data.latestReportPreview ||
                    "Run `pnpm report` to generate a handoff report."}
                </pre>
              </div>
            </div>
          </Panel>
        </div>
        </section>

        <div hidden={activeTab !== "costs"} className="space-y-8">
        <Panel
          title="Recent runtime calls"
          subtitle="This is the bridge between repo state and actual user-facing model traffic."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="pb-2 pr-4">When</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4">Tokens</th>
                  <th className="pb-2 pr-4">Cost</th>
                  <th className="pb-2 pr-4">TTFT</th>
                  <th className="pb-2 pr-4">Tools</th>
                  <th className="pb-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.runtime.recentCalls.length > 0 ? (
                  data.runtime.recentCalls.map((call) => (
                    <tr key={call.id} className="rounded-2xl bg-[#0d1721]/90">
                      <td className="rounded-l-2xl px-4 py-3 text-slate-400">
                        {formatAgo(call.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-white">{call.modelId}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {call.totalTokens}
                      </td>
                      <td className="px-4 py-3 text-amber-300">
                        {formatMoney(call.cost)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {call.ttftMs === null ? "--" : `${call.ttftMs}ms`}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {call.toolCalls.length > 0 ? call.toolCalls.join(", ") : "none"}
                      </td>
                      <td className="rounded-r-2xl px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            call.error
                              ? "bg-red-500/10 text-red-200"
                              : "bg-emerald-500/10 text-emerald-200"
                          }`}
                        >
                          {call.error ? "error" : call.finishReason ?? "ok"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Send a message in <Link href="/chat" className="text-cyan-300 underline underline-offset-4">/chat</Link> to populate the live runtime table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
        </div>
        </div>
      </main>
      {process.env.NODE_ENV === "development" ? <AIDebugPanel /> : null}
    </>
  );
}
