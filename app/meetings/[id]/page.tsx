import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { TranscriptView } from "@/components/transcript-view";
import { MeetingCostPanel } from "@/components/meeting-cost-panel";
import { MeetingChat } from "@/components/meeting-chat";
import { MeetingIntelligencePanel } from "@/components/meeting-intelligence-panel";
import { MeetingNotesPushPanel } from "@/components/meeting-notes-push-panel";
import { MeetingDetailPollerWrapper } from "./poller-wrapper";
import { getMeetingsStore } from "@/lib/meetings/store";
import { AudioWaveRibbon } from "@/components/audio-wave-ribbon";
import {
  SessionCaptureCard,
  SessionIntelligenceCanvas,
  countWorkspaceWords,
  formatWorkspaceTimestamp,
  type SessionActionRow,
  type SessionTranscriptRow,
} from "@/components/session-workspace";
import { formatMeetingActionItem } from "@/lib/meeting-notes";
import type { Meeting } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({
  params,
}: MeetingDetailPageProps) {
  const { id } = await params;

  const store = await getMeetingsStore();
  const meeting = await store.get(id);

  if (!meeting) notFound();

  const isCompleted = meeting.status === "completed";

  return (
    <div className="paper-calm-page recorder-page session-workspace-page min-h-screen-safe flex flex-col">
      <TopBar
        title={meeting.title ?? "Meeting Detail"}
        showBack
      />

      <main className="meeting-detail-main session-detail-main flex-1 px-4 pb-safe py-6 mx-auto w-full space-y-6">
        {!isCompleted && meeting.status !== "error" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="meeting-detail-header flex items-center justify-between rounded-xl border border-[var(--border-card)] bg-[var(--surface-panel)] p-4">
              <div>
                <p className="signal-eyebrow">Meeting note</p>
                <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {meeting.title ?? "Untitled recording"}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(meeting.createdAt).toLocaleString()}
                  </span>
                  {meeting.durationSeconds != null && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {Math.round(meeting.durationSeconds / 60)} min
                    </span>
                  )}
                </div>
              </div>
              <StatusChip status={meeting.status} />
            </div>

            <MeetingDetailPollerWrapper
              meetingId={meeting.id}
              initialStatus={meeting.status}
            />
          </div>
        )}

        {meeting.status === "error" && (
          <div className="mx-auto max-w-5xl">
            <div className="meeting-detail-header mb-4 flex items-center justify-between rounded-xl border border-[var(--border-card)] bg-[var(--surface-panel)] p-4">
              <div>
                <p className="signal-eyebrow">Meeting note</p>
                <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {meeting.title ?? "Untitled recording"}
                </h1>
              </div>
              <StatusChip status={meeting.status} />
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[#ef4444]/20">
              <div className="text-sm text-[#ef4444] font-medium">
                Processing Error
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {meeting.error ?? "An unknown error occurred."}
              </p>
            </div>
          </div>
        )}

        {isCompleted && (
          <CompletedMeetingWorkspace meeting={meeting} />
        )}
      </main>
    </div>
  );
}

type CompletedMeeting = Meeting;

function CompletedMeetingWorkspace({ meeting }: { meeting: CompletedMeeting }) {
  const meetingDate = new Date(meeting.createdAt);
  const summaryText =
    meeting.summary?.summary ??
    "Layers did not generate a summary for this recording yet.";
  const transcriptRows = buildCompletedTranscriptRows(meeting.utterances);
  const actionRows = buildCompletedActions(meeting.summary?.actionItems ?? []);
  const keyPoints = meeting.summary?.keyPoints ?? [];
  const subtitle =
    meeting.summary?.participants.length
      ? meeting.summary.participants.join(", ")
      : keyPoints[0] ?? "Recorded session";
  const stats = {
    segments: meeting.utterances.length,
    words: countWorkspaceWords(
      meeting.text ?? meeting.utterances.map((utterance) => utterance.text).join(" "),
    ),
    points: keyPoints.length,
    actions: actionRows.length,
  };

  return (
    <>
      <div className="session-detail-workspace">
        <SessionCaptureCard
          date={meetingDate}
          durationLabel={formatMeetingDuration(meeting.durationSeconds)}
          statusLabel="Summary ready"
          badgeLabel="DONE"
          badgeTone="done"
          title={meeting.title ?? meeting.summary?.title ?? "Untitled recording"}
          subtitle={subtitle}
          calendarConnected={false}
          stats={stats}
          waveSlot={
            <AudioWaveRibbon
              active={false}
              audioLevel={0.18}
              height={118}
              sensitivity={1.05}
              motion={1.1}
              texture="clean"
              className="w-full"
            />
          }
          controlSlot={
            <div className="session-detail-status">
              <StatusChip status={meeting.status} />
            </div>
          }
        />

        <SessionIntelligenceCanvas
          mode="summary"
          summaryText={summaryText}
          updatedLabel="Ready now"
          transcriptRows={transcriptRows}
          keyPoints={keyPoints}
          actions={actionRows}
          decisions={meeting.summary?.decisions ?? []}
          askPanel={<MeetingChat meetingId={meeting.id} variant="workspace" />}
          footerStatus="Summary - transcript ready"
        />
      </div>

      <div className="session-detail-utilities">
        <MeetingNotesPushPanel meetingId={meeting.id} />
        <MeetingIntelligencePanel
          summary={meeting.summary}
          intakeForm={meeting.intakeForm}
        />
        <TranscriptView
          utterances={meeting.utterances}
          meetingId={meeting.id}
          defaultOpen={!meeting.summary}
        />
        <MeetingCostPanel costBreakdown={meeting.costBreakdown} />
      </div>
    </>
  );
}

function buildCompletedTranscriptRows(
  utterances: CompletedMeeting["utterances"],
): SessionTranscriptRow[] {
  return utterances.slice(0, 12).map((utterance, index) => ({
    id: `${utterance.start}-${index}`,
    timestamp: formatWorkspaceTimestamp(utterance.start),
    text: utterance.text,
    tone:
      index % 5 === 3
        ? ("orange" as const)
        : index % 3 === 2
          ? ("cyan" as const)
          : ("blue" as const),
  }));
}

function buildCompletedActions(
  actionItems: NonNullable<CompletedMeeting["summary"]>["actionItems"],
): SessionActionRow[] {
  const priorities: Array<SessionActionRow["priority"]> = ["High", "Med", "Low"];
  return actionItems.map((action, index) => ({
    id: `${action.task}-${index}`,
    text: formatMeetingActionItem(action),
    due: action.dueDate
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(new Date(action.dueDate))
      : null,
    priority: priorities[index % priorities.length],
  }));
}

function formatMeetingDuration(seconds: number | null): string {
  const safeSeconds = Math.max(0, seconds ?? 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder
    .toString()
    .padStart(2, "0")}`;
}

function StatusChip({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    completed: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
    processing: { bg: "bg-[#14b8a6]/10", text: "text-[#14b8a6]" },
    queued: { bg: "bg-[#eab308]/10", text: "text-[#eab308]" },
    error: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
  };
  const c = config[status] ?? config.processing;

  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${c.bg} ${c.text}`}
    >
      {status}
    </span>
  );
}
