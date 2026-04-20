"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface ToolCardProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

export function ToolCard({ toolName, args, state, result }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  const stateIcon = {
    call: <Loader2 size={14} className="animate-spin text-[#14b8a6]" />,
    "partial-call": <Loader2 size={14} className="animate-spin text-[#14b8a6]" />,
    result: <CheckCircle2 size={14} className="text-[#22c55e]" />,
    error: <XCircle size={14} className="text-[#ef4444]" />,
  }[state] ?? <Wrench size={14} className="text-[#737373]" />;

  const stateLabel = {
    call: "Running...",
    "partial-call": "Streaming...",
    result: "Complete",
    error: "Error",
  }[state] ?? state;

  return (
    <div className="my-2 bg-[#0a0a0a] border border-[#262626] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#a3a3a3] hover:bg-[#171717] transition-colors duration-200"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Wrench size={12} className="text-[#14b8a6]" />
        <span className="font-medium text-[#d4d4d4]">{toolName}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {stateIcon}
          <span>{stateLabel}</span>
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2 border-t border-[#1a1a1a]">
          <div className="pt-2">
            <span className="text-xs text-[#525252] uppercase tracking-wider">
              Args
            </span>
            <pre className="mt-1 text-xs text-[#a3a3a3] bg-[#171717] p-2 rounded overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <span className="text-xs text-[#525252] uppercase tracking-wider">
                Result
              </span>
              <pre className="mt-1 text-xs text-[#a3a3a3] bg-[#171717] p-2 rounded overflow-x-auto">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
