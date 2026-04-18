"use client";

/**
 * /observability — live AI call monitoring dashboard.
 *
 * Pulls real data from:
 *   - /api/ai-logs/stats — aggregate metrics
 *   - /api/ai-logs — recent call log
 *   - /api/health — dependency health checks
 *   - /api/observability/health — sink status
 */

import { useEffect, useState } from "react";
import { TopBar } from "@/components/top-bar";

interface Stats {
  totalCalls: number;
  totalCost: number;
  totalTokens: number;
  avgTTFT: number;
  totalErrors: number;
  modelBreakdown: Record<string, { calls: number; cost: number; tokens: number }>;
  toolFrequency: Record<string, number>;
  models: string[];
}

interface LogEntry {
  traceId: string;
  timestamp: string;
  label: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  durationMs: number;
  toolCalls: string[];
  finishReason: string;
  error: string | null;
}

interface Health {
  status: string;
  ts: string;
  dependencies: Record<string, { status: string; latencyMs?: number }>;
}

interface SinkHealth {
  sinks: Record<string, { configured: boolean; recentEvents: number; status: string }>;
  warnings: string[];
}

export default function ObservabilityPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [sinkHealth, setSinkHealth] = useState<SinkHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai-logs/stats").then(r => r.json()).catch(() => null),
      fetch("/api/ai-logs").then(r => r.json()).catch(() => []),
      fetch("/api/health").then(r => r.json()).catch(() => null),
      fetch("/api/observability/health").then(r => r.json()).catch(() => null),
    ]).then(([s, l, h, sh]) => {
      setStats(s);
      setLogs(Array.isArray(l) ? l : []);
      setHealth(h);
      setSinkHealth(sh);
      setLoading(false);
    });
  }, []);

  return (
    <div
      className="min-h-dvh px-4 pb-20 md:px-6"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <TopBar title="Observability" />
      <div className="mx-auto max-w-4xl space-y-6">

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : (
          <>
            {/* Stats tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Total Calls" value={String(stats?.totalCalls ?? 0)} />
              <Tile label="Total Tokens" value={formatNumber(stats?.totalTokens ?? 0)} />
              <Tile label="Avg TTFT" value={stats?.avgTTFT ? `${Math.round(stats.avgTTFT)}ms` : "—"} />
              <Tile label="Errors" value={String(stats?.totalErrors ?? 0)} accent={stats?.totalErrors ? "var(--error)" : undefined} />
            </div>

            {/* Dependency health */}
            {health && (
              <section>
                <h2 className="text-label mb-3" style={{ color: "var(--text-muted)" }}>Dependencies</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(health.dependencies).map(([name, dep]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-md px-3 py-2"
                      style={{ backgroundColor: "var(--bg-secondary)" }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: dep.status === "ok" ? "var(--success)" : "var(--error)",
                        }}
                      />
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{name}</span>
                      {dep.latencyMs !== undefined && (
                        <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                          {dep.latencyMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sink status */}
            {sinkHealth && (
              <section>
                <h2 className="text-label mb-3" style={{ color: "var(--text-muted)" }}>Log Sinks</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sinkHealth.sinks).map(([name, sink]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                      style={{ backgroundColor: "var(--bg-secondary)" }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            sink.status === "ok" ? "var(--success)" :
                            sink.configured ? "var(--warning)" : "var(--text-muted)",
                        }}
                      />
                      <span style={{ color: "var(--text-primary)" }}>{name}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {sink.configured ? `${sink.recentEvents} events` : "off"}
                      </span>
                    </div>
                  ))}
                </div>
                {sinkHealth.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {sinkHealth.warnings.map((w, i) => (
                      <p key={i} className="text-xs" style={{ color: "var(--warning)" }}>{w}</p>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Model breakdown */}
            {stats && Object.keys(stats.modelBreakdown).length > 0 && (
              <section>
                <h2 className="text-label mb-3" style={{ color: "var(--text-muted)" }}>Models Used</h2>
                <div className="space-y-2">
                  {Object.entries(stats.modelBreakdown).map(([model, data]) => (
                    <div
                      key={model}
                      className="flex items-center justify-between rounded-md px-3 py-2"
                      style={{ backgroundColor: "var(--bg-secondary)" }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{model}</span>
                      <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>{data.calls} calls</span>
                        <span>{formatNumber(data.tokens)} tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent calls */}
            <section>
              <h2 className="text-label mb-3" style={{ color: "var(--text-muted)" }}>Recent AI Calls</h2>
              {logs.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No calls yet. Record a meeting or send a chat message to see activity here.
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.slice(0, 20).map((log) => (
                    <div
                      key={log.traceId}
                      className="flex flex-col gap-1 rounded-md px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      style={{ backgroundColor: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: log.error ? "var(--error)" : "var(--success)",
                          }}
                        />
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {log.label}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {log.modelId}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>{log.totalTokens} tok</span>
                        <span>{log.durationMs}ms</span>
                        {log.toolCalls.length > 0 && (
                          <span style={{ color: "var(--accent)" }}>
                            {log.toolCalls.join(", ")}
                          </span>
                        )}
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Langfuse link */}
            <a
              href="https://us.cloud.langfuse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm"
              style={{
                backgroundColor: "var(--accent-muted)",
                color: "var(--accent)",
              }}
            >
              Open Langfuse Dashboard →
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md px-3 py-3" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p
        className="mt-1 text-xl font-semibold"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
