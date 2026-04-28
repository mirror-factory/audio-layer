import { NextRequest, NextResponse } from "next/server";

import {
  loadStarterControlPlaneData,
  runControlPlaneAction,
} from "@/lib/starter-control-plane";

export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    data: await loadStarterControlPlaneData(),
  });
}

export async function POST(request: NextRequest) {
  let actionId = "";
  try {
    const body = (await request.json()) as { actionId?: string };
    actionId = body.actionId ?? "";
  } catch {
    return NextResponse.json(
      {
        ok: false,
        generatedAt: new Date().toISOString(),
        error: "Invalid JSON body. Expected { actionId }.",
      },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;
  const result = await runControlPlaneAction(actionId, { baseUrl: origin });
  const status = result.status === "denied" ? 403 : result.status === "missing" ? 404 : 200;

  return NextResponse.json(
    {
      ok: result.status === "success",
      generatedAt: new Date().toISOString(),
      result,
      data: await loadStarterControlPlaneData(),
    },
    { status },
  );
}
