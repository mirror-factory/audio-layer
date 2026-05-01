import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";

export const LAYERS_MCP_DASHBOARD_RESOURCE_URI =
  "ui://layers/meeting-dashboard.html";

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

export function getLayersMeetingDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Layers Meetings</title>
  <style>
    /* Layers Design System v1 — Paper Calm. Mint primary, violet+blue
       supports. Mirrors app/globals.css token values. */
    :root {
      color-scheme: dark;
      --bg: #0d1d35;
      --panel: rgba(252, 253, 255, 0.06);
      --panel-strong: rgba(252, 253, 255, 0.10);
      --surface: rgba(252, 253, 255, 0.04);
      --text: #f3f5fa;
      --muted: rgba(243, 245, 250, 0.66);
      --border: rgba(252, 253, 255, 0.12);
      --layers-mint: #3fc4a3;
      --layers-violet: #9b6ee0;
      --layers-blue: #5b9bd6;
      --accent: var(--layers-mint);
      --accent-strong: #74e0c2;
      --accent-soft: rgba(63, 196, 163, 0.16);
      --violet-soft: rgba(155, 110, 224, 0.20);
      --blue-soft: rgba(91, 155, 214, 0.20);
      --danger: #f08d92;
      --danger-soft: rgba(240, 141, 146, 0.14);
      --warning: #f0c98a;
      --warning-soft: rgba(240, 201, 138, 0.14);
      --shadow: 0 28px 80px rgba(8, 12, 24, 0.32);
      font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system,
        BlinkMacSystemFont, "Segoe UI", sans-serif);
    }

    [data-theme="light"] {
      color-scheme: light;
      --bg: #fafdfb;
      --panel: rgba(255, 255, 255, 0.86);
      --panel-strong: rgba(255, 255, 255, 0.96);
      --surface: rgba(250, 253, 251, 0.94);
      --text: #1c2436;
      --muted: #5e6a7d;
      --border: rgba(28, 36, 54, 0.10);
      --layers-mint: #3fc4a3;
      --layers-violet: #9b6ee0;
      --layers-blue: #5b9bd6;
      --accent: var(--layers-mint);
      --accent-strong: #1d8870;
      --accent-soft: rgba(63, 196, 163, 0.14);
      --violet-soft: rgba(155, 110, 224, 0.14);
      --blue-soft: rgba(91, 155, 214, 0.14);
      --danger: #c75a64;
      --danger-soft: rgba(199, 90, 100, 0.10);
      --warning: #8a6712;
      --warning-soft: rgba(240, 201, 138, 0.20);
      --shadow: 0 24px 60px rgba(36, 54, 94, 0.10);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background:
        radial-gradient(circle at 6% 4%, var(--violet-soft), transparent 38%),
        radial-gradient(circle at 96% 10%, var(--accent-soft), transparent 42%),
        radial-gradient(circle at 100% 100%, var(--blue-soft), transparent 50%),
        var(--bg);
      background-attachment: fixed;
      color: var(--text);
      font-size: 13px;
      line-height: 1.45;
      letter-spacing: -0.005em;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .brand-mark {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: -0.005em;
      color: var(--text);
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
      border-radius: 18px;
      background: var(--panel);
      padding: 16px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .eyebrow {
      margin-bottom: 5px;
      color: var(--accent-strong);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 760;
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
      border-radius: 999px;
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
      border-radius: 16px;
      background: var(--panel);
      padding: 12px 13px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
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
      gap: 10px;
    }

    .meeting {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--panel);
      padding: 14px;
      box-shadow: var(--shadow);
      transition: border-color 160ms ease, background 160ms ease;
      backdrop-filter: blur(18px);
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
      padding: 6px 9px;
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
      border-radius: 18px;
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
        <div class="brand" aria-hidden="true">
          <svg class="brand-mark" viewBox="0 0 32 32" fill="none">
            <path d="M16 4 a12 12 0 1 1 0 24" stroke="var(--layers-blue)" stroke-linecap="round" stroke-width="2.6" fill="none"/>
            <path d="M16 8.5 a7.5 7.5 0 1 1 0 15" stroke="var(--layers-violet)" stroke-linecap="round" stroke-width="2.6" fill="none"/>
            <circle cx="16" cy="16" r="4" fill="var(--layers-mint)" opacity="0.22"/>
            <circle cx="16" cy="16" r="2" fill="var(--layers-mint)"/>
          </svg>
          <span class="brand-name">Layers</span>
        </div>
        <div class="eyebrow">Meeting memory</div>
        <h1>Your recent meetings</h1>
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
          { name: "Layers Meeting Dashboard", version: "1.0.0" },
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

export const LAYERS_MCP_DASHBOARD_RESOURCE_CONFIG = {
  mimeType: RESOURCE_MIME_TYPE,
  _meta: {
    ui: {
      csp: {
        resourceDomains: ["https://esm.sh"],
      },
    },
  },
};
