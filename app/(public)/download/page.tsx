"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowUpRight,
  Cpu,
  Globe,
  LifeBuoy,
  MonitorDown,
  Smartphone,
  Tablet,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────
// Tokens we wished existed (proposed, not added):
//   --space-section-flush: clamp(64px, 8vw, 112px)  // hero → first section
//   --shadow-paper-crease: 0 1px 0 oklch(0.84 0.024 168 / .8),
//                          0 14px 28px -22px oklch(0.22 0.035 256 / .18)
//   --layers-mint-paper: oklch(0.965 0.045 168)     // warmer mint than tint
//   --layers-violet-paper: oklch(0.965 0.04 284)
// For now the page composes these inline from existing OKLCH variables.
// ──────────────────────────────────────────────────────────────────────────

type DownloadPlatformKey = "web" | "macos" | "windows" | "ios" | "android";

type InstallStep = {
  /** Short label e.g. "Apple Silicon" or "Windows 10 / 11" */
  label: string;
  /** One-line plain-language requirement */
  hint: string;
};

type DownloadVariant = {
  /** CTA copy shown on the button */
  cta: string;
  /** Resolved download URL — undefined if the asset is not yet wired (PROD-367) */
  href?: string;
  /** Surfaced under the CTA when no href is available */
  pendingNote?: string;
};

type DownloadChannel = {
  key: DownloadPlatformKey;
  /** Short product label, e.g. "macOS" */
  name: string;
  /** Channel description shown in body copy */
  tagline: string;
  /** "Stable" / "Beta" / "TestFlight" — surfaced as pill */
  channelLabel: string;
  /** Whether this channel is currently shipping */
  status: "live" | "beta" | "preflight";
  icon: LucideIcon;
  /** What this device gets that's distinctive */
  whatYouGet: string;
  /** Install requirements — keep sentences short and verifiable */
  requirements: InstallStep[];
  /** Download variants. macOS has two (Silicon + Intel); others typically one. */
  variants: DownloadVariant[];
};

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

// PROD-367 (Linear) tracks wiring real outbound URLs. Preserve placeholders.
const GITHUB_RELEASE_DOWNLOAD_BASE =
  "https://github.com/mirror-factory/audio-layer/releases/latest/download";

const RELEASE_DOWNLOAD_URLS = {
  macArm64Dmg: `${GITHUB_RELEASE_DOWNLOAD_BASE}/Layers-mac-arm64.dmg`,
  macX64Dmg: `${GITHUB_RELEASE_DOWNLOAD_BASE}/Layers-mac-x64.dmg`,
  windowsExe: `${GITHUB_RELEASE_DOWNLOAD_BASE}/Layers-windows.exe`,
  androidApk: `${GITHUB_RELEASE_DOWNLOAD_BASE}/Layers-android.apk`,
} as const;

const PUBLIC_DOWNLOAD_URLS = {
  testFlight: cleanUrl(
    process.env.NEXT_PUBLIC_TESTFLIGHT_URL ??
      process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL,
  ),
  playInternalTesting: cleanUrl(
    process.env.NEXT_PUBLIC_PLAY_INTERNAL_TESTING_URL ??
      process.env.NEXT_PUBLIC_ANDROID_INTERNAL_TESTING_URL,
  ),
  macDmg:
    cleanUrl(
      process.env.NEXT_PUBLIC_MAC_DMG_URL ??
        process.env.NEXT_PUBLIC_MAC_ARTIFACT_URL ??
        process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL,
    ) ?? RELEASE_DOWNLOAD_URLS.macArm64Dmg,
  macIntelDmg:
    cleanUrl(
      process.env.NEXT_PUBLIC_MAC_X64_DMG_URL ??
        process.env.NEXT_PUBLIC_MAC_INTEL_DMG_URL,
    ) ?? RELEASE_DOWNLOAD_URLS.macX64Dmg,
  windowsExe:
    cleanUrl(
      process.env.NEXT_PUBLIC_WINDOWS_EXE_URL ??
        process.env.NEXT_PUBLIC_WINDOWS_ARTIFACT_URL ??
        process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL,
    ) ?? RELEASE_DOWNLOAD_URLS.windowsExe,
  androidApk:
    cleanUrl(
      process.env.NEXT_PUBLIC_ANDROID_APK_URL ??
        process.env.NEXT_PUBLIC_ANDROID_ARTIFACT_URL,
    ) ?? RELEASE_DOWNLOAD_URLS.androidApk,
  webApp: cleanUrl(process.env.NEXT_PUBLIC_WEB_APP_URL) ?? "/sign-in",
} as const;

