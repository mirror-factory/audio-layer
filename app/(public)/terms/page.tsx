import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPageShell,
  LegalSection,
  type TocItem,
} from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Layers",
  description:
    "Launch draft terms of service for Layers, the meeting memory app by Mirror Factory.",
};

const SUPPORT_EMAIL = "support@mirrorfactory.ai";
const LAST_UPDATED = "April 30, 2026";

// ── Legal content (preserved verbatim from the prior page) ───────────────
const TERMS = [
  {
    title: "Use of Layers",
    body: [
      "Layers provides meeting recording, transcription, summaries, action extraction, search, and connected AI-tool context.",
      "You must use Layers only where you have the right to record, process, store, and share the relevant conversation content.",
      "You are responsible for your account credentials, connected integrations, API keys, and all activity under your account.",
    ],
  },
  {
    title: "Recording and consent",
    body: [
      "Layers is a bot-free recorder. You remain responsible for notifying participants and getting consent where required.",
      "Do not record confidential, regulated, or third-party content unless you have the authority and controls needed to do so.",
      "Do not use Layers to violate privacy, wiretap, employment, confidentiality, intellectual property, or platform rules.",
    ],
  },
  {
    title: "AI outputs",
    body: [
      "AI-generated transcripts, summaries, decisions, and action items can be incomplete or wrong.",
      "You should review outputs before relying on them for legal, financial, employment, medical, security, or other high-impact decisions.",
      "Layers may use model and transcription providers to process your content for the features you request.",
    ],
  },
  {
    title: "Billing",
    body: [
      "Paid plans, trials, invoices, taxes, payment processing, renewals, cancellations, and refunds are handled through Stripe or the relevant app-store platform where applicable.",
      "Pricing and plan limits may change before launch. Any production change should be communicated through the product or billing surface.",
      "You are responsible for canceling paid access before renewal if you do not want continued service.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not reverse engineer, overload, scrape, abuse, resell, or interfere with Layers or its providers.",
      "Do not upload malware, unlawful content, deceptive content, or content that infringes another person's rights.",
      "Do not use Layers to build or enrich surveillance, biometric identification, harassment, spam, or unlawful profiling systems.",
    ],
  },
  {
    title: "Beta and availability",
    body: [
      "Launch, TestFlight, Play internal testing, desktop beta, and early-access builds may be incomplete and may change quickly.",
      "The service may be interrupted, delayed, lose data, or produce degraded results while infrastructure and providers are being hardened.",
      "Back up important exports and do not treat Layers as your only system of record during the beta period.",
    ],
  },
];

const TOC: TocItem[] = [
  { id: "review-status", label: "Launch draft notice" },
  { id: "rules", label: "Rules of use" },
  { id: "your-content", label: "Your content" },
  { id: "third-party", label: "Third-party services" },
  { id: "privacy-deletion", label: "Privacy & deletion" },
  { id: "termination", label: "Suspension & termination" },
  { id: "disclaimers", label: "Disclaimers & liability" },
  { id: "changes", label: "Changes" },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      intro="These terms are the working rules for using Layers during launch, TestFlight, Play internal testing, and early public website access."
      lastUpdated={LAST_UPDATED}
      reviewStatus="Draft, counsel pending"
      contactEmail={SUPPORT_EMAIL}
      tableOfContents={TOC}
      relatedLinks={[
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/account-deletion", label: "Delete account" },
      ]}
    >
      <LegalSection id="review-status" title="Launch draft - legal review pending">
        <p>
          This is practical launch copy, not final legal advice. Counsel should
          review liability, governing law, warranty, arbitration, app-store,
          and business-entity language before production launch.
        </p>
      </LegalSection>

      <LegalSection id="rules" title="Rules of use">
        <p>
          The headings below set the working rules for Layers during this
          launch period. Each one applies to every account and every meeting
          you process through the service.
        </p>
        {TERMS.map((term) => (
          <div key={term.title}>
            <p>
              <strong>{term.title}.</strong>
            </p>
            <ul>
              {term.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </LegalSection>

      <LegalSection id="your-content" title="Your content">
        <p>
          You keep the rights you already have in your meeting audio,
          transcripts, notes, summaries, uploads, and exports. You grant Layers
          the permission needed to host, process, transform, display, search,
          export, and transmit that content to provide the service.
        </p>
        <p>
          You represent that you have the rights, notices, consents, and
          authorizations needed for any content you add to Layers.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="Third-party services and integrations">
        <p>
          Layers depends on infrastructure, authentication, calendar,
          transcription, model, email, payment, app-store, and integration
          providers. Their terms and privacy practices may apply when you
          connect or use those services.
        </p>
      </LegalSection>

      <LegalSection id="privacy-deletion" title="Privacy and deletion">
        <p>
          The <Link href="/privacy">Privacy Policy</Link> explains what Layers
          collects and how it is used. Account deletion requests are handled
          through the <Link href="/account-deletion">account deletion page</Link>.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Suspension and termination">
        <p>
          We may suspend or terminate access if an account creates security
          risk, violates these terms, creates payment risk, infringes rights,
          or could expose Layers, Mirror Factory, users, or providers to legal
          or operational harm.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers and liability">
        <p>
          Layers is provided as-is during launch and early testing. To the
          maximum extent permitted by law, Mirror Factory disclaims implied
          warranties and is not responsible for indirect, incidental, special,
          consequential, exemplary, or punitive damages.
        </p>
        <p>
          Final warranty, liability cap, jurisdiction, dispute resolution, and
          consumer-law language needs counsel review before production release.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update these terms as Layers, platform requirements, and
          launch operations change. We will update the date above and, when
          appropriate, provide additional notice.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
