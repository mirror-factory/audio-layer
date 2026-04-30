"use client";

import { useEffect, useMemo, useRef } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { FileText, MessageSquare, ListChecks, Mail, Target, Users } from "lucide-react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";

interface MeetingChatProps {
  meetingId: string;
  variant?: "default" | "workspace";
}

const templates = [
  {
    label: "Sales",
    icon: FileText,
    prompt:
      "Use this meeting to create a sales discovery brief with pain points, budget signals, decision makers, objections, next steps, risks, and transcript segment citations.",
  },
  {
    label: "Interview",
    icon: Users,
    prompt:
      "Use this meeting to create an interview debrief with candidate strengths, concerns, evidence, follow-ups, and a hiring recommendation.",
  },
  {
    label: "Standup",
    icon: ListChecks,
    prompt:
      "Use this meeting to create a standup summary with progress, blockers, decisions, owners, and action items.",
  },
  {
    label: "Follow-up",
    icon: Mail,
    prompt:
      "Draft a concise follow-up email from this meeting. Include decisions, commitments, owners, deadlines, and cite transcript segments in a notes section.",
  },
  {
    label: "Intake",
    icon: Target,
    prompt:
      "Turn this meeting into an intake record with intent, budget, timeline, decision makers, requirements, pain points, risks, next steps, and segment citations.",
  },
] as const;

export function MeetingChat({ meetingId, variant = "default" }: MeetingChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { meetingId },
      }),
    [meetingId],
  );
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    regenerate,
  } = useChat({
    id: `meeting-${meetingId}`,
    transport,
  });
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function sendTemplate(prompt: string) {
    if (isLoading) return;
    clearError();
    void sendMessage({ text: prompt });
  }

  function retryLastMessage() {
    if (isLoading) return;
    clearError();
    void regenerate();
  }

  const isWorkspace = variant === "workspace";

  return (
    <section
      className={
        isWorkspace
          ? "session-panel session-ask-preview session-meeting-chat"
          : "border border-[var(--border-card)] bg-[var(--bg-card)] rounded-xl overflow-hidden"
      }
      aria-labelledby="meeting-chat-heading"
    >
      <div
        className={
          isWorkspace
            ? "session-meeting-chat-header"
            : "p-4 border-b border-[var(--border-subtle)]"
        }
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[#14b8a6]" aria-hidden />
          <h3
            id="meeting-chat-heading"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            {isWorkspace ? "Ask Layers" : "Ask about this meeting"}
          </h3>
          {isWorkspace && (
            <h2 className="sr-only">Ask about this meeting</h2>
          )}
        </div>
        <div
          className={
            isWorkspace
              ? "session-prompt-chips"
              : "flex flex-wrap gap-2 mt-3"
          }
          aria-label="Meeting templates"
        >
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.label}
                type="button"
                onClick={() => sendTemplate(template.prompt)}
                disabled={isLoading}
                className={
                  isWorkspace
                    ? "session-prompt-button"
                    : "inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border-card)] bg-[var(--bg-secondary)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[#14b8a6]/50 hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/40 disabled:opacity-50"
                }
              >
                {!isWorkspace && <Icon size={14} aria-hidden />}
                {template.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={
          isWorkspace
            ? "session-meeting-chat-messages"
            : "max-h-[420px] min-h-[220px] overflow-y-auto p-4"
        }
        data-testid="meeting-chat-messages"
      >
        {error && (
          <div
            className="mb-4 rounded-lg border border-[#ef4444]/25 bg-[#ef4444]/10 p-3"
            role="status"
            aria-live="polite"
          >
            <div className="text-xs font-medium text-[#ef4444]">
              The assistant could not answer.
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Check the selected model/provider settings, then retry the last message.
            </p>
            <button
              type="button"
              onClick={retryLastMessage}
              disabled={isLoading || messages.length === 0}
              className="mt-3 min-h-8 rounded-md border border-[#ef4444]/25 px-3 text-xs font-medium text-[#ef4444] transition-colors hover:bg-[#ef4444]/10 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center text-center">
            <p className="max-w-sm text-sm text-[var(--text-muted)]">
              Ask for decisions, follow-ups, risks, or a structured template grounded in this transcript.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
      </div>

      <div className={isWorkspace ? "session-meeting-chat-input" : undefined}>
        <ChatInput
          onSend={(text) => {
            clearError();
            void sendMessage({ text });
          }}
          disabled={isLoading}
          placeholder="Ask about this transcript..."
        />
      </div>
    </section>
  );
}
