"use client";

import { TOOL_BY_NAME } from "@/lib/registry";

interface ToolCardProps {
  toolName: string;
  state: string;
  input: Record<string, unknown>;
  output?: unknown;
  /** Render slot for interactive content (e.g., clickable options) */
  children?: React.ReactNode;
}

function StateIndicator({ state }: { state: string }) {
  if (state === "output-available") {
    return <span className="text-green-400 text-xs font-bold">done</span>;
  }
  if (state === "output-error") {
    return <span className="text-red-400 text-xs font-bold">error</span>;
  }
  // input-streaming or input-available
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-500 border-t-neutral-200" />
  );
}

export function ToolCard({
  toolName,
  state,
  input,
  output,
  children,
}: ToolCardProps) {
  const meta = TOOL_BY_NAME[toolName];
  const label = meta?.label ?? toolName;

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <span className="ml-auto">
          <StateIndicator state={state} />
        </span>
      </div>

      {/* Body */}
      <div className="p-3 text-sm">
        {/* Input */}
        {input && Object.keys(input).length > 0 && (
          <details className="mb-2" open={state !== "output-available"}>
            <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
              Input
            </summary>
            <pre className="mt-1 overflow-x-auto rounded bg-neutral-950 p-2 text-xs text-neutral-400">
              {JSON.stringify(input, null, 2)}
            </pre>
          </details>
        )}

        {/* Interactive children (e.g., askQuestion options) */}
        {children}

        {/* Output */}
        {state === "output-available" && output !== undefined && (
          <details>
            <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
              Output
            </summary>
            <pre className="mt-1 overflow-x-auto rounded bg-neutral-950 p-2 text-xs text-neutral-400">
              {JSON.stringify(
                typeof output === "string" ? JSON.parse(output) : output,
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
