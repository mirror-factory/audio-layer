"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Search,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";

interface SearchResultItem {
  meetingId: string;
  chunkText: string;
  chunkType: string;
  similarity: number;
  meetingTitle: string | null;
  meetingDate: string;
}

type AskMode = "ask" | "find";

const CHUNK_TYPE_ICONS: Record<string, typeof FileText> = {
  transcript: FileText,
  summary: MessageSquare,
  intake: ClipboardList,
};

const CHUNK_TYPE_LABELS: Record<string, string> = {
  transcript: "Notes",
  summary: "Summary",
  intake: "Details",
};

const SUGGESTED_QUERIES = [
  "open action items",
  "pricing decisions",
  "customer objections",
  "next follow-ups",
];

const ASK_PROMPTS = [
  "What needs follow-up?",
  "Find the latest pricing decision",
  "Summarize this week",
];

export default function AskPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AskMode>("ask");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } = useChat();
  const isChatLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const trimmed = (overrideQuery ?? query).trim();
      if (!trimmed) return;

      setQuery(trimmed);
      setMode("find");
      setLoading(true);
      setSearched(true);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, limit: 20 }),
        });
        const data = res.ok ? await res.json() : { results: [] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const sendPrompt = (text: string) => {
    setMode("ask");
    sendMessage({ text });
  };

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col">
      <TopBar title="Ask" />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 pb-[calc(5.5rem+var(--safe-bottom))] py-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-6">
        <section className="signal-panel flex min-h-[520px] flex-col rounded-lg p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="signal-eyebrow">Meeting memory</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Ask or find anything.
              </h2>
            </div>
            <div className="grid min-h-[40px] grid-cols-2 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-1">
              {(["ask", "find"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-md px-4 text-sm font-medium transition-colors ${
                    mode === item
                      ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={mode === item}
                >
                  {item === "ask" ? "Ask" : "Find"}
                </button>
              ))}
            </div>
          </div>

          {mode === "ask" ? (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-[var(--surface-control)]/35 p-3"
                style={{ scrollbarWidth: "none" }}
              >
                {messages.length === 0 ? (
                  <EmptyAskState onPrompt={sendPrompt} />
                ) : (
                  messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                )}
              </div>
              <div className="pt-3">
                <ChatInput onSend={sendPrompt} disabled={isChatLoading} />
              </div>
            </>
          ) : (
            <FindPanel
              query={query}
              setQuery={setQuery}
              loading={loading}
              searched={searched}
              results={results}
              onSearch={handleSearch}
              onOpenMeeting={(id) => router.push(`/meetings/${id}`)}
            />
          )}
        </section>

        <aside className="signal-panel hidden rounded-lg p-4 lg:block">
          <p className="signal-eyebrow">Quick finds</p>
          <div className="mt-4 space-y-2">
            {SUGGESTED_QUERIES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSearch(suggestion)}
                className="w-full rounded-md border border-[var(--border-card)] px-3 py-3 text-left text-sm text-[var(--text-secondary)] transition-colors hover:border-[#14b8a6]/35 hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function EmptyAskState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-[#14b8a6]/25 bg-[#14b8a6]/10 text-[#14b8a6]">
        <MessageSquare size={18} />
      </div>
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Ask across every meeting.
      </p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--text-muted)]">
        Pull decisions, owners, objections, and follow-ups from your library.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {ASK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className="signal-chip signal-chip-neutral transition-colors hover:border-[#14b8a6]/35 hover:text-[var(--text-primary)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FindPanel({
  query,
  setQuery,
  loading,
  searched,
  results,
  onSearch,
  onOpenMeeting,
}: {
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  searched: boolean;
  results: SearchResultItem[];
  onSearch: (query?: string) => void;
  onOpenMeeting: (meetingId: string) => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onSearch();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="signal-panel-subtle search-box flex flex-col gap-2 rounded-lg p-1 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search meetings..."
            className="signal-input min-h-[44px] w-full rounded-md py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => onSearch()}
          disabled={loading || !query.trim()}
          className="search-submit flex min-h-[44px] items-center justify-center rounded-md bg-[#14b8a6] px-5 text-sm font-semibold text-[#042f2e] transition-colors hover:bg-[#2dd4bf] disabled:cursor-not-allowed disabled:bg-[var(--surface-control)] disabled:text-[var(--text-muted)] disabled:opacity-100"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Search"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#14b8a6]" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No results found. Try a different search term.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((result, index) => (
              <SearchResult
                key={`${result.meetingId}-${index}`}
                result={result}
                onOpen={() => onOpenMeeting(result.meetingId)}
              />
            ))}
          </div>
        )}

        {!searched && (
          <div className="signal-panel-subtle rounded-lg px-2 py-8">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14b8a6]/10 text-[#14b8a6]">
                <Search size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Find the exact note.
                </h3>
                <p className="mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                  Search decisions, objections, dates, people, or follow-ups.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSearch(suggestion)}
                  className="min-h-[36px] rounded-md border border-[var(--border-card)] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:border-[#14b8a6]/35 hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResult({
  result,
  onOpen,
}: {
  result: SearchResultItem;
  onOpen: () => void;
}) {
  const Icon = CHUNK_TYPE_ICONS[result.chunkType] ?? FileText;
  const date = new Date(result.meetingDate);
  const dateLabel = Number.isNaN(date.getTime())
    ? result.meetingDate
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="signal-transcript-card w-full rounded-lg p-4 text-left transition-colors hover:bg-[var(--bg-card-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">
            {result.meetingTitle ?? "Untitled meeting"}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <Icon size={12} />
              {CHUNK_TYPE_LABELS[result.chunkType] ?? result.chunkType}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {dateLabel}
            </span>
          </div>
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-[#14b8a6]">
          {Math.round(result.similarity * 100)}%
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {result.chunkText}
      </p>
    </button>
  );
}
