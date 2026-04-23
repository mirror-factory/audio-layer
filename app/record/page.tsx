"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { AudioRecorder } from "@/components/audio-recorder";

export default function RecordPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitAudio = useCallback(
    async (blob: Blob) => {
      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 402) {
            router.push("/pricing");
            return;
          }
          throw new Error(body.error ?? `Upload failed (${res.status})`);
        }

        const { id } = await res.json();
        setPollingId(id);
        pollUntilDone(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
      }
    },
    [router],
  );

  const pollUntilDone = useCallback(
    async (id: string) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/transcribe/${id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === "completed") {
            clearInterval(interval);
            router.push(`/meetings/${id}`);
          } else if (data.status === "error") {
            clearInterval(interval);
            setError(data.error ?? "Processing failed");
            setUploading(false);
            setPollingId(null);
          }
        } catch {
          // retry
        }
      }, 3000);
    },
    [router],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) submitAudio(file);
    },
    [submitAudio],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) submitAudio(file);
    },
    [submitAudio],
  );

  return (
    <div className="min-h-screen-safe flex flex-col">
      <TopBar title="Record" showBack />

      <main className="flex-1 px-4 pb-safe py-8 max-w-xl mx-auto w-full">
        <h2 className="text-lg font-semibold text-[#e5e5e5] mb-6 text-center">
          Batch Recording
        </h2>

        {/* Recorder */}
        {!uploading && !pollingId && (
          <>
            <div className="mb-8">
              <AudioRecorder onRecordingComplete={submitAudio} />
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#262626]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0a0a0a] px-3 text-xs text-[#525252]">
                  or upload a file
                </span>
              </div>
            </div>

            {/* File Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-[#262626] rounded-xl cursor-pointer hover:border-[#14b8a6]/50 transition-colors duration-200"
            >
              <Upload size={28} className="text-[#525252]" />
              <span className="text-sm text-[#a3a3a3]">
                Drop audio file or click to browse
              </span>
              <span className="text-xs text-[#525252]">
                WebM, MP3, WAV, M4A (max 100MB)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        )}

        {/* Uploading / Processing state */}
        {(uploading || pollingId) && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={40} className="text-[#14b8a6] animate-spin" />
            <div className="text-sm text-[#a3a3a3]">
              {pollingId ? "Processing transcript..." : "Uploading..."}
            </div>
            <div className="text-xs text-[#525252]">
              This may take a few minutes
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-[#ef4444] text-center mt-4">{error}</p>
        )}
      </main>
    </div>
  );
}
