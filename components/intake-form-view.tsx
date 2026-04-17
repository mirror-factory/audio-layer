"use client";

/**
 * Renders the structured IntakeForm extracted from a meeting.
 *
 * Hidden entirely when every field is empty/null — the LLM is told to
 * leave fields blank rather than invent data, so a casual chat won't
 * surface a half-empty intake panel.
 */

import type { IntakeForm } from "@/lib/assemblyai/intake";

interface Props {
  intake: IntakeForm;
}

export function IntakeFormView({ intake }: Props) {
  if (!hasAnyContent(intake)) return null;

  return (
    <section
      aria-label="Intake form"
      className="rounded-lg border border-emerald-900/60 bg-emerald-950/10 p-4"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">
          Intake form
        </h2>
        <span className="text-[10px] uppercase tracking-wide text-emerald-400/80">
          Auto-extracted
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <Field label="Intent" value={intake.intent} />
        <Field label="Primary participant" value={intake.primaryParticipant} />
        <Field label="Organization" value={intake.organization} />
        <Field label="Email" value={intake.contactInfo.email} />
        <Field label="Phone" value={intake.contactInfo.phone} />
        <Field label="Budget" value={intake.budgetMentioned} />
        <Field label="Timeline" value={intake.timeline} />
      </dl>

      <ListBlock label="Decision makers" items={intake.decisionMakers} />
      <ListBlock label="Requirements" items={intake.requirements} />
      <ListBlock label="Pain points" items={intake.painPoints} />
      <ListBlock label="Next steps" items={intake.nextSteps} />
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-neutral-200">
        {value && value.trim() ? value : <Empty />}
      </dd>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </h3>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-200">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return <span className="text-neutral-600">—</span>;
}

function hasAnyContent(intake: IntakeForm): boolean {
  if (intake.intent && intake.intent !== "unclear") return true;
  if (intake.primaryParticipant) return true;
  if (intake.organization) return true;
  if (intake.contactInfo.email || intake.contactInfo.phone) return true;
  if (intake.budgetMentioned) return true;
  if (intake.timeline) return true;
  if (intake.decisionMakers.length > 0) return true;
  if (intake.requirements.length > 0) return true;
  if (intake.painPoints.length > 0) return true;
  if (intake.nextSteps.length > 0) return true;
  return false;
}
