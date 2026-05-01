"use client";

/**
 * AuthShell — shared chrome for /sign-in and /sign-up.
 *
 * Paper Calm idiom: a quiet two-pane composition. The brand pane on the left
 * is a still surface (LayersLogoMark, one-line promise, three trust beats).
 * The form pane on the right is left-aligned, type-led, and breathes.
 *
 * No "centered card on a gradient" trope. No drop shadows on the form area.
 * Errors render in a calm warning row, not red-shouting text.
 *
 * Tokens this component would like to graduate into the registry:
 *   --auth-shell-pane-min-height (currently inline)
 *   --auth-input-underline (oklch derived from --border-default at 0.62)
 *   --auth-input-underline-active (currently --layers-mint)
 * Propose adding to .ai-dev-kit/registries/design-tokens.yaml when the auth
 * shell graduates beyond these two pages.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { LayersLogoMark } from "@/components/layers-logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  lede: string;
  promise: ReactNode;
  trustBeats?: string[];
  footer: ReactNode;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  lede,
  promise,
  trustBeats = [
    "End-to-end encrypted in transit",
    "Your meetings stay private",
    "Cancel any time",
  ],
  footer,
  children,
}: AuthShellProps) {
  return (
    <section className="auth-public-page min-h-screen-safe">
      <div className="auth-shell">
        <aside className="auth-brand-pane" aria-hidden="false">
          <div className="auth-brand-stack">
            <LayersLogoMark size={56} className="auth-brand-mark" />
            <div className="auth-brand-promise">{promise}</div>
          </div>

          <ul className="auth-trust-list">
            {trustBeats.map((beat) => (
              <li key={beat} className="auth-trust-beat">
                <span className="auth-trust-dot" aria-hidden="true" />
                <span>{beat}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="auth-form-pane">
          <header className="auth-form-header">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-lede">{lede}</p>
          </header>

          <div className="auth-form-body">{children}</div>

          <footer className="auth-form-footer">{footer}</footer>
        </div>
      </div>

      <style jsx>{`
        .auth-shell {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          align-items: stretch;
          width: min(100% - 32px, 1080px);
          margin: clamp(24px, 6vw, 64px) auto;
          gap: clamp(24px, 4vw, 48px);
          padding: clamp(20px, 3.5vw, 40px);
          border-radius: 28px;
          background: color-mix(
            in oklch,
            var(--bg-surface) 92%,
            transparent
          );
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-sm);
          backdrop-filter: saturate(1.05);
        }

        .auth-brand-pane {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: clamp(32px, 5vw, 64px);
          padding: clamp(20px, 3vw, 32px);
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 18% 18%,
              color-mix(in oklch, var(--layers-violet-tint) 80%, transparent),
              transparent 60%
            ),
            radial-gradient(
              circle at 82% 88%,
              color-mix(in oklch, var(--layers-mint-tint) 80%, transparent),
              transparent 60%
            ),
            var(--bg-surface-muted);
          border: 1px solid var(--border-subtle);
        }

        .auth-brand-stack {
          display: flex;
          flex-direction: column;
          gap: clamp(20px, 3vw, 32px);
        }

        .auth-brand-pane :global(.auth-brand-mark) {
          opacity: 0.96;
        }

        .auth-brand-promise {
          font-family: var(--font-brand-sans);
          font-size: clamp(1.25rem, 2.4vw, 1.55rem);
          line-height: 1.32;
          letter-spacing: -0.01em;
          color: var(--layers-ink);
          font-weight: 520;
          max-width: 28ch;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .auth-brand-promise :global(.auth-brand-promise-mission) {
          display: block;
          font-weight: 620;
          letter-spacing: -0.015em;
          color: var(--layers-ink);
        }
        .auth-brand-promise :global(.auth-brand-promise-secondary) {
          display: block;
          font-size: 0.92em;
          font-weight: 480;
          line-height: 1.45;
          color: color-mix(in oklch, var(--layers-ink) 62%, var(--fg-muted));
        }

        .auth-trust-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .auth-trust-beat {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.86rem;
          line-height: 1.4;
          color: var(--fg-muted);
        }

        .auth-trust-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: var(--layers-mint);
          opacity: 0.7;
          flex-shrink: 0;
        }

        .auth-form-pane {
          display: flex;
          flex-direction: column;
          gap: clamp(24px, 3vw, 32px);
          padding: clamp(8px, 2vw, 24px) clamp(8px, 2vw, 16px);
          min-height: 0;
        }

        .auth-form-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 36ch;
        }

        .auth-eyebrow {
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--fg-muted);
          font-weight: 540;
          margin: 0;
        }

        .auth-title {
          font-family: var(--font-brand-sans);
          font-size: clamp(1.85rem, 3.2vw, 2.4rem);
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--layers-ink);
          font-weight: 620;
          margin: 0;
        }

        .auth-lede {
          font-size: 0.95rem;
          line-height: 1.55;
          color: var(--fg-muted);
          margin: 0;
        }

        .auth-form-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .auth-form-footer {
          font-size: 0.86rem;
          color: var(--fg-muted);
          line-height: 1.55;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
        }

        @media (max-width: 880px) {
          .auth-shell {
            grid-template-columns: 1fr;
            padding: clamp(16px, 4vw, 24px);
            gap: 20px;
          }

          .auth-brand-pane {
            order: 2;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 20px;
          }

          .auth-brand-stack {
            gap: 12px;
            flex-direction: row;
            align-items: center;
          }

          .auth-brand-promise {
            font-size: 0.95rem;
            max-width: 22ch;
          }

          .auth-trust-list {
            display: none;
          }

          .auth-form-pane {
            order: 1;
            padding: 8px 4px 0;
          }
        }
      `}</style>
    </section>
  );
}

/* ---------- Subcomponents shared between sign-in / sign-up ---------- */

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="auth-divider" role="presentation">
      <span className="auth-divider-rule" />
      <span className="auth-divider-label">{label}</span>
      <span className="auth-divider-rule" />
      <style jsx>{`
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }
        .auth-divider-rule {
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }
        .auth-divider-label {
          font-size: 0.7rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fg-faint);
          font-weight: 520;
        }
      `}</style>
    </div>
  );
}

