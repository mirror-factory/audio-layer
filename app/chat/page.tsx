"use client";

import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChatMessage, type ChatMessageProps } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const {
    messages,
    sendMessage,
    addToolOutput,
    status,
  } = useChat({
    // Default transport already uses /api/chat
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit() {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <h1 className="text-sm font-semibold tracking-wide text-neutral-200">
            AI Starter Kit
          </h1>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
            reference
          </span>
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Hub
          </Link>
          <Link
            href="/observability"
            className="ml-auto text-xs text-neutral-500 hover:text-neutral-300"
          >
            Observability
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain p-4"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="py-20 text-center text-sm text-neutral-600">
              <p className="mb-2 text-base text-neutral-400">
                Vercel AI SDK v6 Reference App
              </p>
              <p>
                3 tools: searchDocuments, askQuestion, updateSettings
              </p>
              <p className="mt-1 text-neutral-700">
                Try: &quot;Search for getting started&quot; or &quot;Ask me what
                framework I prefer&quot;
              </p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              addToolOutput={addToolOutput as unknown as ChatMessageProps["addToolOutput"]}
            />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-neutral-500">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input — pb-16 keeps it above the fixed bottom nav */}
      <div className="pb-16">
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
