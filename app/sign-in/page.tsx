"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { WebGLShader } from "@/components/ui/web-gl-shader";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle magic link — Supabase returns #access_token=... in the hash
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const params = new URLSearchParams(window.location.search);
          router.push(params.get("next") ?? "/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

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
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });

      if (authError) throw authError;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send magic link",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Shader background */}
      <WebGLShader state="idle" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Branding */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Layer One
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1 tracking-wide uppercase">
              Audio Intelligence
            </p>
          </div>

          {/* Card */}
          <div className="glass-panel rounded-2xl p-6">
            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 size={48} className="text-[#22c55e] mx-auto" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Check your email
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  We sent a magic link to{" "}
                  <span className="text-white font-medium">{email}</span>
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="text-sm text-[#14b8a6] hover:text-[#5eead4] transition-colors duration-200"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    Sign in
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Enter your email for a magic link
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-white/[0.05] text-white text-sm border border-white/[0.1] rounded-xl pl-10 pr-3 py-3 min-h-[44px] focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]/30 placeholder-[var(--text-muted)] transition-all duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-xl min-h-[44px] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-[#14b8a6]/20"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin mx-auto" />
                    ) : (
                      "Send magic link"
                    )}
                  </button>
                </form>

                <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/sign-up"
                    className="text-[#14b8a6] hover:text-[#5eead4] transition-colors duration-200"
                  >
                    Sign up
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
        </div>
      </main>
    </div>
  );
}
