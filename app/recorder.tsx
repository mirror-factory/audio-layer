"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BookmarkCheck,
  CalendarDays,
  Clock3,
  FileText,
  Link2,
  ListChecks,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { AudioWaveRibbon } from "@/components/audio-wave-ribbon";
import { TopBar } from "@/components/top-bar";
import { LiveRecorder } from "@/components/live-recorder";
import { LiveTranscriptView } from "@/components/live-transcript-view";
import {
  pickRecordingCalendarContext,
  type RecordingMeetingContext,
} from "@/lib/recording/meeting-context";
import {
  deriveLiveMeetingSignals,
  type LiveMeetingSignals,
  type LiveNotesMode,
} from "@/lib/recording/live-signals";

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
}

type CaptureState = "idle" | "recording" | "saving" | "done";

const EMPTY_CALENDAR_OVERVIEW: CalendarOverview = {
  connected: false,
  provider: null,
  accountEmail: null,
  items: [],
};
const EMPTY_RECORDING_SECONDS_THRESHOLD = 30;

export function RecorderHome() {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<MeetingItem[]>([]);
  const [calendarOverview, setCalendarOverview] = useState<CalendarOverview>(
    EMPTY_CALENDAR_OVERVIEW,
  );
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [meetingsFading, setMeetingsFading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveNotesMode, setLiveNotesMode] =
    useState<LiveNotesMode>("transcript");

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
        setMeetingsFading(true);
      } else if (recState === "recording") {
        setCaptureState("recording");
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
  const meetingContext = pickRecordingCalendarContext(
    calendarOverview.items,
    calendarOverview.provider,
  );
  const isLiveWorkspace = captureState !== "idle" || hasTranscript;
  const liveSignals = useMemo(
    () => deriveLiveMeetingSignals(turns, partial),
    [turns, partial],
  );
  const handleDeleteRecentMeeting = useCallback((meetingId: string) => {
    setRecentMeetings((items) => items.filter((item) => item.id !== meetingId));
  }, []);

  return (
    <div className="paper-calm-page recorder-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Layer One" />

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

              <div className="home-record-shell">
                <div className="home-recorder-control-slot">
                  <LiveRecorder
                    onTranscriptUpdate={handleTranscriptUpdate}
                    onSessionEnd={handleSessionEnd}
                    meetingContext={meetingContext}
                    onAudioLevel={handleAudioLevel}
                    onStateChange={handleStateChange}
                  />
                </div>
                <div className="home-animated-lines" aria-hidden="true">
                  <AudioWaveRibbon
                    active={captureState === "recording"}
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
                    Start the note when the conversation begins. Layer One will
                    organize the transcript, key points, and follow-ups as it
                    listens.
                  </p>
                </div>
              )}

              {isLiveWorkspace && (
                <LiveRecordingContextCard
                  meetingContext={meetingContext}
                  signals={liveSignals}
                  turns={turns}
                />
              )}
            </section>

          </div>

          {isLiveWorkspace && (
            <section className="home-live-transcript-panel animate-in fade-in slide-in-from-right-3 duration-500">
              <div className="home-live-transcript-heading">
                <div className="home-live-heading-copy">
                  <p className="signal-eyebrow">Transcript</p>
                  <h2>Writing notes live.</h2>
                  {liveSignals.latestLine && (
                    <p className="home-live-latest-line">
                      {liveSignals.latestLine}
                    </p>
                  )}
                </div>
                <LiveNotesTabs
                  activeMode={liveNotesMode}
                  onChange={setLiveNotesMode}
                  signals={liveSignals}
                />
              </div>
              {liveNotesMode === "transcript" ? (
                <div
                  className="home-live-transcript-scroll"
                  style={{ scrollbarWidth: "none" }}
                >
                  <LiveTranscriptView turns={turns} partial={partial} />
                </div>
              ) : (
                <LiveNotesPanel mode={liveNotesMode} signals={liveSignals} />
              )}
            </section>
          )}

          {!isLiveWorkspace && (
            <div className="home-desktop-sidebar home-right-column">
              <UpcomingMeetingsPanel
                overview={calendarOverview}
                meetingsFading={meetingsFading}
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
            />
          </div>
        )}
      </main>
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
  signals,
  turns,
}: {
  meetingContext: RecordingMeetingContext | null;
  signals: LiveMeetingSignals;
  turns: Turn[];
}) {
  const dateParts = meetingContext
    ? formatCalendarDateTile(meetingContext.startsAt)
    : null;
  const title = meetingContext?.meetingTitle ?? "Untitled live note";
  const timeLine = meetingContext
    ? formatCalendarDateLine(meetingContext.startsAt, meetingContext.endsAt ?? null)
    : "No calendar event linked";
  const location = meetingContext?.location;

  return (
    <div className="live-session-context" aria-label="Current recording context">
      <div className="live-session-context-main">
        {dateParts ? (
          <time
            className="home-calendar-date-tile live-session-date-tile"
            dateTime={meetingContext?.startsAt}
            aria-label={dateParts.accessibleLabel}
          >
            <span>{dateParts.month}</span>
            <strong>{dateParts.day}</strong>
          </time>
        ) : (
          <span className="live-session-empty-date" aria-hidden="true">
            <CalendarDays size={18} />
          </span>
        )}
        <div className="live-session-context-copy">
          <p className="signal-eyebrow">Recording</p>
          <h2>{title}</h2>
          <p>
            {timeLine}
            {location ? ` · ${location}` : ""}
          </p>
        </div>
      </div>

      {!meetingContext && (
        <Link href="/settings#calendar" className="live-session-calendar-link">
          Connect calendar
        </Link>
      )}

      <div className="live-session-metrics" aria-label="Live recording progress">
        <span>
          <strong>{turns.length}</strong>
          Segments
        </span>
        <span>
          <strong>{signals.words}</strong>
          Words
        </span>
        <span>
          <strong>{signals.keyPoints.length}</strong>
          Points
        </span>
        <span>
          <strong>{signals.actions.length}</strong>
          Actions
        </span>
      </div>
    </div>
  );
}

