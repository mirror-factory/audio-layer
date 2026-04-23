"use client";

import { useRef, useEffect, useState } from "react";

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
    <div className="flex gap-3 items-start group">
      <span className="shrink-0 text-[10px] text-[var(--text-muted)]/60 tabular-nums pt-0.5 w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity select-none">
        {formatTimestamp(turn.start)}
      </span>
      <p className="text-sm text-[var(--text-primary)] leading-relaxed flex-1">
        {displayText}
        {isNew && streamed.length < turn.text.length && (
          <span className="inline-block w-1 h-3.5 bg-[var(--text-muted)] ml-0.5 animate-pulse align-middle rounded-full opacity-40" />
        )}
      </p>
    </div>
  );
}

export function LiveTranscriptView({ turns, partial }: LiveTranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, partial]);

  const newTurnStart = prevTurnCountRef.current;
  useEffect(() => {
    prevTurnCountRef.current = turns.length;
  }, [turns.length]);

  if (turns.length === 0 && !partial) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]/60 animate-pulse" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]/60 animate-pulse" style={{ animationDelay: "300ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]/60 animate-pulse" style={{ animationDelay: "600ms" }} />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2" style={{ scrollbarWidth: "none" }}>
      {turns.map((turn, i) => (
        <StreamedTurn key={i} turn={turn} isNew={i >= newTurnStart} />
      ))}

      {partial && (
        <div className="flex gap-3 items-start">
          <span className="shrink-0 w-10" />
          <p className="text-sm leading-relaxed flex-1">
            <span className="text-[var(--text-muted)]">{partial}</span>
            <span className="inline-block w-1 h-3.5 bg-[#14b8a6] ml-0.5 animate-pulse align-middle rounded-full" />
          </p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
