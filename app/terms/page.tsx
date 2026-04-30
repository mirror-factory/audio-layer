import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CreditCard,
  FileText,
  Mail,
  Mic,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Layers",
  description:
    "Launch draft terms of service for Layers, the meeting memory app by Mirror Factory.",
};

const SUPPORT_EMAIL = "support@mirrorfactory.ai";
const LAST_UPDATED = "April 30, 2026";

const TERMS = [
  {
    title: "Use of Layers",
    icon: FileText,
    body: [
      "Layers provides meeting recording, transcription, summaries, action extraction, search, and connected AI-tool context.",
      "You must use Layers only where you have the right to record, process, store, and share the relevant conversation content.",
      "You are responsible for your account credentials, connected integrations, API keys, and all activity under your account.",
    ],
  },
  {
    title: "Recording and consent",
    icon: Mic,
    body: [
      "Layers is a bot-free recorder. You remain responsible for notifying participants and getting consent where required.",
      "Do not record confidential, regulated, or third-party content unless you have the authority and controls needed to do so.",
      "Do not use Layers to violate privacy, wiretap, employment, confidentiality, intellectual property, or platform rules.",
    ],
  },
  {
    title: "AI outputs",
    icon: Sparkles,
    body: [
      "AI-generated transcripts, summaries, decisions, and action items can be incomplete or wrong.",
      "You should review outputs before relying on them for legal, financial, employment, medical, security, or other high-impact decisions.",
      "Layers may use model and transcription providers to process your content for the features you request.",
    ],
  },
  {
    title: "Billing",
    icon: CreditCard,
    body: [
      "Paid plans, trials, invoices, taxes, payment processing, renewals, cancellations, and refunds are handled through Stripe or the relevant app-store platform where applicable.",
      "Pricing and plan limits may change before launch. Any production change should be communicated through the product or billing surface.",
      "You are responsible for canceling paid access before renewal if you do not want continued service.",
    ],
  },
  {
    title: "Acceptable use",
    icon: ShieldCheck,
    body: [
      "Do not reverse engineer, overload, scrape, abuse, resell, or interfere with Layers or its providers.",
      "Do not upload malware, unlawful content, deceptive content, or content that infringes another person's rights.",
      "Do not use Layers to build or enrich surveillance, biometric identification, harassment, spam, or unlawful profiling systems.",
    ],
  },
  {
    title: "Beta and availability",
    icon: AlertTriangle,
    body: [
      "Launch, TestFlight, Play internal testing, desktop beta, and early-access builds may be incomplete and may change quickly.",
      "The service may be interrupted, delayed, lose data, or produce degraded results while infrastructure and providers are being hardened.",
      "Back up important exports and do not treat Layers as your only system of record during the beta period.",
    ],
  },
];

function LegalNav() {
  return (
    <nav
      className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8"
      aria-label="Legal navigation"
    >
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight text-[var(--text-primary)]"
      >
        Layers
      </Link>
      <div className="flex flex-wrap justify-end gap-3 text-xs font-medium text-[var(--text-muted)]">
        <Link href="/privacy" className="hover:text-[var(--text-primary)]">
          Privacy
        </Link>
        <Link
          href="/account-deletion"
          className="hover:text-[var(--text-primary)]"
        >
          Delete account
        </Link>
        <Link href="/sign-in" className="hover:text-[var(--text-primary)]">
          Sign in
        </Link>
      </div>
    </nav>
  );
}

function TermCard({ term }: { term: (typeof TERMS)[number] }) {
  const Icon = term.icon;

  return (
    <article className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-[#14b8a6]/10 text-[#0f766e]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {term.title}
        </h2>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
        {term.body.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#14b8a6]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="paper-calm-page min-h-screen-safe">
      <LegalNav />

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="space-y-8">
          <header className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Layers by Mirror Factory
            </p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                Terms of Service
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                These terms are the working rules for using Layers during
                launch, TestFlight, Play internal testing, and early public
                website access.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Scale size={16} aria-hidden="true" />
                Launch draft - legal review pending
              </div>
              <p className="mt-2">
                This is practical launch copy, not final legal advice. Counsel
                should review liability, governing law, warranty, arbitration,
                app-store, and business-entity language before production
                launch.
              </p>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            {TERMS.map((term) => (
              <TermCard term={term} key={term.title} />
            ))}
          </section>

          <Section title="Your content">
            <p>
              You keep the rights you already have in your meeting audio,
              transcripts, notes, summaries, uploads, and exports. You grant
              Layers the permission needed to host, process, transform, display,
              search, export, and transmit that content to provide the service.
            </p>
            <p>
              You represent that you have the rights, notices, consents, and
              authorizations needed for any content you add to Layers.
            </p>
          </Section>

          <Section title="Third-party services and integrations">
            <p>
              Layers depends on infrastructure, authentication, calendar,
              transcription, model, email, payment, app-store, and integration
              providers. Their terms and privacy practices may apply when you
              connect or use those services.
            </p>
          </Section>

          <Section title="Privacy and deletion">
            <p>
              The{" "}
              <Link
                href="/privacy"
                className="font-medium text-[#0f766e] underline underline-offset-4"
              >
                Privacy Policy
              </Link>{" "}
              explains what Layers collects and how it is used. Account deletion
              requests are handled through the{" "}
              <Link
                href="/account-deletion"
                className="font-medium text-[#0f766e] underline underline-offset-4"
              >
                account deletion page
              </Link>
              .
            </p>
          </Section>

          <Section title="Suspension and termination">
            <p>
              We may suspend or terminate access if an account creates security
              risk, violates these terms, creates payment risk, infringes rights,
              or could expose Layers, Mirror Factory, users, or providers to
              legal or operational harm.
            </p>
          </Section>

          <Section title="Disclaimers and liability">
            <p>
              Layers is provided as-is during launch and early testing. To the
              maximum extent permitted by law, Mirror Factory disclaims implied
              warranties and is not responsible for indirect, incidental,
              special, consequential, exemplary, or punitive damages.
            </p>
            <p>
              Final warranty, liability cap, jurisdiction, dispute resolution,
              and consumer-law language needs counsel review before production
              release.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update these terms as Layers, platform requirements, and
              launch operations change. We will update the date above and, when
              appropriate, provide additional notice.
            </p>
          </Section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Status
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Last updated</dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  {LAST_UPDATED}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Owner</dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  Mirror Factory
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Review</dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  Draft, counsel pending
                </dd>
              </div>
            </dl>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Mail size={16} aria-hidden="true" />
              Questions
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Contact support for account, billing, deletion, or platform review
              questions.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#14b8a6] px-4 text-sm font-semibold text-white hover:bg-[#0d9488]"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