function LiveNotesTabs({
  activeMode,
  onChange,
  signals,
}: {
  activeMode: LiveNotesMode;
  onChange: (mode: LiveNotesMode) => void;
  signals: LiveMeetingSignals;
}) {
  const transcriptTab = {
    mode: "transcript" as const,
    label: "Transcript",
    count: null,
    icon: FileText,
  };
  const actionTabs: Array<{
    mode: LiveNotesMode;
    label: string;
    count: number | null;
    icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  }> = [
    {
      mode: "keyPoints",
      label: "Key points",
      count: signals.keyPoints.length,
      icon: BookmarkCheck,
    },
    {
      mode: "actions",
      label: "Actions",
      count: signals.actions.length,
      icon: ListChecks,
    },
  ];
  const tabs =
    activeMode === "transcript" ? actionTabs : [transcriptTab, ...actionTabs];

  return (
    <div className="live-notes-tabs" role="tablist" aria-label="Live note views">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeMode === tab.mode;
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "is-active" : ""}
            onClick={() => onChange(tab.mode)}
          >
            <Icon size={14} aria-hidden />
            <span>{tab.label}</span>
            {tab.count !== null && <em>{tab.count}</em>}
          </button>
        );
      })}
    </div>
  );
}

function LiveNotesPanel({
  mode,
  signals,
}: {
  mode: Exclude<LiveNotesMode, "transcript">;
  signals: LiveMeetingSignals;
}) {
  const copy = liveNotesPanelCopy(mode);
  const items = signals[mode];

  return (
    <div className="live-notes-panel">
      <div className="live-notes-panel-heading">
        <p>{copy.kicker}</p>
        <h3>{copy.title}</h3>
      </div>
      {items.length > 0 ? (
        <div className="live-notes-list">
          {items.map((item) => (
            <article className="live-note-item" key={item.id}>
              <div>
                <span className="live-note-dot" aria-hidden="true" />
                <p>{item.text}</p>
              </div>
              {item.timestamp && <time>{item.timestamp}</time>}
            </article>
          ))}
        </div>
      ) : (
        <div className="live-notes-empty">
          <p>{copy.empty}</p>
        </div>
      )}
    </div>
  );
}

