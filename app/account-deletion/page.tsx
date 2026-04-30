import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Account Deletion | Layers",
  description:
    "Request deletion of your Layers account and associated meeting data.",
};

const SUPPORT_EMAIL = "support@mirrorfactory.ai";
const LAST_UPDATED = "April 30, 2026";

const DELETION_MAILTO =
  `mailto:${SUPPORT_EMAIL}` +
  "?subject=Layers%20account%20deletion%20request" +
  "&body=Please%20delete%20my%20Layers%20account.%0A%0AAccount%20email%3A%20%0AUser%20ID%20(if%20available)%3A%20%0AI%20understand%20this%20may%20delete%20my%20meetings%2C%20transcripts%2C%20summaries%2C%20search%20memory%2C%20API%20keys%2C%20and%20connected%20account%20data%20unless%20Layers%20must%20retain%20limited%20records%20for%20legal%2C%20security%2C%20payment%2C%20tax%2C%20or%20fraud-prevention%20reasons.";

const DELETED_DATA = [
  "Layers authentication account and profile data tied to the verified user.",
  "Meeting records, uploaded or recorded audio references, transcripts, summaries, decisions, action items, intake fields, and searchable meeting memory.",
  "Calendar connections, OAuth refresh tokens stored by Layers, API keys, MCP access records, webhook settings, and user-owned integration configuration.",
  "User-scoped app settings where they are stored as account data.",
];

const RETAINED_DATA = [
  "Payment, tax, invoice, refund, chargeback, fraud-prevention, and security records that we or Stripe must keep.",
  "Backups and logs until they age out through normal retention cycles.",
  "Records needed to investigate abuse, enforce terms, resolve disputes, or comply with law.",
  "Data stored by third-party services outside Layers that you connected, exported to, or separately authorized.",
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
        <Link href="/terms" className="hover:text-[var(--text-primary)]">
          Terms
        </Link>
        <Link href="/sign-in" className="hover:text-[var(--text-primary)]">
          Sign in
        </Link>
      </div>
    </nav>
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

function Checklist({
  items,
  variant = "positive",
}: {
  items: string[];
  variant?: "positive" | "warning";
}) {
  return (
    <ul className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
      {items.map((item) => (
        <li className="flex gap-3" key={item}>
          {variant === "positive" ? (
            <CheckCircle2
              size={16}
              className="mt-1 shrink-0 text-[#0f766e]"
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              size={16}
              className="mt-1 shrink-0 text-amber-600"
              aria-hidden="true"
            />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AccountDeletionPage() {
  return (
    <main className="paper-calm-page min-h-screen-safe">
      <LegalNav />

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-8">
          <header className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Layers by Mirror Factory
            </p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                Delete your Layers account and data
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Use this page to request deletion of your Layers account and
                associated meeting data. The request path is available even if
                you no longer have the app installed.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <ShieldCheck size={16} aria-hidden="true" />
                Launch draft - self-serve deletion follow-up
              </div>
              <p className="mt-2">
                This build does not include a safe, reviewed, destructive
                self-serve account deletion API. Until that flow is approved,
                deletion requests are handled through verified support requests.
              </p>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            <article className="glass-card rounded-xl p-5">
              <UserCheck
                size={20}
                className="text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                1. Verify account
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Sign in if you can, then include your account email and user ID
                from Profile in the request.
              </p>
            </article>

            <article className="glass-card rounded-xl p-5">
              <Mail
                size={20}
                className="text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                2. Send request
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Email support from the account email or provide enough
                information for manual verification.
              </p>
            </article>

            <article className="glass-card rounded-xl p-5">
              <Trash2
                size={20}
                className="text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                3. Delete data
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                After verification, Layers deletes account data unless limited
                retention is required.
              </p>
            </article>
          </section>

          <Section title="How to request deletion">
            <ol className="space-y-3">
              <li>
                <strong className="font-semibold text-[var(--text-primary)]">
                  Authenticated path:
                </strong>{" "}
                Sign in to Layers, open Profile, and copy your account email and
                user ID into the deletion email. This helps us verify ownership.
              </li>
              <li>
                <strong className="font-semibold text-[var(--text-primary)]">
                  Support fallback:
                </strong>{" "}
                If you cannot sign in or no longer have the app installed,
                email{" "}
                <a
                  href={DELETION_MAILTO}
                  className="font-medium text-[#0f766e] underline underline-offset-4"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                from the account email when possible.
              </li>
              <li>
                <strong className="font-semibold text-[var(--text-primary)]">
                  Verification:
                </strong>{" "}
                We may ask for additional information before deleting the
                account if the request does not come from the account email.
              </li>
            </ol>
            <p>
              We aim to acknowledge deletion requests within 7 business days and
              complete verified requests within 30 days unless legal, security,
              billing, or fraud-prevention retention applies.
            </p>
          </Section>

          <Section title="Data deleted after verification">
            <Checklist items={DELETED_DATA} />
          </Section>

          <Section title="Data that may be retained">
            <Checklist items={RETAINED_DATA} variant="warning" />
          </Section>

          <Section title="Before you request deletion">
            <p>
              Export anything you want to keep. Deletion is intended to be
              permanent for your Layers account and meeting library.
            </p>
            <p>
              If you have an active paid subscription, cancel it through the
              billing or app-store channel where it was purchased. Account
              deletion does not automatically erase invoices, taxes, payment
              records, or chargeback records retained by Stripe or an app-store
              platform.
            </p>
          </Section>

          <Section title="Self-serve deletion status">
            <p>
              Full in-app self-serve deletion is not implemented in this build
              because there is no existing reviewed auth/profile deletion API
              pattern. The safe follow-up is to add an authenticated
              confirmation flow that cancels or warns about subscriptions,
              revokes tokens, deletes user-owned records through approved
              service-role logic, and then removes the auth user.
            </p>
          </Section>

          <Section title="Related policies">
            <p>
              See the{" "}
              <Link
                href="/privacy"
                className="font-medium text-[#0f766e] underline underline-offset-4"
              >
                Privacy Policy
              </Link>{" "}
              for data handling and the{" "}
              <Link
                href="/terms"
                className="font-medium text-[#0f766e] underline underline-offset-4"
              >
                Terms of Service
              </Link>{" "}
              for launch usage rules.
            </p>
          </Section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Request deletion
            </p>
            <a
              href={DELETION_MAILTO}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#14b8a6] px-4 text-sm font-semibold text-white hover:bg-[#0d9488]"
            >
              <Mail size={16} aria-hidden="true" />
              Email deletion request
            </a>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              Use the account email when possible. Include your user ID if you
              can access Profile.
            </p>
          </div>

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
              <KeyRound size={16} aria-hidden="true" />
              Authenticated route
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Sign in first if you can. The request still works without app
              access, but account details make verification faster.
            </p>
            <Link
              href="/sign-in"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-control-hover)]"
            >
              Sign in
            </Link>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <CreditCard size={16} aria-hidden="true" />
              Subscription note
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Cancel active paid access through Stripe or the app-store platform
              where the subscription was purchased.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
