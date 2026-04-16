/**
 * AI Debug Panel — Frontend visibility for all AI calls
 *
 * Shows in dev mode only. Displays:
 * - Every AI request: provider, model, tokens, cost, duration
 * - Tool calls per step
 * - Cache hit/miss status
 * - Running cost accumulator
 * - Expandable request details
 *
 * Usage:
 *   // app/layout.tsx
 *   import { AIDebugPanel } from '@/components/ai-debug-panel';
 *
 *   export default function Layout({ children }) {
 *     return (
 *       <html>
 *         <body>
 *           {children}
 *           {process.env.NODE_ENV === 'development' && <AIDebugPanel />}
 *         </body>
 *       </html>
 *     );
 *   }
 *
 * Data source:
 *   The panel reads from a global event bus. Your API route pushes events
 *   via Server-Sent Events (SSE) at /api/ai-debug. The aiLogger's onComplete
 *   callback pushes to this endpoint.
 *
 * OR for simpler setup:
 *   Use @ai-sdk/devtools (localhost:4983) for the full Vercel experience.
 *   This component is for embedding debug info directly in your app.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

interface AILogEntry {
  id: string;
  label: string;
  provider: string;
  modelId: string;
  duration: number;
  steps: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  toolCalls: string[];
  cacheReadTokens: number;
  cacheWriteTokens: number;
  timestamp: number;
}

// ── Cost formatting ───────────────────────────────────────────────────

function formatCost(cost: number): string {
  if (cost < 0.001) return `$${(cost * 1000).toFixed(2)}m`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number): string {
  if (n > 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── Component ─────────────────────────────────────────────────────────

export function AIDebugPanel() {
  const [entries, setEntries] = useState<AILogEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(true);

  // Listen for AI debug events (from SSE or global event bus)
  useEffect(() => {
    // Option 1: Global event bus (simplest — aiLogger pushes to window)
    const handler = (event: CustomEvent<AILogEntry>) => {
      setEntries(prev => [event.detail, ...prev].slice(0, 50)); // Keep last 50
    };

    window.addEventListener('ai-debug' as any, handler);
    return () => window.removeEventListener('ai-debug' as any, handler);
  }, []);

  // Keyboard shortcut: Cmd+Shift+D to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  const totalTokens = entries.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);

  if (!visible) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
          background: '#0a0a0a', color: '#5eead4', border: '1px solid #1a3a35',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, fontFamily: 'monospace',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5eead4', animation: 'pulse 2s infinite' }} />
        AI: {entries.length} calls | {formatCost(totalCost)}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
      width: 420, maxHeight: '60vh',
      background: '#0a0a0a', color: '#e5e5e5', border: '1px solid #1a3a35',
      borderRadius: 12, fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 12,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #1a3a35',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0d1412',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5eead4' }} />
          <span style={{ fontWeight: 700, color: '#5eead4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Debug</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#6b7280' }}>
          <span>{formatTokens(totalTokens)} tokens</span>
          <span style={{ color: '#5eead4', fontWeight: 600 }}>{formatCost(totalCost)}</span>
          <button onClick={() => setMinimized(true)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>—</button>
          <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      </div>

      {/* Entries */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {entries.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#4b5563', fontSize: 11 }}>
            No AI calls yet. Send a message to see requests here.
            <div style={{ marginTop: 8, fontSize: 10, color: '#374151' }}>⌘⇧D to toggle</div>
          </div>
        )}
        {entries.map(entry => (
          <div
            key={entry.id}
            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            style={{
              padding: '8px 14px', borderBottom: '1px solid #111',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#111')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Summary line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#5eead4', fontWeight: 600 }}>{entry.label}</span>
                <span style={{ color: '#4b5563', fontSize: 10 }}>{entry.steps}s</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#6b7280' }}>{formatDuration(entry.duration)}</span>
                <span style={{ color: '#9ca3af' }}>{formatTokens(entry.inputTokens + entry.outputTokens)}</span>
                <span style={{ color: '#5eead4', fontWeight: 600 }}>{formatCost(entry.cost)}</span>
              </div>
            </div>

            {/* Expanded details */}
            {expanded === entry.id && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1a1a1a', fontSize: 11, color: '#9ca3af' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  <span>Provider</span><span style={{ color: '#e5e5e5' }}>{entry.provider}</span>
                  <span>Model</span><span style={{ color: '#e5e5e5' }}>{entry.modelId}</span>
                  <span>Input tokens</span><span style={{ color: '#e5e5e5' }}>{entry.inputTokens.toLocaleString()}</span>
                  <span>Output tokens</span><span style={{ color: '#e5e5e5' }}>{entry.outputTokens.toLocaleString()}</span>
                  <span>Steps</span><span style={{ color: '#e5e5e5' }}>{entry.steps}</span>
                  {entry.toolCalls.length > 0 && (
                    <><span>Tools</span><span style={{ color: '#5eead4' }}>{[...new Set(entry.toolCalls)].join(', ')}</span></>
                  )}
                  {entry.cacheReadTokens > 0 && (
                    <><span>Cache hit</span><span style={{ color: '#22c55e' }}>{entry.cacheReadTokens.toLocaleString()} tokens ({Math.round(entry.cacheReadTokens / entry.inputTokens * 100)}%)</span></>
                  )}
                  {entry.cacheWriteTokens > 0 && (
                    <><span>Cache write</span><span style={{ color: '#eab308' }}>{entry.cacheWriteTokens.toLocaleString()} tokens</span></>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 14px', borderTop: '1px solid #1a3a35', background: '#0d1412',
        display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4b5563',
      }}>
        <span>{entries.length} calls this session</span>
        <button
          onClick={() => setEntries([])}
          style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 10 }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ── Helper: Push events from aiLogger to the debug panel ──────────────

/**
 * Call this from aiLogger's onComplete callback to send data to the panel.
 * Works in the browser (client component) — import in your chat component.
 *
 * Usage in your API route (server-side):
 *   Not directly — the panel reads from client-side events.
 *   The simplest approach: return usage data in the stream response,
 *   then the client pushes to the panel.
 *
 * Usage in client component:
 *   import { pushAIDebugEvent } from '@/components/ai-debug-panel';
 *
 *   // In your useChat onFinish or stream processing:
 *   pushAIDebugEvent({
 *     label: 'chat',
 *     provider: 'google',
 *     modelId: 'gemini-3-flash',
 *     duration: 2300,
 *     steps: 2,
 *     inputTokens: 1240,
 *     outputTokens: 320,
 *     cost: 0.002,
 *     toolCalls: ['searchDocuments'],
 *     cacheReadTokens: 0,
 *     cacheWriteTokens: 0,
 *   });
 */
export function pushAIDebugEvent(data: Omit<AILogEntry, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ai-debug', {
    detail: {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    },
  }));
}
