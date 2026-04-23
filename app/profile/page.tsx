"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut, Key, Copy, RefreshCw, Trash2 } from "lucide-react";
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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMcpInstructions, setShowMcpInstructions] = useState(false);

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/api-key");
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setHasKey(data.hasKey ?? false);
      }
    } catch {
      // silent
    }
  }, []);

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

    fetchApiKey();
  }, [fetchApiKey]);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen-safe flex flex-col">
        <TopBar title="Profile" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-[#14b8a6] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe flex flex-col">
      <TopBar title="Profile" showBack />

      <main className="flex-1 px-4 pb-safe py-6 max-w-xl mx-auto w-full space-y-6">
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

        {/* API Key */}
        {user && !user.isAnonymous && (
          <>
            <h2 className="text-lg font-semibold text-[#e5e5e5] pt-2">
              API Key
            </h2>
            <div className="bg-[#171717] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-[#737373]" />
                <span className="text-xs text-[#737373] uppercase tracking-wider">
                  MCP / API Access
                </span>
              </div>

              {hasKey && apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-[#d4d4d4] bg-[#0a0a0a] px-3 py-2 rounded-lg font-mono break-all">
                    {apiKey}
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(apiKey);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center justify-center w-[44px] h-[44px] text-[#737373] hover:text-[#d4d4d4] transition-colors"
                    aria-label="Copy API key"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#737373]">No API key generated</p>
              )}

              {copied && (
                <p className="text-xs text-[#22c55e]">Copied to clipboard</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setApiKeyLoading(true);
                    try {
                      const res = await fetch("/api/auth/api-key", {
                        method: "POST",
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setApiKey(data.apiKey);
                        setHasKey(true);
                      }
                    } finally {
                      setApiKeyLoading(false);
                    }
                  }}
                  disabled={apiKeyLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white text-sm font-medium rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                >
                  {apiKeyLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {hasKey ? "Regenerate" : "Generate"} Key
                </button>

                {hasKey && (
                  <button
                    onClick={async () => {
                      setApiKeyLoading(true);
                      try {
                        const res = await fetch("/api/auth/api-key", {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          setApiKey(null);
                          setHasKey(false);
                        }
                      } finally {
                        setApiKeyLoading(false);
                      }
                    }}
                    disabled={apiKeyLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#262626] hover:bg-[#404040] text-[#ef4444] text-sm font-medium rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Revoke
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowMcpInstructions(!showMcpInstructions)}
                className="text-xs text-[#14b8a6] hover:underline"
              >
                {showMcpInstructions
                  ? "Hide MCP instructions"
                  : "Show MCP connection instructions"}
              </button>

              {showMcpInstructions && (
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-xs text-[#737373] mb-2">
                    Add this to your MCP client config:
                  </p>
                  <pre className="text-xs text-[#d4d4d4] font-mono whitespace-pre-wrap overflow-x-auto">
{`{
  "mcpServers": {
    "layer-one": {
      "url": "https://audio-layer.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

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
