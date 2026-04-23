"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, MessageSquare, ClipboardList } from "lucide-react";
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
  transcript: "Transcript",
  summary: "Summary",
  intake: "Intake",
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

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
  }, [query]);

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

  const similarityPercent = (sim: number) =>
    `${Math.round(sim * 100)}%`;

  return (
    <div className="min-h-screen-safe flex flex-col">
      <TopBar title="Search" showBack />

      <main className="flex-1 px-4 pb-safe py-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Search input */}
        <div className="flex gap-2">
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
              className="w-full pl-10 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#14b8a6]/40 transition-colors min-h-[44px]"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center justify-center px-5 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-xl min-h-[44px] transition-colors disabled:opacity-50"
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
              const Icon =
                CHUNK_TYPE_ICONS[result.chunkType] ?? FileText;
              return (
                <button
                  key={`${result.meetingId}-${idx}`}
                  onClick={() =>
                    router.push(`/meetings/${result.meetingId}`)
                  }
                  className="w-full text-left bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] rounded-xl p-4 space-y-2 transition-colors"
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
                    <span className="text-xs font-mono text-[#14b8a6] whitespace-nowrap">
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
          <div className="text-center py-12">
            <Search size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Search across all your meeting transcripts, summaries, and intake
              forms.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
