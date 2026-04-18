/**
 * /meetings/[id] — detail view for a persisted meeting.
 *
 * Server-rendered from the MeetingsStore. If the row exists but the
 * meeting is still processing, the client-side `Poller` nudges the
 * transcribe route until completion so the page updates without a
 * full reload.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeetingsStore } from "@/lib/meetings/store";
import { TranscriptView } from "@/components/transcript-view";
import { IntakeFormView } from "@/components/intake-form-view";
import { MeetingCostPanel } from "@/components/meeting-cost-panel";
import { MeetingDetailPoller } from "@/components/meeting-detail-poller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params;
  const meeting = await (await getMeetingsStore()).get(id);
  if (!meeting) notFound();

  const isTerminal =
    meeting.status === "completed" || meeting.status === "error";

  return (
    <div className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-neutral-100">
              {meeting.title ?? "Untitled recording"}
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              {new Date(meeting.createdAt).toLocaleString()}
              {typeof meeting.durationSeconds === "number"
                ? ` · ${formatDuration(meeting.durationSeconds)}`
                : ""}
              {" · "}
              <span className="uppercase tracking-wide">{meeting.status}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {meeting.status === "completed" ? (
              <>
                <a
                  href={`/api/meetings/${meeting.id}/export?format=md`}
                  className="min-h-[44px] flex items-center rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-200 hover:bg-neutral-800"
                  download
                >
                  Export MD
                </a>
                <a
                  href={`/api/meetings/${meeting.id}/export?format=pdf`}
                  className="min-h-[44px] flex items-center rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-200 hover:bg-neutral-800"
                  download
                >
                  Export PDF
                </a>
              </>
            ) : null}
            <Link
              href="/meetings"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              ← All meetings
            </Link>
          </div>
        </header>

        {!isTerminal ? <MeetingDetailPoller id={meeting.id} /> : null}

        {meeting.status === "error" ? (
          <div
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"
          >
            {meeting.error ?? "Transcription failed."}
          </div>
        ) : null}

        {meeting.status === "completed" ? (
          <>
            {meeting.costBreakdown ? (
              <MeetingCostPanel breakdown={meeting.costBreakdown} />
            ) : null}
            {meeting.intakeForm ? (
              <IntakeFormView intake={meeting.intakeForm} />
            ) : null}
            <TranscriptView
              utterances={meeting.utterances}
              text={meeting.text ?? undefined}
              durationSeconds={meeting.durationSeconds ?? undefined}
              summary={meeting.summary ?? undefined}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
