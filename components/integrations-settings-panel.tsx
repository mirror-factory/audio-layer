"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Link2,
  Loader2,
  PlugZap,
  Settings,
  Trash2,
  Webhook,
} from "lucide-react";

type WebhookEvent = "meeting.completed" | "meeting.started" | "meeting.error";

interface WebhookItem {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  created_at: string;
}

interface WebhookDeliveryItem {
  id: string;
  webhookUrl: string | null;
  event: WebhookEvent;
  meetingId: string;
  statusCode: number | null;
  success: boolean;
  createdAt: string;
}

const EVENT_OPTIONS: { value: WebhookEvent; label: string }[] = [
  { value: "meeting.completed", label: "Meeting completed" },
  { value: "meeting.error", label: "Recording failed" },
];

export function IntegrationsSettingsPanel() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["meeting.completed"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [blockedReason, setBlockedReason] = useState("");

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setBlockedReason("");
    try {
      const response = await fetch("/api/webhooks");
      const body = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setBlockedReason("Sign in to manage webhooks.");
        setWebhooks([]);
        setDeliveries([]);
        return;
      }

      if (!response.ok) {
        setBlockedReason(
          body.error ?? "Webhook storage is not available in this environment.",
        );
        setWebhooks([]);
        setDeliveries([]);
        return;
      }

      setWebhooks(Array.isArray(body.webhooks) ? body.webhooks : []);

      const deliveriesResponse = await fetch("/api/webhooks/deliveries?limit=8");
      if (!deliveriesResponse.ok) {
        setDeliveries([]);
        return;
      }

      const deliveriesBody = await deliveriesResponse.json().catch(() => ({}));
      setDeliveries(
        Array.isArray(deliveriesBody.deliveries)
          ? deliveriesBody.deliveries
          : [],
      );
    } catch {
      setBlockedReason("Could not load webhooks.");
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadWebhooks();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadWebhooks]);

  function toggleEvent(event: WebhookEvent) {
    setEvents((current) => {
      if (current.includes(event)) {
        const next = current.filter((item) => item !== event);
        return next.length === 0 ? current : next;
      }
      return [...current, event];
    });
  }

  async function createWebhook() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          events,
          secret: secret.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice(body.error ?? "Could not add webhook.");
        return;
      }

      setWebhookUrl("");
      setSecret("");
      setNotice("Webhook added.");
      await loadWebhooks();
    } finally {
      setSaving(false);
    }
  }

  async function deleteWebhook(id: string) {
    setDeletingId(id);
    setNotice("");
    try {
      const response = await fetch("/api/webhooks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setNotice("Webhook removed.");
        await loadWebhooks();
      } else {
        const body = await response.json().catch(() => ({}));
        setNotice(body.error ?? "Could not remove webhook.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const canSave = webhookUrl.trim().length > 0 && !saving && !blockedReason;

  return (
    <section id="integrations" className="glass-card rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="settings-integration-icon" aria-hidden="true">
          <PlugZap size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Integrations
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Connect meeting memory to agents and downstream systems after notes
            are created.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {/* Agent access (MCP) — fully functional */}
        <div className="settings-integration-card rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Agent access
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                Add the MCP server URL to trusted AI tools. They will redirect
                you to Layers sign-in and consent.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/profile"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)]"
              >
                <Link2 size={12} aria-hidden="true" />
                MCP URL
              </Link>
            </div>
          </div>
        </div>

        {/* Calendar connector — Coming soon */}
        <ComingSoonConnectorCard
          icon={<CalendarDays size={15} aria-hidden="true" />}
          title="Calendar"
          body="Sync upcoming meetings from Google Calendar and Outlook so Layers can pre-fill titles, attendees, and start recording on schedule."
        />

        {/* Settings / preferences sync — Coming soon */}
        <ComingSoonConnectorCard
          icon={<Settings size={15} aria-hidden="true" />}
          title="Settings sync"
          body="Carry your Layers preferences (default model, recording mode, summary template) across devices and the desktop apps."
        />

        <div className="settings-integration-card rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-3">
          <div className="mb-3 flex items-center gap-2">
            <Webhook size={15} className="text-layers-mint" aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Webhooks
            </p>
            {loading && (
              <Loader2 size={13} className="animate-spin text-layers-mint" />
            )}
          </div>

          {blockedReason ? (
            <p className="rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-muted)]">
              {blockedReason}
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                <input
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://example.com/layers-webhook"
                  className="signal-input min-h-[44px] rounded-lg px-3 text-sm text-[var(--text-primary)] focus:outline-none"
                  inputMode="url"
                />
                <input
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="Signing secret, optional"
                  className="signal-input min-h-[44px] rounded-lg px-3 text-sm text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {EVENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleEvent(option.value)}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                      events.includes(option.value)
                        ? "border-layers-mint/40 bg-layers-mint/10 text-layers-mint"
                        : "border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {events.includes(option.value) && (
                      <Check size={12} aria-hidden="true" />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Completed-meeting webhooks send summary, decisions, actions, and
                intake context. Transcript text is not sent.
              </p>

              <button
                type="button"
                onClick={createWebhook}
                disabled={!canSave}
                className="mt-3 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[var(--paper-calm-ink)] px-4 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 dark:text-layers-ink"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Add webhook
              </button>
            </>
          )}

          {notice && (
            <p className="mt-2 text-xs text-[var(--text-muted)]" role="status">
              {notice}
            </p>
          )}

          {webhooks.length > 0 && (
            <div className="mt-4 space-y-2">
              {webhooks.map((hook) => (
                <div
                  key={hook.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {hook.url}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {hook.active ? "Active" : "Paused"} -{" "}
                      {hook.events.join(", ")} -{" "}
                      {new Date(hook.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWebhook(hook.id)}
                    disabled={deletingId === hook.id}
                    className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-control-hover)] hover:text-signal-live disabled:opacity-60"
                    aria-label="Remove webhook"
                  >
                    {deletingId === hook.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {webhooks.length === 0 && !loading && !blockedReason && (
            <p className="mt-4 rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-3 py-2 text-xs leading-5 text-[var(--text-muted)]">
              No webhooks yet. Add a destination URL when you are ready to send
              completed-meeting notes into another system.
            </p>
          )}

          {deliveries.length > 0 && (
            <div className="mt-4 rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] p-3">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Recent deliveries
              </p>
              <div className="mt-2 space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-secondary)]">
                        {delivery.webhookUrl ?? "Webhook"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {delivery.event} - {delivery.meetingId} -{" "}
                        {new Date(delivery.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                        delivery.success
                          ? "bg-layers-mint/10 text-[#0f766e]"
                          : "bg-signal-live/10 text-[#dc2626]"
                      }`}
                    >
                      {delivery.success
                        ? delivery.statusCode ?? "OK"
                        : delivery.statusCode ?? "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ComingSoonConnectorCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="settings-integration-card relative rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-3 opacity-80"
      aria-disabled="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)]"
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {title}
              </p>
              <span className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--layers-mint)_18%,transparent)] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--layers-mint)]">
                Coming soon
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {body}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Coming soon — invite-only alpha"
          className="inline-flex min-h-[36px] cursor-not-allowed items-center gap-1.5 rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-3 text-xs font-semibold text-[var(--text-muted)] opacity-70"
        >
          <Link2 size={12} aria-hidden="true" />
          Connect
        </button>
      </div>
    </div>
  );
}
