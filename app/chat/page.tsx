"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
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
    <div className="min-h-screen flex flex-col">
      <TopBar title="Chat" showBack />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <p className="text-sm text-[#525252]">
              Start a conversation with the AI assistant.
            </p>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}
      </div>

      <div className="max-w-3xl mx-auto w-full">
        <ChatInput
          onSend={(text) => {
            sendMessage({ text });
          }}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
