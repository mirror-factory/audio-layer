"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import {
  LiveRecorder,
  type LiveRecorderHandle,
  type LiveRecorderSnapshot,
} from "@/components/live-recorder";
import { AudioWaveRibbon } from "@/components/audio-wave-ribbon";
import {
  SessionCaptureCard,
  SessionIntelligenceCanvas,
  SessionStopButton,
  formatWorkspaceTimestamp,
  type SessionActionRow,
  type SessionTranscriptRow,
} from "@/components/session-workspace";
import {
  deriveLiveMeetingSignals,
  type LiveMeetingSignals,
} from "@/lib/recording/live-signals";

interface Turn {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
  final: boolean;
}

const REFERENCE_SESSION_DATE = new Date("2026-04-28T10:24:00");
const REFERENCE_TRANSCRIPT_ROWS: SessionTranscriptRow[] = [
  {
    id: "reference-1",
    timestamp: "00:04",
    text: "Audio notes are working well, but transcript search should be next.",
    tone: "blue",
  },
  {
    id: "reference-2",
    timestamp: "00:18",
    text: "Calendar context needs to appear before recording starts.",
    tone: "blue",
  },
  {
    id: "reference-3",
    timestamp: "00:35",
    text: "Action items should include owners, due dates, and priority.",
    tone: "cyan",
  },
  {
    id: "reference-4",
    timestamp: "00:54",
    text: "We can test the new flow with five users this week.",
    tone: "orange",
  },
  {
    id: "reference-5",
    timestamp: "01:11",
    text: "Let's share the prototype internally before the Friday review.",
    tone: "blue",
  },
];
const REFERENCE_KEY_POINTS = [
  "Transcript search is the next priority.",
  "Show calendar context before recording begins.",
  "Action items need owners, due dates, priority.",
  "Test new flow with 5 users this week.",
];
const REFERENCE_DECISIONS = [
  "Transcript search is next.",
  "Calendar context should appear before recording starts.",
  "Action items should include owners and due dates.",
];
const REFERENCE_ACTIONS: SessionActionRow[] = [
  {
    id: "reference-action-1",
    text: "Define search MVP",
    due: "May 2",
    priority: "High",
  },
  {
    id: "reference-action-2",
    text: "Prototype calendar context",
    due: "May 5",
    priority: "Med",
  },
  {
    id: "reference-action-3",
    text: "User test new flow (5 users)",
    due: "May 8",
    priority: "Low",
  },
];
const REFERENCE_SUMMARY =
  "We're aligning on the Layers roadmap. Decisions made on transcript search priority, calendar context before recording, and action items with owners and due dates. Next: prototype the search flow and define success metrics.";

