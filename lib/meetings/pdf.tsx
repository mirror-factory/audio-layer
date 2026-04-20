/**
 * Meeting PDF export via @react-pdf/renderer.
 *
 * Server-only. Lazy-loaded by the export route to keep the heavy
 * renderer out of cold-start paths. Same section ordering as
 * meetingToMarkdown so both formats stay in lockstep.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Meeting } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Courier",
    fontSize: 10,
    color: "#1a1a1a",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#666", marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#0d9488",
  },
  text: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
  bullet: { fontSize: 10, lineHeight: 1.5, marginBottom: 2, paddingLeft: 12 },
  utterance: { marginBottom: 6 },
  speaker: { fontSize: 9, fontWeight: "bold", color: "#444" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginVertical: 12,
  },
  field: { marginBottom: 6 },
  fieldLabel: { fontSize: 9, fontWeight: "bold", color: "#666" },
  fieldValue: { fontSize: 10 },
  costRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
});

function MeetingPdf({ meeting }: { meeting: Meeting }) {
  const s = meeting.summary;
  const intake = meeting.intakeForm;
  const cost = meeting.costBreakdown;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{s?.title ?? meeting.title ?? "Untitled"}</Text>
        <Text style={styles.subtitle}>
          {new Date(meeting.createdAt).toLocaleString()}
          {meeting.durationSeconds
            ? ` · ${Math.round(meeting.durationSeconds / 60)} min`
            : ""}
        </Text>

        {s?.summary && (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text}>{s.summary}</Text>
          </>
        )}

        {s?.keyPoints && s.keyPoints.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Key Points</Text>
            {s.keyPoints.map((p, i) => (
              <Text key={i} style={styles.bullet}>• {p}</Text>
            ))}
          </>
        )}

        {s?.actionItems && s.actionItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Action Items</Text>
            {s.actionItems.map((a, i) => (
              <Text key={i} style={styles.bullet}>
                • {a.assignee ? `[${a.assignee}] ` : ""}{a.task}
                {a.dueDate ? ` (due: ${a.dueDate})` : ""}
              </Text>
            ))}
          </>
        )}

        {s?.decisions && s.decisions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Decisions</Text>
            {s.decisions.map((d, i) => (
              <Text key={i} style={styles.bullet}>• {d}</Text>
            ))}
          </>
        )}

        {intake && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Intake Form</Text>
            {intake.intent && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Intent</Text>
                <Text style={styles.fieldValue}>{intake.intent}</Text>
              </View>
            )}
            {intake.primaryParticipant && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Primary Participant</Text>
                <Text style={styles.fieldValue}>{intake.primaryParticipant}</Text>
              </View>
            )}
            {intake.organization && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Organization</Text>
                <Text style={styles.fieldValue}>{intake.organization}</Text>
              </View>
            )}
            {intake.budgetMentioned && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Budget</Text>
                <Text style={styles.fieldValue}>{intake.budgetMentioned}</Text>
              </View>
            )}
            {intake.timeline && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Timeline</Text>
                <Text style={styles.fieldValue}>{intake.timeline}</Text>
              </View>
            )}
            {intake.requirements.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Requirements</Text>
                {intake.requirements.map((r, i) => (
                  <Text key={i} style={styles.bullet}>• {r}</Text>
                ))}
              </View>
            )}
            {intake.painPoints.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Pain Points</Text>
                {intake.painPoints.map((p, i) => (
                  <Text key={i} style={styles.bullet}>• {p}</Text>
                ))}
              </View>
            )}
            {intake.nextSteps.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Next Steps</Text>
                {intake.nextSteps.map((n, i) => (
                  <Text key={i} style={styles.bullet}>• {n}</Text>
                ))}
              </View>
            )}
          </>
        )}

        {cost && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Cost Breakdown</Text>
            <View style={styles.costRow}>
              <Text style={styles.fieldLabel}>STT ({cost.stt.mode})</Text>
              <Text style={styles.fieldValue}>${cost.stt.totalCostUsd.toFixed(4)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.fieldLabel}>LLM</Text>
              <Text style={styles.fieldValue}>${cost.llm.totalCostUsd.toFixed(4)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={{ ...styles.fieldLabel, fontWeight: "bold" }}>Total</Text>
              <Text style={{ ...styles.fieldValue, fontWeight: "bold" }}>${cost.totalCostUsd.toFixed(4)}</Text>
            </View>
          </>
        )}

        {meeting.utterances.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Transcript</Text>
            {meeting.utterances.map((u, i) => (
              <View key={i} style={styles.utterance}>
                <Text style={styles.speaker}>
                  {u.speaker ?? "Unknown"} {formatTime(u.start)}
                </Text>
                <Text style={styles.text}>{u.text}</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export async function meetingToPdfBuffer(meeting: Meeting): Promise<Buffer> {
  const buffer = await renderToBuffer(<MeetingPdf meeting={meeting} />);
  return Buffer.from(buffer);
}
