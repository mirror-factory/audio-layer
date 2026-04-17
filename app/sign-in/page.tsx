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
    <main className="min-h-dvh bg-neutral-950 px-4 py-16">
      <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-neutral-100">Sign in</h1>
          <p className="text-xs text-neutral-500">
            Enter your email — we&apos;ll send you a magic link. No password
            required.
          </p>
        </header>

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
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={stage === "sending" || !email.trim()}
              className="w-full rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
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

        <footer className="text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            ← Back to hub
          </Link>
        </footer>
      </div>
    </main>
  );
}
