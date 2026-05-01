"use client";

import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// LegalPageShell
//
// Shared "editorial paper" container for /privacy, /terms, /account-deletion.
//
// Design intent (Layers Design System v1.0 — Paper Calm):
//   • Type-led: Bricolage Grotesque display + Geist body, body at ~17.5px /
//     1.7 leading, line length capped at ~70ch for readability.
//   • Sticky left-rail TOC on desktop with a single 1px vertical guide and a
//     small mint dot for the current section. NO side-stripe borders. NO
//     gradient text. NO colored callout stripes.
//   • Mobile: TOC collapses into a quiet <details> dropdown above the article.
//   • Active-section tracking via IntersectionObserver against `data-toc`
//     anchors registered through the SectionAnchor component below.
//
// Tokens consumed (all from app/styles/tokens.css — no raw hex):
//   --bg-page, --bg-surface, --bg-surface-muted, --border-default,
//   --border-subtle, --layers-mint, --layers-mint-tint, --fg-default,
//   --fg-muted, --fg-faint, --space-*, --radius-*, --leading-*, --weight-*,
//   --font-brand-sans
//
// Tokens we'd LIKE to add (proposed, not invented here):
//   --measure-prose: 70ch          — canonical reading measure
//   --type-legal-body: clamp(1rem, 0.96rem + 0.2vw, 1.125rem)
//   --type-legal-h2:   clamp(1.25rem, 1.1rem + 0.6vw, 1.55rem)
//   --type-legal-h1:   clamp(2.25rem, 1.6rem + 2.2vw, 3.25rem)
//   --shadow-paper-soft: 0 1px 0 oklch(0.84 0.02 168 / 0.4)
// ---------------------------------------------------------------------------

export type TocItem = {
  id: string;
  label: string;
};

export type LegalPageShellProps = {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  lastUpdated: string;
  owner?: string;
  reviewStatus?: string;
  contactEmail: string;
  tableOfContents: TocItem[];
  /**
   * Optional rail content rendered above the meta panel — used by
   * /account-deletion to surface a quiet "Email deletion request" action.
   */
  railLead?: ReactNode;
  /**
   * Optional related-links rendered at the bottom of the rail.
   * Defaults to cross-links between the three legal pages, set per page.
   */
  relatedLinks?: { href: string; label: string }[];
  children: ReactNode;
};

