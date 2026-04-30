import { AudioWaveRibbon } from "./audio-wave-ribbon";
import {
  SessionCaptureCard,
  SessionIntelligenceCanvas,
  SessionStopButton,
} from "./session-workspace";

const meta = {
  title: "Components/session-workspace",
};

export default meta;

const transcriptRows = [
  {
    id: "1",
    timestamp: "0:04",
    text: "Audio notes are working well, but transcript search should be next.",
    tone: "blue" as const,
  },
  {
    id: "2",
    timestamp: "0:18",
    text: "Calendar context needs to appear before recording starts.",
    tone: "cyan" as const,
  },
  {
    id: "3",
    timestamp: "0:35",
    text: "Action items should include owners, due dates, and priority.",
    tone: "orange" as const,
  },
];

const actions = [
  { id: "search", text: "Define search MVP", due: "May 2", priority: "High" as const },
  { id: "calendar", text: "Prototype calendar context", due: "May 5", priority: "Med" as const },
  { id: "test", text: "User test new flow", due: "May 8", priority: "Low" as const },
];

export const Live = {
  render: () => (
    <div className="paper-calm-page session-workspace-page min-h-screen-safe p-6">
      <div className="session-detail-workspace">
        <SessionCaptureCard
          date={new Date("2026-04-28T10:00:00Z")}
          durationLabel="00:13"
          statusLabel="Writing notes"
          badgeLabel="LIVE"
          title="Product planning session"
          subtitle="Layers roadmap"
          calendarConnected
          stats={{ segments: 6, words: 76, points: 4, actions: 3 }}
          waveSlot={<AudioWaveRibbon active audioLevel={0.4} height={118} />}
          controlSlot={<SessionStopButton label="Stop recording" />}
        />
        <SessionIntelligenceCanvas
          mode="live"
          summaryText="We are aligning on the Layers roadmap. Decisions made on transcript search priority, calendar context before recording, and action items with owners."
          updatedLabel="Updated just now"
          transcriptRows={transcriptRows}
          keyPoints={[
            "Transcript search is the next priority.",
            "Show calendar context before recording begins.",
            "Action items need owners, due dates, priority.",
          ]}
          actions={actions}
          decisions={["Transcript search is next."]}
          footerStatus="Live - new content arriving"
        />
      </div>
    </div>
  ),
};
