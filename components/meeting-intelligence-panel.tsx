import {
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MeetingSummary } from "@/lib/assemblyai/schema";
import type { IntakeForm } from "@/lib/assemblyai/intake";
import {
  buildMeetingIntakeSignals,
  formatMeetingActionItem,
} from "@/lib/meeting-notes";

interface MeetingIntelligencePanelProps {
  summary: MeetingSummary | null;
  intakeForm: IntakeForm | null;
}

function NoteList({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="meeting-note-card rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Icon size={16} className="text-[#14b8a6]" aria-hidden="true" />
        <h3>{title}</h3>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.slice(0, 7).map((item, index) => (
            <li
              key={`${title}-${index}-${item}`}
              className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]"
            >
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#14b8a6]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-[var(--text-muted)]">{empty}</p>
      )}
    </div>
  );
}

export function MeetingIntelligencePanel({
  summary,
  intakeForm,
}: MeetingIntelligencePanelProps) {
  const actions = summary?.actionItems.map(formatMeetingActionItem) ?? [];
  const intakeSignals = buildMeetingIntakeSignals(intakeForm);
  const summaryText =
    summary?.summary ??
    "Layer One did not generate a summary for this recording yet.";
  const keyPoints = summary?.keyPoints ?? [];

  return (
    <section
      aria-labelledby="meeting-notes-heading"
      className="meeting-notes-panel rounded-xl border border-[var(--border-card)] bg-[var(--surface-panel)] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="signal-eyebrow">Notes</p>
          <h2
            id="meeting-notes-heading"
            className="mt-1 text-xl font-semibold tracking-normal text-[var(--text-primary)]"
          >
            Summary
          </h2>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <FileText size={13} className="text-[#14b8a6]" aria-hidden="true" />
          Extracted from transcript
        </div>
      </div>

      <div className="meeting-summary-card mt-4 rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] p-4">
        <p className="text-base leading-7 text-[var(--text-primary)]">
          {summaryText}
        </p>

        {keyPoints.length > 0 && (
          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <ClipboardList size={14} aria-hidden="true" />
              Key points
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {keyPoints.slice(0, 6).map((point, index) => (
                <li
                  key={`${point}-${index}`}
                  className="rounded-md bg-[var(--surface-control)] px-3 py-2 text-sm leading-5 text-[var(--text-secondary)]"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <NoteList
          icon={CheckCircle2}
          title="Decisions"
          items={summary?.decisions ?? []}
          empty="No explicit decisions were detected."
        />
        <NoteList
          icon={ListChecks}
          title="Actions"
          items={actions}
          empty="No action items were detected."
        />
      </div>

      <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-control)] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          <Target size={14} aria-hidden="true" />
          Intake context
        </div>
        {intakeSignals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {intakeSignals.slice(0, 8).map((signal) => (
              <span
                key={signal}
                className="rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]"
              >
                {signal}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            No budget, timeline, pain, or requirement signals were detected.
          </p>
        )}

        {intakeForm?.primaryParticipant || intakeForm?.organization ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <Users size={13} aria-hidden="true" />
            <span>{intakeForm.primaryParticipant ?? "Unknown participant"}</span>
            <span aria-hidden="true">/</span>
            <span>{intakeForm.organization ?? "Unknown organization"}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
