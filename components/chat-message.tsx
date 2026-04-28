"use client";

import type { UIMessage } from "ai";
import { ToolCard } from "./tool-card";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-[#14b8a6] text-[#042f2e]"
            : "signal-transcript-card rounded-bl-sm text-[var(--text-primary)]"
        }`}
      >
        {message.parts?.map((part, i) => {
          if (part.type === "text") {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {part.text}
              </span>
            );
          }

          // Tool parts in v6 have type starting with "tool-" or "dynamic-tool"
          const partAny = part as Record<string, unknown>;
          const partType = partAny.type as string;
          if (partType.startsWith("tool-") || partType === "dynamic-tool") {
            const toolName =
              typeof partAny.toolName === "string"
                ? partAny.toolName
                : partType.replace("tool-", "");
            return (
              <ToolCard
                key={i}
                toolName={toolName}
                args={
                  partAny.input && typeof partAny.input === "object"
                    ? (partAny.input as Record<string, unknown>)
                    : {}
                }
                state={String(partAny.state ?? "call")}
                result={partAny.output}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
