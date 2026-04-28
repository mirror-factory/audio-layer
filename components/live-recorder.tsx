"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  type LucideIcon,
  Loader2,
  Mic,
  Square,
} from "lucide-react";
import { isElectron } from "@/lib/electron/bridge";
import {
  clearLocalRecordingDraft,
  saveLocalRecordingDraft,
} from "@/lib/recording/local-draft";
import {
  microphoneUnsupportedMessage,
  recordingStartErrorMessage,
} from "@/lib/recording/microphone-errors";
import {
  formatRecordingContextTime,
  type RecordingMeetingContext,
} from "@/lib/recording/meeting-context";
import {
  buildRecordingVoiceDirective,
  parseRecordingVoiceCommand,
  type RecordingVoiceDirective,
} from "@/lib/recording/voice-commands";
import type {
  RecordingPreflightCheckStatus,
  RecordingPreflightResponse,
} from "@/lib/recording/preflight";

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
  meetingContext?: RecordingMeetingContext | null;
  /** Called ~15x/sec with mic RMS level 0-1 for audio visualization */
  onAudioLevel?: (level: number) => void;
  /** Called when recorder state changes */
  onStateChange?: (
    state: "idle" | "connecting" | "recording" | "finalizing",
  ) => void;
}

type RecorderState = "idle" | "connecting" | "recording" | "finalizing";
type RecorderConnectionStatus =
  | "idle"
  | "checking-mic"
  | "creating-session"
  | "connecting-provider"
  | "listening"
  | "transcribing"
  | "reconnecting"
  | "finalizing"
  | "provider-issue";
type SaveStatus = "idle" | "local" | "syncing" | "remote";

interface ReadinessCheck {
  id: string;
  label: string;
  status: RecordingPreflightCheckStatus;
  detail: string;
}

function connectionStatusLabel(status: RecorderConnectionStatus): string {
  switch (status) {
    case "checking-mic":
      return "Checking mic";
    case "creating-session":
      return "Starting";
    case "connecting-provider":
      return "Connecting";
    case "listening":
      return "Listening";
    case "transcribing":
      return "Writing notes";
    case "reconnecting":
      return "Reconnecting";
    case "finalizing":
      return "Saving";
    case "provider-issue":
      return "Connection issue";
    default:
      return "Ready";
  }
}

