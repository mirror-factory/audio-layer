"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  UsersRound,
} from "lucide-react";
import { AudioWaveRibbon } from "@/components/audio-wave-ribbon";
import { TopBar } from "@/components/top-bar";
import {
  LiveRecorder,
  type LiveRecorderHandle,
  type LiveRecorderSnapshot,
} from "@/components/live-recorder";
import {
  SessionIntelligenceCanvas,
  formatWorkspaceTimestamp,
  type SessionActionRow,
  type SessionTranscriptRow,
} from "@/components/session-workspace";
import {
  pickRecordingCalendarContext,
  type RecordingMeetingContext,
} from "@/lib/recording/meeting-context";
import {
  deriveLiveMeetingSignals,
  type LiveMeetingSignals,
} from "@/lib/recording/live-signals";
import { ProductLogo, type ProductLogoId } from "@/components/product-logos";

interface Turn {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
  final: boolean;
}

interface MeetingItem {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  durationSeconds: number | null;
}

interface CalendarMeetingItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  attendeesCount?: number;
}

interface CalendarOverview {
  connected: boolean;
  provider: string | null;
  accountEmail: string | null;
  items: CalendarMeetingItem[];
  setupRequired?: boolean;
  providerSetupRequired?: boolean;
  reauthRequired?: boolean;
  calendarFetchFailed?: boolean;
  calendarRateLimited?: boolean;
}

type CaptureState = "idle" | "arming" | "recording" | "saving" | "done";

const EMPTY_CALENDAR_OVERVIEW: CalendarOverview = {
  connected: false,
  provider: null,
  accountEmail: null,
  items: [],
};
const EMPTY_RECORDING_SECONDS_THRESHOLD = 30;
const MCP_PROVIDER_MARKS: Array<{
  name: string;
  mark?: string;
  productId?: ProductLogoId;
  tone: "mint" | "amber" | "blue" | "slate";
}> = [
  { name: "ChatGPT", productId: "chatgpt", tone: "mint" },
  { name: "Claude", productId: "claude", tone: "amber" },
  { name: "Gemini", productId: "gemini", tone: "blue" },
  { name: "xAI", mark: "xAI", tone: "slate" },
];

