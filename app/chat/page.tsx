"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "streaming" || status === "submitted";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col">
      <TopBar title="Chat" showBack />

      <main className="mx-auto flex w-full max-w-3xl flex-1 overflow-hidden px-4 py-4">
        <div
          ref={scrollRef}
          className="signal-panel min-h-0 flex-1 overflow-y-auto rounded-lg p-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-[#14b8a6]/25 bg-[#14b8a6]/10 text-[#5eead4]">
                <MessageSquare size={18} />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Ask anything from your meeting library.
              </p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--text-muted)]">
                Ask across meetings, pull summaries, or turn notes into next
                steps.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {[
                  "Find decisions",
                  "Draft follow-up",
                  "Summarize this week",
                ].map((prompt) => (
                  <span
                    key={prompt}
                    className="signal-chip signal-chip-neutral"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          )}
        </div>
      </main>

      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSend={(text) => {
              sendMessage({ text });
            }}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
