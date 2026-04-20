"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { MeetingDetailPoller } from "@/components/meeting-detail-poller";

interface PollerWrapperProps {
  meetingId: string;
  initialStatus: string;
}

export function MeetingDetailPollerWrapper({
  meetingId,
  initialStatus,
}: PollerWrapperProps) {
  const router = useRouter();

  const handleCompleted = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <MeetingDetailPoller
      meetingId={meetingId}
      initialStatus={initialStatus}
      onCompleted={handleCompleted}
    />
  );
}
