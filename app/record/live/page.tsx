"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { LiveRecorder } from "@/components/live-recorder";
import { LiveTranscriptView } from "@/components/live-transcript-view";
import { WebGLShader } from "@/components/ui/web-gl-shader";

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
  const [audioLevel, setAudioLevel] = useState(0);
  const [recState, setRecState] = useState<
    "idle" | "connecting" | "recording" | "finalizing"
  >("idle");

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

  const hasTranscript = turns.length > 0 || partial.length > 0;
  const isLiveWorkspace = recState !== "idle" || hasTranscript;
  const shaderState =
    recState === "recording"
      ? "recording"
      : recState === "finalizing"
        ? "summarizing"
        : "idle";

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Layer One" showBack />

      <main className="live-record-shell mx-auto flex w-full flex-1 flex-col px-4 pb-safe py-3 sm:py-5">
        <div
          className={`live-record-workspace ${
            isLiveWorkspace ? "is-recording" : ""
          }`}
        >
          <section className="live-capture-card paper-capture-panel rounded-lg p-4 sm:p-5">
            <div className="live-animated-lines" aria-hidden="true">
              <WebGLShader
                state={shaderState}
                audioLevel={audioLevel}
                className="h-full w-full"
              />
            </div>
            <div className="mt-4 sm:mt-5">
              <LiveRecorder
                onTranscriptUpdate={handleTranscriptUpdate}
                onSessionEnd={handleSessionEnd}
                onAudioLevel={setAudioLevel}
                onStateChange={setRecState}
              />
            </div>
          </section>

          <section
            className={`home-live-transcript-panel live-transcript-panel animate-in fade-in slide-in-from-right-3 duration-500 ${
              isLiveWorkspace ? "flex" : "hidden sm:flex"
            }`}
          >
            <div className="home-live-transcript-heading">
              <p className="signal-eyebrow">Transcript</p>
              <h2>Writing notes live.</h2>
            </div>
            <div
              className="home-live-transcript-scroll"
              style={{ scrollbarWidth: "none" }}
            >
              <LiveTranscriptView turns={turns} partial={partial} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
