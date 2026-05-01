import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Public changelog — reads CHANGELOG.md at build time and renders a vertically
 * stacked, paper-calm release feed.
 *
 * The post-commit hook keeps CHANGELOG.md fresh on every version bump, so this
 * is the single source of truth — no separate data file, no CMS.
 *
 * Heuristics for platform tagging are intentionally simple (substring match on
 * the entry body). When the heuristic gets noisy, swap to an explicit field in
 * a frontmatter convention rather than growing the regex zoo.
 */

export const metadata: Metadata = {
  title: "Changelog | Layers",
  description:
    "Every release of Layers — desktop, mobile, web. Newest first.",
};

// Server component — render once at build, revalidate when the file changes.
export const dynamic = "force-static";

type Platform = "Web" | "Mac" | "Windows" | "iOS" | "Android";

type ReleaseEntry = {
  /** Canonical version string, e.g. "0.1.52" or "Unreleased" */
  version: string;
  /** ISO date string (yyyy-mm-dd) when present, else null */
  date: string | null;
  /** Human-readable date label, falls back to "Unreleased" */
  dateLabel: string;
  /** Detected platforms based on body content */
  platforms: Platform[];
  /** Body markdown (without the H2 heading) */
  body: string;
};

// ── Parsing ───────────────────────────────────────────────────────────────

const VERSION_HEADING_RE =
  /^##\s+(?:\[([^\]]+)\]|([0-9][^\s—–-]*))\s*[—–-]?\s*(\d{4}-\d{2}-\d{2})?\s*$/;

