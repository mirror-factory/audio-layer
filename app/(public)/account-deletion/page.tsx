import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPageShell,
  LegalSection,
  type TocItem,
} from "@/components/legal-page-shell";

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
  "&body=Please%20delete%20my%20Layers%20account.%0A%0AAccount%20email%3A%20%0AUser%20ID%20(if%20available)%3A%20%0AI%20understand%20this%20may%20delete%20my%20meetings%2C%20transcripts%2C%20summaries%2C%20search%20memory%2C%20OAuth%20tokens%2C%20and%20connected%20account%20data%20unless%20Layers%20must%20retain%20limited%20records%20for%20legal%2C%20security%2C%20payment%2C%20tax%2C%20or%20fraud-prevention%20reasons.";

// ── Legal content (preserved verbatim from prior page) ───────────────────
const DELETED_DATA = [
  "Layers authentication account and profile data tied to the verified user.",
  "Meeting records, uploaded or recorded audio references, transcripts, summaries, decisions, action items, intake fields, and searchable meeting memory.",
  "Calendar connections, OAuth refresh tokens stored by Layers, MCP access records, webhook settings, and user-owned integration configuration.",
  "User-scoped app settings where they are stored as account data.",
];

const RETAINED_DATA = [
  "Payment, tax, invoice, refund, chargeback, fraud-prevention, and security records that we or Stripe must keep.",
  "Backups and logs until they age out through normal retention cycles.",
  "Records needed to investigate abuse, enforce terms, resolve disputes, or comply with law.",
  "Data stored by third-party services outside Layers that you connected, exported to, or separately authorized.",
];

const TOC: TocItem[] = [
  { id: "self-serve", label: "Self-serve route" },
  { id: "how-to-request", label: "How to request deletion" },
  { id: "data-deleted", label: "Data deleted after verification" },
  { id: "data-retained", label: "Data that may be retained" },
  { id: "before-you-delete", label: "Before you request deletion" },
  { id: "self-serve-status", label: "Self-serve deletion status" },
  { id: "related", label: "Related policies" },
];

function DeletionRailLead() {
  return (
    <div className="legal-rail-card">
      <p className="legal-rail-label">Request deletion</p>
      <p>
        Use this from any device — even if you no longer have the app
        installed. Send from the account email when possible, and include your
        user ID if you can access Profile.
      </p>
      <div className="legal-rail-actions">
        <a className="legal-button legal-button-primary" href={DELETION_MAILTO}>
          Email deletion request
        </a>
        <Link href="/sign-in" className="legal-button legal-button-ghost">
          Sign in to delete in-app
        </Link>
      </div>
    </div>
  );
}

export default function AccountDeletionPage() {
  return (
    <LegalPageShell
      title="Delete your Layers account and data"
      intro="Use this page to request deletion of your Layers account and associated meeting data. The request path is available even if you no longer have the app installed."
      lastUpdated={LAST_UPDATED}
      reviewStatus="Draft, counsel pending"
      contactEmail={SUPPORT_EMAIL}
      tableOfContents={TOC}
      railLead={<DeletionRailLead />}
      relatedLinks={[
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
      ]}
    >
      <LegalSection id="self-serve" title="Self-serve deletion is available from Profile">
        <p>
          Signed-in users can delete their account from Profile after typing a
          confirmation phrase. Support remains available if you cannot access
          the account.
        </p>
      </LegalSection>

      <LegalSection id="how-to-request" title="How to request deletion">
        <ol>
          <li>
            <strong>Authenticated path:</strong> Sign in to Layers, open
            Profile, and use the Delete account control. You will need to type
            DELETE before the app removes your account.
          </li>
          <li>
            <strong>Support fallback:</strong> If you cannot sign in or no
            longer have the app installed, email{" "}
            <a href={DELETION_MAILTO}>{SUPPORT_EMAIL}</a> from the account
            email when possible.
          </li>
          <li>
            <strong>Verification:</strong> We may ask for additional
            information before deleting the account if the request does not
            come from the account email.
          </li>
        </ol>
        <p>
          We aim to acknowledge deletion requests within 7 business days and
          complete verified requests within 30 days unless legal, security,
          billing, or fraud-prevention retention applies.
        </p>
      </LegalSection>

      <LegalSection id="data-deleted" title="Data deleted after verification">
        <ul>
          {DELETED_DATA.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="data-retained" title="Data that may be retained">
        <ul>
          {RETAINED_DATA.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="before-you-delete" title="Before you request deletion">
        <p>
          Export anything you want to keep. Deletion is intended to be
          permanent for your Layers account and meeting library.
        </p>
        <p>
          If you have an active paid subscription, cancel it through the
          billing or app-store channel where it was purchased. Account deletion
          does not automatically erase invoices, taxes, payment records, or
          chargeback records retained by Stripe or an app-store platform.
        </p>
      </LegalSection>

      <LegalSection id="self-serve-status" title="Self-serve deletion status">
        <p>
          The Profile deletion flow revokes user-owned Layers records and then
          removes the Supabase authentication user. It does not delete Stripe
          invoices, tax records, chargeback records, external app store
          records, or provider logs we must retain for legal, security,
          billing, or fraud-prevention reasons.
        </p>
      </LegalSection>

      <LegalSection id="related" title="Related policies">
        <p>
          See the <Link href="/privacy">Privacy Policy</Link> for data handling
          and the <Link href="/terms">Terms of Service</Link> for launch usage
          rules.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
