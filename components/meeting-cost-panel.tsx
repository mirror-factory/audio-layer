"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MeetingCostBreakdown } from "@/lib/billing/types";

interface MeetingCostPanelProps {
  costBreakdown: MeetingCostBreakdown | null;
}

function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function MeetingCostPanel({ costBreakdown }: MeetingCostPanelProps) {
  const [open, setOpen] = useState(false);

  if (!costBreakdown) return null;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Cost
          </h3>
          <span className="text-xs text-[#14b8a6] tabular-nums font-medium">
            {formatUsd(costBreakdown.totalCostUsd)}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--bg-primary)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                STT
              </div>
              <div className="text-sm font-semibold text-[#14b8a6] tabular-nums">
                {formatUsd(costBreakdown.stt.totalCostUsd)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                {costBreakdown.stt.model}
              </div>
            </div>

            <div className="bg-[var(--bg-primary)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                LLM
              </div>
              <div className="text-sm font-semibold text-[#14b8a6] tabular-nums">
                {formatUsd(costBreakdown.llm.totalCostUsd)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {costBreakdown.llm.calls.length} call{costBreakdown.llm.calls.length !== 1 ? "s" : ""}
              </div>
            </div>

            {costBreakdown.embedding && (
              <div className="bg-[var(--bg-primary)] rounded-lg p-3 text-center">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Embed
                </div>
                <div className="text-sm font-semibold text-[#14b8a6] tabular-nums">
                  {formatUsd(costBreakdown.embedding.totalCostUsd)}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                  {costBreakdown.embedding.totalTokens.toLocaleString()} tok
                </div>
              </div>
            )}
          </div>

          {costBreakdown.llm.calls.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-card)]">
                    <th className="text-left py-2 pr-3 text-[var(--text-muted)] font-medium">Label</th>
                    <th className="text-left py-2 pr-3 text-[var(--text-muted)] font-medium">Model</th>
                    <th className="text-right py-2 pr-3 text-[var(--text-muted)] font-medium">In</th>
                    <th className="text-right py-2 pr-3 text-[var(--text-muted)] font-medium">Out</th>
                    <th className="text-right py-2 text-[var(--text-muted)] font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costBreakdown.llm.calls.map((call, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)]">
                      <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{call.label}</td>
                      <td className="py-1.5 pr-3 text-[var(--text-muted)] truncate max-w-[120px]">
                        {call.model.split("/").pop()}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">
                        {call.inputTokens.toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">
                        {call.outputTokens.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right text-[#14b8a6] tabular-nums">
                        {formatUsd(call.costUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
