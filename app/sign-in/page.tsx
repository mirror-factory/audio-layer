"use client";

/**
 * /sign-in — email magic link.
 *
 * Submits to Supabase's signInWithOtp; the user receives a one-time
 * link, which lands at /auth/callback and finalizes the session.
 *
 * For anonymous visitors created by middleware.ts, this CREATES a
 * new permanent account; their previous anonymous-account meetings
 * become unreachable (RLS denies the new user). Migration of anon
 * meetings into the permanent account is a documented follow-up.
 */

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type Stage = "idle" | "sending" | "sent" | "error";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowser();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(
        "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      setStage("error");
      return;
    }
    setStage("sending");
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (err) {
      setError(err.message);
      setStage("error");
      return;
    }
    setStage("sent");
  };

  return (
    <main className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-16">
      <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 md:p-6">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-neutral-100">Sign in</h1>
          <p className="text-xs text-neutral-500">
            Enter your email — we&apos;ll send you a magic link. No password
            required.
          </p>
        </header>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={async () => {
            if (!supabase) {
              setError("Supabase isn't configured.");
              setStage("error");
              return;
            }
            const redirectTo = `${window.location.origin}/auth/callback`;
            const { error: err } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo },
            });
            if (err) {
              setError(err.message);
              setStage("error");
            }
          }}
          className="flex w-full min-h-[44px] items-center justify-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-600">or</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {stage === "sent" ? (
          <div
            role="status"
            className="rounded-md border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200"
          >
            Check your inbox at <strong>{email}</strong> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={stage === "sending"}
                className="min-h-[44px] w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={stage === "sending" || !email.trim()}
              className="min-h-[44px] w-full rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stage === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {error ? (
              <p role="alert" className="text-xs text-red-300">
                {error}
              </p>
            ) : null}
          </form>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <Link href="/" className="min-h-[44px] flex items-center hover:text-neutral-300">
            &larr; Back to hub
          </Link>
          <Link
            href="/sign-up"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Don&apos;t have an account? Sign up
          </Link>
        </footer>
      </div>
    </main>
  );
}