const PLATFORM_ORDER: DownloadPlatformKey[] = [
  "macos",
  "windows",
  "web",
  "ios",
  "android",
];

const DOWNLOAD_CHANNELS: Record<DownloadPlatformKey, DownloadChannel> = {
  macos: {
    key: "macos",
    name: "macOS",
    tagline:
      "Native capture with system audio routing, menu-bar capture controls, and a local meeting library.",
    channelLabel: "Stable alpha",
    status: "beta",
    icon: Apple,
    whatYouGet:
      "A menu-bar app that captures every meeting and turns it into searchable memory — decisions and action items, with owners and due dates, filed automatically.",
    requirements: [
      { label: "macOS 13 Ventura or later", hint: "Tested on macOS 14 + 15." },
      {
        label: "Microphone permission",
        hint: "System Settings → Privacy & Security → Microphone.",
      },
      {
        label: "~140 MB free disk",
        hint: "Local cache holds recent transcripts.",
      },
    ],
    variants: [
      { cta: "Download for Apple Silicon", href: PUBLIC_DOWNLOAD_URLS.macDmg },
      { cta: "Download for Intel Mac", href: PUBLIC_DOWNLOAD_URLS.macIntelDmg },
    ],
  },
  windows: {
    key: "windows",
    name: "Windows",
    tagline:
      "Same capture, transcription, and library — built for Windows desktop and laptop workflows.",
    channelLabel: "Stable alpha",
    status: "beta",
    icon: MonitorDown,
    whatYouGet:
      "A taskbar companion that records system + microphone audio and syncs transcripts to your account.",
    requirements: [
      {
        label: "Windows 10 (build 19041) or Windows 11",
        hint: "ARM and x64 supported.",
      },
      {
        label: "Microphone permission",
        hint: "Settings → Privacy → Microphone.",
      },
      {
        label: "Code signing in progress",
        hint: "SmartScreen may prompt — choose Run anyway.",
      },
    ],
    variants: [
      { cta: "Download .exe installer", href: PUBLIC_DOWNLOAD_URLS.windowsExe },
    ],
  },
  web: {
    key: "web",
    name: "Web app",
    tagline:
      "The browser experience for upload, review, search, and AI-ready meeting memory.",
    channelLabel: "Stable alpha",
    status: "live",
    icon: Globe,
    whatYouGet:
      "Searchable memory of every decision made, plus transcripts, recordings, and AI tools — no install, same account as the native apps.",
    requirements: [
      {
        label: "Modern desktop browser",
        hint: "Chrome, Edge, Safari 17+, Firefox 120+.",
      },
      {
        label: "Account",
        hint: "Free workspace covers the first 25 meetings.",
      },
    ],
    variants: [{ cta: "Open the web app", href: PUBLIC_DOWNLOAD_URLS.webApp }],
  },
  ios: {
    key: "ios",
    name: "iPhone & iPad",
    tagline:
      "Capture in-person conversations and review your library on the move.",
    channelLabel: "Stable alpha",
    status: PUBLIC_DOWNLOAD_URLS.testFlight ? "beta" : "preflight",
    icon: Smartphone,
    whatYouGet:
      "On-device recording for hallway and field interviews, plus the full Layers library in your pocket.",
    requirements: [
      { label: "iOS 17 or later", hint: "iPad and iPhone supported." },
      {
        label: "TestFlight",
        hint: "Apple's beta app — install from the App Store first.",
      },
    ],
    variants: PUBLIC_DOWNLOAD_URLS.testFlight
      ? [{ cta: "Open TestFlight invite", href: PUBLIC_DOWNLOAD_URLS.testFlight }]
      : [
          {
            cta: "TestFlight invite — opening soon",
            pendingNote:
              "We're finalising App Store Connect signing. Email support@mirrorfactory.ai for early access.",
          },
        ],
  },
  android: {
    key: "android",
    name: "Android",
    tagline:
      "Sideload the APK today, or join Play internal testing once it opens.",
    channelLabel: "Stable alpha",
    status: "beta",
    icon: Tablet,
    whatYouGet:
      "Mobile recording and library access. Play Store distribution is coming after the public beta.",
    requirements: [
      { label: "Android 12 or later", hint: "ARM64 build." },
      {
        label: "Allow install from this source",
        hint: "Android will ask once on first install.",
      },
    ],
    variants: PUBLIC_DOWNLOAD_URLS.playInternalTesting
      ? [
          { cta: "Download .apk", href: PUBLIC_DOWNLOAD_URLS.androidApk },
          {
            cta: "Join Play internal testing",
            href: PUBLIC_DOWNLOAD_URLS.playInternalTesting,
          },
        ]
      : [{ cta: "Download .apk", href: PUBLIC_DOWNLOAD_URLS.androidApk }],
  },
};

