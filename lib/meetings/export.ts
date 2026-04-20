/**
 * Meeting export utilities.
 */

import type { Meeting } from "./types";

/**
 * Generate a filename stem for a meeting export.
 * e.g. "2026-04-19-quarterly-planning-review"
 */
export function meetingFilenameStem(meeting: Meeting): string {
  const date = meeting.createdAt.split("T")[0];
  const slug = (meeting.title ?? "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${date}-${slug}`;
}

/**
 * Convert a meeting to Markdown format for export.
 */
export function meetingToMarkdown(meeting: Meeting): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${meeting.title ?? "Untitled Recording"}`);
  lines.push("");
  lines.push(`**Date:** ${new Date(meeting.createdAt).toLocaleDateString()}`);
  if (meeting.durationSeconds) {
    const mins = Math.round(meeting.durationSeconds / 60);
    lines.push(`**Duration:** ${mins} minutes`);
  }
  lines.push("");

  // Summary
  if (meeting.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(meeting.summary.summary);
    lines.push("");

    // Key Points
    if (meeting.summary.keyPoints.length > 0) {
      lines.push("## Key Points");
      lines.push("");
      for (const point of meeting.summary.keyPoints) {
        lines.push(`- ${point}`);
      }
      lines.push("");
    }

    // Action Items
    if (meeting.summary.actionItems.length > 0) {
      lines.push("## Action Items");
      lines.push("");
      for (const item of meeting.summary.actionItems) {
        const assignee = item.assignee ? ` (${item.assignee})` : "";
        const due = item.dueDate ? ` -- due ${item.dueDate}` : "";
        lines.push(`- [ ] ${item.task}${assignee}${due}`);
      }
      lines.push("");
    }

    // Decisions
    if (meeting.summary.decisions.length > 0) {
      lines.push("## Decisions");
      lines.push("");
      for (const decision of meeting.summary.decisions) {
        lines.push(`- ${decision}`);
      }
      lines.push("");
    }

    // Participants
    if (meeting.summary.participants.length > 0) {
      lines.push(
        `**Participants:** ${meeting.summary.participants.join(", ")}`,
      );
      lines.push("");
    }
  }

  // Intake Form
  if (meeting.intakeForm && meeting.intakeForm.intent !== "unclear") {
    lines.push("## Intake Form");
    lines.push("");
    lines.push(`**Intent:** ${meeting.intakeForm.intent}`);
    if (meeting.intakeForm.primaryParticipant) {
      lines.push(
        `**Primary Participant:** ${meeting.intakeForm.primaryParticipant}`,
      );
    }
    if (meeting.intakeForm.organization) {
      lines.push(`**Organization:** ${meeting.intakeForm.organization}`);
    }
    if (meeting.intakeForm.budgetMentioned) {
      lines.push(`**Budget:** ${meeting.intakeForm.budgetMentioned}`);
    }
    if (meeting.intakeForm.timeline) {
      lines.push(`**Timeline:** ${meeting.intakeForm.timeline}`);
    }
    if (meeting.intakeForm.requirements.length > 0) {
      lines.push("**Requirements:**");
      for (const req of meeting.intakeForm.requirements) {
        lines.push(`- ${req}`);
      }
    }
    if (meeting.intakeForm.painPoints.length > 0) {
      lines.push("**Pain Points:**");
      for (const pp of meeting.intakeForm.painPoints) {
        lines.push(`- ${pp}`);
      }
    }
    if (meeting.intakeForm.nextSteps.length > 0) {
      lines.push("**Next Steps:**");
      for (const ns of meeting.intakeForm.nextSteps) {
        lines.push(`- ${ns}`);
      }
    }
    lines.push("");
  }

  // Transcript
  if (meeting.utterances.length > 0) {
    lines.push("## Transcript");
    lines.push("");
    for (const u of meeting.utterances) {
      lines.push(`**${u.speaker ?? "Unknown"}:** ${u.text}`);
      lines.push("");
    }
  } else if (meeting.text) {
    lines.push("## Transcript");
    lines.push("");
    lines.push(meeting.text);
    lines.push("");
  }

  return lines.join("\n");
}
