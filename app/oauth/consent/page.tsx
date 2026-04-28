"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

function ConsentForm() {
  const searchParams = useSearchParams();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [email, setEmail] = useState<string | null>(null);

  const params = useMemo(() => {
    const next = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      next.append(key, value);
    }
    return next;
  }, [searchParams]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user || user.is_anonymous) {
        window.location.href = `/sign-in?oauth=1&${params.toString()}`;
        return;
      }

      setEmail(user.email ?? "Signed-in Layer One user");
      setLoading(false);
    });
  }, [params]);

  const redirectUri = searchParams.get("redirect_uri");
  const clientId = searchParams.get("client_id") ?? "Claude MCP client";
  const scope = searchParams.get("scope") ?? "mcp:tools";

  if (loading) {
    return (
      <main className="min-h-screen-safe flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 size={24} className="text-[#14b8a6] animate-spin" />
      </main>
    );
  }

  if (!redirectUri) {
    return (
      <main className="min-h-screen-safe flex items-center justify-center bg-[var(--bg-primary)] px-4">
        <section className="w-full max-w-md rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Invalid OAuth request
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            The connector did not provide a redirect URI.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen-safe flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <section className="w-full max-w-md rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14b8a6]/10 text-[#14b8a6]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              Connect Layer One
            </h1>
            <p className="text-sm text-[var(--text-muted)]">{email}</p>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-card)] bg-[var(--bg-card-hover)] p-3">
          <p className="text-sm text-[var(--text-primary)]">
            Allow {clientId} to use Layer One MCP tools.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Scope: {scope}
          </p>
        </div>

        <form action="/api/oauth/consent" method="post" className="mt-5 grid gap-3">
          {Array.from(params.entries()).map(([key, value], index) => (
            <input
              key={`${key}-${index}`}
              type="hidden"
              name={key}
              value={value}
            />
          ))}

          <button
            name="decision"
            value="allow"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d9488]"
            type="submit"
          >
            <Check size={16} />
            Allow
          </button>
          <button
            name="decision"
            value="deny"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[var(--border-card)] bg-[var(--bg-card-hover)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card)]"
            type="submit"
          >
            <X size={16} />
            Deny
          </button>
        </form>
      </section>
    </main>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}
