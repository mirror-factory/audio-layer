"use client";

import { ArrowDown } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";

interface Turn {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
  final: boolean;
}

interface LiveTranscriptViewProps {
  turns: Turn[];
  partial: string;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Streams text in character by character to simulate a typing effect.
 */
function useStreamedText(text: string, charsPerFrame: number = 3): string {
  const [visible, setVisible] = useState("");
  const prevTextRef = useRef("");

  useEffect(() => {
    const prev = prevTextRef.current;
    prevTextRef.current = text;

    if (!text) {
      setVisible("");
      return;
    }

    if (text.startsWith(prev) && prev.length > 0) {
      const newPart = text.slice(prev.length);
      let charIndex = 0;
      const interval = setInterval(() => {
        charIndex += charsPerFrame;
        if (charIndex >= newPart.length) {
          setVisible(text);
          clearInterval(interval);
        } else {
          setVisible(prev + newPart.slice(0, charIndex));
        }
      }, 30);
      return () => clearInterval(interval);
    }

    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex += charsPerFrame;
      if (charIndex >= text.length) {
        setVisible(text);
        clearInterval(interval);
      } else {
        setVisible(text.slice(0, charIndex));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [text, charsPerFrame]);

  return visible;
}

function StreamedTurn({ turn, isNew }: { turn: Turn; isNew: boolean }) {
  const streamed = useStreamedText(isNew ? turn.text : "", 4);
  const displayText = isNew ? streamed : turn.text;

  return (
    <article className="live-transcript-line group">
      <div className="live-transcript-line-meta">
        <span className="live-transcript-line-rule" aria-hidden="true" />
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]/70">
          {formatTimestamp(turn.start)}
        </span>
      </div>
      <p>
        {displayText}
        {isNew && streamed.length < turn.text.length && (
          <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse rounded-full bg-[var(--text-muted)] align-middle opacity-40" />
        )}
      </p>
    </article>
  );
}

export function LiveTranscriptView({
  turns,
  partial,
}: LiveTranscriptViewProps) {
  const prevTurnCountRef = useRef(0);
  // Key auto-scroll on segment count, not the streaming partial. ResizeObserver
  // inside the hook keeps sticky users pinned even as the partial line grows.
  const { scrollRef, isAtBottom, hasNewContent, scrollToBottom, onScroll } =
    useStickToBottom(turns.length);

  const newTurnStart = prevTurnCountRef.current;
  useEffect(() => {
    prevTurnCountRef.current = turns.length;
  }, [turns.length]);

  if (turns.length === 0 && !partial) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full bg-layers-mint/60 animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-layers-mint/60 animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-layers-mint/60 animate-pulse"
          style={{ animationDelay: "600ms" }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="space-y-3 overflow-y-auto py-2"
        style={{
          scrollbarWidth: "none",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {turns.map((turn, i) => (
          <StreamedTurn key={i} turn={turn} isNew={i >= newTurnStart} />
        ))}

        {partial && (
          <article className="live-transcript-line is-current">
            <div className="live-transcript-line-meta">
              <span className="h-2 w-2 animate-pulse rounded-full bg-layers-mint" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-layers-mint">
                Live
              </span>
            </div>
            <p>
              <span>{partial}</span>
              <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse rounded-full bg-layers-mint align-middle" />
            </p>
          </article>
        )}
      </div>

      {hasNewContent && !isAtBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="session-transcript-jump"
          aria-label="Jump to live transcript"
        >
          <ArrowDown size={13} aria-hidden="true" />
          Jump to live
        </button>
      )}
    </div>
  );
}
