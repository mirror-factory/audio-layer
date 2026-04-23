"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { LiveRecorder } from "@/components/live-recorder";
import { LiveTranscriptView } from "@/components/live-transcript-view";

interface Turn {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
  final: boolean;
}

export default function LiveRecordPage() {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");

  const handleTranscriptUpdate = useCallback(
    (newTurns: Turn[], newPartial: string) => {
      setTurns(newTurns);
      setPartial(newPartial);
    },
    [],
  );

  const handleSessionEnd = useCallback(
    (meetingId: string) => {
      router.push(`/meetings/${meetingId}`);
    },
    [router],
  );

  return (
    <div className="min-h-screen-safe flex flex-col">
      <TopBar title="Live Recording" showBack />

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="px-4 py-6">
          <LiveRecorder
            onTranscriptUpdate={handleTranscriptUpdate}
            onSessionEnd={handleSessionEnd}
          />
        </div>

        <div className="flex-1 border-t border-[#262626]">
          <LiveTranscriptView turns={turns} partial={partial} />
        </div>
      </main>
    </div>
  );
}
