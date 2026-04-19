'use client';

/**
 * /dev-kit/registries -- dynamic view of every vendor registry.
 *
 * Reads /api/dev-kit/registries (which reads .ai-dev-kit/registries/*.json).
 * Shows models, pricing, deprecations, and staleness per vendor. Link out
 * to each vendor's docs and console.
 */

import { useEffect, useState } from 'react';

interface ModelEntry {
  id: string;
  label?: string;
  description?: string;
  price_per_hour_usd?: number;
  input_price_per_million_usd?: number;
  output_price_per_million_usd?: number;
  price_per_million_chars_usd?: number;
  price_notes?: string;
  use_for?: string;
  context_window?: number;
  deprecated?: boolean;
}
interface Registry {
  vendor: string;
  label?: string;
  docs_root?: string;
  console_url?: string;
  validated_on: string;
  ageDays: number;
  stale: boolean;
  required_env?: string[];
  deprecations?: Array<{ pattern: string; deprecated_on: string; replacement: string; notes?: string }>;
  slots: Record<string, ModelEntry[]>;
  error?: string;
}

function priceCell(m: ModelEntry): string {
  if (m.price_per_hour_usd != null) return `$${m.price_per_hour_usd.toFixed(2)}/hr${m.price_notes ? ' ' + m.price_notes : ''}`;
  if (m.input_price_per_million_usd != null && m.output_price_per_million_usd != null) {
    return `$${m.input_price_per_million_usd.toFixed(2)} / $${m.output_price_per_million_usd.toFixed(2)} per 1M`;
  }
  if (m.price_per_million_chars_usd != null) return `$${m.price_per_million_chars_usd.toFixed(2)} per 1M chars`;
  return '—';
}

export default function RegistriesPage() {
  const [data, setData] = useState<Registry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dev-kit/registries', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(`${r.status}`))
      .then(d => setData(Array.isArray(d) ? d : d.registries ?? []))
      .catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ padding: 24 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 24 }}>Loading&hellip;</div>;

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 900 }}>
        <h1 style={{ fontSize: 22 }}>Vendor Registries</h1>
        <p>No vendor registries yet. Add one for each external API your project calls:</p>
        <pre style={{ background: '#111', color: '#3dffc0', padding: 14, borderRadius: 4, overflowX: 'auto' }}>
{`ai-dev-kit registry add assemblyai
# in Claude Code:
@spec-enricher populate the assemblyai registry`}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Vendor Registries</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Source of truth for valid model IDs, pricing, and deprecation patterns.
        Pre-commit blocks hardcoded strings not in a registry.
      </p>

      {data.map(reg => (
        <section key={reg.vendor} style={{ marginBottom: 36, border: '1px solid #eee', borderRadius: 6, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>{reg.label ?? reg.vendor}</h2>
            <span style={{
              fontFamily: 'monospace', fontSize: 11,
              padding: '2px 8px', borderRadius: 3,
              background: reg.stale ? '#f59e0b22' : '#22c55e22',
              color: reg.stale ? '#f59e0b' : '#22c55e',
            }}>{reg.stale ? `stale (${reg.ageDays}d)` : `fresh (${reg.ageDays}d)`}</span>
          </div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
            {reg.docs_root && <>docs: <a href={reg.docs_root} target="_blank" rel="noreferrer">{reg.docs_root}</a> · </>}
            {reg.console_url && <>console: <a href={reg.console_url} target="_blank" rel="noreferrer">{reg.console_url}</a> · </>}
            validated {reg.validated_on}
          </div>
          {reg.required_env && reg.required_env.length > 0 && (
            <div style={{ fontSize: 12, marginBottom: 14 }}>
              <strong>Env: </strong>
              {reg.required_env.map(k => <code key={k} style={{ background: '#f4f4f4', padding: '2px 6px', marginRight: 6, borderRadius: 3 }}>{k}</code>)}
            </div>
          )}

          {Object.entries(reg.slots).map(([slotName, models]) => (
            <div key={slotName} style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 6px', color: '#555' }}>{slotName.replace('_models', ' models').replace(/_/g, ' ')}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ textAlign: 'left', color: '#888' }}>
                  <th>ID</th><th>Pricing</th><th>Use for</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.id} style={{ borderTop: '1px solid #eee', opacity: m.deprecated ? 0.5 : 1 }}>
                      <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{m.id}</td>
                      <td>{priceCell(m)}</td>
                      <td style={{ color: '#666' }}>{m.use_for ?? '—'}</td>
                      <td><span style={{
                        fontFamily: 'monospace', fontSize: 11,
                        padding: '2px 6px', borderRadius: 3,
                        background: m.deprecated ? '#ef444422' : '#22c55e22',
                        color: m.deprecated ? '#ef4444' : '#22c55e',
                      }}>{m.deprecated ? 'deprecated' : 'active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
