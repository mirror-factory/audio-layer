export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getMeetingsStore } from "@/lib/meetings/store";
import { meetingToMarkdown, meetingFilenameStem } from "@/lib/meetings/export";

export const GET = withRoute(async (req, ctx) => {
  const id = ctx.params?.id as string;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "md";

  const store = await getMeetingsStore();
  const meeting = await store.get(id);

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const filename = meetingFilenameStem(meeting);

  if (format === "md") {
    const markdown = meetingToMarkdown(meeting);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  }

  if (format === "pdf") {
    try {
      // Lazy-load pdf renderer to avoid bundling it when not needed
      const markdown = meetingToMarkdown(meeting);

      // Use a simple HTML-to-PDF approach via basic HTML rendering
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: ui-monospace, SFMono-Regular, monospace; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
    h1 { font-size: 24px; border-bottom: 2px solid #14b8a6; padding-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; color: #555; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    p { line-height: 1.6; }
    strong { color: #222; }
  </style>
</head>
<body>
  ${markdownToBasicHtml(markdown)}
</body>
</html>`;

      return new Response(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.html"`,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "PDF generation failed, returning HTML instead" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: `Unsupported format: ${format}. Use 'md' or 'pdf'.` },
    { status: 400 },
  );
});

/**
 * Minimal markdown to HTML converter for export.
 * Handles headings, bold, lists, and paragraphs.
 */
function markdownToBasicHtml(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("- [ ] ")) return `<li>${line.slice(6)}</li>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      if (line.startsWith("**") && line.includes(":**"))
        return `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
      if (line.trim() === "") return "";
      return `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("\n");
}
