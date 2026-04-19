/**
 * AI SDK DevTools Setup
 *
 * Wraps the model with devToolsMiddleware for local debugging.
 * Launch viewer: npx @ai-sdk/devtools
 * Open: http://localhost:4983
 *
 * WARNING: Dev only. Do not enable in production.
 */

import { devToolsMiddleware } from '@ai-sdk/devtools';
import { wrapLanguageModel } from 'ai';

/**
 * Wrap any model with DevTools middleware for local inspection.
 * Usage:
 *   const model = withDevTools(anthropic('claude-sonnet-4-20250514'));
 */
export function withDevTools<T>(model: T): T {
  if (process.env.NODE_ENV !== 'development') return model;
  return wrapLanguageModel({ model: model as any, middleware: devToolsMiddleware() }) as T;
}
