"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  MonitorDown,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";

type DownloadPlatformKey = "macos" | "windows" | "ios" | "android" | "web";

type DownloadChannel = {
  key: DownloadPlatformKey;
  name: string;
  channel: "Website live" | "TestFlight" | "Play internal testing" | "Desktop beta";
  platform: string;
  description: string;
  recommendation: string;
  href?: string;
  cta: string;
  unavailableCta: string;
  unavailableInstructions: string;
  icon: LucideIcon;
  status: string;
  anchorId: string;
  details: string[];
  requirements?: string[];
};

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

const PUBLIC_DOWNLOAD_URLS = {
  testFlight: cleanUrl(
    process.env.NEXT_PUBLIC_TESTFLIGHT_URL ??
      process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL,
  ),
  playInternalTesting: cleanUrl(
    process.env.NEXT_PUBLIC_PLAY_INTERNAL_TESTING_URL ??
      process.env.NEXT_PUBLIC_ANDROID_INTERNAL_TESTING_URL,
  ),
  macArtifact: cleanUrl(
    process.env.NEXT_PUBLIC_MAC_ARTIFACT_URL ??
      process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL,
  ),
  windowsArtifact: cleanUrl(
    process.env.NEXT_PUBLIC_WINDOWS_ARTIFACT_URL ??
      process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL,
  ),
  webApp: cleanUrl(process.env.NEXT_PUBLIC_WEB_APP_URL) ?? "/sign-in",
} as const;

const PLATFORM_ORDER: DownloadPlatformKey[] = [
  "web",
  "macos",
  "windows",
  "ios",
  "android",
];

const DOWNLOAD_CHANNELS: Record<DownloadPlatformKey, DownloadChannel> = {
  web: {
    key: "web",
    name: "Web app",
    channel: "Website live",
    platform: "Browser",
    description:
      "Open Layers from the website for the launch path that is available now, with no install required.",
    recommendation:
      "Use Website live when you need the fastest path into transcripts, summaries, action items, and searchable meeting memory.",
    href: PUBLIC_DOWNLOAD_URLS.webApp,
    cta: "Open Website live",
    unavailableCta: "Website unavailable",
    unavailableInstructions:
      "The website launch URL is not configured. Set NEXT_PUBLIC_WEB_APP_URL or use the built-in sign-in route before launch.",
    icon: Globe,
    status: "Live now",
    anchorId: "web",
    details: [
      "No installer required",
      "Works on current Chrome, Safari, Edge, and Firefox",
      "Best first step while desktop and mobile beta links are finalized",
    ],
  },
  macos: {
    key: "macos",
    name: "macOS",
    channel: "Desktop beta",
    platform: "Mac artifact",
    description:
      "Use the Mac desktop beta for local capture permissions and a native meeting workflow once the launch artifact is published.",
    recommendation:
      "This device looks like a Mac. Use Website live today; download the signed Mac beta as soon as the artifact URL is ready.",
    href: PUBLIC_DOWNLOAD_URLS.macArtifact,
    cta: "Download Mac beta",
    unavailableCta: "Mac beta in prep",
    unavailableInstructions:
      "The Mac artifact is being packaged. Use Website live now, then publish the signed Mac artifact URL before enabling this CTA.",
    icon: Apple,
    status: PUBLIC_DOWNLOAD_URLS.macArtifact
      ? "Artifact ready"
      : "Beta artifact prep",
    anchorId: "macos",
    details: [
      "Designed for meeting capture from your Mac",
      "Uses the same Layers account and meeting library",
      "Desktop beta channel for launch cohorts",
    ],
    requirements: [
      "macOS 13 Ventura or later",
      "Apple Silicon or Intel Mac",
      "Allow microphone and screen or system-audio permissions when prompted",
    ],
  },
  windows: {
    key: "windows",
    name: "Windows",
    channel: "Desktop beta",
    platform: "Windows artifact",
    description:
      "Install the Windows desktop beta when the packaged artifact is published for launch testing.",
    recommendation:
      "This device looks like Windows. Use Website live today; download the Windows beta after the signed artifact is published.",
    href: PUBLIC_DOWNLOAD_URLS.windowsArtifact,
    cta: "Download Windows beta",
    unavailableCta: "Windows beta in prep",
    unavailableInstructions:
      "The Windows artifact is being packaged. Use Website live now, then publish the Windows artifact URL before enabling this CTA.",
    icon: MonitorDown,
    status: PUBLIC_DOWNLOAD_URLS.windowsArtifact
      ? "Artifact ready"
      : "Beta artifact prep",
    anchorId: "windows",
    details: [
      "Desktop capture workflow for Windows users",
      "Same account, workspace, and meeting memory",
      "Desktop beta channel for launch cohorts",
    ],
    requirements: [
      "64-bit Windows 10 or Windows 11",
      "Local microphone permission",
      "Beta installs may show SmartScreen until signing reputation is established",
    ],
  },
  ios: {
    key: "ios",
    name: "iPhone and iPad",
    channel: "TestFlight",
    platform: "iOS beta",
    description:
      "Join the iOS TestFlight when the invite link is ready for mobile reminders, review, and capture testing.",
    recommendation:
      "This device looks like iPhone or iPad. Use Website live today; open TestFlight once the invite is available.",
    href: PUBLIC_DOWNLOAD_URLS.testFlight,
    cta: "Open TestFlight",
    unavailableCta: "TestFlight in prep",
    unavailableInstructions:
      "The TestFlight invite is not live yet. Install Apple's TestFlight app and use Website live until the beta invite URL is ready.",
    icon: Smartphone,
    status: PUBLIC_DOWNLOAD_URLS.testFlight ? "Invite ready" : "Invite prep",
    anchorId: "iphone-and-ipad",
    details: [
      "Requires Apple's TestFlight app",
      "Uses the same Layers account",
      "Best for mobile review and follow-through testing",
    ],
  },
  android: {
    key: "android",
    name: "Android",
    channel: "Play internal testing",
    platform: "Android beta",
    description:
      "Join the Google Play internal testing track when the opt-in link and tester list are ready.",
    recommendation:
      "This device looks like Android. Use Website live today; open the Play internal testing link once it is ready.",
    href: PUBLIC_DOWNLOAD_URLS.playInternalTesting,
    cta: "Open Play internal testing",
    unavailableCta: "Play testing in prep",
    unavailableInstructions:
      "The Play internal testing link is not live yet. Make sure your Google account is on the tester list and use Website live meanwhile.",
    icon: Store,
    status: PUBLIC_DOWNLOAD_URLS.playInternalTesting
      ? "Testing link ready"
      : "Track prep",
    anchorId: "android",
    details: [
      "Requires a Google account on the internal testing list",
      "Open the opt-in link on the target device",
      "Best for Android capture and action-review testing",
    ],
  },
};

