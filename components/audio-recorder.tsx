"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to access microphone",
      );
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-200 ${
            recording
              ? "bg-[#ef4444] hover:bg-[#dc2626] text-white"
              : "bg-[#14b8a6] hover:bg-[#0d9488] text-white"
          }`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? <Square size={28} /> : <Mic size={28} />}
        </button>

        {recording && (
          <span className="absolute inset-0 rounded-full border-2 border-[#14b8a6] animate-ping pointer-events-none" />
        )}
      </div>

      {recording && (
        <div className="text-2xl font-semibold text-[#e5e5e5] tabular-nums">
          {formatDuration(duration)}
        </div>
      )}

      {error && (
        <p className="text-sm text-[#ef4444] text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}
