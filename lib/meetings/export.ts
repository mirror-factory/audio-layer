/**
 * Meeting → Markdown serializer.
 *
 * Pure function. No I/O. Used by the export route and tested in
 * isolation. Output is intentionally portable: GitHub-flavored
 * markdown, no HTML, sane heading hierarchy.
 */

import type { Meeting } from "./types";
import type { IntakeForm } from "@/lib/assemblyai/intake";

function intakeHasContent(intake: IntakeForm): boolean {
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

export function meetingToMarkdown(meeting: Meeting): string {
  const lines: string[] = [];

  const title = meeting.title?.trim() || "Untitled recording";
  lines.push(`# ${title}`, "");

  const meta: string[] = [];
  meta.push(`Recorded: ${new Date(meeting.createdAt).toLocaleString()}`);
  if (typeof meeting.durationSeconds === "number") {
    meta.push(`Duration: ${formatDuration(meeting.durationSeconds)}`);
  }
  meta.push(`Status: ${meeting.status}`);
  lines.push(meta.join(" · "), "");

  const summary = meeting.summary;
  if (summary) {
    if (summary.summary) {
      lines.push("## Summary", "", summary.summary, "");
    }
    if (summary.keyPoints.length > 0) {
      lines.push("## Key points", "");
      for (const p of summary.keyPoints) lines.push(`- ${p}`);
      lines.push("");
    }
    if (summary.decisions.length > 0) {
      lines.push("## Decisions", "");
      for (const d of summary.decisions) lines.push(`- ${d}`);
      lines.push("");
    }
    if (summary.actionItems.length > 0) {
      lines.push("## Action items", "");
      for (const a of summary.actionItems) {
        const owner = a.assignee ? ` _(${a.assignee})_` : "";
        const due = a.dueDate ? ` — due ${a.dueDate}` : "";
        lines.push(`- [ ] ${a.task}${owner}${due}`);
      }
      lines.push("");
    }
    if (summary.participants.length > 0) {
      lines.push("## Participants", "");
      for (const p of summary.participants) lines.push(`- ${p}`);
      lines.push("");
    }
  }

  const intake = meeting.intakeForm;
  if (intake && intakeHasContent(intake)) {
    lines.push("## Intake", "");
    if (intake.intent && intake.intent !== "unclear") {
      lines.push(`- **Intent:** ${intake.intent}`);
    }
    if (intake.primaryParticipant) {
      lines.push(`- **Primary participant:** ${intake.primaryParticipant}`);
    }
    if (intake.organization) {
      lines.push(`- **Organization:** ${intake.organization}`);
    }
    if (intake.contactInfo.email) {
      lines.push(`- **Email:** ${intake.contactInfo.email}`);
    }
    if (intake.contactInfo.phone) {
      lines.push(`- **Phone:** ${intake.contactInfo.phone}`);
    }
    if (intake.budgetMentioned) {
      lines.push(`- **Budget:** ${intake.budgetMentioned}`);
    }
    if (intake.timeline) {
      lines.push(`- **Timeline:** ${intake.timeline}`);
    }
    lines.push("");
    if (intake.decisionMakers.length > 0) {
      lines.push("### Decision makers", "");
      for (const d of intake.decisionMakers) lines.push(`- ${d}`);
      lines.push("");
    }
    if (intake.requirements.length > 0) {
      lines.push("### Requirements", "");
      for (const r of intake.requirements) lines.push(`- ${r}`);
      lines.push("");
    }
    if (intake.painPoints.length > 0) {
      lines.push("### Pain points", "");
      for (const p of intake.painPoints) lines.push(`- ${p}`);
      lines.push("");
    }
    if (intake.nextSteps.length > 0) {
      lines.push("### Next steps", "");
      for (const n of intake.nextSteps) lines.push(`- ${n}`);
      lines.push("");
    }
  }

  lines.push("## Transcript", "");
  if (meeting.utterances.length > 0) {
    for (const u of meeting.utterances) {
      const who = u.speaker ? `**Speaker ${u.speaker}**` : "**Speaker**";
      const ts = `_(${formatTs(u.start)})_`;
      lines.push(`${who} ${ts}`, "", u.text, "");
    }
  } else if (meeting.text) {
    lines.push(meeting.text, "");
  } else {
    lines.push("_No transcript content._", "");
  }

  // Trim trailing blank lines.
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n") + "\n";
}

/**
 * Slugifies a meeting title for use in download filenames. Falls back
 * to the meeting id when the title produces an empty slug.
 */
export function meetingFilenameStem(meeting: Meeting): string {
  const base = (meeting.title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `meeting-${meeting.id.slice(0, 8)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