type AuthFieldProps = {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
};

export function AuthField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  hint,
}: AuthFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-field-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="auth-field-input"
      />
      {hint ? <span className="auth-field-hint">{hint}</span> : null}

      <style jsx>{`
        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .auth-field-label {
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--fg-muted);
          font-weight: 540;
        }
        .auth-field-input {
          width: 100%;
          background: transparent;
          color: var(--layers-ink);
          font-family: var(--font-brand-sans);
          font-size: 1rem;
          line-height: 1.4;
          padding: 10px 0;
          border: 0;
          border-bottom: 1px solid
            color-mix(in oklch, var(--border-default) 84%, transparent);
          border-radius: 0;
          outline: none;
          transition:
            border-color var(--duration-fast) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out);
          min-height: 44px;
        }
        .auth-field-input::placeholder {
          color: var(--fg-faint);
        }
        .auth-field-input:hover {
          border-bottom-color: color-mix(
            in oklch,
            var(--layers-ink) 28%,
            transparent
          );
        }
        .auth-field-input:focus {
          border-bottom-color: var(--layers-mint);
          box-shadow: 0 1px 0 0 var(--layers-mint);
        }
        .auth-field-hint {
          font-size: 0.78rem;
          color: var(--fg-faint);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

type AuthErrorProps = {
  message: string;
};

export function AuthError({ message }: AuthErrorProps) {
  return (
    <div className="auth-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" className="auth-error-icon" />
      <p>{message}</p>
      <style jsx>{`
        .auth-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: color-mix(
            in oklch,
            var(--signal-warning) 14%,
            var(--bg-surface) 86%
          );
          color: color-mix(in oklch, var(--signal-warning) 70%, var(--layers-ink));
          font-size: 0.86rem;
          line-height: 1.5;
          border: 1px solid
            color-mix(in oklch, var(--signal-warning) 28%, transparent);
        }
        .auth-error :global(.auth-error-icon) {
          flex-shrink: 0;
          margin-top: 2px;
          color: var(--signal-warning);
        }
        .auth-error p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}

