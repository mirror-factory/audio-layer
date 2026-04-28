import { existsSync, readFileSync } from "fs";
import { basename, relative, resolve } from "path";

import { NextResponse } from "next/server";

interface EvidenceExportSummary {
  archivePath?: string;
  id?: string;
  createdAt?: string;
  bytes?: number;
}

function readLatestExport(): EvidenceExportSummary | null {
  try {
    const latestPath = resolve(process.cwd(), ".ai-starter/exports/latest.json");
    if (!existsSync(latestPath)) return null;
    return JSON.parse(readFileSync(latestPath, "utf-8")) as EvidenceExportSummary;
  } catch {
    return null;
  }
}

function exportAllowed() {
  return process.env.NODE_ENV !== "production" &&
    process.env.VERCEL !== "1" &&
    process.env.AI_STARTER_DISABLE_DASHBOARD_ACTIONS !== "1";
}

export async function GET() {
  if (!exportAllowed()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Evidence export downloads are dev-only.",
      },
      { status: 403 },
    );
  }

  const summary = readLatestExport();
  const archivePath = summary?.archivePath ? resolve(summary.archivePath) : null;
  const exportRoot = resolve(process.cwd(), ".ai-starter/exports");

  if (
    !archivePath ||
    relative(exportRoot, archivePath).startsWith("..") ||
    !existsSync(archivePath)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "No evidence export exists yet. Run the Export evidence dashboard action first.",
      },
      { status: 404 },
    );
  }

  const bytes = new Uint8Array(readFileSync(archivePath));
  const filename = basename(archivePath);

  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/gzip",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "no-store",
      "x-ai-starter-export-id": summary?.id ?? filename,
      "x-ai-starter-export-created-at": summary?.createdAt ?? "",
    },
  });
}
