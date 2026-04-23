"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface MeetingDetailPollerProps {
  meetingId: string;
  initialStatus: string;
  onCompleted: () => void;
}

export function MeetingDetailPoller({
  meetingId,
  initialStatus,
  onCompleted,
}: MeetingDetailPollerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcribe/${meetingId}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "completed") {
        onCompleted();
      } else if (data.status === "error") {
        setError(data.error ?? "Processing failed");
      }
    } catch {
      // retry next interval
    }
  }, [meetingId, onCompleted]);

  useEffect(() => {
    if (status === "completed" || status === "error") return;
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [status, poll]);

  if (status === "error") {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center">
        <div className="text-[#ef4444] text-sm font-medium mb-1">
          Processing Failed
        </div>
        <p className="text-xs text-[var(--text-muted)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 flex flex-col items-center gap-3">
      <div className="relative">
        <Loader2 size={32} className="text-[#14b8a6] animate-spin" />
        <span className="absolute inset-0 rounded-full border-2 border-[#14b8a6]/30 animate-pulse" />
      </div>
      <div className="text-sm text-[var(--text-secondary)]">
        {status === "queued" ? "Queued for processing..." : "Processing transcript..."}
      </div>
      <div className="text-xs text-[var(--text-muted)]">This page will update automatically</div>
    </div>
  );
}
