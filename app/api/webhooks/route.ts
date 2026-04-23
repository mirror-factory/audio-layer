export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { getCurrentUserId } from "@/lib/supabase/user";
import { getSupabaseServer } from "@/lib/supabase/server";

const CreateWebhookSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  events: z
    .array(z.enum(["meeting.completed", "meeting.started", "meeting.error"]))
    .min(1, "At least one event required"),
  secret: z.string().min(8).optional(),
});

/** GET /api/webhooks — list user's webhooks */
export const GET = withRoute(async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("webhooks")
    .select("id, url, events, active, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ webhooks: data ?? [] });
});

/** POST /api/webhooks — create a webhook */
export const POST = withRoute(async (req) => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: z.infer<typeof CreateWebhookSchema>;
  try {
    const raw = await req.json();
    body = CreateWebhookSchema.parse(raw);
  } catch (err) {
    const zodErrors = err instanceof z.ZodError ? err.issues : null;
    return NextResponse.json(
      { error: zodErrors ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      user_id: userId,
      url: body.url,
      events: body.events,
      secret: body.secret ?? null,
      active: true,
    })
    .select("id, url, events, active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ webhook: data }, { status: 201 });
});

/** DELETE /api/webhooks — delete a webhook by id in body */
export const DELETE = withRoute(async (req) => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
});
