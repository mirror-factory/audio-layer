import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPageShell,
  LegalSection,
  type TocItem,
} from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Layers",
  description:
    "Launch draft privacy policy for Layers, the meeting memory app by Mirror Factory.",
};

const SUPPORT_EMAIL = "support@mirrorfactory.ai";
const LAST_UPDATED = "April 30, 2026";

// ── Legal content (byte-identical to prior page; re-grouped for prose form) ─
const DATA_GROUPS = [
  {
    title: "Account and identity",
    items: [
      "Email address, authentication identifiers, user ID, and sign-in provider details.",
      "OAuth tokens you approve to connect Layers to MCP clients or integrations.",
      "Subscription tier, billing status, and Stripe customer identifiers. We do not store full payment card numbers.",
    ],
  },
  {
    title: "Meeting content",
    items: [
      "Audio you record or upload, transcripts, speaker segments, summaries, decisions, action items, and intake fields.",
      "Search indexes and embeddings derived from your meeting content so you can find prior context.",
      "Local recording draft data while a capture is in progress, where supported by the app surface.",
    ],
  },
  {
    title: "Connected context",
    items: [
      "Calendar connection status, provider account email, event titles, times, and related metadata you choose to connect.",
      "Webhook destinations, integration settings, model preferences, and usage limits.",
      "Support messages and operational notes when you contact us.",
    ],
  },
  {
    title: "Usage and diagnostics",
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

const TOC: TocItem[] = [
  { id: "review-status", label: "Launch draft notice" },
  { id: "data-we-handle", label: "What we handle" },
  { id: "uses", label: "How we use information" },
  { id: "subprocessors", label: "AI processing & providers" },
  { id: "consent", label: "Recording consent" },
  { id: "sharing", label: "Sharing" },
  { id: "retention", label: "Retention & deletion" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro="Layers records meetings without a meeting bot and turns them into transcripts, summaries, decisions, actions, and searchable memory. This policy explains what data the app handles and how account deletion requests work during launch."
      lastUpdated={LAST_UPDATED}
      reviewStatus="Draft, counsel pending"
      contactEmail={SUPPORT_EMAIL}
      tableOfContents={TOC}
      relatedLinks={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/account-deletion", label: "Delete account" },
      ]}
    >
      <LegalSection id="review-status" title="Launch draft - legal review pending">
        <p>
          This policy is practical launch copy for website, TestFlight, and Play
          internal testing. It should be reviewed by counsel before production
          store submission or broad public launch.
        </p>
      </LegalSection>

      <LegalSection id="data-we-handle" title="What we handle">
        <p>
          We group the information Layers handles into four practical
          categories. Each category covers what the product needs to operate
          and what we may receive from connected services you authorize.
        </p>
        {DATA_GROUPS.map((group) => (
          <div key={group.title}>
            <p>
              <strong>{group.title}.</strong>
            </p>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </LegalSection>

      <LegalSection id="uses" title="How we use information">
        <ul>
          {USES.map((use) => (
            <li key={use}>{use}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="subprocessors" title="AI processing and service providers">
        <p>
          Layers uses service providers to operate the app. Meeting content may
          be sent to transcription and AI model providers only as needed to
          produce the product features you request. Provider settings,
          subprocessors, and retention commitments need final legal review
          before production launch.
        </p>
        <ul>
          {SUBPROCESSORS.map((provider) => (
            <li key={provider}>{provider}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="consent" title="Recording consent">
        <p>
          Layers is a bot-free recorder. That does not remove consent or notice
          obligations. You are responsible for telling participants when a
          meeting is being recorded and for following recording, privacy,
          employment, and confidentiality laws that apply to your conversations.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="Sharing">
        <p>
          We do not sell your personal information or meeting content. We share
          information with service providers, connected integrations you
          authorize, billing and support systems, and when required for
          security, legal compliance, or protection of rights.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="Retention and deletion">
        <p>
          We keep account data, meeting content, and derived meeting memory
          while your account is active or while needed to provide Layers,
          unless you delete data or request account deletion. Some records may
          be retained when needed for security, fraud prevention, payment, tax,
          legal, backup, or dispute purposes.
        </p>
        <p>
          Account deletion requests are handled through the{" "}
          <Link href="/account-deletion">account deletion page</Link>. Full
          self-serve destructive deletion is a launch follow-up and should not
          be treated as legal-approved until reviewed.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          Layers uses authentication, row-level database controls, limited
          access patterns, and operational logging to protect user data. No
          online service can guarantee absolute security, so report suspected
          issues to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          Layers is intended for work use and is not directed to children. Do
          not use Layers to collect personal information from children unless
          you have all required authority, consent, and compliance controls.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update this policy as Layers changes. We will update the date
          above and, where appropriate, provide additional notice.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