const DOWNLOAD_GROUPS: Array<{
  title: "Website live" | "Desktop beta" | "Mobile testing";
  description: string;
  itemKeys: DownloadPlatformKey[];
}> = [
  {
    title: "Website live",
    description:
      "Start with the website-first launch path. It is the stable route while native release links are finalized.",
    itemKeys: ["web"],
  },
  {
    title: "Desktop beta",
    description:
      "Publish platform-specific artifacts before turning on download CTAs for local capture workflows.",
    itemKeys: ["macos", "windows"],
  },
  {
    title: "Mobile testing",
    description:
      "Use TestFlight and Play internal testing for invite-only mobile launch cohorts.",
    itemKeys: ["ios", "android"],
  },
];

const USE_CASES = [
  {
    title: "Start in the browser",
    description:
      "Website live is the launch-ready path for signing in, reviewing notes, and searching meeting memory.",
    icon: Globe,
  },
  {
    title: "Add desktop for capture",
    description:
      "Mac and Windows stay in Desktop beta until signed artifacts are available for each platform.",
    icon: Laptop,
  },
  {
    title: "Invite mobile testers",
    description:
      "TestFlight and Play internal testing stay honest until the invite URLs and tester lists are ready.",
    icon: ShieldCheck,
  },
];

function cleanUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isChannelAvailable(channel: DownloadChannel): channel is DownloadChannel & {
  href: string;
} {
  return Boolean(channel.href);
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
  return "web";
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

function DownloadBrandMark() {
  return (
    <span className="download-brand-mark" aria-hidden="true">
      <span />
    </span>
  );
}

function AvailableAction({
  channel,
  className,
}: {
  channel: DownloadChannel & { href: string };
  className?: string;
}) {
  const content = (
    <>
      {channel.cta}
      {isExternalHref(channel.href) ? (
        <ExternalLink size={15} aria-hidden="true" />
      ) : (
        <ArrowRight size={15} aria-hidden="true" />
      )}
    </>
  );

  if (isExternalHref(channel.href)) {
    return (
      <a
        className={className}
        href={channel.href}
        target="_blank"
        rel="noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={channel.href}>
      {content}
    </Link>
  );
}

function UnavailableAction({ channel }: { channel: DownloadChannel }) {
  return (
    <span
      aria-disabled="true"
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-4 text-center text-sm font-extrabold text-slate-600"
    >
      <CircleDashed size={15} aria-hidden="true" />
      {channel.unavailableCta}
    </span>
  );
}

function DownloadAction({ channel }: { channel: DownloadChannel }) {
  if (isChannelAvailable(channel)) {
    return <AvailableAction channel={channel} />;
  }

  return <UnavailableAction channel={channel} />;
}

function PlatformRecommendation() {
  const detectedPlatform = useSyncExternalStore(
    subscribeToPlatformChanges,
    getPlatformSnapshot,
    getServerPlatformSnapshot,
  );
  const channel = DOWNLOAD_CHANNELS[detectedPlatform];
  const website = DOWNLOAD_CHANNELS.web;
  const Icon = channel.icon;

  return (
    <section className="download-recommendation" aria-live="polite">
      <div className="download-recommendation-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="download-recommendation-copy">
        <span>
          {isChannelAvailable(channel)
            ? `Recommended: ${channel.channel}`
            : `${channel.channel} status`}
        </span>
        <h2>{channel.name}</h2>
        <p>{channel.recommendation}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {isChannelAvailable(channel) ? (
          <AvailableAction
            channel={channel}
            className="download-recommendation-action"
          />
        ) : (
          <>
            <UnavailableAction channel={channel} />
            {isChannelAvailable(website) ? (
              <AvailableAction
                channel={website}
                className="download-recommendation-action"
              />
            ) : null}
          </>
        )}
      </div>
      <div className="download-recommendation-options" aria-label="All download options">
        {PLATFORM_ORDER.map((platformKey) => {
          const platformOption = DOWNLOAD_CHANNELS[platformKey];

          return (
            <a href={`#${platformOption.anchorId}`} key={platformOption.key}>
              {platformOption.name}
            </a>
          );
        })}
      </div>
    </section>
  );
}

export default function DownloadPage() {
  const website = DOWNLOAD_CHANNELS.web;

  return (
    <main className="download-page min-h-screen-safe">
      <nav className="download-nav" aria-label="Download navigation">
        <Link href="/" className="download-brand" aria-label="Layers home">
          <DownloadBrandMark />
          <span>Layers</span>
        </Link>
        <div>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up" className="download-nav-cta">
            Start free
          </Link>
        </div>
      </nav>

      <section className="download-hero">
        <div>
          <span className="download-kicker">
            <Download size={15} aria-hidden="true" />
            Download Layers
          </span>
          <h1>Start with the website. Add native beta builds as they go live.</h1>
          <p>
            Website live is ready for launch. Desktop beta, TestFlight, and Play
            internal testing are wired for final URLs without exposing broken
            download buttons while artifacts are still being prepared.
          </p>
          <div className="download-hero-actions">
            {isChannelAvailable(website) ? (
              <AvailableAction channel={website} className="download-primary" />
            ) : (
              <UnavailableAction channel={website} />
            )}
            <a href="#desktop-beta" className="download-secondary">
              Desktop beta status
            </a>
          </div>
        </div>

        <aside className="download-device-stack" aria-label="Available platforms">
          <span>
            <Globe size={18} aria-hidden="true" />
            Website live
          </span>
          <span>
            <MonitorDown size={18} aria-hidden="true" />
            Desktop beta
          </span>
          <span>
            <Smartphone size={18} aria-hidden="true" />
            TestFlight
          </span>
          <span>
            <Store size={18} aria-hidden="true" />
            Play internal testing
          </span>
        </aside>
      </section>

      <PlatformRecommendation />

      <section className="download-guidance" aria-label="Platform guidance">
        {USE_CASES.map((useCase) => {
          const Icon = useCase.icon;

          return (
            <article key={useCase.title}>
              <Icon size={18} aria-hidden="true" />
              <h2>{useCase.title}</h2>
              <p>{useCase.description}</p>
            </article>
          );
        })}
      </section>

      {DOWNLOAD_GROUPS.map((group) => (
        <section
          className="download-group"
          id={group.title.toLowerCase().replaceAll(" ", "-")}
          key={group.title}
        >
          <div className="download-group-copy">
            <h2>{group.title}</h2>
            <p>{group.description}</p>
          </div>
          <div className="download-grid">
            {group.itemKeys.map((itemKey) => {
              const channel = DOWNLOAD_CHANNELS[itemKey];
              const Icon = channel.icon;

              return (
                <article
                  className="download-card"
                  id={channel.anchorId}
                  key={channel.key}
                >
                  <div className="download-card-head">
                    <span>
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <small>{channel.channel}</small>
                  </div>
                  <p className="download-platform">{channel.status}</p>
                  <h3>{channel.name}</h3>
                  <p>{channel.description}</p>
                  <ul>
                    {channel.details.map((detail) => (
                      <li key={detail}>
                        <CheckCircle2 size={14} aria-hidden="true" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  {channel.requirements ? (
                    <div className="grid gap-2">
                      <p className="download-platform">Install requirements</p>
                      <ul>
                        {channel.requirements.map((requirement) => (
                          <li key={requirement}>
                            <CheckCircle2 size={14} aria-hidden="true" />
                            {requirement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!isChannelAvailable(channel) ? (
                    <p className="text-sm leading-6 text-slate-600">
                      {channel.unavailableInstructions}
                    </p>
                  ) : null}
                  <DownloadAction channel={channel} />
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
