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
  if (!costBreakdown) {
    return (
      <div className="bg-[#171717] rounded-xl p-4 lg:p-6">
        <h3 className="text-sm font-semibold text-[#e5e5e5] mb-4 uppercase tracking-wider">
          Cost Breakdown
        </h3>
        <p className="text-sm text-[#525252]">No cost data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#171717] rounded-xl p-4 lg:p-6">
      <h3 className="text-sm font-semibold text-[#e5e5e5] mb-4 uppercase tracking-wider">
        Cost Breakdown
      </h3>

      {/* 3-column summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
          <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
            STT
          </div>
          <div className="text-lg font-semibold text-[#14b8a6]">
            {formatUsd(costBreakdown.stt.totalCostUsd)}
          </div>
          <div className="text-xs text-[#525252] mt-0.5">
            {costBreakdown.stt.mode} / {costBreakdown.stt.model}
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
          <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
            LLM
          </div>
          <div className="text-lg font-semibold text-[#14b8a6]">
            {formatUsd(costBreakdown.llm.totalCostUsd)}
          </div>
          <div className="text-xs text-[#525252] mt-0.5">
            {costBreakdown.llm.calls.length} call
            {costBreakdown.llm.calls.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
          <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
            Total
          </div>
          <div className="text-lg font-semibold text-[#e5e5e5]">
            {formatUsd(costBreakdown.totalCostUsd)}
          </div>
        </div>
      </div>

      {/* LLM call breakdown table */}
      {costBreakdown.llm.calls.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            LLM Calls
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-2 pr-3 text-[#525252] font-medium">
                    Label
                  </th>
                  <th className="text-left py-2 pr-3 text-[#525252] font-medium">
                    Model
                  </th>
                  <th className="text-right py-2 pr-3 text-[#525252] font-medium">
                    In
                  </th>
                  <th className="text-right py-2 pr-3 text-[#525252] font-medium">
                    Out
                  </th>
                  <th className="text-right py-2 text-[#525252] font-medium">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {costBreakdown.llm.calls.map((call, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]">
                    <td className="py-1.5 pr-3 text-[#a3a3a3]">{call.label}</td>
                    <td className="py-1.5 pr-3 text-[#737373]">
                      {call.model.split("/").pop()}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-[#737373] tabular-nums">
                      {call.inputTokens.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-[#737373] tabular-nums">
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
        </div>
      )}
    </div>
  );
}
