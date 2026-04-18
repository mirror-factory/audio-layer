/**
 * /profile — current session + subscription state.
 *
 * Server-rendered from the cookie session + the profiles table.
 * Anonymous visitors see a "sign in" CTA; signed-in users see their
 * email + Stripe subscription status, plus a sign-out button.
 */

import Link from "next/link";
import { getSupabaseUser } from "@/lib/supabase/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProfileRow {
  subscription_status: string | null;
  subscription_tier: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

export default async function ProfilePage() {
  const supabase = await getSupabaseUser();
  if (!supabase) {
    return (
      <Shell>
        <p className="text-sm text-neutral-400">
          Supabase isn&apos;t configured. Set the env vars in{" "}
          <code className="rounded bg-neutral-800 px-1 text-xs">.env.local</code>{" "}
          to enable profiles.
        </p>
      </Shell>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return (
      <Shell>
        <p className="text-sm text-neutral-300">
          Not signed in.{" "}
          <Link
            href="/sign-in"
            className="text-emerald-400 underline-offset-2 hover:underline"
          >
            Sign in with email
          </Link>
          .
        </p>
      </Shell>
    );
  }

  const isAnonymous = user.is_anonymous ?? !user.email;

  const profileRes = await supabase
    .from("profiles")
    .select(
      "subscription_status,subscription_tier,current_period_end,stripe_customer_id",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const profile = profileRes.data;

  return (
    <Shell>
      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <Field
          label="Identity"
          value={
            isAnonymous
              ? "Anonymous (created automatically)"
              : (user.email ?? "(no email)")
          }
        />
        <Field label="User id" value={user.id} mono />
        <Field
          label="Subscription"
          value={
            profile?.subscription_tier
              ? `${profile.subscription_tier} · ${profile.subscription_status ?? "unknown"}`
              : "Free"
          }
        />
        <Field
          label="Renews"
          value={
            profile?.current_period_end
              ? new Date(profile.current_period_end).toLocaleString()
              : "—"
          }
        />
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
        {isAnonymous ? (
          <Link
            href="/sign-in"
            className="min-h-[44px] flex items-center rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-200 hover:bg-emerald-900/50"
          >
            Sign in with email →
          </Link>
        ) : (
          <form action="/auth/sign-out" method="POST">
            <button
              type="submit"
              className="min-h-[44px] flex items-center rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-200 hover:bg-neutral-800"
            >
              Sign out
            </button>
          </form>
        )}
        <Link
          href="/pricing"
          className="text-neutral-500 hover:text-neutral-300"
        >
          See plans
        </Link>
        {isAnonymous ? (
          <p className="text-[11px] text-neutral-500">
            Heads up: meetings recorded as an anonymous user won&apos;t carry
            over to your email account on first sign-in.
          </p>
        ) : null}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-10 md:px-6">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 md:p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-100">Profile</h1>
          <Link href="/" className="min-h-[44px] flex items-center text-xs text-neutral-500 hover:text-neutral-300">
            ← Hub
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-all text-neutral-200 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