// ── helpers ───────────────────────────────────────────────────────────────

function cleanUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function detectPlatform(): DownloadPlatformKey {
  const nav = navigator as NavigatorWithUAData;
  const platform = (
    nav.userAgentData?.platform ??
    navigator.platform ??
    ""
  ).toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  if (/android/.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (platform.includes("mac") && maxTouchPoints > 1) return "ios";
  if (platform.includes("mac") || /mac os x/.test(userAgent)) return "macos";
  if (platform.includes("win") || /windows/.test(userAgent)) return "windows";
  return "web";
}

function getPlatformSnapshot(): DownloadPlatformKey {
  if (typeof navigator === "undefined") return "web";
  return detectPlatform();
}

function getServerPlatformSnapshot(): DownloadPlatformKey {
  // Render macOS-first on the server for the most common visitor; the client
  // hydrates to the real platform inside <PrimaryInstall>.
  return "macos";
}

function subscribeToPlatformChanges(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("orientationchange", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  return () => {
    window.removeEventListener("orientationchange", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

// ── visual primitives ─────────────────────────────────────────────────────

function VariantButton({
  variant,
  emphasis,
}: {
  variant: DownloadVariant;
  emphasis: "primary" | "ghost";
}) {
  const baseClasses =
    emphasis === "primary"
      ? "group/btn inline-flex items-center justify-between gap-4 rounded-xl px-5 py-3.5 text-[0.95rem] font-medium tracking-tight transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px"
      : "group/btn inline-flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-[0.875rem] font-medium tracking-tight transition-colors duration-150";

  const styleProps =
    emphasis === "primary"
      ? {
          backgroundColor: "var(--layers-ink)",
          color: "var(--bg-page)",
          boxShadow:
            "0 1px 0 oklch(1 0 0 / .12) inset, 0 12px 28px -18px oklch(0.22 0.035 256 / .55)",
        }
      : {
          backgroundColor: "var(--bg-surface)",
          color: "var(--fg-default)",
          border: "1px solid var(--border-default)",
        };

  if (!variant.href) {
    return (
      <span
        aria-disabled
        className={`${baseClasses} cursor-not-allowed opacity-70`}
        style={
          emphasis === "primary"
            ? {
                backgroundColor: "var(--bg-surface-2)",
                color: "var(--fg-muted)",
              }
            : styleProps
        }
      >
        <span>{variant.cta}</span>
        <ArrowUpRight size={16} aria-hidden="true" className="opacity-50" />
      </span>
    );
  }

  const arrow = (
    <ArrowUpRight
      size={16}
      aria-hidden="true"
      className="transition-transform duration-200 ease-out group-hover/btn:-translate-y-[2px] group-hover/btn:translate-x-[2px]"
    />
  );

  if (isExternalHref(variant.href)) {
    return (
      <a
        href={variant.href}
        target="_blank"
        rel="noreferrer"
        className={baseClasses}
        style={styleProps}
      >
        <span>{variant.cta}</span>
        {arrow}
      </a>
    );
  }

  return (
    <Link href={variant.href} className={baseClasses} style={styleProps}>
      <span>{variant.cta}</span>
      {arrow}
    </Link>
  );
}

function ChannelPill({ channel }: { channel: DownloadChannel }) {
  const palette = {
    live: {
      bg: "var(--layers-mint-tint)",
      fg: "oklch(0.36 0.08 166)",
      dot: "var(--layers-mint)",
    },
    beta: {
      bg: "var(--layers-blue-tint)",
      fg: "oklch(0.34 0.08 240)",
      dot: "var(--layers-blue)",
    },
    preflight: {
      bg: "var(--layers-violet-tint)",
      fg: "oklch(0.36 0.09 284)",
      dot: "var(--layers-violet)",
    },
  }[channel.status];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em]"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: palette.dot }}
      />
      {channel.channelLabel}
    </span>
  );
}

function NumberedLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="font-mono text-[0.72rem] tabular-nums tracking-[0.18em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {index}
      </span>
      <span
        className="text-[0.72rem] uppercase tracking-[0.22em]"
        style={{ color: "var(--fg-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── PrimaryInstall: the "your platform first" hero ────────────────────────

function PrimaryInstall() {
  const detected = useSyncExternalStore(
    subscribeToPlatformChanges,
    getPlatformSnapshot,
    getServerPlatformSnapshot,
  );
  const channel = DOWNLOAD_CHANNELS[detected];
  const Icon = channel.icon;

  return (
    <section
      aria-labelledby="primary-install-heading"
      aria-live="polite"
      className="relative overflow-hidden rounded-[28px]"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        boxShadow:
          "0 1px 0 oklch(1 0 0 / .8) inset, 0 24px 48px -32px oklch(0.22 0.035 256 / .22)",
      }}
    >
      {/* paper-tint wash, mint side */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--layers-mint-tint), transparent 72%)",
          opacity: 0.9,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-[-40%] h-[360px] w-[360px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--layers-violet-tint), transparent 70%)",
          opacity: 0.7,
        }}
      />

      <div className="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:p-14">
        {/* Left: pitch + primary CTA */}
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-3">
            <NumberedLabel index="01" label="Recommended for you" />
          </div>

          <div className="flex items-start gap-4">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-default)",
                color: "var(--layers-ink)",
              }}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <h2
                id="primary-install-heading"
                className="text-balance font-semibold leading-[1.05] tracking-[-0.02em]"
                style={{
                  color: "var(--fg-default)",
                  fontSize: "clamp(1.6rem, 1.05rem + 1.6vw, 2.35rem)",
                }}
              >
                Install Layers on {channel.name}.
              </h2>
              <p
                className="max-w-[52ch] text-pretty"
                style={{
                  color: "var(--fg-muted)",
                  fontSize: "clamp(0.98rem, 0.92rem + 0.2vw, 1.06rem)",
                  lineHeight: 1.55,
                }}
              >
                {channel.tagline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ChannelPill channel={channel} />
            <span
              className="font-mono text-[0.72rem] tabular-nums tracking-[0.16em]"
              style={{ color: "var(--fg-faint)" }}
            >
              v0.1 · auto-updates
            </span>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            {channel.variants.map((variant, idx) => (
              <div key={variant.cta} className="flex flex-col gap-1.5">
                <VariantButton
                  variant={variant}
                  emphasis={idx === 0 ? "primary" : "ghost"}
                />
                {variant.pendingNote ? (
                  <p
                    className="pl-1 text-[0.82rem]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {variant.pendingNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Right: requirements, "what you get" */}
        <div
          className="relative flex flex-col gap-6 rounded-[20px] p-6 sm:p-7"
          style={{
            backgroundColor: "var(--bg-page)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <NumberedLabel index="02" label="What you get" />
          <p
            className="text-pretty"
            style={{
              color: "var(--fg-default)",
              fontSize: "1.02rem",
              lineHeight: 1.55,
            }}
          >
            {channel.whatYouGet}
          </p>

          <div
            aria-hidden="true"
            className="h-px w-12"
            style={{ backgroundColor: "var(--layers-mint)" }}
          />

          <NumberedLabel index="03" label="Before you install" />
          <ul className="flex flex-col gap-3.5">
            {channel.requirements.map((req) => (
              <li key={req.label} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--layers-mint)" }}
                />
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-[0.92rem] font-medium"
                    style={{ color: "var(--fg-default)" }}
                  >
                    {req.label}
                  </span>
                  <span
                    className="text-[0.84rem]"
                    style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}
                  >
                    {req.hint}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── SecondaryRow: the calmer treatment for non-detected platforms ─────────

function SecondaryRow({
  channel,
  index,
}: {
  channel: DownloadChannel;
  index: string;
}) {
  const Icon = channel.icon;
  const primary = channel.variants[0];
  const extras = channel.variants.slice(1);

  return (
    <article
      id={channel.key}
      className="grid items-start gap-6 py-7 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,260px)] sm:gap-8"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-5">
        <span
          className="font-mono text-[0.72rem] tabular-nums tracking-[0.18em]"
          style={{ color: "var(--fg-faint)" }}
        >
          {index}
        </span>
        <span
          className="grid h-10 w-10 place-items-center rounded-xl"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            color: "var(--fg-default)",
          }}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h3
            className="text-[1.18rem] font-semibold tracking-[-0.01em]"
            style={{ color: "var(--fg-default)" }}
          >
            {channel.name}
          </h3>
          <ChannelPill channel={channel} />
        </div>
        <p
          className="max-w-[58ch] text-pretty"
          style={{
            color: "var(--fg-muted)",
            fontSize: "0.98rem",
            lineHeight: 1.55,
          }}
        >
          {channel.tagline}
        </p>
        <ul
          className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1"
          style={{ color: "var(--fg-subtle)" }}
        >
          {channel.requirements.map((req) => (
            <li
              key={req.label}
              className="text-[0.82rem]"
              style={{ lineHeight: 1.4 }}
            >
              {req.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <VariantButton variant={primary} emphasis="ghost" />
        {extras.map((extra) => (
          <VariantButton
            key={extra.cta}
            variant={extra}
            emphasis="ghost"
          />
        ))}
        {primary.pendingNote ? (
          <p
            className="pl-1 pt-1 text-[0.82rem]"
            style={{ color: "var(--fg-muted)" }}
          >
            {primary.pendingNote}
          </p>
        ) : null}
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function DownloadPage() {
  return (
    <div
      className="min-h-screen-safe"
      style={{
        backgroundColor: "var(--bg-page)",
        color: "var(--fg-default)",
      }}
    >
      <div
        className="mx-auto w-full max-w-[1180px] px-5 sm:px-8"
        style={{ paddingTop: "clamp(48px, 7vw, 96px)" }}
      >
        {/* Quiet hero — left-aligned, no metric block, no centered hero shouting */}
        <header
          className="grid gap-10 pb-[clamp(48px,7vw,96px)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-end lg:gap-14"
        >
          <div className="flex flex-col gap-6">
            <NumberedLabel index="00" label="Download Layers" />
            <h1
              className="text-balance font-semibold leading-[1.02] tracking-[-0.025em]"
              style={{
                color: "var(--fg-default)",
                fontSize: "clamp(2.4rem, 1.4rem + 3.6vw, 4.4rem)",
              }}
            >
              Wherever your meetings happen,
              <br className="hidden sm:block" /> Layers is{" "}
              <span style={{ color: "var(--layers-mint)" }}>quietly</span>{" "}
              listening.
            </h1>
            <p
              className="max-w-[52ch] text-pretty font-medium"
              style={{
                color: "var(--fg-default)",
                fontSize: "clamp(1.08rem, 1rem + 0.4vw, 1.28rem)",
                lineHeight: 1.45,
              }}
            >
              AI memory for your meetings &mdash; decisions and action items
              captured automatically, so your team can ship faster.
            </p>
            <p
              className="max-w-[58ch] text-pretty"
              style={{
                color: "var(--fg-muted)",
                fontSize: "clamp(1.02rem, 0.96rem + 0.3vw, 1.18rem)",
                lineHeight: 1.55,
              }}
            >
              Install Layers wherever you spend the day. We&rsquo;ll spotlight
              the right build for the device you&rsquo;re on and keep every
              other path within reach.
            </p>
          </div>

          <aside
            className="flex flex-col gap-3 rounded-2xl p-5 sm:p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
            aria-label="Release channel summary"
          >
            <div className="flex items-center gap-2">
              <Cpu
                size={15}
                aria-hidden="true"
                style={{ color: "var(--layers-mint)" }}
              />
              <span
                className="text-[0.72rem] uppercase tracking-[0.18em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Release line
              </span>
            </div>
            <p
              className="text-[0.92rem]"
              style={{ color: "var(--fg-default)", lineHeight: 1.5 }}
            >
              Web, Mac, Windows, iPhone, iPad, and Android are all in stable
              alpha. We&rsquo;re shipping fixes daily — see what changed.
            </p>
            <Link
              href="/changelog"
              className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--layers-blue)" }}
            >
              See what&rsquo;s new
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </aside>
        </header>

        {/* Primary install — detected platform anchor */}
        <PrimaryInstall />

        {/* Section heading for "Other devices" */}
        <section className="pt-[clamp(56px,7vw,104px)]">
          <div className="flex flex-col gap-2 pb-7">
            <NumberedLabel index="04" label="Other devices" />
            <h2
              className="max-w-[28ch] text-balance font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{
                color: "var(--fg-default)",
                fontSize: "clamp(1.7rem, 1.1rem + 1.8vw, 2.5rem)",
              }}
            >
              Already covered. Pick another path whenever you need it.
            </h2>
          </div>

          <div role="list" aria-label="All download channels">
            {PLATFORM_ORDER.map((key, i) => (
              <SecondaryRow
                key={key}
                channel={DOWNLOAD_CHANNELS[key]}
                index={String(i + 1).padStart(2, "0")}
              />
            ))}
          </div>
        </section>

        {/* Trouble installing — small, calm, on the side */}
        <section
          className="mt-[clamp(56px,7vw,104px)] grid gap-6 rounded-3xl p-7 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:p-9"
          style={{
            backgroundColor: "var(--bg-page-tint-2)",
            border: "1px solid var(--border-subtle)",
          }}
          aria-labelledby="support-heading"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <LifeBuoy
                size={15}
                aria-hidden="true"
                style={{ color: "var(--layers-violet)" }}
              />
              <span
                className="text-[0.72rem] uppercase tracking-[0.18em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Trouble installing?
              </span>
            </div>
            <h2
              id="support-heading"
              className="text-balance font-semibold leading-[1.15] tracking-[-0.015em]"
              style={{
                color: "var(--fg-default)",
                fontSize: "clamp(1.3rem, 1rem + 0.9vw, 1.7rem)",
              }}
            >
              We answer install email faster than support tickets.
            </h2>
            <p
              className="max-w-[52ch] text-pretty"
              style={{
                color: "var(--fg-muted)",
                fontSize: "1rem",
                lineHeight: 1.55,
              }}
            >
              Stuck on a Gatekeeper warning, a SmartScreen prompt, or a missing
              microphone permission? Send a screenshot — we usually reply the
              same day.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end sm:justify-center">
            <a
              href="mailto:support@mirrorfactory.ai?subject=Layers%20install%20help"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[0.92rem] font-medium tracking-tight transition-colors duration-150"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--fg-default)",
                border: "1px solid var(--border-default)",
              }}
            >
              support@mirrorfactory.ai
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <Link
              href="/sign-up"
              className="text-[0.85rem] font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--fg-muted)" }}
            >
              No account yet? Create one →
            </Link>
          </div>
        </section>

        {/* Final CTA — quiet sign-off, asymmetric */}
        <section
          className="mt-[clamp(48px,6vw,88px)] pb-[clamp(64px,8vw,120px)]"
          aria-labelledby="final-cta-heading"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <h2
              id="final-cta-heading"
              className="max-w-[26ch] text-balance font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{
                color: "var(--fg-default)",
                fontSize: "clamp(1.7rem, 1.1rem + 2vw, 2.6rem)",
              }}
            >
              When you&rsquo;re ready, your meeting memory is one install away.
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Public sign-ups coming soon — invite-only alpha"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl px-5 py-3 text-[0.95rem] font-medium tracking-tight"
                style={{
                  backgroundColor: "var(--layers-mint-soft)",
                  color: "var(--layers-ink)",
                  border:
                    "1px solid color-mix(in oklch, var(--layers-mint) 50%, var(--layers-ink) 14%)",
                  opacity: 0.78,
                }}
              >
                Coming soon
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[0.95rem] font-medium tracking-tight transition-colors duration-150"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--fg-default)",
                  border: "1px solid var(--border-default)",
                }}
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
