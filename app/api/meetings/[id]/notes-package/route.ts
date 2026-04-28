export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getCurrentUserId } from "@/lib/supabase/user";
import { getMeetingsStore } from "@/lib/meetings/store";
import {
  NotesPushPackageRequestSchema,
  buildNotesPushPackage,
} from "@/lib/notes-push";
import type { NotesPushPackageRequest } from "@/lib/notes-push";

export const POST = withRoute(async (req, ctx) => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const id = ctx.params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let input: NotesPushPackageRequest;
  try {
    const raw = await req.json();
    input = NotesPushPackageRequestSchema.parse(raw);
  } catch (err) {
    const zodErrors =
      err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: zodErrors }, { status: 400 });
  }

  const store = await getMeetingsStore();
  const meeting = await store.get(id);

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(buildNotesPushPackage(meeting, input));
});
