"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { SlideMenu } from "./slide-menu";

interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack = false }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#262626]"
        style={{
          height: "calc(44px + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center min-w-[44px] h-[44px]">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-[44px] h-[44px] text-[#a3a3a3] hover:text-[#d4d4d4] transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
        </div>

        <h1 className="text-sm font-semibold text-[#e5e5e5] truncate px-2">
          {title}
        </h1>

        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center justify-center w-[44px] h-[44px] text-[#a3a3a3] hover:text-[#d4d4d4] transition-colors duration-200"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
