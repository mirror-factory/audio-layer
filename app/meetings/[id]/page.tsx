import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { TranscriptView } from "@/components/transcript-view";
import { MeetingCostPanel } from "@/components/meeting-cost-panel";
import { MeetingChat } from "@/components/meeting-chat";
import { MeetingIntelligencePanel } from "@/components/meeting-intelligence-panel";
import { MeetingNotesPushPanel } from "@/components/meeting-notes-push-panel";
import { MeetingDetailPollerWrapper } from "./poller-wrapper";
import { getMeetingsStore } from "@/lib/meetings/store";

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
    <div className="paper-calm-page min-h-screen-safe flex flex-col">
      <TopBar
        title={meeting.title ?? "Meeting Detail"}
        showBack
      />

      <main className="meeting-detail-main flex-1 px-4 pb-safe py-6 max-w-5xl mx-auto w-full space-y-6">
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

        {!isCompleted && meeting.status !== "error" && (
          <MeetingDetailPollerWrapper
            meetingId={meeting.id}
            initialStatus={meeting.status}
          />
        )}

        {meeting.status === "error" && (
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[#ef4444]/20">
            <div className="text-sm text-[#ef4444] font-medium">
              Processing Error
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {meeting.error ?? "An unknown error occurred."}
            </p>
          </div>
        )}

        {isCompleted && (
          <>
            <MeetingIntelligencePanel
              summary={meeting.summary}
              intakeForm={meeting.intakeForm}
            />
            <MeetingNotesPushPanel meetingId={meeting.id} />
            <TranscriptView
              utterances={meeting.utterances}
              meetingId={meeting.id}
              defaultOpen={!meeting.summary}
            />
            <MeetingChat meetingId={meeting.id} />
            <MeetingCostPanel costBreakdown={meeting.costBreakdown} />
          </>
        )}
      </main>
    </div>
  );
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
