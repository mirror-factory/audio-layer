/**
 * Telemetry types for the dev-kit persistence layer.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TelemetryConfig {
  enabled?: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  onError?: (error: Error, context: ErrorContext) => void | Promise<void>;
  onTraceComplete?: (trace: TraceEntry) => void | Promise<void>;
  onCostLog?: (entry: CostLogEntry) => void | Promise<void>;
  onToolCallFinish?: (toolName: string, result: unknown, error?: Error) => void | Promise<void>;
  costTracking?: boolean;
  [key: string]: unknown;
}

export interface CostLogEntry {
  traceId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  tokensOut: number;
  cost: number;
  timestamp: string;
  toolName?: string;
  [key: string]: unknown;
}

export interface TraceEntry {
  id: string;
  name: string;
  model: string;
  input: string;
  output: string;
  startTime: string;
  endTime: string;
  duration: number;
  latencyMs: number;
  tokens: number;
  cost: number;
  status: string;
  error?: string;
  metadata?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spans?: Array<Record<string, any>>;
  [key: string]: unknown;
}

export interface ErrorContext {
  message: string;
  stack?: string;
  source?: string;
  traceId?: string;
  toolName?: string;
}