// Section anchor: wraps a section in <section id={id} data-toc> so the
// IntersectionObserver in the shell can track active state.
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} data-toc className="legal-section">
      <h2 className="legal-h2">{title}</h2>
      <div className="legal-prose">{children}</div>
    </section>
  );
}

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&display=swap');

  .legal-root {
    --legal-display: 'Bricolage Grotesque', var(--font-brand-sans);
    --legal-body: var(--font-brand-sans);
    --legal-measure: 70ch;
    --legal-rule: color-mix(in oklch, var(--border-default) 78%, transparent);

    background: var(--bg-page);
    color: var(--fg-default);
    font-family: var(--legal-body);
    min-height: 100dvh;
    position: relative;
  }

  /* Subtle paper grain — single, calm decorative moment */
  .legal-root::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 80% 40% at 12% 0%, var(--layers-mint-tint) 0%, transparent 60%),
      radial-gradient(ellipse 60% 30% at 88% 8%, var(--layers-violet-tint) 0%, transparent 70%);
    opacity: 0.55;
    z-index: 0;
  }

  .legal-shell {
    position: relative;
    z-index: 1;
    max-width: 1180px;
    margin: 0 auto;
    padding: clamp(var(--space-10), 6vw, var(--space-20)) clamp(var(--space-5), 5vw, var(--space-10)) var(--space-24);
    display: grid;
    gap: clamp(var(--space-10), 6vw, var(--space-16));
    grid-template-columns: 1fr;
  }

  @media (min-width: 980px) {
    .legal-shell {
      grid-template-columns: 220px minmax(0, 1fr) 260px;
      gap: clamp(var(--space-10), 4vw, var(--space-16));
      align-items: start;
    }
  }

  /* ── Header (spans full grid) ───────────────────────────────────────── */
  .legal-header {
    grid-column: 1 / -1;
    max-width: var(--legal-measure);
    display: grid;
    gap: var(--space-5);
  }

  .legal-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-uppercase);
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .legal-eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--layers-mint);
  }

  .legal-h1 {
    font-family: var(--legal-display);
    font-size: clamp(2.25rem, 1.6rem + 2.2vw, 3.25rem);
    font-weight: 600;
    line-height: 1.06;
    letter-spacing: -0.018em;
    color: var(--fg-default);
    margin: 0;
    max-width: 18ch;
  }

  .legal-intro {
    font-size: clamp(1.05rem, 1rem + 0.25vw, 1.2rem);
    line-height: 1.6;
    color: var(--fg-muted);
    max-width: 62ch;
    margin: 0;
  }

  /* Meta strip — compact horizontal row of last-updated / owner / contact */
  .legal-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-8);
    padding-top: var(--space-5);
    border-top: 1px solid var(--legal-rule);
    margin-top: var(--space-3);
    font-size: var(--text-sm);
    color: var(--fg-muted);
  }

  .legal-meta dt {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-uppercase);
    color: var(--fg-faint, var(--fg-muted));
    margin-bottom: 2px;
  }

  .legal-meta dd {
    font-weight: var(--weight-medium);
    color: var(--fg-default);
    margin: 0;
  }

  .legal-meta a {
    color: var(--brand-accent-subtle, var(--layers-mint));
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
  }

  /* ── Mobile TOC ─────────────────────────────────────────────────────── */
  .legal-toc-mobile {
    display: block;
    border: 1px solid var(--legal-rule);
    border-radius: var(--radius-lg, 12px);
    background: var(--bg-surface);
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
  }

  .legal-toc-mobile summary {
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--fg-default);
    font-weight: var(--weight-semibold);
  }

  .legal-toc-mobile summary::-webkit-details-marker { display: none; }

  .legal-toc-mobile summary::after {
    content: "";
    width: 8px; height: 8px;
    border-right: 1.5px solid var(--fg-muted);
    border-bottom: 1.5px solid var(--fg-muted);
    transform: rotate(45deg);
    transition: transform var(--motion-fast, 140ms) cubic-bezier(0.22, 1, 0.36, 1);
  }

  .legal-toc-mobile[open] summary::after { transform: rotate(-135deg); }

  .legal-toc-mobile ol {
    list-style: none;
    margin: var(--space-4) 0 var(--space-2);
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }

  .legal-toc-mobile a {
    color: var(--fg-muted);
    text-decoration: none;
  }

  .legal-toc-mobile a:hover { color: var(--fg-default); }

  @media (min-width: 980px) {
    .legal-toc-mobile { display: none; }
  }

  /* ── Sticky desktop TOC ─────────────────────────────────────────────── */
  .legal-toc-rail {
    display: none;
  }

  @media (min-width: 980px) {
    .legal-toc-rail {
      display: block;
      position: sticky;
      top: var(--space-10);
      align-self: start;
      padding-left: var(--space-4);
      border-left: 1px solid var(--legal-rule);
    }
  }

  .legal-toc-rail-label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-uppercase);
    color: var(--fg-faint, var(--fg-muted));
    margin: 0 0 var(--space-4);
    font-weight: var(--weight-semibold);
  }

  .legal-toc-rail ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-3);
  }

  .legal-toc-rail li {
    display: grid;
    grid-template-columns: 14px 1fr;
    align-items: baseline;
    gap: var(--space-2);
  }

  .legal-toc-rail .legal-toc-bullet {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: transparent;
    border: 1px solid var(--border-default);
    transform: translateY(2px);
    transition: background var(--motion-fast, 140ms) ease, border-color var(--motion-fast, 140ms) ease;
  }

  .legal-toc-rail li[data-active="true"] .legal-toc-bullet {
    background: var(--layers-mint);
    border-color: var(--layers-mint);
  }

  .legal-toc-rail a {
    color: var(--fg-muted);
    text-decoration: none;
    font-size: var(--text-sm);
    line-height: 1.5;
    transition: color var(--motion-fast, 140ms) ease;
  }

  .legal-toc-rail li[data-active="true"] a,
  .legal-toc-rail a:hover {
    color: var(--fg-default);
  }

  /* ── Article ────────────────────────────────────────────────────────── */
  .legal-article {
    min-width: 0;
    max-width: var(--legal-measure);
    display: grid;
    gap: clamp(var(--space-10), 4vw, var(--space-16));
    font-size: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
    line-height: 1.72;
    color: color-mix(in oklch, var(--fg-default) 88%, var(--fg-muted) 12%);
  }

  .legal-section { display: grid; gap: var(--space-4); scroll-margin-top: var(--space-12); }

  .legal-h2 {
    font-family: var(--legal-display);
    font-size: clamp(1.25rem, 1.1rem + 0.6vw, 1.55rem);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.012em;
    color: var(--fg-default);
    margin: 0;
  }

  .legal-prose { display: grid; gap: var(--space-4); }
  .legal-prose p { margin: 0; }
  .legal-prose ul, .legal-prose ol { margin: 0; padding-left: 1.4em; display: grid; gap: var(--space-2); }
  .legal-prose li { padding-left: var(--space-1); }
  .legal-prose li::marker { color: var(--fg-faint, var(--fg-muted)); }

  .legal-prose a {
    color: var(--brand-accent-subtle, var(--layers-mint));
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
    font-weight: var(--weight-medium);
  }

  .legal-prose strong { color: var(--fg-default); font-weight: var(--weight-semibold); }

  /* ── Right rail (contact / metadata) ────────────────────────────────── */
  .legal-aside {
    display: grid;
    gap: var(--space-5);
  }

  @media (min-width: 980px) {
    .legal-aside {
      position: sticky;
      top: var(--space-10);
      align-self: start;
    }
  }

  .legal-rail-card {
    border: 1px solid var(--legal-rule);
    border-radius: var(--radius-xl, 16px);
    background: var(--bg-surface);
    padding: var(--space-5);
    display: grid;
    gap: var(--space-3);
  }

  .legal-rail-label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-uppercase);
    color: var(--fg-faint, var(--fg-muted));
    font-weight: var(--weight-semibold);
    margin: 0;
  }

  .legal-rail-card p { margin: 0; color: var(--fg-muted); font-size: var(--text-sm); line-height: 1.6; }

  .legal-rail-card a.legal-link {
    color: var(--brand-accent-subtle, var(--layers-mint));
    text-decoration: none;
    font-weight: var(--weight-medium);
    font-size: var(--text-sm);
  }

  .legal-rail-card a.legal-link:hover { text-decoration: underline; text-underline-offset: 3px; }

  .legal-rail-actions { display: grid; gap: var(--space-2); margin-top: var(--space-1); }

  .legal-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 40px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-md, 10px);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    text-decoration: none;
    transition: background var(--motion-fast, 140ms) ease, color var(--motion-fast, 140ms) ease;
    border: 1px solid transparent;
  }

  .legal-button-primary {
    background: var(--layers-mint);
    color: var(--bg-page);
  }
  .legal-button-primary:hover { background: var(--brand-accent-subtle, var(--layers-mint)); }

  .legal-button-ghost {
    background: transparent;
    color: var(--fg-default);
    border-color: var(--border-default);
  }
  .legal-button-ghost:hover { background: var(--bg-surface-muted); }

  /* ── Cross-links ────────────────────────────────────────────────────── */
  .legal-related {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .legal-related a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md, 10px);
    background: transparent;
    color: var(--fg-muted);
    border: 1px solid var(--legal-rule);
    text-decoration: none;
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
  }

  .legal-related a:hover { color: var(--fg-default); background: var(--bg-surface-muted); }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .legal-toc-rail .legal-toc-bullet,
    .legal-toc-mobile summary::after,
    .legal-toc-rail a {
      transition: none;
    }
  }
