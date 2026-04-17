/**
 * Meeting → PDF rendering via @react-pdf/renderer.
 *
 * Server-only: imports `@react-pdf/renderer` which pulls in pdfkit
 * etc. and would balloon the client bundle. The export route is the
 * only call site.
 *
 * Output is intentionally close in shape to the Markdown export so
 * the same content survives both formats — same ordering, same
 * sections, same emptiness rules.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Meeting } from "./types";
import type { IntakeForm } from "@/lib/assemblyai/intake";
import React from "react";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1f2937",
    lineHeight: 1.45,
  },
  title: { fontSize: 22, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 18 },
  h2: {
    fontSize: 13,
    marginTop: 14,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  h3: {
    fontSize: 11,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  paragraph: { marginBottom: 6 },
  listItem: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10, fontFamily: "Helvetica-Bold" },
  listText: { flex: 1 },
  utteranceBlock: {
    marginBottom: 8,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#10b981",
    borderLeftStyle: "solid",
  },
  speaker: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#059669" },
  utteranceText: { marginTop: 2 },
  intakeRow: { flexDirection: "row", marginBottom: 2 },
  intakeLabel: { width: 100, fontFamily: "Helvetica-Bold", color: "#374151" },
  intakeValue: { flex: 1 },
});

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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.listText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

function MeetingDocument({ meeting }: { meeting: Meeting }) {
  const meta = [
    `Recorded: ${new Date(meeting.createdAt).toLocaleString()}`,
    typeof meeting.durationSeconds === "number"
      ? `Duration: ${formatDuration(meeting.durationSeconds)}`
      : null,
    `Status: ${meeting.status}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const intake = meeting.intakeForm;
  const hasIntake = intake && intakeHasContent(intake);
  const summary = meeting.summary;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>
          {meeting.title?.trim() || "Untitled recording"}
        </Text>
        <Text style={styles.meta}>{meta}</Text>

        {summary ? (
          <>
            {summary.summary ? (
              <>
                <Text style={styles.h2}>Summary</Text>
                <Text style={styles.paragraph}>{summary.summary}</Text>
              </>
            ) : null}
            {summary.keyPoints.length > 0 ? (
              <>
                <Text style={styles.h2}>Key points</Text>
                <BulletList items={summary.keyPoints} />
              </>
            ) : null}
            {summary.decisions.length > 0 ? (
              <>
                <Text style={styles.h2}>Decisions</Text>
                <BulletList items={summary.decisions} />
              </>
            ) : null}
            {summary.actionItems.length > 0 ? (
              <>
                <Text style={styles.h2}>Action items</Text>
                {summary.actionItems.map((a, i) => {
                  const owner = a.assignee ? `  (${a.assignee})` : "";
                  const due = a.dueDate ? `  — due ${a.dueDate}` : "";
                  return (
                    <View key={i} style={styles.listItem}>
                      <Text style={styles.bullet}>☐ </Text>
                      <Text style={styles.listText}>
                        {a.task}
                        {owner}
                        {due}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : null}
            {summary.participants.length > 0 ? (
              <>
                <Text style={styles.h2}>Participants</Text>
                <BulletList items={summary.participants} />
              </>
            ) : null}
          </>
        ) : null}

        {hasIntake ? (
          <>
            <Text style={styles.h2}>Intake</Text>
            {intake.intent && intake.intent !== "unclear" ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Intent</Text>
                <Text style={styles.intakeValue}>{intake.intent}</Text>
              </View>
            ) : null}
            {intake.primaryParticipant ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Primary</Text>
                <Text style={styles.intakeValue}>
                  {intake.primaryParticipant}
                </Text>
              </View>
            ) : null}
            {intake.organization ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Organization</Text>
                <Text style={styles.intakeValue}>{intake.organization}</Text>
              </View>
            ) : null}
            {intake.contactInfo.email ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Email</Text>
                <Text style={styles.intakeValue}>
                  {intake.contactInfo.email}
                </Text>
              </View>
            ) : null}
            {intake.contactInfo.phone ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Phone</Text>
                <Text style={styles.intakeValue}>
                  {intake.contactInfo.phone}
                </Text>
              </View>
            ) : null}
            {intake.budgetMentioned ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Budget</Text>
                <Text style={styles.intakeValue}>{intake.budgetMentioned}</Text>
              </View>
            ) : null}
            {intake.timeline ? (
              <View style={styles.intakeRow}>
                <Text style={styles.intakeLabel}>Timeline</Text>
                <Text style={styles.intakeValue}>{intake.timeline}</Text>
              </View>
            ) : null}
            {intake.decisionMakers.length > 0 ? (
              <>
                <Text style={styles.h3}>Decision makers</Text>
                <BulletList items={intake.decisionMakers} />
              </>
            ) : null}
            {intake.requirements.length > 0 ? (
              <>
                <Text style={styles.h3}>Requirements</Text>
                <BulletList items={intake.requirements} />
              </>
            ) : null}
            {intake.painPoints.length > 0 ? (
              <>
                <Text style={styles.h3}>Pain points</Text>
                <BulletList items={intake.painPoints} />
              </>
            ) : null}
            {intake.nextSteps.length > 0 ? (
              <>
                <Text style={styles.h3}>Next steps</Text>
                <BulletList items={intake.nextSteps} />
              </>
            ) : null}
          </>
        ) : null}

        <Text style={styles.h2}>Transcript</Text>
        {meeting.utterances.length > 0 ? (
          meeting.utterances.map((u, i) => (
            <View key={`${u.start}-${i}`} style={styles.utteranceBlock}>
              <Text style={styles.speaker}>
                {u.speaker ? `Speaker ${u.speaker}` : "Speaker"}{"   "}
                {formatTs(u.start)}
              </Text>
              <Text style={styles.utteranceText}>{u.text}</Text>
            </View>
          ))
        ) : meeting.text ? (
          <Text style={styles.paragraph}>{meeting.text}</Text>
        ) : (
          <Text style={styles.paragraph}>No transcript content.</Text>
        )}
      </Page>
    </Document>
  );
}

export async function meetingToPdfBuffer(meeting: Meeting): Promise<Buffer> {
  return renderToBuffer(<MeetingDocument meeting={meeting} />);
}
