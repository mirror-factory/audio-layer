/**
 * Model router -- single entry point for every model call in the app.
 *
 * Priority order:
 *   1. USE_LOCAL_MODELS=true            -> Ollama (local dev, free)
 *   2. Claude Code subscription auth     -> AI Gateway via subscription token
 *                                           (dev mode, zero API credit burn)
 *   3. AI_GATEWAY_API_KEY                -> AI Gateway (production default)
 *   4. Unconfigured                      -> throws with actionable error
 *
 * Dev mode (Claude Code):
 *   Claude Code exports CLAUDECODE=1 + ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN
 *   into any subprocess it spawns. `pnpm dev` inherits those, and this
 *   router detects them and routes calls through the Gateway using the
 *   subscription-backed token. Tokens bill against your Claude Max / Pro
 *   subscription, not an API key. See:
 *     https://vercel.com/docs/agent-resources/coding-agents/claude-code
 *
 * Required env for dev mode (exported by Claude Code; verify with
 * `env | grep -E 'CLAUDECODE|ANTHROPIC'`):
 *   CLAUDECODE=1
 *   ANTHROPIC_BASE_URL=https://ai-gateway.vercel.sh
 *   ANTHROPIC_AUTH_TOKEN=<gateway-subscription-token>
 *   ANTHROPIC_API_KEY=""        # must be empty or absent; preempts AUTH_TOKEN
 *
 * Gotcha (anthropics/claude-agent-sdk-python#573):
 *   A process spawned from Claude Code that itself spawns another Claude
 *   session will be refused. Unset CLAUDECODE in child env for SDK calls
 *   that invoke `claude`.
 */

import { createGateway, type GatewayProvider } from '@ai-sdk/gateway';

const isDev = process.env.NODE_ENV === 'development';

function useLocalModels(): boolean {
  return process.env.USE_LOCAL_MODELS === 'true';
}

/**
 * Detect whether Claude Code's subscription auth is available.
 * True only when all three conditions hold:
 *   - Process inherited CLAUDECODE=1
 *   - ANTHROPIC_BASE_URL points at Vercel's gateway
 *   - ANTHROPIC_API_KEY is NOT set (empty string or absent -- an API key
 *     preempts the subscription token and causes 401s)
 */
function hasClaudeCodeAuth(): boolean {
  return (
    process.env.CLAUDECODE === '1' &&
    Boolean(process.env.ANTHROPIC_AUTH_TOKEN) &&
    (process.env.ANTHROPIC_BASE_URL?.includes('ai-gateway.vercel.sh') ?? false) &&
    !process.env.ANTHROPIC_API_KEY
  );
}

/**
 * Which auth path is currently active. Used by /api/health and doctor
 * to cross-check that dev projects are actually routing through the
 * subscription, and not quietly burning API credits.
 */
export function authMode(): 'ollama' | 'claude-code' | 'gateway-key' | 'unconfigured' {
  if (useLocalModels()) return 'ollama';
  if (isDev && hasClaudeCodeAuth()) return 'claude-code';
  if (process.env.AI_GATEWAY_API_KEY) return 'gateway-key';
  return 'unconfigured';
}

/**
 * Configured AI Gateway. Source of truth for every AI SDK call:
 *   gateway('anthropic/claude-sonnet-4.5')
 *   gateway('openai/gpt-4.1')
 * The AI SDK picks up the provider prefix automatically.
 */
export const gateway: GatewayProvider =
  isDev && hasClaudeCodeAuth()
    ? createGateway({
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN!,
        baseURL: process.env.ANTHROPIC_BASE_URL ?? 'https://ai-gateway.vercel.sh',
      })
    : createGateway({
        // createGateway reads AI_GATEWAY_API_KEY by default; no throw if
        // absent so unconfigured projects get a clear error at first call
        // rather than a cryptic init-time failure.
        apiKey: process.env.AI_GATEWAY_API_KEY,
      });

/**
 * Semantic model aliases. Use these instead of raw string IDs so a
 * vendor's model rename only has to be updated in one place.
 *
 * Tune the assignments as Claude's model lineup evolves. The aliases are
 * calibrated against claude-opus-4-6 / claude-sonnet-4-5 / claude-haiku-4-5
 * as of 2026-04-17.
 */
export const models = {
  planner: 'anthropic/claude-opus-4.6',
  generator: 'anthropic/claude-sonnet-4.5',
  evaluator: 'anthropic/claude-sonnet-4.5',
  judge: 'anthropic/claude-haiku-4.5',
  classifier: 'anthropic/claude-haiku-4.5',
} as const;

export type ChatMode = 'fast' | 'smart';
export type ImageMode = 'fast' | 'hq';
