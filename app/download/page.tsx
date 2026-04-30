import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  MonitorDown,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import {
  DownloadPlatformRecommendation,
  type DownloadPlatformLinks,
} from "@/app/download/platform-recommendation";

const DESKTOP_RELEASE_URL =
  process.env.NEXT_PUBLIC_DESKTOP_RELEASE_URL ??
  "https://github.com/mirror-factory/audio-layer/releases/latest";

const DOWNLOAD_LINKS: DownloadPlatformLinks = {
  macos: process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL ?? DESKTOP_RELEASE_URL,
  windows: process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL ?? DESKTOP_RELEASE_URL,
  ios:
    process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ??
    "https://apps.apple.com/us/search?term=Layers",
  android:
    process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL ??
    "https://play.google.com/store/search?q=Layers&c=apps",
  web: "/sign-in",
};

type DownloadOption = {
  name: string;
  platform: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  status: string;
  external?: boolean;
  details: string[];
};

const DOWNLOAD_GROUPS: Array<{
  title: string;
  description: string;
  items: DownloadOption[];
}> = [
  {
    title: "Desktop",
    description:
      "Use the desktop app when you want fast capture, local device permissions, and the most native meeting workflow.",
    items: [
      {
        name: "macOS",
        platform: "Mac app",
        description:
          "Best for recording meetings from your Mac with local audio permissions and the full Layers workspace.",
        href: DOWNLOAD_LINKS.macos,
        cta: "Download for Mac",
        icon: Apple,
        status: "Current release",
        external: true,
        details: [
          "Apple Silicon + Intel release channel",
          "DMG installer",
          "Local capture ready",
        ],
      },
      {
        name: "Windows",
        platform: "Windows app",
        description:
          "Use the Windows release channel for the desktop installer as soon as the packaged build is published.",
        href: DOWNLOAD_LINKS.windows,
        cta: "Download for Windows",
        icon: MonitorDown,
        status: "Release channel",
        external: true,
        details: [
          "Installer release channel",
          "Same account and meeting library",
          "Built for desktop capture",
        ],
      },
      {
        name: "Web",
        platform: "Browser",
        description:
          "Open Layers in the browser for quick access from any computer without installing the desktop app.",
        href: DOWNLOAD_LINKS.web,
        cta: "Open web app",
        icon: Globe,
        status: "No install",
        details: [
          "Works on Chrome, Safari, and Edge",
          "Shared meeting memory",
          "Fast login",
        ],
      },
    ],
  },
  {
    title: "Phones and tablets",
    description:
      "Use the mobile app for reminders, mobile capture, and reviewing meeting memory when you are away from your desk.",
    items: [
      {
        name: "iPhone and iPad",
        platform: "App Store",
        description:
          "Find the iOS app from the App Store surface and sign in with the same Layers account.",
        href: DOWNLOAD_LINKS.ios,
        cta: "Open App Store",
        icon: Smartphone,
        status: "iOS / iPadOS",
        external: true,
        details: [
          "Mobile recording reminders",
          "Review summaries anywhere",
          "Same workspace",
        ],
      },
      {
        name: "Android",
        platform: "Google Play",
        description:
          "Find the Android app from Google Play and keep the same meeting memory connected across devices.",
        href: DOWNLOAD_LINKS.android,
        cta: "Open Google Play",
        icon: Store,
        status: "Android",
        external: true,
        details: [
          "Mobile capture",
          "Action review",
          "Connected to your team memory",
        ],
      },
    ],
  },
];

const USE_CASES = [
  {
    title: "Install desktop first",
    description:
      "Pick Mac or Windows if Layers is part of your daily meeting workflow.",
    icon: Laptop,
  },
  {
    title: "Use web for quick access",
    description:
      "The browser app is the fastest way to sign in, search prior meetings, and review notes.",
    icon: Globe,
  },
  {
    title: "Add mobile for follow-through",
    description:
      "Phones are best for reminders, action checks, and reading summaries between meetings.",
    icon: ShieldCheck,
  },
];

function DownloadAction({ item }: { item: DownloadOption }) {
  const content = (
    <>
      {item.cta}
      {item.external ? (
        <ExternalLink size={15} aria-hidden="true" />
      ) : (
        <ArrowRight size={15} aria-hidden="true" />
      )}
    </>
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={item.href}>{content}</Link>;
}

function DownloadBrandMark() {
  return (
    <span className="download-brand-mark" aria-hidden="true">
      <span />
    </span>
  );
}

export default function DownloadPage() {
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
          <h1>Install meeting memory everywhere you work.</h1>
          <p>
            Use Layers on desktop for capture, in the browser for quick
            access, and on phones for reminders and follow-through.
          </p>
          <div className="download-hero-actions">
            <a
              href={DOWNLOAD_LINKS.macos}
              target="_blank"
              rel="noreferrer"
              className="download-primary"
            >
              Download for Mac
              <ExternalLink size={16} aria-hidden="true" />
            </a>
            <Link href="/sign-in" className="download-secondary">
              Open web app
            </Link>
          </div>
        </div>

        <aside className="download-device-stack" aria-label="Available platforms">
          <span>
            <Apple size={18} aria-hidden="true" />
            macOS
          </span>
          <span>
            <MonitorDown size={18} aria-hidden="true" />
            Windows
          </span>
          <span>
            <Smartphone size={18} aria-hidden="true" />
            iOS
          </span>
          <span>
            <Store size={18} aria-hidden="true" />
            Android
          </span>
          <span>
            <Globe size={18} aria-hidden="true" />
            Web
          </span>
        </aside>
      </section>

      <DownloadPlatformRecommendation links={DOWNLOAD_LINKS} />

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
        <section className="download-group" key={group.title}>
          <div className="download-group-copy">
            <h2>{group.title}</h2>
            <p>{group.description}</p>
          </div>
          <div className="download-grid">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  className="download-card"
                  id={item.name.toLowerCase().replaceAll(" ", "-")}
                  key={item.name}
                >
                  <div className="download-card-head">
                    <span>
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <small>{item.status}</small>
                  </div>
                  <p className="download-platform">{item.platform}</p>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <ul>
                    {item.details.map((detail) => (
                      <li key={detail}>
                        <CheckCircle2 size={14} aria-hidden="true" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <DownloadAction item={item} />
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
