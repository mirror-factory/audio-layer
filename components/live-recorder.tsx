"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { isElectron } from "@/lib/electron/bridge";

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

  const stateRef = useRef<RecorderState>("idle");
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
      stateRef.current = "connecting"; setState("connecting");

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
      if (isElectron()) {
        // Electron native capture not wired here -- fallback to getUserMedia
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
      // Must connect to destination for process() to fire.
      // Use a silent gain node to avoid playing mic audio through speakers.
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      worklet.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      // 4. Connect WebSocket to AssemblyAI
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${token.sampleRate}&token=${token.token}&speech_model=${token.speechModel}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        stateRef.current = "recording"; setState("recording");
        setDuration(0);
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.message_type === "FinalTranscript") {
            const turn: Turn = {
              speaker: msg.speaker ?? null,
              text: msg.text ?? "",
              start: msg.audio_start ?? 0,
              end: msg.audio_end ?? 0,
              confidence: msg.confidence ?? 0,
              final: true,
            };
            turnsRef.current = [...turnsRef.current, turn];
            partialRef.current = "";
            onTranscriptUpdate(turnsRef.current, partialRef.current);
          } else if (msg.message_type === "PartialTranscript") {
            partialRef.current = msg.text ?? "";
            onTranscriptUpdate(turnsRef.current, partialRef.current);
          }
          // SessionBegins, SessionTerminated — no action needed
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        cleanup();
        stateRef.current = "idle"; setState("idle");
      };

      ws.onclose = (event) => {
        if (event.code !== 1000 && stateRef.current !== "finalizing" && stateRef.current !== "idle") {
          const reason = event.reason || `Connection closed (code ${event.code})`;
          setError(reason);
          cleanup();
          stateRef.current = "idle"; setState("idle");
        }
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
      stateRef.current = "idle"; setState("idle");
    }
  }, [onTranscriptUpdate, cleanup]);

  const stop = useCallback(async () => {
    stateRef.current = "finalizing"; setState("finalizing");
    cleanup();

    const meetingId = tokenRef.current?.meetingId;
    if (!meetingId) {
      stateRef.current = "idle"; setState("idle");
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
      stateRef.current = "idle"; setState("idle");
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