function UpcomingMeetingsPanel({
  overview,
  meetingsFading,
}: {
  overview: CalendarOverview;
  meetingsFading: boolean;
}) {
  const hasUpcoming = overview.items.length > 0;
  const emptyCopy = overview.reauthRequired
    ? "Reconnect your calendar to keep upcoming meetings available before recording."
    : overview.providerSetupRequired || overview.setupRequired
      ? "Calendar setup is ready in Settings once provider credentials are configured."
      : "Connect your calendar to show the next meeting here before you hit record.";
  const footnote = overview.connected
    ? overview.calendarFetchFailed
      ? "Connected, but events could not be fetched."
      : overview.accountEmail ?? overview.provider ?? "Calendar connected"
    : "Google Calendar and Outlook are available.";

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
        <div>
          <p className="signal-eyebrow">Coming up</p>
          <h2>Calendar context</h2>
        </div>
        <span className="home-calendar-icon" aria-hidden="true">
          <CalendarDays size={17} />
        </span>
      </div>

      {hasUpcoming ? (
        <div className="home-calendar-list">
          {overview.items.map((item) => {
            const dateParts = formatCalendarDateTile(item.startsAt);
            return (
              <div className="home-calendar-event" key={item.id}>
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
                  {item.location && <span>{item.location}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="home-calendar-empty">
          <p>{emptyCopy}</p>
          <CalendarConnectArt />
          <Link href="/settings#calendar" className="home-calendar-connect">
            <Link2 size={14} aria-hidden="true" />
            <span>{overview.connected ? "Manage calendar" : "Connect calendar"}</span>
          </Link>
        </div>
      )}

      <div className="home-calendar-footnote">{footnote}</div>
    </aside>
  );
}

function HomeInsightTip() {
  return (
    <aside className="home-insight-tip" aria-label="Recording benefit">
      <span className="home-insight-art" aria-hidden="true">
        <span className="home-insight-art-ribbon" />
        <span className="home-insight-art-note home-insight-art-note-one" />
        <span className="home-insight-art-note home-insight-art-note-two" />
      </span>
      <div>
        <p className="home-insight-kicker">After recording</p>
        <h3>Ready-to-use meeting notes</h3>
        <p>
          Review the transcript, key points, decisions, and follow-ups without
          rebuilding the meeting from memory.
        </p>
        <div className="home-insight-points" aria-label="Captured outputs">
          <span>Transcript</span>
          <span>Key points</span>
          <span>Actions</span>
        </div>
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
          className="text-xs font-medium text-[#5eead4] transition-colors hover:text-[#99f6e4]"
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
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#14b8a6] px-4 text-sm font-medium text-[#042f2e] transition-colors hover:bg-[#2dd4bf]"
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

function liveNotesPanelCopy(mode: Exclude<LiveNotesMode, "transcript">): {
  kicker: string;
  title: string;
  empty: string;
} {
  if (mode === "actions") {
    return {
      kicker: "Next steps",
      title: "Action items so far",
      empty: "Action items will appear here as people commit to follow-ups.",
    };
  }

  if (mode === "decisions") {
    return {
      kicker: "Alignment",
      title: "Decisions so far",
      empty: "Decisions will appear here when the conversation confirms a direction.",
    };
  }

  if (mode === "questions") {
    return {
      kicker: "Open loops",
      title: "Questions so far",
      empty: "Questions will appear here as they come up in the meeting.",
    };
  }

  return {
    kicker: "Highlights",
    title: "Key points so far",
    empty: "Key points will appear here once the meeting has enough substance.",
  };
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
