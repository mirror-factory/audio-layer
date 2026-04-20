"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Supabase not configured");

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send verification email",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Sign Up" showBack />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={48} className="text-[#22c55e] mx-auto" />
              <h2 className="text-lg font-semibold text-[#e5e5e5]">
                Check your email
              </h2>
              <p className="text-sm text-[#a3a3a3]">
                We sent a verification link to{" "}
                <span className="text-[#d4d4d4] font-medium">{email}</span>
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="text-sm text-[#14b8a6] hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-[#e5e5e5] mb-1">
                  Create your account
                </h2>
                <p className="text-sm text-[#525252]">
                  Start capturing conversations with Layer One
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-[#171717] text-[#d4d4d4] text-sm border border-[#262626] rounded-lg pl-10 pr-3 py-2.5 min-h-[44px] focus:border-[#14b8a6] focus:outline-none placeholder-[#525252] transition-colors duration-200"
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-lg min-h-[44px] disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin mx-auto" />
                  ) : (
                    "Send verification email"
                  )}
                </button>
              </form>

              <p className="text-xs text-[#525252] text-center mt-4">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-[#14b8a6] hover:underline"
                >
                  Sign in
                </Link>
              </p>

              {error && (
                <p className="text-sm text-[#ef4444] text-center mt-3">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
