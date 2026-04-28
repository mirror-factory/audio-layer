import { getSupabaseServer } from "@/lib/supabase/server";

export type WebhookEvent =
  | "meeting.completed"
  | "meeting.started"
  | "meeting.error";

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

async function signWebhookPayload(
  body: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
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
  const client = supabase;

  const { data: hooks } = await client
    .from("webhooks")
    .select("id, user_id, url, events, secret, active")
    .eq("user_id", userId)
    .eq("active", true);

  if (!hooks || hooks.length === 0) return;

  const matching = (hooks as WebhookConfig[]).filter(
    (hook) => hook.events.includes(event),
  );

  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    event,
    meetingId,
    data,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  async function logDelivery(
    hook: WebhookConfig,
    statusCode: number | null,
    success: boolean,
  ) {
    await client.from("webhook_deliveries").insert({
      webhook_id: hook.id,
      event,
      meeting_id: meetingId,
      status_code: statusCode,
      success,
    });
  }

  await Promise.allSettled(
    matching.map(async (hook) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
        };

        // HMAC signature if secret is configured
        if (hook.secret) {
          headers["X-Webhook-Signature"] = await signWebhookPayload(
            body,
            hook.secret,
          );
        }

        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        // Log delivery status
        await logDelivery(hook, res.status, res.ok);
      } catch {
        // Webhook delivery failure is non-fatal, but should be visible.
        await logDelivery(hook, null, false).catch(() => {});
      }
    }),
  );
}