function saveStatusLabel(
  status: SaveStatus,
  draftSavedAt: Date | null,
): string {
  switch (status) {
    case "syncing":
      return "Saving";
    case "remote":
      return "Saved";
    case "local":
      return draftSavedAt
        ? `Saved here ${draftSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : "Saved here";
    default:
      return "Autosave ready";
  }
}

function readinessClass(status: RecordingPreflightCheckStatus): string {
  if (status === "ready")
    return "border-[#14b8a6]/20 bg-[#14b8a6]/[0.06] text-[#14b8a6]";
  if (status === "blocked") {
    return "border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error)]";
  }
  if (status === "warning")
    return "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#f59e0b]";
  return "border-[var(--border-card)] bg-[var(--surface-control)] text-[var(--text-muted)]";
}

function friendlyReadinessCopy(check: ReadinessCheck): {
  label: string;
  detail: string;
} {
  if (check.status === "blocked") {
    return { label: check.label, detail: check.detail };
  }

  switch (check.id) {
    case "microphone":
      return {
        label: "Microphone",
        detail: check.status === "ready" ? "Allowed" : "Ask when you start",
      };
    case "quota":
      return {
        label: "Plan",
        detail: check.status === "ready" ? "Ready" : check.detail,
      };
    case "provider":
      return {
        label: "Notes",
        detail: check.status === "ready" ? "Ready" : "Needs setup",
      };
    case "model":
      return {
        label: "Quality",
        detail: check.status === "ready" ? "Best available" : "Review settings",
      };
    default:
      return {
        label: check.label,
        detail: check.status === "ready" ? "Ready" : check.detail,
      };
  }
}

function readinessIcon(id: string): LucideIcon {
  switch (id) {
    case "microphone":
      return Mic;
    case "quota":
      return ClipboardList;
    case "provider":
      return FileText;
    case "model":
      return Gauge;
    default:
      return CheckCircle2;
  }
}

export function LiveRecorder({
  onTranscriptUpdate,
  onSessionEnd,
  meetingContext,
  onAudioLevel,
  onStateChange,
}: LiveRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<RecorderConnectionStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [preflight, setPreflight] = useState<RecordingPreflightResponse | null>(
    null,
  );
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(true);
  const [browserMic, setBrowserMic] = useState<ReadinessCheck>({
    id: "microphone",
    label: "Microphone",
    status: "unknown",
    detail: "Ask when recording starts",
  });

  const stateRef = useRef<RecorderState>("idle");
  const meterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commandStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const durationRef = useRef(0);
  const turnsRef = useRef<Turn[]>([]);
  const recordingDirectivesRef = useRef<RecordingVoiceDirective[]>([]);
  const tokenRef = useRef<StreamToken | null>(null);
  const partialRef = useRef("");
  const reconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const cleanup = useCallback(() => {
    if (visibilityHandlerRef.current) {
      document.removeEventListener(
        "visibilitychange",
        visibilityHandlerRef.current,
      );
      visibilityHandlerRef.current = null;
    }
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
    }
    if (meterRef.current) {
      clearInterval(meterRef.current);
      meterRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (commandStatusTimerRef.current) {
      clearTimeout(commandStatusTimerRef.current);
      commandStatusTimerRef.current = null;
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

  const persistLocalDraft = useCallback(() => {
    const meetingId = tokenRef.current?.meetingId;
    if (!meetingId || typeof window === "undefined") return false;

    const text = turnsRef.current.map((t) => t.text).join(" ");
    const saved = saveLocalRecordingDraft(window.localStorage, {
      meetingId,
      updatedAt: new Date().toISOString(),
      durationSeconds: durationRef.current,
      text,
      turnCount: turnsRef.current.length,
      partial: partialRef.current,
      providerModel: tokenRef.current?.speechModel,
      title: meetingContext?.meetingTitle,
    });

    if (saved) {
      setSaveStatus("local");
      setDraftSavedAt(new Date());
    }

    return saved;
  }, [meetingContext?.meetingTitle]);

  const showCommandStatus = useCallback((message: string) => {
    if (commandStatusTimerRef.current) {
      clearTimeout(commandStatusTimerRef.current);
    }
    setCommandStatus(message);
    commandStatusTimerRef.current = setTimeout(() => {
      setCommandStatus(null);
      commandStatusTimerRef.current = null;
    }, 3500);
  }, []);

  const handleFinalTurn = useCallback(
    (turn: Turn) => {
      const command = parseRecordingVoiceCommand(turn.text);
      if (command) {
        const previousTurn = turnsRef.current.at(-1) ?? null;
        partialRef.current = "";

        if (command.type === "remove_last") {
          if (previousTurn) {
            turnsRef.current = turnsRef.current.slice(0, -1);
            recordingDirectivesRef.current =
              recordingDirectivesRef.current.filter(
                (directive) => directive.targetText !== previousTurn.text,
              );
            showCommandStatus("Removed the last transcript segment.");
          } else {
            showCommandStatus("Nothing to remove yet.");
          }
        } else {
          const directive = buildRecordingVoiceDirective(
            command,
            previousTurn?.text ?? null,
            turn.end > 0 ? turn.end / 1000 : durationRef.current,
          );
          if (directive) {
            recordingDirectivesRef.current = [
              ...recordingDirectivesRef.current,
              directive,
            ];
          }
          showCommandStatus(
            command.type === "mark_action"
              ? "Marked the last segment for follow-up."
              : "Saved the note writer instruction.",
          );
        }

        setConnectionStatus("transcribing");
        persistLocalDraft();
        onTranscriptUpdate(turnsRef.current, partialRef.current);
        return;
      }

      turnsRef.current = [...turnsRef.current, turn];
      partialRef.current = "";
      setConnectionStatus("transcribing");
      persistLocalDraft();
      onTranscriptUpdate(turnsRef.current, partialRef.current);
    },
    [onTranscriptUpdate, persistLocalDraft, showCommandStatus],
  );

  const refreshPreflight = useCallback(async (signal?: AbortSignal) => {
    setPreflightLoading(true);
    try {
      const response = await fetch("/api/transcribe/stream/preflight", {
        cache: "no-store",
        signal,
      });
      if (!response.ok)
        throw new Error(`Preflight failed (${response.status})`);
      setPreflight((await response.json()) as RecordingPreflightResponse);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPreflight(null);
    } finally {
      if (!signal?.aborted) setPreflightLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshPreflight(controller.signal);
    return () => controller.abort();
  }, [refreshPreflight]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setBrowserMic({
        id: "microphone",
        label: "Microphone",
        status: "blocked",
        detail: "This browser can't use the microphone",
      });
      return;
    }

    const permissions = navigator.permissions;
    if (!permissions?.query) {
      setBrowserMic({
        id: "microphone",
        label: "Microphone",
        status: "unknown",
        detail: "Ask when recording starts",
      });
      return;
    }

    let mounted = true;
    permissions
      .query({ name: "microphone" as PermissionName })
      .then((permission) => {
        if (!mounted) return;

        const update = () => {
          const status =
            permission.state === "denied"
              ? "blocked"
              : permission.state === "granted"
                ? "ready"
                : "unknown";
          setBrowserMic({
            id: "microphone",
            label: "Microphone",
            status,
            detail:
              permission.state === "denied"
                ? "Permission blocked"
                : permission.state === "granted"
                  ? "Allowed"
                  : "Ask when recording starts",
          });
        };

        update();
        permission.addEventListener("change", update);
      })
      .catch(() => {
        if (!mounted) return;
        setBrowserMic({
          id: "microphone",
          label: "Microphone",
          status: "unknown",
          detail: "Ask when recording starts",
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-finalize: save whatever we have and navigate to the meeting page
  const autoFinalize = useCallback(async () => {
    stateRef.current = "finalizing";
    setState("finalizing");
    setConnectionStatus("finalizing");
    persistLocalDraft();
    cleanup();

    const meetingId = tokenRef.current?.meetingId;
    if (!meetingId || turnsRef.current.length === 0) {
      stateRef.current = "idle";
      setState("idle");
      setConnectionStatus("idle");
      return;
    }

    try {
      const fullText = turnsRef.current.map((t) => t.text).join(" ");
      await fetch("/api/transcribe/stream/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          meetingTitle: meetingContext?.meetingTitle,
          calendarEventId: meetingContext?.calendarEventId,
          text: fullText,
          recordingDirectives: recordingDirectivesRef.current,
          utterances: turnsRef.current.map((t) => ({
            speaker: t.speaker,
            text: t.text,
            start: t.start,
            end: t.end,
            confidence: t.confidence,
          })),
          durationSeconds: durationRef.current,
        }),
      });
      if (typeof window !== "undefined") {
        clearLocalRecordingDraft(window.localStorage, meetingId);
      }
      setSaveStatus("remote");
      onSessionEnd(meetingId);
    } catch {
      setError("Connection lost. A local draft was kept on this device.");
      stateRef.current = "idle";
      setState("idle");
      setConnectionStatus("provider-issue");
    }
  }, [cleanup, meetingContext, onSessionEnd, persistLocalDraft]);

  // Reconnect WebSocket without resetting timer/turns
  const reconnectWs = useCallback(() => {
    const token = tokenRef.current;
    if (!token || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      // All retries exhausted — auto-finalize with what we have
      autoFinalize();
      return;
    }
    reconnectingRef.current = true;
    setConnectionStatus("reconnecting");
    reconnectAttemptsRef.current++;

    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${token.sampleRate}&token=${token.token}&speech_model=${token.speechModel}&speaker_labels=true&format_turns=true`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let receivedMessage = false;
    // If we don't receive any message within 5s of connecting, the token
    // is probably expired — stop retrying and auto-finalize
    const healthTimeout = setTimeout(() => {
      if (!receivedMessage && stateRef.current === "recording") {
        ws.close();
        autoFinalize();
      }
    }, 5000);

    ws.onopen = () => {
      reconnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
      setConnectionStatus("listening");
      setError(null);
    };

    ws.onmessage = (event) => {
      receivedMessage = true;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "Turn") {
          const transcript = msg.transcript ?? msg.utterance ?? "";
          if (msg.end_of_turn) {
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
            handleFinalTurn(turn);
          } else {
            partialRef.current = transcript;
            setConnectionStatus(transcript ? "transcribing" : "listening");
            onTranscriptUpdate(turnsRef.current, partialRef.current);
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      // Will trigger onclose
    };

    ws.onclose = (event) => {
      clearTimeout(healthTimeout);
      if (stateRef.current === "recording" && event.code !== 1000) {
        setTimeout(() => reconnectWs(), 2000);
      }
    };

    // Re-wire worklet audio to new WebSocket
    if (workletRef.current) {
      workletRef.current.port.onmessage = (e: MessageEvent) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };
    }
  }, [onTranscriptUpdate, autoFinalize, handleFinalTurn]);

  const start = useCallback(async () => {
    try {
      if (preflight?.status === "blocked" || browserMic.status === "blocked") {
        const blocked =
          browserMic.status === "blocked"
            ? browserMic
            : preflight?.checks.find((check) => check.status === "blocked");
        setError(
          blocked
            ? `${blocked.label}: ${blocked.detail}`
            : "Recording is not ready.",
        );
        return;
      }

      setError(null);
      setSaveStatus("idle");
      setDraftSavedAt(null);
      reconnectAttemptsRef.current = 0;
      reconnectingRef.current = false;
      turnsRef.current = [];
      recordingDirectivesRef.current = [];
      partialRef.current = "";
      tokenRef.current = null;
      setCommandStatus(null);
      durationRef.current = 0;
      setDuration(0);
      stateRef.current = "connecting";
      setState("connecting");
      setConnectionStatus("checking-mic");

      // 1. Get mic before creating a backend meeting/token.
      if (isElectron()) {
        // Electron native capture not wired here -- fallback to getUserMedia
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(microphoneUnsupportedMessage());
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
      setBrowserMic({
        id: "microphone",
        label: "Microphone",
        status: "ready",
        detail: "Allowed",
      });

      // 2. Fetch ephemeral token after browser capture is allowed.
      setConnectionStatus("creating-session");
      void refreshPreflight();
      const tokenRes = await fetch("/api/transcribe/stream/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle: meetingContext?.meetingTitle,
          calendarEventId: meetingContext?.calendarEventId,
          startsAt: meetingContext?.startsAt,
          source: meetingContext?.source,
        }),
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Token request failed (${tokenRes.status})`,
        );
      }
      const token: StreamToken = await tokenRes.json();
      tokenRef.current = token;
      persistLocalDraft();

      // 3. Set up AudioWorklet for PCM downsampling
      setConnectionStatus("connecting-provider");
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
        stateRef.current = "recording";
        setState("recording");
        setConnectionStatus("listening");
        durationRef.current = 0;
        setDuration(0);
        timerRef.current = setInterval(() => {
          durationRef.current += 1;
          setDuration(durationRef.current);
        }, 1000);

        // Autosave function — reusable for interval and visibility events
        const doAutosave = () => {
          if (turnsRef.current.length === 0) return;
          const mid = tokenRef.current?.meetingId;
          if (!mid) return;
          persistLocalDraft();
          setSaveStatus("syncing");
          fetch("/api/transcribe/stream/autosave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingId: mid,
              meetingTitle: meetingContext?.meetingTitle,
              calendarEventId: meetingContext?.calendarEventId,
              text: turnsRef.current.map((t) => t.text).join(" "),
              utterances: turnsRef.current.map((t) => ({
                speaker: t.speaker,
                text: t.text,
                start: t.start,
                end: t.end,
                confidence: t.confidence,
              })),
              durationSeconds: durationRef.current,
            }),
          })
            .then((response) => {
              setSaveStatus(response.ok ? "remote" : "local");
            })
            .catch(() => {
              persistLocalDraft();
              setSaveStatus("local");
            });
        };

        // Autosave every 15 seconds
        autosaveRef.current = setInterval(doAutosave, 15000);

        // Autosave immediately when app goes to background
        // (phone lock, battery warning, app switch)
        const handleVisibility = () => {
          if (document.hidden && stateRef.current === "recording") {
            doAutosave();
          }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        visibilityHandlerRef.current = handleVisibility;
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
              handleFinalTurn(turn);
            } else {
              // Partial turn — show as typing indicator
              partialRef.current = transcript;
              setConnectionStatus(transcript ? "transcribing" : "listening");
              onTranscriptUpdate(turnsRef.current, partialRef.current);
            }
          }
          // Begin, SpeechStarted — no action needed
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        // Will trigger onclose — handle reconnect there
      };

      ws.onclose = (event) => {
        if (event.code !== 1000 && stateRef.current === "recording") {
          // Connection dropped (ping timeout, network blip) — reconnect
          // without resetting timer or accumulated turns
          reconnectWs();
        } else if (
          event.code !== 1000 &&
          stateRef.current !== "finalizing" &&
          stateRef.current !== "idle"
        ) {
          const reason =
            event.reason || `Connection closed (code ${event.code})`;
          setError(reason);
          cleanup();
          stateRef.current = "idle";
          setState("idle");
          setConnectionStatus("provider-issue");
        }
      };

      // 5. Wire worklet -> WebSocket audio chunks
      worklet.port.onmessage = (e: MessageEvent) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };
    } catch (err) {
      setError(recordingStartErrorMessage(err));
      cleanup();
      stateRef.current = "idle";
      setState("idle");
      setConnectionStatus("idle");
      void refreshPreflight();
    }
  }, [
    cleanup,
    meetingContext,
    onAudioLevel,
    onTranscriptUpdate,
    browserMic,
    handleFinalTurn,
    persistLocalDraft,
    preflight,
    reconnectWs,
    refreshPreflight,
  ]);

  const stop = useCallback(async () => {
    stateRef.current = "finalizing";
    setState("finalizing");
    setConnectionStatus("finalizing");
    persistLocalDraft();
    cleanup();

    const meetingId = tokenRef.current?.meetingId;
    if (!meetingId) {
      stateRef.current = "idle";
      setState("idle");
      setConnectionStatus("idle");
      return;
    }

    try {
      const fullText = turnsRef.current.map((t) => t.text).join(" ");
      setSaveStatus("syncing");
      const res = await fetch("/api/transcribe/stream/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          meetingTitle: meetingContext?.meetingTitle,
          calendarEventId: meetingContext?.calendarEventId,
          text: fullText,
          recordingDirectives: recordingDirectivesRef.current,
          utterances: turnsRef.current.map((t) => ({
            speaker: t.speaker,
            text: t.text,
            start: t.start,
            end: t.end,
            confidence: t.confidence,
          })),
          durationSeconds: durationRef.current,
        }),
      });

      if (!res.ok) throw new Error("Finalize failed");

      if (typeof window !== "undefined") {
        clearLocalRecordingDraft(window.localStorage, meetingId);
      }
      setSaveStatus("remote");
      onSessionEnd(meetingId);
    } catch (err) {
      persistLocalDraft();
      setError(
        err instanceof Error
          ? `${err.message}. A local draft was kept on this device.`
          : "Failed to finalize. A local draft was kept on this device.",
      );
      stateRef.current = "idle";
      setState("idle");
      setConnectionStatus("provider-issue");
    }
  }, [cleanup, meetingContext, onSessionEnd, persistLocalDraft]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const isActive =
    state === "recording" || state === "connecting" || state === "finalizing";
  const wordCount = turnsRef.current.reduce(
    (sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length,
    0,
  );
  const turnCount = turnsRef.current.length;
  const isQuotaError =
    error?.toLowerCase().includes("limit reached") ||
    error?.toLowerCase().includes("free tier limit") ||
    false;
  const errorCopy = isQuotaError ? error : error;
  const readinessChecks: ReadinessCheck[] = [
    browserMic,
    ...(preflight?.checks ?? []),
  ]
    .filter((check) => check.id !== "pricing")
    .slice(0, 4);
  const preflightBlocked =
    preflight?.status === "blocked" || browserMic.status === "blocked";
  const readyCheckCount = readinessChecks.filter(
    (check) => check.status === "ready",
  ).length;
  const blockedCheck = readinessChecks.find(
    (check) => check.status === "blocked",
  );
  const readinessSummary =
    preflightLoading && !preflight
      ? "Checking"
      : preflightBlocked
        ? "Needs attention"
        : "Ready";
  const readinessDetail =
    preflightLoading && !preflight
      ? "Preparing the recording path"
      : blockedCheck
        ? blockedCheck.detail
        : `${readyCheckCount} checks ready`;
  const blockedByMic = browserMic.status === "blocked";
  const primaryIdleLabel = preflightBlocked
    ? blockedByMic
      ? "Allow microphone"
      : "Review setup"
    : "Start recording";
  const recorderSubcopy =
    preflightLoading && !preflight
      ? "Checking recording setup..."
      : blockedByMic
        ? "Allow microphone access to begin"
        : preflightBlocked
          ? "Recording setup needs attention"
        : "Tap to start taking notes";

  return (
    <div className="w-full">
      <div
        className={`signal-panel-subtle recorder-control flex items-center rounded-lg p-3 transition-all duration-700 ease-out sm:p-4 ${
          isActive ? "gap-4" : "flex-col gap-4"
        }`}
      >
        <button
          onClick={
            state === "idle" ? start : state === "recording" ? stop : undefined
          }
          disabled={
            state === "connecting" || state === "finalizing"
          }
          className={`recorder-primary-control shrink-0 flex items-center justify-center rounded-full transition-all duration-700 ease-out disabled:opacity-50 ${
            isActive
              ? "h-12 w-12 border border-[var(--status-error-border)] bg-[var(--surface-control)] text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
              : "h-16 w-16 border-2 border-[var(--recorder-button-border)] bg-[var(--recorder-button-bg)] text-[#14b8a6] shadow-[0_0_42px_rgba(20,184,166,0.12)] hover:border-[#14b8a6]/70 hover:text-[#5eead4] sm:h-20 sm:w-20"
          }`}
          aria-label={isActive ? "Stop recording" : "Start recording"}
        >
          {state === "connecting" || state === "finalizing" ? (
            <Loader2 size={isActive ? 16 : 28} className="animate-spin" />
          ) : state === "recording" ? (
            <Square size={14} fill="currentColor" />
          ) : (
            <>
              <Mic size={24} strokeWidth={1.5} className="sm:size-7" />
              <span className="recorder-primary-label">{primaryIdleLabel}</span>
            </>
          )}
        </button>

        <div
          className={`recorder-time-block transition-all duration-700 ease-out ${
            isActive ? "min-w-0 flex-1 text-left" : "text-center"
          }`}
        >
          {isActive && (
            <div className="flex items-baseline gap-3 transition-all duration-700">
              <span className="recorder-duration-value font-semibold text-3xl text-[var(--text-primary)] tabular-nums tracking-tight transition-all duration-700">
                {formatDuration(duration)}
              </span>
              <span className="animate-in fade-in text-xs uppercase tracking-wider text-[#5eead4] duration-500">
                {connectionStatusLabel(connectionStatus)}
              </span>
            </div>
          )}
          {isActive ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] animate-in fade-in slide-in-from-left-2 duration-500">
              {turnCount > 0 && (
                <span>
                  {turnCount} {turnCount === 1 ? "segment" : "segments"}
                </span>
              )}
              {wordCount > 0 && (
                <span>
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                </span>
              )}
              <span>{saveStatusLabel(saveStatus, draftSavedAt)}</span>
              {turnCount === 0 && <span>Listening...</span>}
              {commandStatus && (
                <span className="recorder-command-status" role="status">
                  {commandStatus}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1 flex flex-col items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>{recorderSubcopy}</span>
              {meetingContext && (
                <span className="recorder-context-pill" title={meetingContext.meetingTitle}>
                  <span className="recorder-context-title">
                    {meetingContext.meetingTitle}
                  </span>
                  <span className="recorder-context-divider" aria-hidden="true">
                    ·
                  </span>
                  <span>{formatRecordingContextTime(meetingContext.startsAt)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {isActive && (
          <div className="recorder-live-indicator flex shrink-0 items-center gap-1.5 animate-in fade-in duration-700">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-500/70 uppercase tracking-wider font-medium">
              Live
            </span>
          </div>
        )}
      </div>

      <div className="recorder-readiness" aria-label="Recording readiness">
        <div className="mx-auto mt-3 flex justify-center sm:hidden">
          <div
            className={`inline-flex min-h-[40px] max-w-full items-center gap-2 rounded-lg border px-3 text-left ${readinessClass(
              preflightBlocked
                ? "blocked"
                : preflightLoading
                  ? "unknown"
                  : "ready",
            )}`}
            title={readinessDetail}
          >
            {preflightBlocked ? (
              <AlertTriangle size={14} className="shrink-0" aria-hidden />
            ) : preflightLoading ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70"
                aria-hidden
              />
            ) : (
              <CheckCircle2 size={14} className="shrink-0" aria-hidden />
            )}
            <span className="min-w-0 truncate text-xs font-medium">
              {readinessSummary}
              {!preflightBlocked && (
                <span className="font-normal opacity-75">
                  {" "}
                  - {readyCheckCount}/{readinessChecks.length} checks
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mx-auto mt-4 hidden max-w-xl grid-cols-2 gap-2 sm:grid sm:grid-cols-4">
          {readinessChecks.map((check) => {
            const copy = friendlyReadinessCopy(check);
            const ReadinessIcon = readinessIcon(check.id);
            return (
              <div
                key={check.id}
                data-readiness-id={check.id}
                data-readiness-status={check.status}
                className={`min-h-[58px] rounded-lg border px-2.5 py-2 ${readinessClass(check.status)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="recorder-readiness-icon" aria-hidden>
                    <ReadinessIcon size={17} strokeWidth={1.8} />
                  </span>
                  <p className="min-w-0 truncate text-[11px] font-medium">
                    {copy.label}
                  </p>
                </div>
                <p
                  className="mt-1 truncate text-[11px] opacity-80"
                  title={check.detail}
                >
                  {copy.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-auto mt-3 flex max-w-sm items-start gap-2 rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-left text-sm text-[var(--status-error)]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="leading-5">
            {errorCopy}
            {isQuotaError && (
              <>
                {" "}
                <Link
                  href="/pricing"
                  className="font-medium underline underline-offset-4"
                >
                  Upgrade
                </Link>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
