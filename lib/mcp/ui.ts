import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";

export const LAYER_ONE_MCP_DASHBOARD_RESOURCE_URI =
  "ui://layer-one/meeting-dashboard.html";

export interface MeetingDashboardMeeting {
  id: string;
  title: string;
  status: string;
  date: string | null;
  duration: string | null;
  durationSeconds: number;
}

export interface MeetingDashboardPayload {
  generatedAt: string;
  stats: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalMinutes: number;
  };
  meetings: MeetingDashboardMeeting[];
}

interface MeetingLike {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  date?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  duration?: unknown;
  durationSeconds?: unknown;
  duration_seconds?: unknown;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toDurationSeconds(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

function formatDuration(seconds: number): string | null {
  if (!seconds) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export function buildMeetingDashboardPayload(
  meetings: MeetingLike[],
): MeetingDashboardPayload {
  const normalized = meetings.map((meeting) => {
    const durationSeconds = toDurationSeconds(
      meeting.durationSeconds ?? meeting.duration_seconds,
    );

    return {
      id: toStringValue(meeting.id, "unknown"),
      title: toStringValue(meeting.title, "Untitled meeting"),
      status: toStringValue(meeting.status, "unknown").toLowerCase(),
      date:
        typeof meeting.date === "string"
          ? meeting.date
          : typeof meeting.createdAt === "string"
            ? meeting.createdAt
            : typeof meeting.created_at === "string"
              ? meeting.created_at
              : null,
      duration:
        typeof meeting.duration === "string"
          ? meeting.duration
          : formatDuration(durationSeconds),
      durationSeconds,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      total: normalized.length,
      completed: normalized.filter((meeting) => meeting.status === "completed")
        .length,
      processing: normalized.filter(
        (meeting) =>
          meeting.status === "processing" ||
          meeting.status === "transcribing" ||
          meeting.status === "queued",
      ).length,
      failed: normalized.filter((meeting) => meeting.status === "failed").length,
      totalMinutes: Math.round(
        normalized.reduce(
          (total, meeting) => total + meeting.durationSeconds,
          0,
        ) / 60,
      ),
    },
    meetings: normalized,
  };
}

export function getLayerOneMeetingDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Layer One Meetings</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #070d0b;
      --panel: #101815;
      --panel-strong: #13241f;
      --text: #edf8f4;
      --muted: #91a7a0;
      --border: #243a34;
      --accent: #14b8a6;
      --accent-strong: #74f0df;
      --accent-soft: rgba(20, 184, 166, 0.12);
      --danger: #ff6b78;
      --danger-soft: rgba(255, 107, 120, 0.12);
      --warning: #f8c15c;
      --warning-soft: rgba(248, 193, 92, 0.12);
      --shadow: none;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }

    [data-theme="light"] {
      color-scheme: light;
      --bg: #f4faf7;
      --panel: #ffffff;
      --panel-strong: #eaf7f2;
      --text: #17221e;
      --muted: #60716b;
      --border: #d8e7e1;
      --accent: #14b8a6;
      --accent-strong: #087d71;
      --accent-soft: rgba(20, 184, 166, 0.1);
      --danger: #cc3340;
      --danger-soft: rgba(204, 51, 64, 0.1);
      --warning: #8a5a00;
      --warning-soft: rgba(138, 90, 0, 0.1);
      --shadow: 0 16px 36px rgba(19, 48, 42, 0.1);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      line-height: 1.4;
    }

    main {
      width: min(720px, 100%);
      padding: 16px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel);
      padding: 12px;
      box-shadow: var(--shadow);
    }

    .eyebrow {
      margin-bottom: 5px;
      color: var(--accent-strong);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 17px;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: 0;
    }

    .subtitle {
      margin-top: 3px;
      color: var(--muted);
      font-size: 12px;
    }

    button {
      min-height: 34px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel-strong);
      color: var(--text);
      padding: 0 12px;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    button:hover {
      border-color: var(--accent);
      color: var(--accent-strong);
    }

    button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      padding: 10px 11px;
      box-shadow: var(--shadow);
    }

    .stat span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .stat strong {
      display: block;
      margin-top: 5px;
      font-size: 19px;
      line-height: 1;
    }

