"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

interface UserInfo {
  id: string;
  email: string | null;
  isAnonymous: boolean;
}

interface SubscriptionInfo {
  tier: string | null;
  status: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    tier: null,
    status: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
          isAnonymous: data.user.is_anonymous ?? true,
        });

        // Try to get subscription info
        supabase
          .from("profiles")
          .select("subscription_tier, subscription_status")
          .eq("user_id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setSubscription({
                tier: profile.subscription_tier,
                status: profile.subscription_status,
              });
            }
          });
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar title="Profile" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-[#14b8a6] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Profile" showBack />

      <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-6">
        <h2 className="text-lg font-semibold text-[#e5e5e5]">Account</h2>

        {/* User Info */}
        <div className="bg-[#171717] rounded-xl p-4 space-y-3">
          <div>
            <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
              User ID
            </div>
            <div className="text-sm text-[#d4d4d4] break-all">
              {user?.id ?? "Not signed in"}
            </div>
          </div>

          <div>
            <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
              Email
            </div>
            <div className="text-sm text-[#d4d4d4]">
              {user?.email ?? "Anonymous user"}
            </div>
          </div>

          <div>
            <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
              Subscription
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#d4d4d4]">
                {subscription.tier
                  ? subscription.tier.charAt(0).toUpperCase() +
                    subscription.tier.slice(1)
                  : "Free"}
              </span>
              {subscription.status && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    subscription.status === "active"
                      ? "bg-[#22c55e]/10 text-[#22c55e]"
                      : "bg-[#eab308]/10 text-[#eab308]"
                  }`}
                >
                  {subscription.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {(!user || user.isAnonymous) && (
            <button
              onClick={() => router.push("/sign-in")}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-lg min-h-[44px] transition-colors duration-200"
            >
              <LogIn size={18} />
              Sign In
            </button>
          )}

          {user && !user.isAnonymous && (
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#262626] hover:bg-[#404040] text-[#d4d4d4] font-medium rounded-lg min-h-[44px] transition-colors duration-200"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
