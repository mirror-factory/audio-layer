"use client";

/**
 * Simplified observability page.
 *
 * In production, import from the starter kit template:
 *   import ObservabilityPage from '../../templates/ai-observability-page';
 *
 * This inline version shows the pattern without external dependencies.
 */

export default function ObservabilityPage() {
  return (
    <div className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-lg font-semibold text-neutral-200">
            AI Observability
          </h1>
          <p className="text-sm text-neutral-500">
            Monitor AI calls, costs, and errors. In production, this page
            connects to file-based or Supabase log backends via{" "}
            <code className="rounded bg-neutral-800 px-1 py-0.5 text-xs text-neutral-300">
              /api/ai-logs
            </code>
            .
          </p>
        </header>

        {/* Placeholder cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Calls", value: "--" },
            { label: "Total Cost", value: "$--" },
            { label: "Error Rate", value: "--%"  },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <p className="text-xs text-neutral-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-200">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-500 md:p-6">
          <p>No log data available.</p>
          <p className="mt-2 text-xs text-neutral-600">
            AI calls are logged to{" "}
            <code className="text-neutral-400">.ai-logs/</code> by default.
            Send a few chat messages, then refresh this page.
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            See{" "}
            <code className="text-neutral-400">
              templates/ai-observability-page.tsx
            </code>{" "}
            for the full dashboard with tabs, charts, and session tracking.
          </p>
        </div>

        <a
          href="/chat"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-700 px-4 py-2 text-xs text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
        >
          Back to Chat
        </a>
      </div>
    </div>
  );
}
