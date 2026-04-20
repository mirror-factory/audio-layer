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
      <div className="flex-1 flex items-center justify-center text-[#525252] text-sm">
        Waiting for speech...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {turns.map((turn, i) => (
        <div key={i} className="flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-xs font-semibold text-[#a3a3a3]">
            {turn.speaker ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-[#737373] font-medium">
              {turn.speaker ? `Speaker ${turn.speaker}` : "Unknown"}
            </span>
            <p className="text-sm text-[#d4d4d4] mt-0.5 leading-relaxed">
              {turn.text}
            </p>
          </div>
        </div>
      ))}

      {partial && (
        <div className="flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-[#134e4a] flex items-center justify-center text-xs font-semibold text-[#14b8a6]">
            ...
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#a3a3a3] mt-0.5 leading-relaxed italic">
              {partial}
              <span className="inline-block w-1.5 h-4 bg-[#14b8a6] ml-0.5 animate-pulse align-middle" />
            </p>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
