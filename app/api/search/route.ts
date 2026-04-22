export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { searchMeetings } from "@/lib/embeddings/search";
import { getCurrentUserId } from "@/lib/supabase/user";

const SearchBodySchema = z.object({
  query: z.string().min(1, "query is required"),
  limit: z.number().int().min(1).max(50).optional(),
});

export const POST = withRoute(async (req) => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  let body: z.infer<typeof SearchBodySchema>;
  try {
    const raw = await req.json();
    body = SearchBodySchema.parse(raw);
  } catch (err) {
    const zodErrors = err instanceof z.ZodError ? err.issues : null;
    return NextResponse.json(
      { error: zodErrors ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const results = await searchMeetings(body.query, userId, body.limit);

  return NextResponse.json({ results });
});
