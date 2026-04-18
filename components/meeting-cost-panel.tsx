/**
 * Per-meeting cost + usage panel rendered on /meetings/[id].
 *
 * Data comes from `meetings.cost_breakdown` which the transcribe
 * completion routes persist alongside the summary + intake. The
 * panel is hidden when no breakdown is stored (old rows, or
 * in-memory-dev meetings that predated this feature).
 */

import type { MeetingCostBreakdown } from "@/lib/billing/types";
import { formatUsd } from "@/lib/billing/llm-pricing";

interface Props {
  breakdown: MeetingCostBreakdown;
}

export function MeetingCostPanel({ breakdown }: Props) {
  const minutes = breakdown.stt.durationSeconds / 60;
  return (
    <section
      aria-label="Cost and usage"
      className="rounded-lg border border-neutral-800 bg-neutral-900/40"
    >
      <header className="flex items-baseline justify-between border-b border-neutral-800 px-4 py-2 text-xs">
        <h2 className="font-semibold text-neutral-200">Cost &amp; usage</h2>
        <span className="text-neutral-500">
          {formatUsd(breakdown.totalCostUsd)} total
        </span>
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-3">
        <Tile
          label="Transcription"
          big={formatUsd(breakdown.stt.totalCostUsd)}
          sub={`${minutes.toFixed(1)} min · ${breakdown.stt.mode}`}
          tail={`${breakdown.stt.model} @ $${breakdown.stt.ratePerHour.toFixed(2)}/hr`}
        />
        <Tile
          label="LLM"
          big={formatUsd(breakdown.llm.totalCostUsd)}
          sub={`${breakdown.llm.totalInputTokens.toLocaleString()} in · ${breakdown.llm.totalOutputTokens.toLocaleString()} out`}
          tail={`${breakdown.llm.calls.length} call${breakdown.llm.calls.length === 1 ? "" : "s"}`}
        />
        <Tile
          label="Total"
          big={formatUsd(breakdown.totalCostUsd)}
          sub={`STT + LLM`}
          tail={`this meeting`}
          highlight
        />
      </div>

      {breakdown.llm.calls.length > 0 ? (
        <div className="border-t border-neutral-800 px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            LLM calls
          </h3>
          <ul className="space-y-1 text-xs text-neutral-300">
            {breakdown.llm.calls.map((c, i) => (
              <li
                key={`${c.label}-${i}`}
                className="flex items-baseline justify-between gap-3 rounded-md bg-neutral-950/60 px-3 py-1.5"
              >
                <div className="min-w-0 truncate">
                  <span className="font-medium text-neutral-100">
                    {c.label}
                  </span>
                  <span className="ml-2 text-neutral-500">{c.model}</span>
                </div>
                <div className="flex items-baseline gap-3 text-neutral-400">
                  <span className="font-mono">
                    {c.inputTokens.toLocaleString()}/
                    {c.outputTokens.toLocaleString()}
                  </span>
                  <span className="font-mono text-emerald-300">
                    {formatUsd(c.costUsd)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Tile({
  label,
  big,
  sub,
  tail,
  highlight,
}: {
  label: string;
  big: string;
  sub: string;
  tail: string;
  highlight?: boolean;
}) {
  const bigCls = highlight ? "text-emerald-300" : "text-neutral-100";
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl ${bigCls}`}>{big}</p>
      <p className="mt-0.5 text-xs text-neutral-300">{sub}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{tail}</p>
    </div>
  );
}
