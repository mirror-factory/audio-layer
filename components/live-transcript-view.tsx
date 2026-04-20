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
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm py-6">
        Waiting for speech...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 py-2">
      {turns.map((turn, i) => (
        <div key={i} className="px-1">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {turn.text}
          </p>
        </div>
      ))}

      {partial && (
        <div className="px-1">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed italic">
            {partial}
            <span className="inline-block w-1 h-3.5 bg-[#14b8a6] ml-0.5 animate-pulse align-middle rounded-full" />
          </p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
