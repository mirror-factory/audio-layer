"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { isTauri } from "@/lib/tauri/bridge";

interface StreamToken {
  token: string;
  meetingId: string;
  expiresAt: number;
  sampleRate: number;
  speechModel: string;
}

interface Turn {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
  final: boolean;
}

interface LiveRecorderProps {
  onTranscriptUpdate: (turns: Turn[], partial: string) => void;
  onSessionEnd: (meetingId: string) => void;
}

type RecorderState = "idle" | "connecting" | "recording" | "finalizing";

export function LiveRecorder({
  onTranscriptUpdate,
  onSessionEnd,
}: LiveRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const tokenRef = useRef<StreamToken | null>(null);
  const partialRef = useRef("");

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setState("connecting");

      // 1. Fetch ephemeral token
      const tokenRes = await fetch("/api/transcribe/stream/token", {
        method: "POST",
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Token request failed (${tokenRes.status})`);
      }
      const token: StreamToken = await tokenRes.json();
      tokenRef.current = token;

      // 2. Get mic
      if (isTauri()) {
        // Tauri native capture not wired here -- fallback to getUserMedia
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 16000 },
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 3. Set up AudioWorklet for PCM downsampling
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      await audioCtx.audioWorklet.addModule("/worklets/pcm-downsampler.js");
      const source = audioCtx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioCtx, "pcm-downsampler");
      workletRef.current = worklet;
      source.connect(worklet);

      // 4. Connect WebSocket to AssemblyAI
      const wsUrl = `wss://api.assemblyai.com/v3/realtime/ws?sample_rate=${token.sampleRate}&token=${token.token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState("recording");
        setDuration(0);
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "turn" || msg.type === "partial_turn") {
            const turn: Turn = {
              speaker: msg.speaker ?? null,
              text: msg.text ?? "",
              start: msg.start ?? 0,
              end: msg.end ?? 0,
              confidence: msg.confidence ?? 0,
              final: msg.type === "turn",
            };

            if (turn.final) {
              turnsRef.current = [...turnsRef.current, turn];
              partialRef.current = "";
            } else {
              partialRef.current = turn.text;
            }

            onTranscriptUpdate(turnsRef.current, partialRef.current);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        cleanup();
        setState("idle");
      };

      ws.onclose = () => {
        // Normal close handled by stop function
      };

      // 5. Wire worklet -> WebSocket audio chunks
      worklet.port.onmessage = (e: MessageEvent) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      cleanup();
      setState("idle");
    }
  }, [onTranscriptUpdate, cleanup]);

  const stop = useCallback(async () => {
    setState("finalizing");
    cleanup();

    const meetingId = tokenRef.current?.meetingId;
    if (!meetingId) {
      setState("idle");
      return;
    }

    try {
      const fullText = turnsRef.current.map((t) => t.text).join(" ");
      const res = await fetch("/api/transcribe/stream/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          text: fullText,
          utterances: turnsRef.current.map((t) => ({
            speaker: t.speaker,
            text: t.text,
            start: t.start,
            end: t.end,
            confidence: t.confidence,
          })),
          durationSeconds: duration,
        }),
      });

      if (!res.ok) throw new Error("Finalize failed");

      onSessionEnd(meetingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize");
      setState("idle");
    }
  }, [cleanup, duration, onSessionEnd]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <button
          onClick={state === "idle" ? start : state === "recording" ? stop : undefined}
          disabled={state === "connecting" || state === "finalizing"}
          className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-200 disabled:opacity-50 ${
            state === "recording"
              ? "bg-[#ef4444] hover:bg-[#dc2626] text-white"
              : "bg-[#14b8a6] hover:bg-[#0d9488] text-white"
          }`}
          aria-label={state === "recording" ? "Stop recording" : "Start recording"}
        >
          {state === "connecting" || state === "finalizing" ? (
            <Loader2 size={28} className="animate-spin" />
          ) : state === "recording" ? (
            <Square size={28} />
          ) : (
            <Mic size={28} />
          )}
        </button>

        {state === "recording" && (
          <span className="absolute inset-0 rounded-full border-2 border-[#14b8a6] animate-ping pointer-events-none" />
        )}
      </div>

      <div className="text-center">
        <div className="text-2xl font-semibold text-[#e5e5e5] tabular-nums">
          {formatDuration(duration)}
        </div>
        <div className="text-xs text-[#737373] mt-1">
          {state === "idle" && "Tap to start live transcription"}
          {state === "connecting" && "Connecting..."}
          {state === "recording" && "Recording — tap to stop"}
          {state === "finalizing" && "Processing..."}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#ef4444] text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}