    .list {
      display: grid;
      gap: 8px;
    }

    .meeting {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      padding: 12px;
      box-shadow: var(--shadow);
      transition: border-color 160ms ease, background 160ms ease;
    }

    .meeting:hover {
      border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
      background: var(--panel-strong);
    }

    .meeting-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 700;
    }

    .meeting-meta {
      margin-top: 3px;
      color: var(--muted);
      font-size: 12px;
    }

    .pill {
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-strong);
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .pill.processing,
    .pill.queued,
    .pill.transcribing {
      background: var(--warning-soft);
      color: var(--warning);
    }

    .pill.failed {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .empty,
    .error {
      border: 1px dashed var(--border);
      border-radius: 8px;
      background: var(--panel);
      color: var(--muted);
      padding: 16px;
    }

    .error {
      color: var(--danger);
    }

    @media (max-width: 520px) {
      main {
        padding: 14px;
      }

      header {
        align-items: flex-start;
      }

      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .meeting {
        grid-template-columns: minmax(0, 1fr);
      }

      .pill {
        justify-self: start;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <div class="eyebrow">MCP app</div>
        <h1>Layer One meetings</h1>
        <div class="subtitle" id="generated">Waiting for meeting data</div>
      </div>
      <button id="refresh" type="button" aria-label="Refresh meetings">Sync</button>
    </header>

    <section class="stats" aria-label="Meeting stats">
      <div class="stat"><span>Total</span><strong id="stat-total">0</strong></div>
      <div class="stat"><span>Done</span><strong id="stat-completed">0</strong></div>
      <div class="stat"><span>Active</span><strong id="stat-processing">0</strong></div>
      <div class="stat"><span>Minutes</span><strong id="stat-minutes">0</strong></div>
    </section>

    <section id="meetings" class="list" aria-label="Recent meetings">
      <div class="empty">Run the dashboard tool to load recent meetings.</div>
    </section>
  </main>

  <script type="module">
    const params = new URLSearchParams(window.location.search);
    const previewMode = params.get("preview") === "1";
    let app = null;
    const state = { connected: false, loading: false, limit: 12, data: null, preview: previewMode };
    const previewPayload = {
      generatedAt: new Date().toISOString(),
      stats: { total: 5, completed: 3, processing: 1, failed: 1, totalMinutes: 166 },
      meetings: [
        {
          id: "preview_1",
          title: "Intake - Acme revenue operations",
          status: "completed",
          date: "2026-04-26T15:08:00.000Z",
          duration: "32 min",
          durationSeconds: 1920
        },
        {
          id: "preview_2",
          title: "Mirror Factory strategic direction",
          status: "completed",
          date: "2026-04-25T18:30:00.000Z",
          duration: "100 min",
          durationSeconds: 6000
        },
        {
          id: "preview_3",
          title: "Pricing model and STT provider review",
          status: "processing",
          date: "2026-04-25T12:00:00.000Z",
          duration: "22 min",
          durationSeconds: 1320
        },
        {
          id: "preview_4",
          title: "Customer discovery - construction ops",
          status: "completed",
          date: "2026-04-24T20:14:00.000Z",
          duration: "12 min",
          durationSeconds: 720
        },
        {
          id: "preview_5",
          title: "Follow-up with missing audio permission",
          status: "failed",
          date: "2026-04-24T16:43:00.000Z",
          duration: null,
          durationSeconds: 0
        }
      ]
    };
    const refs = {
      generated: document.getElementById("generated"),
      refresh: document.getElementById("refresh"),
      meetings: document.getElementById("meetings"),
      total: document.getElementById("stat-total"),
      completed: document.getElementById("stat-completed"),
      processing: document.getElementById("stat-processing"),
      minutes: document.getElementById("stat-minutes")
    };

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
      if (!value) return "No date";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "No date";
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    function previewTheme() {
      return params.get("theme") === "light" ? "light" : "dark";
    }

    function normalizeToolResult(result) {
      if (result && result.structuredContent && Array.isArray(result.structuredContent.meetings)) {
        return result.structuredContent;
      }

      const textBlock = result && Array.isArray(result.content)
        ? result.content.find((block) => block && block.type === "text" && block.text)
        : null;

      if (!textBlock) return null;

      try {
        const parsed = JSON.parse(textBlock.text);
        return parsed && Array.isArray(parsed.meetings) ? parsed : null;
      } catch {
        return null;
      }
    }

    function showError(message) {
      refs.meetings.innerHTML = '<div class="error">' + escapeHtml(message) + "</div>";
    }

    function applyTheme(context) {
      if (context && (context.theme === "dark" || context.theme === "light")) {
        document.documentElement.dataset.theme = context.theme;
      }
    }

    function render(data) {
      refs.refresh.disabled = state.loading || !state.connected;
      refs.refresh.textContent = state.loading ? "Syncing" : "Sync";

      if (!data) return;

      const stats = data.stats || {};
      refs.total.textContent = String(stats.total ?? 0);
      refs.completed.textContent = String(stats.completed ?? 0);
      refs.processing.textContent = String(stats.processing ?? 0);
      refs.minutes.textContent = String(stats.totalMinutes ?? 0);
      refs.generated.textContent = data.generatedAt
        ? "Updated " + new Date(data.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "Updated just now";

      const meetings = Array.isArray(data.meetings) ? data.meetings : [];
      if (!meetings.length) {
        refs.meetings.innerHTML = '<div class="empty">No recent meetings found.</div>';
        return;
      }

      refs.meetings.innerHTML = meetings.map((meeting) => {
        const status = String(meeting.status || "unknown").toLowerCase();
        const statusClass = ["processing", "queued", "transcribing", "failed"].includes(status)
          ? status
          : status === "error"
            ? "failed"
            : "";
        const duration = meeting.duration ? " - " + escapeHtml(meeting.duration) : "";
        return '<article class="meeting">' +
          '<div><div class="meeting-title">' + escapeHtml(meeting.title || "Untitled meeting") + "</div>" +
          '<div class="meeting-meta">' + escapeHtml(formatDate(meeting.date)) + duration + "</div></div>" +
          '<span class="pill ' + statusClass + '">' + escapeHtml(status) + "</span>" +
          "</article>";
      }).join("");
    }

    refs.refresh.addEventListener("click", async () => {
      if (state.preview) {
        state.loading = true;
        render(state.data);
        window.setTimeout(() => {
          state.loading = false;
          state.data = { ...previewPayload, generatedAt: new Date().toISOString() };
          render(state.data);
        }, 180);
        return;
      }

      if (!state.connected || !app) return;
      state.loading = true;
      render(state.data);

      try {
        const result = await app.callServerTool({
          name: "show_meeting_dashboard",
          arguments: { limit: state.limit }
        });
        state.data = normalizeToolResult(result);
        render(state.data);
      } catch (error) {
        showError(error instanceof Error ? error.message : "Unable to refresh meetings.");
      } finally {
        state.loading = false;
        render(state.data);
      }
    });

    async function connectToClaude() {
      if (state.preview) {
        state.connected = true;
        state.data = previewPayload;
        applyTheme({ theme: previewTheme() });
        render(state.data);
        return;
      }

      try {
        const { App } = await import("https://esm.sh/@modelcontextprotocol/ext-apps@1.7.0/app-with-deps?bundle");
        app = new App(
          { name: "Layer One Meeting Dashboard", version: "1.0.0" },
          {},
          { autoResize: true }
        );

        app.ontoolresult = (params) => {
          state.data = normalizeToolResult(params);
          render(state.data);
        };

        app.onhostcontextchanged = applyTheme;
        await app.connect();
        state.connected = true;
        applyTheme(app.getHostContext());
        render(state.data);
      } catch (error) {
        showError(error instanceof Error ? error.message : "Unable to connect to Claude.");
      }
    }

    render(null);
    connectToClaude();
  </script>
</body>
</html>`;
}

export const LAYER_ONE_MCP_DASHBOARD_RESOURCE_CONFIG = {
  mimeType: RESOURCE_MIME_TYPE,
  _meta: {
    ui: {
      csp: {
        resourceDomains: ["https://esm.sh"],
      },
    },
  },
};
