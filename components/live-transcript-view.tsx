"use client";

import { useRef, useEffect } from "react";

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

export function LiveTranscriptView({ turns, partial }: LiveTranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, partial]);

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
    <div className="space-y-3 py-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
      <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
      {turns.map((turn, i) => (
        <p
          key={i}
          className="text-sm text-[var(--text-primary)] leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          {turn.text}
        </p>
      ))}

      {partial && (
        <p className="text-sm leading-relaxed">
          <span className="text-[var(--text-muted)] italic">{partial}</span>
          <span className="inline-block w-1 h-3.5 bg-[#14b8a6] ml-0.5 animate-pulse align-middle rounded-full" />
        </p>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
