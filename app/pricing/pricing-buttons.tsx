"use client";

/**
 * Subscribe button for a single tier on /pricing. Posts to the
 * server-side checkout route and redirects to the Stripe-hosted
 * Session URL. Surfaces a friendly message when billing isn't
 * configured (typical for local dev without Stripe creds).
 */

import { useState } from "react";

interface Props {
  tier: "core" | "pro";
  label: string;
}

export function PricingButtons({ tier, label }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const msg = await res
          .json()
          .then((d) => d.error ?? res.statusText)
          .catch(() => res.statusText);
        throw new Error(msg);
      }
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onSubscribe}
        disabled={busy}
        className="block w-full rounded-md bg-emerald-400 px-4 py-2 text-center text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Loading…" : label}
      </button>
      {error ? (
        <p className="text-[11px] text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