function parseChangelog(markdown: string): ReleaseEntry[] {
  const lines = markdown.split(/\r?\n/);
  const entries: ReleaseEntry[] = [];

  let current: { version: string; date: string | null; lines: string[] } | null =
    null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (!current.version) return;
    entries.push({
      version: current.version,
      date: current.date,
      dateLabel: formatDateLabel(current.date, current.version),
      platforms: detectPlatforms(body),
      body,
    });
    current = null;
  };

  for (const line of lines) {
    const match = VERSION_HEADING_RE.exec(line);
    if (match) {
      flush();
      const version = (match[1] ?? match[2] ?? "").trim();
      const date = match[3] ?? null;
      current = { version, date, lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  flush();

  return entries;
}

function formatDateLabel(date: string | null, version: string): string {
  if (!date) {
    return version.toLowerCase() === "unreleased" ? "Unreleased" : "—";
  }
  // Parse as a UTC calendar date so the displayed day matches the file value.
  const [y, m, d] = date.split("-").map((part) => Number(part));
  if (!y || !m || !d) return date;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PLATFORM_PATTERNS: Array<{ platform: Platform; re: RegExp }> = [
  { platform: "Mac", re: /\b(macOS|Mac\b|DMG|Apple Silicon|Intel Mac|electron)\b/i },
  { platform: "Windows", re: /\b(Windows|\.exe|SmartScreen)\b/i },
  { platform: "iOS", re: /\b(iOS|iPhone|iPad|TestFlight|App Store)\b/i },
  { platform: "Android", re: /\b(Android|Capacitor|APK|Play Store)\b/i },
];

function detectPlatforms(body: string): Platform[] {
  const found = new Set<Platform>();
  for (const { platform, re } of PLATFORM_PATTERNS) {
    if (re.test(body)) found.add(platform);
  }
  // Default to Web if nothing else triggered.
  if (found.size === 0) found.add("Web");
  // Keep a stable display order.
  const order: Platform[] = ["Web", "Mac", "Windows", "iOS", "Android"];
  return order.filter((p) => found.has(p));
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function ChangelogPage() {
  const filePath = path.join(process.cwd(), "CHANGELOG.md");
  const raw = await fs.readFile(filePath, "utf8");
  const entries = parseChangelog(raw);

  return (
    <div
      className="min-h-screen-safe"
      style={{
        ["--section-y" as string]: "clamp(56px, 7vw, 112px)",
        ["--gutter" as string]: "clamp(20px, 4vw, 56px)",
        paddingBottom: "var(--section-y)",
      }}
    >
      <Hero count={entries.length} />
      <Timeline entries={entries} />
      <FinalCta />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────

function Hero({ count }: { count: number }) {
  return (
    <section
      aria-labelledby="changelog-title"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "0 auto",
        paddingTop: "var(--section-y)",
        paddingBottom: "clamp(32px, 4vw, 64px)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
        gap: "var(--gutter)",
        alignItems: "end",
      }}
      className="changelog-hero-wrap"
    >
      <div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border-subtle)",
            background: "color-mix(in oklch, var(--bg-surface) 86%, transparent)",
            color: "var(--fg-muted)",
            fontSize: "var(--text-xs)",
            letterSpacing: "var(--tracking-uppercase)",
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "var(--radius-pill)",
              background: "var(--layers-mint)",
            }}
          />
          What&rsquo;s new
        </span>
        <h1
          id="changelog-title"
          style={{
            marginTop: "var(--space-5)",
            color: "var(--layers-ink)",
            fontWeight: 600,
            fontSize: "clamp(2.6rem, 5.2vw, 4.4rem)",
            lineHeight: 1.04,
            letterSpacing: "-0.022em",
            maxWidth: "16ch",
          }}
        >
          Changelog
        </h1>
      </div>

      <p
        style={{
          color: "var(--fg-muted)",
          fontSize: "clamp(1rem, 1.1vw, 1.125rem)",
          lineHeight: 1.6,
          maxWidth: "44ch",
          marginBottom: "var(--space-2)",
        }}
      >
        Every release of Layers &mdash; desktop, mobile, web. Newest first.
        {count > 0 ? (
          <>
            {" "}
            <span style={{ color: "var(--fg-subtle)" }}>
              {count} {count === 1 ? "release" : "releases"} so far.
            </span>
          </>
        ) : null}
      </p>

      <style>{`
        @media (max-width: 960px) {
          .changelog-hero-wrap {
            grid-template-columns: minmax(0, 1fr) !important;
            align-items: start !important;
            row-gap: var(--space-5) !important;
          }
          .changelog-entry {
            grid-template-columns: minmax(0, 1fr) !important;
            row-gap: var(--space-4) !important;
          }
          .changelog-entry > .changelog-entry-meta {
            position: static !important;
          }
        }
      `}</style>
    </section>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────

function Timeline({ entries }: { entries: ReleaseEntry[] }) {
  if (entries.length === 0) {
    return (
      <section
        style={{
          width: "min(100% - 40px, 1180px)",
          margin: "0 auto",
          padding: "var(--space-6) 0",
          color: "var(--fg-muted)",
        }}
      >
        No releases yet.
      </section>
    );
  }

  return (
    <section
      aria-label="Release history"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "0 auto",
      }}
    >
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {entries.map((entry, i) => (
          <li
            key={`${entry.version}-${i}`}
            style={{
              borderTop:
                i === 0 ? "none" : "1px solid var(--border-subtle)",
            }}
          >
            <ChangelogEntry entry={entry} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function ChangelogEntry({ entry }: { entry: ReleaseEntry }) {
  return (
    <article
      className="changelog-entry"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.7fr) minmax(0, 1.3fr)",
        gap: "var(--gutter)",
        padding: "clamp(28px, 4vw, 56px) 0",
        alignItems: "start",
      }}
    >
      <header
        className="changelog-entry-meta"
        style={{
          position: "sticky",
          top: "calc(var(--space-6) + 64px)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            alignSelf: "flex-start",
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: "var(--layers-mint-tint)",
            color: "var(--tier-mint-text)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          v{entry.version.replace(/^v/i, "")}
        </span>
        <time
          dateTime={entry.date ?? undefined}
          style={{
            color: "var(--fg-default)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            letterSpacing: "-0.005em",
          }}
        >
          {entry.dateLabel}
        </time>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-2)",
            marginTop: "var(--space-1)",
          }}
        >
          {entry.platforms.map((platform) => (
            <PlatformTag key={platform} platform={platform} />
          ))}
        </div>
      </header>

      <div className="changelog-entry-body">
        <div
          style={{
            color: "var(--fg-default)",
            fontSize: "var(--text-md)",
            lineHeight: 1.6,
          }}
          className="changelog-prose"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {entry.body}
          </ReactMarkdown>
        </div>
      </div>

      <style>{`
        .changelog-prose h3 {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--fg-subtle);
          margin: var(--space-5) 0 var(--space-3);
        }
        .changelog-prose h3:first-child { margin-top: 0; }
        .changelog-prose ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .changelog-prose li {
          display: grid;
          grid-template-columns: 14px 1fr;
          gap: var(--space-3);
          align-items: baseline;
          color: var(--fg-default);
        }
        .changelog-prose li::before {
          content: "·";
          color: var(--layers-mint);
          font-weight: 700;
          font-size: 1rem;
          line-height: 1;
        }
        .changelog-prose strong {
          color: var(--layers-ink);
          font-weight: 600;
        }
        .changelog-prose code {
          font-family: var(--font-mono);
          font-size: 0.82em;
          padding: 0 4px;
          border-radius: 4px;
          background: color-mix(in oklch, var(--bg-surface) 88%, var(--layers-ink) 6%);
          color: var(--fg-muted);
        }
        .changelog-prose p {
          margin: 0 0 var(--space-3);
        }
        .changelog-prose a {
          color: var(--layers-blue, var(--layers-mint));
          text-decoration: none;
          border-bottom: 1px solid color-mix(in oklch, currentColor 30%, transparent);
        }
        .changelog-prose a:hover {
          border-bottom-color: currentColor;
        }
      `}</style>
    </article>
  );
}

const PLATFORM_PALETTE: Record<
  Platform,
  { bg: string; fg: string; dot: string }
> = {
  Web: {
    bg: "var(--layers-mint-tint)",
    fg: "var(--tier-mint-text)",
    dot: "var(--layers-mint)",
  },
  Mac: {
    bg: "var(--bg-surface)",
    fg: "var(--fg-default)",
    dot: "var(--layers-ink)",
  },
  Windows: {
    bg: "var(--layers-blue-tint)",
    fg: "var(--tier-blue-text)",
    dot: "var(--layers-blue)",
  },
  iOS: {
    bg: "var(--layers-violet-tint)",
    fg: "var(--tier-violet-text)",
    dot: "var(--layers-violet)",
  },
  Android: {
    bg: "var(--layers-mint-soft)",
    fg: "var(--tier-mint-text)",
    dot: "var(--layers-mint)",
  },
};

function PlatformTag({ platform }: { platform: Platform }) {
  const palette = PLATFORM_PALETTE[platform];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border-subtle)",
        background: palette.bg,
        color: palette.fg,
        fontSize: "0.68rem",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: "var(--radius-pill)",
          background: palette.dot,
        }}
      />
      {platform}
    </span>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section
      aria-label="Get started"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "var(--section-y) auto 0",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(40px, 5vw, 80px) clamp(24px, 4vw, 64px)",
          borderRadius: "var(--radius-2xl)",
          background:
            "radial-gradient(circle at 0% 100%, color-mix(in oklch, var(--layers-mint-tint) 80%, transparent), transparent 55%), radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--layers-violet-tint) 65%, transparent), transparent 55%), var(--bg-surface)",
          border: "1px solid var(--border-default)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: "var(--gutter)",
          alignItems: "center",
        }}
        className="changelog-final-cta"
      >
        <div>
          <h2
            style={{
              color: "var(--layers-ink)",
              fontSize: "clamp(1.75rem, 3.6vw, 2.8rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
              maxWidth: "20ch",
              margin: 0,
            }}
          >
            Ship faster.{" "}
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 500,
                color: "var(--brand-accent-muted)",
              }}
            >
              We will too.
            </em>
          </h2>
          <p
            style={{
              marginTop: "var(--space-4)",
              color: "var(--fg-muted)",
              fontSize: "var(--text-md)",
              lineHeight: 1.55,
              maxWidth: "52ch",
            }}
          >
            Layers improves every week. Try it free, then upgrade when meeting
            memory becomes part of how your team actually works.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            alignItems: "stretch",
          }}
        >
          <Link
            href="/sign-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "16px 22px",
              borderRadius: "var(--radius-pill)",
              border:
                "1px solid color-mix(in oklch, var(--layers-mint) 50%, var(--layers-ink) 14%)",
              background: "var(--layers-mint-soft)",
              color: "var(--layers-ink)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              textDecoration: "none",
            }}
          >
            Try Layers free
            <ArrowRight size={17} aria-hidden />
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 22px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border-default)",
              background:
                "color-mix(in oklch, var(--bg-surface) 86%, transparent)",
              color: "var(--layers-ink)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to home
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .changelog-final-cta {
            grid-template-columns: minmax(0, 1fr) !important;
            row-gap: var(--space-6) !important;
          }
        }
      `}</style>
    </section>
  );
}
