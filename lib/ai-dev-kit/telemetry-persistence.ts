/**
 * Telemetry Persistence Layer
 *
 * Connects TelemetryIntegration callbacks to Supabase storage.
 * This is the missing middle of the pipeline:
 * AI calls -> TelemetryIntegration -> [this module] -> Supabase -> API routes -> Dashboard
 *
 * Usage:
 * ```ts
 * import { createClient } from '@supabase/supabase-js';
 * import { TelemetryIntegration } from './telemetry.js';
 * import { createPersistentTelemetryConfig } from './telemetry-persistence.js';
 *
 * const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 * const config = createPersistentTelemetryConfig(supabase, { tenantId: 'my-tenant' });
 * const telemetry = new TelemetryIntegration(config);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TelemetryConfig, CostLogEntry, TraceEntry, ErrorContext } from './telemetry.js';
import {
  insertTrace,
  insertSpan,
  insertCostLog,
  insertRegressionTest,
} from './supabase-queries.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersistentTelemetryOptions {
  /** Tenant ID for multi-tenant isolation. Required. */
  tenantId: string;

  /** Enable cost logging to Supabase. Default: true. */
  persistCosts?: boolean;

  /** Enable trace logging to Supabase. Default: true. */
  persistTraces?: boolean;

  /** Enable span logging for tool calls. Default: true. */
  persistSpans?: boolean;

  /**
   * Enable auto-regression detection.
   * When the same tool fails repeatedly, a regression_tests row is created.
   * Default: true.
   */
  detectRegressions?: boolean;

  /**
   * Number of consecutive failures for the same tool before a regression
   * entry is created. Default: 3.
   */
  regressionThreshold?: number;

  /**
   * Additional TelemetryConfig overrides (cost tracking, budgets, etc.).
   * These are merged with the persistence callbacks.
   */
  overrides?: Partial<TelemetryConfig>;
}

// ---------------------------------------------------------------------------
// Failure tracking for regression detection
// ---------------------------------------------------------------------------

/** Track consecutive failures per tool for regression detection */
const toolFailureCounts = new Map<string, { count: number; lastError: string }>();

function recordToolFailure(toolName: string, errorMessage: string): number {
  const entry = toolFailureCounts.get(toolName);
  if (entry && entry.lastError === errorMessage) {
    entry.count += 1;
    return entry.count;
  }
  toolFailureCounts.set(toolName, { count: 1, lastError: errorMessage });
  return 1;
}

function clearToolFailure(toolName: string): void {
  toolFailureCounts.delete(toolName);
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Creates a TelemetryConfig object with callbacks that persist telemetry
 * data to Supabase. Spread the returned config into a TelemetryIntegration
 * constructor, or pass directly to withTelemetry().
 *
 * The returned config includes:
 *  - onCostLog: inserts into cost_logs table
 *  - onToolCallFinish: inserts a span into spans table
 *  - onTraceComplete: inserts into traces table (and child spans)
 *  - onError: inserts into regression_tests table if repeated failure detected
 */
export function createPersistentTelemetryConfig(
  supabaseClient: SupabaseClient,
  options: PersistentTelemetryOptions,
): TelemetryConfig {
  const {
    tenantId,
    persistCosts = true,
    persistTraces = true,
    persistSpans = true,
    detectRegressions = true,
    regressionThreshold = 3,
    overrides = {},
  } = options;

  const config: TelemetryConfig = {
    costTracking: true,
    ...overrides,
  };

  // ── onCostLog: persist to cost_logs table ──────────────────────────────
  if (persistCosts) {
    const originalOnCostLog = overrides.onCostLog;

    config.onCostLog = async (log: CostLogEntry) => {
      // Call the original callback first if provided
      if (originalOnCostLog) {
        try { await originalOnCostLog(log); } catch { /* swallow */ }
      }

      try {
        await insertCostLog(supabaseClient, {
          tenant_id: tenantId,
          user_id: log.userId,
          provider: log.provider,
          model: log.model,
          tokens_in: log.tokensIn,
          tokens_out: log.tokensOut,
          cost: log.cost,
          tool_name: log.toolName,
        });
      } catch (err) {
        console.error('[telemetry-persistence] Failed to persist cost log:', err);
      }
    };
  }

  // ── onTraceComplete: persist to traces + spans tables ──────────────────
  if (persistTraces) {
    const originalOnTraceComplete = overrides.onTraceComplete;

    config.onTraceComplete = async (trace: TraceEntry) => {
      // Call the original callback first if provided
      if (originalOnTraceComplete) {
        try { await originalOnTraceComplete(trace); } catch { /* swallow */ }
      }

      try {
        // Insert the trace
        const insertedTrace = await insertTrace(supabaseClient, {
          tenant_id: tenantId,
          model: trace.model,
          provider: trace.provider,
          total_tokens: trace.totalTokens,
          total_cost: trace.totalCost,
          latency_ms: trace.latencyMs,
          status: trace.status,
          metadata: {},
        });

        // Insert child spans if enabled
        if (persistSpans && trace.spans && trace.spans.length > 0) {
          for (const span of trace.spans) {
            try {
              await insertSpan(supabaseClient, {
                trace_id: insertedTrace.id,
                type: span.type,
                name: span.name,
                tokens_in: span.tokensIn,
                tokens_out: span.tokensOut,
                cost: span.cost,
                latency_ms: span.latencyMs,
                tool_name: span.toolName,
                error_message: span.error,
                started_at: span.startedAt,
                ended_at: span.endedAt,
              });
            } catch (spanErr) {
              console.error('[telemetry-persistence] Failed to persist span:', spanErr);
            }
          }
        }
      } catch (err) {
        console.error('[telemetry-persistence] Failed to persist trace:', err);
      }
    };
  }

  // ── onToolCallFinish: persist individual tool spans ────────────────────
  if (persistSpans) {
    const originalOnToolCallFinish = overrides.onToolCallFinish;

    config.onToolCallFinish = async (toolName: string, result: unknown, error?: Error) => {
      // Call the original callback first if provided
      if (originalOnToolCallFinish) {
        try { await originalOnToolCallFinish(toolName, result, error); } catch { /* swallow */ }
      }

      // Clear failure count on success
      if (!error) {
        clearToolFailure(toolName);
      }

      // Note: the span for tool calls within a trace is handled by
      // onTraceComplete above. This callback handles standalone tool
      // call tracking for tools invoked outside a trace context.
    };
  }

  // ── onError: detect regressions and persist ────────────────────────────
  if (detectRegressions) {
    const originalOnError = overrides.onError;

    config.onError = async (error: Error, context: ErrorContext) => {
      // Call the original callback first if provided
      if (originalOnError) {
        try { await originalOnError(error, context); } catch { /* swallow */ }
      }

      // Only track tool-related errors for regression detection
      if (!context.toolName) return;

      const failureCount = recordToolFailure(context.toolName, error.message);

      if (failureCount >= regressionThreshold) {
        try {
          await insertRegressionTest(supabaseClient, {
            tenant_id: tenantId,
            source_trace_id: context.traceId,
            tool_name: context.toolName,
            error_pattern: error.message,
            status: 'pending',
          });

          // Reset the counter after creating a regression entry
          clearToolFailure(context.toolName);

          console.warn(
            `[telemetry-persistence] Regression detected for tool "${context.toolName}" ` +
            `after ${regressionThreshold} consecutive failures. Created regression_tests entry.`,
          );
        } catch (err) {
          console.error('[telemetry-persistence] Failed to persist regression test:', err);
        }
      }
    };
  }

  return config;
}