type AuthPrimaryButtonProps = {
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export function AuthPrimaryButton({
  type = "button",
  disabled,
  loading,
  onClick,
  children,
}: AuthPrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="auth-primary"
      aria-busy={loading || undefined}
    >
      <span className={loading ? "auth-primary-label is-loading" : "auth-primary-label"}>
        {children}
      </span>
      <style jsx>{`
        .auth-primary {
          appearance: none;
          width: 100%;
          min-height: 48px;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid
            color-mix(in oklch, var(--layers-ink) 88%, transparent);
          background: var(--layers-ink);
          color: var(--bg-surface);
          font-family: var(--font-brand-sans);
          font-size: 0.95rem;
          font-weight: 560;
          letter-spacing: -0.005em;
          cursor: pointer;
          transition:
            background var(--duration-fast) var(--ease-out),
            transform var(--duration-fast) var(--ease-out),
            opacity var(--duration-fast) var(--ease-out);
        }
        .auth-primary:hover:not(:disabled) {
          background: color-mix(in oklch, var(--layers-ink) 92%, var(--layers-mint));
        }
        .auth-primary:active:not(:disabled) {
          transform: translateY(1px);
        }
        .auth-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .auth-primary-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .auth-primary-label.is-loading::after {
          content: "";
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          animation: auth-spin 0.7s linear infinite;
        }
        @keyframes auth-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}

type AuthGoogleButtonProps = {
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export function AuthGoogleButton({
  loading,
  onClick,
  children,
}: AuthGoogleButtonProps) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="auth-google"
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="auth-google-spin" aria-hidden="true" />
      ) : (
        <GoogleIcon className="auth-google-icon" />
      )}
      <span>{children}</span>
      <style jsx>{`
        .auth-google {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          min-height: 48px;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: var(--bg-surface);
          color: var(--layers-ink);
          font-family: var(--font-brand-sans);
          font-size: 0.95rem;
          font-weight: 540;
          cursor: pointer;
          transition:
            border-color var(--duration-fast) var(--ease-out),
            transform var(--duration-fast) var(--ease-out),
            background var(--duration-fast) var(--ease-out);
        }
        .auth-google:hover:not(:disabled) {
          border-color: color-mix(
            in oklch,
            var(--layers-ink) 30%,
            var(--border-default)
          );
          background: color-mix(in oklch, var(--layers-mint-tint) 32%, var(--bg-surface));
        }
        .auth-google:active:not(:disabled) {
          transform: translateY(1px);
        }
        .auth-google:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-google :global(.auth-google-icon) {
          width: 18px;
          height: 18px;
        }
        .auth-google-spin {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          animation: auth-spin 0.7s linear infinite;
        }
      `}</style>
    </button>
  );
}

export function AuthFootnote({ children }: { children: ReactNode }) {
  return (
    <p className="auth-footnote">
      {children}
      <style jsx>{`
        .auth-footnote {
          font-size: 0.78rem;
          line-height: 1.55;
          color: var(--fg-faint);
          margin: 0;
        }
        .auth-footnote :global(a) {
          color: var(--fg-muted);
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: color-mix(
            in oklch,
            var(--fg-muted) 40%,
            transparent
          );
          transition: text-decoration-color var(--duration-fast) var(--ease-out),
            color var(--duration-fast) var(--ease-out);
        }
        .auth-footnote :global(a:hover) {
          color: var(--layers-ink);
          text-decoration-color: var(--layers-mint);
        }
      `}</style>
    </p>
  );
}

export function AuthSwitchLink({
  prompt,
  href,
  cta,
}: {
  prompt: string;
  href: string;
  cta: string;
}) {
  return (
    <p className="auth-switch">
      <span>{prompt}</span>{" "}
      <Link href={href} className="auth-switch-link">
        {cta}
        <span aria-hidden="true" className="auth-switch-arrow">
          &rarr;
        </span>
      </Link>
      <style jsx>{`
        .auth-switch {
          margin: 0;
        }
        .auth-switch span {
          color: var(--fg-muted);
        }
        .auth-switch :global(.auth-switch-link) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--layers-ink);
          font-weight: 540;
          text-decoration: none;
          padding-bottom: 1px;
          border-bottom: 1px solid var(--layers-mint);
          transition: gap var(--duration-fast) var(--ease-out);
        }
        .auth-switch :global(.auth-switch-link:hover) {
          gap: 10px;
        }
        .auth-switch :global(.auth-switch-arrow) {
          transition: transform var(--duration-fast) var(--ease-out);
        }
      `}</style>
    </p>
  );
}
