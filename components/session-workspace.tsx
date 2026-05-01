"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDown,
  AudioLines,
  Bookmark,
  CalendarDays,
  Circle,
  Link2,
  ListChecks,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  Square,
} from "lucide-react";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";

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
  showStats?: boolean;
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
  stats?: SessionWorkspaceStats;
  askPanel?: ReactNode;
  askTimestampLabel?: string;
  footerStatus?: string;
}

type SessionTab = "summary" | "transcript" | "key-points" | "ask" | "actions";

const LIVE_SESSION_TABS: Array<{
  id: SessionTab;
  label: string;
  icon: typeof AudioLines;
}> = [
  { id: "transcript", label: "Transcript", icon: AudioLines },
  { id: "key-points", label: "Key points", icon: Bookmark },
  { id: "ask", label: "Ask", icon: MessageCircle },
  { id: "actions", label: "Actions", icon: ListChecks },
];

const SUMMARY_SESSION_TABS: Array<{
  id: SessionTab;
  label: string;
  icon: typeof AudioLines;
}> = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "transcript", label: "Transcript", icon: AudioLines },
  { id: "ask", label: "Ask", icon: MessageCircle },
  { id: "actions", label: "Actions", icon: ListChecks },
];

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
  showStats = true,
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

      {showStats && <SessionMetricsStrip stats={stats} />}

      {controlSlot}
    </section>
  );
}

function SessionMetricsStrip({ stats }: { stats: SessionWorkspaceStats }) {
  return (
    <div className="session-stat-grid" aria-label="Session metrics">
      <SessionStat value={stats.segments} label="Segments" />
      <SessionStat value={stats.words} label="Words" />
      <SessionStat value={stats.points} label="Points" />
      <SessionStat value={stats.actions} label="Actions" />
    </div>
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
  stats,
  askPanel,
  askTimestampLabel = "Now",
  footerStatus,
}: SessionIntelligenceCanvasProps) {
  const [activeTab, setActiveTab] = useState<SessionTab>(
    mode === "summary" ? "summary" : "transcript",
  );
  const panelId = useId();
  const actionCount = actions.length;
  const pointCount = keyPoints.length;
  const decisionCount = decisions.length;
  const tabs = mode === "summary" ? SUMMARY_SESSION_TABS : LIVE_SESSION_TABS;

  function tabCount(tab: SessionTab) {
    if (tab === "key-points") return pointCount;
    if (tab === "actions") return actionCount;
    return null;
  }

  return (
    <section className="session-intelligence-canvas" aria-label="Meeting notes">
      <div className="session-tabs" role="tablist" aria-label="Meeting views">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          const count = tabCount(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              className={selected ? "is-active" : ""}
              role="tab"
              aria-selected={selected}
              aria-controls={`${panelId}-${tab.id}`}
              id={`${panelId}-${tab.id}-tab`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{tab.label}</span>
              {count !== null && <em>{count}</em>}
            </button>
          );
        })}
      </div>

      <div
        className={`session-tab-panel is-${activeTab}`}
        role="tabpanel"
        id={`${panelId}-${activeTab}`}
        aria-labelledby={`${panelId}-${activeTab}-tab`}
      >
        {activeTab === "summary" && (
          <div className="session-summary-tab-layout">
            <article className="session-panel session-summary-panel">
              <header>
                <div>
                  <Sparkles size={18} aria-hidden="true" />
                  <h2>Summary</h2>
                </div>
                <span>{updatedLabel}</span>
              </header>
              <p>{summaryText}</p>
            </article>

            <div className="session-summary-secondary-grid">
              <SignalListCard
                title="Key points"
                count={pointCount}
                items={keyPoints}
                empty="Key points will appear when the summary is ready."
              />
              <SignalListCard
                title="Decisions"
                count={decisionCount}
                items={decisions}
                empty="No explicit decisions were detected."
              />
            </div>
          </div>
        )}

        {activeTab === "transcript" && (
          <div className="session-primary-column">
            {mode === "live" && (
              <article className="session-panel session-summary-panel">
                <header>
                  <div>
                    <Sparkles size={18} aria-hidden="true" />
                    <h2>Live summary</h2>
                  </div>
                  <span>{updatedLabel}</span>
                </header>
                <p>{summaryText}</p>
              </article>
            )}

            {stats && (
              <article className="session-panel session-metrics-panel">
                <header>
                  <div>
                    <h2>Session totals</h2>
                  </div>
                  <span>{mode === "live" ? "Live" : "Ready"}</span>
                </header>
                <SessionMetricsStrip stats={stats} />
              </article>
            )}

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
              <SessionTranscriptList rows={transcriptRows} isLive={mode === "live"} />
            </article>
          </div>
        )}

        {activeTab === "key-points" && (
          <SignalListCard
            title="Key points"
            count={pointCount}
            items={keyPoints}
            empty="Key points will appear as the meeting develops."
          />
        )}

        {activeTab === "ask" &&
          (askPanel ?? (
            <LiveAskChat
              decisions={decisions}
              actions={actions}
              keyPoints={keyPoints}
              summaryText={summaryText}
              timestampLabel={askTimestampLabel}
            />
          ))}

        {activeTab === "actions" && <ActionListCard actions={actions} />}
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

