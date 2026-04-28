"use client";

import { useState } from "react";
import { Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Auth not configured");

      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-safe flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Layer One</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 tracking-wide uppercase">Audio Intelligence</p>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] p-6">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-[#22c55e] text-4xl">✓</div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Check your email</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                We sent a confirmation link to <span className="text-[var(--text-primary)]">{email}</span>
              </p>
              <Link href="/sign-in" className="text-sm text-[#14b8a6] hover:text-[#2dd4bf]">
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Create account</h2>
                <p className="text-sm text-[var(--text-muted)]">Get started with 25 free meetings</p>
              </div>

              {/* Google OAuth */}
              <button
                onClick={async () => {
                  setGoogleLoading(true);
                  setError(null);
                  try {
                    const supabase = getSupabaseBrowser();
                    if (!supabase) throw new Error("Auth not configured");
                    const { error: authError } = await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: `${window.location.origin}/auth/callback` },
                    });
                    if (authError) throw authError;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Google sign up failed");
                    setGoogleLoading(false);
                  }
                }}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-[var(--bg-card-hover)] border border-[var(--border-card)] text-[var(--text-primary)] text-sm font-medium rounded-xl min-h-[44px] hover:bg-[var(--bg-card)] transition-all disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <GoogleIcon className="w-5 h-5" />
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm border border-[var(--border-card)] rounded-xl pl-10 pr-3 py-3 min-h-[44px] focus:border-[#14b8a6] focus:outline-none placeholder-[var(--text-muted)] transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    required
                    minLength={6}
                    className="w-full bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm border border-[var(--border-card)] rounded-xl pl-10 pr-3 py-3 min-h-[44px] focus:border-[#14b8a6] focus:outline-none placeholder-[var(--text-muted)] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="w-full py-3 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-xl min-h-[44px] disabled:opacity-50 transition-all"
                >
                  {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Create account"}
                </button>
              </form>

              {error && (
                <p className="text-sm text-red-400 text-center mt-3">{error}</p>
              )}

              <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-[#14b8a6] hover:text-[#2dd4bf]">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
