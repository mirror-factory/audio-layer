import type { ReactNode } from "react";
import {
  AudioLines,
  Bookmark,
  CalendarDays,
  Circle,
  Link2,
  ListChecks,
  MessageCircle,
  Sparkles,
  Square,
} from "lucide-react";

export interface SessionWorkspaceStats {
  segments: number;
  words: number;
  points: number;
  actions: number;
}

export interface SessionTranscriptRow {
  id: string;
  timestamp: string;
  text: string;
  tone?: "blue" | "cyan" | "orange";
  live?: boolean;
}

export interface SessionActionRow {
  id: string;
  text: string;
  due?: string | null;
  priority?: "High" | "Med" | "Low";
}

interface SessionCaptureCardProps {
  date: Date;
  durationLabel: string;
  statusLabel: string;
  badgeLabel: string;
  badgeTone?: "live" | "done";
  title: string;
  subtitle: string;
  calendarConnected?: boolean;
  stats: SessionWorkspaceStats;
  waveSlot: ReactNode;
  controlSlot?: ReactNode;
}

interface SessionIntelligenceCanvasProps {
  mode: "live" | "summary";
  summaryText: string;
  updatedLabel: string;
  transcriptRows: SessionTranscriptRow[];
  keyPoints: string[];
  actions: SessionActionRow[];
  decisions?: string[];
  askPanel?: ReactNode;
  askTimestampLabel?: string;
  footerStatus?: string;
}

export function formatWorkspaceTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function countWorkspaceWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function SessionCaptureCard({
  date,
  durationLabel,
  statusLabel,
  badgeLabel,
  badgeTone = "live",
  title,
  subtitle,
  calendarConnected = false,
  stats,
  waveSlot,
  controlSlot,
}: SessionCaptureCardProps) {
  const fullDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
  const tileMonth = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
  const tileDay = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
  }).format(date);

  return (
    <section className="session-capture-card" aria-label="Recording session">
      <div className="session-capture-date">
        <CalendarDays size={18} aria-hidden="true" />
        <span>{fullDate}</span>
      </div>

      <div className="session-capture-timer">
        <strong>{durationLabel}</strong>
        <div className="session-capture-state">
          <span>{statusLabel}</span>
          <em className={`session-live-badge is-${badgeTone}`}>
            <span aria-hidden="true" />
            {badgeLabel}
          </em>
        </div>
      </div>

      <div className="session-capture-wave" aria-hidden="true">
        {waveSlot}
      </div>

      <div className="session-capture-context">
        <time className="session-date-tile" dateTime={date.toISOString()}>
          <span>{tileMonth}</span>
          <strong>{tileDay}</strong>
        </time>
        <div className="session-capture-copy">
          <h2>{title}</h2>
          <p>{subtitle}</p>
          <span
            className={`session-calendar-pill ${
              calendarConnected ? "is-connected" : ""
            }`}
          >
            <Link2 size={13} aria-hidden="true" />
            {calendarConnected ? "Connected to calendar" : "Calendar not linked"}
          </span>
        </div>
      </div>

      <div className="session-stat-grid" aria-label="Session metrics">
        <SessionStat value={stats.segments} label="Segments" />
        <SessionStat value={stats.words} label="Words" />
        <SessionStat value={stats.points} label="Points" />
        <SessionStat value={stats.actions} label="Actions" />
      </div>

      {controlSlot}
    </section>
  );
}

function SessionStat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

export function SessionIntelligenceCanvas({
  mode,
  summaryText,
  updatedLabel,
  transcriptRows,
  keyPoints,
  actions,
  decisions = [],
  askPanel,
  askTimestampLabel = "Now",
  footerStatus,
}: SessionIntelligenceCanvasProps) {
  const actionCount = actions.length;
  const pointCount = keyPoints.length;

  return (
    <section className="session-intelligence-canvas" aria-label="Meeting notes">
      <div className="session-tabs" role="tablist" aria-label="Meeting views">
        <button type="button" className="is-active" role="tab" aria-selected>
          <AudioLines size={18} aria-hidden="true" />
          <span>Transcript</span>
        </button>
        <button type="button" role="tab" aria-selected={false}>
          <Bookmark size={18} aria-hidden="true" />
          <span>Key points</span>
          <em>{pointCount}</em>
        </button>
        <button type="button" role="tab" aria-selected={false}>
          <MessageCircle size={18} aria-hidden="true" />
          <span>Ask</span>
        </button>
        <button type="button" role="tab" aria-selected={false}>
          <ListChecks size={18} aria-hidden="true" />
          <span>Actions</span>
          <em>{actionCount}</em>
        </button>
      </div>

      <div className="session-canvas-grid">
        <div className="session-primary-column">
          <article className="session-panel session-summary-panel">
            <header>
              <div>
                <Sparkles size={18} aria-hidden="true" />
                <h2>{mode === "live" ? "Live summary" : "Summary"}</h2>
              </div>
              <span>{updatedLabel}</span>
            </header>
            <p>{summaryText}</p>
          </article>

          <article className="session-panel session-transcript-panel">
            <header>
              <div>
                <h2>{mode === "live" ? "Live transcript" : "Transcript"}</h2>
                {mode === "live" && (
                  <span className="session-inline-live">
                    <span aria-hidden="true" />
                    LIVE
                  </span>
                )}
              </div>
              <span>{mode === "live" ? "Auto-scrolling" : "Export ready"}</span>
            </header>
            <SessionTranscriptList rows={transcriptRows} />
          </article>
        </div>

        <aside className="session-side-column">
          {askPanel ?? (
            <LiveAskPreview
              decisions={decisions}
              actions={actions}
              keyPoints={keyPoints}
              timestampLabel={askTimestampLabel}
            />
          )}

          <SignalListCard
            title="Key points"
            count={pointCount}
            items={keyPoints}
            empty="Key points will appear as the meeting develops."
          />

          <ActionListCard actions={actions} />
        </aside>
      </div>

      {footerStatus && (
        <div className="session-live-footer" role="status">
          <AudioLines size={14} aria-hidden="true" />
          {footerStatus}
        </div>
      )}
    </section>
  );
}

