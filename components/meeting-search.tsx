"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  meetingId: string;
  chunkText: string;
  chunkType: string;
  similarity: number;
  meetingTitle: string | null;
  meetingDate: string;
}

export function MeetingSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 8 }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, [query]);

  const clear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="mb-6">
      <div className="signal-panel relative rounded-lg p-2">
        <Search
          size={16}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search across all meetings..."
          className="signal-input min-h-[44px] w-full rounded-md py-3 pl-10 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:outline-none"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
            aria-label="Clear meeting search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {searched && (
        <div className="mt-3 space-y-2">
          {searching ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse"
                style={{ animationDelay: "200ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse"
                style={{ animationDelay: "400ms" }}
              />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No results found for &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((r, i) => (
              <Link
                key={i}
                href={`/meetings/${r.meetingId}`}
                className="signal-transcript-card block rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {r.meetingTitle ?? "Untitled"}
                  </span>
                  <span className="text-[10px] text-[#14b8a6]">
                    {Math.round(r.similarity * 100)}% match
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                  {r.chunkText}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
