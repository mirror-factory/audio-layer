"use client";

import { useRouter } from "next/navigation";
import { SlideMenu } from "@/components/slide-menu";

interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack = true }: TopBarProps) {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-50 flex h-[44px] items-center justify-between px-2"
      style={{
        backgroundColor: "var(--bg-primary)",
        marginTop: "max(env(safe-area-inset-top), 28px)",
      }}
    >
      {/* Left: back button */}
      <div className="w-[44px]">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex h-[44px] w-[44px] items-center justify-center"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Go back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="12,4 6,10 12,16" />
            </svg>
          </button>
        )}
      </div>

      {/* Center: title */}
      <span
        className="text-[15px] font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </span>

      {/* Right: menu */}
      <div className="w-[44px]">
        <SlideMenu />
      </div>
    </header>
  );
}