`;

export function LegalPageShell({
  eyebrow = "Layers by Mirror Factory",
  title,
  intro,
  lastUpdated,
  owner = "Mirror Factory",
  reviewStatus,
  contactEmail,
  tableOfContents,
  railLead,
  relatedLinks,
  children,
}: LegalPageShellProps) {
  const [activeId, setActiveId] = useState<string | null>(
    tableOfContents[0]?.id ?? null,
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ids = useMemo(
    () => tableOfContents.map((item) => item.id),
    [tableOfContents],
  );

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      // Pick the entry closest to the top of the viewport that's intersecting.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top,
        );
      if (visible[0]) {
        setActiveId(visible[0].target.id);
        return;
      }
      // Fallback: choose the section whose top is closest to (but above) the
      // top of the viewport, so the rail stays "ahead" of the scroll.
      const above = entries
        .filter((e) => e.boundingClientRect.top < 0)
        .sort(
          (a, b) =>
            b.boundingClientRect.top - a.boundingClientRect.top,
        );
      if (above[0]) setActiveId(above[0].target.id);
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined" || ids.length === 0) return;
    if (observerRef.current) observerRef.current.disconnect();

    const observer = new IntersectionObserver(onIntersect, {
      // Trigger as a section enters the upper third of the viewport.
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 0.25, 1],
    });
    observerRef.current = observer;

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [ids, onIntersect]);

  return (
    <div className="legal-root">
      <style>{PAGE_STYLES}</style>

      <div className="legal-shell">
        <header className="legal-header">
          <span className="legal-eyebrow">
            <span className="legal-eyebrow-dot" aria-hidden="true" />
            {eyebrow}
          </span>
          <h1 className="legal-h1">{title}</h1>
          {intro ? <p className="legal-intro">{intro}</p> : null}

          <dl className="legal-meta" aria-label="Document metadata">
            <div>
              <dt>Last updated</dt>
              <dd>{lastUpdated}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{owner}</dd>
            </div>
            {reviewStatus ? (
              <div>
                <dt>Review</dt>
                <dd>{reviewStatus}</dd>
              </div>
            ) : null}
            <div>
              <dt>Contact</dt>
              <dd>
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </dd>
            </div>
          </dl>

          <details className="legal-toc-mobile">
            <summary>On this page</summary>
            <ol>
              {tableOfContents.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ol>
          </details>
        </header>

        <nav className="legal-toc-rail" aria-label="On this page">
          <p className="legal-toc-rail-label">On this page</p>
          <ol>
            {tableOfContents.map((item) => (
              <li key={item.id} data-active={activeId === item.id}>
                <span className="legal-toc-bullet" aria-hidden="true" />
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="legal-article">{children}</article>

        <aside className="legal-aside" aria-label="Related actions">
          {railLead}

          <div className="legal-rail-card">
            <p className="legal-rail-label">Questions</p>
            <p>
              Email{" "}
              <a className="legal-link" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>{" "}
              for anything related to this document.
            </p>
          </div>

          {relatedLinks && relatedLinks.length > 0 ? (
            <div className="legal-rail-card">
              <p className="legal-rail-label">Related</p>
              <div className="legal-related">
                {relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
