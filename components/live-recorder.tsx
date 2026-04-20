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
  /** Called ~15x/sec with mic RMS level 0-1 for audio visualization */
  onAudioLevel?: (level: number) => void;
  /** Called when recorder state changes */
  onStateChange?: (state: "idle" | "connecting" | "recording" | "finalizing") => void;
}

type RecorderState = "idle" | "connecting" | "recording" | "finalizing";

export function LiveRecorder({
  onTranscriptUpdate,
  onSessionEnd,
  onAudioLevel,
  onStateChange,
}: LiveRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<RecorderState>("idle");
  const meterRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    if (meterRef.current) {
      clearInterval(meterRef.current);
      meterRef.current = null;
    }
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
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      worklet.connect(silentGain);

      // Audio level metering for visualization
      if (onAudioLevel) {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        meterRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          onAudioLevel(Math.min(1, rms * 4));
        }, 60);
      }
      silentGain.connect(audioCtx.destination);

      // 4. Connect WebSocket to AssemblyAI
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${token.sampleRate}&token=${token.token}&speech_model=${token.speechModel}&speaker_labels=true&format_turns=true`;
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

          if (msg.type === "Turn") {
            const transcript = msg.transcript ?? msg.utterance ?? "";
            if (msg.end_of_turn) {
              // Finalized turn — add to turns list
              const firstWord = msg.words?.[0];
              const lastWord = msg.words?.[msg.words.length - 1];
              const turn: Turn = {
                speaker: msg.speaker ?? null,
                text: transcript,
                start: firstWord?.start ?? 0,
                end: lastWord?.end ?? 0,
                confidence: firstWord?.confidence ?? 0,
                final: true,
              };
              turnsRef.current = [...turnsRef.current, turn];
              partialRef.current = "";
            } else {
              // Partial turn — show as typing indicator
              partialRef.current = transcript;
            }
            onTranscriptUpdate(turnsRef.current, partialRef.current);
          }
          // Begin, SpeechStarted — no action needed
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

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const isActive = state === "recording" || state === "connecting" || state === "finalizing";
  const wordCount = turnsRef.current.reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0);
  const turnCount = turnsRef.current.length;

  return (
    <div className="w-full">
      {/* Single layout — animates between idle and active states */}
      <div className={`flex items-center transition-all duration-700 ease-out ${
        isActive ? "gap-4 px-2" : "flex-col gap-5"
      }`}>
        {/* Button — centered when idle, slides left when active */}
        <button
          onClick={state === "idle" ? start : state === "recording" ? stop : undefined}
          disabled={state === "connecting" || state === "finalizing"}
          className={`shrink-0 flex items-center justify-center rounded-full transition-all duration-700 ease-out disabled:opacity-50 ${
            isActive
              ? "w-12 h-12 bg-white/5 border border-red-400/40 text-red-400 hover:border-red-400/70 hover:bg-red-400/10"
              : "w-20 h-20 bg-white/5 border-2 border-[#14b8a6]/40 text-[#14b8a6] hover:border-[#14b8a6]/70 hover:text-[#2dd4bf] hover:shadow-[0_0_40px_rgba(20,184,166,0.15)]"
          }`}
          aria-label={isActive ? "Stop recording" : "Start recording"}
        >
          {state === "connecting" || state === "finalizing" ? (
            <Loader2 size={isActive ? 16 : 28} className="animate-spin" />
          ) : state === "recording" ? (
            <Square size={14} fill="currentColor" />
          ) : (
            <Mic size={28} strokeWidth={1.5} />
          )}
        </button>

        {/* Info — centered text when idle, left-aligned details when active */}
        <div className={`transition-all duration-700 ease-out ${
          isActive ? "flex-1 min-w-0 text-left" : "text-center"
        }`}>
          <div className={`flex items-baseline transition-all duration-700 ${
            isActive ? "gap-3" : "justify-center"
          }`}>
            <span className={`font-semibold text-[var(--text-primary)] tabular-nums tracking-tight transition-all duration-700 ${
              isActive ? "text-3xl" : "text-2xl"
            }`}>
              {formatDuration(duration)}
            </span>
            {isActive && (
              <span className="text-xs text-red-400/70 uppercase tracking-wider animate-in fade-in duration-500">
                {state === "finalizing" ? "Processing" : state === "connecting" ? "Connecting" : "Recording"}
              </span>
            )}
          </div>
          {isActive ? (
            <div className="flex items-center gap-4 mt-1 text-xs text-white/40 animate-in fade-in slide-in-from-left-2 duration-500">
              {turnCount > 0 && (
                <span>{turnCount} {turnCount === 1 ? "segment" : "segments"}</span>
              )}
              {wordCount > 0 && (
                <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
              )}
              {turnCount === 0 && <span>Listening...</span>}
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Tap to start live transcription
            </div>
          )}
        </div>

        {/* Live indicator — only when active, fades in */}
        {isActive && (
          <div className="shrink-0 flex items-center gap-1.5 animate-in fade-in duration-700">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] text-red-400/70 uppercase tracking-wider font-medium">
              Live
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center mt-3 max-w-xs mx-auto">{error}</p>
      )}
    </div>
  );
}