export function RecorderHome() {
  const router = useRouter();
  const recorderRef = useRef<LiveRecorderHandle | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<MeetingItem[]>([]);
  const [calendarOverview, setCalendarOverview] = useState<CalendarOverview>(
    EMPTY_CALENDAR_OVERVIEW,
  );
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [meetingsFading, setMeetingsFading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recorderSnapshot, setRecorderSnapshot] =
    useState<LiveRecorderSnapshot | null>(null);
  const [selectedCalendarEventId, setSelectedCalendarEventId] =
    useState<string | null>(null);
  const queuedCalendarStartIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const loadRecentMeetings = () => {
      fetch("/api/meetings?limit=5")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setRecentMeetings(data.items ?? data ?? []);
        })
        .catch(() => {});

      fetch("/api/calendar/upcoming?limit=3")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) {
            setCalendarOverview({
              connected: Boolean(data.connected),
              provider: data.provider ?? null,
              accountEmail: data.accountEmail ?? null,
              items: Array.isArray(data.items) ? data.items : [],
              setupRequired: Boolean(data.setupRequired),
              providerSetupRequired: Boolean(data.providerSetupRequired),
              reauthRequired: Boolean(data.reauthRequired),
              calendarFetchFailed: Boolean(data.calendarFetchFailed),
              calendarRateLimited: Boolean(data.calendarRateLimited),
            });
          }
        })
        .catch(() => {});
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(loadRecentMeetings, { timeout: 900 });
    } else {
      timeoutId = setTimeout(loadRecentMeetings, 180);
    }

    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleTranscriptUpdate = useCallback(
    (newTurns: Turn[], newPartial: string) => {
      setTurns([...newTurns]);
      setPartial(newPartial);
    },
    [],
  );

  const handleStateChange = useCallback(
    (recState: "idle" | "connecting" | "recording" | "finalizing") => {
      if (recState === "connecting") {
        setCaptureState("arming");
        setMeetingsFading(true);
      } else if (recState === "recording") {
        setCaptureState("recording");
        setMeetingsFading(false);
      } else if (recState === "finalizing") {
        setCaptureState("saving");
      } else {
        setCaptureState("idle");
        setMeetingsFading(false);
      }
    },
    [],
  );

  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
  }, []);

  const handleSessionEnd = useCallback(
    (meetingId: string) => {
      setCaptureState("done");
      setTimeout(() => {
        router.push(`/meetings/${meetingId}`);
      }, 2000);
    },
    [router],
  );

  const hasTranscript = turns.length > 0 || partial.length > 0;
  const selectedCalendarItem = useMemo(
    () =>
      selectedCalendarEventId
        ? calendarOverview.items.find((item) => item.id === selectedCalendarEventId) ?? null
        : null,
    [calendarOverview.items, selectedCalendarEventId],
  );
  const meetingContext = useMemo(
    () =>
      pickRecordingCalendarContext(
        selectedCalendarItem ? [selectedCalendarItem] : calendarOverview.items,
        calendarOverview.provider,
      ),
    [calendarOverview.items, calendarOverview.provider, selectedCalendarItem],
  );
  const isLiveWorkspace = captureState !== "idle" || hasTranscript;
  const liveSignals = useMemo(
    () => deriveLiveMeetingSignals(turns, partial),
    [turns, partial],
  );
  const workspaceRows = useMemo(
    () => buildWorkspaceTranscriptRows(turns, partial),
    [turns, partial],
  );
  const workspaceActions = useMemo(
    () => buildWorkspaceActions(liveSignals.actions.map((item) => item.text)),
    [liveSignals.actions],
  );
  const workspaceKeyPoints = liveSignals.keyPoints.map((item) => item.text);
  const workspaceDecisions = liveSignals.decisions.map((item) => item.text);
  const workspaceStats = {
    segments: turns.length,
    words: liveSignals.words,
    points: workspaceKeyPoints.length,
    actions: workspaceActions.length,
  };
  const workspaceTitle =
    meetingContext?.meetingTitle ?? "Product planning session";
  const workspaceSubtitle =
    meetingContext?.source === "calendar"
      ? meetingContext.location ?? "Calendar context"
      : "Layers roadmap";
  const workspaceDate = meetingContext
    ? new Date(meetingContext.startsAt)
    : new Date();
  const durationLabel = recorderSnapshot?.durationLabel ?? "00:00";
  const isArming =
    captureState === "arming" || recorderSnapshot?.state === "connecting";
  const isFinalizing =
    captureState === "saving" || recorderSnapshot?.state === "finalizing";
  const captureStatusLabel = isFinalizing
    ? "Saving notes"
    : isArming
      ? "Starting notes"
      : "Writing notes";
  const captureBadgeLabel = isFinalizing ? "SAVE" : isArming ? "START" : "LIVE";
  const waveActive =
    captureState === "arming" ||
    captureState === "recording" ||
    captureState === "saving";
  const handleDeleteRecentMeeting = useCallback((meetingId: string) => {
    setRecentMeetings((items) => items.filter((item) => item.id !== meetingId));
  }, []);
  const handleRecordCalendarMeeting = useCallback((meetingId: string) => {
    queuedCalendarStartIdRef.current = meetingId;
    setSelectedCalendarEventId(meetingId);
  }, []);

  useEffect(() => {
    const queuedCalendarStartId = queuedCalendarStartIdRef.current;
    if (
      !queuedCalendarStartId ||
      captureState !== "idle" ||
      meetingContext?.calendarEventId !== queuedCalendarStartId
    ) {
      return;
    }

    queuedCalendarStartIdRef.current = null;
    void recorderRef.current?.start();
  }, [captureState, meetingContext]);

  return (
    <div className="paper-calm-page recorder-page session-workspace-page min-h-screen-safe flex flex-col">
      <TopBar title="Layers" />

      <main className="home-app-shell mx-auto flex w-full flex-col px-4 pb-4 pt-3 sm:pt-5">
        <div
          className={`home-desktop-grid ${
            isLiveWorkspace ? "is-recording" : ""
          } ${meetingsFading && !isLiveWorkspace ? "is-arming" : ""}`}
        >
          {!isLiveWorkspace && (
            <div className="home-desktop-sidebar home-left-column">
              <RecentMeetings
                meetings={recentMeetings}
                meetingsFading={meetingsFading}
                compact
                onDeleteMeeting={handleDeleteRecentMeeting}
              />
            </div>
          )}

          <div className="home-center-column">
            <section
              className={`home-record-dock w-full flex-shrink-0 rounded-lg px-4 py-4 sm:px-6 sm:py-5 ${
                isLiveWorkspace ? "is-live" : ""
              }`}
            >
              {!isLiveWorkspace && (
                <HomeGreeting />
              )}

              {isLiveWorkspace && (
                <>
                  <div className="session-capture-date">
                    <CalendarDays size={18} aria-hidden="true" />
                    <span>{formatFullSessionDate(workspaceDate)}</span>
                  </div>

                  <div className="session-capture-timer">
                    <strong>{durationLabel}</strong>
                    <div className="session-capture-state">
                      <span>{captureStatusLabel}</span>
                      <em className="session-live-badge is-live">
                        <span aria-hidden="true" />
                        {captureBadgeLabel}
                      </em>
                    </div>
                  </div>
                </>
              )}

              <div
                className={`home-record-shell ${
                  isLiveWorkspace ? "is-session-shell" : ""
                }`}
              >
                <div
                  className={`home-recorder-control-slot ${
                    isLiveWorkspace ? "is-managed" : ""
                  }`}
                >
                  <LiveRecorder
                    ref={recorderRef}
                    onTranscriptUpdate={handleTranscriptUpdate}
                    onSessionEnd={handleSessionEnd}
                    meetingContext={meetingContext}
                    onAudioLevel={handleAudioLevel}
                    onStateChange={handleStateChange}
                    onSnapshot={setRecorderSnapshot}
                    presentation={isLiveWorkspace ? "managed" : "default"}
                  />
                </div>
                <div className="home-animated-lines" aria-hidden="true">
                  <AudioWaveRibbon
                    active={waveActive}
                    audioLevel={audioLevel}
                    height={118}
                    sensitivity={1.16}
                    motion={1.28}
                    texture="clean"
                    className="w-full"
                  />
                </div>
              </div>

              {!isLiveWorkspace && (
                <div className="home-capture-brief">
                  <p>
                    Start the note when the conversation begins. Layers will
                    organize the transcript, key points, and follow-ups as it
                    listens.
                  </p>
                </div>
              )}

              {isLiveWorkspace && (
                <LiveRecordingContextCard
                  meetingContext={meetingContext}
                  title={workspaceTitle}
                  subtitle={workspaceSubtitle}
                  date={workspaceDate}
                />
              )}

              {isLiveWorkspace && (
                <RecordingStopControl
                  label={captureStatusLabel}
                  busy={isArming || isFinalizing}
                  onClick={() => void recorderRef.current?.stop()}
                  disabled={isArming || isFinalizing}
                />
              )}
            </section>

          </div>

          {isLiveWorkspace && (
            <SessionIntelligenceCanvas
              mode="live"
              summaryText={liveWorkspaceSummary(liveSignals)}
              updatedLabel="Updated just now"
              transcriptRows={workspaceRows}
              keyPoints={workspaceKeyPoints}
              actions={workspaceActions}
              decisions={workspaceDecisions}
              stats={workspaceStats}
              footerStatus={
                isFinalizing
                  ? "Saving notes"
                  : "Live - new content arriving"
              }
            />
          )}

          {!isLiveWorkspace && (
            <div className="home-desktop-sidebar home-right-column">
              <UpcomingMeetingsPanel
                overview={calendarOverview}
                meetingsFading={meetingsFading}
                selectedEventId={selectedCalendarEventId}
                onRecordMeeting={handleRecordCalendarMeeting}
              />
              <HomeInsightTip />
            </div>
          )}
        </div>

        {!isLiveWorkspace && (
          <div className="home-mobile-recent">
            <RecentMeetings
              meetings={recentMeetings}
              meetingsFading={meetingsFading}
              onDeleteMeeting={handleDeleteRecentMeeting}
            />
          </div>
        )}

        {!isLiveWorkspace && (
          <div className="home-mobile-calendar">
            <UpcomingMeetingsPanel
              overview={calendarOverview}
              meetingsFading={meetingsFading}
              selectedEventId={selectedCalendarEventId}
              onRecordMeeting={handleRecordCalendarMeeting}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function RecordingStopControl({
  label,
  busy = false,
  disabled = false,
  onClick,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="session-capture-control">
      <button
        type="button"
        className={`session-stop-button recording-stop-control ${
          busy ? "is-busy" : ""
        }`}
        onClick={onClick}
        disabled={disabled}
        aria-busy={busy}
      >
        <span>
          {busy ? (
            <Loader2
              size={16}
              className="recording-control-spinner"
              aria-hidden="true"
            />
          ) : (
            <Square size={15} fill="currentColor" aria-hidden="true" />
          )}
        </span>
        {busy ? label : "Stop recording"}
      </button>
      {busy && (
        <div className="recording-transition-status" role="status">
          {label}
        </div>
      )}
    </div>
  );
}

function HomeGreeting() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now)
    : "Today";
  const timeParts = now
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(now)
    : [];
  const hour = timeParts.find((part) => part.type === "hour")?.value ?? "--";
  const minute =
    timeParts.find((part) => part.type === "minute")?.value ?? "--";
  const second =
    timeParts.find((part) => part.type === "second")?.value ?? "--";
  const dayPeriod =
    timeParts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const timeLabel = `${hour}:${minute}:${second}${dayPeriod ? ` ${dayPeriod}` : ""}`;

  return (
    <div className="home-paper-heading home-session-heading">
      <div className="home-session-meta" aria-label={`${dateLabel}, ${timeLabel}`}>
        <span className="home-session-date">
          <CalendarDays size={15} aria-hidden="true" />
          {dateLabel}
        </span>
        <span className="home-session-time">
          <span className="home-session-clock-main">
            {hour}:{minute}
          </span>
          <span className="home-session-seconds">:{second}</span>
          {dayPeriod && <span className="home-session-period">{dayPeriod}</span>}
        </span>
      </div>
    </div>
  );
}

function LiveRecordingContextCard({
  meetingContext,
  title,
  subtitle,
  date,
}: {
  meetingContext: RecordingMeetingContext | null;
  title: string;
  subtitle: string;
  date: Date;
}) {
  const dateParts = meetingContext
    ? formatCalendarDateTile(meetingContext.startsAt)
    : {
        month: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
          date,
        ),
        day: new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(date),
        accessibleLabel: formatFullSessionDate(date),
      };
  const timeLine = meetingContext
    ? formatCalendarDateLine(meetingContext.startsAt, meetingContext.endsAt ?? null)
    : subtitle;
  const location = meetingContext?.location;

  return (
    <div aria-label="Current recording context">
      <div className="session-capture-context">
        <time
          className="session-date-tile"
          dateTime={meetingContext?.startsAt ?? date.toISOString()}
          aria-label={dateParts.accessibleLabel}
        >
          <span>{dateParts.month}</span>
          <strong>{dateParts.day}</strong>
        </time>
        <div className="session-capture-copy">
          <h2>{title}</h2>
          <p>
            {timeLine}
            {location ? ` - ${location}` : ""}
          </p>
          <span className="session-calendar-pill is-connected is-disabled">
            <CalendarDays size={13} aria-hidden="true" />
            {meetingContext ? "Calendar context attached" : "Calendar sync coming soon"}
          </span>
        </div>
      </div>
    </div>
  );
}

