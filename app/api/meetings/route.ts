export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getMeetingsStore } from "@/lib/meetings/store";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const GET = withRoute(async (req) => {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  let limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;

  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const store = await getMeetingsStore();
  const meetings = await store.list(limit);

  return NextResponse.json(meetings);
});
