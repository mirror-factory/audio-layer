"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowRight,
  ExternalLink,
  Globe,
  MonitorDown,
  Smartphone,
  Store,
} from "lucide-react";

export type DownloadPlatformKey = "macos" | "windows" | "ios" | "android" | "web";

export type DownloadPlatformLinks = Record<DownloadPlatformKey, string>;

type PlatformOption = {
  key: DownloadPlatformKey;
  label: string;
  eyebrow: string;
  cta: string;
  description: string;
  icon: LucideIcon;
  external: boolean;
  anchorId: string;
};

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

const PLATFORM_ORDER: DownloadPlatformKey[] = ["macos", "windows", "ios", "android", "web"];

const PLATFORM_OPTIONS: Record<DownloadPlatformKey, PlatformOption> = {
  macos: {
    key: "macos",
    label: "macOS",
    eyebrow: "Recommended for this Mac",
    cta: "Download for Mac",
    description:
      "Use the desktop app for meeting capture, local permissions, and the fastest recording path.",
    icon: Apple,
    external: true,
    anchorId: "macos",
  },
  windows: {
    key: "windows",
    label: "Windows",
    eyebrow: "Recommended for this PC",
    cta: "Download for Windows",
    description:
      "Install the Windows desktop release for the same meeting memory and capture workflow.",
    icon: MonitorDown,
    external: true,
    anchorId: "windows",
  },
  ios: {
    key: "ios",
    label: "iPhone and iPad",
    eyebrow: "Recommended for this device",
    cta: "Open App Store",
    description:
      "Use the iOS app for mobile capture, reminders, and reviewing summaries away from your desk.",
    icon: Smartphone,
    external: true,
    anchorId: "iphone-and-ipad",
  },
  android: {
    key: "android",
    label: "Android",
    eyebrow: "Recommended for this device",
    cta: "Open Google Play",
    description:
      "Use the Android app for mobile capture, action review, and connected meeting memory.",
    icon: Store,
    external: true,
    anchorId: "android",
  },
  web: {
    key: "web",
    label: "Web app",
    eyebrow: "Works on this device",
    cta: "Open web app",
    description:
      "Open Layers in the browser when you want quick access without installing anything.",
    icon: Globe,
    external: false,
    anchorId: "web",
  },
};

function detectPlatform(): DownloadPlatformKey {
  const nav = navigator as NavigatorWithUAData;
  const platform = (nav.userAgentData?.platform ?? navigator.platform ?? "").toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (/android/.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (platform.includes("mac") && navigator.maxTouchPoints > 1) return "ios";
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";

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

function PlatformAction({
  href,
  option,
}: {
  href: string;
  option: PlatformOption;
}) {
  const content = (
    <>
      {option.cta}
      {option.external ? (
        <ExternalLink size={15} aria-hidden="true" />
      ) : (
        <ArrowRight size={15} aria-hidden="true" />
      )}
    </>
  );

  if (option.external) {
    return (
      <a className="download-recommendation-action" href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link className="download-recommendation-action" href={href}>
      {content}
    </Link>
  );
}

export function DownloadPlatformRecommendation({ links }: { links: DownloadPlatformLinks }) {
  const detectedPlatform = useSyncExternalStore(
    subscribeToPlatformChanges,
    getPlatformSnapshot,
    getServerPlatformSnapshot,
  );
  const option = PLATFORM_OPTIONS[detectedPlatform];
  const Icon = option.icon;

  return (
    <section className="download-recommendation" aria-live="polite">
      <div className="download-recommendation-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="download-recommendation-copy">
        <span>{option.eyebrow}</span>
        <h2>{option.label}</h2>
        <p>{option.description}</p>
      </div>
      <PlatformAction href={links[option.key]} option={option} />
      <div className="download-recommendation-options" aria-label="All download options">
        {PLATFORM_ORDER.map((platformKey) => {
          const platformOption = PLATFORM_OPTIONS[platformKey];

          return (
            <a href={`#${platformOption.anchorId}`} key={platformOption.key}>
              {platformOption.label}
            </a>
          );
        })}
      </div>
    </section>
  );
}
