"use client";

import type { UIMessage } from "ai";
import { ToolCard } from "./tool-card";
import { SILENT_TOOLS } from "@/lib/registry";

export interface ChatMessageProps {
  message: UIMessage;
  addToolOutput: (params: {
    tool: string;
    toolCallId: string;
    output: string;
  }) => void | PromiseLike<void>;
}

export function ChatMessage({ message, addToolOutput }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-neutral-900 text-neutral-100"
        }`}
      >
        {message.parts.map((part, idx) => {
          // Text parts
          if (part.type === "text") {
            return (
              <p key={idx} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }

          // Reasoning parts
          if (part.type === "reasoning") {
            return (
              <details
                key={idx}
                className="my-1 rounded border border-neutral-800 bg-neutral-950 text-xs"
              >
                <summary className="cursor-pointer px-2 py-1 text-neutral-500 hover:text-neutral-300">
                  Thinking...
                </summary>
                <p className="px-2 pb-2 text-neutral-400 whitespace-pre-wrap">
                  {part.text}
                </p>
              </details>
            );
          }

          // Tool parts: part.type starts with 'tool-'
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            const toolName = part.type.slice(5);
            const toolPart = part as unknown as {
              type: string;
              state: string;
              toolCallId: string;
              input: Record<string, unknown>;
              output?: unknown;
            };

            // Silent tools: no visible output
            if (SILENT_TOOLS.has(toolName)) {
              return null;
            }

            // Client-side tool in input-available: show interactive UI
            if (
              toolName === "askQuestion" &&
              toolPart.state === "input-available"
            ) {
              const { question, options } = toolPart.input as {
                question: string;
                options: string[];
              };
              return (
                <ToolCard
                  key={idx}
                  toolName={toolName}
                  state={toolPart.state}
                  input={toolPart.input}
                  output={toolPart.output}
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-neutral-200">
                      {question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => (
                        <button
                          key={option}
                          onClick={() =>
                            addToolOutput({
                              tool: "askQuestion",
                              toolCallId: toolPart.toolCallId,
                              output: JSON.stringify({ selected: option }),
                            })
                          }
                          className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:border-blue-400 hover:bg-blue-500/20"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </ToolCard>
              );
            }

            // askQuestion after user responded: show selection
            if (
              toolName === "askQuestion" &&
              toolPart.state === "output-available"
            ) {
              let selected = "";
              try {
                const parsed =
                  typeof toolPart.output === "string"
                    ? JSON.parse(toolPart.output)
                    : toolPart.output;
                selected = parsed?.selected ?? String(toolPart.output);
              } catch {
                selected = String(toolPart.output);
              }
              return (
                <div
                  key={idx}
                  className="my-1 inline-block rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300"
                >
                  Selected: {selected}
                </div>
              );
            }

            // Default: generic ToolCard for server tools
            return (
              <ToolCard
                key={idx}
                toolName={toolName}
                state={toolPart.state}
                input={toolPart.input}
                output={toolPart.output}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