function SessionTranscriptList({ rows }: { rows: SessionTranscriptRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="session-empty-transcript">
        <span aria-hidden="true" />
        <p>Listening for the first words.</p>
      </div>
    );
  }

  return (
    <div className="session-transcript-list">
      {rows.map((row) => (
        <article className="session-transcript-row" key={row.id}>
          <time>{row.timestamp}</time>
          <span
            className={`session-transcript-dot is-${row.tone ?? "blue"} ${
              row.live ? "is-live" : ""
            }`}
            aria-hidden="true"
          />
          <p>{row.text}</p>
        </article>
      ))}
    </div>
  );
}

function LiveAskPreview({
  decisions,
  actions,
  keyPoints,
  timestampLabel,
}: {
  decisions: string[];
  actions: SessionActionRow[];
  keyPoints: string[];
  timestampLabel: string;
}) {
  const answerItems =
    decisions.length > 0
      ? decisions.slice(0, 3)
      : keyPoints.length > 0
        ? keyPoints.slice(0, 3)
        : actions.slice(0, 3).map((action) => action.text);

  return (
    <article className="session-panel session-ask-preview">
      <header>
        <div>
          <Sparkles size={18} aria-hidden="true" />
          <h2>Ask Layers</h2>
        </div>
      </header>
      <div className="session-chat-bubble is-user">
        <strong>You</strong>
        <p>What are the main decisions so far?</p>
        <span>{timestampLabel}</span>
      </div>
      <div className="session-chat-bubble">
        <strong>Layers</strong>
        {answerItems.length > 0 ? (
          <>
            {decisions.length > 0 && (
              <p>
                {decisions.length === 3
                  ? "Three decisions so far:"
                  : `${decisions.length} decisions so far:`}
              </p>
            )}
            <ol>
              {answerItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </>
        ) : (
          <p>Once the meeting has enough context, answers will appear here.</p>
        )}
        <span>{timestampLabel}</span>
      </div>
      <div className="session-prompt-chips">
        <span>Summarize last 5 min</span>
        <span>What changed?</span>
        <span>List blockers</span>
        <span>Draft follow-up</span>
      </div>
    </article>
  );
}

function SignalListCard({
  title,
  count,
  items,
  empty,
}: {
  title: string;
  count: number;
  items: string[];
  empty: string;
}) {
  return (
    <article className="session-panel session-signal-card">
      <header>
        <div>
          <Sparkles size={18} aria-hidden="true" />
          <h2>{title}</h2>
          <em>{count}</em>
        </div>
        <button type="button">View all</button>
      </header>
      {items.length > 0 ? (
        <ul>
          {items.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </article>
  );
}

function ActionListCard({ actions }: { actions: SessionActionRow[] }) {
  return (
    <article className="session-panel session-actions-card">
      <header>
        <div>
          <h2>Action items</h2>
          <em>{actions.length}</em>
        </div>
        <button type="button">View all</button>
      </header>
      {actions.length > 0 ? (
        <ul>
          {actions.slice(0, 4).map((action) => (
            <li key={action.id}>
              <Circle size={17} aria-hidden="true" />
              <span>{action.text}</span>
              {action.due && <time>{action.due}</time>}
              {action.priority && (
                <em className={`is-${action.priority.toLowerCase()}`}>
                  {action.priority}
                </em>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Action items will appear here when follow-ups are detected.</p>
      )}
    </article>
  );
}

export function SessionStopButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="session-stop-button"
      onClick={onClick}
      disabled={disabled}
    >
      <span>
        <Square size={15} fill="currentColor" aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}
