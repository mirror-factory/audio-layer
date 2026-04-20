"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setStatus("Auth not configured");
      return;
    }

    const supabase = createBrowserClient(url, key);

    // Supabase client auto-detects the hash fragment and sets the session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatus("Sign in failed: " + error.message);
        setTimeout(() => router.push("/sign-in?error=confirm_failed"), 2000);
        return;
      }
      if (data.session) {
        setStatus("Signed in!");
        router.push("/");
      } else {
        setStatus("No session found");
        setTimeout(() => router.push("/sign-in"), 2000);
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <p className="text-sm text-[var(--text-muted)]">{status}</p>
    </div>
  );
}
