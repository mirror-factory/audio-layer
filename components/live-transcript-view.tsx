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

/**
 * Streams text in character by character to simulate a typing effect.
 * Returns the visible portion of the text.
 */
function useStreamedText(text: string, charsPerFrame: number = 3): string {
  const [visible, setVisible] = useState("");
  const prevTextRef = useRef("");

  useEffect(() => {
    // If text changed, figure out what's new
    const prev = prevTextRef.current;
    prevTextRef.current = text;

    if (!text) {
      setVisible("");
      return;
    }

    // If text is an extension of what we had, stream the new chars
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

    // Completely new text — stream from start
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

/**
 * A single finalized turn that streams in when first appearing.
 */
function StreamedTurn({ text, isNew }: { text: string; isNew: boolean }) {
  const streamed = useStreamedText(isNew ? text : "", 4);
  const displayText = isNew ? streamed : text;

  return (
    <p className="text-sm text-[var(--text-primary)] leading-relaxed">
      {displayText}
      {isNew && streamed.length < text.length && (
        <span className="inline-block w-1 h-3.5 bg-[var(--text-muted)] ml-0.5 animate-pulse align-middle rounded-full opacity-40" />
      )}
    </p>
  );
}

export function LiveTranscriptView({ turns, partial }: LiveTranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, partial]);

  // Track which turns are "new" (just appeared) for streaming effect
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
        <StreamedTurn key={i} text={turn.text} isNew={i >= newTurnStart} />
      ))}

      {partial && (
        <p className="text-sm leading-relaxed">
          <span className="text-[var(--text-muted)]">{partial}</span>
          <span className="inline-block w-1 h-3.5 bg-[#14b8a6] ml-0.5 animate-pulse align-middle rounded-full" />
        </p>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