export default function LiveRecordPage() {
  const router = useRouter();
  const recorderRef = useRef<LiveRecorderHandle | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [recorderSnapshot, setRecorderSnapshot] =
    useState<LiveRecorderSnapshot | null>(null);
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
  const liveSignals = useMemo(
    () => deriveLiveMeetingSignals(turns, partial),
    [turns, partial],
  );
  const workspaceRows = useMemo(
    () => buildWorkspaceTranscriptRows(turns, partial),
    [turns, partial],
  );
  const workspaceActions = useMemo(
    () => buildWorkspaceActions(liveSignals.actions.map((item) => item.text)),
    [liveSignals.actions],
  );
  const workspaceKeyPoints = liveSignals.keyPoints.map((item) => item.text);
  const workspaceDecisions = liveSignals.decisions.map((item) => item.text);
  const isFinalizing = recState === "finalizing";
  const isReferencePreview = recState === "idle" && !hasTranscript;
  const displayRows = isReferencePreview
    ? REFERENCE_TRANSCRIPT_ROWS
    : workspaceRows;
  const displayKeyPoints = isReferencePreview
    ? REFERENCE_KEY_POINTS
    : workspaceKeyPoints;
  const displayActions = isReferencePreview
    ? REFERENCE_ACTIONS
    : workspaceActions;
  const displayDecisions = isReferencePreview
    ? REFERENCE_DECISIONS
    : workspaceDecisions;
  const displaySummary = isReferencePreview
    ? REFERENCE_SUMMARY
    : liveWorkspaceSummary(liveSignals);
  const durationLabel = isReferencePreview
    ? "00:13"
    : recorderSnapshot?.durationLabel ?? "00:00";
  const displayDate = isReferencePreview ? REFERENCE_SESSION_DATE : new Date();
  const displayStats = isReferencePreview
    ? {
        segments: 6,
        words: 76,
        points: 4,
        actions: 3,
      }
    : {
        segments: turns.length,
        words: liveSignals.words,
        points: displayKeyPoints.length,
        actions: displayActions.length,
      };

  return (
    <div className="paper-calm-page recorder-page session-workspace-page min-h-screen-safe flex flex-col">
      <TopBar title="Layers" avatarInitials="LM" />

      <main className="live-record-shell mx-auto flex w-full flex-1 flex-col px-4 pb-safe py-3 sm:py-5">
        <div className="live-record-workspace is-recording">
          <SessionCaptureCard
            date={displayDate}
            durationLabel={durationLabel}
            statusLabel={isFinalizing ? "Saving notes" : "Writing notes"}
            badgeLabel={isFinalizing ? "SAVE" : "LIVE"}
            badgeTone="live"
            title="Product planning session"
            subtitle="Layers roadmap"
            calendarConnected
            stats={displayStats}
            waveSlot={
              <AudioWaveRibbon
                active={recState === "recording" || isReferencePreview}
                audioLevel={isReferencePreview ? 0.42 : audioLevel}
                height={118}
                sensitivity={1.16}
                motion={1.28}
                texture="clean"
                className="w-full"
              />
            }
            controlSlot={
              <>
                <div className="session-recorder-managed">
                  <LiveRecorder
                    ref={recorderRef}
                    onTranscriptUpdate={handleTranscriptUpdate}
                    onSessionEnd={handleSessionEnd}
                    onAudioLevel={setAudioLevel}
                    onStateChange={setRecState}
                    onSnapshot={setRecorderSnapshot}
                    presentation="managed"
                  />
                </div>
                <div className="session-capture-control">
                  <SessionStopButton
                    label={isFinalizing ? "Saving notes" : "Stop recording"}
                    onClick={() => {
                      if (recState === "idle") return;
                      void recorderRef.current?.stop();
                    }}
                    disabled={isFinalizing}
                  />
                </div>
              </>
            }
          />

          <SessionIntelligenceCanvas
            mode="live"
            summaryText={displaySummary}
            updatedLabel="Updated just now"
            transcriptRows={displayRows}
            keyPoints={displayKeyPoints}
            actions={displayActions}
            decisions={displayDecisions}
            askTimestampLabel={isReferencePreview ? "10:24 AM" : "Now"}
            footerStatus={
              isFinalizing ? "Saving notes" : "Live - new content arriving"
            }
          />
        </div>
      </main>
    </div>
  );
}

function buildWorkspaceTranscriptRows(
  turns: Turn[],
  partial: string,
): SessionTranscriptRow[] {
  const rows: SessionTranscriptRow[] = turns.slice(-8).map((turn, index) => ({
    id: `${turn.start}-${index}`,
    timestamp: formatWorkspaceTimestamp(turn.start),
    text: turn.text,
    tone:
      index % 5 === 3
        ? ("orange" as const)
        : index % 3 === 2
          ? ("cyan" as const)
          : ("blue" as const),
  }));

  if (partial.trim()) {
    rows.push({
      id: "live-partial",
      timestamp:
        turns.length > 0
          ? formatWorkspaceTimestamp(turns.at(-1)?.end ?? 0)
          : "0:00",
      text: partial.trim(),
      tone: "cyan",
      live: true,
    });
  }

  return rows;
}

function buildWorkspaceActions(items: string[]): SessionActionRow[] {
  const priorities: Array<SessionActionRow["priority"]> = ["High", "Med", "Low"];
  return items.slice(0, 5).map((text, index) => ({
    id: `${index}-${text}`,
    text,
    due: index < 3 ? `May ${index + 2}` : null,
    priority: priorities[index % priorities.length],
  }));
}

function liveWorkspaceSummary(signals: LiveMeetingSignals): string {
  const signalText = [
    ...signals.decisions.map((item) => item.text),
    ...signals.keyPoints.map((item) => item.text),
    ...signals.actions.map((item) => item.text),
  ];

  if (signalText.length === 0) {
    return "Layers is listening for decisions, follow-ups, owners, risks, and useful context. The live summary will tighten as the conversation develops.";
  }

  const nextAction = signals.actions[0]?.text;
  const summary = signalText.slice(0, 3).join(" ");
  return nextAction ? `${summary} Next: ${nextAction}` : summary;
}
