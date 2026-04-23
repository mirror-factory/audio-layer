import { getSupabaseServer } from "@/lib/supabase/server";

export type WebhookEvent = "meeting.completed" | "meeting.started" | "meeting.error";

interface WebhookPayload {
  event: WebhookEvent;
  meetingId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface WebhookConfig {
  id: string;
  user_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  active: boolean;
}

/**
 * Fire webhooks for a given event. Runs in background — never throws.
 * Sends a POST with JSON payload and optional HMAC signature header.
 */
export async function fireWebhooks(
  userId: string,
  event: WebhookEvent,
  meetingId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  const { data: hooks } = await supabase
    .from("webhooks")
    .select("id, user_id, url, events, secret, active")
    .eq("user_id", userId)
    .eq("active", true);

  if (!hooks || hooks.length === 0) return;

  const matching = (hooks as WebhookConfig[]).filter(
    (h) => h.events.includes(event) || h.events.includes("meeting.completed" as WebhookEvent),
  );

  const payload: WebhookPayload = {
    event,
    meetingId,
    data,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    matching.map(async (hook) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
        };

        // HMAC signature if secret is configured
        if (hook.secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(hook.secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
          );
          const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
          const hex = Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          headers["X-Webhook-Signature"] = `sha256=${hex}`;
        }

        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        // Log delivery status
        await supabase.from("webhook_deliveries").insert({
          webhook_id: hook.id,
          event,
          meeting_id: meetingId,
          status_code: res.status,
          success: res.ok,
        });
      } catch {
        // Webhook delivery failure is non-fatal
      }
    }),
  );
}