function SessionTranscriptList({
  rows,
  isLive = false,
}: {
  rows: SessionTranscriptRow[];
  isLive?: boolean;
}) {
  // Key auto-scroll on row count, not streaming partial chunks. The "live"
  // partial row updates by id="live-partial" so it does not bump the count.
  const { scrollRef, hasNewContent, isAtBottom, scrollToBottom, onScroll } =
    useStickToBottom(rows.length);

  if (rows.length === 0) {
    return (
      <div className="session-empty-transcript">
        <span aria-hidden="true" />
        <p>Listening for the first words.</p>
      </div>
    );
  }

  return (
    <div className="session-transcript-scroller">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="session-transcript-list"
      >
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
      {isLive && hasNewContent && !isAtBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="session-transcript-jump"
          aria-label="Jump to live transcript"
        >
          <ArrowDown size={13} aria-hidden="true" />
          Jump to live
        </button>
      )}
    </div>
  );
}

function LiveAskChat({
  decisions,
  actions,
  keyPoints,
  summaryText,
  timestampLabel,
}: {
  decisions: string[];
  actions: SessionActionRow[];
  keyPoints: string[];
  summaryText: string;
  timestampLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; text: string; time: string }>
  >([
    {
      id: "assistant-initial",
      role: "assistant",
      text: "Ask about the live transcript, decisions, blockers, or follow-up notes.",
      time: timestampLabel,
    },
  ]);

  function submitPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const response = buildLiveAskResponse({
      prompt: trimmed,
      decisions,
      actions,
      keyPoints,
      summaryText,
    });

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
        time: timestampLabel,
      },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response,
        time: timestampLabel,
      },
    ]);
    setDraft("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(draft);
  }

  const { scrollRef, hasNewContent, isAtBottom, scrollToBottom, onScroll } =
    useStickToBottom(messages.length);

  return (
    <article className="session-panel session-ask-preview session-live-chat">
      <header>
        <div>
          <Sparkles size={18} aria-hidden="true" />
          <h2>Ask Layers</h2>
        </div>
      </header>

      <div className="session-live-chat-scroller">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="session-live-chat-messages"
          aria-live="polite"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`session-chat-bubble ${
                message.role === "user" ? "is-user" : ""
              }`}
            >
              <strong>{message.role === "user" ? "You" : "Layers"}</strong>
              <p>{message.text}</p>
              <span>{message.time}</span>
            </div>
          ))}
        </div>
        {hasNewContent && !isAtBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="session-chat-jump"
            aria-label="Jump to newest message"
          >
            <ArrowDown size={13} aria-hidden="true" />
            New message
          </button>
        )}
      </div>

      <div className="session-prompt-chips">
        {[
          "Summarize so far",
          "What changed?",
          "List blockers",
          "Draft follow-up",
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="session-prompt-button"
            onClick={() => submitPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="session-live-chat-form" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about the live transcript..."
          aria-label="Ask about the live transcript"
        />
        <button type="submit" disabled={!draft.trim()}>
          <SendHorizontal size={15} aria-hidden="true" />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </article>
  );
}

function buildLiveAskResponse({
  prompt,
  decisions,
  actions,
  keyPoints,
  summaryText,
}: {
  prompt: string;
  decisions: string[];
  actions: SessionActionRow[];
  keyPoints: string[];
  summaryText: string;
}) {
  const lowered = prompt.toLowerCase();
  const actionItems = actions.map((action) => action.text);
  const source =
    lowered.includes("decision")
      ? decisions
      : lowered.includes("action") || lowered.includes("follow")
        ? actionItems
        : lowered.includes("blocker") || lowered.includes("risk")
          ? keyPoints.filter((point) => /block|risk|issue|need|concern/i.test(point))
          : keyPoints;

  const items = source.length > 0 ? source.slice(0, 4) : keyPoints.slice(0, 4);

  if (items.length === 0) {
    return "I need a little more transcript before I can answer that with confidence.";
  }

  if (lowered.includes("follow")) {
    return `Draft follow-up: ${items.join(" ")} Next step: confirm owners and timing before the meeting ends.`;
  }

  if (lowered.includes("summary") || lowered.includes("summarize")) {
    return summaryText;
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
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
