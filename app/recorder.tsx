"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

interface MeetingItem {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  durationSeconds: number | null;
}

type ShaderState = "idle" | "recording" | "summarizing" | "done";

export function RecorderHome() {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<MeetingItem[]>([]);
  const [shaderState, setShaderState] = useState<ShaderState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [meetingsFading, setMeetingsFading] = useState(false);

  useEffect(() => {
    fetch("/api/meetings?limit=5")
      .then((r) => r.json())
      .then((data) => setRecentMeetings(data.items ?? data ?? []))
      .catch(() => {});
  }, []);

  const handleTranscriptUpdate = useCallback(
    (newTurns: Turn[], newPartial: string) => {
      setTurns([...newTurns]);
      setPartial(newPartial);
    },
    [],
  );

  const handleStateChange = useCallback(
    (recState: "idle" | "connecting" | "recording" | "finalizing") => {
      if (recState === "connecting") {
        setMeetingsFading(true);
        setShaderState("idle");
      } else if (recState === "recording") {
        setShaderState("recording");
      } else if (recState === "finalizing") {
        setShaderState("summarizing");
        setAudioLevel(0);
      } else {
        setShaderState("idle");
        setMeetingsFading(false);
      }
    },
    [],
  );

  const handleSessionEnd = useCallback(
    (meetingId: string) => {
      setShaderState("done");
      setTimeout(() => {
        router.push(`/meetings/${meetingId}`);
      }, 2000);
    },
    [router],
  );

  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
  }, []);

  const hasTranscript = turns.length > 0 || partial;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="" />

      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-8 max-w-3xl mx-auto w-full">
        {/* Recorder */}
        <div className="w-full flex flex-col items-center">
          <LiveRecorder
            onTranscriptUpdate={handleTranscriptUpdate}
            onSessionEnd={handleSessionEnd}
            onAudioLevel={handleAudioLevel}
            onStateChange={handleStateChange}
          />
        </div>

        {/* Shader — between mic and transcript, audio-reactive */}
        <div className="w-full mt-8 mb-4" style={{ height: 120 }}>
          <WebGLShader
            audioLevel={audioLevel}
            state={shaderState}
            className="w-full h-full"
          />
        </div>

        {/* Live transcript — fixed height, scrolls internally */}
        {hasTranscript && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="glass-panel rounded-xl p-4 overflow-y-auto" style={{ maxHeight: "40vh", scrollbarWidth: "none" }}>
              <LiveTranscriptView turns={turns} partial={partial} />
            </div>
          </div>
        )}

        {/* Recent Meetings — fades out and slides down when recording starts */}
        <section
          className={`w-full mt-8 transition-all duration-700 ease-out ${
            meetingsFading
              ? "opacity-0 translate-y-8 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest">
              Recent
            </h2>
            <Link
              href="/meetings"
              className="text-xs text-[#14b8a6]/70 hover:text-[#14b8a6] transition-colors"
            >
              View all
            </Link>
          </div>

          {recentMeetings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">
                No meetings yet. Tap the mic to start.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center justify-between rounded-lg px-4 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] transition-colors duration-200"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[var(--text-primary)] truncate">
                      {m.title ?? "Untitled recording"}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(m.createdAt).toLocaleDateString()}
                      {m.durationSeconds
                        ? ` · ${Math.round(m.durationSeconds / 60)} min`
                        : ""}
                    </div>
                  </div>
                  <StatusChip status={m.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "text-emerald-400/80",
    processing: "text-[#14b8a6]/80",
    queued: "text-amber-400/80",
    error: "text-red-400/80",
  };

  return (
    <span className={`text-[10px] font-medium uppercase tracking-wider ${colors[status] ?? colors.processing}`}>
      {status}
    </span>
  );
}
