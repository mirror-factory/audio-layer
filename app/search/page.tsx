"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  FileText,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";

interface SearchResultItem {
  meetingId: string;
  chunkText: string;
  chunkType: string;
  similarity: number;
  meetingTitle: string | null;
  meetingDate: string;
}

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

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const trimmed = (overrideQuery ?? query).trim();
      if (!trimmed) return;

      setQuery(trimmed);
      setLoading(true);
      setSearched(true);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, limit: 20 }),
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const similarityPercent = (sim: number) => `${Math.round(sim * 100)}%`;

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col">
      <TopBar title="Search" showBack />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 pb-safe py-6">
        <section className="signal-panel rounded-lg p-4 sm:p-5">
          <p className="signal-eyebrow">Search</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Find anything from a meeting.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Search decisions, names, follow-ups, and notes without opening every
            recording.
          </p>
        </section>

        {/* Search input */}
        <div className="signal-panel search-box flex flex-col gap-2 rounded-lg p-2 sm:flex-row">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search meetings..."
              className="signal-input min-h-[44px] w-full rounded-md py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:outline-none"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="search-submit flex min-h-[44px] items-center justify-center rounded-md bg-[#14b8a6] px-5 text-sm font-semibold text-[#042f2e] transition-colors hover:bg-[#2dd4bf] disabled:cursor-not-allowed disabled:bg-[var(--surface-control)] disabled:text-[var(--text-muted)] disabled:opacity-100"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-[#14b8a6] animate-spin" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
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

            {results.map((result, idx) => {
              const Icon = CHUNK_TYPE_ICONS[result.chunkType] ?? FileText;
              return (
                <button
                  key={`${result.meetingId}-${idx}`}
                  onClick={() => router.push(`/meetings/${result.meetingId}`)}
                  className="signal-transcript-card w-full rounded-lg p-4 text-left transition-colors hover:bg-[var(--bg-card-hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {result.meetingTitle ?? "Untitled Meeting"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                          <Icon size={12} />
                          {CHUNK_TYPE_LABELS[result.chunkType] ??
                            result.chunkType}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {formatDate(result.meetingDate)}
                        </span>
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-[#14b8a6]">
                      {similarityPercent(result.similarity)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                    {result.chunkText}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {!searched && (
          <div className="signal-panel rounded-lg px-5 py-8">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14b8a6]/10 text-[#14b8a6]">
                <Search size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-[var(--text-primary)]">
                  Search your meeting memory
                </h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                  Ask for decisions, objections, dates, people, or follow-ups.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSearch(suggestion)}
                  className="min-h-[36px] rounded-md border border-[var(--border-card)] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:border-[#14b8a6]/35 hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