function buildWorkspaceTranscriptRows(
  turns: Turn[],
  partial: string,
): SessionTranscriptRow[] {
  const rows: SessionTranscriptRow[] = turns.slice(-8).map((turn, index) => ({
    id: `${turn.start}-${index}`,
    timestamp: formatWorkspaceTimestamp(turn.start),
    text: turn.text,
    tone:
      index % 5 === 3
        ? ("orange" as const)
        : index % 3 === 2
          ? ("cyan" as const)
          : ("blue" as const),
  }));

  if (partial.trim()) {
    rows.push({
      id: "live-partial",
      timestamp:
        turns.length > 0
          ? formatWorkspaceTimestamp(turns.at(-1)?.end ?? 0)
          : "0:00",
      text: partial.trim(),
      tone: "cyan",
      live: true,
    });
  }

  return rows;
}

function buildWorkspaceActions(items: string[]): SessionActionRow[] {
  const priorities: Array<SessionActionRow["priority"]> = ["High", "Med", "Low"];
  return items.slice(0, 5).map((text, index) => ({
    id: `${index}-${text}`,
    text,
    due: index < 3 ? `May ${index + 2}` : null,
    priority: priorities[index % priorities.length],
  }));
}

function liveWorkspaceSummary(signals: LiveMeetingSignals): string {
  const signalText = [
    ...signals.decisions.map((item) => item.text),
    ...signals.keyPoints.map((item) => item.text),
    ...signals.actions.map((item) => item.text),
  ];

  if (signalText.length === 0) {
    return "Layers is listening for decisions, follow-ups, owners, risks, and useful context. The live summary will tighten as the conversation develops.";
  }

  const nextAction = signals.actions[0]?.text;
  const summary = signalText.slice(0, 3).join(" ");
  return nextAction
    ? `${summary} Next: ${nextAction}`
    : summary;
}

function formatFullSessionDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "Today";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function UpcomingMeetingsPanel({
  overview,
  meetingsFading,
  selectedEventId,
  onRecordMeeting,
}: {
  overview: CalendarOverview;
  meetingsFading: boolean;
  selectedEventId?: string | null;
  onRecordMeeting?: (meetingId: string) => void;
}) {
  const hasUpcoming = overview.items.length > 0;
  const emptyCopy = overview.calendarRateLimited
    ? "Google Calendar is rate limited right now. You can still start recording manually."
    : overview.reauthRequired && overview.connected
    ? "Reconnect your calendar to keep upcoming meetings available before recording."
    : "Calendar sync is coming soon. You can still start recording manually.";
  const footnote = overview.connected
    ? overview.calendarFetchFailed
      ? "Connected, but events could not be fetched."
      : overview.accountEmail ?? overview.provider ?? "Calendar connected"
    : "Google Calendar and Outlook support is coming soon.";

  return (
    <aside
      className={`home-calendar-panel transition-all duration-700 ease-out ${
        meetingsFading
          ? "pointer-events-none translate-y-8 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
      aria-label="Upcoming meetings"
    >
      <div className="home-calendar-heading">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="signal-eyebrow">Coming up</p>
          <span
            aria-label="Coming soon"
            className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--layers-mint)_18%,transparent)] px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--layers-mint)]"
          >
            Coming soon
          </span>
          <h2 className="basis-full">Calendar context</h2>
        </div>
        <span className="home-calendar-icon" aria-hidden="true">
          <CalendarDays size={17} />
        </span>
      </div>

      {hasUpcoming ? (
        <div className="home-calendar-list">
          {overview.items.map((item) => {
            const dateParts = formatCalendarDateTile(item.startsAt);
            const isSelected = selectedEventId === item.id;
            return (
              <div
                className={`home-calendar-event ${isSelected ? "is-selected" : ""}`}
                key={item.id}
              >
                <time
                  className="home-calendar-date-tile"
                  dateTime={item.startsAt}
                  aria-label={dateParts.accessibleLabel}
                >
                  <span>{dateParts.month}</span>
                  <strong>{dateParts.day}</strong>
                </time>
                <div className="home-calendar-event-copy">
                  <div className="home-calendar-event-time">
                    <Clock3 size={13} aria-hidden="true" />
                    <span>{formatCalendarDateLine(item.startsAt, item.endsAt)}</span>
                  </div>
                  <p>{item.title}</p>
                  <div className="home-calendar-event-meta">
                    {item.location && <span>{item.location}</span>}
                    <span>
                      <UsersRound size={12} aria-hidden="true" />
                      {item.attendeesCount ?? 0} attendees
                    </span>
                  </div>
                  <button
                    type="button"
                    className="home-calendar-record-button"
                    onClick={() => onRecordMeeting?.(item.id)}
                  >
                    {isSelected ? "Recording this" : "Record this"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="home-calendar-empty">
          <p>{emptyCopy}</p>
          <CalendarConnectArt />
          <span className="home-calendar-connect is-disabled" aria-disabled="true">
            <CalendarDays size={14} aria-hidden="true" />
            <span>Calendar sync coming soon</span>
          </span>
        </div>
      )}

      <div className="home-calendar-footnote">{footnote}</div>
    </aside>
  );
}

function HomeInsightTip() {
  return (
    <aside className="home-insight-tip home-mcp-tip" aria-label="MCP connection">
      <span className="home-mcp-art home-mcp-orbit" aria-hidden="true">
        <span className="home-mcp-hub">
          <BriefcaseBusiness size={28} />
        </span>
        {MCP_PROVIDER_MARKS.map((provider, index) => (
          <span
            className={`home-mcp-node home-mcp-node-${index + 1} is-${provider.tone}`}
            key={provider.name}
          >
            {provider.productId ? (
              <ProductLogo
                id={provider.productId}
                showName={false}
                className="home-mcp-node-logo"
              />
            ) : (
              <span className="home-mcp-xai-mark">{provider.mark}</span>
            )}
          </span>
        ))}
        <span className="home-mcp-flow-line home-mcp-flow-line-one" />
        <span className="home-mcp-flow-line home-mcp-flow-line-two" />
      </span>
      <div className="home-insight-copy">
        <p className="home-insight-kicker">MCP ready</p>
        <h3>Connect your AI tools</h3>
        <p>
          Give Claude, ChatGPT, Gemini, and other clients permission to pull
          meeting memory when you ask.
        </p>
        <div className="home-mcp-provider-grid" aria-label="Supported MCP clients">
          {MCP_PROVIDER_MARKS.map((provider) => (
            <span className={`home-mcp-provider is-${provider.tone}`} key={provider.name}>
              {provider.productId ? (
                <ProductLogo id={provider.productId} />
              ) : (
                <>
                  <span className="home-mcp-xai-mark">{provider.mark}</span>
                  {provider.name}
                </>
              )}
            </span>
          ))}
        </div>
        <Link href="/profile" className="home-mcp-link">
          <Sparkles size={13} aria-hidden="true" />
          Set up MCP
        </Link>
      </div>
    </aside>
  );
}

function CalendarConnectArt() {
  return (
    <div className="calendar-connect-art" aria-hidden="true">
      <Image
        src="/layersdesign-assets/calendar-orbit.png"
        alt=""
        width={320}
        height={320}
        className="calendar-orbit-image"
      />
      <Image
        src="/layersdesign-assets/google-calendar-card.png"
        alt=""
        width={224}
        height={224}
        className="calendar-provider-card calendar-provider-card-google"
      />
      <Image
        src="/layersdesign-assets/outlook-card.png"
        alt=""
        width={224}
        height={224}
        className="calendar-provider-card calendar-provider-card-outlook"
      />
      <span className="calendar-context-chip calendar-context-chip-next">
        Next meeting
      </span>
      <span className="calendar-context-chip calendar-context-chip-notes">
        Auto title
      </span>
    </div>
  );
}

function RecentRecordingsEmptyArt() {
  return (
    <span className="recent-empty-art" aria-hidden="true">
      <span className="recent-empty-art-line recent-empty-art-line-one" />
      <span className="recent-empty-art-line recent-empty-art-line-two" />
      <span className="recent-empty-art-card recent-empty-art-card-main" />
      <span className="recent-empty-art-card recent-empty-art-card-small" />
    </span>
  );
}

function RecentMeetings({
  meetings,
  meetingsFading,
  onDeleteMeeting,
  compact = false,
}: {
  meetings: MeetingItem[];
  meetingsFading: boolean;
  onDeleteMeeting?: (meetingId: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);
  const filteredMeetings = meetings.filter((meeting) =>
    (meeting.title ?? "Untitled recording")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const handleDeleteEmptyMeeting = useCallback(
    async (meeting: MeetingItem) => {
      if (!isEmptyRecentRecording(meeting) || deletingId) return;

      setDeletingId(meeting.id);
      setDeleteErrorId(null);

      try {
        const response = await fetch(
          `/api/meetings/${encodeURIComponent(meeting.id)}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error("Delete failed");
        }

        onDeleteMeeting?.(meeting.id);
      } catch {
        setDeleteErrorId(meeting.id);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, onDeleteMeeting],
  );

  return (
    <section
      className={`recent-meetings-panel flex min-h-0 w-full flex-col transition-all duration-700 ease-out ${
        compact ? "is-compact" : "mt-4"
      } ${
        meetingsFading
          ? "pointer-events-none translate-y-8 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="recent-panel-heading">
        <div>
          <h2 className="signal-eyebrow">Recent recordings</h2>
        </div>
        <Link
          href="/meetings"
          className="text-xs font-medium text-layers-mint-soft transition-colors hover:text-[#99f6e4]"
        >
          View all
        </Link>
      </div>

      <div className="recent-panel-toolbar">
        <label className="recent-search-control">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search recent recordings</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
          />
        </label>
        <Link
          href="/meetings"
          className="recent-filter-button"
          aria-label="Open meeting filters"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="meeting-list meeting-empty flex min-h-[250px] flex-col items-center justify-center rounded-lg px-5 py-8 text-center">
          <RecentRecordingsEmptyArt />
          <p className="mt-4 text-sm font-semibold text-[var(--text-secondary)]">
            No recent recordings
          </p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-muted)]">
            Saved sessions will appear here after your first recording.
          </p>
          <Link
            href="/record/live"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-layers-mint px-4 text-sm font-medium text-layers-ink transition-colors hover:bg-layers-mint-soft"
          >
            Start live recording
          </Link>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="meeting-list meeting-empty flex min-h-[190px] flex-col items-center justify-center rounded-lg px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No matches
          </p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-muted)]">
            Try a different title or open the full meetings list.
          </p>
        </div>
      ) : (
        <div
          className="meeting-list max-h-[clamp(220px,42dvh,360px)] overflow-y-auto rounded-lg"
          style={{ scrollbarWidth: "none" }}
        >
          {filteredMeetings.map((m) => {
            const title = meetingDisplayTitle(m);
            const stateLabel = meetingInlineStateLabel(m);
            const canDelete = isEmptyRecentRecording(m);
            const isDeleting = deletingId === m.id;
            const marker = meetingRowMarker(m);
            return (
              <article
                key={m.id}
                className={`meeting-row group grid items-center gap-3 transition-colors duration-200 ${
                  canDelete ? "has-delete-action" : ""
                }`}
              >
                <span
                  className={`meeting-row-icon meeting-row-marker ${marker.tone}`}
                  aria-label={marker.ariaLabel}
                  title={marker.ariaLabel}
                >
                  <strong>{marker.value}</strong>
                  <small>{marker.unit}</small>
                </span>
                <Link
                  href={`/meetings/${m.id}`}
                  className="meeting-row-copy min-w-0 flex-1"
                >
                  <div
                    className="meeting-row-title truncate text-sm transition-colors"
                    title={title}
                  >
                    {title}
                  </div>
                  <div className="meeting-row-meta mt-0.5 text-xs">
                    <span>
                      {new Date(m.createdAt).toLocaleDateString()}
                      {m.durationSeconds
                        ? ` · ${Math.round(m.durationSeconds / 60)} min`
                        : ""}
                    </span>
                    {stateLabel && (
                      <span className="meeting-row-state">{stateLabel}</span>
                    )}
                    {deleteErrorId === m.id && (
                      <span className="meeting-row-delete-error">
                        Could not delete
                      </span>
                    )}
                  </div>
                </Link>
                {canDelete && (
                  <button
                    type="button"
                    className="meeting-row-delete"
                    onClick={() => void handleDeleteEmptyMeeting(m)}
                    disabled={isDeleting}
                    aria-label={`Delete empty recording from ${new Date(
                      m.createdAt,
                    ).toLocaleDateString()}`}
                    title="Delete empty recording"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function isUntitledRecordingTitle(title: string | null): boolean {
  return !title || title.trim().toLowerCase() === "untitled recording";
}

function isGeneratedRecentRecordingTitle(title: string | null): boolean {
  const normalized = title?.trim().toLowerCase() ?? "";
  return (
    isUntitledRecordingTitle(title) ||
    normalized === "writing notes..." ||
    normalized === "preparing recording..."
  );
}

function meetingDisplayTitle(meeting: MeetingItem): string {
  const title = meeting.title?.trim() ?? "";
  const needsGeneratedTitle = isUntitledRecordingTitle(meeting.title);

  if (meeting.status === "processing" && needsGeneratedTitle) {
    return "Writing notes...";
  }
  if (meeting.status === "queued" && needsGeneratedTitle) {
    return "Preparing recording...";
  }
  if (meeting.status === "error" && needsGeneratedTitle) {
    return "Needs attention";
  }

  return title || "Untitled recording";
}

function meetingInlineStateLabel(meeting: MeetingItem): string | null {
  if (meeting.status === "completed") return null;
  if (isUntitledRecordingTitle(meeting.title)) return null;

  if (meeting.status === "processing") return "Writing notes";
  if (meeting.status === "queued") return "Preparing";
  if (meeting.status === "error") return "Needs attention";

  return null;
}

function meetingRowMarker(meeting: MeetingItem): {
  value: string;
  unit: string;
  tone: string;
  ariaLabel: string;
} {
  const duration = meeting.durationSeconds ?? 0;
  const minutes = Math.round(duration / 60);

  if (duration >= 60) {
    return {
      value: String(minutes),
      unit: "min",
      tone: meeting.status === "processing" ? "is-processing" : "has-duration",
      ariaLabel: `${minutes} minute recording`,
    };
  }

  if (duration > 0) {
    return {
      value: "<1",
      unit: "min",
      tone: meeting.status === "processing" ? "is-processing" : "has-duration",
      ariaLabel: "Under one minute recording",
    };
  }

  if (meeting.status === "processing" || meeting.status === "queued") {
    return {
      value: "0",
      unit: "min",
      tone: "is-processing",
      ariaLabel: "No recorded audio yet",
    };
  }

  if (meeting.status === "error") {
    return {
      value: "!",
      unit: "fix",
      tone: "is-error",
      ariaLabel: "Recording needs attention",
    };
  }

  return {
    value: "0",
    unit: "min",
    tone: "is-empty",
    ariaLabel: "Empty recording",
  };
}

function isEmptyRecentRecording(meeting: MeetingItem): boolean {
  const durationSeconds = meeting.durationSeconds ?? 0;
  return (
    durationSeconds < EMPTY_RECORDING_SECONDS_THRESHOLD &&
    isGeneratedRecentRecordingTitle(meeting.title)
  );
}

function formatCalendarTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Soon";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCalendarDateLine(startsAt: string, endsAt: string | null): string {
  const start = formatCalendarTime(startsAt);
  if (!endsAt) return start;

  const end = formatCalendarTime(endsAt);
  if (end === "Soon") return start;
  return `${start} - ${end}`;
}

function formatCalendarDateTile(iso: string): {
  month: string;
  day: string;
  accessibleLabel: string;
} {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { month: "Soon", day: "--", accessibleLabel: "Upcoming meeting" };
  }

  return {
    month: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
    day: new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(date),
    accessibleLabel: new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(date),
  };
}
