import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  Database,
  KeyRound,
  LockKeyhole,
  Mail,
  Mic,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Layers",
  description:
    "Launch draft privacy policy for Layers, the meeting memory app by Mirror Factory.",
};

const SUPPORT_EMAIL = "support@mirrorfactory.ai";
const LAST_UPDATED = "April 30, 2026";

const DATA_GROUPS = [
  {
    title: "Account and identity",
    icon: KeyRound,
    items: [
      "Email address, authentication identifiers, user ID, and sign-in provider details.",
      "API keys and OAuth tokens you create to connect Layers to MCP clients or integrations.",
      "Subscription tier, billing status, and Stripe customer identifiers. We do not store full payment card numbers.",
    ],
  },
  {
    title: "Meeting content",
    icon: Mic,
    items: [
      "Audio you record or upload, transcripts, speaker segments, summaries, decisions, action items, and intake fields.",
      "Search indexes and embeddings derived from your meeting content so you can find prior context.",
      "Local recording draft data while a capture is in progress, where supported by the app surface.",
    ],
  },
  {
    title: "Connected context",
    icon: CalendarDays,
    items: [
      "Calendar connection status, provider account email, event titles, times, and related metadata you choose to connect.",
      "Webhook destinations, integration settings, model preferences, and usage limits.",
      "Support messages and operational notes when you contact us.",
    ],
  },
  {
    title: "Usage and diagnostics",
    icon: Database,
    items: [
      "Product usage events, request logs, error traces, cost telemetry, and basic device/browser information.",
      "Cookies or local storage needed for authentication, settings, theme preference, and session continuity.",
      "Aggregate launch analytics used to understand reliability, activation, and product quality.",
    ],
  },
];

const USES = [
  "Provide transcription, summaries, action items, search, exports, and connected AI-tool context.",
  "Authenticate accounts, secure sessions, prevent abuse, and keep each user's meeting library isolated.",
  "Operate billing, usage limits, support, product reliability, and service communications.",
  "Improve product quality using aggregate diagnostics and user feedback.",
  "Comply with legal, security, tax, accounting, and platform review obligations.",
];

const SUBPROCESSORS = [
  "Supabase for authentication, database, storage-related application data, and security controls.",
  "Speech-to-text and AI model providers for transcription, summarization, and structured extraction.",
  "Vercel and related infrastructure providers for hosting, logs, and app delivery.",
  "Stripe for subscriptions, invoices, payment status, tax, and fraud prevention.",
  "Resend or email providers for transactional email and support communications.",
  "Google and Microsoft when you choose to connect calendar or sign-in services.",
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
        <Link href="/terms" className="hover:text-[var(--text-primary)]">
          Terms
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

function ReviewStatus() {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-[var(--text-secondary)]">
      <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
        <ShieldCheck size={16} aria-hidden="true" />
        Launch draft - legal review pending
      </div>
      <p className="mt-2">
        This policy is practical launch copy for website, TestFlight, and Play
        internal testing. It should be reviewed by counsel before production
        store submission or broad public launch.
      </p>
    </div>
  );
}

function DataCard({ group }: { group: (typeof DATA_GROUPS)[number] }) {
  const Icon = group.icon;

  return (
    <article className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-[#14b8a6]/10 text-[#0f766e]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {group.title}
        </h2>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
        {group.items.map((item) => (
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

export default function PrivacyPage() {
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
                Privacy Policy
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Layers records meetings without a meeting bot and turns them
                into transcripts, summaries, decisions, actions, and searchable
                memory. This policy explains what data the app handles and how
                account deletion requests work during launch.
              </p>
            </div>
            <ReviewStatus />
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            {DATA_GROUPS.map((group) => (
              <DataCard group={group} key={group.title} />
            ))}
          </section>

          <Section title="How we use information">
            <ul className="space-y-2">
              {USES.map((use) => (
                <li className="flex gap-2" key={use}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#14b8a6]" />
                  <span>{use}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="AI processing and service providers">
            <p>
              Layers uses service providers to operate the app. Meeting content
              may be sent to transcription and AI model providers only as
              needed to produce the product features you request. Provider
              settings, subprocessors, and retention commitments need final
              legal review before production launch.
            </p>
            <ul className="space-y-2">
              {SUBPROCESSORS.map((provider) => (
                <li className="flex gap-2" key={provider}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#14b8a6]" />
                  <span>{provider}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Recording consent">
            <p>
              Layers is a bot-free recorder. That does not remove consent or
              notice obligations. You are responsible for telling participants
              when a meeting is being recorded and for following recording,
              privacy, employment, and confidentiality laws that apply to your
              conversations.
            </p>
          </Section>

          <Section title="Sharing">
            <p>
              We do not sell your personal information or meeting content. We
              share information with service providers, connected integrations
              you authorize, billing and support systems, and when required for
              security, legal compliance, or protection of rights.
            </p>
          </Section>

          <Section title="Retention and deletion">
            <p>
              We keep account data, meeting content, and derived meeting memory
              while your account is active or while needed to provide Layers,
              unless you delete data or request account deletion. Some records
              may be retained when needed for security, fraud prevention,
              payment, tax, legal, backup, or dispute purposes.
            </p>
            <p>
              Account deletion requests are handled through the{" "}
              <Link
                href="/account-deletion"
                className="font-medium text-[#0f766e] underline underline-offset-4"
              >
                account deletion page
              </Link>
              . Full self-serve destructive deletion is a launch follow-up and
              should not be treated as legal-approved until reviewed.
            </p>
          </Section>

          <Section title="Security">
            <p>
              Layers uses authentication, row-level database controls, limited
              access patterns, and operational logging to protect user data.
              No online service can guarantee absolute security, so report
              suspected issues to{" "}
              <a
                className="font-medium text-[#0f766e] underline underline-offset-4"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="Children">
            <p>
              Layers is intended for work use and is not directed to children.
              Do not use Layers to collect personal information from children
              unless you have all required authority, consent, and compliance
              controls.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update this policy as Layers changes. We will update the
              date above and, where appropriate, provide additional notice.
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
              <LockKeyhole size={16} aria-hidden="true" />
              Your controls
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <Link
                href="/account-deletion"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#14b8a6] px-4 font-semibold text-white hover:bg-[#0d9488]"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete account
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] px-4 font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-control-hover)]"
              >
                <Mail size={16} aria-hidden="true" />
                Contact support
              </a>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <CreditCard size={16} aria-hidden="true" />
              Billing note
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Deleting your Layers account is separate from any Stripe-managed
              payment obligations, refunds, invoices, tax records, or chargeback
              records that must be retained.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
