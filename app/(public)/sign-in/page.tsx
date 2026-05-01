"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { GOOGLE_SIGN_IN_AUTH_SCOPES } from "@/lib/auth/google-oauth";
import {
  AuthShell,
  AuthField,
  AuthError,
  AuthDivider,
  AuthGoogleButton,
  AuthPrimaryButton,
  AuthFootnote,
  AuthSwitchLink,
} from "@/components/auth-card";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const isOAuthFlow = searchParams.get("oauth") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After sign-in, redirect to OAuth callback if this is an MCP OAuth flow
  const getPostLoginRedirect = () => {
    if (!isOAuthFlow) return "/record";
    const params = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (key !== "oauth") params.append(key, value);
    }
    return `/oauth/consent?${params.toString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Auth not configured");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      window.location.href = getPostLoginRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Auth not configured");

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: GOOGLE_SIGN_IN_AUTH_SCOPES,
          redirectTo: isOAuthFlow
            ? `${window.location.origin}${getPostLoginRedirect()}`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Layers"
      lede="Pick up where your meetings left off — every decision, action item, and note, exactly where you left it."
      promise={
        <>
          <span className="auth-brand-promise-mission">
            AI memory for your meetings.
          </span>
          <span className="auth-brand-promise-secondary">
            A calmer place to keep what was said, decided, and asked of you.
          </span>
        </>
      }
      footer={
        <AuthSwitchLink
          prompt="New to Layers?"
          href="/sign-up"
          cta="Create an account"
        />
      }
    >
      <AuthGoogleButton loading={googleLoading} onClick={handleGoogle}>
        Continue with Google
      </AuthGoogleButton>

      <AuthDivider label="or with email" />

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
          required
        />
        <AuthPrimaryButton
          type="submit"
          loading={loading}
          disabled={!email.trim() || !password}
        >
          Sign in
        </AuthPrimaryButton>
      </form>

      {error ? <AuthError message={error} /> : null}

      <AuthFootnote>
        Trouble signing in? Reach us at{" "}
        <a href="mailto:hello@layers.app">hello@layers.app</a>.
      </AuthFootnote>

      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
      `}</style>
    </AuthShell>
  );
}
