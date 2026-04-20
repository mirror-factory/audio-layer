import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { TranscriptView } from "@/components/transcript-view";
import { IntakeFormView } from "@/components/intake-form-view";
import { MeetingCostPanel } from "@/components/meeting-cost-panel";
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
    <div className="min-h-screen flex flex-col">
      <TopBar
        title={meeting.title ?? "Meeting Detail"}
        showBack
      />

      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#e5e5e5]">
              {meeting.title ?? "Untitled recording"}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[#525252]">
                {new Date(meeting.createdAt).toLocaleString()}
              </span>
              {meeting.durationSeconds != null && (
                <span className="text-xs text-[#525252]">
                  {Math.round(meeting.durationSeconds / 60)} min
                </span>
              )}
            </div>
          </div>
          <StatusChip status={meeting.status} />
        </div>

        {/* If not completed, show poller */}
        {!isCompleted && meeting.status !== "error" && (
          <MeetingDetailPollerWrapper
            meetingId={meeting.id}
            initialStatus={meeting.status}
          />
        )}

        {/* Error state */}
        {meeting.status === "error" && (
          <div className="bg-[#171717] rounded-xl p-4 border border-[#ef4444]/20">
            <div className="text-sm text-[#ef4444] font-medium">
              Processing Error
            </div>
            <p className="text-xs text-[#a3a3a3] mt-1">
              {meeting.error ?? "An unknown error occurred."}
            </p>
          </div>
        )}

        {/* Transcript + Summary */}
        {isCompleted && (
          <>
            <TranscriptView
              utterances={meeting.utterances}
              summary={meeting.summary}
            />
            <IntakeFormView intakeForm={meeting.intakeForm} />
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
